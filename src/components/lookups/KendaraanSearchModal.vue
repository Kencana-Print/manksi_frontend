<script setup lang="ts">
import { ref, watch, computed, nextTick } from "vue";
import { perawatanService } from "@/services/ga/perawatanService";
import { IconCar, IconSearch, IconDatabaseOff } from "@tabler/icons-vue";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  "update:modelValue": [val: boolean];
  selected: [
    item: {
      Nopol: string;
      Stat: string;
      Keterangan: string;
      KmTerakhir: number;
    },
  ];
}>();

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await perawatanService.searchKendaraan(search.value);
    items.value = res.data.data || [];
  } catch (e) {
    console.error("Gagal memuat kendaraan", e);
  } finally {
    isLoading.value = false;
  }
};

let searchTimer: ReturnType<typeof setTimeout> | null = null;
const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    fetchData();
  }, 300);
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      search.value = "";
      fetchData();
      nextTick(() => {
        if (searchInputRef.value) searchInputRef.value.focus();
      });
    }
  },
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
    max-width="540px"
    scrollable
  >
    <v-card class="rounded-lg">
      <v-card-title class="pa-4 bg-primary text-white d-flex align-center">
        <IconCar :size="20" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold">Bantuan Kendaraan (F1)</span>
      </v-card-title>

      <div class="pa-3 bg-grey-lighten-4 border-b">
        <v-text-field
          ref="searchInputRef"
          v-model="search"
          placeholder="Cari nopol atau nama kendaraan..."
          density="compact"
          variant="outlined"
          hide-details
          bg-color="white"
          clearable
          @input="onSearchInput"
          @keydown.enter.prevent="fetchData"
        >
          <template #prepend-inner>
            <IconSearch :size="16" class="text-medium-emphasis" />
          </template>
        </v-text-field>
      </div>

      <v-card-text class="pa-0" style="max-height: 400px">
        <div v-if="isLoading" class="text-center py-6">
          <v-progress-circular indeterminate size="24" color="primary" />
          <div class="text-caption mt-2">Memuat daftar kendaraan...</div>
        </div>

        <table v-else-if="items.length" class="lookup-table">
          <thead>
            <tr>
              <th style="width: 120px">NO. POLISI</th>
              <th style="width: 110px">STATUS</th>
              <th>KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.Nopol"
              class="lookup-row"
              @click="selectItem(item)"
            >
              <td class="font-weight-bold text-primary font-mono">
                {{ item.Nopol }}
              </td>
              <td>
                <v-chip size="x-small" variant="tonal" color="primary">
                  {{ item.Stat }}
                </v-chip>
              </td>
              <td>{{ item.Keterangan }}</td>
            </tr>
          </tbody>
        </table>

        <div v-else class="text-center py-8 text-medium-emphasis">
          <IconDatabaseOff :size="32" class="mb-2 opacity-50" />
          <div class="text-body-2">Kendaraan tidak ditemukan</div>
        </div>
      </v-card-text>

      <v-divider />
      <v-card-actions class="pa-3 justify-end">
        <v-btn
          variant="text"
          color="grey-darken-1"
          @click="emit('update:modelValue', false)"
        >
          Batal
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.font-mono {
  font-family: monospace;
}
.lookup-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.lookup-table th {
  background-color: #f1f5f9;
  color: #334155;
  padding: 8px 12px;
  text-align: left;
  border-bottom: 2px solid #cbd5e1;
  font-weight: 700;
  position: sticky;
  top: 0;
  z-index: 1;
}
.lookup-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
}
.lookup-row {
  cursor: pointer;
  transition: background 0.15s;
}
.lookup-row:hover {
  background-color: #eff6ff;
}
</style>
