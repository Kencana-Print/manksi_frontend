<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import { realisasiBahanFormService } from "@/services/garmen/realisasiBahanFormService";
import BaseForm from "@/components/BaseForm.vue";
import MintaBahanSearchModal from "@/components/lookups/MintaBahanSearchModal.vue";
import {
  IconClipboardCheck,
  IconSearch,
  IconBarcode,
  IconListDetails,
  IconTrash,
  IconPlus,
} from "@tabler/icons-vue";

interface RealisasiFormData {
  nomor: string;
  tanggal: string;
  noMinta: string;
  keterangan: string;
  spk: string;
  namaSpk: string;
  jumlahSpk: number;
  mkb: string;
  jumlah: number;
  gudangAsal: string;
  gudangAsalNama: string;
  gudangProduksi: string;
  gudangProduksiNama: string;
  isUtama: number;
  barcodes: any[];
  details: any[];
  pin_acc?: string;
  pin_dipakai?: string;
}

const route = useRoute();
const toast = useToast();

const showPrintDialog = ref(false);
const savedNomor = ref("");

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";

  const d = new Date(value);

  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const initialData: RealisasiFormData = {
  nomor: "",
  tanggal: formatDateLocal(new Date()),
  noMinta: "",
  keterangan: "",
  spk: "",
  namaSpk: "",
  jumlahSpk: 0,
  mkb: "", // <-- TAMBAHAN
  jumlah: 0, // <-- TAMBAHAN (Input Kuning)
  gudangAsal: "",
  gudangAsalNama: "",
  gudangProduksi: "",
  gudangProduksiNama: "",
  isUtama: 1,
  barcodes: [] as any[],
  details: [] as any[],
};

const {
  formData,
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  executeSave,
  executeCancel,
  executeClose,
  fetchData,
} = useForm<RealisasiFormData>({
  menuId: "108",
  initialData,
  fetchApi: async (): Promise<RealisasiFormData> => {
    const res = await realisasiBahanFormService.getDetail(
      route.params.nomor as string,
    );
    const h = res.data.data.header;

    // Hitung Roll dari Barcode (Tabel Atas)
    const summaryRoll: Record<string, number> = {};
    const barcodesMap =
      res.data.data.barcodes?.map((b: any) => {
        const qty = Number(b.promind2_jumlah) || 0;
        if (b.promind2_bhn_kode) {
          summaryRoll[b.promind2_bhn_kode] =
            (summaryRoll[b.promind2_bhn_kode] || 0) + 1;
        }
        return {
          barcode: b.promind2_barcode,
          kode: b.promind2_bhn_kode,
          nama: b.Bhn_Name,
          satuan: b.Bhn_satuan,
          stok: Number(b.stok) || 0,
          jumlah: qty,
        };
      }) || [];

    // Mapping Kebutuhan (Tabel Bawah)
    const detailsMap =
      res.data.data.details?.map((d: any) => {
        const minta = Number(d.minta) || 0;
        const sudah = 0; // (bisa disesuaikan jika diload dari backend)
        return {
          kode: d.promind_bhn_kode,
          kodem: d.promind_kodem,
          nama: d.Bhn_Name,
          satuan: d.Bhn_satuan,
          stk: Number(d.Stk) || 0,
          minta: minta,
          sudah: sudah,
          kurang: minta - sudah,
          netto: Number(d.promind_jumlah) || 0,
          gross: Number(d.promind_gross) || 0,
          roll: summaryRoll[d.promind_bhn_kode] || 0, // <-- Set Nilai Roll
          relaxtgl: formatDateLocal(d.promind_relaxtgl),
          relaxpic: d.promind_relaxpic,
          ket: d.promind_keterangan,
        };
      }) || [];

    return {
      nomor: h.promin_nomor,
      tanggal: formatDateLocal(h.promin_tanggal),
      noMinta: h.promin_minta,
      keterangan: h.promin_keterangan,
      spk: h.promin_spk_nomor,
      namaSpk: h.namaspk,
      jumlahSpk: h.jumlahspk,
      mkb: h.promin_mkb, // <-- MAPPING MKB
      jumlah: h.promin_jumlah || 0, // <-- MAPPING JUMLAH
      gudangAsal: h.promin_gdg_asal,
      gudangAsalNama: getNamaGudangAsal(h.promin_gdg_asal),
      gudangProduksi: h.promin_gdgp_kode,
      gudangProduksiNama: getNamaGudangProduksi(h.promin_gdgp_kode),
      isUtama: h.isstatus,
      barcodes: barcodesMap,
      details: detailsMap,
      pin_acc: h.pin_acc,
      pin_dipakai: h.pin_dipakai,
    };
  },
  submitApi: async (data: RealisasiFormData): Promise<any> => {
    const nomor = isEditMode.value ? (route.params.nomor as string) : undefined;
    return await realisasiBahanFormService.saveData(data, nomor);
  },
  onSuccess: (res: any) => {
    savedNomor.value = res.data?.data?.nomor || formData.value.nomor;
    showPrintDialog.value = true;
  },
});

