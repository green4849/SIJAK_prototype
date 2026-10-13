"""미션 (C12). 지금은 '첫 친구 3명 사귀기' 하나.

친구 수가 아니라 **서로 한 번 이상 말을 주고받은 친구** 수로 센다
— 아무나 추가해서 포인트만 받는 것 방지.
진행 상황은 대화 기록에서 계산하고, 보상은 point 원장에 한 번만 남는다.
"""

from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

from app.core.errors import DomainError
from app.domains.chat.service import ChatService
from app.domains.point.service import FIRST_FRIENDS_REWARD, PointService

if TYPE_CHECKING:
    from app.domains.auth.models import User

MissionCode = Literal["first_friends"]
FIRST_FRIENDS_GOAL = 3


class MissionNotDoneError(DomainError):
    code = "mission_not_done"


@dataclass(frozen=True)
class MissionStatus:
    code: MissionCode
    title: str
    description: str
    progress: int
    goal: int
    reward: int
    claimed: bool

    @property
    def done(self) -> bool:
        return self.progress >= self.goal


class MissionService:
    def __init__(self, chat: ChatService, points: PointService) -> None:
        self.chat = chat
        self.points = points

    async def list(self, me: "User") -> list[MissionStatus]:
        return [await self._first_friends(me)]

    async def claim(self, me: "User", code: MissionCode) -> MissionStatus:
        status = await self._first_friends(me)
        if status.claimed:
            return status
        if not status.done:
            raise MissionNotDoneError("아직 미션을 다 하지 않았어요.")
        await self.points.earn_first_friends(me.id)
        await self.points.commit()
        return await self._first_friends(me)

    async def _first_friends(self, me: "User") -> MissionStatus:
        talked = len(await self.chat.talked_friend_ids(me))
        return MissionStatus(
            code="first_friends",
            title="첫 친구 3명 사귀기",
            description="친구와 서로 한 번 이상 이야기를 나누면 1명으로 세어요",
            progress=min(talked, FIRST_FRIENDS_GOAL),
            goal=FIRST_FRIENDS_GOAL,
            reward=FIRST_FRIENDS_REWARD,
            claimed=await self.points.has_earned_first_friends(me.id),
        )
