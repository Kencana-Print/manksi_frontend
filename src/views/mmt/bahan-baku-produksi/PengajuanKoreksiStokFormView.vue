<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import api from "@/services/api";
import { format } from "date-fns";
import QRCode from "qrcode";
import PageLayout from "@/components/PageLayout.vue";
import MasterBahanModal from "@/modal/MasterBahanModal.vue";
import GudangLookupModal from "@/modal/GudangLookupView.vue";

// --- Interfaces ---
interface DetailItem {
  SKU: string; // Menyimpan Barcode atau Kode Barang sesuai kebutuhan cetak
  KodeBarang: string; // Kolom Kode Barang terpisah
  NamaBarang: string;
  Satuan: string;
  Panjang: number;
  Lebar: number;
  Expired: string | null;
  System: number;
  Fisik: number;
  Qty: number;
  Harga: number;
  Nilai: number;
}

interface MasterHeader {
  Nomor: string;
  Tanggal: string;
  GudangKode: string;
  GudangNama: string;
  TypeKor: number;
  Keterangan: string;
}

// --- Constants ---
const LIST_TYPE_KOR = [
  { nama: "Terima", kode: 100 },
  { nama: "Keluar", kode: 200 },
  { nama: "Sisa Produksi", kode: 300 },
];

// --- State ---
const router = useRouter();
const route = useRoute();
const loading = ref(false);
const isEdit = computed(() => !!route.params.id);

const header = reactive<MasterHeader>({
  Nomor: "AUTO",
  Tanggal: format(new Date(), "yyyy-MM-dd"),
  GudangKode: "WH-16",
  GudangNama: "GUDANG UTAMA MMT",
  TypeKor: 100,
  Keterangan: "",
});

const details = ref<DetailItem[]>([]);
const listGudang = ref([]);
const isBahanModalVisible = ref(false);
const currentDetailIndex = ref<number | null>(null);

const isGudangModalVisible = ref(false);
const showBarcodePreview = ref(false);
const itemsToRender = ref<any[]>([]);

const bahanModalMode = computed(() => {
  const kode = header.GudangKode?.toUpperCase();
  const nama = header.GudangNama?.toLowerCase() || "";

  // Jika Sisa Produksi (300) di Gudang GPM
  if (header.TypeKor === 300 && kode === "GPM") {
    return "produksi"; // Pastikan backend lookup menangani mode 'produksi' ini
  }

  if (kode === "WH-20" || nama.includes("tinta") || nama.includes("obat")) {
    return "obat";
  }

  if (kode === "GPM" || nama.includes("produksi")) {
    return "produksi";
  }

  return "mmt";
});

// --- Table Headers ---
const tableHeaders = [
  { title: "No", key: "index", width: "50px" },
  { title: "SKU / Kode Barang", key: "SKU", width: "150px" },
  { title: "Nama Barang", key: "NamaBarang", minWidth: "250px" },
  { title: "Satuan", key: "Satuan", width: "100px" },
  { title: "P (m)", key: "Panjang", width: "80px", align: "end" as const },
  { title: "L (m)", key: "Lebar", width: "80px", align: "end" as const },
  {
    title: "Stok Sistem",
    key: "System",
    align: "end" as const,
    width: "100px",
  },
  { title: "Stok Fisik", key: "Fisik", align: "end" as const, width: "100px" },
  { title: "Qty Koreksi", key: "Qty", align: "end" as const, width: "100px" },
  { title: "Aksi", key: "actions", sortable: false, width: "50px" },
];

// --- Methods ---

const addRow = () => {
  details.value.push({
    SKU: "",
    NamaBarang: "",
    Satuan: "",
    Panjang: 0,
    Lebar: 0,
    Expired: null,
    System: 0,
    Fisik: 0,
    Qty: 0,
    Harga: 0,
    Nilai: 0,
  });
};

const openGudangSearch = () => {
  isGudangModalVisible.value = true;
};

const handleGudangSelect = (gudang: any) => {
  // Cek jika sudah ada detail barang, tanyakan user sebelum hapus
  if (
    details.value.some((d) => d.SKU !== "") &&
    header.GudangKode !== gudang.Kode
  ) {
    if (
      !confirm(
        "Gudang diubah, daftar barang sebelumnya akan dikosongkan. Lanjutkan?",
      )
    ) {
      isGudangModalVisible.value = false;
      return;
    }
    details.value = []; // Kosongkan daftar
    addRow(); // Tambah baris kosong baru
  }

  header.GudangKode = gudang.Kode;
  header.GudangNama = gudang.Nama;
  isGudangModalVisible.value = false;
};