const showMintaModal = ref(false);

// Fungsi Helper untuk Nama Gudang
const getNamaGudangAsal = (cab: string) => {
  if (cab === "P01") return "GUDANG BAHAN BAKU SRANDAKAN";
  if (cab === "P04") return "GUDANG BAHAN BAKU JERON";
  if (cab === "P05") return "GUDANG BAHAN BAKU P5";
  return "GUDANG BAHAN BAKU";
};

const getNamaGudangProduksi = (kode: string) => {
  if (kode === "GP015") return "GD POTONG P1";
  if (kode === "GP001") return "GD POTONG P4";
  return "GUDANG PRODUKSI";
};

// Fungsi Format Angka (agar rapi dan membuang 0.199999)
const num = (val: number | string) => {
  return Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
};

// --- 1. KETIKA NO. PERMINTAAN DIPILIH ---
const onMintaSelected = async (item: any) => {
  try {
    const res = await realisasiBahanFormService.getPermintaanInfo(item.Nomor);
    const data = res.data.data;

    const h = data.header; // <- Ini kuncinya, tampung data header ke variabel h

    formData.value.noMinta = h.nomorMinta;
    formData.value.spk = h.spk;
    formData.value.namaSpk = h.namaSpk;
    formData.value.jumlahSpk = h.jumlahSpk;
    formData.value.mkb = h.mkb_nomor || h.mkb || "";
    formData.value.jumlah = 0;

    // PERBAIKAN: Gunakan variabel "h", BUKAN "header" agar tidak crash!
    formData.value.gudangAsal = h.gudangBahanKode;
    formData.value.gudangAsalNama = h.gudangBahanNama;
    formData.value.gudangProduksi = h.gudangProduksiKode;
    formData.value.gudangProduksiNama = h.gudangProduksiNama;

    formData.value.barcodes = [];

    formData.value.details = data.details.map((d: any) => {
      d.kurang = Number((d.minta - d.sudah).toFixed(2));
      d.roll = 0;
      d.netto = 0; // Pastikan default 0 agar tidak undefined
      d.gross = 0;
      return d;
    });

    toast.success("Data permintaan berhasil dimuat.");
  } catch (error: any) {
    console.error("Error Detail:", error);
    toast.error(
      error.response?.data?.message || "Gagal mengambil data permintaan.",
    );
  }
};

// --- 2. LOGIKA TABEL 1 (BARCODE) & SINKRONISASI KE TABEL 2 ---
const addBarcodeRow = () => {
  if (!formData.value.noMinta)
    return toast.warning("Pilih No. Permintaan terlebih dahulu.");
  formData.value.barcodes.push({
    barcode: "",
    kode: "",
    nama: "",
    satuan: "",
    stok: 0,
    jumlah: 0,
  });
};

const removeBarcodeRow = (index: number) => {
  const deletedKode = formData.value.barcodes[index].kode;
  formData.value.barcodes.splice(index, 1);
  recalculateNetto(deletedKode);
};

