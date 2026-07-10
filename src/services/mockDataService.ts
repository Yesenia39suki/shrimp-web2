import type {
  BusinessConfig,
  Organization,
  OrganizationMember,
  OrganizationRole,
  Pond,
  Robot,
  UserProfile,
  WaterThreshold,
} from '@/types/business'
import type { PondProfile, RangeThreshold, RobotInfo, SystemMetric } from '@/stores/shrimpSystem'

export const MOCK_LOGIN_EMAIL = 'admin@aifeed.cc.cd'
export const MOCK_LOGIN_PASSWORD = '123456'
export const MOCK_DEMO_ACCOUNTS = [
  {
    label: 'A账户',
    email: 'a@aifeed.cc.cd',
    password: '123456',
    organizationName: '青岛智慧养殖示范企业',
  },
  {
    label: 'B账户',
    email: 'b@aifeed.cc.cd',
    password: '123456',
    organizationName: '日照对虾养殖合作社',
  },
]

const AUTH_STORAGE_KEY = 'shrimp_mock_auth_session'
const BUSINESS_CONFIG_STORAGE_KEY = 'shrimp_mock_business_config'
const REGISTERED_ACCOUNTS_STORAGE_KEY = 'shrimp_mock_registered_accounts'
const ORGANIZATION_OVERRIDES_STORAGE_KEY = 'shrimp_mock_organization_overrides'
const DEFAULT_ORGANIZATION_ID = 'org-qingdao'

export interface MockSession {
  user: UserProfile
  organizationId: string
  role: OrganizationRole
}

export interface MockRegisterPayload {
  displayName: string
  email: string
  password: string
  organizationName: string
  region: string
}

interface MockAccount {
  user: UserProfile
  password: string
  organization: Organization
  member: OrganizationMember
}

export interface MockSystemData {
  systemMeta: {
    systemName: string
    logoText: string
    online: boolean
    currentPondId: string
    currentStatus: string
  }
  pondProfiles: PondProfile[]
  waterMetrics: SystemMetric[]
  shrimpMetrics: SystemMetric[]
  robots: RobotInfo[]
  thresholds: {
    water: Record<string, RangeThreshold>
    shrimp: Record<string, RangeThreshold>
    robot: {
      minBattery: number
      requireOnline: boolean
      normalFeederStatus: string
      normalAbnormalStatus: string
    }
    model: {
      abnormalKeywords: string[]
      recommendationRiskKeywords: string[]
    }
  }
  pondConfig: {
    pondIds: string[]
    selectedPondId: string
  }
  shrimpConfig: {
    species: string
    targetRanges: Record<string, RangeThreshold>
  }
  robotConfig: {
    robots: Array<{
      id: string
      name: string
      pondId: string
    }>
  }
  businessConfig: BusinessConfig
}

type BusinessConfigMap = Record<string, BusinessConfig>
type OrganizationOverrideMap = Record<string, Partial<Organization>>

const mockOrganizations: Organization[] = [
  {
    id: 'org-qingdao',
    name: '青岛智慧养殖示范企业',
    short_name: '青岛示范企业',
    region: '山东青岛',
    status: '运行中',
  },
  {
    id: 'org-rizhao',
    name: '日照对虾养殖合作社',
    short_name: '日照合作社',
    region: '山东日照',
    status: '观察中',
  },
]

const mockUsers: UserProfile[] = [
  {
    id: 'user-account-a',
    display_name: 'A账户管理员',
    email: MOCK_DEMO_ACCOUNTS[0]!.email,
  },
  {
    id: 'user-account-b',
    display_name: 'B账户管理员',
    email: MOCK_DEMO_ACCOUNTS[1]!.email,
  },
  {
    id: 'user-admin-demo',
    display_name: '系统管理员',
    email: MOCK_LOGIN_EMAIL,
  },
]

const mockMembers: OrganizationMember[] = [
  {
    id: 'member-qingdao-owner',
    organization_id: 'org-qingdao',
    user_id: 'user-account-a',
    role: 'owner',
  },
  {
    id: 'member-rizhao-owner',
    organization_id: 'org-rizhao',
    user_id: 'user-account-b',
    role: 'owner',
  },
  {
    id: 'member-admin-demo',
    organization_id: 'org-qingdao',
    user_id: 'user-admin-demo',
    role: 'admin',
  },
]

