<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { proofService } from "@/services/ppic/proofService";
import { exportExcelSingle } from "@/utils/excelExport";
import { IconClipboardCheck } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

// ── Filter periode + cabang ──────────────────────────────────────────
const today = new Date().toISOString().substring(0, 10);
const startOfMonth = today.substring(0, 8) + "01";

const SESSION_KEY = "proof_browse_filter";
const savedFilter = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
  } catch {
    return {};
  }
})();

const cabangOptions = ref<string[]>(["ALL", "P01", "P04"]);
const userCab = ref("");

const filterState = ref({
  dtAwal: savedFilter.dtAwal || startOfMonth,
  dtAkhir: savedFilter.dtAkhir || today,
  cab: savedFilter.cab || "ALL",
});

watch(
  filterState,
  (val) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(val));
    fetchData();
  },
  { deep: true },
);

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selectedItem,
  fetchData,
} = useBrowse({
  menuId: "122",
  fetchApi: async () => {
    const res = await proofService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      cab: filterState.value.cab,
    });
    return res.data.data;
  },
  immediate: false,
});

// ── Headers ────────────────────────────────────────────────────────────
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Cab", key: "Cab", width: "60px", align: "center" },
  { title: "Lini", key: "Lini", width: "90px" },
  { title: "SPK", key: "Spk", width: "150px" },
  { title: "Nama SPK", key: "NamaSpk", minWidth: "250px" },
  { title: "Petugas", key: "Petugas", width: "110px" },
  { title: "Jam", key: "Jam", width: "80px", align: "center" },
];

