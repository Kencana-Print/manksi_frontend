<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { penawaranFormService } from "@/services/penjualan/penawaranFormService";
import api from "@/services/api";
import {
  IconPlus,
  IconAlertTriangle,
  IconX,
  IconPhotoOff,
  IconExternalLink,
} from "@tabler/icons-vue";

import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import SalesSearchModal from "@/components/lookups/SalesSearchModal.vue";
import MintaHargaSearchModal from "@/components/lookups/MintaHargaSearchModal.vue";
import RekeningSearchModal from "@/components/lookups/RekeningSearchModal.vue"; // Jika ada

const props = defineProps<{
  formData: any;
  isEdit: boolean;
}>();

const toast = useToast();

// ── State untuk Preview Gambar ──
const showPreviewDialog = ref(false);
const previewImageUrl = ref("");
const previewImageUrlFallback = ref("");

const VPS_BASE = "http://103.94.238.252:8888/file-gambar";

const getBaseUrl = () =>
  import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ||
  api.defaults.baseURL?.replace(/\/api\/?$/, "") ||
  `${window.location.protocol}//${window.location.hostname}:3088`;

const previewGambar = (row: any) => {
  const identifier = row.NoPermintaan || row.Gambar;
  if (!identifier) {
    toast.warning("Tidak ada data Nomor Permintaan atau Gambar.");
    return;
  }

  let cleanName = identifier;
  const matchMH = cleanName.match(/(MH\.\d{4}\.\d+)/i);

  if (matchMH) {
    cleanName = matchMH[1];
    // Coba lokal dulu
    previewImageUrl.value = `${getBaseUrl()}/images/mintaharga/${cleanName}.jpg`;
    // Siapkan fallback VPS
    previewImageUrlFallback.value = `${VPS_BASE}/mintaharga/${cleanName}.jpg`;
  } else {
    cleanName = cleanName.replace(/.*imagemintaharga/i, "");
    cleanName = cleanName.replace(/.*Downloads/i, "");
    cleanName = cleanName.replace(/\\/g, "/").split("/").pop() || "";
    cleanName = cleanName.replace(/\.(jpe?g|png)$/i, "");
    // Upload manual — langsung ke VPS
    previewImageUrl.value = `${VPS_BASE}/mintaharga/${cleanName}.jpg`;
    previewImageUrlFallback.value = "";
  }

  showPreviewDialog.value = true;
};

// Handler error gambar di preview — fallback ke VPS
const onPreviewImgError = (e: Event) => {
  const el = e.target as HTMLImageElement;
  if (!el.src.includes("8888")) {
    // Ekstrak nama file dari URL lokal
    const fileName = el.src.split("/").pop() || "";
    el.src = `${VPS_BASE}/mintaharga/${fileName}`;
  }
};

// ── Opsi Dropdown ──
const divisiOptions = ref<any[]>([]);
const tipeOptions = ["Premium", "Medium"];
const statusHargaOptions = [
  { value: 0, label: "Belum PPN" },
  { value: 1, label: "Sudah PPN" },
  { value: 2, label: "Disembunyikan" },
];

const loadDivisi = async () => {
  try {
    const res = await api.get("/lookups/divisi");
    divisiOptions.value = res.data.data
      .filter((d: any) => d.kode !== 0)
      .map((d: any) => ({
        value: String(d.kode),
        label: `${d.kode} - ${d.nama}`,
      }));
  } catch (e) {
    console.error("Gagal memuat divisi");
  }
};

onMounted(() => {
  loadDivisi();
});

// ── Logika Form & Kalkulasi ──
const hitungTotalBaris = (row: any) => {
  const qty = Number(row.Qty) || 0;
  const harga = Number(row.Harga) || 0;
  row.Nominal = qty * harga;
};

