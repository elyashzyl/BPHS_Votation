<template>
  <div>
    <div class="admin-head-actions">
      <div>
        <h2>Candidates</h2>
        <p class="text-sm text-muted" style="margin-top:4px;">Manage candidates for each election position.</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <Toggle :model-value="state.isDark" @update:model-value="toggleTheme" slim size="sm" :title="'Toggle theme'" />
        <span class="badge-year">{{ state.year }}</span>
      </div>
    </div>
    <div class="admin-actions">
      <button class="btn btn-sm btn-primary" @click="showAddForm = true">+ Add</button>
      <template v-if="selected.size">
        <span class="text-sm text-muted" style="margin-left:8px;">{{ selected.size }} selected</span>
        <button class="btn btn-sm btn-danger" @click="bulkDelete" :disabled="busyBulk">Delete</button>
      </template>
    </div>
    <div class="tabs">
      <span class="tab" :class="{ active: type==='sbo' }" @click="type='sbo'">SBO</span>
      <span class="tab" :class="{ active: type==='classroom' }" @click="type='classroom'">Classroom</span>
      <span class="tab" :class="{ active: type==='club' }" @click="type='club'">Club</span>
    </div>
    <p class="text-sm text-muted mb-16">Select a position.</p>
    <div class="form-group" v-if="positions.length">
      <label>Position</label>
      <Dropdown v-model="state.candTabPosId" :options="posOpts" searchable />
    </div>
    <div v-if="!positions.length" class="card"><p class="text-muted">No positions.</p></div>
    <template v-else>
      <h3 style="color:var(--blue);font-weight:600;margin-bottom:12px;">{{ (positions.find(p=>p.id===state.candTabPosId)||{}).name }}</h3>
      <div v-if="!cands(state.candTabPosId).length" class="card"><p class="text-muted">No candidates for this position.</p></div>
      <div v-else class="cand-list">
        <div v-for="c in cands(state.candTabPosId)" :key="c.id" class="cand-row" :class="{ 'row-selected': selected.has(c.id) }">
          <div class="cand-row-checkbox"><input type="checkbox" :checked="selected.has(c.id)" @change="toggle(c.id)" /></div>
          <div class="cand-row-photo">
            <img v-if="c.image" :src="c.image" />
            <span v-else class="cand-row-photo-placeholder"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4.5" width="15" height="12" rx="2" stroke="currentColor" stroke-width="1.2"/><circle cx="13" cy="8" r="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M2.5 13.5L6 10l2.5 2.5L11 10l3 3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </div>
          <div class="cand-row-body">
            <div class="cand-row-field">
              <label>Name</label>
              <span>{{ c.name }}</span>
            </div>
            <div class="cand-row-field cand-row-field-sm">
              <label>Gr/Sec</label>
              <span>Grade {{ c.grade }}{{ c.section ? ' - ' + c.section : '' }}</span>
            </div>
            <div class="cand-row-field">
              <label>Party</label>
              <span>{{ c.party || '—' }}</span>
            </div>
            <div v-if="type==='club'" class="cand-row-field">
              <label>Club</label>
              <span>{{ c.club || 'Any' }}</span>
            </div>
          </div>
          <div class="cand-row-actions">
            <button class="btn btn-sm btn-primary" @click="uploadPhoto(c.id)" title="Upload photo"><svg width="14" height="14" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4.5" width="15" height="12" rx="2" stroke="currentColor" stroke-width="1.2"/><circle cx="13" cy="8" r="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M2.5 13.5L6 10l2.5 2.5L11 10l3 3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <button class="btn btn-sm btn-accent" @click="editCand(c)" title="Edit"><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5a1.5 1.5 0 012 2L5 13l-3 1 1-3 8.5-8.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg></button>
            <button class="btn btn-sm btn-danger" @click="delCand(c.id)" title="Delete"><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
          </div>
        </div>
      </div>
    </template>

    <!-- Add overlay -->
    <div v-if="showAddForm" class="modal-overlay" @click.self="showAddForm=false">
      <div class="modal-box" @click.stop>
        <div class="modal-box-header"><h3>Add Candidate</h3><button class="modal-box-close" @click="showAddForm=false"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
        <div class="modal-box-body">
          <div class="form-group"><label>Name</label><input type="text" v-model="addForm.name" placeholder="Candidate name" /></div>
          <div class="form-group"><label>Grade</label><select v-model="addForm.grade"><option v-for="g in settings.grades" :key="g" :value="g">Grade {{ g }}</option></select></div>
          <div v-if="type==='classroom'" class="form-group"><label>Section</label><select v-model="addForm.section"><option value="">Any</option><option v-for="s in sectionsForGrade(addForm.grade)" :key="s" :value="s">{{ s }}</option></select></div>
          <div class="form-group"><label>Party</label><input type="text" v-model="addForm.party" placeholder="Party (optional)" /></div>
          <div v-if="type==='club'" class="form-group"><label>Club</label><select v-model="addForm.club"><option value="">Any</option><option v-for="c in clubs" :key="c" :value="c">{{ c }}</option></select></div>
        </div>
        <div class="modal-box-footer">
          <button class="btn btn-sm btn-secondary" @click="showAddForm=false">Cancel</button>
          <button class="btn btn-sm btn-primary" @click="saveAdd">Add</button>
        </div>
      </div>
    </div>

    <!-- Edit overlay -->
    <div v-if="editTarget" class="modal-overlay" @click.self="editTarget=null">
      <div class="modal-box" @click.stop>
        <div class="modal-box-header"><h3>Edit Candidate</h3><button class="modal-box-close" @click="editTarget=null"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
        <div class="modal-box-body">
          <div class="form-group"><label>Name</label><input type="text" v-model="editForm.name" /></div>
          <div class="form-group"><label>Grade</label><select v-model="editForm.grade"><option v-for="g in settings.grades" :key="g" :value="g">Grade {{ g }}</option></select></div>
          <div v-if="type==='classroom'" class="form-group"><label>Section</label><select v-model="editForm.section"><option value="">Any</option><option v-for="s in sectionsForGrade(editForm.grade)" :key="s" :value="s">{{ s }}</option></select></div>
          <div class="form-group"><label>Party</label><input type="text" v-model="editForm.party" placeholder="Party (optional)" /></div>
          <div v-if="type==='club'" class="form-group"><label>Club</label><select v-model="editForm.club"><option value="">Any</option><option v-for="c in clubs" :key="c" :value="c">{{ c }}</option></select></div>
        </div>
        <div class="modal-box-footer">
          <button class="btn btn-sm btn-secondary" @click="editTarget=null">Cancel</button>
          <button class="btn btn-sm btn-primary" @click="saveEdit">Save</button>
        </div>
      </div>
    </div>

    <ModalDialog :visible="showDelModal" title="Delete Candidate" :message="delMsg" confirmText="Delete" confirmClass="btn-danger" @confirm="confirmDel" @cancel="showDelModal=false" />
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { state, getPositions, getCandidates, getSettings, getSections, getClubs, saveSync, toggleTheme } from '../store/index.js'
import ModalDialog from './ModalDialog.vue'
import Toggle from '../components/base/toggle/toggle.vue'
import Dropdown from '../components/base/dropdown/dropdown.vue'

