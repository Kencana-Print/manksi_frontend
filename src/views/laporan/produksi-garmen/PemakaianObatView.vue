<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { laporanPemakaianObatService } from "@/services/laporan/produksi-garmen/laporanPemakaianObatService";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { IconFlask, IconFileSpreadsheet, IconSearch } from "@tabler/icons-vue";

const toast = useToast();
const authStore = useAuthStore();
const menuId = "565";

const canLihatSup = computed(() => authStore.user?.flags?.lihatSup === 1);

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const dtAwal = ref(toLocalDateStr(firstDayOfMonth));
const dtAkhir = ref(toLocalDateStr(today));

const cab = ref("P04");
const nomorSpk = ref("");
const namaSpkTerpilih = ref("");
const showSpkModal = ref(false);

const onSpkSelected = (item: any) => {
  nomorSpk.value = item.Nomor;
  namaSpkTerpilih.value = item.Nama || item.Nama2 || "";
};
const clearSpk = () => {
  nomorSpk.value = "";
  namaSpkTerpilih.value = "";
};

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await laporanPemakaianObatService.getBrowse(
      dtAwal.value,
      dtAkhir.value,
      cab.value,
      nomorSpk.value,
    );
    return res.data.data;
  },
  immediate: true,
});

watch([dtAwal, dtAkhir, cab, nomorSpk], fetchData);

const masterHeaders = computed(() => {
  const base = [
    { title: "Kode", key: "Kode", width: "90px" },
    { title: "Jenis Obat", key: "JenisObat", minWidth: "220px" },
    { title: "Jumlah (Kg)", key: "JumlahKg", width: "100px", align: "right" },
    { title: "Harga", key: "Harga", width: "120px", align: "right" },
  ];
  if (canLihatSup.value) {
    base.push({ title: "Supplier", key: "Supplier", minWidth: "180px" });
  }
  return base;
});

// ── Master-detail (row expand) ──
const expandedRows = ref<any[]>([]);
const detailData = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (val: any[]) => {
  expandedRows.value = val;
  for (const v of val) {
    const kode = typeof v === "object" ? v.Kode : v;
    if (!kode || detailData.value[kode]) continue;
    detailLoading.value[kode] = true;
    try {
      const res = await laporanPemakaianObatService.getDetail(
        kode,
        dtAwal.value,
        dtAkhir.value,
        cab.value,
        nomorSpk.value,
      );
      detailData.value[kode] = res.data.data || [];
    } catch {
      detailData.value[kode] = [];
    } finally {
      detailLoading.value[kode] = false;
    }
  }
};

const numFmt = (v: any, d = 2) =>
  Number(v || 0).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

