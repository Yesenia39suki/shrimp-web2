"""使用服务端 secret 追加可信 Agent 审计记录。"""

from collections.abc import Sequence
from typing import Any
from uuid import UUID

import httpx

from app.schemas.advice import FarmAdviceItem, FarmAdviceResponse
from app.schemas.audit import AdviceAuditAppendRow
from app.schemas.farm import FarmOverviewResponse, PondOverview


class AdviceAuditAppendError(RuntimeError):
    """可信审计记录未能完整追加。"""


def _unique_fact_ids(items: Sequence[FarmAdviceItem]) -> list[str]:
    return list(
        dict.fromkeys(
            evidence.fact_id
            for item in items
            for evidence in item.evidence
        )
    )


def _scoped_limitations(
    limitations: Sequence[str],
    *,
    pond_code: str,
    all_pond_codes: set[str],
    include_global: bool,
) -> list[str]:
    """排除明确属于其他池塘的限制，避免跨企业历史内容混入。"""

    scoped: list[str] = []
    other_codes = all_pond_codes - {pond_code}
    for limitation in limitations:
        if any(other_code in limitation for other_code in other_codes):
            continue
        if not include_global and pond_code not in limitation:
            continue
        scoped.append(limitation)
    return scoped


def _scoped_advice(
    response: FarmAdviceResponse,
    *,
    pond: PondOverview,
    all_pond_codes: set[str],
    include_global: bool,
) -> list[FarmAdviceItem]:
    """仅保留当前池塘建议以及不引用其他池塘的全局建议。"""

    pond_code = pond.pond.pond_code
    scoped: list[FarmAdviceItem] = []
    for item in response.result.advice:
        if item.pond_code == pond_code:
            scoped.append(item)
            continue
        if item.pond_code is not None:
            continue
        if not include_global:
            continue
        serialized = " ".join(
            (
                item.title,
                item.basis,
                *(evidence.statement for evidence in item.evidence),
                *item.actions,
            )
        )
        if not any(code in serialized for code in all_pond_codes - {pond_code}):
            scoped.append(item)
    return scoped


def build_advice_audit_rows(
    *,
    overview: FarmOverviewResponse,
    response: FarmAdviceResponse,
    requested_by_user_id: UUID,
    request_id: str,
    endpoint: str,
) -> list[AdviceAuditAppendRow]:
    """只从 JWT/RLS 概览和最终已校验响应构造逐池审计行。"""

    all_pond_codes = {item.pond.pond_code for item in overview.ponds}
    include_global = len(set(overview.organization_ids)) <= 1
    rows: list[AdviceAuditAppendRow] = []
    for pond in overview.ponds:
        scoped_advice = _scoped_advice(
            response,
            pond=pond,
            all_pond_codes=all_pond_codes,
            include_global=include_global,
        )
        pond_code = pond.pond.pond_code
        result_payload: dict[str, Any] = {
            "overall_assessment": (
                f"{pond_code} 本次规则风险等级为 {pond.risk.risk_level}。"
            ),
            "advice": [
                item.model_dump(mode="json") for item in scoped_advice
            ],
            "limitations": _scoped_limitations(
                response.result.limitations,
                pond_code=pond_code,
                all_pond_codes=all_pond_codes,
                include_global=include_global,
            ),
            "disclaimer": response.disclaimer,
        }
        rows.append(
            AdviceAuditAppendRow(
                organization_id=pond.pond.organization_id,
                pond_id=pond.pond.id,
                endpoint=endpoint,
                requested_by_user_id=requested_by_user_id,
                request_id=request_id,
                model_name=response.model,
                generation_status=response.generation_status,
                safe_fallback=response.generation_status == "safe_fallback",
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                total_tokens=response.usage.total_tokens,
                risk_level=pond.risk.risk_level,
                risk_score=pond.risk.risk_score,
                fact_ids=_unique_fact_ids(scoped_advice),
                result_payload=result_payload,
                generation_note=response.generation_note,
                generated_at=response.generated_at,
                overview_generated_at=response.overview_generated_at,
            )
        )
    return rows


class AdviceAuditWriter:
    """能力固定为向 ai_request_logs 批量追加，不能访问业务表。"""

    _AUDIT_PATH = "/rest/v1/ai_request_logs"

    def __init__(
        self,
        *,
        base_url: str,
        secret_key: str,
        timeout_seconds: float = 10.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._secret_key = secret_key
        self._client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            timeout=httpx.Timeout(timeout_seconds),
            transport=transport,
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def append(self, rows: Sequence[AdviceAuditAppendRow]) -> None:
        """以单个 Data API 请求原子追加所有逐池审计行。"""

        if not rows:
            return
        payload = [row.model_dump(mode="json") for row in rows]
        try:
            response = await self._client.post(
                self._AUDIT_PATH,
                headers={
                    "apikey": self._secret_key,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                json=payload,
            )
        except httpx.RequestError as exc:
            raise AdviceAuditAppendError("Supabase 审计追加服务暂时不可用。") from exc
        if not response.is_success:
            raise AdviceAuditAppendError("Supabase 拒绝追加可信审计记录。")
