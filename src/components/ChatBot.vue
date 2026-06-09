<template>
  <div class="chatbot no-print">
    <button class="chatbot-toggle" @click="toggleBot" :title="open ? 'Close' : 'Help &amp; Support'">
      <svg v-if="!open" width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2a9 9 0 019 9c0 2-.6 3.8-1.7 5.3L19 19l-2.7-.7A9 9 0 1 1 11 2z" stroke="currentColor" stroke-width="1.6"/><path d="M11 11v.5M11 7.5v0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    </button>

    <Transition name="chat">
      <div v-if="open" class="chatbot-panel">
        <div class="chatbot-header">
          <div class="chatbot-header-icon"><svg width="16" height="16" viewBox="0 0 22 22" fill="none"><path d="M11 2a9 9 0 019 9c0 2-.6 3.8-1.7 5.3L19 19l-2.7-.7A9 9 0 1 1 11 2z" stroke="currentColor" stroke-width="1.6"/><path d="M11 11v.5M11 7.5v0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>
          <div><strong>Voting Assistant</strong><p class="text-sm text-muted" style="margin:0;">Ask a question or report an issue</p></div>
        </div>

        <div class="chatbot-tabs">
          <button :class="{ active: mode === 'ask' }" @click="switchMode('ask')">Ask a Question</button>
          <button :class="{ active: mode === 'report' }" @click="switchMode('report')">Report a Problem</button>
        </div>

        <div class="chatbot-messages" ref="msgBox">
          <!-- Ask mode chat -->
          <template v-if="mode === 'ask'">
            <div v-for="msg in messages" :key="msg.id" class="chat-msg" :class="msg.role">
              <div class="chat-bubble">{{ msg.text }}</div>
              <div class="chat-time">{{ msg.time }}</div>
            </div>
          </template>

          <!-- Report mode: list view -->
          <template v-if="mode === 'report' && !viewingReport">
            <div v-if="deviceReports.length === 0" class="chat-msg bot">
              <div class="chat-bubble">No previous reports from this device. Tap below to submit a new report.</div>
            </div>
            <div v-for="r in deviceReports" :key="r.id" class="report-list-item">
              <div class="report-list-top">
                <span class="text-sm" style="font-weight:600;">{{ r.name || 'Anonymous' }}</span>
                <span class="badge badge-sm" :class="r.resolved ? 'badge-success' : 'badge-warning'">{{ r.resolved ? 'Resolved' : 'Open' }}</span>
              </div>
              <div class="text-sm text-muted report-list-preview">{{ r.message }}</div>
              <div class="report-list-bottom">
                <span class="text-xs text-muted">{{ new Date(r.timestamp).toLocaleDateString() }}</span>
                <button class="btn btn-sm btn-accent" @click="viewReport(r)">View</button>
              </div>
            </div>
          </template>

          <!-- Report mode: detail view -->
          <template v-if="mode === 'report' && viewingReport">
            <button class="report-back" @click="viewingReport = null">&larr; Back to reports</button>
            <div class="report-detail-card">
              <div class="detail-field"><label>From</label><span>{{ viewingReport.name || 'Anonymous' }}</span></div>
              <div class="detail-field"><label>Status</label>
                <span class="badge badge-sm" :class="viewingReport.resolved ? 'badge-success' : 'badge-warning'">{{ viewingReport.resolved ? 'Resolved' : 'Open' }}</span>
              </div>
              <div class="detail-field" style="margin-top:8px;"><label>Message</label>
                <div class="detail-msg">{{ viewingReport.message }}</div>
                <span class="text-xs text-muted">{{ new Date(viewingReport.timestamp).toLocaleString() }}</span>
              </div>
              <div v-if="viewingReport.followUps?.length" style="margin-top:10px;">
                <label style="font-size:.7rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Follow-ups</label>
                <div v-for="f in viewingReport.followUps" :key="f.timestamp" class="detail-msg" style="margin-bottom:4px;border-left:3px solid var(--warning);padding-left:8px;">
                  <div>{{ f.message }}</div>
                  <span class="text-xs text-muted">{{ new Date(f.timestamp).toLocaleString() }}</span>
                </div>
              </div>
              <div v-if="viewingReport.reply" style="margin-top:10px;">
                <label style="font-size:.7rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Admin Reply</label>
                <div class="detail-msg" style="border-left:3px solid var(--primary);padding-left:8px;">
                  <div>{{ viewingReport.reply }}</div>
                  <span class="text-xs text-muted">{{ new Date(viewingReport.replyTimestamp).toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>

        <template v-if="mode === 'ask'">
          <div class="chatbot-compose">
            <div class="compose-row">
              <input v-model="message" placeholder="Type your question..." @keydown.enter.prevent="askQuestion" />
              <button class="btn btn-sm btn-primary send-btn" @click="askQuestion" :disabled="!message.trim() || busy">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l10-5-5 10-2-3-3-2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
              </button>
            </div>
            <p class="text-sm text-muted" style="margin:6px 0 0;text-align:center;">Type "help" for common topics</p>
          </div>
        </template>

        <template v-else-if="!viewingReport">
          <div class="chatbot-report">
            <div class="form-group"><input type="text" v-model="reportName" placeholder="Your name (optional)" /></div>
            <div class="compose-row">
              <textarea v-model="reportMsg" rows="2" placeholder="Describe the problem..." @keydown.enter.prevent="sendReport"></textarea>
              <button class="btn btn-sm btn-primary send-btn" @click="sendReport" :disabled="!reportMsg.trim() || busy">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l10-5-5 10-2-3-3-2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="chatbot-report">
            <div class="compose-row">
              <textarea v-model="followUpMsg" rows="2" placeholder="Add follow-up..." @keydown.enter.prevent="sendFollowUp"></textarea>
              <button class="btn btn-sm btn-primary send-btn" @click="sendFollowUp" :disabled="!followUpMsg.trim() || busy">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l10-5-5 10-2-3-3-2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { state, submitReport, followUpReport } from '../store/index.js'
import { Device } from '../utils/device.js'

const open = ref(false)
const mode = ref('ask')
const message = ref('')
const reportName = ref('')
const reportMsg = ref('')
const followUpMsg = ref('')
const busy = ref(false)
const msgBox = ref(null)
const messages = ref([])
const viewingReport = ref(null)

const deviceReports = computed(() => {
  const id = Device.getId()
  return (state.data?.reports || []).filter(r => r.deviceId === id).slice().reverse()
})

const faq = [
  { keywords: ['help', 'what can', 'what do', 'options', 'topics'], answer: 'I can help with:\n\u2022 How to vote\n\u2022 Election types (SBO, Classroom, Club)\u2022 Login issues\n\u2022 Already voted\n\u2022 Voting rules\n\u2022 Report a problem\n\nJust ask!' },
  { keywords: ['how', 'vote', 'voting', 'cast', 'ballot'], answer: 'To vote: 1) Go to the home page. 2) Choose an election type (SBO, Classroom, or Club). 3) Enter your name, grade, and section. 4) Select your candidate for each position. 5) Review and confirm your votes.' },
  { keywords: ['sbo', 'supreme student', 'student government'], answer: 'SBO stands for Supreme Student Organization. All students can vote for SBO officers like President, VP, Secretary, Treasurer, Auditor, P.R.O., Sergeant at Arms, and Grade Representatives.' },
  { keywords: ['classroom', 'class', 'section'], answer: 'Classroom elections are for your specific grade and section. You can only vote for candidates in your own section.' },
  { keywords: ['club', 'club officer'], answer: 'Club elections are for club officers. You can only vote for the club you are enrolled in (English, Science, or Math Club).' },
  { keywords: ['login', 'sign in', 'enter', 'name', 'grade', 'section'], answer: 'No account needed! Just enter your name, select your grade and section on the voting page, and you\'re ready to vote.' },
  { keywords: ['already', 'voted', 'already voted', 'again', 'second'], answer: 'Each student can vote only once per election type (SBO, Classroom, Club). One vote per device per election type is also enforced.' },
  { keywords: ['rule', 'policy', 'limit', 'restriction'], answer: 'Key voting rules: 1) One vote per election type. 2) One vote per device per election type. 3) Classroom voting is restricted to your section. 4) Club voting is restricted to your club. 5) Results are admin-only.' },
  { keywords: ['device', 'phone', 'computer', 'another'], answer: 'Each device can only vote once per election type. If you switch devices, you may still be able to vote if you haven\'t voted from that device yet.' },
  { keywords: ['candidate', 'who', 'running', 'position'], answer: 'Candidates are managed by the admin. Check with your school admin for the list of candidates and positions.' },
  { keywords: ['report', 'problem', 'issue', 'error', 'bug', 'wrong'], answer: 'If you\'re experiencing a problem, tap "Report a Problem" above and I\'ll forward it to the admin.' },
  { keywords: ['result', 'winner', 'who won'], answer: 'Election results are only visible to admin. Please contact your school admin if you need to view results.' },
  { keywords: ['password', 'forgot', 'admin', 'login admin'], answer: 'The admin password is set by the school. If you forgot it, contact the system administrator to reset it.' },
  { keywords: ['thank', 'thanks', 'ok', 'okay', 'got it', 'understood'], answer: 'You\'re welcome! If you need more help, just ask. Otherwise, happy voting!' },
]

function toggleBot() {
  open.value = !open.value
  if (!open.value) {
    messages.value = []
    viewingReport.value = null
  }
}

watch(open, (v) => {
  if (v) {
    mode.value = 'ask'
    message.value = ''
    reportName.value = ''
    reportMsg.value = ''
    followUpMsg.value = ''
    viewingReport.value = null
    messages.value = []
    nextTick(() => { greet(); scrollDown() })
  }
})

function switchMode(m) {
  mode.value = m
  viewingReport.value = null
  if (m === 'ask') {
    messages.value = []
    nextTick(() => { greet(); scrollDown() })
  } else {
    messages.value = []
    if (!deviceReports.value.length) {
      messages.value.push({ id: 'no_prev', role: 'bot', text: 'No previous reports from this device. Fill out the form below to submit a new report.', time: new Date().toLocaleTimeString() })
      nextTick(() => scrollDown())
    }
  }
}

function greet() {
  const now = new Date()
  const h = now.getHours()
  const greeting = 'Good ' + (h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening') + '!'
  messages.value.push({ id: 'greet_' + Date.now(), role: 'bot', text: greeting + ' I\'m your Voting Assistant. You can ask me questions or report a problem.', time: now.toLocaleTimeString() })
}

function viewReport(r) {
  viewingReport.value = r
  nextTick(() => scrollDown())
}

function findAnswer(input) {
  const q = input.toLowerCase().trim()
  let best = null, bestScore = 0
  for (const item of faq) {
    let score = 0
    for (const kw of item.keywords) {
      if (q.includes(kw)) score++
      if (q.split(' ').some(w => w === kw)) score += 2
    }
    if (score > bestScore) { bestScore = score; best = item }
  }
  if (bestScore === 0) return null
  if (bestScore === 1 && best.keywords.length === 1) return null
  return best.answer
}

async function askQuestion() {
  if (!message.value.trim() || busy.value) return
  const userMsg = message.value.trim()
  const now = new Date()
  const timeStr = now.toLocaleTimeString()
  busy.value = true
  messages.value.push({ id: 'u_' + Date.now(), role: 'user', text: userMsg, time: timeStr })
  message.value = ''
  await nextTick()
  scrollDown()
  await nextTick()

  const answer = findAnswer(userMsg)
  if (answer) {
    const delay = Math.min(400 + answer.length * 8, 1500)
    await new Promise(r => setTimeout(r, delay))
    messages.value.push({ id: 'b_' + Date.now(), role: 'bot', text: answer, time: new Date().toLocaleTimeString() })
  } else {
    await submitReport(state.voter?.name || 'Anonymous', userMsg)
    await new Promise(r => setTimeout(r, 600))
    messages.value.push({ id: 'b_' + Date.now(), role: 'bot', text: 'I couldn\'t find an answer, but I\'ve sent your question to the admin. They will review and respond.', time: new Date().toLocaleTimeString() })
  }
  busy.value = false
  await nextTick()
  scrollDown()
}

async function sendReport() {
  if (!reportMsg.value.trim() || busy.value) return
  const userMsg = reportMsg.value.trim()
  const now = new Date()
  const timeStr = now.toLocaleTimeString()
  busy.value = true
  await submitReport(reportName.value || (state.voter?.name || ''), userMsg)
  reportMsg.value = ''
  reportName.value = ''
  if (!messages.value.length) {
    messages.value.push({ id: 'b_sent_' + Date.now(), role: 'bot', text: 'Report sent. Admin will review it.', time: timeStr })
  }
  busy.value = false
  await nextTick()
  scrollDown()
}

async function sendFollowUp() {
  if (!followUpMsg.value.trim() || busy.value || !viewingReport.value) return
  const msg = followUpMsg.value.trim()
  busy.value = true
  await followUpReport(viewingReport.value.id, msg)
  followUpMsg.value = ''
  busy.value = false
  viewingReport.value = deviceReports.value.find(r => r.id === viewingReport.value.id)
  await nextTick()
  scrollDown()
}

function scrollDown() {
  if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight
}
</script>

<style scoped>
.chatbot { position: fixed; bottom: 24px; right: 24px; z-index: 999; }
.chatbot-toggle {
  width: 48px; height: 48px; border-radius: 50%; border: none;
  background: var(--primary); color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px var(--primary-glow);
  transition: transform .2s, background .2s;
  position: relative; z-index: 2;
}
.chatbot-toggle:hover { transform: scale(1.08); background: var(--primary-hover); }
.chatbot-toggle:active { transform: scale(.95); }
.chatbot-panel {
  position: absolute; bottom: 56px; right: 0; width: 340px;
  background: var(--card-strong); border-radius: var(--radius);
  border: 1px solid var(--card-border); box-shadow: var(--shadow-lg);
  overflow: hidden; display: flex; flex-direction: column; max-height: 420px;
}
@media(max-width:768px){ .chatbot { bottom: 66px; } .chatbot-panel { width: 94vw; right: -10px; } }
@media(max-width:480px){ .chatbot { bottom: 62px; } .chatbot-panel { bottom: 52px; } }
.chatbot-header {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-bottom: 1px solid var(--card-border); flex-shrink: 0;
}
.chatbot-header-icon {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--primary-bg); color: var(--primary);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.chatbot-header strong { font-size: .85rem; }
.chatbot-tabs {
  display: flex; gap: 0; flex-shrink: 0;
  border-bottom: 1px solid var(--card-border);
}
.chatbot-tabs button {
  flex: 1; padding: 8px 6px; font-size: .75rem; font-weight: 600;
  background: transparent; border: none; color: var(--text-muted);
  cursor: pointer; transition: all .15s; border-bottom: 2px solid transparent;
  font-family: inherit;
}
.chatbot-tabs button.active {
  color: var(--primary); border-bottom-color: var(--primary);
}
.chatbot-tabs button:first-child { border-right: 1px solid var(--card-border); }
.chatbot-messages {
  flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 10px 14px;
  display: flex; flex-direction: column; gap: 8px; min-height: 140px;
}
.chat-msg { display: flex; flex-direction: column; max-width: 85%; }
.chat-msg.bot { align-self: flex-start; }
.chat-msg.user { align-self: flex-end; }
.chat-bubble {
  padding: 8px 12px; border-radius: 12px; font-size: .82rem; line-height: 1.45; word-break: break-word; white-space: pre-line;
}
.chat-msg.bot .chat-bubble {
  background: var(--bg-alt); color: var(--text); border-bottom-left-radius: 4px;
}
.chat-msg.user .chat-bubble {
  background: var(--primary); color: #fff; border-bottom-right-radius: 4px;
}
.chat-time { font-size: .65rem; color: var(--text-muted); margin-top: 2px; padding: 0 4px; }
.chat-msg.user .chat-time { text-align: right; }

.report-list-item {
  padding: 10px; border-radius: var(--radius-sm);
  background: var(--bg-alt); border: 1px solid var(--card-border);
  display: flex; flex-direction: column; gap: 4px;
}
.report-list-top { display: flex; justify-content: space-between; align-items: center; }
.report-list-preview {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.report-list-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 2px; }

.report-back {
  align-self: flex-start; background: none; border: none;
  color: var(--primary); font-size: .78rem; cursor: pointer;
  padding: 4px 0; font-family: inherit;
}
.report-back:hover { text-decoration: underline; }

.report-detail-card {
  padding: 10px; border-radius: var(--radius-sm);
  background: var(--bg-alt); border: 1px solid var(--card-border);
}
.report-detail-card .detail-field { margin-bottom: 4px; }
.report-detail-card .detail-field label { font-size: .7rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 2px; }
.report-detail-card .detail-msg {
  padding: 6px 8px; border-radius: var(--radius-sm);
  background: var(--card-strong); font-size: .78rem; line-height: 1.45;
}

.chatbot-compose, .chatbot-report {
  padding: 8px 10px; border-top: 1px solid var(--card-border); flex-shrink: 0;
}
.chatbot-report .form-group { margin-bottom: 6px; }
.chatbot-report input, .chatbot-report textarea {
  width: 100%; padding: 6px 10px; font-size: .78rem;
  border: 1px solid var(--card-border); border-radius: var(--radius-sm);
  background: var(--bg-alt); color: var(--text); outline: none; font-family: inherit;
}
.chatbot-report input:focus, .chatbot-report textarea:focus { border-color: var(--primary); }
.compose-row { display: flex; gap: 6px; align-items: center; }
.compose-row input {
  flex: 1; padding: 7px 10px; font-size: .82rem;
  border: 1px solid var(--card-border); border-radius: var(--radius-sm);
  background: var(--bg-alt); color: var(--text); outline: none; font-family: inherit;
}
.compose-row input:focus { border-color: var(--primary); }
.compose-row textarea {
  flex: 1; padding: 6px 10px; font-size: .82rem; resize: none;
  border: 1px solid var(--card-border); border-radius: var(--radius-sm);
  background: var(--bg-alt); color: var(--text); outline: none; font-family: inherit;
}
.compose-row textarea:focus { border-color: var(--primary); }
.send-btn {
  width: 34px; height: 34px; padding: 0; display: flex;
  align-items: center; justify-content: center; border-radius: 50%; flex-shrink: 0;
}

.chat-enter-active, .chat-leave-active { transition: all .25s ease; }
.chat-enter-from, .chat-leave-to { opacity: 0; transform: translateY(12px) scale(.96); }
</style>
