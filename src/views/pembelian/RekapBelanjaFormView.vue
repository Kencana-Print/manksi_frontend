<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import {
  poBahanFormService,
  type MbbOutstandingRow,
  type RekapItemPayload,
  type RekapDeliveryPayload,
  type RekapSavePayload,
} from "@/services/pembelian/poBahanFormService";
import { pesanError } from "@/services/piutang/rekapPembayaranService";
import { IconShoppingCartPlus, IconSearch, IconLock } from "@tabler/icons-vue";

import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import MppbSearchModal from "@/components/lookups/MppbSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import MkbSearchModal from "@/components/lookups/MkbSearchModal.vue";
import MbbSearchModal from "@/components/lookups/MbbSearchModal.vue";

// ── Tipe ──
interface BarisForm {
  nomor: string;
  nourut: number;
  kode: string;
  nama: string;
  namaext: string;
  satuan: string;
  gramasiAwal: string;
  gramasi: string;
  setting: string;
  jenis: string;
  jumlah: number;
  harga: number;
  diskon: number;
  ppn: number;
  spk: string;
  mkb: string;
  mppb: string;
  tglMppb: string;
  jmlMppb: number;
  supKode: string;
  supNama: string;
  terkunci: boolean;
  kunciStruktur: boolean;
}

interface DeliveryForm {
  tanggal: string;
  jumlah: number;
  kode: string;
  nama: string;
  supKode: string;
  supNama: string;
}

interface PoInfo {
  nomor: string;
  tanggal: string;
  supKode: string;
  supNama: string;
  terkunci: boolean;
  alasanKunci: string;
  adaQc: boolean;
}

interface RekapItemRaw {
  nomor: string;
  nourut: number | string;
  kode: string;
  nama: string;
  namaext: string;
  satuan: string;
  gramasiAwal: string;
  gramasi: string;
  setting: string;
  jenis: string;
  jumlah: number | string;
  harga: number | string;
  diskon: number | string;
  ppn: number | string;
  spk: string;
  mkb: string;
  mppb: string;
  tglMppb: string | null;
  jmlMppb: number | string;
  supKode: string;
  supNama: string;
  terkunci: boolean;
  kunciStruktur: boolean;
}

interface RekapDeliveryRaw {
  tanggal: string;
  jumlah: number | string;
  kode: string;
  nama: string;
  supKode: string;
  supNama: string;
}

interface RekapGrupRaw {
  grup: string;
  header: {
    po_tanggal: string;
    po_keterangan: string;
    po_note: string;
    po_mbb_nomor: string;
  };
  pos: PoInfo[];
  items: RekapItemRaw[];
  delivery: RekapDeliveryRaw[];
}

interface SaveResponse {
  data?: { data?: { nomorList?: { nomor: string; supKode: string }[] } };
}

interface SupplierPick {
  Kode?: string;
  sup_kode?: string;
  Nama?: string;
  sup_nama?: string;
}

interface BahanPick {
  Kode?: string;
  bhn_kode?: string;
  Nama?: string;
  bhn_name?: string;
  Satuan?: string;
  bhn_satuan?: string;
  Gramasi?: string;
  Setting?: string;
  Jenis?: string;
  Harga?: number | string;
  bhn_hargabeli?: number | string;
}

interface SpkPick {
  Nomor?: string;
  spk_nomor?: string;
}

interface MkbPick {
  Nomor?: string;
  mkb_nomor?: string;
}

interface MkbDetailItem {
  kode: string;
  nama: string;
  namaext: string;
  satuan: string;
  gramasi: string;
  setting: string;
  jenis: string;
  jumlah: number | string;
  harga: number | string;
  spk?: string;
}

interface BarisHitung {
  jumlah?: number;
  harga?: number;
  diskon?: number;
  ppn?: number;
}

const authStore = useAuthStore();
const route = useRoute();
const toast = useToast();

const izinOk = computed(
  () =>
    authStore.user?.flags.lihatSup === 1 &&
    authStore.user?.flags.lihatBeli === 1,
);

const isEditMode = computed(() => !!route.params.nomor);

