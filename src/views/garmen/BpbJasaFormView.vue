<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { bpbJasaService as svc } from "@/services/garmen/bpbJasaService";
import {
  IconSearch,
  IconFileInvoice,
  IconAlertTriangle,
  IconRefresh,
} from "@tabler/icons-vue";

import PoJasaSearchModal from "@/components/lookups/PoJasaSearchModal.vue";
import RealisasiMintaBySpkSearchModal from "@/components/lookups/RealisasiMintaBySpkSearchModal.vue";

// ── Types ──────────────────────────────────────────────────────────────
interface DetailRow {
  _key: number;
  kode: string;
  nama: string;
  satuan: string;
  pojd_jumlah: number; // jumlah dari PO
  jumlah: number; // jumlah terima (input user)
  sudah: number; // sudah diterima sebelumnya
  kurang: number; // sisa
  status: string; // Delay / True / Cancel
  bs_mitra: number;
  bs: number;
  bs_kain: number;
  size: string;
}

interface FormData {
  Nomor: string;
  Tanggal: string;
  PoNomor: string;
  PoTanggal: string;
  PoKeterangan: string;
  Cab: string;
  SupKode: string;
  SupNama: string;
  SupAlamat: string;
  SupKota: string;
  Jatuhtempo: string;
  SpkNomor: string;
  SpkNama: string;
  SpkJenisBarang: string;
  SpkUkuran: string;
  SpkJumlah: number;
  TglSpk: string;
  JasaKode: string;
  JasaNama: string;
  JumlahJasa: number;
  Tarif: number;
  GdgpKode: string; // gudang tujuan produksi
  GdgpNama: string;
  GdgpAsalKode: string; // dari PO (readonly)
  GdgpAsalNama: string;
  JumlahTerima: number;
  SudahTerima: number;
  StatusPO: number;
  // Panel kain/realisasi minta (J07)
  NoMaterial: string;
  TglMinta: string;
  KodeKain: string;
  NamaKain: string;
  SatKain: string;
  JmlKain: number;
  LHK: number;
  Kurang: number;
  SupplierKain: string;
  Berat: number;
  SatBerat: string;
  Komponen: string;
  KelompokTujuan: string;
  BabaranStd: number;
  Babaran: number;
  SelisihBabaran: number;
  Alasan: string;
  // Flags
  IsCetak: boolean;
  IsBordir: boolean;
  // PIN5
  pin5Status: string;
  pin5Urut: number;
  isClose: boolean;
  // Detail
  Detail: DetailRow[];
}

// ── Store & Router ─────────────────────────────────────────────────────
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const userCab = computed(() => authStore.user?.cabang || "");
const isEditModeManual = computed(() => !!route.query.nomor);

// ── Helpers ────────────────────────────────────────────────────────────
const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
let _key = 1;
const mkD = (): DetailRow => ({
  _key: _key++,
  kode: "",
  nama: "",
  satuan: "",
  pojd_jumlah: 0,
  jumlah: 0,
  sudah: 0,
  kurang: 0,
  status: "Delay",
  bs_mitra: 0,
  bs: 0,
  bs_kain: 0,
  size: "",
});
const num = (v: any, d = 0) =>
  Number(v || 0).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
const sel = (e: FocusEvent) => (e.target as HTMLInputElement).select();

// ── Init ───────────────────────────────────────────────────────────────
const init: FormData = {
  Nomor: "",
  Tanggal: todayLocal(),
  PoNomor: "",
  PoTanggal: "",
  PoKeterangan: "",
  Cab: "",
  SupKode: "",
  SupNama: "",
  SupAlamat: "",
  SupKota: "",
  Jatuhtempo: todayLocal(),
  SpkNomor: "",
  SpkNama: "",
  SpkJenisBarang: "",
  SpkUkuran: "",
  SpkJumlah: 0,
  TglSpk: "",
  JasaKode: "",
  JasaNama: "",
  JumlahJasa: 0,
  Tarif: 0,
  GdgpKode: "",
  GdgpNama: "",
  GdgpAsalKode: "",
  GdgpAsalNama: "",
  JumlahTerima: 0,
  SudahTerima: 0,
  StatusPO: 0,
  NoMaterial: "",
  TglMinta: "",
  KodeKain: "",
  NamaKain: "",
  SatKain: "",
  JmlKain: 0,
  LHK: 0,
  Kurang: 0,
  SupplierKain: "",
  Berat: 0,
  SatBerat: "",
  Komponen: "",
  KelompokTujuan: "",
  BabaranStd: 0,
  Babaran: 0,
  SelisihBabaran: 0,
  Alasan: "",
  IsCetak: false,
  IsBordir: false,
  pin5Status: "",
  pin5Urut: 0,
  isClose: false,
  Detail: [],
};

// ── State ──────────────────────────────────────────────────────────────
const komponenList = ref<{ komponen: string; babaran_std: number }[]>([]);
const kelompokList = ref<string[]>([]);
const showPrintDialog = ref(false);
const savedNomor = ref("");

