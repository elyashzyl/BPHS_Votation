<template>
  <div class="container fade-in">
    <div class="voter-info-bar">
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="voter-avatar">{{ (state.voter.name||'?').charAt(0).toUpperCase() }}</div>
        <div><strong>{{ state.voter.name }}</strong> <span class="text-muted">· Grade {{ state.voter.grade }} - {{ state.voter.section }}</span></div>
      </div>
      <button class="btn btn-sm btn-outline" @click="$router.push('/')">Cancel & Exit</button>
    </div>
    <div style="margin-bottom:16px;">
      <span class="badge" :class="state.electionType==='classroom'?'badge-success':state.electionType==='club'?'badge-club':'badge-warning'">{{ state.electionType==='classroom'?'Classroom Election':state.electionType==='club'?'Club Election':'SBO Election' }}</span>
    </div>
    <form @submit.prevent="goConfirmation">
      <div v-for="pos in positions" :key="pos.id" class="position-section">
        <h2>{{ pos.name }} <span class="text-sm text-muted fw-600">({{ pos.maxVote>1 ? 'Select up to '+pos.maxVote : 'Select one' }})</span></h2>
        <div class="candidate-grid">
          <p v-if="!cands(pos.id).length" class="text-muted" style="grid-column:1/-1;padding:12px;">No candidates.</p>
          <div v-for="cand in cands(pos.id)" :key="cand.id"
               class="candidate-card" :class="{ selected: isSel(cand.id, pos.id) }"
               @click="toggle(cand.id, pos.id, pos.maxVote)">
            <div class="avatar-wrap">
              <img v-if="cand.image" class="avatar" :src="cand.image" :alt="cand.name" />
              <div v-else class="avatar-placeholder">📷</div>
            </div>
            <div class="cand-name">{{ cand.name }}</div>
            <div v-if="cand.party" class="cand-party">{{ cand.party }}</div>
            <div class="cand-grade">{{ cand.grade ? 'Grade ' + cand.grade : '' }}{{ cand.section ? ' - ' + cand.section : '' }}</div>
          </div>
        </div>
      </div>
      <div class="text-center mt-24" style="padding-bottom:40px;">
        <button type="submit" class="btn btn-success" style="font-size:1rem;padding:14px 44px;">Review My Vote</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { state, getPositions, getCandidates, getAllCandidates } from '../store/index.js'

const router = useRouter()
const type = computed(() => state.electionType || 'sbo')
const positions = computed(() =>
  getPositions().filter(p => (p.type || 'sbo') === type.value).sort((a, b) => a.order - b.order)
)
const allCandidates = computed(() => getAllCandidates())

function cands(posId) {
  const all = getCandidates(posId)
  if (type.value === 'classroom') {
    return all.filter(c => !c.section || c.section === state.voter.section)
  }
  if (type.value === 'club') {
    return all.filter(c => !c.club || c.club === state.voter.club)
  }
  return all
}
function isSel(candId, posId) { return (state.selectedVotes[posId] || []).includes(candId) }
function toggle(candId, posId, max) {
  const cur = state.selectedVotes[posId] || []
  if (cur.includes(candId)) {
    state.selectedVotes[posId] = cur.filter(id => id !== candId)
    state.selectedVotes = { ...state.selectedVotes }
  } else if (max === 1) {
    state.selectedVotes[posId] = [candId]
    state.selectedVotes = { ...state.selectedVotes }
  } else {
    if (cur.length >= max) { alert(`Max ${max} candidate(s).`); return }
    state.selectedVotes[posId] = [...cur, candId]
    state.selectedVotes = { ...state.selectedVotes }
  }
}
function goConfirmation() { router.push('/vote/confirm') }
</script>