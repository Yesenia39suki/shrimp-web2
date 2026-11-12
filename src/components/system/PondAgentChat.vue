<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import AgentReplyText from '@/components/system/AgentReplyText.vue'
import { isSupabaseMode } from '@/config/dataSource'
import { askAgent, type AgentChatReply } from '@/services/agentChatService'
import { useAuthStore } from '@/stores/authStore'
import { useShrimpSystemStore } from '@/stores/shrimpSystem'

const auth = useAuthStore()
const system = useShrimpSystemStore()
const organizationId = computed(() => auth.currentOrganization?.id)
const pond = computed(() =>
  system.ponds.find(
    (item) =>
      item.organization_id === organizationId.value &&
      item.pond_code === system.pondConfig.selectedPondId,
  ),
)

interface ReplySection {
  heading: string
  text: string
}

const metricNames = [
  '温度|水温|水体温度|溶解氧|溶氧|DO',
  String.raw`pH(?:\s*[（(]酸碱度[）)])?|酸碱度(?:\s*[（(]pH[）)])?`,
  '氧化还原电位|ORP|浊度|氨氮|总氨氮|亚硝酸盐(?:氮)?',
  String.raw`钙\s*[/／]\s*镁硬度|总硬度|硬度|总碱度|碱度|盐度|透明度`,
].join('|')
const metricLabel = String.raw`(?:[A-Z0-9][A-Z0-9_-]*[ \t]+)?(?:${metricNames})(?:[ \t]*(?:值|浓度))?`
const metricStart = String.raw`${metricLabel}(?=[ \t]*(?:[:：]|(?:为|是|约为?)[ \t]*[+\-−]?\d|$))`
const metricHeading = new RegExp(`^${metricStart}`, 'i')
const metricBreak = new RegExp(String.raw`\r?\n|(?<=[。；;])(?=[ \t]*${metricStart})`, 'i')

function splitReply(answer: string): ReplySection[] {
  const sections: ReplySection[] = []

  for (const paragraph of answer.split(/\r?\n[ \t]*\r?\n/)) {
    let section: ReplySection = { heading: '', text: '' }
    for (const line of paragraph.split(metricBreak)) {
      const text = line.trimStart()
      const label =
        text.match(metricHeading)?.[0] ?? text.match(/^(?:建议|公开参考)(?=[ \t]*[:：]|$)/)?.[0]
      if (label) {
        if (section.text || section.heading) sections.push(section)
        section = { heading: label, text: text.slice(label.length).replace(/^[ \t]*[:：]?[ \t]*/, '') }
      } else {
        section.text += section.text ? `\n${line}` : line
      }
    }
    if (section.text || section.heading) sections.push(section)
  }

  return sections
}

const opened = ref(false)
const draft = ref('')
const error = ref('')
const pendingQuestion = ref('')
const turns = ref<Array<AgentChatReply & { question: string; sections: ReplySection[] }>>([])
const conversation = ref<HTMLElement | null>(null)
const input = ref<HTMLTextAreaElement | null>(null)
const launcher = ref<HTMLButtonElement | null>(null)
let activeRequest: AbortController | null = null

const issueDateFormat = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function resetConversation() {
  activeRequest?.abort()
  activeRequest = null
  turns.value = []
  pendingQuestion.value = ''
  draft.value = ''
  error.value = ''
}

watch([() => auth.currentUser?.id, organizationId, () => pond.value?.id], resetConversation, {
  flush: 'sync',
})
onBeforeUnmount(() => activeRequest?.abort())

watch(
  [pendingQuestion, error, opened],
  () => {
    if (conversation.value) conversation.value.scrollTop = conversation.value.scrollHeight
  },
  { flush: 'post' },
)

watch(
  () => turns.value.length,
  (count, previous) => {
    if (count > previous && conversation.value) {
      const latest = conversation.value.querySelector<HTMLElement>('.chat-turn:last-of-type')
      if (latest) conversation.value.scrollTop = latest.offsetTop
    }
  },
  { flush: 'post' },
)

async function toggleChat() {
  opened.value = !opened.value
  await nextTick()
  if (opened.value) input.value?.focus()
  else launcher.value?.focus()
}

async function sendQuestion() {
  const question = draft.value.trim()
  if (!question || activeRequest || !isSupabaseMode) return

  const controller = new AbortController()
  activeRequest = controller
  pendingQuestion.value = question
  draft.value = ''
  error.value = ''

  try {
    const reply = await askAgent(
      question,
      pond.value?.id ?? null,
      turns.value.slice(-4).map(({ question, answer }) => ({ question, answer })),
      controller.signal,
    )
    if (!controller.signal.aborted) {
      turns.value.push({ question, ...reply, sections: splitReply(reply.answer) })
    }
  } catch (cause) {
    if (!controller.signal.aborted) {
      error.value = cause instanceof Error ? cause.message : '发送失败，请稍后重试。'
      draft.value = question
    }
  } finally {
    if (activeRequest === controller) {
      activeRequest = null
      pendingQuestion.value = ''
      if (opened.value) void nextTick(() => input.value?.focus())
    }
  }
}

