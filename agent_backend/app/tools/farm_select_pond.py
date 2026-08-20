"""从已经过 RLS 筛选的全场概览中选择单个池塘。"""

from uuid import UUID

from app.schemas.farm import (
    FarmOverviewResponse,
    PondOverview,
    SinglePondOverviewResponse,
)


class PondNotAccessibleError(LookupError):
    """目标池塘不在当前用户可见范围内。"""


def select_visible_pond(
    overview: FarmOverviewResponse,
    pond_id: UUID,
) -> PondOverview:
    """只允许从 RLS 已返回的池塘集合中选择，避免越权探测。"""

    for pond in overview.ponds:
        if pond.pond.id == pond_id:
            return pond
    raise PondNotAccessibleError


def single_pond_response(
    overview: FarmOverviewResponse,
    pond_id: UUID,
) -> SinglePondOverviewResponse:
    """生成不包含其他池塘数据的单池 API 响应。"""

    return SinglePondOverviewResponse(
        generated_at=overview.generated_at,
        pond=select_visible_pond(overview, pond_id),
    )


def scope_overview_to_pond(
    overview: FarmOverviewResponse,
    pond_id: UUID,
) -> FarmOverviewResponse:
    """为单池模型调用重建场级计数，确保提示词只含目标池塘事实。"""

    pond = select_visible_pond(overview, pond_id)
    equipment = pond.equipment
    requires_attention = pond.risk.requires_attention or (
        equipment is not None and equipment.requires_attention
    )
    organization_id = pond.pond.organization_id

    return FarmOverviewResponse(
        generated_at=overview.generated_at,
        organization_ids=[organization_id],
        total_ponds=1,
        attention_ponds=int(requires_attention),
        normal_ponds=int(not requires_attention),
        data_insufficient_ponds=int(not pond.risk.data_complete),
        water_trend_data_ponds=int(pond.recent_water is not None),
        shrimp_data_ponds=int(pond.latest_shrimp is not None),
        feeding_data_ponds=int(pond.recent_feeding is not None),
        equipment_data_ponds=int(equipment is not None),
        lost_connection_devices=(
            equipment.lost_connection_device_count if equipment is not None else 0
        ),
        unknown_heartbeat_devices=(
            equipment.unknown_heartbeat_device_count if equipment is not None else 0
        ),
        ponds=[pond],
        global_alerts=[
            alert
            for alert in overview.global_alerts
            if alert.organization_id == organization_id
        ],
    )
