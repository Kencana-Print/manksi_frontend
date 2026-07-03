<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { invTakNormalFormService as svc } from "@/services/penjualan/invoiceTakNormalFormService";
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import RekeningSearchModal from "@/components/lookups/RekeningSearchModal.vue";
import BarangInvProSearchModal from "@/components/lookups/BarangInvProSearchModal.vue";
import InvoiceNormalSearchModal from "@/components/lookups/InvoiceNormalSearchModal.vue";
import { IconReceipt2, IconSearch, IconAlertTriangle } from "@tabler/icons-vue";

// ── Types ───────────────────────────────────────────────────────────────
interface DetailRow {
  _key: number;
  Kode: string;
  NamaSpk: string;
  Ukuran: string;
  Jumlah: number;
  Harga: number;
}

interface InvoiceNormalRow {
  _key: number;
  Nomor: string;
  Cabang: string;
  Tanggal: string;
  KodeCus: string;
  NamaCustomer: string;
  Alamat: string;
  Nominal: number;
}

interface FormData {
  NomorInv: string;
  Divisi: string;
  Tanggal: string;
  KodePerush: string;
  NamaPerush: string;
  KodeCus: string;
  NamaCus: string;
  AlamatCus: string;
  KotaCus: string;
  TanggalTempo: string;
  RekBank: string;
  NamaBank: string;
  AtasNama: string;
  Keterangan: string;
  StsPpn: number;
  Ppn: number;
  Xminta5: string;
  Xurut5: number;
  IsTutupBuku: boolean;
  Detail: DetailRow[];
  InvoiceNormalList: InvoiceNormalRow[];
}

// ── Setup ────────────────────────────────────────────────────────────────
const router = useRouter();
const route = useRoute();
const toast = useToast();

const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

let _key = 1;
const sel = (e: FocusEvent) => (e.target as HTMLInputElement).select();
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

const divisiList = ref<{ kode: number; nama: string }[]>([]);

// NOTE: PPN default AKTIF (StsPpn=1, Ppn=11) — beda dari Invoice biasa yg
// default OFF. Sesuai Delphi refreshdata: cbbPPN.Checked:=True.
const init: FormData = {
  NomorInv: "",
  Divisi: "",
  Tanggal: todayLocal(),
  KodePerush: "",
  NamaPerush: "",
  KodeCus: "",
  NamaCus: "",
  AlamatCus: "",
  KotaCus: "",
  TanggalTempo: todayLocal(),
  RekBank: "",
  NamaBank: "",
  AtasNama: "",
  Keterangan: "",
  StsPpn: 1,
  Ppn: 11,
  Xminta5: "",
  Xurut5: 0,
  IsTutupBuku: false,
  Detail: [],
  InvoiceNormalList: [],
};

// ── useForm ──────────────────────────────────────────────────────────────
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
} = useForm<FormData>({
  menuId: "158",
  initialData: init,
  immediate: false,

  fetchApi: async (): Promise<FormData> => {
    const nomorEdit = route.query.nomor as string;
    const res = await svc.getById(nomorEdit);
    const d = res.data.data;
    const h = d.header;

    uangMuka.value = Number(h.uang_muka) || 0;

    return {
      NomorInv: h.inv_nomor || "",
      Divisi: String(h.inv_divisi || ""),
      Tanggal: h.inv_tanggal || todayLocal(),
      KodePerush: h.inv_perush_kode || "",
      NamaPerush: h.perush_nama || "",
      KodeCus: h.inv_cus_kode || "",
      NamaCus: h.cus_nama || "",
      AlamatCus: h.inv_cus_alamat || h.cus_alamat || "",
      KotaCus: h.cus_kota || "",
      TanggalTempo: h.inv_tanggal_tempo || todayLocal(),
      RekBank: h.inv_rekening || "",
      NamaBank: h.perushd_bank || "",
      AtasNama: h.perushd_atasnama || "",
      Keterangan: h.inv_keterangan || "",
      StsPpn: h.inv_sts_ppn ?? 1,
      Ppn: h.inv_ppn ?? 11,
      Xminta5: d.xminta5 || "",
      Xurut5: d.xurut5 || 0,
      IsTutupBuku: !!h.isTutupBuku,
      Detail: (d.detail || []).map((r: any) => ({
        _key: _key++,
        Kode: r.invd_spk_nomor || "",
        NamaSpk: r.spk_nama2 || "",
        Ukuran: r.invd_ukuran || "",
        Jumlah: Number(r.invd_jumlah) || 0,
        Harga: Number(r.invd_harga) || 0,
      })),
      InvoiceNormalList: (d.invoiceNormalList || []).map((r: any) => ({
        _key: _key++,
        Nomor: r.Nomor || "",
        Cabang: r.Cabang || "",
        Tanggal: r.Tanggal || "",
        KodeCus: r.KodeCus || "",
        NamaCustomer: r.NamaCustomer || "",
        Alamat: r.Alamat || "",
        Nominal: Number(r.Nominal) || 0,
      })),
    };
  },

  submitApi: async (data): Promise<any> => {
    const payload = {
      ...data,
      NomorInv: route.query.nomor || data.NomorInv,
      Detail: data.Detail.filter((r) => r.Kode && Number(r.Jumlah) !== 0).map(
        ({ _key: _k, ...r }) => r,
      ),
      InvoiceNormalList: data.InvoiceNormalList.filter((r) => r.Nomor).map(
        ({ _key: _k, ...r }) => r,
      ),
    };
    return isEditMode.value ? svc.update(payload) : svc.save(payload);
  },

  onSuccess: (res: any) => {
    const nomor = res?.data?.data?.nomor || "";
    savedNomor.value = nomor;
    showPrintDialog.value = true;
  },
});

