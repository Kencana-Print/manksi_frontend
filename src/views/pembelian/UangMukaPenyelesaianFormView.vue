<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import GenericPickerModal from "@/components/lookups/GenericPickerModal.vue";
import AccountSearchModal from "@/components/lookups/AccountSearchModal.vue";
import CostCenterSearchModal from "@/components/lookups/CostCenterSearchModal.vue";
import {
  IconReceipt2,
  IconSearch,
  IconPlus,
  IconTrash,
  IconPrinter,
} from "@tabler/icons-vue";
import { uangMukaPenyelesaianFormService as uangMukaPenyelesaianApi } from "@/services/pembelian/uangMukaPenyelesaianFormService";

interface PenyelesaianDetail {
  pumd_id?: number;
  no: number;
  pjh: string;
  pmt: string;
  uraian: string;
  spesifikasi: string;
  satuan: string;
  qty_minta: number;
  qty: number;
  harga: number;
  total: number;
  verified: boolean;
  guna: string;
  ga: number;
  rekkode: string;
  reknama: string;
  cckode: number;
  ccnama: string;
  dcnama: string;
  statusFinance?: string;
  kdsup: string;
  supplier: string;
  bank: string;
  rekening: string;
  atasnama: string;
  gabrg: number;
  edit: number;
  pjh_link: string;
  kdbrg: string;
  mb: string;
  jenis_item: string;
  cab_item: string;
}

interface RealisasiFormState {
  nomor: string;
  jenis: "KAS" | "BANK";
  nomerator: string;
  tanggal: string;
  tgl_bkk: string;
  no_bkk: string;
  rek_kode: string;
  rek_nama: string;
  pjh_nomor: string;
  nota: string;
  nominal: number;
  penerima: string;
  keterangan: string;
  cabang: string;
  is_edit: boolean;
  info_permintaan: any;
  detail: PenyelesaianDetail[];
}

const route = useRoute();
const router = useRouter();
const toast = useToast();

const MENU_ID = "315";
const isLoading = ref(false);
const isSaving = ref(false);
const originalForm = ref<any>(null);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const showPrintDialog = ref(false);
const showPermintaanDialog = ref(false);
const savedNoBkk = ref("");

// ── State Modals Pjh ──────────────────────────────────────────────────
const activePjhIdx = ref(-1);

const showModalPjh = ref(false);
const showModalPoExt = ref(false);
const showModalVoucher = ref(false);
const showModalMb = ref(false);
const showModalIv = ref(false);

const optPjh = ref<any[]>([]);
const optPoExt = ref<any[]>([]);
const optVoucher = ref<any[]>([]);
const optMb = ref<any[]>([]);
const optIv = ref<any[]>([]);

// ── Form state ─────────────────────────────────────────────────────────
const today = new Date().toLocaleDateString("sv-SE");

const form = ref<RealisasiFormState>({
  nomor: "",
  jenis: "KAS",
  nomerator: "BKK",
  tanggal: today,
  tgl_bkk: today,
  no_bkk: "",
  rek_kode: "",
  rek_nama: "",
  pjh_nomor: "",
  nota: "",
  nominal: 0,
  penerima: "",
  keterangan: "",
  cabang: "P01",
  is_edit: false,
  info_permintaan: null,
  detail: [],
});

const columns = [
  { key: "no", label: "Kode" },
  { key: "pjh", label: "No.Pengajuan" },
  { key: "uraian", label: "Uraian" },
  { key: "spesifikasi", label: "Spesifikasi" },
  { key: "satuan", label: "Satuan" },
  { key: "qty_minta", label: "Qty Minta" },
  { key: "qty", label: "Qty Beli" },
  { key: "harga", label: "Nominal Satuan" },
  { key: "total", label: "Total" },
  // { key: "verified", label: "Ver" },
  { key: "status", label: "Status Realisasi" },
  { key: "rekkode", label: "Account" },
  { key: "reknama", label: "Nama Account" },
  { key: "cc", label: "Cost Center" },
  { key: "dc", label: "Detail CC" },
  { key: "guna", label: "Kegunaan" },
  { key: "kdsup", label: "Kd.Sup" },
  { key: "supplier", label: "Supplier" },
  { key: "bank", label: "Bank" },
  { key: "rekening", label: "Rekening" },
  { key: "atasnama", label: "Atas Nama" },
  { key: "jenis_item", label: "Jenis" },
  { key: "cab_item", label: "Cab" },
  { key: "kdbrg", label: "Kd.Brg" },
  { key: "aksi", label: "" },
];

// ── Lookup ─────────────────────────────────────────────────────────────
const accountOptions = ref<{ kode: string; nama: string; cabang: string }[]>(
  [],
);

onMounted(async () => {
  isLoading.value = true;
  try {
    const nomor = decodeURIComponent(route.params.nomor as string);
    const d = await uangMukaPenyelesaianApi.getFormData(nomor);

    Object.assign(form.value, d);
    originalForm.value = JSON.parse(JSON.stringify(d));

    accountOptions.value = await uangMukaPenyelesaianApi.getAccountOptions(
      d.jenis,
      d.cabang,
    );
  } catch (e: any) {
    if (e?.isAuthExpired) return;
    toast.error(e.response?.data?.message ?? "Gagal memuat data.");
    router.back();
  } finally {
    isLoading.value = false;
  }
});

// ── Total ──────────────────────────────────────────────────────────────
const totalKasbon = computed(() => form.value.nominal);
const totalTerpakai = computed(() =>
  form.value.detail.reduce(
    (s: number, d: PenyelesaianDetail) =>
      s + (d.verified && d.total > 0 ? d.total : 0),
    0,
  ),
);
const totalSisa = computed(() => totalKasbon.value - totalTerpakai.value);

const hitungTotal = (d: PenyelesaianDetail) => {
  d.total = d.qty * d.harga;
};

const onVerifiedChange = (d: PenyelesaianDetail) => {
  // Delphi: kalau uraian kosong → reset qty/harga, unverify
  if (!d.uraian.trim()) {
    d.verified = false;
    d.qty = 0;
    d.harga = 0;
    d.total = 0;
  }
  // hitungTotal tetap jalan
};

const cekDuplikatPjh = (nomor: string) => {
  return form.value.detail.some((d) => d.pjh === nomor);
};

const onPjhKeyDown = async (e: KeyboardEvent, idx: number) => {
  if (["F1", "F2", "F3", "F4", "F5"].includes(e.key)) {
    e.preventDefault(); // Blok fungsi bawaan browser (seperti Help atau Search)
    activePjhIdx.value = idx;

    try {
      if (e.key === "F1") {
        // Validasi Delphi: Jika ada pengajuan di header, tolak.
        if (form.value.pjh_nomor) {
          toast.warning(
            "Ada pengajuan GA di header. Tidak bisa menambah pengajuan GA di detail.",
          );
          return;
        }
        optPjh.value = await uangMukaPenyelesaianApi.getListPengajuanGA(
          form.value.cabang,
        );
        showModalPjh.value = true;
      } else if (e.key === "F2") {
        optPoExt.value = await uangMukaPenyelesaianApi.getListPoExternal();
        showModalPoExt.value = true;
      } else if (e.key === "F3") {
        optVoucher.value = await uangMukaPenyelesaianApi.getListVoucher();
        showModalVoucher.value = true;
      } else if (e.key === "F4") {
        optMb.value = await uangMukaPenyelesaianApi.getListPermintaanGarmen(
          form.value.cabang,
        );
        showModalMb.value = true;
      } else if (e.key === "F5") {
        optIv.value = await uangMukaPenyelesaianApi.getListInvoiceGarmen();
        showModalIv.value = true;
      }
    } catch {
      toast.error("Gagal mengambil data dari server.");
    }
  }
};

