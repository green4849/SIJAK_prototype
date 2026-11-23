"""공공데이터포털(data.go.kr) 노인복지시설 — 자리만 만들어 둔 구현체.

인증키는 사용자 계정으로 발급받아 환경 변수 PUBLIC_DATA_API_KEY 로만 넣는다
(코드·저장소·공유 문서에 넣지 않는다). 키가 없으면 만들 때부터 PublicDataKeyMissing.

TODO(C7): 키를 받은 뒤 실제 응답 형식(요청 주소·쪽수·칸 이름·좌표 유무)을 확인하고
fetch_facilities 를 채운다. 확인 전에 형식을 짐작해 쓰지 않는다.
"""

from app.integrations.public_data.base import FacilityRecord, PublicDataKeyMissing


class DataGoKrWelfareSource:
    def __init__(self, api_key: str | None) -> None:
        if not api_key:
            raise PublicDataKeyMissing(
                "PUBLIC_DATA_API_KEY 가 없어요. 공공데이터포털에서 '노인복지시설' 활용 신청 후 "
                "발급받은 키를 환경 변수로 넣어 주세요."
            )
        self._api_key = api_key

    async def fetch_facilities(self, region_code: str) -> list[FacilityRecord]:
        raise NotImplementedError(
            "공공데이터포털 응답 형식을 키로 확인한 뒤 구현해야 해요 "
            "(docs/tasks/C7-public-data.md)."
        )