const mockAccounts: MockAccount[] = [
  {
    user: mockUsers[0]!,
    password: MOCK_DEMO_ACCOUNTS[0]!.password,
    organization: mockOrganizations[0]!,
    member: mockMembers[0]!,
  },
  {
    user: mockUsers[1]!,
    password: MOCK_DEMO_ACCOUNTS[1]!.password,
    organization: mockOrganizations[1]!,
    member: mockMembers[1]!,
  },
  {
    user: mockUsers[2]!,
    password: MOCK_LOGIN_PASSWORD,
    organization: mockOrganizations[0]!,
    member: mockMembers[2]!,
  },
]

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function cloneBusinessConfig(config: BusinessConfig): BusinessConfig {
  return cloneData(config)
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseLocalStorage()) {
    return fallback
  }

  try {
    const rawValue = window.localStorage.getItem(key)

    if (!rawValue) {
      return fallback
    }

    return JSON.parse(rawValue) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function removeJson(key: string) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.removeItem(key)
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatOrganizationShortName(name: string) {
  return name.length > 12 ? name.slice(0, 12) : name
}

function getRegisteredAccounts(): MockAccount[] {
  return readJson<MockAccount[]>(REGISTERED_ACCOUNTS_STORAGE_KEY, [])
}

function saveRegisteredAccounts(accounts: MockAccount[]) {
  writeJson(REGISTERED_ACCOUNTS_STORAGE_KEY, accounts)
}

function getOrganizationOverrides(): OrganizationOverrideMap {
  return readJson<OrganizationOverrideMap>(ORGANIZATION_OVERRIDES_STORAGE_KEY, {})
}

function saveOrganizationOverrides(overrides: OrganizationOverrideMap) {
  writeJson(ORGANIZATION_OVERRIDES_STORAGE_KEY, overrides)
}

function applyOrganizationOverride(
  organization: Organization,
  overrides: OrganizationOverrideMap,
): Organization {
  return {
    ...organization,
    ...overrides[organization.id],
    id: organization.id,
  }
}

function getAllAccounts() {
  return [...mockAccounts, ...getRegisteredAccounts()]
}

function getAllOrganizations() {
  const overrides = getOrganizationOverrides()
  return getAllAccounts().map((account) =>
    applyOrganizationOverride(account.organization, overrides),
  )
}

function getAllMembers() {
  return getAllAccounts().map((account) => account.member)
}

function buildTrend(value: number, offsets: number[], precision = 1) {
  return offsets.map((offset) => Number((value + offset).toFixed(precision)))
}

function cloneMetrics(metrics: SystemMetric[]) {
  return metrics.map((metric) => ({
    ...metric,
    trend: [...metric.trend],
  }))
}

function createWaterMetrics(config: {
  updatedAt: string
  temperature: number
  oxygen: number
  ph: number
  orp: number
  turbidity: number
  ammonia: number
  nitrite: number
  hardness: number
}) {
  return [
    {
      key: 'temperature',
      label: '温度',
      value: config.temperature,
      unit: '℃',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.temperature, [-0.8, -0.5, -0.3, -0.1, 0.1, 0, 0], 1),
    },
    {
      key: 'oxygen',
      label: '溶解氧',
      value: config.oxygen,
      unit: '毫克/升',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.oxygen, [-0.4, -0.3, -0.1, 0, 0.1, 0, 0], 1),
    },
    {
      key: 'ph',
      label: 'pH',
      value: config.ph,
      unit: '',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.ph, [-0.2, -0.1, 0, 0, 0.1, 0, 0], 1),
    },
    {
      key: 'orp',
      label: '氧化还原电位',
      value: config.orp,
      unit: '毫伏',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.orp, [-12, -8, -4, -2, 0, 1, 0], 0),
    },
    {
      key: 'turbidity',
      label: '浊度',
      value: config.turbidity,
      unit: '度',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.turbidity, [2, 1, 0, 0, -1, 0, 0], 0),
    },
    {
      key: 'ammonia',
      label: '氨氮',
      value: config.ammonia,
      unit: '毫克/升',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.ammonia, [-0.03, -0.02, -0.01, 0, 0, -0.01, 0], 2),
    },
    {
      key: 'nitrite',
      label: '亚硝酸盐',
      value: config.nitrite,
      unit: '毫克/升',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.nitrite, [-0.01, -0.01, 0, 0, 0, -0.01, 0], 2),
    },
    {
      key: 'hardness',
      label: '钙/镁硬度',
      value: config.hardness,
      unit: '毫克/升',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.hardness, [-8, -6, -4, -2, 0, -1, 0], 0),
    },
  ] satisfies SystemMetric[]
}

function createShrimpMetrics(config: {
  updatedAt: string
  length: number
  weight: number
  count: number
  yield: number
  cultureDays: number
  maturity: number
  modelStatus: string
  modelStatusDescription: string
  modelRecommendation: string
  modelRecommendationDescription: string
}) {
  return [
    {
      key: 'length',
      label: '实测对虾长度',
      value: config.length,
      unit: '厘米',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.length, [-0.7, -0.5, -0.4, -0.2, -0.1, -0.1, 0], 1),
    },
    {
      key: 'weight',
      label: '实测对虾重量',
      value: config.weight,
      unit: '克',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.weight, [-1.4, -1.1, -0.8, -0.5, -0.3, -0.1, 0], 1),
    },
    {
      key: 'count',
      label: '估测对虾数量',
      value: config.count,
      unit: '万尾',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.count, [2, 2, 1, 1, 0, 0, 0], 0),
    },
    {
      key: 'yield',
      label: '对虾产量',
      value: config.yield,
      unit: '吨',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.yield, [-2, -1.6, -1.1, -0.8, -0.4, -0.2, 0], 1),
    },
    {
      key: 'cultureDays',
      label: '养殖时间',
      value: config.cultureDays,
      unit: '天',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.cultureDays, [-6, -5, -4, -3, -2, -1, 0], 0),
    },
    {
      key: 'maturity',
      label: '养殖成熟度',
      value: config.maturity,
      unit: '%',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.maturity, [-8, -6, -4, -3, -2, -1, 0], 0),
    },
    {
      key: 'modelStatus',
      label: '模型养殖状态评估结果',
      value: config.modelStatus,
      unit: '',
      updatedAt: config.updatedAt,
      trend: [],
      description: config.modelStatusDescription,
    },
    {
      key: 'modelRecommendation',
      label: '模型养殖决策推荐',
      value: config.modelRecommendation,
      unit: '',
      updatedAt: config.updatedAt,
      trend: [],
      description: config.modelRecommendationDescription,
    },
  ] satisfies SystemMetric[]
}

