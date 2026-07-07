# 当前项目现状盘点文档

本文档用于梳理当前 Vue 3 + Vite + Pinia 前端 mock 版本的页面、类型、数据来源、service、store 和后续数据库设计映射。当前项目尚未接 Supabase、真实数据库、硬件、MQTT 或真实 AI 模型。

## 一、项目页面和路由

路由文件：`src/router/index.ts`

### 1. 登录页

- 页面文件：`src/views/LoginView.vue`
- 路由地址：`/login`
- 主要功能：登录、注册、演示账号选择、中文错误提示；登录成功后进入 `/system`。
- 使用 store/service：`authStore`、`mockDataService`、`QingdaoMapBackground`。
- 数据来源：登录账号、注册账号、session 来自 `src/services/mockDataService.ts`；登录态保存到 localStorage：`shrimp_mock_auth_session`；注册账号保存到 localStorage：`shrimp_mock_registered_accounts`。

### 2. 首页 / 数据大屏 / 系统总览

- 页面文件：`src/views/system/SystemOverviewView.vue`
- 路由地址：`/system`
- 主要功能：系统首页，展示当前池塘、水质、虾群、机器人、风险、事件、趋势和概览信息。
- 使用 store/service：`shrimpSystem`。
- 数据来源：`shrimpSystem` 从 `mockDataService.getMockSystemData(organizationId)` 加载 mock 数据；部分可编辑配置来自 localStorage：`shrimp_editable_system_config`。

历史控制台版本仍保留：

- `src/views/OperationConsoleView.vue`，路由 `/console-old`，使用 `operationConsole` store 和 `src/mock/operationConsole.ts`。
- `src/views/OperationConsoleV4View.vue`，路由 `/console-v4`，使用 `operationConsole` store 和 v4 组件。
- `src/views/OperationConsoleV5View.vue`，路由 `/console-v5`，使用 `src/mock/operationConsoleV5.ts`。
- `src/views/OperationConsoleV6View.vue`，路由 `/console-v6`，使用 `src/mock/operationConsoleV6.ts`。

这些旧控制台页面主要用于视觉版本留存，数据是 mock 文件或组件 props，不是当前数据库优先接入目标。

### 3. 企业管理

- 页面文件：当前没有独立企业管理页面。
- 路由地址：当前没有 `/system/organization` 或类似路由。
- 现有入口：`SystemTopNav.vue` 显示当前企业、用户、角色；`SystemConfigView.vue` 的“数据隔离”区展示当前企业、用户、角色、权限状态。
- 使用 store/service：`authStore`、`shrimpSystem`；service 层已有 `organizationService.ts`。
- 数据来源：企业、成员、角色来自 `mockDataService.ts` 的 `mockOrganizations`、`mockMembers`、注册账号 localStorage。
- 说明：后续若需要正式企业管理，应新增独立页面，接 `organizations`、`organization_members`、`profiles`。

### 4. 池塘管理

- 页面文件：`src/views/system/SystemConfigView.vue`
- 路由地址：`/system/config`
- 主要功能：按池塘选择、编辑池塘编号、名称、品种、面积、水深、位置；新增池塘；删除池塘。
- 使用 store/service：`authStore`、`shrimpSystem`、`mockDataService.cloneBusinessConfig`。
- 数据来源：默认来自 `mockDataService.getMockSystemData`；编辑后保存到 `shrimpSystem` localStorage：`shrimp_editable_system_config`。
- 数据隔离：实际保存按 `organizationId` 分组。

### 5. 机器人管理

- 页面文件：`src/views/system/SystemConfigView.vue`、`src/views/system/RobotMonitorView.vue`
- 路由地址：配置页 `/system/config`；监控页 `/system/robot`
- 主要功能：配置页编辑机器人编号、名称、类型、绑定池塘，支持新增和删除；监控页展示机器人在线、电量、任务、投喂机状态、异常状态和指令记录。
- 使用 store/service：`shrimpSystem`；配置页还使用 `authStore`。
- 数据来源：默认机器人来自 `mockDataService.ts`；配置保存到 `shrimp_editable_system_config`；监控数据来自 `shrimpSystem.robots`。

### 6. 水质阈值设置

- 页面文件：`src/views/system/SystemConfigView.vue`
- 路由地址：`/system/config`
- 主要功能：编辑当前池塘的温度、溶解氧、pH、氧化还原电位、浊度、氨氮、亚硝酸盐、钙/镁硬度上下限。
- 使用 store/service：`authStore`、`shrimpSystem`。
- 数据来源：默认阈值来自 `mockDataService.getBusinessConfig`；编辑后保存到 `shrimp_editable_system_config`。
- 权限：`viewer` 不能保存；`owner/admin/operator` 可以保存。

### 7. 历史数据页面

- 页面文件：`src/views/system/HistoryDataView.vue`
- 路由地址：`/system/history`
- 主要功能：查看水质、虾群、机器人、投喂、报警、配置历史；支持近 7 天、近 30 天、近 3 个月；水质和虾群支持不同池塘同一指标对比；折线图和柱状图展示。
- 使用 store/service：`authStore`、`shrimpSystem`、ECharts。
- 数据来源：组件内根据 `shrimpSystem` 的当前 mock 指标、机器人、报警、可编辑配置即时计算；历史行和部分图表数据仍是组件内生成 mock。
- 注意：当前没有独立 history store，也没有读取 `waterDataService.getWaterHistory` 或 `shrimpGrowthService.getShrimpMeasurements`。

### 8. 扩展接口页面

- 页面文件：`src/views/system/ExtensionCenterView.vue`
- 路由地址：`/system/extensions`
- 主要功能：统一预留 3D 监控、AI 决策、AI 模型设置、投喂计划、报警中心、设备管理入口。
- 使用 store/service：`authStore`、`shrimpSystem`、`aiService`、`auditLogService`、`deviceService`、`feedingService`、`modelProviderService`、`riskScoreService`、`robotService`、`robotPositionService`、`robotCommandService`、`shrimpGrowthService`、`thresholdService`、`waterDataService`。
- 数据来源：service mock、内存 Map、localStorage、`shrimpSystem` 当前组织和当前池塘。

### 9. 3D 监控相关页面

- 页面文件：`src/views/system/ExtensionCenterView.vue`
- 路由地址：`/system/extensions?module=scene3d`
- 主要功能：展示机器人坐标、轨迹、电量、速度、状态；支持投喂、停止、返回起点、巡航、返回充电等 mock 指令。
- 使用 store/service：`robotPositionService`、`robotCommandService`、`robotService`、`auditLogService`、`authStore`、`shrimpSystem`。
- 数据来源：`robotPositionService` 内存 `positionCache` 和 `setInterval` mock；机器人基础数据来自 `mockDataService.getMockSystemData`。
- 说明：`scene3dService.ts` 已存在，但当前页面主要使用 `robotPositionService`，还没有真正加载 `SceneConfig`。

### 10. AI 决策相关页面

- 页面文件：`src/views/system/ExtensionCenterView.vue`
- 路由地址：`/system/extensions?module=ai`
- 主要功能：展示风险评分、AI 状态评估、AI 投喂建议、问题和建议，支持采纳/不采纳。
- 使用 store/service：`aiService`、`riskScoreService`、`waterDataService`、`thresholdService`、`feedingService`、`shrimpGrowthService`、`robotService`、`auditLogService`。
- 数据来源：全部是 mock；AI 输出由 `aiService.createStructuredResult` 生成；风险评分由前端规则计算。

### 11. 投喂计划相关页面

- 页面文件：`src/views/system/ExtensionCenterView.vue`
- 路由地址：`/system/extensions?module=feeding`
- 主要功能：展示投喂计划、今日任务、历史投喂记录。
- 使用 store/service：`feedingService`。
- 数据来源：`feedingService.ts` 内存 Map：`planStore`、`recordStore`，页面刷新后不会保留。

### 12. 报警中心相关页面

