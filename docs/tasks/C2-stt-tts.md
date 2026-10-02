# C2. STT/TTS 연동

| 영역 | 크기 | 우선 | 상태 | 브랜치 |
|---|---|---|---|---|
| 기능 확장 | L | P1 | ⏸ 보류 | `feat/C2-stt-tts` |

## 왜
음성 중심 서비스의 핵심. 어르신 발화 인식률은 보고서 핵심 지표.

## 손댈 곳
integrations/stt, integrations/tts

## 완료 기준
- [ ] 음성 메시지 자막
- [ ] 받아쓰기(A5) 서버 인식
- [ ] 음성 메시지도 위험 탐지
- [ ] 어르신 발화 WER 측정

## 참고
docs/deferred.md §3

## 진행 기록

- 2026-10-02 결정: STT/TTS는 **앱과 별개 기능으로 명세 → 구현·평가(엔진 선택, 어르신 발화 WER) → 연결** 순서로 따로 진행. 이 저장소에서는 붙일 자리만 유지:
  - 음성 메시지: `backend/app/domains/chat/service.py` `send_voice()` 에서 변환 텍스트로 자막·`assess_message()` 호출
  - 받아쓰기 버튼(A5): 입력칸 옆
  - 앱이 알 인터페이스는 `integrations/stt` 하나(오디오 → 텍스트+신뢰도)
