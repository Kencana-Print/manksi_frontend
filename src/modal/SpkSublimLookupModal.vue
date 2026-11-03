<template>
  <div>
    <!-- Dialog Utama Lookup SPK Sublim -->
    <v-dialog
      :model-value="isVisible"
      @update:modelValue="emit('close')"
      max-width="1100px"
      persistent
    >
      <v-card class="dialog-card d-flex flex-column" style="height: 85vh">
        <!-- Header Toolbar -->
        <v-toolbar color="indigo-darken-2" density="compact">
          <v-toolbar-title class="text-subtitle-1 font-weight-bold">
            🔥 Pencarian SPK & Realisasi Bahan (Khusus Sublimasi)
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-close"
            @click="emit('close')"
            variant="text"
            size="small"
          ></v-btn>
        </v-toolbar>

        <!-- Body Content -->
        <v-card-text class="pa-4 d-flex flex-column flex-grow-1">
          <v-text-field
            v-model="searchKeyword"
            label="Cari Nomor SPK, Nama Pelanggan, atau Kain..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            clearable
            class="mb-4 flex-shrink-0"
            hide-details
            @keyup.enter="fetchSPKData"
          ></v-text-field>

          <v-data-table
            :headers="headers"
            :items="groupedItems"
            :loading="loading"
            hover
            class="desktop-table flex-grow-1 clickable-row"
            density="compact"
            item-key="SPK"
            fixed-header
            :items-per-page="20"
            @click:row="handleRowClick"
            @dblclick:row="handleDoubleClick"
          >
            <template #item.SPK="{ item }">
              <span class="font-weight-bold color-spk">{{ item.SPK }}</span>
            </template>

            <template #item.Nomor_Realisasi="{ item }">
              <v-chip
                :color="item.Nomor_Realisasi !== '-' ? 'success' : 'default'"
                size="x-small"
                label
                class="font-weight-medium"
              >
                {{ item.Nomor_Realisasi }}
              </v-chip>
            </template>

            <template #item.Tanggal="{ item }">
              {{
                item.Tanggal
                  ? new Date(item.Tanggal).toLocaleDateString("id-ID")
                  : "-"
              }}
            </template>

            <template #item.Bahan_Awal="{ item }">
              <span class="font-weight-bold text-teal-darken-3">
                {{ item.Bahan_Awal ? item.Bahan_Awal + " M" : "-" }}
              </span>
            </template>

            <template #item.Tipe_SPK="{ item }">
              <v-chip
                :color="
                  item.Tipe_SPK === 'REGULER'
                    ? 'blue-darken-1'
                    : 'purple-darken-1'
                "
                size="x-small"
                variant="flat"
              >
                {{ item.Tipe_SPK }}
              </v-chip>
            </template>

            <template #item.actions="{ item }">
              <div class="text-center">
                <v-btn
                  color="indigo"
                  size="x-small"
                  @click.stop="openComponentDialog(item as SPKSublimItem)"
                  variant="flat"
                >
                  Pilih
                </v-btn>
              </div>
            </template>

            <template #no-data>
              <div class="text-center pa-4">
                Tidak ada SPK aktif dengan berkas Realisasi Bahan Gudang yang
                ditemukan.
              </div>
            </template>

            <template #loading>
              <v-progress-linear
                indeterminate
                color="indigo"
              ></v-progress-linear>
            </template>
          </v-data-table>
        </v-card-text>

        <v-card-actions class="d-flex justify-end border-top pa-3">
          <v-btn
            @click="emit('close')"
            color="secondary"
            variant="outlined"
            size="small"
            >Batal</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Sub-Dialog Pemilihan Mode, Size & Komponen -->
    <v-dialog v-model="componentDialog" max-width="580px" scrollable>
      <v-card border>
        <v-card-title
          class="bg-indigo-darken-3 text-white text-subtitle-1 pa-3 d-flex justify-space-between align-center"
        >
          <div>Pilih SPK [{{ selectedSPKNo }}]</div>
        </v-card-title>

        <v-card-text class="pa-4">
          <!-- 1. PILIH METODE PENGAMBILAN (SET / KOMPONEN) -->
          <div
            class="text-subtitle-2 font-weight-bold text-indigo-darken-3 mb-1"
          >
            1. Pilih Metode Pengambilan:
          </div>
          <v-radio-group
            v-model="extractMode"
            inline
            density="compact"
            class="mb-3"
            hide-details
            @update:model-value="onModeChange"
          >
            <v-radio
              label="Ambil Semua Set (All Set)"
              value="SET"
              color="indigo-darken-3"
            ></v-radio>
            <v-radio
              label="Pilih Komponen Tertentu"
              value="KOMPONEN"
              color="indigo-darken-3"
            ></v-radio>
          </v-radio-group>

          <v-divider class="mb-4"></v-divider>

          <!-- 2. PILIH UKURAN (SIZE) - MULTI-SELECT DENGAN CHECKBOX -->
          <div
            class="text-subtitle-2 font-weight-bold text-indigo-darken-3 mb-1"
          >
            2. Pilih Ukuran (Size - Bisa Lebih dari 1):
          </div>
          <v-select
            v-model="selectedSizes"
            :items="availableSizes"
            label="Pilih Size SPK..."
            variant="outlined"
            density="compact"
            class="mb-4"
            multiple
            chips
            closable-chips
            hide-details
            @update:model-value="onSizeChange"
          >
            <!-- Custom item dengan Checkbox di dalam Dropdown -->
            <template v-slot:item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" density="compact">
                <template v-slot:prepend>
                  <v-checkbox-btn
                    :model-value="selectedSizes.includes(item.raw)"
                    color="indigo-darken-3"
                    density="compact"
                    class="mr-2"
                    hide-details
                  ></v-checkbox-btn>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ item.raw }}
                </v-list-item-title>
              </v-list-item>
            </template>
          </v-select>

          <v-divider class="mb-3"></v-divider>

          <!-- 3. DAFTAR KOMPONEN (Hanya muncul jika mode 'KOMPONEN' dan Size sudah dipilih) -->
          <div v-if="extractMode === 'KOMPONEN'">
            <div
              class="text-subtitle-2 font-weight-bold text-indigo-darken-3 mb-1"
            >
              3. Pilih Komponen (Multi-Select):
            </div>
            <div
              v-if="selectedSizes.length > 0"
              class="text-caption text-grey-darken-1 mb-2"
            >
              Centang komponen untuk size yang dipilih:
            </div>
            <div v-else class="text-caption text-error mb-2">
              Harap pilih minimal 1 Size terlebih dahulu untuk melihat komponen.
            </div>

            <v-list
              v-if="selectedSizes.length > 0"
              density="compact"
              class="border rounded bg-grey-lighten-5"
              style="max-height: 220px; overflow-y: auto"
            >
              <v-list-item
                v-for="(comp, idx) in currentSizeComponents"
                :key="idx"
                class="border-bottom"
              >
                <template v-slot:prepend>
                  <v-checkbox-btn
                    v-model="selectedComponentKeys"
                    :value="
                      getKomponenKode(comp) +
                      '_' +
                      getKomponenName(comp, idx) +
                      '_' +
                      (comp.Size || comp.poid_size)
                    "
                    color="indigo-darken-3"
                    class="mr-2"
                  ></v-checkbox-btn>
                </template>
                <v-list-item-title class="font-weight-bold text-body-2">
                  {{ getKomponenName(comp, idx) }}
                  <span class="text-caption text-indigo font-weight-medium"
                    >({{ comp.Size || comp.poid_size }})</span
                  >
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  Kode: {{ getKomponenKode(comp) }} | P:
                  {{ comp.Panjang || comp.panjang || 0 }}M, L:
                  {{ comp.Lebar || comp.lebar || 0 }}M
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>

          <div
            v-else-if="extractMode === 'SET' && selectedSizes.length > 0"
            class="text-body-2 text-grey-darken-2 pa-3 bg-grey-lighten-4 rounded text-center"
          >
            Semua komponen untuk Size <b>{{ selectedSizes.join(", ") }}</b> akan
            diambil sebagai kesatuan set (All Set).
          </div>
          <div
            v-else
            class="text-body-2 text-grey pa-3 bg-grey-lighten-3 rounded text-center"
          >
            Silakan pilih Size di atas.
          </div>
        </v-card-text>

        <v-card-actions class="bg-grey-lighten-4 pa-3">
          <v-btn size="small" variant="text" @click="componentDialog = false"
            >Batal</v-btn
          >
          <v-spacer />
          <v-btn
            size="small"
            color="indigo-darken-3"
            variant="flat"
            :disabled="
              selectedSizes.length === 0 ||
              (extractMode === 'KOMPONEN' && selectedComponentKeys.length === 0)
            "
            @click="confirmSelection"
          >
            Konfirmasi & Pilih
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { AxiosError } from "axios";
import api from "@/services/api";
import { useToast } from "vue-toastification";

