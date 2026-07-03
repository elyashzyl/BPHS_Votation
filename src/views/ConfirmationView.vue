<template>
  <div class="container fade-in">
    <div class="review-section">
      <h2 class="text-center" style="color:var(--primary);font-size:1.3rem;font-weight:800;">Review Your Vote</h2>
      <p class="text-sm text-muted text-center mb-16">Review before submitting.</p>
      <div v-for="pos in positions" :key="pos.id" class="review-item">
        <span class="pos">{{ pos.name }}</span>
        <span class="cand">
          <template v-if="selected(pos.id).length">{{ selected(pos.id).map(c=>c.name).join(', ') }}</template>
          <em v-else class="text-muted">— Abstain</em>
        </span>
      </div>
      <p v-if="!hasAny" class="text-center text-muted mt-16">No candidates selected. Ballot will be blank.</p>
      <div class="text-center mt-16" style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary" @click="submit"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right:4px;vertical-align:middle;"><path d="M13 4L6 12l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Confirm &amp; Submit</button>
        <button class="btn btn-outline" @click="goBack"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="margin-right:4px;vertical-align:middle;"><path d="M9 3L5 7l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Go Back</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Device } from '../utils/device.js'
import { state, getPositions, getAllCandidates, saveSync } from '../store/index.js'

const router = useRouter()
const type = computed(() => state.electionType || 'sbo')
const positions = computed(() =>
  getPositions().filter(p => (p.type || 'sbo') === type.value).sort((a, b) => a.order - b.order)
)
const allCandidates = computed(() => getAllCandidates())
const hasAny = computed(() => positions.value.some(p => (state.selectedVotes[p.id] || []).length > 0))

function selected(posId) {
  return (state.selectedVotes[posId] || []).map(id => getAllCandidates().find(c => c.id === id)).filter(Boolean)
}

async function submit() {
  const v = state.voter
  const d = state.data
  const et = state.electionType
  const dup = d.voters.find(x => x.name.toLowerCase().trim() === v.name.trim().toLowerCase() && x.grade === v.grade && x.section.toUpperCase() === v.section.toUpperCase() && (x.electionType || 'sbo') === et)
  if (dup) { alert('Duplicate vote.'); router.push('/'); return }
  const vid = 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
  d.voters.push({ id: vid, name: v.name.trim(), grade: v.grade, section: v.section, club: v.club || '', electionType: et, deviceId: Device.getId(), timestamp: new Date().toISOString() })
  d.votedDevices.push(Device.getId() + ':' + et)
  positions.value.forEach(p => {
    (state.selectedVotes[p.id] || []).forEach(cid => {
      d.votes.push({ id: 'vt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), voterId: vid, candidateId: cid, positionId: p.id, timestamp: new Date().toISOString() })
    })
  })
  try { localStorage.removeItem('sbo_draft_' + Device.getId() + '_' + et) } catch {}
  router.push('/vote/success')
  saveSync()
}

function goBack() { router.push('/vote/booth') }
</script>