function createDefaultPond(organizationId: string): Pond {
  if (organizationId === 'org-rizhao') {
    return {
      id: 'pond-rizhao-r01',
      organization_id: organizationId,
      pond_code: 'R-01',
      pond_name: '日照一号生态养殖池',
      shrimp_species: '南美白对虾',
      area: 18.6,
      water_depth: 1.45,
      location: '日照东港近海养殖区',
    }
  }

  if (organizationId === 'org-qingdao') {
    return {
      id: 'pond-qingdao-a01',
      organization_id: organizationId,
      pond_code: 'A-01',
      pond_name: '一号高密度养殖池',
      shrimp_species: '南美白对虾',
      area: 22.8,
      water_depth: 1.55,
      location: '青岛西海岸示范基地',
    }
  }

  const organization = getOrganizationById(organizationId)

  return {
    id: `pond-${organizationId}-01`,
    organization_id: organizationId,
    pond_code: 'P-01',
    pond_name: '一号养殖池',
    shrimp_species: '南美白对虾',
    area: 20,
    water_depth: 1.5,
    location: organization.region,
  }
}

function createDefaultRobot(organizationId: string, pondId: string): Robot {
  if (organizationId === 'org-rizhao') {
    return {
      id: 'robot-rizhao-01',
      organization_id: organizationId,
      pond_id: pondId,
      robot_code: 'RZ-RB-01',
      robot_name: '日照一号投喂巡检机器人',
      robot_type: '投喂巡检型',
    }
  }

  if (organizationId === 'org-qingdao') {
    return {
      id: 'robot-qingdao-01',
      organization_id: organizationId,
      pond_id: pondId,
      robot_code: 'QD-RB-01',
      robot_name: '青岛一号投喂巡检机器人',
      robot_type: '投喂巡检型',
    }
  }

  return {
    id: `robot-${organizationId}-01`,
    organization_id: organizationId,
    pond_id: pondId,
    robot_code: 'RB-01',
    robot_name: '一号投喂巡检机器人',
    robot_type: '投喂巡检型',
  }
}

function createDefaultWaterThreshold(organizationId: string): WaterThreshold {
  return {
    id: `threshold-${organizationId}`,
    organization_id: organizationId,
    temperature: { min: 20, max: 35 },
    oxygen: { min: 5, max: 9 },
    ph: { min: 7, max: 8.6 },
    orp: { min: 250, max: 420 },
    turbidity: { min: 0, max: 30 },
    ammonia: { min: 0, max: 0.3 },
    nitrite: { min: 0, max: 0.12 },
    hardness: { min: 120, max: 260 },
  }
}

function createDefaultBusinessConfig(organizationId: string): BusinessConfig {
  const pond = createDefaultPond(organizationId)

  return {
    organization_id: organizationId,
    pond,
    robot: createDefaultRobot(organizationId, pond.id),
    waterThreshold: createDefaultWaterThreshold(organizationId),
  }
}

function mergeBusinessConfig(
  saved: BusinessConfig | undefined,
  organizationId: string,
): BusinessConfig {
  const defaults = createDefaultBusinessConfig(organizationId)

  if (!saved) {
    return cloneData(defaults)
  }

  const threshold = saved.waterThreshold ?? defaults.waterThreshold

  return {
    organization_id: organizationId,
    pond: {
      ...defaults.pond,
      ...saved.pond,
      organization_id: organizationId,
    },
    robot: {
      ...defaults.robot,
      ...saved.robot,
      organization_id: organizationId,
      pond_id: saved.pond?.id ?? defaults.pond.id,
    },
    waterThreshold: {
      ...defaults.waterThreshold,
      ...threshold,
      organization_id: organizationId,
      temperature: { ...defaults.waterThreshold.temperature, ...threshold.temperature },
      oxygen: { ...defaults.waterThreshold.oxygen, ...threshold.oxygen },
      ph: { ...defaults.waterThreshold.ph, ...threshold.ph },
      orp: { ...defaults.waterThreshold.orp, ...threshold.orp },
      turbidity: { ...defaults.waterThreshold.turbidity, ...threshold.turbidity },
      ammonia: { ...defaults.waterThreshold.ammonia, ...threshold.ammonia },
      nitrite: { ...defaults.waterThreshold.nitrite, ...threshold.nitrite },
      hardness: { ...defaults.waterThreshold.hardness, ...threshold.hardness },
    },
  }
}

function formatPondCode(config: BusinessConfig, fallback: string) {
  return config.pond.pond_code.trim() || fallback
}

function formatRobotCode(config: BusinessConfig, fallback: string) {
  return config.robot.robot_code.trim() || fallback
}

function formatRobotName(config: BusinessConfig, fallback: string) {
  return config.robot.robot_name.trim() || fallback
}