- 页面文件：`src/views/system/ExtensionCenterView.vue`、`src/components/system/NotificationBell.vue`、`src/components/system/NotificationPanel.vue`
- 路由地址：报警中心 `/system/extensions?module=alerts`；右上角通知属于全局顶部栏。
- 主要功能：顶部报警铃展示当前异常数量；弹层列出报警；点击报警可跳转到扩展接口报警中心；报警中心展示报警列表和 AI 解释报警。
- 使用 store/service：顶部报警来自 `shrimpSystem.allAlerts`；报警中心也使用 `shrimpSystem.allAlerts`；AI 解释使用 `aiService.explainAlert`。
- 数据来源：`shrimpSystem` 根据水质阈值、虾群阈值、机器人状态、模型关键词即时计算；`alertService.ts` 另有独立 mock Alert，但当前页面未主要使用。

### 13. 设备管理相关页面

- 页面文件：`src/views/system/ExtensionCenterView.vue`
- 路由地址：`/system/extensions?module=devices`
- 主要功能：展示传感器、网关、机器人设备状态、心跳时间。
- 使用 store/service：`deviceService.getDevices`。
- 数据来源：`deviceService.ts` 返回 mock 数组，默认写死一台 `device-water-01`，`pondId` 写死为 `P-01`。

### 14. 水质监测和详情页面

- 页面文件：`src/views/system/WaterOverviewView.vue`、`src/views/system/WaterMetricDetailView.vue`
- 路由地址：`/system/water`、`/system/water/:metricKey`
- 主要功能：水质总览、指标卡、参数详情、趋势图、池塘分布、阈值和报警说明。
- 使用 store/service：`shrimpSystem`、ECharts、`MetricCard`。
- 数据来源：`shrimpSystem.waterMetrics`、`shrimpSystem.thresholds.water`、`shrimpSystem.waterAlerts`；默认来自 `mockDataService`，当前未读取真实历史表。

### 15. 虾群分析和详情页面

- 页面文件：`src/views/system/ShrimpOverviewView.vue`、`src/views/system/ShrimpMetricDetailView.vue`
- 路由地址：`/system/shrimp`、`/system/shrimp/:metricKey`
- 主要功能：虾群指标总览、池塘对比、指标详情、成熟度和模型结果展示。
- 使用 store/service：`shrimpSystem`、ECharts、`MetricCard`。
- 数据来源：`shrimpSystem.shrimpMetrics`、`shrimpSystem.thresholds.shrimp`、`shrimpSystem.allAlerts`；默认来自 `mockDataService`。

## 二、现有类型定义

### `src/types/business.ts`

UserRole:
- `owner`
- `admin`
- `operator`
- `viewer`

OrganizationRole:
- 等同 `UserRole`

TimeRange:
- `startAt`
- `endAt`

UserProfile:
- `id`
- `display_name`
- `email`
- `phone?`
- `avatar_url?`
- `created_at?`
- `updated_at?`

Organization:
- `id`
- `name`
- `short_name`
- `region`
- `status`
- `owner_user_id?`
- `created_at?`
- `updated_at?`

OrganizationMember:
- `id`
- `organization_id`
- `user_id`
- `role`
- `display_name?`
- `email?`
- `joined_at?`

Pond:
- `id`
- `organization_id`
- `pond_code`
- `pond_name`
- `shrimp_species`
- `area`
- `water_depth`
- `location`
- `map_position?`
- `scene_position?`
- `created_at?`
- `updated_at?`

PondMapPosition:
- `organization_id`
- `pond_id`
- `longitude`
- `latitude`
- `label?`

PondScenePosition:
- `organization_id`
- `pond_id`
- `x`
- `y`
- `z`
- `width?`
- `length?`
- `rotationY?`

ThresholdRange:
- `min`
- `max`

WaterThreshold:
- `id`
- `organization_id`
- `pond_id?`
- `temperature`
- `oxygen`
- `ph`
- `orp`
- `turbidity`
- `ammonia`
- `nitrite`
- `hardness`

WaterThresholdMetricKey:
- `temperature`
- `oxygen`
- `ph`
- `orp`
- `turbidity`
- `ammonia`
- `nitrite`
- `hardness`

Robot:
- `id`
- `organization_id`
- `pond_id`
- `robot_code`
- `robot_name`
- `robot_type`
- `status?`
- `created_at?`
- `updated_at?`

RobotBinding:
- `id`
- `organization_id`
- `pond_id`
- `robot_id`
- `bound_at`
- `unbound_at?`
- `active`

BusinessConfig:
- `organization_id`
- `pond`
- `robot`
- `waterThreshold`

### `src/types/water.ts`

WaterReading:
- `id`
- `organizationId`
- `pondId`
- `deviceId?`
- `temperature`
- `dissolvedOxygen`
- `ph`
- `orp`
- `turbidity`
- `ammonia`
- `nitrite`
- `hardness`
- `recordedAt`

WaterLatest:
- `organizationId`
- `pondId`
- `reading`
- `updatedAt`

WaterHistoryQuery:
- `organizationId`
- `pondId`
- `timeRange`
- `limit?`

WaterQualitySummary:
- `organizationId`
- `pondId`
- `timeRange`
- `averageTemperature`
- `averageOxygen`
- `averagePh`
- `warningCount`
- `status`

WaterQualityWarning:
- `organizationId`
- `pondId`
- `metricKey`
- `metricLabel`
- `currentValue`
- `min?`
- `max?`
- `level`
- `message`

WaterUploadPayload:
- `organizationId`
- `pondId`
- `deviceId`
- `reading`

WaterThresholdCheckInput:
- `waterData`
- `thresholds`

### `src/types/robot.ts`

RobotWorkMode:
- `standby`
- `feeding`
- `patrol`
- `manual`
- `charging`
- `fault`

RobotCommandType:
- `feed`
- `stop`
- `return_home`
- `patrol`
- `pause`
- `resume`
- `manual_move`
- `calibrate`
- `charge`

RobotCommandStatus:
- `pending`
- `sent`
- `running`
- `success`
- `failed`
- `cancelled`

RobotStatus:
- `organizationId`
- `pondId`
- `robotId`
- `online`
- `workMode`
- `battery`
- `speed`
- `faultCode?`
- `updatedAt`

RobotPositionLatest:
- `organizationId`
- `pondId?`
- `robotId`
- `x`
- `y`
- `z`
- `heading`
- `speed`
- `battery`
- `status`
- `recordedAt`

RobotPositionHistory:
- 继承 `RobotPositionLatest`
- `id`

RobotRoutePoint:
- `x`
- `y`
- `z`
- `heading?`
- `action?`
- `order`

RobotRoute:
- `id`
- `organizationId`
- `pondId`
- `robotId`
- `name`
- `points`

RobotTrack:
- `organizationId`
- `robotId`
- `timeRange`
- `points`

RobotFault:
- `id`
- `organizationId`
- `pondId?`
- `robotId`
- `code`
- `message`
- `level`
- `occurredAt`

RobotCommand:
- `id`
- `organizationId`
- `pondId?`
- `robotId`
- `type`
- `status`
- `payload`
- `createdBy?`
- `createdAt`

RobotCommandAck:
- `organizationId`
- `robotId`
- `commandId`
- `status`
- `message`
- `acknowledgedAt`

RobotTask:
- `id`
- `organizationId`
- `pondId`
- `robotId`
- `name`
- `workMode`
- `status`
- `plannedAt`

RobotTaskPlan:
- `organizationId`
- `pondId`
- `robotId`
- `tasks`
- `generatedBy`

RobotControlPayload:
- `organizationId`
- `pondId?`
- `robotId`
- `commandType`
- `payload`

### `src/types/feeding.ts`

FeedingMode:
- `manual`
- `scheduled`
- `ai_advice`
- `emergency`

FeedingAdviceSource:
- `manual`
- `rule_engine`
- `openai`
- `deepseek`
- `local_model`
- `hybrid`

FeedingPlan:
- `id`
- `organizationId`
- `pondId`
- `name`
- `mode`
- `feedAmountKg`
- `times`
- `enabled`

