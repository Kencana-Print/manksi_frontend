<script setup lang="ts">
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconUsers } from "@tabler/icons-vue";
import api from "@/services/api";

const router = useRouter();
const toast = useToast();

const headers = [
  { title: "Kode", key: "Kode", width: "130px" },
  { title: "Nama Operator", key: "Nama", minWidth: "250px" },
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
  menuId: "5502",
  fetchApi: async () => {
    const res = await api.get("/mmt/daftar/operator");
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});

const handleNew = () => {
  router.push("/mmt/daftar/operator/create");
};

const handleEdit = (item: any) => {
  const kode = item?.Kode || selected.value[0]?.Kode;
  if (!kode) return;
  router.push(`/mmt/daftar/operator/edit/${encodeURIComponent(kode)}`);
};

const handleDelete = async (item: any) => {
  const kode = item?.Kode || selected.value[0]?.Kode;
  if (!kode) return;
  if (!confirm(`Hapus data Operator ${kode}?`)) return;
  try {
    await api.delete(`/mmt/daftar/operator/${encodeURIComponent(kode)}`);
    toast.success("Operator berhasil dihapus.");
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data.");
  }
};
</script>

<template>
  <BaseBrowse
    title="Operator MMT"
    menu-id="5502"
    item-value="Kode"
    :icon="IconUsers"
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
    @export="exportToExcel('Operator_MMT')"
  />
</template>