interface SPKSublimItem {
  SPK: string;
  Nama: string;
  Tanggal: string;
  Qty_Order: number;
  Ukuran?: string;
  Nama_Bahan_Rencana: string;
  Tipe_SPK: string;
  Divisi: string;
  Nomor_Realisasi: string;
  Barang_ID: string;
  Nama_Bahan_Realisasi: string;
  Bahan_Awal: number;
  Size?: string;
  poid_size?: string;
  Size_Qty?: number;
  spk_qty?: number;
  Nama_Komponen?: string;
  nama_komponen?: string;
  Kode_Komponen?: string;
  poid_bhn_kode?: string;
  poid_jumlah?: number;
  [key: string]: any;
}

const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", payload: { mode: string; data: any[] }): void;
}>();

const toast = useToast();

const API_URL = "/mmt/SPK/lookup-sublim";
const SPKList = ref<SPKSublimItem[]>([]);
const searchKeyword = ref("");
const loading = ref(false);

// State Sub-Dialog
const componentDialog = ref(false);
const extractMode = ref<"SET" | "KOMPONEN">("SET");
const selectedSizes = ref<string[]>([]); // Diubah menjadi array untuk multi-select
const availableSizes = ref<string[]>([]);
const currentSizeComponents = ref<SPKSublimItem[]>([]);
const selectedComponentKeys = ref<string[]>([]);
const selectedSPKNo = ref("");
const activeRowItem = ref<SPKSublimItem | null>(null);

