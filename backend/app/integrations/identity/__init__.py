from functools import lru_cache

from app.core.config import get_settings
from app.integrations.identity.base import IdentityProvider


@lru_cache
def get_identity_provider() -> IdentityProvider:
    """설정에 따라 구현체 선택. 싱글톤 (Mock은 세션을 메모리에 들고 있음)."""
    match get_settings().identity_provider:
        case "mock":
            from app.integrations.identity.mock_pass import MockPassProvider

            return MockPassProvider()
