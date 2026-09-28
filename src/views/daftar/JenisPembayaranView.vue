<script setup lang="ts">
import { ref } from "vue";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import JenisPembayaranFormDialog from "@/components/dialogs/JenisPembayaranFormDialog.vue";
import { jenisPembayaranService } from "@/services/master/jenisPembayaranService";
import { IconCash } from "@tabler/icons-vue";

const toast = useToast();

// ID 42 = Jenis Pembayaran
const {
  items,
  isLoading,
  canInsert,
  canDelete,
  canExport,
  selected,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "42",
  fetchApi: async () => {
    const res = await jenisPembayaranService.getAll();
    return res.data.data;
  },
});

const headers = [{ title: "JENIS PEMBAYARAN", key: "nama", minWidth: "260px" }];

const showDialog = ref(false);

const handleAdd = () => {
  showDialog.value = true;
};

const handleDelete = async (item: any) => {
  try {
    await jenisPembayaranService.delete(item.nama);
    toast.success("Jenis pembayaran berhasil dihapus.");
    fetchData();
  } catch (error: any) {
    toast.error(
      error?.response?.data?.message || "Gagal menghapus jenis pembayaran.",
    );
  }
};
</script>

<template>
  <BaseBrowse
    title="Jenis Pembayaran"
    menu-id="42"
    :icon="IconCash"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="false"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="nama"
    @refresh="fetchData"
    @add="handleAdd"
    @delete="handleDelete"
    @export="exportToExcel('Data_Jenis_Pembayaran')"
  />

  <JenisPembayaranFormDialog v-model="showDialog" @saved="fetchData" />
</template>