FeedingTask:
- `id`
- `organizationId`
- `pondId`
- `planId?`
- `robotId?`
- `scheduledAt`
- `feedAmountKg`
- `status`

FeedingRecord:
- `id`
- `organizationId`
- `pondId`
- `robotId?`
- `feedAmountKg`
- `mode`
- `adviceSource?`
- `executedAt`
- `remark?`

FeedBatch:
- `id`
- `organizationId`
- `batchNo`
- `feedName`
- `proteinPercent?`
- `producedAt?`

FeedInventory:
- `id`
- `organizationId`
- `feedBatchId`
- `stockKg`
- `updatedAt`

FeedingSummary:
- `organizationId`
- `pondId`
- `timeRange`
- `totalFeedKg`
- `taskCount`
- `averageDailyFeedKg`

### `src/types/shrimp.ts`

ShrimpMeasurement:
- `id`
- `organizationId`
- `pondId`
- `average_length_cm`
- `average_weight_g`
- `sampleCount`
- `measuredAt`
- `source`

ShrimpEstimate:
- `organizationId`
- `pondId`
- `estimated_count`
- `estimated_yield_kg`
- `maturity_percent`
- `updatedAt`

GrowthRecord:
- `id`
- `organizationId`
- `pondId`
- `average_length_cm`
- `average_weight_g`
- `estimated_count`
- `estimated_yield_kg`
- `maturity_percent`
- `recordedAt`

GrowthSummary:
- `organizationId`
- `pondId`
- `timeRange`
- `lengthGrowthCm`
- `weightGrowthG`
- `maturityChangePercent`
- `summary`

ShrimpImageMeasurement:
- `id`
- `organizationId`
- `pondId`
- `imageUrl`
- `detectedLengthCm`
- `confidence`
- `measuredAt`

ShrimpLengthWeightMapping:
- `id`
- `organizationId`
- `species`
- `lengthCm`
- `weightG`

### `src/types/ai.ts`

AiProviderType:
- `rule_engine`
- `openai`
- `deepseek`
- `local_model`
- `hybrid`

RiskLevel:
- `低风险`
- `关注`
- `预警`
- `高风险`

AiModelConfig:
- `id`
- `organizationId`
- `providerType`
- `modelName`
- `endpointUrl?`
- `jsonOutput`
- `dailyLimit`
- `monthlyUsage`
- `enabled`

LocalModelEndpointConfig:
- `organizationId`
- `endpointUrl`
- `timeoutMs`
- `modelName`

RiskScore:
- `organizationId`
- `pondId`
- `waterRiskScore`
- `feedingRiskScore`
- `growthRiskScore`
- `robotRiskScore`
- `totalRiskScore`
- `riskLevel`
- `calculationDetail`
- `calculatedAt`

AiStructuredResult:
- `riskLevel`
- `riskScore`
- `summary`
- `problems`
- `recommendations`
- `confidence`
- `needManualConfirm`

AiEvaluation:
- 继承 `AiStructuredResult`
- `id`
- `organizationId`
- `pondId`
- `providerType`
- `createdAt`

AiFeedingAdvice:
- 继承 `AiStructuredResult`
- `id`
- `organizationId`
- `pondId`
- `recommendedFeedKg`
- `recommendedTime`
- `feedingMethod`

AiAlertExplanation:
- 继承 `AiStructuredResult`
- `id`
- `organizationId`
- `pondId`
- `alertId`

AiReport:
- `id`
- `organizationId`
- `pondId`
- `reportType`
- `title`
- `content`
- `createdAt`

AiChatSession:
- `id`
- `organizationId`
- `pondId?`
- `title`
- `createdAt`

AiChatMessage:
- `id`
- `organizationId`
- `pondId?`
- `conversationId`
- `role`
- `content`
- `createdAt`

AiRequestLog:
- `id`
- `organizationId`
- `pondId?`
- `providerType`
- `endpoint`
- `success`
- `createdAt`

AiResultFeedback:
- `organizationId`
- `pondId?`
- `resultId`
- `accepted`
- `remark?`

AiPondEvaluationInput:
- `organizationId`
- `pondId`
- `providerType?`

AiPondEvaluationResult:
- 继承 `AiStructuredResult`
- `organizationId`
- `pondId`

AiFeedingAdviceInput:
- `organizationId`
- `pondId`
- `providerType?`

AiFeedingAdviceResult:
- 继承 `AiStructuredResult`
- `organizationId`
- `pondId`
- `recommendedFeedKg`
- `recommendedTime`
- `feedingMethod`

AiAnomalyResult:
- 继承 `AiStructuredResult`
- `organizationId`
- `pondId`
- `timeRange`

AiRobotTaskPlanResult:
- 继承 `AiStructuredResult`
- `organizationId`
- `pondId`
- `robotId?`
- `tasks`

### `src/types/scene3d.ts`

SceneModel:
- `id`
- `organizationId`
- `name`
- `type`
- `url`
- `uploadedAt`

SceneCameraConfig:
- `x`
- `y`
- `z`
- `targetX`
- `targetY`
- `targetZ`

ScenePondObject:
- `organizationId`
- `pondId`
- `x`
- `y`
- `z`
- `width`
- `length`
- `rotationY`

SceneRobotObject:
- `organizationId`
- `pondId?`
- `robotId`
- `x`
- `y`
- `z`
- `heading`
- `modelUrl?`

SceneRouteConfig:
- `organizationId`
- `robotId`
- `visible`
- `color`
- `width`

FarmModelConfig:
- `organizationId`
- `modelUrl`
- `scale`

RobotModelConfig:
- `organizationId`
- `robotId?`
- `modelUrl`
- `scale`

SceneConfig:
- `organizationId`
- `camera`
- `farmModel?`
- `robotModel?`
- `ponds`
- `robots`
- `routes`

ModelUploadResult:
- `organizationId`
- `path`
- `url`
- `modelId?`

### `src/types/alert.ts`

AlertType:
- `water_quality`
- `robot_fault`
- `feeding`
- `growth`
- `device`
- `ai`

AlertLevel:
- `info`
- `warning`
- `critical`

AlertReadStatus:
- `unread`
- `read`
- `resolved`

Alert:
- `id`
- `organizationId`
- `pondId?`
- `robotId?`
- `type`
- `level`
- `title`
- `content`
- `readStatus`
- `createdAt`
- `resolvedAt?`

AlertRule:
- `id`
- `organizationId`
- `pondId?`
- `type`
- `metricKey?`
- `operator`
- `thresholdValue`
- `level`
- `enabled`

AlertResolvePayload:
- `organizationId`
- `alertId`
- `resolvedBy`
- `remark`

AlertFilters:
- `pondId?`
- `robotId?`
- `type?`
- `level?`
- `readStatus?`
- `timeRange?`

### `src/types/device.ts`

DeviceType:
- `water_sensor`
- `gateway`
- `robot`
- `camera`
- `aerator`
- `feeder`

DeviceStatus:
- `online`
- `offline`
- `warning`
- `fault`
- `maintenance`

Device:
- `id`
- `organizationId`
- `pondId?`
- `robotId?`
- `name`
- `type`
- `status`
- `firmwareVersion?`
- `lastHeartbeatAt?`
- `createdAt`

DeviceAuthToken:
- `id`
- `organizationId`
- `deviceId`
- `tokenMasked`
- `expiresAt?`
- `enabled`

SensorDevice:
- 继承 `Device`
- `type`
- `metrics`
- `samplingIntervalSeconds`

GatewayDevice:
- 继承 `Device`
- `type`
- `ipAddress?`
- `connectedDeviceIds`

HardwareUploadPayload:
- `organizationId`
- `pondId?`
- `robotId?`
- `deviceId`
- `deviceType`
- `recordedAt`
- `payload`

HardwareUploadResult:
- `accepted`
- `message`
- `receivedAt`
- `recordId?`