// ── Select Handlers (F2 & F3 mengisi baris saat ini) ──────────────────
const selectPoExt = (item: any) => {
  if (cekDuplikatPjh(item.nomor))
    return toast.warning("PO External tsb sudah di input");
  const d = form.value.detail[activePjhIdx.value];
  d.pjh = item.nomor;
  d.uraian = "DP PO External " + item.nomor;
  d.qty = 1;
  showModalPoExt.value = false;
};

const selectVoucher = (item: any) => {
  if (cekDuplikatPjh(item.nomor))
    return toast.warning("Nomor Voucher tsb sudah di input");
  const d = form.value.detail[activePjhIdx.value];
  d.pjh = item.nomor;
  d.uraian = "Pembayaran Jasa " + item.nomor;
  d.qty = 1;
  showModalVoucher.value = false;
};

// ── Select Handlers (F1, F4, F5 load banyak baris dari DB) ────────────
const loadDetailBaru = async (nomor: string, tipe: string) => {
  if (cekDuplikatPjh(nomor)) return toast.warning("Nomor tsb sudah di input");

  try {
    let detailTambahan: PenyelesaianDetail[] = [];

    // Gunakan fungsi detail yang spesifik
    if (tipe === "ga") {
      detailTambahan =
        await uangMukaPenyelesaianApi.getDetailPengajuanGA(nomor);
    } else if (tipe === "minta-garmen") {
      detailTambahan =
        await uangMukaPenyelesaianApi.getDetailPermintaanGarmen(nomor);
    } else if (tipe === "invoice-garmen") {
      detailTambahan =
        await uangMukaPenyelesaianApi.getDetailInvoiceGarmen(nomor);
    }

    // Hapus baris kosong yang sedang aktif jika uraian kosong
    if (!form.value.detail[activePjhIdx.value].uraian) {
      form.value.detail.splice(activePjhIdx.value, 1);
    }
    // Append data detail baru
    form.value.detail.push(...detailTambahan);
  } catch {
    toast.error("Gagal memuat detail.");
  }
};

const selectPjh = (item: any) => {
  loadDetailBaru(item.nomor, "ga");
  showModalPjh.value = false;
};

const selectMb = (item: any) => {
  loadDetailBaru(item.nomor, "minta-garmen");
  showModalMb.value = false;
};

const selectIv = (item: any) => {
  loadDetailBaru(item.invoice, "invoice-garmen");
  showModalIv.value = false;
};

// ── Search Modal: Account ─────────────────────────────────────────────
const showAccountModal = ref(false);
const onAccountSelected = (item: any) => {
  form.value.rek_kode = item.Kode;
  form.value.rek_nama = item.Nama;
  showAccountModal.value = false;
};

// ── Search Modal: Account per baris detail ────────────────────────────
const showDetailAccountModal = ref(false);
const activeDetailIdx = ref(-1);

const onDetailRekKodeEnter = async (idx: number) => {
  const d = form.value.detail[idx];
  const kode = d.rekkode.trim();
  if (!kode) {
    d.reknama = "";
    return;
  }
  // Delphi: tidak boleh sama dengan account header
  if (kode === form.value.rek_kode) {
    toast.warning("Account tidak boleh sama dengan Account header.");
    d.rekkode = "";
    d.reknama = "";
    return;
  }
  try {
    const acc = await uangMukaPenyelesaianApi.getAccountByKode(kode);
    if (!acc) {
      toast.warning("Kode account tidak ditemukan.");
      d.reknama = "";
      return;
    }
    d.rekkode = acc.kode;
    d.reknama = acc.nama;
  } catch {
    toast.error("Gagal mencari account.");
  }
};

const openDetAccountModal = (idx: number) => {
  activeDetailIdx.value = idx;
  showDetailAccountModal.value = true;
};

const onDetailAccountSelected = (item: any) => {
  if (activeDetailIdx.value < 0) return;
  const d = form.value.detail[activeDetailIdx.value];
  if (item.Kode === form.value.rek_kode) {
    toast.warning("Account tidak boleh sama dengan Account header.");
    return;
  }
  d.rekkode = item.Kode;
  d.reknama = item.Nama;
  showDetailAccountModal.value = false;
};

const onRekKodeEnter = async () => {
  const kode = form.value.rek_kode.trim();
  if (!kode) return;
  try {
    const acc = await uangMukaPenyelesaianApi.getAccountByKode(kode);
    if (!acc) {
      toast.warning("Kode account tidak ditemukan.");
      form.value.rek_nama = "";
      return;
    }
    form.value.rek_kode = acc.kode;
    form.value.rek_nama = acc.nama;
  } catch {
    toast.error("Gagal mencari account.");
  }
};

// ── Search Modal: Cost Center ─────────────────────────────────────────
const showCcModal = ref(false);
const activeCcIdx = ref(-1);
const openCcModal = (idx: number) => {
  activeCcIdx.value = idx;
  showCcModal.value = true;
};
const onCcSelected = (item: any) => {
  if (activeCcIdx.value < 0) return;
  const d = form.value.detail[activeCcIdx.value];
  d.cckode = item.cc_kode;
  d.ccnama = item.cc_nama;
  d.dcnama = item.dc_nama || "";
  showCcModal.value = false;
};

// ── Search Modal: Detail CC ───────────────────────────────────────────
const showDcModal = ref(false);
const activeDcIdx = ref(-1);
const dcOptions = ref<{ kode: number; nama: string }[]>([]);

const openDcModal = async (idx: number) => {
  activeDcIdx.value = idx;
  const d = form.value.detail[idx];
  if (!d.cckode) {
    toast.warning("Pilih Cost Center dahulu.");
    return;
  }
  dcOptions.value = await uangMukaPenyelesaianApi.getDcOptions(d.cckode);
  showDcModal.value = true;
};

const selectDc = (dc: any) => {
  if (activeDcIdx.value < 0) return;
  form.value.detail[activeDcIdx.value].dcnama = dc.nama;
  showDcModal.value = false;
};

// ── Search Modal: Supplier ────────────────────────────────────────────
const showSupplierModal = ref(false);
const activeSupIdx = ref(-1);
const supplierOptions = ref<any[]>([]);
const supplierLoading = ref(false);

const openSupplierModal = async (idx: number) => {
  activeSupIdx.value = idx;
  supplierLoading.value = true;
  showSupplierModal.value = true;
  try {
    supplierOptions.value =
      await uangMukaPenyelesaianApi.getSupplierOptions("");
  } finally {
    supplierLoading.value = false;
  }
};

const searchSupplier = async (query: string) => {
  supplierLoading.value = true;
  try {
    supplierOptions.value = await uangMukaPenyelesaianApi.getSupplierOptions(
      query || "",
    );
  } finally {
    supplierLoading.value = false;
  }
};