// ── useForm ────────────────────────────────────────────────────────────
const {
  isEditMode,
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
  params,
} = useForm<FormData>({
  menuId: "104",
  initialData: init,
  immediate: false,
  fetchApi: async (): Promise<FormData> => {
    const nomorEdit = (route.query.nomor as string) || (params as any).nomor;
    const res = await svc.getFormById(nomorEdit);
    const d = res.data.data;
    const h = d.header;

    const detail: DetailRow[] = (d.detail || []).map((r: any) => ({
      _key: _key++,
      kode: r.kode || "",
      nama: r.nama || "",
      satuan: r.satuan || "",
      pojd_jumlah: Number(r.pojd_jumlah) || 0,
      jumlah: Number(r.jumlah) || 0,
      sudah: Number(r.sudah) || 0,
      kurang: Number(r.kurang) || 0,
      status:
        r.bpjd_status === 1 ? "True" : r.bpjd_status === 2 ? "Cancel" : "Delay",
      bs_mitra: Number(r.bpjd_bs_mitra) || 0,
      bs: Number(r.bpjd_bs) || 0,
      bs_kain: Number(r.bpjd_bs_kain) || 0,
      size: r.bpjd_size || "",
    }));

    // Load komponen list dari SPK
    if (h.pojh_spk_nomor) await loadKomponenList(h.pojh_spk_nomor);

    return {
      Nomor: h.bpj_nomor || "",
      Tanggal: h.bpj_tanggal || todayLocal(),
      PoNomor: h.bpj_po_nomor || "",
      PoTanggal: h.pojh_tanggal || "",
      PoKeterangan: h.pojh_keterangan || "",
      Cab: h.bpj_cab || "",
      SupKode: h.bpj_sup_kode || "",
      SupNama: h.sup_nama || "",
      SupAlamat: h.sup_alamat || "",
      SupKota: h.sup_kota || "",
      Jatuhtempo: h.bpj_jatuhtempo || todayLocal(),
      SpkNomor: h.pojh_spk_nomor || "",
      SpkNama: h.spk_nama || "",
      SpkJenisBarang: h.jo_nama || "",
      SpkUkuran: h.spk_ukuran || "",
      SpkJumlah: Number(h.spk_jumlah) || 0,
      TglSpk: h.tgl_spk || "",
      JasaKode: h.pojh_jasa_kode || "",
      JasaNama: h.jasa_nama || "",
      JumlahJasa: Number(h.pojh_jumlah) || 0,
      Tarif: Number(h.pojh_tarif) || 0,
      GdgpKode: h.bpj_gdgp_kode || "",
      GdgpNama: h.gdgp_tujuan_nama || "",
      GdgpAsalKode: h.gdgp_asal_kode || "",
      GdgpAsalNama: h.gdgp_asal_nama || "",
      JumlahTerima: Number(h.bpj_jumlah) || 0,
      SudahTerima: Number(h.sudah_terima) || 0,
      StatusPO: Number(h.pojh_status) || 0,
      NoMaterial: h.bpj_nomaterial || "",
      TglMinta: h.promin_tanggal || "",
      KodeKain: h.bpj_bhn_kode || "",
      NamaKain: h.namakain || "",
      SatKain: h.satkain || "",
      JmlKain: Number(h.jmlkain) || 0,
      LHK: 0,
      Kurang: 0,
      SupplierKain: h.supkain || "",
      Berat: Number(h.bpj_qty_berat) || 0,
      SatBerat: h.bpj_sat_berat || "",
      Komponen: h.bpj_komponen || "",
      KelompokTujuan: h.bpj_kelompok_tujuan || "",
      BabaranStd: d.babaranStd || 0,
      Babaran: 0,
      SelisihBabaran: 0,
      Alasan: h.bpj_alasan || "",
      IsCetak: h.xsablon === "Y" || h.xsublim === "Y",
      IsBordir: h.xbordir === "Y",
      pin5Status: d.pin5Status || "",
      pin5Urut: d.pin5Urut || 0,
      isClose: d.isClose || false,
      Detail: detail,
    };
  },
  submitApi: async (data): Promise<any> => {
    const nomorEdit = (route.query.nomor as string) || data.Nomor;
    const payload = {
      ...data,
      Nomor: nomorEdit,
      BhnKode: data.KodeKain,
      QtyBerat: data.Berat,
      Supplier: data.SupplierKain,
      StatusPo: data.StatusPO,
      Detail: data.Detail.filter((r) => r.kode && Number(r.jumlah) > 0).map(
        ({ _key: _k, ...r }) => r,
      ),
    };
    return nomorEdit && isEditMode.value
      ? svc.updateForm(nomorEdit, payload)
      : svc.saveForm(payload);
  },
  onSuccess: (res: any) => {
    const nomor = res?.data?.data?.nomor || "";
    toast.success(`Data ${nomor} berhasil disimpan.`);
    savedNomor.value = nomor;
    showPrintDialog.value = true;
  },
});

const fd = formData;
const canEdit = computed(
  () => !["MINTA", "WAIT", "TOLAK"].includes(fd.value.pin5Status),
);
const isJ07 = computed(() => fd.value.JasaKode === "J07");

// ── Load PO ───────────────────────────────────────────────────────────
const isLoadingPO = ref(false);
const poDirty = ref(false);

