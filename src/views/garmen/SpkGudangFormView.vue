<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { spkGudangFormService } from "@/services/garmen/spkGudangFormService";
import {
  IconClipboardList,
  IconAlertTriangle,
  IconClock,
  IconCheck,
  IconX,
  IconSearch,
} from "@tabler/icons-vue";

import JenisKainKaosanSearchModal from "@/components/lookups/JenisKainKaosanSearchModal.vue";
import WarnaKaosanSearchModal from "@/components/lookups/WarnaKaosanSearchModal.vue";
import BahanJenisSearchModal from "@/components/lookups/BahanJenisSearchModal.vue";

interface SpesifikasiRow {
  barcode: string;
  kode: string;
  nama: string;
  satuan: string;
  stok: number;
  jumlah: number;
}
interface SpkRow {
  bwkode: string;
  bwnama: string;
  kodewarna: string;
  warna: string;
  jumlah: number;
  spk?: string;
  namaspk?: string;
  kodek?: string;
  isNew: boolean;
}
interface SpkGudangFormData {
  Nomor: string;
  Tanggal: string;
  Dateline: string;
  JenisKaos: "KO" | "KK";
  AmbilStokGudang: boolean;
  Lengan: string;
  KdKain: string;
  NamaKain: string;
  KdKainKaosan: string;
  NamaKainKaosan: string;
  Finishing: string;
  Workshop: string;
  Keterangan: string;
  SpesifikasiKain: SpesifikasiRow[];
  SpkItems: SpkRow[];
  ApprovalStatus: string;
  ApprovalUrut: number | null;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);
const activeTab = ref<"kain" | "spk">("kain");
const showPrintDialog = ref(false);
const savedNomor = ref("");

const todayLocal = new Date().toISOString().slice(0, 10);
const defaultDateline = new Date(Date.now() + 7 * 86400000)
  .toISOString()
  .slice(0, 10);

const defaultData: SpkGudangFormData = {
  Nomor: "",
  Tanggal: todayLocal,
  Dateline: defaultDateline,
  JenisKaos: "KO",
  AmbilStokGudang: true,
  Lengan: "PENDEK",
  KdKain: "",
  NamaKain: "",
  KdKainKaosan: "",
  NamaKainKaosan: "",
  Finishing: "POLOS",
  Workshop: "P04",
  Keterangan: "",
  SpesifikasiKain: [],
  SpkItems: [],
  ApprovalStatus: "",
  ApprovalUrut: null,
};

const {
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  fetchData,
  executeSave,
  executeCancel,
  executeClose,
  goBack,
} = useForm<SpkGudangFormData>({
  menuId: "79",
  initialData: defaultData,
  fetchApi: async (): Promise<SpkGudangFormData> => {
    const res = await spkGudangFormService.getById(String(route.params.nomor));
    const d = res.data.data;
    const h = d.header;
    return {
      Nomor: h.spg_nomor,
      Tanggal: String(h.spg_tanggal).slice(0, 10),
      Dateline: String(h.spg_dateline).slice(0, 10),
      JenisKaos: h.spg_jenis,
      AmbilStokGudang: h.spg_stokgudang === "Y",
      Lengan: h.spg_lengan,
      KdKain: h.spg_kain,
      NamaKain: h.namaJenisKain,
      KdKainKaosan: h.spg_kaink,
      NamaKainKaosan: h.namaKainKaosan,
      Finishing: h.spg_finishing,
      Workshop: h.spg_workshop,
      Keterangan: h.spg_ket,
      SpesifikasiKain: d.spesifikasiKain || [],
      SpkItems: d.spkItems || [],
      ApprovalStatus: d.approval?.status || "",
      ApprovalUrut: d.approval?.urut ?? null,
    };
  },
  submitApi: async (data: SpkGudangFormData) => {
    const validSpesifikasi = data.SpesifikasiKain.filter((r) => r.nama);
    return await spkGudangFormService.save({
      isEdit: isEditMode.value,
      nomor: data.Nomor,
      tanggal: data.Tanggal,
      dateline: data.Dateline,
      jenisKaos: data.JenisKaos,
      ambilStokGudang: data.AmbilStokGudang,
      lengan: data.Lengan,
      kdKain: data.KdKain,
      kdKainKaosan: data.KdKainKaosan,
      finishing: data.Finishing,
      workshop: data.Workshop,
      keterangan: data.Keterangan,
      spesifikasiKain: validSpesifikasi,
      spkItems: data.SpkItems,
      approvalStatus: data.ApprovalStatus,
      approvalUrut: data.ApprovalUrut,
    });
  },
  onSuccess: (res: any) => {
    const nomor = res?.data?.data?.nomor || "";
    toast.success(`SPK Gudang ${nomor} berhasil disimpan.`);
    savedNomor.value = nomor;
    showPrintDialog.value = true;
  },
});