const onSupplierSelected = (sup: any) => {
  if (activeSupIdx.value < 0) return;
  const d = form.value.detail[activeSupIdx.value];
  d.kdsup = sup.kode;
  d.supplier = sup.nama;
  d.bank = sup.bank;
  d.rekening = sup.rekening;
  d.atasnama = sup.atasnama;
  showSupplierModal.value = false;
};

// ── Dialog Supplier Baru ───────────────────────────────────────────────
const showNewSupplierDialog = ref(false);
const isSavingSupplier = ref(false);
const newSupplierTargetIdx = ref(-1); // idx baris detail yang akan diisi setelah create

const newSupplierForm = ref({
  Nama: "",
  Alamat: "",
  Kota: "",
  Telp: "",
  Hp: "",
  Fax: "",
  Contact: "",
  NpwpKode: "",
  NpwpNama: "",
  NpwpAlamat: "",
  NpwpKota: "",
  Top: 0,
  TargetMitra: 0,
  Keterangan: "",
  Jenis: {
    Bahan: false,
    Cmt: false,
    Acc: false,
    Obat: false,
    Sparepart: false,
    Atk: false,
    Jasa: false,
  },
  Aktif: "Y", // Y = Aktif, N = Pasif
  RekeningList: [] as { Bank: string; Rekening: string; AtasNama: string }[],
});

const resetNewSupplierForm = () => {
  newSupplierForm.value = {
    Nama: "",
    Alamat: "",
    Kota: "",
    Telp: "",
    Hp: "",
    Fax: "",
    Contact: "",
    NpwpKode: "",
    NpwpNama: "",
    NpwpAlamat: "",
    NpwpKota: "",
    Top: 0,
    TargetMitra: 0,
    Keterangan: "",
    Jenis: {
      Bahan: false,
      Cmt: false,
      Acc: false,
      Obat: false,
      Sparepart: false,
      Atk: false,
      Jasa: false,
    },
    Aktif: "Y",
    RekeningList: [],
  };
};

const openNewSupplierDialog = (idx: number) => {
  newSupplierTargetIdx.value = idx;
  resetNewSupplierForm();
  showNewSupplierDialog.value = true;
};

const addRekeningRow = () => {
  newSupplierForm.value.RekeningList.push({
    Bank: "",
    Rekening: "",
    AtasNama: "",
  });
};
const removeRekeningRow = (idx: number) => {
  newSupplierForm.value.RekeningList.splice(idx, 1);
};

const saveNewSupplier = async () => {
  if (!newSupplierForm.value.Nama.trim()) {
    toast.warning("Nama supplier harus diisi.");
    return;
  }
  isSavingSupplier.value = true;
  try {
    const res = await uangMukaPenyelesaianApi.createSupplier(
      newSupplierForm.value,
    );
    const newKode = res.data.kode; // sesuaikan dengan response API

    // Isi otomatis ke baris detail yang aktif (jika ada)
    if (newSupplierTargetIdx.value >= 0) {
      const d = form.value.detail[newSupplierTargetIdx.value];
      d.kdsup = newKode;
      d.supplier = newSupplierForm.value.Nama;
      const firstRek = newSupplierForm.value.RekeningList[0];
      d.bank = firstRek?.Bank || "";
      d.rekening = firstRek?.Rekening || "";
      d.atasnama = firstRek?.AtasNama || "";
    }

    toast.success(`Supplier ${newKode} berhasil dibuat.`);
    showNewSupplierDialog.value = false;
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal membuat supplier.");
  } finally {
    isSavingSupplier.value = false;
  }
};

// ── Tambah baris baru ─────────────────────────────────────────────────
const addRow = () => {
  form.value.detail.push({
    no: form.value.detail.length + 1,
    pjh: "",
    pmt: "",
    uraian: "",
    spesifikasi: "",
    satuan: "",
    qty_minta: 0,
    qty: 1,
    harga: 0,
    total: 0,
    verified: true,
    guna: "",
    ga: 0,
    rekkode: "",
    reknama: "",
    cckode: 0,
    ccnama: "",
    dcnama: "",
    kdsup: "",
    supplier: "",
    bank: "",
    rekening: "",
    atasnama: "",
    gabrg: 0,
    edit: 0,
    pjh_link: "",
    kdbrg: "",
    mb: "",
    jenis_item: "",
    cab_item: "",
  });
};

const showRemoveRowDialog = ref(false);
const rowToRemoveIdx = ref(-1);

const removeRow = (idx: number) => {
  const d = form.value.detail[idx];
  if (d.ga === 1 && d.edit === 1) {
    toast.warning(
      "Baris ini sudah pernah tersimpan di penyelesaian sebelumnya. Hapus/ubah ulang belum didukung.",
    );
    return;
  }
  if (d.ga === 1) {
    rowToRemoveIdx.value = idx;
    showRemoveRowDialog.value = true;
    return;
  }
  // Baris manual (non-GA) — hapus langsung tanpa konfirmasi, sama seperti sebelumnya
  form.value.detail.splice(idx, 1);
};

const confirmRemoveRow = () => {
  if (rowToRemoveIdx.value >= 0) {
    form.value.detail.splice(rowToRemoveIdx.value, 1);
  }
  showRemoveRowDialog.value = false;
  rowToRemoveIdx.value = -1;
};

const cancelRemoveRow = () => {
  showRemoveRowDialog.value = false;
  rowToRemoveIdx.value = -1;
};

// ── Validasi ──────────────────────────────────────────────────────────
const validateSave = () => {
  if (!form.value.rek_kode || !form.value.rek_nama) {
    toast.warning("Account harus diisi.");
    return;
  }

  // Verified sekarang otomatis mengikuti qty — baris dengan qty > 0
  // dianggap ikut direalisasi, qty 0 di-skip dari jurnal/qty_buyed.
  form.value.detail.forEach((d) => {
    d.verified = Number(d.qty) > 0;
  });

  const verifiedItems = form.value.detail.filter(
    (d) => d.uraian.trim() && d.verified,
  );

  if (verifiedItems.length === 0) {
    toast.warning(
      "Tidak ada pengajuan yang diverifikasi. Tidak bisa disimpan.",
    );
    return;
  }

  const totalQty = verifiedItems.reduce((s, d) => s + d.qty, 0);
  if (totalQty === 0) {
    toast.warning("Total Qty yang diverifikasi kosong. Tidak bisa disimpan.");
    return;
  }

  // Delphi: cek account detail wajib kalau verified
  for (const d of verifiedItems) {
    if (!d.reknama) {
      toast.warning(`Nama Account harus diisi pada item: ${d.uraian}`);
      return;
    }
    // Delphi: kalau account bukan A-xxx atau B-xxx → wajib DC
    const prefix = (d.rekkode || "").substring(0, 1);
    if (prefix !== "A" && prefix !== "B") {
      if (!d.dcnama.trim() || !d.cckode) {
        toast.warning(`Detail CC harus diisi pada item: ${d.uraian}`);
        return;
      }
    }
    // Delphi: kalau ada mb (permintaan garmen) → supplier wajib
    if (d.mb && !d.kdsup) {
      toast.warning(
        `Supplier harus diisi untuk Permintaan Garmen: ${d.uraian}`,
      );
      return;
    }
  }

  showSaveDialog.value = true;
};