const removeRow = (index: number) => {
  details.value.splice(index, 1);
  if (details.value.length === 0) addRow();
};

const calculateRow = (index: number) => {
  const item = details.value[index];
  const fisik = Number(item.Fisik) || 0;
  const system = Number(item.System) || 0;
  const harga = Number(item.Harga) || 0;
  item.Qty = fisik - system;
  item.Nilai = item.Qty * harga;
};

const fetchLookups = async () => {
  try {
    const resGdg = await api.get("/lookup/gudang");
    listGudang.value = resGdg.data.data;
  } catch (e) {
    console.error("Gagal load lookup gudang", e);
  }
};

const searchBarang = (index: number) => {
  currentDetailIndex.value = index;
  isBahanModalVisible.value = true;
};

const handleBahanSelect = (bahan: any) => {
  if (currentDetailIndex.value !== null) {
    // Tentukan unik identifier (utamakan Barcode jika ada, jika tidak pakai Kode)
    const identifier =
      bahan.Barcode && bahan.Barcode !== "-" ? bahan.Barcode : bahan.Kode;

    const isDuplicate = details.value.some(
      (d, i) => d.SKU === identifier && i !== currentDetailIndex.value,
    );

    if (isDuplicate) {
      alert(`Barang dengan Barcode/Kode ${identifier} sudah ada di daftar.`);
      return;
    }

    const item = details.value[currentDetailIndex.value];
    item.SKU = identifier; // Digunakan untuk cetak QR/Barcode
    item.KodeBarang = bahan.Kode; // Menyimpan kode barang asli
    item.NamaBarang = bahan.Nama || bahan.namaBarang;
    item.Satuan = bahan.Satuan || bahan.satuan;
    item.Panjang = Number(bahan.Panjang) || 0;
    item.Lebar = Number(bahan.Lebar) || 0;
    item.System = Number(bahan.Stok) || 0;
    item.Harga = Number(bahan.HRGBELI || bahan.Harga || 0);
    item.Fisik = 0;

    calculateRow(currentDetailIndex.value);
    if (currentDetailIndex.value === details.value.length - 1) addRow();
  }
  isBahanModalVisible.value = false;
};

const loadAllStockFromGudang = async () => {
  if (!header.GudangKode) return alert("Pilih gudang terlebih dahulu");
  loading.value = true;
  try {
    const res = await api.get("/mmt/koreksi-stok/stok", {
      params: { gudangKode: header.GudangKode, tanggal: header.Tanggal },
    });
    const dataStok = res.data.data || [];
    details.value = dataStok.map((item: any) => ({
      SKU: item.Kode,
      NamaBarang: item.Nama,
      Satuan: item.Satuan,
      Panjang: item.Panjang || 0,
      Lebar: item.Lebar || 0,
      Expired: null,
      System: item.Stok || 0,
      Fisik: 0,
      Qty: 0 - (item.Stok || 0),
      Harga: item.HRGBELI || 0,
      Nilai: (0 - (item.Stok || 0)) * (item.HRGBELI || 0),
    }));
  } catch (e: any) {
    alert("Gagal memuat stok: " + (e.response?.data?.message || e.message));
  } finally {
    loading.value = false;
  }
};

const saveData = async () => {
  const validDetails = details.value.filter(
    (d) => d.SKU && d.SKU.trim() !== "",
  );
  if (!header.GudangKode || !header.TypeKor)
    return alert("Header harus lengkap!");
  if (validDetails.length === 0) return alert("Detail barang kosong!");

  loading.value = true;
  try {
    const payload = {
      header: {
        ...header,
        TypeName: LIST_TYPE_KOR.find((t) => t.kode === header.TypeKor)?.nama,
      },
      details: validDetails,
    };
    await api.post("/mmt/pengajuan-koreksi-stok", payload);
    alert("Pengajuan berhasil dibuat! Menunggu approval Manager. Stok belum berubah sampai di-Approve.");
    router.push({ name: 'PengajuanKoreksiStokBrowse' });
  } catch (e: any) {
    alert("Gagal Simpan: " + (e.response?.data?.message || e.message));
  } finally {
    loading.value = false;
  }
};

