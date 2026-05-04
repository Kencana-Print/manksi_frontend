<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import CustomerFormDialog from "@/components/dialogs/CustomerFormDialog.vue";

const toast = useToast();

const filterKorporasi = ref(""); // "", "Y", "N"

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
  menuId: "20",
  fetchApi: async () => {
    const res = await api.get("/master/customer", {
      params: { filterKorporasi: filterKorporasi.value },
    });
    return res.data.data;
  },
});

const headers = [
  { title: "KODE", key: "Kode", width: "90px" },
  { title: "NAMA", key: "Nama", minWidth: "200px" },
  { title: "ALAMAT", key: "Alamat", minWidth: "220px" },
  { title: "KOTA", key: "Kota", width: "120px" },
  { title: "FAX", key: "Fax", width: "100px" },
  { title: "TELP", key: "Telp", width: "120px" },
  { title: "CONTACT", key: "Contact", width: "130px" },
  { title: "EMAIL", key: "Email", width: "150px" },
  { title: "PIUTANG", key: "Piutang", width: "120px", align: "right" },
  { title: "STATUS", key: "Status", width: "110px", align: "center" },
  { title: "JENIS USAHA", key: "JenisUsaha", width: "130px" },
  { title: "NPWP", key: "NPWP", width: "150px" },
  { title: "INDUK", key: "Induk", width: "80px", align: "center" },
  { title: "PRIORITAS", key: "Prioritas", width: "90px", align: "center" },
  { title: "PASIF", key: "Pasif", width: "80px", align: "center" },
];

// Helper untuk format angka Piutang
const formatCurrency = (val: any) => {
  const num = Number(val) || 0;
  // Format ala akuntansi (kurung untuk minus, atau sekadar format ID)
  if (num < 0) {
    return `(${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(Math.abs(num))})`;
  }
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(
    num,
  );
};

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Pasif === "YA") return { class: "text-red" }; // Customer Pasif warna merah
  if (item.Induk) return { class: "text-blue" }; // Customer Cabang/Anak warna biru
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
    const res = await api.get(`/master/customer/${item.Kode}`);
    editData.value = res.data.data;
    showDialog.value = true;
  } catch (error) {
    toast.error("Gagal memuat detail customer");
  }
};

const handleDelete = async (item: any) => {
  try {
    await api.delete(`/master/customer/${item.Kode}`);
    toast.success("Customer berhasil dihapus.");
    fetchData();
  } catch (error) {
    toast.error("Gagal menghapus customer.");
  }
};
</script>

<template>
  <BaseBrowse
    title="Master Customer"
    menu-id="20"
    icon="mdi-account-group-outline"
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
    @export="exportToExcel('Data_Master_Customer')"
  >
    <template #filter-left>
      <div
        class="d-flex align-center bg-white px-2 py-1 rounded border mr-2"
        style="width: 150px"
      >
        <v-select
          v-model="filterKorporasi"
          :items="[
            { title: 'ALL', value: '' },
            { title: 'KORPORASI', value: 'Y' },
            { title: 'PERORANGAN', value: 'N' },
          ]"
          item-title="title"
          item-value="value"
          variant="underlined"
          density="compact"
          hide-details
          class="text-caption font-weight-medium"
          @update:model-value="fetchData"
        ></v-select>
      </div>
    </template>

    <template #item.Piutang="{ item }">
      {{ formatCurrency(item.raw ? item.raw.Piutang : item.Piutang) }}
    </template>

    <template #filter-right>
      <div
        class="d-flex align-center bg-white pa-1 px-3 rounded border mr-2"
        style="gap: 12px"
      >
        <div class="d-flex align-center">
          <div
            class="bg-red mr-1"
            style="width: 14px; height: 14px; border-radius: 2px"
          ></div>
          <span class="text-caption font-weight-bold text-red">Pasif</span>
        </div>
        <div class="d-flex align-center">
          <div
            class="bg-blue mr-1"
            style="width: 14px; height: 14px; border-radius: 2px"
          ></div>
          <span class="text-caption font-weight-bold text-blue"
            >Punya induk customer</span
          >
        </div>
      </div>
    </template>
  </BaseBrowse>

  <CustomerFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    @saved="fetchData"
  />
</template>
