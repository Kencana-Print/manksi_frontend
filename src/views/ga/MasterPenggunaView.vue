<script setup lang="ts">
import { ref, computed } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  penggunaService,
  type PenggunaRow,
} from "@/services/ga/penggunaService";
import PenggunaFormDialog from "@/components/dialogs/PenggunaFormDialog.vue";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { IconUsers } from "@tabler/icons-vue";

const toast = useToast();

// ── Composable useBrowse (menuId: 602) ─────────────────────────────────
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
  menuId: "602",
  fetchApi: async () => {
    const res = await penggunaService.getAll();
    return res.data.data ?? [];
  },
});

const selectedItem = computed(
  () => (selected.value[0] as unknown as PenggunaRow) ?? null,
);

// ── Headers Tabel Master Pengguna Sesuai Delphi 7 ─────────────────────
const headers = [
  { title: "KODE", key: "Kode", width: "120px", align: "center" as const },
  { title: "NAMA", key: "Nama", minWidth: "260px" },
];

// ── Dialog Form State ─────────────────────────────────────────────────
const showDialog = ref(false);
const isEditMode = ref(false);
const editData = ref<PenggunaRow | null>(null);

const onAdd = () => {
  isEditMode.value = false;
  editData.value = null;
  showDialog.value = true;
};

const onEdit = (item: { Kode: string }) => {
  const target = (item as PenggunaRow) || selectedItem.value;
  if (!target || !target.Kode) {
    toast.warning("Pilih pengguna yang ingin diedit terlebih dahulu.");
    return;
  }
  isEditMode.value = true;
  editData.value = { ...target };
  showDialog.value = true;
};

// ── Hapus Data ────────────────────────────────────────────────────────
const onDelete = async (item: { Kode: string; Nama?: string }) => {
  const target = item || selectedItem.value;
  if (!target || !target.Kode) {
    toast.warning("Pilih data yang ingin dihapus terlebih dahulu.");
    return;
  }

  const konfirmasi = window.confirm(
    `Yakin ingin menghapus data pengguna [${target.Kode}] ${target.Nama || ""} ?`,
  );
  if (!konfirmasi) return;

  try {
    await penggunaService.deleteData(target.Kode);
    toast.success(`Pengguna ${target.Kode} berhasil dihapus.`);
    clearSelection();
    await fetchData();
  } catch (err: any) {
    toast.error(
      err.response?.data?.message || err.message || "Gagal menghapus data pengguna.",
    );
  }
};

// ── Export Excel ───────────────────────────────────────────────────────
const isExporting = ref(false);

const exportColumns: ExcelColumn[] = [
  { header: "Kode", key: "Kode", width: 14, align: "center" },
  { header: "Nama Pengguna", key: "Nama", width: 30, align: "left" },
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
      `Master_Pengguna_${new Date().toISOString().slice(0, 10)}.xlsx`,
      "Master Pengguna",
      exportColumns,
      rows,
      "Daftar Master Pengguna (GA)",
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
    title="Master Pengguna"
    menu-id="602"
    storage-id="602"
    :icon="IconUsers"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Kode"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :selected="selected"
    search-placeholder="Cari kode atau nama pengguna..."
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="onExport"
    @update:selected="(val) => (selected = val)"
  >
    <!-- Custom Render Kolom Kode -->
    <template #item.Kode="{ item }">
      <span class="font-weight-bold" style="color: #1565c0; font-family: monospace">
        {{ item.Kode }}
      </span>
    </template>
  </BaseBrowse>

  <!-- Modal Dialog Form Master Pengguna Sesuai Delphi 7 -->
  <PenggunaFormDialog
    v-model="showDialog"
    :is-edit="isEditMode"
    :edit-data="editData"
    @saved="onFormSaved"
  />
</template>
