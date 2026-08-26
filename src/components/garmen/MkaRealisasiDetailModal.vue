<script setup lang="ts">
import { ref, watch } from "vue";
import { mkaService } from "@/services/garmen/mkaService";

const props = defineProps<{ modelValue: boolean; nomor: string }>();
const emit = defineEmits(["update:modelValue"]);

const rows = ref<any[]>([]);
const isLoading = ref(false);

const fetchData = async () => {
  if (!props.nomor) return;
  isLoading.value = true;
  try {
    const res = await mkaService.getRealisasiDetail(props.nomor);
    rows.value = res.data.data || [];
  } catch {
    rows.value = [];
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) fetchData();
  },
);

const numFmt = (v: any) =>
  v != null ? Number(v).toLocaleString("id-ID") : "0";
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="700px"
  >
    <div class="realisasi-card">
      <div class="realisasi-header">
        <span>Detail Realisasi Aksesoris — {{ nomor }}</span>
        <button
          class="realisasi-close"
          @click="emit('update:modelValue', false)"
        >
          ✕
        </button>
      </div>
      <div class="realisasi-body">
        <div v-if="isLoading" class="realisasi-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data...</span>
        </div>
        <table v-else-if="rows.length > 0" class="realisasi-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Aksesoris</th>
              <th class="tc">Satuan</th>
              <th class="tr">Diminta</th>
              <th class="tr">Realisasi</th>
              <th class="tr">Kurang</th>
              <th class="tc">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(r, i) in rows"
              :key="i"
              :class="{ 'row-belum': r.StatusSiap === 'BELUM' }"
            >
              <td class="mono">{{ r.Kode }}</td>
              <td>{{ r.NamaAksesoris }}</td>
              <td class="tc">{{ r.Satuan }}</td>
              <td class="tr">{{ numFmt(r.Diminta) }}</td>
              <td class="tr">{{ numFmt(r.Realisasi) }}</td>
              <td class="tr" :class="{ 'text-red fw': Number(r.Kurang) > 0 }">
                {{ numFmt(r.Kurang) }}
              </td>
              <td class="tc">
                <span
                  class="status-chip"
                  :class="r.StatusSiap === 'SIAP' ? 'chip-siap' : 'chip-belum'"
                  >{{ r.StatusSiap }}</span
                >
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="realisasi-state">Tidak ada data aksesoris.</div>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.realisasi-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.realisasi-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #e65100;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
}
.realisasi-close {
  background: transparent;
  border: none;
  color: white;
  font-size: 14px;
  cursor: pointer;
}
.realisasi-body {
  padding: 12px;
  max-height: 60vh;
  overflow-y: auto;
}
.realisasi-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  color: #9e9e9e;
  font-size: 12px;
}
.realisasi-table {
  width: 100%;
  border-collapse: collapse;
}
.realisasi-table th {
  background: #f5f5f5;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  border-bottom: 2px solid #e0e0e0;
}
.realisasi-table td {
  padding: 5px 8px;
  font-size: 11px;
  border-bottom: 1px solid #f0f0f0;
}
.row-belum td {
  background: #fff8e1;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.fw {
  font-weight: 700;
}
.mono {
  font-family: monospace;
}
.text-red {
  color: #c62828;
}
.status-chip {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 3px;
}
.chip-siap {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}
.chip-belum {
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
}
</style>