const onBarcodeEntered = async (item: any, index: number) => {
  if (!item.barcode) return;
  try {
    const res = await realisasiBahanFormService.getBarcodeInfo(item.barcode);
    const data = res.data.data;

    const isDuplicate = formData.value.barcodes.some(
      (b, i) => b.barcode === data.barcode && i !== index,
    );
    if (isDuplicate) {
      toast.warning("Barcode ini sudah di-scan di baris lain.");
      item.barcode = "";
      return;
    }

    // ← BARU: cek apakah kode bahan hasil scan ada di daftar kebutuhan
    // (Tabel 2, yang bersumber dari MKB/Minta Bahan). Tidak di-block,
    // cuma diberi peringatan — bisa saja ini kasus tambahan/pengganti
    // yang memang sah tapi belum tercatat di MKB.
    const isMatchMkb =
      formData.value.details.length === 0 ||
      formData.value.details.some((d: any) => d.kode === data.kode);

    item.kode = data.kode;
    item.nama = data.nama;
    item.satuan = data.satuan;
    item.stok = data.stok;
    item.jumlah = data.stok;
    item.kdsup = data.kdsup;
    item.nmsup = data.nmsup;
    item.mismatchMkb = !isMatchMkb;

    if (!isMatchMkb) {
      toast.warning(
        `⚠ Bahan "${data.nama}" (${data.kode}) hasil scan TIDAK terdaftar di kebutuhan MKB/Permintaan ini. Pastikan barcode sudah benar.`,
        { timeout: 8000 },
      );
    }

    recalculateNetto(item.kode);
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Barcode tidak ditemukan.");
    item.barcode = "";
  }
};

// Inti Keajaiban: Hitung akumulasi qty dari Tabel 1, lempar ke Tabel 2
const recalculateNetto = (changedKode?: string) => {
  if (!formData.value.barcodes || !formData.value.details) return;

  // Kita tambahkan penampung kdsup dan nmsup
  const summary: Record<
    string,
    { qty: number; count: number; kdsup: string; nmsup: string }
  > = {};

  formData.value.barcodes.forEach((b) => {
    if (b && b.kode) {
      if (!summary[b.kode]) {
        summary[b.kode] = { qty: 0, count: 0, kdsup: "", nmsup: "" };
      }
      summary[b.kode].qty += Number(b.jumlah) || 0;
      summary[b.kode].count += 1;

      // Ambil supplier dari barcode terakhir yang di-scan (sama seperti logic Delphi)
      if (b.kdsup) {
        summary[b.kode].kdsup = b.kdsup;
        summary[b.kode].nmsup = b.nmsup;
      }
    }
  });

  formData.value.details.forEach((d) => {
    if (!d) return;
    if (changedKode && d.kode !== changedKode) return;

    const hasBarcode = formData.value.barcodes.some(
      (b) => b && b.kode === d.kode,
    );

    if (hasBarcode && summary[d.kode]) {
      d.netto = summary[d.kode].qty;
      d.gross = summary[d.kode].qty;
      d.roll = summary[d.kode].count;

      // AUTO FILL SUPPLIER! (Replikasi getsupplier Delphi)
      if (summary[d.kode].kdsup) {
        d.kdsup = summary[d.kode].kdsup;
        d.nmsup = summary[d.kode].nmsup; // Jika ada field nmsup di UI
      }
    } else if (changedKode === d.kode) {
      d.netto = 0;
      d.gross = 0;
      d.roll = 0;
      // Opsional: Hapus kdsup jika barcode dihapus semua
      // d.kdsup = "";
    }
  });
};