// Field header terkunci saat mode edit (sama seperti Delphi: Groupbox1,
// cbblengan, edtkdkain, edtkdkaink di-disable saat FLAGEDIT=true)
const headerLocked = computed(() => isEditMode.value);

// ── Approval status ──
const approvalBadge = computed(() => {
  const map: Record<string, { label: string; color: string; icon: any }> = {
    MINTA: {
      label: "Perlu Ajukan Perubahan",
      color: "grey",
      icon: IconAlertTriangle,
    },
    WAIT: { label: "Menunggu ACC", color: "blue", icon: IconClock },
    ACC: {
      label: "Disetujui — Bisa Disimpan",
      color: "green",
      icon: IconCheck,
    },
    TOLAK: { label: "Ditolak", color: "red", icon: IconX },
  };
  return formData.value.ApprovalStatus
    ? map[formData.value.ApprovalStatus]
    : null;
});
const isLockedByPeriod = computed(() =>
  ["MINTA", "WAIT", "TOLAK"].includes(formData.value.ApprovalStatus),
);

// ── Totals ──
const totalQtyBahan = computed(() =>
  formData.value.SpesifikasiKain.reduce(
    (s, r) => s + (Number(r.jumlah) || 0),
    0,
  ),
);

const showJenisKainModal = ref(false);
const lenganOptions = ref<string[]>([]);

const applyJenisKain = async (kode: string) => {
  if (!kode.trim()) return;
  try {
    const res = await spkGudangFormService.lookupJenisKain(kode.trim());
    const d = res.data.data;
    formData.value.KdKain = kode.trim();
    formData.value.NamaKain = d.namaJenisKain;
    formData.value.KdKainKaosan = d.kdKainKaosan;
    formData.value.NamaKainKaosan = d.namaKainKaosan;
  } catch {
    toast.error("Jenis Kain tsb tidak ada.");
    formData.value.NamaKain = "";
    formData.value.KdKain = "";
  }
};

const onKdKainBlur = () => applyJenisKain(formData.value.KdKain);
const onKdKainKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    showJenisKainModal.value = true;
  }
};
const selectJenisKain = (item: any) => {
  applyJenisKain(item.Kode);
  showJenisKainModal.value = false;
};

// ── Spesifikasi Kain: tambah baris via search barcode/bahan ──
const barcodeQuery = ref("");
const barcodeResults = ref<any[]>([]);
const showBarcodeDropdown = ref(false);

const searchBarcodeInput = async (silent = false) => {
  if (!formData.value.KdKain) {
    if (!silent) toast.warning("Jenis kainnya silahkan di isi dulu.");
    return;
  }
  const res = formData.value.AmbilStokGudang
    ? await spkGudangFormService.searchBarcode(
        formData.value.KdKain,
        barcodeQuery.value,
      )
    : await spkGudangFormService.searchBahan(
        formData.value.KdKain,
        barcodeQuery.value,
      );
  barcodeResults.value = res.data.data;
  showBarcodeDropdown.value = true;
};

let barcodeDebounce: ReturnType<typeof setTimeout> | null = null;
watch(barcodeQuery, (val) => {
  if (barcodeDebounce) clearTimeout(barcodeDebounce);
  if (!val.trim()) {
    showBarcodeDropdown.value = false;
    barcodeResults.value = [];
    return;
  }
  if (!formData.value.KdKain) {
    showBarcodeDropdown.value = false;
    return;
  }
  barcodeDebounce = setTimeout(() => searchBarcodeInput(true), 350);
});

