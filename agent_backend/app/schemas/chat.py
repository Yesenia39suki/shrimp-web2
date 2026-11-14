"""AI助手对话的请求与响应。"""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints

from app.schemas.advice import AdviceEvidence, FactId

Question = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=600)]
Answer = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1500)]
AnswerSection = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=850)]


class ChatTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: Question
    answer: Answer


class PondChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pond_id: UUID | None = None
    question: Question
    recent_turns: list[ChatTurn] = Field(default_factory=list, max_length=4)


class PondChatDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["pond", "knowledge", "unavailable"]
    answer: Answer | None = None
    fact_ids: list[FactId] = Field(default_factory=list, max_length=8)
    reference: AnswerSection | None = None
    source_ids: list[FactId] = Field(default_factory=list, max_length=6)
    next_step: AnswerSection | None = None
    search_query: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=128)] | None = None


class ChatWebSource(BaseModel):
    source_id: FactId
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    url: HttpUrl


class ChatWarningItem(BaseModel):
    id: str
    title: str
    status: str
    recorded_at: datetime | None = None
    trigger: str
    impact: str
    actions: list[str]
    verify: str


class PondChatResponse(BaseModel):
    answer: Answer
    evidence: list[AdviceEvidence] = Field(default_factory=list)
    sources: list[ChatWebSource] = Field(default_factory=list)
    search_note: str | None = None
    issues: list[ChatWarningItem] = Field(default_factory=list)
