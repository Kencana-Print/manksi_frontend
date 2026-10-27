<script setup lang="ts">
import { ref, computed } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  kendaraanService,
  type KendaraanRow,
} from "@/services/ga/kendaraanService";
import KendaraanFormDialog from "@/components/dialogs/KendaraanFormDialog.vue";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import {
  IconCar,
  IconEdit,
  IconTrash,
  IconAlertTriangle,
  IconCheck,
} from "@tabler/icons-vue";

const toast = useToast();

// ── Composable useBrowse (menuId: 601) ─────────────────────────────────
const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
  clearSelection,
} = useBrowse({
  menuId: "601",
  fetchApi: async () => {
    const res = await kendaraanService.getAll();
    return res.data.data ?? [];
  },
});

const selectedItem = computed(
  () => (selected.value[0] as unknown as KendaraanRow) ?? null,
);

// ── Headers Tabel Master Kendaraan Sesuai Delphi 7 ────────────────────
const headers = [
  { title: "NOMOR POLISI", key: "Nopol", width: "140px" },
  { title: "STATUS", key: "Stat", width: "130px", align: "center" as const },
  { title: "KETERANGAN", key: "Keterangan", minWidth: "220px" },
  {
    title: "JADWAL SERVIS (KM)",
    key: "Jadwal_Servis",
    width: "160px",
    align: "right" as const,
  },
  {
    title: "KM TERAKHIR",
    key: "KmTerakhir",
    width: "140px",
    align: "right" as const,
  },
  {
    title: "JADWAL PAJAK",
    key: "Pajak",
    width: "130px",
    align: "center" as const,
  },
  {
    title: "STATUS SERVIS",
    key: "StatusServis",
    width: "140px",
    align: "center" as const,
  },
];

// ── Aturan Pewarnaan Record Sesuai Delphi cxStyle ─────────────────────
// Delphi 7: if (jadwal_servis > 0) and (jadwal_servis - 200 < kmterakhir) then AStyle := cxStyle1 (Waspada/Merah)
const perluServis = (item: any) => {
  const jadwal = Number(item?.Jadwal_Servis) || 0;
  const km = Number(item?.KmTerakhir) || 0;
  return jadwal > 0 && jadwal - 200 < km;
};

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (perluServis(item)) {
    return {
      class: "row-perlu-servis",
      style: "color: #d32f2f !important; font-weight: 600;",
    };
  }
  return {};
};

// ── Dialog Form State ─────────────────────────────────────────────────
const showDialog = ref(false);
const isEditMode = ref(false);
const editData = ref<KendaraanRow | null>(null);

const onAdd = () => {
  isEditMode.value = false;
  editData.value = null;
  showDialog.value = true;
};

const onEdit = (item: { Nopol: string }) => {
  const target = (item as KendaraanRow) || selectedItem.value;
  if (!target || !target.Nopol) {
    toast.warning("Pilih kendaraan yang ingin diedit terlebih dahulu.");
    return;
  }
  isEditMode.value = true;
  editData.value = { ...target };
  showDialog.value = true;
};

// ── Hapus Data ────────────────────────────────────────────────────────
const onDelete = async (item: { Nopol: string; Keterangan?: string }) => {
  const target = item || selectedItem.value;
  if (!target || !target.Nopol) {
    toast.warning("Pilih data yang ingin dihapus terlebih dahulu.");
    return;
  }

  const konfirmasi = window.confirm(
    `Yakin ingin menghapus data kendaraan [${target.Nopol}] ${target.Keterangan || ""} ?`,
  );
  if (!konfirmasi) return;

  try {
    await kendaraanService.deleteData(target.Nopol);
    toast.success(`Kendaraan ${target.Nopol} berhasil dihapus.`);
    clearSelection();
    await fetchData();
  } catch (err: any) {
    toast.error(
      err.response?.data?.message || err.message || "Gagal menghapus data kendaraan.",
    );
  }
};

// ── Export Excel ───────────────────────────────────────────────────────
const isExporting = ref(false);

const exportColumns: ExcelColumn[] = [
  { header: "Nomor Polisi", key: "Nopol", width: 16, align: "left" },
  { header: "Status", key: "Stat", width: 15, align: "center" },
  { header: "Keterangan", key: "Keterangan", width: 25, align: "left" },
  {
    header: "Jadwal Servis (KM)",
    key: "Jadwal_Servis",
    width: 18,
    align: "right",
  },
  { header: "KM Terakhir", key: "KmTerakhir", width: 16, align: "right" },
  { header: "Jadwal Pajak", key: "Pajak", width: 15, align: "center" },
];

