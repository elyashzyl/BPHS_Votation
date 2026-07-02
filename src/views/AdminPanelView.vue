<template>
  <div>
    <div class="admin-topbar no-print">
      <div class="admin-topbar-left">
        <div class="admin-topbar-logo"><img src="/bphs-logo.jpg" alt="BPHS"></div>
        <span class="admin-topbar-school">Baguio Patriotic High School</span>
      </div>
      <div class="admin-topbar-right">
        <Toggle :model-value="state.isDark" @update:model-value="toggleTheme" slim size="sm" title="Toggle theme" />
        <span class="badge-year">{{ state.year }}</span>
        <span class="sync-badge" :class="'sync-' + DB.syncStatus" :title="DB.syncError || ''">{{ DB.syncStatus === 'cloud' ? '☁ Synced' : DB.syncStatus === 'error' ? '⚠ Local' : '◌ Local' }}</span>
        <button class="topbar-logout no-print" @click="exitAdmin" title="Logout">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M6 8h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </div>
    <div class="admin-sidebar-wrap">
      <AdminSidebar @logout="exitAdmin" />
    </div>
    <div class="admin-content">
      <div class="admin-body">
        <AdminDashboard v-if="state.adminView==='dashboard'" />
        <AdminPositions v-else-if="state.adminView==='positions'" />
        <AdminCandidates v-else-if="state.adminView==='candidates'" />
        <AdminResults v-else-if="state.adminView==='results'" />
        <AdminLogs v-else-if="state.adminView==='logs'" />
        <AdminReports v-else-if="state.adminView==='reports'" />
        <AdminSettings v-else-if="state.adminView==='settings'" />
      </div>
    </div>
    <nav class="admin-bottom-nav no-print">
      <a :class="{ active: state.adminView==='dashboard' }" @click="state.adminView='dashboard'">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/></svg>
        <span>Dashboard</span>
      </a>
      <a :class="{ active: state.adminView==='positions' }" @click="state.adminView='positions'">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="3" rx="1.5" fill="currentColor"/><rect x="1" y="6.5" width="14" height="3" rx="1.5" fill="currentColor"/><rect x="1" y="12" width="14" height="3" rx="1.5" fill="currentColor"/></svg>
        <span>Positions</span>
      </a>
      <a :class="{ active: state.adminView==='candidates' }" @click="state.adminView='candidates'">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <span>Candidates</span>
      </a>
      <a :class="{ active: state.adminView==='results' }" @click="state.adminView='results'">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="8" width="3" height="6" rx=".5" fill="currentColor"/><rect x="6.5" y="5" width="3" height="9" rx=".5" fill="currentColor"/><rect x="11" y="2" width="3" height="12" rx=".5" fill="currentColor"/></svg>
        <span>Results</span>
      </a>
      <a :class="{ active: state.adminView==='logs' }" @click="state.adminView='logs'">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1" width="13" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 5h7M4.5 8h7M4.5 11h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <span>Logs</span>
      </a>
      <a :class="{ active: state.adminView==='reports' }" @click="state.adminView='reports'">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11 2H5a1 1 0 00-1 1v10a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" stroke-width="1.5"/><path d="M6 6h4M6 9h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <span>Reports</span>
        <span v-if="reportCount" class="sidebar-badge">{{ reportCount }}</span>
      </a>
      <a :class="{ active: state.adminView==='settings' }" @click="state.adminView='settings'">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.7 2.7l1.4 1.4M11.9 11.9l1.4 1.4M2.7 13.3l1.4-1.4M11.9 4.1l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <span>Settings</span>
      </a>
    </nav>
  </div>
</template>

<script setup>
import { watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { state, toggleTheme, signOutAdmin } from '../store/index.js'
import { DB } from '../db/index.js'
import Toggle from '../components/base/toggle/toggle.vue'
import AdminSidebar from '../components/AdminSidebar.vue'
import AdminDashboard from '../components/AdminDashboard.vue'
import AdminPositions from '../components/AdminPositions.vue'
import AdminCandidates from '../components/AdminCandidates.vue'
import AdminResults from '../components/AdminResults.vue'
import AdminLogs from '../components/AdminLogs.vue'
import AdminReports from '../components/AdminReports.vue'
import AdminSettings from '../components/AdminSettings.vue'

const router = useRouter()
const reportCount = computed(() => state.data?.reports?.length || 0)

async function exitAdmin() {
  await signOutAdmin()
  router.push('/')
}

watch(() => state.adminView, (v) => {
  sessionStorage.setItem('sbo_adminView', v)
  if (v === 'settings') {
    const s = state.data?.settings
    if (s) {
      state.settingsForm = {
        title: s.title, adminPassword: s.adminPassword, sboActive: s.sboActive ?? true, classroomActive: s.classroomActive ?? true, clubActive: s.clubActive ?? true,
        gradesStr: s.grades.join(', '),
        sectionsByGradeStr: Object.fromEntries(s.grades.map(g => [g, (s.sectionsByGrade?.[g] || []).join(', ')])),
        clubsStr: (s.clubs || []).join(', '),
      }
    }
  }
}, { immediate: true })
</script>
