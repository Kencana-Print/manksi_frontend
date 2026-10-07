<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { lhkDesainService as svc } from "@/services/penjualan/lhkDesainService";
import { permintaanDesainService as pdSvc } from "@/services/penjualan/permintaanDesainService";
import { formatTanggal } from "@/utils/dateFormat";
import { IconChecklist } from "@tabler/icons-vue";

const toast = useToast();

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date();
const filters = ref({
  tglAwal: toLocalDate(new Date(today.getFullYear(), today.getMonth(), 1)),
  tglAkhir: toLocalDate(today),
});

const historyItems = ref<any[]>([]);
const isLoading = ref(false);

const fetchHistory = async () => {
  isLoading.value = true;
  try {
    const res = await svc.getHistory({
      startDate: filters.value.tglAwal,
      endDate: filters.value.tglAkhir,
    });
    historyItems.value = res.data.data ?? [];
  } catch {
    toast.error("Gagal memuat riwayat LHK.");
  } finally {
    isLoading.value = false;
  }
};

watch(
  [() => filters.value.tglAwal, () => filters.value.tglAkhir],
  fetchHistory,
);
onMounted(fetchHistory);

const headers = [
  { title: "Nomor LHK", key: "LhkNomor", width: "160px" },
  { title: "Nomor PD", key: "PdNomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Nama Project", key: "NamaProject", minWidth: "180px" },
  { title: "Customer", key: "Customer", minWidth: "160px" },
  { title: "Jml", key: "Jml", width: "70px", align: "right" },
  { title: "Desainer", key: "Desainer", width: "130px" },
  { title: "Tgl Selesai", key: "TglSelesai", width: "140px" },
  { title: "Dibuat Oleh", key: "UserCreate", width: "110px" },
];

// ── Expand: desain yang dicakup LHK ini ──
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const baru = newExpanded.filter(
    (it) =>
      !detailCache.value[it.LhkNomor] && !detailLoading.value[it.LhkNomor],
  );
  for (const item of baru) {
    const key = item.LhkNomor;
    detailLoading.value[key] = true;
    try {
      const res = await pdSvc.getDetail(item.PdNomor);
      const d = res.data.data;
      const namaDesain = new Map<number, string>(
        (d?.detail ?? []).map((x: any) => [Number(x.pd2_id), x.pd2_pd_desain]),
      );
      detailCache.value[key] = (d?.kerja ?? [])
        .filter((k: any) => k.kerja_lhk_nomor === key)
        .map((k: any) => ({
          desain: namaDesain.get(Number(k.kerja_pd2_id)) ?? "-",
          jml: Number(k.kerja_jml) || 0,
          desainer: k.kerja_desainer_nama,
        }));
    } catch {
      toast.error(`Gagal memuat detail ${key}`);
    } finally {
      detailLoading.value[key] = false;
    }
  }
};
</script>

<template>
  <BaseBrowse
    title="LHK Desain"
    menu-id="185"
    :icon="IconChecklist"
    :headers="headers"
    :items="historyItems"
    :is-loading="isLoading"
    select-strategy="single"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="false"
    item-value="LhkNomor"
    @refresh="fetchHistory"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
  >
    <template #filter-left>
      <label class="flbl">Tanggal</label>
      <input type="date" v-model="filters.tglAwal" class="finp" />
      <span class="fsep">s.d.</span>
      <input type="date" v-model="filters.tglAkhir" class="finp" />
    </template>

    <template #item.Tanggal="{ item }">{{
      formatTanggal(item.Tanggal)
    }}</template>
    <template #item.TglSelesai="{ item }">{{
      formatTanggal(item.TglSelesai)
    }}</template>

    <template #detail="{ item }">
      <div class="lhk-detail-wrap">
        <v-progress-linear
          v-if="detailLoading[item.LhkNomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <table v-else-if="detailCache[item.LhkNomor]" class="lhk-detail-table">
          <thead>
            <tr>
              <th>Nama Desain</th>
              <th style="width: 130px">Desainer</th>
              <th style="width: 90px" class="tr">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in detailCache[item.LhkNomor]" :key="i">
              <td>{{ d.desain }}</td>
              <td>{{ d.desainer }}</td>
              <td class="tr">{{ d.jml }}</td>
            </tr>
            <tr v-if="!detailCache[item.LhkNomor]?.length">
              <td colspan="3" class="tc" style="color: #999">
                Tidak ada item.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.flbl {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  white-space: nowrap;
}
.finp {
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
}
.finp:focus {
  border-color: #1565c0;
}
.fsep {
  font-size: 11px;
  color: #777;
}
.lhk-detail-wrap {
  padding: 8px 16px 12px;
  background: #f5f7fb;
}
.lhk-detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
  border-radius: 4px;
  overflow: hidden;
}
.lhk-detail-table thead th {
  background: #37474f;
  color: white;
  padding: 6px 10px;
  text-align: left;
}
.lhk-detail-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #eee;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
</style>
