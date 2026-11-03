<script setup lang="ts">
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconTool } from "@tabler/icons-vue";
import api from "@/services/api";

const router = useRouter();
const toast = useToast();

const headers = [
  { title: "Kode", key: "Kode", width: "130px" },
  { title: "Nama Mesin", key: "Nama", minWidth: "220px" },
  { title: "Jenis", key: "Jenis", width: "110px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
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
  menuId: "5503",
  fetchApi: async () => {
    const res = await api.get("/mmt/daftar/mesin");
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});

const handleNew = () => {
  router.push("/mmt/daftar/mesin/create");
};

const handleEdit = (item: any) => {
  const kode = item?.Kode || selected.value[0]?.Kode;
  if (!kode) return;
  router.push(`/mmt/daftar/mesin/edit/${encodeURIComponent(kode)}`);
};

const handleDelete = async (item: any) => {
  const kode = item?.Kode || selected.value[0]?.Kode;
  if (!kode) return;
  if (!confirm(`Hapus data Mesin ${kode}?`)) return;
  try {
    await api.delete(`/mmt/daftar/mesin/${encodeURIComponent(kode)}`);
    toast.success("Mesin berhasil dihapus.");
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data.");
  }
};
</script>

<template>
  <BaseBrowse
    title="Mesin Produksi MMT"
    menu-id="5503"
    item-value="Kode"
    :icon="IconTool"
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
    @export="exportToExcel('Mesin_Produksi_MMT')"
  />
</template>