const grandTotal = computed(() => {
  if (!props.formData.Details || props.formData.Details.length === 0) return 0;
  if (props.formData.CetakTotal) {
    return props.formData.Details.reduce(
      (sum: number, row: any) => sum + (Number(row.Nominal) || 0),
      0,
    );
  } else {
    let min = Infinity;
    props.formData.Details.forEach((row: any) => {
      const val = Number(row.Nominal) || 0;
      if (val > 0 && val < min) min = val;
    });
    return min === Infinity ? 0 : min;
  }
});

const dpNominal = computed(() => {
  if (!props.formData.DpPer) return 0;
  return (Number(props.formData.DpPer) / 100) * grandTotal.value;
});

watch(
  () => props.formData.Details,
  (details) => {
    if (details) {
      details.forEach(hitungTotalBaris);
    }
  },
  { deep: true, immediate: true },
);

// ── Aksi Tabel Detail ──
const addDetail = () => {
  props.formData.Details.push({
    ID: "",
    NoPermintaan: "",
    NamaBarang: "",
    Bahan: "",
    Ukuran: "",
    Panjang: 0,
    Lebar: 0,
    Satuan: "PCS",
    Qty: 0,
    Harga: 0,
    Nominal: 0,
    Spk: "",
    Gambar: "",
    Status: "",
    Batal: "",
    Confirm: "",
  });
};

const removeDetail = (index: number) => {
  const row = props.formData.Details[index];
  if (row.Spk) {
    toast.error(
      `Tidak dapat menghapus baris karena sudah terikat SPK: ${row.Spk}`,
    );
    return;
  }
  props.formData.Details.splice(index, 1);
  if (props.formData.Details.length === 0) addDetail();
};

// ── Logika Minta Harga (Dengan Dialog Konfirmasi) ──
const isMintaHargaLoading = ref(false);
const confirmDialog = ref(false);
const pendingMintaHargaItem = ref<any>(null);

const proceedLoadMintaHarga = async (item: any) => {
  if (activeRowIndex.value === null) return;
  const row = props.formData.Details[activeRowIndex.value];

  row.NoPermintaan = item.Nomor;
  isMintaHargaLoading.value = true;
  try {
    const res = await penawaranFormService.getMintaHarga(item.Nomor);
    const data = res.data.data;

    row.NamaBarang = data.nama;
    row.Bahan = data.bahan;
    row.Ukuran = data.ukuran;
    row.Panjang = data.panjang;
    row.Lebar = data.lebar;
    row.Qty = data.qty;
    row.Harga = data.harga;
    hitungTotalBaris(row);
    toast.success("Berhasil memuat detail Permintaan Harga.");
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || e.message || "Gagal memuat Permintaan Harga",
    );
    row.NoPermintaan = "";
  } finally {
    isMintaHargaLoading.value = false;
    confirmDialog.value = false;
    pendingMintaHargaItem.value = null;
  }
};

const handleMintaHargaSelected = async (item: any) => {
  if (activeRowIndex.value === null) return;
  if (Number(item.Harga) === 0) {
    pendingMintaHargaItem.value = item;
    confirmDialog.value = true;
    return;
  }
  await proceedLoadMintaHarga(item);
};

const onConfirmYes = () => {
  if (pendingMintaHargaItem.value)
    proceedLoadMintaHarga(pendingMintaHargaItem.value);
};
const onConfirmNo = () => {
  confirmDialog.value = false;
  pendingMintaHargaItem.value = null;
};

// ── Logika Lookups ──
const showPerushModal = ref(false);
const showCustModal = ref(false);
const showSalesModal = ref(false);
const showMintaHargaModal = ref(false);
const showRekeningModal = ref(false);
const activeRowIndex = ref<number | null>(null);

const openMintaHargaModal = (index: number) => {
  if (!props.formData.CustKode) {
    toast.warning("Pilih Customer terlebih dahulu.");
    return;
  }
  activeRowIndex.value = index;
  showMintaHargaModal.value = true;
};

