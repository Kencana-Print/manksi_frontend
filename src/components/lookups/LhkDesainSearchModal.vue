<script setup lang="ts">
import { ref, watch } from "vue";
import { mapFormService } from "@/services/penjualan/mapFormService";
import { IconSearch } from "@tabler/icons-vue";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits(["update:modelValue", "selected"]);

const keyword = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const fetchItems = async () => {
  isLoading.value = true;
  try {
    const res = await mapFormService.searchLhkDesain(keyword.value);
    items.value = res.data.data ?? [];
  } catch {
    items.value = [];
  } finally {
    isLoading.value = false;
  }
};

const onKeywordInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchItems, 300);
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      keyword.value = "";
      fetchItems();
    }
  },
);

const selectItem = (item: any) => {
  emit("selected", item);
  emit("update:modelValue", false);
};

const close = () => emit("update:modelValue", false);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="(v) => emit('update:modelValue', v)"
    max-width="640px"
  >
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Cari Nomor LHK Desain
      </v-card-title>
      <v-card-text class="pa-3">
        <div class="lhk-search-box">
          <IconSearch :size="14" color="#757575" />
          <input
            v-model="keyword"
            class="lhk-search-inp"
            placeholder="Cari nomor LHK / nama project..."
            autofocus
            @input="onKeywordInput"
          />
        </div>

        <v-progress-linear
          v-if="isLoading"
          indeterminate
          color="primary"
          class="my-2"
        />

        <table class="lhk-table" v-else>
          <thead>
            <tr>
              <th>Nomor LHK</th>
              <th>Nomor PD</th>
              <th>Nama Project</th>
              <th>Customer</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, i) in items"
              :key="i"
              class="lhk-row"
              @click="selectItem(item)"
            >
              <td class="mono">{{ item.Nomor }}</td>
              <td>{{ item.PdNomor }}</td>
              <td>{{ item.NamaProject }}</td>
              <td>{{ item.Customer }}</td>
            </tr>
            <tr v-if="!items.length">
              <td colspan="4" class="tc" style="color: #999">
                Tidak ada data.
              </td>
            </tr>
          </tbody>
        </table>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" size="small" @click="close">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.lhk-search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 6px 10px;
  margin-bottom: 8px;
}
.lhk-search-inp {
  flex: 1;
  border: none;
  outline: none;
  font-size: 12px;
}
.lhk-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.lhk-table thead th {
  background: #eceff1;
  padding: 6px 8px;
  text-align: left;
  border-bottom: 2px solid #b0bec5;
}
.lhk-table tbody td {
  padding: 5px 8px;
  border-bottom: 1px solid #f0f0f0;
}
.lhk-row {
  cursor: pointer;
}
.lhk-row:hover {
  background: #e3f2fd;
}
.mono {
  font-family: monospace;
  font-weight: 600;
  color: #1565c0;
}
.tc {
  text-align: center;
}
</style>
