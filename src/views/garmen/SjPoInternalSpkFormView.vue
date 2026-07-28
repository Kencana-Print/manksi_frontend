<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import BaseForm from "@/components/BaseForm.vue";
import { sjPoInternalSpkFormService } from "@/services/garmen/sjPoInternalSpkFormService";
import {
  IconTruckDelivery,
  IconSearch,
  IconTrash,
  IconPlus,
  IconPrinter,
  IconHelpCircle,
  IconPhotoCheck,
  IconPhotoOff,
} from "@tabler/icons-vue";

import PoInternalSpkSearchModal from "@/components/lookups/PoInternalSpkSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import RealisasiMintaSearchModal from "@/components/lookups/RealisasiMintaSearchModal.vue";
import HistoryPakaiMaterialModal from "@/components/lookups/HistoryPakaiMaterialModal.vue";
import GudangProduksiSearchModal from "@/components/lookups/GudangProduksiSearchModal.vue";
import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEdit = computed(() => !!route.params.nomor);
const nomorParam = computed(() =>
  route.params.nomor ? decodeURIComponent(route.params.nomor as string) : "",
);

const showPoModal = ref(false);
const showBahanModal = ref(false);
const showMaterialModal = ref(false);
const showHistoryModal = ref(false);
const showLiniAsalModal = ref(false);
const showLiniTujuanModal = ref(false);
const showSupplierModal = ref(false);
const activeRowIndex = ref(-1);
const komponenSelectRef = ref<HTMLSelectElement | null>(null);

const showPrintDialog = ref(false);
const savedNomor = ref("");

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const emptyDetailRow = () => ({
  kode: "",
  nama: "",
  satuan: "",
  size: "",
  jumlahpo: 0,
  jumlah: 0,
  bs: 0,
  sablon: 0,
  kain: 0,
  koli: 0,
  ket: "",
  sudahsj: 0,
  kurang: 0,
  new: true,
});

const emptyData = {
  nomor: "",
  tanggal: formatDateLocal(new Date()),
  nomorPO: "",
  tanggalPO: "",
  datelinePO: "",
  nomorSpk: "",
  namaSpk: "",
  bahan: "",
  ukuran: "",
  jumlahSpk: 0,
  adaGambar: false,
  spkTanggal: "",
  cetakFlag: false,
  bordirFlag: false,

  jasaKode: "",
  jasaNama: "",
  gdgAsalKode: "",
  gdgAsalNama: "",
  gdgTujuanKode: "",
  gdgTujuanNama: "",
  liniAsal: "",
  liniAsalNama: "",
  liniTujuan: "",
  liniTujuanNama: "",

  jumlahJasa: 0,
  kelompok: "",
  kelompokTujuan: "",
  cmt: false,
  keterangan: "",

  supKode: "",
  supNama: "",

  noMaterial: "",
  tanggalMinta: "",
  namaKain: "",
  satKain: "",
  kodeKain: "",
  jmlKain: 0,
  lhkSudahPakai: 0,

  qtyBerat: 0,
  satBerat: "KG",
  komponen: "",
  babaranStd: 0,
  alasan: "",

  pinStatus: "",
  pinUrut: 0,

  detail: [emptyDetailRow()] as any[],
};

const babaranPreview = computed(() => {
  const j = Number(formData.value.jumlahJasa) || 0;
  const b = Number(formData.value.qtyBerat) || 0;
  if (j === 0 || b === 0) return 0;
  return formData.value.satBerat === "KG" ? j / b : b / j;
});
const selisihBabaranPreview = computed(() => {
  const std = Number(formData.value.babaranStd) || 0;
  const bbr = babaranPreview.value;
  if (std === 0 || bbr === 0) return 0;
  return bbr - std;
});
const kurangKain = computed(
  () =>
    (Number(formData.value.jmlKain) || 0) -
    (Number(formData.value.lhkSudahPakai) || 0),
);
const perluMaterial = computed(() =>
  ["GP001", "GP015"].includes(formData.value.liniAsal),
);

const buildPayload = (data: typeof emptyData) => ({
  nomor: isEdit.value ? data.nomor : "",
  tanggal: data.tanggal,
  nomorPO: data.nomorPO,
  nomorSpk: data.nomorSpk,
  gdgAsal: data.gdgAsalKode,
  liniAsal: data.liniAsal,
  liniTujuan: data.liniTujuan,
  jumlahJasa: data.jumlahJasa,
  kelompok: data.kelompok,
  kelompokTujuan: data.kelompokTujuan,
  cmt: data.cmt,
  keterangan: data.keterangan,
  supKode: data.supKode,
  supplierKain: data.supNama,
  noMaterial: data.noMaterial,
  kodeKain: data.kodeKain,
  qtyBerat: data.qtyBerat,
  satBerat: data.satBerat,
  komponen: data.komponen,
  alasan: data.alasan,
  jmlKain: data.jmlKain,
  lhkSudahPakai: data.lhkSudahPakai,
  detail: data.detail
    .filter((d: any) => d.kode)
    .map((d: any) => ({
      kode: d.kode,
      size: d.size,
      jumlah: Number(d.jumlah) || 0,
      bs: Number(d.bs) || 0,
      sablon: Number(d.sablon) || 0,
      kain: Number(d.kain) || 0,
      koli: Number(d.koli) || 0,
      ket: d.ket || "",
      new: !!d.new,
    })),
  xminta5: data.pinStatus,
  xurut5: data.pinUrut,
});

