"""模型养殖建议接口的数据结构。"""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

AdvicePriority = Literal["高", "中", "低"]
FactId = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=80),
]
PondCode = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=50),
]
AdviceTitle = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=80),
]
AdviceAction = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=300),
]
AdviceCategory = Literal[
    "数据补全",
    "水质",
    "投喂",
    "增氧",
    "预警处置",
    "常规巡检",
]
AdviceGenerationStatus = Literal["model_generated", "safe_fallback"]


class AdviceEvidence(BaseModel):
    """由后端事实目录展开的可核验依据。"""

    fact_id: FactId
    statement: str = Field(min_length=1, max_length=500)


class FarmAdviceDraftItem(BaseModel):
    """模型可以生成的最小建议草稿。"""

    model_config = ConfigDict(extra="forbid")

    pond_code: PondCode | None = None
    priority: AdvicePriority
    category: AdviceCategory
    title: AdviceTitle
    evidence_fact_ids: list[FactId] = Field(min_length=1, max_length=6)
    actions: list[AdviceAction] = Field(min_length=1, max_length=5)


class FarmAdviceDraft(BaseModel):
    """DeepSeek 必须返回的 JSON 结构；不允许自行生成事实描述。"""

    model_config = ConfigDict(extra="forbid")

    advice: list[FarmAdviceDraftItem] = Field(max_length=10)


class FarmAdviceItem(BaseModel):
    """经过后端事实绑定和安全校验的建议。"""

    pond_code: PondCode | None = None
    priority: AdvicePriority
    category: AdviceCategory
    title: AdviceTitle
    basis: str = Field(min_length=1, max_length=2000)
    evidence: list[AdviceEvidence] = Field(min_length=1, max_length=6)
    actions: list[AdviceAction] = Field(min_length=1, max_length=5)


class FarmAdviceContent(BaseModel):
    """后端组装后的可信建议内容。"""

    overall_assessment: str = Field(min_length=1, max_length=800)
    advice: list[FarmAdviceItem] = Field(max_length=10)
    limitations: list[str] = Field(max_length=10)


class ModelUsageResponse(BaseModel):
    """前端可观察的模型 token 用量。"""

    prompt_tokens: int = Field(ge=0)
    completion_tokens: int = Field(ge=0)
    total_tokens: int = Field(ge=0)


class FarmAdviceResponse(BaseModel):
    """一次基于当前用户 RLS 可见数据生成的模型建议。"""

    generated_at: datetime
    overview_generated_at: datetime
    model: str
    result: FarmAdviceContent
    usage: ModelUsageResponse
    generation_status: AdviceGenerationStatus = "model_generated"
    generation_note: str | None = Field(default=None, max_length=300)
    disclaimer: str = "模型建议仅供养殖决策辅助，关键操作需由专业人员复核。"
