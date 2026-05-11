<script setup lang="ts">
import { ref, watch } from "vue";
import api from "@/services/api";
import { IconHistory, IconSearch } from "@tabler/icons-vue";

const props = defineProps<{ modelValue: boolean; custKode: string }>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const selectedItems = ref<any[]>([]);
const isLoading = ref(false);

const fetchData = async () => {
  if (!props.custKode) return;
  isLoading.value = true;
  try {
    const res = await api.get("/lookups/history-alokasi", {
      params: { cusKode: props.custKode },
    });
    items.value = res.data.data || [];
  } catch (e) {
    console.error(e);
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      search.value = "";
      selectedItems.value = [];
      fetchData();
    }
  },
);

const filteredItems = ref<any[]>([]);
watch([items, search], () => {
  if (!search.value) {
    filteredItems.value = items.value;
    return;
  }
  const q = search.value.toLowerCase();
  filteredItems.value = items.value.filter(
    (i) =>
      String(i.Alamat ?? "")
        .toLowerCase()
        .includes(q) ||
      String(i.Kota ?? "")
        .toLowerCase()
        .includes(q),
  );
});

const submitSelection = () => {
  emit("selected", selectedItems.value);
  emit("update:modelValue", false);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="600px"
  >
    <div class="lookup-card">
      <!-- Header -->
      <div class="lookup-header">
        <IconHistory
          :size="15"
          :stroke-width="1.7"
          color="white"
          class="mr-2"
        />
        <span>Import History Alokasi Customer</span>
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>

      <!-- Search -->
      <div class="lookup-search">
        <IconSearch :size="15" :stroke-width="1.7" color="#9e9e9e" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari alamat atau kota..."
          class="search-input"
          autofocus
        />
      </div>

      <!-- Table -->
      <div class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data...</span>
        </div>
        <div v-else-if="filteredItems.length === 0" class="lookup-state">
          <span class="text-grey">Tidak ada data history alokasi</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 36px; text-align: center">
                <input
                  type="checkbox"
                  :checked="
                    selectedItems.length === filteredItems.length &&
                    filteredItems.length > 0
                  "
                  @change="
                    (e) =>
                      (selectedItems = (e.target as HTMLInputElement).checked
                        ? [...filteredItems]
                        : [])
                  "
                  style="accent-color: #1565c0"
                />
              </th>
              <th>ALAMAT</th>
              <th style="width: 160px">KOTA</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, idx) in filteredItems"
              :key="idx"
              class="lookup-row"
              :class="{ selected: selectedItems.includes(item) }"
              @click="
                () => {
                  const i = selectedItems.indexOf(item);
                  if (i === -1) selectedItems.push(item);
                  else selectedItems.splice(i, 1);
                }
              "
            >
              <td style="text-align: center">
                <input
                  type="checkbox"
                  :checked="selectedItems.includes(item)"
                  @click.stop
                  @change="
                    () => {
                      const i = selectedItems.indexOf(item);
                      if (i === -1) selectedItems.push(item);
                      else selectedItems.splice(i, 1);
                    }
                  "
                  style="accent-color: #1565c0"
                />
              </td>
              <td class="td-alamat">{{ item.Alamat }}</td>
              <td>{{ item.Kota }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="lookup-footer">
        <span class="footer-info">
          {{ selectedItems.length }} dipilih dari
          {{ filteredItems.length }} data
        </span>
        <div class="footer-actions">
          <button class="btn-batal" @click="emit('update:modelValue', false)">
            Batal
          </button>
          <button
            class="btn-import"
            :disabled="selectedItems.length === 0"
            @click="submitSelection"
          >
            Import Terpilih ({{ selectedItems.length }})
          </button>
        </div>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.lookup-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}

.lookup-header {
  display: flex;
  align-items: center;
  background: #455a64;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.lookup-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
  padding: 0 2px;
}
.lookup-close:hover {
  color: white;
}

.lookup-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  background: transparent;
}

.lookup-table-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 120px;
  max-height: 360px;
}
.lookup-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  color: #9e9e9e;
  font-size: 12px;
}

.lookup-table {
  width: 100%;
  border-collapse: collapse;
}
.lookup-table thead th {
  background: #455a64;
  color: white;
  padding: 6px 10px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  position: sticky;
  top: 0;
  z-index: 1;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
}
.lookup-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
  color: #212121;
}
.lookup-row {
  cursor: pointer;
}
.lookup-row:hover td {
  background: #eceff1;
}
.lookup-row.selected td {
  background: #e3f2fd;
}
.td-alamat {
  color: #1565c0;
}

.lookup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
  gap: 8px;
}
.footer-info {
  font-size: 11px;
  color: #757575;
}
.footer-actions {
  display: flex;
  gap: 8px;
}
.btn-batal {
  background: transparent;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 4px 14px;
  font-size: 12px;
  cursor: pointer;
  color: #424242;
}
.btn-batal:hover {
  background: #f0f0f0;
}

.btn-import {
  background: #1565c0;
  border: none;
  border-radius: 4px;
  padding: 4px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: white;
}
.btn-import:hover {
  background: #0d47a1;
}
.btn-import:disabled {
  background: #bdbdbd;
  cursor: default;
}
</style>