const headers = [
  { title: "Nomor SPK", key: "SPK", width: "150px" },
  { title: "No. Realisasi Gudang", key: "Nomor_Realisasi", width: "150px" },
  { title: "Nama Order / Pelanggan", key: "Nama", width: "250px" },
  { title: "Bahan Realisasi", key: "Nama_Bahan_Realisasi", width: "200px" },
  {
    title: "Bahan Awal (Gudang)",
    key: "Bahan_Awal",
    width: "120px",
    align: "end" as const,
  },
  {
    title: "Target Qty",
    key: "Qty_Order",
    width: "100px",
    align: "end" as const,
  },
  { title: "Tanggal SPK", key: "Tanggal", width: "110px" },
  { title: "Jenis", key: "Tipe_SPK", width: "90px", align: "center" as const },
  {
    title: "Aksi",
    key: "actions",
    sortable: false,
    width: "80px",
    align: "center" as const,
  },
];

const groupedItems = computed(() => {
  const seen = new Set();
  return SPKList.value.filter((item) => {
    const itemSize = item.Size || item.poid_size || "-";
    const duplicateKey = `${item.SPK}_${itemSize}`;
    if (seen.has(duplicateKey)) {
      return false;
    }
    seen.add(duplicateKey);
    return true;
  });
});

const getKomponenName = (comp: SPKSublimItem, idx: number) => {
  if (comp.Bhn_Name && comp.Bhn_Name.trim() !== "") return comp.Bhn_Name;
  if (comp.bhn_name && comp.bhn_name.trim() !== "") return comp.bhn_name;
  if (comp.Nama_Komponen && comp.Nama_Komponen.trim() !== "")
    return comp.Nama_Komponen;
  if (comp.nama_komponen && comp.nama_komponen.trim() !== "")
    return comp.nama_komponen;
  if (comp.sk_nama && comp.sk_nama.trim() !== "") return comp.sk_nama;
  if (comp.Kode_Komponen && comp.Kode_Komponen.trim() !== "")
    return comp.Kode_Komponen;
  if (comp.sk_kode && comp.sk_kode.trim() !== "") return comp.sk_kode;
  return `Komponen Bagian ${idx + 1}`;
};