const {
  formData,
  isLoading,
  isSaving,
  canSave,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  fetchData,
  executeSave,
  executeCancel,
  executeClose,
} = useForm({
  menuId: "125",
  initialData: emptyData,
  fetchApi: async () => {
    const res = await sjPoInternalSpkFormService.getById(nomorParam.value);
    const d = res.data.data;
    const h = d.header;
    return {
      nomor: h.Nomor,
      tanggal: formatDateLocal(h.Tanggal),
      nomorPO: h.NomorPO,
      tanggalPO: formatDateLocal(h.TanggalPO),
      datelinePO: formatDateLocal(h.DatelinePO),
      nomorSpk: h.NomorSPK,
      namaSpk: h.NamaSPK,
      bahan: h.Bahan,
      ukuran: h.Ukuran,
      jumlahSpk: Number(h.Jumlah) || 0,
      adaGambar: !!h.adaGambar,
      spkTanggal: formatDateLocal(h.SpkTanggal),
      cetakFlag: !!h.CetakFlag,
      bordirFlag: !!h.BordirFlag,
      jasaKode: h.JasaKode,
      jasaNama: h.JasaNama,
      gdgAsalKode: h.GudangAsalKode,
      gdgAsalNama: h.GudangAsalNama,
      gdgTujuanKode: h.GudangTujuanKode,
      gdgTujuanNama: h.GudangTujuanNama,
      liniAsal: h.LiniAsal,
      liniAsalNama: h.LiniAsalNama || "",
      liniTujuan: h.LiniTujuan,
      liniTujuanNama: h.LiniTujuanNama || "",
      jumlahJasa: Number(h.JumlahJasa) || 0,
      kelompok: h.Kelompok || "",
      kelompokTujuan: h.KelompokTujuan || "",
      cmt: !!h.Cmt,
      keterangan: h.Keterangan || "",
      supKode: h.SupKode || "",
      supNama: h.SupplierKain || "",
      noMaterial: h.NoMaterial || "",
      tanggalMinta: formatDateLocal(h.TanggalMinta),
      namaKain: h.NamaKain || "",
      satKain: h.SatKain || "",
      kodeKain: h.KodeKain || "",
      jmlKain: Number(h.JmlKain) || 0,
      lhkSudahPakai: 0,
      qtyBerat: Number(h.QtyBerat) || 0,
      satBerat: h.SatBerat || "KG",
      komponen: h.Komponen || "",
      babaranStd: Number(h.BabaranStd) || 0,
      alasan: h.Alasan || "",
      pinStatus: d.pinStatus || "",
      pinUrut: d.pinUrut || 0,
      detail: [...(d.detail || []), emptyDetailRow()],
    };
  },
  submitApi: async (data: typeof emptyData) => {
    return await sjPoInternalSpkFormService.save(buildPayload(data));
  },
  onSuccessRoute: "",
  onSuccess: (res: any) => {
    toast.success("Surat Jalan PO Internal berhasil disimpan.");
    savedNomor.value = res.data?.data?.nomor || formData.value.nomor;
    showPrintDialog.value = true;
  },
});

const komponenOptions = ref<string[]>([]);
const loadKomponenOptions = async (nomorSpk: string) => {
  try {
    const res = await sjPoInternalSpkFormService.getKomponenOptions(nomorSpk);
    komponenOptions.value = res.data.data || [];
  } catch {
    komponenOptions.value = [];
  }
};

const kelompokOptions = ref<string[]>([]);
const kelompokTujuanOptions = ref<string[]>([]);
const showKelompokTujuan = computed(
  () => formData.value.liniTujuan === "GP003",
);
const loadKelompokOptions = async () => {
  try {
    const res = await sjPoInternalSpkFormService.getKelompokOptions(
      formData.value.jasaNama,
      formData.value.gdgAsalKode,
    );
    kelompokOptions.value = res.data.data || [];
    // replikasi cbKelompok.ItemIndex:=0 — auto-pilih opsi pertama
    if (kelompokOptions.value.length > 0 && !formData.value.kelompok) {
      formData.value.kelompok = kelompokOptions.value[0];
    }
  } catch {
    kelompokOptions.value = [];
  }
};
const loadKelompokTujuanOptions = async () => {
  if (formData.value.liniTujuan !== "GP003") {
    kelompokTujuanOptions.value = [];
    formData.value.kelompokTujuan = "";
    return;
  }
  try {
    const res = await sjPoInternalSpkFormService.getKelompokTujuanOptions(
      formData.value.liniTujuan,
      formData.value.gdgTujuanKode,
    );
    kelompokTujuanOptions.value = res.data.data || [];
    if (kelompokTujuanOptions.value.length > 0) {
      formData.value.kelompokTujuan = kelompokTujuanOptions.value[0];
    }
  } catch {
    kelompokTujuanOptions.value = [];
  }
};

onMounted(async () => {
  if (isEdit.value) {
    await fetchData();
    if (formData.value.nomorSpk)
      await loadKomponenOptions(formData.value.nomorSpk);
    await loadKelompokOptions();
    await loadKelompokTujuanOptions();
  }
});

