<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import QingdaoMapBackground from '@/components/system/QingdaoMapBackground.vue'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const registerDisplayName = ref('')
const registerEmail = ref('')
const registerPassword = ref('')
const registerOrganizationName = ref('')
const registerRegion = ref('')
const errorMessage = ref('')
const infoMessage = ref('')
const loading = ref(false)

function getRedirectPath() {
  const redirect = route.query.redirect

  if (typeof redirect !== 'string' || redirect.startsWith('/login')) {
    return '/system'
  }

  return redirect
}

async function handleLogin() {
  errorMessage.value = ''
  infoMessage.value = ''
  loading.value = true

  const result = await authStore.login(email.value, password.value)

  if (!result.success) {
    loading.value = false
    errorMessage.value = result.message
    return
  }

  loading.value = false
  router.replace(getRedirectPath())
}

async function handleRegister() {
  errorMessage.value = ''
  infoMessage.value = ''

  const organizationName = registerOrganizationName.value.trim()

  if (!organizationName) {
    errorMessage.value = '请输入企业或养殖场名称。'
    return
  }

  if (organizationName.length < 2 || organizationName.length > 50) {
    errorMessage.value = '企业名称长度建议为 2 到 50 个字。'
    return
  }

  loading.value = true

  const result = await authStore.register({
    displayName: registerDisplayName.value,
    email: registerEmail.value,
    password: registerPassword.value,
    organizationName,
    region: registerRegion.value,
  })

  if (!result.success) {
    loading.value = false
    errorMessage.value = result.message
    return
  }

  loading.value = false
  infoMessage.value = result.message

  if (authStore.isLoggedIn) {
    router.replace('/system')
  } else {
    mode.value = 'login'
  }
}

function switchMode(nextMode: 'login' | 'register') {
  mode.value = nextMode
  errorMessage.value = ''
  infoMessage.value = ''
}
</script>

<template>
  <main class="login-page">
    <QingdaoMapBackground />
    <div class="map-labels" aria-hidden="true">
      <span>养殖区域示意图</span>
      <span>池塘监测区域</span>
      <span>虾池数据隔离节点</span>
    </div>

    <section class="login-shell">
      <div class="login-identity">
        <span class="logo-mark"><i></i></span>
        <div>
          <strong>智慧虾投喂管理系统</strong>
          <em>多企业养殖数据隔离控制台</em>
          <p>账号只加载所属企业、所属虾池、所属机器人和本地配置数据。</p>
        </div>
      </div>

      <form v-if="mode === 'login'" class="login-panel" @submit.prevent="handleLogin">
        <div class="panel-head">
          <span>账号登录</span>
          <h1>进入系统工作台</h1>
          <p>登录后只加载当前账号所属企业的数据。</p>
        </div>

        <label>
          <span>邮箱</span>
          <input v-model.trim="email" type="email" autocomplete="email" placeholder="请输入邮箱" />
        </label>

        <label>
          <span>密码</span>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="请输入密码"
          />
        </label>

        <button type="submit" :disabled="loading">
          {{ loading ? '登录中' : '登录' }}
        </button>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <p v-if="infoMessage" class="info-message">{{ infoMessage }}</p>

        <button type="button" class="text-button" @click="switchMode('register')">
          注册新企业账号
        </button>
      </form>

      <form v-else class="login-panel register-panel" @submit.prevent="handleRegister">
        <div class="panel-head">
          <span>账号注册</span>
          <h1>创建企业工作台</h1>
          <p>注册后创建独立空企业空间，池塘由您进入系统后添加。</p>
        </div>

        <label>
          <span>用户名称</span>
          <input v-model.trim="registerDisplayName" type="text" placeholder="请输入用户名称" />
        </label>

        <label>
          <span>企业名称</span>
          <input
            v-model.trim="registerOrganizationName"
            type="text"
            required
            minlength="2"
            maxlength="50"
            placeholder="请输入企业或养殖场名称"
          />
        </label>

        <label>
          <span>所在区域</span>
          <input v-model.trim="registerRegion" type="text" placeholder="例如：某某养殖基地" />
        </label>

        <label>
          <span>邮箱</span>
          <input v-model.trim="registerEmail" type="email" placeholder="请输入邮箱" />
        </label>

        <label>
          <span>密码</span>
          <input
            v-model="registerPassword"
            type="password"
            autocomplete="new-password"
            placeholder="至少 6 位"
          />
        </label>

        <button type="submit" :disabled="loading">
          {{ loading ? '注册中' : '注册并进入系统' }}
        </button>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <p v-if="infoMessage" class="info-message">{{ infoMessage }}</p>

        <button type="button" class="text-button" @click="switchMode('login')">
          已有账号，返回登录
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  position: relative;
  width: 100%;
  height: 100vh;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: var(--text-normal);
  background:
    linear-gradient(rgba(91, 214, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(91, 214, 255, 0.04) 1px, transparent 1px),
    radial-gradient(circle at 50% 42%, rgba(74, 169, 255, 0.18), transparent 42%),
    linear-gradient(180deg, #0a2e74 0%, #071c48 100%);
  background-size:
    44px 44px,
    44px 44px,
    auto,
    auto;
}

.login-page::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(circle at 62% 48%, transparent 0 34%, rgba(4, 14, 36, 0.24) 58%),
    linear-gradient(90deg, rgba(3, 12, 34, 0.24), rgba(3, 12, 34, 0.12) 46%, rgba(3, 12, 34, 0.54));
}

