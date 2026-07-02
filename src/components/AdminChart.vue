<template>
    <div class="dashboard-chart">
        <h3 class="admin-card-title">{{ title }}</h3>
        <div class="chart-wrap">
            <canvas ref="canvas"></canvas>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

const props = defineProps({
    title: { type: String, default: "" },
    labels: { type: Array, default: () => [] },
    datasets: { type: Array, default: () => [] },
});

const canvas = ref(null);
let chart = null;

function render() {
    if (chart) chart.destroy();
    if (!canvas.value) return;
    chart = new Chart(canvas.value, {
        type: "line",
        data: { labels: props.labels, datasets: props.datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(255,255,255,.95)",
                    borderColor: "#e5e7eb",
                    borderWidth: 1,
                    titleColor: "#1e1b4b",
                    bodyColor: "#6b5b8b",
                    cornerRadius: 8,
                    padding: 10,
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: "#9ca3af", font: { size: 11 } },
                },
                y: {
                    grid: { color: "rgba(0,0,0,.06)" },
                    ticks: {
                        color: "#9ca3af",
                        font: { size: 11 },
                        stepSize: 1,
                    },
                    beginAtZero: true,
                },
            },
            elements: {
                point: { radius: 0 },
                line: { tension: 0.35, borderWidth: 2 },
            },
        },
    });
}

onMounted(render);
onUnmounted(() => {
    if (chart) chart.destroy();
});
watch(() => [props.labels, props.datasets], render, { deep: true });
</script>