function createQingdaoProfiles(config: BusinessConfig): PondProfile[] {
  const primaryPondCode = formatPondCode(config, 'A-01')

  return [
    {
      pondId: primaryPondCode,
      species: config.pond.shrimp_species,
      systemStatus: '运行稳定',
      waterMetrics: createWaterMetrics({
        updatedAt: '今日 09:40',
        temperature: 28,
        oxygen: 6.8,
        ph: 7.8,
        orp: 318,
        turbidity: 18,
        ammonia: 0.16,
        nitrite: 0.05,
        hardness: 188,
      }),
      shrimpMetrics: createShrimpMetrics({
        updatedAt: '今日 09:20',
        length: 8.6,
        weight: 11.8,
        count: 146,
        yield: 17.2,
        cultureDays: 61,
        maturity: 58,
        modelStatus: '状态稳定',
        modelStatusDescription: '摄食活跃度和水体承载能力均处于稳定区间。',
        modelRecommendation: '高频少量投喂',
        modelRecommendationDescription: '建议维持每日四次少量投喂，继续观察午后溶氧变化。',
      }),
    },
    {
      pondId: 'A-02',
      species: '斑节对虾',
      systemStatus: '投喂复核',
      waterMetrics: createWaterMetrics({
        updatedAt: '今日 09:38',
        temperature: 27.4,
        oxygen: 7.1,
        ph: 7.7,
        orp: 322,
        turbidity: 16,
        ammonia: 0.14,
        nitrite: 0.04,
        hardness: 192,
      }),
      shrimpMetrics: createShrimpMetrics({
        updatedAt: '今日 09:18',
        length: 8.1,
        weight: 10.9,
        count: 152,
        yield: 15.8,
        cultureDays: 56,
        maturity: 52,
        modelStatus: '生长平稳',
        modelStatusDescription: '边缘区域摄食稳定，建议维持当前节奏。',
        modelRecommendation: '常规分时投喂',
        modelRecommendationDescription: '建议保持早中晚三段式投喂，并继续观察增氧联动。',
      }),
    },
    {
      pondId: 'B-01',
      species: '南美白对虾',
      systemStatus: '水体关注',
      waterMetrics: createWaterMetrics({
        updatedAt: '今日 09:36',
        temperature: 28.6,
        oxygen: 5.4,
        ph: 7.9,
        orp: 309,
        turbidity: 21,
        ammonia: 0.22,
        nitrite: 0.07,
        hardness: 181,
      }),
      shrimpMetrics: createShrimpMetrics({
        updatedAt: '今日 09:16',
        length: 8.9,
        weight: 12.4,
        count: 141,
        yield: 18.1,
        cultureDays: 64,
        maturity: 61,
        modelStatus: '局部应激关注',
        modelStatusDescription: '午后水层温差扩大，建议继续复核溶氧变化。',
        modelRecommendation: '午后补氧后再投喂',
        modelRecommendationDescription: '建议先执行增氧联动，再启动少量补投。',
      }),
    },
    {
      pondId: 'C-03',
      species: '日本囊对虾',
      systemStatus: '增长偏快',
      waterMetrics: createWaterMetrics({
        updatedAt: '今日 09:35',
        temperature: 29.3,
        oxygen: 6.2,
        ph: 8.1,
        orp: 327,
        turbidity: 15,
        ammonia: 0.12,
        nitrite: 0.03,
        hardness: 196,
      }),
      shrimpMetrics: createShrimpMetrics({
        updatedAt: '今日 09:14',
        length: 9.4,
        weight: 13.3,
        count: 138,
        yield: 19.6,
        cultureDays: 68,
        maturity: 66,
        modelStatus: '增重良好',
        modelStatusDescription: '该池成熟度提升较快，摄食转化效率高。',
        modelRecommendation: '保持当前投喂并强化巡检',
        modelRecommendationDescription: '建议保持当前投喂量，并增加夜间一次巡检。',
      }),
    },
    {
      pondId: 'D-05',
      species: '斑节对虾',
      systemStatus: '风险预警',
      waterMetrics: createWaterMetrics({
        updatedAt: '今日 09:34',
        temperature: 30.1,
        oxygen: 4.9,
        ph: 8.3,
        orp: 301,
        turbidity: 24,
        ammonia: 0.31,
        nitrite: 0.11,
        hardness: 176,
      }),
      shrimpMetrics: createShrimpMetrics({
        updatedAt: '今日 09:12',
        length: 8.2,
        weight: 10.4,
        count: 134,
        yield: 14.9,
        cultureDays: 59,
        maturity: 49,
        modelStatus: '低氧风险预警',
        modelStatusDescription: '模型识别到低氧和高温叠加风险，需要谨慎投喂。',
        modelRecommendation: '减量投喂并立即复测',
        modelRecommendationDescription: '建议先减量投喂 20%，并在 30 分钟内复测溶氧与氨氮。',
      }),
    },
  ]
}

