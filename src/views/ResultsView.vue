<template>
  <div class="container fade-in">
    <div class="results-header">
      <div class="flex-between" style="flex-wrap:wrap;gap:12px;position:relative;">
        <h2>Election Results — {{ state.year }}</h2>
        <div class="no-print" style="display:flex;gap:8px;">
          <button class="btn btn-sm" style="background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2);" @click="window.print()"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="margin-right:4px;vertical-align:middle;"><rect x="2" y="6" width="12" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M4 2h8v4H4z" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M5 10h6v4H5z" stroke="currentColor" stroke-width="1.3" fill="none"/></svg> Print</button>
          <button class="btn btn-sm" style="background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2);" @click="$router.push('/')"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="margin-right:4px;vertical-align:middle;"><path d="M9 3L5 7l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Home</button>
        </div>
      </div>
    </div>
    <div class="summary-stats">
      <div class="stat-card stat-voters"><div class="stat-num">{{ stats.totalVoters }}</div><div class="stat-label">Voters</div></div>
      <div class="stat-card stat-votes"><div class="stat-num">{{ stats.totalVotes }}</div><div class="stat-label">Votes Cast</div></div>
      <div class="stat-card stat-positions"><div class="stat-num">{{ positions.length }}</div><div class="stat-label">Positions</div></div>
      <div class="stat-card stat-candidates"><div class="stat-num">{{ allCandidates.length }}</div><div class="stat-label">Candidates</div></div>
    </div>
    <div v-for="pos in resultsData" :key="pos.id" class="card position-section">
      <h2>{{ pos.name }}</h2>
      <p v-if="pos.winners.length" class="text-sm" style="color:var(--success);font-weight:700;">🏆 Winner(s): {{ pos.winners.map(w=>w.name).join(', ') }}</p>
      <p v-else class="text-sm text-muted">No votes cast.</p>
      <div class="table-wrap mt-8">
        <table>
          <thead><tr><th>Candidate</th><th>Grade</th><th>Party</th><th>Votes</th><th>%</th></tr></thead>
          <tbody>
            <tr v-for="c in pos.candidates" :key="c.id" :class="{ winner: pos.winners.some(w=>w.id===c.id) }">
              <td>{{ c.name }}</td><td>{{ c.grade||'N/A' }}</td><td>{{ c.party||'—' }}</td><td>{{ c.votes }}</td>
              <td>{{ pos.totalVotes ? ((c.votes/pos.totalVotes)*100).toFixed(1) : '0.0' }}%</td>
            </tr>
            <tr v-if="!pos.candidates.length"><td colspan="5" class="text-muted text-center">No candidates</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { state, getStats, getPositions, getAllCandidates } from '../store/index.js'

const stats = computed(() => getStats())
const positions = computed(() => getPositions())
const allCandidates = computed(() => getAllCandidates())
const resultsData = computed(() => {
  const s = getStats()
  return getPositions().map(pos => {
    const p = s.positions[pos.id]
    if (!p) return { ...pos, candidates: [], winners: [], totalVotes: 0 }
    const max = pos.maxVote || 1
    const sorted = [...(p.candidates || [])]
    const tv = sorted.length ? sorted[0].votes : 0
    return { ...pos, totalVotes: p.totalVotes, candidates: sorted, winners: sorted.filter(c => c.votes === tv && c.votes > 0).slice(0, max) }
  })
})
</script>