const applyPO = async (poNomor: string) => {
  if (!poNomor.trim()) return;
  isLoadingPO.value = true;
  try {
    const res = await svc.getDataPO(poNomor.trim());
    const d = res.data.data;
    const h = d.header;

    // Hitung jatuh tempo dari TOP supplier
    const tglBase = new Date(fd.value.Tanggal);
    const top = Number(h.sup_top) || 0;
    tglBase.setDate(tglBase.getDate() + top);
    const jtTempo = `${tglBase.getFullYear()}-${String(tglBase.getMonth() + 1).padStart(2, "0")}-${String(tglBase.getDate()).padStart(2, "0")}`;

    fd.value.PoNomor = h.pojh_nomor;
    fd.value.PoTanggal = h.pojh_tanggal;
    fd.value.PoKeterangan = h.pojh_keterangan;
    fd.value.Cab = h.pojh_cab;
    fd.value.SupKode = h.pojh_sup_kode;
    fd.value.SupNama = h.sup_nama;
    fd.value.SupAlamat = h.sup_alamat;
    fd.value.SupKota = h.sup_kota;
    fd.value.Jatuhtempo = jtTempo;
    fd.value.SpkNomor = h.pojh_spk_nomor;
    fd.value.SpkNama = h.spk_nama;
    fd.value.SpkJenisBarang = h.jo_nama || "";
    fd.value.SpkUkuran = h.spk_ukuran || "";
    fd.value.SpkJumlah = Number(h.spk_jumlah) || 0;
    fd.value.TglSpk = h.tgl_spk;
    fd.value.JasaKode = h.pojh_jasa_kode;
    fd.value.JasaNama = h.jasa_nama;
    fd.value.JumlahJasa = Number(h.pojh_jumlah) || 0;
    fd.value.Tarif = Number(h.pojh_tarif) || 0;
    fd.value.GdgpAsalKode = h.pojh_gdgp_kode;
    fd.value.GdgpAsalNama = h.gdgp_nama;
    fd.value.SudahTerima = Number(h.sudah_terima) || 0;
    fd.value.IsCetak = h.xsablon === "Y" || h.xsublim === "Y";
    fd.value.IsBordir = h.xbordir === "Y";

    // Detail bahan dari PO
    fd.value.Detail = (d.detail || []).map((r: any) => ({
      _key: _key++,
      kode: r.kode || "",
      nama: r.nama || "",
      satuan: r.satuan || "",
      pojd_jumlah: Number(r.jumlah) || 0,
      jumlah: 0,
      sudah: Number(r.sudah) || 0,
      kurang: Number(r.kurang) || 0,
      status: "Delay",
      bs_mitra: 0,
      bs: 0,
      bs_kain: 0,
      size: "",
    }));

    // Load komponen list
    await loadKomponenList(h.pojh_spk_nomor);

    // Reset panel kain
    resetPanelKain();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Nomor PO tidak ditemukan.");
    fd.value.PoNomor = "";
  } finally {
    isLoadingPO.value = false;
  }
};

const onPoEnter = async () => {
  if (!poDirty.value || !fd.value.PoNomor) return;
  poDirty.value = false;
  await applyPO(fd.value.PoNomor);
};

// ── Search PO Modal ───────────────────────────────────────────────────
const showPoModal = ref(false);

const openPoModal = () => {
  showPoModal.value = true;
};

const selectPO = async (item: any) => {
  showPoModal.value = false;
  await applyPO(item.Nomor);
};

// ── Gudang Tujuan ──────────────────────────────────────────────────────
const showGdgModal = ref(false);
const gdgList = ref<{ Kode: string; Nama: string }[]>([]);
const gdgQ = ref("");
const gdgFiltered = computed(() => {
  const q = gdgQ.value.toLowerCase();
  return gdgList.value.filter(
    (g) =>
      !q ||
      g.Kode.toLowerCase().includes(q) ||
      g.Nama.toLowerCase().includes(q),
  );
});

const openGdgModal = async () => {
  gdgQ.value = "";
  try {
    const res = await api.get("/lookups/gudang-produksi", {
      params: { cabang: fd.value.Cab || userCab.value || "ALL" },
    });
    gdgList.value = res.data.data?.items || [];
    showGdgModal.value = true;
  } catch {
    toast.error("Gagal memuat daftar gudang.");
  }
};

const selectGdg = async (item: { Kode: string; Nama: string }) => {
  showGdgModal.value = false;
  fd.value.GdgpKode = item.Kode;
  fd.value.GdgpNama = item.Nama;
  // Cek apakah gudang GP003 → load kelompok tujuan
  if (item.Kode === "GP003") {
    await loadKelompokTujuan();
  } else {
    kelompokList.value = [];
    fd.value.KelompokTujuan = "";
  }
};

// ── Panel Kain (J07) ──────────────────────────────────────────────────
const showRealisasiModal = ref(false);

const openRealisasiModal = () => {
  if (!fd.value.SpkNomor) {
    toast.warning("Pilih No PO terlebih dahulu agar SPK tersedia.");
    return;
  }
  showRealisasiModal.value = true;
};

const selectRealisasi = async (item: any) => {
  showRealisasiModal.value = false;
  fd.value.NoMaterial = item.Nomor;
  fd.value.TglMinta = item.Tanggal;
  fd.value.KodeKain = item.kode;
  fd.value.NamaKain = item.JenisKain;
  fd.value.SatKain = item.Satuan;
  fd.value.JmlKain = Number(item.Jumlah) || 0;
  fd.value.SupplierKain = item.NamaSupplier || "";
  fd.value.SatBerat = item.Satuan === "KG" ? "KG" : "MTR";
  await loadLHK();
};

const loadLHK = async () => {
  if (!fd.value.NoMaterial || !fd.value.KodeKain) return;
  try {
    const res = await svc.getDataRealisasiMinta(
      fd.value.NoMaterial,
      fd.value.KodeKain,
    );
    const d = res.data.data;
    fd.value.LHK = Number(d.lhk) || 0;
    fd.value.Kurang = Number(d.kurang) || 0;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "No material tidak ditemukan.");
    fd.value.NoMaterial = "";
  }
};

// ── Komponen & Babaran (J07) ──────────────────────────────────────────
const loadKomponenList = async (spkNomor: string) => {
  if (!spkNomor) return;
  try {
    const res = await svc.getKomponenList(spkNomor);
    komponenList.value = res.data.data || [];
  } catch {
    komponenList.value = [];
  }
};

