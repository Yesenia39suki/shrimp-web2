import { isSupabaseMode } from '@/config/dataSource'
import { getMockSystemData } from '@/services/mockDataService'
import { shrimpDailyMetricValue } from '@/services/mappers/shrimpMapper'
import { waterDailyMetricValue } from '@/services/mappers/waterMapper'
import { getShrimpDailyStats } from '@/services/shrimpGrowthService'
import { resolvePondUuid } from '@/services/supabaseHelpers'
import { getWaterDailyStats } from '@/services/waterDataService'
import type { TimeRange } from '@/types/business'

export type ComparisonCategory = 'water' | 'shrimp'

export interface ComparisonPoint {
  time: string
  value: number
}

export interface PondComparisonSeries {
  pondId: string
  metricKey: string
  label: string
  unit: string
  points: ComparisonPoint[]
}

const waterMetricMeta: Record<string, { label: string; unit: string }> = {
  temperature: { label: '温度', unit: '℃' },
  oxygen: { label: '溶解氧', unit: '毫克/升' },
  dissolvedOxygen: { label: '溶解氧', unit: '毫克/升' },
  ph: { label: 'pH', unit: '' },
  ammonia: { label: '氨氮', unit: '毫克/升' },
  nitrite: { label: '亚硝酸盐', unit: '毫克/升' },
}

const shrimpMetricMeta: Record<string, { label: string; unit: string }> = {
  length: { label: '实测对虾长度', unit: '厘米' },
  average_length_cm: { label: '实测对虾长度', unit: '厘米' },
  weight: { label: '实测对虾重量', unit: '克' },
  average_weight_g: { label: '实测对虾重量', unit: '克' },
  count: { label: '估测对虾数量', unit: '尾' },
  yield: { label: '对虾产量', unit: '千克' },
  maturity: { label: '养殖成熟度', unit: '%' },
}

function metricMeta(category: ComparisonCategory, metricKey: string) {
  return category === 'water'
    ? (waterMetricMeta[metricKey] ?? { label: metricKey, unit: '' })
    : (shrimpMetricMeta[metricKey] ?? { label: metricKey, unit: '' })
}

export async function getPondMetricComparison(input: {
  organizationId: string
  pondIds: string[]
  category: ComparisonCategory
  metricKey: string
  timeRange: TimeRange
}): Promise<PondComparisonSeries[]> {
  if (!isSupabaseMode) {
    const data = getMockSystemData(input.organizationId)
    const meta = metricMeta(input.category, input.metricKey)
    return input.pondIds.map((pondId) => {
      const profile = data.pondProfiles.find((item) => item.pondId === pondId)
      const metricList = input.category === 'water' ? profile?.waterMetrics : profile?.shrimpMetrics
      const metric = metricList?.find((item) => item.key === input.metricKey)
      return {
        pondId,
        metricKey: input.metricKey,
        label: metric?.label ?? meta.label,
        unit: metric?.unit ?? meta.unit,
        points: (metric?.trend ?? []).map((value, index) => ({
          time: ['前6日', '前5日', '前4日', '前3日', '前2日', '昨日', '今日'][index] ?? String(index + 1),
          value: Number(value),
        })),
      }
    })
  }

  const meta = metricMeta(input.category, input.metricKey)
  const series = await Promise.all(
    input.pondIds.map(async (pondId) => {
      const pondUuid = await resolvePondUuid(input.organizationId, pondId)
      if (input.category === 'water') {
        const rows = await getWaterDailyStats(input.organizationId, pondUuid, input.timeRange)

        return {
          pondId,
          metricKey: input.metricKey,
          label: meta.label,
          unit: meta.unit,
          points: rows.map((row) => ({
            time: row.stat_date,
            value: waterDailyMetricValue(row, input.metricKey),
          })),
        }
      }

      const rows = await getShrimpDailyStats(input.organizationId, pondUuid, input.timeRange)
      return {
        pondId,
        metricKey: input.metricKey,
        label: meta.label,
        unit: meta.unit,
        points: rows.map((row) => ({
          time: row.stat_date,
          value: shrimpDailyMetricValue(row, input.metricKey),
        })),
      }
    }),
  )

  return series
}
