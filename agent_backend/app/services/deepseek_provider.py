"""DeepSeek Chat Completions API 适配器。"""

import asyncio
import json
from typing import Any

import httpx

from app.services.model_provider import (
    JsonCompletion,
    ModelProviderAuthenticationError,
    ModelProviderError,
    ModelProviderRateLimitError,
    ModelUsage,
)


class DeepSeekProvider:
    """通过官方 OpenAI 兼容接口调用 DeepSeek。"""

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str = "https://api.deepseek.com",
        model: str = "deepseek-v4-flash",
        timeout_seconds: float = 60.0,
        max_tokens: int = 1200,
        max_retries: int = 1,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout = httpx.Timeout(timeout_seconds)
        self._max_tokens = max_tokens
        self._max_retries = max_retries
        self._transport = transport

    def _parse_success_response(self, response: httpx.Response) -> JsonCompletion:
        body: dict[str, Any] = response.json()
        choice = body["choices"][0]
        if choice.get("finish_reason") == "length":
            raise ValueError("模型输出被 max_tokens 截断")
        raw_content = choice["message"]["content"]
        if not isinstance(raw_content, str) or not raw_content.strip():
            raise ValueError("模型返回空内容")
        content = json.loads(raw_content)
        if not isinstance(content, dict):
            raise TypeError("模型 JSON 不是对象")

        usage_payload = body.get("usage", {})
        usage = ModelUsage(
            prompt_tokens=int(usage_payload.get("prompt_tokens", 0)),
            completion_tokens=int(usage_payload.get("completion_tokens", 0)),
            total_tokens=int(usage_payload.get("total_tokens", 0)),
        )
        response_model = body.get("model")
        return JsonCompletion(
            model=response_model if isinstance(response_model, str) else self._model,
            content=content,
            usage=usage,
        )

    async def complete_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        user_id: str,
    ) -> JsonCompletion:
        """调用非流式 JSON 模式；首版关闭思考模式以控制延迟与费用。"""

        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "thinking": {"type": "disabled"},
            "max_tokens": self._max_tokens,
            "stream": False,
            "user_id": user_id,
        }

        response: httpx.Response | None = None
        last_request_error: httpx.RequestError | None = None
        last_parse_error: Exception | None = None
        async with httpx.AsyncClient(
            base_url=self._base_url,
            timeout=self._timeout,
            transport=self._transport,
        ) as client:
            for attempt in range(self._max_retries + 1):
                response = None
                try:
                    response = await client.post(
                        "/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self._api_key}",
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                        },
                        json=payload,
                    )
                    last_request_error = None
                except httpx.RequestError as exc:
                    last_request_error = exc

                should_retry = (
                    last_request_error is not None
                    or (
                        response is not None
                        and 500 <= response.status_code < 600
                    )
                )
                if not should_retry or attempt >= self._max_retries:
                    if should_retry:
                        break
                else:
                    await asyncio.sleep(0.2 * (2**attempt))
                    continue

                if response is not None and response.is_success:
                    try:
                        return self._parse_success_response(response)
                    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
                        last_parse_error = exc
                        if attempt < self._max_retries:
                            await asyncio.sleep(0.2 * (2**attempt))
                            continue
                break

        if last_request_error is not None:
            raise ModelProviderError("DeepSeek API 暂时不可用。") from last_request_error
        if response is None:
            raise ModelProviderError("DeepSeek API 未返回响应。")

        if response.status_code in {401, 403}:
            raise ModelProviderAuthenticationError("DeepSeek API Key 无效。")
        if response.status_code == 429:
            raise ModelProviderRateLimitError("DeepSeek API 当前请求过多。")
        if not response.is_success:
            raise ModelProviderError(
                f"DeepSeek API 返回异常状态：{response.status_code}。"
            )
        if last_parse_error is not None:
            raise ModelProviderError(
                "DeepSeek 返回了无法解析的 JSON 结果。"
            ) from last_parse_error
        raise ModelProviderError("DeepSeek API 未返回可处理的结果。")