const onKomponenChange = async () => {
  if (!fd.value.Komponen || !fd.value.SpkNomor) return;
  try {
    const res = await svc.getBabaranStd(fd.value.SpkNomor, fd.value.Komponen);
    fd.value.BabaranStd = Number(res.data.data) || 0;
    hitungBabaran();
  } catch {
    fd.value.BabaranStd = 0;
  }
};

const hitungBabaran = () => {
  const j = Number(fd.value.JumlahTerima) || 0;
  const b = Number(fd.value.Berat) || 0;
  const std = Number(fd.value.BabaranStd) || 0;

  if (j === 0 || b === 0) {
    fd.value.Babaran = 0;
    fd.value.SelisihBabaran = 0;
    return;
  }

  // Sesuai Delphi hitung():
  // KG: babaran = j / b; selisih = babaran - std
  // MTR: babaran = b / j; selisih = std - babaran
  const bbr = fd.value.SatBerat === "KG" ? j / b : b / j;
  fd.value.Babaran = Math.round(bbr * 100) / 100;
  fd.value.SelisihBabaran =
    fd.value.SatBerat === "KG"
      ? Math.round((bbr - std) * 100) / 100
      : Math.round((std - bbr) * 100) / 100;
};

watch([() => fd.value.Berat, () => fd.value.JumlahTerima], hitungBabaran);

const resetPanelKain = () => {
  fd.value.NoMaterial = "";
  fd.value.TglMinta = "";
  fd.value.KodeKain = "";
  fd.value.NamaKain = "";
  fd.value.SatKain = "";
  fd.value.JmlKain = 0;
  fd.value.LHK = 0;
  fd.value.Kurang = 0;
  fd.value.SupplierKain = "";
  fd.value.Berat = 0;
  fd.value.SatBerat = "";
  fd.value.Komponen = "";
  fd.value.BabaranStd = 0;
  fd.value.Babaran = 0;
  fd.value.SelisihBabaran = 0;
  fd.value.Alasan = "";
};

// ── Kelompok Tujuan ───────────────────────────────────────────────────
const loadKelompokTujuan = async () => {
  try {
    const res = await svc.getKelompokTujuan(fd.value.Cab);
    kelompokList.value = (res.data.data || []).map((r: any) => r.kelompok);
  } catch {
    kelompokList.value = [];
  }
};

// ── Jumlah Terima auto-fill ke semua row J02/J03 ─────────────────────
// Sesuai Delphi ii(): kalau jasa J02/J03, semua baris auto-fill jumlah
watch(
  () => fd.value.JumlahTerima,
  (val) => {
    if (["J02", "J03"].includes(fd.value.JasaKode)) {
      fd.value.Detail.forEach((r) => {
        if (r.kode) r.jumlah = val;
      });
    }
  },
);

// ── Validate & Save ───────────────────────────────────────────────────
const validateSave = () => {
  if (["MINTA", "WAIT", "TOLAK"].includes(fd.value.pin5Status)) {
    toast.error("Transaksi tsb sudah diclose. Silahkan minta approve.");
    return;
  }
  if (!fd.value.PoNomor) {
    toast.warning("Nomor PO tidak boleh kosong.");
    return;
  }
  if (!fd.value.SupKode) {
    toast.warning("PO tidak valid.");
    return;
  }
  if (!fd.value.JumlahTerima || Number(fd.value.JumlahTerima) <= 0) {
    toast.warning("Jumlah Terima masih kosong.");
    return;
  }
  if (!fd.value.GdgpKode) {
    toast.warning("Nama Gudang produksi harus diisi.");
    return;
  }
  if (isJ07.value) {
    if (!fd.value.Berat || Number(fd.value.Berat) === 0) {
      toast.warning("Babaran tidak boleh kosong. Cek jumlah dan berat kain!");
      return;
    }
    if (!fd.value.Komponen) {
      toast.warning("Komponen belum dipilih.");
      return;
    }
    if (fd.value.SelisihBabaran < 0 && !fd.value.Alasan.trim()) {
      toast.warning("Babaran < Babaran standar. Alasan harus diisi.");
      return;
    }
  }
  showSaveDialog.value = true;
};

const onAfterPrint = () => {
  showPrintDialog.value = false;
  router.push({ name: "BpbJasaBrowse" });
};
const skipPrint = () => {
  showPrintDialog.value = false;
  router.push({ name: "BpbJasaBrowse" });
};
const doCetak = () => {
  const url = router.resolve({
    name: "BpbJasaPrint",
    query: { nomor: savedNomor.value },
  }).href;
  window.open(url, "_blank");
  showPrintDialog.value = false;
  router.push({ name: "BpbJasaBrowse" });
};

