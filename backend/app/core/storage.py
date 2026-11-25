"""업로드 파일 저장소 — 프로토타입은 로컬 디스크. 나중에 S3/MinIO로 바꾸면 이 파일만 교체."""

import re
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Protocol

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import get_settings
from app.core.security import decrypt_bytes, encrypt_bytes, encrypted_with_current_key


def validate_key(key: str) -> None:
    if not re.fullmatch(r"[a-f0-9]{32}\.(webm|ogg|m4a|mp3)", key):
        raise ValueError("invalid media key")


class MediaStorage(Protocol):
    def save(self, data: bytes, ext: str) -> str: ...
    def read(self, key: str) -> bytes: ...
    def delete(self, key: str) -> bool: ...


class LocalMediaStorage:
    def __init__(self, root: str) -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, data: bytes, ext: str) -> str:
        """저장 후 key 반환 (경로 조작 방지를 위해 key는 서버가 만든다)"""
        key = f"{uuid.uuid4().hex}.{ext}"
        validate_key(key)
        (self.root / key).write_bytes(data)
        return key

    def read(self, key: str) -> bytes:
        return self.path(key).read_bytes()

    def delete(self, key: str) -> bool:
        """지웠으면 True, 이미 없으면 False"""
        p = self.path(key)
        if not p.exists():
            return False
        p.unlink()
        return True

    def path(self, key: str) -> Path:
        validate_key(key)
        p = (self.root / key).resolve()
        if self.root.resolve() not in p.parents:
            raise ValueError("invalid media key")
        return p


class S3MediaStorage:
    """비공개 버킷. 자격증명은 boto3 표준 환경 변수/역할에서만 읽는다."""

    def __init__(self, bucket: str, endpoint: str | None, region: str, prefix: str) -> None:
        self.bucket = bucket
        self.prefix = prefix
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            region_name=region,
            config=Config(connect_timeout=5, read_timeout=15, retries={"max_attempts": 2}),
        )
        # 삭제 마커만 남는 버킷에서는 보관 기간 이후 실제 삭제를 보장할 수 없다.
        if self.client.get_bucket_versioning(Bucket=bucket).get("Status"):
            raise ValueError("음성 버킷은 버전 관리를 사용한 적 없는 전용 버킷이어야 합니다")

    def save(self, data: bytes, ext: str) -> str:
        key = f"{uuid.uuid4().hex}.{ext}"
        validate_key(key)
        self.put_existing(key, data)
        return key

    def put_existing(self, key: str, data: bytes) -> None:
        validate_key(key)
        self.client.put_object(
            Bucket=self.bucket,
            Key=self.prefix + key,
            Body=encrypt_bytes(data),
            ContentType="application/octet-stream",
        )

    def read(self, key: str) -> bytes:
        validate_key(key)
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=self.prefix + key)
        except ClientError as exc:
            if exc.response["Error"]["Code"] in {"NoSuchKey", "404"}:
                raise FileNotFoundError(key) from None
            raise
        with response["Body"] as body:
            return decrypt_bytes(body.read())

    def rotate_key(self, key: str, apply: bool) -> bool:
        validate_key(key)
        response = self.client.get_object(Bucket=self.bucket, Key=self.prefix + key)
        with response["Body"] as body:
            raw = body.read()
        if encrypted_with_current_key(raw):
            return False
        data = decrypt_bytes(raw)
        if apply:
            self.put_existing(key, data)
        return True

    def delete(self, key: str) -> bool:
        validate_key(key)
        self.client.delete_object(Bucket=self.bucket, Key=self.prefix + key)
        return True


@lru_cache
def get_media_storage() -> MediaStorage:
    settings = get_settings()
    if settings.media_storage == "s3":
        if not settings.media_s3_bucket:
            raise ValueError("MEDIA_S3_BUCKET 필요")
        return S3MediaStorage(
            settings.media_s3_bucket,
            settings.media_s3_endpoint,
            settings.media_s3_region,
            settings.media_s3_prefix,
        )
    return LocalMediaStorage(settings.media_dir)