const fd = formData;
const showPrintDialog = ref(false);
const savedNomor = ref("");
const uangMuka = ref(0);

// ── Lookup Modals ────────────────────────────────────────────────────────
const showPerushModal = ref(false);
const showCusModal = ref(false);

const selectPerush = (item: any) => {
  fd.value.KodePerush = item.perush_kode || item.Kode || "";
  fd.value.NamaPerush = item.perush_nama || item.Nama || "";
  showPerushModal.value = false;
  fd.value.RekBank = "";
  fd.value.NamaBank = "";
  fd.value.AtasNama = "";
};

const onPerushEnter = async () => {
  const kode = fd.value.KodePerush.trim();
  if (!kode) return;
  try {
    const res = await svc.searchPerusahaan(kode);
    const list = res.data.data || [];
    const exact = list.find(
      (p: any) => p.perush_kode?.toLowerCase() === kode.toLowerCase(),
    );
    const found = exact || list[0];
    if (found) {
      fd.value.KodePerush = found.perush_kode;
      fd.value.NamaPerush = found.perush_nama;
      fd.value.RekBank = "";
      fd.value.NamaBank = "";
      fd.value.AtasNama = "";
    } else {
      toast.error(`Perusahaan "${kode}" tidak ditemukan.`);
      fd.value.KodePerush = "";
      fd.value.NamaPerush = "";
    }
  } catch {
    toast.error("Gagal mencari perusahaan.");
  }
};

const applyCustomerInfo = async (kode: string): Promise<boolean> => {
  try {
    const res = await svc.getCustomerInfo(kode);
    const c = res.data.data;
    fd.value.KodeCus = c.cus_kode;
    fd.value.NamaCus = c.cus_nama;
    fd.value.AlamatCus = c.cus_alamat;
    fd.value.KotaCus = c.cus_kota;
    const days = Number(c.cus_top || 0);
    const d = new Date(fd.value.Tanggal);
    d.setDate(d.getDate() + days);
    fd.value.TanggalTempo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return true;
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || `Customer "${kode}" tidak ditemukan.`,
    );
    return false;
  }
};

const onCusEnter = async () => {
  const kode = fd.value.KodeCus.trim();
  if (!kode) return;
  const ok = await applyCustomerInfo(kode);
  if (!ok) {
    fd.value.KodeCus = "";
    fd.value.NamaCus = "";
  }
};

const onCustomerSelect = async (item: any) => {
  const kode = item.Kode || item.cus_kode || "";
  const ok = await applyCustomerInfo(kode);
  if (ok) showCusModal.value = false;
};

// Rekening
const showRekModal = ref(false);

const onRekEnter = async () => {
  const kode = fd.value.RekBank.trim();
  if (!kode) return;
  if (!fd.value.KodePerush) {
    toast.warning("Perusahaan diisi dulu.");
    fd.value.RekBank = "";
    return;
  }
  try {
    const res = await svc.getRekeningPerush(fd.value.KodePerush);
    const list = res.data.data || [];
    const exact = list.find(
      (r: any) => r.Rekening?.toLowerCase() === kode.toLowerCase(),
    );
    const found = exact || list[0];
    if (found) {
      fd.value.RekBank = found.Rekening;
      fd.value.NamaBank = found.Bank;
      fd.value.AtasNama = found.AtasNama;
    } else {
      toast.error(`Rekening "${kode}" tidak ditemukan.`);
      fd.value.RekBank = "";
    }
  } catch {
    toast.error("Gagal mencari rekening.");
  }
};

const selectRekening = (item: any) => {
  fd.value.RekBank = item.Rekening;
  fd.value.NamaBank = item.Bank;
  fd.value.AtasNama = item.AtasNama;
};

// ── Grid Barang ────────────────────────────────────────────────────────
const ensureEmptyRowBarang = () => {
  const last = fd.value.Detail[fd.value.Detail.length - 1];
  if (!last || last.Kode) {
    fd.value.Detail.push({
      _key: _key++,
      Kode: "",
      NamaSpk: "",
      Ukuran: "",
      Jumlah: 1,
      Harga: 0,
    });
  }
};

