<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { kendalaService } from "@/services/master/kendalaService";
import { IconAlertTriangle } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();
const menuId = "37";

const getStartOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const filterState = ref({
  startDate: getStartOfMonth(),
  endDate: getLocalDate(),
});

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
} = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await kendalaService.getBrowseList(filterState.value);
    return res.data.data || [];
  },
  immediate: true,
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "140px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Kendala", key: "Kendala", minWidth: "300px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "300px" },
];

// ⚠️ Route create/edit belum ada — form Kendala belum dibangun.
// Tombol Baru/Ubah tetap disiapkan supaya BaseBrowse berfungsi normal,
// tapi router.push ke path ini masih akan 404 sampai form-nya dibuat.
const goAdd = () => {
  router.push("/daftar/kendala/create");
};
const goEdit = (item: any) => {
  router.push(`/daftar/kendala/edit/${encodeURIComponent(item.Nomor)}`);
};

const goDelete = async (item: any) => {
  isLoading.value = true;
  try {
    await kendalaService.deleteKendala(item.Nomor);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  } finally {
    isLoading.value = false;
  }
};

// ── Export — backend generate file .xlsx lengkap (letterhead + embed
// gambar), frontend cukup fetch sebagai blob dan trigger download ──
const isExporting = ref(false);
const onExport = async () => {
  if (!items.value?.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExporting.value = true;
  try {
    const res = await kendalaService.exportExcel(filterState.value);
    const blob = new Blob([res.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_Kendala_${filterState.value.startDate}_${filterState.value.endDate}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Berhasil export data.");
  } catch (error) {
    console.error(error);
    toast.error("Gagal export Excel.");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Kendala"
    :menu-id="menuId"
    :icon="IconAlertTriangle"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filterState="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @add="goAdd"
    @edit="goEdit"
    @delete="goDelete"
    @export="onExport"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>
    </template>
    <template #item.Tanggal="{ item }">
      {{ item.Tanggal }}
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.filter-sep {
  font-size: 11px;
  color: #888;
}
.date-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
  color: #212121;
}
.date-inp:focus {
  border-color: #1976d2;
}
</style>
