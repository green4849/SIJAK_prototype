# 운영 경로당 데이터 가져오기

원본은 공공데이터포털의 [전국마을회관및경로당표준데이터](https://www.data.go.kr/data/15114136/standard.do)다. `scripts.import_welfare`는 이 중 주소·좌표가 있고 폐업 표시가 없는 **경로당**만 넣는다. 마을회관은 제외한다. 이 출처에는 노인복지관·시니어센터가 없고, 2026-11-27 응답에는 세종 자료도 없었다. 당시 원본 58,768행 중 42,015곳(16개 시·도)을 로컬 DB에 적재했다. 운영 DB 적재 여부는 별도로 확인해야 한다.

## 동작 방식

- 가져오기 코드가 읽는 비밀값은 `DATABASE_URL`과 `PUBLIC_DATA_API_KEY` 두 개다. 별도 실행 환경에서는 로그인·전화번호 암호화 키가 필요 없다.
- API의 모든 쪽을 받은 뒤 최소 30,000곳과 세종을 제외한 16개 시·도 존재 여부를 검사한다. 요청 실패나 건수·응답 형식 변화 시 DB는 바뀌지 않는다. 일시적인 429·5xx·연결 오류는 세 번까지 재시도한다.
- DB의 advisory lock으로 동시 적재를 막고, 500곳씩 `INSERT ... ON CONFLICT` 하되 **전체를 한 트랜잭션으로 커밋**한다. 재실행 시 같은 `(source, source_id)` 행의 정보를 갱신하고 ID와 연결된 프로그램·공간은 유지한다. 값이 같으면 갱신 시각도 바꾸지 않는다.
- 원본에는 시설 고유 ID가 없다. 관리기관 코드·시설명·주소의 해시를 열쇠로 사용하므로 이름이나 주소가 바뀐 예전 행은 자동 삭제하지 않는다. 원본의 대량 누락으로 기존 시설을 지우지 않기 위한 선택이며, 정기 재수집 후 오래된 행은 별도 검토가 필요하다.

## Docker Compose 운영 서버

API 컨테이너가 정상 실행되고 마이그레이션이 끝난 뒤, 운영자가 서버 콘솔에서 실행한다. `infra/.env.prod`는 기존 운영 설정을 사용한다. 공공데이터 키는 셸에 보이지 않게 입력하고 일회성 컨테이너에만 전달한다.

```bash
read -r -s -p 'PUBLIC_DATA_API_KEY: ' PUBLIC_DATA_API_KEY; echo
export PUBLIC_DATA_API_KEY
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod run --rm --no-deps -e PUBLIC_DATA_API_KEY api python -m scripts.import_welfare --all --dry-run
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod run --rm --no-deps -e PUBLIC_DATA_API_KEY api python -m scripts.import_welfare --all
unset PUBLIC_DATA_API_KEY
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod run --rm --no-deps api python -m scripts.import_welfare --status
```

첫 실행 전 `--dry-run` 결과의 16개 지역 건수를 확인한다. 실제 실행은 `적재 완료`와 DB 총건수가 출력되면 성공이다. 중간 실패는 종료 코드 1로 끝나며 다시 실행할 수 있다. 새 배포 때마다 자동 실행하지 않는다.

## Render + Neon

Render 무료 웹 서비스에는 셸이 없으므로 신뢰할 수 있는 별도 실행 환경에서 같은 코드를 일회성으로 실행한다. Neon의 **Direct** 연결 문자열을 사용하고, 배포된 API가 먼저 DB 마이그레이션을 적용했는지 확인한다. 로컬 프로젝트의 `backend` 폴더에서 두 값만 환경 변수로 입력한다. 프로젝트 `.env`의 로컬 DB 주소보다 셸 환경 변수가 우선한다.

```bash
read -r -s -p 'Neon DATABASE_URL: ' DATABASE_URL; echo
read -r -s -p 'PUBLIC_DATA_API_KEY: ' PUBLIC_DATA_API_KEY; echo
export DATABASE_URL PUBLIC_DATA_API_KEY
uv run python -m scripts.import_welfare --all --dry-run
uv run python -m scripts.import_welfare --all
unset PUBLIC_DATA_API_KEY
uv run python -m scripts.import_welfare --status
unset DATABASE_URL
```

`--status`는 API 호출 없이 DB의 시·도별 공공데이터 건수를 읽는다. 키·DB 주소는 커밋, 채팅, 공유 문서, 명령 인자에 넣지 않는다. 이 절차는 운영 DB에 쓰는 작업이므로 실행 전 백업과 대상 DB 주소를 운영자가 확인한다.