const openRekening = () => {
  if (props.formData.Rekening !== null && props.formData.PerushKode) {
    showRekeningModal.value = true;
  } else {
    toast.warning("Centang Rekening dan pastikan Perusahaan terisi.");
  }
};

const handlePerushSelected = (item: any) => {
  props.formData.PerushKode = item.perush_kode || item.Kode;
  props.formData.NamaPerusahaan = item.perush_nama || item.Nama;

  // Auto-fill TTD dari data perusahaan (sudah di-join saat load)
  if (item.ttd_nama) {
    props.formData.TtdNama = item.ttd_nama;
    props.formData.TtdJabatan = item.ttd_jabatan || "";
  } else {
    // Fallback: fetch terpisah jika belum ada
    loadDigitalSign(props.formData.PerushKode);
  }
};

const loadDigitalSign = async (kode: string) => {
  if (!kode) return;
  try {
    const res = await api.get(`/lookups/digital-sign/${kode}`);
    if (res.data.data) {
      props.formData.TtdNama = res.data.data.nama || "";
      props.formData.TtdJabatan = res.data.data.jabatan || "";
    }
  } catch {
    // Tidak ada data = biarkan kosong
  }
};
const handleCustSelected = (item: any) => {
  props.formData.CustKode = item.Kode || item.cus_kode;
  props.formData.NamaCustomer = item.Nama || item.cus_nama;
  props.formData.Up = item.CP || item.cus_cp || props.formData.Up;
};
const handleSalesSelected = (item: any) => {
  props.formData.SalesKode = item.sal_kode || item.Kode;
  props.formData.NamaSales = item.sal_nama || item.Nama;
};
const handleRekeningSelected = (item: any) => {
  props.formData.Rekening = item.Rekening;
};

// State untuk menghandle upload gambar
const fileInput = ref<HTMLInputElement | null>(null);
const activeUploadIndex = ref<number | null>(null);
const isUploading = ref(false);

const triggerUpload = (index: number) => {
  activeUploadIndex.value = index;
  // Buka dialog pilih file bawaan browser
  if (fileInput.value) fileInput.value.click();
};

const handleFileSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file || activeUploadIndex.value === null) return;

  // Validasi ukuran (Sesuai Delphi: Max 1MB)
  if (file.size > 1000000) {
    toast.error("Ukuran gambar tidak boleh > 1 MB.");
    // Reset input
    target.value = "";
    return;
  }

  isUploading.value = true;
  try {
    const res = await penawaranFormService.uploadGambar(file);
    const filename = res.data.filename;

    // Masukkan nama file/URL ke row yang aktif
    props.formData.Details[activeUploadIndex.value].Gambar = filename;
    toast.success("Gambar berhasil diupload.");
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal mengupload gambar.");
  } finally {
    isUploading.value = false;
    activeUploadIndex.value = null;
    target.value = ""; // Reset input agar bisa pilih file yang sama lagi
  }
};

const removeGambar = (index: number) => {
  props.formData.Details[index].Gambar = "";
};

const rp = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);

const dpChecked = ref(false);

watch(
  () => props.formData.DpPer,
  (val) => {
    dpChecked.value = Number(val) > 0;
  },
  { immediate: true },
);
</script>

