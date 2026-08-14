-- 智慧虾投喂系统：注册空企业空间与多租户隔离验证
-- 本文件不会自动创建 Demo 数据。第 1、2 节为只读查询。
-- 第 3 节测试模板均包在事务中并 rollback，请逐段替换 UUID 后单独执行。

-- 1. 检查注册触发器、RLS 和关键组合约束。
select
  trigger_name,
  event_object_schema,
  event_object_table,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_name = 'on_auth_user_created';

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select
  conrelid::regclass as table_name,
  conname,
  contype,
  convalidated
from pg_constraint
where connamespace = 'public'::regnamespace
  and (
    conname like '%_pond_org_fk'
    or conname like '%_robot_org_fk'
    or conname like '%_device_org_fk'
    or conname in (
      'water_latest_reading_org_fk',
      'feeding_tasks_plan_org_fk',
      'robot_command_acks_command_org_fk'
    )
  )
order by conrelid::regclass::text, conname;

-- 2. 注册结果检查：把 null::uuid 替换成刚注册用户的 auth.users.id。
with params as (
  select null::uuid as user_id
), user_org as (
  select om.organization_id
  from public.organization_members om
  join params p on p.user_id = om.user_id
  order by om.created_at
  limit 1
)
select
  p.user_id,
  (select count(*) from public.profiles x where x.id = p.user_id) as profiles_count,
  (select count(*) from public.organization_members x where x.user_id = p.user_id) as memberships_count,
  (select count(*) from public.organization_members x where x.user_id = p.user_id and x.role = 'owner') as owner_memberships_count,
  (select count(*) from public.organizations x where x.id in (select organization_id from user_org)) as organizations_count,
  (select count(*) from public.ponds x where x.organization_id in (select organization_id from user_org)) as ponds_count,
  (select count(*) from public.robots x where x.organization_id in (select organization_id from user_org)) as robots_count,
  (select count(*) from public.devices x where x.organization_id in (select organization_id from user_org)) as devices_count,
  (select count(*) from public.water_thresholds x where x.organization_id in (select organization_id from user_org)) as thresholds_count,
  (select count(*) from public.water_readings x where x.organization_id in (select organization_id from user_org)) as water_readings_count,
  (select count(*) from public.water_latest x where x.organization_id in (select organization_id from user_org)) as water_latest_count,
  (select count(*) from public.water_daily_stats x where x.organization_id in (select organization_id from user_org)) as water_daily_stats_count,
  (select count(*) from public.feeding_plans x where x.organization_id in (select organization_id from user_org)) as feeding_plans_count,
  (select count(*) from public.feeding_tasks x where x.organization_id in (select organization_id from user_org)) as feeding_tasks_count,
  (select count(*) from public.feeding_records x where x.organization_id in (select organization_id from user_org)) as feeding_records_count,
  (select count(*) from public.feeding_daily_stats x where x.organization_id in (select organization_id from user_org)) as feeding_daily_stats_count,
  (select count(*) from public.shrimp_measurements x where x.organization_id in (select organization_id from user_org)) as shrimp_measurements_count,
  (select count(*) from public.shrimp_daily_stats x where x.organization_id in (select organization_id from user_org)) as shrimp_daily_stats_count,
  (select count(*) from public.alert_rules x where x.organization_id in (select organization_id from user_org)) as alert_rules_count,
  (select count(*) from public.alerts x where x.organization_id in (select organization_id from user_org)) as alerts_count,
  (select count(*) from public.robot_status x where x.organization_id in (select organization_id from user_org)) as robot_status_count,
  (select count(*) from public.robot_position_latest x where x.organization_id in (select organization_id from user_org)) as robot_position_latest_count,
  (select count(*) from public.robot_position_history x where x.organization_id in (select organization_id from user_org)) as robot_position_history_count,
  (select count(*) from public.robot_commands x where x.organization_id in (select organization_id from user_org)) as robot_commands_count,
  (select count(*) from public.robot_command_acks x where x.organization_id in (select organization_id from user_org)) as robot_command_acks_count,
  (select count(*) from public.risk_scores x where x.organization_id in (select organization_id from user_org)) as risk_scores_count,
  (select count(*) from public.ai_evaluations x where x.organization_id in (select organization_id from user_org)) as ai_evaluations_count,
  (select count(*) from public.ai_feeding_advices x where x.organization_id in (select organization_id from user_org)) as ai_advices_count,
  (select count(*) from public.ai_result_feedback x where x.organization_id in (select organization_id from user_org)) as ai_feedback_count,
  (select count(*) from public.ai_request_logs x where x.organization_id in (select organization_id from user_org)) as ai_request_logs_count,
  (select count(*) from public.ai_model_configs x where x.organization_id in (select organization_id from user_org)) as ai_model_configs_count,
  (select count(*) from public.scene_configs x where x.organization_id in (select organization_id from user_org)) as scene_configs_count,
  (select count(*) from public.pond_daily_snapshots x where x.organization_id in (select organization_id from user_org)) as pond_snapshots_count,
  (select count(*) from public.operation_logs x where x.organization_id in (select organization_id from user_org)) as operation_logs_count
