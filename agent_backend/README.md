# 虾群养殖智能体后端

这是一个最小可运行的 FastAPI 服务。目前提供基础启动、健康检查、Supabase 登录用户只读池塘接口、确定性的养殖场业务概览工具，以及基于 DeepSeek 的首个受控养殖建议接口，并为后续接入 Tools、LangGraph、RAG 与配置管理预留了清晰的代码边界。

当前不接 LangGraph，也不修改或连接现有 Vue 前端业务。

## 目录结构

```text
agent_backend/
├─ app/
│  ├─ agents/        # 后续放置智能体定义
│  ├─ api/           # API 路由
│  ├─ core/          # 全局配置等基础能力
│  ├─ graphs/        # 后续放置 LangGraph 工作流
│  ├─ rag/           # 后续放置检索增强生成逻辑
│  ├─ schemas/       # API 与服务层数据结构
│  ├─ services/      # Supabase 等外部服务访问层
│  ├─ tools/         # 后续放置智能体工具
│  └─ main.py        # FastAPI 应用入口
├─ .env.example      # 环境变量示例
└─ requirements.txt  # Python 依赖
```

## 本地启动

建议使用 Python 3.10 或更高版本。

```powershell
cd D:\shrimp\shrimp_web2\agent_backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

首次使用池塘接口前，需要编辑 `.env` 并填写：

```env
AGENT_BACKEND_SUPABASE_URL=https://你的项目.supabase.co
AGENT_BACKEND_SUPABASE_PUBLISHABLE_KEY=你的_publishable_key
```

正常业务查询只使用 publishable key + 当前用户 JWT；不要用 `service_role` 或 secret key 替代这里的 publishable key。审计 secret 使用下方独立配置项。

使用智能建议接口前，还需将 DeepSeek API Key 只配置在后端 `.env`：

```env
AGENT_BACKEND_DEEPSEEK_API_KEY=你的_DeepSeek_API_Key
AGENT_BACKEND_DEEPSEEK_MODEL=deepseek-v4-pro
AGENT_BACKEND_DEEPSEEK_MAX_RETRIES=1
```

不要把 DeepSeek API Key 放入 Vue 的 `VITE_` 环境变量或提交到 Git。

建议历史启用后，还需配置一个只供专用审计追加组件使用的 Supabase
`sb_secret_` key：

```env
AGENT_BACKEND_SUPABASE_SECRET_KEY=你的_sb_secret_key
```

该 secret 只会由 `advice_audit_writer` 用于向 `ai_request_logs` 批量追加
`record_source=agent_backend` 的可信记录，代码中没有任意表名或通用查询能力。
池塘、水质、虾群、投喂、设备和历史记录查询仍使用 publishable key + 当前用户
JWT，并由 RLS 决定范围。不要把 secret 放入 Vue、Swagger、请求参数或 Git。

启动后可访问：

- 健康检查：`http://127.0.0.1:8000/api/v1/health`
- 当前用户可访问的池塘：`http://127.0.0.1:8000/api/v1/ponds`
- 当前用户的养殖场概览：`http://127.0.0.1:8000/api/v1/farm/overview`
- 当前用户可访问的单池概览：`GET http://127.0.0.1:8000/api/v1/farm/ponds/{pond_id}/overview`
- 生成当前用户的养殖建议：`POST http://127.0.0.1:8000/api/v1/agent/farm-advice`
- 生成当前用户可访问的单池建议：`POST http://127.0.0.1:8000/api/v1/agent/ponds/{pond_id}/advice`
- 查询当前用户可访问的建议历史：`GET http://127.0.0.1:8000/api/v1/agent/advice-history`
- 查询一条可访问的建议历史：`GET http://127.0.0.1:8000/api/v1/agent/advice-history/{audit_id}`
- Swagger 接口文档：`http://127.0.0.1:8000/docs`
- ReDoc 接口文档：`http://127.0.0.1:8000/redoc`

也可以在 PowerShell 中检查服务状态：

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
```

池塘接口需要前端 Supabase 登录会话中的 access token：

```powershell
$accessToken = '替换为当前用户的 Supabase access token'
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/api/v1/ponds `
  -Headers @{ Authorization = "Bearer $accessToken" }
```

接口不接受可信的 `organization_id`。后端先通过 Supabase Auth 验证 access token，再以同一个用户 JWT 查询 `ponds`；最终可见范围由数据库中的 `organization_members` 关系和 `ponds` RLS 策略决定。

单池接口中的 `pond_id` 只作为“从当前 JWT 已经通过 RLS 看见的池塘集合中选择目标”的标识，不会作为绕过 RLS 的数据库过滤条件。目标池塘不在当前用户可见集合时统一返回 404，既不调用 DeepSeek，也不透露该 UUID 是否真实存在。单池建议会重建只含目标池塘的最小上下文，其他可见池塘的事实不会进入该次模型请求。

`farm_get_overview` 先读取当前用户通过 RLS 可见的 `ponds`，再以这些服务端确认过的池塘范围读取：

- `water_latest`、`water_thresholds` 和最近 7 日 `water_daily_stats`
- 尚未解决的 `alerts`
- 每池最新一条 `shrimp_daily_stats`
- 最近 7 日 `feeding_daily_stats`
- 池塘绑定的 `devices` 和已有 `robot_status`

接口不接收用户传入的组织或池塘范围；所有 Data API 请求继续使用同一个用户 JWT，并受 RLS 约束。Supabase Auth 和后续并发查询在单次 API 请求内复用一个 HTTP 客户端，请求结束后自动释放连接。

