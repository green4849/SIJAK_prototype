import base64
import json
import os

import boto3
import pytest
import sentry_sdk
from cryptography.exceptions import InvalidTag
from moto import mock_aws

from app.core.config import get_settings
from app.core.media_response import voice_response
from app.core.observability import init_observability, safe_event
from app.core.security import (
    decrypt,
    decrypt_bytes,
    encrypt,
    encrypt_bytes,
    encrypted_with_current_key,
)
from app.core.storage import S3MediaStorage


def test_s3_storage_keeps_private_objects_and_handles_missing_files(monkeypatch) -> None:
    with mock_aws():
        client = boto3.client("s3", region_name="ap-southeast-1")
        client.create_bucket(
            Bucket="sijak-voice-test",
            CreateBucketConfiguration={"LocationConstraint": "ap-southeast-1"},
        )
        storage = S3MediaStorage("sijak-voice-test", None, "ap-southeast-1", "voice/")
        key = storage.save(b"voice", "webm")
        assert storage.read(key) == b"voice"
        raw = client.get_object(Bucket=storage.bucket, Key="voice/" + key)["Body"].read()
        assert raw != b"voice"
        settings = get_settings()
        monkeypatch.setattr(
            settings, "data_encryption_previous_keys", [settings.data_encryption_key]
        )
        monkeypatch.setattr(
            settings, "data_encryption_key", base64.b64encode(os.urandom(32)).decode()
        )
        assert storage.read(key) == b"voice"
        assert storage.rotate_key(key, False)
        assert storage.rotate_key(key, True)
        assert not storage.rotate_key(key, False)
        monkeypatch.setattr(settings, "data_encryption_previous_keys", [])
        assert storage.read(key) == b"voice"
        grants = client.get_object_acl(Bucket=storage.bucket, Key="voice/" + key)["Grants"]
        assert all("URI" not in grant["Grantee"] for grant in grants)
        storage.delete(key)
        storage.delete(key)
        with pytest.raises(FileNotFoundError):
            storage.read(key)
        with pytest.raises(ValueError):
            storage.read("../secret")
        client.put_bucket_versioning(
            Bucket=storage.bucket, VersioningConfiguration={"Status": "Enabled"}
        )
        with pytest.raises(ValueError):
            S3MediaStorage(storage.bucket, None, "ap-southeast-1", "voice/")


def test_voice_ranges_and_private_cache() -> None:
    response = voice_response(b"0123456789", "audio/webm", "bytes=2-5")
    assert response.status_code == 206 and response.body == b"2345"
    assert response.headers["content-range"] == "bytes 2-5/10"
    assert response.headers["cache-control"] == "private, no-store"
    assert voice_response(b"0123456789", "audio/webm", "bytes=-2").body == b"89"
    for invalid in ("bytes=-0", "bytes=50-", "bytes=4-2", "bytes=0-1,3-5", "bad"):
        assert voice_response(b"0123456789", "audio/webm", invalid).status_code == 416


def test_error_events_drop_personal_data_and_bindings() -> None:
    secret = "01012345678 secret-token private-chat"
    raw = {
        "user": {"phone": secret},
        "request": {"data": secret},
        "extra": {"sql": secret},
        "breadcrumbs": [{"message": secret}],
        "message": secret,
        "exception": {
            "values": [
                {
                    "type": "ValueError",
                    "value": secret,
                    "stacktrace": {
                        "frames": [
                            {
                                "function": "save",
                                "lineno": 10,
                                "vars": {"phone": secret},
                                "context_line": secret,
                            }
                        ]
                    },
                }
            ]
        },
    }
    result = safe_event(raw, {})
    assert secret not in json.dumps(result)
    assert result["exception"]["values"][0]["stacktrace"]["frames"] == [
        {"function": "save", "lineno": 10}
    ]


def test_monitoring_initializes_without_unsupported_options(monkeypatch) -> None:
    monkeypatch.setattr(get_settings(), "sentry_dsn", "https://public@example.com/1")
    # transport는 실제 네트워크 요청 없이 이벤트를 폐기한다.
    original = sentry_sdk.init
    monkeypatch.setattr(
        sentry_sdk, "init", lambda **options: original(**options, transport=lambda event: None)
    )
    init_observability()
    sentry_sdk.get_client().close()


def test_rotation_reads_old_ciphertext_and_encrypts_with_new_key(monkeypatch) -> None:
    settings = get_settings()
    old = settings.data_encryption_key
    legacy = encrypt("01012345678")
    binary = encrypt_bytes(b"\xff\x00voice")
    new = base64.b64encode(os.urandom(32)).decode()
    monkeypatch.setattr(settings, "data_encryption_key", new)
    monkeypatch.setattr(settings, "data_encryption_previous_keys", [old])
    assert decrypt(legacy) == "01012345678"
    assert decrypt_bytes(binary) == b"\xff\x00voice"
    assert not encrypted_with_current_key(legacy)
    rotated = encrypt(decrypt(legacy))
    monkeypatch.setattr(settings, "data_encryption_previous_keys", [])
    assert encrypted_with_current_key(rotated)
    assert decrypt(rotated) == "01012345678"
    with pytest.raises(InvalidTag):
        decrypt(legacy)
