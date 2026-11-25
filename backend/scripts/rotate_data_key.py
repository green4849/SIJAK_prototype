"""현재 키로 전화번호 재암호화. 기본은 검사만. 새 키와 이전 키는 환경 변수에만 설정한다."""

import argparse
import asyncio

from sqlalchemy import select, text

from app.core.database import SessionLocal
from app.core.observability import report_exception
from app.core.security import decrypt, encrypt, encrypted_with_current_key
from app.core.storage import S3MediaStorage, get_media_storage
from app.domains.auth.models import User
from app.domains.chat.models import ChatMessage
from app.domains.emergency.models import Guardian


async def rotate(apply: bool, include_media: bool = False) -> dict[str, int]:
    changed = 0
    total = 0
    async with SessionLocal() as guard:
        connection = await guard.connection()
        if not await connection.scalar(text("SELECT pg_try_advisory_lock(608020261126)")):
            raise RuntimeError("키 교체가 이미 실행 중입니다")
        try:
            for model in (User, Guardian):
                last_id = None
                while True:
                    async with SessionLocal() as session:
                        query = select(model).order_by(model.id).limit(200).with_for_update()
                        if last_id is not None:
                            query = query.where(model.id > last_id)
                        rows = list(await session.scalars(query))
                        if not rows:
                            break
                        for row in rows:
                            total += 1
                            if not encrypted_with_current_key(row.phone_enc):
                                plaintext = decrypt(row.phone_enc)
                                changed += 1
                                if apply:
                                    row.phone_enc = encrypt(plaintext)
                        last_id = rows[-1].id
                        if apply:
                            await session.commit()
            if include_media:
                storage = get_media_storage()
                if not isinstance(storage, S3MediaStorage):
                    raise ValueError("--media는 S3 음성 저장소 전용입니다")
                last_message = 0
                while True:
                    async with SessionLocal() as session:
                        messages = list(
                            await session.scalars(
                                select(ChatMessage)
                                .where(
                                    ChatMessage.id > last_message,
                                    ChatMessage.audio_key.is_not(None),
                                )
                                .order_by(ChatMessage.id)
                                .limit(200)
                            )
                        )
                        if not messages:
                            break
                        for message in messages:
                            total += 1
                            changed += await asyncio.to_thread(
                                storage.rotate_key, message.audio_key, apply
                            )
                        last_message = messages[-1].id
            return {"checked": total, "needs_rotation" if not apply else "rotated": changed}
        finally:
            await connection.execute(text("SELECT pg_advisory_unlock(608020261126)"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--media", action="store_true")
    args = parser.parse_args()
    try:
        print(asyncio.run(rotate(args.apply, args.media)))
    except Exception as exc:
        report_exception(exc, "rotate_data_key")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