const onPOBlur = async () => {
  const nomor = formData.value.nomorPO?.trim();
  if (!nomor) return;
  try {
    isLoading.value = true;
    const res = await sjPoInternalSpkFormService.checkPO(nomor);
    const { header: po, detail, lini } = res.data.data;

    formData.value.nomorPO = po.NomorPO;
    formData.value.tanggalPO = po.TanggalPO;
    formData.value.datelinePO = po.DatelinePO;
    formData.value.nomorSpk = po.NomorSPK;
    formData.value.namaSpk = po.NamaSPK;
    formData.value.bahan = po.Bahan;
    formData.value.ukuran = po.Ukuran;
    formData.value.jumlahSpk = Number(po.Jumlah) || 0;
    formData.value.spkTanggal = po.SpkTanggal;
    formData.value.cetakFlag = !!po.CetakFlag;
    formData.value.bordirFlag = !!po.BordirFlag;
    formData.value.jasaKode = po.JasaKode;
    formData.value.jasaNama = po.JasaNama;
    formData.value.gdgAsalKode = po.GudangAsalKode;
    formData.value.gdgAsalNama = po.GudangAsalNama;
    formData.value.gdgTujuanKode = po.GudangTujuanKode;
    formData.value.gdgTujuanNama = po.GudangTujuanNama;
    formData.value.adaGambar = !!po.adaGambar;

    formData.value.detail = [...detail, emptyDetailRow()];

    if (lini) {
      formData.value.liniAsal = lini.asalKode || "";
      formData.value.liniAsalNama = lini.asalNama || "";
      formData.value.liniTujuan = lini.tujuanKode || "";
      formData.value.liniTujuanNama = lini.tujuanNama || "";
    }

    await loadKomponenOptions(po.NomorSPK);
    await loadKelompokOptions();
    await loadKelompokTujuanOptions();
    toast.success("Data PO berhasil dimuat.");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Nomor PO tersebut belum ada.");
    formData.value.nomorPO = "";
  } finally {
    isLoading.value = false;
  }
};

const onPoSelected = async (item: any) => {
  formData.value.nomorPO = item.Nomor;
  await onPOBlur();
};

const onLiniAsalBlur = async () => {
  const kode = formData.value.liniAsal?.trim();
  if (!kode) {
    formData.value.liniAsalNama = "";
    return;
  }
  try {
    const res = await sjPoInternalSpkFormService.checkGudangProduksi(
      kode,
      formData.value.gdgAsalKode,
    );
    formData.value.liniAsal = res.data.data.kode;
    formData.value.liniAsalNama = res.data.data.nama;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode Lini tidak ditemukan.");
    formData.value.liniAsal = "";
    formData.value.liniAsalNama = "";
  }
};
const onLiniTujuanBlur = async () => {
  const kode = formData.value.liniTujuan?.trim();
  if (!kode) {
    formData.value.liniTujuanNama = "";
    await loadKelompokTujuanOptions();
    return;
  }
  try {
    const res = await sjPoInternalSpkFormService.checkGudangProduksi(
      kode,
      formData.value.gdgAsalKode,
    );
    formData.value.liniTujuan = res.data.data.kode;
    formData.value.liniTujuanNama = res.data.data.nama;
    await loadKelompokTujuanOptions();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode Lini tidak ditemukan.");
    formData.value.liniTujuan = "";
    formData.value.liniTujuanNama = "";
    await loadKelompokTujuanOptions();
  }
};
const onLiniAsalSelected = (item: any) => {
  formData.value.liniAsal = item.Kode || item.gdgp_kode;
  formData.value.liniAsalNama = item.Nama || item.gdgp_nama;
};
const onLiniTujuanSelected = async (item: any) => {
  formData.value.liniTujuan = item.Kode || item.gdgp_kode;
  formData.value.liniTujuanNama = item.Nama || item.gdgp_nama;
  await loadKelompokTujuanOptions();
};

const onSupplierSelected = (item: any) => {
  formData.value.supKode = item.Kode || item.sup_kode;
  formData.value.supNama = item.Nama || item.sup_nama;
};

const onSupKodeBlur = async () => {
  const kode = formData.value.supKode?.trim();
  if (!kode) {
    formData.value.supNama = "";
    return;
  }
  try {
    const res = await sjPoInternalSpkFormService.checkSupplier(kode);
    formData.value.supKode = res.data.data.kode;
    formData.value.supNama = res.data.data.nama;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode Supplier tidak ditemukan.");
    formData.value.supKode = "";
    formData.value.supNama = "";
  }
};

const onMaterialSelected = async (item: any) => {
  formData.value.noMaterial = item.Nomor;
  formData.value.kodeKain = item.Kode;
  await resolveMaterial();
};
const onMaterialBlur = async () => {
  if (!formData.value.noMaterial?.trim()) return;
  await resolveMaterial();
};
const resolveMaterial = async () => {
  try {
    const res = await sjPoInternalSpkFormService.checkNoMaterial(
      formData.value.noMaterial,
      formData.value.kodeKain,
      formData.value.nomor || "",
    );
    const d = res.data.data;
    formData.value.kodeKain = d.kodeKain;
    formData.value.tanggalMinta = d.tanggalMinta;
    formData.value.jmlKain = d.jmlKain;
    formData.value.namaKain = d.namaKain;
    formData.value.satKain = d.satKain;
    formData.value.lhkSudahPakai = d.lhkSudahPakai;
  } catch (e: any) {
    toast.error(
      e.response?.data?.message ||
        "Nomor Permintaan Material tsb tidak ditemukan.",
    );
    formData.value.noMaterial = "";
  }
};

