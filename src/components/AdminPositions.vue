<template>
  <div>
    <div class="admin-head-actions">
      <div>
        <h2>Positions</h2>
        <p class="text-sm text-muted" style="margin-top:4px;">Manage election positions for the current school year.</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <Toggle :model-value="state.isDark" @update:model-value="toggleTheme" slim size="sm" :title="'Toggle theme'" />
        <span class="badge-year">{{ state.year }}</span>
      </div>
    </div>
    <div class="admin-actions">
      <button class="btn btn-sm btn-accent" @click="openCopy" v-if="otherYears.length">Copy to...</button>
      <button class="btn btn-sm btn-primary" @click="openAdd">+ Add</button>
      <button v-if="posType!=='sbo'" class="btn btn-sm btn-accent" @click="copyFromSBO" :disabled="busyBulk">Copy from SBO</button>
      <template v-if="selected.size">
        <span class="text-sm text-muted" style="margin-left:8px;">{{ selected.size }} selected</span>
        <button class="btn btn-sm btn-danger" @click="bulkDelete" :disabled="busyBulk">Delete</button>
      </template>
    </div>
    <div class="tabs">
      <span class="tab" :class="{ active: posType==='sbo' }" @click="posType='sbo'">SBO</span>
      <span class="tab" :class="{ active: posType==='classroom' }" @click="posType='classroom'">Classroom</span>
      <span class="tab" :class="{ active: posType==='club' }" @click="posType='club'">Club</span>
    </div>
    <div class="card mt-16">
      <div class="table-wrap">
        <table>
          <thead><tr><th style="width:32px;"><input type="checkbox" :checked="selected.size === filtered.length && filtered.length > 0" @change="toggleAll($event.target.checked, filtered)" /></th><th>#</th><th>Position</th><th>Max</th><th>Candidates</th><th>Actions</th></tr></thead>
          <tbody>
            <tr v-for="pos in filtered" :key="pos.id" :class="{ 'row-selected': selected.has(pos.id) }">
              <td><input type="checkbox" :checked="selected.has(pos.id)" @change="toggle(pos.id)" /></td>
              <td>{{ pos.order }}</td>
              <td>{{ pos.name }}</td>
              <td>{{ pos.maxVote }}</td>
              <td>{{ cands(pos.id).length }}</td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-sm btn-accent" @click="editPos(pos)" title="Edit"><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5a1.5 1.5 0 012 2L5 13l-3 1 1-3 8.5-8.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg></button>
                  <button class="btn btn-sm btn-danger" @click="delPos(pos.id)" title="Delete"><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
                </div>
              </td>
            </tr>
            <tr v-if="!filtered.length"><td colspan="6" class="text-muted text-center">No positions.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit overlay -->
    <div v-if="editTarget" class="modal-overlay" @click.self="editTarget=null">
      <div class="modal-box" @click.stop>
        <div class="modal-box-header"><h3>Edit Position</h3><button class="modal-box-close" @click="editTarget=null"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
        <div class="modal-box-body">
          <div class="form-group"><label>Name</label><input type="text" v-model="editForm.name" /></div>
          <div class="form-group"><label>Type</label><select v-model="editForm.type"><option value="sbo">SBO</option><option value="classroom">Classroom</option><option value="club">Club</option></select></div>
          <div class="form-group"><label>Order</label><input type="number" v-model="editForm.order" /></div>
          <div class="form-group"><label>Max Vote</label><input type="number" v-model="editForm.maxVote" /></div>
        </div>
        <div class="modal-box-footer">
          <button class="btn btn-sm btn-secondary" @click="editTarget=null">Cancel</button>
          <button class="btn btn-sm btn-primary" @click="saveEdit">Save</button>
        </div>
      </div>
    </div>

    <!-- Add overlay -->
    <div v-if="showAddForm" class="modal-overlay" @click.self="showAddForm=false">
      <div class="modal-box" @click.stop>
        <div class="modal-box-header"><h3>Add Position</h3><button class="modal-box-close" @click="showAddForm=false"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
        <div class="modal-box-body">
          <div class="form-group"><label>Name</label><input ref="addInputRef" type="text" v-model="addForm.name" placeholder="Position name" @keydown.enter="saveAdd" /></div>
          <div class="form-group"><label>Type</label><select v-model="addForm.type"><option value="sbo">SBO</option><option value="classroom">Classroom</option><option value="club">Club</option></select></div>
          <div class="form-group"><label>Order</label><input type="number" v-model="addForm.order" /></div>
          <div class="form-group"><label>Max Vote</label><input type="number" v-model="addForm.maxVote" /></div>
        </div>
        <div class="modal-box-footer">
          <button class="btn btn-sm btn-secondary" @click="showAddForm=false">Cancel</button>
          <button class="btn btn-sm btn-primary" @click="saveAdd">Add</button>
        </div>
      </div>
    </div>

    <ModalDialog :visible="showDelModal" title="Delete Position" :message="delMsg" confirmText="Delete" confirmClass="btn-danger" @confirm="confirmDel" @cancel="showDelModal=false" />

    <!-- Copy modal -->
    <div v-if="showCopyModal" class="modal-overlay" @click.self="showCopyModal=false">
      <div class="modal-box" @click.stop>
        <div class="modal-box-header"><h3>Copy Positions to...</h3><button class="modal-box-close" @click="showCopyModal=false"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
        <div class="modal-box-body">
          <div class="form-group"><label>Target Year</label><select v-model="copyTargetYear"><option v-for="y in otherYears" :key="y" :value="y">{{ y }}</option></select></div>
          <p class="text-sm text-muted">This will replace all positions in {{ copyTargetYear }} with the current {{ state.year }} positions. Candidates are not copied.</p>
        </div>
        <div class="modal-box-footer">
          <button class="btn btn-sm btn-secondary" @click="showCopyModal=false">Cancel</button>
          <button class="btn btn-sm btn-primary" @click="copyPositions">Copy</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, nextTick, watch } from 'vue'
