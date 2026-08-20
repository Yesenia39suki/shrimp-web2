"""不依赖大模型的确定性基础风险计算。"""

from dataclasses import dataclass
from decimal import Decimal

from app.schemas.farm import (
    ActiveAlertSnapshot,
    MetricStatus,
    PondRiskAssessment,
    RiskLevel,
    WaterLatestSnapshot,
    WaterMetricAssessment,
    WaterThresholdSnapshot,
)


@dataclass(frozen=True, slots=True)
class MetricRule:
    key: str
    label: str
    unit: str
    minimum_field: str
    maximum_field: str


METRIC_RULES = (
    MetricRule("temperature", "温度", "℃", "temperature_min", "temperature_max"),
    MetricRule(
        "dissolved_oxygen",
        "溶解氧",
        "mg/L",
        "dissolved_oxygen_min",
        "dissolved_oxygen_max",
    ),
    MetricRule("ph", "pH", "", "ph_min", "ph_max"),
    MetricRule("orp", "氧化还原电位", "mV", "orp_min", "orp_max"),
    MetricRule("turbidity", "浊度", "NTU", "turbidity_min", "turbidity_max"),
    MetricRule("ammonia", "氨氮", "mg/L", "ammonia_min", "ammonia_max"),
    MetricRule("nitrite", "亚硝酸盐", "mg/L", "nitrite_min", "nitrite_max"),
    MetricRule("hardness", "钙/镁硬度", "mg/L", "hardness_min", "hardness_max"),
)

ALERT_RISK_SCORES = {"info": 31, "warning": 56, "critical": 76}
ALERT_LEVEL_ORDER = {"info": 1, "warning": 2, "critical": 3}


def _to_risk_level(score: int) -> RiskLevel:
    if score >= 76:
        return "高风险"
    if score >= 56:
        return "预警"
    if score >= 31:
        return "关注"
    return "低风险"


def _metric_status(
    value: Decimal | None,
    minimum: Decimal | None,
    maximum: Decimal | None,
) -> MetricStatus:
    if value is None:
        return "缺失"
    if minimum is None or maximum is None:
        return "未配置"
    if value < minimum:
        return "偏低"
    if value > maximum:
        return "偏高"
    return "正常"


def assess_pond_risk(
    *,
    latest_water: WaterLatestSnapshot | None,
    thresholds: WaterThresholdSnapshot | None,
    active_alerts: list[ActiveAlertSnapshot],
    water_data_stale: bool = False,
    water_age_hours: Decimal | None = None,
    water_stale_after_hours: int = 24,
) -> tuple[list[WaterMetricAssessment], PondRiskAssessment, str]:
    """按阈值和未解决报警生成可解释的单池风险结果。"""

    metrics: list[WaterMetricAssessment] = []
    abnormal_metrics: list[str] = []
    missing_metrics: list[str] = []

    for rule in METRIC_RULES:
        value = getattr(latest_water, rule.key) if latest_water else None
        minimum = getattr(thresholds, rule.minimum_field) if thresholds else None
        maximum = getattr(thresholds, rule.maximum_field) if thresholds else None
        metric_status = _metric_status(value, minimum, maximum)

        metrics.append(
            WaterMetricAssessment(
                key=rule.key,
                label=rule.label,
                unit=rule.unit,
                value=value,
                minimum=minimum,
                maximum=maximum,
                status=metric_status,
            )
        )

        if metric_status in {"偏低", "偏高"}:
            abnormal_metrics.append(rule.label)
        elif metric_status in {"缺失", "未配置"}:
            missing_metrics.append(rule.label)

    data_complete = (
        latest_water is not None
        and thresholds is not None
        and not missing_metrics
        and not water_data_stale
    )
    water_risk_score = min(100, len(abnormal_metrics) * 14) if data_complete else None

    highest_alert_level = None
    if active_alerts:
        highest_alert_level = max(
            (alert.level for alert in active_alerts),
            key=ALERT_LEVEL_ORDER.__getitem__,
        )
    alert_risk_score = ALERT_RISK_SCORES.get(highest_alert_level or "", 0)

    available_scores = [score for score in (water_risk_score, alert_risk_score) if score]
    risk_score = max(available_scores) if available_scores else (0 if data_complete else None)
    risk_level: RiskLevel = _to_risk_level(risk_score) if risk_score is not None else "数据不足"

    reasons: list[str] = []
    if latest_water is None:
        reasons.append("暂无最新水质数据")
    elif water_data_stale:
        reasons.append(f"最新水质数据已超过 {water_stale_after_hours} 小时")
    if thresholds is None:
        reasons.append("缺少水质阈值配置")
    if latest_water is not None and thresholds is not None and missing_metrics:
        reasons.append(f"水质缺失项：{'、'.join(missing_metrics)}")
    if abnormal_metrics:
        reasons.append(f"水质异常项：{'、'.join(abnormal_metrics)}")
    if active_alerts:
        reasons.append(f"当前未解决报警 {len(active_alerts)} 条")

    requires_attention = bool(reasons)
    summary = "；".join(reasons) if reasons else "水质参数均处阈值范围内，暂无未解决报警"

    return (
        metrics,
        PondRiskAssessment(
            risk_score=risk_score,
            risk_level=risk_level,
            water_risk_score=water_risk_score,
            alert_risk_score=alert_risk_score,
            requires_attention=requires_attention,
            data_complete=data_complete,
            water_data_stale=water_data_stale,
            water_age_hours=water_age_hours,
            water_stale_after_hours=water_stale_after_hours,
            abnormal_metrics=abnormal_metrics,
            missing_metrics=missing_metrics,
            active_alert_count=len(active_alerts),
            highest_alert_level=highest_alert_level,
            reasons=reasons,
        ),
        summary,
    )