DeviceHeartbeat:
- `organizationId`
- `pondId?`
- `robotId?`
- `deviceId`
- `status`
- `battery?`
- `signalStrength?`
- `recordedAt`

DeviceCommandAck:
- `organizationId`
- `deviceId`
- `robotId?`
- `commandId`
- `success`
- `message`
- `acknowledgedAt`

### `src/types/system.ts`

ApiResponse:
- `success`
- `message`
- `data`

PaginatedResult:
- `items`
- `page`
- `pageSize`
- `total`

OperationLog:
- `id`
- `organizationId`
- `userId?`
- `action`
- `targetType`
- `targetId?`
- `detail?`
- `createdAt`

AuditLog:
- 继承 `OperationLog`
- `role?`
- `ipAddress?`
- `userAgent?`

RealtimeSubscriptionConfig:
- `id`
- `organizationId`
- `tableName`
- `filters`
- `enabled`

SystemSetting:
- `id`
- `organizationId`
- `key`
- `value`
- `updatedAt`

ExportTask:
- `id`
- `organizationId`
- `pondId?`
- `type`
- `status`
- `fileUrl?`
- `createdAt`

ImportTask:
- `id`
- `organizationId`
- `pondId?`
- `type`
- `status`
- `createdAt`

LogFilters:
- `userId?`
- `action?`
- `targetType?`
- `timeRange?`

## 三、现有 mock 数据结构

### 1. 企业数据 organizations

- 数据来源文件：`src/services/mockDataService.ts`
- 字段列表：`id`、`name`、`short_name`、`region`、`status`、可选 `owner_user_id`、`created_at`、`updated_at`
- 是否带 organizationId：本身主键为 `id`
- 是否带 pondId：否
- 是否带 robotId：否
- 是否存 localStorage：注册企业会随注册账号存到 `shrimp_mock_registered_accounts`；默认企业写在代码中
- 后续建议数据库表：`organizations`

### 2. 用户数据 users / profiles

- 数据来源文件：`src/services/mockDataService.ts`
- 字段列表：`id`、`display_name`、`email`、可选 `phone`、`avatar_url`、`created_at`、`updated_at`
- 是否带 organizationId：用户 profile 本身不带，靠 `organization_members` 关联
- 是否带 pondId：否
- 是否带 robotId：否
- 是否存 localStorage：注册用户保存到 `shrimp_mock_registered_accounts`；登录 session 保存到 `shrimp_mock_auth_session`
- 后续建议数据库表：`profiles`；认证账号由 Supabase Auth 管理

### 3. 企业成员 members

- 数据来源文件：`src/services/mockDataService.ts`、`src/services/organizationService.ts`
- 字段列表：`id`、`organization_id`、`user_id`、`role`、可选 `display_name`、`email`、`joined_at`
- 是否带 organizationId：是，`organization_id`
- 是否带 pondId：否
- 是否带 robotId：否
- 是否存 localStorage：注册成员随 `shrimp_mock_registered_accounts` 保存；默认成员写在代码中
- 后续建议数据库表：`organization_members`

### 4. 池塘数据 ponds

- 数据来源文件：`src/services/mockDataService.ts`、`src/stores/shrimpSystem.ts`、`src/services/pondService.ts`
- 字段列表：`id`、`organization_id`、`pond_code`、`pond_name`、`shrimp_species`、`area`、`water_depth`、`location`、`map_position?`、`scene_position?`
- 是否带 organizationId：是，`organization_id`
- 是否带 pondId：池塘自身主键为 `id`，业务编号为 `pond_code`
- 是否带 robotId：否
- 是否存 localStorage：可编辑池塘保存在 `shrimp_editable_system_config`；旧 `BusinessConfig` 保存到 `shrimp_mock_business_config`
- 后续建议数据库表：`ponds`

### 5. 机器人数据 robots

- 数据来源文件：`src/services/mockDataService.ts`、`src/stores/shrimpSystem.ts`、`src/services/robotService.ts`
- 字段列表：业务配置类型包含 `id`、`organization_id`、`pond_id`、`robot_code`、`robot_name`、`robot_type`、`status?`；运行态 `RobotInfo` 包含 `id`、`name`、`online`、`pondId`、`currentTask`、`battery`、`feederStatus`、`motionStatus`、`lastRunAt`、`nextPlanAt`、`abnormalStatus`、`commands`
- 是否带 organizationId：业务配置有；`RobotInfo` 运行态没有显式 organizationId，但由 store 当前 organization 隔离
- 是否带 pondId：是，业务类型为 `pond_id`，运行态为 `pondId`
- 是否带 robotId：业务类型主键为 `id`，另有 `robot_code`
- 是否存 localStorage：可编辑机器人保存在 `shrimp_editable_system_config`；旧 `BusinessConfig` 保存到 `shrimp_mock_business_config`
- 后续建议数据库表：`robots`、`robot_status`、`robot_commands`、`robot_position_latest`、`robot_position_history`

### 6. 水质阈值 thresholds

- 数据来源文件：`src/types/business.ts`、`src/services/mockDataService.ts`、`src/stores/shrimpSystem.ts`、`src/services/thresholdService.ts`
- 字段列表：`id`、`organization_id`、`pond_id?`、`temperature`、`oxygen`、`ph`、`orp`、`turbidity`、`ammonia`、`nitrite`、`hardness`，每项为 `{ min, max }`
- 是否带 organizationId：是，`organization_id`
- 是否带 pondId：可选，目前保存时按池塘补 `pond_id`
- 是否带 robotId：否
- 是否存 localStorage：`shrimp_editable_system_config` 保存 `waterThresholdsByPond`；`shrimp_mock_business_config` 保存旧单池塘阈值
- 后续建议数据库表：`water_thresholds`

### 7. 水质历史数据 water history

- 数据来源文件：`src/services/waterDataService.ts`、`src/views/system/HistoryDataView.vue`、`src/stores/shrimpSystem.ts`
- 字段列表：`id`、`organizationId`、`pondId`、`deviceId?`、`temperature`、`dissolvedOxygen`、`ph`、`orp`、`turbidity`、`ammonia`、`nitrite`、`hardness`、`recordedAt`
- 是否带 organizationId：service 类型带；`HistoryDataView` 从 store 派生的行没有显式 organizationId 字段
- 是否带 pondId：service 类型带；历史页用 `selectedPondId` 拼接展示
- 是否带 robotId：否
- 是否存 localStorage：否，当前即时生成或由 store 指标 trend 数组派生
- 后续建议数据库表：`water_readings`、`water_latest`、`water_daily_stats`

### 8. 投喂记录 feeding records

- 数据来源文件：`src/services/feedingService.ts`、`src/views/system/HistoryDataView.vue`
- 字段列表：`id`、`organizationId`、`pondId`、`robotId?`、`feedAmountKg`、`mode`、`adviceSource?`、`executedAt`、`remark?`
- 是否带 organizationId：service 类型带；历史页派生数据没有显式 organizationId
- 是否带 pondId：service 类型带；历史页按 `profile.pondId` 生成
- 是否带 robotId：可选
- 是否存 localStorage：否，`feedingService` 用内存 Map，刷新后丢失
- 后续建议数据库表：`feeding_records`，并配套 `feeding_plans`、`feeding_tasks`

### 9. 虾群生长数据 shrimp measurements

- 数据来源文件：`src/services/shrimpGrowthService.ts`、`src/stores/shrimpSystem.ts`、`src/views/system/HistoryDataView.vue`
- 字段列表：`id`、`organizationId`、`pondId`、`average_length_cm`、`average_weight_g`、`sampleCount`、`measuredAt`、`source`
- 是否带 organizationId：service 类型带；store 指标没有显式 organizationId
- 是否带 pondId：service 类型带；store `PondProfile` 通过 `pondId` 分组
- 是否带 robotId：否
- 是否存 localStorage：否，当前即时生成或从 mock trend 派生
- 后续建议数据库表：`shrimp_measurements`、`shrimp_estimates`、`growth_records`

### 10. 报警数据 alerts