// ── Expand row — detail per SPK ─────────────────────────────────────────
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.Nomor] && !expandedLoading.value[item.Nomor],
  );
  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    expandedLoading.value[nomor] = true;
    try {
      const res = await proofService.getDetail(nomor);
      detailCache.value[nomor] = res.data.data || [];
    } catch {
      toast.error(`Gagal muat detail ${nomor}`);
      detailCache.value[nomor] = [];
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// ── Handlers ─────────────────────────────────────────────────────────
// Cabang default untuk form Baru — sesuai Delphi cxButton2Click:
// user cabang sendiri > filter browse selain ALL > fallback P04
const resolveCreateCab = () => {
  if (userCab.value && userCab.value !== "HO-") return userCab.value;
  if (filterState.value.cab && filterState.value.cab !== "ALL")
    return filterState.value.cab;
  return "P04";
};

const onAdd = () => {
  router.push({
    path: "/ppic/proof/create",
    query: { cab: resolveCreateCab() },
  });
};
const onEdit = (item: any) => {
  if (userCab.value && userCab.value !== "HO-" && item.Cab !== userCab.value) {
    toast.warning("Data tsb bukan cabang anda.");
    return;
  }
  router.push({
    path: `/ppic/proof/edit/${encodeURIComponent(item.Nomor)}`,
    query: { cab: item.Cab },
  });
};
const onDelete = async (item: any) => {
  try {
    await proofService.deleteData(item.Nomor);
    toast.success("Berhasil dihapus.");
    delete detailCache.value[item.Nomor];
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  }
};

const onExport = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diekspor.");
  await exportExcelSingle(
    `Proof_${filterState.value.dtAwal}_${filterState.value.dtAkhir}.xlsx`,
    "Proof",
    [
      { header: "Nomor", key: "Nomor", width: 20 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Cab", key: "Cab", width: 10, align: "center" },
      { header: "Lini", key: "Lini", width: 14 },
      { header: "SPK", key: "Spk", width: 20 },
      { header: "Nama SPK", key: "NamaSpk", width: 35 },
      { header: "Petugas", key: "Petugas", width: 16 },
      { header: "Jam", key: "Jam", width: 12, align: "center" },
    ],
    items.value,
    `Proof Periode ${filterState.value.dtAwal} s/d ${filterState.value.dtAkhir}`,
  );
};

const onExportDetail = async () => {
  try {
    const res = await proofService.getExportDetail({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      cab: filterState.value.cab,
    });
    const detailRows = res.data.data || [];
    if (!detailRows.length)
      return toast.warning("Tidak ada detail untuk diekspor.");
    await exportExcelSingle(
      `Proof_Detail_${filterState.value.dtAwal}_${filterState.value.dtAkhir}.xlsx`,
      "Proof Detail",
      [
        { header: "Nomor", key: "Nomor", width: 20 },
        { header: "Kode", key: "Kode", width: 14 },
        { header: "Nama Komponen", key: "NamaKomponen", width: 30 },
        { header: "Size", key: "Size", width: 10 },
        { header: "Jenis Kain", key: "JenisKain", width: 16 },
        { header: "Warna Kain", key: "WarnaKain", width: 16 },
        {
          header: "Jumlah",
          key: "Jumlah",
          width: 12,
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Waktu Kerja", key: "WaktuKerja", width: 14 },
      ],
      detailRows,
      `Proof Detail Periode ${filterState.value.dtAwal} s/d ${filterState.value.dtAkhir}`,
    );
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal export detail.");
  }
};

onMounted(async () => {
  try {
    const res = await proofService.getMeta();
    const meta = res.data.data;
    cabangOptions.value = meta.cabangOptions || ["ALL", "P01", "P04"];
    userCab.value = meta.userCab || "";
    // Kalau belum ada filter tersimpan di session, pakai default dari
    // cabang user (sesuai Delphi: cbCab.Text := frmMenu.CAB)
    if (!savedFilter.cab) {
      filterState.value.cab = meta.defaultCab || "ALL";
    }
  } catch (e) {
    console.error("Gagal load meta proof:", e);
  }
  fetchData();
});
</script>

<template>
  <BaseBrowse
    title="Proof Garmen"
    menu-id="122"
    :icon="IconClipboardCheck"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="Nomor"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Cabang</span>
        <select v-model="filterState.cab" class="f-select">
          <option v-for="c in cabangOptions" :key="c" :value="c">
            {{ c }}
          </option>
        </select>
      </div>
    </template>

    <template #extra-actions>
      <v-btn size="small" color="teal-darken-2" @click="onExportDetail">
        Export Detail
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <!-- Expand: detail komponen per baris proof -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="expandedLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">
            Detail Komponen - {{ item.Nomor }}
          </div>
          <table class="det-table">
            <thead>
              <tr>
                <th style="width: 90px">Kode</th>
                <th style="width: 220px">Nama Komponen</th>
                <th style="width: 70px">Size</th>
                <th style="width: 110px">Jenis Kain</th>
                <th style="width: 110px">Warna Kain</th>
                <th style="width: 80px" class="tr">Jumlah</th>
                <th style="width: 100px">Waktu Kerja</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in detailCache[item.Nomor]" :key="i">
                <td class="mono">{{ d.Kode }}</td>
                <td>{{ d.NamaKomponen || "-" }}</td>
                <td>{{ d.Size }}</td>
                <td>{{ d.JenisKain }}</td>
                <td>{{ d.WarnaKain }}</td>
                <td class="tr">{{ d.Jumlah }}</td>
                <td>{{ d.WaktuKerja }}</td>
              </tr>
              <tr v-if="!detailCache[item.Nomor]?.length">
                <td colspan="7" class="empty-row">Tidak ada data</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-date,
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}
.f-sep {
  font-size: 11px;
  color: #555;
}
.expand-wrap {
  padding: 10px 10px 10px 40px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: 700;
  color: #1565c0;
}
.det-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-size: 11px;
}
.det-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 10px;
  font-size: 11px;
}
.det-table td {
  padding: 4px 10px;
  border-bottom: 1px solid #eee;
  font-size: 12px;
}
.tr {
  text-align: right;
}
.mono {
  font-family: monospace;
  color: #1565c0;
  font-weight: 600;
}
.empty-row {
  text-align: center;
  padding: 16px;
  color: #9e9e9e;
  font-style: italic;
}
</style>
