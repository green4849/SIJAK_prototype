"""백엔드 API 계약(OpenAPI)을 파일로 내보낸다 — 프론트 타입 생성(D3)의 원본.

    uv run python -m scripts.export_openapi          # 파일 갱신
    uv run python -m scripts.export_openapi --check  # 최신이 아니면 실패 (CI)

결과: frontend/src/shared/api/openapi.json → `npm run gen:api` 로 schema.d.ts 생성
"""

import json
import sys
from pathlib import Path

from app.main import app

OUT = Path(__file__).resolve().parents[2] / "frontend" / "src" / "shared" / "api" / "openapi.json"


def render() -> str:
    return json.dumps(app.openapi(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main() -> int:
    text = render()
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            print(
                "openapi.json 이 백엔드와 다릅니다. `uv run python -m scripts.export_openapi` 후 "
                "`npm run gen:api` 를 실행해 커밋하세요.",
                file=sys.stderr,
            )
            return 1
        print("openapi.json 최신")
        return 0
    OUT.write_text(text, encoding="utf-8")
    print(f"→ {OUT.relative_to(Path.cwd().parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
