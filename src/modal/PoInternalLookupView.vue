<template>
  <div>
    <v-dialog
      :model-value="isVisible"
      @update:modelValue="emit('close')"
      max-width="1100px"
      persistent
    >
      <v-card class="dialog-card d-flex flex-column" style="height: 85vh">
        <v-toolbar color="indigo-darken-2" density="compact">
          <v-toolbar-title class="text-subtitle-1 font-weight-bold">
            📦 Lookup PO Internal — 1 PO Banyak Size & Komponen
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" @click="emit('close')" variant="text" size="small"></v-btn>
        </v-toolbar>

        <v-card-text class="pa-4 d-flex flex-column flex-grow-1">
          <v-text-field
            v-model="search"
            label="Cari Nomor PO, SPK, atau Nama Order..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            clearable
            class="mb-4 flex-shrink-0"
            hide-details
            @keyup.enter="fetchData"
          ></v-text-field>

          <v-data-table
            :headers="headers"
            :items="groupedPos"
            :loading="loading"
            hover
            class="desktop-table flex-grow-1 clickable-row"
            density="compact"
            fixed-header
            :items-per-page="20"
            @click:row="handleRowClick"
            @dblclick:row="handleRowClick"
          >
            <template #item.poi_nomor="{ item }">
              <span class="font-weight-bold color-spk">{{ item.poi_nomor }}</span>
            </template>
            <template #item.poi_tanggal="{ item }">
              {{ formatDate(item.poi_tanggal) }}
            </template>
            <template #item.jumlahSpk="{ item }">
              <v-chip color="indigo" size="x-small" label>{{ item.jumlahSpk }} SPK</v-chip>
            </template>
            <template #item.jumlahSize="{ item }">
              <v-chip color="teal" size="x-small" label>{{ item.jumlahSize }} Size</v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn color="indigo" size="x-small" @click.stop="handleRowClick(null, { item })" variant="flat">Pilih</v-btn>
            </template>
            <template #no-data>
              <div class="text-center pa-4">Tidak ada PO Internal ditemukan.</div>
            </template>
          </v-data-table>
        </v-card-text>

        <v-card-actions class="d-flex justify-end border-top pa-3">
          <v-btn @click="emit('close')" color="secondary" variant="outlined" size="small">Batal</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Sub-dialog: Pilih Size & Komponen seperti SPK Sublim -->
    <v-dialog v-model="componentDialog" max-width="580px" scrollable>
      <v-card border>
        <v-card-title class="bg-indigo-darken-3 text-white text-subtitle-1 pa-3 d-flex justify-space-between align-center">
          <div>Pilih PO [{{ selectedPoiNo }}]</div>
        </v-card-title>

        <v-card-text class="pa-4">
          <div class="text-subtitle-2 font-weight-bold text-indigo-darken-3 mb-1">1. Pilih Metode Pengambilan:</div>
          <v-radio-group v-model="extractMode" inline density="compact" class="mb-3" hide-details>
            <v-radio label="Ambil Semua Set (All Set)" value="SET" color="indigo-darken-3"></v-radio>
            <v-radio label="Pilih Komponen Tertentu" value="KOMPONEN" color="indigo-darken-3"></v-radio>
          </v-radio-group>
          <v-divider class="mb-4"></v-divider>

          <div class="text-subtitle-2 font-weight-bold text-indigo-darken-3 mb-1">2. Pilih Ukuran (Size - Bisa Lebih dari 1):</div>
          <v-select
            v-model="selectedSizes"
            :items="availableSizes"
            label="Pilih Size..."
            variant="outlined"
            density="compact"
            class="mb-4"
            multiple
            chips
            closable-chips
            hide-details
            @update:model-value="onSizeChange"
          >
            <template v-slot:item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" density="compact">
                <template v-slot:prepend>
                  <v-checkbox-btn :model-value="selectedSizes.includes(item.raw)" color="indigo-darken-3" density="compact" class="mr-2" hide-details></v-checkbox-btn>
                </template>
                <v-list-item-title class="font-weight-medium">{{ item.raw }}</v-list-item-title>
              </v-list-item>
            </template>
          </v-select>
          <v-divider class="mb-3"></v-divider>

          <div v-if="extractMode === 'KOMPONEN'">
            <div class="text-subtitle-2 font-weight-bold text-indigo-darken-3 mb-1">3. Pilih Komponen (Multi-Select):</div>
            <div v-if="selectedSizes.length > 0" class="text-caption text-grey-darken-1 mb-2">Centang komponen untuk size yang dipilih:</div>
            <div v-else class="text-caption text-error mb-2">Harap pilih minimal 1 Size terlebih dahulu.</div>
            <v-list v-if="selectedSizes.length > 0" density="compact" class="border rounded bg-grey-lighten-5" style="max-height: 220px; overflow-y: auto">
              <v-list-item v-for="(comp, idx) in currentSizeComponents" :key="idx" class="border-bottom">
                <template v-slot:prepend>
                  <v-checkbox-btn
                    v-model="selectedComponentKeys"
                    :value="getKomponenKode(comp) + '_' + getKomponenName(comp, idx) + '_' + (comp.poid_size || comp.poi_size)"
                    color="indigo-darken-3" class="mr-2"
                  ></v-checkbox-btn>
                </template>
                <v-list-item-title class="font-weight-bold text-body-2">
                  {{ getKomponenName(comp, idx) }} <span class="text-caption text-indigo font-weight-medium">({{ comp.poid_size || comp.poi_size }})</span>
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">Kode: {{ getKomponenKode(comp) }} | Qty PO: {{ comp.poid_jumlah || 0 }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
          <div v-else-if="extractMode === 'SET' && selectedSizes.length > 0" class="text-body-2 text-grey-darken-2 pa-3 bg-grey-lighten-4 rounded text-center">
            Semua komponen untuk Size <b>{{ selectedSizes.join(", ") }}</b> akan diambil sebagai kesatuan set (All Set).
          </div>
          <div v-else class="text-body-2 text-grey pa-3 bg-grey-lighten-3 rounded text-center">Silakan pilih Size di atas.</div>
        </v-card-text>

        <v-card-actions class="bg-grey-lighten-4 pa-3">
          <v-btn size="small" variant="text" @click="componentDialog = false">Batal</v-btn>
          <v-spacer />
          <v-btn size="small" color="indigo-darken-3" variant="flat" :disabled="selectedSizes.length === 0 || (extractMode === 'KOMPONEN' && selectedComponentKeys.length === 0)" @click="confirmSelection">Konfirmasi & Pilih</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import { format } from "date-fns";

