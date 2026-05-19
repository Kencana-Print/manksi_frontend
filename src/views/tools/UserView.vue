<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { IconUsers } from "@tabler/icons-vue";

const toast = useToast();

const { items, isLoading, selected, fetchData, exportToExcel } = useBrowse({
  menuId: "", // KOSONGKAN SAJA
  fetchApi: async () => {
    const res = await api.get("/tools/users");
    return res.data.data;
  },
});

const headers = [
  { title: "KODE USER", key: "Kode", width: "150px" },
  { title: "NAMA USER", key: "Nama", minWidth: "300px" },
  { title: "AKTIF", key: "Aktif", width: "120px", align: "center" },
];

// Pewarnaan jika Aktif = 'TIDAK'
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Aktif === "TIDAK") return { class: "text-red font-weight-bold" };
  return {};
};

const handleAdd = () => {
  // TODO: Akan disambungkan ke Form Dialog Tambah User nanti
  toast.info("Fungsi Tambah User akan segera hadir.");
};

const handleEdit = (item: any) => {
  // TODO: Akan disambungkan ke Form Dialog Ubah User nanti
  toast.info(`Fungsi Ubah untuk user ${item.Kode} akan segera hadir.`);
};
</script>

<template>
  <BaseBrowse
    title="Master User"
    menu-id=""
    :icon="IconUsers"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="true"
    :can-edit="true"
    :can-delete="false"
    :can-export="true"
    :row-props-fn="rowPropsFn"
    item-value="Kode"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @export="exportToExcel('Data_Master_User')"
  >
    <template #filter-right>
      <div class="d-flex align-center bg-white pa-1 px-3 rounded border mr-2">
        <div class="d-flex align-center">
          <div
            class="legend-box bg-red mr-1"
            style="width: 14px; height: 14px; border-radius: 2px"
          ></div>
          <span class="text-caption font-weight-bold text-red">User Pasif</span>
        </div>
      </div>
    </template>
  </BaseBrowse>
</template>
