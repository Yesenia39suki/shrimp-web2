"""按实际报警和阈值逐条生成现场核查与处理建议。"""

import re
from dataclasses import dataclass
from decimal import Decimal

from app.schemas.chat import ChatWarningItem, ChatWebSource, PondChatResponse
from app.schemas.farm import ActiveAlertSnapshot, PondOverview, WaterMetricAssessment
from app.services.risk_engine import METRIC_RULES

REPORT_QUESTION = re.compile(
    r"(?:逐条|分别|每条|每项|各项|哪些|有什么).{0,16}(?:预警|告警|报警|异常)|"
    r"(?:预警|告警|报警|异常).{0,12}(?:经过|原因|解释|处理|解决)|"
    r"(?:为什么|为啥).{0,8}(?:预警|告警|报警)|"
    r"异常(?:项|值|指标)?(?:有)?(?:什么|哪些)|"
    r"(?:符合|适合|适宜).{0,10}(?:生长|养殖).{0,4}(?:环境|条件)|"
    r"(?:池子|池塘|本池|当前池).{0,24}(?:建议|改进|改善|处理|分析|怎么办)"
)
POND_ADVICE_QUESTION = re.compile(r"建议|意见|处理|解决|改进|改善|分析|怎么办")
HISTORICAL_QUESTION = re.compile(r"上一次|上次|上一条|上次的|此前|之前|昨天|历史建议")
POND_CODE = re.compile(r"(?<![A-Z0-9_-])[A-Z][A-Z0-9]*(?:[-_][A-Z0-9]+)*[-_]\d+(?![A-Z0-9_-])", re.IGNORECASE)
NUMBER = r"[-+]?\d+(?:\.\d+)?"
ALERT_RANGE = re.compile(rf"\s*({NUMBER})\s*(?:[-~～—–至到])\s*({NUMBER})")
ALERT_VALUE = re.compile(rf"\s*({NUMBER})")
ALERT_LEVELS = {"critical": "严重", "warning": "预警", "info": "提示"}


@dataclass(frozen=True, slots=True)
class Handling:
    impact: str
    actions: tuple[str, ...]
    verify: str


LOW_NITROGEN = Handling(
    "低于配置下限只说明触发了规则。氨氮或亚硝酸盐偏低通常无需人为升高。",
    ("用试剂或另一台仪器复测，核对单位、检测下限和配置的下限。",
     "若复测仍低且养殖状态正常，请管理人员核对这项下限是否符合监测目的。"),
    "记录复测结果，并核对修正配置后报警是否停止重复触发。",
)

