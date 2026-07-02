<script setup>
import { computed, ref } from "vue";
import { getClubs, getPositions, getStats, state, toggleTheme } from "../store/index.js";
import AdminChart from "./AdminChart.vue";
import Toggle from "../components/base/toggle/toggle.vue";

const typeFilter = ref("all");
const gradeFilter = ref("");
const sectionFilter = ref("");
const clubFilter = ref("");
const query = ref("");

const stats = computed(() => getStats());
const clubs = computed(() => getClubs());
const positions = computed(() => getPositions());

const voters = computed(() => state.data?.voters || []);
const votes = computed(() => state.data?.votes || []);

const filteredVoters = computed(() => voters.value.filter((voter) => {
  if (typeFilter.value !== "all" && (voter.electionType || "sbo") !== typeFilter.value) return false;
  if (gradeFilter.value && voter.grade !== gradeFilter.value) return false;
  if (sectionFilter.value && voter.section !== sectionFilter.value) return false;
  if (clubFilter.value && voter.club !== clubFilter.value) return false;
  return true;
}));

const filteredVoterIds = computed(() => new Set(filteredVoters.value.map((voter) => voter.id)));
const filteredVotes = computed(() => votes.value.filter((vote) => filteredVoterIds.value.has(vote.voterId)));

const filteredPositionResults = computed(() => {
  const needle = query.value.trim().toLowerCase();
  return positions.value
    .filter((position) => typeFilter.value === "all" || (position.type || "sbo") === typeFilter.value)
    .filter((position) => !needle || position.name.toLowerCase().includes(needle))
    .map((position) => {
      const base = stats.value.positions[position.id] || { candidates: [], winners: [], totalVotes: 0 };
      const candidates = base.candidates.map((candidate) => {
        const count = filteredVotes.value.filter((vote) => vote.candidateId === candidate.id).length;
        return { ...candidate, votes: count };
      }).sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
      const topVotes = candidates[0]?.votes || 0;
      const winners = candidates.filter((candidate) => topVotes > 0 && candidate.votes === topVotes).slice(0, Number(position.maxVote || 1));
      const tieCount = candidates.filter((candidate) => topVotes > 0 && candidate.votes === topVotes).length;
      return {
        ...position,
        candidates,
        totalVotes: candidates.reduce((sum, candidate) => sum + candidate.votes, 0),
        winners,
        tied: tieCount > Number(position.maxVote || 1),
      };
    });
});

const totalBallots = computed(() => filteredVoters.value.length);
const totalVotes = computed(() => filteredVotes.value.length);
const activePositions = computed(() => filteredPositionResults.value.filter((position) => !position.archived).length);
const archivedItems = computed(() =>
  (state.data?.positions || []).filter((position) => position.archived).length +
  (state.data?.candidates || []).filter((candidate) => candidate.archived).length
);

const chartLabels = computed(() => filteredPositionResults.value.map((position) => position.name));
const chartDatasets = computed(() => [{
  label: "Votes",
  data: filteredPositionResults.value.map((position) => position.totalVotes),
  borderColor: "#2563eb",
  backgroundColor: "rgba(37,99,235,.14)",
  fill: true,
  tension: 0.35,
  pointRadius: 0,
  borderWidth: 2,
}]);

function pct(candidate, position) {
  return position.totalVotes ? ((candidate.votes / position.totalVotes) * 100).toFixed(1) : "0.0";
}