.map-labels {
  position: absolute;
  left: 72px;
  bottom: 54px;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.map-labels span {
  padding: 7px 10px;
  color: rgba(223, 248, 255, 0.9);
  font-size: 12px;
  background: rgba(8, 30, 78, 0.5);
  border: 1px solid rgba(121, 210, 255, 0.22);
}

.login-shell {
  position: relative;
  z-index: 3;
  width: min(920px, calc(100vw - 48px));
  min-height: 560px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 18%, rgba(121, 210, 255, 0.14), transparent 34%),
    linear-gradient(135deg, rgba(20, 78, 197, 0.32), rgba(6, 24, 64, 0.88));
  border: 1px solid rgba(121, 210, 255, 0.22);
  box-shadow: 0 22px 58px rgba(4, 12, 38, 0.42);
}

.login-identity {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 42px;
  background:
    linear-gradient(112deg, transparent 0 42%, rgba(121, 210, 255, 0.07) 43%, transparent 46% 100%),
    rgba(5, 20, 51, 0.28);
}

.logo-mark {
  position: relative;
  width: 54px;
  height: 54px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(121, 210, 255, 0.82);
  background: radial-gradient(circle, rgba(74, 169, 255, 0.24), rgba(16, 51, 125, 0.48) 62%);
  box-shadow:
    0 0 18px rgba(121, 210, 255, 0.34),
    0 0 0 6px rgba(27, 93, 247, 0.08);
}

.logo-mark i {
  width: 22px;
  height: 22px;
  border: 4px solid #7aeec3;
  border-right-color: #5bd6ff;
  border-radius: 50%;
}

.login-identity strong {
  display: block;
  color: #ffffff;
  font-size: 30px;
  font-weight: 800;
}

.login-identity em {
  display: block;
  margin-top: 10px;
  color: var(--text-muted);
  font-size: 14px;
  font-style: normal;
}

.login-identity p {
  max-width: 340px;
  margin: 18px 0 0;
  color: rgba(223, 248, 255, 0.86);
  font-size: 13px;
  line-height: 1.7;
}

.login-panel {
  display: grid;
  align-content: center;
  gap: 14px;
  padding: 32px 34px;
  background: rgba(3, 16, 42, 0.78);
  border-left: 1px solid rgba(121, 210, 255, 0.16);
}

.register-panel {
  gap: 12px;
}

.panel-head span {
  color: var(--cyan);
  font-size: 13px;
}

.panel-head h1 {
  margin: 8px 0 0;
  color: var(--text-main);
  font-size: 24px;
}

.panel-head p {
  margin: 8px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.6;
}

label {
  display: grid;
  gap: 8px;
}

label span {
  color: var(--text-muted);
  font-size: 13px;
}

input {
  height: 40px;
  padding: 0 12px;
  color: var(--text-main);
  background: rgba(8, 30, 78, 0.86);
  border: 1px solid rgba(121, 210, 255, 0.18);
  outline: none;
}

input:focus {
  border-color: rgba(121, 210, 255, 0.48);
  box-shadow: 0 0 0 2px rgba(91, 214, 255, 0.08);
}

button {
  height: 42px;
  color: #ffffff;
  font-weight: 700;
  background: linear-gradient(180deg, rgba(23, 101, 180, 0.95), rgba(8, 58, 118, 0.95));
  border: 1px solid rgba(121, 210, 255, 0.36);
  cursor: pointer;
}

button:disabled {
  color: rgba(223, 248, 255, 0.6);
  cursor: not-allowed;
  opacity: 0.72;
}

.error-message,
.info-message {
  margin: 0;
  padding: 9px 10px;
  font-size: 13px;
}

.error-message {
  color: #ffd3d8;
  background: rgba(255, 111, 125, 0.1);
  border: 1px solid rgba(255, 111, 125, 0.22);
}

.info-message {
  color: #d8ffe8;
  background: rgba(105, 226, 164, 0.1);
  border: 1px solid rgba(105, 226, 164, 0.2);
}

.text-button {
  height: auto;
  min-height: 30px;
  padding: 6px 8px;
  color: var(--text-normal);
  font-size: 12px;
  font-weight: 400;
  text-align: left;
  background: rgba(8, 30, 78, 0.62);
  border: 1px solid rgba(121, 210, 255, 0.14);
}

.text-button:hover {
  border-color: rgba(121, 210, 255, 0.32);
}

.text-button {
  color: var(--cyan-soft);
  text-align: center;
  background: transparent;
}
</style>
