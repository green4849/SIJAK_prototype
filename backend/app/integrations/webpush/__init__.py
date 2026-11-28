from functools import lru_cache

from app.core.config import get_settings
from app.integrations.webpush.base import PushSender


@lru_cache
def get_push_sender() -> PushSender | None:
    """VAPID 키가 있으면 발송기, 없으면(기본) None — 알림함에만 쌓이고 화면은 '준비 중'."""
    settings = get_settings()
    if not (settings.vapid_public_key and settings.vapid_private_key):
        return None
    from app.integrations.webpush.vapid import VapidPushSender

    return VapidPushSender(settings.vapid_private_key, settings.vapid_subject)