HANDLING = {
    "dissolved_oxygen": {
        "偏低": Handling(
            "持续低氧会使对虾应激、摄食下降，凌晨和池底容易出现更低的读数。",
            ("用校准仪器在不同点位复测表层和近底层，观察虾群活动和水流。",
             "确认低氧后立即检查增氧机供电、进气或叶轮是否异常，开启可用的备用增氧机并让水流覆盖虾聚集的区域。若浮头或残饵明显，先暂缓投喂。",
             "若表层读数正常但近底层缺氧，重点恢复水体循环，避免只在增氧机旁采样。"),
            "增氧后在原异常点位和近底层复测。溶氧回到本池阈值且虾不再浮头后，再判断是否恢复投喂，并复查下一次清晨低点。",
        ),
        "偏高": Handling(
            "午后光合作用或仪器补偿偏差都可能造成高读数。持续偏高时要看饱和度和昼夜变化。",
            ("用校准探头复测，核对水温、盐度补偿及溶氧饱和度。",
             "对比清晨和午后读数，同时观察藻量和水色，由现场人员据此调整巡测安排。"),
            "比较同点位清晨、午后的溶氧与饱和度，确认偏高是否持续。",
        ),
    },
    "ph": {
        "偏低": Handling(
            "只在清晨偏低、午后回升，可能与夜间呼吸积累二氧化碳有关。全天偏低则优先查缓冲能力和水源。",
            ("在同一池内点位比较清晨和午后 pH，并同时测总碱度；总硬度不能代替总碱度。",
             "若清晨同时缺氧，先增氧和恢复水体循环。若全天偏低且总碱度低，由现场人员先做小样试验，再分步补充缓冲能力。",
             "若异常紧随降雨或进水出现，对比进水口与池内的 pH 和盐度；有风险的进水先暂停，避免继续引入偏酸或盐度差异大的水。"),
            "比较同点位清晨和午后的 pH，复核总碱度，确认低点回升且日内波动减小。",
        ),
        "偏高": Handling(
            "高 pH 和高水温会共同提高非离子氨的比例。若只有午后 pH 高且水色浓，藻类光合作用是待验证的原因。",
            ("在同一时间和点位联测 pH、氨氮、水温和溶氧，并补测总碱度；若同时缺氧，先恢复有效增氧。",
             "若午后高、清晨回落且水色很浓，暂停施肥和碱性投入，保持水体循环和夜间增氧，避免用杀藻剂快速压 pH。",
             "若全天偏高且氨氮也高，先暂停加料，查料台残饵、可排出的底部积污和进水水质。只有水源合格且温度、盐度接近时，才考虑分次少量换水。"),
            "次日用相同点位的清晨和午后读数对比 pH、氨氮和溶氧，观察虾群活动是否恢复。",
        ),
    },
    "temperature": {
        "偏低": Handling(
            "降温可能降低对虾活动和摄食，水温变化越急，越容易出现应激。",
            ("核对天气和进水记录，分点测表层与底层水温，确认是否存在温差。",
             "确认持续低温后，检查已有保温或防风设施，由现场人员安排逐步恢复水温。"),
            "在原点位连续复测水温，并观察活动和摄食是否恢复。",
        ),
        "偏高": Handling(
            "高温会改变对虾耗氧和水体持氧能力，可能与低氧同时出现。",
            ("复测表层和底层水温，核对午后日晒、进水温差，并同步测溶氧。",
             "现场确认同时缺氧时，先检查增氧机供电和水流覆盖，恢复有效增氧；用料台残饵和摄食情况决定是否暂缓加料。",
             "若主要在午后升温，先用已有遮阴设施、保持水体循环。合格源水温度、盐度接近时，可考虑缓慢补水，避免一次性注入大量冷水。"),
            "在午后高温时段和次日清晨分别复测水温和底层溶氧，确认温度峰值下降且低氧没有反复。",
        ),
    },
    "orp": {
        "偏低": Handling(
            "氧化还原电位偏低可能与底层耗氧、有机物积累或探头状态有关。",
            ("清洁并核验探头，在原点位及近底层复测，同时测溶氧和 pH。",
             "确认底层异常后核对残饵、底泥和水流覆盖，按现场流程处理已确认的积累。"),
            "在同点位复核 ORP、近底层溶氧和 pH，看趋势是否恢复。",
        ),
        "偏高": Handling(
            "ORP 会受 pH、溶氧、探头状态和水体处理过程影响，单项偏高无法判断原因。",
            ("清洁探头并交叉复测，同时核对水温、pH 和溶氧。",
             "核对进水、消毒或氧化剂使用记录，由现场人员复核处理流程和残留。"),
            "在同点位复测 ORP 和相关指标，确认偏高是否持续。",
        ),
    },
    "turbidity": {
        "偏低": Handling(
            "较低浊度可能反映颗粒或藻量较少，也可能是点位或阈值设置所致。",
            ("清洁传感器，复测并核对水色、透明度和近期换水记录。",
             "若水体和虾群状态正常，由管理人员核对浊度下限的设置目的。"),
            "对比同点位浊度和水色变化，判断是否需要继续跟踪。",
        ),
        "偏高": Handling(
            "浊度升高可能来自进水带入的泥沙、底泥扰动、残饵或藻量变化。",
            ("在进水口和池内不同点位取样，观察静置后是泥沙沉降还是水色仍深。",
             "核对进水、底泥扰动和投喂记录，优先处理确认的浑浊来源。"),
            "在相同点位复测浊度，并同步看水色、溶氧有无异常。",
        ),
    },
    "ammonia": {
        "偏低": LOW_NITROGEN,
        "偏高": Handling(
            "氨氮累积可能造成应激，水温和 pH 较高时更需要同时评估非离子氨风险。",
            ("用试剂复测氨氮，同步记录 pH、水温和溶氧，核对试剂量程与单位。",
             "确认仍高后排查残饵、排污和水处理设施，优先处理已确认的污染来源。"),
            "处理后复测氨氮和 pH，继续记录趋势，直到数值稳定在场区阈值内。",
        ),
    },
    "nitrite": {
        "偏低": LOW_NITROGEN,
        "偏高": Handling(
            "持续偏高会增加对虾应激，也可能提示氮转化环节受影响。",
            ("复测亚硝酸盐，并同步记录氨氮、溶氧和盐度，核对报告单位。",
             "确认仍高后检查进水、底层有机物及已有生物处理设施，由现场人员排查失稳原因。"),
            "处置后连续复测亚硝酸盐和氨氮，确认两个指标的趋势都改善。",
        ),
    },
    "hardness": {
        "偏低": Handling(
            "硬度偏低可能反映钙镁供应不足，对蜕壳期的判断还要结合盐度和单项浓度。",
            ("复测总硬度，补测钙、镁、盐度，并核对近期进水记录。",
             "确认有缺项后由现场人员按养殖阶段制定分步补充方案。"),
            "复核总硬度、钙镁和盐度，观察蜕壳与活力有无异常。",
        ),
        "偏高": Handling(
            "硬度升高可能与源水、蒸发浓缩或近期补充矿物质有关，需结合盐度判断。",
            ("复测总硬度、钙镁和盐度，对比源水及不同点位。",
             "核对补水和矿物质投入记录，确认来源后按现场流程逐步处理。"),
            "复测处理前后硬度和盐度，确认没有出现快速变化。",
        ),
    },
}