- 数据来源文件：`src/stores/shrimpSystem.ts`、`src/services/alertService.ts`
- 字段列表：store `SystemAlert` 包含 `id`、`time`、`source`、`type`、`reason`、`currentValue`、`normalRange`、`suggestion`、`level`、`metricKey?`；service `Alert` 包含 `id`、`organizationId`、`pondId?`、`robotId?`、`type`、`level`、`title`、`content`、`readStatus`、`createdAt`、`resolvedAt?`
- 是否带 organizationId：service 类型带；当前顶部报警 store 计算结果不带显式 organizationId
- 是否带 pondId：service 可选；store 报警文本里可能包含池塘但字段不固定
- 是否带 robotId：service 可选；store 机器人报警的 robotId 只在 id 字符串中体现
- 是否存 localStorage：否，当前实时计算
- 后续建议数据库表：`alerts`、`alert_rules`

### 11. 3D 场景数据 scene config

- 数据来源文件：`src/services/scene3dService.ts`
- 字段列表：`SceneConfig` 包含 `organizationId`、`camera`、`farmModel?`、`robotModel?`、`ponds`、`robots`、`routes`
- 是否带 organizationId：是
- 是否带 pondId：池塘对象和机器人对象可带
- 是否带 robotId：机器人对象和路线带
- 是否存 localStorage：是，`shrimp_scene3d_config`
- 后续建议数据库表：`scene_configs`、`scene_pond_objects`、`scene_robot_objects`、`scene_models`、`file_assets`

### 12. 小车位置数据 robot position

- 数据来源文件：`src/services/robotPositionService.ts`
- 字段列表：`organizationId`、`pondId?`、`robotId`、`x`、`y`、`z`、`heading`、`speed`、`battery`、`status`、`recordedAt`
- 是否带 organizationId：是
- 是否带 pondId：可选，但 mock 会从机器人绑定关系带出
- 是否带 robotId：是
- 是否存 localStorage：否，使用内存 Map：`positionCache`
- 后续建议数据库表：`robot_position_latest`、`robot_position_history`

### 13. AI 决策数据 ai evaluations / ai advices

- 数据来源文件：`src/services/aiService.ts`、`src/services/modelProviderService.ts`、`src/services/riskScoreService.ts`、`src/views/system/ExtensionCenterView.vue`
- 字段列表：结构化输出包含 `riskLevel`、`riskScore`、`summary`、`problems`、`recommendations`、`confidence`、`needManualConfirm`；评估和建议额外包含 `organizationId`、`pondId`、投喂建议的 `recommendedFeedKg`、`recommendedTime`、`feedingMethod`
- 是否带 organizationId：是
- 是否带 pondId：是
- 是否带 robotId：机器人任务规划可选
- 是否存 localStorage：模型配置存 `shrimp_ai_model_config`；AI 结果当前不持久化；采纳/不采纳操作写 `shrimp_operation_logs`
- 后续建议数据库表：`ai_model_configs`、`risk_scores`、`ai_evaluations`、`ai_feeding_advices`、`ai_alert_explanations`、`ai_reports`、`ai_request_logs`、`ai_result_feedback`

## 四、现有 service 层

### `authService.ts`

- 方法：`getCurrentSession`、`getCurrentUser`、`loginWithEmail`、`logout`、`loadUserProfile`、`loadUserOrganizations`、`switchOrganization`
- 当前实现：mock，调用 `mockDataService` 和 localStorage session
- 后续对应：Supabase Auth、`profiles`、`organizations`、`organization_members`
- 参数缺失：基本可用；`loadUserProfile` 目前只看当前 session，不是真正按 userId 查询 profile 表

### `organizationService.ts`

- 方法：`getOrganizations`、`getCurrentOrganization`、`updateOrganization`、`getOrganizationMembers`、`inviteMember`、`updateMemberRole`、`removeMember`
- 当前实现：mock
- 后续对应：`organizations`、`organization_members`、`profiles`、`operation_logs`
- 参数缺失：核心方法有 organizationId；`getOrganizations` 当前依赖 session，不带 userId 参数

### `pondService.ts`

- 方法：`getPonds`、`getPondById`、`createPond`、`updatePond`、`deletePond`、`setCurrentPond`、`updatePondMapPosition`、`updatePondScenePosition`
- 当前实现：mock，主要读单个 `BusinessConfig.pond`
- 后续对应：`ponds`、`scene_pond_objects`、`operation_logs`
- 参数缺失：方法参数有 organizationId/pondId；但 `getPonds` 当前只返回单个 businessConfig 池塘，和 `shrimpSystem.editablePonds` 多池塘数据不统一

### `deviceService.ts`

- 方法：`getDevices`、`getDeviceById`、`createDevice`、`updateDevice`、`deleteDevice`、`updateDeviceStatus`、`receiveDeviceHeartbeat`、`verifyDeviceToken`、`receiveHardwareUpload`
- 当前实现：mock，默认设备写死 `device-water-01` 和 `P-01`
- 后续对应：`devices`、`device_auth_tokens`、`device_heartbeats`、`operation_logs`
- 参数缺失：`getDevices` 只有 organizationId，后续可增加 filters；`verifyDeviceToken` 不带 organizationId，真实校验应只在后端完成

### `waterDataService.ts`

- 方法：`getLatestWaterData`、`getWaterHistory`、`getWaterQualitySummary`、`uploadWaterData`、`subscribeWaterData`、`unsubscribeWaterData`
- 当前实现：mock，即时生成
- 后续对应：`water_latest`、`water_readings`、`water_daily_stats`
- 参数缺失：核心方法都有 organizationId/pondId；`WaterUploadPayload.reading` 中 omit 掉 organizationId/pondId，但当前类型仍包含 `deviceId?` 之外的 reading 字段，后续应严格定义上传结构

### `thresholdService.ts`

- 方法：`getThresholds`、`saveThresholds`、`resetDefaultThresholds`、`checkWaterWarning`
- 当前实现：mock/localStorage，读写 `shrimp_mock_business_config`
- 后续对应：`water_thresholds`、`alert_rules`
- 参数缺失：都有 organizationId/pondId；`WaterThreshold.pond_id` 目前是可选，建议数据库中强制非空

### `alertService.ts`

- 方法：`getAlerts`、`getUnreadAlertCount`、`createAlert`、`markAlertRead`、`markAllAlertsRead`、`resolveAlert`、`subscribeAlerts`
- 当前实现：mock，返回写死 `P-01` 的溶解氧报警
- 后续对应：`alerts`、`alert_rules`
- 参数缺失：方法有 organizationId；filters 支持 pondId/robotId；但顶部实际报警还没有使用这个 service

### `robotService.ts`

- 方法：`getRobots`、`getRobotById`、`createRobot`、`updateRobot`、`deleteRobot`、`bindRobotToPond`、`getRobotStatus`、`updateRobotStatus`
- 当前实现：mock，从 `mockDataService.getMockSystemData` 转换
- 后续对应：`robots`、`robot_status`、`robot_bindings`、`devices`
- 参数缺失：核心方法都有 organizationId/robotId；`createRobot` 默认 `pond_id` 使用 `getBusinessConfig(organizationId).pond.id`，可能应改为明确传 pondId

### `robotPositionService.ts`

- 方法：`getLatestRobotPosition`、`getRobotPositionHistory`、`updateRobotPosition`、`uploadRobotPosition`、`subscribeRobotPosition`、`unsubscribeRobotPosition`、`getRobotTrack`、`clearRobotTrack`
- 当前实现：mock，内存 `positionCache`，坐标随时间变化
- 后续对应：`robot_position_latest`、`robot_position_history`
- 参数缺失：核心方法有 organizationId/robotId；位置结构中 `pondId` 可选，建议真实库中 latest/history 均保存 pondId 快照

### `robotCommandService.ts`

