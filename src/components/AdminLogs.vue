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

      <div class="tabs" style="margin-bottom:12px;">
        <button class="tab" :class="{ active: tab==='voters' }" @click="tab='voters'">Voters ({{ filteredVoters.length }})</button>
        <button class="tab" :class="{ active: tab==='votes' }" @click="tab='votes'">Votes ({{ allVotes.length }})</button>
      </div>

      <!-- Voters table -->
      <div v-if="tab==='voters'" class="card">
        <div class="table-wrap" style="max-height:500px;overflow-y:auto;">
          <table><thead><tr><th style="width:32px;"><input type="checkbox" :checked="selected.size === filteredVoters.length && filteredVoters.length > 0" @change="toggleAll($event.target.checked, filteredVoters)" /></th><th>#</th><th>Name</th><th>Grade</th><th>Section</th><th>Type</th><th>Ballot</th><th>Time</th><th></th></tr></thead>
            <tbody>
              <tr v-for="(v,i) in filteredVoters" :key="v.id" :class="{ 'row-selected': selected.has(v.id) }"><td><input type="checkbox" :checked="selected.has(v.id)" @change="toggle(v.id)" /></td><td>{{ i+1 }}</td><td>{{ v.name }}</td><td>{{ v.grade }}</td><td>{{ v.section }}</td><td><span class="badge" :class="v.electionType==='classroom'?'badge-success':v.electionType==='club'?'badge-club':'badge-warning'" style="font-size:.65rem;">{{ (v.electionType||'sbo').toUpperCase() }}</span></td><td style="font-size:.75rem;max-width:320px;white-space:normal;word-break:break-word;"><template v-if="voterBallot(v.id).length">{{ voterBallot(v.id).join(' · ') }}</template><em v-else class="text-muted">—</em></td><td style="white-space:nowrap;font-size:.75rem;">{{ new Date(v.timestamp).toLocaleString() }}</td><td><button class="btn btn-sm btn-danger" @click="promptDel(v)" title="Delete"><svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></td></tr>
              <tr v-if="!filteredVoters.length"><td colspan="9" class="text-muted text-center">No voters</td></tr>
            </tbody>
          </table>
        </div>
        <p class="text-sm text-muted mt-8">Total: <strong>{{ filteredVoters.length }} voter(s)</strong></p>
      </div>

      <!-- Votes (flat audit log) -->
      <div v-if="tab==='votes'" class="card">
        <div class="table-wrap" style="max-height:500px;overflow-y:auto;">
          <table><thead><tr><th>#</th><th>Voter</th><th>Grade</th><th>Section</th><th>Type</th><th>Position</th><th>Candidate</th><th>Party</th><th>Time</th></tr></thead>
            <tbody>
              <tr v-for="(vt,i) in allVotes" :key="vt.id"><td>{{ i+1 }}</td><td>{{ vt.voterName }}</td><td>{{ vt.grade }}</td><td>{{ vt.section }}</td><td><span class="badge" :class="vt.type==='classroom'?'badge-success':vt.type==='club'?'badge-club':'badge-warning'" style="font-size:.65rem;">{{ vt.type.toUpperCase() }}</span></td><td style="font-size:.78rem;">{{ vt.positionName }}</td><td style="font-size:.78rem;">{{ vt.candidateName }}</td><td style="font-size:.78rem;">{{ vt.party }}</td><td style="white-space:nowrap;font-size:.75rem;">{{ vt.time }}</td></tr>
              <tr v-if="!allVotes.length"><td colspan="9" class="text-muted text-center">No votes</td></tr>
            </tbody>
          </table>
        </div>
        <p class="text-sm text-muted mt-8">Total: <strong>{{ allVotes.length }} vote(s)</strong> &middot; {{ uniqueVoters }} unique voter(s)</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { state, getSettings, getSections, getVoters, getPositions, getAllCandidates, getAllSections, saveSync, toggleTheme } from '../store/index.js'
