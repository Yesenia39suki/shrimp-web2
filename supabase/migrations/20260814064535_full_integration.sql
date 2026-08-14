-- 智慧虾投喂管理系统 Supabase 完整前端接入补充迁移
-- 执行前请先执行 src/docs/supabase-schema-phase1.sql。
-- 本文件只做幂等新增/完善，不删除已有表，不包含任何 API Key 或 service_role key。

create extension if not exists pgcrypto;

create table if not exists public.feeding_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid not null references public.ponds(id) on delete cascade,
  name text not null,
  mode text not null default 'scheduled' check (mode in ('manual', 'scheduled', 'ai_advice', 'emergency')),
  feed_amount_kg numeric(10, 2) not null default 0,
  times jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feeding_plans_unique_id_organization unique (id, organization_id),
  constraint feeding_plans_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id)
);

create table if not exists public.feeding_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid not null references public.ponds(id) on delete cascade,
  plan_id uuid references public.feeding_plans(id) on delete set null,
  robot_id uuid references public.robots(id) on delete set null,
  scheduled_at timestamptz not null,
  feed_amount_kg numeric(10, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feeding_tasks_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id),
  constraint feeding_tasks_robot_org_fk foreign key (robot_id, organization_id)
    references public.robots(id, organization_id),
  constraint feeding_tasks_plan_org_fk foreign key (plan_id, organization_id)
    references public.feeding_plans(id, organization_id)
    on delete set null (plan_id)
);

create table if not exists public.robot_status (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid not null references public.ponds(id) on delete cascade,
  robot_id uuid not null references public.robots(id) on delete cascade,
  online boolean not null default false,
  work_mode text not null default 'standby' check (work_mode in ('standby', 'feeding', 'patrol', 'manual', 'charging', 'fault')),
  battery numeric(6, 2) not null default 0,
  speed numeric(8, 2) not null default 0,
  fault_code text,
  updated_at timestamptz not null default now(),
  constraint robot_status_unique_robot unique (organization_id, robot_id),
  constraint robot_status_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id),
  constraint robot_status_robot_org_fk foreign key (robot_id, organization_id)
    references public.robots(id, organization_id)
);

create table if not exists public.robot_position_latest (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid references public.ponds(id) on delete set null,
  robot_id uuid primary key references public.robots(id) on delete cascade,
  x numeric(12, 3) not null default 0,
  y numeric(12, 3) not null default 0,
  z numeric(12, 3) not null default 0,
  heading numeric(8, 2) not null default 0,
  speed numeric(8, 2) not null default 0,
  battery numeric(6, 2) not null default 0,
  status text not null default 'standby' check (status in ('standby', 'feeding', 'patrol', 'manual', 'charging', 'fault')),
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint robot_position_latest_unique_robot unique (organization_id, robot_id),
  constraint robot_position_latest_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id),
  constraint robot_position_latest_robot_org_fk foreign key (robot_id, organization_id)
    references public.robots(id, organization_id)
);

create table if not exists public.robot_position_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid references public.ponds(id) on delete set null,
  robot_id uuid not null references public.robots(id) on delete cascade,
  x numeric(12, 3) not null default 0,
  y numeric(12, 3) not null default 0,
  z numeric(12, 3) not null default 0,
  heading numeric(8, 2) not null default 0,
  speed numeric(8, 2) not null default 0,
  battery numeric(6, 2) not null default 0,
  status text not null default 'standby' check (status in ('standby', 'feeding', 'patrol', 'manual', 'charging', 'fault')),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint robot_position_history_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id),
  constraint robot_position_history_robot_org_fk foreign key (robot_id, organization_id)
    references public.robots(id, organization_id)
);

create table if not exists public.robot_commands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid references public.ponds(id) on delete set null,
  robot_id uuid not null references public.robots(id) on delete cascade,
  type text not null check (type in ('feed', 'stop', 'return_home', 'patrol', 'pause', 'resume', 'manual_move', 'calibrate', 'charge')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'running', 'success', 'failed', 'cancelled')),
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint robot_commands_unique_id_organization unique (id, organization_id),
  constraint robot_commands_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id),
  constraint robot_commands_robot_org_fk foreign key (robot_id, organization_id)
    references public.robots(id, organization_id)
);