// ── Lifecycle ─────────────────────────────────────────────────────────
onMounted(async () => {
  // useForm sudah auto-fetch via onMounted internal jika isEditMode
  // tapi untuk BPB Jasa yang pakai query param, pastikan fetchData dipanggil
  if (route.query.nomor) {
    await fetchData();
  } else {
    fd.value.Cab = userCab.value || "";
    fd.value.Tanggal = todayLocal();
  }
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah BPB Jasa' : 'Tambah BPB Jasa'"
    menu-id="104"
    :icon="IconFileInvoice"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="BPB Jasa"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ══════════════════════════════════════════════════════
         LEFT — No PO + Info PO + Supplier + Panel Kain (J07)
         ══════════════════════════════════════════════════════ -->
    <template #left-column>
      <!-- PIN5 banner -->
      <div
        v-if="fd.pin5Status"
        class="pin5"
        :class="`pin5-${fd.pin5Status.toLowerCase()}`"
      >
        <IconAlertTriangle :size="12" />
        <span v-if="fd.pin5Status === 'MINTA'"
          >Periode diclose — belum ada pengajuan</span
        >
        <span v-else-if="fd.pin5Status === 'WAIT'">Menunggu ACC dari HO</span>
        <span v-else-if="fd.pin5Status === 'ACC'"
          >Sudah di-ACC — dapat disimpan</span
        >
        <span v-else-if="fd.pin5Status === 'TOLAK'">Pengajuan DITOLAK</span>
      </div>

      <!-- No PO + Info PO -->
      <div class="desktop-form-section">
        <div class="sec-title">Nomor PO Jasa</div>
        <div class="fg">
          <label class="lb w80">No PO</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="fd.PoNomor"
              class="inp"
              style="flex: 1; min-width: 0"
              :readonly="!canEdit || isEditMode"
              placeholder="Nomor PO... (F1)"
              @input="poDirty = true"
              @keydown.enter.prevent="onPoEnter"
              @keydown.f1.prevent="openPoModal"
            />
            <button
              v-if="canEdit && !isEditMode"
              class="ibtn"
              @click="openPoModal"
            >
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
          <span v-if="isLoadingPO" class="note ml4">Memuat...</span>
        </div>

        <template v-if="fd.PoNomor">
          <div class="fg mt4">
            <label class="lb w80">Tgl PO</label>
            <input
              :value="fd.PoTanggal"
              readonly
              class="inp ro"
              style="width: 100px"
            />
            <span class="note ml16"
              >Cab: <b>{{ fd.Cab }}</b></span
            >
          </div>
          <div class="fg mt4">
            <label class="lb w80">Keterangan</label>
            <input
              :value="fd.PoKeterangan"
              readonly
              class="inp ro"
              style="flex: 1"
            />
          </div>
          <div class="fg mt4">
            <label class="lb w80">SPK</label>
            <input
              :value="fd.SpkNomor"
              readonly
              class="inp ro"
              style="width: 130px"
            />
          </div>
          <div class="fg mt2">
            <label class="lb w80"></label>
            <input
              :value="fd.SpkNama"
              readonly
              class="inp ro"
              style="flex: 1"
            />
          </div>
          <div class="fg mt2">
            <label class="lb w80"></label>
            <input
              :value="fd.SpkUkuran || fd.SpkJenisBarang"
              readonly
              class="inp ro"
              style="flex: 1"
              placeholder="Jenis produk"
            />
          </div>
          <div class="fg mt4">
            <label class="lb w80">Jasa</label>
            <input
              :value="fd.JasaKode"
              readonly
              class="inp ro"
              style="width: 50px"
            />
            <input
              :value="fd.JasaNama"
              readonly
              class="inp ro"
              style="flex: 1; min-width: 0; margin-left: 4px"
            />
          </div>
          <div class="fg mt2">
            <label class="lb w80">Jml Jasa</label>
            <input
              :value="num(fd.JumlahJasa)"
              readonly
              class="inp ro tr"
              style="width: 80px"
            />
          </div>
          <div class="fg mt2">
            <label class="lb w80">Tarif</label>
            <input
              :value="num(fd.Tarif)"
              readonly
              class="inp ro tr"
              style="width: 80px"
            />
          </div>
          <div class="fg mt2">
            <label class="lb w80">Sudah Terima</label>
            <input
              :value="num(fd.SudahTerima)"
              readonly
              class="inp ro tr"
              style="width: 80px"
            />
          </div>

          <!-- Gudang Asal + Tujuan di sini -->
          <div class="fg mt4">
            <label class="lb w80">Gdg Asal</label>
            <input
              :value="fd.GdgpAsalKode"
              readonly
              class="inp ro"
              style="width: 60px"
            />
            <input
              :value="fd.GdgpAsalNama"
              readonly
              class="inp ro"
              style="flex: 1; min-width: 0; margin-left: 4px"
            />
          </div>
          <div class="fg mt4">
            <label class="lb w80">Gdg Tujuan</label>
            <div class="ig" style="flex: 1">
              <input
                :value="fd.GdgpKode"
                readonly
                class="inp ro"
                style="width: 60px; flex-shrink: 0"
              />
              <input
                :value="fd.GdgpNama"
                readonly
                class="inp ro"
                style="flex: 1; min-width: 0"
              />
              <button v-if="canEdit" class="ibtn" @click="openGdgModal">
                <IconSearch :size="11" color="#1565c0" />
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- Supplier -->
      <div v-if="fd.SupNama" class="desktop-form-section">
        <div class="sec-title">Supplier</div>
        <div class="fg mt4">
          <label class="lb w80">Kode</label>
          <input
            :value="fd.SupKode"
            readonly
            class="inp ro"
            style="width: 55px; flex-shrink: 0"
          />
          <input
            :value="fd.SupNama"
            readonly
            class="inp ro"
            style="flex: 1; min-width: 0; margin-left: 4px"
          />
        </div>
        <div v-if="fd.SupAlamat" class="note mt2 ml80">{{ fd.SupAlamat }}</div>
        <div v-if="fd.SupKota" class="note ml80">{{ fd.SupKota }}</div>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════════════
         RIGHT — Header terima + Grid detail bahan
         ══════════════════════════════════════════════════════ -->
    <template #right-column>
      <div
        style="
          display: flex;
          flex-direction: row;
          gap: 12px;
          flex: 1;
          min-height: 0;
          min-width: 0;
        "
      >
        <!-- Kolom kiri: form fields + panel realisasi -->
        <div
          style="
            width: 340px;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
            overflow-y: auto;
          "
        >
          <!-- Header terima -->
          <div class="desktop-form-section">
            <div class="fg">
              <label class="lb w90">Nomor</label>
              <input
                :value="fd.Nomor || '(Otomatis)'"
                readonly
                class="inp ro"
                style="flex: 1"
              />
            </div>
            <div class="fg mt4">
              <label class="lb w90">Tgl Terima</label>
              <input
                type="date"
                v-model="fd.Tanggal"
                class="inp"
                :disabled="!canEdit"
              />
            </div>
            <div class="fg mt4">
              <label class="lb w90">Jatuh Tempo</label>
              <input
                type="date"
                v-model="fd.Jatuhtempo"
                class="inp"
                :disabled="!canEdit"
              />
            </div>
            <div class="fg mt4">
              <label class="lb w90">Jml Terima</label>
              <input
                v-model.number="fd.JumlahTerima"
                type="number"
                class="inp tr hl"
                style="width: 90px"
                :readonly="!canEdit"
                @focus="sel"
              />
            </div>
            <div class="fg mt4">
              <label class="lb w90">Status</label>
              <input
                type="checkbox"
                v-model="fd.StatusPO"
                :true-value="1"
                :false-value="0"
                :disabled="!canEdit"
                style="width: 14px; height: 14px"
              />
              <span class="note ml4">Close PO</span>
            </div>
          </div>

          <!-- Panel Realisasi Minta -->
          <div class="desktop-form-section">
            <div class="sec-title">
              No. Realisasi Minta (Kain)
              <span
                v-if="!isJ07"
                class="note ml4"
                style="text-transform: none; font-weight: 400"
                >— opsional</span
              >
            </div>
            <div class="fg mt4">
              <label class="lb w90">No. Realisasi</label>
              <div class="ig" style="flex: 1">
                <input
                  v-model="fd.NoMaterial"
                  class="inp"
                  style="flex: 1; min-width: 0"
                  :readonly="!canEdit"
                  placeholder="(F1)"
                  @keydown.f1.prevent="openRealisasiModal"
                  @blur="loadLHK"
                />
                <button v-if="canEdit" class="ibtn" @click="openRealisasiModal">
                  <IconSearch :size="11" color="#1565c0" />
                </button>
              </div>
            </div>
            <div class="fg mt4">
              <label class="lb w90">Tgl Minta</label>
              <input
                :value="fd.TglMinta"
                readonly
                class="inp ro"
                style="width: 100px"
              />
            </div>
            <div class="fg mt4">
              <label class="lb w90">Jenis Kain</label>
              <input
                :value="fd.KodeKain"
                readonly
                class="inp ro"
                style="width: 65px; flex-shrink: 0"
              />
              <input
                :value="fd.NamaKain"
                readonly
                class="inp ro"
                style="flex: 1; min-width: 0; margin-left: 4px"
              />
            </div>
            <div class="fg mt4">
              <label class="lb w90">Jml Kain</label>
              <input
                :value="num(fd.JmlKain, 2)"
                readonly
                class="inp ro tr"
                style="width: 65px"
              />
              <label class="lb ml6">Sudah</label>
              <input
                :value="num(fd.LHK, 2)"
                readonly
                class="inp ro tr"
                style="width: 65px; margin-left: 4px"
              />
            </div>
            <div class="fg mt4">
              <label class="lb w90">Kurang</label>
              <input
                :value="num(fd.Kurang, 2)"
                readonly
                class="inp ro tr"
                style="width: 65px"
                :style="fd.Kurang < 0 ? 'color:#c62828;font-weight:700' : ''"
              />
            </div>
            <div class="fg mt4">
              <label class="lb w90">Sup Kain</label>
              <input
                :value="fd.SupplierKain"
                readonly
                class="inp ro"
                style="flex: 1"
              />
            </div>

            <div class="divider mt4" />

            <div class="fg mt4">
              <label class="lb w90">Komponen</label>
              <select
                v-model="fd.Komponen"
                class="sel"
                style="flex: 1"
                :disabled="!canEdit"
                @change="onKomponenChange"
              >
                <option value="">-- Pilih --</option>
                <option
                  v-for="k in komponenList"
                  :key="k.komponen"
                  :value="k.komponen"
                >
                  {{ k.komponen }}
                </option>
              </select>
            </div>
            <div class="fg mt4">
              <label class="lb w90">Berat/Panjang</label>
              <input
                v-model.number="fd.Berat"
                type="number"
                class="inp tr hl"
                style="width: 75px"
                :readonly="!canEdit"
                @focus="sel"
              />
              <select
                v-model="fd.SatBerat"
                class="sel"
                style="width: 55px; margin-left: 4px"
                :disabled="!canEdit"
              >
                <option value="KG">KG</option>
                <option value="MTR">MTR</option>
              </select>
            </div>
            <div class="fg mt4">
              <label class="lb w90">Babaran STD</label>
              <input
                :value="num(fd.BabaranStd, 4)"
                readonly
                class="inp ro tr"
                style="width: 70px"
              />
              <label class="lb ml6">Babaran</label>
              <input
                :value="num(fd.Babaran, 4)"
                readonly
                class="inp ro tr"
                style="width: 70px; margin-left: 4px"
              />
            </div>
            <div class="fg mt4">
              <label class="lb w90">Selisih</label>
              <input
                :value="num(fd.SelisihBabaran, 4)"
                readonly
                class="inp ro tr"
                style="width: 70px"
                :style="
                  fd.SelisihBabaran < 0 ? 'color:#c62828;font-weight:700' : ''
                "
              />
            </div>
            <div v-if="fd.SelisihBabaran < 0" class="fg mt4">
              <label class="lb w90">Alasan</label>
              <input
                v-model="fd.Alasan"
                class="inp"
                style="flex: 1"
                :readonly="!canEdit"
                placeholder="Wajib diisi"
              />
            </div>
            <div v-if="kelompokList.length > 0" class="fg mt4">
              <label class="lb w90">Kelompok</label>
              <select
                v-model="fd.KelompokTujuan"
                class="sel"
                style="flex: 1"
                :disabled="!canEdit"
              >
                <option value="">-- Pilih --</option>
                <option v-for="k in kelompokList" :key="k" :value="k">
                  {{ k }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Kolom kanan: grid detail — mengisi sisa ruang -->
        <div
          style="
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            min-height: 0;
          "
        >
          <div
            class="desktop-form-section"
            style="
              flex: 1;
              min-height: 0;
              display: flex;
              flex-direction: column;
            "
          >
            <div class="sec-title">Komponen Yang Disertakan</div>
            <div class="dtbar">
              <span class="note"
                >Detail dari PO — isi <b>Jumlah</b> yang diterima</span
              >
              <span class="dsum ml16">
                Total Terima:
                <b>{{
                  num(fd.Detail.reduce((s, r) => s + Number(r.jumlah || 0), 0))
                }}</b>
              </span>
            </div>
            <div class="gwrap">
              <table class="gtbl">
                <thead>
                  <tr>
                    <th style="width: 26px">#</th>
                    <th style="width: 100px">Kode</th>
                    <th style="min-width: 130px">Nama</th>
                    <th style="width: 44px">Sat</th>
                    <th style="width: 68px" class="tr">Jml PO</th>
                    <th style="width: 68px" class="tr">Sudah</th>
                    <th style="width: 68px" class="tr">Kurang</th>
                    <th style="width: 76px" class="tr">Jml Terima</th>
                    <th style="width: 60px">Status</th>
                    <th style="width: 72px" class="tr">BS Sablon</th>
                    <th style="width: 80px" class="tr">BS Kain Sablon</th>
                    <th style="width: 65px" class="tr">BS Kain</th>
                    <th style="width: 55px">Size</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="fd.Detail.length">
                    <tr
                      v-for="(row, i) in fd.Detail"
                      :key="row._key"
                      :class="i % 2 === 1 ? 'rs' : ''"
                    >
                      <td class="tc muted" style="font-size: 10px">
                        {{ i + 1 }}
                      </td>
                      <td>
                        <input :value="row.kode" readonly class="ci mono" />
                      </td>
                      <td><input :value="row.nama" readonly class="ci" /></td>
                      <td>
                        <input :value="row.satuan" readonly class="ci tc" />
                      </td>
                      <td>
                        <input
                          :value="num(row.pojd_jumlah)"
                          readonly
                          class="ci tr ro"
                        />
                      </td>
                      <td>
                        <input
                          :value="num(row.sudah)"
                          readonly
                          class="ci tr ro"
                        />
                      </td>
                      <td>
                        <input
                          :value="num(row.kurang)"
                          readonly
                          class="ci tr ro"
                          :style="
                            row.kurang < 0
                              ? 'color:#c62828;font-weight:700'
                              : ''
                          "
                        />
                      </td>
                      <td>
                        <input
                          v-model.number="row.jumlah"
                          type="number"
                          class="ci tr hl"
                          :readonly="!canEdit"
                          @focus="sel"
                        />
                      </td>
                      <td>
                        <select
                          v-model="row.status"
                          class="ci"
                          :disabled="!canEdit"
                          style="font-size: 10px"
                        >
                          <option value="Delay">Delay</option>
                          <option value="True">True</option>
                          <option value="Cancel">Cancel</option>
                        </select>
                      </td>
                      <!-- 4 kolom baru -->
                      <td>
                        <input
                          v-model.number="row.bs_mitra"
                          type="number"
                          class="ci tr hl"
                          :readonly="!canEdit"
                          @focus="sel"
                        />
                      </td>
                      <td>
                        <input
                          v-model.number="row.bs_kain"
                          type="number"
                          class="ci tr hl"
                          :readonly="!canEdit"
                          @focus="sel"
                        />
                      </td>
                      <td>
                        <input
                          v-model.number="row.bs"
                          type="number"
                          class="ci tr hl"
                          :readonly="!canEdit"
                          @focus="sel"
                        />
                      </td>
                      <td>
                        <input
                          v-model="row.size"
                          class="ci"
                          :readonly="!canEdit"
                          style="width: 100%"
                        />
                      </td>
                    </tr>
                  </template>
                  <tr v-else>
                    <td
                      colspan="13"
                      class="tc"
                      style="
                        padding: 20px;
                        color: #9e9e9e;
                        font-size: 11px;
                        font-style: italic;
                      "
                    >
                      Pilih No PO terlebih dahulu
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- ── Modal Search PO Jasa ── -->
  <PoJasaSearchModal
    v-model="showPoModal"
    :cab="userCab || 'ALL'"
    @selected="selectPO"
  />

  <!-- ── Modal Gudang Tujuan ── -->
  <v-dialog v-model="showGdgModal" max-width="400px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        Pilih Gudang Tujuan Produksi
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="gdgQ"
          class="ms"
          placeholder="Cari gudang..."
          autofocus
        />
        <div class="ml">
          <div
            v-for="g in gdgFiltered"
            :key="g.Kode"
            class="mi"
            :class="{ mia: fd.GdgpKode === g.Kode }"
            @click="selectGdg(g)"
          >
            <span class="mk">{{ g.Kode }}</span>
            <span>{{ g.Nama }}</span>
          </div>
          <div v-if="!gdgFiltered.length" class="me">Tidak ada gudang</div>
        </div>
      </v-card-text>
      <v-card-actions class="pa-2 border-t">
        <v-spacer /><v-btn
          variant="text"
          size="small"
          @click="showGdgModal = false"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Modal Realisasi Minta ── -->
  <RealisasiMintaBySpkSearchModal
    v-model="showRealisasiModal"
    :spk-nomor="fd.SpkNomor"
    @selected="selectRealisasi"
  />

  <!-- ── Dialog Print ── -->
  <v-dialog v-model="showPrintDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Cetak BPB Jasa
      </v-card-title>
      <v-card-text class="pa-4">
        Data <b>{{ savedNomor }}</b> berhasil disimpan.<br />
        Ingin mencetak BPB Jasa?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="skipPrint">Tidak</v-btn>
        <v-spacer />
        <v-btn variant="flat" size="small" color="primary" @click="doCetak"
          >Ya, Cetak</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.fg {
  display: flex;
  align-items: center;
  gap: 5px;
}
.mt4 {
  margin-top: 4px;
}
.ml16 {
  margin-left: 16px;
}
.ml4 {
  margin-left: 4px;
}
.mt2 {
  margin-top: 2px;
}
.mb2 {
  margin-bottom: 6px;
}
.lb {
  font-size: 11px;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
}
.w80 {
  width: 80px;
  flex-shrink: 0;
}
.note {
  font-size: 10px;
  color: #777;
}
.tr {
  text-align: right;
}
.tc {
  text-align: center;
}
.muted {
  color: #9e9e9e;
}
.divider {
  height: 1px;
  background: #e0e0e0;
  margin: 6px 0;
}

.pin5 {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  margin-bottom: 6px;
  flex-shrink: 0;
}
.pin5-minta {
  background: #fff3e0;
  color: #e65100;
}
.pin5-wait {
  background: #e3f2fd;
  color: #1565c0;
}
.pin5-acc {
  background: #e8f5e9;
  color: #2e7d32;
}
.pin5-tolak {
  background: #ffebee;
  color: #c62828;
}

.sec-title {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 3px;
}

.inp {
  height: 24px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 12px;
  outline: none;
  background: white;
  font-family: inherit;
}
.inp:focus {
  border-color: #1565c0;
}
.ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.hl {
  background: #fffde7 !important;
}
.sel {
  height: 24px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 3px;
  font-size: 12px;
  outline: none;
  background: white;
}

.ig {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  height: 24px;
  background: white;
  overflow: hidden;
}
.ig .inp {
  border: none;
  height: 22px;
  border-radius: 0;
  flex: 1;
  min-width: 0;
}
.ibtn {
  width: 24px;
  min-width: 24px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ibtn:hover {
  background: #bbdefb;
}

.w90 {
  width: 90px;
  flex-shrink: 0;
}
.ml8 {
  margin-left: 8px;
}
.mt6 {
  margin-top: 6px;
}
.ml80 {
  margin-left: 85px;
}
.ml6 {
  margin-left: 6px;
}

@media (max-width: 1100px) {
  .top-split {
    flex-direction: column !important;
  }
  .top-right {
    width: 100%;
    border-left: none;
    border-top: 1px solid #e0e0e0;
    padding-left: 0;
    padding-top: 8px;
  }
}

.dtbar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-shrink: 0;
}
.dsum {
  font-size: 11px;
  color: #555;
}
.gwrap {
  flex: 1;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  min-height: 0;
}
.gtbl {
  border-collapse: collapse;
  font-size: 11px;
  min-width: max-content;
  width: 100%;
}
.gtbl th {
  background: #1565c0;
  color: white;
  padding: 3px 4px;
  font-weight: 700;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}
.gtbl td {
  padding: 2px 2px;
  border-bottom: 0.3px solid #e0e0e0;
  vertical-align: middle;
}
.rs td {
  background: #fafafa;
}
.ci {
  width: 100%;
  height: 22px;
  border: none;
  outline: none;
  padding: 0 3px;
  font-size: 11px;
  background: transparent;
  font-family: inherit;
}
.ci:focus {
  background: #fffde7;
  outline: 1px solid #1565c0;
  border-radius: 2px;
}
.ci[readonly] {
  color: #666;
  background: transparent;
}
.mono {
  font-family: monospace;
  font-size: 10px;
  color: #1565c0;
  font-weight: 600;
}

.ms {
  width: 100%;
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 7px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}
.ms:focus {
  border-color: #1565c0;
}
.ml {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
}
.mi {
  display: flex;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 12px;
  border-bottom: 1px solid #f5f5f5;
}
.mi:hover {
  background: #e3f2fd;
}
.mia {
  background: #1565c0;
  color: white;
}
.mk {
  font-weight: 700;
  width: 65px;
  flex-shrink: 0;
  font-family: monospace;
  font-size: 10px;
}
.me {
  padding: 12px;
  text-align: center;
  font-size: 11px;
  color: #9e9e9e;
  font-style: italic;
}
.mtr {
  cursor: pointer;
}
.mtr:hover td {
  background: #e3f2fd;
}
</style>
