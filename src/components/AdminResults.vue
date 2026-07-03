<template>
  <div>
    <div class="admin-head-actions no-print">
      <div>
        <h2>Results</h2>
        <p class="text-sm text-muted" style="margin-top:4px;">View tallied results for SBO, Classroom, and Club elections.</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <Toggle :model-value="state.isDark" @update:model-value="toggleTheme" slim size="sm" :title="'Toggle theme'" />
        <span class="badge-year">{{ state.year }}</span>
      </div>
    </div>
    <div class="admin-actions no-print">
      <button class="btn btn-sm btn-success" @click="exportPdf"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="margin-right:3px;vertical-align:middle;"><path d="M4 10l3 3 3-3M7 13V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 8v2.5A1.5 1.5 0 003.5 12h7a1.5 1.5 0 001.5-1.5V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> PDF</button>
    </div>

    <template v-for="(group, type) in groupedResults" :key="type">
      <div v-if="type!=='club'" class="result-card" :class="{ 'result-section-break': type!=='sbo' }">
        <div class="result-card-header">
          <div class="result-card-header-logo"><img src="/bphs-logo.jpg" alt="BPHS"></div>
          <div class="result-card-header-title">Baguio Patriotic High School</div>
          <div class="result-card-header-sub">{{ type==='sbo' ? 'SBO Election' : 'Classroom Election' }} &middot; School Year {{ state.year }}</div>
        </div>
        <div class="result-summary">
          <div class="result-summary-item"><span class="result-summary-num">{{ typeStats[type].voters }}</span> Voters</div>
          <div class="result-summary-item"><span class="result-summary-num">{{ typeStats[type].votes }}</span> Votes</div>
        </div>
        <div v-for="pos in group" :key="pos.id" class="result-position">
          <div class="result-position-header">
            <span class="result-position-name">{{ pos.name }}</span>
            <span v-if="pos.winners.length" class="result-position-winner">Winner: {{ pos.winners.map(w=>w.name).join(', ') }} ({{ pos.winners[0]?.votes||0 }} votes)</span>
            <span v-else class="result-position-winner result-position-winner--none">No winner</span>
          </div>
          <table class="result-table">
            <thead><tr><th>#</th><th>Candidate</th><th>Grade</th><th v-if="type==='classroom'">Section</th><th>Party</th><th class="col-votes">Votes</th><th class="col-pct">%</th></tr></thead>
            <tbody>
              <tr v-for="(c,i) in pos.candidates" :key="c.id" :class="{ 'result-row-winner': pos.winners.some(w=>w.id===c.id) }">
                <td class="col-num">{{ i+1 }}</td>
                <td><span v-if="pos.winners.some(w=>w.id===c.id)" class="result-crown">&#x1F3C6;</span> {{ c.name }}</td>
                <td>{{ c.grade||'N/A' }}</td>
                <td v-if="type==='classroom'">{{ c.section||'\u2014' }}</td>
                <td>{{ c.party||'\u2014' }}</td>
                <td class="col-votes">{{ c.votes }}</td>
                <td class="col-pct">{{ pos.totalVotes ? ((c.votes/pos.totalVotes)*100).toFixed(1) : '0.0' }}%</td>
              </tr>
              <tr v-if="!pos.candidates.length"><td colspan="7" class="text-muted text-center">No candidates</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <template v-else>
        <template v-if="clubs.length">
          <div v-for="club in clubs" :key="club" class="result-card" :class="{ 'result-section-break': true }">
            <div class="result-card-header">
              <div class="result-card-header-logo"><img src="/bphs-logo.jpg" alt="BPHS"></div>
              <div class="result-card-header-title">Baguio Patriotic High School</div>
              <div class="result-card-header-sub">{{ club }} &middot; Club Election &middot; School Year {{ state.year }}</div>
            </div>
            <div class="result-summary">
              <div class="result-summary-item"><span class="result-summary-num">{{ clubStats[club]?.voters||0 }}</span> Voters</div>
              <div class="result-summary-item"><span class="result-summary-num">{{ clubStats[club]?.votes||0 }}</span> Votes</div>
            </div>
            <div v-for="pos in clubPositions(club)" :key="pos.id" class="result-position">
              <div class="result-position-header">
                <span class="result-position-name">{{ pos.name }}</span>
                <span v-if="pos.winners.length" class="result-position-winner">Winner: {{ pos.winners.map(w=>w.name).join(', ') }} ({{ pos.winners[0]?.votes||0 }} votes)</span>
                <span v-else class="result-position-winner result-position-winner--none">No winner</span>
              </div>
              <table class="result-table">
                <thead><tr><th>#</th><th>Candidate</th><th>Grade</th><th>Club</th><th>Party</th><th class="col-votes">Votes</th><th class="col-pct">%</th></tr></thead>
                <tbody>
                  <tr v-for="(c,i) in pos.candidates" :key="c.id" :class="{ 'result-row-winner': pos.winners.some(w=>w.id===c.id) }">
                    <td class="col-num">{{ i+1 }}</td>
                    <td><span v-if="pos.winners.some(w=>w.id===c.id)" class="result-crown">&#x1F3C6;</span> {{ c.name }}</td>
                    <td>{{ c.grade||'N/A' }}</td>
                    <td>{{ c.club||'\u2014' }}</td>
                    <td>{{ c.party||'\u2014' }}</td>
                    <td class="col-votes">{{ c.votes }}</td>
                    <td class="col-pct">{{ pos.totalVotes ? ((c.votes/pos.totalVotes)*100).toFixed(1) : '0.0' }}%</td>
                  </tr>
                  <tr v-if="!pos.candidates.length"><td colspan="7" class="text-muted text-center">No candidates</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
        <div v-else class="result-card result-section-break">
          <div class="result-card-header">
            <div class="result-card-header-logo"><img src="/bphs-logo.jpg" alt="BPHS"></div>
            <div class="result-card-header-title">Baguio Patriotic High School</div>
            <div class="result-card-header-sub">Club Election &middot; School Year {{ state.year }}</div>
          </div>
          <div class="result-summary">
            <div class="result-summary-item"><span class="result-summary-num">{{ typeStats.club?.voters||0 }}</span> Voters</div>
            <div class="result-summary-item"><span class="result-summary-num">{{ typeStats.club?.votes||0 }}</span> Votes</div>
          </div>
          <div v-for="pos in group" :key="pos.id" class="result-position">
            <div class="result-position-header">
              <span class="result-position-name">{{ pos.name }}</span>
              <span v-if="pos.winners.length" class="result-position-winner">Winner: {{ pos.winners.map(w=>w.name).join(', ') }} ({{ pos.winners[0]?.votes||0 }} votes)</span>
              <span v-else class="result-position-winner result-position-winner--none">No winner</span>
            </div>
            <table class="result-table">
              <thead><tr><th>#</th><th>Candidate</th><th>Grade</th><th>Club</th><th>Party</th><th class="col-votes">Votes</th><th class="col-pct">%</th></tr></thead>
              <tbody>
                <tr v-for="(c,i) in pos.candidates" :key="c.id" :class="{ 'result-row-winner': pos.winners.some(w=>w.id===c.id) }">
                  <td class="col-num">{{ i+1 }}</td>
                  <td><span v-if="pos.winners.some(w=>w.id===c.id)" class="result-crown">&#x1F3C6;</span> {{ c.name }}</td>
                  <td>{{ c.grade||'N/A' }}</td>
                  <td>{{ c.club||'\u2014' }}</td>
                  <td>{{ c.party||'\u2014' }}</td>
                  <td class="col-votes">{{ c.votes }}</td>
                  <td class="col-pct">{{ pos.totalVotes ? ((c.votes/pos.totalVotes)*100).toFixed(1) : '0.0' }}%</td>
                </tr>
                <tr v-if="!pos.candidates.length"><td colspan="7" class="text-muted text-center">No candidates</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { state, getStats, getPositions, getClubs, toggleTheme } from '../store/index.js'
