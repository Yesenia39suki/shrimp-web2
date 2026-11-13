set lock_timeout = '5s';

alter table public.ponds add column archived_at timestamptz;

create function public.guard_pond_archive()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  bound_robots text;
begin
  if tg_op = 'INSERT' then
    if new.archived_at is not null then
      raise exception '新增池塘必须处于在用状态';
    end if;
    return new;
  end if;

  if new.archived_at is not distinct from old.archived_at then
    return new;
  end if;

  if not public.can_admin_org(old.organization_id) then
    raise exception using errcode = '42501', message = '归档池塘仅限所有者或管理员';
  end if;

  if new.archived_at is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('pond_archive:' || old.organization_id::text, 0));

  if not exists (
    select 1 from public.ponds
    where organization_id = old.organization_id and id <> old.id and archived_at is null
  ) then
    raise exception '至少保留一个在用池塘';
  end if;

  select string_agg(robot_name || '（' || robot_code || '）', '、' order by robot_code)
  into bound_robots
  from public.robots where organization_id = old.organization_id and pond_id = old.id;

  if bound_robots is not null then
    raise exception '池塘仍绑定机器人 %，请在「机器人信息」中改绑后重试', bound_robots;
  end if;

  if exists (
    select 1 from public.devices where organization_id = old.organization_id and pond_id = old.id
  ) then
    raise exception '池塘仍绑定设备，请先解绑或改绑设备后重试';
  end if;

  if exists (
    select 1 from public.feeding_plans
    where organization_id = old.organization_id and pond_id = old.id and enabled
  ) or exists (
    select 1 from public.feeding_tasks
    where organization_id = old.organization_id and pond_id = old.id and status in ('pending', 'running')
  ) or exists (
    select 1 from public.robot_commands
    where organization_id = old.organization_id and pond_id = old.id and status in ('pending', 'sent', 'running')
  ) then
    raise exception '池塘仍有启用的投喂计划或未完成的任务、指令，请处理后再归档';
  end if;

  new.archived_at := now();
  return new;
end
$function$;

revoke all on function public.guard_pond_archive() from public, anon, authenticated;

create trigger guard_pond_archive
before insert or update of archived_at on public.ponds
for each row execute function public.guard_pond_archive();

create function public.require_active_pond_for_binding()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.pond_id is null then
    return new;
  end if;

  perform 1 from public.ponds
  where organization_id = new.organization_id and id = new.pond_id and archived_at is null
  for share;
  if not found then
    raise exception '池塘不存在、已归档或不属于当前企业';
  end if;

  return new;
end
$function$;

revoke all on function public.require_active_pond_for_binding() from public, anon, authenticated;

create trigger require_active_pond_for_robot
before insert or update of pond_id, organization_id on public.robots
for each row execute function public.require_active_pond_for_binding();

create trigger require_active_pond_for_device
before insert or update of pond_id, organization_id on public.devices
for each row execute function public.require_active_pond_for_binding();

create trigger require_active_pond_for_feeding_plan
before insert or update of pond_id, organization_id, enabled on public.feeding_plans
for each row when (new.enabled) execute function public.require_active_pond_for_binding();

create trigger require_active_pond_for_feeding_task
before insert or update of pond_id, organization_id, status on public.feeding_tasks
for each row when (new.status in ('pending', 'running')) execute function public.require_active_pond_for_binding();

create trigger require_active_pond_for_robot_command
before insert or update of pond_id, organization_id, status on public.robot_commands
for each row when (new.status in ('pending', 'sent', 'running')) execute function public.require_active_pond_for_binding();

revoke delete on public.ponds from public, anon, authenticated;

reset lock_timeout;