function createRizhaoProfiles(config: BusinessConfig): PondProfile[] {
  const primaryPondCode = formatPondCode(config, 'R-01')

  return [
    {
      pondId: primaryPondCode,
      species: config.pond.shrimp_species,
      systemStatus: '水体稳定',
      waterMetrics: createWaterMetrics({
        updatedAt: '今日 10:05',
        temperature: 27.2,
        oxygen: 7.4,
        ph: 7.6,
        orp: 334,
        turbidity: 14,
        ammonia: 0.11,
        nitrite: 0.03,
        hardness: 205,
      }),
      shrimpMetrics: createShrimpMetrics({
        updatedAt: '今日 09:54',
        length: 7.9,
        weight: 10.2,
        count: 118,
        yield: 12.6,
        cultureDays: 52,
        maturity: 47,
        modelStatus: '早期增长稳定',
        modelStatusDescription: '摄食曲线平稳，水体缓冲能力充足。',
        modelRecommendation: '常规少量多次投喂',
        modelRecommendationDescription: '建议维持三次投喂，并在傍晚复核料台剩料。',
      }),
    },
    {
      pondId: 'R-02',
      species: '日本囊对虾',
      systemStatus: '摄食关注',
      waterMetrics: createWaterMetrics({
        updatedAt: '今日 10:02',
        temperature: 26.8,
        oxygen: 6.1,
        ph: 7.5,
        orp: 318,
        turbidity: 19,
        ammonia: 0.18,
        nitrite: 0.05,
        hardness: 198,
      }),
      shrimpMetrics: createShrimpMetrics({
        updatedAt: '今日 09:51',
        length: 8.3,
        weight: 11.1,
        count: 112,
        yield: 13.4,
        cultureDays: 57,
        maturity: 53,
        modelStatus: '摄食略弱',
        modelStatusDescription: '午前摄食速度低于同批次虾池，建议观察料台。',
        modelRecommendation: '维持投喂并增加观察',
        modelRecommendationDescription: '建议先不增量，增加一次料台巡查。',
      }),
    },
    {
      pondId: 'R-03',
      species: '南美白对虾',
      systemStatus: '增氧联动',
      waterMetrics: createWaterMetrics({
        updatedAt: '今日 09:58',
        temperature: 28.1,
        oxygen: 5.2,
        ph: 7.9,
        orp: 306,
        turbidity: 22,
        ammonia: 0.24,
        nitrite: 0.08,
        hardness: 186,
      }),
      shrimpMetrics: createShrimpMetrics({
        updatedAt: '今日 09:48',
        length: 8.7,
        weight: 12,
        count: 109,
        yield: 14.1,
        cultureDays: 63,
        maturity: 59,
        modelStatus: '低氧关注',
        modelStatusDescription: '溶氧处于下沿区间，投喂前建议先增氧。',
        modelRecommendation: '增氧后少量投喂',
        modelRecommendationDescription: '建议启动增氧 20 分钟后再执行低量投喂。',
      }),
    },
    {
      pondId: 'R-04',
      species: '斑节对虾',
      systemStatus: '成熟度提升',
      waterMetrics: createWaterMetrics({
        updatedAt: '今日 09:55',
        temperature: 27.6,
        oxygen: 6.7,
        ph: 7.8,
        orp: 329,
        turbidity: 17,
        ammonia: 0.13,
        nitrite: 0.04,
        hardness: 210,
      }),
      shrimpMetrics: createShrimpMetrics({
        updatedAt: '今日 09:45',
        length: 9.1,
        weight: 12.9,
        count: 104,
        yield: 15.7,
        cultureDays: 66,
        maturity: 64,
        modelStatus: '成熟度良好',
        modelStatusDescription: '增重效率较高，后续重点关注夜间溶氧。',
        modelRecommendation: '保持投喂并加强夜巡',
        modelRecommendationDescription: '建议维持当前投喂量，并加入夜间水质复核。',
      }),
    },
  ]
}

function createGenericProfiles(config: BusinessConfig): PondProfile[] {
  const primaryPondCode = formatPondCode(config, 'P-01')

  return [
    {
      pondId: primaryPondCode,
      species: config.pond.shrimp_species,
      systemStatus: '运行稳定',
      waterMetrics: createWaterMetrics({
        updatedAt: '今日 09:46',
        temperature: 27.9,
        oxygen: 6.9,
        ph: 7.8,
        orp: 321,
        turbidity: 17,
        ammonia: 0.15,
        nitrite: 0.04,
        hardness: 194,
      }),
      shrimpMetrics: createShrimpMetrics({
        updatedAt: '今日 09:30',
        length: 8.4,
        weight: 11.2,
        count: 120,
        yield: 13.8,
        cultureDays: 58,
        maturity: 54,
        modelStatus: '状态稳定',
        modelStatusDescription: '当前水体承载和摄食表现均处于稳定区间。',
        modelRecommendation: '常规少量多次投喂',
        modelRecommendationDescription: '建议维持当前投喂节奏，并继续观察午后溶氧。',
      }),
    },
    {
      pondId: 'P-02',
      species: config.pond.shrimp_species,
      systemStatus: '投喂复核',
      waterMetrics: createWaterMetrics({
        updatedAt: '今日 09:42',
        temperature: 28.3,
        oxygen: 6.1,
        ph: 7.9,
        orp: 314,
        turbidity: 20,
        ammonia: 0.19,
        nitrite: 0.06,
        hardness: 188,
      }),
      shrimpMetrics: createShrimpMetrics({
        updatedAt: '今日 09:24',
        length: 8.7,
        weight: 11.9,
        count: 116,
        yield: 14.4,
        cultureDays: 62,
        maturity: 59,
        modelStatus: '局部关注',
        modelStatusDescription: '投喂后料台剩料略高，建议进行一次人工复核。',
        modelRecommendation: '维持投喂并观察料台',
        modelRecommendationDescription: '建议暂不增量，晚间复核摄食情况。',
      }),
    },
    {
      pondId: 'P-03',
      species: config.pond.shrimp_species,
      systemStatus: '增氧联动',
      waterMetrics: createWaterMetrics({
        updatedAt: '今日 09:39',
        temperature: 28.8,
        oxygen: 5.3,
        ph: 8,
        orp: 308,
        turbidity: 23,
        ammonia: 0.23,
        nitrite: 0.08,
        hardness: 182,
      }),
      shrimpMetrics: createShrimpMetrics({
        updatedAt: '今日 09:21',
        length: 8.9,
        weight: 12.3,
        count: 112,
        yield: 15.1,
        cultureDays: 65,
        maturity: 62,
        modelStatus: '低氧关注',
        modelStatusDescription: '溶氧接近下限，建议投喂前先执行增氧观察。',
        modelRecommendation: '增氧后少量投喂',
        modelRecommendationDescription: '建议启动增氧后再执行少量投喂。',
      }),
    },
  ]
}

