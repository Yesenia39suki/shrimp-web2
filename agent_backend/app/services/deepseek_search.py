"""使用 DeepSeek 官方搜索接口取得公开资料摘要。"""

from dataclasses import dataclass

import httpx
from pydantic import ValidationError

from app.schemas.chat import ChatWebSource


class WebSearchError(RuntimeError):
    """联网搜索暂时不可用。"""


@dataclass(frozen=True, slots=True)
class SearchHit:
    source: ChatWebSource
    summary: str


class DeepSeekSearch:
    def __init__(self, *, api_key: str, base_url: str) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")

    async def search(self, query: str) -> list[SearchHit]:
        try:
            async with httpx.AsyncClient(base_url=self._base_url, timeout=10.0) as client:
                response = await client.post(
                    "/v1/tools/search",
                    headers={"Authorization": f"Bearer {self._api_key}"},
                    json={"query": query, "count": 6, "need_content": False},
                )
                response.raise_for_status()
                rows = response.json()["results"]
                if not isinstance(rows, list):
                    raise TypeError("搜索结果不是列表")
        except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
            raise WebSearchError("暂时无法联网检索。") from exc

        hits: list[SearchHit] = []
        seen_urls: set[str] = set()
        for row in rows[:6]:
            if not isinstance(row, dict):
                continue
            title = row.get("title")
            summary = row.get("summary") or row.get("snippet")
            if not isinstance(title, str) or not isinstance(summary, str) or not summary.strip():
                continue
            try:
                source = ChatWebSource(
                    source_id=f"W{len(hits) + 1}", title=" ".join(title.split())[:200], url=row.get("url"),
                )
            except ValidationError:
                continue
            url = str(source.url)
            if url in seen_urls or source.url.username or source.url.password:
                continue
            seen_urls.add(url)
            hits.append(SearchHit(source, " ".join(summary.split())[:1000]))
        return hits