create table if not exists public.robot_command_acks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  robot_id uuid not null references public.robots(id) on delete cascade,
  command_id uuid not null references public.robot_commands(id) on delete cascade,
  status text not null check (status in ('pending', 'sent', 'running', 'success', 'failed', 'cancelled')),
  message text not null default '',
  acknowledged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint robot_command_acks_robot_org_fk foreign key (robot_id, organization_id)
    references public.robots(id, organization_id),
  constraint robot_command_acks_command_org_fk foreign key (command_id, organization_id)
    references public.robot_commands(id, organization_id)
    on delete cascade
);

create table if not exists public.ai_model_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_type text not null default 'rule_engine' check (provider_type in ('rule_engine', 'openai', 'deepseek', 'local_model', 'hybrid')),
  model_name text not null default '规则评分模型',
  endpoint_url text,
  json_output boolean not null default true,
  daily_limit integer not null default 200,
  monthly_usage integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_model_configs_unique_org unique (organization_id)
);

create table if not exists public.risk_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid not null references public.ponds(id) on delete cascade,
  water_risk_score numeric(6, 2) not null default 0,
  feeding_risk_score numeric(6, 2) not null default 0,
  growth_risk_score numeric(6, 2) not null default 0,
  robot_risk_score numeric(6, 2) not null default 0,
  total_risk_score numeric(6, 2) not null default 0,
  risk_level text not null default '低风险' check (risk_level in ('低风险', '关注', '预警', '高风险')),
  calculation_detail text not null default '',
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint risk_scores_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id)
);

create table if not exists public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid not null references public.ponds(id) on delete cascade,
  provider_type text not null default 'rule_engine' check (provider_type in ('rule_engine', 'openai', 'deepseek', 'local_model', 'hybrid')),
  risk_level text not null default '低风险' check (risk_level in ('低风险', '关注', '预警', '高风险')),
  risk_score numeric(6, 2) not null default 0,
  summary text not null default '',
  problems jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  confidence numeric(5, 4) not null default 0,
  need_manual_confirm boolean not null default true,
  created_at timestamptz not null default now(),
  constraint ai_evaluations_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id)
);

create table if not exists public.ai_feeding_advices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid not null references public.ponds(id) on delete cascade,
  provider_type text not null default 'rule_engine' check (provider_type in ('rule_engine', 'openai', 'deepseek', 'local_model', 'hybrid')),
  risk_level text not null default '低风险' check (risk_level in ('低风险', '关注', '预警', '高风险')),
  risk_score numeric(6, 2) not null default 0,
  summary text not null default '',
  problems jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  confidence numeric(5, 4) not null default 0,
  need_manual_confirm boolean not null default true,
  recommended_feed_kg numeric(10, 2) not null default 0,
  recommended_time text not null default '',
  feeding_method text not null default '',
  created_at timestamptz not null default now(),
  constraint ai_feeding_advices_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id)
);

create table if not exists public.ai_result_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid references public.ponds(id) on delete set null,
  result_id text not null,
  accepted boolean not null default false,
  remark text,
  created_at timestamptz not null default now(),
  constraint ai_result_feedback_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id)
);

create table if not exists public.ai_request_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid references public.ponds(id) on delete set null,
  provider_type text not null default 'rule_engine' check (provider_type in ('rule_engine', 'openai', 'deepseek', 'local_model', 'hybrid')),
  endpoint text not null,
  success boolean not null default false,
  error_message text,
  duration_ms integer,
  created_at timestamptz not null default now(),
  constraint ai_request_logs_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id)
);

create table if not exists public.scene_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  camera jsonb not null default '{}'::jsonb,
  farm_model jsonb,
  robot_model jsonb,
  ponds jsonb not null default '[]'::jsonb,
  robots jsonb not null default '[]'::jsonb,
  routes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scene_configs_unique_org unique (organization_id)
);