import { state, getPositions, getCandidates, saveSync, toggleTheme } from '../store/index.js'
import { DB } from '../db/index.js'
import ModalDialog from './ModalDialog.vue'
import Toggle from '../components/base/toggle/toggle.vue'

const posType = ref(state.candTabType || 'sbo')

watch(posType, v => { state.candTabType = v })

const filtered = computed(() => getPositions().filter(p => (p.type || 'sbo') === posType.value))

const showDelModal = ref(false)
const delId = ref(null)
const delMsg = ref('')
const selected = reactive(new Set())
const busyBulk = ref(false)
const editTarget = ref(null)
const editForm = reactive({ name: '', type: 'sbo', order: 1, maxVote: 1 })
const showAddForm = ref(false)
const addForm = reactive({ name: '', type: 'sbo', order: 1, maxVote: 1 })
const addInputRef = ref(null)
const showCopyModal = ref(false)
const copyTargetYear = ref('')

const otherYears = computed(() => state.years.filter(y => y !== state.year))

function toggle(id) { selected.has(id) ? selected.delete(id) : selected.add(id) }
function toggleAll(checked, items) { checked ? items.forEach(p => selected.add(p.id)) : selected.clear() }

function bulkDelete() {
  if (!confirm('Delete ' + selected.size + ' selected position(s) and their candidates?')) return
  busyBulk.value = true
  state.data.positions = state.data.positions.filter(p => !selected.has(p.id))
  state.data.candidates = state.data.candidates.filter(c => !selected.has(c.positionId))
  selected.clear(); busyBulk.value = false; saveSync()
}

function cands(posId) { return getCandidates(posId) }

function copyFromSBO() {
  if (!confirm('Copy all SBO positions to ' + posType.value + '? This will not affect existing ' + posType.value + ' positions.')) return
  busyBulk.value = true
  const sboPositions = getPositions().filter(p => (p.type || 'sbo') === 'sbo')
  sboPositions.forEach(p => {
    state.data.positions.push({
      id: 'pos_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      name: p.name, type: posType.value,
      order: p.order, maxVote: p.maxVote,
    })
  })
  busyBulk.value = false; saveSync()
}

function openCopy() {
  copyTargetYear.value = otherYears.value[0] || ''
  showCopyModal.value = true
}

function openAdd() {
  addForm.name = ''
  addForm.type = posType.value
  addForm.maxVote = 1
  const maxOrder = state.data.positions.reduce((m, p) => Math.max(m, p.order), 0)
  addForm.order = maxOrder + 1
  showAddForm.value = true
  nextTick(() => addInputRef.value?.focus())
}

function saveAdd() {
  if (!addForm.name.trim()) return
  const d = state.data
  d.positions.push({ id: 'pos_' + Date.now(), name: addForm.name.trim(), type: addForm.type, order: Number(addForm.order) || 1, maxVote: Number(addForm.maxVote) || 1 })
  saveSync()
  showAddForm.value = false
}

function editPos(pos) {
  editTarget.value = pos
  editForm.name = pos.name
  editForm.type = pos.type || 'sbo'
  editForm.order = pos.order
  editForm.maxVote = pos.maxVote
}

function saveEdit() {
  if (!editForm.name.trim()) return
  editTarget.value.name = editForm.name.trim()
  editTarget.value.type = editForm.type
  editTarget.value.order = Number(editForm.order) || 1
  editTarget.value.maxVote = Number(editForm.maxVote) || 1
  editTarget.value = null
  saveSync()
}

function delPos(id) {
  const p = state.data.positions.find(x => x.id === id)
  if (!p) return
  delId.value = id
  delMsg.value = 'Delete "' + p.name + '" and all its candidates?'
  showDelModal.value = true
}

function confirmDel() {
  state.data.positions = state.data.positions.filter(x => x.id !== delId.value)
  state.data.candidates = state.data.candidates.filter(x => x.positionId !== delId.value)
  delId.value = null
  showDelModal.value = false
  saveSync()
}

async function copyPositions() {
  const target = copyTargetYear.value
  if (!target || target === state.year) return
  const targetData = await DB.get(target)
  if (!targetData) return
  targetData.positions = state.data.positions.map(p => ({ ...p, id: 'pos_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5) }))
  targetData.candidates = []
  await DB.save(target, targetData)
  showCopyModal.value = false
  alert('Positions copied to ' + target + '.')
}
</script>