from params p
where p.user_id is not null;

-- 3A. 用户 A 的读取隔离测试。
-- 替换 USER_A_UUID 后单独执行；结果中不应出现用户 B 的 organization_id。
-- begin;
-- select set_config('request.jwt.claim.sub', 'USER_A_UUID', true);
-- select set_config('request.jwt.claim.role', 'authenticated', true);
-- set local role authenticated;
-- select * from public.organizations order by created_at;
-- select * from public.ponds order by created_at;
-- select * from public.robots order by created_at;
-- select * from public.water_readings order by recorded_at desc;
-- rollback;

-- 3B. 用户 A 伪造用户 B organization_id 创建池塘，应报 RLS 权限错误。
-- begin;
-- select set_config('request.jwt.claim.sub', 'USER_A_UUID', true);
-- select set_config('request.jwt.claim.role', 'authenticated', true);
-- set local role authenticated;
-- insert into public.ponds (
--   organization_id, pond_code, pond_name, shrimp_species, area_mu, water_depth_m, location
-- ) values (
--   'USER_B_ORGANIZATION_UUID', 'RLS-TEST', '越权测试池', '南美白对虾', 1, 1, '测试'
-- );
-- rollback;

-- 3C. 用户 A 使用自己的 organization_id 关联用户 B 的 pond_id，应报组合外键错误。
-- begin;
-- select set_config('request.jwt.claim.sub', 'USER_A_UUID', true);
-- select set_config('request.jwt.claim.role', 'authenticated', true);
-- set local role authenticated;
-- insert into public.water_readings (
--   organization_id, pond_id, temperature, recorded_at
-- ) values (
--   'USER_A_ORGANIZATION_UUID', 'USER_B_POND_UUID', 25, now()
-- );
-- rollback;

-- 3D. 用户 A 修改或删除用户 B 池塘，应返回 0 行。
-- begin;
-- select set_config('request.jwt.claim.sub', 'USER_A_UUID', true);
-- select set_config('request.jwt.claim.role', 'authenticated', true);
-- set local role authenticated;
-- update public.ponds
-- set pond_name = '越权修改'
-- where id = 'USER_B_POND_UUID'
-- returning id;
-- delete from public.ponds
-- where id = 'USER_B_POND_UUID'
-- returning id;
-- rollback;

-- 3E. viewer 写入测试：用 viewer 用户 UUID 和其企业 UUID 替换后执行，应报 RLS 权限错误。
-- begin;
-- select set_config('request.jwt.claim.sub', 'VIEWER_USER_UUID', true);
-- select set_config('request.jwt.claim.role', 'authenticated', true);
-- set local role authenticated;
-- insert into public.ponds (
--   organization_id, pond_code, pond_name, shrimp_species, area_mu, water_depth_m, location
-- ) values (
--   'VIEWER_ORGANIZATION_UUID', 'VIEWER-TEST', '查看者测试池', '南美白对虾', 1, 1, '测试'
-- );
-- rollback;