const formatDateLocal = (value?: string | Date | null) => {
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
const todayLocal = formatDateLocal(new Date());

// ── Modal state ──
const showMbbModal = ref(false);
const showBahanModal = ref(false);
const showSpkModal = ref(false);
const showMkbModal = ref(false);
const showMppbModal = ref(false);
const showSupRowModal = ref(false);
const activeGridIndex = ref(-1);
const activeSupIdx = ref(-1);
const activeDeliveryIdx = ref(-1);

// ── Default data ──
const defaultData = {
  header: {
    po_nomor: "",
    po_tanggal: todayLocal,
    po_keterangan: "",
    po_note: "",
    po_mbb_nomor: "",
  },
  items: [] as BarisForm[],
  delivery: [] as DeliveryForm[],
  pos: [] as PoInfo[],
};
type FormState = typeof defaultData;

const barisKosong = (): BarisForm => ({
  nomor: "",
  nourut: 0,
  kode: "",
  nama: "",
  namaext: "",
  satuan: "",
  gramasiAwal: "",
  gramasi: "",
  setting: "",
  jenis: "",
  jumlah: 0,
  harga: 0,
  diskon: 0,
  ppn: 0,
  spk: "",
  mkb: "",
  mppb: "",
  tglMppb: "",
  jmlMppb: 0,
  supKode: "",
  supNama: "",
  terkunci: false,
  kunciStruktur: false,
});

function hitungTotal(r: BarisHitung): number {
  return (
    (Number(r.jumlah) || 0) *
    (Number(r.harga) || 0) *
    (1 - (Number(r.diskon) || 0) / 100)
  );
}

const {
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  executeSave,
  executeCancel,
  executeClose,
  goBack,
} = useForm({
  menuId: "972",
  initialData: defaultData,
  fetchApi: async (): Promise<FormState> => {
    const res = await poBahanFormService.getRekap(String(route.params.nomor));
    const d: RekapGrupRaw = res.data.data;
    return {
      header: {
        po_nomor: d.grup,
        po_tanggal: formatDateLocal(d.header.po_tanggal) || todayLocal,
        po_keterangan: d.header.po_keterangan || "",
        po_note: d.header.po_note || "",
        po_mbb_nomor: d.header.po_mbb_nomor || "",
      },
      items: d.items.map(
        (r): BarisForm => ({
          nomor: r.nomor,
          nourut: Number(r.nourut) || 0,
          kode: r.kode || "",
          nama: r.nama || "",
          namaext: r.namaext || r.nama || "",
          satuan: r.satuan || "",
          gramasiAwal: r.gramasiAwal || "",
          gramasi: r.gramasi || "",
          setting: r.setting || "",
          jenis: r.jenis || "",
          jumlah: Number(r.jumlah) || 0,
          harga: Number(r.harga) || 0,
          diskon: Number(r.diskon) || 0,
          ppn: Number(r.ppn) || 0,
          spk: r.spk || "",
          mkb: r.mkb || "",
          mppb: r.mppb || "",
          tglMppb: formatDateLocal(r.tglMppb),
          jmlMppb: Number(r.jmlMppb) || 0,
          supKode: r.supKode || "",
          supNama: r.supNama || "",
          terkunci: !!r.terkunci,
          kunciStruktur: !!r.kunciStruktur,
        }),
      ),
      delivery: d.delivery.map(
        (r): DeliveryForm => ({
          tanggal: formatDateLocal(r.tanggal) || todayLocal,
          jumlah: Number(r.jumlah) || 0,
          kode: r.kode || "",
          nama: r.nama || "",
          supKode: r.supKode || "",
          supNama: r.supNama || "",
        }),
      ),
      pos: d.pos,
    };
  },
  submitApi: async (data: FormState) => {
    const items: RekapItemPayload[] = data.items
      .filter((r) => r.kode.trim() !== "" && !r.terkunci)
      .map((r) => ({
        ...(r.nomor ? { nomor: r.nomor, nourut: r.nourut } : {}),
        kode: r.kode,
        namaext: r.namaext,
        satuan: r.satuan,
        gramasi: r.gramasi,
        gramasiAwal: r.gramasiAwal,
        setting: r.setting,
        jumlah: Number(r.jumlah) || 0,
        harga: Number(r.harga) || 0,
        diskon: Number(r.diskon) || 0,
        ppn: Number(r.ppn) || 0,
        spk: r.spk.trim(),
        mkb: r.mkb,
        mppb: r.mppb,
        supKode: r.supKode,
      }));

    const delivery: RekapDeliveryPayload[] = data.delivery
      .filter((d) => !lockedSup.value.has(d.supKode))
      .map((d) => ({
        tanggal: d.tanggal,
        jumlah: Number(d.jumlah) || 0,
        kode: d.kode,
        supKode: d.supKode,
      }));

    const payload: RekapSavePayload = {
      isEdit: isEditMode.value,
      nomor: isEditMode.value ? String(route.params.nomor) : undefined,
      header: {
        po_tanggal: data.header.po_tanggal,
        po_keterangan: data.header.po_keterangan,
        po_note: data.header.po_note,
        po_mbb_nomor: data.header.po_mbb_nomor,
      },
      items,
      delivery,
    };
    return await poBahanFormService.saveRekap(payload);
  },
  onSuccess: (res: unknown) => {
    const hasil = res as SaveResponse;
    const daftar = (hasil.data?.data?.nomorList || []).map((n) => n.nomor);
    toast.success(`Rekap Belanja tersimpan: ${daftar.join(", ")}`);
    formData.value = JSON.parse(JSON.stringify(defaultData));
    goBack();
  },
});

// ── Turunan ──
const lockedSup = computed(
  () =>
    new Set(
      formData.value.pos
        .filter((p) => p.terkunci && p.supKode)
        .map((p) => p.supKode),
    ),
);
const semuaTerkunci = computed(
  () =>
    formData.value.pos.length > 0 &&
    formData.value.pos.every((p) => p.terkunci),
);
const jumlahSupplier = computed(
  () =>
    new Set(
      formData.value.items
        .filter((r) => r.kode && r.supKode && !r.terkunci)
        .map((r) => r.supKode),
    ).size,
);
const alasanPo = (nomor: string) =>
  formData.value.pos.find((p) => p.nomor === nomor)?.alasanKunci || "";
const deliveryTerkunci = (d: DeliveryForm) => lockedSup.value.has(d.supKode);

const subTotal = computed(() =>
  formData.value.items.reduce((s, r) => s + hitungTotal(r), 0),
);
const ppnValue = computed(() =>
  formData.value.items.reduce(
    (s, r) => s + hitungTotal(r) * ((Number(r.ppn) || 0) / 100),
    0,
  ),
);
const grandTotal = computed(() => subTotal.value + ppnValue.value);
const fmt = (n: number) => n.toLocaleString("id-ID");

// ── Baris trailing kosong (pola MKB) ──
const addItem = () => formData.value.items.push(barisKosong());

watch(
  () => formData.value.items,
  (rows) => {
    if (!rows || rows.length === 0) {
      addItem();
      return;
    }
    const lastRow = rows[rows.length - 1];
    if (lastRow.kode || lastRow.nama) addItem();
  },
  { deep: true, immediate: true },
);

const removeItem = (i: number) => {
  const r = formData.value.items[i];
  if (r.terkunci || r.kunciStruktur) return;
  if (formData.value.items.length === 1 && !r.kode) return;
  formData.value.items.splice(i, 1);
};

// ── Bahan ──
const openLookupBahan = (i: number) => {
  activeGridIndex.value = i;
  activeDeliveryIdx.value = -1;
  showBahanModal.value = true;
};
const setBahan = (v: BahanPick) => {
  const i = activeGridIndex.value;
  if (i < 0) return;
  const r = formData.value.items[i];
  const nama = v.Nama || v.bhn_name || "";
  r.kode = v.Kode || v.bhn_kode || "";
  r.nama = nama;
  r.namaext = nama;
  r.satuan = v.Satuan || v.bhn_satuan || "";
  r.gramasi = v.Gramasi || "";
  r.gramasiAwal = v.Gramasi || "";
  r.setting = v.Setting || "";
  r.jenis = v.Jenis || "";
  r.harga = Number(v.Harga || v.bhn_hargabeli) || 0;
};

// Supplier yang memesan bahan ini di baris rekap (untuk dropdown Delivery)
const supplierOptions = (kodeBahan: string) => {
  const peta = new Map<string, string>();
  for (const r of formData.value.items) {
    if (r.kode === kodeBahan && r.supKode && !peta.has(r.supKode))
      peta.set(r.supKode, r.supNama || r.supKode);
  }
  return [...peta].map(([kode, nama]) => ({ kode, nama }));
};

const setBahanHandler = (v: BahanPick) => {
  if (activeDeliveryIdx.value >= 0) {
    const d = formData.value.delivery[activeDeliveryIdx.value];
    d.kode = v.Kode || v.bhn_kode || "";
    d.nama = v.Nama || v.bhn_name || "";
    const opsi = supplierOptions(d.kode);
    d.supKode = opsi.length === 1 ? opsi[0].kode : "";
    d.supNama = opsi.length === 1 ? opsi[0].nama : "";
    activeDeliveryIdx.value = -1;
  } else {
    setBahan(v);
  }
};

// ── Supplier per baris ──
const openLookupSupRow = (i: number) => {
  activeSupIdx.value = i;
  showSupRowModal.value = true;
};
const setSupRow = (v: SupplierPick) => {
  const i = activeSupIdx.value;
  if (i < 0) return;
  const kode = v.Kode || v.sup_kode || "";
  const r = formData.value.items[i];
  r.supKode = kode;
  r.supNama = v.Nama || v.sup_nama || "";
  // Supplier yang sama biasanya ketentuan PPN-nya sama: salin dari baris lain
  const acuan = formData.value.items.find(
    (x, j) => j !== i && x.kode && x.supKode === kode,
  );
  if (acuan) r.ppn = Number(acuan.ppn) || 0;
  activeSupIdx.value = -1;
};

// ── SPK/MAP ──
const openLookupSpk = (i: number) => {
  activeGridIndex.value = i;
  showSpkModal.value = true;
};
const setSpk = (v: SpkPick) => {
  if (activeGridIndex.value >= 0)
    formData.value.items[activeGridIndex.value].spk =
      v.Nomor || v.spk_nomor || "";
};

// ── MKB ──
const openLookupMkb = (i: number) => {
  activeGridIndex.value = i;
  showMkbModal.value = true;
};
const setMkb = async (v: MkbPick) => {
  const mkbNomor = v.Nomor || v.mkb_nomor || "";
  const idx = activeGridIndex.value;
  if (idx < 0 || !mkbNomor) return;

  try {
    const res = await poBahanFormService.getDetailMkb(mkbNomor);
    const warnings: string[] = res.data.data.warnings;
    const items: MkbDetailItem[] = res.data.data.items;

    for (const msg of warnings) {
      if (!window.confirm(msg)) {
        formData.value.items[idx].mkb = "";
        return;
      }
    }

    if (items.length === 0) {
      toast.info("Tidak ada item bahan di MKB tersebut.");
      formData.value.items[idx].mkb = mkbNomor;
      return;
    }

    items.forEach((item, i) => {
      const targetIdx = i === 0 ? idx : formData.value.items.length;
      if (i > 0) addItem();
      const row = formData.value.items[targetIdx];
      row.kode = item.kode;
      row.nama = item.nama;
      row.namaext = item.namaext;
      row.satuan = item.satuan;
      row.gramasiAwal = "";
      row.gramasi = item.gramasi;
      row.setting = item.setting;
      row.jenis = item.jenis;
      row.jumlah = Number(item.jumlah) || 0;
      row.harga = Number(item.harga) || 0;
      row.diskon = 0;
      row.spk = item.spk || "";
      row.mkb = mkbNomor;
    });

    toast.success("Berhasil menarik detail bahan dari MKB.");
  } catch (e) {
    toast.error(pesanError(e, "Gagal memuat detail MKB."));
    formData.value.items[idx].mkb = "";
  }
};

// ── MPPB per baris ──
const resetMppbInfo = (i: number) => {
  const r = formData.value.items[i];
  r.tglMppb = "";
  r.jmlMppb = 0;
};

const cekMppbRow = async (i: number, nomorInput?: string) => {
  const r = formData.value.items[i];
  const nomor = String(nomorInput ?? r.mppb ?? "").trim();
  if (!nomor) {
    r.mppb = "";
    resetMppbInfo(i);
    return;
  }
  try {
    const res = await poBahanFormService.validateField("mppb", nomor, r.nomor);
    r.mppb = nomor;
    r.tglMppb = formatDateLocal(res.data.data.data.tanggal);
    r.jmlMppb = Number(res.data.data.data.jumlah) || 0;
    const spkOtomatis = String(res.data.data.data.spk || "");
    if (!r.spk.trim() && spkOtomatis) r.spk = spkOtomatis;
  } catch (e) {
    toast.error(pesanError(e, "Gagal memvalidasi MPPB."));
    r.mppb = "";
    resetMppbInfo(i);
  }
};

const openLookupMppb = (i: number) => {
  activeGridIndex.value = i;
  showMppbModal.value = true;
};
const onMppbRowKeydown = (e: KeyboardEvent, i: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openLookupMppb(i);
  }
};
const setMppbRow = (v: { Nomor?: string; mpb_nomor?: string }) => {
  const i = activeGridIndex.value;
  const nomor = v.Nomor || v.mpb_nomor || "";
  if (i < 0 || !nomor) return;
  cekMppbRow(i, nomor);
};

