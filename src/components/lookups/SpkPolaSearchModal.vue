<script setup lang="ts">
import { ref, watch } from "vue";
import { lhkPolaFormService } from "@/services/garmen/lhkPolaFormService";
import { IconClipboardList, IconX, IconSearch } from "@tabler/icons-vue";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);

const headers = [
  { title: "NOMOR", key: "Nomor", width: "150px" },
  { title: "NAMA", key: "Nama" },
  { title: "TANGGAL", key: "Tanggal", width: "110px" },
];

let requestSeq = 0;
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const fetchData = async () => {
  const mySeq = ++requestSeq;
  isLoading.value = true;
  try {
    const res = await lhkPolaFormService.searchSpk(search.value);
    if (mySeq !== requestSeq) return;
    items.value = res.data.data || [];
  } catch {
    if (mySeq !== requestSeq) return;
    items.value = [];
  } finally {
    if (mySeq === requestSeq) isLoading.value = false;
  }
};

const onSearchInput = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(fetchData, 400);
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      search.value = "";
      fetchData();
    }
  },
);

const onRowClick = (_e: MouseEvent, row: any) => selectItem(row.item);
const selectItem = (item: any) => {
  if (!item) return;
  emit("selected", item);
  emit("update:modelValue", false);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="600px"
    scrollable
  >
    <v-card class="lookup-card rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-2 px-4">
        <IconClipboardList
          :size="16"
          :stroke-width="1.7"
          color="white"
          class="mr-2"
        />
        <span class="text-subtitle-2 font-weight-bold">CARI SPK / MAP</span>
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          size="small"
          @click="emit('update:modelValue', false)"
        >
          <IconX :size="16" :stroke-width="2" color="white" />
        </v-btn>
      </v-card-title>
      <v-card-text class="pa-3 bg-grey-lighten-4">
        <v-text-field
          v-model="search"
          @input="onSearchInput"
          label="Cari Nomor atau Nama SPK/MAP..."
          variant="outlined"
          density="compact"
          bg-color="white"
          hide-details
          class="mb-3"
          autofocus
          clearable
        >
          <template #prepend-inner>
            <IconSearch
              :size="15"
              :stroke-width="1.7"
              style="opacity: 0.55; margin-top: 1px"
            />
          </template>
        </v-text-field>
        <v-data-table
          :headers="headers"
          :items="items"
          :loading="isLoading"
          density="compact"
          height="350px"
          fixed-header
          hover
          class="lookup-table border rounded elevation-1"
          @click:row="onRowClick"
        ></v-data-table>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.lookup-card :deep(*) {
  font-size: 11px !important;
}
.lookup-table :deep(thead th) {
  background-color: #f5f5f5 !important;
  color: #424242 !important;
  font-weight: bold !important;
  height: 32px !important;
}
.lookup-table :deep(tbody tr) {
  cursor: pointer;
}
.lookup-table :deep(tbody tr:hover td) {
  background-color: #e3f2fd !important;
}
</style>
