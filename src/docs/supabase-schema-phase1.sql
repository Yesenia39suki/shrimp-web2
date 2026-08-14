-- 智慧虾投喂管理系统 Supabase 第一阶段数据库结构
-- 仅包含 schema、约束、索引、updated_at 触发器和基础 RLS 策略。
-- 不包含任何 API Key、service_role key，也不接前端客户端。

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_user_role') then
    create type public.app_user_role as enum ('owner', 'admin', 'operator', 'viewer');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  region text not null default '',
  status text not null default '运行中',
  owner_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_user_role not null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_unique_user unique (organization_id, user_id)
);

create table if not exists public.ponds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_code text not null,
  pond_name text not null,
  shrimp_species text not null,
  area_mu numeric(12, 2) not null default 0,
  water_depth_m numeric(8, 2) not null default 0,
  location text not null default '',
  longitude numeric(12, 8),
  latitude numeric(12, 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ponds_unique_id_organization unique (id, organization_id),
  constraint ponds_unique_code unique (organization_id, pond_code)
);

create table if not exists public.robots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid not null references public.ponds(id) on delete restrict,
  robot_code text not null,
  robot_name text not null,
  robot_type text not null,
  status text not null default '待命',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint robots_unique_id_organization unique (id, organization_id),
  constraint robots_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id),
  constraint robots_unique_code unique (organization_id, robot_code)
);

create table if not exists public.water_thresholds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid not null references public.ponds(id) on delete cascade,
  temperature_min numeric(8, 2) not null,
  temperature_max numeric(8, 2) not null,
  dissolved_oxygen_min numeric(8, 2) not null,
  dissolved_oxygen_max numeric(8, 2) not null,
  ph_min numeric(6, 2) not null,
  ph_max numeric(6, 2) not null,
  orp_min numeric(10, 2) not null,
  orp_max numeric(10, 2) not null,
  turbidity_min numeric(10, 2) not null,
  turbidity_max numeric(10, 2) not null,
  ammonia_min numeric(10, 4) not null,
  ammonia_max numeric(10, 4) not null,
  nitrite_min numeric(10, 4) not null,
  nitrite_max numeric(10, 4) not null,
  hardness_min numeric(10, 2) not null,
  hardness_max numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint water_thresholds_unique_pond unique (organization_id, pond_id),
  constraint water_thresholds_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id),
  constraint water_thresholds_valid_ranges check (
    temperature_min <= temperature_max
    and dissolved_oxygen_min <= dissolved_oxygen_max
    and ph_min <= ph_max
    and orp_min <= orp_max
    and turbidity_min <= turbidity_max
    and ammonia_min <= ammonia_max
    and nitrite_min <= nitrite_max
    and hardness_min <= hardness_max
  )
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid references public.ponds(id) on delete set null,
  robot_id uuid references public.robots(id) on delete set null,
  name text not null,
  type text not null check (type in ('water_sensor', 'gateway', 'robot', 'camera', 'aerator', 'feeder')),
  status text not null default 'offline' check (status in ('online', 'offline', 'warning', 'fault', 'maintenance')),
  firmware_version text,
  last_heartbeat_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_unique_id_organization unique (id, organization_id),
  constraint devices_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id),
  constraint devices_robot_org_fk foreign key (robot_id, organization_id)
    references public.robots(id, organization_id)
);

create table if not exists public.water_readings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid not null references public.ponds(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  temperature numeric(8, 2),
  dissolved_oxygen numeric(8, 2),
  ph numeric(6, 2),
  orp numeric(10, 2),
  turbidity numeric(10, 2),
  ammonia numeric(10, 4),
  nitrite numeric(10, 4),
  hardness numeric(10, 2),
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint water_readings_unique_id_organization unique (id, organization_id),
  constraint water_readings_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id),
  constraint water_readings_device_org_fk foreign key (device_id, organization_id)
    references public.devices(id, organization_id)
);

create table if not exists public.water_latest (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid primary key references public.ponds(id) on delete cascade,
  reading_id uuid references public.water_readings(id) on delete set null,
  temperature numeric(8, 2),
  dissolved_oxygen numeric(8, 2),
  ph numeric(6, 2),
  orp numeric(10, 2),
  turbidity numeric(10, 2),
  ammonia numeric(10, 4),
  nitrite numeric(10, 4),
  hardness numeric(10, 2),
  recorded_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint water_latest_unique_org_pond unique (organization_id, pond_id),
  constraint water_latest_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id),
  constraint water_latest_reading_org_fk foreign key (reading_id, organization_id)
    references public.water_readings(id, organization_id)
    on delete set null (reading_id)
);