// ── Permintaan Pembelian Bahan (header): satu rekap satu permintaan ──
const onMbbSelected = (rows: MbbOutstandingRow[]) => {
  if (rows.length === 0) return;
  const adaIsi = formData.value.items.some((r) => !!r.kode);
  if (
    adaIsi &&
    !window.confirm(
      "Baris bahan yang sudah ada akan diganti dengan isi permintaan. Lanjutkan?",
    )
  )
    return;

  formData.value.header.po_mbb_nomor = rows[0].nomor;
  formData.value.items = rows.map((m) => {
    const row = barisKosong();
    row.kode = m.kode;
    row.nama = m.nama;
    row.namaext = m.nama;
    row.satuan = m.satuan;
    row.gramasiAwal = m.gramasi;
    row.gramasi = m.gramasi;
    row.setting = m.setting;
    row.jenis = m.jenis;
    row.harga = Number(m.harga) || 0;
    row.jumlah = Number(m.sisa) || 0;
    return row;
  });
  formData.value.delivery = [];
  toast.success(
    `${rows.length} baris diambil dari permintaan ${rows[0].nomor}.`,
  );
};

const clearMbb = () => {
  formData.value.header.po_mbb_nomor = "";
  toast.info("Tautan ke permintaan dilepas. Baris bahan tetap ada.");
};