const props = defineProps(["isVisible"]);
const emit = defineEmits(["close", "select", "update:isVisible"]);

const dialogModel = computed({
  get() { return props.isVisible; },
  set(v) { emit("update:isVisible", v); if (!v) emit("close"); },
});

const items = ref([]);
const loading = ref(false);
const search = ref("");

// Sub-dialog state (mirip SPK Sublim)
const componentDialog = ref(false);
const extractMode = ref("SET");
const selectedSizes = ref([]);
const availableSizes = ref([]);
const currentSizeComponents = ref([]);
const selectedComponentKeys = ref([]);
const selectedPoiNo = ref("");
const activePoiItem = ref(null);

const headers = [
  { title: "Nomor PO", key: "poi_nomor", width: "150px" },
  { title: "Tanggal", key: "poi_tanggal", width: "110px" },
  { title: "SPK", key: "jumlahSpk", width: "90px", align: "center" },
  { title: "Size", key: "jumlahSize", width: "90px", align: "center" },
  { title: "Aksi", key: "actions", width: "80px", align: "center", sortable: false },
];

const groupedPos = computed(() => {
  const map = new Map();
  items.value.forEach((it) => {
    const key = it.poi_nomor;
    if (!map.has(key)) {
      const allForPo = items.value.filter((x) => x.poi_nomor === key);
      const spkSet = new Set(allForPo.map((x) => x.poi_spk_nomor).filter(Boolean));
      const sizeSet = new Set(allForPo.map((x) => x.poid_size).filter(Boolean));
      map.set(key, {
        poi_nomor: key,
        poi_tanggal: allForPo[0]?.poi_tanggal || "",
        jumlahSpk: spkSet.size,
        jumlahSize: sizeSet.size,
      });
    }
  });
  let list = [...map.values()];
  if (search.value) {
    const q = search.value.toLowerCase();
    list = list.filter((r) => r.poi_nomor.toLowerCase().includes(q));
  }
  return list;
});

const getKomponenName = (comp, idx) => {
  if (comp.nama_komponen && comp.nama_komponen.trim() !== "") return comp.nama_komponen;
  if (comp.Bhn_Name && comp.Bhn_Name.trim() !== "") return comp.Bhn_Name;
  if (comp.bhn_name && comp.bhn_name.trim() !== "") return comp.bhn_name;
  if (comp.poid_bhn_kode && comp.poid_bhn_kode.trim() !== "") return comp.poid_bhn_kode;
  return `Komponen Bagian ${idx + 1}`;
};
const getKomponenKode = (comp) => comp.poid_bhn_kode || comp.poid_bhn_kode || comp.Kode_Komponen || "-";

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await api.get("/mmt/po-internal/lookup");
    items.value = res.data.success ? res.data.data : [];
  } catch (e) {
    console.error("Gagal load POI", e);
  } finally {
    loading.value = false;
  }
};

