<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import { IconShoppingCart, IconSearch, IconX } from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);

const headers = [
  { title: "No. PO", key: "Nomor", width: "170px" },
  { title: "Tanggal", key: "Tanggal", width: "120px", align: "center" as const },
  { title: "Supplier", key: "Supplier", minWidth: "180px" },
];

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await api.get("/mmt/bahan-baku-produksi/penerimaan-bahan/po/lookup", {
      params: { q: search.value.trim() },
    });
    const d = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    items.value = d;
  } catch (err) {
    console.error("Gagal load lookup PO penerimaan:", err);
  } finally {
    isLoading.value = false;
  }
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const onSearch = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchData, 350);
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      search.value = "";
      fetchData();
    }
  }
);

const selectItem = (item: any) => {
  emit("selected", item);
  emit("update:modelValue", false);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="750px"
  >
    <v-card class="pa-4">
      <div class="d-flex justify-space-between align-center mb-3">
        <div class="d-flex align-center">
          <v-icon :icon="IconShoppingCart" size="24" class="mr-2 text-primary" />
          <h3 class="text-subtitle-1 font-weight-bold mb-0">
            Pilih Dokumen PO Bahan
          </h3>
        </div>
        <v-btn icon variant="text" size="small" @click="emit('update:modelValue', false)">
          <v-icon :icon="IconX" size="18" />
        </v-btn>
      </div>

      <v-text-field
        v-model="search"
        label="Cari Nomor PO / Supplier..."
        variant="outlined"
        density="compact"
        hide-details
        class="mb-3"
        clearable
        @input="onSearch"
      >
        <template #prepend-inner>
          <v-icon :icon="IconSearch" size="16" />
        </template>
      </v-text-field>

      <v-data-table
        :headers="headers"
        :items="items"
        :loading="isLoading"
        density="compact"
        class="border rounded clickable-table"
        hover
        :items-per-page="10"
        @click:row="(_e: any, { item }: any) => selectItem(item)"
      >
        <template #no-data>
          <div class="text-center py-6 text-grey">
            Tidak ada dokumen PO yang ditemukan.
          </div>
        </template>
      </v-data-table>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.clickable-table :deep(tbody tr) {
  cursor: pointer;
}
</style>
