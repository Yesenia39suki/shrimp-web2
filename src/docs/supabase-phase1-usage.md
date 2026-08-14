# Supabase 第一阶段 SQL 使用说明

本文档说明 Supabase SQL 的用途、执行顺序、注册默认数据逻辑和前端环境变量。当前前端已支持 `mock` 与 `supabase` 两种数据源模式。

## 1. 数据库迁移方式

当前项目已经初始化 Supabase CLI 标准目录。后续正式数据库变更以以下目录为准：

`supabase/migrations`

GitHub 与 Supabase 集成启用后，只会自动执行该目录内尚未应用的迁移。`src/docs` 中的 SQL 保留为完整结构说明、人工审计和紧急恢复参考，不再作为 GitHub 自动部署入口。

当前标准迁移顺序为：

1. `supabase/migrations/20260813000000_schema_phase1.sql`
2. `supabase/migrations/20260813000100_full_integration.sql`
3. `supabase/migrations/20260813221218_empty_organization_registration_and_tenant_guards.sql`

前两份迁移用于完整重建新环境，也采用可重复执行写法兼容当前已经通过 SQL Editor 建立的远端结构。第三份迁移只更新注册初始化、函数执行权限和多租户组合外键，不会删除已有业务数据。项目的 `supabase/config.toml` 已关闭自动 Seed，GitHub 部署不得自动执行演示数据。

迁移一旦在远端登记为已执行，后续不要修改对应的 `supabase/migrations` 文件；新的数据库变更必须新增更晚时间戳的迁移。

对于从零创建的新 Supabase 项目，仍按以下顺序手动初始化基础结构：

在 Supabase 项目中打开 SQL Editor，将以下文件内容完整复制进去执行：

`src/docs/supabase-schema-phase1.sql`

该 SQL 会创建第一阶段表结构、索引、`updated_at` 自动更新触发器、权限辅助函数和基础 RLS 策略。

随后继续执行：

`src/docs/supabase-migration-full-integration.sql`

该 SQL 会补齐扩展页面和历史页面需要的表、索引、RLS、Realtime 可订阅表结构和统计 RPC。

已经部署过旧版注册函数但尚未启用 GitHub 迁移的项目，再执行：

`src/docs/supabase-migration-empty-organization-registration.sql`

该幂等迁移只更新注册初始化和租户边界：新用户仅创建资料、企业和 owner 成员关系，不会删除老用户已有的池塘或其他业务数据。

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

注册触发器不会创建池塘、机器人、水质阈值、设备、监测、投喂、虾群、报警、AI 或 Demo 数据。新用户首次进入系统时得到空企业空间，池塘由用户在“自定义内容”中主动创建。

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

创建完成后无需手动插入企业和成员关系。触发器只完成账号资料、空企业和 owner 身份初始化，不创建业务数据。

## 4. 已有用户补齐默认数据

如果 SQL 执行前已经存在 Auth 用户，可以在 SQL Editor 手动执行：

```sql
select public.backfill_auth_users_default_data();
```

该函数会遍历 `auth.users`：

- 如果用户没有 `profiles`，自动创建。
- 如果用户没有 `organization_members`，自动创建空企业并将该用户设为 `owner`。
- 企业名称仍优先读取 `raw_user_meta_data.organization_name`。
- 如果没有企业名称，则使用“用户昵称的智慧养殖企业”。
- 不会为已有用户补建池塘、机器人、阈值或其他业务数据，也不会修改已有企业和正式数据。

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
- 关联池塘、机器人、设备、投喂计划和机器人指令的数据使用组合外键校验，不能用本企业 `organization_id` 关联其他企业的对象 ID。
- `refresh_pond_daily_snapshot` 不再向前端 `authenticated` 角色开放，避免 `viewer` 通过 `SECURITY DEFINER` RPC 产生写入。

## 8. 隔离验证

先注册两个测试账号，再使用以下文件检查注册结果、RLS Policy 和组合外键：

`src/docs/supabase-verify-tenant-isolation.sql`

文件中的第 1、2 节是只读检查；第 3 节是事务测试模板，需要替换用户、企业和池塘 UUID 后逐段执行。所有写入测试均以 `rollback` 结束，不应执行 Demo Seed 来代替隔离测试。

## 9. 字段补充说明

- `organization_members` 包含 `updated_at`，成员角色从 `viewer` 改为 `operator/admin` 等场景会自动刷新更新时间。
- `alerts` 包含 `updated_at`，报警从 `unread` 改为 `read/resolved` 等状态变化会自动刷新更新时间。
- 这两个表都已加入 `set_updated_at` 触发器列表。
- `organizations.name` 保存注册时传入的企业名称，`organizations.short_name` 自动截取前 12 个字符。

## 10. 命名转换注意事项

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

## 11. 当前不要做

当前阶段不要做：

- 不要在前端保存任何私密 key。
- 不要写 service_role key。
- 不要接硬件、MQTT 或真实 AI 模型。
