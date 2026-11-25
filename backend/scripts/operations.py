"""외부 스케줄러/Render Cron용 일일 정리와 암호화 DB 백업. HTTP 엔드포인트 없음."""

import asyncio
import logging
import tempfile
import uuid
from datetime import UTC, datetime
from pathlib import Path

import boto3
import sentry_sdk
from botocore.config import Config

from app.core.config import get_settings
from app.core.observability import init_observability, report_exception
from scripts.backup import create_backup, restore_or_verify
from scripts.jobs import daily


def backup_to_s3() -> None:
    settings = get_settings()
    if not settings.backup_s3_bucket:
        raise ValueError("BACKUP_S3_BUCKET 필요")
    with tempfile.TemporaryDirectory() as directory:
        archive = Path(directory) / "database.dump.aes"
        create_backup(archive)
        restore_or_verify(archive, None)
        client = boto3.client(
            "s3",
            endpoint_url=settings.backup_s3_endpoint,
            region_name=settings.backup_s3_region,
            config=Config(connect_timeout=5, read_timeout=60, retries={"max_attempts": 2}),
        )
        key = f"database/{datetime.now(UTC):%Y/%m/%d}/{uuid.uuid4().hex}.dump.aes"
        client.upload_file(str(archive), settings.backup_s3_bucket, key)
        print("암호화 DB 백업 업로드 완료")


def main() -> int:
    logging.basicConfig(level=logging.INFO)
    init_observability()
    result = asyncio.run(daily())
    try:
        # 삭제 작업 실패 여부와 관계없이 그날 백업은 시도한다.
        backup_to_s3()
    except Exception as exc:
        report_exception(exc, "database_backup")
        result = 1
    sentry_sdk.flush(timeout=5)
    return result


if __name__ == "__main__":
    raise SystemExit(main())
