"""암호화한 pg_dump 백업 생성·검증·빈 DB 복구. 비밀값은 환경 변수로만 받는다."""

import argparse
import base64
import os
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from app.core.config import get_settings

MAGIC = b"SIJAK-BACKUP-1\n"
CHUNK = 1024 * 1024


def pg_environment(url: str) -> dict[str, str]:
    parsed = urlsplit(url)
    if not parsed.hostname or not parsed.path.strip("/"):
        raise ValueError("DB 연결 설정이 필요합니다")
    env = os.environ.copy()
    env["PGCONNECT_TIMEOUT"] = "15"
    env.update(
        PGHOST=parsed.hostname,
        PGPORT=str(parsed.port or 5432),
        PGUSER=unquote(parsed.username or ""),
        PGPASSWORD=unquote(parsed.password or ""),
        PGDATABASE=unquote(parsed.path.lstrip("/")),
    )
    query = parse_qs(parsed.query)
    env["PGSSLMODE"] = query.get("sslmode", query.get("ssl", ["prefer"]))[0]
    if "channel_binding" in query:
        env["PGCHANNELBINDING"] = query["channel_binding"][0]
    return env


def pg_command(tool: str, args: list[str]) -> list[str]:
    container = get_settings().pg_tools_container
    if container:
        # 로컬 시험용. 비밀값 자체를 프로세스 인자에 넣지 않는다.
        variables = ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE", "PGSSLMODE"]
        return [
            "docker",
            "exec",
            "-i",
            *[part for key in variables for part in ("-e", key)],
            container,
            tool,
            *args,
        ]
    return [tool, *args]


def backup_key() -> bytes:
    key = base64.b64decode(get_settings().backup_encryption_key or "", validate=True)
    if len(key) != 32:
        raise ValueError("BACKUP_ENCRYPTION_KEY는 base64 32바이트여야 합니다")
    return key


def create_backup(output: Path) -> None:
    key = backup_key()
    env = pg_environment(get_settings().database_url)
    nonce = os.urandom(12)
    encryptor = Cipher(algorithms.AES(key), modes.GCM(nonce)).encryptor()
    encryptor.authenticate_additional_data(MAGIC)
    # x 모드로 기존 백업 덮어쓰기를 막고 실패 시 부분 파일을 제거한다.
    fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "wb") as target, tempfile.TemporaryFile() as errors:
            target.write(MAGIC + nonce)
            with subprocess.Popen(
                pg_command(
                    "pg_dump",
                    [
                        "--no-password",
                        "--lock-wait-timeout=30s",
                        "--format=custom",
                        "--no-owner",
                        "--no-privileges",
                    ],
                ),
                env=env,
                stdout=subprocess.PIPE,
                stderr=errors,
            ) as process:
                assert process.stdout is not None
                try:
                    while block := process.stdout.read(CHUNK):
                        target.write(encryptor.update(block))
                except BaseException:
                    process.kill()
                    process.wait()
                    raise
                if process.wait() != 0:
                    raise RuntimeError("pg_dump 실패. 연결 설정과 클라이언트 버전을 확인하세요")
            target.write(encryptor.finalize() + encryptor.tag)
    except BaseException:
        output.unlink(missing_ok=True)
        raise


def decrypt_backup(source: Path, target) -> None:
    key = backup_key()
    with source.open("rb") as stream:
        if stream.read(len(MAGIC)) != MAGIC:
            raise ValueError("알 수 없는 백업 형식")
        nonce = stream.read(12)
        stream.seek(-16, 2)
        tag = stream.read(16)
        remaining = stream.tell() - len(MAGIC) - 12 - 16
        stream.seek(len(MAGIC) + 12)
        decryptor = Cipher(algorithms.AES(key), modes.GCM(nonce, tag)).decryptor()
        decryptor.authenticate_additional_data(MAGIC)
        while remaining > 0:
            block = stream.read(min(CHUNK, remaining))
            if not block:
                raise ValueError("잘린 백업 파일")
            target.write(decryptor.update(block))
            remaining -= len(block)
        target.write(decryptor.finalize())
        target.seek(0)


def restore_or_verify(source: Path, target_database: str | None) -> None:
    env = os.environ.copy()
    args = ["--list"]
    if target_database:
        env = pg_environment(get_settings().restore_database_url or "")
        if env["PGDATABASE"] != target_database:
            raise ValueError("복구 DB 이름이 --target-database와 다릅니다")
        check = subprocess.run(
            pg_command(
                "psql",
                [
                    "--no-password",
                    "-X",
                    "-A",
                    "-t",
                    "-v",
                    "ON_ERROR_STOP=1",
                    "-c",
                    "SELECT count(*) FROM pg_class c "
                    "JOIN pg_namespace n ON n.oid=c.relnamespace "
                    "WHERE n.nspname NOT IN ('pg_catalog','information_schema') "
                    "AND n.nspname NOT LIKE 'pg_toast%' "
                    "AND c.relkind IN ('r','p','v','m','S')",
                ],
            ),
            env=env,
            capture_output=True,
            check=True,
        )
        if check.stdout.strip() != b"0":
            raise ValueError("빈 DB에서만 복구할 수 있습니다")
        args = [
            "--dbname",
            target_database,
            "--single-transaction",
            "--exit-on-error",
            "--no-owner",
            "--no-privileges",
        ]
    # 인증 태그 검증이 끝난 뒤에만 pg_restore에 전달한다.
    with tempfile.TemporaryFile() as plain, tempfile.TemporaryFile() as errors:
        decrypt_backup(source, plain)
        result = subprocess.run(
            pg_command("pg_restore", args),
            env=env,
            stdin=plain,
            stdout=subprocess.DEVNULL,
            stderr=errors,
        )
        if result.returncode:
            raise RuntimeError("pg_restore 실패. DB·확장·클라이언트 버전을 확인하세요")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["create", "verify", "restore"])
    parser.add_argument("file", type=Path)
    parser.add_argument("--target-database")
    args = parser.parse_args()
    try:
        if args.action == "create":
            create_backup(args.file)
        elif args.action == "restore":
            if not args.target_database:
                raise ValueError("--target-database 필요")
            restore_or_verify(args.file, args.target_database)
        else:
            restore_or_verify(args.file, None)
    except Exception as exc:
        # 연결 문자열이나 subprocess 인자가 오류 문구에 포함될 수 있다.
        print(f"백업 작업 실패 ({type(exc).__name__}) — 환경값·DB 이름·도구 버전을 확인하세요")
        return 1
    print(f"백업 {args.action} 완료")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
