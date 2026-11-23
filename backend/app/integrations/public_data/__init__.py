from app.core.config import get_settings
from app.integrations.public_data.base import WelfareFacilitySource


def get_welfare_source() -> WelfareFacilitySource:
    """키가 없으면 PublicDataKeyMissing — 부르는 쪽(가져오기 스크립트)이 멈춘다"""
    from app.integrations.public_data.data_go_kr import DataGoKrWelfareSource

    return DataGoKrWelfareSource(get_settings().public_data_api_key)