后端按数据库返回的 `(organization_id, pond_id)` 组合数据，对投喂日统计计算 7 日总量、次数、有记录日均值和单次均值；对虾群日统计只取每池最新一条；对水质日统计保留最多 7 个日数据点并计算首末有记录日的变化量；设备上下文只输出类型、状态和计数汇总，不向模型发送设备主键、名称、固件或故障自由文本。水质部分继续使用确定性规则输出风险分数、风险级别、异常指标和数据缺失原因，整个概览工具本身不调用任何大模型。

最新水质读数超过 24 小时后按过期数据处理：旧值仍返回用于追溯，但不再参与当前水质风险分数，池塘会标记为“数据不足”。设备心跳超过 30 分钟后标记为失联；从未记录心跳时间的设备单独标记为“无法判断”，不会误报为失联。场级 `attention_ponds` 会同时统计水质/报警需要关注或设备需要关注的池塘，响应还会返回失联和未知心跳设备总数。两个阈值可在 `.env` 中调整：

```env
AGENT_BACKEND_WATER_STALE_AFTER_HOURS=24
AGENT_BACKEND_DEVICE_HEARTBEAT_STALE_AFTER_MINUTES=30
```

判定使用严格的大于关系，所以恰好 24 小时的水质读数和恰好 30 分钟的设备心跳不算超时。未来时间戳的年龄按 0 处理，避免时钟偏差产生负数。

当前水质基础风险规则与现有前端保持一致：每个越界水质指标计 14 分，分数区间为低风险、关注、预警和高风险；未解决报警会根据 `info`、`warning`、`critical` 设置相应的最低风险级别。缺少最新水质、阈值或关键指标时返回“数据不足”，不会生成猜测结果。

`POST /api/v1/agent/farm-advice` 不接收用户问题、`organization_id` 或池塘 ID。后端先使用当前用户 JWT 调用 `farm_get_overview`，再删除组织、用户、数据库主键、池塘名称和位置等非必要标识，并把剩余数据转换为带 `fact_id` 的最小事实清单后交给 DeepSeek。

模型只能返回建议动作和所引用的 `fact_id`；`basis`、总体判断和数据限制均由后端根据事实目录生成。后端会按池塘提供允许分析的数据域和禁止出现在标题/actions 中的主题，并校验事实编号、池塘归属、证据数据域及正文中的池塘编号，拒绝无依据的设施建设状态、设备购置/安装、精确投喂量、直接设备控制，以及“上下文未提供等于数据库不存在”等推断。每条建议最多引用 6 个事实、包含 5 个动作；没有异常或可安全建议的事项时允许返回空建议，但只要规则层存在需要关注的池塘，模型就不能用空建议绕过分析。

虾群、最近投喂、水质趋势和设备状态只有在 RLS 查询实际返回数据时才会进入模型事实；缺失时由后端写入 `limitations`，模型不能围绕缺失数据生成建议。即使存在投喂历史，在经过确认的投喂率、饲料系数和养殖阶段规则接入前，模型仍不能生成精确投喂量。

当前接口生成建议后，会把最终通过安全校验的逐池结果、真实 `fact_id`、规则风险、模型与 token 用量、`generation_status`、是否安全降级、请求 ID 和生成时间写入可信审计记录。不会保存原始 prompt、模型未通过校验的草稿、access token、refresh token 或任何 API Key。审计记录保存失败时，接口不会把未留痕的建议作为成功响应返回。接口不执行投喂或设备控制。

历史接口不接受 `organization_id`；可选 `pond_id` 只用于 RLS 可见集合内筛选，分页使用服务端游标而不是 offset。登录用户可以读取所属企业的可信记录，但 restrictive RLS 策略禁止客户端伪造、更新或删除 `agent_backend` 记录。旧版前端写入的 `ai_request_logs` 继续保留为 `legacy_frontend`，不被历史接口混入。

数据库自由文本在进入模型前会规范化并限长，模型生成的动作也有长度和数量限制，重复建议会由后端去重。网络错误、DeepSeek 5xx、JSON 空内容或无法解析的 JSON 默认短暂重试一次；模型 JSON 若未通过事实或安全校验，也只允许重新生成一次，重试提示会针对缺少设备、虾群、投喂事实等原因给出更明确的收敛要求，安全边界不会放宽，所有成功解析尝试的 token 用量会合并返回。若两版模型草稿仍不符合结构或安全约束，接口返回 `generation_status: "safe_fallback"`，并由确定性规则根据真实风险、异常指标和报警事实生成只包含人工复测、核对报警与记录结果的保守建议；不合规模型文本不会返回给调用方，真实上游故障仍返回相应错误状态。

所有 HTTP 响应包含服务端生成的 `X-Request-ID`、`Cache-Control: no-store` 和 `X-Content-Type-Options: nosniff`。请求日志只记录方法、路径、状态码、耗时和请求 ID，不记录查询参数、Bearer token 或业务响应。

## 运行测试

```powershell
python -m unittest discover -s tests -v
```

数据库迁移位于 `supabase/migrations/`；RLS 隔离和防伪造回归脚本位于 `supabase/tests/agent_advice_history_rls.sql`，脚本只创建事务内测试记录并最终回滚。`supabase/rollbacks/` 中的 down SQL 仅供紧急恢复，正常流程不要执行。
