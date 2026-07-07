# Supabase 第一阶段 SQL 使用说明

本文档说明 `src/docs/supabase-schema-phase1.sql` 的用途和执行顺序。当前阶段只准备数据库结构，不修改 Vue 业务代码，不接 Supabase 客户端，不删除 mock/localStorage。

## 1. 执行 SQL

在 Supabase 项目中打开 SQL Editor，将以下文件内容完整复制进去执行：

`src/docs/supabase-schema-phase1.sql`

该 SQL 会创建第一阶段表结构、索引、`updated_at` 自动更新触发器、权限辅助函数和基础 RLS 策略。

## 2. 先创建 Auth 测试用户

SQL 执行完成后，先在 Supabase Dashboard 的 Authentication 中创建测试用户。

建议先创建一个管理员测试账号，例如：

- 邮箱：`a@aifeed.cc.cd`
- 密码：`123456`

创建完成后，复制该用户在 `auth.users` 中的 UUID。下面示例用 `替换为_AUTH_USER_UUID` 表示。

## 3. 插入第一批默认数据

在 SQL Editor 中执行下面的种子数据模板。执行前必须把 `替换为_AUTH_USER_UUID` 改成真实 Auth 用户 UUID。

```sql
with input as (
  select '替换为_AUTH_USER_UUID'::uuid as user_id
),
profile_row as (
  insert into public.profiles (id, display_name, email)
  select user_id, 'A账户管理员', 'a@aifeed.cc.cd'
  from input
  on conflict (id) do update
    set display_name = excluded.display_name,
        email = excluded.email,
        updated_at = now()
  returning id
),
organization_row as (
  insert into public.organizations (name, short_name, region, status, owner_user_id)
  select '青岛智慧养殖示范企业', '青岛示范企业', '山东青岛', '运行中', user_id
  from input
  returning id
),
member_row as (
  insert into public.organization_members (organization_id, user_id, role)
  select organization_row.id, input.user_id, 'owner'
  from organization_row, input
  returning organization_id
),
pond_row as (
  insert into public.ponds (
    organization_id,
    pond_code,
    pond_name,
    shrimp_species,
    area_mu,
    water_depth_m,
    location,
    longitude,
    latitude
  )
  select
    organization_row.id,
    'A-01',
    '一号高密度养殖池',
    '南美白对虾',
    22.8,
    1.55,
    '青岛西海岸示范基地',
    120.12345678,
    36.12345678
  from organization_row
  returning id, organization_id
),
robot_row as (
  insert into public.robots (
    organization_id,
    pond_id,
    robot_code,
    robot_name,
    robot_type,
    status
  )
  select
    pond_row.organization_id,
    pond_row.id,
    'QD-RB-01',
    '青岛一号投喂巡检机器人',
    '投喂巡检型',
    '待命'
  from pond_row
  returning id
)
insert into public.water_thresholds (
  organization_id,
  pond_id,
  temperature_min,
  temperature_max,
  dissolved_oxygen_min,
  dissolved_oxygen_max,
  ph_min,
  ph_max,
  orp_min,
  orp_max,
  turbidity_min,
  turbidity_max,
  ammonia_min,
  ammonia_max,
  nitrite_min,
  nitrite_max,
  hardness_min,
  hardness_max
)
select
  pond_row.organization_id,
  pond_row.id,
  20,
  35,
  5,
  9,
  7,
  8.6,
  250,
  420,
  0,
  30,
  0,
  0.3,
  0,
  0.12,
  120,
  260
from pond_row;
```

如果要模拟 B 账户和日照企业，重复以上流程：

- 先在 Authentication 创建第二个用户。
- 替换 UUID、邮箱、企业名、池塘编号、机器人编号。
- 插入第二个 organization、profile、organization_member、pond、robot、water_threshold。

## 4. 第一阶段前端优先接入表

第一阶段 Vue 前端建议只先接以下表：

1. `profiles`
2. `organizations`
3. `organization_members`
4. `ponds`
5. `robots`
6. `water_thresholds`

这几张表对应当前已经完成的登录、多企业、角色权限、自定义内容、池塘管理、机器人管理、水质阈值设置。

## 5. 暂时只建表、不接页面的表

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

## 6. 历史数据页面后续接入顺序

历史数据页面建议后续按这个顺序接：

1. `water_readings`：水质折线图、柱状图、池塘间同指标对比。
2. `water_daily_stats`：近 7 天、近 30 天、近 3 个月汇总数据。
3. `feeding_records` 和 `feeding_daily_stats`：投喂历史和日统计。
4. `shrimp_measurements` 和 `shrimp_daily_stats`：虾长、虾重、样本数量、生长趋势。
5. `alerts`：报警历史、处理状态和报警数量趋势。
6. `pond_daily_snapshots`：综合日报视图和跨模块汇总。

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

## 9. 命名转换注意事项

数据库统一使用 snake_case。

前端字段后续由 service 层转换：

- `organizationId` <-> `organization_id`
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

- 不要在前端保存任何 Supabase key。
- 不要写 service_role key。
- 不要接 Supabase 客户端。
- 不要改 Vue 页面。
- 不要改 Pinia store。
- 不要删除 mock/localStorage。
- 不要接硬件、MQTT 或真实 AI 模型。