const getKomponenKode = (comp: SPKSublimItem) => {
  return (
    comp.Kode_Komponen ||
    comp.poid_bhn_kode ||
    comp.sk_kode ||
    comp.Barang_ID ||
    "-"
  );
};

// Ambil daftar size dari "L=15, XL=20, 2XL=10".
const parseUkuranSizes = (text: any) => {
  const out: string[] = [];
  for (const part of String(text || "").split(/[,;\n]+/)) {
    const m = part
      .trim()
      .match(/^([A-Za-z0-9][A-Za-z0-9/.\- ]*?)\s*(?:=|:)\s*(\d+)\s*(?:pcs|pc)?$/i);
    if (m) out.push(m[1].trim().toUpperCase());
  }
  return out;
};

// Parse "L=15, XL=20, 2XL=10" menjadi qty untuk size tertentu.
// Dipakai saat tspk_size kosong tetapi spk_ukuran menyimpan rincian per size.
const parseUkuranQty = (text: any, size: string) => {
  const target = String(size || "").trim().toUpperCase();
  if (!text || !target) return 0;
  for (const part of String(text).split(/[,;\n]+/)) {
    const m = part
      .trim()
      .match(/^([A-Za-z0-9][A-Za-z0-9/.\- ]*?)\s*(?:=|:)\s*(\d+)\s*(?:pcs|pc)?$/i);
    if (m && m[1].trim().toUpperCase() === target) return Number(m[2]) || 0;
  }
  return 0;
};

const createMappedPayload = (
  item: SPKSublimItem,
  isSetMode = false,
  compItem?: SPKSublimItem,
  targetSize = "",
) => {
  const targetComp = compItem || item;
  const spkNo = item.SPK || item.spk_nomor || "";
  const spkNama = item.Nama || item.spk_nama || "";

  const compName = isSetMode ? "ALL SET" : getKomponenName(targetComp, 0);
  const compKode = isSetMode ? "ALL SET" : getKomponenKode(targetComp);
  const currentSize =
    targetSize || targetComp.Size || targetComp.poid_size || "";

  const resolvedPanjang =
    targetComp.Panjang ??
    targetComp.panjang ??
    item.Panjang ??
    item.panjang ??
    0;
  const resolvedLebar =
    targetComp.Lebar ?? targetComp.lebar ?? item.Lebar ?? item.lebar ?? 0;

  // Order per size dari tspk_size; jika tidak ada, pakai total order SPK.
  const sizeQty =
    Number(targetComp.Size_Qty) ||
    Number(
      SPKList.value.find(
        (r) => r.SPK === spkNo && (r.Size || r.poid_size || "") === currentSize,
      )?.Size_Qty,
    ) ||
    Number(item.Size_Qty) ||
    parseUkuranQty(item.Ukuran || targetComp.Ukuran, currentSize) ||
    0;
  const resolvedQty = sizeQty > 0 ? sizeQty : Number(item.Qty_Order || 0);

  return {
    ...item,
    ...targetComp,
    SPK: spkNo,
    Spk: spkNo,
    spk_nomor: spkNo,
    poi_spk_nomor: spkNo,
    poi_nomor: item.PO || item.poi_nomor || spkNo,
    Nama: spkNama,
    spk_nama: spkNama,
    nama_pekerjaan: spkNama,
    Size: currentSize,
    poi_size: currentSize,
    poid_size: currentSize,
    Size_Qty: sizeQty,
    spk_qty: resolvedQty,
    Qty_Order: resolvedQty,

    Panjang: resolvedPanjang,
    panjang: resolvedPanjang,
    spk_panjang: resolvedPanjang,
    Lebar: resolvedLebar,
    lebar: resolvedLebar,
    spk_lebar: resolvedLebar,

    Nama_Komponen: compName,
    nama_komponen: compName,
    Kode_Komponen: compKode,
    poid_bhn_kode: compKode,
    Nama_Bahan: item.Nama_Bahan_Realisasi || item.Nama_Bahan_Rencana || "-",
    Barang_ID: item.Barang_ID || "-",
    Nomor_Realisasi: item.Nomor_Realisasi || "-",
    Bahan_Awal: item.Bahan_Awal || 0,
  };
};

