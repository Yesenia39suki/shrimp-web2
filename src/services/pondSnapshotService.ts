import { isSupabaseMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import {
  mapPondDailySnapshotRow,
  type PondDailySnapshot,
} from '@/services/mappers/snapshotMapper'
import { resolvePondUuid, throwSupabaseError, toDateOnly } from '@/services/supabaseHelpers'
import type { TimeRange } from '@/types/business'

export async function getPondDailySnapshots(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
): Promise<PondDailySnapshot[]> {
  if (!isSupabaseMode) {
    return []
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { data, error } = await supabase
    .from('pond_daily_snapshots')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pond_id', pondUuid)
    .gte('stat_date', toDateOnly(timeRange.startAt))
    .lte('stat_date', toDateOnly(timeRange.endAt))
    .order('stat_date', { ascending: false })

  if (error) {
    throwSupabaseError(error, '读取池塘日快照失败')
  }

  return (data ?? []).map(mapPondDailySnapshotRow)
}
