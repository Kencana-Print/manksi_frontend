<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { invFormService as svc } from "@/services/penjualan/invoiceFormService";
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import InvProformaSearchModal from "@/components/lookups/InvProformaSearchModal.vue";
import RekeningSearchModal from "@/components/lookups/RekeningSearchModal.vue";
import BarangInvProSearchModal from "@/components/lookups/BarangInvProSearchModal.vue";
import { IconReceipt, IconSearch, IconAlertTriangle } from "@tabler/icons-vue";

// ── Types ───────────────────────────────────────────────────────────────
interface DetailRow {
  _key: number;
  Kode: string;
  NamaSpk: string;
  Ukuran: string;
  Jumlah: number;
  Harga: number;
  SjNomor: string;
  JmlInv: number;
  Kurang: number;
  IsExisting: boolean; // true = baris asli dari load, false = baru ditambah user
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
  InvPro: string;
  Keterangan: string;
  StsPpn: number;
  Ppn: number;
  Pph: string;
  Disc: number;
  Apv: string;
  Xminta5: string;
  Xurut5: number;
  IsTutupBuku: boolean;
  Detail: DetailRow[];
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

const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

let _key = 1;
const sel = (e: FocusEvent) => (e.target as HTMLInputElement).select();
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

const divisiList = ref<{ kode: number; nama: string }[]>([]);

const init: FormData = {
  NomorInv: "",
  Divisi: "4",
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
  InvPro: "",
  Keterangan: "",
  StsPpn: 0,
  Ppn: 0,
  Pph: "",
  Disc: 0,
  Apv: "",
  Xminta5: "",
  Xurut5: 0,
  IsTutupBuku: false,
  Detail: [],
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
  menuId: "156",
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
      Divisi: String(h.inv_divisi || "4"),
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
      InvPro: h.inv_invpro || "",
      Keterangan: h.inv_keterangan || "",
      StsPpn: h.inv_sts_ppn || 0,
      Ppn: h.inv_ppn || 0,
      Pph: h.inv_pph || "",
      Disc: h.inv_disc || 0,
      Apv: h.inv_apvnosj || "",
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
        SjNomor: r.sjList || "-",
        JmlInv: Number(r.jml_inv) || 0,
        Kurang: Number(r.kurang) || 0,
        IsExisting: true,
      })),
    };
  },

  submitApi: async (data): Promise<any> => {
    const sjBaruTanpaSj = !isEditMode.value ? false : checkSpkBaruTanpaSj();
    if (sjBaruTanpaSj && !confirmedApvReset.value) {
      // handled di validateSave sebelum sampai sini
    }

    const payload = {
      ...data,
      NomorInv: route.query.nomor || data.NomorInv,
      ApvOverride: confirmedApvReset.value ? "" : undefined,
      Detail: data.Detail.filter((r) => r.Kode && Number(r.Jumlah) !== 0).map(
        ({ _key: _k, IsExisting: _ie, ...r }) => r,
      ),
    };
    return isEditMode.value ? svc.update(payload) : svc.save(payload);
  },

  onSuccess: (res: any) => {
    const nomor = res?.data?.data?.nomor || "";
    const apv = res?.data?.data?.apv || "";
    if (apv === "N") {
      toast.warning(
        `Tersimpan dengan nomor ${nomor}.\nBelum bisa cetak invoice karena ada SO yg belum dibuatkan SJ.`,
      );
      router.push({ name: "InvoiceBrowse" });
    } else {
      savedNomor.value = nomor;
      showPrintDialog.value = true;
    }
  },
});

const fd = formData;
const showPrintDialog = ref(false);
const savedNomor = ref("");

// ── Watch divisi default gudang tidak relevan untuk Invoice, skip ───────

// ── Lookup Modals ────────────────────────────────────────────────────────
const showPerushModal = ref(false);
const showCusModal = ref(false);
const showInvProModal = ref(false);

const selectPerush = async (item: any) => {
  fd.value.KodePerush = item.perush_kode || item.Kode || "";
  fd.value.NamaPerush = item.perush_nama || item.Nama || "";
  showPerushModal.value = false;
  fd.value.RekBank = "";
  fd.value.NamaBank = "";
  fd.value.AtasNama = "";
};

// ── Perusahaan — ketik kode + Enter ───────────────────────────────────
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
    fd.value.TanggalTempo = addDays(fd.value.Tanggal, Number(c.cus_top || 0));
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

const selectInvPro = async (item: any) => {
  const nomorPro = item.Nomor;
  if (!fd.value.KodeCus) {
    toast.warning("Customer di isi dulu ya.");
    return;
  }
  try {
    await svc.validateInvPro(nomorPro, fd.value.KodeCus);
    fd.value.InvPro = nomorPro;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Invoice proforma tidak valid.");
  }
  showInvProModal.value = false;
};

