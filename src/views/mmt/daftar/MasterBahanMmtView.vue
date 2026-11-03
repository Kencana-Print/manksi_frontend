<script setup lang="ts">
import { useRouter } from "vue-router";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconTexture } from "@tabler/icons-vue";
import api from "@/services/api";

const router = useRouter();

const headers = [
  { title: "Kategori", key: "Kategori", width: "130px" },
  { title: "Kode", key: "Kode", width: "110px" },
  { title: "Nama Bahan", key: "Nama", minWidth: "220px" },
  { title: "Jenis", key: "Jenis", width: "80px", align: "center" as const },
  { title: "Supplier", key: "Supplier", width: "150px" },
  { title: "Konstruksi", key: "Gramasi", width: "110px" },
  { title: "Panjang (m)", key: "Panjang", width: "90px", align: "end" as const },
  { title: "Lebar (m)", key: "Lebar", width: "90px", align: "end" as const },
  { title: "Satuan", key: "Satuan", width: "80px", align: "center" as const },
  { title: "Status", key: "Status", width: "110px", align: "center" as const },
  { title: "Stok", key: "Stok", width: "80px", align: "end" as const },
  { title: "Gudang Default", key: "GudangDefault", width: "110px", align: "center" as const },
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
  menuId: "5501",
  fetchApi: async () => {
    const res = await api.get("/mmt/daftar/bahan");
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});

const handleNew = () => {
  router.push("/mmt/daftar/bahan/create");
};

const handleEdit = (item: any) => {
  const kode = item?.Kode || selected.value[0]?.Kode;
  if (!kode) return;
  router.push(`/mmt/daftar/bahan/edit/${encodeURIComponent(kode)}`);
};
</script>

<template>
  <BaseBrowse
    title="Master Bahan MMT"
    menu-id="5501"
    item-value="Kode"
    :icon="IconTexture"
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
    @export="exportToExcel('Master_Bahan_MMT')"
  />
</template>
