import type { TimeRange } from '@/types/business'
import type { AiReport } from '@/types/ai'
import type { ExportTask } from '@/types/system'

const reportStore = new Map<string, AiReport[]>()

function storeKey(organizationId: string, pondId: string) {
  return `${organizationId}:${pondId}`
}

function getReportsByKey(organizationId: string, pondId: string) {
  const key = storeKey(organizationId, pondId)
  const reports = reportStore.get(key)

  if (reports) {
    return reports
  }

  const seed: AiReport[] = [
    {
      id: `report-${pondId}-daily`,
      organizationId,
      pondId,
      reportType: 'daily',
      title: '今日养殖运行日报',
      content: 'mock 日报：水质稳定，投喂计划执行正常。',
      createdAt: new Date().toISOString(),
    },
  ]
  reportStore.set(key, seed)
  return seed
}

export async function generateDailyReport(
  organizationId: string,
  pondId: string,
  date: string,
): Promise<AiReport> {
  // TODO: 后续调用 /functions/v1/ai-generate-report，并写 ai_reports。
  const report: AiReport = {
    id: `report-daily-${Date.now()}`,
    organizationId,
    pondId,
    reportType: 'daily',
    title: `${date} 养殖运行日报`,
    content: 'mock 日报：当前无高风险报警，建议继续观察夜间溶氧。',
    createdAt: new Date().toISOString(),
  }
  getReportsByKey(organizationId, pondId).unshift(report)
  return Promise.resolve(report)
}

export async function generateWeeklyReport(
  organizationId: string,
  pondId: string,
  dateRange: TimeRange,
): Promise<AiReport> {
  const report: AiReport = {
    id: `report-weekly-${Date.now()}`,
    organizationId,
    pondId,
    reportType: 'weekly',
    title: `${dateRange.startAt} 至 ${dateRange.endAt} 养殖周报`,
    content: 'mock 周报：虾群增长趋势平稳，投喂和增氧策略建议保持。',
    createdAt: new Date().toISOString(),
  }
  getReportsByKey(organizationId, pondId).unshift(report)
  return Promise.resolve(report)
}

export async function exportReportPdf(
  organizationId: string,
  reportId: string,
): Promise<ExportTask> {
  // TODO: 后续由后端生成 PDF 文件，前端只下载文件 URL。
  return Promise.resolve({
    id: `export-${reportId}`,
    organizationId,
    type: 'report',
    status: 'done',
    fileUrl: `/mock-storage/reports/${reportId}.pdf`,
    createdAt: new Date().toISOString(),
  })
}

export async function getReports(organizationId: string, pondId: string): Promise<AiReport[]> {
  return Promise.resolve([...getReportsByKey(organizationId, pondId)])
}

export async function deleteReport(organizationId: string, reportId: string): Promise<boolean> {
  // TODO: 后续删除 ai_reports 和关联导出文件。
  for (const [key, reports] of reportStore.entries()) {
    reportStore.set(
      key,
      reports.filter(
        (report) => !(report.organizationId === organizationId && report.id === reportId),
      ),
    )
  }
  return Promise.resolve(true)
}