// ── Export master ──
const isExporting = ref(false);
const onExportMaster = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const list = items.value ?? [];
  if (!list.length) return toast.warning("Tidak ada data.");
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Kode", key: "Kode", width: 12 },
      { header: "Jenis Obat", key: "JenisObat", width: 28 },
      {
        header: "Jumlah (Kg)",
        key: "JumlahKg",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Harga",
        key: "Harga",
        width: 16,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    if (canLihatSup.value) {
      columns.push({ header: "Supplier", key: "Supplier", width: 22 });
    }
    await exportExcelSingle(
      `Pemakaian_Obat_${dtAwal.value}_${dtAkhir.value}.xlsx`,
      "Pemakaian Obat",
      columns,
      list,
      `Laporan Pemakaian Obat  |  Periode: ${formatTanggal(dtAwal.value)} s.d ${formatTanggal(dtAkhir.value)}`,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

// ── Export detail ──
const isExportingDetail = ref(false);
const onExportDetail = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  isExportingDetail.value = true;
  try {
    const res = await laporanPemakaianObatService.getAllDetail(
      dtAwal.value,
      dtAkhir.value,
      cab.value,
      nomorSpk.value,
    );
    const allDetail: any[] = res.data.data || [];
    if (!allDetail.length) {
      toast.warning("Tidak ada data detail.");
      return;
    }

    // ✅ Kelompokkan per Kode obat (jaga urutan kemunculan pertama)
    const groups: Record<string, any[]> = {};
    const order: string[] = [];
    allDetail.forEach((r) => {
      const key = r.Kode;
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(r);
    });

    const combinedRows: any[] = [];

    order.forEach((key) => {
      const rowsInGroup = groups[key];
      const first = rowsInGroup[0];
      const masterCells = {
        Kode: first.Kode,
        JenisObat: first.JenisObat,
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      rowsInGroup.forEach((r, idx) => {
        combinedRows.push({
          ...(idx === 0 ? masterCells : blankMaster),
          Spk: r.Spk,
          NamaSPK: r.NamaSPK,
          JumlahKg: Number(r.JumlahKg) || 0,
          Harga: Number(r.Harga) || 0,
        });
      });
    });

    const columns: ExcelColumn[] = [
      { header: "Kode", key: "Kode", width: 12 },
      { header: "Jenis Obat", key: "JenisObat", width: 26 },
      { header: "SPK", key: "Spk", width: 16 },
      { header: "Nama SPK", key: "NamaSPK", width: 30 },
      {
        header: "Jumlah (Kg)",
        key: "JumlahKg",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Harga",
        key: "Harga",
        width: 16,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];

    await exportExcelSingle(
      `Pemakaian_Obat_Detail_${dtAwal.value}_${dtAkhir.value}.xlsx`,
      "Detail per SPK",
      columns,
      combinedRows,
      `Rincian Pemakaian Obat per SPK  |  Periode: ${formatTanggal(dtAwal.value)} s.d ${formatTanggal(dtAkhir.value)}`,
    );

    toast.success("Berhasil export detail.");
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <BaseBrowse
    title="Laporan Pemakaian Obat"
    :menu-id="menuId"
    :icon="IconFlask"
    :headers="masterHeaders"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Kode"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="dtAwal" class="f-date" />
        <span class="f-sep">sd</span>
        <input type="date" v-model="dtAkhir" class="f-date" />
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <span class="f-label">Cabang</span>
        <select v-model="cab" class="f-select">
          <option value="ALL">ALL</option>
          <option value="P01">P01</option>
          <option value="P04">P04</option>
        </select>
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <span class="f-label">Filter Nomor SPK</span>
        <div class="spk-picker">
          <input
            type="text"
            :value="nomorSpk"
            readonly
            class="text-inp"
            style="width: 120px; cursor: pointer"
            placeholder="Klik untuk pilih..."
            @click="showSpkModal = true"
          />
          <button
            v-if="nomorSpk"
            type="button"
            class="btn-clear-spk"
            @click="clearSpk"
          >
            ✕
          </button>
          <button
            type="button"
            class="btn-search-spk"
            @click="showSpkModal = true"
          >
            <IconSearch :size="13" />
          </button>
        </div>
        <span v-if="namaSpkTerpilih" class="spk-nama-hint">{{
          namaSpkTerpilih
        }}</span>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        v-if="canExport"
        size="small"
        color="green"
        class="mr-1"
        :loading="isExporting"
        @click="onExportMaster"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
      <v-btn
        v-if="canExport"
        size="small"
        color="teal-darken-1"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
        Detail
      </v-btn>
    </template>

    <template #item.JumlahKg="{ item }">{{ numFmt(item.JumlahKg) }}</template>
    <template #item.Harga="{ item }">{{ numFmt(item.Harga) }}</template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.Kode]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat detail...</span>
        </div>
        <table v-else class="dtl-table">
          <thead>
            <tr>
              <th style="width: 130px">SPK</th>
              <th style="min-width: 260px">Nama SPK</th>
              <th style="width: 100px" class="tr">Jumlah (Kg)</th>
              <th style="width: 110px" class="tr">Harga</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in detailData[item.Kode]" :key="i">
              <td class="font-weight-bold text-primary">{{ d.Spk }}</td>
              <td>{{ d.NamaSPK }}</td>
              <td class="tr">{{ numFmt(d.JumlahKg) }}</td>
              <td class="tr">{{ numFmt(d.Harga) }}</td>
            </tr>
            <tr v-if="!detailData[item.Kode]?.length">
              <td colspan="4" class="empty-row">Tidak ada rincian per SPK.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="all"
    @selected="onSpkSelected"
  />
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
.f-sep {
  font-size: 11px;
  color: #555;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 4px;
}
.spk-picker {
  display: inline-flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  height: 28px;
}
.text-inp {
  border: none;
  height: 26px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.btn-clear-spk {
  background: #ffebee;
  border: none;
  color: #c62828;
  font-size: 11px;
  width: 22px;
  height: 26px;
  cursor: pointer;
}
.btn-search-spk {
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #ccc;
  color: #1565c0;
  width: 24px;
  height: 26px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spk-nama-hint {
  font-size: 11px;
  color: #757575;
  font-style: italic;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-wrap {
  padding: 10px 14px 16px;
  background: #f5f7fb;
  border-top: 2px solid #dde3ea;
}
.detail-loading {
  display: flex;
  align-items: center;
  padding: 12px;
  color: #555;
}
.dtl-table {
  width: 100%;
  max-width: 600px;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
  border: 1px solid #cfd8dc;
  border-radius: 6px;
  overflow: hidden;
}
.dtl-table thead th {
  background: #eceff1;
  color: #37474f;
  padding: 6px 10px;
  text-align: left;
  font-weight: 700;
  border-bottom: 2px solid #b0bec5;
}
.dtl-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.tr {
  text-align: right;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  padding: 14px;
  font-style: italic;
}
</style>
