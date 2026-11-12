"""模型供应商的最小抽象，避免业务代码绑定具体厂商。"""

from dataclasses import dataclass
from typing import Any, Protocol


class ModelProviderError(RuntimeError):
    """模型服务不可用或返回了无法处理的结果。"""


class ModelProviderAuthenticationError(ModelProviderError):
    """模型服务拒绝了服务端 API Key。"""


class ModelProviderRateLimitError(ModelProviderError):
    """模型服务触发限流。"""


@dataclass(frozen=True, slots=True)
class ModelUsage:
    """一次模型调用的 token 用量。"""

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass(frozen=True, slots=True)
class JsonCompletion:
    """经过基础解析的 JSON 模型响应。"""

    model: str
    content: dict[str, Any]
    usage: ModelUsage


class ModelProvider(Protocol):
    """业务层需要的模型能力。"""

    async def complete_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        user_id: str,
    ) -> JsonCompletion:
        """生成一个 JSON 对象。"""

