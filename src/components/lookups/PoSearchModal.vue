<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";

const props = defineProps<{ modelValue: boolean; cabangTujuan: string }>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);

const fetchData = async () => {
  if (!props.cabangTujuan) return;
  isLoading.value = true;
  try {
    const res = await api.get(
      `/lookups/po-internal?cabang=${props.cabangTujuan}`,
    );
    items.value = res.data.data.items || res.data.data || [];
  } catch (error) {
    console.error("Gagal memuat Lookup PO", error);
  } finally {
    isLoading.value = false;
  }
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

const filteredItems = computed(() => {
  if (!search.value) return items.value;
  const q = search.value.toLowerCase();
  return items.value.filter((i) => i.Nomor?.toLowerCase().includes(q));
});

const selectItem = (item: any) => {
  emit("selected", item);
  emit("update:modelValue", false);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="500px"
  >
    <div class="lookup-card">
      <div class="lookup-header">
        <v-icon size="15" color="white" class="mr-2"
          >mdi-file-find-outline</v-icon
        >
        <span>Pilih Nomor PO Internal</span>
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>
      <div class="lookup-search">
        <v-icon size="16" color="#9e9e9e">mdi-magnify</v-icon>
        <input
          v-model="search"
          type="text"
          placeholder="Cari nomor PO..."
          class="search-input"
          autofocus
        />
      </div>
      <div class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data...</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 150px">NOMOR PO</th>
              <th>TANGGAL</th>
              <th>CABANG</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredItems"
              :key="item.Nomor"
              class="lookup-row"
              @click="selectItem(item)"
            >
              <td class="td-kode">{{ item.Nomor }}</td>
              <td>{{ item.Tanggal ? item.Tanggal.substring(0, 10) : "" }}</td>
              <td>{{ item.AsalPO }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
/* Style sama seperti MapSearchModal sebelumnya */
.lookup-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: "Segoe UI", sans-serif;
  font-size: 12px;
}
.lookup-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-weight: 700;
}
.lookup-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
}
.lookup-table-wrap {
  flex: 1;
  overflow-y: auto; /* Aktifkan scroll */
  min-height: 150px;
  max-height: 450px; /* Batasi tinggi agar muncul scroll bar */
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
}
.lookup-table {
  width: 100%;
  border-collapse: collapse;
}
.lookup-table th {
  background: #f5f5f5;
  padding: 7px 10px;
  text-align: left;
  border-bottom: 2px solid #e0e0e0;
}
.lookup-table td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.lookup-row:hover td {
  background: #e3f2fd;
  cursor: pointer;
}
.td-kode {
  color: #1565c0;
  font-weight: 600;
}
</style>