const fetchSPKData = async () => {
  loading.value = true;
  try {
    const response = await api.get<{ success: boolean; data: SPKSublimItem[] }>(
      API_URL,
      {
        params: { keyword: searchKeyword.value },
      },
    );
    SPKList.value = response.data.data || [];
  } catch (error) {
    const err = error as AxiosError;
    console.error("Fetch SPK Sublim Error:", err);
    toast.error(
      "Gagal memuat antrean SPK Sublim. Periksa koneksi server database.",
    );
    SPKList.value = [];
  } finally {
    loading.value = false;
  }
};

const handleRowClick = (
  _event: MouseEvent,
  { item }: { item: SPKSublimItem },
) => {
  openComponentDialog(item);
};

const handleDoubleClick = (
  _event: MouseEvent,
  { item }: { item: SPKSublimItem },
) => {
  openComponentDialog(item);
};

const openComponentDialog = async (item: SPKSublimItem) => {
  if (!item.SPK) {
    toast.error("Error: Struktur data nomor SPK rusak.");
    return;
  }

  if (item.Nomor_Realisasi === "-") {
    toast.warning(
      `Peringatan: SPK ${item.SPK} belum diproses realisasi bahan oleh gudang.`,
    );
  }

  const allRowsForSpk = SPKList.value.filter((data) => data.SPK === item.SPK);

  const sizesSet = new Set<string>();
  allRowsForSpk.forEach((row) => {
    const s = row.Size || row.poid_size;
    if (s) sizesSet.add(s);
  });

  // Fallback MAP: size tidak ikut di baris list (berbasis PO-item),
  // ambil dari tmemospk_size agar dropdown tidak kosong.
  if (sizesSet.size === 0 && item.SPK) {
    try {
      const res = await api.get(
        `/mmt/bast-map/${encodeURIComponent(item.SPK)}/sizes`,
      );
      const rows = res.data?.data || res.data || [];
      for (const r of [].concat(rows as any)) {
        const s = r.mmpts_size || r.size;
        if (s) sizesSet.add(String(s));
      }
    } catch {
      /* lanjut ke fallback spk_ukuran */
    }
  }

  // Fallback terakhir: rincian size dari spk_ukuran ("L=15, XL=20, ...").
  if (sizesSet.size === 0) {
    parseUkuranSizes(item.Ukuran).forEach((s) => sizesSet.add(s));
  }

  activeRowItem.value = item;
  selectedSPKNo.value = item.SPK;
  availableSizes.value = Array.from(sizesSet);

  // Default pilih size pertama jika ada
  selectedSizes.value =
    availableSizes.value.length > 0 ? [availableSizes.value[0]] : [];

  extractMode.value = "SET";
  selectedComponentKeys.value = [];

  onSizeChange(selectedSizes.value);

  componentDialog.value = true;
};

const onModeChange = () => {
  selectedComponentKeys.value = [];
};

