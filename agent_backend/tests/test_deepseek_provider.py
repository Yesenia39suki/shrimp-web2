"""DeepSeek Provider 测试。"""

import json
import unittest

import httpx

from app.services.deepseek_provider import DeepSeekProvider
from app.services.model_provider import ModelProviderError


class DeepSeekProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_sends_server_key_and_parses_json_response(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            self.assertEqual(request.url.path, "/chat/completions")
            self.assertEqual(request.headers["Authorization"], "Bearer server-secret")
            body = json.loads(request.content)
            self.assertEqual(body["model"], "deepseek-v4-flash")
            self.assertEqual(body["thinking"], {"type": "disabled"})
            self.assertEqual(body["response_format"], {"type": "json_object"})
            self.assertEqual(body["user_id"], "shrimp_opaque")
            return httpx.Response(
                200,
                json={
                    "model": "deepseek-v4-flash",
                    "choices": [
                        {
                            "finish_reason": "stop",
                            "message": {
                                "content": json.dumps(
                                    {
                                        "overall_assessment": "数据不足",
                                        "advice": [],
                                        "limitations": ["缺少水质数据"],
                                    },
                                    ensure_ascii=False,
                                )
                            },
                        }
                    ],
                    "usage": {
                        "prompt_tokens": 100,
                        "completion_tokens": 30,
                        "total_tokens": 130,
                    },
                },
            )

        provider = DeepSeekProvider(
            api_key="server-secret",
            transport=httpx.MockTransport(handler),
        )
        result = await provider.complete_json(
            system_prompt="输出 JSON",
            user_prompt="业务数据",
            user_id="shrimp_opaque",
        )

        self.assertEqual(result.model, "deepseek-v4-flash")
        self.assertEqual(result.content["overall_assessment"], "数据不足")
        self.assertEqual(result.usage.total_tokens, 130)

    async def test_rejects_non_json_model_content(self) -> None:
        def handler(_: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "model": "deepseek-v4-flash",
                    "choices": [
                        {
                            "finish_reason": "stop",
                            "message": {"content": "不是 JSON"},
                        }
                    ],
                    "usage": {},
                },
            )

        provider = DeepSeekProvider(
            api_key="server-secret",
            transport=httpx.MockTransport(handler),
        )

        with self.assertRaises(ModelProviderError):
            await provider.complete_json(
                system_prompt="输出 JSON",
                user_prompt="业务数据",
                user_id="shrimp_opaque",
            )

    async def test_retries_one_transient_server_error(self) -> None:
        request_count = 0

        def handler(_: httpx.Request) -> httpx.Response:
            nonlocal request_count
            request_count += 1
            if request_count == 1:
                return httpx.Response(503, json={"message": "temporarily unavailable"})
            return httpx.Response(
                200,
                json={
                    "model": "deepseek-v4-flash",
                    "choices": [
                        {
                            "finish_reason": "stop",
                            "message": {"content": '{"advice": []}'},
                        }
                    ],
                    "usage": {},
                },
            )

        provider = DeepSeekProvider(
            api_key="server-secret",
            max_retries=1,
            transport=httpx.MockTransport(handler),
        )

        result = await provider.complete_json(
            system_prompt="输出 JSON",
            user_prompt="业务数据",
            user_id="shrimp_opaque",
        )

        self.assertEqual(request_count, 2)
        self.assertEqual(result.content, {"advice": []})

    async def test_retries_one_invalid_json_response(self) -> None:
        request_count = 0

        def handler(_: httpx.Request) -> httpx.Response:
            nonlocal request_count
            request_count += 1
            content = "" if request_count == 1 else '{"advice": []}'
            return httpx.Response(
                200,
                json={
                    "model": "deepseek-v4-flash",
                    "choices": [
                        {
                            "finish_reason": "stop",
                            "message": {"content": content},
                        }
                    ],
                    "usage": {},
                },
            )

        provider = DeepSeekProvider(
            api_key="server-secret",
            max_retries=1,
            transport=httpx.MockTransport(handler),
        )

        result = await provider.complete_json(
            system_prompt="输出 JSON",
            user_prompt="业务数据",
            user_id="shrimp_opaque",
        )

        self.assertEqual(request_count, 2)
        self.assertEqual(result.content, {"advice": []})


if __name__ == "__main__":
    unittest.main()
