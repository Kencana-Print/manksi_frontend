<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { bbmService } from "@/services/piutang/bbmService";
import {
  IconBuildingBank,
  IconPrinter,
  IconFileExport,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import api from "@/services/api";

const toast = useToast();
const router = useRouter();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// --- Filter ---
const getToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const getAwalBulan = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
};

const filterState = ref<Record<string, any>>({});
const startDate = ref(getAwalBulan());
const endDate = ref(getToday());
const cabang = ref("HO-");
const ALLOWED_CABANG = ["HO-", "P01", "P04"];
const listCabang = ref<{ kode: string; nama: string }[]>([]);

watch([startDate, endDate, cabang], () => fetchData());

const loadCabang = async () => {
  try {
    const res = await api.get("/lookups/cabang-pabrik");
    const items = res.data.data?.items || res.data.data || [];
    listCabang.value = items
      .map((c: any) => ({
        kode: c.pab_kode || c.Kode,
        nama: c.pab_nama || c.Nama,
      }))
      .filter((c: any) => ALLOWED_CABANG.includes(c.kode));
  } catch (e) {
    console.error("Gagal load cabang", e);
  }
};

// --- Cache detail per periode — di-fetch bareng browse, dikelompokkan
// per Nomor di client saat baris di-expand ---
const detailCache = ref<Record<string, any[]>>({});

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
  menuId: "954",
  fetchApi: async () => {
    const [resBrowse, resDetail] = await Promise.all([
      bbmService.getBrowse({
        startDate: startDate.value,
        endDate: endDate.value,
        cabang: cabang.value,
      }),
      bbmService.getBrowseDetail({
        startDate: startDate.value,
        endDate: endDate.value,
        cabang: cabang.value,
      }),
    ]);

    const grouped: Record<string, any[]> = {};
    for (const row of resDetail.data.data as any[]) {
      if (!grouped[row.Nomor]) grouped[row.Nomor] = [];
      grouped[row.Nomor].push(row);
    }
    detailCache.value = grouped;

    return resBrowse.data.data;
  },
  immediate: false,
});

onMounted(async () => {
  await loadCabang();
  fetchData();
});

// --- Headers — termasuk kolom Rekening yang BKM/BKK tidak punya ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "170px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Account", key: "Account", width: "180px" },
  { title: "Rekening", key: "Rekening", width: "130px" },
  { title: "Diterima Dari", key: "DiterimaDari", width: "160px" },
  { title: "Nota", key: "Nota", width: "110px" },
  { title: "Keterangan", key: "Keterangan", width: "220px" },
  { title: "Nominal", key: "Nominal", width: "130px", align: "end" },
  { title: "Kasbon", key: "Kasbon", width: "130px" },
  { title: "Closed", key: "Closed", width: "90px", align: "center" },
];

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

const summaryFormatters = {
  Keterangan: () => "TOTAL :",
  Nominal: (filteredItems: any[]) =>
    numFmt(
      Math.round(
        filteredItems.reduce((s, r) => s + (Number(r.Nominal) || 0), 0),
      ),
    ),
};

// --- Expand ---
const expandedRows = ref<any[]>([]);
const onUpdateExpanded = (val: any[]) => {
  expandedRows.value = val;
};

// --- Row coloring: baris dari kasbon dan baris yang sudah closed
// ditandai beda warna, sama pola dengan referensi ---
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  const classes: string[] = [];
  if (item.Kasbon) classes.push("row-kasbon");
  if (item.Closed === "Sudah") classes.push("row-closed");
  return { class: classes.join(" ") };
};

// --- Validasi per-aksi: BBM dari kasbon tidak bisa diubah/dihapus/
// dicetak di sini (harus lewat Penyelesaian Kasbon); yang sudah
// closed tidak bisa diubah/dihapus (cetak tetap boleh) ---
const validateAction = (action: "ubah" | "hapus" | "cetak"): boolean => {
  if (!selectedItem.value) {
    toast.warning("Pilih data terlebih dahulu.");
    return false;
  }
  const r = selectedItem.value;
  if (r.Kasbon && action === "ubah") {
    toast.warning("BBM terbentuk otomatis dari kasbon. Tidak bisa diubah.");
    return false;
  }
  if (r.Kasbon && action === "hapus") {
    toast.warning("BBM terbentuk otomatis dari kasbon. Tidak bisa dihapus.");
    return false;
  }
  if (r.Kasbon && action === "cetak") {
    toast.warning("BBM dari kasbon. Silahkan cetak di Penyelesaian Kasbon.");
    return false;
  }
  if (r.Closed === "Sudah" && action !== "cetak") {
    toast.warning("Transaksi sudah diclose. Tidak bisa diubah/dihapus.");
    return false;
  }
  return true;
};

