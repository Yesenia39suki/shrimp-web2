# 数据库表规划

本文档用于后续接入 Supabase Auth、Supabase Database、Supabase Storage、Realtime 和 Edge Functions。所有业务表都必须包含 `organization_id`，池塘相关表必须包含 `pond_id`，机器人小车相关表必须包含 `robot_id`。

## 第一批基础表

| 表名                 | 用途                                    |
| -------------------- | --------------------------------------- |
| profiles             | 用户扩展资料，对应 Supabase Auth 用户。 |
| organizations        | 企业/养殖主体。                         |
| organization_members | 企业成员、角色、加入状态。              |
| ponds                | 池塘基础档案、地图位置、养殖品种。      |
| robots               | 机器人基础档案和绑定池塘。              |
| water_thresholds     | 每个企业/池塘的水质阈值。               |

## 第二批实时监控表

| 表名                   | 用途                               |
| ---------------------- | ---------------------------------- |
| devices                | 传感器、网关、机器人设备统一档案。 |
| water_latest           | 每个池塘最新水质数据。             |
| water_readings         | 水质历史读数。                     |
| alerts                 | 报警事件列表。                     |
| alert_rules            | 报警规则配置。                     |
| robot_status           | 机器人在线状态、工作模式、电量。   |
| robot_position_latest  | 机器人最新坐标。                   |
| robot_position_history | 机器人历史轨迹点。                 |

## 第三批控制与投喂表

| 表名               | 用途                       |
| ------------------ | -------------------------- |
| robot_commands     | 机器人控制指令。           |
| robot_command_acks | 机器人指令回执。           |
| feeding_plans      | 投喂计划。                 |
| feeding_tasks      | 每日或计划生成的投喂任务。 |
| feeding_records    | 实际投喂记录。             |
| feed_inventory     | 饲料库存和批次余量。       |

## 第四批虾群生长表

| 表名                | 用途                                   |
| ------------------- | -------------------------------------- |
| shrimp_measurements | 虾体人工测量、App 测量或图像识别测量。 |
| shrimp_estimates    | 当前估测数量、产量和成熟度。           |
| growth_records      | 周期性生长快照。                       |

## 第五批 AI 决策表

| 表名                  | 用途                                 |
| --------------------- | ------------------------------------ |
| ai_model_configs      | 企业级 AI 模型配置，不保存前端密钥。 |
| risk_scores           | 综合风险评分结果。                   |
| ai_evaluations        | 池塘状态评估结果。                   |
| ai_feeding_advices    | AI 投喂建议。                        |
| ai_alert_explanations | AI 报警解释。                        |
| ai_reports            | AI 生成报告。                        |
| ai_chat_sessions      | AI 对话会话。                        |
| ai_chat_messages      | AI 对话消息。                        |
| ai_request_logs       | AI 调用日志、耗时、成功状态。        |
| ai_result_feedback    | AI 结果采纳/不采纳反馈。             |

## 第六批 3D 场景与文件表

| 表名                | 用途                                 |
| ------------------- | ------------------------------------ |
| scene_models        | 养殖场、机器人、池塘、设备模型文件。 |
| scene_configs       | 企业级 3D 场景配置。                 |
| scene_pond_objects  | 3D 场景中的池塘位置和尺寸。          |
| scene_robot_objects | 3D 场景中的机器人位置、模型和姿态。  |
| file_assets         | 图片、模型、报告等文件资产索引。     |

## 第七批系统日志表

| 表名           | 用途                                   |
| -------------- | -------------------------------------- |
| operation_logs | 用户操作日志。                         |
| audit_logs     | 审计日志，保留角色、IP、客户端等信息。 |
| export_tasks   | 报告和数据导出任务。                   |

## 建议接入顺序

1. 先接 `profiles`、`organizations`、`organization_members`，完成登录、企业隔离和角色权限。
2. 再接 `ponds`、`robots`、`water_thresholds`，替换当前配置页面的 localStorage。
3. 然后接 `devices`、`water_latest`、`water_readings`、`alerts`，打通硬件上传和水质看板。
4. 小车实时监控阶段接 `robot_status`、`robot_position_latest`、`robot_position_history`、`robot_commands`、`robot_command_acks`。
5. 投喂和 AI 阶段接 `feeding_*`、`shrimp_*`、`ai_*` 表。
6. 3D 文件阶段接 `scene_*` 和 `file_assets`，模型文件放 Supabase Storage。
