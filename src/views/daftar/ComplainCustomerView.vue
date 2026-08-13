<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { complainCustomerService } from "@/services/master/complainCustomerService";
import { IconMessageExclamation } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();
const menuId = "36";

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
  exportToExcel,
} = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await complainCustomerService.getBrowseList(filterState.value);
    return res.data.data || [];
  },
  immediate: true,
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "140px" },
  {
    title: "Tgl Complain",
    key: "TglComplain",
    width: "100px",
    align: "center",
  },
  { title: "No. SPK/Memo", key: "NoSpkMemo", width: "150px" },
  { title: "Customer", key: "Customer", minWidth: "200px" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Tipe", key: "Tipe", width: "90px" },
  { title: "Nama SPK", key: "NamaSpk", minWidth: "220px" },
  { title: "Jenis Complain", key: "JenisComplain", minWidth: "180px" },
  { title: "Uraian", key: "Uraian", minWidth: "220px" },
  { title: "Action/Solution", key: "ActionSolution", minWidth: "220px" },
  { title: "Ket Div1", key: "KetDiv1", minWidth: "220px" },
  { title: "Ket Div2", key: "KetDiv2", minWidth: "220px" },
  { title: "Ket Div3", key: "KetDiv3", minWidth: "220px" },
];

const goAdd = () => {
  router.push("/daftar/complain-customer/create");
};

const goEdit = (item: any) => {
  router.push(
    `/daftar/complain-customer/edit/${encodeURIComponent(item.Nomor)}`,
  );
};

const goDelete = async (item: any) => {
  isLoading.value = true;
  try {
    await complainCustomerService.deleteComplain(item.Nomor);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Complain Customer"
    :menu-id="menuId"
    :icon="IconMessageExclamation"
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
    @export="exportToExcel('Complain_Customer')"
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

    <template #item.TglComplain="{ item }">
      {{ formatTanggal(item.TglComplain) }}
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
