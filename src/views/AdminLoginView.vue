<template>
  <div class="login-page">
    <button class="login-back" @click="$router.push('/')" title="Back"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3l-5 5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <div class="login-card fade-in">
      <div class="login-card-header">
        <div class="login-card-logo"><img src="/bphs-logo.jpg" alt="BPHS"></div>
        <div class="login-card-title">Admin Login</div>
        <p class="login-card-desc">Enter the admin password to manage the election.</p>
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" v-model="state.adminPass" placeholder="Enter admin password" @keydown.enter="login" />
      </div>
      <div class="login-error">{{ state.adminLoginError }}</div>
      <button class="btn btn-primary login-btn" @click="login">Login</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { state, getSettings } from '../store/index.js'

const router = useRouter()
const settings = computed(() => getSettings())

function login() {
  if (state.adminPass === getSettings().adminPassword) {
    state.isAdmin = true; state.adminView = 'dashboard'
    sessionStorage.setItem('sbo_admin', '1')
    router.push('/admin')
  } else state.adminLoginError = 'Incorrect password.'
}
</script>