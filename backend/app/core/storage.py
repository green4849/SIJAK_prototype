"""업로드 파일 저장소 — 프로토타입은 로컬 디스크. 나중에 S3/MinIO로 바꾸면 이 파일만 교체."""

import uuid
from functools import lru_cache
from pathlib import Path

from app.core.config import get_settings


class LocalMediaStorage:
    def __init__(self, root: str) -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, data: bytes, ext: str) -> str:
        """저장 후 key 반환 (경로 조작 방지를 위해 key는 서버가 만든다)"""
        key = f"{uuid.uuid4().hex}.{ext}"
        (self.root / key).write_bytes(data)
        return key

    def path(self, key: str) -> Path:
        p = (self.root / key).resolve()
        if self.root.resolve() not in p.parents:
            raise ValueError("invalid media key")
        return p


@lru_cache
def get_media_storage() -> LocalMediaStorage:
    return LocalMediaStorage(get_settings().media_dir)
