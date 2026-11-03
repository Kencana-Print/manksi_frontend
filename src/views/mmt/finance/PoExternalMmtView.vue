<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconShoppingCartDown, IconPrinter } from "@tabler/icons-vue";
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
  { title: "Nomor PO", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" },
  { title: "Deadline", key: "DateLinePO", width: "110px", align: "center" },
  { title: "Cabang", key: "Cab", width: "80px", align: "center" },
  { title: "No. SPK", key: "SPK", width: "140px" },
  { title: "Nama SPK", key: "NamaSPK", minWidth: "180px" },
  { title: "Supplier", key: "Supplier", minWidth: "180px" },
  { title: "Qty PO", key: "QtyPO", width: "90px", align: "end" },
  { title: "Qty BPB", key: "QtyBPB", width: "90px", align: "end" },
  { title: "Status", key: "Status", width: "100px", align: "center" },
  { title: "User", key: "Usr", width: "90px" },
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
  menuId: "5505",
  fetchApi: async () => {
    const res = await api.get("/mmt/po-external-mmt", {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
      },
    });
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});

const handleNew = () => {
  router.push("/mmt/finance/po-external/create");
};

const handleEdit = (item: any) => {
  const nomor = item?.Nomor || selected.value[0]?.Nomor;
  if (!nomor) return;
  router.push(`/mmt/finance/po-external/edit/${encodeURIComponent(nomor)}`);
};

const handleDelete = async (item: any) => {
  const nomor = item?.Nomor || selected.value[0]?.Nomor;
  if (!nomor) return;
  if (!confirm(`Hapus data PO External nomor ${nomor}?`)) return;
  try {
    await api.delete(`/mmt/po-external-mmt/${encodeURIComponent(nomor)}`);
    toast.success("PO External berhasil dihapus.");
    fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal menghapus data.");
  }
};

const handlePrint = (item: any) => {
  const nomor = item?.Nomor || selected.value[0]?.Nomor;
  if (!nomor) return;
  router.push(`/mmt/finance/po-external/print/${encodeURIComponent(nomor)}`);
};
</script>

<template>
  <BaseBrowse
    title="PO External MMT"
    menu-id="5505"
    item-value="Nomor"
    :icon="IconShoppingCartDown"
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
    @export="exportToExcel('PO_External_MMT')"
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

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="info"
        variant="elevated"
        :disabled="selected.length !== 1"
        @click="handlePrint(selected[0])"
      >
        <IconPrinter :size="15" class="mr-1" /> Cetak
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>

    <template #item.DateLinePO="{ item }">
      {{ formatTanggal((item.raw || item).DateLinePO) }}
    </template>

    <template #item.Status="{ item }">
      <v-chip
        size="x-small"
        :color="(item.raw || item).Status === 'SELESAI' ? 'success' : 'warning'"
        class="font-weight-bold"
      >
        {{ (item.raw || item).Status }}
      </v-chip>
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
