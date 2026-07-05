export const API_ENDPOINTS = {
  hardware: {
    ingestWater: '/functions/v1/ingest-water',
    ingestDeviceHeartbeat: '/functions/v1/ingest-device-heartbeat',
    ingestRobotStatus: '/functions/v1/ingest-robot-status',
    ingestRobotPosition: '/functions/v1/ingest-robot-position',
    robotCommandAck: '/functions/v1/robot-command-ack',
  },
  robotControl: {
    createRobotCommand: '/functions/v1/create-robot-command',
    cancelRobotCommand: '/functions/v1/cancel-robot-command',
    getRobotCommandStatus: '/functions/v1/get-robot-command-status',
  },
  ai: {
    evaluatePond: '/functions/v1/ai-evaluate-pond',
    feedingAdvice: '/functions/v1/ai-feeding-advice',
    explainAlert: '/functions/v1/ai-explain-alert',
    generateReport: '/functions/v1/ai-generate-report',
    chat: '/functions/v1/ai-chat',
    detectAnomalies: '/functions/v1/ai-detect-anomalies',
    planRobotTask: '/functions/v1/ai-plan-robot-task',
    feedback: '/functions/v1/ai-feedback',
    modelConfig: '/functions/v1/ai-model-config',
    requestLogs: '/functions/v1/ai-request-logs',
  },
  files: {
    uploadSceneModel: '/functions/v1/upload-scene-model',
    uploadRobotModel: '/functions/v1/upload-robot-model',
    getSceneConfig: '/functions/v1/get-scene-config',
  },
} as const

export type ApiEndpointGroup = keyof typeof API_ENDPOINTS