const confirmSave = async () => {
  isSaving.value = true;
  try {
    const res = await uangMukaPenyelesaianApi.save({
      ...form.value,
      no_bkk_lama: form.value.no_bkk,
    });
    savedNoBkk.value = res.data.no_bkk || "";
    showSaveDialog.value = false;
    showPrintDialog.value = true;
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal menyimpan.");
  } finally {
    isSaving.value = false;
  }
};

const cetakSelesai = () => {
  window.open(
    `/pembelian/uang-muka/print-penyelesaian/${encodeURIComponent(form.value.nomor)}`,
    "_blank",
  );
  showPrintDialog.value = false;
  router.push({ name: "UangMuka" });
};

const skipCetak = () => {
  showPrintDialog.value = false;
  router.push({ name: "UangMuka" });
};

const confirmCancel = () => {
  showCancelDialog.value = false;
  if (originalForm.value) {
    // Reset ke data original dari server
    Object.assign(form.value, JSON.parse(JSON.stringify(originalForm.value)));
  }
};

const confirmClose = () => {
  showCloseDialog.value = false;
  router.push({ name: "UangMuka" });
};

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

// ── Format nominal (separator ribuan) ────────────────────────────────
const parseNum = (v: string) =>
  Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;

const formatNum = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

const onHargaInput = (d: PenyelesaianDetail, e: Event) => {
  d.harga = parseNum((e.target as HTMLInputElement).value);
  hitungTotal(d);
};
const onHargaBlur = (d: PenyelesaianDetail, e: Event) => {
  (e.target as HTMLInputElement).value = formatNum(d.harga);
};
const onHargaFocus = (d: PenyelesaianDetail, e: Event) => {
  const input = e.target as HTMLInputElement;
  input.value = d.harga ? String(d.harga) : "";
  requestAnimationFrame(() => {
    const len = input.value.length;
    input.setSelectionRange(len, len);
  });
};

const onQtyInput = (d: PenyelesaianDetail, e: Event) => {
  d.qty = parseNum((e.target as HTMLInputElement).value);
  hitungTotal(d);
};
const focusNextRow = (rowIndex: number, colKey: string) => {
  const nextRow = rowIndex + 1;
  if (nextRow >= form.value.detail.length) return;
  const el = document.querySelector<HTMLInputElement>(
    `input[data-row="${nextRow}"][data-col="${colKey}"]`,
  );
  if (el) {
    el.focus();
    el.select();
  }
};
const onQtyBlur = (d: PenyelesaianDetail, e: Event) => {
  (e.target as HTMLInputElement).value = formatNum(d.qty);
};
const onQtyFocus = (d: PenyelesaianDetail, e: Event) => {
  const input = e.target as HTMLInputElement;
  input.value = d.qty ? String(d.qty) : "";
  requestAnimationFrame(() => {
    const len = input.value.length;
    input.setSelectionRange(len, len);
  });
};

// ── Row color — baris yang perlu perhatian ────────────────────────────
const rowClass = (d: PenyelesaianDetail) => {
  if (!d.verified) return "row-unverified";
  if (d.verified && d.reknama === "") return "row-warn";
  return "";
};

const STATUS_FINANCE_OPTIONS = [
  { value: "", label: "-" },
  { value: "PENDING", label: "Pending" },
  { value: "MENUNGGU_PEMBELIAN", label: "Menunggu Pembelian" },
  { value: "BULAN_DEPAN", label: "Bulan Depan" },
  { value: "OTORISASI", label: "Otorisasi" },
];
const statusFinanceColor = (v?: string) => {
  switch (v) {
    case "PENDING":
      return { bg: "#fff3e0", fg: "#e65100" };
    case "MENUNGGU_PEMBELIAN":
      return { bg: "#e3f2fd", fg: "#1565c0" };
    case "BULAN_DEPAN":
      return { bg: "#f3e5f5", fg: "#7b1fa2" };
    case "OTORISASI":
      return { bg: "#fce4ec", fg: "#c2185b" };
    default:
      return { bg: "#f5f5f5", fg: "#9e9e9e" };
  }
};

const statusRealisasiInfo = (d: PenyelesaianDetail) => {
  if (!d.qty_minta) return null;
  if (d.qty === d.qty_minta)
    return { label: "Close", bg: "#e8f5e9", fg: "#2e7d32" };
  if (d.qty < d.qty_minta)
    return { label: "Kurang", bg: "#fff3e0", fg: "#e65100" };
  // Lebih — belum ada perlakuan bisnis (kelebihan beli dari yang
  // diminta). Sementara cuma ditandai sebagai keterangan visual.
  return { label: "Lebih", bg: "#e3f2fd", fg: "#1565c0" };
};

const updatingStatusIdx = ref<number | null>(null);
const onStatusFinanceChange = async (d: PenyelesaianDetail, idx: number) => {
  if (!d.pmt) return;
  updatingStatusIdx.value = idx;
  try {
    await uangMukaPenyelesaianApi.updateStatusFinance(
      d.pmt,
      d.no,
      d.statusFinance || null,
    );
    toast.success("Status pengajuan diperbarui.");
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal update status.");
  } finally {
    updatingStatusIdx.value = null;
  }
};
</script>

