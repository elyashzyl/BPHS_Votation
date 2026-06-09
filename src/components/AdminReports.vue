<template>
  <div>
    <div class="admin-head-actions">
      <div>
        <h2>Reports</h2>
        <p class="text-sm text-muted" style="margin-top:4px;">Issues reported by voters during the election process.</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <Toggle :model-value="state.isDark" @update:model-value="toggleTheme" slim size="sm" :title="'Toggle theme'" />
        <span class="badge-year">{{ state.year }}</span>
      </div>
    </div>
    <div class="admin-actions">
      <button class="btn btn-sm btn-danger" @click="promptClearAll" :disabled="!reports.length">Clear All</button>
      <template v-if="selected.size">
        <span class="text-sm text-muted" style="margin-left:8px;">{{ selected.size }} selected</span>
        <button class="btn btn-sm btn-success" @click="bulkResolve(true)" :disabled="busyBulk">Mark Resolved</button>
        <button class="btn btn-sm btn-outline" @click="bulkResolve(false)" :disabled="busyBulk">Mark Open</button>
        <button class="btn btn-sm btn-danger" @click="bulkDelete" :disabled="busyBulk">Delete</button>
      </template>
    </div>
    <div class="summary-stats" style="margin-top:16px;">
      <div class="stat-card" style="--stat-color:var(--orange);"><div class="stat-num">{{ reports.length }}</div><div class="stat-label">Total</div></div>
      <div class="stat-card" style="--stat-color:var(--red);"><div class="stat-num">{{ unresolved.length }}</div><div class="stat-label">Open</div></div>
      <div class="stat-card" style="--stat-color:var(--green);"><div class="stat-num">{{ reports.length - unresolved.length }}</div><div class="stat-label">Resolved</div></div>
    </div>
    <div class="card mt-16">
      <div class="table-wrap" style="max-height:600px;overflow-y:auto;">
        <table>
          <thead><tr><th style="width:32px;"><input type="checkbox" :checked="selected.size === reports.length && reports.length > 0" @change="toggleAll($event.target.checked, reports)" /></th><th>#</th><th>Name</th><th>Election</th><th>Message</th><th>Time</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr v-for="(r,i) in reports" :key="r.id" :class="{ 'report-resolved': r.resolved, 'row-selected': selected.has(r.id) }">
              <td><input type="checkbox" :checked="selected.has(r.id)" @change="toggle(r.id)" /></td>
              <td>{{ i+1 }}</td>
              <td>{{ r.name || 'Anonymous' }}</td>
              <td><span class="badge badge-sm" :class="r.electionType==='club'?'badge-club':r.electionType==='classroom'?'badge-success':'badge-warning'">{{ r.electionType || 'sbo' }}</span></td>
              <td style="max-width:260px;white-space:normal;word-break:break-word;">{{ r.message }}</td>
              <td class="text-sm text-muted" style="white-space:nowrap;">{{ new Date(r.timestamp).toLocaleString() }}</td>
              <td><span class="badge badge-sm" :class="r.resolved ? 'badge-success' : 'badge-warning'">{{ r.resolved ? 'Resolved' : 'Open' }}</span></td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-sm btn-accent" @click="openDetail(r)" title="View &amp; Reply"><svg width="14" height="14" viewBox="0 0 22 16" fill="none"><path d="M11 2C6 2 2 6 1 8c1 2 5 6 10 6s9-4 10-6c-1-2-5-6-10-6z" stroke="currentColor" stroke-width="1.5"/><circle cx="11" cy="8" r="3" stroke="currentColor" stroke-width="1.4"/></svg></button>
                  <button class="btn btn-sm btn-accent" @click="openDetail(r)" title="Edit"><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M14 3a1.5 1.5 0 00-2-2L3 10l-1 4 4-1 9-9z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg></button>
                  <button class="btn btn-sm btn-danger" @click="promptDel(r)" title="Delete"><svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
                </div>
              </td>
            </tr>
            <tr v-if="!reports.length"><td colspan="8" class="text-muted text-center">No reports yet.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detail modal with edit, reply, and delete -->
    <div v-if="detail" class="modal-overlay" @click.self="closeDetail">
      <div class="modal-box" @click.stop>
        <div class="modal-box-header">
          <h3>{{ editing ? 'Edit Report' : 'Report Detail' }}</h3>
          <button class="modal-box-close" @click="closeDetail"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        </div>
        <div class="modal-box-body">
          <div class="detail-field"><label>From</label>
            <input v-if="editing" v-model="editName" type="text" style="width:100%;padding:6px 10px;font-size:.82rem;border:1px solid var(--card-border);border-radius:var(--radius-sm);background:var(--bg-alt);color:var(--text);outline:none;font-family:inherit;" />
            <span v-else>{{ detail.name || 'Anonymous' }}</span>
          </div>
          <div class="detail-field"><label>Election</label><span class="badge badge-sm" :class="detail.electionType==='club'?'badge-club':detail.electionType==='classroom'?'badge-success':'badge-warning'">{{ detail.electionType || 'sbo' }}</span></div>
          <div class="detail-field"><label>Time</label><span class="text-muted text-sm">{{ new Date(detail.timestamp).toLocaleString() }}</span></div>
          <div class="detail-field"><label>Status</label>
            <button class="btn btn-sm" :class="detail.resolved ? 'btn-success' : 'btn-outline'" @click="toggleResolve(detail.id)" style="font-size:.72rem;padding:3px 10px;">{{ detail.resolved ? 'Resolved' : 'Open' }}</button>
          </div>
          <div class="detail-field" style="margin-top:12px;"><label>Message</label>
            <textarea v-if="editing" v-model="editMsg" rows="3" style="width:100%;padding:8px 10px;font-size:.82rem;border:1px solid var(--card-border);border-radius:var(--radius-sm);background:var(--bg-alt);color:var(--text);resize:vertical;outline:none;font-family:inherit;"></textarea>
            <div v-else class="detail-msg">{{ detail.message }}</div>
          </div>
          <div v-if="detail.reply && !editing" class="detail-field" style="margin-top:12px;">
            <label>Your Reply</label>
            <div class="detail-reply">{{ detail.reply }}</div>
            <span class="text-sm text-muted">{{ new Date(detail.replyTimestamp).toLocaleString() }}</span>
          </div>
          <div v-if="detail.followUps?.length" class="detail-field" style="margin-top:12px;">
            <label>Follow-ups ({{ detail.followUps.length }})</label>
            <div v-for="f in detail.followUps" :key="f.timestamp" class="detail-msg" style="margin-bottom:6px;border-left:3px solid var(--warning);padding-left:8px;">
              <div>{{ f.message }}</div>
              <span class="text-sm text-muted">{{ new Date(f.timestamp).toLocaleString() }}</span>
            </div>
          </div>
          <div class="detail-field" style="margin-top:12px;">
            <label>{{ detail.reply ? 'Edit Reply' : 'Write Reply' }}</label>
            <textarea v-model="replyText" rows="3" placeholder="Type your response..." style="width:100%;padding:8px 10px;font-size:.82rem;border:1px solid var(--card-border);border-radius:var(--radius-sm);background:var(--bg-alt);color:var(--text);resize:vertical;outline:none;font-family:inherit;"></textarea>
          </div>

          <div v-if="showDelConfirm" class="detail-field" style="margin-top:16px;padding:12px;background:var(--red-bg);border-radius:var(--radius-sm);text-align:center;">
            <p class="text-sm" style="margin-bottom:8px;font-weight:600;color:var(--red);">Delete this report?</p>
            <button class="btn btn-sm btn-danger" @click="confirmDel">Yes, Delete</button>
            <button class="btn btn-sm btn-secondary" @click="showDelConfirm=false" style="margin-left:8px;">Cancel</button>
          </div>
        </div>
        <div class="modal-box-footer">
          <button class="btn btn-sm btn-secondary" @click="editing ? cancelEdit() : closeDetail()">{{ editing ? 'Cancel' : 'Close' }}</button>
          <button v-if="!editing" class="btn btn-sm btn-danger" @click="showDelConfirm=true">Delete</button>
          <button v-if="editing" class="btn btn-sm btn-success" @click="saveEdit">Save</button>
          <button v-if="!editing" class="btn btn-sm btn-accent" @click="startEdit">Edit</button>
          <button class="btn btn-sm btn-primary" @click="sendReply" :disabled="!replyText.trim()">Send Reply</button>
        </div>
      </div>
    </div>

    <ModalDialog :visible="showClearModal" title="Clear All Reports" message="Delete all reports?" confirmText="Clear All" confirmClass="btn-danger" @confirm="confirmClear" @cancel="showClearModal=false" />
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { state, getReports, resolveReport, replyToReport, removeReport, saveSync, toggleTheme } from '../store/index.js'
import ModalDialog from './ModalDialog.vue'
import Toggle from '../components/base/toggle/toggle.vue'