const isLoadingBarang = ref(false);
const barangInputValues = ref<Record<number, string>>({});
const showBarangModal = ref(false);
const activeBarangRowKey = ref<number | null>(null);

const addBarangByKode = async (kode: string, rowKey?: number) => {
  if (!fd.value.KodeCus) {
    toast.warning("Customer silahkan di isi dulu");
    return;
  }
  const dup = fd.value.Detail.find((r) => r.Kode === kode);
  if (dup) {
    toast.warning("Barang ini sudah di inputkan.");
    return;
  }

  isLoadingBarang.value = true;
  try {
    const res = await svc.loadBarangDetail(kode);
    const b = res.data.data;

    if (rowKey !== undefined) {
      const idx = fd.value.Detail.findIndex(
        (r) => r._key === rowKey && !r.Kode,
      );
      if (idx !== -1) fd.value.Detail.splice(idx, 1);
    }

    fd.value.Detail.push({
      _key: _key++,
      Kode: b.Kode,
      NamaSpk: b.Nama,
      Ukuran: b.Ukuran,
      Jumlah: b.Jumlah,
      Harga: b.Harga,
    });
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Barang Tidak di temukan.");
  } finally {
    isLoadingBarang.value = false;
    ensureEmptyRowBarang();
  }
};

const onBarangInputEnter = async (rowKey: number) => {
  const val = (barangInputValues.value[rowKey] || "").trim();
  if (!val) return;
  await addBarangByKode(val, rowKey);
  barangInputValues.value[rowKey] = "";
};

const openBarangModal = (rowKey?: number) => {
  if (!fd.value.KodeCus) {
    toast.warning("Customer silahkan di isi dulu");
    return;
  }
  activeBarangRowKey.value = rowKey ?? null;
  showBarangModal.value = true;
};

const barangFetchFn = async (q: string) => {
  const res = await svc.searchBarang(fd.value.KodeCus, q);
  const items = res.data.data || [];
  return { items, total: items.length };
};

const selectBarang = async (item: any) => {
  showBarangModal.value = false;
  await addBarangByKode(item.Kode, activeBarangRowKey.value ?? undefined);
  activeBarangRowKey.value = null;
};

const removeBarangRow = (row: DetailRow) => {
  // Sesuai Delphi FormKeyDown VK_DELETE utk GridDetail — TANPA konfirmasi
  if (!row.Kode) return;
  const idx = fd.value.Detail.indexOf(row);
  if (idx !== -1) fd.value.Detail.splice(idx, 1);
  ensureEmptyRowBarang();
};

// ── Grid Invoice Normal ──────────────────────────────────────────────────
const ensureEmptyRowInvNormal = () => {
  const last =
    fd.value.InvoiceNormalList[fd.value.InvoiceNormalList.length - 1];
  if (!last || last.Nomor) {
    fd.value.InvoiceNormalList.push({
      _key: _key++,
      Nomor: "",
      Cabang: "",
      Tanggal: "",
      KodeCus: "",
      NamaCustomer: "",
      Alamat: "",
      Nominal: 0,
    });
  }
};

const isLoadingInvNormal = ref(false);
const invNormalInputValues = ref<Record<number, string>>({});

const addInvoiceNormal = async (nomor: string, rowKey?: number) => {
  const dup = fd.value.InvoiceNormalList.find((r) => r.Nomor === nomor);
  if (dup) {
    toast.warning("Invoice ini sudah di input.");
    return;
  }

  isLoadingInvNormal.value = true;
  try {
    const res = await svc.validateInvoiceNormal(nomor, fd.value.NomorInv);
    const v = res.data.data;

    if (rowKey !== undefined) {
      const idx = fd.value.InvoiceNormalList.findIndex(
        (r) => r._key === rowKey && !r.Nomor,
      );
      if (idx !== -1) fd.value.InvoiceNormalList.splice(idx, 1);
    }

    fd.value.InvoiceNormalList.push({
      _key: _key++,
      Nomor: v.Nomor,
      Cabang: v.Cabang || "",
      Tanggal: v.Tanggal || "",
      KodeCus: v.KodeCus || "",
      NamaCustomer: v.NamaCustomer || "",
      Alamat: v.Alamat || "",
      Nominal: Number(v.Nominal) || 0,
    });
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Invoice tidak valid.");
  } finally {
    isLoadingInvNormal.value = false;
    ensureEmptyRowInvNormal();
  }
};

const onInvNormalInputEnter = async (rowKey: number) => {
  const val = (invNormalInputValues.value[rowKey] || "").trim();
  if (!val) return;
  await addInvoiceNormal(val, rowKey);
  invNormalInputValues.value[rowKey] = "";
};

