<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useTabsStore } from "@/stores/tabsStore";
import BaseForm from "@/components/BaseForm.vue";
import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import { voucherPembayaranFormService } from "@/services/piutang/voucherPembayaranFormService";
import {
  IconFileInvoice,
  IconSearch,
  IconPlus,
  IconTrash,
  IconPrinter,
} from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const tabsStore = useTabsStore();

const isEdit = computed(() => !!route.params.nomor);
const isLoading = ref(false);
const isSaving = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);
const showPrintDialog = ref(false);
const savedNomor = ref("");

const today = new Date().toISOString().slice(0, 10);

const form = ref({
  nomor: "",
  tanggal: today,
  supKode: "",
  supNama: "",
  supRekening: "",
  supBank: "",
  supCabang: "",
  supAtasnama: "",
  nomorPajak: "",
  statusPpn: false,
  ppn: 0,
  disc: 0,
  keterangan: "",
  pin5Status: "",
  pin5Urut: 0,
});

const originalSupRekening = ref("");
const originalSupBank = ref("");
const originalSupCabang = ref("");
const originalSupAtasnama = ref("");

interface DetailRow {
  tipe: string;
  searchType: string;
  nomor: string;
  tanggal: string;
  keterangan: string;
  jenis: string;
  nilai: number;
  nilaiMax: number;
  bs: number;
  tarif: number;
  potongan: number;
  total: number;
}
interface BahanRow {
  nama: string;
  satuan: string;
  jumlah: number;
  harga: number;
  nilai: number;
}

const detail = ref<DetailRow[]>([]);
const bahanTambahan = ref<BahanRow[]>([]);
const originalState = ref<any>(null);

const pin5Config = computed(() => {
  const map: Record<string, { label: string; color: string }> = {
    MINTA: { label: "Perlu Pengajuan", color: "#f57c00" },
    WAIT: { label: "Nunggu ACC", color: "#1565c0" },
    ACC: { label: "ACC — Bisa Simpan", color: "#2e7d32" },
    TOLAK: { label: "Ditolak", color: "#c62828" },
  };
  return map[form.value.pin5Status] ?? null;
});

const xpotonganBahan = computed(() =>
  bahanTambahan.value.reduce((s, b) => s + (Number(b.nilai) || 0), 0),
);
const xtotalDetail = computed(() =>
  detail.value.reduce((s, d) => {
    if (!d.tipe) return s;
    if (["BPB", "BPJ", "POE", "MMT", "BPE", "BPG"].includes(d.tipe))
      return s + (Number(d.total) || 0);
    if (["RET", "PJG"].includes(d.tipe)) return s - (Number(d.total) || 0);
    return s;
  }, 0),
);
const displayTotal = computed(() => xtotalDetail.value - xpotonganBahan.value);
const grandTotal = computed(
  () => displayTotal.value - (Number(form.value.disc) || 0),
);

const numFmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
const parseNum = (v: string) =>
  Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;

// ── Detail row ops ──
const createDetailRow = (searchType = "BPB"): DetailRow => ({
  tipe: "",
  searchType,
  nomor: "",
  tanggal: "",
  keterangan: "",
  jenis: "",
  nilai: 0,
  nilaiMax: 0,
  bs: 0,
  tarif: 0,
  potongan: 0,
  total: 0,
});

const addDetailRow = () => detail.value.push(createDetailRow());

const removeDetailRow = (idx: number) => detail.value.splice(idx, 1);

const recalcDetail = (d: DetailRow) => {
  d.potongan = Number(d.bs) * Number(d.tarif);
  d.total = Number(d.nilai) - d.potongan;
};

const onNilaiFocus = (d: DetailRow, e: Event) => {
  if (d.tipe === "RET") return;
  (e.target as HTMLInputElement).value = d.nilai ? String(d.nilai) : "";
};
const onNilaiInput = (d: DetailRow, e: Event) => {
  if (d.tipe === "RET") return;
  d.nilai = parseNum((e.target as HTMLInputElement).value);
};
const onNilaiBlur = (d: DetailRow, e: Event) => {
  if (d.nilaiMax > 0 && d.nilai > d.nilaiMax) {
    toast.warning("Nilai melebihi yang seharusnya.");
    d.nilai = d.nilaiMax;
  }
  recalcDetail(d);
  (e.target as HTMLInputElement).value = numFmt(d.nilai);
};
const onBsFocus = (d: DetailRow, e: Event) => {
  (e.target as HTMLInputElement).value = d.bs ? String(d.bs) : "";
};
const onBsInput = (d: DetailRow, e: Event) => {
  d.bs = parseNum((e.target as HTMLInputElement).value);
};
const onBsBlur = (d: DetailRow, e: Event) => {
  recalcDetail(d);
  (e.target as HTMLInputElement).value = numFmt(d.bs);
};
const onTarifFocus = (d: DetailRow, e: Event) => {
  (e.target as HTMLInputElement).value = d.tarif ? String(d.tarif) : "";
};
const onTarifInput = (d: DetailRow, e: Event) => {
  d.tarif = parseNum((e.target as HTMLInputElement).value);
};
const onTarifBlur = (d: DetailRow, e: Event) => {
  recalcDetail(d);
  (e.target as HTMLInputElement).value = numFmt(d.tarif);
};

