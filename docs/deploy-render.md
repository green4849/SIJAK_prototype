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

공공데이터 경로당을 Neon 운영 DB에 넣는 일회성 실행 방법은 [경로당 데이터 가져오기](welfare-import.md)를 따른다.

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

## 휴대폰 인증 문자 켜기 (Firebase 전화 인증, B4)

지금은 `IDENTITY_PROVIDER=mock` — 화면에 인증번호가 떠서 주소를 아는 누구나 가입할 수 있다. 실제 문자로 바꾸는 순서.
문자는 브라우저의 Firebase 가 보내고, 서버는 Firebase 가 준 확인 토큰을 Google 공개키로 검증만 한다
(`backend/app/integrations/identity/firebase.py`) → **서비스 계정 키(비밀 파일)가 필요 없다.**

> 무료(Spark) 요금제로는 인증 문자를 보낼 수 없다 — Firebase 문서: 인증 문자는 "Pay as you go (Blaze) plan only".
> 한국 문자 한 건 값은 [Identity Platform 요금](https://cloud.google.com/identity-platform/pricing) 표에서 직접 확인할 것.

1. **프로젝트** — [Firebase 콘솔](https://console.firebase.google.com) → 프로젝트 만들기 (Google 애널리틱스는 꺼도 됨)
2. **요금제** — 왼쪽 아래 요금제 → **Blaze** 로 업그레이드(카드 등록).
   이어서 Google Cloud 콘솔 → 결제 → **예산 및 알림**에서 월 예산(예: 5,000원)과 50%·90%·100% 알림을 만든다.
   예산 알림은 알려 주기만 하고 멈추지는 않는다
3. **전화 로그인 켜기** — Authentication → 시작하기 → 로그인 방법 → **전화** 사용 설정
4. **문자 보낼 나라 제한** (요금 폭탄 막기) — Authentication → 설정 → **SMS 지역 정책** → 허용: 대한민국만
5. **승인된 도메인** — Authentication → 설정 → 승인된 도메인 → `sijak-6080.onrender.com` 추가
6. **웹 앱 등록** — 프로젝트 설정 → 일반 → 내 앱 → 웹(`</>`) → 앱 이름만 적고 등록 →
   보이는 설정에서 `projectId`, `apiKey`, `appId` 세 값을 확인
7. **API 키 제한** (권장) — Google Cloud 콘솔 → API 및 서비스 → 사용자 인증 정보 → 그 API 키 →
   애플리케이션 제한: 웹사이트, `https://sijak-6080.onrender.com/*`
8. **Render** — `sijak-6080-api` → Environment:
   `FIREBASE_PROJECT_ID`·`FIREBASE_WEB_API_KEY`·`FIREBASE_APP_ID` 를 넣고,
   `IDENTITY_PROVIDER=firebase`, `ALLOW_MOCK_IDENTITY_IN_PROD=false` 로 바꾼 뒤 **Manual Deploy**.
   세 값 중 하나라도 비면 API 가 이유를 출력하고 뜨지 않는다 (B1 안전장치).
   `render.yaml` 의 `IDENTITY_PROVIDER` 값도 `firebase` 로 바꿔 두어야 다음 Blueprint sync 때 mock 으로 돌아가지 않는다
9. **확인** — 내 휴대폰으로 가입해 본다. 개발·시연용으로는 Authentication → 설정 → **테스트용 전화번호**
   (최대 10개, 고정 인증번호, 문자가 가지 않음)를 쓰면 요금이 들지 않는다

- 개인정보 처리방침·동의서에는 이미 'Google(Firebase 인증)로 번호 전달'이 적혀 있다(문서 2026-11-26). 인증 화면의 안내는 firebase 로 바꾸면 자동으로 그 문구로 바뀐다
- 바꾸기 전에 Mock 으로 가입한 분도 같은 번호로 문자 인증하면 **그 계정으로 그대로 로그인**된다 (번호를 문자로 확인했으므로)
- 이름·생년월일·성별은 본인이 적은 값이다 — 문자 인증은 번호만 확인한다. 실제 본인 확인은 PASS(B4 다음 단계)

## 긴급 도움 문자 켜기 (보호자 문자, C10)

기본값 `SMS_PROVIDER=off` 는 긴급 도움을 **기록만** 하고, 화면도 「자동으로 알리지는 않았어요」라고 말한다. 켜면 누르는 즉시 등록된 보호자마다 문자가 간다.

1. https://solapi.com 가입 → 충전(문자는 건당 요금, 무료 아님)
2. **발신번호 등록** — 보낼 번호(회사·기관 대표번호 등)를 솔라피에서 인증·등록한다. 등록하지 않은 번호로는 보낼 수 없다(전기통신사업법)
3. 솔라피 콘솔 → API Key 관리 → 키 만들기 → **API Key·API Secret** (Secret 은 한 번만 보인다)
4. Render → `sijak-6080-api` → Environment → `SOLAPI_API_KEY`·`SOLAPI_API_SECRET`·`SMS_SENDER_NUMBER`(숫자만) 넣고 `SMS_PROVIDER` 를 `solapi` 로 → Save (다시 배포된다)
   - 하나라도 비면 서버가 뜨지 않는다(운영 설정 검사). `log` 는 운영에서 쓸 수 없다(보낸 척이 되므로)
5. 확인: 이 맥에서 Render 와 같은 환경값을 넣고 `uv run python -m scripts.sms_test <내 번호>` → 「solapi: 보냄 …」과 문자 도착. 이어서 앱에서 본인 번호를 보호자로 넣고 긴급 도움 → 「보호자에게 문자를 보냈어요」

- 문자 본문: 「[시작] ○○○님이 긴급 도움을 요청했어요. 바로 연락해 주세요. 010-…」 — 요청한 분의 번호가 들어간다(보호자가 바로 전화하게)
- 못 보낸 문자는 요청 때 한 번 더 시도하고, 그래도 남으면 예약 작업이 **1시간 안에서 3번까지** 다시 보낸다. 무료 Render 에는 상시 예약 작업이 없으니 `infra/render-operations.yaml` 의 Cron(유료) 이나 이 맥에서 `uv run python -m scripts.jobs sos-retry` 를 몇 분마다. docker-compose 운영은 `jobs` 서비스(`loop`)가 2분마다 한다
- 연달아 누르기는 10분에 3번까지(문자 폭탄 방지). 막혀도 화면의 '바로 전화하기'는 그대로
- 솔라피 연동은 공개 문서 형식대로 만들었고, 작업 환경에서는 솔라피에 접속하지 못해 실제 키로는 5번에서 처음 확인한다

## 카카오 로그인 켜기

기본값 `AUTH_MODE=phone` 은 휴대폰 인증으로 가입·로그인한다. 카카오로 바꾸면 로그인 화면에 카카오 버튼만 보인다.

1. https://developers.kakao.com → 내 애플리케이션 → 앱 만들기
2. 카카오 로그인 → **활성화**, Redirect URI 에 `https://sijak-6080.onrender.com/login/kakao/callback` 등록
3. 보안 → **Client Secret** 만들고 사용 설정 / 앱 키 → **REST API 키** 복사
4. Render → `sijak-6080-api` → Environment → `KAKAO_REST_API_KEY`·`KAKAO_CLIENT_SECRET` 넣고 `AUTH_MODE` 를 `kakao` 로 → Save
   - 셋 중 하나라도 비면 서버가 뜨지 않는다(운영 설정 검사). `KAKAO_REDIRECT_URI` 는 render.yaml 에 들어 있다(주소가 바뀌면 함께)
5. 확인: 사이트 → 카카오로 시작하기 → 동의 → 처음이면 이름·생년월일·성별 → 약관 동의 → 사는 동네

- **카카오 로그인은 본인 확인이 아니다.** 이름·생년월일은 가입하는 분이 직접 적는다 — 60세 이상 기준과 '실명 확인 이웃' 안내를 어떻게 지킬지는 운영 전에 정한다

## 휴대폰 알림 켜기 (Web Push, C4)

기본값(키 없음)은 새 소식을 **알림함에만** 쌓고, 설정 화면의 '휴대폰 알림' 칸은 「준비 중」이라고 말한다. 켜면 사용자가 설정에서 기기마다 알림을 켤 수 있고, 새 메시지·친구 신청·위험 대화가 앱을 닫아 둬도 휴대폰 알림으로 간다. 계정·요금 없음 — 서버 키(VAPID) 한 쌍만 있으면 된다.

1. 이 맥에서 키 만들기 — 화면에만 나오고 어디에도 저장되지 않는다
   ```bash
   cd backend && uv run python -m scripts.vapid_keys
   ```
2. Render → `sijak-6080-api` → Environment → `VAPID_PUBLIC_KEY`·`VAPID_PRIVATE_KEY` 에 1의 두 값 → Save (다시 배포된다)
   - 둘 중 하나만 넣으면 서버가 뜨지 않는다(운영 설정 검사). 비밀 키는 대화·문서·커밋에 붙이지 말 것
   - `VAPID_SUBJECT` 는 푸시 서비스가 문제 있을 때 연락할 곳 — 기본 사이트 주소. 운영자 메일이 생기면 `mailto:주소` 로
3. 확인: 안드로이드 크롬(또는 PC 크롬)에서 로그인 → 마이페이지 → 설정 → 휴대폰 알림 **켜기** → 브라우저 허용 → **시험 알림 보내기** → 알림이 뜨고 누르면 설정 화면

- 받는 곳: 안드로이드 크롬·삼성 인터넷, PC 크롬·엣지·파이어폭스. **아이폰은 iOS 16.4 이상에서 '홈 화면에 추가'한 앱만** (화면이 그렇게 안내한다)
- 메시지 내용은 알림에 넣지 않는다(「○○님이 메시지를 보냈어요」만). 밤 9시~아침 8시에는 소리·진동 없이
- 키를 바꾸면 그동안 켠 기기의 구독이 모두 쓸모없어진다 — 사용자가 설정에서 다시 켜야 한다. 그래서 키는 비밀번호 관리자에 따로 보관
- 활동 하루 전·추천 친구 시간 알림은 아직 없다 — 정해진 시각에 도는 예약 작업이 필요하다(docs/tasks/C4)

## 업데이트

`main` 에 병합되고 **CI 가 통과하면** GitHub Actions(`.github/workflows/render.yml`)가 두 서비스의 **Deploy Hook** 을 불러 다시 배포한다. 새 마이그레이션은 백엔드가 시작할 때 자동 적용(`alembic upgrade head`).

- Render 쪽 자동 배포는 끈다(`render.yaml` 의 `autoDeployTrigger: "off"`). 예전 `checksPass` 는 커밋마다 붙는 다른 GitHub 앱의 검사 묶음(실행 0개, 'queued' 그대로)이 끝나지 않아 자동 배포가 한 번도 일어나지 않았다
- Hook 은 main 의 **최신 커밋**을 배포한다. 그래서 워크플로는 CI 가 검사한 커밋이 아직 main 의 최신일 때만 부르고, 그사이 main 이 앞서 나갔으면 건너뛴다(새 커밋의 CI 가 끝나면 다시 돈다)
- 손으로 다시 배포: GitHub → Actions → **Deploy to Render** → Run workflow (그때의 main 최신 커밋, CI 결과는 보지 않음). 또는 Render 대시보드 → 서비스 → Manual Deploy

### 처음 한 번 — Deploy Hook 을 GitHub 에 넣기
1. Render 대시보드 → `sijak-6080-api` → **Settings → Deploy Hook** → 주소 복사
2. GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret** → 이름 `RENDER_DEPLOY_HOOK_API`, 값에 1의 주소
3. `sijak-6080`(화면)도 같은 방법으로 → 이름 `RENDER_DEPLOY_HOOK_WEB`
4. Render 에서 Blueprint 를 다시 맞춘다(**Blueprints → 이 Blueprint → Sync**) — 두 서비스의 Auto-Deploy 가 Off 로 바뀐다. 바뀌지 않으면 각 서비스 **Settings → Build & Deploy → Auto-Deploy** 를 직접 **Off** 로
5. 확인: GitHub → Actions → **Deploy to Render** → Run workflow → 로그에 `api: HTTP 2xx`·`web: HTTP 2xx`, 몇 분 뒤 Render Events 에 새 배포

- Hook 주소는 아는 사람 누구나 배포를 시작할 수 있는 비밀값이다 — 대화·문서·커밋에 붙이지 말고, 새어 나갔으면 Render 에서 **Regenerate** 한 뒤 Secrets 도 바꾼다
- Secrets 가 없으면 워크플로는 경고만 남기고 넘어간다(CI·시연 사이트 배포에는 영향 없음)

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
