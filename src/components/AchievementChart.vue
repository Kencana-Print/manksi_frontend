<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const props = defineProps<{
  title: string;
  labels: string[];
  target: number[];
  realisasi: number[];
  ach: number[];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const buildChart = () => {
  if (!canvasRef.value) return;
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  chartInstance = new Chart(canvasRef.value, {
    type: "bar",
    data: {
      labels: props.labels,
      datasets: [
        {
          type: "bar",
          label: "Target",
          data: props.target,
          backgroundColor: "#e67e22",
          yAxisID: "y",
        },
        {
          type: "bar",
          label: "Realisasi",
          data: props.realisasi,
          backgroundColor: "#5b4fc4",
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Ach(%)",
          data: props.ach,
          borderColor: "#2e7d32",
          backgroundColor: "#2e7d32",
          yAxisID: "y1",
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: props.title,
          color: "#1565c0",
          font: { size: 13, weight: "bold" },
        },
        legend: { position: "bottom" },
        tooltip: { mode: "index", intersect: false },
      },
      scales: {
        y: {
          type: "linear",
          position: "left",
          title: { display: true, text: "Target/Realisasi" },
          ticks: { callback: (v) => Number(v).toLocaleString("id-ID") },
        },
        y1: {
          type: "linear",
          position: "right",
          title: { display: true, text: "Ach(%)" },
          grid: { drawOnChartArea: false },
          ticks: { callback: (v) => `${v}%` },
        },
      },
    },
  });
};

onMounted(buildChart);
watch(
  () => [props.labels, props.target, props.realisasi, props.ach],
  buildChart,
  { deep: true },
);
onBeforeUnmount(() => {
  if (chartInstance) chartInstance.destroy();
});
</script>

<template>
  <div class="chart-wrap"><canvas ref="canvasRef"></canvas></div>
</template>

<style scoped>
.chart-wrap {
  position: relative;
  width: 100%;
  height: 640px;
}
</style>
