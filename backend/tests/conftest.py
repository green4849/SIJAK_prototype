import os

# 앱 import 전에 테스트 환경 고정
os.environ.setdefault("ENV", "test")
os.environ.setdefault(
    "TEST_DATABASE_URL", "postgresql+asyncpg://wipi:wipi@localhost:5432/wipi_test"
)
