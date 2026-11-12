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

    <section class="login-shell">
      <div class="login-identity">
        <span class="logo-mark"><i></i></span>
        <div>
          <strong>智慧虾投喂管理系统</strong>
          <em>多企业养殖数据隔离控制台</em>
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
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: clamp(16px, 4vw, 48px);
  color: var(--text-normal);
  background:
    radial-gradient(circle at 50% 42%, rgba(74, 169, 255, 0.18), transparent 42%),
    linear-gradient(180deg, #0a2e74 0%, #071c48 100%);
}

.login-shell {
  position: relative;
  z-index: 1;
  width: min(860px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(350px, 0.9fr);
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 18%, rgba(121, 210, 255, 0.14), transparent 34%),
    linear-gradient(135deg, rgba(20, 78, 197, 0.32), rgba(6, 24, 64, 0.88));
  border: 1px solid var(--border-cyan);
  border-radius: 24px;
  box-shadow: 0 12px 28px rgba(10, 29, 52, 0.22);
}

.login-identity {
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 22px;
  padding: clamp(28px, 5vw, 62px);
  background: rgba(5, 20, 51, 0.28);
}

.logo-mark {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  background: radial-gradient(circle, rgba(74, 169, 255, 0.24), rgba(16, 51, 125, 0.48) 62%);
  border: 1px solid var(--border-cyan-strong);
  border-radius: 14px;
}

.logo-mark i {
  width: 20px;
  height: 20px;
  border: 2px solid #7aeec3;
  border-right-color: #5bd6ff;
  border-radius: 50%;
}

.login-identity strong {
  display: block;
  max-width: 330px;
  color: var(--text-main);
  font-size: clamp(26px, 3.5vw, 36px);
  font-weight: 650;
  letter-spacing: -0.04em;
  line-height: 1.18;
  text-wrap: balance;
}

.login-identity em {
  display: block;
  margin-top: 12px;
  color: var(--text-muted);
  font-size: 14px;
  font-style: normal;
}

.login-panel {
  display: grid;
  align-content: center;
  gap: 15px;
  padding: clamp(26px, 3.8vw, 46px);
  color: var(--text-main);
  background: rgba(3, 16, 42, 0.78);
}

.register-panel {
  gap: 12px;
}

.panel-head {
  margin-bottom: 7px;
}

.panel-head span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.panel-head h1 {
  margin: 5px 0 0;
  font-size: clamp(23px, 3vw, 31px);
  font-weight: 650;
  letter-spacing: -0.035em;
  line-height: 1.2;
}

.panel-head p {
  margin: 9px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
}

label {
  display: grid;
  gap: 5px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
}

input {
  width: 100%;
  min-height: 42px;
  padding: 8px 12px;
  color: var(--text-main);
  color-scheme: dark;
  background: rgba(8, 30, 78, 0.86);
  border: 1px solid var(--border-cyan);
  border-radius: 12px;
  font-weight: 400;
}

input::placeholder {
  color: var(--text-subtle);
}

input:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 2px;
}

button {
  min-height: 42px;
  padding: 7px 16px;
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(180deg, rgba(23, 101, 180, 0.95), rgba(8, 58, 118, 0.95));
  border: 1px solid var(--border-cyan-strong);
  border-radius: 999px;
  cursor: pointer;
}

button:hover:not(:disabled) {
  border-color: var(--cyan-soft);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.error-message,
.info-message {
  margin: 0;
  padding: 9px 11px;
  border-radius: var(--control-radius);
  font-size: 13px;
}

.error-message {
  color: #ffd3d8;
  background: rgba(255, 111, 125, 0.14);
}

.info-message {
  color: #d8ffe8;
  background: rgba(105, 226, 164, 0.12);
}

.text-button {
  min-height: 32px;
  padding: 4px 8px;
  color: var(--cyan-soft);
  font-size: 13px;
  background: transparent;
  border-color: transparent;
}

.text-button:hover:not(:disabled) {
  background: var(--panel-title-bg);
}

@media (max-width: 690px) {
  .login-shell { max-width: 450px; grid-template-columns: minmax(0, 1fr); }
  .login-identity { grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 12px; padding: 20px 24px; }
  .login-identity strong { font-size: 21px; }
  .login-identity em { margin-top: 3px; font-size: 12px; }
  .logo-mark { width: 36px; height: 36px; }
  .logo-mark i { width: 15px; height: 15px; }
}
</style>