function handleEnter(event: KeyboardEvent) {
  if (event.isComposing) return
  event.preventDefault()
  void sendQuestion()
}
</script>

<template>
  <Teleport to="body">
    <section
      v-if="opened"
      id="pond-agent-chat"
      class="pond-agent-chat"
      aria-labelledby="pond-agent-title"
      @keydown.esc.stop="toggleChat"
    >
      <header class="chat-header">
        <div>
          <strong id="pond-agent-title">AI助手</strong>
          <span>{{ pond ? `当前池塘 · ${pond.pond_code}` : '通用养殖问答' }}</span>
        </div>
        <div class="chat-actions">
          <button
            type="button"
            :disabled="!turns.length && !pendingQuestion"
            @click="resetConversation"
          >
            新对话
          </button>
          <button type="button" class="chat-close" aria-label="收起AI助手" @click="toggleChat">
            ×
          </button>
        </div>
      </header>

      <div ref="conversation" class="conversation" role="log" aria-label="对话内容">
        <p v-if="!turns.length && !pendingQuestion && !error" class="chat-empty">
          {{
            isSupabaseMode
              ? '可以询问当前池塘的数据，或查找公开养殖资料。'
              : '使用正式账号登录后即可开始对话。'
          }}
        </p>
        <div v-for="(turn, index) in turns" :key="index" class="chat-turn">
          <p class="question">{{ turn.question }}</p>
          <div class="answer">
            <div
              v-for="(section, sectionIndex) in turn.sections"
              :key="sectionIndex"
              class="answer-section"
            >
              <h4 v-if="section.heading" class="answer-heading">{{ section.heading }}</h4>
              <p v-if="section.text"><AgentReplyText :text="section.text" /></p>
            </div>
            <ol v-if="turn.issues.length" class="warning-items" aria-label="逐条预警及处理建议">
              <li v-for="issue in turn.issues" :key="issue.id" class="warning-item">
                <h4 class="answer-heading">{{ issue.title }}</h4>
                <p class="warning-meta">
                  {{ issue.status }}
                  <time v-if="issue.recorded_at" :datetime="issue.recorded_at">
                    · {{ issueDateFormat.format(new Date(issue.recorded_at)) }}
                  </time>
                </p>
                <dl>
                  <dt>触发经过</dt>
                  <dd><AgentReplyText :text="issue.trigger" /></dd>
                  <dt>可能影响</dt>
                  <dd><AgentReplyText :text="issue.impact" /></dd>
                  <dt>处理步骤</dt>
                  <dd>
                    <ol class="warning-steps">
                      <li v-for="(action, actionIndex) in issue.actions" :key="actionIndex">
                        <AgentReplyText :text="action" />
                      </li>
                    </ol>
                  </dd>
                  <dt>复核</dt>
                  <dd><AgentReplyText :text="issue.verify" /></dd>
                </dl>
              </li>
            </ol>
            <div v-if="turn.sources.length" class="chat-sources">
              <strong>公开资料</strong>
              <ul>
                <li v-for="source in turn.sources" :key="source.source_id">
                  <a :href="source.url" target="_blank" rel="noopener noreferrer"
                    >{{ source.title }} ↗</a
                  >
                </li>
              </ul>
            </div>
            <details v-if="turn.evidence.length">
              <summary>查看池塘数据（{{ turn.evidence.length }}）</summary>
              <ul>
                <li v-for="fact in turn.evidence" :key="fact.fact_id">
                  <AgentReplyText :text="fact.statement" />
                </li>
              </ul>
            </details>
            <p v-if="turn.search_note" class="search-note">{{ turn.search_note }}</p>
          </div>
        </div>
        <template v-if="pendingQuestion">
          <p class="question">{{ pendingQuestion }}</p>
          <p class="chat-pending" role="status">思考中</p>
        </template>
        <p v-if="error" class="chat-error" role="alert">{{ error }}</p>
      </div>

      <form class="chat-composer" @submit.prevent="sendQuestion">
        <textarea
          ref="input"
          v-model="draft"
          aria-label="输入问题"
          placeholder="输入养殖问题"
          maxlength="600"
          rows="2"
          :disabled="Boolean(pendingQuestion) || !isSupabaseMode"
          @keydown.enter.exact="handleEnter"
        />
        <button
          type="submit"
          :disabled="!draft.trim() || Boolean(pendingQuestion) || !isSupabaseMode"
        >
          发送
        </button>
      </form>
    </section>

    <button
      ref="launcher"
      type="button"
      class="chat-launcher"
      :aria-expanded="opened"
      :aria-controls="opened ? 'pond-agent-chat' : undefined"
      @click="toggleChat"
    >
      AI助手
    </button>
  </Teleport>
</template>

<style scoped>
.pond-agent-chat,
.chat-launcher {
  position: fixed;
  z-index: 40;
}