function createQingdaoRobots(config: BusinessConfig): RobotInfo[] {
  const primaryRobotCode = formatRobotCode(config, 'QD-RB-01')
  const primaryRobotName = formatRobotName(config, '青岛一号投喂巡检机器人')
  const primaryPondCode = formatPondCode(config, 'A-01')

  return [
    {
      id: primaryRobotCode,
      name: primaryRobotName,
      online: true,
      pondId: primaryPondCode,
      currentTask: `${config.robot.robot_type}池面巡航与投喂校验`,
      battery: 82,
      feederStatus: '正常',
      motionStatus: '巡航中',
      lastRunAt: '今日 09:10',
      nextPlanAt: '今日 11:30',
      abnormalStatus: '无',
      commands: ['09:10 执行池面巡航', '08:50 校验投喂机状态', '08:30 上传水质采样结果'],
    },
    {
      id: 'QD-RB-02',
      name: '青岛二号增氧联动机器人',
      online: true,
      pondId: 'A-02',
      currentTask: '增氧区设备观察',
      battery: 76,
      feederStatus: '正常',
      motionStatus: '待命',
      lastRunAt: '今日 08:55',
      nextPlanAt: '今日 10:40',
      abnormalStatus: '无',
      commands: ['08:55 返回待命点', '08:35 完成增氧区巡检', '08:20 接收水质联动任务'],
    },
    {
      id: 'QD-RB-03',
      name: '青岛三号水质采样机器人',
      online: true,
      pondId: 'B-01',
      currentTask: '水质采样与边缘巡检',
      battery: 68,
      feederStatus: '正常',
      motionStatus: '采样中',
      lastRunAt: '今日 09:18',
      nextPlanAt: '今日 12:10',
      abnormalStatus: '无',
      commands: ['09:18 开始水质采样', '09:02 校准采样臂', '08:46 上传边缘点位图像'],
    },
    {
      id: 'QD-RB-04',
      name: '青岛四号料台观察机器人',
      online: true,
      pondId: 'C-03',
      currentTask: '料台摄食行为观察',
      battery: 59,
      feederStatus: '正常',
      motionStatus: '定点观察',
      lastRunAt: '今日 09:05',
      nextPlanAt: '今日 11:05',
      abnormalStatus: '无',
      commands: ['09:05 进入料台观察点', '08:42 完成摄食图像上传', '08:20 接收投喂复核任务'],
    },
    {
      id: 'QD-RB-05',
      name: '青岛五号投喂辅助机器人',
      online: true,
      pondId: 'D-05',
      currentTask: '投喂路径待命',
      battery: 71,
      feederStatus: '正常',
      motionStatus: '待命',
      lastRunAt: '今日 08:48',
      nextPlanAt: '今日 10:30',
      abnormalStatus: '无',
      commands: ['08:48 返回待命点', '08:28 完成路径复核', '08:06 同步投喂计划'],
    },
  ]
}

function createRizhaoRobots(config: BusinessConfig): RobotInfo[] {
  const primaryRobotCode = formatRobotCode(config, 'RZ-RB-01')
  const primaryRobotName = formatRobotName(config, '日照一号投喂巡检机器人')
  const primaryPondCode = formatPondCode(config, 'R-01')

  return [
    {
      id: primaryRobotCode,
      name: primaryRobotName,
      online: true,
      pondId: primaryPondCode,
      currentTask: `${config.robot.robot_type}池面投喂复核`,
      battery: 88,
      feederStatus: '正常',
      motionStatus: '巡航中',
      lastRunAt: '今日 09:42',
      nextPlanAt: '今日 12:00',
      abnormalStatus: '无',
      commands: ['09:42 执行投喂复核', '09:18 上传料台图像', '08:55 完成水体巡检'],
    },
    {
      id: 'RZ-RB-02',
      name: '日照二号水质采样机器人',
      online: true,
      pondId: 'R-02',
      currentTask: '水质采样与浊度复核',
      battery: 73,
      feederStatus: '正常',
      motionStatus: '采样中',
      lastRunAt: '今日 09:25',
      nextPlanAt: '今日 11:50',
      abnormalStatus: '无',
      commands: ['09:25 开始水质采样', '09:04 上传浊度复核结果', '08:40 返回采样点'],
    },
    {
      id: 'RZ-RB-03',
      name: '日照三号增氧观察机器人',
      online: true,
      pondId: 'R-03',
      currentTask: '增氧设备观察',
      battery: 64,
      feederStatus: '正常',
      motionStatus: '待命',
      lastRunAt: '今日 09:20',
      nextPlanAt: '今日 10:35',
      abnormalStatus: '无',
      commands: ['09:20 接收增氧观察任务', '08:58 校验增氧点位', '08:36 上传设备状态'],
    },
    {
      id: 'RZ-RB-04',
      name: '日照四号夜巡机器人',
      online: false,
      pondId: 'R-04',
      currentTask: '等待人工复核',
      battery: 28,
      feederStatus: '正常',
      motionStatus: '离线',
      lastRunAt: '今日 07:50',
      nextPlanAt: '今日 22:00',
      abnormalStatus: '通信中断',
      commands: ['07:50 离线前完成路径复核', '07:22 上传夜巡图像', '06:55 返回待命点'],
    },
  ]
}

