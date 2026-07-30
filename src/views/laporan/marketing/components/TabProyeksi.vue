<script setup lang="ts">
import { ref, computed } from "vue";
import { useToast } from "vue-toastification";
import BaseTable from "@/components/BaseTable.vue";
import { targetVsAchievementService } from "@/services/laporan/marketing/targetVsAchievementService";

const props = defineProps<{
  items: any[];
  isLoading?: boolean;
  tahun: string | number;
}>();
const emit = defineEmits(["updated"]);
const toast = useToast();

const BULAN_NAMA = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const namaBulan = (n: number) => BULAN_NAMA[Number(n) - 1] || n;

const headers = [
  { title: "Tahun", key: "py_tahun", width: "80px" },
  { title: "Bulan", key: "py_bulan", width: "140px" },
  { title: "Sales", key: "py_sales", width: "160px", align: "end" },
];

const numFmt = (v: any) =>
  v || v === 0 ? Math.round(Number(v)).toLocaleString("id-ID") : "0";

const editingRow = ref<number | null>(null);
const editValue = ref<number>(0);
const isSaving = ref(false);

const startEdit = (item: any) => {
  editingRow.value = item.py_bulan;
  editValue.value = Number(item.py_sales) || 0;
};

const saveEdit = async (item: any) => {
  if (editingRow.value !== item.py_bulan) return;
  isSaving.value = true;
  try {
    await targetVsAchievementService.updateProyeksi(
      props.tahun,
      item.py_bulan,
      editValue.value,
    );
    item.py_sales = editValue.value;
    editingRow.value = null;
    toast.success("Tersimpan.");
    emit("updated");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal simpan.");
  } finally {
    isSaving.value = false;
  }
};
const cancelEdit = () => {
  editingRow.value = null;
};

// Footer: py_sales di-SUM (skSum, replikasi FooterSummaryItems),
// py_tahun cuma tampilin label "Total" (OnGetText custom Delphi)
const totalProyeksi = computed(() =>
  props.items.reduce((s, r) => s + (Number(r.py_sales) || 0), 0),
);
</script>

<template>
  <div class="tab-single">
    <BaseTable
      :headers="headers"
      :items="items"
      :is-loading="isLoading"
      item-value="py_bulan"
      :show-search="false"
    >
      <template #item.py_bulan="{ item }">{{
        namaBulan(item.py_bulan)
      }}</template>
      <template #item.py_sales="{ item }">
        <div v-if="editingRow === item.py_bulan" class="edit-cell">
          <input
            v-model.number="editValue"
            type="number"
            class="edit-input"
            autofocus
            @keydown.enter="saveEdit(item)"
            @keydown.escape="cancelEdit"
            @blur="saveEdit(item)"
          />
        </div>
        <span v-else class="editable-val" @click="startEdit(item)">{{
          numFmt(item.py_sales)
        }}</span>
      </template>
      <template #summary-row>
        <span class="sum-lbl">Total</span>
        <span class="sum-val">{{ numFmt(totalProyeksi) }}</span>
      </template>
    </BaseTable>
  </div>
</template>

<style scoped>
.tab-single {
  height: 100%;
  min-height: 0;
  max-width: 460px;
}
.editable-val {
  cursor: pointer;
  border-bottom: 1px dashed #90caf9;
}
.editable-val:hover {
  background: #e3f2fd;
}
.edit-cell {
  display: flex;
}
.edit-input {
  width: 100%;
  height: 24px;
  border: 1px solid #1565c0;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 12px;
  text-align: right;
  outline: none;
}
.sum-lbl {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin-right: 8px;
}
.sum-val {
  font-size: 12px;
  font-weight: 700;
  color: white;
  font-family: monospace;
}
</style>
