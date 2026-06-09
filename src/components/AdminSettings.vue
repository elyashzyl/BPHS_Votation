<template>
  <div>
    <div class="admin-head-actions">
      <div>
        <h2>Settings</h2>
        <p class="text-sm text-muted" style="margin-top:4px;">Configure election title, grades, sections, and access control.</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <Toggle :model-value="state.isDark" @update:model-value="toggleTheme" slim size="sm" :title="'Toggle theme'" />
        <span class="badge-year">{{ state.year }}</span>
      </div>
    </div>

    <div class="profile-settings">
      <div class="card">
        <div class="profile-section-header">
          <div class="profile-section-icon"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>
          <div><h3 class="admin-card-title">General</h3><p class="text-sm text-muted">Election name and access settings</p></div>
        </div>
        <div class="profile-fields">
          <div class="form-group"><label>Election Title</label><input type="text" v-model="state.settingsForm.title" /></div>
          <div class="form-group"><label>Admin Password</label><input type="text" v-model="state.settingsForm.adminPassword" /></div>
          <div class="form-group toggle-group">
            <label class="checkbox-label"><Toggle :model-value="state.settingsForm.sboActive" @update:model-value="state.settingsForm.sboActive = $event" slim /> SBO Election <span class="badge badge-sm badge-warning" style="vertical-align:middle;">{{ state.settingsForm.sboActive ? 'Active' : 'Closed' }}</span></label>
            <label class="checkbox-label"><Toggle :model-value="state.settingsForm.classroomActive" @update:model-value="state.settingsForm.classroomActive = $event" slim /> Classroom Election <span class="badge badge-sm badge-success" style="vertical-align:middle;">{{ state.settingsForm.classroomActive ? 'Active' : 'Closed' }}</span></label>
            <label class="checkbox-label"><Toggle :model-value="state.settingsForm.clubActive" @update:model-value="state.settingsForm.clubActive = $event" slim /> Club Election <span class="badge badge-sm badge-club" style="vertical-align:middle;">{{ state.settingsForm.clubActive ? 'Active' : 'Closed' }}</span></label>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="profile-section-header">
          <div class="profile-section-icon"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 7h14" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="10.5" r=".8" fill="currentColor"/><circle cx="8" cy="10.5" r=".8" fill="currentColor"/></svg></div>
          <div><h3 class="admin-card-title">Grades &amp; Sections</h3><p class="text-sm text-muted">Configure grade levels and their sections</p></div>
        </div>
        <div class="profile-fields">
          <div class="form-group"><label>Grades <span class="text-muted">(comma separated)</span></label><input type="text" v-model="state.settingsForm.gradesStr" placeholder="e.g. 7, 8, 9, 10" /></div>
          <div class="grade-sections">
            <div class="form-group" v-for="g in gradeList" :key="g">
              <label>Grade {{ g }} Sections <span class="text-muted">(comma separated)</span></label>
              <input type="text" :value="(state.settingsForm.sectionsByGradeStr||{})[g]||''" @input="state.settingsForm.sectionsByGradeStr[g]=$event.target.value" placeholder="e.g. Pine, Molave" />
            </div>
          </div>
          <div class="sections-list" v-if="sectionsList.length">
            <label style="font-size:.78rem;font-weight:600;color:var(--text-sub);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;display:block;">Sections Summary</label>
            <div class="sections-list-grid">
              <div v-for="g in gradeList" :key="g" class="sections-list-grade">
                <strong>Grade {{ g }}</strong>
                <span v-if="getSectionsForGrade(g).length">{{ getSectionsForGrade(g).join(', ') }}</span>
                <span v-else class="text-muted">—</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="profile-section-header">
          <div class="profile-section-icon"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M6 9h6M9 6v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>
          <div><h3 class="admin-card-title">Clubs</h3><p class="text-sm text-muted">Manage clubs for Club Officer elections</p></div>
        </div>
        <div class="profile-fields">
          <div class="form-group"><label>Clubs <span class="text-muted">(comma separated)</span></label><input type="text" v-model="state.settingsForm.clubsStr" placeholder="e.g. English Club, Science Club, Math Club" /></div>
        </div>
      </div>

      <div class="card">
        <div class="profile-section-header">
          <div class="profile-section-icon"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="2.5" width="16" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M1 6.5h16" stroke="currentColor" stroke-width="1.5"/><path d="M5 1v3M13 1v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>
          <div><h3 class="admin-card-title">School Year</h3><p class="text-sm text-muted">Switch or create election years</p></div>
        </div>
        <div class="profile-fields">
          <div class="form-group"><label>Active Year</label>
            <div style="display:flex;gap:8px;">
              <Dropdown v-model="selYear" :options="yearOpts" style="flex:1;" />
              <button class="btn btn-sm btn-accent" @click="createYr">+ New</button>
            </div>
          </div>
          <p class="text-sm text-muted">Other years: {{ otherYears.join(', ') || 'none' }}</p>
        </div>
      </div>

      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button class="btn btn-primary" @click="save">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right:4px;vertical-align:middle;"><path d="M13 5.5V13a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1h7.5L13 5.5z" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M5 14V9h6v5M10 2v3H6V2" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>
          Save Settings
        </button>
      </div>

      <div class="card card-danger">
        <div class="profile-section-header">
          <div class="profile-section-icon" style="color:var(--red);"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2a7 7 0 100 14A7 7 0 009 2z" stroke="currentColor" stroke-width="1.5"/><path d="M9 6v4M9 12v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>
          <div><h3 class="admin-card-title" style="color:var(--red);">Danger Zone</h3><p class="text-sm text-muted">Delete all data for {{ state.year }} only. Other years preserved.</p></div>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:12px;">
          <button class="btn btn-danger" @click="resetYear">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right:4px;vertical-align:middle;"><path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M13 4v9.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 013 13.5V4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 7v5M9.5 7v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            Reset {{ state.year }}
          </button>
        </div>
      </div>
    </div>

    <ModalDialog :visible="showResetModal" title="Reset Year" :message="resetMsg" confirmText="Reset" confirmClass="btn-danger" @confirm="confirmReset" @cancel="showResetModal=false" />
    <ModalDialog :visible="showNewYearModal" title="New Election Year" message="Enter the new school year (e.g. 2027):" mode="input" placeholder="e.g. 2027" confirmText="Create" @confirm="confirmNewYear" @cancel="showNewYearModal=false" />
    <ModalDialog :visible="showSaveModal" title="Saved" message="Settings have been saved successfully." confirmText="OK" @confirm="showSaveModal=false" @cancel="showSaveModal=false" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { state, saveSync, deleteAndSwitch, switchYear, createNewYear, toggleTheme } from '../store/index.js'