// F1 = Spanduk, F4 = Garmen
const showInvNormalModal = ref(false);
const invNormalModalGroup = ref<"spanduk" | "garmen">("spanduk");
const activeInvNormalRowKey = ref<number | null>(null);

const openInvNormalModal = (group: "spanduk" | "garmen", rowKey?: number) => {
  invNormalModalGroup.value = group;
  activeInvNormalRowKey.value = rowKey ?? null;
  showInvNormalModal.value = true;
};

const selectInvNormal = async (item: any) => {
  showInvNormalModal.value = false;
  await addInvoiceNormal(item.Nomor, activeInvNormalRowKey.value ?? undefined);
  activeInvNormalRowKey.value = null;
};

// Delete baris Invoice Normal — sesuai Delphi cxGrdMasterKeyUp VK_DELETE —
// PAKAI konfirmasi (beda dari grid Barang yang tanpa konfirmasi)
const showDeleteInvNormalDialog = ref(false);
const pendingDeleteInvNormalRow = ref<InvoiceNormalRow | null>(null);

const requestRemoveInvNormalRow = (row: InvoiceNormalRow) => {
  if (!row.Nomor) return;
  pendingDeleteInvNormalRow.value = row;
  showDeleteInvNormalDialog.value = true;
};
const confirmRemoveInvNormalRow = () => {
  if (pendingDeleteInvNormalRow.value) {
    const idx = fd.value.InvoiceNormalList.indexOf(
      pendingDeleteInvNormalRow.value,
    );
    if (idx !== -1) fd.value.InvoiceNormalList.splice(idx, 1);
    ensureEmptyRowInvNormal();
  }
  showDeleteInvNormalDialog.value = false;
  pendingDeleteInvNormalRow.value = null;
};

// ── Hitung total — sesuai Delphi hitung() ─────────────────────────────────
// CATATAN: tidak ada konsep Disc/Pph sama sekali di modul ini.
const totalBarang = computed(() =>
  fd.value.Detail.reduce(
    (s, r) => s + Number(r.Jumlah || 0) * Number(r.Harga || 0),
    0,
  ),
);

const totalPpn = computed(() => {
  if (!fd.value.StsPpn) return 0;
  return totalBarang.value * (Number(fd.value.Ppn) / 100);
});

const grandTotal = computed(() => {
  if (!fd.value.StsPpn) return totalBarang.value;
  return totalBarang.value * ((100 + Number(fd.value.Ppn)) / 100);
});

const nilaiPiutang = computed(() => grandTotal.value - uangMuka.value);

const totalNominalInvNormal = computed(() =>
  fd.value.InvoiceNormalList.reduce(
    (s, r) => s + (r.Nomor ? Number(r.Nominal || 0) : 0),
    0,
  ),
);

// Checkbox → angka (sesuai Delphi cbbPPNClick)
const onPpnCheckboxChange = () => {
  fd.value.Ppn = fd.value.StsPpn ? 11 : 0;
};

// Angka → checkbox (sesuai Delphi edtPpnExit — dua arah)
const onPpnBlur = () => {
  fd.value.StsPpn = Number(fd.value.Ppn) === 0 ? 0 : 1;
};

// ── Validasi ───────────────────────────────────────────────────────────
const validateSave = () => {
  if (
    fd.value.Xminta5 &&
    ["MINTA", "WAIT", "TOLAK"].includes(fd.value.Xminta5)
  ) {
    toast.error(
      "Transaksi tsb sudah diclose.\nSilahkan minta approve untuk bisa menyimpan perubahan data.",
    );
    return;
  }

  if (!fd.value.NamaPerush) {
    toast.warning("Perusahaan belum di isi.");
    return;
  }
  if (!fd.value.NamaCus) {
    toast.warning("Customer belum di isi.");
    return;
  }

  const validDetail = fd.value.Detail.filter((r) => r.Kode);
  if (!validDetail.length) {
    toast.warning("Tidak ada detail, tidak dapat di simpan.");
    return;
  }

  const validInvNormal = fd.value.InvoiceNormalList.filter((r) => r.Nomor);
  if (!validInvNormal.length) {
    toast.warning("Invoice normal belum ditunjuk.");
    return;
  }

  showSaveDialog.value = true;
};

// ── Print ─────────────────────────────────────────────────────────────────
const skipPrint = () => {
  showPrintDialog.value = false;
  router.push({ name: "InvoiceTakNormalBrowse" });
};
const doCetak = () => {
  const url = router.resolve({
    name: "InvoiceTakNormalPrint",
    query: { nomor: savedNomor.value },
  }).href;
  window.open(url, "_blank");
  showPrintDialog.value = false;
  router.push({ name: "InvoiceTakNormalBrowse" });
};

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  const divRes = await svc.getDivisiList();
  divisiList.value = divRes.data.data || [];

  if (route.query.nomor) {
    await fetchData();
    ensureEmptyRowBarang();
    ensureEmptyRowInvNormal();
  } else {
    fd.value.Tanggal = todayLocal();
    if (divisiList.value.length) {
      fd.value.Divisi = String(divisiList.value[0].kode);
    }
    ensureEmptyRowBarang();
    ensureEmptyRowInvNormal();
  }
});
</script>

