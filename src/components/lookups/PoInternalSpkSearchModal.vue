<script setup lang="ts">
import { ref, watch } from "vue";
import api from "@/services/api";
import {
  IconClipboardList,
  IconSearch,
  IconDatabaseOff,
} from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);

// Tambahan state untuk pagination
const page = ref(1);
const total = ref(0);

const fetchData = async (isLoadMore = false) => {
  if (isLoading.value) return;
  isLoading.value = true;

  if (!isLoadMore) {
    page.value = 1;
  }

  try {
    const res = await api.get("/lookups/po-internal-spk", {
      // Kirim page dan limit
      params: { q: search.value, page: page.value, limit: 50 },
    });

    const fetchedItems = res.data.data.items || [];

    if (isLoadMore) {
      items.value.push(...fetchedItems);
    } else {
      items.value = fetchedItems;
    }

    total.value = res.data.data.total || 0;
  } catch (error) {
    console.error("Gagal memuat Lookup PO Internal SPK", error);
  } finally {
    isLoading.value = false;
  }
};

// Deteksi saat pengguna scroll sampai paling bawah tabel
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 10) {
    if (!isLoading.value && items.value.length < total.value) {
      page.value++;
      fetchData(true); // Panggil mode load more
    }
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

let debounceTimer: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchData(false), 300);
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
    max-width="720px"
  >
    <div class="lookup-card">
      <div class="lookup-header">
        <IconClipboardList :size="15" :stroke-width="1.7" color="white" />
        <span>Pilih PO Internal SPK</span>
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>

      <div class="lookup-search">
        <IconSearch :size="16" :stroke-width="1.7" color="#9e9e9e" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari nomor PO, nomor SPK, atau nama..."
          class="search-input"
          autofocus
        />
        <button v-if="search" class="search-clear" @click="search = ''">
          ✕
        </button>
      </div>

      <div class="lookup-table-wrap" @scroll="handleScroll">
        <div v-if="isLoading && items.length === 0" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data...</span>
        </div>
        <div v-else-if="items.length === 0" class="lookup-state">
          <IconDatabaseOff :size="32" :stroke-width="1.3" color="#bdbdbd" />
          <span>{{
            search
              ? `Tidak ada hasil untuk "${search}"`
              : "Tidak ada PO terbuka"
          }}</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 120px">NOMOR PO</th>
              <th style="width: 85px">TANGGAL</th>
              <th style="width: 120px">SPK</th>
              <th>NAMA</th>
              <th style="width: 90px">JASA</th>
              <th style="width: 90px">ASAL</th>
              <th style="width: 90px">TUJUAN</th>
              <th>KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.Nomor"
              class="lookup-row"
              @click="selectItem(item)"
            >
              <td class="td-kode">{{ item.Nomor }}</td>
              <td>{{ item.Tanggal }}</td>
              <td>{{ item.SPK }}</td>
              <td class="font-weight-bold">{{ item.NamaSPK }}</td>
              <td>{{ item.Jasa }}</td>
              <td>{{ item.NamaSup }}</td>
              <td>{{ item.NamaCab }}</td>
              <td>{{ item.Keterangan }}</td>
            </tr>
          </tbody>
        </table>

        <div
          v-if="isLoading && items.length > 0"
          style="text-align: center; padding: 10px"
        >
          <v-progress-circular indeterminate color="primary" size="20" />
        </div>
      </div>

      <div class="lookup-footer">
        <!-- Ubah tampilan total data agar lebih informatif -->
        <span class="footer-count">
          Menampilkan {{ items.length }} dari {{ total }} PO terbuka
        </span>
        <span class="footer-hint">Klik baris untuk memilih</span>
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
  max-height: 88vh;
}
.lookup-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  gap: 6px;
}
.lookup-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
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
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  color: #212121;
  background: transparent;
}
.search-input::placeholder {
  color: #9e9e9e;
}
.search-clear {
  background: transparent;
  border: none;
  color: #9e9e9e;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}
.search-clear:hover {
  color: #424242;
}
.lookup-table-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 150px;
  max-height: 420px;
  overflow-x: auto;
}
.lookup-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  color: #9e9e9e;
  font-size: 12px;
}
.lookup-table {
  width: 100%;
  border-collapse: collapse;
}
.lookup-table thead tr {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #1565c0;
}
.lookup-table th {
  padding: 7px 10px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: white;
  border: 1px solid #0d47a1;
  border-bottom: none;
  text-align: left;
  white-space: nowrap;
}
.lookup-table td {
  padding: 6px 10px;
  font-size: 11.5px;
  border-bottom: 1px solid #f0f0f0;
  color: #212121;
  white-space: nowrap;
}
.lookup-row {
  cursor: pointer;
  transition: background 0.1s;
}
.lookup-row:hover td {
  background: #e3f2fd;
  color: #1565c0;
}
.td-kode {
  font-family: monospace;
  font-weight: 600;
  color: #1565c0;
}
.lookup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.footer-count {
  font-size: 11px;
  color: #757575;
}
.footer-hint {
  font-size: 10px;
  color: #bdbdbd;
  font-style: italic;
}
</style>