const onKomponenChange = async () => {
  if (!formData.value.komponen) {
    formData.value.babaranStd = 0;
    return;
  }
  try {
    const res = await sjPoInternalSpkFormService.getBabaranStandar(
      formData.value.nomorSpk,
      formData.value.komponen,
    );
    formData.value.babaranStd = res.data.data || 0;
  } catch {
    formData.value.babaranStd = 0;
  }
};

const onBeratBlur = async () => {
  if (!formData.value.komponen) {
    formData.value.qtyBerat = 0;
    toast.warning("Komponen dipilih dulu ya!");
    await nextTick();
    komponenSelectRef.value?.focus();
    return;
  }
  if (
    formData.value.qtyBerat === null ||
    formData.value.qtyBerat === undefined
  ) {
    formData.value.qtyBerat = 0;
  }
  // hitung() setara babaranPreview/selisihBabaranPreview sudah computed
  // reaktif otomatis — gak perlu trigger manual kayak Delphi.
};

const headerLengkapUntukBahan = () => {
  if (!formData.value.nomorPO) {
    toast.warning("Nomor PO di isi dulu ya!");
    return false;
  }
  if (!formData.value.nomorSpk) {
    toast.warning("SPK belum diketahui.");
    return false;
  }
  return true;
};

const ensureTrailingRow = () => {
  const rows = formData.value.detail;
  const last = rows[rows.length - 1];
  if (!last || last.kode) rows.push(emptyDetailRow());
};

const resolveKode = async (kode: string, idx: number) => {
  try {
    isLoading.value = true;
    const res = await sjPoInternalSpkFormService.loadBahan({
      kode,
      nomorSpk: formData.value.nomorSpk,
      existingRows: formData.value.detail
        .filter((_: any, i: number) => i !== idx)
        .map((d: any) => ({ kode: d.kode, size: d.size })),
    });
    const { rows, skipped } = res.data.data;
    if (rows.length === 0) {
      toast.warning("Kode tsb sudah di input.");
      formData.value.detail[idx].kode = "";
      return;
    }
    formData.value.detail.splice(idx, 1, ...rows);
    if (skipped?.length) {
      toast.warning(
        `${skipped.length} size sudah ada di daftar, dilewati: ${skipped
          .map((s: any) => s.size || "-")
          .join(", ")}`,
      );
    }
    ensureTrailingRow();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menambah bahan.");
    formData.value.detail[idx].kode = "";
  } finally {
    isLoading.value = false;
  }
};

const onKodeKeydown = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    if (!headerLengkapUntukBahan()) return;
    activeRowIndex.value = idx;
    showBahanModal.value = true;
  }
};
const onKodeEnter = async (idx: number) => {
  const kode = formData.value.detail[idx].kode?.trim();
  if (!kode) return;
  if (!headerLengkapUntukBahan()) return;
  await resolveKode(kode, idx);
};
const openBahanModal = () => {
  if (!headerLengkapUntukBahan()) return;
  activeRowIndex.value = formData.value.detail.length - 1;
  showBahanModal.value = true;
};
const onBahanSelected = async (item: any) => {
  const kode = item.Kode || item.Bhn_kode || item.bhn_kode;
  const idx =
    activeRowIndex.value >= 0
      ? activeRowIndex.value
      : formData.value.detail.length - 1;
  await resolveKode(kode, idx);
};

const removeDetail = (idx: number) => {
  const row = formData.value.detail[idx];
  if (!row.new) {
    toast.warning("Komponen Bawaan PO tidak bisa di hapus.");
    return;
  }
  formData.value.detail.splice(idx, 1);
  ensureTrailingRow();
};

const onJumlahInput = (row: any) => {
  if (!row.new && Number(row.jumlah) > row.kurang) {
    toast.warning(
      `Jumlah SJ (${row.jumlah}) melebihi sisa PO (${row.kurang}) untuk ${row.nama}.`,
    );
  }
};

const openHistoryModal = () => {
  if (!formData.value.noMaterial) {
    return toast.warning("Pilih No. Minta Material dulu.");
  }
  showHistoryModal.value = true;
};

const validateSave = () => {
  if (!canSave.value) return toast.error("Hak akses simpan ditolak.");
  const todayStr = formatDateLocal(new Date());
  if (formData.value.tanggal > todayStr) {
    return toast.warning("Tanggal SJ tidak boleh maju.");
  }
  if (!formData.value.nomorPO?.trim())
    return toast.warning("Nomor PO belum di isi.");
  if (!formData.value.liniAsal?.trim())
    return toast.warning("Lini Asal harus di isi.");
  if (!formData.value.liniTujuan?.trim())
    return toast.warning("Lini Tujuan harus di isi.");

  if (perluMaterial.value) {
    if (!formData.value.noMaterial?.trim()) {
      return toast.warning("Nomor Permintaan Material harus di isi.");
    }
    const j = Number(formData.value.jumlahJasa) || 0;
    const b = Number(formData.value.qtyBerat) || 0;
    const k = Number(formData.value.jmlKain) || 0;
    const l = Number(formData.value.lhkSudahPakai) || 0;
    if (j < 0) return toast.warning("Jumlah tidak boleh minus.");
    if (b === 0) {
      return toast.warning(
        "Babaran tidak boleh kosong.\nCek jumlah dan berat kain!",
      );
    }
    if (b + l > k + 0.01) {
      return toast.warning("Berat kain melebihi Jumlah kain.");
    }
    if (selisihBabaranPreview.value < 0 && !formData.value.alasan?.trim()) {
      return toast.warning("Babaran < Babaran standart.\nAlasan harus diisi.");
    }
  }

  const validDetail = formData.value.detail.filter((d: any) => d.kode);
  const total = validDetail.reduce(
    (s: number, d: any) => s + (Number(d.jumlah) || 0),
    0,
  );
  if (total === 0) {
    return toast.warning("Jumlahnya kosong semua.\nBelum bisa disimpan.");
  }

  showSaveDialog.value = true;
};