const reports = computed(() => getReports())
const unresolved = computed(() => reports.value.filter(r => !r.resolved))

const showClearModal = ref(false)
const detail = ref(null)
const replyText = ref('')
const editing = ref(false)
const editName = ref('')
const editMsg = ref('')
const showDelConfirm = ref(false)
const selected = reactive(new Set())
const busyBulk = ref(false)

function toggle(id) { selected.has(id) ? selected.delete(id) : selected.add(id) }
function toggleAll(checked, items) { checked ? items.forEach(r => selected.add(r.id)) : selected.clear() }

function bulkResolve(resolved) {
  busyBulk.value = true
  selected.forEach(id => { const r = state.data?.reports?.find(x => x.id === id); if (r) r.resolved = resolved })
  saveSync(); selected.clear(); busyBulk.value = false
}

function bulkDelete() {
  if (!confirm('Delete ' + selected.size + ' selected report(s)?')) return
  busyBulk.value = true
  state.data.reports = (state.data.reports || []).filter(r => !selected.has(r.id))
  saveSync(); selected.clear(); busyBulk.value = false
}

function toggleResolve(id) { resolveReport(id) }

function openDetail(r) {
  detail.value = state.data?.reports?.find(x => x.id === r.id) || r
  replyText.value = detail.value?.reply || ''
  editing.value = false
  showDelConfirm.value = false
}

function closeDetail() { detail.value = null; editing.value = false; showDelConfirm.value = false }

function startEdit() {
  editName.value = detail.value?.name || ''
  editMsg.value = detail.value?.message || ''
  editing.value = true
}

function cancelEdit() { editing.value = false }

function saveEdit() {
  if (!detail.value) return
  if (editName.value.trim()) detail.value.name = editName.value.trim()
  if (editMsg.value.trim()) detail.value.message = editMsg.value.trim()
  editing.value = false
  saveSync()
}

function sendReply() {
  if (!detail.value || !replyText.value.trim()) return
  replyToReport(detail.value.id, replyText.value)
  closeDetail()
}

function promptDel(r) {
  openDetail(r)
  showDelConfirm.value = true
}

function confirmDel() {
  if (detail.value) removeReport(detail.value.id)
  closeDetail()
}

function promptClearAll() { showClearModal.value = true }

function confirmClear() {
  if (state.data) { if (!state.data.reports) state.data.reports = []; state.data.reports = [] }
  saveSync()
  showClearModal.value = false
}
</script>