import Toggle from '../components/base/toggle/toggle.vue'

const stats = computed(() => getStats())
const clubs = computed(() => getClubs())
const typeStats = computed(() => {
  const voters = state.data?.voters || []
  const votes = state.data?.votes || []
  return {
    sbo: {
      voters: voters.filter(v => (v.electionType || 'sbo') === 'sbo').length,
      votes: votes.filter(v => (v.electionType || 'sbo') === 'sbo').length,
    },
    classroom: {
      voters: voters.filter(v => (v.electionType || 'sbo') === 'classroom').length,
      votes: votes.filter(v => (v.electionType || 'sbo') === 'classroom').length,
    },
    club: {
      voters: voters.filter(v => (v.electionType || 'sbo') === 'club').length,
      votes: votes.filter(v => (v.electionType || 'sbo') === 'club').length,
    },
  }
})
const clubStats = computed(() => {
  const voters = state.data?.voters || []
  const votes = state.data?.votes || []
  const out = {}
  clubs.value.forEach(club => {
    const vids = new Set(voters.filter(v => v.club === club).map(v => v.id))
    out[club] = {
      voters: vids.size,
      votes: votes.filter(v => vids.has(v.voterId)).length,
    }
  })
  return out
})
const groupedResults = computed(() => {
  const s = getStats()
  const grouped = { sbo: [], classroom: [], club: [] }
  getPositions().forEach(pos => {
    const p = s.positions[pos.id]
    if (!p) { grouped[pos.type||'sbo'].push({ ...pos, candidates: [], winners: [], totalVotes: 0 }); return }
    const max = pos.maxVote || 1
    const sorted = [...(p.candidates || [])]
    const tv = sorted.length ? sorted[0].votes : 0
    grouped[pos.type||'sbo'].push({ ...pos, totalVotes: p.totalVotes, candidates: sorted, winners: sorted.filter(c => c.votes === tv && c.votes > 0).slice(0, max) })
  })
  return grouped
})