- 方法：`createRobotCommand`、`getRobotCommands`、`getRobotCommandStatus`、`cancelRobotCommand`、`receiveRobotCommandAck`、`mockSendCommand`
- 当前实现：mock，内存 `commandStore`
- 后续对应：`robot_commands`、`robot_command_acks`、`operation_logs`
- 参数缺失：核心方法有 organizationId/robotId/commandId；`getRobotCommandStatus` 只有 commandId，没有 robotId，查询时可用 organizationId + commandId

### `feedingService.ts`

- 方法：`getFeedingPlans`、`createFeedingPlan`、`updateFeedingPlan`、`deleteFeedingPlan`、`enableFeedingPlan`、`disableFeedingPlan`、`getTodayFeedingTasks`、`createFeedingRecord`、`getFeedingRecords`、`getFeedingSummary`
- 当前实现：mock，内存 `planStore`、`recordStore`
- 后续对应：`feeding_plans`、`feeding_tasks`、`feeding_records`
- 参数缺失：查询和创建带 organizationId/pondId；更新/删除只带 organizationId + planId，数据库中可用 planId 唯一

### `shrimpGrowthService.ts`

- 方法：`getShrimpMeasurements`、`createShrimpMeasurement`、`getShrimpEstimate`、`updateShrimpEstimate`、`calculateGrowthSummary`、`importShrimpMeasurementFromApp`
- 当前实现：mock，即时生成
- 后续对应：`shrimp_measurements`、`shrimp_estimates`、`growth_records`、`file_assets`
- 参数缺失：核心方法都有 organizationId/pondId

### `aiService.ts`

- 方法：`requestPondEvaluation`、`requestFeedingAdvice`、`explainAlert`、`generateReport`、`sendAiChatMessage`、`detectAnomalies`、`planRobotTask`、`submitAiFeedback`
- 当前实现：mock，不请求真实模型；TODO 指向 Edge Functions
- 后续对应：`ai_evaluations`、`ai_feeding_advices`、`ai_alert_explanations`、`ai_reports`、`ai_chat_sessions`、`ai_chat_messages`、`ai_request_logs`、`ai_result_feedback`
- 参数缺失：多数方法有 organizationId/pondId；`submitAiFeedback` 的 payload 自带 organizationId，方法也传 organizationId，后续可统一

### `modelProviderService.ts`

- 方法：`loadModelConfig`、`saveModelConfig`、`switchProvider`、`testModelConnection`、`loadAiRequestLogs`
- 当前实现：localStorage `shrimp_ai_model_config`；不保存 API Key
- 后续对应：`ai_model_configs`、`ai_request_logs`
- 参数缺失：都有 organizationId；自研模型 endpointUrl 允许前端填写，但真实请求仍应走后端

### `riskScoreService.ts`

- 方法：`calculateWaterRisk`、`calculateFeedingRisk`、`calculateGrowthRisk`、`calculateRobotRisk`、`calculateTotalRisk`
- 当前实现：前端轻量规则评分
- 后续对应：`risk_scores`
- 参数缺失：输入数据本身带 organizationId/pondId；返回结果 `RiskCalculationResult` 没有 organizationId/pondId/calculatedAt，落库时应补

### `scene3dService.ts`

- 方法：`getSceneConfig`、`saveSceneConfig`、`getFarmModelUrl`、`getRobotModelUrl`、`savePondScenePosition`、`saveRobotScenePosition`、`getRobotScenePosition`、`loadSceneModels`
- 当前实现：mock/localStorage `shrimp_scene3d_config`
- 后续对应：`scene_configs`、`scene_models`、`scene_pond_objects`、`scene_robot_objects`
- 参数缺失：核心方法有 organizationId；对象级方法有 pondId/robotId

### `fileStorageService.ts`

- 方法：`uploadFarmModel`、`uploadRobotModel`、`uploadPondImage`、`uploadShrimpImage`、`getFileUrl`、`deleteFile`
- 当前实现：mock URL，不真实上传
- 后续对应：Supabase Storage、`file_assets`
- 参数缺失：上传方法有 organizationId，池塘图片和虾体图片有 pondId；`deleteFile` 只有 path，真实删除应后端鉴权

### `realtimeService.ts`

- 方法：`subscribeTableChanges`、`unsubscribe`、`subscribeWaterLatest`、`subscribeRobotPosition`、`subscribeAlerts`、`subscribeRobotCommands`
- 当前实现：setInterval mock
- 后续对应：Supabase Realtime 或 WebSocket
- 参数缺失：通用 `subscribeTableChanges` 没有强制 organizationId，依赖 filters；建议后续 filters 必填 organizationId

### `reportService.ts`

- 方法：`generateDailyReport`、`generateWeeklyReport`、`exportReportPdf`、`getReports`、`deleteReport`
- 当前实现：mock，内存 `reportStore`
- 后续对应：`ai_reports`、`export_tasks`、`file_assets`
- 参数缺失：多数方法有 organizationId/pondId；`deleteReport` 不带 pondId，可以按 organizationId + reportId 删除

### `auditLogService.ts`

- 方法：`createOperationLog`、`getOperationLogs`、`getUserOperationLogs`
- 当前实现：localStorage `shrimp_operation_logs`
- 后续对应：`operation_logs`、`audit_logs`
- 参数缺失：都有 organizationId；payload 允许 userId 可选，真实审计建议由后端从 JWT 填充

### `mockDataService.ts`

- 方法：`cloneBusinessConfig`、`getMockUser`、`getMockOrganizations`、`getMockOrganizationMembers`、`getOrganizationRole`、`getDefaultOrganizationId`、`authenticateMockUser`、`getSavedMockSession`、`registerMockUser`、`saveMockSession`、`clearMockSession`、`getBusinessConfig`、`saveBusinessConfig`、`getMockSystemData`
- 当前实现：核心 mock 数据中心，部分 localStorage
- 后续对应：仅作为 mock 替换层；正式接 Supabase 后逐步由 Supabase service 替换

## 五、现有 store 层

### `authStore`

- 文件：`src/stores/authStore.ts`
- 管理状态：`isLoggedIn`、`currentUser`、`currentOrganization`、`currentRole`、`organizations`、`sessionLoaded`
- 是否有 currentOrganization：有
- 是否有 currentPond：无
- 是否有 currentRole：有
- 是否有权限判断：有，`canEditBusinessConfig`；`viewer` 不可编辑，`owner/admin/operator` 可编辑业务配置
- 主要 actions：`applySession`、`login`、`register`、`logout`、`switchOrganization`、`loadMockSession`
- 数据来源：`mockDataService` + localStorage

### `shrimpSystem`

- 文件：`src/stores/shrimpSystem.ts`
- 管理状态：当前 organizationId、业务配置、可编辑池塘、可编辑机器人、各池塘阈值、系统元信息、池塘 profile、水质指标、虾群指标、机器人运行态、阈值、当前池塘配置、虾群配置、机器人配置
- 是否有 currentOrganization：有 `organizationId`，但企业详情在 `authStore`
- 是否有 currentPond：有 `pondConfig.selectedPondId`、`selectedPondProfile`
- 是否有 currentRole：无，权限依赖 `authStore`
- 是否有权限判断：无直接角色判断；页面层使用 `authStore.canEditBusinessConfig`
- 主要 getters：`selectedPondProfile`、`waterAlerts`、`shrimpAlerts`、`robotAlerts`、`modelAlerts`、`allAlerts`、`activeAlertCount`、`hasActiveAlert`、`getWaterMetricByKey`、`getShrimpMetricByKey`
- 主要 actions：`loadOrganizationData`、`saveBusinessConfig`、`persistEditableRuntime`、`rebuildEditableRuntime`、`saveEditablePond`、`addEditablePond`、`deleteEditablePond`、`saveEditableRobot`、`addEditableRobot`、`deleteEditableRobot`、`saveEditableThreshold`、`selectPond`
- 数据来源：默认 mockDataService；编辑态 localStorage `shrimp_editable_system_config`

### `operationConsole`