// ── Load nota detail ──
const loadNotaDetail = async (idx: number, nomor: string, searchType = "") => {
  if (!nomor.trim()) return;
  const d = detail.value[idx];
  if (d.nilaiMax > 0 && d.nomor === nomor) return;
  try {
    const statusPpn = form.value.statusPpn ? 1 : 0;
    const res = await voucherPembayaranFormService.getNotaDetail(
      nomor,
      statusPpn,
      searchType,
    );
    Object.assign(detail.value[idx], res.data.data);
    recalcDetail(detail.value[idx]);
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Nota tidak ditemukan.");
    Object.assign(d, {
      tipe: "",
      tanggal: "",
      keterangan: "",
      nilai: 0,
      nilaiMax: 0,
      bs: 0,
      tarif: 0,
      potongan: 0,
      total: 0,
    });
  }
};
const onDetailNomorEnter = async (idx: number) => {
  const d = detail.value[idx];
  if (!d.nomor) return;
  d.nilaiMax = 0;
  await loadNotaDetail(idx, d.nomor, d.searchType);
};

// ── Bahan tambahan ops ──
const addBahanRow = () =>
  bahanTambahan.value.push({
    nama: "",
    satuan: "",
    jumlah: 0,
    harga: 0,
    nilai: 0,
  });
const removeBahanRow = (idx: number) => bahanTambahan.value.splice(idx, 1);

const onBahanJumlahFocus = (b: BahanRow, e: Event) => {
  (e.target as HTMLInputElement).value = b.jumlah ? String(b.jumlah) : "";
};
const onBahanJumlahInput = (b: BahanRow, e: Event) => {
  b.jumlah = parseNum((e.target as HTMLInputElement).value);
};
const onBahanJumlahBlur = (b: BahanRow, e: Event) => {
  b.nilai = Number(b.jumlah) * Number(b.harga);
  (e.target as HTMLInputElement).value = numFmt(b.jumlah);
};
const onBahanHargaFocus = (b: BahanRow, e: Event) => {
  (e.target as HTMLInputElement).value = b.harga ? String(b.harga) : "";
};
const onBahanHargaInput = (b: BahanRow, e: Event) => {
  b.harga = parseNum((e.target as HTMLInputElement).value);
};
const onBahanHargaBlur = (b: BahanRow, e: Event) => {
  b.nilai = Number(b.jumlah) * Number(b.harga);
  (e.target as HTMLInputElement).value = numFmt(b.harga);
};

// ── Supplier search — reuse SupplierSearchModal shared (Kode/Nama) ──
const showSupplierModal = ref(false);
const applySupplier = async (kode: string) => {
  try {
    const res = await voucherPembayaranFormService.getSupplier(kode);
    const s = res.data.data;
    Object.assign(form.value, {
      supKode: s.kode,
      supNama: s.nama,
      supRekening: s.rekening,
      supBank: s.bank,
      supCabang: s.cabang,
      supAtasnama: s.atasnama,
    });
    originalSupRekening.value = s.rekening || "";
    originalSupBank.value = s.bank || "";
    originalSupCabang.value = s.cabang || "";
    originalSupAtasnama.value = s.atasnama || "";
  } catch {
    toast.error("Kode supplier tidak ditemukan.");
    form.value.supKode = "";
    form.value.supNama = "";
  }
};
const selectSupplier = async (s: any) => {
  showSupplierModal.value = false;
  await applySupplier(s.Kode);
};
const onSupKodeBlur = async () => {
  if (!form.value.supKode) return;
  await applySupplier(form.value.supKode);
};

// ── Nota search modal (custom, banyak tipe) ──
const showNotaModal = ref(false);
const notaModalType = ref("BPB");
const activeNotaIdx = ref(-1);
const notaOptions = ref<any[]>([]);
const notaLoading = ref(false);
const notaSearch = ref("");
const selectedNotas = ref<any[]>([]);

const notaTypeConfig = computed(() => {
  const map: Record<string, { title: string; color: string }> = {
    RTG: { title: "Retur Barang", color: "#e65100" },
    BPB: { title: "BPB Bahan", color: "#1565c0" },
    BPJ: { title: "BPB Jasa", color: "#2e7d32" },
    POE: { title: "PO External", color: "#6a1b9a" },
    PJG: { title: "Potongan Jasa", color: "#4e342e" },
    MMT: { title: "BPB MMT", color: "#00695c" },
    BPE: { title: "BPB PO External MMT", color: "#0277bd" },
    BPG: { title: "BPB Non Bahan", color: "#6a1b9a" },
  };
  return map[notaModalType.value] ?? { title: "Cari Nota", color: "#1565c0" };
});