const handleRowClick = (_event, { item }) => {
  openComponentDialog(item);
};

const openComponentDialog = (poRow) => {
  const poiNo = poRow.poi_nomor;
  const allForPo = items.value.filter((d) => d.poi_nomor === poiNo);
  const sizeSet = new Set();
  allForPo.forEach((r) => { const s = r.poid_size; if (s) sizeSet.add(s); });
  activePoiItem.value = poRow;
  selectedPoiNo.value = poiNo;
  availableSizes.value = Array.from(sizeSet);
  selectedSizes.value = availableSizes.value.length > 0 ? [availableSizes.value[0]] : [];
  extractMode.value = "SET";
  selectedComponentKeys.value = [];
  onSizeChange(selectedSizes.value);
  componentDialog.value = true;
};

const onSizeChange = () => {
  selectedComponentKeys.value = [];
  if (!activePoiItem.value || selectedSizes.value.length === 0) {
    currentSizeComponents.value = [];
    return;
  }
  const poiNo = activePoiItem.value.poi_nomor;
  const matched = items.value.filter((d) => d.poi_nomor === poiNo && selectedSizes.value.includes(d.poid_size || ""));
  const uniq = [];
  const seen = new Set();
  matched.forEach((c, idx) => {
    const k = getKomponenKode(c) + "_" + getKomponenName(c, idx) + "_" + (c.poid_size || "");
    if (!seen.has(k)) { seen.add(k); uniq.push(c); }
  });
  currentSizeComponents.value = uniq;
};

const confirmSelection = () => {
  if (!activePoiItem.value || selectedSizes.value.length === 0) return;
  const poiNo = activePoiItem.value.poi_nomor;
  if (extractMode.value === "SET") {
    const payload = selectedSizes.value.map((sizeName) => {
      const base = currentSizeComponents.value.find((c) => (c.poid_size || "") === sizeName) || items.value.find((d) => d.poi_nomor === poiNo && (d.poid_size || "") === sizeName) || activePoiItem.value;
      return {
        ...base,
        poi_nomor: poiNo,
        poi_size: sizeName,
        poid_size: sizeName,
        nama_komponen: "ALL SET",
        poid_bhn_kode: "ALL SET",
        poi_spk_nomor: base.poi_spk_nomor || base.spk_nomor || "",
        poid_jumlah: base.poid_jumlah || 0,
      };
    });
    emit("select", { mode: "SET", data: payload });
    componentDialog.value = false;
    emit("close");
  } else {
    if (selectedComponentKeys.value.length === 0) return;
    const selected = currentSizeComponents.value.filter((comp, idx) => {
      const k = getKomponenKode(comp) + "_" + getKomponenName(comp, idx) + "_" + (comp.poid_size || "");
      return selectedComponentKeys.value.includes(k);
    });
    const payload = selected.map((comp) => ({
      ...comp,
      poi_nomor: poiNo,
      poi_size: comp.poid_size || "",
      poid_size: comp.poid_size || "",
      nama_komponen: getKomponenName(comp, 0),
      poid_bhn_kode: getKomponenKode(comp),
    }));
    emit("select", { mode: "KOMPONEN", data: payload });
    componentDialog.value = false;
    emit("close");
  }
};

const formatDate = (date) => date ? format(new Date(date), "dd/MM/yyyy") : "-";

watch(() => props.isVisible, (v) => { if (v) fetchData(); });
</script>

<style scoped>
.poi-modal-mode :deep(.v-label) { color: #ffffff !important; font-size: 13px !important; font-weight: bold !important; opacity: 1 !important; }
.cursor-pointer :deep(tbody tr) { cursor: pointer; }
.border-bottom { border-bottom: 1px solid #e0e0e0; }
.desktop-table { font-size: 12px; }
.desktop-table :deep(td), .desktop-table :deep(th) { padding: 0 8px !important; height: 36px !important; }
.desktop-table :deep(thead th) { background-color: #f8f9fa !important; font-weight: bold; color: #2c3e50 !important; }
.color-spk { color: #1a237e; }
.clickable-row :deep(tbody tr):hover { cursor: pointer !important; background-color: #edf2f7 !important; }
</style>
