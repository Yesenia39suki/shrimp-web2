<script setup lang="ts">
import { useShrimpSystemStore } from '@/stores/shrimpSystem'

const store = useShrimpSystemStore()

function getRobotAlerts(robotId: string) {
  return store.robotAlerts.filter((alert) => alert.id.includes(robotId))
}
</script>

<template>
  <section class="robot-page">
    <div class="page-head">
      <div>
        <span>机器人实时监测</span>
        <h1>机器人状态与指令记录</h1>
        <p>在线状态、任务执行、电量、投喂机与最近指令统一监测</p>
      </div>
      <strong>{{ store.robotAlerts.length }} 条机器人异常</strong>
    </div>

    <div class="robot-grid">
      <article v-for="robot in store.robots" :key="robot.id" class="robot-panel">
        <div class="robot-title">
          <div>
            <span>{{ robot.id }}</span>
            <strong>{{ robot.name }}</strong>
          </div>
          <em :class="{ online: robot.online }">{{ robot.online ? '在线' : '离线' }}</em>
        </div>

        <dl class="robot-info">
          <div>
            <dt>当前所在虾池</dt>
            <dd>{{ robot.pondId }}</dd>
          </div>
          <div>
            <dt>当前任务</dt>
            <dd>{{ robot.currentTask }}</dd>
          </div>
          <div>
            <dt>电量</dt>
            <dd>{{ robot.battery }}%</dd>
          </div>
          <div>
            <dt>投喂机状态</dt>
            <dd>{{ robot.feederStatus }}</dd>
          </div>
          <div>
            <dt>运动状态</dt>
            <dd>{{ robot.motionStatus }}</dd>
          </div>
          <div>
            <dt>上次执行时间</dt>
            <dd>{{ robot.lastRunAt }}</dd>
          </div>
          <div>
            <dt>下次计划时间</dt>
            <dd>{{ robot.nextPlanAt }}</dd>
          </div>
          <div>
            <dt>异常状态</dt>
            <dd>{{ robot.abnormalStatus }}</dd>
          </div>
        </dl>

        <div class="battery-track">
          <span>电量状态</span>
          <div>
            <i :style="{ width: `${robot.battery}%` }"></i>
          </div>
          <strong>{{ robot.battery }}%</strong>
        </div>

        <div class="robot-alerts">
          <strong>异常判断</strong>
          <span v-if="getRobotAlerts(robot.id).length === 0">当前无异常</span>
          <span v-for="alert in getRobotAlerts(robot.id)" v-else :key="alert.id">{{
            alert.type
          }}</span>
        </div>

        <div class="commands">
          <strong>最近指令记录</strong>
          <p v-for="command in robot.commands" :key="command">{{ command }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.robot-page {
  height: 100%;
  display: grid;
  grid-template-rows: 74px minmax(0, 1fr);
  gap: 12px;
  overflow: hidden;
}

.page-head,
.robot-panel {
  background:
    linear-gradient(180deg, rgba(34, 100, 228, 0.12), rgba(14, 48, 126, 0.08)),
    rgba(10, 36, 94, 0.16);
  border: 1px solid rgba(121, 210, 255, 0.16);
  box-shadow: 0 14px 30px rgba(8, 24, 65, 0.18);
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
}

.page-head span {
  color: var(--cyan);
  font-size: 13px;
}

.page-head h1 {
  margin: 6px 0 0;
  color: var(--text-main);
  font-size: 24px;
}

.page-head p {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.page-head strong {
  padding: 8px 12px;
  color: var(--warning);
  font-size: 14px;
  background: rgba(255, 191, 107, 0.08);
  border: 1px solid rgba(255, 191, 107, 0.18);
}

.robot-grid {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: minmax(520px, max-content);
  align-content: start;
  gap: 12px;
  overflow: auto;
  padding-right: 4px;
  overscroll-behavior: contain;
}

.robot-panel {
  min-height: 0;
  max-height: 100%;
  display: grid;
  grid-template-rows: 58px auto auto auto minmax(120px, 1fr);
  overflow: auto;
  overscroll-behavior: contain;
}

.robot-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: rgba(12, 40, 104, 0.22);
  border-bottom: 1px solid rgba(121, 210, 255, 0.1);
}

.robot-title span {
  display: block;
  color: var(--cyan);
  font-size: 12px;
}

.robot-title strong {
  display: block;
  margin-top: 4px;
  color: var(--text-main);
  font-size: 16px;
}

.robot-title em {
  padding: 4px 9px;
  color: #ff7c7c;
  font-style: normal;
  background: rgba(255, 124, 124, 0.1);
  border: 1px solid rgba(255, 124, 124, 0.18);
}

.robot-title em.online {
  color: #69e2a4;
  background: rgba(105, 226, 164, 0.1);
  border-color: rgba(105, 226, 164, 0.18);
}

.robot-info {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 14px;
  margin: 0;
}

.robot-info div {
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(91, 214, 255, 0.1);
}

.battery-track {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr) 46px;
  align-items: center;
  gap: 10px;
  margin: 0 14px 14px;
  padding: 10px;
  background: rgba(16, 54, 138, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.1);
}

.battery-track span {
  color: var(--text-muted);
  font-size: 12px;
}

.battery-track div {
  height: 8px;
  overflow: hidden;
  background: rgba(3, 16, 30, 0.78);
  border: 1px solid rgba(91, 214, 255, 0.12);
}

.battery-track i {
  height: 100%;
  display: block;
  background: linear-gradient(90deg, #5bd6ff, #69e2a4);
}

.battery-track strong {
  color: var(--text-main);
  font-size: 12px;
}

dt,
.commands strong,
.robot-alerts strong {
  color: var(--text-muted);
  font-size: 12px;
}

dd {
  margin: 5px 0 0;
  color: var(--text-main);
  font-size: 13px;
}

.robot-alerts,
.commands {
  min-height: 0;
  margin: 0 14px 14px;
  padding: 10px;
  background: rgba(16, 54, 138, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.1);
}

.commands {
  overflow: auto;
}

.robot-alerts span {
  display: block;
  margin-top: 6px;
  color: var(--text-normal);
  font-size: 13px;
}

.commands p {
  position: relative;
  margin: 8px 0 0 10px;
  padding-left: 14px;
  color: var(--text-normal);
  font-size: 13px;
}

.commands p::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  width: 6px;
  height: 6px;
  background: var(--cyan);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(91, 214, 255, 0.7);
}
</style>