const onSizeChange = async (_newSizes: string | string[]) => {
  selectedComponentKeys.value = [];

  if (!activeRowItem.value || selectedSizes.value.length === 0) {
    currentSizeComponents.value = [];
    return;
  }

  const spkNo = activeRowItem.value.SPK;

  // Filter baris berdasarkan semua size yang dicentang
  const matchedRows = SPKList.value.filter(
    (data) =>
      data.SPK === spkNo &&
      selectedSizes.value.includes(data.Size || data.poid_size || ""),
  );

  const uniqueComponents = matchedRows.filter((comp, index, self) => {
    const kKode = getKomponenKode(comp);
    const kName = getKomponenName(comp, index);
    const kSize = comp.Size || comp.poid_size || "";
    return (
      index ===
      self.findIndex(
        (c) =>
          getKomponenKode(c) === kKode &&
          getKomponenName(c, index) === kName &&
          (c.Size || c.poid_size || "") === kSize,
      )
    );
  });

  // Fallback komponen MAP (tmemospk_ketkomponen): baris PO-item tak ada
  // untuk MAP sehingga daftar di atas kosong — buat pseudo-baris per
  // (size terpilih × komponen MAP) agar tetap bisa dipilih.
  if (uniqueComponents.length === 0 && spkNo) {
    try {
      const res = await api.get(
        `/mmt/map/${encodeURIComponent(spkNo)}/komponen`,
      );
      const rows = res.data?.data || res.data || [];
      const pseudo: SPKSublimItem[] = [];
      for (const sizeName of selectedSizes.value) {
        for (const k of Array.isArray(rows) ? rows : []) {
          pseudo.push({
            SPK: spkNo,
            Size: sizeName,
            poid_size: sizeName,
            Kode_Komponen: k.kode || "",
            Nama_Komponen:
              [k.nama, k.ket].filter(Boolean).join(" — ") || k.kode || "",
          } as SPKSublimItem);
        }
      }
      currentSizeComponents.value = pseudo;
      return;
    } catch {
      /* biarkan kosong bila endpoint gagal */
    }
  }

  currentSizeComponents.value = uniqueComponents;
};

const confirmSelection = () => {
  if (!activeRowItem.value || selectedSizes.value.length === 0) {
    toast.warning("Silakan pilih minimal satu Size terlebih dahulu.");
    return;
  }

  if (extractMode.value === "SET") {
    // Jika mode SET dan memilih banyak size, buatkan payload untuk masing-masing size
    const payloadArray = selectedSizes.value.map((sizeName) => {
      const baseItem =
        currentSizeComponents.value.find(
          (c) => (c.Size || c.poid_size) === sizeName,
        ) || activeRowItem.value;
      const rowPerSet = createMappedPayload(
        baseItem!,
        true,
        undefined,
        sizeName,
      );
      rowPerSet.multiplier = 1;
      return rowPerSet;
    });

    emit("select", { mode: "SET", data: payloadArray });
    componentDialog.value = false;
    emit("close");
  } else {
    if (selectedComponentKeys.value.length === 0) {
      toast.warning("Pilih minimal satu komponen terlebih dahulu.");
      return;
    }

    const selectedItemsData = currentSizeComponents.value.filter(
      (comp, idx) => {
        const compSize = comp.Size || comp.poid_size || "";
        const uniqueKey =
          getKomponenKode(comp) +
          "_" +
          getKomponenName(comp, idx) +
          "_" +
          compSize;
        return selectedComponentKeys.value.includes(uniqueKey);
      },
    );

    const payloadArray = selectedItemsData.map((comp) => {
      const compSize = comp.Size || comp.poid_size || "";
      const mappedPayload = createMappedPayload(
        activeRowItem.value!,
        false,
        comp,
        compSize,
      );
      mappedPayload.multiplier = 1;
      return mappedPayload;
    });

    emit("select", { mode: "KOMPONEN", data: payloadArray });
    componentDialog.value = false;
    emit("close");
  }
};

watch(
  () => props.isVisible,
  (newValue) => {
    if (newValue) {
      searchKeyword.value = "";
      fetchSPKData();
    } else {
      SPKList.value = [];
    }
  },
  { immediate: false },
);
</script>

<style scoped>
.dialog-card {
  font-size: 13px;
}
.border-top {
  border-top: 1px solid #e0e0e0;
}
.desktop-table {
  font-size: 12px;
}
.desktop-table :deep(td),
.desktop-table :deep(th) {
  padding: 0 8px !important;
  height: 36px !important;
}
.desktop-table :deep(thead th) {
  background-color: #f8f9fa !important;
  font-weight: bold;
  color: #2c3e50 !important;
}
.color-spk {
  color: #1a237e;
}
.clickable-row :deep(tbody tr):hover {
  cursor: pointer !important;
  background-color: #edf2f7 !important;
}
.clickable-row :deep(tbody tr):active {
  background-color: #e2e8f0 !important;
}
.border-bottom {
  border-bottom: 1px solid #e0e0e0;
}
.flex-grow-1 {
  height: 100%;
}
</style>