const onInvProBlur = async () => {
  const nomorPro = fd.value.InvPro.trim();
  if (!nomorPro) return;
  if (!fd.value.KodeCus) {
    toast.warning("Customer di isi dulu ya.");
    fd.value.InvPro = "";
    return;
  }
  try {
    await svc.validateInvPro(nomorPro, fd.value.KodeCus);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Invoice proforma tidak valid.");
    fd.value.InvPro = "";
  }
};

// Rekening modal sederhana via dropdown hasil lookup
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
const ensureEmptyRow = () => {
  const last = fd.value.Detail[fd.value.Detail.length - 1];
  if (!last || last.Kode) {
    fd.value.Detail.push({
      _key: _key++,
      Kode: "",
      NamaSpk: "",
      Ukuran: "",
      Jumlah: 0,
      Harga: 0,
      SjNomor: "",
      JmlInv: 0,
      Kurang: 0,
      IsExisting: false,
    });
  }
};

const isLoadingBarang = ref(false);
const barangInputValues = ref<Record<number, string>>({});

const addBarangByKode = async (kode: string, rowKey?: number) => {
  if (!fd.value.KodePerush) {
    toast.warning("Perusahaan silahkan di isi dulu");
    return;
  }
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
    const res = await svc.loadBarangDetail(kode, fd.value.KodePerush);
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
      SjNomor: b.SjNomor,
      JmlInv: b.JmlInv,
      Kurang: b.Kurang,
      IsExisting: false,
    });
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Barang Tidak di temukan.");
  } finally {
    isLoadingBarang.value = false;
    ensureEmptyRow();
  }
};

const onBarangInputEnter = async (rowKey: number) => {
  const val = (barangInputValues.value[rowKey] || "").trim();
  if (!val) return;
  await addBarangByKode(val, rowKey);
  barangInputValues.value[rowKey] = "";
};

const showBarangModal = ref(false);
const activeRowKey = ref<number | null>(null);

const openBarangModal = (rowKey?: number) => {
  if (!fd.value.KodePerush) {
    toast.warning("Perusahaan silahkan di isi dulu");
    return;
  }
  if (!fd.value.KodeCus) {
    toast.warning("Customer silahkan di isi dulu");
    return;
  }
  activeRowKey.value = rowKey ?? null;
  showBarangModal.value = true;
};

const selectBarang = async (item: any) => {
  showBarangModal.value = false;
  await addBarangByKode(item.Kode, activeRowKey.value ?? undefined);
  activeRowKey.value = null;
};

const onJumlahChange = (row: DetailRow) => {
  // total dihitung otomatis via computed
};

const removeRow = (row: DetailRow) => {
  if (!row.Kode) return;
  const idx = fd.value.Detail.indexOf(row);
  if (idx !== -1) fd.value.Detail.splice(idx, 1);
  ensureEmptyRow();
};

// ── Hitung total — sesuai Delphi hitung() ────────────────────────────────
const totalBarang = computed(() =>
  fd.value.Detail.reduce(
    (s, r) => s + Number(r.Jumlah || 0) * Number(r.Harga || 0),
    0,
  ),
);

const totalPpn = computed(() => {
  if (!fd.value.StsPpn) return 0;
  const disc = Number(fd.value.Disc || 0);
  if (fd.value.Pph === "Disc") {
    const baseAfterDisc = totalBarang.value - disc;
    return baseAfterDisc * (Number(fd.value.Ppn) / 100);
  }
  return totalBarang.value * (Number(fd.value.Ppn) / 100);
});

const grandTotal = computed(() => {
  const disc = Number(fd.value.Disc || 0);
  if (!fd.value.StsPpn) {
    return totalBarang.value - disc;
  }
  if (fd.value.Pph === "Disc") {
    const baseAfterDisc = totalBarang.value - disc;
    return baseAfterDisc + (baseAfterDisc * Number(fd.value.Ppn)) / 100;
  }
  return totalBarang.value - disc + totalPpn.value;
});

const uangMuka = ref(0); // dari getDebet, hanya tersedia saat edit
const nilaiPiutang = computed(() => grandTotal.value - uangMuka.value);

watch(
  () => fd.value.StsPpn,
  (val) => {
    if (val) {
      fd.value.Ppn = 11;
    } else {
      fd.value.Ppn = 0;
    }
  },
);

// ── Validasi ───────────────────────────────────────────────────────────
const showSpkBaruWarning = ref(false);
const confirmedApvReset = ref(false);

const checkSpkBaruTanpaSj = (): boolean => {
  if (!fd.value.Apv || fd.value.Apv === "N" || fd.value.Apv === "T")
    return false;
  for (const r of fd.value.Detail) {
    if (
      r.NamaSpk &&
      (!r.SjNomor || r.SjNomor === "" || r.SjNomor === "-") &&
      !r.IsExisting
    ) {
      return true;
    }
  }
  return false;
};