GENERAL_HANDLING = Handling(
    "这条记录需要现场确认。现有信息无法判断持续程度或根因。",
    ("核对报警来源、点位和设备状态，现场复测对应指标或检查设备。",
     "若异常仍存在，交由值班人员按对应设备或水质处置流程处理。"),
    "记录现场结果和处理时间，确认对应异常恢复后再更新报警状态。",
)


def wants_warning_report(question: str, pond_code: str) -> bool:
    if HISTORICAL_QUESTION.search(question):
        return False
    codes = POND_CODE.findall(question)
    if any(code.casefold() != pond_code.casefold() for code in codes):
        return False
    return bool(REPORT_QUESTION.search(question) or (codes and POND_ADVICE_QUESTION.search(question)))


def _short(text: str, limit: int = 250) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[:limit - 1] + "…"


def _alert_direction(alert: ActiveAlertSnapshot) -> str:
    value = ALERT_VALUE.match(alert.current_value or "")
    bounds = ALERT_RANGE.match(alert.normal_range or "")
    if value and bounds:
        reading = Decimal(value.group(1))
        lower, upper = map(Decimal, bounds.groups())
        if lower <= upper:
            if reading < lower:
                return "偏低"
            if reading > upper:
                return "偏高"
    label = f"{alert.type} {alert.title}"
    if re.search(r"偏低|过低|低于|[_-]low\b", label, re.IGNORECASE):
        return "偏低"
    if re.search(r"偏高|过高|高于|[_-]high\b", label, re.IGNORECASE):
        return "偏高"
    return ""


def _alert_item(alert: ActiveAlertSnapshot) -> ChatWarningItem:
    lines = [_short(alert.content)] if alert.content.strip() else []
    if alert.current_value:
        lines.append(f"报警记录值为 {_short(alert.current_value, 60)}。")
    if alert.normal_range:
        lines.append(f"当时的记录阈值为 {_short(alert.normal_range, 60)}。")
    direction = _alert_direction(alert)
    metric_key = "dissolved_oxygen" if alert.metric_key == "oxygen" else alert.metric_key
    if metric_key not in HANDLING:
        metric_key = next((rule.key for rule in METRIC_RULES if rule.label in alert.title), None)
    handling = HANDLING.get(metric_key or "", {}).get(direction, GENERAL_HANDLING)
    title = _short(alert.title, 90) or "系统报警"
    if direction and "异常" in title and direction not in title:
        title = f"{title}（{direction}）"
    return ChatWarningItem(
        id=f"alert-{alert.id}", title=title,
        status=f"未处理 · {ALERT_LEVELS[alert.level]}", recorded_at=alert.created_at,
        trigger=" ".join(lines) or "系统已记录此报警，当前仍待现场核实。",
        impact=handling.impact,
        actions=["先核对报警发生时的记录，并确认现在是否仍有同样异常。", *handling.actions],
        verify=handling.verify,
    )