const type = ref(state.candTabType || 'sbo')

const settings = computed(() => getSettings())
const clubs = computed(() => getClubs())

const positions = computed(() => getPositions().filter(p => (p.type || 'sbo') === type.value))

const posOpts = computed(() => positions.value.map(p => ({ value: p.id, label: p.name })))

watch(type, v => {
  state.candTabType = v
  const ps = getPositions().filter(p => (p.type || 'sbo') === v)
  if (ps.length) state.candTabPosId = ps[0].id
})

const showDelModal = ref(false)
const delId = ref(null)
const delMsg = ref('')
const editTarget = ref(null)
const editForm = reactive({ name: '', grade: '7', section: '', party: '', club: '' })
const showAddForm = ref(false)
const addForm = reactive({ name: '', grade: '7', section: '', party: '', club: '' })
const selected = reactive(new Set())
const busyBulk = ref(false)

function toggle(id) { selected.has(id) ? selected.delete(id) : selected.add(id) }

function bulkDelete() {
  if (!confirm('Delete ' + selected.size + ' selected candidate(s)?')) return
  busyBulk.value = true
  state.data.candidates = state.data.candidates.filter(c => !selected.has(c.id))
  selected.clear(); busyBulk.value = false; saveSync()
}

function cands(posId) { return getCandidates(posId) }

function sectionsForGrade(g) { return getSections(g) }

function saveAdd() {
  if (!state.candTabPosId || !addForm.name.trim()) return
  state.data.candidates.push({ id: 'cand_' + Date.now(), positionId: state.candTabPosId, name: addForm.name.trim(), grade: addForm.grade, section: addForm.section, party: addForm.party.trim(), club: addForm.club || '', image: '' })
  saveSync()
  showAddForm.value = false
  addForm.name = ''; addForm.grade = settings.value.grades[0] || '7'; addForm.section = ''; addForm.party = ''; addForm.club = ''
}

function editCand(c) {
  editTarget.value = c
  editForm.name = c.name
  editForm.grade = c.grade
  editForm.section = c.section || ''
  editForm.party = c.party || ''
  editForm.club = c.club || ''
}

function saveEdit() {
  if (!editForm.name.trim() || !editTarget.value) return
  editTarget.value.name = editForm.name.trim()
  editTarget.value.grade = editForm.grade
  editTarget.value.section = editForm.section
  editTarget.value.party = editForm.party.trim()
  editTarget.value.club = editForm.club || ''
  editTarget.value = null
  saveSync()
}

function uploadPhoto(id) {
  const inp = document.createElement('input')
  inp.type = 'file'; inp.accept = 'image/*'
  inp.onchange = e => {
    const f = e.target.files[0]; if (!f) return
    if (f.size > 2 * 1024 * 1024) { alert('Max 2MB.'); return }
    const r = new FileReader()
    r.onload = ev => { const c = state.data.candidates.find(x => x.id === id); if (c) { c.image = ev.target.result; saveSync() } }
    r.readAsDataURL(f)
  }
  inp.click()
}

function delCand(id) {
  const c = state.data.candidates.find(x => x.id === id)
  if (!c) return
  delId.value = id
  delMsg.value = 'Delete "' + c.name + '"?'
  showDelModal.value = true
}

function confirmDel() {
  state.data.candidates = state.data.candidates.filter(x => x.id !== delId.value)
  delId.value = null
  showDelModal.value = false
  saveSync()
}
</script>
