<template>
  <div class="admin-sidebar no-print">
    <div class="admin-sidebar-brand">
      <div class="admin-sidebar-logo"><img src="/bphs-logo.jpg" alt="BPHS"></div>
      <div class="admin-sidebar-brand-text">
        <div class="admin-sidebar-school">Baguio Patriotic High School</div>
        <div class="admin-sidebar-sub">Election Admin</div>
      </div>
    </div>
    <nav class="admin-sidebar-nav">
      <a :class="{ active: state.adminView==='dashboard' }" @click="showView('dashboard');$emit('navigate')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/></svg>
        Dashboard
      </a>
      <a :class="{ active: state.adminView==='positions' }" @click="showView('positions');$emit('navigate')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="3" rx="1.5" fill="currentColor"/><rect x="1" y="6.5" width="14" height="3" rx="1.5" fill="currentColor"/><rect x="1" y="12" width="14" height="3" rx="1.5" fill="currentColor"/></svg>
        Positions
      </a>
      <a :class="{ active: state.adminView==='candidates' }" @click="showView('candidates');$emit('navigate')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Candidates
      </a>
      <a :class="{ active: state.adminView==='results' }" @click="showView('results');$emit('navigate')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="8" width="3" height="6" rx=".5" fill="currentColor"/><rect x="6.5" y="5" width="3" height="9" rx=".5" fill="currentColor"/><rect x="11" y="2" width="3" height="12" rx=".5" fill="currentColor"/></svg>
        Results
      </a>
      <a :class="{ active: state.adminView==='logs' }" @click="showView('logs');$emit('navigate')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1" width="13" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 5h7M4.5 8h7M4.5 11h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Voter Logs
      </a>
      <a :class="{ active: state.adminView==='reports' }" @click="showView('reports');$emit('navigate')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11 2H5a1 1 0 00-1 1v10a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" stroke-width="1.5"/><path d="M6 6h4M6 9h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Reports
        <span v-if="reportCount" class="sidebar-badge">{{ reportCount }}</span>
      </a>
      <a :class="{ active: state.adminView==='settings' }" @click="showView('settings');$emit('navigate')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.7 2.7l1.4 1.4M11.9 11.9l1.4 1.4M2.7 13.3l1.4-1.4M11.9 4.1l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Settings
      </a>
    </nav>
    <div class="admin-sidebar-footer">
      <button class="admin-sidebar-logout" @click="$emit('logout')" title="Log out">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Log out
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { state, getClubs } from '../store/index.js'

const reportCount = computed(() => state.data?.reports?.length || 0)

function showView(v) {
  state.adminView = v
  if (v === 'candidates' && state.data) {
    const t = state.candTabType || 'sbo'
    const ps = [...state.data.positions].filter(p => (p.type || 'sbo') === t).sort((a, b) => a.order - b.order)
    if (ps.length) state.candTabPosId = ps[0].id
  }
}
</script>