const closePrintAndExit = () => {
  showPrintDialog.value = false;
  router.push({ name: "SjPoInternalSpkBrowse" });
};
const doCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/garmen/po-internal-spk/sj-po-internal/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  router.push({ name: "SjPoInternalSpkBrowse" });
};

const rp = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);
</script>

<template>
  <BaseForm
    :title="
      isEdit ? 'Ubah Surat Jalan PO Internal' : 'Tambah Surat Jalan PO Internal'
    "
    menu-id="125"
    :icon="IconTruckDelivery"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="sj-layout">
      <div class="sj-header-row">
        <div class="sj-section">
          <div class="sec-title">Surat Jalan PO Internal</div>

          <div class="f-row">
            <label class="f-lbl">Nomor SJ</label>
            <input
              :value="formData.nomor"
              readonly
              class="f-inp f-ro"
              style="width: 170px"
            />
            <span v-if="!isEdit" class="hint-new ml-1">← Kosong = Baru</span>
          </div>

          <div class="f-row">
            <label class="f-lbl">Tanggal SJ</label>
            <input
              type="date"
              v-model="formData.tanggal"
              class="f-date"
              style="width: 150px"
            />
          </div>

          <div class="f-row">
            <label class="f-lbl">Nomor PO</label>
            <div class="inp-grp" style="width: 170px">
              <input
                v-model="formData.nomorPO"
                class="f-inp"
                style="flex: 1; background: #ddeeff; text-transform: uppercase"
                placeholder="Ketik + Enter / F1"
                :disabled="isEdit"
                @keydown.enter.prevent="
                  ($event.target as HTMLInputElement).blur()
                "
                @blur="onPOBlur"
              />
              <button
                type="button"
                class="btn-lkp"
                title="Cari PO Internal SPK"
                :disabled="isEdit"
                @click="showPoModal = true"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
            <span v-if="formData.nomorPO" class="gbr-badge ml-2">
              <IconPhotoCheck
                v-if="formData.adaGambar"
                :size="13"
                color="#2e7d32"
              />
              <IconPhotoOff v-else :size="13" color="#9e9e9e" />
            </span>
          </div>
          <div class="f-row">
            <label class="f-lbl">Tanggal PO</label>
            <input
              :value="formData.tanggalPO"
              readonly
              class="f-inp f-ro"
              style="width: 120px"
            />
            <label class="f-lbl ml-2" style="width: 78px">Dateline PO</label>
            <input
              :value="formData.datelinePO"
              readonly
              class="f-inp f-ro"
              style="width: 120px"
            />
          </div>

          <div class="f-row">
            <label class="f-lbl">Nomor SPK</label>
            <input
              :value="formData.nomorSpk"
              readonly
              class="f-inp f-ro"
              style="width: 170px"
              placeholder="Otomatis dari PO"
              title="Terkunci — ikut Nomor PO yang dipilih"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Product</label>
            <input
              :value="formData.namaSpk"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Bahan</label>
            <input
              :value="formData.bahan"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Ukuran/Jml</label>
            <input
              :value="formData.ukuran"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
            <input
              :value="rp(formData.jumlahSpk)"
              readonly
              class="f-inp f-ro text-right"
              style="width: 80px"
            />
          </div>

          <div class="divider" />

          <div class="f-row">
            <label class="f-lbl">No.Minta Mat.</label>
            <div class="inp-grp" style="flex: 1">
              <input
                v-model="formData.noMaterial"
                class="f-inp"
                style="flex: 1; background: #ddeeff"
                placeholder="Ketik + Enter"
                @keydown.enter.prevent="
                  ($event.target as HTMLInputElement).blur()
                "
                @blur="onMaterialBlur"
              />
              <button
                type="button"
                class="btn-lkp"
                title="Cari Realisasi Minta"
                @click="showMaterialModal = true"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
              <button
                type="button"
                class="btn-lkp"
                title="History Pemakaian"
                @click="openHistoryModal"
              >
                <IconHelpCircle :size="13" color="#e65100" />
              </button>
            </div>
            <input
              :value="formData.tanggalMinta"
              readonly
              class="f-inp f-ro ml-1"
              style="width: 100px"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Jenis Kain</label>
            <input
              :value="formData.namaKain"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
            <input
              :value="formData.satKain"
              readonly
              class="f-inp f-ro ml-1"
              style="width: 70px"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Jml Kain</label>
            <input
              :value="rp(formData.jmlKain)"
              readonly
              class="f-inp f-ro text-right"
              style="width: 90px"
            />
            <label class="f-lbl ml-2" style="width: 100px">LHK Terpakai</label>
            <input
              :value="rp(formData.lhkSudahPakai)"
              readonly
              class="f-inp f-ro text-right"
              style="width: 90px"
            />
            <label class="f-lbl ml-2" style="width: 55px">Kurang</label>
            <input
              :value="rp(kurangKain)"
              readonly
              class="f-inp f-ro text-right"
              :style="{
                width: '90px',
                color: kurangKain < 0 ? '#c62828' : '#2e7d32',
                fontWeight: 700,
              }"
            />
          </div>
        </div>

        <div class="sj-section">
          <div class="sec-title">Rute &amp; Babaran</div>

          <div class="f-row">
            <label class="f-lbl">Jasa</label>
            <input
              :value="formData.jasaKode"
              readonly
              class="f-inp f-ro"
              style="width: 55px"
            />
            <input
              :value="formData.jasaNama"
              readonly
              class="f-inp f-ro ml-1"
              style="flex: 1"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Gudang Asal</label>
            <input
              :value="formData.gdgAsalKode"
              readonly
              class="f-inp f-ro"
              style="width: 55px"
            />
            <input
              :value="formData.gdgAsalNama"
              readonly
              class="f-inp f-ro ml-1"
              style="flex: 1"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Lini Asal</label>
            <div class="inp-grp" style="flex: 1">
              <input
                v-model="formData.liniAsal"
                class="f-inp"
                style="width: 65px; background: #ddeeff"
                @keydown.enter.prevent="
                  ($event.target as HTMLInputElement).blur()
                "
                @blur="onLiniAsalBlur"
              />
              <input
                :value="formData.liniAsalNama"
                readonly
                class="f-inp f-ro"
                style="flex: 1"
              />
              <button
                type="button"
                class="btn-lkp"
                title="Cari Lini Asal"
                @click="showLiniAsalModal = true"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
          </div>

          <div class="f-row">
            <label class="f-lbl">Gudang Tujuan</label>
            <input
              :value="formData.gdgTujuanKode"
              readonly
              class="f-inp f-ro"
              style="width: 55px"
            />
            <input
              :value="formData.gdgTujuanNama"
              readonly
              class="f-inp f-ro ml-1"
              style="flex: 1"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Lini Tujuan</label>
            <div class="inp-grp" style="flex: 1">
              <input
                v-model="formData.liniTujuan"
                class="f-inp"
                style="width: 65px; background: #ddeeff"
                @keydown.enter.prevent="
                  ($event.target as HTMLInputElement).blur()
                "
                @blur="onLiniTujuanBlur"
              />
              <input
                :value="formData.liniTujuanNama"
                readonly
                class="f-inp f-ro"
                style="flex: 1"
              />
              <button
                type="button"
                class="btn-lkp"
                title="Cari Lini Tujuan"
                @click="showLiniTujuanModal = true"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
            <div class="f-row" v-if="showKelompokTujuan">
              <label class="f-lbl">Kelompok Tujuan</label>
              <select
                v-model="formData.kelompokTujuan"
                class="f-inp"
                style="flex: 1"
              >
                <option v-for="k in kelompokTujuanOptions" :key="k" :value="k">
                  {{ k }}
                </option>
              </select>
            </div>
          </div>

          <div class="f-row">
            <label class="f-lbl">Jumlah</label>
            <input
              type="number"
              v-model.number="formData.jumlahJasa"
              class="f-inp"
              style="width: 100px; background: #fff9c4"
              v-select-on-focus
            />
            <label class="chk-lbl ml-2">
              <input type="checkbox" v-model="formData.cmt" /> CMT
            </label>
          </div>

          <div class="f-row">
            <label class="f-lbl">Kelompok</label>
            <input
              v-model="formData.kelompok"
              list="kelompok-options"
              class="f-inp"
              style="flex: 1"
              placeholder="Pilih dari daftar atau ketik manual..."
            />
            <datalist id="kelompok-options">
              <option v-for="k in kelompokOptions" :key="k" :value="k" />
            </datalist>
          </div>

          <div class="f-row">
            <label class="f-lbl">Supplier Kain</label>
            <div class="inp-grp" style="flex: 1">
              <input
                v-model="formData.supKode"
                class="f-inp"
                style="width: 65px; background: #ddeeff"
                @keydown.enter.prevent="
                  ($event.target as HTMLInputElement).blur()
                "
                @blur="onSupKodeBlur"
              />
              <input
                :value="formData.supNama"
                readonly
                class="f-inp f-ro"
                style="flex: 1"
              />
              <button
                type="button"
                class="btn-lkp"
                title="Cari Supplier"
                @click="showSupplierModal = true"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
          </div>

          <div class="f-row align-start">
            <label class="f-lbl" style="padding-top: 4px">Keterangan</label>
            <textarea
              v-model="formData.keterangan"
              class="f-inp"
              style="flex: 1; height: 36px; padding: 4px; resize: none"
            ></textarea>
          </div>

          <div class="divider" />

          <div class="babaran-box" :class="{ 'babaran-active': perluMaterial }">
            <div class="f-row">
              <label class="f-lbl">Komponen</label>
              <select
                ref="komponenSelectRef"
                v-model="formData.komponen"
                class="f-inp"
                style="flex: 1"
                @change="onKomponenChange"
              >
                <option value="">Pilih...</option>
                <option v-for="k in komponenOptions" :key="k" :value="k">
                  {{ k }}
                </option>
              </select>
              <label class="f-lbl ml-2" style="width: 70px">Berat Kain</label>
              <input
                type="number"
                v-model.number="formData.qtyBerat"
                class="f-inp text-right"
                style="width: 90px"
                v-select-on-focus
                @blur="onBeratBlur"
              />
              <select
                v-model="formData.satBerat"
                class="f-inp ml-1"
                style="width: 60px"
              >
                <option value="KG">KG</option>
                <option value="MTR">MTR</option>
              </select>
            </div>
            <div class="f-row">
              <label class="f-lbl">Babaran STD</label>
              <input
                :value="rp(formData.babaranStd)"
                readonly
                class="f-inp f-ro text-right"
                style="width: 90px"
              />
              <label class="f-lbl ml-2" style="width: 70px">Babaran</label>
              <input
                :value="babaranPreview.toFixed(2)"
                readonly
                class="f-inp f-ro text-right"
                style="width: 90px"
              />
              <label class="f-lbl ml-2" style="width: 55px">Selisih</label>
              <input
                :value="selisihBabaranPreview.toFixed(2)"
                readonly
                class="f-inp f-ro text-right"
                :style="{
                  width: '90px',
                  color: selisihBabaranPreview < 0 ? '#c62828' : '#2e7d32',
                  fontWeight: 700,
                }"
              />
            </div>
            <div class="f-row">
              <label class="f-lbl">Alasan</label>
              <input
                v-model="formData.alasan"
                class="f-inp"
                style="flex: 1"
                placeholder="Wajib diisi kalau Selisih < 0"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="sj-section">
        <div class="sec-header">
          <span class="sec-title" style="margin: 0">Detail Bahan</span>
          <button type="button" class="btn-add" @click="openBahanModal">
            <IconPlus :size="13" class="mr-1" /> Tambah Bahan
          </button>
        </div>
        <div class="grid-scroll">
          <table class="grid-table">
            <thead>
              <tr>
                <th style="width: 28px">No</th>
                <th style="width: 100px">Kode</th>
                <th>Komponen</th>
                <th style="width: 60px">Satuan</th>
                <th style="width: 60px">Size</th>
                <th style="width: 75px" class="tr">Jml PO</th>
                <th style="width: 80px" class="tr bg-yellow">Jumlah</th>
                <th style="width: 60px" class="tr">BS Lini</th>
                <th style="width: 65px" class="tr">BS Sablon</th>
                <th style="width: 60px" class="tr">BS Kain</th>
                <th style="width: 75px" class="tr">Sudah SJ</th>
                <th style="width: 65px" class="tr">Kurang</th>
                <th style="width: 55px" class="tr">Koli</th>
                <th style="width: 120px">Keterangan</th>
                <th style="width: 32px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, idx) in formData.detail" :key="idx">
                <td class="tc">{{ Number(idx) + 1 }}</td>
                <td class="p0">
                  <input
                    type="text"
                    v-model="d.kode"
                    class="gi"
                    :class="{ 'gi-ro': !!d.nama }"
                    :readonly="!!d.nama"
                    placeholder="F1 / ketik kode"
                    style="text-transform: uppercase"
                    @keydown="onKodeKeydown($event, Number(idx))"
                    @keydown.enter.prevent="onKodeEnter(Number(idx))"
                  />
                </td>
                <td>
                  {{ d.nama }}
                  <span v-if="d.new" class="badge-new">BARU</span>
                </td>
                <td class="tc">{{ d.satuan }}</td>
                <td class="tc">{{ d.size || "-" }}</td>
                <td class="tr">{{ d.nama ? rp(d.jumlahpo) : "" }}</td>
                <td class="p0">
                  <input
                    type="number"
                    v-model.number="d.jumlah"
                    class="gi tr"
                    :disabled="!d.nama"
                    v-select-on-focus
                    @input="onJumlahInput(d)"
                  />
                </td>
                <td class="p0">
                  <input
                    type="number"
                    v-model.number="d.bs"
                    class="gi tr"
                    :disabled="!d.nama"
                    v-select-on-focus
                  />
                </td>
                <td class="p0">
                  <input
                    type="number"
                    v-model.number="d.sablon"
                    class="gi tr"
                    :disabled="!d.nama"
                    v-select-on-focus
                  />
                </td>
                <td class="p0">
                  <input
                    type="number"
                    v-model.number="d.kain"
                    class="gi tr"
                    :disabled="!d.nama"
                    v-select-on-focus
                  />
                </td>
                <td class="tr">{{ d.nama ? rp(d.sudahsj) : "" }}</td>
                <td
                  class="tr"
                  :style="{ color: d.nama && d.kurang < 0 ? '#c62828' : '' }"
                >
                  {{ d.nama ? rp(d.kurang) : "" }}
                </td>
                <td class="p0">
                  <input
                    type="number"
                    v-model.number="d.koli"
                    class="gi tr"
                    :disabled="!d.nama"
                    v-select-on-focus
                  />
                </td>
                <td class="p0">
                  <input
                    type="text"
                    v-model="d.ket"
                    class="gi"
                    :disabled="!d.nama"
                  />
                </td>
                <td class="tc">
                  <button
                    v-if="d.nama"
                    type="button"
                    class="btn-del"
                    :class="{ 'btn-del-disabled': !d.new }"
                    :title="
                      d.new
                        ? 'Hapus baris'
                        : 'Komponen bawaan PO tidak bisa dihapus'
                    "
                    @click="removeDetail(Number(idx))"
                  >
                    <IconTrash :size="13" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </BaseForm>

  <PoInternalSpkSearchModal v-model="showPoModal" @selected="onPoSelected" />
  <BahanSearchModal
    v-model="showBahanModal"
    mode="komponen"
    @selected="onBahanSelected"
  />
  <RealisasiMintaSearchModal
    v-model="showMaterialModal"
    :nomor-spk="formData.nomorSpk"
    @selected="onMaterialSelected"
  />
  <HistoryPakaiMaterialModal
    v-model="showHistoryModal"
    :no-material="formData.noMaterial"
    :kode-bahan="formData.kodeKain"
    :exclude-nomor="formData.nomor"
  />
  <GudangProduksiSearchModal
    v-model="showLiniAsalModal"
    :cabang="formData.gdgAsalKode"
    @selected="onLiniAsalSelected"
  />
  <GudangProduksiSearchModal
    v-model="showLiniTujuanModal"
    :cabang="formData.gdgAsalKode"
    @selected="onLiniTujuanSelected"
  />
  <SupplierSearchModal
    v-model="showSupplierModal"
    @selected="onSupplierSelected"
  />

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3 text-subtitle-1 font-weight-bold"
      >
        Simpan Berhasil
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        Surat Jalan <b>{{ savedNomor }}</b> telah tersimpan.<br />
        Apakah Anda ingin mencetak dokumen ini sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="closePrintAndExit"
          >Tutup</v-btn
        >
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doCetak">
          <template #prepend
            ><IconPrinter :size="15" :stroke-width="1.7"
          /></template>
          Ya, Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.sj-layout {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  overflow-y: auto;
  height: 100%;
  box-sizing: border-box;
}

