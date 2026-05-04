<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import api from "@/services/api";

const props = defineProps<{
  modelValue: boolean;
  kodePerusahaan: string; // Wajib dioper agar query benar
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);

const fetchData = async () => {
  // Tambahkan log untuk memastikan fungsi ini terpanggil
  console.log("Memulai Fetch Rekening untuk:", props.kodePerusahaan);

  if (!props.kodePerusahaan) return;

  isLoading.value = true;
  try {
    const res = await api.get("/lookups/rekening", {
      params: { perushKode: props.kodePerusahaan },
    });
    items.value = res.data.data || [];
  } catch (error) {
    console.error("Gagal memuat Rekening", error);
  } finally {
    isLoading.value = false;
  }
};

// 1. Tambahkan onMounted agar v-if di parent memicu fetch
onMounted(() => {
  if (props.modelValue) {
    fetchData();
  }
});

// 2. Tambahkan immediate: true agar watch menangkap nilai awal
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      search.value = "";
      fetchData(); // Hapus pengecekan items.length agar selalu fresh
    }
  },
  { immediate: true }, // Penting!
);

// 3. Tambahkan watcher untuk kodePerusahaan (jika perusahaan diganti saat modal terbuka)
watch(
  () => props.kodePerusahaan,
  () => {
    if (props.modelValue) fetchData();
  },
);

const filteredItems = computed(() => {
  if (!search.value) return items.value;
  const q = search.value.toLowerCase();
  return items.value.filter(
    (i) =>
      (i.Rekening?.toLowerCase() || "").includes(q) ||
      (i.Bank?.toLowerCase() || "").includes(q) ||
      (i.AtasNama?.toLowerCase() || "").includes(q),
  );
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
    max-width="750px"
  >
    <div class="lookup-card">
      <div class="lookup-header">
        <v-icon size="15" color="white" class="mr-2"
          >mdi-credit-card-outline</v-icon
        >
        <span>Pilih Rekening (Perusahaan: {{ kodePerusahaan }})</span>
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
          placeholder="Cari No. Rekening, Bank, atau Atas Nama..."
          class="search-input"
          autofocus
        />
        <button v-if="search" class="search-clear" @click="search = ''">
          ✕
        </button>
      </div>

      <div class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data...</span>
        </div>
        <div v-else-if="filteredItems.length === 0" class="lookup-state">
          <v-icon size="32" color="#bdbdbd">mdi-database-off-outline</v-icon>
          <span>{{
            search
              ? `Tidak ada hasil untuk "${search}"`
              : "Tidak ada rekening terdaftar."
          }}</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th>REKENING</th>
              <th style="width: 120px">BANK</th>
              <th>ATAS NAMA</th>
              <th style="width: 150px">CABANG</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredItems"
              :key="item.Rekening"
              class="lookup-row"
              @click="selectItem(item)"
            >
              <td class="td-kode">{{ item.Rekening }}</td>
              <td>{{ item.Bank }}</td>
              <td>{{ item.AtasNama }}</td>
              <td>{{ item.Cabang }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="lookup-footer">
        <span class="footer-count"
          >{{ filteredItems.length }} dari {{ items.length }} data</span
        >
        <span class="footer-hint">Klik baris untuk memilih</span>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
/* Pastekan css lookup standar seperti Sales/Perusahaan di sini */
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
  max-height: 380px;
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
  background: #f5f5f5;
}
.lookup-table th {
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #424242;
  border-bottom: 2px solid #e0e0e0;
  text-align: left;
  white-space: nowrap;
}
.lookup-table td {
  padding: 5px 10px;
  font-size: 12px;
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