function createGenericRobots(config: BusinessConfig): RobotInfo[] {
  const primaryRobotCode = formatRobotCode(config, 'RB-01')
  const primaryRobotName = formatRobotName(config, '一号投喂巡检机器人')
  const primaryPondCode = formatPondCode(config, 'P-01')

  return [
    {
      id: primaryRobotCode,
      name: primaryRobotName,
      online: true,
      pondId: primaryPondCode,
      currentTask: `${config.robot.robot_type}池面巡航`,
      battery: 84,
      feederStatus: '正常',
      motionStatus: '巡航中',
      lastRunAt: '今日 09:35',
      nextPlanAt: '今日 11:20',
      abnormalStatus: '无',
      commands: ['09:35 执行池面巡航', '09:10 校验投喂机状态', '08:48 上传水质采样结果'],
    },
    {
      id: 'RB-02',
      name: '二号水质采样机器人',
      online: true,
      pondId: 'P-02',
      currentTask: '水质采样与料台观察',
      battery: 72,
      feederStatus: '正常',
      motionStatus: '采样中',
      lastRunAt: '今日 09:16',
      nextPlanAt: '今日 12:10',
      abnormalStatus: '无',
      commands: ['09:16 开始水质采样', '08:56 上传料台图像', '08:32 返回采样点'],
    },
    {
      id: 'RB-03',
      name: '三号增氧观察机器人',
      online: true,
      pondId: 'P-03',
      currentTask: '增氧设备观察',
      battery: 66,
      feederStatus: '正常',
      motionStatus: '待命',
      lastRunAt: '今日 09:08',
      nextPlanAt: '今日 10:45',
      abnormalStatus: '无',
      commands: ['09:08 接收增氧观察任务', '08:48 校验增氧点位', '08:20 上传设备状态'],
    },
  ]
}

function waterThresholdToRangeRecord(threshold: WaterThreshold): Record<string, RangeThreshold> {
  return {
    temperature: { ...threshold.temperature },
    oxygen: { ...threshold.oxygen },
    ph: { ...threshold.ph },
    orp: { ...threshold.orp },
    turbidity: { ...threshold.turbidity },
    ammonia: { ...threshold.ammonia },
    nitrite: { ...threshold.nitrite },
    hardness: { ...threshold.hardness },
  }
}

function getOrganizationById(organizationId: string) {
  return (
    getAllOrganizations().find((organization) => organization.id === organizationId) ??
    mockOrganizations[0]!
  )
}

export function getMockUser() {
  return cloneData(mockUsers[0]!)
}

export function getMockOrganizations(userId?: string) {
  const organizations = getAllOrganizations()

  if (!userId) {
    return cloneData(organizations)
  }

  const organizationIds = new Set(
    getAllMembers()
      .filter((member) => member.user_id === userId)
      .map((member) => member.organization_id),
  )

  return cloneData(organizations.filter((organization) => organizationIds.has(organization.id)))
}

export function updateMockOrganization(
  organizationId: string,
  payload: Partial<Organization>,
): Organization | null {
  const currentOrganization = getAllOrganizations().find(
    (organization) => organization.id === organizationId,
  )

  if (!currentOrganization) {
    return null
  }

  const nextName = payload.name?.trim() || currentOrganization.name
  const nextRegion = payload.region?.trim() || currentOrganization.region || '未设置'
  const nextStatus = payload.status?.trim() || currentOrganization.status || '运行中'
  const nextOrganization: Organization = {
    ...currentOrganization,
    ...payload,
    id: currentOrganization.id,
    name: nextName,
    short_name: payload.short_name?.trim() || formatOrganizationShortName(nextName),
    region: nextRegion,
    status: nextStatus,
    updated_at: new Date().toISOString(),
  }
  const overrides = getOrganizationOverrides()
  overrides[organizationId] = {
    ...overrides[organizationId],
    name: nextOrganization.name,
    short_name: nextOrganization.short_name,
    region: nextOrganization.region,
    status: nextOrganization.status,
    updated_at: nextOrganization.updated_at,
  }
  saveOrganizationOverrides(overrides)

  return cloneData(nextOrganization)
}

export function getMockOrganizationMembers() {
  return cloneData(getAllMembers())
}

export function getOrganizationRole(
  userId: string,
  organizationId: string,
): OrganizationRole | null {
  return (
    getAllMembers().find(
      (member) => member.user_id === userId && member.organization_id === organizationId,
    )?.role ?? null
  )
}

export function getDefaultOrganizationId() {
  return DEFAULT_ORGANIZATION_ID
}

export function authenticateMockUser(email: string, password: string): MockSession | null {
  const account = getAllAccounts().find(
    (item) =>
      normalizeEmail(item.user.email) === normalizeEmail(email) && item.password === password,
  )

  if (!account) {
    return null
  }

  return {
    user: cloneData(account.user),
    organizationId: account.organization.id,
    role: account.member.role,
  }
}

export function getSavedMockSession(): MockSession | null {
  const session = readJson<MockSession | null>(AUTH_STORAGE_KEY, null)

  if (!session) {
    return null
  }

  const organization = getMockOrganizations(session.user.id).find(
    (item) => item.id === session.organizationId,
  )
  const role = getOrganizationRole(session.user.id, session.organizationId)

  if (!organization || !role) {
    return null
  }

  return {
    user: session.user,
    organizationId: organization.id,
    role,
  }
}