// ── Delivery ──
const addDelivery = () =>
  formData.value.delivery.push({
    tanggal: todayLocal,
    jumlah: 0,
    kode: "",
    nama: "",
    supKode: "",
    supNama: "",
  });
const removeDelivery = (i: number) => {
  if (deliveryTerkunci(formData.value.delivery[i])) return;
  formData.value.delivery.splice(i, 1);
};
const openDeliveryBahan = (i: number) => {
  if (deliveryTerkunci(formData.value.delivery[i])) return;
  activeDeliveryIdx.value = i;
  activeGridIndex.value = -1;
  showBahanModal.value = true;
};

// ── Validasi ──
const validateSave = () => {
  if (!izinOk.value)
    return toast.warning(
      "Rekap Belanja hanya untuk user yang boleh melihat Supplier dan Harga Beli.",
    );
  if (semuaTerkunci.value)
    return toast.warning(
      "Semua PO di rekap ini terkunci, tidak ada yang bisa diubah.",
    );
  if (!formData.value.header.po_tanggal)
    return toast.warning("Tanggal harus diisi.");

  const semuaIsi = formData.value.items.filter((r) => r.kode.trim() !== "");
  const rows = semuaIsi.filter((r) => !r.terkunci);
  if (rows.length === 0)
    return toast.warning("Tidak ada detail, tidak dapat disimpan.");

  const seen = new Set<string>();
  for (const r of rows) {
    const no = `Baris ${formData.value.items.indexOf(r) + 1}`;
    if (!r.supKode) return toast.warning(`${no}: Supplier harus diisi.`);
    if (lockedSup.value.has(r.supKode))
      return toast.warning(
        `${no}: supplier ${r.supNama || r.supKode} sudah punya PO yang terkunci di rekap ini.`,
      );
    if (!r.spk.trim())
      return toast.warning(`${no}: Nomor SPK/MAP harus diisi.`);
    if ((Number(r.jumlah) || 0) <= 0)
      return toast.warning(`${no}: Jumlah PO harus diisi.`);
    if ((Number(r.harga) || 0) <= 0)
      return toast.warning(`${no}: Harga Beli harus diisi.`);
    const disc = Number(r.diskon) || 0;
    if (disc < 0 || disc > 100)
      return toast.warning(`${no}: Disc harus antara 0 dan 100.`);
    const p = Number(r.ppn) || 0;
    if (p < 0 || p > 100)
      return toast.warning(`${no}: PPN harus antara 0 dan 100.`);
    const kunci = `${r.kode}|${r.supKode}|${r.spk.trim().toUpperCase()}`;
    if (seen.has(kunci))
      return toast.warning(
        `${no}: Bahan ${r.kode} dengan supplier dan SPK/MAP yang sama dobel.`,
      );
    seen.add(kunci);
  }

  for (const [idx, d] of formData.value.delivery.entries()) {
    if (deliveryTerkunci(d)) continue;
    const no = `Delivery baris ${idx + 1}`;
    if (!d.tanggal) return toast.warning(`${no}: Tanggal harus diisi.`);
    if ((Number(d.jumlah) || 0) <= 0)
      return toast.warning(`${no}: Jumlah Commitment harus di isi.`);
    if (!d.kode) return toast.warning(`${no}: Bahan harus diisi.`);
    if (!d.supKode) return toast.warning(`${no}: Supplier harus dipilih.`);
    if (!semuaIsi.some((r) => r.kode === d.kode && r.supKode === d.supKode))
      return toast.warning(
        `${no}: Bahan ${d.kode} tidak dipesan ke supplier tersebut.`,
      );
  }

  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Rekap Belanja' : 'Buat Rekap Belanja'"
    menu-id="972"
    :icon="IconShoppingCartPlus"
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
    <template #left-column>
      <div class="po-left-container desktop-form-section header-section">
        <div v-if="!izinOk" class="warn">
          Form ini hanya bisa disimpan oleh user yang boleh melihat Supplier dan
          Harga Beli.
        </div>

        <div class="fr">
          <label class="lbl">Rekap</label
          ><input
            :value="formData.header.po_nomor"
            readonly
            class="inp ro flex-grow-0"
            style="width: 160px"
            placeholder="← Auto Generate"
          />
        </div>
        <div class="fr">
          <label class="lbl">Tanggal</label
          ><input
            type="date"
            v-model="formData.header.po_tanggal"
            class="idate"
            style="width: 160px"
          />
        </div>
        <div class="fr">
          <label class="lbl">Keterangan</label
          ><input
            v-model="formData.header.po_keterangan"
            class="inp flex-grow-1"
          />
        </div>

        <div class="fr">
          <label class="lbl">Permintaan</label>
          <div class="igrp" style="width: 160px">
            <input
              v-model="formData.header.po_mbb_nomor"
              class="inp ro"
              readonly
              placeholder="Opsional"
            />
            <button
              type="button"
              class="blkp"
              title="Pilih Permintaan Pembelian Bahan"
              :disabled="isEditMode"
              @click="showMbbModal = true"
            >
              <IconSearch :size="13" />
            </button>
          </div>
          <button
            v-if="formData.header.po_mbb_nomor && !isEditMode"
            type="button"
            class="btn-del"
            title="Lepas permintaan"
            @click="clearMbb"
          >
            ✕
          </button>
        </div>

        <div class="sep mt-1 mb-1" />

        <span class="hint">
          Supplier dan PPN diisi per baris bahan. Saat disimpan, rekap dipecah
          menjadi 1 PO per supplier.
        </span>
        <span class="hint fw">
          Supplier yang akan diproses: {{ jumlahSupplier }}
        </span>

        <template v-if="isEditMode && formData.pos.length > 0">
          <div class="sep mt-1 mb-1" />
          <span class="lbl fw" style="width: auto">PO dalam rekap ini</span>
          <div class="po-list">
            <div
              v-for="p in formData.pos"
              :key="p.nomor"
              class="po-item"
              :class="{ 'po-item-lock': p.terkunci }"
            >
              <div class="po-item-head">
                <span class="po-item-nomor">{{ p.nomor }}</span>
                <span
                  class="po-item-status"
                  :class="p.terkunci ? 'st-lock' : 'st-ok'"
                >
                  {{ p.terkunci ? "Terkunci" : "Bisa diubah" }}
                </span>
              </div>
              <div class="po-item-sup">{{ p.supNama || p.supKode || "-" }}</div>
              <div v-if="p.terkunci" class="po-item-alasan">
                {{ p.alasanKunci }}
              </div>
              <div v-else-if="p.adaQc" class="po-item-alasan">
                Sudah QC: bahan dan supplier tidak bisa diubah.
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>

    <template #right-column>
      <div class="po-right desktop-form-section">
        <div class="tbl-header">
          <span class="tbl-title">Detail Item Pembelian</span>
          <div>
            <button type="button" class="btn-add" @click="addItem">
              + Tambah Baris
            </button>
          </div>
        </div>
        <div
          class="tbl-wrap"
          style="flex: 1; min-height: 180px; max-height: 40vh; overflow-y: auto"
        >
          <table class="gt" style="min-width: 1780px">
            <thead>
              <tr>
                <th style="width: 35px" class="tc">No</th>
                <th style="width: 90px">Kode</th>
                <th style="width: 160px">Nama Bahan</th>
                <th style="width: 170px">Supplier *</th>
                <th style="width: 120px">Nama External</th>
                <th style="width: 50px" class="tc">Sat</th>
                <th style="width: 70px">Gramasi Awal</th>
                <th style="width: 70px">Gramasi Akhir</th>
                <th style="width: 50px">Setting</th>
                <th style="width: 80px">Jenis Bahan</th>
                <th style="width: 75px" class="tr bg-yellow">Jumlah</th>
                <th style="width: 80px" class="tr bg-yellow">Harga Beli</th>
                <th style="width: 50px" class="tr bg-yellow">Disc(%)</th>
                <th style="width: 60px" class="tr bg-yellow">PPN(%)</th>
                <th style="width: 100px" class="tr bg-blue">Total</th>
                <th style="width: 90px">SPK/MAP *</th>
                <th style="width: 90px">MKB</th>
                <th style="width: 110px">MPPB</th>
                <th style="width: 70px" class="tr">Jml MPPB</th>
                <th style="width: 110px">PO</th>
                <th style="width: 35px" class="tc">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in formData.items"
                :key="idx"
                :class="{ 'row-lock': row.terkunci }"
              >
                <td class="tc gt-lbl">{{ Number(idx) + 1 }}</td>
                <td class="p0">
                  <div class="cell-grp">
                    <input v-model="row.kode" class="ci" readonly />
                    <button
                      type="button"
                      class="ci-btn"
                      :disabled="row.terkunci || row.kunciStruktur"
                      :title="
                        row.kunciStruktur
                          ? 'PO sudah QC, bahan tidak boleh diganti'
                          : ''
                      "
                      @click="openLookupBahan(Number(idx))"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>
                <td class="p0">
                  <input v-model="row.nama" class="ci ro" readonly />
                </td>
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      :value="row.supNama"
                      :title="row.supKode"
                      class="ci ro"
                      readonly
                      placeholder="Pilih supplier"
                    />
                    <button
                      type="button"
                      class="ci-btn"
                      :disabled="row.terkunci || row.kunciStruktur"
                      :title="
                        row.kunciStruktur
                          ? 'PO sudah QC, supplier tidak boleh diganti'
                          : ''
                      "
                      @click="openLookupSupRow(Number(idx))"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>
                <td class="p0">
                  <input
                    v-model="row.namaext"
                    class="ci"
                    :readonly="row.terkunci"
                  />
                </td>
                <td class="p0">
                  <input v-model="row.satuan" class="ci tc ro" readonly />
                </td>
                <td class="p0">
                  <input
                    v-model="row.gramasiAwal"
                    class="ci"
                    placeholder="Manual"
                    :readonly="row.terkunci"
                  />
                </td>
                <td class="p0">
                  <input
                    v-model="row.gramasi"
                    class="ci"
                    placeholder="Manual"
                    :readonly="row.terkunci"
                  />
                </td>
                <td class="p0">
                  <input
                    v-model="row.setting"
                    class="ci"
                    :readonly="row.terkunci"
                  />
                </td>
                <td class="p0">
                  <input v-model="row.jenis" class="ci ro" readonly />
                </td>
                <td class="p0">
                  <input
                    v-model.number="row.jumlah"
                    type="number"
                    class="ci tr fw bg-yellow-light"
                    :readonly="row.terkunci"
                    v-select-on-focus
                  />
                </td>
                <td class="p0">
                  <input
                    v-model.number="row.harga"
                    type="number"
                    class="ci tr bg-yellow-light"
                    :readonly="row.terkunci"
                    v-select-on-focus
                  />
                </td>
                <td class="p0">
                  <input
                    v-model.number="row.diskon"
                    type="number"
                    class="ci tr bg-yellow-light"
                    :readonly="row.terkunci"
                    v-select-on-focus
                  />
                </td>
                <td class="p0">
                  <input
                    v-model.number="row.ppn"
                    type="number"
                    class="ci tr bg-yellow-light"
                    min="0"
                    max="100"
                    step="0.01"
                    :readonly="row.terkunci"
                    v-select-on-focus
                  />
                </td>
                <td class="p0">
                  <input
                    :value="fmt(hitungTotal(row))"
                    readonly
                    class="ci tr fw ro"
                  />
                </td>
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      v-model="row.spk"
                      class="ci"
                      :readonly="row.terkunci"
                    />
                    <button
                      type="button"
                      class="ci-btn"
                      :disabled="row.terkunci"
                      @click="openLookupSpk(Number(idx))"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      v-model="row.mkb"
                      class="ci"
                      :readonly="row.terkunci"
                    />
                    <button
                      type="button"
                      class="ci-btn"
                      :disabled="row.terkunci"
                      @click="openLookupMkb(Number(idx))"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      v-model="row.mppb"
                      class="ci"
                      :readonly="row.terkunci"
                      :title="row.tglMppb ? `Tgl MPPB: ${row.tglMppb}` : ''"
                      @input="resetMppbInfo(Number(idx))"
                      @keydown="onMppbRowKeydown($event, Number(idx))"
                      @keydown.enter.prevent="cekMppbRow(Number(idx))"
                    />
                    <button
                      type="button"
                      class="ci-btn"
                      :disabled="row.terkunci"
                      @click="openLookupMppb(Number(idx))"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>
                <td class="p0">
                  <input :value="row.jmlMppb || ''" readonly class="ci tr ro" />
                </td>
                <td class="p0">
                  <input
                    :value="row.nomor"
                    :title="row.terkunci ? alasanPo(row.nomor) : row.nomor"
                    readonly
                    class="ci ro"
                    placeholder="Baru"
                  />
                </td>
                <td class="tc">
                  <IconLock
                    v-if="row.terkunci || row.kunciStruktur"
                    :size="13"
                    :title="
                      row.terkunci
                        ? alasanPo(row.nomor)
                        : 'PO sudah QC, baris tidak boleh dihapus'
                    "
                  />
                  <button
                    v-else
                    type="button"
                    class="btn-del"
                    @click="removeItem(Number(idx))"
                    title="Hapus"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="bottom-row mt-2">
          <div class="bottom-panel" style="flex: 1.5; min-width: 350px">
            <div class="tbl-header teal">
              <span class="tbl-title">Delivery Commitment</span>
              <button type="button" class="btn-add" @click="addDelivery">
                + Tambah
              </button>
            </div>
            <div class="tbl-wrap" style="height: 145px">
              <table class="gt">
                <thead>
                  <tr>
                    <th style="width: 40px" class="tc">No</th>
                    <th style="width: 110px">Tanggal</th>
                    <th style="width: 80px" class="tr bg-yellow">Jumlah</th>
                    <th>Nama Bahan</th>
                    <th style="width: 110px">Kode</th>
                    <th style="width: 150px">Supplier</th>
                    <th style="width: 40px" class="tc"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(d, idx) in formData.delivery"
                    :key="idx"
                    :class="{ 'row-lock': deliveryTerkunci(d) }"
                  >
                    <td class="tc gt-lbl">{{ Number(idx) + 1 }}</td>
                    <td class="p0">
                      <input
                        type="date"
                        v-model="d.tanggal"
                        class="ci w-100"
                        :readonly="deliveryTerkunci(d)"
                      />
                    </td>
                    <td class="p0">
                      <input
                        v-model.number="d.jumlah"
                        type="number"
                        class="ci tr fw w-100"
                        :readonly="deliveryTerkunci(d)"
                        v-select-on-focus
                      />
                    </td>
                    <td class="p0">
                      <div class="cell-grp w-100">
                        <input v-model="d.nama" class="ci ro" readonly />
                        <button
                          type="button"
                          class="ci-btn"
                          :disabled="deliveryTerkunci(d)"
                          @click="openDeliveryBahan(Number(idx))"
                        >
                          <IconSearch :size="12" />
                        </button>
                      </div>
                    </td>
                    <td class="p0">
                      <input v-model="d.kode" class="ci ro w-100" readonly />
                    </td>
                    <td class="p0">
                      <select
                        v-model="d.supKode"
                        class="ci w-100"
                        :disabled="deliveryTerkunci(d)"
                      >
                        <option value="">— pilih —</option>
                        <option
                          v-for="s in supplierOptions(d.kode)"
                          :key="s.kode"
                          :value="s.kode"
                        >
                          {{ s.nama }}
                        </option>
                      </select>
                    </td>
                    <td class="tc">
                      <button
                        v-if="!deliveryTerkunci(d)"
                        type="button"
                        class="btn-del"
                        @click="removeDelivery(Number(idx))"
                        title="Hapus"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                  <tr v-if="formData.delivery.length === 0">
                    <td colspan="7" class="empty-row">
                      Belum ada delivery commitment.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div
            class="bottom-panel ml-auto"
            style="flex: 1; min-width: 280px; max-width: 350px"
          >
            <div class="note-wrap mb-1 h-100">
              <label class="lbl fw mb-1">Note</label>
              <textarea
                v-model="formData.header.po_note"
                class="ta"
                rows="2"
                style="flex: 1"
              ></textarea>
            </div>
            <div class="totals-box mt-1">
              <div class="total-row">
                <span>Sub Total</span>
                <input
                  :value="fmt(subTotal)"
                  readonly
                  class="inp ro text-right fw"
                />
              </div>
              <div class="total-row">
                <span>PPN</span>
                <input
                  :value="fmt(ppnValue)"
                  readonly
                  class="inp ro text-right fw"
                />
              </div>
              <div class="total-row grand">
                <span class="text-red">Grand Total</span>
                <input
                  :value="fmt(grandTotal)"
                  readonly
                  class="inp ro text-right fw text-red"
                  style="
                    font-size: 13px !important;
                    border-color: #f44336;
                    background: white !important;
                  "
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <SupplierSearchModal v-model="showSupRowModal" @selected="setSupRow" />
  <MppbSearchModal v-model="showMppbModal" @selected="setMppbRow" />
  <MbbSearchModal
    v-model="showMbbModal"
    :jenis="4"
    exclude=""
    @selected="onMbbSelected"
  />
  <BahanSearchModal v-model="showBahanModal" @selected="setBahanHandler" />
  <SpkSearchModal v-model="showSpkModal" @selected="setSpk" />
  <MkbSearchModal v-model="showMkbModal" @selected="setMkb" />
</template>

<style scoped>
.po-right {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
}
.po-left-container {
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
  width: 80px;
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
.mt-2 {
  margin-top: 8px;
}
.mb-1 {
  margin-bottom: 4px;
}
.ml-auto {
  margin-left: auto;
}
.text-red {
  color: #c62828;
}
.hint {
  font-size: 11px;
  color: #757575;
  font-style: italic;
}
.warn {
  background: #fff3e0;
  border: 1px solid #ffb74d;
  color: #e65100;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 11px;
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
.ro {
  background: #dde8f0 !important;
  color: #444 !important;
}
.text-right {
  text-align: right;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
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
.idate:focus {
  border-color: #1565c0;
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
  color: #000;
}
.blkp:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.flex-grow-1 {
  flex: 1;
}
.ta {
  width: 100%;
  border: 1px solid #a0a0a0;
  padding: 4px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  border-radius: 2px;
}
.ta:focus {
  border-color: #1565c0;
}

.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 6px 12px;
  border-radius: 4px 4px 0 0;
  flex-shrink: 0;
}
.tbl-header.teal {
  background: #00695c;
}
.tbl-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.btn-add {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 3px;
}
.btn-add:hover {
  background: rgba(255, 255, 255, 0.3);
}

.tbl-wrap {
  overflow: auto;
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
  border-radius: 0 0 4px 4px;
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
.gt thead th.bg-yellow {
  background: #fff9c4;
}
.gt thead th.bg-blue {
  background: #e3f2fd;
}
.gt tbody td {
  border: 1px solid #e0e0e0;
  height: 26px;
}
.gt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.gt tbody tr:hover td {
  background: #e3f2fd !important;
}
.gt tbody tr.row-lock td {
  background: #eceff1 !important;
  color: #757575;
}
.p0 {
  padding: 0 !important;
}
.gt-lbl {
  background: #f5f5f5 !important;
  color: #555;
  padding: 0 4px;
  font-size: 11px;
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
.ci.bg-yellow-light {
  background: #fffde7 !important;
}
.row-lock .ci {
  background: #eceff1 !important;
  color: #757575;
}
.ci:focus {
  background: #e3f2fd !important;
  outline: 1px solid #1976d2;
  outline-offset: -1px;
}
.ci.tc {
  text-align: center;
}
.ci.tr {
  text-align: right;
}
.ci.fw {
  font-weight: 700;
}
.w-100 {
  width: 100%;
}

.cell-grp {
  display: flex;
  align-items: center;
  height: 26px;
}
.cell-grp .ci {
  flex: 1;
}
.ci-btn {
  width: 24px;
  flex-shrink: 0;
  background: #eeeeee;
  border: none;
  border-left: 1px solid #e0e0e0;
  cursor: pointer;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}
.ci-btn:hover {
  background: #e0e0e0;
}
.ci-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  margin: 0 auto;
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

.po-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}
.po-item {
  border: 1px solid #e0e0e0;
  border-left: 3px solid #43a047;
  border-radius: 3px;
  padding: 4px 6px;
  background: white;
  min-width: 0;
  font-size: 11px;
}
.po-item-lock {
  border-left-color: #9e9e9e;
  background: #eceff1;
}
.po-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  flex-wrap: wrap;
}
.po-item-nomor {
  font-weight: 700;
  font-family: monospace;
}
.po-item-status {
  font-size: 11px;
  font-weight: 600;
}
.st-ok {
  color: #2e7d32;
}
.st-lock {
  color: #757575;
}
.po-item-sup {
  color: #212121;
  overflow-wrap: anywhere;
}
.po-item-alasan {
  color: #757575;
  font-style: italic;
  overflow-wrap: anywhere;
}

.bottom-row {
  display: flex;
  gap: 12px;
  align-items: stretch;
  flex-shrink: 0;
}
.bottom-panel {
  display: flex;
  flex-direction: column;
}
.note-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.note-wrap .lbl {
  width: auto;
  margin-bottom: 4px;
}
.totals-box {
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  overflow: hidden;
  background: #fffde7;
}
.total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  gap: 8px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.total-row:last-child {
  border-bottom: none;
}
.total-row.grand {
  background: #fff3e0;
}
.total-row .inp {
  width: 130px;
  flex-shrink: 0;
  padding: 2px 6px;
}
</style>
