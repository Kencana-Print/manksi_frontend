<script setup lang="ts">
import { ref, watch } from "vue";
import { mutasiProduksiFormService } from "@/services/garmen/mutasiProduksiFormService";
import { IconHistory, IconX } from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  nomorSpk: string;
  gdgAsal: string;
  excludeNomor?: string;
}>();
const emit = defineEmits(["update:modelValue"]);

const rows = ref<any[]>([]);
const isLoading = ref(false);

const fetchData = async () => {
  if (!props.nomorSpk || !props.gdgAsal) return;
  isLoading.value = true;
  try {
    const res = await mutasiProduksiFormService.getProsesSebelumnya(
      props.nomorSpk,
      props.gdgAsal,
      props.excludeNomor || "",
    );
    rows.value = res.data.data || [];
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) fetchData();
  },
);

const num = (v: any, d = 0) =>
  Number(v || 0).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const close = () => emit("update:modelValue", false);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="720px"
    @update:model-value="close"
  >
    <div class="lookup-card">
      <div class="lookup-header">
        <IconHistory :size="15" :stroke-width="1.7" color="white" />
        <span>Proses Sebelumnya — {{ nomorSpk }}</span>
        <v-spacer />
        <button class="lookup-close" type="button" @click="close">✕</button>
      </div>
      <div class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data...</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 110px">Kode</th>
              <th>Nama</th>
              <th style="width: 60px">Sat</th>
              <th style="width: 60px">Size</th>
              <th style="width: 90px" class="tr">Mutasi</th>
              <th style="width: 90px" class="tr">Jasa</th>
              <th style="width: 90px" class="tr">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in rows" :key="i">
              <td class="td-kode">{{ r.kode }}</td>
              <td>{{ r.Nama }}</td>
              <td>{{ r.Satuan }}</td>
              <td class="tc">{{ r.Size || "-" }}</td>
              <td class="tr">{{ num(r.Mutasi) }}</td>
              <td class="tr">{{ num(r.Jasa) }}</td>
              <td class="tr fw">{{ num(r.Total) }}</td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="7" class="empty-row">
                Belum ada proses sebelumnya.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="lookup-footer">
        <v-spacer />
        <button class="btn-close-bottom" type="button" @click="close">
          Tutup
        </button>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.lookup-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
  max-height: 88vh;
}
.lookup-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  gap: 6px;
}
.lookup-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
  padding: 0 2px;
}
.lookup-close:hover {
  color: white;
}
.lookup-table-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 120px;
  max-height: 400px;
}
.lookup-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  color: #9e9e9e;
  font-size: 12px;
}
.lookup-table {
  width: 100%;
  border-collapse: collapse;
}
.lookup-table thead tr {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #1565c0;
}
.lookup-table th {
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: white;
  border: 1px solid #0d47a1;
  border-bottom: none;
  text-align: left;
  white-space: nowrap;
}
.lookup-table td {
  padding: 5px 10px;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
  color: #212121;
  white-space: nowrap;
}
.td-kode {
  font-family: monospace;
  font-weight: 600;
  font-size: 12px;
  color: #1565c0;
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
.empty-row {
  text-align: center;
  padding: 16px;
  color: #9e9e9e;
  font-style: italic;
}
.lookup-footer {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.btn-close-bottom {
  height: 30px;
  padding: 0 16px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  background: white;
  font-size: 12px;
  font-weight: 600;
  color: #555;
  cursor: pointer;
}
.btn-close-bottom:hover {
  background: #f5f5f5;
}
</style>
