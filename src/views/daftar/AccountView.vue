<script setup lang="ts">
import { computed, ref } from "vue";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import AccountFormDialog from "@/components/dialogs/AccountFormDialog.vue";
import { accountService } from "@/services/master/accountService";
import { IconBuildingBank } from "@tabler/icons-vue";

const toast = useToast();

// ID 40 = Account
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
  menuId: "40",
  fetchApi: async () => {
    const res = await accountService.getAll();
    return res.data.data;
  },
});

const fmtNum = (val: number) =>
  new Intl.NumberFormat("id-ID").format(Math.round(val || 0));

const rows = computed(() =>
  (items.value ?? []).map((h: any) => ({
    ...h,
    SaldoFmt: fmtNum(h.saldo_akhir),
  })),
);

const headers = [
  { title: "KODE", key: "kode", width: "100px" },
  { title: "NAMA", key: "nama", minWidth: "220px" },
  { title: "NO. REK BANK", key: "no_rekening", width: "150px" },
  { title: "KELOMPOK", key: "kelompok", width: "160px" },
  { title: "CABANG", key: "cabang", width: "90px" },
  { title: "STORE", key: "store", width: "120px" },
  { title: "KETERANGAN", key: "keterangan", minWidth: "180px" },
  { title: "STATUS", key: "status", width: "90px" },
  {
    title: "SALDO AKHIR",
    key: "SaldoFmt",
    width: "140px",
    align: "right",
  },
];

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
    const res = await accountService.getById(item.kode);
    editData.value = res.data.data;
    showDialog.value = true;
  } catch (error) {
    toast.error("Gagal memuat detail account.");
  }
};

const handleDelete = async (item: any) => {
  try {
    await accountService.delete(item.kode);
    toast.success("Account berhasil dihapus.");
    fetchData();
  } catch (error: any) {
    toast.error(error?.response?.data?.message || "Gagal menghapus account.");
  }
};
</script>

<template>
  <BaseBrowse
    title="Account"
    menu-id="40"
    :icon="IconBuildingBank"
    :headers="headers"
    :items="rows"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="kode"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="exportToExcel('Data_Account')"
  />

  <AccountFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    @saved="fetchData"
  />
</template>