const openNotaModal = async (type: string, idx: number) => {
  if (!form.value.supKode && type !== "BPG") {
    toast.warning("Pilih supplier dahulu.");
    return;
  }
  notaModalType.value = type;
  activeNotaIdx.value = idx;
  notaSearch.value = "";
  notaOptions.value = [];
  selectedNotas.value = [];
  showNotaModal.value = true;
  notaLoading.value = true;
  try {
    const res = await voucherPembayaranFormService.searchNota(
      type,
      form.value.supKode,
      "",
    );
    notaOptions.value = res.data.data || [];
  } finally {
    notaLoading.value = false;
  }
};
const doSearchNota = async () => {
  notaLoading.value = true;
  try {
    const res = await voucherPembayaranFormService.searchNota(
      notaModalType.value,
      form.value.supKode,
      notaSearch.value,
    );
    notaOptions.value = res.data.data || [];
  } finally {
    notaLoading.value = false;
  }
};
// Nota yang sudah dipakai di baris lain (baris aktif tidak dihitung,
// karena baris aktif akan ditimpa)
const isNotaUsed = (n: any) =>
  detail.value.some((d, i) => i !== activeNotaIdx.value && d.nomor === n.Nomor);

const isNotaSelected = (n: any) =>
  selectedNotas.value.some((s) => s.Nomor === n.Nomor);

const toggleNota = (n: any) => {
  if (isNotaUsed(n)) return;
  if (isNotaSelected(n)) {
    selectedNotas.value = selectedNotas.value.filter(
      (s) => s.Nomor !== n.Nomor,
    );
  } else {
    selectedNotas.value.push(n);
  }
};

const selectableNotas = computed(() =>
  notaOptions.value.filter((n) => !isNotaUsed(n)),
);
const allNotaSelected = computed(
  () =>
    selectableNotas.value.length > 0 &&
    selectableNotas.value.every((n) => isNotaSelected(n)),
);
const toggleAllNota = () => {
  if (allNotaSelected.value) {
    const ids = new Set(selectableNotas.value.map((n) => n.Nomor));
    selectedNotas.value = selectedNotas.value.filter((s) => !ids.has(s.Nomor));
  } else {
    for (const n of selectableNotas.value) {
      if (!isNotaSelected(n)) selectedNotas.value.push(n);
    }
  }
};

const confirmNotaSelection = async () => {
  if (!selectedNotas.value.length) {
    toast.warning("Pilih minimal satu nota.");
    return;
  }

  const type = notaModalType.value;
  const startIdx = activeNotaIdx.value;
  const picked = [...selectedNotas.value];
  showNotaModal.value = false;

  // Siapkan baris: pertama di baris aktif, sisanya reuse baris kosong
  // di bawahnya atau sisipkan baris baru
  const targetIdx: number[] = [];
  let cursor = startIdx;
  picked.forEach((n, i) => {
    if (i > 0) {
      cursor++;
      const next = detail.value[cursor];
      if (!next || next.nomor) {
        detail.value.splice(cursor, 0, createDetailRow(type));
      }
    }
    const row = detail.value[cursor];
    row.nomor = n.Nomor;
    row.searchType = type;
    row.nilaiMax = 0;
    targetIdx.push(cursor);
  });

  await Promise.all(
    picked.map((n, i) => loadNotaDetail(targetIdx[i], n.Nomor, type)),
  );

  // BPG: supplier diambil dari nota pertama kalau belum ada
  if (type === "BPG" && picked[0]?.SupKode && !form.value.supKode) {
    await applySupplier(picked[0].SupKode);
  }
  selectedNotas.value = [];
};

// ── PPN & Disc ──
const onPpnChange = (val: boolean) => {
  if (!val) {
    form.value.ppn = 0;
    form.value.nomorPajak = "";
  }
};
const onDiscFocus = (e: Event) => {
  (e.target as HTMLInputElement).value = form.value.disc
    ? String(form.value.disc)
    : "";
};
const onDiscInput = (e: Event) => {
  form.value.disc = parseNum((e.target as HTMLInputElement).value);
};
const onDiscBlur = (e: Event) => {
  (e.target as HTMLInputElement).value = numFmt(form.value.disc);
};

