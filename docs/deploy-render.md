# Render + Neon 무료 배포 (시범 운영)

서버를 사지 않고 실제 앱(데모 아님)을 띄우는 방법이다. 예약 정리·S3 음성·오류 수집·암호화 백업은 [운영 작업 문서](operations.md)를 함께 따른다. 서버 1대 Docker 구성은 [`deploy.md`](deploy.md).

```
브라우저 ─► sijak-6080.onrender.com      (Render 정적 사이트 — 화면)
              │ /api/* rewrite
              ▼
            sijak-6080-api.onrender.com  (Render 무료 웹 서비스 — FastAPI, Docker)
              │
              ▼
            Neon 무료 Postgres            (싱가포르)
```

설정 파일: 저장소 맨 위 [`render.yaml`](../render.yaml) (Render Blueprint).

## 무료 플랜이라 생기는 일 (시범 운영 전에 알아 둘 것)

| 항목 | 내용 |
|---|---|
| 잠들기 | 백엔드가 **15분 동안 요청이 없으면 잠든다.** 다음 첫 요청은 깨어나는 데 약 1분. 화면은 바로 뜨지만 첫 로그인·목록이 늦다 |
| 음성 메시지 파일 | 백엔드 디스크가 임시라 **재시작·재배포·잠들 때마다 파일이 사라진다** (메시지 줄은 남고 소리만 없음). 무료로는 디스크를 붙일 수 없다 |
| 예약 작업 | 매일 새벽 작업(탈퇴 30일 계정 삭제·음성 파일 정리·관계 지수 계산)은 **돌지 않는다** — Render 무료에는 cron·백그라운드 작업이 없다. 관계 지수는 화면을 열 때 계산된다 |
| 시간 한도 | 계정 전체 무료 웹 서비스 월 750시간 (1개를 24시간 켜 두면 충분). 넘으면 그달 말까지 멈춤 |
| DB | Neon 무료: 1GB, 5분 쉬면 잠들었다가 요청 오면 깨어남. 백업은 6시간 되돌리기만 |
| 본인인증 | 실제 문자 인증 전이라 **Mock** — 주소를 아는 누구나 화면에 뜬 인증번호로 가입할 수 있다 |
| 운영자 역할 | 무료에는 셸이 없어 `scripts.set_role` 을 서버에서 못 돌린다 → 이 맥에서 DB 주소로 직접 돌린다 (아래) |

실제 사용자를 받기 전에 남은 것: 실제 본인인증(B4), DB 정기 백업(B12), 약관의 운영자·보호책임자 정보 채우기(B6).

**개인정보 처리방침에 적은 '탈퇴 30일 뒤 삭제'·'음성 90일 뒤 삭제'는 예약 작업이 해야 한다.** Render 무료에는 예약 작업이 없으므로, 시범 운영 중에는 별도 일일 스케줄러를 구성한다. 구성 전에는 운영자가 이 맥에서 매일 `uv run python -m scripts.jobs daily` 를 돌린다(아래 '이 맥에서 돌릴 때'). 안 돌리면 처리방침과 실제가 달라진다.

## 처음 한 번

### 1. Neon — DB 만들기
1. https://neon.com 가입·로그인 (GitHub 계정으로 가능)
2. 새 프로젝트: Postgres 16 이상, **지역 AWS Asia Pacific (Singapore)**
3. 대시보드 **Connect** → 연결 문자열에서 **Connection pooling 끄기**(Direct) → 복사
   - `postgresql://…@ep-….ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` 모양 그대로 써도 된다 (`config.py` 의 `to_asyncpg_url` 이 asyncpg 용으로 바꿈)
   - 이 주소에는 비밀번호가 들어 있다 — 대화·문서·커밋에 붙이지 말 것

### 2. Render — Blueprint 로 두 서비스 만들기
1. https://render.com 가입·로그인 (GitHub 계정), GitHub 앱에 `green4849/SIJAK_prototype` 접근 허용
2. **New → Blueprint** → 저장소 선택 → 브랜치 `main` → `render.yaml` 을 읽어 두 서비스를 보여 준다
3. `DATABASE_URL` 입력칸에 1-3의 주소를 붙여 넣고 **Apply**
4. 첫 배포가 끝나면 확인
   - `https://sijak-6080-api.onrender.com/api/v1/health` → `{"status":"ok"}`
   - `https://sijak-6080.onrender.com/api/v1/health` → 같은 응답 (rewrite 확인)
   - `https://sijak-6080.onrender.com/` 시작 화면, 직접 연 화면 주소(`/welcome` 등)도 열림
5. **비밀값 보관**: `sijak-6080-api` → Environment 에서 `DATA_ENCRYPTION_KEY`·`PHONE_HASH_PEPPER`·`JWT_SECRET` 값을 복사해 비밀번호 관리자 등 안전한 곳에 따로 둔다. `DATA_ENCRYPTION_KEY` 를 잃으면 저장된 전화번호를 풀 수 없다 (B12)

**서비스 이름이 이미 쓰이는 경우** Render 가 주소 뒤에 글자를 붙인다(`sijak-6080-xxxx.onrender.com`). 그때는 실제 주소로 `render.yaml` 의 `CORS_ORIGINS`·`VITE_SITE_URL`·`/api/*` rewrite `destination` 을 고쳐 커밋하고 Blueprint 를 다시 맞춘다(Sync).

## 업데이트

`autoDeployTrigger: checksPass` — `main` 에 병합되고 **CI 가 통과하면** 두 서비스가 저절로 다시 배포된다. 새 마이그레이션은 백엔드가 시작할 때 자동 적용(`alembic upgrade head`).

## 운영 메모

| 할 일 | 방법 |
|---|---|
| 로그 | Render 대시보드 → `sijak-6080-api` → Logs |
| 시연 이웃 넣기 | 이 맥에서 `uv run python -m scripts.seed` (아래처럼 환경값을 넣은 뒤) |
| 운영자 역할 | 이 맥에서 `uv run python -m scripts.set_role <전화번호> operator` (아래처럼 환경값을 넣은 뒤) |
| 예약 작업 한 번 | 이 맥에서 `uv run python -m scripts.jobs daily` (아래처럼 환경값을 넣은 뒤. 음성 파일 정리는 서버 디스크라 해당 없음) |
| DB 백업 | 이 맥에서 `pg_dump "$DATABASE_URL" \| gzip > backup-$(date +%F).sql.gz` — Neon 무료는 6시간 되돌리기만 있다 |

**이 맥에서 돌릴 때는 Render 와 같은 비밀값이 필요하다.** 시드·역할 변경은 전화번호를 `DATA_ENCRYPTION_KEY` 로 암호화하고 `PHONE_HASH_PEPPER` 로 찾으므로, 값이 다르면 넣은 이웃으로 로그인할 수 없고 역할 변경은 사람을 찾지 못한다. 셸 기록에 남지 않게 이렇게 넣는다:

```bash
cd backend
read -s DATABASE_URL && export DATABASE_URL            # Neon 주소
read -s DATA_ENCRYPTION_KEY && export DATA_ENCRYPTION_KEY
read -s PHONE_HASH_PEPPER && export PHONE_HASH_PEPPER
uv run python -m scripts.seed
```