import ModalDialog from './ModalDialog.vue'
import Toggle from '../components/base/toggle/toggle.vue'
import Dropdown from '../components/base/dropdown/dropdown.vue'

const selYear = ref(state.year)
const otherYears = computed(() => state.years.filter(y => y !== state.year))
const yearOpts = computed(() => state.years.map(y => ({ value: y, label: y })))
const gradeList = computed(() => state.settingsForm.gradesStr.split(',').map(s => s.trim()).filter(Boolean))
const sectionsList = computed(() => gradeList.value.filter(g => (state.settingsForm.sectionsByGradeStr||{})[g]?.trim()))
function getSectionsForGrade(g) { return ((state.settingsForm.sectionsByGradeStr||{})[g]||'').split(',').map(s => s.trim()).filter(Boolean) }

watch(() => state.year, v => { selYear.value = v })
watch(selYear, v => { if (v && v !== state.year) switchYear(v) })

const showNewYearModal = ref(false)
const showSaveModal = ref(false)

async function createYr() {
  showNewYearModal.value = true
}

async function confirmNewYear(y) {
  if (y) {
    await createNewYear(y)
    selYear.value = y
  }
}
const showResetModal = ref(false)
const resetMsg = ref('')

function save() {
  const f = state.settingsForm
  if (!f.title) { alert('Title required.'); return }
  if (!f.adminPassword || f.adminPassword.length < 4) { alert('Password min 4 chars.'); return }
  const grades = f.gradesStr.split(',').map(s => s.trim()).filter(Boolean)
  if (!grades.length) { alert('Grades required.'); return }
  const sbg = {}
  grades.forEach(g => { sbg[g] = ((f.sectionsByGradeStr || {})[g] || '').split(',').map(s => s.trim()).filter(Boolean) })
  const clubs = f.clubsStr.split(',').map(s => s.trim()).filter(Boolean)
  state.data.settings = { title: f.title, adminPassword: f.adminPassword, sboActive: f.sboActive, classroomActive: f.classroomActive, clubActive: f.clubActive, grades, sectionsByGrade: sbg, clubs }
  saveSync()
  showSaveModal.value = true
}

function resetYear() {
  resetMsg.value = 'Delete ALL data for ' + state.year + '? This cannot be undone.'
  showResetModal.value = true
}

async function confirmReset() {
  showResetModal.value = false
  await deleteAndSwitch(state.year)
}
</script>