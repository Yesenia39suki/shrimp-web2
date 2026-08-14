-- 智慧虾投喂系统：新用户空企业空间与多租户边界加固
-- 执行前提：已执行 supabase-schema-phase1.sql。
-- 本迁移不会删除或修改任何已有业务数据，可重复执行。

begin;

create or replace function public.create_default_org_space_for_user(
  target_user_id uuid,
  target_email text,
  target_raw_user_meta_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_meta jsonb := coalesce(target_raw_user_meta_data, '{}'::jsonb);
  resolved_display_name text;
  resolved_organization_name text;
  resolved_short_name text;
  created_organization_id uuid;
begin
  resolved_display_name := nullif(trim(safe_meta ->> 'display_name'), '');
  resolved_display_name := coalesce(resolved_display_name, nullif(trim(safe_meta ->> 'name'), ''));
  resolved_display_name := coalesce(
    resolved_display_name,
    nullif(split_part(coalesce(target_email, ''), '@', 1), ''),
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
  values (target_user_id, resolved_display_name, coalesce(target_email, ''))
  on conflict (id) do update
    set display_name = excluded.display_name,
        email = excluded.email,
        updated_at = now();

  select om.organization_id
  into created_organization_id
  from public.organization_members om
  where om.user_id = target_user_id
  order by om.created_at
  limit 1;

  if created_organization_id is not null then
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
    target_user_id
  )
  returning id into created_organization_id;

  insert into public.organization_members (
    organization_id,
    user_id,
    role
  )
  values (
    created_organization_id,
    target_user_id,
    'owner'::public.app_user_role
  )
  on conflict (organization_id, user_id) do update
    set role = excluded.role,
        updated_at = now();

  -- 注册初始化到此结束。池塘、机器人、阈值及其他业务数据必须由用户主动创建。
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

-- 固定触发器函数的搜索路径，避免调用方修改 search_path 影响函数解析。
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

-- rls_auto_enable 是 Supabase 管理的内部事件触发器函数，不应暴露为 RPC。
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$$;

-- 旧版快照函数仅检查企业成员，viewer 可通过 SECURITY DEFINER 绕过只读限制。
-- 前端未直接调用此函数；汇总仍由已校验 can_manage_org_data 的写入 RPC 在函数内部触发。
do $$
begin
  if to_regprocedure('public.refresh_pond_daily_snapshot(uuid,uuid,date)') is not null then
    execute 'revoke all on function public.refresh_pond_daily_snapshot(uuid, uuid, date) from public, anon, authenticated';
  end if;
end
$$;

-- 补齐少数“子对象 ID + organization_id”组合关系，阻止跨企业伪造关联 ID。
-- 添加外键时会校验已有数据；若发现历史跨企业脏关联，整个事务会回滚且不会修改正式数据。
do $$
begin
  if to_regclass('public.water_readings') is not null
     and not exists (
       select 1 from pg_constraint
       where conrelid = to_regclass('public.water_readings')
         and conname = 'water_readings_unique_id_organization'
     ) then
    alter table public.water_readings
      add constraint water_readings_unique_id_organization unique (id, organization_id);
  end if;

  if to_regclass('public.water_latest') is not null
     and not exists (
       select 1 from pg_constraint
       where conrelid = to_regclass('public.water_latest')
         and conname = 'water_latest_reading_org_fk'
     ) then
    alter table public.water_latest
      add constraint water_latest_reading_org_fk
      foreign key (reading_id, organization_id)
      references public.water_readings(id, organization_id)
      on delete set null (reading_id);
  end if;

  if to_regclass('public.feeding_plans') is not null
     and not exists (
       select 1 from pg_constraint
       where conrelid = to_regclass('public.feeding_plans')
         and conname = 'feeding_plans_unique_id_organization'
     ) then
    alter table public.feeding_plans
      add constraint feeding_plans_unique_id_organization unique (id, organization_id);
  end if;

  if to_regclass('public.feeding_tasks') is not null
     and not exists (
       select 1 from pg_constraint
       where conrelid = to_regclass('public.feeding_tasks')
         and conname = 'feeding_tasks_plan_org_fk'
     ) then
    alter table public.feeding_tasks
      add constraint feeding_tasks_plan_org_fk
      foreign key (plan_id, organization_id)
      references public.feeding_plans(id, organization_id)
      on delete set null (plan_id);
  end if;

  if to_regclass('public.robot_commands') is not null
     and not exists (
       select 1 from pg_constraint
       where conrelid = to_regclass('public.robot_commands')
         and conname = 'robot_commands_unique_id_organization'
     ) then
    alter table public.robot_commands
      add constraint robot_commands_unique_id_organization unique (id, organization_id);
  end if;

  if to_regclass('public.robot_command_acks') is not null
     and not exists (
       select 1 from pg_constraint
       where conrelid = to_regclass('public.robot_command_acks')
         and conname = 'robot_command_acks_command_org_fk'
     ) then
    alter table public.robot_command_acks
      add constraint robot_command_acks_command_org_fk
      foreign key (command_id, organization_id)
      references public.robot_commands(id, organization_id)
      on delete cascade;
  end if;
end
$$;

commit;