<template>
  <BaseForm
    title="Penyelesaian Uang Muka / Kasbon"
    :menu-id="MENU_ID"
    :icon="IconReceipt2"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="confirmSave"
    @confirm-cancel="confirmCancel"
    @confirm-close="confirmClose"
    :is-edit-mode="true"
  >
    <!-- ── LEFT COLUMN ── -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="section-label">Info Kasbon</div>
        <div class="info-row">
          <span>No. Kasbon</span><b class="mono">{{ form.nomor }}</b>
        </div>
        <div class="info-row">
          <span>Tgl Kasbon</span><b>{{ form.tanggal }}</b>
        </div>
        <div class="info-row">
          <span>Jenis</span><b>{{ form.jenis }}</b>
        </div>
      </div>

      <div class="desktop-form-section">
        <div class="section-label">Info BKK / BBK</div>

        <v-text-field
          :model-value="form.no_bkk || '(Otomatis)'"
          label="No. BKK/BBK"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
          readonly
        />
        <v-text-field
          v-model="form.tgl_bkk"
          type="date"
          label="Tgl Penyelesaian"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
        />

        <!-- <div class="lookup-field mb-3">
          <label class="lookup-label">Account <span class="req">*</span></label>
          <div class="input-with-btn">
            <input
              v-model="form.rek_kode"
              class="cell-inp mono"
              style="width: 90px; flex-shrink: 0"
              placeholder="Kode"
              @keydown.enter="onRekKodeEnter"
            />
            <div
              class="lookup-input-wrap flex-1"
              @click="showAccountModal = true"
            >
              <span :class="{ 'text-grey': !form.rek_nama }">
                {{ form.rek_nama || "Pilih account..." }}
              </span>
              <IconSearch :size="15" :stroke-width="1.7" />
            </div>
          </div>
        </div> -->

        <v-text-field
          v-model="form.penerima"
          label="Penerima"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
        />
        <!-- <v-text-field
          v-model="form.nota"
          label="No. Nota"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
        /> -->
        <v-text-field
          v-model="form.keterangan"
          label="Keterangan"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
        />
        <!-- <v-text-field
          :model-value="form.pjh_nomor || '-'"
          label="No. Pengajuan"
          variant="outlined"
          density="compact"
          hide-details
          readonly
        /> -->
      </div>

      <div v-if="form.info_permintaan" class="desktop-form-section">
        <div class="d-flex justify-space-between align-center mb-2">
          <div class="section-label" style="margin-bottom: 0">
            Info Permintaan
          </div>
          <button
            class="link-btn"
            type="button"
            @click="showPermintaanDialog = true"
          >
            Lihat Detail
          </button>
        </div>
        <div class="info-row">
          <span>No. Permintaan</span
          ><b class="mono">{{ form.info_permintaan.pmt_nomor }}</b>
        </div>
        <div class="info-row">
          <span>Nama</span><b>{{ form.info_permintaan.nama }}</b>
        </div>
      </div>
    </template>

    <!-- ── RIGHT COLUMN ── -->
    <template #right-column>
      <div
        class="desktop-form-section"
        style="height: 100%; display: flex; flex-direction: column"
      >
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="section-title" style="margin-bottom: 0">Rincian Item</div>
        </div>

        <div class="rl-table-wrap flex-grow-1">
          <table class="rl-table">
            <thead>
              <tr>
                <th v-for="c in columns" :key="c.key">{{ c.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(d, idx) in form.detail"
                :key="idx"
                :class="rowClass(d)"
              >
                <td class="tc">{{ idx + 1 }}</td>

                <td>
                  <span class="cell-text">{{
                    d.pjh || d.pjh_link || "-"
                  }}</span>
                </td>

                <td>
                  <span v-if="d.ga !== 0" class="cell-text">{{
                    d.uraian
                  }}</span>
                  <input v-else v-model="d.uraian" class="cell-inp" />
                </td>

                <td>
                  <span v-if="d.ga !== 0" class="cell-text">{{
                    d.spesifikasi
                  }}</span>
                  <input v-else v-model="d.spesifikasi" class="cell-inp" />
                </td>

                <td>
                  <span v-if="d.ga !== 0" class="cell-text">{{
                    d.satuan
                  }}</span>
                  <input v-else v-model="d.satuan" class="cell-inp" />
                </td>

                <!-- Qty Minta (readonly) -->
                <td class="tr">
                  <span class="cell-text">{{ formatNum(d.qty_minta) }}</span>
                </td>

                <!-- Qty Beli -->
                <td>
                  <input
                    :data-row="idx"
                    data-col="qty"
                    :value="formatNum(d.qty)"
                    type="text"
                    inputmode="numeric"
                    class="cell-inp tr"
                    @focus="onQtyFocus(d, $event)"
                    @input="onQtyInput(d, $event)"
                    @blur="onQtyBlur(d, $event)"
                    @keydown.enter.prevent="focusNextRow(idx, 'qty')"
                  />
                </td>

                <td>
                  <input
                    :data-row="idx"
                    data-col="harga"
                    :value="formatNum(d.harga)"
                    type="text"
                    inputmode="numeric"
                    class="cell-inp tr"
                    @focus="onHargaFocus(d, $event)"
                    @input="onHargaInput(d, $event)"
                    @blur="onHargaBlur(d, $event)"
                    @keydown.enter.prevent="focusNextRow(idx, 'harga')"
                  />
                </td>

                <td class="tr fw">{{ fmt(d.total) }}</td>

                <!-- <td class="tc">
                  <input
                    type="checkbox"
                    v-model="d.verified"
                    @change="onVerifiedChange(d)"
                  />
                </td> -->

                <!-- Status Realisasi -->
                <td class="tc">
                  <span
                    v-if="statusRealisasiInfo(d)"
                    class="status-badge"
                    :style="{
                      background: statusRealisasiInfo(d)!.bg,
                      color: statusRealisasiInfo(d)!.fg,
                    }"
                  >
                    {{ statusRealisasiInfo(d)!.label }}
                  </span>
                  <span v-else class="cell-text">-</span>
                </td>

                <td>
                  <div class="d-flex align-center gap-1" @click.stop>
                    <input
                      v-model="d.rekkode"
                      class="cell-inp mono"
                      style="max-width: 90px"
                      placeholder="Kode"
                      @keydown.enter="onDetailRekKodeEnter(idx)"
                    />
                    <button
                      type="button"
                      class="sup-btn"
                      @click.stop.prevent="openDetAccountModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>

                <td>
                  <span class="cell-text">{{ d.reknama || "-" }}</span>
                </td>

                <td>
                  <div class="d-flex align-center gap-1" @click.stop>
                    <span class="cell-text cell-ellipsis">{{
                      d.ccnama || "-"
                    }}</span>
                    <button
                      type="button"
                      class="sup-btn"
                      @click.stop.prevent="openCcModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>

                <td>
                  <span class="cell-text cell-ellipsis">{{
                    d.dcnama || "-"
                  }}</span>
                </td>

                <td><input v-model="d.guna" class="cell-inp" /></td>

                <td>
                  <div class="d-flex align-center gap-1" @click.stop>
                    <input
                      v-model="d.kdsup"
                      class="cell-inp"
                      style="width: 90px"
                      readonly
                      placeholder="Kode"
                    />
                    <button
                      type="button"
                      class="sup-btn"
                      title="Cari supplier"
                      @click.stop.prevent="openSupplierModal(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                    <button
                      type="button"
                      class="sup-btn"
                      title="Supplier baru"
                      @click.stop.prevent="openNewSupplierDialog(idx)"
                    >
                      <IconPlus :size="11" />
                    </button>
                  </div>
                </td>

                <td>
                  <input v-model="d.supplier" class="cell-inp" readonly />
                </td>
                <td>
                  <input v-model="d.bank" class="cell-inp" placeholder="Bank" />
                </td>
                <td>
                  <input
                    v-model="d.rekening"
                    class="cell-inp"
                    placeholder="Rekening"
                  />
                </td>
                <td>
                  <input
                    v-model="d.atasnama"
                    class="cell-inp"
                    placeholder="Atas nama"
                  />
                </td>

                <td>
                  <span class="cell-text">{{ d.jenis_item || "-" }}</span>
                </td>
                <td>
                  <span class="cell-text">{{ d.cab_item || "-" }}</span>
                </td>
                <td>
                  <span class="cell-text">{{ d.kdbrg || "-" }}</span>
                </td>

                <td class="tc">
                  <button
                    v-if="d.ga === 0 || (d.ga === 1 && d.edit === 0)"
                    class="del-btn"
                    type="button"
                    @click.prevent="removeRow(idx)"
                  >
                    <IconTrash :size="12" :stroke-width="1.8" />
                  </button>
                </td>
              </tr>
              <tr v-if="!form.detail.length">
                <td colspan="24" class="empty-td">Belum ada item.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer totals -->
        <div class="detail-footer">
          <div class="footer-item">
            <span class="footer-lbl">Total Kasbon</span>
            <span class="footer-val">{{ fmt(totalKasbon) }}</span>
          </div>
          <div class="footer-item">
            <span class="footer-lbl">Terpakai</span>
            <span class="footer-val" style="color: #1565c0">{{
              fmt(totalTerpakai)
            }}</span>
          </div>
          <div class="footer-item">
            <span class="footer-lbl">Kurang/Lebih</span>
            <span
              class="footer-val"
              :style="{
                color:
                  totalSisa < 0
                    ? '#c62828'
                    : totalSisa > 0
                      ? '#f57c00'
                      : '#2e7d32',
              }"
            >
              {{ fmt(totalSisa) }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- ── Dialog Konfirmasi Hapus Baris GA ── -->
  <v-dialog v-model="showRemoveRowDialog" max-width="420" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="pa-4 pb-2"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #f57c00"
      >
        Konfirmasi Hapus Baris
      </v-card-title>
      <v-card-text class="pa-4 pt-2" style="font-size: 12px">
        Baris
        <strong>{{
          rowToRemoveIdx >= 0 ? form.detail[rowToRemoveIdx]?.uraian : ""
        }}</strong>
        akan dihapus dari transaksi ini dan tetap tersedia untuk diproses di
        Uang Muka lain nanti. Lanjutkan?
      </v-card-text>
      <v-card-actions class="pa-3">
        <v-btn variant="text" @click="cancelRemoveRow">Batal</v-btn>
        <v-spacer />
        <v-btn color="warning" variant="flat" @click="confirmRemoveRow">
          Ya, Hapus
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Info Permintaan ── -->
  <v-dialog v-model="showPermintaanDialog" max-width="420">
    <v-card rounded="lg">
      <v-card-title
        class="pa-4 pb-2"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #2e7d32"
      >
        Info Permintaan
      </v-card-title>
      <v-card-text class="pa-4 pt-2">
        <div class="info-grid" v-if="form.info_permintaan">
          <span class="info-lbl">No. Permintaan</span>
          <span class="info-val">{{ form.info_permintaan.pmt_nomor }}</span>
          <span class="info-lbl">Tgl Permintaan</span>
          <span class="info-val">{{ form.info_permintaan.pmt_tanggal }}</span>
          <span class="info-lbl">Jenis Permintaan</span>
          <span class="info-val">{{
            form.info_permintaan.jenis_permintaan
          }}</span>
          <span class="info-lbl">NIK</span>
          <span class="info-val">{{ form.info_permintaan.pjh_nik }}</span>
          <span class="info-lbl">Nama</span>
          <span class="info-val">{{ form.info_permintaan.nama }}</span>
          <span class="info-lbl">Bagian</span>
          <span class="info-val">{{ form.info_permintaan.bagian }}</span>
          <span class="info-lbl">Lokasi</span>
          <span class="info-val">{{ form.info_permintaan.lokasi }}</span>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn variant="text" @click="showPermintaanDialog = false"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Cetak ── -->
  <v-dialog v-model="showPrintDialog" max-width="380" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="pa-4 pb-2"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #2e7d32"
      >
        <IconPrinter
          :size="16"
          :stroke-width="1.8"
          color="#2e7d32"
          style="margin-right: 6px"
        />
        Berhasil Disimpan
      </v-card-title>
      <v-card-text class="pa-4 pt-2" style="font-size: 12px">
        Penyelesaian berhasil disimpan.<br />
        Ingin mencetak bukti penyelesaian?
      </v-card-text>
      <v-card-actions class="pa-3">
        <v-btn variant="text" @click="skipCetak">Tidak</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="cetakSelesai">
          <template #prepend>
            <IconPrinter :size="14" :stroke-width="1.8" />
          </template>
          Cetak Penyelesaian
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog: Supplier Baru ── -->
  <v-dialog v-model="showNewSupplierDialog" max-width="900" scrollable>
    <v-card rounded="lg">
      <v-card-title class="ns-header">
        <span>Tambah Master Supplier</span>
        <button
          class="ns-close"
          type="button"
          @click="showNewSupplierDialog = false"
        >
          ×
        </button>
      </v-card-title>

      <v-card-text class="pa-4" style="max-height: 75vh">
        <!-- Row 1: Kode, Nama, Status -->
        <div class="ns-row">
          <div class="ns-field" style="width: 110px">
            <label class="ns-lbl">Kode</label>
            <input value="Auto" readonly class="form-inp" placeholder="Auto" />
          </div>
          <div class="ns-field" style="flex: 1">
            <label class="ns-lbl"
              >Nama Supplier <span class="req">*</span></label
            >
            <input v-model="newSupplierForm.Nama" class="form-inp" />
          </div>
          <div class="ns-field" style="width: 160px">
            <label class="ns-lbl">Status</label>
            <div class="ns-radio-row">
              <label class="ns-radio">
                <input type="radio" v-model="newSupplierForm.Aktif" value="Y" />
                <span>Aktif</span>
              </label>
              <label class="ns-radio">
                <input type="radio" v-model="newSupplierForm.Aktif" value="N" />
                <span>Pasif</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Row 2: Jenis Supplier -->
        <div class="ns-field ns-full">
          <label class="ns-lbl"
            >Jenis Supplier <span class="req">*</span></label
          >
          <div class="ns-jenis-row">
            <label class="ns-jenis-pill">
              <input type="checkbox" v-model="newSupplierForm.Jenis.Bahan" />
              <span>Bahan</span>
            </label>
            <label class="ns-jenis-pill">
              <input type="checkbox" v-model="newSupplierForm.Jenis.Cmt" />
              <span>CMT</span>
            </label>
            <label class="ns-jenis-pill">
              <input type="checkbox" v-model="newSupplierForm.Jenis.Acc" />
              <span>Accesories</span>
            </label>
            <label class="ns-jenis-pill">
              <input type="checkbox" v-model="newSupplierForm.Jenis.Obat" />
              <span>Obat</span>
            </label>
            <label class="ns-jenis-pill">
              <input
                type="checkbox"
                v-model="newSupplierForm.Jenis.Sparepart"
              />
              <span>Sparepart</span>
            </label>
            <label class="ns-jenis-pill">
              <input type="checkbox" v-model="newSupplierForm.Jenis.Atk" />
              <span>ATK/RTK</span>
            </label>
            <label class="ns-jenis-pill">
              <input type="checkbox" v-model="newSupplierForm.Jenis.Jasa" />
              <span>Jasa</span>
            </label>
          </div>
        </div>

        <!-- Row 3: Alamat, Kota -->
        <div class="ns-row">
          <div class="ns-field" style="flex: 2">
            <label class="ns-lbl">Alamat <span class="req">*</span></label>
            <input v-model="newSupplierForm.Alamat" class="form-inp" />
          </div>
          <div class="ns-field" style="flex: 1">
            <label class="ns-lbl">Kota <span class="req">*</span></label>
            <input v-model="newSupplierForm.Kota" class="form-inp" />
          </div>
        </div>

        <!-- Row 4: Contact, HP, Telp, Fax -->
        <div class="ns-row">
          <div class="ns-field" style="flex: 1">
            <label class="ns-lbl"
              >Contact Person <span class="req">*</span></label
            >
            <input v-model="newSupplierForm.Contact" class="form-inp" />
          </div>
          <div class="ns-field" style="flex: 1">
            <label class="ns-lbl">No HP <span class="req">*</span></label>
            <input v-model="newSupplierForm.Hp" class="form-inp" />
          </div>
          <div class="ns-field" style="flex: 1">
            <label class="ns-lbl">No Telp Kantor</label>
            <input v-model="newSupplierForm.Telp" class="form-inp" />
          </div>
          <div class="ns-field" style="flex: 1">
            <label class="ns-lbl">No Fax</label>
            <input v-model="newSupplierForm.Fax" class="form-inp" />
          </div>
        </div>

        <!-- Row 5: Keterangan, TOP, Target Mitra + NPWP box -->
        <div class="ns-row">
          <div
            class="ns-field"
            style="flex: 1.4; display: flex; flex-direction: column; gap: 8px"
          >
            <div class="ns-field">
              <label class="ns-lbl">Keterangan</label>
              <input v-model="newSupplierForm.Keterangan" class="form-inp" />
            </div>
            <div class="ns-row">
              <div class="ns-field" style="flex: 1">
                <label class="ns-lbl">T.O.P (Hari)</label>
                <input
                  v-model.number="newSupplierForm.Top"
                  type="number"
                  class="form-inp"
                />
              </div>
              <div class="ns-field" style="flex: 1">
                <label class="ns-lbl">Target Mitra</label>
                <input
                  v-model.number="newSupplierForm.TargetMitra"
                  type="number"
                  class="form-inp"
                />
              </div>
            </div>
          </div>

          <!-- NPWP box -->
          <div class="ns-npwp-box">
            <div class="ns-npwp-title">Data NPWP</div>
            <div class="ns-row" style="margin-bottom: 6px">
              <input
                v-model="newSupplierForm.NpwpKode"
                class="form-inp"
                placeholder="No. NPWP"
              />
            </div>
            <div class="ns-row" style="margin-bottom: 6px">
              <input
                v-model="newSupplierForm.NpwpNama"
                class="form-inp"
                placeholder="Nama NPWP"
              />
            </div>
            <div class="ns-row">
              <input
                v-model="newSupplierForm.NpwpAlamat"
                class="form-inp"
                placeholder="Alamat NPWP"
                style="flex: 2"
              />
              <input
                v-model="newSupplierForm.NpwpKota"
                class="form-inp"
                placeholder="Kota NPWP"
                style="flex: 1"
              />
            </div>
          </div>
        </div>

        <!-- Rekening -->
        <div class="ns-rek-section">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="ns-lbl" style="margin: 0">📋 Data Rekening</span>
            <v-btn
              size="x-small"
              variant="flat"
              color="success"
              @click="addRekeningRow"
            >
              <template #prepend><IconPlus :size="12" /></template>
              Tambah Rekening
            </v-btn>
          </div>
          <table class="ns-rek-tbl">
            <thead>
              <tr>
                <th style="width: 40px">No</th>
                <th>Nama Bank</th>
                <th>No. Rekening</th>
                <th>Atas Nama</th>
                <th style="width: 50px">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, idx) in newSupplierForm.RekeningList" :key="idx">
                <td class="tc">{{ idx + 1 }}</td>
                <td><input v-model="r.Bank" class="cell-inp" /></td>
                <td><input v-model="r.Rekening" class="cell-inp" /></td>
                <td><input v-model="r.AtasNama" class="cell-inp" /></td>
                <td class="tc">
                  <button
                    class="del-btn"
                    type="button"
                    @click.prevent="removeRekeningRow(idx)"
                  >
                    <IconTrash :size="12" :stroke-width="1.8" />
                  </button>
                </td>
              </tr>
              <tr v-if="!newSupplierForm.RekeningList.length">
                <td colspan="5" class="empty-td">Belum ada rekening</td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>

      <v-card-actions class="pa-3" style="border-top: 1px solid #e0e0e0">
        <v-spacer />
        <v-btn variant="outlined" @click="showNewSupplierDialog = false"
          >Batal</v-btn
        >
        <v-btn
          color="success"
          variant="flat"
          :loading="isSavingSupplier"
          @click="saveNewSupplier"
        >
          Simpan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <AccountSearchModal
    v-model="showAccountModal"
    :jenis="form.jenis"
    @selected="onAccountSelected"
  />
  <AccountSearchModal
    v-model="showDetailAccountModal"
    jenis="ALL"
    @selected="onDetailAccountSelected"
  />
  <CostCenterSearchModal v-model="showCcModal" @selected="onCcSelected" />

  <GenericPickerModal
    v-model="showDcModal"
    title="Cari Detail Cost Center"
    :columns="[{ key: 'nama', title: 'Nama' }]"
    :items="dcOptions"
    search-placeholder="Cari Detail CC..."
    :search-keys="['nama']"
    @selected="selectDc"
  />
  <GenericPickerModal
    v-model="showSupplierModal"
    title="Cari Supplier"
    :columns="[
      { key: 'kode', title: 'Kode', width: '80px' },
      { key: 'nama', title: 'Nama Supplier' },
      { key: 'bank', title: 'Bank', width: '100px' },
      { key: 'rekening', title: 'Rekening', width: '120px' },
    ]"
    :items="supplierOptions"
    :loading="supplierLoading"
    server-search
    search-placeholder="Ketik nama supplier..."
    @selected="onSupplierSelected"
    @search="searchSupplier"
  />

  <GenericPickerModal
    v-model="showModalPjh"
    title="Pengajuan GA (F1)"
    :columns="[
      { key: 'nomor', title: 'Nomor' },
      { key: 'nama', title: 'Nama' },
      { key: 'keterangan', title: 'Keterangan' },
    ]"
    :items="optPjh"
    @selected="selectPjh"
    search-placeholder="Cari Pengajuan GA..."
    :search-keys="['nomor', 'nama', 'keterangan']"
  />

  <GenericPickerModal
    v-model="showModalPoExt"
    title="DP PO External (F2)"
    :columns="[
      { key: 'nomor', title: 'Nomor' },
      { key: 'tanggal', title: 'Tanggal' },
      { key: 'spk', title: 'SPK' },
      { key: 'supplier', title: 'Supplier' },
      { key: 'nominal', title: 'Nominal', align: 'right' },
    ]"
    :items="optPoExt"
    @selected="selectPoExt"
    search-placeholder="Cari PO External..."
    :search-keys="['nomor', 'spk', 'supplier']"
  />

  <GenericPickerModal
    v-model="showModalVoucher"
    title="Voucher Hutang (F3)"
    :columns="[
      { key: 'nomor', title: 'Nomor' },
      { key: 'tanggal', title: 'Tanggal' },
      { key: 'supplier', title: 'Supplier' },
      { key: 'total', title: 'Total', align: 'right' },
    ]"
    :items="optVoucher"
    @selected="selectVoucher"
    search-placeholder="Cari Voucher..."
    :search-keys="['nomor', 'supplier']"
  />

  <GenericPickerModal
    v-model="showModalMb"
    title="Permintaan Garmen (F4)"
    :columns="[
      { key: 'nomor', title: 'Nomor' },
      { key: 'tanggal', title: 'Tanggal' },
      { key: 'jenis', title: 'Jenis' },
      { key: 'keterangan', title: 'Keterangan' },
      { key: 'usr', title: 'User' },
      { key: 'bagian', title: 'Bagian' },
    ]"
    :items="optMb"
    @selected="selectMb"
    search-placeholder="Cari Permintaan..."
    :search-keys="['nomor', 'jenis', 'keterangan', 'bagian']"
  />

  <GenericPickerModal
    v-model="showModalIv"
    title="Invoice Garmen (F5)"
    :columns="[
      { key: 'invoice', title: 'Invoice' },
      { key: 'jenis', title: 'Jenis' },
      { key: 'tanggal', title: 'Tanggal' },
    ]"
    :items="optIv"
    @selected="selectIv"
    search-placeholder="Cari Invoice..."
    :search-keys="['invoice', 'jenis']"
  />