.sj-header-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.sj-header-row > .sj-section {
  flex: 1;
  min-width: 0;
}

.sj-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
}

.sec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1565c0;
  margin-bottom: 6px;
}

.f-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  min-height: 26px;
}
.align-start {
  align-items: flex-start;
}
.f-lbl {
  width: 90px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}
.chk-lbl {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #333;
}

.f-inp,
select.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: white;
  font-family: inherit;
  box-sizing: border-box;
  color: #212121;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.f-date {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  outline: none;
  background: white;
  box-sizing: border-box;
}
.text-right {
  text-align: right;
}

.inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  background: white;
}
.inp-grp .f-inp {
  border: none;
  height: 24px;
  border-radius: 0;
}
.btn-lkp {
  width: 26px;
  min-width: 26px;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.btn-lkp:hover {
  background: #bbdefb;
}

.divider {
  height: 1px;
  background: #eeeeee;
  margin: 6px 0;
}

.hint-new {
  font-size: 10px;
  color: #d32f2f;
  font-style: italic;
  font-weight: 600;
  white-space: nowrap;
}
.gbr-badge {
  display: inline-flex;
  align-items: center;
}

.babaran-box {
  border: 1px dashed #cfd8dc;
  border-radius: 4px;
  padding: 6px 8px 0;
}
.babaran-box.babaran-active {
  border-color: #f9a825;
  background: #fffef7;
}

.btn-add {
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
  border-radius: 3px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.btn-add:hover {
  background: #bbdefb;
}

.grid-scroll {
  overflow-x: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.grid-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.grid-table thead th {
  background: #455a64;
  color: white;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  padding: 6px 7px;
  white-space: nowrap;
}
.grid-table th.bg-yellow {
  background: #f9a825;
  color: #4a2e00;
}
.grid-table td {
  border-bottom: 1px solid #eeeeee;
  border-right: 1px solid #f0f0f0;
  padding: 4px 7px;
  vertical-align: middle;
  white-space: nowrap;
}
.grid-table tbody tr:hover td {
  background: #f5f5f5;
}
.p0 {
  padding: 0 !important;
}
.gi {
  width: 100%;
  height: 26px;
  border: none;
  background: transparent;
  padding: 0 7px;
  outline: none;
  font-size: 11px;
  box-sizing: border-box;
}
.gi:focus {
  background: #fffde7;
  box-shadow: inset 0 0 0 1.5px #f9a825;
}
.gi-ro {
  background: #f5f5f5 !important;
  color: #616161;
}
.gi:disabled {
  background: #fafafa;
  color: #bbb;
}

.badge-new {
  font-size: 8.5px;
  font-weight: 700;
  color: #2e7d32;
  background: #e8f5e9;
  border-radius: 3px;
  padding: 1px 4px;
  margin-left: 4px;
}

.btn-del {
  color: #c62828;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.btn-del:hover {
  background: #ffebee;
}
.btn-del-disabled {
  color: #ccc;
  cursor: not-allowed;
}
.btn-del-disabled:hover {
  background: transparent;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.ml-1 {
  margin-left: 4px;
}
.ml-2 {
  margin-left: 8px;
}
.mr-1 {
  margin-right: 4px;
}
</style>
