# 운영 작업 적용과 복구

이 문서는 예약 정리·음성 영구 저장·오류 수집·DB 백업·암호화 키 교체를 다룬다.
코드 준비와 로컬 검증 후에도 실제 저장소, 스케줄러, 수집 프로젝트의 환경 설정과 운영 시험이 필요하다.
현재 Render 서비스의 설정을 자동으로 바꾸거나 새 서비스를 만들지 않는다.

## 필요한 환경

| 구성 | 필요한 설정 |
|---|---|
| API와 작업 실행기 | 같은 DATABASE_URL, DATA_ENCRYPTION_KEY, PHONE_HASH_PEPPER, 이전 키 목록 |
| 음성 | MEDIA_STORAGE=s3, MEDIA_S3_BUCKET, MEDIA_S3_REGION, 필요 시 MEDIA_S3_ENDPOINT |
| S3 자격증명 | AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY 또는 실행 환경의 역할 |
| 백업 | BACKUP_S3_BUCKET, BACKUP_S3_REGION, 필요 시 BACKUP_S3_ENDPOINT, 별도 BACKUP_ENCRYPTION_KEY |
| 백엔드 오류 | SENTRY_DSN, RELEASE=커밋 SHA |
| 프런트 오류 | 빌드 환경 VITE_SENTRY_DSN, VITE_RELEASE=커밋 SHA |

비밀값은 호스팅 환경과 비밀번호 관리자에 보관한다. 채팅·커밋·셸 인자·공유 문서에 넣지 않는다.
백업 암호화 키와 전화번호 암호화 키를 분리하고, 복구에 필요한 이전 키도 키 ID·사용 기간과 함께 보관한다.

## 매일 예약 정리와 백업

backend에서 `uv run python -m scripts.operations`를 실행한다.
탈퇴 삭제·음성 만료·관계 지수 계산을 수행하고, DB 백업을 암호화해 별도 버킷으로 올린다.
DB 작업 중복 실행은 Postgres advisory lock으로 막는다. DB 정리가 실패해도 백업을 시도하고 종료 코드는 실패(1)로 남긴다.
호출자에게 공개되는 작업용 HTTP API는 없다.

