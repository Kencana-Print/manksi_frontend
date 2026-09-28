<script setup lang="ts">
import { computed, ref } from "vue";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import CostCenterFormDialog from "@/components/dialogs/CostCenterFormDialog.vue";
import { costCenterService } from "@/services/master/costCenterService";
import { IconBuildingBank } from "@tabler/icons-vue";

const toast = useToast();

// ID 39 = Cost Center
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
  menuId: "39",
  fetchApi: async () => {
    const res = await costCenterService.getAll();
    return res.data.data;
  },
});

const rows = computed(() =>
  (items.value ?? []).map((h: any) => ({
    ...h,
    JmlDetail: h.detail?.length ?? 0,
  })),
);

const headers = [
  { title: "KODE", key: "kode", width: "120px" },
  { title: "NAMA", key: "nama", minWidth: "250px" },
  { title: "JML DETAIL", key: "JmlDetail", width: "110px", align: "right" },
];

const expandedCostCenter = ref<string[]>([]);

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
    const res = await costCenterService.getById(item.kode);
    editData.value = res.data.data;
    showDialog.value = true;
  } catch (error) {
    toast.error("Gagal memuat detail cost center.");
  }
};

const handleDelete = async (item: any) => {
  try {
    await costCenterService.delete(item.kode);
    toast.success("Cost Center berhasil dihapus.");
    fetchData();
  } catch (error: any) {
    toast.error(
      error?.response?.data?.message || "Gagal menghapus cost center.",
    );
  }
};
</script>

<template>
  <BaseBrowse
    title="Cost Center"
    menu-id="39"
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
    show-expand
    :expanded="expandedCostCenter"
    @update:expanded="(v) => (expandedCostCenter = v)"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="exportToExcel('Data_Cost_Center')"
  >
    <template #detail="{ item }">
      <table>
        <thead>
          <tr>
            <th style="width: 40px">NO</th>
            <th>NAMA DETAIL</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, idx) in item.detail" :key="idx">
            <td class="text-center">{{ Number(idx) + 1 }}</td>
            <td>{{ d.nama }}</td>
          </tr>
          <tr v-if="!item.detail?.length">
            <td colspan="2" class="text-center text-medium-emphasis">
              Tidak ada detail
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </BaseBrowse>

  <CostCenterFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    @saved="fetchData"
  />
</template>