const validateBeforeSave = () => {
  // 1. Validasi Permintaan
  if (!formData.value.noMinta) {
    return toast.warning("No. Permintaan wajib diisi.");
  }

  // 2. Validasi SPK
  if (!formData.value.spk) {
    return toast.warning("Nomor SPK harus di isi.");
  }

  // 3. Validasi Gudang Asal
  if (!formData.value.gudangAsal) {
    return toast.warning("Gudang asal tidak boleh kosong.");
  }

  // 4. Validasi Gudang Produksi
  if (!formData.value.gudangProduksi) {
    return toast.warning("Gudang Produksi tidak boleh kosong.");
  }

  // 5. Validasi Gudang Sama (Delphi: if edtGudang.Text = edtGudang2.Text)
  if (formData.value.gudangAsal === formData.value.gudangProduksi) {
    return toast.warning(
      "Gudang Produksi tidak boleh sama dengan gudang asal.",
    );
  }

  // 6. Validasi Tabel Kosong
  if (!formData.value.details || formData.value.details.length === 0) {
    return toast.warning("Detail harus diisi.");
  }

  // 7. Validasi Netto 0 (Delphi: if tq=0 then showMessage('Netto masih kosong semua'))
  const totalNetto = formData.value.details.reduce(
    (sum, d) => sum + (Number(d.netto) || 0),
    0,
  );
  if (totalNetto === 0) {
    return toast.warning(
      "Netto masih kosong semua! Silakan scan barang atau isi manual.",
    );
  }

  const hasMismatch = formData.value.barcodes.some((b: any) => b.mismatchMkb);
  if (hasMismatch) {
    toast.warning(
      "⚠ Ada bahan hasil scan yang tidak sesuai MKB/Permintaan. Cek ulang sebelum simpan.",
      { timeout: 6000 },
    );
  }

  // Jika semua lolos, tampilkan dialog konfirmasi bawaan (Yakin ingin simpan?)
  showSaveDialog.value = true;
};

const doCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/garmen/bahan-baku/realisasi-minta/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
};

// --- TRIGGER FETCH DATA UNTUK MODE EDIT ---
onMounted(async () => {
  if (isEditMode.value) {
    await fetchData(); // Tunggu sampai data selesai ditarik dari DB
    recalculateNetto(); // REPLIKASI DELPHI: Panggil hitung otomatis setelah data barcode dimuat
  }
});
</script>

