<template>
    <div>
        <div class="admin-head-actions">
            <div>
                <h2>Dashboard</h2>
                <p class="text-sm text-muted" style="margin-top: 4px">
                    Overview of election statistics and recent activity.
                </p>
            </div>
            <div style="display: flex; gap: 8px; align-items: center">
                <Toggle
                    :model-value="state.isDark"
                    @update:model-value="toggleTheme"
                    slim
                    size="sm"
                    title="Toggle theme"
                />
                <span class="badge-year">{{ state.year }}</span>
            </div>
        </div>
        <div class="summary-stats">
            <div class="stat-card stat-voters">
                <div class="stat-num">{{ stats.totalVoters }}</div>
                <div class="stat-label">Voters</div>
            </div>
            <div class="stat-card stat-votes">
                <div class="stat-num">{{ stats.totalVotes }}</div>
                <div class="stat-label">Votes</div>
            </div>
            <div class="stat-card stat-positions">
                <div class="stat-num">{{ positions.length }}</div>
                <div class="stat-label">Positions</div>
            </div>
            <div class="stat-card stat-candidates">
                <div class="stat-num">{{ allCandidates.length }}</div>
                <div class="stat-label">Candidates</div>
            </div>
        </div>
        <div class="card">
            <div class="flex-between">
                <h3 class="admin-card-title">Status</h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap">
                    <span
                        class="badge badge-sm"
                        :class="
                            (settings.sboActive ?? true)
                                ? 'badge-warning'
                                : 'badge-danger'
                        "
                        style="font-size: 0.68rem"
                        >SBO
                        {{
                            (settings.sboActive ?? true) ? "Active" : "Closed"
                        }}</span
                    >
                    <span
                        class="badge badge-sm"
                        :class="
                            (settings.classroomActive ?? true)
                                ? 'badge-success'
                                : 'badge-danger'
                        "
                        style="font-size: 0.68rem"
                        >Classroom
                        {{
                            (settings.classroomActive ?? true)
                                ? "Active"
                                : "Closed"
                        }}</span
                    >
                    <span
                        class="badge badge-sm"
                        :class="
                            (settings.clubActive ?? true)
                                ? 'badge-club'
                                : 'badge-danger'
                        "
                        style="font-size: 0.68rem"
                        >Club
                        {{
                            (settings.clubActive ?? true) ? "Active" : "Closed"
                        }}</span
                    >
                </div>
            </div>
            <p class="mt-8 text-sm text-muted">{{ settings.title }}</p>
        </div>
        <div class="card mt-16">
            <AdminChart
                title="Votes Over Time"
                :labels="chartLabels"
                :datasets="chartDatasets"
            ></AdminChart>
        </div>
        <div class="card mt-16">
            <div class="flex-between" style="margin-bottom: 12px">
                <h3 class="admin-card-title">Recent Reports</h3>
                <span
                    class="badge"
                    :class="reports.length ? 'badge-danger' : 'badge-success'"
                    >{{ reports.length }}</span
                >
            </div>
            <div v-if="reports.length" class="reports-list">
                <div
                    v-for="r in reports.slice(0, 5)"
                    :key="r.id"
                    class="report-item"
                >
                    <div class="report-item-head">
                        <strong>{{ r.name }}</strong>
                        <span class="text-muted text-sm">{{
                            new Date(r.timestamp).toLocaleString()
                        }}</span>
                    </div>
                    <p class="text-sm">{{ r.message }}</p>
                </div>
                <p v-if="reports.length > 5" class="text-sm text-muted mt-8">
                    +{{ reports.length - 5 }} more
                </p>
            </div>
            <p v-else class="text-sm text-muted">No reports yet.</p>
        </div>
    </div>
</template>

<script setup>
import { computed } from "vue";
import {
    state,
    getStats,
    getPositions,
    getAllCandidates,
    getSettings,
    getVotes,
    getReports,
    toggleTheme,
} from "../store/index.js";
import AdminChart from "./AdminChart.vue";
import Toggle from "../components/base/toggle/toggle.vue";

const stats = computed(() => getStats());
const positions = computed(() => getPositions());
const allCandidates = computed(() => getAllCandidates());
const settings = computed(() => getSettings());
const reports = computed(() => getReports());

const allVotes = computed(() => getVotes());

function groupByDate() {
    const map = {};
    allVotes.value.forEach((v) => {
        if (!v.timestamp) return;
        const date = new Date(v.timestamp);
        if (Number.isNaN(date.getTime())) return;
        const key = date.toISOString().slice(0, 10);
        if (!map[key])
            map[key] = { label: date.toLocaleDateString(), votes: 0 };
        map[key].votes++;
    });
    return map;
}

const chartLabels = computed(() =>
    Object.keys(groupByDate())
        .sort()
        .map((key) => groupByDate()[key].label),
);
const chartDatasets = computed(() => {
    const map = groupByDate();
    const sorted = Object.keys(map).sort();
    return [
        {
            label: "Votes",
            data: sorted.map((d) => map[d].votes),
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,.1)",
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 2,
        },
    ];
});
</script>
