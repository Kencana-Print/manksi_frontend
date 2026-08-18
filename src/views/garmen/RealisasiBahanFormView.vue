<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
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
  promin_aktif?: string;
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
  promin_aktif: "Y",
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
  goBack,
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
          _extra:
            !d.promind_kodem || d.promind_kodem === d.promind_bhn_kode
              ? false
              : true,
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
      promin_aktif: h.promin_aktif ?? "Y",
    };
  },
  submitApi: async (data: RealisasiFormData): Promise<any> => {
    const nomor = isEditMode.value ? (route.params.nomor as string) : undefined;
    return await realisasiBahanFormService.saveData(data, nomor);
  },
  onSuccess: (res: any) => {
    savedNomor.value = res.data?.data?.nomor || formData.value.nomor;
    const perluApproval = res.data?.data?.perluApproval;
    if (perluApproval) {
      toast.warning(
        "Realisasi tersimpan sebagai PASIF — ada bahan di luar permintaan. Bahan belum bisa keluar sampai di-approve (Otorisasi Realisasi Beda Bahan).",
        { timeout: 8000 },
      );
    }
    showPrintDialog.value = true;
  },
});

const isReadOnlyPasif = computed(
  () => isEditMode.value && formData.value.promin_aktif === "N",
);

// Info live (belum simpan) kalau kondisi saat ini akan bikin realisasi PASIF
const willBePasif = computed(() =>
  formData.value.details.some((d: any) => d._extra),
);

const showMintaModal = ref(false);
const barcodeInputRefs = ref<HTMLInputElement[]>([]);

const setBarcodeInputRef = (el: any, index: number) => {
  if (el) barcodeInputRefs.value[index] = el as HTMLInputElement;
};

const focusBarcodeInput = (index: number) => {
  const el = barcodeInputRefs.value[index];
  if (el) {
    el.focus();
    el.select();
  }
};

// --- FUNGSI BERSAMA: TARIK DATA PERMINTAAN BERDASARKAN NOMOR ---
const loadPermintaanData = async (nomor: string) => {
  const res = await realisasiBahanFormService.getPermintaanInfo(nomor);
  const data = res.data.data;
  const h = data.header;
  formData.value.noMinta = h.nomorMinta;
  formData.value.spk = h.spk;
  formData.value.namaSpk = h.namaSpk;
  formData.value.jumlahSpk = h.jumlahSpk;
  formData.value.mkb = h.mkb_nomor || h.mkb || "";
  formData.value.jumlah = 0;
  formData.value.gudangAsal = h.gudangBahanKode;
  formData.value.gudangAsalNama = h.gudangBahanNama;
  formData.value.gudangProduksi = h.gudangProduksiKode;
  formData.value.gudangProduksiNama = h.gudangProduksiNama;
  formData.value.barcodes = [];
  formData.value.details = data.details.map((d: any) => {
    d.kurang = Number((d.minta - d.sudah).toFixed(2));
    d.roll = 0;
    d.netto = 0;
    d.gross = 0;
    return d;
  });

  addBarcodeRow();
  await nextTick();
  focusBarcodeInput(0);
};

// --- 1. KETIKA NO. PERMINTAAN DIPILIH DARI MODAL ---
const onMintaSelected = async (item: any) => {
  try {
    await loadPermintaanData(item.Nomor);
    toast.success("Data permintaan berhasil dimuat.");
  } catch (error: any) {
    console.error("Error Detail:", error);
    toast.error(
      error.response?.data?.message || "Gagal mengambil data permintaan.",
    );
  }
};

// --- KEYBOARD HANDLERS: NO. PERMINTAAN ---
const onMintaKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    showMintaModal.value = true;
  }
};

const onMintaEnter = async () => {
  const nomor = (formData.value.noMinta || "").trim().toUpperCase();
  if (!nomor || isEditMode.value) return;
  try {
    isLoading.value = true;
    await loadPermintaanData(nomor);
    toast.success("Data permintaan berhasil dimuat.");
  } catch (error: any) {
    toast.error(
      error.response?.data?.message || "No. Permintaan tidak ditemukan.",
    );
    formData.value.noMinta = "";
  } finally {
    isLoading.value = false;
  }
};

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
  formData.value.barcodes.splice(index, 1);
  recalculateNetto(); // [DIUBAH] tanpa parameter
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
    const isMatchMkb =
      formData.value.details.filter((d: any) => !d._extra).length === 0 ||
      formData.value.details.some(
        (d: any) => !d._extra && d.kode === data.kode,
      );
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
    recalculateNetto();

    // Otomatis lanjut ke baris berikutnya biar user bisa scan
    // terus-menerus tanpa klik/pencet apa pun
    const isLastRow = index === formData.value.barcodes.length - 1;
    if (isLastRow) {
      addBarcodeRow();
    }
    await nextTick();
    focusBarcodeInput(index + 1);
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Barcode tidak ditemukan.");
    item.barcode = "";
  }
};