// --- Barcode Logic ---
const openBarcodePreview = async () => {
  const validItems = details.value.filter((d) => d.SKU);
  if (validItems.length === 0) return alert("Pilih bahan terlebih dahulu");

  itemsToRender.value = validItems.map((item) => ({
    namaBahan: item.NamaBarang,
    qrValue: item.SKU,
    panjang: item.Panjang,
    lebar: item.Lebar,
  }));

  showBarcodePreview.value = true;
  await nextTick();

  for (let i = 0; i < itemsToRender.value.length; i++) {
    const canvas = document.getElementById("canvas-" + i) as HTMLCanvasElement;
    if (canvas) {
      await QRCode.toCanvas(canvas, itemsToRender.value[i].qrValue, {
        width: 85,
        margin: 0,
      });
    }
  }
};

const printNow = () => {
  window.print();
};

onMounted(() => {
  fetchLookups();
  if (!isEdit.value) addRow();
});
</script>

<template>
  <PageLayout
    :title="isEdit ? 'Edit Pengajuan Koreksi Stok' : 'Pengajuan Koreksi Stok'"
    icon="mdi-file-document-edit-outline"
  >
    <template #header-actions>
      <v-btn
        color="secondary"
        variant="outlined"
        size="small"
        class="mr-2"
        @click="router.back()"
        >Batal</v-btn
      >
      <v-btn
        color="teal"
        size="small"
        variant="elevated"
        class="mr-2"
        @click="openBarcodePreview"
      >
        <v-icon start>mdi-barcode-scan</v-icon>Cetak Barcode
      </v-btn>
      <v-btn color="primary" size="small" @click="saveData" :loading="loading">
        <v-icon start>mdi-content-save</v-icon>Simpan Data
      </v-btn>
    </template>

    <v-row dense>
      <v-col cols="12" md="4">
        <v-card variant="outlined" class="pa-4 bg-grey-lighten-4">
          <v-text-field
            v-model="header.Nomor"
            label="Nomor Bukti"
            readonly
            density="compact"
            variant="outlined"
            class="mb-2"
          />
          <v-text-field
            v-model="header.Tanggal"
            label="Tanggal"
            type="date"
            density="compact"
            variant="outlined"
            class="mb-2"
          />
          <v-text-field
            v-model="header.GudangKode"
            label="Gudang"
            readonly
            density="compact"
            variant="outlined"
            class="mb-2"
            append-inner-icon="mdi-magnify"
            @click="openGudangSearch"
          />

          <v-text-field
            v-model="header.GudangNama"
            label="Nama Gudang"
            readonly
            density="compact"
            variant="filled"
            class="mb-2"
            hide-details
          />
          <v-select
            v-model="header.TypeKor"
            :items="LIST_TYPE_KOR"
            item-title="nama"
            item-value="kode"
            label="Tipe Koreksi"
            density="compact"
            variant="outlined"
            class="mb-2"
          />
          <v-textarea
            v-model="header.Keterangan"
            label="Keterangan"
            rows="2"
            density="compact"
            variant="outlined"
            hide-details
          />
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card variant="outlined" class="d-flex flex-column h-100">
          <v-toolbar density="compact" color="grey-lighten-4" flat>
            <v-btn
              color="indigo"
              variant="flat"
              size="small"
              prepend-icon="mdi-database-import"
              @click="loadAllStockFromGudang"
              :loading="loading"
              class="ml-2"
            >
              Ambil Semua Stok Gudang
            </v-btn>
            <v-spacer />
            <v-btn color="primary" variant="text" size="small" @click="addRow">
              <v-icon start>mdi-plus</v-icon>Tambah Baris
            </v-btn>
          </v-toolbar>

          <v-data-table
            :headers="tableHeaders"
            :items="details"
            density="compact"
            class="flex-grow-1"
            fixed-header
            height="400px"
          >
            <template #item.index="{ index }">{{ index + 1 }}</template>
            <template #item.SKU="{ item, index }">
              <v-text-field
                v-model="item.SKU"
                density="compact"
                variant="plain"
                hide-details
                append-inner-icon="mdi-magnify"
                @click="searchBarang(index)"
                readonly
                class="cursor-pointer"
              />
            </template>
            <template #item.Panjang="{ item }">
              <v-text-field
                v-model.number="item.Panjang"
                type="number"
                density="compact"
                variant="outlined"
                hide-details
                class="text-right custom-input"
              />
            </template>
            <template #item.Lebar="{ item }">
              <v-text-field
                v-model.number="item.Lebar"
                type="number"
                density="compact"
                variant="outlined"
                hide-details
                class="text-right custom-input"
              />
            </template>
            <template #item.Fisik="{ item, index }">
              <v-text-field
                v-model.number="item.Fisik"
                type="number"
                density="compact"
                variant="outlined"
                hide-details
                @input="calculateRow(index)"
                class="text-right custom-input"
              />
            </template>
            <template #item.Qty="{ item }">
              <span
                :class="
                  item.Qty < 0
                    ? 'text-error font-weight-bold'
                    : 'text-success font-weight-bold'
                "
                >{{ item.Qty }}</span
              >
            </template>
            <template #item.actions="{ index }">
              <v-btn
                icon="mdi-delete"
                size="x-small"
                color="error"
                variant="text"
                @click="removeRow(index)"
              />
            </template>
          </v-data-table>
          <v-divider />
          <v-card-actions class="bg-grey-lighten-5">
            <v-spacer />
            <div class="text-subtitle-1 mr-4">
              Total Nilai:
              <span class="font-weight-bold text-primary">{{
                details.reduce((a, b) => a + (b.Nilai || 0), 0).toLocaleString()
              }}</span>
            </div>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </PageLayout>

  <MasterBahanModal
    :is-visible="isBahanModalVisible"
    mode="mmt"
    @close="isBahanModalVisible = false"
    @select="handleBahanSelect"
  />

  <MasterBahanModal
    :is-visible="isBahanModalVisible"
    :mode="bahanModalMode"
    @close="isBahanModalVisible = false"
    @select="handleBahanSelect"
  />

  <v-dialog
    v-model="showBarcodePreview"
    fullscreen
    transition="dialog-bottom-transition"
  >
    <v-card>
      <v-toolbar color="primary">
        <v-btn icon @click="showBarcodePreview = false"
          ><v-icon>mdi-close</v-icon></v-btn
        >
        <v-toolbar-title>Preview Label Barcode</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          variant="flat"
          color="white"
          @click="printNow"
          prepend-icon="mdi-print"
          >Cetak Sekarang</v-btn
        >
      </v-toolbar>
      <v-card-text
        class="bg-grey-darken-3 d-flex flex-column align-center pa-10 overflow-y-auto"
      >
        <div id="print-area">
          <div
            v-for="(item, i) in itemsToRender"
            :key="i"
            class="barcode-label-box"
          >
            <div class="label-top-section">
              <div class="qr-container">
                <canvas :id="'canvas-' + i"></canvas>
              </div>
              <div class="text-container">
                <div class="barcode-text">{{ item.qrValue }}</div>
                <div class="dimensi-text">
                  Ukuran: {{ item.panjang }}m x {{ item.lebar }}m
                </div>
              </div>
            </div>
            <div class="label-divider"></div>
            <div class="label-bottom-section">{{ item.namaBahan }}</div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
  <GudangLookupModal
    :isVisible="isGudangModalVisible"
    @close="isGudangModalVisible = false"
    @select="handleGudangSelect"
  />
