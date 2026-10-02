import pytest

from app.domains.risk.rules import assess_text


@pytest.mark.parametrize(
    ("text", "level", "codes"),
    [
        ("오늘 날씨 좋네요. 같이 산책 가실래요?", 0, []),
        ("계좌번호 알려주시면 제가 보내 드릴게요", 2, ["money"]),
        ("급해서 그런데 돈 좀 빌려줄 수 있어요? 병원비가 필요해요", 3, ["money", "urgency"]),
        ("문자로 온 인증번호 좀 불러 주세요", 3, ["personal_info"]),
        ("카톡 아이디 알려주세요 거기서 얘기해요", 1, ["off_platform"]),
        ("이 링크 눌러 보세요 https://example.com", 1, ["off_platform"]),
    ],
)
def test_assess_text(text: str, level: int, codes: list[str]) -> None:
    r = assess_text(text)
    assert r.level == level
    assert r.codes == codes
    assert len(r.labels) == len(codes)
