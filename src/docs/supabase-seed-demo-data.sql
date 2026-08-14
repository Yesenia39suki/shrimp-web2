-- 智慧虾投喂管理系统 Supabase 演示数据
-- 仅供开发/演示时手动执行；注册触发器和前端注册流程都不会调用本文件。
-- 执行前请先替换 target_organization_id / target_pond_id / target_robot_id。
-- 本文件不会自动执行，也不写死真实用户 UUID。
-- 说明：重复执行会追加 water_readings、feeding_records、shrimp_measurements 明细；
-- daily_stats 和 pond_daily_snapshots 会通过 RPC 重新汇总，可用于无硬件阶段测试图表。

do $$
declare
  target_organization_id uuid := '2ff0f3f0-5548-4daa-aff2-4ebec10d8f43'::uuid;
  target_pond_id uuid := '2c072a2f-9d52-4c82-92ae-e91b157b0c5a'::uuid;
  target_robot_id uuid := null;
  day_index integer;
  stat_day date;
  recorded_time timestamptz;
  temperature_value numeric;
  oxygen_value numeric;
  ph_value numeric;
  feed_value numeric;
  shrimp_length numeric;
  shrimp_weight numeric;
begin
  if target_organization_id::text = '00000000-0000-0000-0000-000000000000'
     or target_pond_id::text = '00000000-0000-0000-0000-000000000000' then
    raise exception '请先替换 target_organization_id 和 target_pond_id';
  end if;

  select r.id
  into target_robot_id
  from public.robots r
  where r.organization_id = target_organization_id
    and r.pond_id = target_pond_id
  order by r.created_at
  limit 1;

  for day_index in 0..29 loop
    stat_day := current_date - (29 - day_index);
    recorded_time := stat_day + time '09:00';
    temperature_value := round((26.8 + day_index * 0.05 + sin(day_index / 3.0) * 0.8)::numeric, 2);
    oxygen_value := round((6.6 + cos(day_index / 4.0) * 0.45)::numeric, 2);
    ph_value := round((7.7 + sin(day_index / 5.0) * 0.18)::numeric, 2);
    feed_value := round((16 + (day_index % 4) * 1.2)::numeric, 2);
    shrimp_length := round((7.4 + day_index * 0.045)::numeric, 2);
    shrimp_weight := round((9.8 + day_index * 0.11)::numeric, 2);

    perform public.ingest_water_reading(
      target_organization_id,
      target_pond_id,
      null,
      recorded_time,
      temperature_value,
      oxygen_value,
      ph_value,
      310 + day_index,
      16 + (day_index % 6),
      round((0.10 + (day_index % 5) * 0.018)::numeric, 4),
      round((0.03 + (day_index % 4) * 0.008)::numeric, 4),
      180 + (day_index % 9)
    );

    perform public.record_feeding(
      target_organization_id,
      target_pond_id,
      target_robot_id,
      feed_value,
      'scheduled',
      'rule_engine',
      stat_day + time '17:30',
      '演示投喂记录'
    );

    perform public.record_shrimp_measurement(
      target_organization_id,
      target_pond_id,
      shrimp_length,
      shrimp_weight,
      50,
      stat_day + time '08:30',
      'manual',
      120000 + day_index * 120,
      round((1200 + day_index * 18)::numeric, 2),
      least(85, 42 + day_index)
    );
  end loop;

  insert into public.robot_status (
    organization_id,
    pond_id,
    robot_id,
    online,
    work_mode,
    battery,
    speed,
    fault_code
  )
  select
    target_organization_id,
    target_pond_id,
    target_robot_id,
    true,
    'patrol',
    82,
    0.8,
    null
  where target_robot_id is not null
  on conflict (organization_id, robot_id) do update
    set online = excluded.online,
        work_mode = excluded.work_mode,
        battery = excluded.battery,
        speed = excluded.speed,
        fault_code = excluded.fault_code,
        updated_at = now();

  insert into public.robot_position_latest (
    organization_id,
    pond_id,
    robot_id,
    x,
    y,
    z,
    heading,
    speed,
    battery,
    status,
    recorded_at
  )
  select
    target_organization_id,
    target_pond_id,
    target_robot_id,
    37.4,
    0,
    14.1,
    126,
    0.8,
    82,
    'patrol',
    now()
  where target_robot_id is not null
  on conflict (organization_id, robot_id) do update
    set x = excluded.x,
        y = excluded.y,
        z = excluded.z,
        heading = excluded.heading,
        speed = excluded.speed,
        battery = excluded.battery,
        status = excluded.status,
        recorded_at = excluded.recorded_at,
        updated_at = now();

  insert into public.robot_position_history (
    organization_id,
    pond_id,
    robot_id,
    x,
    y,
    z,
    heading,
    speed,
    battery,
    status,
    recorded_at
  )
  select
    target_organization_id,
    target_pond_id,
    target_robot_id,
    24 + i * 1.2,
    0,
    12 + sin(i / 2.0) * 4,
    90 + i * 4,
    0.8,
    82 - i,
    'patrol',
    now() - ((15 - i) || ' minutes')::interval
  from generate_series(0, 15) as i
  where target_robot_id is not null;

  insert into public.alerts (
    organization_id,
    pond_id,
    type,
    level,
    title,
    content,
    metric_key,
    current_value,
    normal_range,
    suggestion,
    source,
    read_status
  )
  values (
    target_organization_id,
    target_pond_id,
    'water_quality',
    'warning',
    '演示溶解氧关注',
    '演示数据：夜间溶氧存在下探趋势。',
    'oxygen',
    '5.1',
    '5 - 9',
    '建议复核增氧设备并观察投喂后摄食情况。',
    'seed_demo_data',
    'unread'
  );

  perform public.refresh_pond_daily_snapshot(target_organization_id, target_pond_id, current_date);
end
$$;
