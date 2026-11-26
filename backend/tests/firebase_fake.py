"""테스트용 가짜 Firebase — 로컬에서 만든 키로 서명한 ID 토큰과 그 공개키 인증서.

실제 Google 공개키 대신 이 인증서를 FirebasePhoneProvider 에 넣어 검증 흐름 전체를 시험한다.
"""

import time
from datetime import UTC, datetime, timedelta

import jwt
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

PROJECT = "sijak-test"
KID = "test-kid"


class FakeFirebase:
    def __init__(self) -> None:
        self.key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "securetoken")])
        now = datetime.now(UTC)
        cert = (
            x509.CertificateBuilder()
            .subject_name(name)
            .issuer_name(name)
            .public_key(self.key.public_key())
            .serial_number(1)
            .not_valid_before(now - timedelta(days=1))
            .not_valid_after(now + timedelta(days=1))
            .sign(self.key, hashes.SHA256())
        )
        self.pem = cert.public_bytes(serialization.Encoding.PEM).decode()

    async def certs(self) -> dict[str, str]:
        return {KID: self.pem}

    def token(
        self,
        phone: str = "+821012345678",
        uid: str = "uid-1",
        *,
        project: str = PROJECT,
        kid: str = KID,
        auth_age: int = 5,
        exp_in: int = 3600,
        key: rsa.RSAPrivateKey | None = None,
    ) -> str:
        now = int(time.time())
        claims = {
            "iss": f"https://securetoken.google.com/{project}",
            "aud": project,
            "sub": uid,
            "user_id": uid,
            "phone_number": phone,
            "iat": now - auth_age,
            "auth_time": now - auth_age,
            "exp": now + exp_in,
            "firebase": {"sign_in_provider": "phone"},
        }
        return jwt.encode(claims, key or self.key, algorithm="RS256", headers={"kid": kid})
