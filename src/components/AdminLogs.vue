<template>
  <div>
    <div class="admin-head-actions">
      <div>
        <h2>Voter Logs</h2>
        <p class="text-sm text-muted" style="margin-top:4px;">View and export voter activity logs.</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <Toggle :model-value="state.isDark" @update:model-value="toggleTheme" slim size="sm" :title="'Toggle theme'" />
        <span class="badge-year">{{ state.year }}</span>
      </div>
    </div>
    <div class="admin-actions">
      <button class="btn btn-sm btn-success" @click="exportVotes"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="margin-right:3px;vertical-align:middle;"><path d="M4 10l3 3 3-3M7 13V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 8v2.5A1.5 1.5 0 003.5 12h7a1.5 1.5 0 001.5-1.5V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Export CSV</button>
      <template v-if="selected.size">
        <span class="text-sm text-muted" style="margin-left:8px;">{{ selected.size }} selected</span>
        <button class="btn btn-sm btn-danger" @click="bulkDelete" :disabled="busyBulk">Delete</button>
      </template>
    </div>
    <div class="mt-16">
      <div class="filter-bar">
        <div class="form-group"><label>Grade</label><Dropdown v-model="state.logFilter.grade" :options="gradeOpts" placeholder="All" /></div>
        <div class="form-group"><label>Section</label><Dropdown v-model="state.logFilter.section" :options="sectionOpts" placeholder="All" /></div>
      </div>
      <div class="card">
        <div class="table-wrap" style="max-height:500px;overflow-y:auto;">
          <table><thead><tr><th style="width:32px;"><input type="checkbox" :checked="selected.size === filteredVoters.length && filteredVoters.length > 0" @change="toggleAll($event.target.checked, filteredVoters)" /></th><th>#</th><th>Name</th><th>Grade</th><th>Section</th><th>Time</th><th></th></tr></thead>
            <tbody>
              <tr v-for="(v,i) in filteredVoters" :key="v.id" :class="{ 'row-selected': selected.has(v.id) }"><td><input type="checkbox" :checked="selected.has(v.id)" @change="toggle(v.id)" /></td><td>{{ i+1 }}</td><td>{{ v.name }}</td><td>{{ v.grade }}</td><td>{{ v.section }}</td><td>{{ new Date(v.timestamp).toLocaleString() }}</td><td><button class="btn btn-sm btn-danger" @click="promptDel(v)" title="Delete"><svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></td></tr>
              <tr v-if="!filteredVoters.length"><td colspan="7" class="text-muted text-center">No voters</td></tr>
            </tbody>
          </table>
        </div>
        <p class="text-sm text-muted mt-8">Total: <strong>{{ filteredVoters.length }}</strong></p>
      </div>
    </div>
    <ModalDialog :visible="showDelModal" title="Delete Voter" :message="delMsg" confirmText="Delete" confirmClass="btn-danger" @confirm="confirmDel" @cancel="showDelModal=false" />
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { state, getSettings, getSections, getVoters, getPositions, getAllSections as getAllSecs, saveSync, toggleTheme } from '../store/index.js'
import ModalDialog from './ModalDialog.vue'
import Toggle from '../components/base/toggle/toggle.vue'
import Dropdown from '../components/base/dropdown/dropdown.vue'

const gradeOpts = computed(() => settings.value.grades.map(g => ({ value: g, label: 'Grade ' + g })))
watch(() => state.logFilter.grade, () => { state.logFilter.section = '' })
const sectionOpts = computed(() => {
  const g = state.logFilter.grade
  const secs = g ? getSections(g) : getAllSecs()
  return secs.map(s => ({ value: s, label: s }))
})

const settings = computed(() => getSettings())
const allSections = computed(() => getAllSecs())
const filteredVoters = computed(() => {
  let f = getVoters()
  if (state.logFilter.grade) f = f.filter(v => v.grade === state.logFilter.grade)
  if (state.logFilter.section) f = f.filter(v => v.section === state.logFilter.section)
  return f
})

const showDelModal = ref(false)
const delId = ref(null)
const delMsg = ref('')
const selected = reactive(new Set())
const busyBulk = ref(false)

function toggle(id) { selected.has(id) ? selected.delete(id) : selected.add(id) }
function toggleAll(checked, items) { checked ? items.forEach(v => selected.add(v.id)) : selected.clear() }

function bulkDelete() {
  if (!confirm('Delete ' + selected.size + ' selected voter(s) and their votes?')) return
  busyBulk.value = true
  state.data.voters = state.data.voters.filter(v => !selected.has(v.id))
  state.data.votes = state.data.votes.filter(v => !selected.has(v.voterId))
  selected.clear(); busyBulk.value = false; saveSync()
}

function promptDel(v) {
  delId.value = v.id
  delMsg.value = 'Delete voter "' + v.name + '" (Grade ' + v.grade + ' - ' + v.section + ')? This also removes their votes.'
  showDelModal.value = true
}

function confirmDel() {
  const id = delId.value
  const voter = state.data.voters.find(x => x.id === id)
  state.data.voters = state.data.voters.filter(x => x.id !== id)
  state.data.votes = state.data.votes.filter(x => x.voterId !== id)
  if (voter) {
    const prefix = voter.deviceId + ':'
    state.data.votedDevices = state.data.votedDevices.filter(d => !d.startsWith(prefix) || state.data.voters.some(v => v.deviceId === voter.deviceId))
  }
  delId.value = null
  saveSync()
  showDelModal.value = false
}

function _dl(csv, fn) {
  const b = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(b); a.download = fn; a.style.display = 'none'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

function exportVotes() {
  const f = state.logFilter
  const positions = getPositions().sort((a, b) => a.order - b.order)
  const posNames = positions.map(p => p.name)
  const headers = ['Voter Name', 'Grade', 'Section', ...posNames, 'Voted At']

  let voters = [...state.data.voters]
  if (f.grade) voters = voters.filter(v => v.grade === f.grade)
  if (f.section) voters = voters.filter(v => v.section === f.section)

  let csv = '\uFEFF' + headers.map(h => '"' + h + '"').join(',') + '\n'

  voters.forEach(voter => {
    const vv = state.data.votes.filter(v => v.voterId === voter.id)
    const row = ['"' + voter.name + '"', '"Grade ' + voter.grade + '"', '"Section ' + voter.section + '"']
    positions.forEach(pos => {
      const candidates = vv.filter(v => v.positionId === pos.id).map(v => {
        const c = state.data.candidates.find(x => x.id === v.candidateId)
        return c ? c.name : ''
      })
      row.push('"' + candidates.join(' & ') + '"')
    })
    row.push('"' + new Date(voter.timestamp).toLocaleString() + '"')
    csv += row.join(',') + '\n'
  })

  const sfx = [f.grade && 'G' + f.grade, f.section && 'Sec' + f.section].filter(Boolean).join('_')
  _dl(csv, 'SBO_Votes_Compiled' + (sfx ? '_' + sfx : '') + '_' + state.year + '.csv')
}
</script>