<template>
  <div class="tpi-layout-vertical">
    <div class="desktop-form-section header-section mb-3">
      <div class="form-title">Informasi Penawaran</div>

      <div class="form-grid-top">
        <div class="f-col">
          <div class="f-row">
            <label>Divisi</label>
            <select v-model="formData.Divisi" class="f-inp flex-1">
              <option
                v-for="opt in divisiOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div class="f-row">
            <label>Nomor</label>
            <input
              :value="formData.Nomor"
              readonly
              placeholder="Baru = Nomor Otomatis"
              class="f-inp readonly flex-1"
              style="color: #c62828; font-weight: bold"
            />
          </div>
          <div class="f-row">
            <label>Tanggal</label>
            <input
              type="date"
              v-model="formData.Tanggal"
              class="f-inp flex-1"
            />
            <label class="ml-2" style="width: 30px">Tipe</label>
            <select v-model="formData.Tipe" class="f-inp" style="width: 80px">
              <option v-for="opt in tipeOptions" :key="opt" :value="opt">
                {{ opt }}
              </option>
            </select>
          </div>
          <div class="f-row">
            <label>Perusahaan</label>
            <div class="inp-group flex-1">
              <input
                v-model="formData.PerushKode"
                class="f-inp"
                style="width: 50px"
                @dblclick="showPerushModal = true"
              />
              <input
                :value="formData.NamaPerusahaan || 'Kencana Print'"
                readonly
                class="f-inp readonly flex-1"
              />
              <button
                class="btn-lookup"
                type="button"
                @click="showPerushModal = true"
              >
                🔍
              </button>
            </div>
          </div>
          <div class="f-row">
            <label>Customer</label>
            <div class="inp-group flex-1">
              <input
                v-model="formData.CustKode"
                class="f-inp"
                style="width: 70px"
                @dblclick="showCustModal = true"
              />
              <input
                :value="formData.NamaCustomer"
                placeholder="Nama Customer"
                readonly
                class="f-inp readonly flex-1"
              />
              <button
                class="btn-lookup"
                type="button"
                @click="showCustModal = true"
              >
                🔍
              </button>
            </div>
          </div>
          <div class="f-row">
            <label>UP (Attention)</label>
            <input
              placeholder="Nama penerima / divisi"
              v-model="formData.Up"
              class="f-inp flex-1"
            />
          </div>
        </div>

        <div class="f-col">
          <div class="f-row">
            <label>Sales</label>
            <div class="inp-group flex-1">
              <input
                v-model="formData.SalesKode"
                class="f-inp"
                style="width: 70px"
                @dblclick="showSalesModal = true"
              />
              <input
                :value="formData.NamaSales"
                placeholder="Nama Sales"
                readonly
                class="f-inp readonly flex-1"
              />
              <button
                class="btn-lookup"
                type="button"
                @click="showSalesModal = true"
              >
                🔍
              </button>
            </div>
          </div>
          <div class="f-row">
            <label>Marketing</label>
            <div class="inp-group flex-1">
              <input
                v-model="formData.Marketing"
                placeholder="Nama Marketing"
                class="f-inp flex-1"
              />
              <span class="mx-1 text-grey">/</span>
              <input
                v-model="formData.MarketingTelp"
                placeholder="Telp"
                class="f-inp flex-1"
              />
            </div>
          </div>
          <div class="f-row">
            <label>Status Harga</label>
            <select v-model="formData.StatusHarga" class="f-inp flex-1">
              <option
                v-for="opt in statusHargaOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div class="f-row">
            <label>Keterangan</label>
            <input v-model="formData.Keterangan" class="f-inp flex-1" />
          </div>
          <div class="f-row mt-2">
            <label>Follow Up</label>
            <div class="d-flex align-center gap-2">
              <label class="chk"
                ><input
                  type="checkbox"
                  v-model="formData.Fu1"
                  true-value="V"
                  false-value=""
                />
                Fu1</label
              >
              <label class="chk"
                ><input
                  type="checkbox"
                  v-model="formData.Fu2"
                  true-value="V"
                  false-value=""
                />
                Fu2</label
              >
              <label class="chk"
                ><input
                  type="checkbox"
                  v-model="formData.Fu3"
                  true-value="V"
                  false-value=""
                />
                Fu3</label
              >
              <label class="chk"
                ><input
                  type="checkbox"
                  v-model="formData.Proyeksi"
                  true-value="V"
                  false-value=""
                />
                Proyeksi</label
              >
            </div>
          </div>
        </div>

        <div class="f-col">
          <div class="f-row">
            <label>Note</label>
            <input v-model="formData.Note" class="f-inp flex-1" />
          </div>
          <div class="f-row">
            <label class="chk font-weight-bold" style="width: 90px">
              <input
                type="checkbox"
                :checked="formData.Rekening !== ''"
                @change="
                  (e: any) => (formData.Rekening = e.target.checked ? ' ' : '')
                "
              />
              Rekening
            </label>
            <div class="inp-group flex-1">
              <input
                v-model="formData.Rekening"
                class="f-inp flex-1"
                placeholder="Pilih Rekening"
                @dblclick="openRekening"
                :disabled="formData.Rekening === ''"
              />
              <button
                class="btn-lookup"
                type="button"
                @click="openRekening"
                :disabled="formData.Rekening === ''"
              >
                🔍
              </button>
            </div>
          </div>
          <div class="f-row">
            <label class="chk font-weight-bold" style="width: 90px">
              <input
                type="checkbox"
                v-model="dpChecked"
                @change="
                  (e: any) => {
                    if (!e.target.checked) props.formData.DpPer = 0;
                  }
                "
              />
              Uang Muka
            </label>
            <div class="d-flex align-center flex-1 gap-1">
              <input
                type="number"
                v-model="formData.DpPer"
                class="f-inp"
                style="width: 50px; text-align: right"
                :disabled="!dpChecked"
                min="0"
                max="100"
                v-select-on-focus
              />
              <span>% =</span>
              <input
                :value="rp(dpNominal)"
                readonly
                class="f-inp readonly flex-1 tr"
              />
            </div>
          </div>
          <div class="f-row align-start mt-1">
            <label class="pt-1">Penandatangan</label>
            <div class="d-flex flex-column gap-1 flex-1">
              <input
                v-model="formData.TtdNama"
                placeholder="Nama Terang"
                class="f-inp"
              />
              <input
                v-model="formData.TtdJabatan"
                placeholder="Jabatan"
                class="f-inp"
              />
            </div>
          </div>
          <div class="f-row mt-1">
            <label>Digital Sign</label>
            <select
              v-model="formData.DigitalSign"
              class="f-inp"
              style="width: 60px"
            >
              <option value="Y">Y</option>
              <option value="N">N</option>
            </select>
            <label class="ml-3 mr-2">MX</label>
            <select
              v-model="formData.Mx"
              class="f-inp"
              style="width: 60px"
              :disabled="formData.Divisi !== '5'"
            >
              <option value="Y">Y</option>
              <option value="N">N</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="desktop-form-section flex-1 d-flex flex-column min-h-0">
      <div class="d-flex align-center justify-space-between mb-2 flex-shrink-0">
        <div class="form-title mb-0">Rincian Barang</div>
        <div class="d-flex gap-2">
          <v-btn size="x-small" color="primary" @click="addDetail">
            <template #prepend
              ><IconPlus :size="13" :stroke-width="2"
            /></template>
            Tambah Baris
          </v-btn>
        </div>
      </div>

      <div class="table-wrap flex-1">
        <table class="grid-table">
          <thead>
            <tr>
              <th style="width: 30px">No</th>
              <th style="width: 130px">No. Permintaan</th>
              <th style="min-width: 180px">Nama Barang</th>
              <th style="width: 120px">Bahan</th>
              <th style="width: 100px">Ukuran</th>
              <th style="width: 60px" class="tr">P</th>
              <th style="width: 60px" class="tr">L</th>
              <th style="width: 60px">Sat</th>
              <th style="width: 70px" class="tr">Qty</th>
              <th style="width: 90px" class="tr">Harga</th>
              <th style="width: 110px" class="tr">Total</th>
              <th style="width: 100px">SPK/MAP</th>
              <th style="width: 50px" class="tc">Gbr</th>
              <th style="width: 90px">Status</th>
              <th style="min-width: 130px">Ket. Batal</th>
              <th style="min-width: 130px">Ket. Confirm</th>
              <th style="width: 40px" class="tc">ID</th>
              <th style="width: 30px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in formData.Details" :key="idx">
              <td class="tc">{{ Number(idx) + 1 }}</td>
              <td>
                <div class="inp-group w-100" style="border-radius: 2px">
                  <input
                    type="text"
                    v-model="row.NoPermintaan"
                    class="f-inp flex-1 text-blue fw"
                    readonly
                    @dblclick="!row.Spk && openMintaHargaModal(Number(idx))"
                    :disabled="!!row.Spk"
                  />
                  <button
                    type="button"
                    class="btn-lookup"
                    @click="openMintaHargaModal(Number(idx))"
                    :disabled="!!row.Spk"
                    style="width: 20px; font-size: 10px"
                  >
                    🔍
                  </button>
                </div>
              </td>
              <td>
                <input
                  type="text"
                  v-model="row.NamaBarang"
                  class="cell-inp"
                  :disabled="!!row.Spk"
                />
              </td>
              <td>
                <input
                  type="text"
                  v-model="row.Bahan"
                  class="cell-inp"
                  :disabled="!!row.Spk"
                />
              </td>
              <td>
                <input
                  type="text"
                  v-model="row.Ukuran"
                  class="cell-inp"
                  :disabled="!!row.Spk"
                />
              </td>
              <td>
                <input
                  type="number"
                  v-model="row.Panjang"
                  class="cell-inp tr"
                  :disabled="!!row.Spk"
                  v-select-on-focus
                />
              </td>
              <td>
                <input
                  type="number"
                  v-model="row.Lebar"
                  class="cell-inp tr"
                  :disabled="!!row.Spk"
                  v-select-on-focus
                />
              </td>
              <td>
                <input
                  type="text"
                  v-model="row.Satuan"
                  class="cell-inp tc"
                  :disabled="!!row.Spk"
                />
              </td>
              <td>
                <input
                  type="number"
                  v-model="row.Qty"
                  class="cell-inp tr"
                  @input="hitungTotalBaris(row)"
                  :disabled="!!row.Spk"
                  v-select-on-focus
                />
              </td>
              <td>
                <input
                  type="number"
                  v-model="row.Harga"
                  class="cell-inp tr"
                  @input="hitungTotalBaris(row)"
                  v-select-on-focus
                />
              </td>
              <td class="tr fw text-blue-darken-3">{{ rp(row.Nominal) }}</td>
              <td>
                <input
                  type="text"
                  v-model="row.Spk"
                  class="cell-inp readonly text-red"
                  readonly
                  tabindex="-1"
                />
              </td>

              <td class="tc" style="position: relative">
                <button
                  v-if="!row.Gambar && !row.NoPermintaan"
                  type="button"
                  class="btn-lookup w-100 h-100"
                  title="Upload Gambar Manual"
                  @click="triggerUpload(Number(idx))"
                  :disabled="
                    !!row.Spk || (isUploading && activeUploadIndex === idx)
                  "
                >
                  <span v-if="isUploading && activeUploadIndex === idx"
                    >⏳</span
                  >
                  <span v-else>📷</span>
                </button>

                <div
                  v-else
                  class="d-flex align-center justify-center w-100 h-100 bg-green-lighten-5 position-relative"
                  style="border-radius: 2px; border: 1px solid #c8e6c9"
                >
                  <button
                    type="button"
                    class="text-caption text-green-darken-3 font-weight-bold"
                    title="Lihat Preview Desain"
                    style="
                      background: transparent;
                      border: none;
                      cursor: pointer;
                      text-decoration: underline;
                    "
                    @click="previewGambar(row)"
                  >
                    ✓ Gbr
                  </button>

                  <button
                    v-if="!row.Spk && !row.NoPermintaan"
                    type="button"
                    @click="removeGambar(Number(idx))"
                    class="position-absolute"
                    style="
                      top: -2px;
                      right: -2px;
                      font-size: 10px;
                      background: white;
                      border-radius: 50%;
                      color: red;
                      border: 1px solid red;
                      width: 14px;
                      height: 14px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      cursor: pointer;
                    "
                  >
                    ✕
                  </button>
                </div>
              </td>
              <td>
                <select
                  v-model="row.Status"
                  class="cell-inp"
                  :disabled="!!row.Spk"
                >
                  <option value="">OPEN</option>
                  <option value="BATAL">BATAL</option>
                  <option value="CLOSE">CLOSE</option>
                </select>
              </td>
              <td>
                <input
                  type="text"
                  v-model="row.Batal"
                  class="cell-inp"
                  :disabled="!!row.Spk"
                />
              </td>
              <td>
                <input
                  type="text"
                  v-model="row.Confirm"
                  class="cell-inp"
                  :disabled="!!row.Spk"
                />
              </td>
              <td>
                <input
                  type="text"
                  v-model="row.ID"
                  class="cell-inp tc readonly text-grey"
                  readonly
                  tabindex="-1"
                />
              </td>

              <td class="tc">
                <button
                  class="btn-del"
                  @click="removeDetail(Number(idx))"
                  title="Hapus Baris"
                  :disabled="!!row.Spk"
                >
                  ✕
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="grid-footer mt-2 pa-2 bg-grey-lighten-4 border rounded d-flex align-center justify-space-between flex-shrink-0"
      >
        <label class="chk font-weight-bold text-primary">
          <input
            type="checkbox"
            v-model="formData.CetakTotal"
            :true-value="1"
            :false-value="0"
          />
          Cetak Grand Total (Sum Semua Baris)
        </label>

        <div class="d-flex align-center gap-3">
          <span class="font-weight-bold text-subtitle-2">Total Nominal:</span>
          <div class="total-box">Rp {{ rp(grandTotal) }}</div>
        </div>
      </div>
    </div>
  </div>

  <PerusahaanSearchModal
    v-model="showPerushModal"
    @selected="handlePerushSelected"
  />
  <CustomerSearchModal v-model="showCustModal" @selected="handleCustSelected" />
  <SalesSearchModal v-model="showSalesModal" @selected="handleSalesSelected" />
  <MintaHargaSearchModal
    v-model="showMintaHargaModal"
    :cust-kode="formData.CustKode"
    @selected="handleMintaHargaSelected"
  />
  <RekeningSearchModal
    v-model="showRekeningModal"
    :kode-perusahaan="formData.PerushKode"
    @selected="handleRekeningSelected"
  />

  <v-dialog v-model="confirmDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="text-h6 pa-4 d-flex align-center">
        <IconAlertTriangle
          color="orange"
          class="mr-2"
          :size="20"
          :stroke-width="1.7"
        />
        Peringatan
      </v-card-title>
      <v-card-text class="pa-4 pt-0 text-body-2 text-grey-darken-3">
        Belum ada kalkulasi harga untuk No. Permintaan ini. <br />
        Apakah Anda tetap ingin melanjutkannya?
      </v-card-text>
      <v-card-actions class="pa-4 pt-2 border-t">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="onConfirmNo">Batal</v-btn>
        <v-btn color="primary" variant="elevated" @click="onConfirmYes"
          >Ya, Lanjutkan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPreviewDialog" max-width="800px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white d-flex justify-space-between align-center pa-3"
      >
        <span class="text-subtitle-1 font-weight-bold">Preview Desain</span>
        <v-btn
          variant="text"
          size="small"
          color="white"
          @click="showPreviewDialog = false"
        >
          <IconX :size="18" :stroke-width="2" />
        </v-btn>
      </v-card-title>
      <v-card-text class="pa-4 text-center bg-grey-lighten-4">
        <v-img
          :src="previewImageUrl"
          max-height="600"
          contain
          class="bg-white rounded border"
        >
          <template v-slot:placeholder>
            <div
              class="d-flex flex-column align-center justify-center fill-height"
            >
              <v-progress-circular indeterminate color="primary" size="40" />
            </div>
          </template>
          <template v-slot:error>
            <div
              class="d-flex flex-column align-center justify-center fill-height text-grey"
            >
              <!-- Auto-retry ke VPS jika lokal gagal -->
              <img
                :src="previewImageUrlFallback"
                style="max-width: 100%; max-height: 560px; object-fit: contain"
                @error="previewImageUrlFallback = ''"
              />
              <template v-if="!previewImageUrlFallback">
                <IconPhotoOff :size="48" color="#bdbdbd" />
                <div class="text-subtitle-2 mt-2">Gagal memuat gambar</div>
              </template>
            </div>
          </template>
        </v-img>
      </v-card-text>
      <v-card-actions class="bg-white pa-2 border-t">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="text"
          :href="previewImageUrl"
          target="_blank"
        >
          <template #prepend
            ><IconExternalLink :size="15" :stroke-width="1.7"
          /></template>
          Buka di Tab Baru
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <input
    type="file"
    ref="fileInput"
    style="display: none"
    accept="image/jpeg, image/png, image/jpg"
    @change="handleFileSelected"
  />
