<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import { IconPackage, IconSearch, IconDatabaseOff } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const props = defineProps<{
  modelValue: boolean;
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

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
const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await api.get("/mmt/permintaan-bahan/lookup", {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
        status: "OPEN",
      },
    });
    items.value = Array.isArray(res.data) ? res.data : (res.data?.data || []);
  } catch (err) {
    console.error("Gagal load lookup Permintaan Bahan MMT:", err);
    items.value = [];
  } finally {
    isLoading.value = false;
  }
};

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return items.value;
  return items.value.filter((item) => {
    return (
      (item.Nomor && item.Nomor.toLowerCase().includes(q)) ||
      (item.Keterangan && item.Keterangan.toLowerCase().includes(q)) ||
      (item.NamaGudang && item.NamaGudang.toLowerCase().includes(q))
    );
  });
});

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
    max-width="950px"
  >
    <div class="lookup-card">
      <div class="lookup-header">
        <IconPackage :size="15" :stroke-width="1.7" color="white" />
        <span>Pencarian Nomor Permintaan Bahan MMT</span>
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">✕</button>
      </div>

      <div class="lookup-filter-bar">
        <div class="filter-group">
          <span class="filter-label">Periode:</span>
          <input type="date" v-model="startDate" class="date-inp" @change="fetchData" />
          <span class="filter-sep">s/d</span>
          <input type="date" v-model="endDate" class="date-inp" @change="fetchData" />
        </div>

        <div class="search-wrap">
          <IconSearch :size="15" :stroke-width="1.7" color="#9e9e9e" />
          <input
            v-model="search"
            type="text"
            placeholder="Cari Nomor / Keterangan..."
            class="search-input"
          />
          <button v-if="search" class="search-clear" @click="search = ''">✕</button>
        </div>
      </div>

      <div class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data permintaan bahan...</span>
        </div>
        <div v-else-if="filteredItems.length === 0" class="lookup-state">
          <IconDatabaseOff :size="32" :stroke-width="1.3" color="#bdbdbd" />
          <span>Tidak ada data Permintaan Bahan yang belum selesai</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 170px">NO. PERMINTAAN</th>
              <th style="width: 100px" class="text-center">TANGGAL</th>
              <th style="width: 160px">GUDANG TUJUAN</th>
              <th style="width: 80px" class="text-center">ACC</th>
              <th style="width: 90px" class="text-center">STATUS</th>
              <th>KETERANGAN</th>
              <th style="width: 60px" class="text-center">AKSI</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredItems"
              :key="item.Nomor"
              class="lookup-row"
              @dblclick="selectItem(item)"
            >
              <td class="font-weight-medium font-monospace">{{ item.Nomor }}</td>
              <td class="text-center">{{ formatTanggal(item.Tanggal) }}</td>
              <td>{{ item.NamaGudang || '-' }}</td>
              <td class="text-center">
                <v-chip
                  size="x-small"
                  :color="item.ACC === 'Y' ? 'success' : 'warning'"
                  class="font-weight-bold"
                >
                  {{ item.ACC === 'Y' ? 'ACC' : 'PENDING' }}
                </v-chip>
              </td>
              <td class="text-center">
                <v-chip
                  size="x-small"
                  :color="item.Status_Proses === 'OPEN' ? 'primary' : 'grey-darken-1'"
                  class="font-weight-bold"
                >
                  {{ item.Status_Proses }}
                </v-chip>
              </td>
              <td class="text-caption">{{ item.Keterangan || '-' }}</td>
              <td class="text-center">
                <v-btn
                  size="x-small"
                  color="primary"
                  variant="tonal"
                  @click.stop="selectItem(item)"
                >
                  Pilih
                </v-btn>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.lookup-card { background: white; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; font-family: 'Segoe UI', sans-serif; font-size: 11px; max-height: 85vh; }
.lookup-header { display: flex; align-items: center; background: #1565c0; color: white; padding: 9px 14px; font-size: 13px; font-weight: 700; gap: 6px; }
.lookup-close { background: transparent; border: none; color: rgba(255, 255, 255, 0.8); font-size: 15px; cursor: pointer; }
.lookup-filter-bar { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-bottom: 1px solid #e0e0e0; background: #fafafa; flex-wrap: wrap; }
.filter-group { display: flex; align-items: center; gap: 4px; }
.filter-label { font-size: 11px; font-weight: 600; color: #555; }
.filter-sep { font-size: 11px; color: #777; }
.date-inp { height: 26px; border: 1px solid #ccc; border-radius: 4px; padding: 0 4px; font-size: 11px; background: white; color: #212121; }
.search-wrap { display: flex; align-items: center; gap: 6px; border: 1px solid #ccc; background: white; border-radius: 4px; padding: 0 6px; height: 26px; flex: 1; min-width: 200px; }
.search-input { flex: 1; border: none; outline: none; font-size: 11px; background: transparent; }
.search-clear { background: transparent; border: none; color: #9e9e9e; cursor: pointer; }
.lookup-table-wrap { flex: 1; overflow-y: auto; max-height: 420px; }
.lookup-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 40px; color: #9e9e9e; }
.lookup-table { width: 100%; border-collapse: collapse; }
.lookup-table th { padding: 6px 10px; font-size: 11px; font-weight: 700; background: #1565c0; color: white; border: 1px solid #0d47a1; text-align: left; }
.lookup-table td { padding: 5px 8px; font-size: 11px; border-bottom: 1px solid #eee; }
.lookup-row { cursor: pointer; }
.lookup-row:hover td { background: #e3f2fd; }
</style>