function clubPositions(club) {
  const s = getStats()
  const posList = getPositions().filter(p => p.type === 'club')
  return posList.map(pos => {
    const p = s.positions[pos.id]
    if (!p) return { ...pos, candidates: [], winners: [], totalVotes: 0 }
    const max = pos.maxVote || 1
    const sorted = [...(p.candidates || [])].filter(c => !c.club || c.club === club)
    const clubTotal = sorted.reduce((sum, c) => sum + c.votes, 0)
    const tv = sorted.length ? sorted[0].votes : 0
    return { ...pos, totalVotes: clubTotal, candidates: sorted, winners: sorted.filter(c => c.votes === tv && c.votes > 0).slice(0, max) }
  })
}

function exportPdf() {
  const cards = document.querySelectorAll('.result-card')
  if (!cards.length) return
  let bodyHtml = ''
  cards.forEach((card, i) => {
    if (i > 0) bodyHtml += '<div style="page-break-before:always;margin:0;padding:0;"></div>'
    bodyHtml += card.outerHTML
  })
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Election Results</title><style>' +
    '@page{margin:0.75in;size:A4}@page{@bottom-center{content:counter(page);font-family:Inter,system-ui,sans-serif;font-size:8pt;color:#999}}*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:Inter,system-ui,sans-serif;color:#000;background:#fff;padding:0;font-size:11pt;line-height:1.5}' +
    '.result-card{padding:0;margin:0}' +
    '.result-card-header{text-align:center;margin-bottom:24px;padding-bottom:18px;border-bottom:2px solid #000}' +
    '.result-card-header-logo{width:56px;height:56px;margin:0 auto 10px;border-radius:50%;overflow:hidden}' +
    '.result-card-header-logo img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.result-card-header-title{font-size:16pt;font-weight:900;letter-spacing:-.5px}' +
    '.result-card-header-sub{font-size:9pt;color:#666;margin-top:3px}' +
    '.result-summary{display:flex;justify-content:center;gap:40px;margin-bottom:24px;padding:10px 20px;background:#f5f5f5;border:1px solid #ccc;border-radius:6px}' +
    '.result-summary-item{font-size:9pt;color:#666;text-align:center}' +
    '.result-summary-num{font-size:18pt;font-weight:900;color:#000;display:block;line-height:1.2}' +
    '.result-position{margin-bottom:20px;page-break-inside:avoid}' +
    '.result-position-header{display:flex;justify-content:space-between;margin-bottom:8px}' +
    '.result-position-name{font-weight:700;font-size:10pt}' +
    '.result-position-winner{font-size:9pt;font-weight:600}' +
    'table{width:100%;border-collapse:collapse;border:1px solid #999;font-size:9pt}' +
    'th{background:#e5e5e5;font-weight:600;padding:7px 10px;border-bottom:1px solid #999;text-align:left;font-size:8pt;text-transform:uppercase;letter-spacing:.4px}' +
    'td{padding:7px 10px;border-bottom:1px solid #ddd}' +
    'tr:last-child td{border-bottom:none}' +
    '.col-num{width:30px;text-align:center;color:#999}' +
    '.col-votes{width:60px;text-align:center;font-weight:700}' +
    '.col-pct{width:55px;text-align:center;color:#999}' +
    '.result-row-winner{background:#e8f5e9!important}' +
    '.result-row-winner td{font-weight:700}' +
    '.result-crown{font-size:9pt}' +
    '.text-muted{color:#999}' +
    '</style></head><body>' + bodyHtml + '</body></html>'
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 500)
}
</script>