create table if not exists public.water_daily_stats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid not null references public.ponds(id) on delete cascade,
  stat_date date not null,
  avg_temperature numeric(8, 2),
  min_temperature numeric(8, 2),
  max_temperature numeric(8, 2),
  avg_dissolved_oxygen numeric(8, 2),
  min_dissolved_oxygen numeric(8, 2),
  max_dissolved_oxygen numeric(8, 2),
  avg_ph numeric(6, 2),
  min_ph numeric(6, 2),
  max_ph numeric(6, 2),
  max_ammonia numeric(10, 4),
  max_nitrite numeric(10, 4),
  warning_count integer not null default 0,
  reading_count integer not null default 0,
  status text not null default '稳定' check (status in ('稳定', '关注', '预警')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint water_daily_stats_unique_day unique (organization_id, pond_id, stat_date),
  constraint water_daily_stats_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id)
);

create table if not exists public.feeding_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid not null references public.ponds(id) on delete cascade,
  robot_id uuid references public.robots(id) on delete set null,
  feed_amount_kg numeric(10, 2) not null default 0,
  mode text not null check (mode in ('manual', 'scheduled', 'ai_advice', 'emergency')),
  advice_source text check (advice_source in ('manual', 'rule_engine', 'openai', 'deepseek', 'local_model', 'hybrid')),
  executed_at timestamptz not null,
  remark text,
  created_at timestamptz not null default now(),
  constraint feeding_records_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id),
  constraint feeding_records_robot_org_fk foreign key (robot_id, organization_id)
    references public.robots(id, organization_id)
);

create table if not exists public.feeding_daily_stats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid not null references public.ponds(id) on delete cascade,
  stat_date date not null,
  total_feed_kg numeric(12, 2) not null default 0,
  feeding_count integer not null default 0,
  robot_feeding_count integer not null default 0,
  manual_feeding_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feeding_daily_stats_unique_day unique (organization_id, pond_id, stat_date),
  constraint feeding_daily_stats_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id)
);

create table if not exists public.shrimp_measurements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid not null references public.ponds(id) on delete cascade,
  average_length_cm numeric(8, 2) not null,
  average_weight_g numeric(8, 2) not null,
  sample_count integer not null default 0,
  measured_at timestamptz not null,
  source text not null check (source in ('manual', 'app', 'image_ai')),
  created_at timestamptz not null default now(),
  constraint shrimp_measurements_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id)
);

create table if not exists public.shrimp_daily_stats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid not null references public.ponds(id) on delete cascade,
  stat_date date not null,
  avg_length_cm numeric(8, 2),
  avg_weight_g numeric(8, 2),
  sample_count integer not null default 0,
  estimated_count integer,
  estimated_yield_kg numeric(12, 2),
  maturity_percent numeric(6, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shrimp_daily_stats_unique_day unique (organization_id, pond_id, stat_date),
  constraint shrimp_daily_stats_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id)
);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid references public.ponds(id) on delete cascade,
  type text not null check (type in ('water_quality', 'robot_fault', 'feeding', 'growth', 'device', 'ai')),
  metric_key text,
  operator text not null check (operator in ('gt', 'gte', 'lt', 'lte', 'eq', 'contains')),
  threshold_value text not null,
  level text not null check (level in ('info', 'warning', 'critical')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alert_rules_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id)
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid references public.ponds(id) on delete set null,
  robot_id uuid references public.robots(id) on delete set null,
  type text not null check (type in ('water_quality', 'robot_fault', 'feeding', 'growth', 'device', 'ai')),
  level text not null check (level in ('info', 'warning', 'critical')),
  title text not null,
  content text not null,
  metric_key text,
  current_value text,
  normal_range text,
  suggestion text,
  source text,
  read_status text not null default 'unread' check (read_status in ('unread', 'read', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint alerts_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id),
  constraint alerts_robot_org_fk foreign key (robot_id, organization_id)
    references public.robots(id, organization_id)
);

