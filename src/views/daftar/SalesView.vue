<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import SalesFormDialog from "@/components/dialogs/SalesFormDialog.vue";
import { IconTie } from "@tabler/icons-vue";

const toast = useToast();

// ID 23 = Master Sales
const {
  items,
  isLoading,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selected,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "23",
  fetchApi: async () => {
    const res = await api.get("/master/sales");
    return res.data.data;
  },
});

const headers = [
  { title: "KODE", key: "Kode", width: "100px" },
  { title: "NAMA", key: "Nama", minWidth: "200px" },
  { title: "ALAMAT", key: "Alamat", minWidth: "250px" },
  { title: "KOTA", key: "Kota", width: "150px" },
  { title: "TELP", key: "Telp", width: "150px" },
];

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  // Di Delphi ada styling jika 'Aktif'='N', mari kita terapkan warna merah (Pasif)
  if (item.Aktif === "N") return { class: "text-red font-weight-bold" };
  return {};
};

const showDialog = ref(false);
const isNewMode = ref(true);
const editData = ref(null);

const handleAdd = () => {
  isNewMode.value = true;
  editData.value = null;
  showDialog.value = true;
};

const handleEdit = async (item: any) => {
  try {
    isNewMode.value = false;
    const res = await api.get(`/master/sales/${item.Kode}`);
    editData.value = res.data.data;
    showDialog.value = true;
  } catch (error) {
    toast.error("Gagal memuat detail Sales.");
  }
};

const handleDelete = async (item: any) => {
  try {
    await api.delete(`/master/sales/${item.Kode}`);
    toast.success("Sales berhasil dihapus.");
    fetchData();
  } catch (error) {
    toast.error("Gagal menghapus Sales.");
  }
};
</script>

<template>
  <BaseBrowse
    title="Master Sales"
    menu-id="23"
    :icon="IconTie"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :row-props-fn="rowPropsFn"
    item-value="Kode"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="exportToExcel('Data_Master_Sales')"
  >
    <template #filter-right>
      <div class="d-flex align-center bg-white pa-1 px-3 rounded border mr-2">
        <div
          class="bg-red mr-1"
          style="width: 14px; height: 14px; border-radius: 2px"
        ></div>
        <span class="text-caption font-weight-bold text-red">Pasif</span>
      </div>
    </template>
  </BaseBrowse>

  <SalesFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    @saved="fetchData"
  />
</template>