</template>

<style scoped>
.tpi-layout-vertical {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.form-title {
  font-size: 13px;
  font-weight: 700;
  color: #1565c0;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* CSS Grid untuk membagi 3 kolom di Header */
.form-grid-top {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.f-col {
  display: flex;
  flex-direction: column;
}

/* Form Styles */
.f-row {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  min-height: 26px;
}
.f-row > label:first-child {
  width: 90px;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  flex-shrink: 0;
}
.f-inp {
  height: 24px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
  color: #212121;
}
.f-inp:focus {
  border-color: #1976d2;
}
.f-inp.readonly {
  background: #eeeeee;
  color: #616161;
  cursor: not-allowed;
}
.flex-1 {
  flex: 1;
  min-width: 0;
}
.gap-1 {
  gap: 4px;
}
.gap-2 {
  gap: 8px;
}
.gap-3 {
  gap: 12px;
}
.tr {
  text-align: right;
}
.tc {
  text-align: center;
}
.fw {
  font-weight: 700;
}
.min-h-0 {
  min-height: 0;
} /* Penting agar flex child bisa scroll */

.inp-group {
  display: flex;
  background: white;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
}
.inp-group .f-inp {
  border: none;
  border-radius: 0;
  height: 22px;
}
.inp-group .f-inp:not(:last-child) {
  border-right: 1px solid #e0e0e0;
}
.btn-lookup {
  width: 24px;
  background: #f5f5f5;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.btn-lookup:hover:not(:disabled) {
  background: #e0e0e0;
}

.chk {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  cursor: pointer;
}
.chk input {
  accent-color: #1565c0;
}

/* Grid Styles */
.table-wrap {
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.grid-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.grid-table thead th {
  background: #1565c0;
  color: white;
  font-weight: 600;
  padding: 6px;
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: nowrap;
}
.grid-table td {
  padding: 2px;
  border-bottom: 1px solid #eeeeee;
  border-right: 1px solid #eeeeee;
}
.grid-table tr:hover td {
  background: #f5f5f5;
}

.cell-inp {
  width: 100%;
  height: 24px;
  border: 1px solid transparent;
  padding: 0 4px;
  font-size: 11px;
  background: transparent;
  outline: none;
}
.cell-inp:focus {
  border-color: #1976d2;
  background: white;
}
.cell-inp:disabled {
  background: #f5f5f5;
  color: #757575;
}

.btn-del {
  color: #e53935;
  cursor: pointer;
  background: transparent;
  border: none;
  font-size: 12px;
  width: 100%;
  height: 100%;
}
.btn-del:hover:not(:disabled) {
  color: #b71c1c;
  font-weight: bold;
}
.btn-del:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.total-box {
  background: #ffff00;
  padding: 4px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-weight: 800;
  font-size: 14px;
  color: #212121;
  min-width: 120px;
  text-align: right;
}
</style>