// --- Add / Edit / Print ---
const onAdd = () => router.push("/piutang/bbm/create");
const onEdit = () => {
  if (!validateAction("ubah")) return;
  router.push(
    `/piutang/bbm/edit/${encodeURIComponent(selectedItem.value!.Nomor)}`,
  );
};
const onPrint = () => {
  if (!validateAction("cetak")) return;
  window.open(
    `/piutang/bbm/print/${encodeURIComponent(selectedItem.value!.Nomor)}`,
    "_blank",
  );
};

// --- Delete ---
const showDeleteDialog = ref(false);
const isDeleting = ref(false);

const openDeleteDialog = () => {
  if (!validateAction("hapus")) return;
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedItem.value) return;
  isDeleting.value = true;
  try {
    await bbmService.deleteData(selectedItem.value.Nomor);
    toast.success("Data berhasil dihapus.");
    showDeleteDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  } finally {
    isDeleting.value = false;
  }
};

// --- Export ---
const isExporting = ref(false);

const onExport = async () => {
  const dataToExport =
    baseBrowseRef.value?.getFilteredItems?.() ?? items.value ?? [];

  if (!dataToExport || dataToExport.length === 0) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }

  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = headers.map((h: any) => ({
      header: h.title,
      key: h.key,
      width: h.width ? Math.max(10, Math.round(parseInt(h.width) / 7)) : 16,
      align: h.align ?? "left",
      numFmt: h.key === "Nominal" ? "#,##0" : undefined,
    }));

    const rows = dataToExport.map((it: any) => {
      const row: Record<string, any> = {};
      columns.forEach((c) => {
        let val = it[c.key];
        if (c.key === "Tanggal") val = val ? formatTanggal(val) : "";
        row[c.key] = val ?? "";
      });
      return row;
    });

    const periodeLabel = `Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`;
    await exportExcelSingle(
      `BBM_${startDate.value}_${endDate.value}.xlsx`,
      "BBM",
      columns,
      rows,
      `Laporan Bukti Bank Masuk (BBM)  |  ${periodeLabel}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    isExporting.value = false;
  }
};

// --- Export Detail — merge browse + detail per periode, header hanya
// tampil di baris pertama tiap grup Nomor ---
const isExportingDetail = ref(false);

const HEADER_COLS_DETAIL = [
  "Nomor",
  "Tanggal",
  "Account",
  "Rekening",
  "DiterimaDari",
  "Nota",
  "Keterangan",
  "Closed",
];

const detailExportColumns: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Account", key: "Account", width: 22 },
  { header: "Rekening", key: "Rekening", width: 18 },
  { header: "Diterima Dari", key: "DiterimaDari", width: 22 },
  { header: "Nota", key: "Nota", width: 16 },
  { header: "Keterangan", key: "Keterangan", width: 26 },
  { header: "Closed", key: "Closed", width: 10, align: "center" },
  { header: "No", key: "No", width: 6, align: "center" },
  { header: "Uraian", key: "Uraian", width: 28 },
  { header: "Account Detail", key: "AccountDtl", width: 14 },
  { header: "Nama Account", key: "NamaAccount", width: 22 },
  { header: "Detail CC", key: "DetailCC", width: 18 },
  {
    header: "Nominal",
    key: "Nominal",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
];

const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const [resBrowse, resDetail] = await Promise.all([
      bbmService.getBrowse({
        startDate: startDate.value,
        endDate: endDate.value,
        cabang: cabang.value,
      }),
      bbmService.getBrowseDetail({
        startDate: startDate.value,
        endDate: endDate.value,
        cabang: cabang.value,
      }),
    ]);

    const detailRows = resDetail.data.data as any[];
    if (!detailRows.length) {
      toast.warning("Tidak ada data detail untuk diexport.");
      return;
    }

    const masterMap: Record<string, any> = {};
    for (const m of resBrowse.data.data as any[]) {
      masterMap[m.Nomor] = m;
    }

    const merged = detailRows.map((d) => {
      const m = masterMap[d.Nomor] || {};
      return {
        Nomor: d.Nomor,
        Tanggal: m.Tanggal ? formatTanggal(m.Tanggal) : "",
        Account: m.Account || "",
        Rekening: m.Rekening || "",
        DiterimaDari: m.DiterimaDari || "",
        Nota: m.Nota || "",
        Keterangan: m.Keterangan || "",
        Closed: m.Closed || "",
        No: d.No,
        Uraian: d.Uraian,
        AccountDtl: d.Account,
        NamaAccount: d.NamaAccount,
        DetailCC: d.DetailCC,
        Nominal: Number(d.Nominal) || 0,
      };
    });

    let lastNomor: string | null = null;
    const rows = merged.map((row) => {
      if (row.Nomor === lastNomor) {
        const copy: Record<string, any> = { ...row };
        HEADER_COLS_DETAIL.forEach((c) => (copy[c] = ""));
        return copy;
      }
      lastNomor = row.Nomor;
      return row;
    });

    const periodeLabel = `Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`;
    await exportExcelSingle(
      `BBM_Detail_${startDate.value}_${endDate.value}.xlsx`,
      "BBM Detail",
      detailExportColumns,
      rows,
      `Laporan Detail Bukti Bank Masuk (BBM)  |  ${periodeLabel}`,
    );

    toast.success("Berhasil export detail data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Bukti Bank Masuk (BBM)"
    menu-id="954"
    :icon="IconBuildingBank"
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
    :row-props-fn="rowPropsFn"
    show-expand
    :expanded="expandedRows"
    :summary-columns="['Nominal']"
    :summary-formatters="summaryFormatters"
    @update:expanded="onUpdateExpanded"
    @add="onAdd"
    @edit="onEdit"
    @refresh="fetchData"
    @delete="openDeleteDialog"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="startDate" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="endDate" class="f-date" />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Cabang</span>
        <select v-model="cabang" class="f-select">
          <option value="HO-">SEMUA CABANG</option>
          <option v-for="c in listCabang" :key="c.kode" :value="c.kode">
            {{ c.kode }} - {{ c.nama }}
          </option>
        </select>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend><IconPrinter :size="15" /></template>Cetak
      </v-btn>
      <v-btn
        size="small"
        color="teal-darken-2"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend><IconFileExport :size="15" /></template>Export Detail
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>

    <template #item.Nominal="{ item }">
      {{ numFmt((item.raw || item).Nominal) }}
    </template>

    <template #item.Kasbon="{ item }">
      <span v-if="(item.raw || item).Kasbon" class="bbm-badge badge-blue">
        {{ (item.raw || item).Kasbon }}
      </span>
      <span v-else class="text-grey">-</span>
    </template>

    <template #item.Closed="{ item }">
      <span
        class="bbm-badge"
        :class="
          (item.raw || item).Closed === 'Sudah' ? 'badge-green' : 'badge-grey'
        "
      >
        {{ (item.raw || item).Closed }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="expand-title mb-2">
          Detail Jurnal - {{ (item.raw || item).Nomor }}
        </div>
        <table class="detail-table">
          <thead>
            <tr>
              <th width="50">No</th>
              <th>Uraian</th>
              <th width="100">Account</th>
              <th width="180">Nama Account</th>
              <th width="150">Detail CC</th>
              <th width="120" class="tr">Nominal</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="d in detailCache[(item.raw || item).Nomor] || []"
              :key="d.No"
            >
              <td>{{ d.No }}</td>
              <td>{{ d.Uraian }}</td>
              <td>{{ d.Account }}</td>
              <td>{{ d.NamaAccount }}</td>
              <td>{{ d.DetailCC }}</td>
              <td class="tr">{{ numFmt(d.Nominal) }}</td>
            </tr>
            <tr
              v-if="
                !detailCache[(item.raw || item).Nomor] ||
                detailCache[(item.raw || item).Nomor].length === 0
              "
            >
              <td colspan="6" class="text-center text-grey py-4 font-italic">
                Data detail jurnal tidak ditemukan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showDeleteDialog" max-width="420px" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="bg-error text-white pa-3 text-subtitle-1 d-flex align-center"
      >
        <IconBuildingBank :size="16" color="white" class="mr-2" />
        Konfirmasi Hapus
      </v-card-title>
      <v-card-text class="pa-4 text-body-2">
        Yakin ingin menghapus BBM:
        <div class="font-weight-bold text-primary mt-1">
          {{ selectedItem?.Nomor }}
        </div>
        <div class="text-caption text-grey mt-1">
          {{ selectedItem?.Keterangan }}
        </div>
        <div class="text-caption text-error mt-2">
          Jurnal otomatis terkait juga akan ikut dihapus.
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="isDeleting"
          @click="showDeleteDialog = false"
          >Batal</v-btn
        >
        <v-btn
          color="error"
          variant="elevated"
          :loading="isDeleting"
          @click="confirmDelete"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
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
  color: #212121;
}
.f-select {
  cursor: pointer;
  min-width: 150px;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}

.bbm-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-grey {
  background: #f5f5f5;
  color: #757575;
}
.badge-blue {
  background: #e3f2fd;
  color: #1565c0;
}
.badge-green {
  background: #e8f5e9;
  color: #2e7d32;
}

.expand-wrap {
  padding: 10px 10px 10px 50px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: 700;
  color: #37474f;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 10px;
  font-size: 11px;
}
.detail-table td {
  padding: 4px 10px;
  border-bottom: 1px solid #eee;
  font-size: 12px;
}
.tr {
  text-align: right !important;
}

:deep(.row-kasbon td) {
  color: #1565c0 !important;
  font-weight: 600;
}
:deep(.row-closed td) {
  color: #9e9e9e !important;
}
</style>