<template>
  <BaseForm
    :title="(isEditMode ? 'Ubah' : 'Baru') + ' Realisasi Permintaan'"
    menu-id="108"
    :icon="IconClipboardCheck"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:showSaveDialog="showSaveDialog"
    v-model:showCancelDialog="showCancelDialog"
    v-model:showCloseDialog="showCloseDialog"
    @validate-save="validateBeforeSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="text-caption font-weight-bold mb-3 text-primary">
          HEADER REALISASI
        </div>

        <v-text-field
          v-model="formData.nomor"
          label="No. Realisasi"
          density="compact"
          variant="outlined"
          readonly
          placeholder="Otomatis"
          hide-details
          class="mb-2 bg-grey-lighten-4"
        />
        <v-text-field
          v-model="formData.tanggal"
          type="date"
          label="Tgl. Realisasi"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
        />
        <v-text-field
          v-model="formData.noMinta"
          label="No. Permintaan"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
          readonly
          @click:append-inner="showMintaModal = true"
          color="primary"
        >
          <template #append-inner>
            <IconSearch
              :size="16"
              :stroke-width="1.7"
              style="cursor: pointer"
              @click="showMintaModal = true"
            />
          </template>
        </v-text-field>
        <v-textarea
          v-model="formData.keterangan"
          label="Keterangan"
          density="compact"
          variant="outlined"
          rows="2"
          hide-details
          class="mb-4"
        />

        <div
          class="text-caption font-weight-bold mb-2 text-blue-grey-darken-2 border-t pt-3"
        >
          INFO SPK & GUDANG
        </div>
        <v-text-field
          v-model="formData.spk"
          label="SPK"
          density="compact"
          variant="outlined"
          readonly
          hide-details
          class="mb-2 bg-grey-lighten-4"
        />
        <v-textarea
          v-model="formData.namaSpk"
          label="Nama SPK"
          density="compact"
          variant="outlined"
          rows="2"
          readonly
          hide-details
          class="mb-2 bg-grey-lighten-4"
        />
        <v-row dense class="mb-2">
          <v-col cols="5">
            <v-text-field
              v-model="formData.jumlahSpk"
              label="Jml SPK"
              density="compact"
              variant="outlined"
              readonly
              hide-details
              class="bg-grey-lighten-4"
            />
          </v-col>
          <v-col cols="7">
            <v-text-field
              v-model="formData.mkb"
              label="No. MKB"
              density="compact"
              variant="outlined"
              readonly
              hide-details
              class="bg-grey-lighten-4"
            />
          </v-col>
        </v-row>
        <v-text-field
          :model-value="
            formData.gudangAsal
              ? `${formData.gudangAsal} - ${formData.gudangAsalNama}`
              : ''
          "
          label="Gudang Bahan"
          density="compact"
          variant="outlined"
          readonly
          hide-details
          class="mb-2 bg-grey-lighten-4"
        />
        <v-text-field
          :model-value="
            formData.gudangProduksi
              ? `${formData.gudangProduksi} - ${formData.gudangProduksiNama}`
              : ''
          "
          label="Gudang Produksi"
          density="compact"
          variant="outlined"
          readonly
          hide-details
          class="mb-2 bg-grey-lighten-4"
        />

        <div class="mt-3 d-flex align-center" style="gap: 16px">
          <div>
            <div class="text-caption font-weight-bold mb-1">
              Status Realisasi
            </div>
            <v-radio-group
              v-model="formData.isUtama"
              inline
              hide-details
              density="compact"
            >
              <v-radio label="Utama" :value="1" color="primary"></v-radio>
              <v-radio label="Susulan" :value="0" color="primary"></v-radio>
            </v-radio-group>
          </div>

          <!-- Input Jumlah Kuning disebelah Status -->
          <div style="width: 140px">
            <v-text-field
              v-model="formData.jumlah"
              label="Jumlah"
              type="number"
              step="any"
              density="compact"
              variant="outlined"
              hide-details
              bg-color="yellow-lighten-4"
              class="font-weight-bold"
              v-select-on-focus
            />
          </div>
        </div>
      </div>
    </template>

    <template #right-column>
      <v-card
        border
        flat
        style="
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        "
      >
        <!-- TABEL 1: SCAN BARCODE -->
        <div
          class="bg-blue-grey-darken-3 text-white px-3 py-1 font-weight-bold text-caption d-flex align-center"
        >
          <IconBarcode :size="14" :stroke-width="1.7" class="mr-2" />
          <span>Tabel Scan Fisik (Barcode)</span>
        </div>
        <div class="table-container" style="flex: 2; overflow: auto">
          <table class="manksi-table">
            <thead>
              <tr>
                <th width="40">No</th>
                <th width="140">Barcode</th>
                <th width="110">Kode</th>
                <th>Nama Bahan</th>
                <th width="60">Satuan</th>
                <th width="80">Stok</th>
                <th width="90" class="bg-yellow-darken-2">Jumlah</th>
                <th width="40"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in formData.barcodes"
                :key="index"
                :class="{ 'row-mismatch': item.mismatchMkb }"
              >
                <td class="text-center">{{ index + 1 }}</td>
                <td>
                  <input
                    v-model="item.barcode"
                    class="cell-input fw-bold text-primary"
                    placeholder="Scan di sini..."
                    @change="onBarcodeEntered(item, index)"
                  />
                </td>
                <td class="bg-grey-lighten-4">
                  {{ item.kode }}
                  <span
                    v-if="item.mismatchMkb"
                    title="Tidak sesuai MKB/Permintaan"
                    class="mismatch-badge"
                    >⚠</span
                  >
                </td>
                <td class="bg-grey-lighten-4">{{ item.nama }}</td>
                <td class="text-center bg-grey-lighten-4">{{ item.satuan }}</td>
                <td class="tr bg-grey-lighten-4">{{ item.stok }}</td>
                <td class="bg-yellow-lighten-5">
                  <input
                    type="number"
                    step="any"
                    v-model.number="item.jumlah"
                    class="cell-input tr fw-bold text-primary"
                    @input="recalculateNetto(item.kode)"
                    v-select-on-focus
                  />
                </td>
                <td class="text-center">
                  <v-btn
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="removeBarcodeRow(index)"
                  >
                    <IconTrash :size="14" :stroke-width="1.7" />
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pa-2 bg-grey-lighten-4 text-right">
          <v-btn size="x-small" color="primary" @click="addBarcodeRow">
            <template #prepend
              ><IconPlus :size="13" :stroke-width="2"
            /></template>
            Tambah Barcode
          </v-btn>
        </div>

        <v-divider :thickness="3" color="primary"></v-divider>

        <!-- TABEL 2: KEBUTUHAN PERMINTAAN -->
        <div
          class="bg-teal-darken-3 text-white px-3 py-1 font-weight-bold text-caption d-flex align-center"
        >
          <IconListDetails :size="14" :stroke-width="1.7" class="mr-2" />
          <span>Tabel Pemenuhan Kebutuhan (Otomatis)</span>
        </div>
        <div
          class="table-container"
          style="flex: 1; max-height: 35%; overflow: auto"
        >
          <table class="manksi-table">
            <thead>
              <tr>
                <th width="40">No</th>
                <th width="110">Kode</th>
                <th>Nama Bahan</th>
                <th width="50">Sat</th>
                <th width="65">Stok</th>
                <th width="60" class="bg-green-darken-2">Minta</th>
                <th width="60">Sudah</th>
                <th width="60">Kurang</th>
                <th width="75" class="bg-yellow-darken-2">Netto</th>
                <th width="75">Gross</th>
                <th width="50">Roll</th>
                <th width="110">Tgl Relax</th>
                <th width="90">PIC Relax</th>
                <th width="130">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(dtl, index) in formData.details" :key="index">
                <td class="text-center">{{ index + 1 }}</td>
                <td class="fw-bold text-primary">{{ dtl.kode }}</td>
                <td>{{ dtl.nama }}</td>
                <td class="text-center">{{ dtl.satuan }}</td>
                <td class="tr">{{ num(dtl.stk) }}</td>
                <td
                  class="tr font-weight-bold text-green-darken-3 bg-green-lighten-5"
                >
                  {{ num(dtl.minta) }}
                </td>
                <td class="tr">{{ num(dtl.sudah) }}</td>
                <td class="tr text-red-darken-2">{{ num(dtl.kurang) }}</td>
                <td class="bg-yellow-lighten-5 px-2 tr fw-bold text-primary">
                  {{ num(dtl.netto) }}
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    v-model.number="dtl.gross"
                    class="cell-input tr fw-bold"
                    v-select-on-focus
                  />
                </td>
                <td class="tr px-2">{{ dtl.roll }}</td>
                <td>
                  <input
                    type="date"
                    v-model="dtl.relaxtgl"
                    class="cell-input"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    v-model="dtl.relaxpic"
                    class="cell-input"
                    placeholder="PIC..."
                  />
                </td>
                <td>
                  <input
                    v-model="dtl.ket"
                    class="cell-input"
                    placeholder="Opsional..."
                  />
                </td>
              </tr>
              <tr v-if="formData.details.length === 0">
                <td colspan="10" class="text-center text-grey py-8 font-italic">
                  Pilih No. Permintaan untuk memuat daftar bahan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card>
    </template>
  </BaseForm>

  <MintaBahanSearchModal v-model="showMintaModal" @selected="onMintaSelected" />

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3">
        Simpan Berhasil
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        Realisasi <b>{{ savedNomor }}</b> tersimpan.<br />Cetak dokumen ini
        sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="showPrintDialog = false">
          Tidak
        </v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doCetak">
          Ya, Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.manksi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.manksi-table th {
  color: white;
  padding: 6px;
  position: sticky;
  top: 0;
  z-index: 1;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
/* Default th color for unstyled headers */
.manksi-table th:not(.bg-yellow-darken-2):not(.bg-green-darken-2) {
  background: #455a64;
}
.manksi-table td {
  border: 1px solid #e0e0e0;
  padding: 0;
  height: 28px;
}
.cell-input {
  width: 100%;
  height: 100%;
  border: none;
  padding: 0 6px;
  outline: none;
  background: transparent;
}
.cell-input:focus {
  background: #e3f2fd;
}
.table-container {
  overflow: auto;
}
.tr {
  text-align: right;
}
.fw-bold {
  font-weight: bold;
}
.row-mismatch td {
  background: #ffebee !important;
}
.mismatch-badge {
  color: #c62828;
  font-weight: 700;
  margin-left: 4px;
  cursor: help;
}
</style>