</template>

<style scoped>
.custom-input :deep(input) {
  text-align: right;
}
.cursor-pointer :deep(input) {
  cursor: pointer;
}
:deep(.v-data-table-header) {
  background-color: #f5f5f5 !important;
}

/* Styles untuk Barcode Label */
.barcode-label-box {
  background: white;
  width: 320px;
  border: 1px solid #000;
  margin-bottom: 15px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  color: black;
}
.label-top-section {
  display: flex;
  align-items: center;
  gap: 15px;
}
.qr-container {
  width: 85px;
  height: 85px;
}
.text-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.barcode-text {
  font-family: "Courier New", monospace;
  font-weight: bold;
  font-size: 14px;
}
.dimensi-text {
  font-size: 12px;
  margin-top: 4px;
}
.label-divider {
  border-top: 1px dashed #000;
  margin: 8px 0;
}
.label-bottom-section {
  text-align: center;
  font-weight: bold;
  font-size: 13px;
  text-transform: uppercase;
}

@media print {
  body * {
    visibility: hidden !important;
  }
  #print-area,
  #print-area * {
    visibility: visible !important;
  }
  #print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 0;
    margin: 0;
  }
  .barcode-label-box {
    border: 1px solid #000 !important;
    page-break-inside: avoid;
    margin: 10px auto;
  }
}
</style>