const pickBarcodeResult = (item: any) => {
  const kode = item.Kode || item.kode;
  if (formData.value.SpesifikasiKain.some((r) => r.kode === kode)) {
    toast.warning("Kode tsb sudah di input.");
    return;
  }
  const stok = Number(item.Stok || item.stok || 0);
  formData.value.SpesifikasiKain.push({
    barcode: item.Barcode || "",
    kode,
    nama: item.Nama || item.nama,
    satuan: item.Satuan || item.satuan,
    stok,
    jumlah: formData.value.AmbilStokGudang ? stok : 0,
  });
  showBarcodeDropdown.value = false;
  barcodeQuery.value = "";
  syncWarnaFromSpesifikasi(kode);
};

const removeSpesifikasiRow = (idx: number) => {
  const kode = formData.value.SpesifikasiKain[idx].kode;
  formData.value.SpesifikasiKain.splice(idx, 1);
  // Buang juga baris SPK yang match substring kode(3,3) (pola warna() Delphi)
  const bwkode = kode.substring(2, 5);
  formData.value.SpkItems = formData.value.SpkItems.filter(
    (r) => r.bwkode !== bwkode,
  );
};

// ── Link Spesifikasi Kain -> baris SPK (pola warna()/getqty() Delphi) ──
// abwkode = substring posisi 3-5 dari kode
const recomputeQtyForBwkode = (bwkode: string) => {
  return formData.value.SpesifikasiKain.filter(
    (r) => r.kode.substring(2, 5) === bwkode,
  ).reduce((s, r) => s + (Number(r.jumlah) || 0), 0);
};

const syncWarnaFromSpesifikasi = async (kode: string) => {
  const bwkode = kode.substring(2, 5);
  const qty = recomputeQtyForBwkode(bwkode);
  const existing = formData.value.SpkItems.find((r) => r.bwkode === bwkode);
  if (existing) {
    existing.jumlah = qty;
    return;
  }
  try {
    const res = await spkGudangFormService.lookupWarna(kode);
    const d = res.data.data;
    formData.value.SpkItems.push({
      bwkode,
      bwnama: d?.bw_nama || "",
      kodewarna: d?.bw_kodek || "",
      warna: d?.warna || "",
      jumlah: qty,
      isNew: true,
    });
  } catch {
    toast.error("Gagal memuat data warna.");
  }
};

const onJumlahBahanChange = (row: SpesifikasiRow) => {
  syncWarnaFromSpesifikasi(row.kode);
};

const onJumlahInput = (e: Event, row: SpesifikasiRow) => {
  const raw = (e.target as HTMLInputElement).value;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const normalized =
    parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
  row.jumlah = normalized === "" || normalized === "." ? 0 : Number(normalized);
  onJumlahBahanChange(row);
};

// ── Modal: Kain Kaosan (override manual, selain auto-fill dari onKdKainBlur) ──
const showKainKaosanModal = ref(false);
const selectKainKaosan = (item: any) => {
  formData.value.KdKainKaosan = item.Kode;
  formData.value.NamaKainKaosan = item.Nama;
  showKainKaosanModal.value = false;
};

// ── Modal: Warna Kaosan per-baris SPK (F1 clwarna Delphi — manual pick,
// bukan auto-fill; lookupWarnaByKode cuma tebakan awal dari default
// bw_kodek yang sering kosong) ──
const showWarnaModal = ref(false);
const activeWarnaRowIndex = ref<number | null>(null);

const openWarnaModal = (idx: number) => {
  activeWarnaRowIndex.value = idx;
  showWarnaModal.value = true;
};

const selectWarnaForRow = (item: any) => {
  const idx = activeWarnaRowIndex.value;
  if (idx === null) return;

  // Validasi duplikat — persis Delphi: "Warna tsb sudah ada, di baris N.
  // Dalam 1 Transaksi warna tidak boleh double"
  const dupIdx = formData.value.SpkItems.findIndex(
    (r, i) => i !== idx && r.kodewarna === item.Kode,
  );
  if (dupIdx !== -1) {
    toast.warning(
      `Warna tsb sudah ada, di baris ${dupIdx + 1}.\nDalam 1 Transaksi warna tidak boleh double`,
    );
    showWarnaModal.value = false;
    activeWarnaRowIndex.value = null;
    return;
  }

  formData.value.SpkItems[idx].kodewarna = item.Kode;
  formData.value.SpkItems[idx].warna = item.Nama;
  showWarnaModal.value = false;
  activeWarnaRowIndex.value = null;
};

const skipPrint = () => {
  showPrintDialog.value = false;
  router.push("/garmen/spk-gudang");
};

