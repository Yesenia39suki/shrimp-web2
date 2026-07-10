# Supabase 第一阶段 SQL 使用说明

本文档说明 `src/docs/supabase-schema-phase1.sql` 的用途、执行顺序和注册默认数据逻辑。当前仍不接 Supabase 客户端，不删除 mock/localStorage。

## 1. 执行 SQL

在 Supabase 项目中打开 SQL Editor，将以下文件内容完整复制进去执行：

`src/docs/supabase-schema-phase1.sql`

该 SQL 会创建第一阶段表结构、索引、`updated_at` 自动更新触发器、权限辅助函数和基础 RLS 策略。

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
  "organization_name": "青岛智慧养殖示范企业"
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

## 5. 第一阶段前端优先接入表

第一阶段 Vue 前端建议只先接以下表：

1. `profiles`
2. `organizations`
3. `organization_members`
4. `ponds`
5. `robots`
6. `water_thresholds`

这几张表对应当前已经完成的登录、多企业、角色权限、自定义内容、池塘管理、机器人管理、水质阈值设置。

## 6. 暂时只建表、不接页面的表

以下表第一阶段先创建，暂时不接 Vue 页面：

- `devices`
- `water_readings`
- `water_latest`
- `water_daily_stats`
- `feeding_records`
- `feeding_daily_stats`
- `shrimp_measurements`
- `shrimp_daily_stats`
- `alert_rules`
- `alerts`
- `pond_daily_snapshots`

这些表用于后续水质历史、历史数据对比、报警中心、设备管理、虾群生长统计、投喂统计和日快照。

## 7. 历史数据页面后续接入顺序

历史数据页面建议后续按这个顺序接：

1. `water_readings`：水质折线图、柱状图、池塘间同指标对比。
2. `water_daily_stats`：近 7 天、近 30 天、近 3 个月汇总数据。
3. `feeding_records` 和 `feeding_daily_stats`：投喂历史和日统计。
4. `shrimp_measurements` 和 `shrimp_daily_stats`：虾长、虾重、样本数量、生长趋势。
5. `alerts`：报警历史、处理状态和报警数量趋势。
6. `pond_daily_snapshots`：综合日报视图和跨模块汇总。

## 8. RLS 权限说明

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

- 不要在前端保存任何 Supabase key。
- 不要写 service_role key。
- 不要接 Supabase 客户端。
- 不要改 Pinia store。
- 不要删除 mock/localStorage。
- 不要接硬件、MQTT 或真实 AI 模型。
