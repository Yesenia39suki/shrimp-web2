# Supabase 第一阶段 SQL 使用说明

本文档说明 Supabase SQL 的用途、执行顺序、注册默认数据逻辑和前端环境变量。当前前端已支持 `mock` 与 `supabase` 两种数据源模式。

## 1. 执行 SQL

在 Supabase 项目中打开 SQL Editor，将以下文件内容完整复制进去执行：

`src/docs/supabase-schema-phase1.sql`

该 SQL 会创建第一阶段表结构、索引、`updated_at` 自动更新触发器、权限辅助函数和基础 RLS 策略。

随后继续执行：

`src/docs/supabase-migration-full-integration.sql`

该 SQL 会补齐扩展页面和历史页面需要的表、索引、RLS、Realtime 可订阅表结构和统计 RPC。

需要演示历史图表时，再手动执行：

`src/docs/supabase-seed-demo-data.sql`

执行前必须替换 SQL 顶部的 `target_organization_id` 和 `target_pond_id`，不要直接用占位 UUID。

## 2. Auth 注册触发器

SQL 已创建 `public.handle_new_auth_user()`，并绑定到 `auth.users` 的 `after insert` 触发器：

```sql
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();
```

正式注册逻辑不再依赖固定演示邮箱。任意邮箱通过 Supabase Auth 注册成功后，触发器会自动创建：

- `profiles`
- `organizations`
- `organization_members`
- `ponds`
- `robots`
- `water_thresholds`

注册时前端需要通过 `supabase.auth.signUp` 传入企业名称：

```ts
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      display_name: displayName,
      organization_name: organizationName,
    },
  },
})
```

触发器会优先读取 `raw_user_meta_data.organization_name` 作为 `organizations.name`。如果用户不填写企业名称，系统默认使用“用户昵称的智慧养殖企业”。

后台仍可保留 `a@aifeed.cc.cd` / `b@aifeed.cc.cd` 作为公开演示账号，但正式注册不应依赖固定邮箱。

## 3. 创建 Auth 测试用户

SQL 执行完成后，可以在 Supabase Dashboard 的 Authentication 中创建测试用户。创建用户时建议填写 metadata：

```json
{
  "display_name": "A账户管理员",
  "organization_name": "用户自定义企业名称"
}
```

创建完成后无需再手动插入默认企业、池塘、机器人和阈值。触发器会自动完成默认数据初始化。

## 4. 已有用户补齐默认数据

如果 SQL 执行前已经存在 Auth 用户，可以在 SQL Editor 手动执行：

```sql
select public.backfill_auth_users_default_data();
```

该函数会遍历 `auth.users`：

- 如果用户没有 `profiles`，自动创建。
- 如果用户没有 `organization_members`，自动创建默认企业、成员、池塘、机器人和水质阈值。
- 企业名称仍优先读取 `raw_user_meta_data.organization_name`。
- 如果没有企业名称，则使用“用户昵称的智慧养殖企业”。

## 5. 前端环境变量

本地 `.env.local` 示例：

```env
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=你的 publishable/anon key
```

兼容旧命名：

```env
VITE_SUPABASE_ANON_KEY=你的 anon key
```

前端只允许使用 publishable/anon key，不允许写入 `service_role` key 或任何模型 API Key。

需要回到离线演示模式时：

```env
VITE_DATA_SOURCE=mock
```

## 6. 已接入的前端表

当前前端 Supabase 模式已通过 service 层接入：

1. `profiles`
2. `organizations`
3. `organization_members`
4. `ponds`
5. `robots`
6. `water_thresholds`
7. `devices`
8. `water_readings`
9. `water_latest`
10. `water_daily_stats`
11. `feeding_records`
12. `feeding_daily_stats`
13. `shrimp_measurements`
14. `shrimp_daily_stats`
15. `alert_rules`
16. `alerts`
17. `pond_daily_snapshots`

补充迁移后还会接入：

- `feeding_plans`
- `feeding_tasks`
- `robot_status`
- `robot_position_latest`
- `robot_position_history`
- `robot_commands`
- `robot_command_acks`
- `ai_model_configs`
- `risk_scores`
- `ai_evaluations`
- `ai_feeding_advices`
- `ai_result_feedback`
- `ai_request_logs`
- `scene_configs`
- `operation_logs`

## 7. RLS 权限说明

SQL 已开启 RLS，并提供以下辅助函数：

- `is_org_member(org_id uuid)`：判断当前登录用户是否属于企业。
- `get_org_role(org_id uuid)`：获取当前登录用户在企业内的角色。
- `can_manage_org_data(org_id uuid)`：`owner/admin/operator` 返回 true。
- `can_admin_org(org_id uuid)`：`owner/admin` 返回 true。

基础规则：

- 企业成员只能读取自己 `organization_id` 下的数据。
- `viewer` 只能查看。
- `owner/admin/operator` 可以新增和修改生产数据。
- 删除权限只给 `owner/admin`。
- `profiles` 只能读取和修改自己的资料。
- `organizations` 只有成员可读，`owner/admin` 可修改。
- `organization_members` 只有企业成员可读，`owner/admin` 可管理。

## 8. 字段补充说明

- `organization_members` 包含 `updated_at`，成员角色从 `viewer` 改为 `operator/admin` 等场景会自动刷新更新时间。
- `alerts` 包含 `updated_at`，报警从 `unread` 改为 `read/resolved` 等状态变化会自动刷新更新时间。
- 这两个表都已加入 `set_updated_at` 触发器列表。
- `organizations.name` 保存注册时传入的企业名称，`organizations.short_name` 自动截取前 12 个字符。

## 9. 命名转换注意事项

数据库统一使用 snake_case。

前端字段后续由 service 层转换：

- `organizationId` <-> `organization_id`
- `organizationName` / `organization_name` <-> `organizations.name`
- `pondId` <-> `pond_id`
- `robotId` <-> `robot_id`
- `pondCode` <-> `pond_code`
- `pondName` <-> `pond_name`
- `area` <-> `area_mu`
- `waterDepth` <-> `water_depth_m`
- `oxygen` <-> `dissolved_oxygen`
- `recordedAt` <-> `recorded_at`
- `updatedAt` <-> `updated_at`

特别注意：前端当前阈值类型里叫 `oxygen`，数据库统一叫 `dissolved_oxygen`。

## 10. 当前不要做

当前阶段不要做：

- 不要在前端保存任何私密 key。
- 不要写 service_role key。
- 不要接硬件、MQTT 或真实 AI 模型。