.chat-launcher {
  top: 50%;
  right: 0;
  width: 40px;
  min-height: 108px;
  display: grid;
  place-items: center;
  padding: 12px 8px;
  color: var(--on-primary);
  border: 1px solid var(--border-cyan-strong);
  border-right: 0;
  border-radius: 12px 0 0 12px;
  background: var(--overlay-bg);
  transform: translateY(-50%);
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: 0.12em;
  cursor: pointer;
}

.chat-launcher:hover,
.chat-launcher[aria-expanded='true'] {
  background: var(--primary-blue);
}

.chat-launcher:focus-visible {
  outline-offset: -4px;
}

.pond-agent-chat {
  top: clamp(12px, 9dvh, 80px);
  right: 48px;
  bottom: max(12px, env(safe-area-inset-bottom));
  width: min(436px, calc(100vw - 56px));
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  color: var(--text-normal);
  border: 1px solid var(--border-cyan-strong);
  border-radius: var(--panel-radius);
  background: var(--overlay-bg);
  box-shadow: var(--surface-shadow);
}

.chat-header,
.chat-composer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  background: var(--panel-bg);
}

.chat-header {
  justify-content: space-between;
  border-bottom: 1px solid var(--border-cyan);
}

.chat-header strong {
  color: var(--text-main);
  font-size: 15px;
  font-weight: 650;
}

.chat-header span {
  display: block;
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 12px;
}

.chat-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pond-agent-chat button {
  padding: 5px 7px;
  color: var(--text-normal);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
}

.pond-agent-chat button:hover:not(:disabled) {
  background: var(--panel-title-bg);
}

.pond-agent-chat button:disabled {
  opacity: 0.5;
  cursor: default;
}

.pond-agent-chat .chat-close {
  font-size: 19px;
  line-height: 1;
}

.conversation {
  position: relative;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 16px 14px;
  overscroll-behavior: contain;
}

.chat-turn {
  padding: 13px 0;
  border-bottom: 1px solid var(--border-cyan);
}

.conversation p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.65;
}

.conversation .question {
  margin: 0 0 10px;
  padding: 6px 9px;
  color: var(--text-main);
  border-left: 2px solid var(--cyan-soft);
  background: var(--panel-bg-strong);
  font-size: 14px;
  font-weight: 600;
}

.conversation > .question {
  margin-top: 13px;
}

.answer {
  font-size: 14px;
}

.answer-section + .answer-section {
  margin-top: 8px;
}

.answer-section:has(.answer-heading) + .answer-section:has(.answer-heading) {
  margin-top: 12px;
}

.answer-heading {
  margin: 0 0 4px;
  color: var(--text-main);
  font-size: 15px;
  font-weight: 650;
  line-height: 1.45;
}

.warning-items {
  margin: 12px 0 0;
  padding-left: 21px;
}

.warning-item {
  padding: 10px 0 12px 2px;
  border-top: 1px solid var(--border-cyan);
  line-height: 1.55;
}

.warning-item::marker {
  color: var(--text-muted);
  font-weight: 600;
}

.warning-item .warning-meta {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 12px;
}

.warning-item dl {
  margin: 8px 0 0;
}

.warning-item dt {
  margin-top: 6px;
  color: var(--text-normal);
  font-size: 12px;
  font-weight: 650;
}

.warning-item dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 13px;
}

.warning-steps {
  margin: 0;
  padding-left: 18px;
}

.chat-sources,
.answer details,
.conversation .search-note {
  margin-top: 10px;
  color: var(--text-muted);
  font-size: 12px;
}

.chat-sources strong {
  font-weight: 600;
}

.answer ul {
  margin: 4px 0 0;
  padding-left: 17px;
}

.answer li {
  margin-top: 4px;
  overflow-wrap: anywhere;
}

.answer a {
  color: var(--cyan-soft);
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

.answer summary {
  cursor: pointer;
}

.conversation .chat-empty,
.conversation .chat-error {
  margin-top: 15px;
}

.chat-empty,
.chat-pending {
  color: var(--text-muted);
  font-size: 13px;
}

.chat-error {
  color: var(--danger);
  font-size: 13px;
}

.chat-composer {
  align-items: flex-end;
  border-top: 1px solid var(--border-cyan);
}

.chat-composer textarea {
  flex: 1;
  min-width: 0;
  padding: 7px 9px;
  color: inherit;
  color-scheme: dark;
  background: var(--recessed-bg);
  border: 1px solid var(--border-cyan-strong);
  border-radius: var(--control-radius);
  font: inherit;
  font-size: 14px;
  resize: none;
}

.chat-composer button[type='submit'] {
  padding: 7px 11px;
  color: var(--on-primary);
  border-color: var(--border-cyan);
  border-radius: 999px;
  background: var(--primary-blue);
}

.chat-composer textarea::placeholder {
  color: var(--text-subtle);
}

.chat-composer button[type='submit']:hover:not(:disabled) {
  background: var(--primary-blue-hover);
}
</style>