- 文件：`src/stores/operationConsole.ts`
- 管理状态：旧控制台选中池塘、池塘列表、报警概览、mini 状态、监控 feed、图表数据
- 是否有 currentOrganization：无
- 是否有 currentPond：有 `selectedPondId`、`currentPond`
- 是否有 currentRole：无
- 是否有权限判断：无
- 数据来源：`src/mock/operationConsole.ts`

### 企业相关 store

- 当前没有独立 organization store。
- 企业状态集中在 `authStore.currentOrganization` 和 `authStore.organizations`。
- 企业数据加载 service 是 `organizationService.ts`，但页面还没有正式企业管理页。

### 池塘相关 store

- 当前没有独立 pond store。
- 池塘状态集中在 `shrimpSystem.editablePonds`、`shrimpSystem.pondProfiles`、`shrimpSystem.pondConfig.selectedPondId`。

### 机器人相关 store

- 当前没有独立 robot store。
- 机器人配置与运行态集中在 `shrimpSystem.editableRobots`、`shrimpSystem.robots`、`shrimpSystem.robotConfig`。

### 历史数据相关 store

- 当前没有独立 history store。
- 历史数据页在组件内根据 `shrimpSystem` 即时生成行和图表 series。

### AI 相关 store

- 当前没有独立 AI store。
- AI 决策、模型设置、投喂计划、设备、风险评分等由 `ExtensionCenterView.vue` 直接调用 service 并保存在组件 ref/reactive 中。

## 六、数据库字段映射建议

### 1. `organizations`

- 前端 `Organization.id` -> `id`
- `name` -> `name`
- `short_name` -> `short_name`
- `region` -> `region`
- `status` -> `status`
- `owner_user_id?` -> `owner_user_id`
- `created_at?` -> `created_at`
- `updated_at?` -> `updated_at`

### 2. `profiles`

- 前端 `UserProfile.id` -> `id`，建议等于 Supabase Auth user id
- `display_name` -> `display_name`
- `email` -> `email`
- `phone?` -> `phone`
- `avatar_url?` -> `avatar_url`
- `created_at?` -> `created_at`
- `updated_at?` -> `updated_at`

### 3. `organization_members`

- `OrganizationMember.id` -> `id`
- `organization_id` -> `organization_id`
- `user_id` -> `user_id`
- `role` -> `role`
- `display_name?` -> 建议不冗余，查询时 join `profiles.display_name`
- `email?` -> 建议不冗余，查询时 join `profiles.email`
- `joined_at?` -> `joined_at`

### 4. `ponds`

- `Pond.id` -> `id`
- `organization_id` -> `organization_id`
- `pond_code` -> `pond_code`
- `pond_name` -> `pond_name`
- `shrimp_species` -> `shrimp_species`
- `area` -> `area_mu` 或继续使用 `area`
- `water_depth` -> `water_depth_m` 或继续使用 `water_depth`
- `location` -> `location`
- `map_position.longitude` -> `longitude`
- `map_position.latitude` -> `latitude`
- `scene_position` -> 建议拆到 `scene_pond_objects`
- `created_at?` -> `created_at`
- `updated_at?` -> `updated_at`

### 5. `robots`

- `Robot.id` -> `id`
- `organization_id` -> `organization_id`
- `pond_id` -> `pond_id`
- `robot_code` -> `robot_code`
- `robot_name` -> `robot_name`
- `robot_type` -> `robot_type`
- `status?` -> `status`，也可只作为最新运行态放 `robot_status`
- `created_at?` -> `created_at`
- `updated_at?` -> `updated_at`

### 6. `water_thresholds`

- `WaterThreshold.id` -> `id`
- `organization_id` -> `organization_id`
- `pond_id?` -> `pond_id`，建议非空
- `temperature.min/max` -> `temperature_min` / `temperature_max`
- `oxygen.min/max` -> `oxygen_min` / `oxygen_max`
- `ph.min/max` -> `ph_min` / `ph_max`
- `orp.min/max` -> `orp_min` / `orp_max`
- `turbidity.min/max` -> `turbidity_min` / `turbidity_max`
- `ammonia.min/max` -> `ammonia_min` / `ammonia_max`
- `nitrite.min/max` -> `nitrite_min` / `nitrite_max`
- `hardness.min/max` -> `hardness_min` / `hardness_max`
- 建议补充：`created_at`、`updated_at`

### 7. `water_readings`

- `WaterReading.id` -> `id`
- `organizationId` -> `organization_id`
- `pondId` -> `pond_id`
- `deviceId?` -> `device_id`
- `temperature` -> `temperature`
- `dissolvedOxygen` -> `dissolved_oxygen`
- `ph` -> `ph`
- `orp` -> `orp`
- `turbidity` -> `turbidity`
- `ammonia` -> `ammonia`
- `nitrite` -> `nitrite`
- `hardness` -> `hardness`
- `recordedAt` -> `recorded_at`

### 8. `water_latest`

- `WaterLatest.organizationId` -> `organization_id`
- `WaterLatest.pondId` -> `pond_id`
- `reading.id` -> `reading_id`
- `reading.*` -> 建议冗余最新值字段，便于首页快速读取
- `updatedAt` -> `updated_at`

### 9. `water_daily_stats`

- `organizationId` -> `organization_id`
- `pondId` -> `pond_id`
- 日期 -> `stat_date`
- `averageTemperature` -> `avg_temperature`
- `averageOxygen` -> `avg_dissolved_oxygen`
- `averagePh` -> `avg_ph`
- 最大/最小值 -> `min_*` / `max_*`
- `warningCount` -> `warning_count`
- `status` -> `status`

### 10. `feeding_records`

- `FeedingRecord.id` -> `id`
- `organizationId` -> `organization_id`
- `pondId` -> `pond_id`
- `robotId?` -> `robot_id`
- `feedAmountKg` -> `feed_amount_kg`
- `mode` -> `mode`
- `adviceSource?` -> `advice_source`
- `executedAt` -> `executed_at`
- `remark?` -> `remark`

### 11. `shrimp_measurements`

- `ShrimpMeasurement.id` -> `id`
- `organizationId` -> `organization_id`
- `pondId` -> `pond_id`
- `average_length_cm` -> `average_length_cm`
- `average_weight_g` -> `average_weight_g`
- `sampleCount` -> `sample_count`
- `measuredAt` -> `measured_at`
- `source` -> `source`

### 12. `alerts`

- `Alert.id` -> `id`
- `organizationId` -> `organization_id`
- `pondId?` -> `pond_id`
- `robotId?` -> `robot_id`
- `type` -> `type`
- `level` -> `level`
- `title` -> `title`
- `content` -> `content`
- `readStatus` -> `read_status`
- `createdAt` -> `created_at`
- `resolvedAt?` -> `resolved_at`
- 建议补充：`metric_key`、`current_value`、`normal_range`、`suggestion`、`source`

### 13. `robot_position_latest`

- `RobotPositionLatest.organizationId` -> `organization_id`
- `pondId?` -> `pond_id`
- `robotId` -> `robot_id`
- `x` -> `x`
- `y` -> `y`
- `z` -> `z`
- `heading` -> `heading`
- `speed` -> `speed`
- `battery` -> `battery`
- `status` -> `status`
- `recordedAt` -> `recorded_at`
- 建议主键：`robot_id` 或 `(organization_id, robot_id)`

### 14. `ai_evaluations`

- `AiEvaluation.id` -> `id`
- `organizationId` -> `organization_id`
- `pondId` -> `pond_id`
- `providerType` -> `provider_type`
- `riskLevel` -> `risk_level`
- `riskScore` -> `risk_score`
- `summary` -> `summary`
- `problems` -> `problems`，可用 jsonb
- `recommendations` -> `recommendations`，可用 jsonb
- `confidence` -> `confidence`
- `needManualConfirm` -> `need_manual_confirm`
- `createdAt` -> `created_at`

### 15. `scene_configs`