import Toggle from '../components/base/toggle/toggle.vue'
import Dropdown from '../components/base/dropdown/dropdown.vue'

const gradeOpts = computed(() => settings.value.grades.map(g => ({ value: g, label: 'Grade ' + g })))
watch(() => state.logFilter.grade, () => { state.logFilter.section = '' })
const sectionOpts = computed(() => {
  const g = state.logFilter.grade
  const secs = g ? getSections(g) : getAllSections()
  return secs.map(s => ({ value: s, label: s }))
})

const settings = computed(() => getSettings())
const filteredVoters = computed(() => {
  let f = getVoters()
  if (state.logFilter.grade) f = f.filter(v => v.grade === state.logFilter.grade)
  if (state.logFilter.section) f = f.filter(v => v.section === state.logFilter.section)
  return f
})

const selected = reactive(new Set())
const busyBulk = ref(false)
const tab = ref('voters')

function _cand(id) { return getAllCandidates().find(c => c.id === id) }
function _pos(id) { return getPositions().find(p => p.id === id) }

const allVotes = computed(() => {
  return state.data.votes.map(v => {
    const voter = state.data.voters.find(x => x.id === v.voterId)
    const cand = _cand(v.candidateId)
    const pos = _pos(v.positionId)
    return {
      id: v.id,
      voterName: voter?.name || '?',
      grade: voter?.grade || '',
      section: voter?.section || '',
      type: voter?.electionType || (pos?.type || 'sbo'),
      positionName: pos?.name || v.positionId,
      candidateName: cand?.name || '?',
      party: cand?.party || '',
      time: new Date(v.timestamp).toLocaleString(),
    }
  })
})

const uniqueVoters = computed(() => {
  const s = new Set(allVotes.value.map(v => v.voterName))
  return s.size
})

function voterBallot(voterId) {
  const vv = state.data.votes.filter(v => v.voterId === voterId)
  const result = []
  const etVoter = state.data.voters.find(x => x.id === voterId)
  const et = (etVoter?.electionType || 'sbo')
  const positions = getPositions().filter(p => (p.type || 'sbo') === et).sort((a, b) => a.order - b.order)
  positions.forEach(pos => {
    const names = vv.filter(v => v.positionId === pos.id).map(v => {
      const c = state.data.candidates.find(x => x.id === v.candidateId)
      return c ? c.name : ''
    }).filter(Boolean)
    if (names.length) result.push(pos.name + ': ' + names.join(', '))
  })
  return result
}

function toggle(id) { selected.has(id) ? selected.delete(id) : selected.add(id) }
function toggleAll(checked, items) { checked ? items.forEach(v => selected.add(v.id)) : selected.clear() }

function _entries(v) { return (v.deviceId || '') + ':' + (v.electionType || 'sbo') }

function bulkDelete() {
  if (!confirm('Delete ' + selected.size + ' selected voter(s) and their votes?')) return
  busyBulk.value = true
  const toDel = state.data.voters.filter(v => selected.has(v.id))
  const ids = toDel.map(v => v.id)
  const entries = toDel.map(v => _entries(v))
  if (state.data.votedDevices) state.data.votedDevices = state.data.votedDevices.filter(d => !entries.includes(d))
  state.data.voters = state.data.voters.filter(v => !ids.includes(v.id))
  state.data.votes = state.data.votes.filter(v => !ids.includes(v.voterId))
  selected.clear(); busyBulk.value = false; saveSync()
}

function promptDel(v) {
  if (!confirm('Delete "' + v.name + '" (Grade ' + v.grade + ' - ' + v.section + ')?')) return
  const entry = _entries(v)
  if (state.data.votedDevices) state.data.votedDevices = state.data.votedDevices.filter(d => d !== entry)
  state.data.voters = state.data.voters.filter(x => x.id !== v.id)
  state.data.votes = state.data.votes.filter(x => x.voterId !== v.id)
  saveSync()
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