// ── onMounted ──
onMounted(async () => {
  isLoading.value = true;
  try {
    if (isEdit.value) {
      const res = await voucherPembayaranFormService.getDetailForm(
        String(route.params.nomor),
      );
      const d = res.data.data;
      Object.assign(form.value, {
        nomor: d.nomor,
        tanggal: d.tanggal,
        supKode: d.supKode,
        supNama: d.supNama,
        supRekening: d.supRekening,
        supBank: d.supBank,
        supCabang: d.supCabang,
        supAtasnama: d.supAtasnama,
        nomorPajak: d.nomorPajak,
        statusPpn: d.statusPpn,
        ppn: d.ppn,
        disc: d.disc,
        keterangan: d.keterangan,
        pin5Status: d.pin5Status,
        pin5Urut: d.pin5Urut,
      });
      const typeMap: Record<string, string> = {
        BPB: "BPB",
        BPJ: "BPJ",
        MMT: "MMT",
        RET: "RTG",
        POE: "POE",
        PJG: "PJG",
        BPG: "BPG",
      };
      detail.value = (d.detail || []).map((row: any) => ({
        ...row,
        searchType: typeMap[row.tipe] ?? "BPB",
      }));
      bahanTambahan.value = d.bahanTambahan?.length ? d.bahanTambahan : [];
      originalSupRekening.value = d.supRekening || "";
      originalSupBank.value = d.supBank || "";
      originalSupCabang.value = d.supCabang || "";
      originalSupAtasnama.value = d.supAtasnama || "";
      originalState.value = JSON.parse(
        JSON.stringify({
          form: form.value,
          detail: detail.value,
          bahan: bahanTambahan.value,
        }),
      );
    } else {
      addDetailRow();
      addBahanRow();
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal memuat data.");
    router.back();
  } finally {
    isLoading.value = false;
  }
});

// ── Validasi & Save ──
const validateSave = () => {
  if (["MINTA", "WAIT", "TOLAK"].includes(form.value.pin5Status)) {
    const msgs: Record<string, string> = {
      MINTA: "Transaksi sudah diclose. Silahkan minta approve untuk menyimpan.",
      WAIT: "Transaksi sudah diclose. Sedang menunggu approve.",
      TOLAK: "Transaksi sudah diclose. Pengajuan perubahan ditolak.",
    };
    toast.warning(msgs[form.value.pin5Status]);
    return;
  }
  if (!form.value.supNama) {
    toast.warning("Supplier belum diisi.");
    return;
  }
  const filled = detail.value.filter((d) => d.tipe && d.nomor);
  if (!filled.length) {
    toast.warning("Detail nota harus diisi minimal satu baris.");
    return;
  }
  showSaveDialog.value = true;
};

const executeSave = async () => {
  isSaving.value = true;
  try {
    const payload = {
      nomor: form.value.nomor,
      tanggal: form.value.tanggal,
      supKode: form.value.supKode,
      nomorPajak: form.value.nomorPajak,
      statusPpn: form.value.statusPpn,
      ppn: form.value.ppn,
      disc: Number(form.value.disc) || 0,
      keterangan: form.value.keterangan,
      detail: detail.value.filter((d) => d.tipe && d.nomor),
      bahanTambahan: bahanTambahan.value.filter((b) => b.nama),
      pin5Status: form.value.pin5Status,
      pin5Urut: form.value.pin5Urut,
    };
    const res = isEdit.value
      ? await voucherPembayaranFormService.update(payload)
      : await voucherPembayaranFormService.save(payload);
    savedNomor.value = res.data?.data?.nomor || form.value.nomor;
    showSaveDialog.value = false;
    showPrintDialog.value = true;
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "Gagal menyimpan.");
  } finally {
    isSaving.value = false;
  }
};