create table if not exists public.operation_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_feeding_plans_org_pond on public.feeding_plans(organization_id, pond_id);
create index if not exists idx_feeding_tasks_org_pond_scheduled on public.feeding_tasks(organization_id, pond_id, scheduled_at desc);
create index if not exists idx_robot_status_org_robot on public.robot_status(organization_id, robot_id);
create index if not exists idx_robot_position_latest_org_robot on public.robot_position_latest(organization_id, robot_id);
create index if not exists idx_robot_position_history_org_robot_time on public.robot_position_history(organization_id, robot_id, recorded_at desc);
create index if not exists idx_robot_commands_org_robot_created on public.robot_commands(organization_id, robot_id, created_at desc);
create index if not exists idx_ai_evaluations_org_pond_created on public.ai_evaluations(organization_id, pond_id, created_at desc);
create index if not exists idx_ai_feeding_advices_org_pond_created on public.ai_feeding_advices(organization_id, pond_id, created_at desc);
create index if not exists idx_ai_request_logs_org_created on public.ai_request_logs(organization_id, created_at desc);
create index if not exists idx_operation_logs_org_created on public.operation_logs(organization_id, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'feeding_plans',
    'feeding_tasks',
    'robot_status',
    'robot_position_latest',
    'robot_commands',
    'ai_model_configs',
    'scene_configs'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', 'set_' || table_name || '_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      'set_' || table_name || '_updated_at',
      table_name
    );
  end loop;
end
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'feeding_plans',
    'feeding_tasks',
    'robot_status',
    'robot_position_latest',
    'robot_position_history',
    'robot_commands',
    'robot_command_acks',
    'ai_model_configs',
    'risk_scores',
    'ai_evaluations',
    'ai_feeding_advices',
    'ai_result_feedback',
    'ai_request_logs',
    'scene_configs',
    'operation_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);

    execute format('drop policy if exists %I on public.%I', table_name || '_select_org_member', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))',
      table_name || '_select_org_member',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_insert_manager', table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.can_manage_org_data(organization_id))',
      table_name || '_insert_manager',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_update_manager', table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.can_manage_org_data(organization_id)) with check (public.can_manage_org_data(organization_id))',
      table_name || '_update_manager',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_delete_admin', table_name);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.can_admin_org(organization_id))',
      table_name || '_delete_admin',
      table_name
    );
  end loop;
end
$$;

