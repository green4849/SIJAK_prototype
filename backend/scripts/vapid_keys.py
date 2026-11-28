"""휴대폰 알림(Web Push)용 VAPID 키 한 쌍 만들기 (C4).

    cd backend && uv run python -m scripts.vapid_keys

출력된 두 값을 운영 서버 환경값에 넣고 다시 배포한다 (docs/deploy-render.md '휴대폰 알림 켜기').
  VAPID_PUBLIC_KEY  — 공개 키. 화면에 내려가므로 비밀은 아니다
  VAPID_PRIVATE_KEY — 비밀 키. 서버 환경값에만. 대화·문서·커밋에 붙이지 말 것

키를 바꾸면 그동안 켠 기기의 구독이 모두 쓸모없어진다 — 사용자가 설정에서 알림을 다시 켜야 한다.
"""

import base64

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def generate() -> tuple[str, str]:
    """(공개 키, 비밀 키) — 브라우저 applicationServerKey·pywebpush 가 받는 형식(base64url)"""
    key = ec.generate_private_key(ec.SECP256R1())
    private = key.private_numbers().private_value.to_bytes(32, "big")
    public = key.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    return _b64url(public), _b64url(private)


def main() -> None:
    public, private = generate()
    print("아래 두 줄을 운영 서버 환경값에 넣으세요. 비밀 키는 다른 곳에 붙이지 마세요.\n")
    print(f"VAPID_PUBLIC_KEY={public}")
    print(f"VAPID_PRIVATE_KEY={private}")


if __name__ == "__main__":
    main()