alter table public.organization_members
  add column if not exists updated_at timestamptz not null default now();

alter table public.alerts
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.pond_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pond_id uuid not null references public.ponds(id) on delete cascade,
  stat_date date not null,
  water_score numeric(6, 2),
  total_feed_kg numeric(12, 2),
  avg_shrimp_length_cm numeric(8, 2),
  avg_shrimp_weight_g numeric(8, 2),
  estimated_yield_kg numeric(12, 2),
  alert_count integer not null default 0,
  robot_running_minutes integer not null default 0,
  ai_risk_level text check (ai_risk_level in ('低风险', '关注', '预警', '高风险')),
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pond_daily_snapshots_unique_day unique (organization_id, pond_id, stat_date),
  constraint pond_daily_snapshots_pond_org_fk foreign key (pond_id, organization_id)
    references public.ponds(id, organization_id)
);

create index if not exists idx_organization_members_user_id on public.organization_members(user_id);
create index if not exists idx_ponds_organization_id on public.ponds(organization_id);
create index if not exists idx_robots_organization_id on public.robots(organization_id);
create index if not exists idx_robots_pond_id on public.robots(pond_id);
create index if not exists idx_water_thresholds_pond_id on public.water_thresholds(pond_id);
create index if not exists idx_devices_organization_id on public.devices(organization_id);
create index if not exists idx_devices_pond_id on public.devices(pond_id);
create index if not exists idx_devices_robot_id on public.devices(robot_id);
create index if not exists idx_water_readings_org_pond_recorded_at on public.water_readings(organization_id, pond_id, recorded_at desc);
create index if not exists idx_water_daily_stats_org_pond_date on public.water_daily_stats(organization_id, pond_id, stat_date desc);
create index if not exists idx_feeding_records_org_pond_executed_at on public.feeding_records(organization_id, pond_id, executed_at desc);
create index if not exists idx_feeding_daily_stats_org_pond_date on public.feeding_daily_stats(organization_id, pond_id, stat_date desc);
create index if not exists idx_shrimp_measurements_org_pond_measured_at on public.shrimp_measurements(organization_id, pond_id, measured_at desc);
create index if not exists idx_shrimp_daily_stats_org_pond_date on public.shrimp_daily_stats(organization_id, pond_id, stat_date desc);
create index if not exists idx_alert_rules_org_pond on public.alert_rules(organization_id, pond_id);
create index if not exists idx_alerts_org_created_at on public.alerts(organization_id, created_at desc);
create index if not exists idx_alerts_org_pond_status on public.alerts(organization_id, pond_id, read_status);
create index if not exists idx_pond_daily_snapshots_org_pond_date on public.pond_daily_snapshots(organization_id, pond_id, stat_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'organizations',
    'organization_members',
    'ponds',
    'robots',
    'water_thresholds',
    'devices',
    'water_latest',
    'water_daily_stats',
    'feeding_daily_stats',
    'shrimp_daily_stats',
    'alert_rules',
    'alerts',
    'pond_daily_snapshots'
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

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.get_org_role(org_id uuid)
returns public.app_user_role
language sql
stable
security definer
set search_path = public
as $$
  select om.role
  from public.organization_members om
  where om.organization_id = org_id
    and om.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_manage_org_data(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_org_role(org_id) in (
    'owner'::public.app_user_role,
    'admin'::public.app_user_role,
    'operator'::public.app_user_role
  );
$$;

create or replace function public.can_admin_org(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_org_role(org_id) in (
    'owner'::public.app_user_role,
    'admin'::public.app_user_role
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.get_org_role(uuid) from public;
revoke all on function public.can_manage_org_data(uuid) from public;
revoke all on function public.can_admin_org(uuid) from public;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.get_org_role(uuid) to authenticated;
grant execute on function public.can_manage_org_data(uuid) to authenticated;
grant execute on function public.can_admin_org(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member
on public.organizations
for select
to authenticated
using (public.is_org_member(id));

drop policy if exists organizations_insert_owner on public.organizations;
create policy organizations_insert_owner
on public.organizations
for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin
on public.organizations
for update
to authenticated
using (public.can_admin_org(id))
with check (public.can_admin_org(id));

drop policy if exists organizations_delete_admin on public.organizations;
create policy organizations_delete_admin
on public.organizations
for delete
to authenticated
using (public.can_admin_org(id));

drop policy if exists organization_members_select_member on public.organization_members;
create policy organization_members_select_member
on public.organization_members
for select
to authenticated
using (public.is_org_member(organization_id));

drop policy if exists organization_members_insert_admin on public.organization_members;
create policy organization_members_insert_admin
on public.organization_members
for insert
to authenticated
with check (public.can_admin_org(organization_id));

drop policy if exists organization_members_update_admin on public.organization_members;
create policy organization_members_update_admin
on public.organization_members
for update
to authenticated
using (public.can_admin_org(organization_id))
with check (public.can_admin_org(organization_id));

drop policy if exists organization_members_delete_admin on public.organization_members;
create policy organization_members_delete_admin
on public.organization_members
for delete
to authenticated
using (public.can_admin_org(organization_id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ponds',
    'robots',
    'water_thresholds',
    'devices',
    'water_readings',
    'water_latest',
    'water_daily_stats',
    'feeding_records',
    'feeding_daily_stats',
    'shrimp_measurements',
    'shrimp_daily_stats',
    'alert_rules',
    'alerts',
    'pond_daily_snapshots'
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

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create or replace function public.create_default_org_space_for_user(
  p_user_id uuid,
  p_email text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_meta jsonb := coalesce(p_metadata, '{}'::jsonb);
  resolved_display_name text;
  resolved_organization_name text;
  resolved_short_name text;
  created_organization_id uuid;
begin
  resolved_display_name := nullif(trim(safe_meta ->> 'display_name'), '');
  resolved_display_name := coalesce(resolved_display_name, nullif(trim(safe_meta ->> 'name'), ''));
  resolved_display_name := coalesce(
    resolved_display_name,
    nullif(split_part(coalesce(p_email, ''), '@', 1), ''),
    '新用户'
  );

  resolved_organization_name := nullif(trim(safe_meta ->> 'organization_name'), '');
  resolved_organization_name := coalesce(
    resolved_organization_name,
    nullif(trim(safe_meta ->> 'company_name'), ''),
    resolved_display_name || '的智慧养殖企业'
  );

  resolved_short_name := case
    when char_length(resolved_organization_name) <= 12 then resolved_organization_name
    else substring(resolved_organization_name from 1 for 12)
  end;

  insert into public.profiles (id, display_name, email)
  values (p_user_id, resolved_display_name, coalesce(p_email, ''))
  on conflict (id) do update
    set display_name = excluded.display_name,
        email = excluded.email,
        updated_at = now();

  if exists (
    select 1
    from public.organization_members
    where user_id = p_user_id
  ) then
    select om.organization_id
    into created_organization_id
    from public.organization_members om
    where om.user_id = p_user_id
    order by om.created_at
    limit 1;

    return;
  end if;

  insert into public.organizations (
    name,
    short_name,
    region,
    status,
    owner_user_id
  )
  values (
    resolved_organization_name,
    resolved_short_name,
    '未设置',
    '试用中',
    p_user_id
  )
  returning id into created_organization_id;

  insert into public.organization_members (
    organization_id,
    user_id,
    role
  )
  values (
    created_organization_id,
    p_user_id,
    'owner'::public.app_user_role
  )
  on conflict (organization_id, user_id) do update
    set role = excluded.role,
        updated_at = now();

  return;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.create_default_org_space_for_user(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

create or replace function public.backfill_auth_users_default_data()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  auth_user record;
  affected_count integer := 0;
begin
  for auth_user in
    select id, email, raw_user_meta_data
    from auth.users
  loop
    if not exists (select 1 from public.profiles where id = auth_user.id)
       or not exists (
         select 1
         from public.organization_members
         where user_id = auth_user.id
       ) then
      perform public.create_default_org_space_for_user(
        auth_user.id,
        auth_user.email,
        coalesce(auth_user.raw_user_meta_data, '{}'::jsonb)
      );
      affected_count := affected_count + 1;
    end if;
  end loop;

  return affected_count;
end;
$$;

revoke all on function public.create_default_org_space_for_user(uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.handle_new_auth_user()
  from public, anon, authenticated;
revoke all on function public.backfill_auth_users_default_data()
  from public, anon, authenticated;