export function registerMockUser(payload: MockRegisterPayload) {
  const email = normalizeEmail(payload.email)
  const displayName = payload.displayName.trim()
  const organizationName = payload.organizationName.trim()
  const region = payload.region.trim() || '未设置区域'

  if (!displayName || !email || !payload.password || !organizationName) {
    return {
      success: false,
      message: '请完整填写注册信息。',
      session: null,
    }
  }

  if (payload.password.length < 6) {
    return {
      success: false,
      message: '密码至少需要 6 位。',
      session: null,
    }
  }

  if (organizationName.length < 2 || organizationName.length > 50) {
    return {
      success: false,
      message: '企业名称长度建议为 2 到 50 个字。',
      session: null,
    }
  }

  const exists = getAllAccounts().some((account) => normalizeEmail(account.user.email) === email)

  if (exists) {
    return {
      success: false,
      message: '该邮箱已经注册，请直接登录。',
      session: null,
    }
  }

  const user: UserProfile = {
    id: createLocalId('user'),
    display_name: displayName,
    email,
  }
  const organization: Organization = {
    id: createLocalId('org'),
    name: organizationName,
    short_name: formatOrganizationShortName(organizationName),
    region,
    status: '运行中',
  }
  const member: OrganizationMember = {
    id: createLocalId('member'),
    organization_id: organization.id,
    user_id: user.id,
    role: 'owner',
  }
  const account: MockAccount = {
    user,
    password: payload.password,
    organization,
    member,
  }
  const registeredAccounts = getRegisteredAccounts()
  registeredAccounts.push(account)
  saveRegisteredAccounts(registeredAccounts)

  const session: MockSession = {
    user,
    organizationId: organization.id,
    role: member.role,
  }

  saveMockSession(session)

  return {
    success: true,
    message: '注册成功',
    session,
  }
}

export function saveMockSession(session: MockSession) {
  writeJson(AUTH_STORAGE_KEY, session)
}

export function clearMockSession() {
  removeJson(AUTH_STORAGE_KEY)
}

export function getBusinessConfig(organizationId: string) {
  const savedConfigs = readJson<BusinessConfigMap>(BUSINESS_CONFIG_STORAGE_KEY, {})
  return mergeBusinessConfig(savedConfigs[organizationId], organizationId)
}

export function saveBusinessConfig(organizationId: string, config: BusinessConfig) {
  const savedConfigs = readJson<BusinessConfigMap>(BUSINESS_CONFIG_STORAGE_KEY, {})
  savedConfigs[organizationId] = mergeBusinessConfig(config, organizationId)
  writeJson(BUSINESS_CONFIG_STORAGE_KEY, savedConfigs)
}

export function getMockSystemData(organizationId: string): MockSystemData {
  const organization = getOrganizationById(organizationId)
  const businessConfig = getBusinessConfig(organization.id)
  const pondProfiles =
    organization.id === 'org-qingdao'
      ? createQingdaoProfiles(businessConfig)
      : organization.id === 'org-rizhao'
        ? createRizhaoProfiles(businessConfig)
        : createGenericProfiles(businessConfig)
  const robots =
    organization.id === 'org-qingdao'
      ? createQingdaoRobots(businessConfig)
      : organization.id === 'org-rizhao'
        ? createRizhaoRobots(businessConfig)
        : createGenericRobots(businessConfig)
  const selectedProfile = pondProfiles[0]!
  const speciesNames = Array.from(new Set(pondProfiles.map((profile) => profile.species)))

  return {
    systemMeta: {
      systemName: '虾群养殖投喂系统',
      logoText: organization.short_name,
      online: true,
      currentPondId: selectedProfile.pondId,
      currentStatus: selectedProfile.systemStatus,
    },
    pondProfiles,
    waterMetrics: cloneMetrics(selectedProfile.waterMetrics),
    shrimpMetrics: cloneMetrics(selectedProfile.shrimpMetrics),
    robots,
    thresholds: {
      water: waterThresholdToRangeRecord(businessConfig.waterThreshold),
      shrimp: {
        length: { min: 6, max: 13 },
        weight: { min: 8, max: 20 },
        count: { min: 100, max: 170 },
        yield: { min: 10, max: 28 },
        cultureDays: { min: 45, max: 90 },
        maturity: { min: 45, max: 85 },
      },
      robot: {
        minBattery: 30,
        requireOnline: true,
        normalFeederStatus: '正常',
        normalAbnormalStatus: '无',
      },
      model: {
        abnormalKeywords: ['异常', '风险', '预警', '低氧', '病害'],
        recommendationRiskKeywords: ['暂停', '减量', '复测', '风险抑制'],
      },
    },
    pondConfig: {
      pondIds: pondProfiles.map((profile) => profile.pondId),
      selectedPondId: selectedProfile.pondId,
    },
    shrimpConfig: {
      species: speciesNames.join('、'),
      targetRanges: {
        length: { min: 6, max: 13 },
        weight: { min: 8, max: 20 },
        maturity: { min: 45, max: 85 },
      },
    },
    robotConfig: {
      robots: robots.map((robot) => ({
        id: robot.id,
        name: robot.name,
        pondId: robot.pondId,
      })),
    },
    businessConfig: cloneBusinessConfig(businessConfig),
  }
}
