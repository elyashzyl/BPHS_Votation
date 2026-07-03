<template>
  <div class="login-page">
    <button class="login-back" @click="$router.push('/')" title="Back"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3l-5 5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <div class="login-card fade-in">
      <div class="login-card-header">
        <div class="login-card-logo"><img src="/bphs-logo.jpg" alt="BPHS"></div>
        <div class="login-card-title">Student Verification</div>
        <p class="login-card-desc">{{ state.electionType === 'classroom' ? 'Enter your details to vote for class officers.' : state.electionType === 'club' ? 'Enter your details to vote for club officers.' : 'Enter your details to vote for SBO officers.' }}</p>
      </div>

      <div class="form-group">
          <label>Full Name</label>
          <input type="text" v-model="state.voter.name" placeholder="Enter your full name" @keydown.enter="start" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Grade</label>
            <select v-model="state.voter.grade">
              <option v-for="g in settings.grades" :key="g" :value="g">Grade {{ g }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Section</label>
            <select v-model="state.voter.section">
              <option value="" disabled>Select section</option>
              <option v-for="s in secs" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>
        <div v-if="state.electionType==='club'" class="form-group">
          <label>Club</label>
          <select v-model="state.voter.club">
            <option value="" disabled>Select club</option>
            <option v-for="c in clubs" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="login-error">{{ state.loginError }}</div>
        <button class="btn btn-primary login-btn" @click="start">Proceed to Voting</button>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { state, getSettings, getSections, getClubs } from '../store/index.js'

const router = useRouter()
const settings = computed(() => getSettings())
const secs = computed(() => getSections(state.voter.grade))
const clubs = computed(() => getClubs())

watch(() => state.voter.grade, () => {
  const s = getSections(state.voter.grade)
  if (!s.includes(state.voter.section)) state.voter.section = s[0] || ''
})

function start() {
  state.loginError = ''
  if (!state.voter.name?.trim() || state.voter.name.trim().length < 2) { state.loginError = 'Please enter your full name.'; return }
  const d = state.data
  const dup = d.voters.find(v => v.name.toLowerCase().trim() === state.voter.name.trim().toLowerCase() && v.grade === state.voter.grade && v.section.toUpperCase() === v.section.toUpperCase() && (v.electionType || 'sbo') === state.electionType)
  if (dup) { state.loginError = 'This name, grade and section already voted in this election.'; return }
  state.selectedVotes = {}
  router.push('/vote/booth')
}
</script>