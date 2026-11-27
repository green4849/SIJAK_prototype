from functools import lru_cache

from app.core.config import get_settings
from app.integrations.sms.base import SmsSender


@lru_cache
def get_sms_sender() -> SmsSender | None:
    """설정에 따라 구현체. 'off'(기본)면 None — 긴급 도움은 기록만 하고 화면도 그렇게 말한다."""
    settings = get_settings()
    match settings.sms_provider:
        case "off":
            return None
        case "log":
            from app.integrations.sms.log import LogSmsSender

            return LogSmsSender()
        case "solapi":
            from app.integrations.sms.solapi import SolapiSmsSender

            return SolapiSmsSender(
                settings.solapi_api_key, settings.solapi_api_secret, settings.sms_sender_number
            )