create or replace function public.refresh_pond_daily_snapshot(
  p_organization_id uuid,
  p_pond_id uuid,
  p_stat_date date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot_id uuid;
begin
  if not public.can_manage_org_data(p_organization_id) then
    raise exception '当前账号无操作权限';
  end if;

  if not exists (
    select 1 from public.ponds p
    where p.id = p_pond_id and p.organization_id = p_organization_id
  ) then
    raise exception '池塘不属于当前企业';
  end if;

  insert into public.pond_daily_snapshots (
    organization_id,
    pond_id,
    stat_date,
    water_score,
    total_feed_kg,
    avg_shrimp_length_cm,
    avg_shrimp_weight_g,
    estimated_yield_kg,
    alert_count,
    robot_running_minutes,
    ai_risk_level,
    summary
  )
  select
    p_organization_id,
    p_pond_id,
    p_stat_date,
    case
      when coalesce(w.warning_count, 0) = 0 then 90
      when coalesce(w.warning_count, 0) <= 2 then 72
      else 48
    end,
    coalesce(f.total_feed_kg, 0),
    s.avg_length_cm,
    s.avg_weight_g,
    s.estimated_yield_kg,
    coalesce(a.alert_count, 0),
    0,
    case
      when coalesce(a.alert_count, 0) >= 5 then '高风险'
      when coalesce(a.alert_count, 0) >= 3 then '预警'
      when coalesce(a.alert_count, 0) >= 1 then '关注'
      else '低风险'
    end,
    '数据库自动汇总'
  from (select 1) seed
  left join public.water_daily_stats w
    on w.organization_id = p_organization_id and w.pond_id = p_pond_id and w.stat_date = p_stat_date
  left join public.feeding_daily_stats f
    on f.organization_id = p_organization_id and f.pond_id = p_pond_id and f.stat_date = p_stat_date
  left join public.shrimp_daily_stats s
    on s.organization_id = p_organization_id and s.pond_id = p_pond_id and s.stat_date = p_stat_date
  left join (
    select organization_id, pond_id, count(*)::integer as alert_count
    from public.alerts
    where organization_id = p_organization_id
      and pond_id = p_pond_id
      and created_at::date = p_stat_date
    group by organization_id, pond_id
  ) a on true
  on conflict (organization_id, pond_id, stat_date) do update
    set water_score = excluded.water_score,
        total_feed_kg = excluded.total_feed_kg,
        avg_shrimp_length_cm = excluded.avg_shrimp_length_cm,
        avg_shrimp_weight_g = excluded.avg_shrimp_weight_g,
        estimated_yield_kg = excluded.estimated_yield_kg,
        alert_count = excluded.alert_count,
        robot_running_minutes = excluded.robot_running_minutes,
        ai_risk_level = excluded.ai_risk_level,
        summary = excluded.summary,
        updated_at = now()
  returning id into snapshot_id;

  return snapshot_id;
end;
$$;

create or replace function public.ingest_water_reading(
  p_organization_id uuid,
  p_pond_id uuid,
  p_device_id uuid default null,
  p_recorded_at timestamptz default now(),
  p_temperature numeric default null,
  p_dissolved_oxygen numeric default null,
  p_ph numeric default null,
  p_orp numeric default null,
  p_turbidity numeric default null,
  p_ammonia numeric default null,
  p_nitrite numeric default null,
  p_hardness numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  reading_id uuid;
  stat_day date := coalesce(p_recorded_at, now())::date;
  thresholds record;
begin
  if not public.can_manage_org_data(p_organization_id) then
    raise exception '当前账号无操作权限';
  end if;

  if not exists (
    select 1 from public.ponds p
    where p.id = p_pond_id and p.organization_id = p_organization_id
  ) then
    raise exception '池塘不属于当前企业';
  end if;

  insert into public.water_readings (
    organization_id,
    pond_id,
    device_id,
    temperature,
    dissolved_oxygen,
    ph,
    orp,
    turbidity,
    ammonia,
    nitrite,
    hardness,
    recorded_at
  )
  values (
    p_organization_id,
    p_pond_id,
    p_device_id,
    p_temperature,
    p_dissolved_oxygen,
    p_ph,
    p_orp,
    p_turbidity,
    p_ammonia,
    p_nitrite,
    p_hardness,
    coalesce(p_recorded_at, now())
  )
  returning id into reading_id;

  insert into public.water_latest (
    organization_id,
    pond_id,
    reading_id,
    temperature,
    dissolved_oxygen,
    ph,
    orp,
    turbidity,
    ammonia,
    nitrite,
    hardness,
    recorded_at
  )
  values (
    p_organization_id,
    p_pond_id,
    reading_id,
    p_temperature,
    p_dissolved_oxygen,
    p_ph,
    p_orp,
    p_turbidity,
    p_ammonia,
    p_nitrite,
    p_hardness,
    coalesce(p_recorded_at, now())
  )
  on conflict (organization_id, pond_id) do update
    set reading_id = excluded.reading_id,
        temperature = excluded.temperature,
        dissolved_oxygen = excluded.dissolved_oxygen,
        ph = excluded.ph,
        orp = excluded.orp,
        turbidity = excluded.turbidity,
        ammonia = excluded.ammonia,
        nitrite = excluded.nitrite,
        hardness = excluded.hardness,
        recorded_at = excluded.recorded_at,
        updated_at = now();

  insert into public.water_daily_stats (
    organization_id,
    pond_id,
    stat_date,
    avg_temperature,
    min_temperature,
    max_temperature,
    avg_dissolved_oxygen,
    min_dissolved_oxygen,
    max_dissolved_oxygen,
    avg_ph,
    min_ph,
    max_ph,
    max_ammonia,
    max_nitrite,
    warning_count,
    reading_count,
    status
  )
  select
    p_organization_id,
    p_pond_id,
    stat_day,
    avg(temperature),
    min(temperature),
    max(temperature),
    avg(dissolved_oxygen),
    min(dissolved_oxygen),
    max(dissolved_oxygen),
    avg(ph),
    min(ph),
    max(ph),
    max(ammonia),
    max(nitrite),
    0,
    count(*)::integer,
    '稳定'
  from public.water_readings
  where organization_id = p_organization_id
    and pond_id = p_pond_id
    and recorded_at::date = stat_day
  on conflict (organization_id, pond_id, stat_date) do update
    set avg_temperature = excluded.avg_temperature,
        min_temperature = excluded.min_temperature,
        max_temperature = excluded.max_temperature,
        avg_dissolved_oxygen = excluded.avg_dissolved_oxygen,
        min_dissolved_oxygen = excluded.min_dissolved_oxygen,
        max_dissolved_oxygen = excluded.max_dissolved_oxygen,
        avg_ph = excluded.avg_ph,
        min_ph = excluded.min_ph,
        max_ph = excluded.max_ph,
        max_ammonia = excluded.max_ammonia,
        max_nitrite = excluded.max_nitrite,
        reading_count = excluded.reading_count,
        updated_at = now();

  select * into thresholds
  from public.water_thresholds
  where organization_id = p_organization_id and pond_id = p_pond_id
  limit 1;

  if thresholds.id is not null then
    if p_dissolved_oxygen is not null
       and (p_dissolved_oxygen < thresholds.dissolved_oxygen_min or p_dissolved_oxygen > thresholds.dissolved_oxygen_max) then
      insert into public.alerts (
        organization_id, pond_id, type, level, title, content,
        metric_key, current_value, normal_range, suggestion, source
      )
      values (
        p_organization_id,
        p_pond_id,
        'water_quality',
        'warning',
        '溶解氧异常',
        '溶解氧超出水质阈值范围。',
        'oxygen',
        p_dissolved_oxygen::text,
        thresholds.dissolved_oxygen_min::text || ' - ' || thresholds.dissolved_oxygen_max::text,
        '请复核增氧设备和投喂节奏。',
        'ingest_water_reading'
      );
    end if;

    if p_ph is not null and (p_ph < thresholds.ph_min or p_ph > thresholds.ph_max) then
      insert into public.alerts (
        organization_id, pond_id, type, level, title, content,
        metric_key, current_value, normal_range, suggestion, source
      )
      values (
        p_organization_id,
        p_pond_id,
        'water_quality',
        'warning',
        'pH 异常',
        'pH 超出水质阈值范围。',
        'ph',
        p_ph::text,
        thresholds.ph_min::text || ' - ' || thresholds.ph_max::text,
        '请复核水体酸碱波动和换水策略。',
        'ingest_water_reading'
      );
    end if;
  end if;

  update public.water_daily_stats
  set warning_count = (
      select count(*)::integer
      from public.alerts
      where organization_id = p_organization_id
        and pond_id = p_pond_id
        and type = 'water_quality'
        and created_at::date = stat_day
    ),
    status = case
      when (
        select count(*) from public.alerts
        where organization_id = p_organization_id
          and pond_id = p_pond_id
          and type = 'water_quality'
          and created_at::date = stat_day
      ) > 0 then '预警'
      else '稳定'
    end,
    updated_at = now()
  where organization_id = p_organization_id
    and pond_id = p_pond_id
    and stat_date = stat_day;

  perform public.refresh_pond_daily_snapshot(p_organization_id, p_pond_id, stat_day);

  return reading_id;
end;
$$;

create or replace function public.record_feeding(
  p_organization_id uuid,
  p_pond_id uuid,
  p_robot_id uuid default null,
  p_feed_amount_kg numeric default 0,
  p_mode text default 'manual',
  p_advice_source text default null,
  p_executed_at timestamptz default now(),
  p_remark text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  record_id uuid;
  stat_day date := coalesce(p_executed_at, now())::date;
begin
  if not public.can_manage_org_data(p_organization_id) then
    raise exception '当前账号无操作权限';
  end if;

  if not exists (
    select 1 from public.ponds p
    where p.id = p_pond_id and p.organization_id = p_organization_id
  ) then
    raise exception '池塘不属于当前企业';
  end if;

  insert into public.feeding_records (
    organization_id,
    pond_id,
    robot_id,
    feed_amount_kg,
    mode,
    advice_source,
    executed_at,
    remark
  )
  values (
    p_organization_id,
    p_pond_id,
    p_robot_id,
    p_feed_amount_kg,
    p_mode,
    p_advice_source,
    coalesce(p_executed_at, now()),
    p_remark
  )
  returning id into record_id;

  insert into public.feeding_daily_stats (
    organization_id,
    pond_id,
    stat_date,
    total_feed_kg,
    feeding_count,
    robot_feeding_count,
    manual_feeding_count
  )
  select
    p_organization_id,
    p_pond_id,
    stat_day,
    coalesce(sum(feed_amount_kg), 0),
    count(*)::integer,
    count(*) filter (where robot_id is not null)::integer,
    count(*) filter (where robot_id is null)::integer
  from public.feeding_records
  where organization_id = p_organization_id
    and pond_id = p_pond_id
    and executed_at::date = stat_day
  on conflict (organization_id, pond_id, stat_date) do update
    set total_feed_kg = excluded.total_feed_kg,
        feeding_count = excluded.feeding_count,
        robot_feeding_count = excluded.robot_feeding_count,
        manual_feeding_count = excluded.manual_feeding_count,
        updated_at = now();

  perform public.refresh_pond_daily_snapshot(p_organization_id, p_pond_id, stat_day);

  return record_id;
end;
$$;

create or replace function public.record_shrimp_measurement(
  p_organization_id uuid,
  p_pond_id uuid,
  p_average_length_cm numeric,
  p_average_weight_g numeric,
  p_sample_count integer default 1,
  p_measured_at timestamptz default now(),
  p_source text default 'manual',
  p_estimated_count integer default null,
  p_estimated_yield_kg numeric default null,
  p_maturity_percent numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  measurement_id uuid;
  stat_day date := coalesce(p_measured_at, now())::date;
begin
  if not public.can_manage_org_data(p_organization_id) then
    raise exception '当前账号无操作权限';
  end if;

  if not exists (
    select 1 from public.ponds p
    where p.id = p_pond_id and p.organization_id = p_organization_id
  ) then
    raise exception '池塘不属于当前企业';
  end if;

  insert into public.shrimp_measurements (
    organization_id,
    pond_id,
    average_length_cm,
    average_weight_g,
    sample_count,
    measured_at,
    source
  )
  values (
    p_organization_id,
    p_pond_id,
    p_average_length_cm,
    p_average_weight_g,
    p_sample_count,
    coalesce(p_measured_at, now()),
    p_source
  )
  returning id into measurement_id;

  insert into public.shrimp_daily_stats (
    organization_id,
    pond_id,
    stat_date,
    avg_length_cm,
    avg_weight_g,
    sample_count,
    estimated_count,
    estimated_yield_kg,
    maturity_percent
  )
  select
    p_organization_id,
    p_pond_id,
    stat_day,
    avg(average_length_cm),
    avg(average_weight_g),
    coalesce(sum(sample_count), 0)::integer,
    p_estimated_count,
    p_estimated_yield_kg,
    p_maturity_percent
  from public.shrimp_measurements
  where organization_id = p_organization_id
    and pond_id = p_pond_id
    and measured_at::date = stat_day
  on conflict (organization_id, pond_id, stat_date) do update
    set avg_length_cm = excluded.avg_length_cm,
        avg_weight_g = excluded.avg_weight_g,
        sample_count = excluded.sample_count,
        estimated_count = coalesce(excluded.estimated_count, public.shrimp_daily_stats.estimated_count),
        estimated_yield_kg = coalesce(excluded.estimated_yield_kg, public.shrimp_daily_stats.estimated_yield_kg),
        maturity_percent = coalesce(excluded.maturity_percent, public.shrimp_daily_stats.maturity_percent),
        updated_at = now();

  perform public.refresh_pond_daily_snapshot(p_organization_id, p_pond_id, stat_day);

  return measurement_id;
end;
$$;

revoke all on function public.refresh_pond_daily_snapshot(uuid, uuid, date) from public, anon, authenticated;
revoke all on function public.ingest_water_reading(uuid, uuid, uuid, timestamptz, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric) from public;
revoke all on function public.record_feeding(uuid, uuid, uuid, numeric, text, text, timestamptz, text) from public;
revoke all on function public.record_shrimp_measurement(uuid, uuid, numeric, numeric, integer, timestamptz, text, integer, numeric, numeric) from public;

grant execute on function public.ingest_water_reading(uuid, uuid, uuid, timestamptz, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric) to authenticated;
grant execute on function public.record_feeding(uuid, uuid, uuid, numeric, text, text, timestamptz, text) to authenticated;
grant execute on function public.record_shrimp_measurement(uuid, uuid, numeric, numeric, integer, timestamptz, text, integer, numeric, numeric) to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