</template>

<style scoped>
.section-label {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 10px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px dashed #e0e0e0;
  font-size: 12px;
}
.mono {
  font-family: monospace;
  font-weight: 600;
}
.req {
  color: #e53935;
}
.link-btn {
  background: none;
  border: none;
  font-size: 11px;
  font-weight: 600;
  color: #1565c0;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.lookup-field {
  display: flex;
  flex-direction: column;
}
.lookup-label {
  font-size: 10px;
  color: #666;
  margin-bottom: 4px;
}
.lookup-input-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 12px;
  background: white;
}
.lookup-input-wrap:hover {
  border-color: #1565c0;
}
.input-with-btn {
  display: flex;
  gap: 6px;
  align-items: center;
}
.flex-1 {
  flex: 1;
  min-width: 0;
}

.f-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #757575;
  flex-wrap: wrap;
}
.f-key {
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  font-family: monospace;
  color: #1565c0;
}

.rl-table-wrap {
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
}
.rl-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 11px;
}
.rl-table thead th {
  background: #1565c0;
  color: white;
  font-weight: 700;
  padding: 6px;
  position: sticky;
  top: 0;
  z-index: 2;
  white-space: nowrap;
  border: 1px solid #0d47a1;
}
.rl-table td {
  padding: 3px 5px;
  border-bottom: 1px solid #f0f0f0;
  border-right: 1px solid #f5f5f5;
  vertical-align: middle;
}
.rl-table tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.rl-table tbody tr:hover td {
  background: #e3f2fd !important;
}
.row-unverified td {
  background: #f5f5f5 !important;
  color: #aaa;
}
.row-warn td {
  background: #fff3e0 !important;
}