def _number(value: Decimal) -> str:
    return format(value.normalize(), "f")


def _metric_item(metric: WaterMetricAssessment, pond: PondOverview) -> ChatWarningItem:
    handling = HANDLING.get(metric.key, {}).get(metric.status, GENERAL_HANDLING)
    bound = metric.minimum if metric.status == "偏低" else metric.maximum
    assert metric.value is not None and bound is not None
    comparison = "低于下限" if metric.status == "偏低" else "高于上限"
    trigger = (
        f"最新读数为 {_number(metric.value)}{metric.unit}，"
        f"{comparison} {_number(bound)}{metric.unit}，差值 {_number(abs(metric.value - bound))}{metric.unit}。"
    )
    return ChatWarningItem(
        id=f"metric-{metric.key}", title=f"{metric.label}{metric.status}",
        status="最新读数越界",
        recorded_at=pond.latest_water.recorded_at if pond.latest_water else None,
        trigger=trigger, impact=handling.impact,
        actions=list(handling.actions),
        verify=handling.verify,
    )


def _missing_data_item(pond: PondOverview) -> ChatWarningItem | None:
    if pond.latest_water is None:
        title = "暂无水质读数"
        trigger = "系统尚未收到该池可用于评估的水质记录。"
    elif pond.risk.missing_metrics:
        title = "部分水质数据或阈值缺失"
        trigger = f"以下指标缺少读数或配置阈值：{'、'.join(pond.risk.missing_metrics)}。"
    else:
        return None
    return ChatWarningItem(
        id="water-freshness", title=title, status="优先核实",
        recorded_at=pond.latest_water.recorded_at if pond.latest_water else None,
        trigger=trigger, impact="已有实测可逐项分析，缺少读数或阈值的项目需要另外核实。",
        actions=["优先现场测溶解氧、pH、水温、氨氮和亚硝酸盐，并记录点位、时间和单位。",
                 "核对采集设备、上传链路和缺失的阈值设置，把复测值录入系统。"],
        verify="补全记录后核对各项指标与仍未处理的报警。",
    )


def build_warning_report(pond: PondOverview) -> PondChatResponse:
    issues = []
    missing_data = _missing_data_item(pond)
    if missing_data is not None:
        issues.append(missing_data)
    alerts = [_alert_item(alert) for alert in pond.active_alerts if alert.read_status != "resolved"]
    metrics = [
        _metric_item(metric, pond) for metric in pond.metrics
        if metric.value is not None and (
            (metric.status == "偏低" and metric.minimum is not None)
            or (metric.status == "偏高" and metric.maximum is not None)
        )
    ]
    issues.extend(alerts)
    issues.extend(metrics)
    pond_code = pond.pond.pond_code
    if not issues:
        return PondChatResponse(answer=f"{pond_code} 的最新水质读数均在配置阈值内，暂无未处理报警。继续按日常计划巡测即可。")
    if pond.latest_water is None:
        summary = f"{pond_code} 暂无水质读数，现有 {len(alerts)} 条未处理报警。"
    else:
        summary = f"{pond_code} 有 {len(alerts)} 条未处理报警，最新水质读数有 {len(metrics)} 项越界。"
        if metrics:
            summary += "按本池配置阈值判断，这些水质指标不符合设定范围，下面逐项给出处置办法。"
        if missing_data:
            summary += "缺少读数或阈值的项目需另行核实。"
    sources = [ChatWebSource(
        source_id="water-guide", title="农业农村部 · 夏季水产养殖技术指引",
        url="https://yyj.moa.gov.cn/scyz/202306/t20230620_6430587.htm",
    )] if metrics or missing_data else []
    return PondChatResponse(answer=summary, issues=issues, sources=sources)