<template>
  <BaseForm
    :title="
      isEditMode ? 'Ubah Invoice Tak Normal' : 'Tambah Invoice Tak Normal'
    "
    menu-id="158"
    :icon="IconReceipt2"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Invoice Tak Normal"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div
        v-if="fd.IsTutupBuku && fd.Xminta5 !== 'ACC'"
        class="tutup-buku-banner"
      >
        <IconAlertTriangle :size="14" />
        Periode transaksi ini sudah <b>Tutup Buku</b>. Pengajuan PIN diperlukan
        untuk menyimpan perubahan.
      </div>

      <div class="desktop-form-section">
        <div class="sec-title">Header</div>

        <div class="fg">
          <label class="lb w90">Nomor</label>
          <input
            :value="fd.NomorInv || '(Otomatis)'"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>

        <div class="fg mt4">
          <label class="lb w90">Divisi</label>
          <select
            v-model="fd.Divisi"
            class="inp sel"
            :disabled="isEditMode"
            style="flex: 1"
          >
            <option
              v-for="d in divisiList"
              :key="d.kode"
              :value="String(d.kode)"
            >
              {{ d.kode }} - {{ d.nama }}
            </option>
          </select>
        </div>

        <div class="fg mt4">
          <label class="lb w90">Tanggal</label>
          <input type="date" v-model="fd.Tanggal" class="inp" />
        </div>

        <div class="fg mt4">
          <label class="lb w90">Perusahaan</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="fd.KodePerush"
              class="inp"
              style="
                width: 46px;
                flex-shrink: 0;
                text-transform: uppercase;
                padding: 0 3px;
              "
              placeholder="Kode"
              :readonly="isEditMode"
              @keydown.enter.prevent="onPerushEnter"
              @keydown.f1.prevent="showPerushModal = true"
              @blur="onPerushEnter"
            />
            <input
              :value="fd.NamaPerush"
              readonly
              class="inp ro"
              style="flex: 1"
              placeholder="Nama perusahaan..."
              tabindex="-1"
            />
            <button
              class="ibtn"
              :disabled="isEditMode"
              @click="showPerushModal = true"
            >
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="fg mt4">
          <label class="lb w90">Keterangan</label>
          <input v-model="fd.Keterangan" class="inp" style="flex: 1" />
        </div>

        <div class="fg mt4">
          <label class="lb w90">Customer</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="fd.KodeCus"
              class="inp"
              style="
                width: 46px;
                flex-shrink: 0;
                text-transform: uppercase;
                padding: 0 3px;
              "
              placeholder="Kode"
              @keydown.enter.prevent="onCusEnter"
              @keydown.f1.prevent="showCusModal = true"
              @blur="onCusEnter"
            />
            <input
              :value="fd.NamaCus"
              readonly
              class="inp ro"
              style="flex: 1"
              placeholder="Nama customer..."
              tabindex="-1"
            />
            <button class="ibtn" @click="showCusModal = true">
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="fg mt4">
          <label class="lb w90">Alamat</label>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 3px">
            <input v-model="fd.AlamatCus" class="inp" placeholder="Alamat..." />
            <input v-model="fd.KotaCus" class="inp" placeholder="Kota..." />
          </div>
        </div>

        <div class="fg mt4">
          <label class="lb w90">Jatuh Tempo</label>
          <input
            type="date"
            v-model="fd.TanggalTempo"
            class="inp"
            style="flex: 1"
          />
        </div>

        <div class="fg mt4">
          <label class="lb w90">PPN</label>
          <label class="ppn-checkbox">
            <input
              type="checkbox"
              v-model="fd.StsPpn"
              true-value="1"
              false-value="0"
              @change="onPpnCheckboxChange"
            />
            <span>Aktifkan</span>
          </label>
          <input
            v-model.number="fd.Ppn"
            type="number"
            class="inp tr"
            style="width: 70px"
            @blur="onPpnBlur"
          />
          <span class="lb">%</span>
        </div>
      </div>

      <!-- Rekening -->
      <div class="desktop-form-section">
        <div class="sec-title">Dibayarkan Ke</div>
        <div class="fg">
          <div class="ig" style="flex: 1">
            <input
              v-model="fd.RekBank"
              class="inp"
              style="flex: 1; text-transform: uppercase"
              placeholder="Ketik No. Rekening / Enter, F1=Cari"
              @keydown.enter.prevent="onRekEnter"
              @keydown.f1.prevent="showRekModal = true"
              @blur="onRekEnter"
            />
            <button
              class="ibtn"
              :disabled="!fd.KodePerush"
              @click="showRekModal = true"
            >
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
        </div>
        <div class="fg mt4">
          <input
            :value="fd.NamaBank"
            readonly
            class="inp ro"
            style="flex: 1"
            placeholder="Bank"
          />
        </div>
        <div class="fg mt4">
          <input
            :value="fd.AtasNama"
            readonly
            class="inp ro"
            style="flex: 1"
            placeholder="Atas Nama"
          />
        </div>
      </div>

      <!-- Status PIN5 -->
      <div class="desktop-form-section">
        <div v-if="fd.Xminta5" class="fg">
          <label class="lb w90">Status</label>
          <span
            class="chip"
            :class="{
              'chip-blue': fd.Xminta5 === 'WAIT',
              'chip-green': fd.Xminta5 === 'ACC',
              'chip-red': fd.Xminta5 === 'TOLAK' || fd.Xminta5 === 'MINTA',
            }"
            >{{ fd.Xminta5 }}</span
          >
        </div>
      </div>
    </template>

    <template #right-column>
      <!-- Detail Barang -->
      <div
        class="desktop-form-section"
        style="flex: 1.1; min-height: 0; display: flex; flex-direction: column"
      >
        <div class="dtbar">
          <span class="sec-title">Detail Barang</span>
          <span class="note ml8">Enter/F1 = pilih barang</span>
          <button
            class="tbtn tbtn-green"
            style="margin-left: auto"
            @click="openBarangModal()"
          >
            + Barang (F1)
          </button>
        </div>

        <div
          style="
            position: relative;
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
          "
        >
          <div v-if="isLoadingBarang" class="grid-loading-overlay">
            <v-progress-circular
              indeterminate
              color="primary"
              size="24"
              width="2"
            />
            <span>Memuat data barang...</span>
          </div>

          <div class="gwrap">
            <table class="gtbl">
              <thead>
                <tr>
                  <th style="width: 24px">#</th>
                  <th style="width: 120px">Kode</th>
                  <th style="min-width: 160px">Nama</th>
                  <th style="width: 90px">Ukuran</th>
                  <th style="width: 70px" class="tr hl-col">Jumlah</th>
                  <th style="width: 100px" class="tr hl-col">Harga</th>
                  <th style="width: 110px" class="tr">Total</th>
                  <th style="width: 30px"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in fd.Detail"
                  :key="row._key"
                  :class="[
                    i % 2 === 1 && row.Kode ? 'rs' : '',
                    !row.Kode ? 'row-empty' : '',
                  ]"
                >
                  <td class="tc muted" style="font-size: 10px">
                    {{ row.Kode ? i + 1 : "" }}
                  </td>
                  <td>
                    <template v-if="!row.Kode">
                      <div style="display: flex; align-items: center; gap: 2px">
                        <input
                          v-model="barangInputValues[row._key]"
                          class="ci mono"
                          placeholder="Ketik kode/Enter, F1=Cari"
                          style="flex: 1; font-size: 10px"
                          @keydown.enter.prevent="onBarangInputEnter(row._key)"
                          @keydown.f1.prevent="openBarangModal(row._key)"
                        />
                        <button
                          class="ibtn-sm"
                          tabindex="-1"
                          @click.stop="openBarangModal(row._key)"
                        >
                          <IconSearch :size="9" color="#1565c0" />
                        </button>
                      </div>
                    </template>
                    <input v-else :value="row.Kode" readonly class="ci mono" />
                  </td>
                  <td><input :value="row.NamaSpk" readonly class="ci" /></td>
                  <td><input :value="row.Ukuran" readonly class="ci" /></td>
                  <td>
                    <input
                      v-if="row.Kode"
                      v-model.number="row.Jumlah"
                      type="number"
                      class="ci tr hl"
                      @focus="sel"
                    />
                  </td>
                  <td>
                    <input
                      v-if="row.Kode"
                      v-model.number="row.Harga"
                      type="number"
                      class="ci tr hl"
                      @focus="sel"
                    />
                  </td>
                  <td class="tr" style="padding-right: 6px">
                    {{ row.Kode ? num(row.Jumlah * row.Harga) : "" }}
                  </td>
                  <td class="tc">
                    <button
                      v-if="row.Kode"
                      class="del-btn"
                      @click="removeBarangRow(row)"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="grid-summary">
            <span
              >Total: <b>{{ num(totalBarang) }}</b></span
            >
          </div>
        </div>
      </div>

      <!-- Baris kedua: Invoice Normal (melebar) + Ringkasan (sidebar tetap) -->
      <div style="flex: 1; min-height: 0; display: flex; gap: 8px">
        <!-- Detail Invoice Normal -->
        <div
          class="desktop-form-section"
          style="
            flex: 1;
            min-width: 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
          "
        >
          <div class="dtbar">
            <span class="sec-title">Invoice Normal Dinaungi</span>
            <span class="note ml8">Enter/F1=Spanduk, F4=Garmen</span>
            <div style="display: flex; gap: 6px; margin-left: auto">
              <button
                class="tbtn tbtn-blue"
                @click="openInvNormalModal('spanduk')"
              >
                + Spanduk (F1)
              </button>
              <button
                class="tbtn tbtn-teal"
                @click="openInvNormalModal('garmen')"
              >
                + Garmen (F4)
              </button>
            </div>
          </div>

          <div
            style="
              position: relative;
              flex: 1;
              min-height: 0;
              display: flex;
              flex-direction: column;
            "
          >
            <div v-if="isLoadingInvNormal" class="grid-loading-overlay">
              <v-progress-circular
                indeterminate
                color="primary"
                size="24"
                width="2"
              />
              <span>Memvalidasi invoice...</span>
            </div>

            <div class="gwrap">
              <table class="gtbl">
                <thead>
                  <tr>
                    <th style="width: 24px">#</th>
                    <th style="width: 130px">Invoice Normal</th>
                    <th style="width: 80px">Cabang</th>
                    <th style="width: 85px">Tanggal</th>
                    <th style="width: 80px">Kode Cus</th>
                    <th style="min-width: 160px">Nama Customer</th>
                    <th style="min-width: 160px">Alamat</th>
                    <th style="width: 110px" class="tr">Nominal</th>
                    <th style="width: 30px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, i) in fd.InvoiceNormalList"
                    :key="row._key"
                    :class="[
                      i % 2 === 1 && row.Nomor ? 'rs' : '',
                      !row.Nomor ? 'row-empty' : '',
                    ]"
                  >
                    <td class="tc muted" style="font-size: 10px">
                      {{ row.Nomor ? i + 1 : "" }}
                    </td>
                    <td>
                      <template v-if="!row.Nomor">
                        <div
                          style="display: flex; align-items: center; gap: 2px"
                        >
                          <input
                            v-model="invNormalInputValues[row._key]"
                            class="ci mono"
                            placeholder="Ketik nomor/Enter, F1/F4=Cari"
                            style="flex: 1; font-size: 10px"
                            @keydown.enter.prevent="
                              onInvNormalInputEnter(row._key)
                            "
                            @keydown.f1.prevent="
                              openInvNormalModal('spanduk', row._key)
                            "
                            @keydown.f4.prevent="
                              openInvNormalModal('garmen', row._key)
                            "
                          />
                        </div>
                      </template>
                      <input
                        v-else
                        :value="row.Nomor"
                        readonly
                        class="ci mono"
                      />
                    </td>
                    <td><input :value="row.Cabang" readonly class="ci" /></td>
                    <td><input :value="row.Tanggal" readonly class="ci" /></td>
                    <td><input :value="row.KodeCus" readonly class="ci" /></td>
                    <td>
                      <input :value="row.NamaCustomer" readonly class="ci" />
                    </td>
                    <td><input :value="row.Alamat" readonly class="ci" /></td>
                    <td class="tr" style="padding-right: 6px">
                      {{ row.Nomor ? num(row.Nominal) : "" }}
                    </td>
                    <td class="tc">
                      <button
                        v-if="row.Nomor"
                        class="del-btn"
                        @click="requestRemoveInvNormalRow(row)"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="grid-summary">
              <span
                >Total Nominal: <b>{{ num(totalNominalInvNormal) }}</b></span
              >
            </div>
          </div>
        </div>

        <!-- Ringkasan — sidebar tetap di sebelah Invoice Normal, selalu
             kelihatan tanpa perlu scroll -->
        <div class="desktop-form-section" style="width: 220px; flex-shrink: 0">
          <div class="sec-title">Ringkasan</div>
          <div class="rk-row">
            <span class="rk-lbl">Total</span>
            <span class="rk-val">{{ num(totalBarang) }}</span>
          </div>
          <div class="rk-row">
            <span class="rk-lbl">PPN</span>
            <span class="rk-val">{{ num(totalPpn) }}</span>
          </div>
          <div class="rk-row">
            <span class="rk-lbl rk-bold">Grand Total</span>
            <span class="rk-val rk-bold rk-primary">{{ num(grandTotal) }}</span>
          </div>
          <div class="rk-row">
            <span class="rk-lbl">Uang Muka</span>
            <span class="rk-val">{{ num(uangMuka) }}</span>
          </div>
          <div class="rk-row">
            <span class="rk-lbl">Nilai Piutang</span>
            <span class="rk-val">{{ num(nilaiPiutang) }}</span>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- ── Modals ── -->
  <PerusahaanSearchModal v-model="showPerushModal" @selected="selectPerush" />
  <CustomerSearchModal v-model="showCusModal" @selected="onCustomerSelect" />
  <RekeningSearchModal
    v-model="showRekModal"
    :kode-perusahaan="fd.KodePerush"
    @selected="selectRekening"
  />

  <!-- Modal Search Barang -->
  <BarangInvProSearchModal
    v-model="showBarangModal"
    :fetch-fn="barangFetchFn"
    @selected="selectBarang"
  />

  <!-- Modal Search Invoice Normal (F1 Spanduk / F4 Garmen) -->
  <InvoiceNormalSearchModal
    v-model="showInvNormalModal"
    :divisi-group="invNormalModalGroup"
    @selected="selectInvNormal"
  />

  <!-- Dialog Konfirmasi Hapus Baris Invoice Normal -->
  <v-dialog v-model="showDeleteInvNormalDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-error text-white"
        style="font-size: 13px; font-weight: 700"
      >
        <IconAlertTriangle :size="15" style="margin-right: 6px" />
        Konfirmasi
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Ingin hapus record ini?<br />
        <b>{{ pendingDeleteInvNormalRow?.Nomor }}</b>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn
          variant="text"
          size="small"
          @click="showDeleteInvNormalDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="error"
          @click="confirmRemoveInvNormalRow"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Print -->
  <v-dialog v-model="showPrintDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Cetak Invoice Tak Normal
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Data <b>{{ savedNomor }}</b> berhasil disimpan.<br />Ingin mencetak?
      </v-card-text>
      <v-card-actions class="pa-3 border-t" style="gap: 6px">
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
.fg {
  display: flex;
  align-items: center;
  gap: 5px;
}
.mt4 {
  margin-top: 4px;
}
.ml8 {
  margin-left: 8px;
}
.lb {
  font-size: 11px;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
}
.w90 {
  width: 90px;
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
.mono {
  font-family: monospace;
}

.tutup-buku-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff3e0;
  color: #e65100;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 6px;
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
.sel {
  height: 24px;
  font-size: 12px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  outline: none;
  padding: 0 4px;
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
.ibtn-sm {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 2px;
  cursor: pointer;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.chip {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 8px;
}
.chip-blue {
  background: #e3f2fd;
  color: #1565c0;
}
.chip-green {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip-red {
  background: #ffebee;
  color: #c62828;
}

.dtbar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-shrink: 0;
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
.row-empty td {
  background: #fafffe !important;
}
.row-empty:hover td {
  background: #e8f5e9 !important;
}
.hl-col {
  background: #0d47a1 !important;
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
.ci.tr {
  text-align: right;
}
.ci.hl {
  background: #fffde7 !important;
}

.del-btn {
  width: 18px;
  height: 18px;
  border: 1px solid #ffcdd2;
  border-radius: 2px;
  background: #ffebee;
  color: #c62828;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.del-btn:hover {
  background: #ffcdd2;
}

.grid-summary {
  background: #1565c0;
  color: white;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.grid-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  color: #1565c0;
  font-weight: 600;
  border-radius: 3px;
}

.tbtn {
  height: 24px;
  padding: 0 8px;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  white-space: nowrap;
}
.tbtn-green {
  background: #388e3c;
  color: white;
}
.tbtn-blue {
  background: #1565c0;
  color: white;
}
.tbtn-teal {
  background: #00796b;
  color: white;
}

.rk-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 22px;
}

/* Sidebar Ringkasan di kolom kanan — biar isinya nempel atas, tidak ikut
   stretch penuh tinggi baris flex bersama tabel Invoice Normal */
.desktop-form-section[style*="width: 220px"] {
  align-self: flex-start;
  overflow-y: auto;
}
.rk-lbl {
  font-size: 11px;
  color: #444;
  font-weight: 500;
}
.rk-val {
  font-size: 12px;
  color: #333;
  font-weight: 600;
}
.rk-bold {
  font-weight: 700;
}
.rk-primary {
  color: #1565c0;
  font-size: 13px;
}

.ppn-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #444;
  white-space: nowrap;
  cursor: pointer;
}
.ppn-checkbox input {
  width: 14px;
  height: 14px;
  cursor: pointer;
}

/* Lookup modal (barang / invoice normal) */
.lookup-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-size: 12px;
  max-height: 80vh;
}
.lookup-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  gap: 6px;
  flex-shrink: 0;
}
.lookup-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
  padding: 0;
}
.lookup-search {
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.search-input {
  width: 100%;
  height: 30px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}
.search-input:focus {
  border-color: #1565c0;
}
.lookup-table-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 160px;
}
.lookup-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
  color: #9e9e9e;
  font-size: 12px;
}
.lookup-table {
  width: 100%;
  border-collapse: collapse;
}
.lookup-table thead tr {
  position: sticky;
  top: 0;
  background: #f5f5f5;
  z-index: 1;
}
.lookup-table th {
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  border-bottom: 2px solid #e0e0e0;
  white-space: nowrap;
}
.lookup-table td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.lookup-row {
  cursor: pointer;
}
.lookup-row:hover td {
  background: #e3f2fd;
}
.td-kode {
  font-family: monospace;
  font-weight: 600;
  color: #1565c0;
}
</style>
