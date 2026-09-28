<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { jurnalUmumService } from "@/services/piutang/jurnalUmumService";
import { IconBook, IconFileExport } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();
const router = useRouter();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// --- Filter — tanpa cabang, sesuai referensi (jurnal umum tidak
// terikat cabang seperti BKM/BKK/BBM/BBK) ---
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

watch([startDate, endDate], () => fetchData());

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
  menuId: "956",
  fetchApi: async () => {
    const [resBrowse, resDetail] = await Promise.all([
      jurnalUmumService.getBrowse({
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      jurnalUmumService.getBrowseDetail({
        startDate: startDate.value,
        endDate: endDate.value,
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

onMounted(() => {
  fetchData();
});

// --- Headers — dua kolom uang (Debet + Kredit), bukan satu Nominal
// seperti BKM/BKK/BBM/BBK ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "170px", fixed: true },
  { title: "Tipe", key: "Tipe", width: "70px", align: "center" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Debet", key: "Debet", width: "140px", align: "end" },
  { title: "Kredit", key: "Kredit", width: "140px", align: "end" },
  { title: "Keterangan", key: "Keterangan", width: "280px" },
  { title: "Closed", key: "Closed", width: "90px", align: "center" },
];

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

// --- Expand ---
const expandedRows = ref<any[]>([]);
const onUpdateExpanded = (val: any[]) => {
  expandedRows.value = val;
};

// --- Row coloring: baris closed ditandai beda warna ---
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  return item.Closed === "Sudah" ? { class: "row-closed" } : {};
};

// --- Validasi per-aksi: yang sudah closed tidak bisa diubah/dihapus.
// Tidak ada gate "dari kasbon/BON/PJT" — Jurnal Umum murni input
// manual, tidak punya sumber otomatis. Tidak ada aksi Cetak, sesuai
// referensi. ---
const validateAction = (action: "ubah" | "hapus"): boolean => {
  if (!selectedItem.value) {
    toast.warning("Pilih data terlebih dahulu.");
    return false;
  }
  if (selectedItem.value.Closed === "Sudah") {
    const msg =
      action === "ubah"
        ? "Transaksi sudah diclose. Tidak bisa diubah."
        : "Transaksi sudah diclose. Tidak bisa dihapus.";
    toast.warning(msg);
    return false;
  }
  return true;
};

// --- Add / Edit ---
const onAdd = () => router.push("/piutang/jurnal-umum/create");
const onEdit = () => {
  if (!validateAction("ubah")) return;
  router.push(
    `/piutang/jurnal-umum/edit/${encodeURIComponent(selectedItem.value!.Nomor)}`,
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
    await jurnalUmumService.deleteData(selectedItem.value.Nomor);
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
      numFmt: ["Debet", "Kredit"].includes(h.key) ? "#,##0" : undefined,
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
      `Jurnal_Umum_${startDate.value}_${endDate.value}.xlsx`,
      "Jurnal Umum",
      columns,
      rows,
      `Laporan Jurnal Umum  |  ${periodeLabel}`,
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

const HEADER_COLS_DETAIL = ["Nomor", "Tipe", "Tanggal", "Keterangan", "Closed"];

const detailExportColumns: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tipe", key: "Tipe", width: 10, align: "center" },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Keterangan", key: "Keterangan", width: 28 },
  { header: "Closed", key: "Closed", width: 10, align: "center" },
  { header: "Account", key: "Account", width: 14 },
  { header: "Nama Account", key: "NamaAccount", width: 22 },
  { header: "Detail CC", key: "DetailCC", width: 18 },
  { header: "Uraian", key: "Uraian", width: 28 },
  {
    header: "Debet",
    key: "Debet",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
  {
    header: "Kredit",
    key: "Kredit",
    width: 16,
    align: "end",
    numFmt: "#,##0",
  },
];

const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const [resBrowse, resDetail] = await Promise.all([
      jurnalUmumService.getBrowse({
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      jurnalUmumService.getBrowseDetail({
        startDate: startDate.value,
        endDate: endDate.value,
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
        Tipe: m.Tipe || "",
        Tanggal: m.Tanggal ? formatTanggal(m.Tanggal) : "",
        Keterangan: m.Keterangan || "",
        Closed: m.Closed || "",
        Account: d.Account,
        NamaAccount: d.NamaAccount,
        DetailCC: d.DetailCC,
        Uraian: d.Uraian,
        Debet: Number(d.Debet) || 0,
        Kredit: Number(d.Kredit) || 0,
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
      `Jurnal_Umum_Detail_${startDate.value}_${endDate.value}.xlsx`,
      "Jurnal Umum Detail",
      detailExportColumns,
      rows,
      `Laporan Detail Jurnal Umum  |  ${periodeLabel}`,
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
    title="Jurnal Umum"
    menu-id="956"
    :icon="IconBook"
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
    </template>

    <template #extra-actions>
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

    <template #item.Debet="{ item }">
      {{ numFmt((item.raw || item).Debet) }}
    </template>

    <template #item.Kredit="{ item }">
      {{ numFmt((item.raw || item).Kredit) }}
    </template>

    <template #item.Closed="{ item }">
      <span
        class="ju-badge"
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
              <th width="100">Account</th>
              <th width="200">Nama Account</th>
              <th width="150">Detail CC</th>
              <th width="120" class="tr">Debet</th>
              <th width="120" class="tr">Kredit</th>
              <th>Uraian</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, idx) in detailCache[(item.raw || item).Nomor] || []"
              :key="idx"
            >
              <td>{{ d.Account }}</td>
              <td>{{ d.NamaAccount }}</td>
              <td>{{ d.DetailCC }}</td>
              <td class="tr">{{ d.Debet ? numFmt(d.Debet) : "" }}</td>
              <td class="tr">{{ d.Kredit ? numFmt(d.Kredit) : "" }}</td>
              <td>{{ d.Uraian }}</td>
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

  <v-dialog v-model="showDeleteDialog" max-width="400px" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="bg-error text-white pa-3 text-subtitle-1 d-flex align-center"
      >
        <IconBook :size="16" color="white" class="mr-2" />
        Konfirmasi Hapus
      </v-card-title>
      <v-card-text class="pa-4 text-body-2">
        Yakin ingin menghapus Jurnal Umum:
        <div class="font-weight-bold text-primary mt-1">
          {{ selectedItem?.Nomor }}
        </div>
        <div class="text-caption text-grey mt-1">
          {{ selectedItem?.Keterangan }}
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
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
}

.ju-badge {
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

:deep(.row-closed td) {
  color: #9e9e9e !important;
}
</style>