.cell-inp {
  width: 100%;
  height: 24px;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
  color: #212121;
  box-sizing: border-box;
}
.cell-inp:focus {
  border-color: #1565c0;
}
.cell-text {
  font-size: 11px;
  display: block;
  padding: 2px 4px;
  color: #212121;
}
.cell-ellipsis {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.fw {
  font-weight: 700;
}
.empty-td {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px;
}

.sup-btn {
  background: white;
  border: 1px solid #ccc;
  border-radius: 3px;
  cursor: pointer;
  padding: 1px 3px;
  color: #1565c0;
  flex-shrink: 0;
}
.sup-btn:hover {
  background: #e3f2fd;
}
.del-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #c62828;
  padding: 2px;
}

.detail-footer {
  border-top: 2px solid #1565c0;
  padding: 8px 4px 4px;
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.footer-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.footer-lbl {
  font-size: 11px;
  font-weight: 700;
  color: #374151;
  white-space: nowrap;
}
.footer-val {
  font-size: 13px;
  font-weight: 700;
  color: #1565c0;
  min-width: 110px;
  text-align: right;
}

.status-select {
  height: 22px;
  border: none;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
  width: 100%;
}
.status-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

/* ── Dialog Supplier Baru — netral, tidak perlu tema hijau ── */
.info-grid {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 6px 12px;
  font-size: 12px;
}
.info-lbl {
  color: #6b7280;
  font-weight: 600;
}
.info-val {
  color: #111827;
}
.ns-header {
  background: #1565c0;
  color: white;
  font-size: 13px;
  font-weight: 700;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ns-close {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
}
.ns-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
.ns-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ns-full {
  margin-bottom: 10px;
}
.ns-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}
.ns-radio-row {
  display: flex;
  gap: 14px;
  height: 30px;
  align-items: center;
}
.ns-radio {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
}
.ns-radio input {
  accent-color: #1565c0;
}
.ns-jenis-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px 12px;
}
.ns-jenis-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  white-space: nowrap;
}
.ns-jenis-pill input {
  accent-color: #1565c0;
}
.ns-npwp-box {
  flex: 1;
  background: #f0f7ff;
  border: 1px solid #bbdefb;
  border-radius: 6px;
  padding: 10px;
}
.ns-npwp-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  margin-bottom: 6px;
  text-transform: uppercase;
}
.ns-rek-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 10px;
  margin-top: 4px;
}
.ns-rek-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.ns-rek-tbl th {
  background: #1565c0;
  color: white;
  font-weight: 700;
  padding: 5px 6px;
  text-align: left;
}
.ns-rek-tbl td {
  padding: 3px 4px;
  border-bottom: 1px solid #f0f0f0;
}
.form-inp {
  height: 30px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  padding: 0 8px;
  font-size: 11px;
  outline: none;
  background: white;
  color: #111827;
  width: 100%;
  box-sizing: border-box;
}
.form-inp:focus {
  border-color: #1565c0;
  box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.1);
}

