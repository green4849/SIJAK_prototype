"""기존 로컬 음성을 같은 key로 암호화해 S3로 이전. 기본은 파일 존재 검사만."""

import argparse
import asyncio

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.observability import report_exception
from app.core.storage import LocalMediaStorage, S3MediaStorage
from app.domains.chat.models import ChatMessage


async def migrate(apply: bool) -> dict[str, int]:
    settings = get_settings()
    if not settings.media_s3_bucket:
        raise ValueError("MEDIA_S3_BUCKET 필요")
    local = LocalMediaStorage(settings.media_dir)
    remote = (
        S3MediaStorage(
            settings.media_s3_bucket,
            settings.media_s3_endpoint,
            settings.media_s3_region,
            settings.media_s3_prefix,
        )
        if apply
        else None
    )
    checked = 0
    last_id = 0
    while True:
        async with SessionLocal() as session:
            rows = list(
                await session.scalars(
                    select(ChatMessage)
                    .where(ChatMessage.id > last_id, ChatMessage.audio_key.is_not(None))
                    .order_by(ChatMessage.id)
                    .limit(200)
                )
            )
        if not rows:
            return {"checked": checked}
        for row in rows:
            data = await asyncio.to_thread(local.read, row.audio_key)
            if remote:
                try:
                    existing = await asyncio.to_thread(remote.read, row.audio_key)
                except FileNotFoundError:
                    await asyncio.to_thread(remote.put_existing, row.audio_key, data)
                    existing = await asyncio.to_thread(remote.read, row.audio_key)
                if existing != data:
                    raise ValueError("기존 S3 파일과 로컬 파일이 다릅니다")
            checked += 1
        last_id = rows[-1].id


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    try:
        print(asyncio.run(migrate(args.apply)))
        return 0
    except Exception as exc:
        report_exception(exc, "migrate_voice_storage")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