Render 무료 웹 서비스는 쉬는 동안 실행되지 않으므로 API 내부 타이머를 사용하지 않는다.
별도 실행 환경에서 한국 시각 04:00에 위 명령을 예약한다. Render Cron 예시는 `infra/render-operations.yaml`이다.
이 예시는 기본 Blueprint에서 분리돼 있고 자동 배포가 꺼져 있다. 생성 전에 비용과 환경값을 확인한다.
Render Cron은 최소 월 $1이 든다. [Render 공식 문서](https://render.com/docs/cronjobs)

운영 설정을 마친 뒤 한 번 수동 실행하고 종료 코드 0, 삭제 재시도 목록 비움, 백업 객체 생성을 확인한다.
스케줄러에 실패 알림을 설정하고 다음 날 예약 시각의 성공 로그까지 확인한 뒤 자동 운영으로 기록한다.
예약 실행 중단 시 Sentry 이벤트와 스케줄러 실행 기록을 함께 확인한다. Sentry 자체가 미설정이면 스케줄러 실패 알림이 필요하다.

## 비공개 음성 저장소

음성 전용 비공개 버킷을 만들고 공개 ACL·공개 정책을 차단한다. 음성 버킷에는 버전 관리를 사용하지 않는다.
코드는 버전 관리 이력이 있는 버킷을 거절한다. 삭제 마커 뒤에 개인정보 사본이 남는 것을 막기 위해서다.
권한은 해당 버킷의 GetObject·PutObject·DeleteObject·GetBucketVersioning만 부여한다.
백업 버킷 접근은 별도 경로/버킷으로 제한한다. 개발용 키와 운영용 키를 분리한다.

업로드 전에 AES-256-GCM으로 암호화하고, 내려받을 때 API에서 복호화한다.
음성 API는 방 참여자를 확인한 뒤 응답하며 private/no-store와 byte range를 지원한다.
저장·조회·삭제 I/O는 이벤트 루프 밖에서 실행한다. 재배포로 사라진 로컬 파일은 404 안내를 반환한다.

90일 만료와 탈퇴 삭제에서 파일 key를 DB 삭제 재시도 목록에 먼저 기록한다.
파일 삭제가 실패하면 다음 작업에서 재시도한다. 버킷에도 `voice/` 객체를 90일 뒤 만료시키는 수명 주기를 설정해 고아 파일을 정리한다.
이 수명 주기는 업로드 시각 기준이므로, 서비스의 메시지 생성 시각 기준 만료는 일일 작업이 담당한다.

기존 로컬 파일이 남아 있을 때는 업로드·예약 작업을 잠시 멈추고 다음 순서로 이전한다.

1. 기존 설정에서 예약 작업을 실행해 삭제 대기 파일을 먼저 정리한다.
2. S3 환경값을 설정한 작업 환경에서 `uv run python -m scripts.migrate_voice_storage`로 원본 파일 존재를 검사한다.
3. `uv run python -m scripts.migrate_voice_storage --apply`로 같은 key에 암호화 업로드하고 내용 일치를 확인한다. 재실행 가능하다.
4. API·작업 실행기 모두 같은 버킷·prefix와 MEDIA_STORAGE=s3를 사용하도록 맞춘다.
5. 시험 음성의 송신·수신·권한 차단·만료 삭제를 확인한 뒤 업로드를 재개한다.

Render의 기존 임시 디스크에서 이미 사라진 음성은 이전할 수 없다. 이전 명령은 누락 파일을 만나면 실패한다.

## 오류 수집과 로그

백엔드는 기본 수집기를 끄고, 처리되지 않은 HTTP 오류와 작업 오류를 명시적으로 수집한다.
보내는 이벤트는 예외 종류와 코드 위치, 배포 버전 등 허용한 필드로 다시 만든다.
예외 문구·로컬 변수·요청 본문·헤더·쿠키·사용자·SQL 바인딩·breadcrumb은 제거한다.
HTTP 로그에는 등록된 경로 템플릿, 메서드, 응답 코드, 소요 시간만 남긴다. 원본 URL·쿼리 문자열을 기록하는 uvicorn access log는 끈다.

프런트는 DSN이 있을 때 SDK를 지연 로딩한다. 전역 오류·처리되지 않은 Promise·React 경계 오류를 수집한다.
오류 문구를 제거하고 정적 JS 파일 이름과 줄 번호만 남긴다. 사용자·대화·화면 녹화·성능 추적은 수집하지 않는다.
SDK 초기화 실패가 앱 시작을 막지 않게 처리했다. 데모 빌드는 전송을 생략한다.

Sentry 프로젝트에서는 IP 저장 차단·데이터 보존 기간·접근 권한과 오류 알림 수신자를 설정한다.
Sentry 클라우드 도메인은 CSP에 반영했다. 자체 호스팅 수집기를 사용할 때는 해당 주소를 CSP에 명시한다.
활성화 후 합성 오류만 발생시켜 이벤트에 전화번호·토큰·대화가 없는지 수신 화면에서 확인한다.
프런트 소스맵은 공개 배포하지 않는다. 필요 시 CI의 비밀 토큰으로 수집 프로젝트에만 업로드한다.

## 백업과 빈 DB 복구

DB 클라이언트가 서버 버전 이상인지 먼저 확인한다. 운영 이미지는 Debian trixie의 postgresql-client를 포함한다.
백업은 pg_dump custom 형식을 스트림으로 암호화한다. BACKUP_ENCRYPTION_KEY는 별도의 base64 32바이트 키다.
백업 버킷은 비공개로 두고 7일 만료 수명 주기를 적용한다. 버전 관리 시 noncurrent 버전도 같은 기간에 제거한다.
초기 복구 목표는 하루 이내 데이터 손실(RPO 24시간)이다. 복구 소요 시간은 실제 데이터량으로 리허설한 뒤 확정한다.

backend에서 다음 명령을 사용한다. 파일 권한은 0600이고 기존 파일은 덮어쓰지 않는다.

```sh
uv run python -m scripts.backup create /안전한경로/database.dump.aes
uv run python -m scripts.backup verify /안전한경로/database.dump.aes
```

verify는 암호문 전체의 인증 태그와 pg_restore의 아카이브 목록을 검사한다.
실제 복구 가능 여부는 별도 빈 DB 복구로 확인한다. template0에서 만든 DB의 URL을 RESTORE_DATABASE_URL에만 설정한 뒤 실행한다.

```sh
uv run python -m scripts.backup restore /안전한경로/database.dump.aes --target-database 복구DB이름
```

복호화 무결성 확인 후에만 pg_restore를 실행한다. 대상 이름이 다르거나 사용자 테이블이 있으면 거절한다.
복구는 단일 트랜잭션으로 실행한다. 실제 운영 DB를 덮어쓰는 옵션은 제공하지 않는다.
매월 별도 빈 DB에서 복구하고 alembic current/check, 행 수, 시험 계정·보호자 복호화, 음성 접근을 확인한다.
DB 백업은 S3 음성 객체를 포함하지 않는다. 버킷 내구성·복구 정책은 별도로 확인한다.

재해 복구 시 외부 접근을 닫은 상태에서 보관 기간 정리 작업을 실행하고, 백업 이후 발생한 탈퇴·삭제 요청을 운영 기록과 대조해 반영한 뒤 서비스를 연다.
삭제된 정보를 과거 백업으로 복원한 상태로 공개하지 않는다. 백업 보존 기간도 개인정보 처리방침 확정 시 반영한다.

## 암호화 키 교체

1. DB 백업과 필요한 현재 키를 안전하게 보관하고 API 쓰기·예약 작업을 중지한다.
2. 새 DATA_ENCRYPTION_KEY와 DATA_ENCRYPTION_PREVIOUS_KEYS(이전 키 JSON 배열)를 API와 작업 실행기에 함께 설정한다. PHONE_HASH_PEPPER는 이 절차로 바꾸지 않는다.
3. `uv run python -m scripts.rotate_data_key`로 복호화와 대상 수를 검사한다. S3 사용 시 `--media`를 붙인다.
4. `uv run python -m scripts.rotate_data_key --apply --media`로 사용자·보호자 전화번호와 S3 음성을 교체한다. 로컬 저장소는 --media를 생략한다.
5. 같은 검사 명령을 다시 실행해 needs_rotation=0을 확인하고 합성 계정 로그인을 점검한다.
6. 모든 실행기의 키 설정이 일치하는지 확인하고 서비스를 재개한다. 이전 키의 환경값 제거는 백업 복구에 필요한 키를 안전하게 별도 보관한 뒤 수행한다.

DB 행은 200개씩 커밋해 재실행할 수 있다. 중간 실패 시 기존 키와 새 키를 모두 유지한 채 같은 명령을 재실행한다.
S3 음성 키 교체는 저장된 객체를 읽고 새 키로 덮어쓴다. 백업 파일 암호화 키는 별도이며 이 명령으로 교체되지 않는다.