// Inti: hitung akumulasi qty dari Tabel 1 (barcode), lempar ke Tabel 2.
// Baris "requested" (bawaan Minta Bahan) kode-nya TETAP, cuma netto/gross/roll yg berubah.
// Barcode yg kode-nya TIDAK match baris requested manapun -> otomatis jadi baris
// BARU (kodem="") di Tabel 2, mewakili "bahan di luar permintaan" -> ini yg
// bikin backend deteksi mismatch (kode berbeda dari kodem) dan realisasi jadi PASIF.
const recalculateNetto = () => {
  if (!formData.value.barcodes || !formData.value.details) return;

  const summary: Record<
    string,
    {
      qty: number;
      count: number;
      kdsup: string;
      nmsup: string;
      nama: string;
      satuan: string;
    }
  > = {};

  formData.value.barcodes.forEach((b) => {
    if (b && b.kode) {
      if (!summary[b.kode]) {
        summary[b.kode] = {
          qty: 0,
          count: 0,
          kdsup: "",
          nmsup: "",
          nama: b.nama,
          satuan: b.satuan,
        };
      }
      summary[b.kode].qty += Number(b.jumlah) || 0;
      summary[b.kode].count += 1;
      if (b.kdsup) {
        summary[b.kode].kdsup = b.kdsup;
        summary[b.kode].nmsup = b.nmsup;
      }
    }
  });

  // 1. Update baris REQUESTED (kode tidak pernah berubah dari sini)
  formData.value.details.forEach((d: any) => {
    if (!d || d._extra) return;
    const s = summary[d.kode];
    if (s) {
      d.netto = s.qty;
      d.gross = s.qty;
      d.roll = s.count;
      if (s.kdsup) {
        d.kdsup = s.kdsup;
        d.nmsup = s.nmsup;
      }
    } else {
      d.netto = 0;
      d.gross = 0;
      d.roll = 0;
    }
  });

  // 2. Kode yg sudah "diklaim" baris requested -> sisanya kandidat baris EXTRA
  const claimedKode = new Set(
    formData.value.details
      .filter((d: any) => !d._extra)
      .map((d: any) => d.kode),
  );
  const extraKodeList = Object.keys(summary).filter((k) => !claimedKode.has(k));

  // Buang baris extra yg barcodenya sudah dihapus semua
  formData.value.details = formData.value.details.filter(
    (d: any) => !d._extra || extraKodeList.includes(d.kode),
  );

  // Tambah/update baris extra
  extraKodeList.forEach((kode) => {
    const s = summary[kode];
    let row = formData.value.details.find(
      (d: any) => d._extra && d.kode === kode,
    );
    if (!row) {
      row = {
        kode,
        kodem: "", // [PENTING] kosong = di luar permintaan -> backend tandai PASIF
        nama: s.nama,
        satuan: s.satuan,
        stk: 0,
        minta: 0,
        sudah: 0,
        kurang: 0,
        netto: 0,
        gross: 0,
        roll: 0,
        relaxtgl: "",
        relaxpic: "",
        ket: "Bahan di luar Permintaan (substitusi)",
        kdsup: "",
        nmsup: "",
        _extra: true,
      };
      formData.value.details.push(row);
    }
    row.netto = s.qty;
    row.gross = s.qty;
    row.roll = s.count;
    if (s.kdsup) {
      row.kdsup = s.kdsup;
      row.nmsup = s.nmsup;
    }
  });
};

const validateBeforeSave = () => {
  if (isReadOnlyPasif.value) {
    return toast.error(
      "Realisasi ini PASIF dan menunggu approval. Tidak bisa diubah sampai ada keputusan Otorisasi Realisasi Beda Bahan.",
    );
  }

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
  goBack();
};

