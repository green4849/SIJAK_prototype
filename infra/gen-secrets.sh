#!/bin/sh
# 운영 비밀값 생성 — 출력을 infra/.env.prod 에 붙인다. 한 번 만든 값은 바꾸지 말고 따로 안전하게 보관 (B12).
set -e
rand() { head -c "$1" /dev/urandom | base64 | tr -d '\n=+/' | cut -c1-"$2"; }
echo "POSTGRES_PASSWORD=$(rand 48 40)"
echo "JWT_SECRET=$(rand 64 64)"
echo "DATA_ENCRYPTION_KEY=$(head -c 32 /dev/urandom | base64 | tr -d '\n')"
echo "PHONE_HASH_PEPPER=$(rand 48 40)"