function exportCsv() {
  const headers = ["Election", "Position", "Candidate", "Grade", "Section", "Club", "Party", "Votes", "Percent", "Status"];
  const rows = filteredPositionResults.value.flatMap((position) =>
    position.candidates.map((candidate) => [
      position.type || "sbo",
      position.name,
      candidate.name,
      candidate.grade || "",
      candidate.section || "",
      candidate.club || "",
      candidate.party || "",
      candidate.votes,
      pct(candidate, position),
      position.winners.some((winner) => winner.id === candidate.id) ? (position.tied ? "Tie" : "Winner") : "",
    ]),
  );
  const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `BPHS_Results_${state.year}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function printResults() {
  window.print();
}
</script>

<template>
  <div>
    <div class="admin-head-actions no-print">
      <div>
        <h2>Results</h2>
        <p class="text-sm text-muted" style="margin-top:4px;">Live tally, turnout, winners, ties, and export-ready reports.</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <Toggle :model-value="state.isDark" @update:model-value="toggleTheme" slim size="sm" title="Toggle theme" />
        <span class="badge-year">{{ state.year }}</span>
      </div>
    </div>

    <div class="summary-stats no-print">
      <div class="stat-card stat-voters"><div class="stat-num">{{ totalBallots }}</div><div class="stat-label">Ballots</div></div>
      <div class="stat-card stat-votes"><div class="stat-num">{{ totalVotes }}</div><div class="stat-label">Votes</div></div>
      <div class="stat-card stat-positions"><div class="stat-num">{{ activePositions }}</div><div class="stat-label">Active Positions</div></div>
      <div class="stat-card stat-candidates"><div class="stat-num">{{ archivedItems }}</div><div class="stat-label">Archived Records</div></div>
    </div>

    <div class="card no-print">
      <div class="filter-bar">
        <div class="form-group"><label>Election</label><select v-model="typeFilter"><option value="all">All</option><option value="sbo">SBO</option><option value="classroom">Classroom</option><option value="club">Club</option></select></div>
        <div class="form-group"><label>Grade</label><select v-model="gradeFilter"><option value="">All</option><option v-for="grade in state.data?.settings?.grades || []" :key="grade" :value="grade">Grade {{ grade }}</option></select></div>
        <div class="form-group"><label>Section</label><input v-model="sectionFilter" type="text" placeholder="Any section" /></div>
        <div class="form-group"><label>Club</label><select v-model="clubFilter"><option value="">All</option><option v-for="club in clubs" :key="club" :value="club">{{ club }}</option></select></div>
        <div class="form-group"><label>Search</label><input v-model="query" type="text" placeholder="Position name" /></div>
      </div>
      <div class="admin-actions compact">
        <button class="btn btn-sm btn-success" @click="exportCsv">Export CSV</button>
        <button class="btn btn-sm btn-outline" @click="printResults">Print / PDF</button>
      </div>
    </div>

    <div class="card no-print">
      <AdminChart title="Votes by Position" :labels="chartLabels" :datasets="chartDatasets" />
    </div>

    <div class="result-card">
      <div class="result-card-header">
        <div class="result-card-header-logo"><img src="/bphs-logo.jpg" alt="BPHS"></div>
        <div class="result-card-header-title">Baguio Patriotic High School</div>
        <div class="result-card-header-sub">Election Results · School Year {{ state.year }}</div>
      </div>

      <div class="result-summary">
        <div class="result-summary-item"><span class="result-summary-num">{{ totalBallots }}</span> Ballots</div>
        <div class="result-summary-item"><span class="result-summary-num">{{ totalVotes }}</span> Votes</div>
      </div>

      <div v-for="position in filteredPositionResults" :key="position.id" class="result-position">
        <div class="result-position-header">
          <span class="result-position-name">
            {{ position.name }}
            <span v-if="position.archived" class="badge badge-sm badge-danger">Archived</span>
          </span>
          <span v-if="position.winners.length" class="result-position-winner">
            {{ position.tied ? "Tie" : "Winner" }}:
            {{ position.winners.map((winner) => winner.name).join(", ") }}
          </span>
          <span v-else class="result-position-winner result-position-winner--none">No winner yet</span>
        </div>
        <table class="result-table">
          <thead><tr><th>#</th><th>Candidate</th><th>Scope</th><th>Party</th><th>Status</th><th class="col-votes">Votes</th><th class="col-pct">%</th></tr></thead>
          <tbody>
            <tr v-for="(candidate, index) in position.candidates" :key="candidate.id" :class="{ 'result-row-winner': position.winners.some((winner) => winner.id === candidate.id) }">
              <td class="col-num">{{ index + 1 }}</td>
              <td>{{ candidate.name }}</td>
              <td>Grade {{ candidate.grade || "-" }}{{ candidate.section ? " - " + candidate.section : "" }}{{ candidate.club ? " - " + candidate.club : "" }}</td>
              <td>{{ candidate.party || "-" }}</td>
              <td><span class="badge badge-sm" :class="candidate.archived ? 'badge-danger' : 'badge-success'">{{ candidate.archived ? "Archived" : "Active" }}</span></td>
              <td class="col-votes">{{ candidate.votes }}</td>
              <td class="col-pct">{{ pct(candidate, position) }}%</td>
            </tr>
            <tr v-if="!position.candidates.length"><td colspan="7" class="text-muted text-center">No candidates</td></tr>
          </tbody>
        </table>
      </div>

      <p v-if="!filteredPositionResults.length" class="text-muted text-center">No results match the current filters.</p>
    </div>
  </div>
</template>