- `SceneConfig.organizationId` -> `organization_id`
- `camera` -> `camera_config`，建议 jsonb
- `farmModel.modelUrl` -> `farm_model_url`
- `robotModel.modelUrl` -> `robot_model_url`
- `farmModel.scale` -> `farm_model_scale`
- `robotModel.scale` -> `robot_model_scale`
- `ponds` -> 建议拆到 `scene_pond_objects`
- `robots` -> 建议拆到 `scene_robot_objects`
- `routes` -> 建议拆到 `scene_routes` 或 jsonb

## 七、缺失问题检查

### 1. 哪些数据没有 organizationId

- `shrimpSystem.SystemMetric` 没有 organizationId，依赖当前 store organization 隔离。
- `shrimpSystem.SystemAlert` 没有 organizationId，顶部报警是当前 store 计算结果。
- `shrimpSystem.RobotInfo` 没有 organizationId，依赖当前 store。
- `HistoryDataView.vue` 内部生成的 `HistoryRow` 没有 organizationId。
- `operationConsole` 旧版 mock 数据没有 organizationId，不适合直接作为数据库结构。
- `riskScoreService.calculateTotalRisk` 返回值没有 organizationId，落库时应补。

### 2. 哪些池塘相关数据没有 pondId

- `SystemMetric` 只有在 `PondProfile` 外层才有 pondId。
- `SystemAlert` 只有部分文本或 id 能推断池塘，没有统一 pondId 字段。
- `HistoryRow` 没有独立 pondId 字段，只在 target 文案中拼接。
- `WaterThreshold.pond_id` 当前类型是可选，数据库应非空。
- `Alert.pondId` 是可选；水质、虾群、投喂类报警应强制有 pondId。

### 3. 哪些机器人相关数据没有 robotId

- `RobotInfo` 的 `id` 实际相当于 robotId，但字段名不统一。
- `SystemAlert` 的机器人报警没有独立 robotId 字段，只写在 `id` 字符串或文本中。
- `FeedingRecord.robotId`、`FeedingTask.robotId` 是可选，人工投喂可以为空，机器人执行时应非空。
- `DeviceCommandAck.robotId` 可选，机器人设备回执建议非空。

### 4. 哪些页面还在组件里写死数据

- `HistoryDataView.vue`：历史范围标签、历史表格行、投喂历史值、报警历史趋势、配置图表数据在组件内计算生成。
- `ExtensionCenterView.vue`：模块卡片、命令按钮、部分页面文案和当前模块状态在组件内定义；数据调用 service mock。
- `SystemOverviewView.vue`：部分概览 KPI、事件行、阶段面板由 store 数据二次计算，仍有展示逻辑写在组件内。
- `SystemConfigView.vue`：配置步骤、阈值字段、机器人类型选项在组件内定义。
- 旧控制台组件：大量布局和展示数据来自 mock 文件或 props，不建议作为正式数据库依据。

### 5. 哪些页面用了 localStorage

- `LoginView.vue` 间接使用：登录 session 和注册账号通过 `mockDataService` 保存。
- `SystemShellLayout.vue` 间接使用：组织切换后触发 `shrimpSystem.loadOrganizationData`，读取本地配置。
- `SystemConfigView.vue` 间接使用：保存池塘、机器人、阈值到 `shrimp_editable_system_config`。
- `ExtensionCenterView.vue` 间接使用：AI 模型配置 `shrimp_ai_model_config`、操作日志 `shrimp_operation_logs`；若后续使用 `scene3dService`，还有 `shrimp_scene3d_config`。

### 6. 哪些页面后续最适合先接 Supabase

优先级建议：

1. 登录页和路由守卫：先接 Supabase Auth、`profiles`、`organizations`、`organization_members`，这是权限和企业隔离基础。
2. 自定义内容配置页：接 `ponds`、`robots`、`water_thresholds`，替换 localStorage。
3. 系统首页、水质页、虾群页、机器人页：先读取上述基础表，再接 `water_latest`、`robot_status`。
4. 历史数据页：接 `water_readings`、`feeding_records`、`shrimp_measurements`、`alerts`。
5. 扩展接口页：再接 `robot_position_latest/history`、`feeding_plans/tasks`、`ai_model_configs`、`ai_evaluations`。

### 7. 哪些字段命名需要统一

- `organization_id` 和 `organizationId` 混用：`business.ts` 使用 snake_case，其它领域类型多用 camelCase。
- `pond_id` 和 `pondId` 混用。
- `robot_id`、`robotId`、`robot_code`、`RobotInfo.id` 语义需要明确。
- `area` 建议统一为 `area_mu` 或在文档中明确单位为亩。
- `water_depth` 建议统一为 `water_depth_m` 或明确单位为米。
- `oxygen` 和 `dissolvedOxygen` 命名不统一：阈值用 `oxygen`，读数用 `dissolvedOxygen`。
- `ph` 和 `pH` 页面文案不影响字段，但数据库建议用 `ph`。
- `createdAt` 和 `created_at` 混用；接 Supabase 时建议数据库字段用 snake_case，前端 service 层可转换为 camelCase。

### 8. 哪些数据适合做 latest 表

- `water_latest`：每个池塘当前最新水质。
- `robot_position_latest`：每台小车当前坐标。
- `robot_status`：每台机器人当前在线、电量、工作模式、故障。
- 可选 `device_latest_status` 或直接在 `devices` 存最新心跳字段。
- 可选 `shrimp_estimates`：每个池塘当前估测数量、产量、成熟度。

### 9. 哪些数据必须做 history 表

- `water_readings`：传感器水质读数历史。
- `robot_position_history`：小车轨迹历史。
- `robot_commands` 和 `robot_command_acks`：指令与回执历史。
- `feeding_records`：实际投喂记录。
- `shrimp_measurements`：虾体测量历史。
- `alerts`：报警发生、读取、处理历史。
- `operation_logs`、`audit_logs`：用户操作和安全审计历史。
- `ai_request_logs`：模型调用历史。
- `ai_evaluations`、`ai_feeding_advices`、`ai_alert_explanations`：AI 结果历史。

### 10. 哪些数据适合做 daily_stats 表

- `water_daily_stats`：按池塘、日期汇总水质均值、最大、最小、异常次数。
- `feeding_daily_stats`：按池塘、日期汇总投喂次数、投喂总量、机器人执行次数。
- `shrimp_growth_daily_stats` 或 `growth_records`：按池塘记录生长阶段性数据。
- `robot_daily_stats`：按机器人汇总运行时长、任务数、故障数、电量均值。
- `alert_daily_stats`：按企业/池塘汇总报警数量和级别分布。

## 八、不要做的事

当前阶段不要做：

- 不修改业务代码。
- 不新增 Supabase 客户端。
- 不接数据库。
- 不删除 mock 数据。
- 不重做 UI。
- 不改路由结构。
- 不接硬件、MQTT、WebSocket 或真实 AI 模型。
- 不在前端保存任何 API Key 或 service_role key。

## 后续数据库接入建议

第一批建议先接：

1. `profiles`
2. `organizations`
3. `organization_members`
4. `ponds`
5. `robots`
6. `water_thresholds`

原因：这六张表能先替换登录身份、企业隔离、自定义内容、本地保存配置，是后续所有实时表、历史表、AI 表的外键基础。

第二批建议接：

1. `devices`
2. `water_latest`
3. `water_readings`
4. `robot_status`
5. `alerts`

原因：这批表能让首页、水质页、机器人监测、报警系统开始使用真实业务数据。

第三批建议接：

1. `feeding_plans`
2. `feeding_tasks`
3. `feeding_records`
4. `robot_position_latest`
5. `robot_position_history`
6. `shrimp_measurements`
7. `shrimp_estimates`

原因：这批表支撑投喂业务闭环、3D 小车监控和虾群生长历史。

第四批建议接：

1. `ai_model_configs`
2. `risk_scores`
3. `ai_evaluations`
4. `ai_feeding_advices`
5. `ai_reports`
6. `ai_request_logs`
7. `ai_result_feedback`

原因：基础生产数据稳定后，再接 AI 决策链路，能避免模型输入数据不完整。