const validateSave = () => {
  if (!fd.value.NamaPerush) {
    toast.warning("Perusahaan belum di isi.");
    return;
  }
  if (!fd.value.NamaCus) {
    toast.warning("Customer belum di isi.");
    return;
  }

  const validRows = fd.value.Detail.filter((r) => r.Kode);
  if (!validRows.length) {
    toast.warning("Tidak ada detail, tidak dapat di simpan.");
    return;
  }

  if (["MINTA", "WAIT", "TOLAK"].includes(fd.value.Xminta5)) {
    toast.error(
      "Transaksi tsb sudah diclose.\nSilahkan minta approve untuk bisa menyimpan perubahan data.",
    );
    return;
  }

  if (isEditMode.value && checkSpkBaruTanpaSj() && !confirmedApvReset.value) {
    showSpkBaruWarning.value = true;
    return;
  }

  showSaveDialog.value = true;
};

const confirmSpkBaruWarning = () => {
  showSpkBaruWarning.value = false;
  confirmedApvReset.value = true;
  showSaveDialog.value = true;
};

// ── Print ─────────────────────────────────────────────────────────────────
const approvalLabel = computed(() => {
  if (fd.value.Apv === "N")
    return "Belum bisa cetak — ada SO yang belum dibuatkan Surat Jalan. Menunggu approval.";
  if (fd.value.Apv === "T")
    return "Tidak di-approve. Invoice ini tidak bisa dicetak.";
  return "";
});