const pilihCetak = () => {
  window.open(
    `/piutang/voucher-pembayaran/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  showPrintDialog.value = false;
  tabsStore.closeTab(route.path);
  router.push("/piutang/voucher-pembayaran");
};
const skipCetak = () => {
  showPrintDialog.value = false;
  tabsStore.closeTab(route.path);
  router.push("/piutang/voucher-pembayaran");
};

const executeCancel = () => {
  showCancelDialog.value = false;
  if (isEdit.value && originalState.value) {
    Object.assign(
      form.value,
      JSON.parse(JSON.stringify(originalState.value.form)),
    );
    detail.value = JSON.parse(JSON.stringify(originalState.value.detail));
    bahanTambahan.value = JSON.parse(JSON.stringify(originalState.value.bahan));
  } else {
    Object.assign(form.value, {
      tanggal: today,
      supKode: "",
      supNama: "",
      supRekening: "",
      supBank: "",
      supCabang: "",
      supAtasnama: "",
      nomorPajak: "",
      statusPpn: false,
      ppn: 0,
      disc: 0,
      keterangan: "",
    });
    detail.value = [];
    bahanTambahan.value = [];
    addDetailRow();
    addBahanRow();
    originalSupRekening.value = "";
    originalSupBank.value = "";
    originalSupCabang.value = "";
    originalSupAtasnama.value = "";
  }
};

const executeClose = () => {
  showCloseDialog.value = false;
  tabsStore.closeTab(route.path);
  router.push("/piutang/voucher-pembayaran");
};
</script>

<template>
  <BaseForm
    :title="isEdit ? 'Ubah Voucher Pembayaran' : 'Tambah Voucher Pembayaran'"
    menu-id="201"
    :icon="IconFileInvoice"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Voucher Pembayaran"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="vp-layout">
      <!-- ══ KOLOM KIRI ══ -->
      <div class="vp-left">
        <div
          v-if="pin5Config"
          class="pin5-banner"
          :style="{ background: pin5Config.color }"
        >
          {{ pin5Config.label }}
        </div>

        <div class="vp-section">
          <div class="vp-sec-title">Informasi Voucher</div>

          <div class="f-field">
            <label class="f-lbl">Nomor</label>
            <input
              :value="form.nomor || 'Otomatis'"
              readonly
              class="f-inp f-ro"
            />
          </div>
          <div class="f-field">
            <label class="f-lbl">Tanggal</label>
            <input type="date" v-model="form.tanggal" class="f-inp" />
          </div>
          <div class="f-field">
            <label class="f-lbl">Keterangan</label>
            <input
              v-model="form.keterangan"
              class="f-inp"
              placeholder="Keterangan voucher"
            />
          </div>
          <div class="f-field">
            <label class="f-lbl">PPN</label>
            <div class="ppn-row">
              <label class="ppn-check-wrap">
                <input
                  type="checkbox"
                  v-model="form.statusPpn"
                  @change="onPpnChange(form.statusPpn)"
                  class="ppn-check"
                />
                <span>PPN %</span>
              </label>
              <input
                v-model.number="form.ppn"
                type="number"
                class="f-inp"
                style="width: 70px; flex-shrink: 0"
                :disabled="!form.statusPpn"
                :class="{ f_ro: !form.statusPpn }"
              />
              <input
                v-model="form.nomorPajak"
                class="f-inp"
                placeholder="Nomor pajak"
                :disabled="!form.statusPpn"
              />
            </div>
          </div>
        </div>

        <div class="vp-section">
          <div class="vp-sec-title">Supplier</div>

          <div class="f-field">
            <label class="f-lbl">Kode <span class="req">*</span></label>
            <div class="igrp">
              <input
                v-model="form.supKode"
                class="f-inp-in"
                style="width: 90px; flex-shrink: 0"
                placeholder="Kode"
                @blur="onSupKodeBlur"
                @keydown.enter.prevent="onSupKodeBlur"
              />
              <input
                :value="form.supNama"
                readonly
                class="f-inp-in f-ro"
                style="flex: 1"
                placeholder="Nama supplier"
              />
              <button
                type="button"
                class="blkp"
                @click="showSupplierModal = true"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
          </div>
          <div class="f-field">
            <label class="f-lbl">Rekening</label>
            <input
              v-model="form.supRekening"
              class="f-inp"
              :readonly="!!originalSupRekening"
              :class="{ f_ro: !!originalSupRekening }"
              placeholder="No. rekening"
            />
          </div>
          <div class="f-field-2col">
            <div class="f-field">
              <label class="f-lbl">Bank</label>
              <input
                v-model="form.supBank"
                class="f-inp"
                :readonly="!!originalSupBank"
                :class="{ f_ro: !!originalSupBank }"
                placeholder="Bank"
              />
            </div>
            <div class="f-field">
              <label class="f-lbl">Cabang</label>
              <input
                v-model="form.supCabang"
                class="f-inp"
                :readonly="!!originalSupCabang"
                :class="{ f_ro: !!originalSupCabang }"
                placeholder="Cabang"
              />
            </div>
          </div>
          <div class="f-field">
            <label class="f-lbl">Atas Nama</label>
            <input
              v-model="form.supAtasnama"
              class="f-inp"
              :readonly="!!originalSupAtasnama"
              :class="{ f_ro: !!originalSupAtasnama }"
              placeholder="Atas nama"
            />
          </div>
        </div>
      </div>

      <!-- ══ KOLOM KANAN ══ -->
      <div class="vp-right">
        <!-- Detail Nota -->
        <div class="vp-detail-section" style="flex: 0 0 auto">
          <div class="vp-sec-header">
            <span class="vp-sec-title">Detail Nota</span>
            <button type="button" class="btn-add" @click="addDetailRow">
              <IconPlus :size="14" class="mr-1" /> Tambah
            </button>
          </div>
          <div class="vp-table-wrap">
            <table class="vp-table">
              <thead>
                <tr>
                  <th style="width: 30px" class="text-center">No</th>
                  <th style="min-width: 240px">Nomor Nota</th>
                  <th style="width: 90px">Tanggal</th>
                  <th style="width: 55px">Type</th>
                  <th style="min-width: 160px">Keterangan</th>
                  <th style="width: 110px" class="text-right">Nilai</th>
                  <th style="width: 80px" class="text-right">Jml BS</th>
                  <th style="width: 80px" class="text-right">Tarif</th>
                  <th style="width: 100px" class="text-right">Potongan</th>
                  <th style="width: 110px" class="text-right">Total</th>
                  <th style="width: 30px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, idx) in detail" :key="idx">
                  <td class="td-ctr">{{ idx + 1 }}</td>
                  <td class="td-inp">
                    <div class="cell-igrp">
                      <input
                        v-model="d.nomor"
                        class="cell"
                        style="min-width: 90px"
                        placeholder="Nomor nota..."
                        @keydown.enter.prevent="onDetailNomorEnter(idx)"
                      />
                      <select v-model="d.searchType" class="type-select">
                        <option value="BPB">BPB Bahan</option>
                        <option value="BPJ">BPB Jasa</option>
                        <option value="MMT">BPB MMT</option>
                        <option value="BPE">BPB PO Ext MMT</option>
                        <option value="BPG">BPB Non Bahan</option>
                      </select>
                      <button
                        type="button"
                        class="cell-search"
                        :title="`Cari ${d.searchType}`"
                        @click="openNotaModal(d.searchType, idx)"
                      >
                        <IconSearch :size="12" color="#1565c0" />
                      </button>
                    </div>
                  </td>
                  <td class="td-ctr" style="font-size: 10px">
                    {{ d.tanggal || "-" }}
                  </td>
                  <td class="td-ctr">
                    <span
                      v-if="d.tipe"
                      class="type-badge"
                      :class="`type-${d.tipe.toLowerCase()}`"
                      >{{ d.tipe }}</span
                    >
                  </td>
                  <td
                    class="td-inp"
                    style="
                      font-size: 10px;
                      max-width: 160px;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                    "
                  >
                    {{ d.keterangan || "-" }}
                  </td>
                  <td class="td-inp">
                    <input
                      :value="numFmt(d.nilai)"
                      type="text"
                      inputmode="numeric"
                      class="cell tr"
                      :readonly="d.tipe === 'RET'"
                      @focus="onNilaiFocus(d, $event)"
                      @input="onNilaiInput(d, $event)"
                      @blur="onNilaiBlur(d, $event)"
                    />
                  </td>
                  <td class="td-inp">
                    <input
                      :value="numFmt(d.bs)"
                      type="text"
                      inputmode="numeric"
                      class="cell tr"
                      @focus="onBsFocus(d, $event)"
                      @input="onBsInput(d, $event)"
                      @blur="onBsBlur(d, $event)"
                    />
                  </td>
                  <td class="td-inp">
                    <input
                      :value="numFmt(d.tarif)"
                      type="text"
                      inputmode="numeric"
                      class="cell tr"
                      @focus="onTarifFocus(d, $event)"
                      @input="onTarifInput(d, $event)"
                      @blur="onTarifBlur(d, $event)"
                    />
                  </td>
                  <td class="td-inp cell-val-ro tr">
                    {{ d.potongan ? numFmt(d.potongan) : "" }}
                  </td>
                  <td class="td-inp cell-total tr">{{ numFmt(d.total) }}</td>
                  <td class="td-ctr">
                    <button
                      type="button"
                      class="btn-del"
                      @click="removeDetailRow(idx)"
                    >
                      <IconTrash :size="14" />
                    </button>
                  </td>
                </tr>
                <tr v-if="!detail.length">
                  <td
                    colspan="11"
                    class="text-center text-grey py-4 font-italic"
                  >
                    Belum ada detail. Klik Tambah.
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="detail.length">
                <tr>
                  <td colspan="5" class="foot-lbl">Subtotal</td>
                  <td class="foot-val tr">
                    {{ numFmt(detail.reduce((s, d) => s + (d.nilai || 0), 0)) }}
                  </td>
                  <td colspan="2"></td>
                  <td class="foot-val tr">
                    {{
                      numFmt(detail.reduce((s, d) => s + (d.potongan || 0), 0))
                    }}
                  </td>
                  <td class="foot-val tr">{{ numFmt(xtotalDetail) }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Bahan Tambahan -->
        <div class="vp-detail-section vp-detail-section--compact">
          <div class="vp-sec-header">
            <span class="vp-sec-title">Bahan Tambahan</span>
            <button
              type="button"
              class="btn-add"
              style="background: #00695c"
              @click="addBahanRow"
            >
              <IconPlus :size="14" class="mr-1" /> Tambah
            </button>
          </div>
          <div class="vp-table-wrap">
            <table class="vp-table">
              <thead>
                <tr>
                  <th style="width: 30px" class="text-center">No</th>
                  <th style="min-width: 200px">Nama</th>
                  <th style="width: 90px">Satuan</th>
                  <th style="width: 90px" class="text-right">Jumlah</th>
                  <th style="width: 100px" class="text-right">Harga</th>
                  <th style="width: 110px" class="text-right">Nilai</th>
                  <th style="width: 30px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(b, idx) in bahanTambahan" :key="idx">
                  <td class="td-ctr">{{ idx + 1 }}</td>
                  <td class="td-inp">
                    <input
                      v-model="b.nama"
                      class="cell"
                      placeholder="Nama bahan..."
                    />
                  </td>
                  <td class="td-inp">
                    <input
                      v-model="b.satuan"
                      class="cell"
                      placeholder="pcs/kg..."
                    />
                  </td>
                  <td class="td-inp">
                    <input
                      :value="numFmt(b.jumlah)"
                      type="text"
                      inputmode="numeric"
                      class="cell tr"
                      @focus="onBahanJumlahFocus(b, $event)"
                      @input="onBahanJumlahInput(b, $event)"
                      @blur="onBahanJumlahBlur(b, $event)"
                    />
                  </td>
                  <td class="td-inp">
                    <input
                      :value="numFmt(b.harga)"
                      type="text"
                      inputmode="numeric"
                      class="cell tr"
                      @focus="onBahanHargaFocus(b, $event)"
                      @input="onBahanHargaInput(b, $event)"
                      @blur="onBahanHargaBlur(b, $event)"
                    />
                  </td>
                  <td class="td-inp cell-total tr">{{ numFmt(b.nilai) }}</td>
                  <td class="td-ctr">
                    <button
                      type="button"
                      class="btn-del"
                      @click="removeBahanRow(idx)"
                    >
                      <IconTrash :size="14" />
                    </button>
                  </td>
                </tr>
                <tr v-if="!bahanTambahan.length">
                  <td
                    colspan="7"
                    class="text-center text-grey py-4 font-italic"
                  >
                    Belum ada bahan tambahan.
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="bahanTambahan.length">
                <tr>
                  <td colspan="5" class="foot-lbl">Total Bahan</td>
                  <td class="foot-val tr">{{ numFmt(xpotonganBahan) }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Summary bar -->
        <div class="summary-bar">
          <div class="sbar-item">
            <span class="sbar-lbl">Total</span>
            <span class="sbar-val">{{ numFmt(displayTotal) }}</span>
          </div>
          <div class="sbar-div"></div>
          <div class="sbar-item">
            <label class="sbar-lbl">Discount</label>
            <input
              :value="numFmt(form.disc)"
              type="text"
              inputmode="numeric"
              class="sbar-disc-inp"
              @focus="onDiscFocus"
              @input="onDiscInput"
              @blur="onDiscBlur"
            />
          </div>
          <div class="sbar-div"></div>
          <div class="sbar-item sbar-grand">
            <span class="sbar-lbl-grand">Grand Total</span>
            <span class="sbar-val-grand">{{ numFmt(grandTotal) }}</span>
          </div>
        </div>
      </div>
    </div>
  </BaseForm>

  <SupplierSearchModal v-model="showSupplierModal" @selected="selectSupplier" />

  <!-- Modal Nota Search -->
  <v-dialog v-model="showNotaModal" max-width="700px" scrollable>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 text-subtitle-1 text-white"
        :style="{ background: notaTypeConfig.color }"
      >
        {{ notaTypeConfig.title }}
      </v-card-title>
      <v-card-text class="pa-3">
        <div class="d-flex" style="gap: 8px; margin-bottom: 10px">
          <input
            v-model="notaSearch"
            class="f-inp"
            style="flex: 1"
            placeholder="Cari nomor atau supplier..."
            autofocus
            @keydown.enter="doSearchNota"
          />
          <v-btn
            size="small"
            :style="{ background: notaTypeConfig.color }"
            style="color: white"
            :loading="notaLoading"
            @click="doSearchNota"
            >Cari</v-btn
          >
        </div>
        <div style="max-height: 380px; overflow-y: auto">
          <div v-if="notaLoading" class="text-center py-4 text-grey">
            Memuat...
          </div>
          <table v-else class="mini-table">
            <thead>
              <tr>
                <th style="width: 32px" class="text-center">
                  <input
                    type="checkbox"
                    :checked="allNotaSelected"
                    :disabled="!selectableNotas.length"
                    @change="toggleAllNota"
                  />
                </th>
                <th style="width: 140px">Nomor</th>
                <th style="width: 100px">Tanggal</th>
                <th v-if="notaModalType === 'BPG'" style="width: 90px">
                  Jenis
                </th>
                <th v-if="!['POE', 'BPE'].includes(notaModalType)">
                  Keterangan
                </th>
                <th v-if="['POE', 'BPE'].includes(notaModalType)">SPK</th>
                <th v-if="notaModalType === 'POE'">Nama SPK</th>
                <th>Supplier</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="n in notaOptions"
                :key="n.Nomor"
                class="mini-row"
                :class="{
                  'mini-row--selected': isNotaSelected(n),
                  'mini-row--used': isNotaUsed(n),
                }"
                @click="toggleNota(n)"
              >
                <td class="text-center">
                  <input
                    type="checkbox"
                    :checked="isNotaSelected(n)"
                    :disabled="isNotaUsed(n)"
                    @click.stop
                    @change="toggleNota(n)"
                  />
                </td>
                <td>{{ n.Nomor }}</td>
                <td>{{ n.Tanggal }}</td>
                <td v-if="notaModalType === 'BPG'">{{ n.Jenis }}</td>
                <td v-if="!['POE', 'BPE'].includes(notaModalType)">
                  {{ n.Keterangan }}
                </td>
                <td v-if="['POE', 'BPE'].includes(notaModalType)">
                  {{ n.Spk }}
                </td>
                <td v-if="notaModalType === 'POE'">{{ n.NamaSpk }}</td>
                <td>{{ n.Supplier }}</td>
              </tr>
              <tr v-if="!notaOptions.length">
                <td colspan="6" class="text-center text-grey py-3">
                  Tidak ada data
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <span class="text-caption text-grey-darken-1">
          {{ selectedNotas.length }} nota dipilih
        </span>
        <v-spacer />
        <v-btn
          variant="text"
          color="grey-darken-1"
          @click="showNotaModal = false"
        >
          Batal
        </v-btn>
        <v-btn
          variant="flat"
          :style="{ background: notaTypeConfig.color, color: 'white' }"
          :disabled="!selectedNotas.length"
          @click="confirmNotaSelection"
        >
          Pilih ({{ selectedNotas.length }})
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Cetak -->
  <v-dialog v-model="showPrintDialog" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconFileInvoice :size="18" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold">Voucher Tersimpan</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-3 text-grey-darken-3">
          Nomor <b class="text-primary">{{ savedNomor }}</b> berhasil disimpan.
          Cetak sekarang?
        </div>
        <v-btn color="primary" variant="flat" block @click="pilihCetak"
          >Cetak</v-btn
        >
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="grey-darken-1" @click="skipCetak"
          >Tutup (Tidak Cetak)</v-btn
        >
        <v-spacer />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.vp-layout {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.vp-left {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.vp-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}
.pin5-banner {
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  text-align: center;
}
.vp-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
}
.vp-sec-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.vp-sec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.f-field {
  margin-bottom: 8px;
}
.f-field-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
}
.f-field-2col .f-field {
  margin-bottom: 0;
}
.f-lbl {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  margin-bottom: 3px;
}
.req {
  color: #e53935;
}
.f-inp {
  width: 100%;
  height: 30px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  background: white;
  box-sizing: border-box;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-inp.f_ro,
.f-inp:read-only {
  background: #f5f5f5;
  color: #616161;
}
.ppn-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ppn-check-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #4b5563;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
}
.ppn-check {
  accent-color: #1565c0;
  cursor: pointer;
}
.igrp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 30px;
  background: white;
}
.f-inp-in {
  border: none;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.f-inp-in + .f-inp-in {
  border-left: 1px solid #e0e0e0;
}
.f-inp-in.f-ro {
  background: #f5f5f5;
  color: #616161;
}
.blkp {
  width: 30px;
  min-width: 30px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.blkp:hover {
  background: #bbdefb;
}
.btn-add {
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.btn-add:hover {
  opacity: 0.9;
}
.vp-detail-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.vp-table-wrap {
  flex: 1;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  min-height: 0;
  max-height: calc(100vh - 360px);
}
.vp-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}
.vp-table thead th {
  background: #1565c0;
  color: white;
  font-weight: 600;
  padding: 5px;
  position: sticky;
  top: 0;
  font-size: 11px;
  border: 1px solid #0d47a1;
  white-space: nowrap;
}
.vp-table td {
  border: 1px solid #eeeeee;
}
.vp-table tr:nth-of-type(even) td {
  background: #fafafa;
}
.td-ctr {
  text-align: center;
  padding: 3px 5px;
}
.td-inp {
  padding: 0;
}
.cell {
  width: 100%;
  height: 26px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 5px;
  font-family: inherit;
  color: #212121;
}
.cell:focus {
  background: #e3f2fd;
}
.cell.tr {
  text-align: right;
}
.cell-igrp {
  display: flex;
  align-items: center;
  height: 26px;
  gap: 1px;
}
.cell-val-ro {
  display: block;
  padding: 0 5px;
  font-size: 11px;
  color: #616161;
  line-height: 26px;
}
.cell-total {
  font-weight: 700;
  color: #0d47a1;
}
.cell-search {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
}
.cell-search:hover {
  background: #bbdefb;
}
.type-select {
  height: 22px;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 0 18px 0 4px;
  font-size: 10px;
  font-weight: 600;
  outline: none;
  background: white;
  color: #374151;
  cursor: pointer;
  flex-shrink: 0;
  min-width: 80px;
}
.type-select:focus {
  border-color: #1565c0;
}
.type-badge {
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.type-bpb {
  background: #e3f2fd;
  color: #1565c0;
}
.type-bpj {
  background: #e8f5e9;
  color: #2e7d32;
}
.type-ret {
  background: #fff3e0;
  color: #e65100;
}
.type-poe {
  background: #f3e5f5;
  color: #6a1b9a;
}
.type-pjg {
  background: #efebe9;
  color: #4e342e;
}
.type-mmt {
  background: #e0f2f1;
  color: #00695c;
}
.type-bpe {
  background: #e1f5fe;
  color: #0277bd;
}
.type-bpg {
  background: #f3e5f5;
  color: #6a1b9a;
}
.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 2px;
}
.btn-del:hover {
  background: #ffebee;
  border-radius: 3px;
}
.foot-lbl {
  text-align: right;
  font-weight: 700;
  padding: 5px 8px;
  background: #f5f5f5;
  font-size: 11px;
}
.foot-val {
  font-weight: 700;
  padding: 5px 8px;
  background: #e3f2fd;
  color: #1565c0;
  font-size: 11px;
}
.summary-bar {
  background: #1565c0;
  border-radius: 6px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.sbar-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sbar-grand {
  margin-left: auto;
}
.sbar-lbl {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
}
.sbar-val {
  font-size: 12px;
  font-weight: 700;
  color: white;
}
.sbar-lbl-grand {
  font-size: 12px;
  font-weight: 700;
  color: white;
  white-space: nowrap;
}
.sbar-val-grand {
  font-size: 15px;
  font-weight: 700;
  color: #90caf9;
}
.sbar-div {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}
.sbar-disc-inp {
  width: 110px;
  height: 24px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  font-weight: 700;
  text-align: right;
  outline: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
}
.sbar-disc-inp:focus {
  border-color: #90caf9;
}
.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.mini-table th {
  background: #f5f5f5;
  padding: 6px 8px;
  text-align: left;
  border-bottom: 2px solid #e0e0e0;
  font-size: 11px;
  font-weight: 700;
  position: sticky;
  top: 0;
}
.mini-table td {
  padding: 5px 8px;
  border-bottom: 1px solid #f0f0f0;
}
.mini-row {
  cursor: pointer;
}
.mini-row:hover td {
  background: #e3f2fd;
}
.mini-row--selected td {
  background: #e3f2fd;
}
.mini-row--used {
  cursor: not-allowed;
  opacity: 0.45;
}
.mini-row--used:hover td {
  background: transparent;
}
.mini-table input[type="checkbox"] {
  accent-color: #1565c0;
  cursor: pointer;
}
</style>