const skipCetak = () => {
  showPrintDialog.value = false;
  goBack();
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
      <v-alert
        v-if="isReadOnlyPasif"
        type="error"
        density="compact"
        variant="tonal"
        class="mb-3"
      >
        <strong>PASIF — Menunggu Approval.</strong> Ada bahan di luar
        permintaan. Form terkunci sampai ada keputusan di menu Approval
        Realisasi Beda Bahan.
      </v-alert>
      <v-alert
        v-else-if="willBePasif"
        type="warning"
        density="compact"
        variant="tonal"
        class="mb-3"
      >
        Akan tersimpan sebagai <strong>PASIF</strong> — ada bahan di luar
        permintaan. Bahan tidak akan keluar sampai di-approve.
      </v-alert>

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
          :disabled="isReadOnlyPasif"
        />
        <div class="f-row mb-2">
          <label class="f-lbl">No. Permintaan</label>
          <div class="inp-grp" style="flex: 1; min-width: 0">
            <input
              v-model="formData.noMinta"
              class="f-inp"
              style="
                flex: 1;
                min-width: 0;
                background: #ddeeff;
                font-weight: 600;
                text-transform: uppercase;
              "
              placeholder="F1 / nomor + Enter"
              :readonly="isEditMode || isReadOnlyPasif"
              :class="{ 'f-ro': isEditMode || isReadOnlyPasif }"
              @keydown="onMintaKeydown"
              @keydown.enter.prevent="onMintaEnter"
            />
            <button
              type="button"
              class="btn-lkp"
              :disabled="isEditMode || isReadOnlyPasif"
              title="Cari Permintaan (F1)"
              @click="showMintaModal = true"
            >
              <IconSearch :size="13" color="#1565c0" />
            </button>
          </div>
        </div>
        <v-textarea
          v-model="formData.keterangan"
          label="Keterangan"
          density="compact"
          variant="outlined"
          rows="2"
          hide-details
          class="mb-4"
          :disabled="isReadOnlyPasif"
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
              :disabled="isReadOnlyPasif"
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
              :disabled="isReadOnlyPasif"
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
                    :ref="(el) => setBarcodeInputRef(el, index)"
                    class="cell-input fw-bold text-primary"
                    placeholder="Scan di sini..."
                    :readonly="isReadOnlyPasif"
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
                    :readonly="isReadOnlyPasif"
                    @input="recalculateNetto()"
                    v-select-on-focus
                  />
                </td>
                <td class="text-center">
                  <v-btn
                    size="x-small"
                    variant="text"
                    color="error"
                    :disabled="isReadOnlyPasif"
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
          <v-btn
            size="x-small"
            color="primary"
            :disabled="isReadOnlyPasif"
            @click="addBarcodeRow"
          >
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
              <tr
                v-for="(dtl, index) in formData.details"
                :key="index"
                :class="{ 'row-mismatch': dtl._extra }"
              >
                <td class="text-center">{{ index + 1 }}</td>
                <td
                  class="fw-bold"
                  :class="dtl._extra ? 'text-error' : 'text-primary'"
                >
                  {{ dtl.kode }}
                  <span
                    v-if="dtl._extra"
                    title="Di luar permintaan"
                    class="mismatch-badge"
                    >⚠</span
                  >
                </td>
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
                <td class="bg-yellow-lighten-5">
                  <input
                    type="number"
                    step="any"
                    v-model.number="dtl.netto"
                    class="cell-input tr fw-bold text-primary"
                    :readonly="isReadOnlyPasif"
                    v-select-on-focus
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    v-model.number="dtl.gross"
                    class="cell-input tr fw-bold"
                    :readonly="isReadOnlyPasif"
                    v-select-on-focus
                  />
                </td>
                <td class="tr px-2">{{ dtl.roll }}</td>
                <td>
                  <input
                    type="date"
                    v-model="dtl.relaxtgl"
                    class="cell-input"
                    :readonly="isReadOnlyPasif"
                  />
                </td>
                <td>
                  <input
                    v-model="dtl.relaxpic"
                    class="cell-input"
                    placeholder="PIC..."
                    :readonly="isReadOnlyPasif"
                  />
                </td>
                <td>
                  <input
                    v-model="dtl.ket"
                    class="cell-input"
                    placeholder="Opsional..."
                    :readonly="isReadOnlyPasif"
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
        <v-btn variant="text" color="error" @click="skipCetak"> Tidak </v-btn>
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

.f-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 26px;
}
.f-lbl {
  width: 90px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}
.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
  box-sizing: border-box;
  font-family: inherit;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  overflow: hidden;
  height: 28px;
  background: white;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}
.inp-grp .f-inp {
  border: none;
  border-radius: 0;
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 6px;
}
.btn-lkp {
  width: 30px;
  min-width: 30px;
  height: 100%;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1565c0;
}
.btn-lkp:hover:not(:disabled) {
  background: #bbdefb;
}
.btn-lkp:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: #f5f5f5;
}
</style>