const skipPrint = () => {
  showPrintDialog.value = false;
  router.push({ name: "InvoiceBrowse" });
};
const doCetak = (mode: "dotmatrix" | "inkjet") => {
  const url = router.resolve({
    name: "InvoicePrint",
    query: { nomor: savedNomor.value, mode },
  }).href;
  window.open(url, "_blank");
  showPrintDialog.value = false;
  router.push({ name: "InvoiceBrowse" });
};

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  const divRes = await svc.getDivisiList();
  divisiList.value = divRes.data.data || [];

  if (route.query.nomor) {
    await fetchData();
    ensureEmptyRow();
  } else {
    fd.value.Tanggal = todayLocal();
    ensureEmptyRow();
  }
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Invoice' : 'Tambah Invoice'"
    menu-id="156"
    :icon="IconReceipt"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Invoice"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <!-- Banner tutup buku -->
      <div
        v-if="fd.IsTutupBuku && fd.Xminta5 !== 'ACC'"
        class="tutup-buku-banner"
      >
        <IconAlertTriangle :size="14" />
        Periode transaksi ini sudah <b>Tutup Buku</b>. Pengajuan PIN diperlukan
        untuk menyimpan perubahan.
      </div>

      <div v-if="approvalLabel" class="approval-banner">
        <IconAlertTriangle :size="14" />
        {{ approvalLabel }}
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
          <label class="lb w90">Inv. Proforma</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="fd.InvPro"
              class="inp"
              style="flex: 1; text-transform: uppercase"
              placeholder="Ketik nomor / F1 cari..."
              @blur="onInvProBlur"
              @keydown.f1.prevent="showInvProModal = true"
            />
            <button class="ibtn" @click="showInvProModal = true">
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
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
              style="width: 60px; flex-shrink: 0; text-transform: uppercase"
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
              style="width: 60px; flex-shrink: 0; text-transform: uppercase"
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
            <input
              v-model="fd.KotaCus"
              class="inp"
              placeholder="Kota..."
              readonly
            />
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
            <input type="checkbox" v-model="fd.StsPpn" />
            <span>Aktifkan</span>
          </label>
          <input
            v-model.number="fd.Ppn"
            type="number"
            class="inp tr"
            style="width: 70px"
            :disabled="!fd.StsPpn"
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

      <!-- Status PIN5 + Note — tambahkan setelah section Rekening, sebelum tutup left-column -->
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
        <div class="note" :class="fd.Xminta5 ? 'mt8' : ''">
          [Note] Jika Invoice Proforma diisi, Maka Invoice Normal ini tidak akan
          dihitung sebagai Piutang.
        </div>
      </div>
    </template>

    <template #right-column>
      <div
        class="desktop-form-section"
        style="flex: 1; min-height: 0; display: flex; flex-direction: column"
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
                  <th style="width: 120px">SO</th>
                  <th style="min-width: 160px">Nama</th>
                  <th style="width: 90px">Ukuran</th>
                  <th style="width: 80px" class="tr hl-col">Jumlah</th>
                  <th style="width: 100px" class="tr hl-col">Harga</th>
                  <th style="width: 110px" class="tr">Total</th>
                  <th style="width: 130px">Surat Jalan</th>
                  <th style="width: 70px" class="tr">Sudah Inv</th>
                  <th style="width: 70px" class="tr">Kurang</th>
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
                      @change="onJumlahChange(row)"
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
                  <td>
                    <input
                      :value="row.SjNomor"
                      readonly
                      class="ci mono"
                      style="font-size: 10px"
                    />
                  </td>
                  <td class="tr">{{ row.Kode ? num(row.JmlInv) : "" }}</td>
                  <td
                    class="tr"
                    :style="
                      row.Kurang < 0 ? 'color:#c62828;font-weight:700' : ''
                    "
                  >
                    {{ row.Kode ? num(row.Kurang) : "" }}
                  </td>
                  <td class="tc">
                    <button
                      v-if="row.Kode"
                      class="del-btn"
                      @click="removeRow(row)"
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
              >Total Jumlah:
              <b>{{
                num(fd.Detail.reduce((s, r) => s + Number(r.Jumlah || 0), 0))
              }}</b></span
            >
          </div>

          <div class="ringkasan-footer">
            <div class="rk-col">
              <div class="rk-row">
                <span class="rk-lbl">Total</span>
                <span class="rk-val">{{ num(totalBarang) }}</span>
              </div>
              <div class="rk-row">
                <select v-model="fd.Pph" class="sel-disc">
                  <option value="">Disc</option>
                  <option value="PPh">PPh</option>
                </select>
                <input
                  v-model.number="fd.Disc"
                  type="number"
                  class="inp tr rk-input"
                />
              </div>
              <div class="rk-row">
                <span class="rk-lbl">PPN</span>
                <span class="rk-val">{{ num(totalPpn) }}</span>
              </div>
            </div>
            <div class="rk-col">
              <div class="rk-row">
                <span class="rk-lbl rk-bold">Grand Total</span>
                <span class="rk-val rk-bold rk-primary">{{
                  num(grandTotal)
                }}</span>
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
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- ── Modals ── -->
  <PerusahaanSearchModal v-model="showPerushModal" @selected="selectPerush" />
  <CustomerSearchModal v-model="showCusModal" @selected="onCustomerSelect" />
  <InvProformaSearchModal
    v-model="showInvProModal"
    :cus-kode="fd.KodeCus"
    @selected="selectInvPro"
  />

  <!-- Barang Modal -->
  <BarangInvProSearchModal
    v-model="showBarangModal"
    :perush-kode="fd.KodePerush"
    :cus-kode="fd.KodeCus"
    @selected="selectBarang"
  />

  <!-- Rekening Modal -->
  <RekeningSearchModal
    v-model="showRekModal"
    :kode-perusahaan="fd.KodePerush"
    @selected="selectRekening"
  />

  <!-- Dialog SPK baru tanpa SJ warning -->
  <v-dialog v-model="showSpkBaruWarning" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-warning text-white"
        style="font-size: 13px; font-weight: 700"
      >
        <IconAlertTriangle :size="15" style="margin-right: 6px" />
        Konfirmasi
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Dengan menambahkan SO baru di Invoice yang sudah di Approve ini, maka
        akan mengecek ulang SO yang belum dibuat SJ.
        <br /><br />
        Jika ditemukan SO yang belum dibuat SJ maka akan minta Approve lagi.
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="showSpkBaruWarning = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="warning"
          @click="confirmSpkBaruWarning"
          >Lanjutkan</v-btn
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
        Cetak Invoice
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Data <b>{{ savedNomor }}</b> berhasil disimpan.<br />Ingin mencetak?
      </v-card-text>
      <v-card-actions class="pa-3 border-t" style="gap: 6px; flex-wrap: wrap">
        <v-btn variant="text" size="small" @click="skipPrint">Tidak</v-btn>
        <v-spacer />
        <v-btn
          variant="outlined"
          size="small"
          color="blue-grey"
          @click="doCetak('dotmatrix')"
        >
          🖨️ Dot Matrix
        </v-btn>
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          @click="doCetak('inkjet')"
        >
          🖨️ InkJet (A4)
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
.mt8 {
  margin-top: 8px;
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
.sel-disc {
  height: 22px;
  font-size: 11px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  outline: none;
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

.summary-grid {
  display: flex;
  flex-direction: column;
}
.summary-val {
  font-size: 13px;
  font-weight: 600;
  color: #333;
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

.ringkasan-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-top: none;
  border-radius: 0 0 4px 4px;
  padding: 8px 14px;
  flex-shrink: 0;
}
.rk-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.rk-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 24px;
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
.rk-input {
  width: 140px;
  height: 22px;
}
.sel-disc {
  height: 22px;
  font-size: 11px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  outline: none;
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

.approval-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffebee;
  color: #c62828;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 6px;
}
</style>
