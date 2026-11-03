<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconArrowBack } from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

const getStartOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const startDate = ref(getStartOfMonth());
const endDate = ref(getToday());

const headers = [
  { title: "Nomor Retur", key: "Nomor", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" },
  { title: "Kode Sup", key: "SupplierKode", width: "110px" },
  { title: "Gudang", key: "Gudang", width: "120px" },
  { title: "No. Penerimaan", key: "NoPenerimaan", width: "160px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "220px" },
];

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
  exportToExcel,
} = useBrowse<any>({
  menuId: "5506",
  fetchApi: async () => {
    const res = await api.get("/mmt/retur-beli", {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
      },
    });
    return res.data?.data || (Array.isArray(res.data) ? res.data : []);
  },
});

const handleNew = () => {
  router.push("/mmt/finance/retur-beli/create");
};

const handleEdit = (item: any) => {
  const nomor = item?.Nomor || selected.value[0]?.Nomor;
  if (!nomor) return;
  router.push(`/mmt/finance/retur-beli/edit/${encodeURIComponent(nomor)}`);
};

const handleDelete = async (item: any) => {
  const nomor = item?.Nomor || selected.value[0]?.Nomor;
  if (!nomor) return;
  if (!confirm(`Hapus data Retur Beli nomor ${nomor}?`)) return;
  try {
    await api.delete(`/mmt/retur-beli/${encodeURIComponent(nomor)}`);
    toast.success("Retur Beli berhasil dihapus.");
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data.");
  }
};
</script>

<template>
  <BaseBrowse
    title="Retur Beli MMT"
    menu-id="5506"
    item-value="Nomor"
    :icon="IconArrowBack"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @add="handleNew"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="exportToExcel('Retur_Beli_MMT')"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  margin-right: 2px;
}
.filter-sep {
  font-size: 11px;
  color: #777;
}
.date-inp {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  color: #212121;
}
</style>