.rl-table th:nth-child(1),
.rl-table td:nth-child(1) {
  width: 35px;
}
.rl-table th:nth-child(2),
.rl-table td:nth-child(2) {
  width: 120px;
}
.rl-table th:nth-child(3),
.rl-table td:nth-child(3) {
  width: 150px;
}
.rl-table th:nth-child(4),
.rl-table td:nth-child(4) {
  width: 90px;
}
.rl-table th:nth-child(5),
.rl-table td:nth-child(5) {
  width: 55px;
}
.rl-table th:nth-child(6),
.rl-table td:nth-child(6) {
  width: 90px;
}
.rl-table th:nth-child(7),
.rl-table td:nth-child(7) {
  width: 110px;
}
.rl-table th:nth-child(8),
.rl-table td:nth-child(8) {
  width: 120px;
}
.rl-table th:nth-child(9),
.rl-table td:nth-child(9) {
  width: 110px;
}
.rl-table th:nth-child(10),
.rl-table td:nth-child(10) {
  width: 45px;
}
.rl-table th:nth-child(11),
.rl-table td:nth-child(11) {
  width: 130px;
}
.rl-table th:nth-child(12),
.rl-table td:nth-child(12) {
  width: 170px;
}
.rl-table th:nth-child(13),
.rl-table td:nth-child(13) {
  width: 240px;
}
.rl-table th:nth-child(14),
.rl-table td:nth-child(14) {
  width: 200px;
}
.rl-table th:nth-child(15),
.rl-table td:nth-child(15) {
  width: 200px;
}
.rl-table th:nth-child(16),
.rl-table td:nth-child(16) {
  width: 150px;
}
.rl-table th:nth-child(17),
.rl-table td:nth-child(17) {
  width: 130px;
}
.rl-table th:nth-child(18),
.rl-table td:nth-child(18) {
  width: 180px;
}
.rl-table th:nth-child(19),
.rl-table td:nth-child(19) {
  width: 140px;
}
.rl-table th:nth-child(20),
.rl-table td:nth-child(20) {
  width: 150px;
}
.rl-table th:nth-child(21),
.rl-table td:nth-child(21) {
  width: 150px;
}
.rl-table th:nth-child(22),
.rl-table td:nth-child(22) {
  width: 60px;
}
.rl-table th:nth-child(23),
.rl-table td:nth-child(23) {
  width: 55px;
}
.rl-table th:nth-child(24),
.rl-table td:nth-child(24) {
  width: 80px;
}
.rl-table th:nth-child(25),
.rl-table td:nth-child(25) {
  width: 28px;
}
</style>
