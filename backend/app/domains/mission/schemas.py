from typing import Literal

from pydantic import BaseModel

from app.domains.mission.service import MissionStatus


class MissionOut(BaseModel):
    code: Literal["first_friends"]
    title: str
    description: str
    progress: int
    goal: int
    reward: int
    done: bool
    claimed: bool

    @classmethod
    def of(cls, m: MissionStatus) -> "MissionOut":
        return cls(
            code=m.code,
            title=m.title,
            description=m.description,
            progress=m.progress,
            goal=m.goal,
            reward=m.reward,
            done=m.done,
            claimed=m.claimed,
        )