const onExport = async () => {
  const rows = items.value ?? [];
  if (!rows.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExporting.value = true;
  try {
    await exportExcelSingle(
      `Master_Kendaraan_${new Date().toISOString().slice(0, 10)}.xlsx`,
      "Master Kendaraan",
      exportColumns,
      rows,
      "Daftar Master Kendaraan (GA)",
    );
    toast.success("Export berhasil.");
  } catch {
    toast.error("Gagal export Excel.");
  } finally {
    isExporting.value = false;
  }
};

const onFormSaved = () => {
  fetchData();
};
</script>

<template>
  <BaseBrowse
    title="Master Kendaraan"
    menu-id="601"
    storage-id="601"
    :icon="IconCar"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nopol"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :selected="selected"
    :row-props-fn="rowPropsFn"
    search-placeholder="Cari nopol, keterangan, status..."
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="onExport"
    @update:selected="(val) => (selected = val)"
  >
    <!-- Filter Kiri: Legend Status Servis Sesuai Delphi cxStyle -->
    <template #filter-left>
      <div class="legend-bar">
        <span class="legend-lbl">Status Servis:</span>
        <div class="legend-item">
          <span class="legend-badge badge-warning"></span>
          <span>Perlu Servis (&lt; 200 KM)</span>
        </div>
        <div class="legend-item">
          <span class="legend-badge badge-normal"></span>
          <span>Normal</span>
        </div>
      </div>
    </template>

    <!-- Custom Render Status Inventaris / Pribadi -->
    <template #item.Stat="{ item }">
      <v-chip
        size="x-small"
        :color="item.Stat === 'INVENTARIS' ? 'primary' : 'teal'"
        variant="flat"
        class="font-weight-medium"
      >
        {{ item.Stat || "INVENTARIS" }}
      </v-chip>
    </template>

    <!-- Custom Render Angka KM -->
    <template #item.Jadwal_Servis="{ item }">
      {{
        Number(item.Jadwal_Servis || 0).toLocaleString("id-ID", {
          minimumFractionDigits: 0,
        })
      }}
    </template>

    <template #item.KmTerakhir="{ item }">
      {{
        Number(item.KmTerakhir || 0).toLocaleString("id-ID", {
          minimumFractionDigits: 0,
        })
      }}
    </template>

    <!-- Custom Render Tanggal Pajak -->
    <template #item.Pajak="{ item }">
      {{ item.Pajak ? formatTanggal(item.Pajak) : "—" }}
    </template>

    <!-- Kolom Indikator Status Servis -->
    <template #item.StatusServis="{ item }">
      <v-chip
        v-if="perluServis(item)"
        size="x-small"
        color="error"
        variant="flat"
        class="font-weight-bold"
      >
        <template #prepend>
          <IconAlertTriangle :size="12" class="mr-1" />
        </template>
        Perlu Servis
      </v-chip>
      <v-chip
        v-else
        size="x-small"
        color="success"
        variant="tonal"
      >
        <template #prepend>
          <IconCheck :size="12" class="mr-1" />
        </template>
        Aman
      </v-chip>
    </template>
  </BaseBrowse>

  <!-- Modal Dialog Form Master Kendaraan Sesuai Delphi 7 -->
  <KendaraanFormDialog
    v-model="showDialog"
    :is-edit="isEditMode"
    :edit-data="editData"
    @saved="onFormSaved"
  />
</template>

<style scoped>
/* ── Legend Bar Status Servis ── */
.legend-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
}

.legend-lbl {
  font-weight: 600;
  color: #4b5563;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #374151;
  font-size: 11px;
}

.legend-badge {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}

.badge-warning {
  background-color: #d32f2f;
}

.badge-normal {
  background-color: #2e7d32;
}

/* ── Baris yang memerlukan servis (Delphi cxStyle) ── */
:deep(.v-data-table tbody tr.row-perlu-servis td),
:deep(.v-data-table tbody tr.row-perlu-servis) {
  color: #d32f2f !important;
  font-weight: 600 !important;
}
</style>