const doCetak = () => {
  const url = router.resolve({
    name: "GarmenSpkGudangPrint",
    params: { nomor: savedNomor.value },
  }).href;
  window.open(url, "_blank");
  showPrintDialog.value = false;
  router.push("/garmen/spk-gudang");
};

onMounted(async () => {
  try {
    const res = await spkGudangFormService.getLenganList();
    lenganOptions.value = res.data.data;
    // Default itemIndex 11 di Delphi — kalau list sudah ke-load dan masih
    // mode create dengan Lengan default "PENDEK" (belum match), set ke
    // index 11 kalau ada, biar perilakunya sama.
    if (!isEditMode.value && lenganOptions.value[11]) {
      formData.value.Lengan = lenganOptions.value[11];
    }
  } catch {
    console.error("Gagal memuat daftar Lengan.");
  }
  if (isEditMode.value) await fetchData();
});

const focusCursorToEnd = (e: FocusEvent) => {
  const el = e.target as HTMLInputElement;
  const len = el.value.length;
  // setTimeout 0 supaya jalan setelah browser selesai naruh cursor default-nya
  setTimeout(() => el.setSelectionRange(len, len), 0);
};

// ── Validasi sebelum save (replika urutan F10 Delphi) ──
const validateSave = () => {
  if (isLockedByPeriod.value) {
    return toast.warning(
      "Transaksi tsb sudah diclose. Silahkan minta approve untuk bisa menyimpan perubahan data.",
    );
  }
  if (new Date(formData.value.Tanggal) > new Date(formData.value.Dateline)) {
    return toast.warning("Dateline harus >= Tgl SPK");
  }
  const validSpesifikasi = formData.value.SpesifikasiKain.filter((r) => r.nama);
  if (validSpesifikasi.length === 0) {
    activeTab.value = "kain";
    return toast.warning("Detail harus diisi.");
  }
  for (const r of validSpesifikasi) {
    if (!Number(r.jumlah)) {
      activeTab.value = "kain";
      return toast.warning("Qty harus di isi.");
    }
    if (formData.value.AmbilStokGudang && Number(r.jumlah) > Number(r.stok)) {
      activeTab.value = "kain";
      return toast.warning("Qty melebihi Stok.");
    }
  }
  for (const r of formData.value.SpkItems) {
    if (Number(r.jumlah) !== 0 && !r.warna) {
      activeTab.value = "spk";
      return toast.warning("Warna Kaosan harus di isi.");
    }
  }
  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah SPK Gudang' : 'Buat SPK Gudang'"
    menu-id="79"
    :icon="IconClipboardList"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="SPK Gudang"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="skg-left-container desktop-form-section header-section">
        <div v-if="approvalBadge" class="skg-alert-wrap">
          <div class="skg-alert" :class="`badge-${approvalBadge.color}`">
            <component :is="approvalBadge.icon" :size="14" />
            {{ approvalBadge.label }}
          </div>
        </div>
        <div v-if="isLockedByPeriod" class="skg-alert warning">
          <IconAlertTriangle :size="14" />
          Transaksi tsb sudah diclose. Silahkan minta approve untuk bisa
          menyimpan perubahan data.
        </div>

        <div class="fr">
          <label class="lbl">No. Transaksi</label>
          <input
            :value="formData.Nomor || '(Otomatis)'"
            readonly
            class="inp ro"
            style="width: 150px"
          />
        </div>
        <div class="fr">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.Tanggal"
            class="idate"
            style="width: 150px"
          />
        </div>
        <div class="fr">
          <label class="lbl">Dateline</label>
          <input
            type="date"
            v-model="formData.Dateline"
            class="idate"
            style="width: 150px"
          />
        </div>

        <div class="sep mt-1 mb-1" />

        <div class="fr">
          <label class="lbl">Jenis Kaos</label>
          <div class="radio-group">
            <label class="ck mr-2">
              <input
                type="radio"
                value="KO"
                v-model="formData.JenisKaos"
                :disabled="headerLocked"
              />
              KO (Kaos Oblong)
            </label>
            <label class="ck">
              <input
                type="radio"
                value="KK"
                v-model="formData.JenisKaos"
                :disabled="headerLocked"
              />
              KK (Kaos Kerah)
            </label>
          </div>
        </div>
        <div class="fr">
          <label class="lbl">Lengan</label>
          <select
            v-model="formData.Lengan"
            class="inp flex-grow-1"
            :disabled="headerLocked"
          >
            <option v-for="l in lenganOptions" :key="l" :value="l">
              {{ l }}
            </option>
          </select>
        </div>
        <div class="fr">
          <label class="lbl"></label>
          <label class="ck">
            <input
              type="checkbox"
              v-model="formData.AmbilStokGudang"
              :disabled="headerLocked"
            />
            Ambil Stok Gudang
          </label>
        </div>

        <div class="sep mt-1 mb-1" />

        <div class="fr">
          <label class="lbl">Jenis Kain</label>
          <div class="igrp flex-grow-1">
            <input
              v-model="formData.KdKain"
              class="inp"
              style="text-transform: uppercase"
              placeholder="F1 / ketik + Enter"
              :readonly="headerLocked"
              @keydown="onKdKainKeydown"
              @keydown.enter.prevent="onKdKainBlur"
              @blur="onKdKainBlur"
            />
            <button
              type="button"
              class="blkp"
              title="Cari Jenis Kain (F1)"
              :disabled="headerLocked"
              @click="showJenisKainModal = true"
            >
              <IconSearch :size="13" />
            </button>
          </div>
        </div>
        <div class="fr">
          <label class="lbl"></label>
          <span class="f-readonly">{{ formData.NamaKain }}</span>
        </div>
        <div class="fr">
          <label class="lbl">Kain Kaosan</label>
          <div class="igrp flex-grow-1">
            <input
              :value="`${formData.KdKainKaosan}  ${formData.NamaKainKaosan}`"
              readonly
              class="inp ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="blkp"
              title="Cari Kain Kaosan (F1)"
              :disabled="headerLocked"
              @click="showKainKaosanModal = true"
            >
              <IconSearch :size="13" />
            </button>
          </div>
        </div>
        <div class="fr">
          <label class="lbl">Finishing</label>
          <input v-model="formData.Finishing" class="inp flex-grow-1" />
        </div>
        <div class="fr">
          <label class="lbl">Workshop</label>
          <input v-model="formData.Workshop" class="inp flex-grow-1" />
        </div>

        <div class="sep mt-1 mb-1" />

        <div class="fr" style="align-items: flex-start">
          <label class="lbl">Keterangan</label>
          <textarea
            v-model="formData.Keterangan"
            class="ta flex-grow-1"
            rows="4"
          />
        </div>
      </div>
    </template>

    <template #right-column>
      <div class="skg-right desktop-form-section">
        <div class="skg-tabs">
          <button
            type="button"
            class="skg-tab"
            :class="{ active: activeTab === 'kain' }"
            @click="activeTab = 'kain'"
          >
            Spesifikasi Kain
          </button>
          <button
            type="button"
            class="skg-tab"
            :class="{ active: activeTab === 'spk' }"
            @click="activeTab = 'spk'"
          >
            SPK
          </button>
        </div>

        <!-- TAB Spesifikasi Kain -->
        <div v-show="activeTab === 'kain'" class="skg-tab-panel">
          <div class="search-row">
            <input
              v-model="barcodeQuery"
              :placeholder="
                formData.AmbilStokGudang
                  ? 'Scan / cari barcode...'
                  : 'Cari kode bahan...'
              "
              class="inp flex-grow-1"
              @keydown.enter="searchBarcodeInput()"
            />
            <button
              type="button"
              class="btn-cari"
              @click="searchBarcodeInput()"
            >
              Cari
            </button>
          </div>
          <div v-if="showBarcodeDropdown" class="dropdown-results">
            <div
              v-for="(item, i) in barcodeResults"
              :key="i"
              class="dropdown-item"
              @click="pickBarcodeResult(item)"
            >
              <span class="mono">{{ item.Barcode || item.Kode }}</span> —
              {{ item.Nama }}
              <span v-if="formData.AmbilStokGudang" class="text-grey"
                >(Stok: {{ item.Stok }})</span
              >
            </div>
            <div v-if="barcodeResults.length === 0" class="dropdown-empty">
              Tidak ada hasil.
            </div>
          </div>

          <div class="tbl-wrap">
            <table class="gt">
              <thead>
                <tr>
                  <th style="width: 30px" class="tc">No</th>
                  <th>Barcode</th>
                  <th>Kode</th>
                  <th>Nama Bahan</th>
                  <th style="width: 60px">Satuan</th>
                  <th class="tr">Stok</th>
                  <th class="tr">Qty Bahan</th>
                  <th style="width: 30px" class="tc"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in formData.SpesifikasiKain" :key="i">
                  <td class="tc gt-lbl">{{ i + 1 }}</td>
                  <td class="p0">
                    <input :value="r.barcode" readonly class="ci ro" />
                  </td>
                  <td class="p0">
                    <input :value="r.kode" readonly class="ci ro mono" />
                  </td>
                  <td class="p0">
                    <input :value="r.nama" readonly class="ci ro" />
                  </td>
                  <td class="p0">
                    <input :value="r.satuan" readonly class="ci ro" />
                  </td>
                  <td class="p0">
                    <input
                      :value="Number(r.stok).toLocaleString('id-ID')"
                      readonly
                      class="ci ro tr"
                    />
                  </td>
                  <td class="p0">
                    <input
                      type="text"
                      inputmode="decimal"
                      :value="r.jumlah"
                      class="ci tr"
                      @focus="focusCursorToEnd"
                      @input="onJumlahInput($event, r)"
                    />
                  </td>
                  <td class="tc">
                    <button class="btn-del" @click="removeSpesifikasiRow(i)">
                      ✕
                    </button>
                  </td>
                </tr>
                <tr v-if="formData.SpesifikasiKain.length === 0">
                  <td colspan="8" class="empty-row">Belum ada baris.</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="6" class="tr fw">Total</td>
                  <td class="tr fw">
                    {{ totalQtyBahan.toLocaleString("id-ID") }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB SPK -->
        <div v-show="activeTab === 'spk'" class="skg-tab-panel">
          <div class="tbl-wrap">
            <table class="gt">
              <thead>
                <tr>
                  <th style="width: 30px" class="tc">No</th>
                  <th>Warna</th>
                  <th>Warna Kaosan</th>
                  <th class="tr">Qty Bahan</th>
                  <th>SPK</th>
                  <th>Nama SPK</th>
                  <th>Kode Barang Kaosan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in formData.SpkItems" :key="i">
                  <td class="tc gt-lbl">{{ i + 1 }}</td>
                  <td>{{ r.bwnama }}</td>
                  <td class="p0">
                    <div class="ig-cell">
                      <span class="cell-text">{{ r.warna || "—" }}</span>
                      <button
                        type="button"
                        class="ibtn-sm"
                        @click="openWarnaModal(i)"
                      >
                        <IconSearch :size="10" color="#1565c0" />
                      </button>
                    </div>
                  </td>
                  <td class="tr">
                    {{ Number(r.jumlah).toLocaleString("id-ID") }}
                  </td>
                  <td class="mono">{{ r.spk || "(saat simpan)" }}</td>
                  <td>{{ r.namaspk || "(saat simpan)" }}</td>
                  <td class="mono">{{ r.kodek || "(saat simpan)" }}</td>
                </tr>
                <tr v-if="formData.SpkItems.length === 0">
                  <td colspan="7" class="empty-row">
                    Belum ada baris — otomatis muncul saat kamu isi Qty Bahan di
                    tab Spesifikasi Kain.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <JenisKainKaosanSearchModal
    v-model="showKainKaosanModal"
    @selected="selectKainKaosan"
  />
  <WarnaKaosanSearchModal
    v-model="showWarnaModal"
    @selected="selectWarnaForRow"
  />
  <BahanJenisSearchModal
    v-model="showJenisKainModal"
    @selected="selectJenisKain"
  />

  <v-dialog v-model="showPrintDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Cetak SPK Gudang
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Data <b>{{ savedNomor }}</b> berhasil disimpan.<br />
        Ingin mencetak?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="skipPrint">Tidak</v-btn>
        <v-spacer />
        <v-btn variant="flat" size="small" color="primary" @click="doCetak">
          🖨️ Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── header (left-column) ── */
.skg-left-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px !important;
  width: 100%;
  box-sizing: border-box;
}
.fr {
  display: flex;
  align-items: center;
  min-height: 24px;
  gap: 4px;
  width: 100%;
}
.lbl {
  width: 90px;
  flex-shrink: 0;
  font-weight: 600;
  color: #444;
  font-size: 11px;
}
.fw {
  font-weight: 700;
}
.sep {
  height: 1px;
  background: #e0e0e0;
  width: 100%;
}
.mt-1 {
  margin-top: 4px;
}
.mb-1 {
  margin-bottom: 4px;
}
.mr-2 {
  margin-right: 8px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.flex-grow-1 {
  flex: 1;
}
.f-readonly {
  font-size: 12px;
  color: #777;
}

.radio-group {
  display: flex;
  gap: 4px;
  font-size: 11px;
}
.ck {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 11px;
}
.ck input {
  margin: 0;
  accent-color: #1565c0;
}

.inp {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
  border-radius: 2px;
  min-width: 0;
}
.inp:focus {
  border-color: #1565c0;
}
.inp:disabled {
  background: #f0f0f0 !important;
  color: #9e9e9e;
}
.ro {
  background: #dde8f0 !important;
  color: #444 !important;
}
.idate {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  outline: none;
  box-sizing: border-box;
  border-radius: 2px;
}
.ta {
  border: 1px solid #a0a0a0;
  border-radius: 2px;
  padding: 6px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  resize: vertical;
}
.ta:focus {
  border-color: #1565c0;
}

.skg-alert-wrap {
  margin-bottom: 4px;
}
.skg-alert {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 4px;
}
.skg-alert.warning {
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
}
.badge-grey {
  background: #eee;
  color: #555;
}
.badge-blue {
  background: #e3f2fd;
  color: #1565c0;
}
.badge-green {
  background: #e8f5e9;
  color: #2e7d32;
}
.badge-red {
  background: #ffebee;
  color: #c62828;
}

/* ── right-column: tabs + grid ── */
.skg-right {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
}
.skg-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.skg-tab {
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid #e0e0e0;
  background: #f5f5f5;
  color: #616161;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
}
.skg-tab.active {
  background: #1565c0;
  color: white;
  border-color: #1565c0;
}
.skg-tab-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.search-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  flex-shrink: 0;
}
.btn-cari {
  height: 24px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 700;
  border: none;
  border-radius: 2px;
  background: #1565c0;
  color: white;
  cursor: pointer;
}
.dropdown-results {
  border: 1px solid #ccc;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 8px;
  background: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
.dropdown-item {
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
}
.dropdown-item:hover {
  background: #f0f4f8;
}
.dropdown-empty {
  padding: 10px;
  text-align: center;
  color: #999;
  font-size: 12px;
}

.tbl-wrap {
  flex: 1;
  overflow: auto;
  border: 1px solid #bdbdbd;
  background: white;
  border-radius: 4px;
  min-width: 0;
  width: 100%;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.gt thead th {
  background: #eeeeee;
  border: 1px solid #bdbdbd;
  padding: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #424242;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}
.gt thead th.tc {
  text-align: center;
}
.gt thead th.tr {
  text-align: right;
}
.gt tbody td {
  border: 1px solid #e0e0e0;
  height: 26px;
}
.gt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.gt tfoot td {
  background: #f5f5f5;
  padding: 5px 6px;
}
.p0 {
  padding: 0 !important;
}
.gt-lbl {
  background: #f5f5f5 !important;
  color: #555;
  padding: 0 4px;
  font-size: 10px;
}
.ci {
  width: 100%;
  height: 26px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 6px;
  font-family: inherit;
  color: #212121;
  box-sizing: border-box;
}
.ci.ro {
  background: #dde8f0 !important;
}
.ci:focus {
  background: #e3f2fd !important;
  outline: 1px solid #1976d2;
  outline-offset: -1px;
}
.ci.tr {
  text-align: right;
}
.mono {
  font-family: monospace;
  font-size: 11px;
}
.text-grey {
  color: #999;
}
.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 12px;
}
.btn-del:hover {
  background: #ffebee;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 16px;
  font-size: 11px;
}
.igrp {
  display: flex;
  border: 1px solid #a0a0a0;
  height: 24px;
  background: white;
  border-radius: 2px;
  overflow: hidden;
}
.igrp .inp {
  border: none;
  flex: 1;
  min-width: 0;
}
.blkp {
  width: 24px;
  flex-shrink: 0;
  background: #e0e0e0;
  border: none;
  border-left: 1px solid #a0a0a0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.blkp:hover {
  background: #d0d0d0;
}
.blkp:disabled {
  opacity: 0.5;
  cursor: default;
}

.ig-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  height: 26px;
  padding: 0 6px;
}
.ig-cell .cell-text {
  flex: 1;
  min-width: 0;
}

.ibtn-sm {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
</style>
