<template>
  <div class="home-wrapper fade-in">
    <div class="home-inner">
      <div class="home-hero">
        <div class="home-hero-logo">
          <img src="/bphs-logo.jpg" alt="BPHS">
        </div>
        <h1 class="home-hero-title">Baguio Patriotic High School</h1>
        <p class="home-hero-sub">{{ state.data?.settings?.title || 'SBO Election' }} &middot; School Year {{ state.year }}</p>
      </div>
      <div class="home-tools">
        <Toggle :model-value="state.isDark" @update:model-value="toggleTheme" slim :label="state.isDark ? 'Dark mode' : 'Light mode'" hint="Switch between light and dark theme." size="sm" />
      </div>
      <div class="home-options">
        <div class="home-card" @click="goVote('sbo')">
          <div class="home-card-accent"></div>
          <div class="home-card-icon"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="4" y="10" width="20" height="16" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M10 10V6a4 4 0 018 0v4M14 16v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M18 18a4 4 0 01-8 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>
          <h2>Vote SBO</h2>
          <p class="text-sm text-muted">Cast your vote for SBO officers</p>
        </div>
        <div class="home-card" @click="goVote('classroom')">
          <div class="home-card-accent" style="background:var(--green)"></div>
          <div class="home-card-icon"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="5" width="22" height="18" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M10 11h8M10 15h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="14" cy="20" r="1.5" stroke="currentColor" stroke-width="1.8"/></svg></div>
          <h2>Vote Classroom</h2>
          <p class="text-sm text-muted">Vote for your class officers</p>
        </div>
        <div class="home-card" @click="goVote('club')">
          <div class="home-card-accent" style="background:var(--orange)"></div>
          <div class="home-card-icon"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 4l2.5 5.2 5.8.8-4.2 4.1 1 5.9L14 16.5l-5.1 2.7 1-5.9-4.2-4.1 5.8-.8L14 4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></div>
          <h2>Vote Club Officers</h2>
          <p class="text-sm text-muted">Vote for your club officers</p>
        </div>
        <div class="home-card" @click="goAdmin">
          <div class="home-card-accent" style="background:var(--red)"></div>
          <div class="home-card-icon"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="4" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M14 2v3M14 23v3M2 14h3M23 14h3M5.5 5.5l2 2M20.5 20.5l2 2M5.5 22.5l2-2M20.5 7.5l2-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>
          <h2>Admin Panel</h2>
          <p class="text-sm text-muted">Manage candidates &amp; view results</p>
        </div>
      </div>
      <div class="home-footer">
        <div class="home-dot" style="background:var(--red)"></div>
        <div class="home-dot" style="background:var(--yellow)"></div>
        <div class="home-dot" style="background:var(--green)"></div>
        <div class="home-dot" style="background:var(--orange)"></div>
        <div class="home-dot" style="background:var(--blue)"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { state, getSettings, toggleTheme } from '../store/index.js'
import Toggle from '../components/base/toggle/toggle.vue'

const router = useRouter()

function goVote(type) {
  const s = getSettings()
  const key = type === 'sbo' ? 'sboActive' : type === 'classroom' ? 'classroomActive' : 'clubActive'
  if (!s[key]) { alert(type.charAt(0).toUpperCase() + type.slice(1) + ' voting is closed.'); return }
  state.electionType = type
  router.push('/vote/login')
}

function goAdmin() {
  router.push('/admin/login')
}
</script>