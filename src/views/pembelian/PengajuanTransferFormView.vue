<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useTabsStore } from "@/stores/tabsStore";
import { pengajuanTransferFormService } from "@/services/pembelian/pengajuanTransferFormService";
import BaseForm from "@/components/BaseForm.vue";
import CollapsiblePanel from "@/components/CollapsiblePanel.vue";
import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import BkkSearchModal from "@/components/lookups/BkkSearchModal.vue";
import {
  IconTransfer,
  IconSearch,
  IconPlus,
  IconTrash,
  IconPrinter,
} from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const tabsStore = useTabsStore();

const isEdit = computed(() => !!route.params.nomor && !route.meta?.isRealisasi);
const isRealisasi = computed(() => !!route.meta?.isRealisasi);
const isEditOrRealisasi = computed(() => !!route.params.nomor);
const formTitle = computed(() => {
  if (isRealisasi.value) return "Realisasi Pengajuan Transfer";
  if (isEditOrRealisasi.value) return "Ubah Pengajuan Transfer";
  return "Tambah Pengajuan Transfer";
});
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
  rek_kode: "",
  rek_nama: "",
  rek_rekening: "",
  byrvoucher: "",
  detail: [] as any[],
});

const originalForm = ref<any>(null);
const accountOptions = ref<any[]>([]);

const totalNominal = computed(() =>
  form.value.detail.reduce((s, d) => s + (Number(d.nominal) || 0), 0),
);
const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
const parseNum = (v: string) =>
  Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;

const fmtDate = (v: string) => {
  if (!v) return "-";
  const [y, m, d] = v.split("-");
  return `${d}-${m}-${y}`;
};

onMounted(async () => {
  isLoading.value = true;
  try {
    const resAcc = await pengajuanTransferFormService.getAccountOptions();
    accountOptions.value = resAcc.data.data || [];

    if (!isEditOrRealisasi.value) {
      if (accountOptions.value.length) {
        form.value.rek_kode = accountOptions.value[0].kode;
        form.value.rek_nama = accountOptions.value[0].nama;
        form.value.rek_rekening = accountOptions.value[0].rekening;
      }
      addRow();
    } else {
      const res = await pengajuanTransferFormService.getDetailForm(
        String(route.params.nomor),
      );
      const d = res.data.data;
      form.value.nomor = d.nomor;
      form.value.tanggal = d.tanggal;
      form.value.rek_kode = d.rek_kode;
      form.value.rek_nama = d.rek_nama;
      form.value.rek_rekening = d.rek_rekening;
      form.value.byrvoucher = d.byrvoucher;
      form.value.detail = d.detail || [];
      originalForm.value = JSON.parse(JSON.stringify(form.value));
      await nextTick();
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
    router.back();
  } finally {
    isLoading.value = false;
  }
});

// ── Account Header modal ──
const showAccountModal = ref(false);
const accHeaderSearch = ref("");
const filteredAccHeader = computed(() => {
  if (!accHeaderSearch.value) return accountOptions.value;
  const q = accHeaderSearch.value.toLowerCase();
  return accountOptions.value.filter(
    (a: any) =>
      a.kode.toLowerCase().includes(q) || a.nama.toLowerCase().includes(q),
  );
});
const selectAccount = (acc: any) => {
  form.value.rek_kode = acc.kode;
  form.value.rek_nama = acc.nama;
  form.value.rek_rekening = acc.rekening;
  showAccountModal.value = false;
};

// ── Generic modal state helper ──
interface ModalState<T> {
  allItems: T[];
  loading: boolean;
  search: string;
}
const createModalState = <T,>(): ModalState<T> => ({
  allItems: [],
  loading: false,
  search: "",
});

// ── Supplier — reuse SupplierSearchModal (shared, /lookups/supplier) ──
const showSupplierModal = ref(false);
const showSupDetModal = ref(false);
const activeSupIdx = ref(-1);
const supplierDetOptions = ref<any[]>([]);

const openSupplierModal = (idx: number) => {
  activeSupIdx.value = idx;
  showSupplierModal.value = true;
};
const applySupplierDetail = (idx: number, det: any) => {
  if (idx < 0) return;
  const d = form.value.detail[idx];
  d.kode = det.kode || "";
  d.nama = det.nama || "";
  d.bank = det.bank || "";
  d.rekening = det.rekening || "";
  d.atasnama = det.atasnama || "";
};
const selectSupplier = async (sup: any) => {
  showSupplierModal.value = false;
  const res = await pengajuanTransferFormService.getSupplierDetail(sup.Kode);
  const det = res.data.data || [];
  if (det.length === 1) {
    applySupplierDetail(activeSupIdx.value, det[0]);
  } else if (det.length > 1) {
    supplierDetOptions.value = det;
    showSupDetModal.value = true;
  } else {
    applySupplierDetail(activeSupIdx.value, {
      kode: sup.Kode,
      nama: sup.Nama,
      bank: "",
      rekening: "",
      atasnama: "",
    });
  }
};
const selectSupplierDet = (det: any) => {
  applySupplierDetail(activeSupIdx.value, det);
  showSupDetModal.value = false;
};

// ── Kode Sup diketik manual + Enter/blur — validasi exact match ke
// server, sama pola BKK/BBM ──
const onKodeSupEnter = async (d: any) => {
  if (d.jurnal || isRealisasi.value) return;
  const kode = (d.kode || "").trim();
  if (!kode) {
    d.nama = "";
    return;
  }
  const res = await pengajuanTransferFormService.getSupplierDetail(kode);
  const det = res.data.data || [];
  if (det.length) {
    applySupplierDetail(form.value.detail.indexOf(d), {
      kode,
      nama: det[0].nama,
      bank: det[0].bank,
      rekening: det[0].rekening,
      atasnama: det[0].atasnama,
    });
  } else {
    toast.error("Kode supplier tidak ditemukan.");
    d.kode = "";
    d.nama = "";
  }
};

// ── BKK (F1) ──
const showBkkModal = ref(false);
const openBkkModal = (idx: number) => {
  activeTrsIdx.value = idx;
  showBkkModal.value = true;
};
const selectBkk = (items: any[]) => {
  if (!items || !items.length) return;

  const usedNomors = new Set(
    form.value.detail
      .filter((_, i) => i !== activeTrsIdx.value)
      .map((d) => d.trs)
      .filter(Boolean),
  );

  const duplicates: string[] = [];
  const toApply = items.filter((b) => {
    if (usedNomors.has(b.nomor)) {
      duplicates.push(b.nomor);
      return false;
    }
    usedNomors.add(b.nomor);
    return true;
  });

  if (duplicates.length) {
    toast.warning(`Nomor BKK sudah di-input: ${duplicates.join(", ")}`);
  }
  if (!toApply.length) {
    showBkkModal.value = false;
    return;
  }

  // Item pertama isi baris yang sedang aktif (row tempat F1/tombol dipencet)
  const first = toApply[0];
  const d0 = form.value.detail[activeTrsIdx.value];
  d0.trs = first.nomor;
  d0.nominal = Number(first.nominal) || 0;

  // Item selebihnya masing-masing jadi baris baru
  for (let i = 1; i < toApply.length; i++) {
    addRow();
    const newIdx = form.value.detail.length - 1;
    form.value.detail[newIdx].trs = toApply[i].nomor;
    form.value.detail[newIdx].nominal = Number(toApply[i].nominal) || 0;
  }

  showBkkModal.value = false;
};

// ── Voucher (F2) / PO External (F3) / Petty Cash (F4) — trs search ──
const activeTrsIdx = ref(-1);
const showVoucherModal = ref(false);
const showPoModal = ref(false);
const showPcModal = ref(false);
const vouState = ref<ModalState<any>>(createModalState());
const poState = ref<ModalState<any>>(createModalState());
const pcState = ref<ModalState<any>>(createModalState());
let vouDebounce: ReturnType<typeof setTimeout> | null = null;
let poDebounce: ReturnType<typeof setTimeout> | null = null;
let pcDebounce: ReturnType<typeof setTimeout> | null = null;

const doSearchVoucher = async () => {
  vouState.value.loading = true;
  try {
    const res = await pengajuanTransferFormService.getVoucherOptions(
      vouState.value.search,
    );
    vouState.value.allItems = res.data.data || [];
  } finally {
    vouState.value.loading = false;
  }
};
const searchVoucherDebounced = () => {
  if (vouDebounce) clearTimeout(vouDebounce);
  vouDebounce = setTimeout(doSearchVoucher, 350);
};
const openVoucherModal = async (idx: number) => {
  activeTrsIdx.value = idx;
  vouState.value = createModalState();
  showVoucherModal.value = true;
  await doSearchVoucher();
};
const selectVoucher = (v: any) => {
  const exists = form.value.detail.some(
    (d, i) => i !== activeTrsIdx.value && d.trs === v.nomor,
  );
  if (exists) {
    toast.warning("Nomor Voucher tsb sudah di input.");
    return;
  }
  const d = form.value.detail[activeTrsIdx.value];
  d.trs = v.nomor;
  d.nominal = Number(v.nominal) || 0;
  showVoucherModal.value = false;
};

const doSearchPo = async () => {
  poState.value.loading = true;
  try {
    const res = await pengajuanTransferFormService.getPoExternalOptions(
      poState.value.search,
    );
    poState.value.allItems = res.data.data || [];
  } finally {
    poState.value.loading = false;
  }
};
const searchPoDebounced = () => {
  if (poDebounce) clearTimeout(poDebounce);
  poDebounce = setTimeout(doSearchPo, 350);
};
const openPoModal = async (idx: number) => {
  activeTrsIdx.value = idx;
  poState.value = createModalState();
  showPoModal.value = true;
  await doSearchPo();
};
const selectPo = (p: any) => {
  const exists = form.value.detail.some(
    (d, i) => i !== activeTrsIdx.value && d.trs === p.nomor,
  );
  if (exists) {
    toast.warning("PO External tsb sudah di input.");
    return;
  }
  const d = form.value.detail[activeTrsIdx.value];
  d.trs = p.nomor;
  d.nominal = Number(p.nominal) || 0;
  showPoModal.value = false;
};

const doSearchPc = async () => {
  pcState.value.loading = true;
  try {
    const res = await pengajuanTransferFormService.getPettyCashOptions(
      pcState.value.search,
    );
    pcState.value.allItems = res.data.data || [];
  } finally {
    pcState.value.loading = false;
  }
};
const searchPcDebounced = () => {
  if (pcDebounce) clearTimeout(pcDebounce);
  pcDebounce = setTimeout(doSearchPc, 350);
};
const openPcModal = async (idx: number) => {
  activeTrsIdx.value = idx;
  pcState.value = createModalState();
  showPcModal.value = true;
  await doSearchPc();
};
const selectPc = (p: any) => {
  const exists = form.value.detail.some(
    (d, i) => i !== activeTrsIdx.value && d.trs === p.nomor,
  );
  if (exists) {
    toast.warning("Nomor tsb sudah di input.");
    return;
  }
  const d = form.value.detail[activeTrsIdx.value];
  d.trs = p.nomor;
  d.nominal = Number(p.nominal) || 0;
  showPcModal.value = false;
};

// ── Account (realisasi) ──
const showAccModal = ref(false);
const activeAccIdx = ref(-1);
const accAllState = ref<ModalState<any>>(createModalState());
let accDebounce: ReturnType<typeof setTimeout> | null = null;
const doSearchAcc = async () => {
  accAllState.value.loading = true;
  try {
    const res = await pengajuanTransferFormService.getAccountAll(
      accAllState.value.search,
    );
    accAllState.value.allItems = res.data.data || [];
  } finally {
    accAllState.value.loading = false;
  }
};
const searchAccDebounced = () => {
  if (accDebounce) clearTimeout(accDebounce);
  accDebounce = setTimeout(doSearchAcc, 350);
};
const openAccModal = async (idx: number) => {
  activeAccIdx.value = idx;
  accAllState.value = createModalState();
  showAccModal.value = true;
  await doSearchAcc();
};
const selectAcc = (acc: any) => {
  if (activeAccIdx.value < 0) return;
  const d = form.value.detail[activeAccIdx.value];
  if (acc.kode === form.value.rek_kode) {
    toast.warning("Account tidak boleh sama dengan Account header.");
    return;
  }
  d.rekkode = acc.kode;
  d.reknama = acc.nama;
  showAccModal.value = false;
};
// ── Account diketik manual + Enter/blur (mode realisasi) — validasi
// exact match ke server, sama pola BKK/BBM ──
const onRekkodeEnter = async (d: any) => {
  const kode = (d.rekkode || "").trim();
  if (!kode) {
    d.reknama = "";
    return;
  }
  if (kode === form.value.rek_kode) {
    toast.warning("Account tidak boleh sama dengan Account header.");
    d.rekkode = "";
    d.reknama = "";
    return;
  }
  try {
    if (accAllState.value.allItems.length === 0) {
      const res = await pengajuanTransferFormService.getAccountAll("");
      accAllState.value.allItems = res.data.data || [];
    }
    const found = accAllState.value.allItems.find(
      (a: any) => (a.kode || "").toUpperCase() === kode.toUpperCase(),
    );
    if (found) {
      d.rekkode = found.kode;
      d.reknama = found.nama;
    } else {
      toast.error("Kode account tidak ditemukan.");
      d.rekkode = "";
      d.reknama = "";
    }
  } catch {
    toast.error("Gagal validasi kode account.");
  }
};

// ── Cost Center (realisasi) ──
const showCcModal = ref(false);
const activeCcIdx = ref(-1);
const ccAllState = ref<ModalState<any>>(createModalState());
let ccDebounce: ReturnType<typeof setTimeout> | null = null;
const doSearchCc = async () => {
  ccAllState.value.loading = true;
  try {
    const res = await pengajuanTransferFormService.getCostCenterOptions(
      ccAllState.value.search,
    );
    ccAllState.value.allItems = res.data.data || [];
  } finally {
    ccAllState.value.loading = false;
  }
};
const searchCcDebounced = () => {
  if (ccDebounce) clearTimeout(ccDebounce);
  ccDebounce = setTimeout(doSearchCc, 350);
};
const openCcModal = async (idx: number) => {
  activeCcIdx.value = idx;
  ccAllState.value = createModalState();
  showCcModal.value = true;
  await doSearchCc();
};
const selectCc = (cc: any) => {
  if (activeCcIdx.value < 0) return;
  const d = form.value.detail[activeCcIdx.value];
  const oldCc = d.cckode;
  d.cckode = cc.kode;
  d.ccnama = cc.nama;
  if (oldCc !== cc.kode) {
    d.dcnama = "";
    d.dckode = 0;
  }
  showCcModal.value = false;
};

// ── Detail CC (realisasi) ──
const showDcModal = ref(false);
const activeDcIdx = ref(-1);
const dcAllState = ref<ModalState<any>>(createModalState());
let dcDebounce: ReturnType<typeof setTimeout> | null = null;
const doSearchDc = async () => {
  dcAllState.value.loading = true;
  const cckode = form.value.detail[activeDcIdx.value]?.cckode || 0;
  try {
    const res = await pengajuanTransferFormService.getDcOptions(
      cckode,
      dcAllState.value.search,
    );
    dcAllState.value.allItems = res.data.data || [];
  } finally {
    dcAllState.value.loading = false;
  }
};
const searchDcDebounced = () => {
  if (dcDebounce) clearTimeout(dcDebounce);
  dcDebounce = setTimeout(doSearchDc, 350);
};
const openDcModal = async (idx: number) => {
  const d = form.value.detail[idx];
  if (!d.cckode) {
    toast.warning("Pilih Cost Center dahulu.");
    return;
  }
  activeDcIdx.value = idx;
  dcAllState.value = createModalState();
  showDcModal.value = true;
  await doSearchDc();
};
const selectDc = (dc: any) => {
  if (activeDcIdx.value < 0) return;
  form.value.detail[activeDcIdx.value].dcnama = dc.nama;
  form.value.detail[activeDcIdx.value].dckode = dc.kode;
  showDcModal.value = false;
};

// ── Detail grid ──
const addRow = () => {
  form.value.detail.push({
    nourut: 0,
    kode: "",
    nama: "",
    bank: "",
    rekening: "",
    atasnama: "",
    trs: "",
    nominal: 0,
    ket: "",
    tglRealisasi: "",
    rekkode: "",
    reknama: "",
    cckode: 0,
    ccnama: "",
    dcnama: "",
    dckode: 0,
    jurnal: "",
    batal: "",
  });
};
const removeRow = (idx: number) => {
  const d = form.value.detail[idx];
  if (d.jurnal) {
    toast.warning("Item ini sudah di realisasi. Tidak bisa dihapus.");
    return;
  }
  form.value.detail.splice(idx, 1);
};

const onNominalFocus = (d: any, e: Event) => {
  if (d.jurnal || isRealisasi.value) return;
  (e.target as HTMLInputElement).value = d.nominal ? String(d.nominal) : "";
};
const onNominalInput = (d: any, e: Event) => {
  if (d.jurnal || isRealisasi.value) return;
  d.nominal = parseNum((e.target as HTMLInputElement).value);
};
const onNominalBlur = (d: any, e: Event) => {
  (e.target as HTMLInputElement).value = numFmt(d.nominal);
};

// ── Dialog Batal per baris (mode realisasi) ──
const showBatalDialog = ref(false);
const activeBatalIdx = ref(-1);
const batalKet = ref("");
const openBatalDialog = (idx: number) => {
  const d = form.value.detail[idx];
  if (d.tglRealisasi) {
    toast.warning("Jika akan dibatalkan, realisasinya di hapus dulu ya!");
    return;
  }
  activeBatalIdx.value = idx;
  batalKet.value = d.batal || "";
  showBatalDialog.value = true;
};
const confirmBatal = () => {
  if (!batalKet.value.trim()) {
    toast.warning("Keterangan batal harus diisi.");
    return;
  }
  if (activeBatalIdx.value < 0) return;
  form.value.detail[activeBatalIdx.value].batal = batalKet.value.trim();
  showBatalDialog.value = false;
  batalKet.value = "";
};

const showUnbatalDialog = ref(false);
const activeUnbatalIdx = ref(-1);
const openUnbatalDialog = (idx: number) => {
  activeUnbatalIdx.value = idx;
  showUnbatalDialog.value = true;
};
const confirmUnbatal = () => {
  if (activeUnbatalIdx.value < 0) return;
  form.value.detail[activeUnbatalIdx.value].batal = "";
  showUnbatalDialog.value = false;
};

// ── Validasi ──
const validateSave = () => {
  if (!form.value.rek_kode || !form.value.rek_nama) {
    toast.warning("Rekening Asal harus diisi.");
    return;
  }
  const filled = form.value.detail.filter((d: any) => d.nama);
  if (!filled.length) {
    toast.warning("Detail harus diisi.");
    return;
  }

  if (!isRealisasi.value) {
    for (const d of filled) {
      if (!d.nominal || d.nominal === 0) {
        toast.warning(`Nominal harus diisi pada baris: ${d.nama}`);
        return;
      }
      if (!d.ket.trim()) {
        toast.warning(`Keterangan harus diisi pada baris: ${d.nama}`);
        return;
      }
    }
  } else {
    for (const d of filled) {
      if (d.jurnal) continue;
      if (d.batal) continue;

      if (d.tglRealisasi) {
        if (!d.rekkode) {
          toast.warning(`Account harus diisi pada baris: ${d.nama}`);
          return;
        }
        const prefix = (d.rekkode || "").substring(0, 1);
        if (prefix !== "A" && prefix !== "B") {
          if (d.dckode === 0) {
            const msg = !d.dcnama.trim()
              ? `Detail CC harus diisi pada baris: ${d.nama}`
              : `Detail CC harus diisi dengan benar pada baris: ${d.nama}`;
            toast.warning(msg);
            return;
          }
        }
      }
    }
  }

  showSaveDialog.value = true;
};

const executeSave = async () => {
  isSaving.value = true;
  try {
    const payload = {
      nomor: form.value.nomor,
      tanggal: form.value.tanggal,
      rek_kode: form.value.rek_kode,
      byrvoucher: form.value.byrvoucher,
      detail: form.value.detail,
    };
    const res = isRealisasi.value
      ? await pengajuanTransferFormService.realisasi(payload)
      : isEditOrRealisasi.value
        ? await pengajuanTransferFormService.update(payload)
        : await pengajuanTransferFormService.save(payload);

    savedNomor.value = res.data?.data?.nomor || form.value.nomor;
    showSaveDialog.value = false;

    if (isRealisasi.value) {
      toast.success(`Berhasil disimpan. Nomor: ${savedNomor.value}`);
      tabsStore.closeTab(route.path);
      router.push("/pembelian/pengajuan-transfer");
    } else {
      toast.success("Data berhasil disimpan.");
      showPrintDialog.value = true;
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan.");
  } finally {
    isSaving.value = false;
  }
};

const executeCancel = () => {
  showCancelDialog.value = false;
  if (isEditOrRealisasi.value && originalForm.value) {
    Object.assign(form.value, JSON.parse(JSON.stringify(originalForm.value)));
  } else {
    form.value.tanggal = today;
    form.value.detail = [];
    addRow();
  }
};
const executeClose = () => {
  showCloseDialog.value = false;
  tabsStore.closeTab(route.path);
  router.push("/pembelian/pengajuan-transfer");
};

const pilihCetak = () => {
  window.open(
    `/pembelian/pengajuan-transfer/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  showPrintDialog.value = false;
  tabsStore.closeTab(route.path);
  router.push("/pembelian/pengajuan-transfer");
};
const skipCetak = () => {
  showPrintDialog.value = false;
  tabsStore.closeTab(route.path);
  router.push("/pembelian/pengajuan-transfer");
};
</script>

<template>
  <BaseForm
    :title="formTitle"
    menu-id="958"
    :icon="IconTransfer"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Pengajuan Transfer"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="pt-layout">
      <!-- ══ KOLOM KIRI ══ -->
      <CollapsiblePanel width="280px">
        <div class="pt-left">
          <div class="pt-section">
            <div class="pt-sec-title">Informasi Pengajuan</div>

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
              <input
                type="date"
                v-model="form.tanggal"
                class="f-inp"
                :readonly="isRealisasi"
              />
            </div>

            <div class="f-field">
              <label class="f-lbl"
                >Rekening Asal <span class="req">*</span></label
              >
              <div class="igrp">
                <input
                  :value="form.rek_kode"
                  readonly
                  class="f-inp-in"
                  style="width: 90px; flex-shrink: 0"
                />
                <input
                  :value="form.rek_nama"
                  readonly
                  class="f-inp-in f-ro"
                  style="flex: 1"
                />
                <button
                  v-if="!isRealisasi"
                  type="button"
                  class="blkp"
                  @click="showAccountModal = true"
                >
                  <IconSearch :size="13" color="#1565c0" />
                </button>
              </div>
              <div v-if="form.rek_rekening" class="f-hint">
                Rekening: {{ form.rek_rekening }}
              </div>
            </div>

            <div v-if="form.byrvoucher" class="f-field">
              <label class="f-lbl">No. Bayar Voucher</label>
              <input :value="form.byrvoucher" readonly class="f-inp f-ro" />
            </div>
          </div>

          <div class="total-box">
            <span>Total Nominal</span>
            <span>{{ numFmt(totalNominal) }}</span>
          </div>

          <div class="hint-box">
            <div class="hint-title">Pintasan di kolom No. Transaksi:</div>
            <div class="hint-row"><span class="hint-key">F1</span> No. BKK</div>
            <div class="hint-row">
              <span class="hint-key">F2</span> Voucher Pembayaran
            </div>
            <div class="hint-row">
              <span class="hint-key">F3</span> PO External
            </div>
            <div class="hint-row">
              <span class="hint-key">F4</span> Petty Cash
            </div>
          </div>
        </div>
      </CollapsiblePanel>

      <!-- ══ KOLOM KANAN ══ -->
      <div class="pt-right">
        <div class="pt-sec-header">
          <span class="pt-sec-title">Detail Pengajuan</span>
          <button type="button" class="btn-add" @click="addRow">
            <IconPlus :size="14" class="mr-1" /> Tambah Baris
          </button>
        </div>

        <div class="pt-table-wrap">
          <table class="pt-table">
            <thead>
              <tr>
                <th style="width: 35px" class="text-center">No</th>
                <th style="width: 100px">Kode Sup</th>
                <th style="min-width: 200px">Nama Supplier</th>
                <th style="width: 80px">Bank</th>
                <th style="min-width: 150px">Atas Nama</th>
                <th style="min-width: 130px">Rek. Tujuan</th>
                <th style="min-width: 120px">No. Transaksi</th>
                <th style="width: 110px" class="text-right">Nominal</th>
                <th style="min-width: 160px">Keterangan</th>
                <th style="width: 100px">Tgl Realisasi</th>
                <th style="width: 90px">Account</th>
                <th style="min-width: 150px">Nama Account</th>
                <th style="min-width: 140px">Cost Center</th>
                <th style="min-width: 110px">Ket Batal</th>
                <th style="width: 40px" class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(d, idx) in form.detail"
                :key="idx"
                :style="
                  d.batal
                    ? 'color:#cc0000'
                    : d.tglRealisasi
                      ? 'color:#1565c0'
                      : ''
                "
              >
                <td class="td-ctr">{{ idx + 1 }}</td>

                <td class="td-inp">
                  <div class="cell-igrp">
                    <input
                      v-model="d.kode"
                      class="cell"
                      style="width: 65px; flex-shrink: 0"
                      :readonly="!!d.jurnal || isRealisasi"
                      @keydown.enter.prevent="onKodeSupEnter(d)"
                      @blur="onKodeSupEnter(d)"
                    />
                    <button
                      v-if="!d.jurnal && !isRealisasi"
                      type="button"
                      class="cell-search"
                      @click="openSupplierModal(idx)"
                    >
                      <IconSearch :size="12" color="#1565c0" />
                    </button>
                  </div>
                </td>

                <td class="td-inp">
                  <span class="cell-val-ro">{{ d.nama || "-" }}</span>
                </td>

                <td class="td-inp">
                  <input
                    v-model="d.bank"
                    class="cell"
                    :readonly="!!d.jurnal || isRealisasi"
                  />
                </td>

                <td class="td-inp">
                  <input
                    v-model="d.atasnama"
                    class="cell"
                    :readonly="!!d.jurnal || isRealisasi"
                  />
                </td>

                <td class="td-inp">
                  <input
                    v-model="d.rekening"
                    class="cell"
                    :readonly="!!d.jurnal || isRealisasi"
                  />
                </td>

                <td class="td-inp">
                  <div class="cell-igrp">
                    <input
                      v-model="d.trs"
                      class="cell"
                      :readonly="!!d.jurnal || isRealisasi"
                      @keydown.f1.prevent="
                        !d.jurnal && !isRealisasi && openBkkModal(idx)
                      "
                      @keydown.f2.prevent="
                        !d.jurnal && !isRealisasi && openVoucherModal(idx)
                      "
                      @keydown.f3.prevent="
                        !d.jurnal && !isRealisasi && openPoModal(idx)
                      "
                      @keydown.f4.prevent="
                        !d.jurnal && !isRealisasi && openPcModal(idx)
                      "
                    />
                    <div v-if="!d.jurnal && !isRealisasi" class="trs-btn-group">
                      <button
                        type="button"
                        class="trs-btn"
                        title="F1: BKK"
                        @click="openBkkModal(idx)"
                      >
                        K
                      </button>
                      <button
                        type="button"
                        class="trs-btn"
                        title="F2: Voucher"
                        @click="openVoucherModal(idx)"
                      >
                        V
                      </button>
                      <button
                        type="button"
                        class="trs-btn"
                        title="F3: PO External"
                        @click="openPoModal(idx)"
                      >
                        P
                      </button>
                      <button
                        type="button"
                        class="trs-btn"
                        title="F4: Petty Cash"
                        @click="openPcModal(idx)"
                      >
                        C
                      </button>
                    </div>
                  </div>
                </td>

                <td class="td-inp">
                  <input
                    :value="numFmt(d.nominal)"
                    type="text"
                    inputmode="numeric"
                    class="cell tr"
                    :readonly="!!d.jurnal || isRealisasi"
                    @focus="onNominalFocus(d, $event)"
                    @input="onNominalInput(d, $event)"
                    @blur="onNominalBlur(d, $event)"
                  />
                </td>

                <td class="td-inp">
                  <input v-model="d.ket" class="cell" :readonly="!!d.batal" />
                </td>

                <td class="td-inp">
                  <input
                    v-if="isRealisasi && !d.jurnal && !d.batal"
                    v-model="d.tglRealisasi"
                    type="date"
                    class="cell"
                  />
                  <span
                    v-else
                    class="cell-val-ro"
                    :style="{ color: d.tglRealisasi ? '#1565c0' : '#9e9e9e' }"
                  >
                    {{ d.tglRealisasi ? fmtDate(d.tglRealisasi) : "-" }}
                  </span>
                </td>

                <td class="td-inp">
                  <div
                    v-if="isRealisasi && d.tglRealisasi && !d.batal"
                    class="cell-igrp"
                  >
                    <input
                      v-model="d.rekkode"
                      class="cell"
                      style="width: 65px; flex-shrink: 0"
                      placeholder="Kode"
                      @keydown.enter.prevent="onRekkodeEnter(d)"
                      @blur="onRekkodeEnter(d)"
                    />
                    <button
                      type="button"
                      class="cell-search"
                      @click="openAccModal(idx)"
                    >
                      <IconSearch :size="12" color="#1565c0" />
                    </button>
                  </div>
                  <span v-else class="cell-val-ro">{{ d.rekkode || "-" }}</span>
                </td>

                <td class="td-inp">
                  <span class="cell-val-ro">{{ d.reknama || "-" }}</span>
                </td>

                <td class="td-inp">
                  <div class="cell-igrp">
                    <span class="cell-val">
                      {{
                        d.ccnama
                          ? d.dcnama
                            ? `${d.ccnama} - ${d.dcnama}`
                            : d.ccnama
                          : "-"
                      }}
                    </span>
                    <button
                      v-if="isRealisasi && d.tglRealisasi && !d.batal"
                      type="button"
                      class="cell-search"
                      @click="d.cckode ? openDcModal(idx) : openCcModal(idx)"
                    >
                      <IconSearch :size="12" color="#1565c0" />
                    </button>
                  </div>
                </td>

                <td class="td-inp">
                  <div class="cell-igrp">
                    <span
                      class="cell-val-ro"
                      :style="{ color: d.batal ? '#cc0000' : '#9e9e9e' }"
                    >
                      {{ d.batal || "-" }}
                    </span>
                    <template v-if="isRealisasi && !d.jurnal">
                      <button
                        v-if="!d.batal"
                        type="button"
                        class="batal-btn"
                        :disabled="!!d.tglRealisasi"
                        @click="openBatalDialog(idx)"
                      >
                        Batal
                      </button>
                      <button
                        v-else
                        type="button"
                        class="unbatal-btn"
                        @click="openUnbatalDialog(idx)"
                      >
                        Gak Jadi
                      </button>
                    </template>
                  </div>
                </td>

                <td class="td-ctr">
                  <button
                    v-if="!isRealisasi"
                    type="button"
                    class="btn-del"
                    :disabled="!!d.jurnal"
                    @click="removeRow(idx)"
                  >
                    <IconTrash :size="14" />
                  </button>
                </td>
              </tr>
              <tr v-if="!form.detail.length">
                <td colspan="15" class="text-center text-grey py-4 font-italic">
                  Belum ada item. Klik "Tambah Baris".
                </td>
              </tr>
            </tbody>
            <tfoot v-if="form.detail.length">
              <tr>
                <td colspan="7" class="foot-lbl">Total</td>
                <td class="foot-val tr">{{ numFmt(totalNominal) }}</td>
                <td colspan="7"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </BaseForm>

  <!-- Modal Account Header -->
  <v-dialog v-model="showAccountModal" max-width="550px">
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1"
        >Pilih Rekening Asal</v-card-title
      >
      <v-card-text class="pa-3">
        <input
          v-model="accHeaderSearch"
          class="f-inp mb-2"
          placeholder="Cari rekening..."
          autofocus
        />
        <div style="max-height: 340px; overflow-y: auto">
          <table class="mini-table">
            <thead>
              <tr>
                <th style="width: 90px">Kode</th>
                <th>Nama</th>
                <th style="width: 140px">Rekening</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="a in filteredAccHeader"
                :key="a.kode"
                class="mini-row"
                @click="selectAccount(a)"
              >
                <td>{{ a.kode }}</td>
                <td>{{ a.nama }}</td>
                <td>{{ a.rekening || "-" }}</td>
              </tr>
              <tr v-if="filteredAccHeader.length === 0">
                <td colspan="3" class="text-center text-grey py-3">
                  Tidak ada hasil
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Modal Supplier — reuse shared component -->
  <SupplierSearchModal v-model="showSupplierModal" @selected="selectSupplier" />

  <BkkSearchModal v-model="showBkkModal" @selected="selectBkk" />

  <!-- Modal Supplier Detail Rekening -->
  <v-dialog v-model="showSupDetModal" max-width="500px">
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1"
        >Pilih Rekening Supplier</v-card-title
      >
      <v-card-text class="pa-3">
        <table class="mini-table">
          <thead>
            <tr>
              <th style="width: 90px">Bank</th>
              <th style="width: 130px">Rekening</th>
              <th>Atas Nama</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(det, i) in supplierDetOptions"
              :key="i"
              class="mini-row"
              @click="selectSupplierDet(det)"
            >
              <td>{{ det.bank }}</td>
              <td>{{ det.rekening }}</td>
              <td>{{ det.atasnama }}</td>
            </tr>
          </tbody>
        </table>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Modal Voucher (F2) -->
  <v-dialog v-model="showVoucherModal" max-width="640px" scrollable>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 text-subtitle-1 text-white"
        style="background: #7b1fa2"
        >F2 — Voucher Pembayaran</v-card-title
      >
      <v-card-text class="pa-3">
        <input
          v-model="vouState.search"
          class="f-inp mb-2"
          placeholder="Cari nomor atau supplier..."
          autofocus
          @input="searchVoucherDebounced"
        />
        <div style="max-height: 340px; overflow-y: auto">
          <div v-if="vouState.loading" class="text-center py-4 text-grey">
            Memuat...
          </div>
          <table v-else class="mini-table">
            <thead>
              <tr>
                <th style="width: 140px">Nomor</th>
                <th style="width: 100px">Tanggal</th>
                <th>Supplier</th>
                <th style="width: 120px" class="text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="v in vouState.allItems"
                :key="v.nomor"
                class="mini-row"
                @click="selectVoucher(v)"
              >
                <td>{{ v.nomor }}</td>
                <td>{{ v.tanggal }}</td>
                <td>{{ v.supplier }}</td>
                <td class="text-right">{{ numFmt(v.nominal) }}</td>
              </tr>
              <tr v-if="vouState.allItems.length === 0">
                <td colspan="4" class="text-center text-grey py-3">
                  Tidak ada hasil
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Modal PO External (F3) -->
  <v-dialog v-model="showPoModal" max-width="700px" scrollable>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 text-subtitle-1 text-white"
        style="background: #e65100"
        >F3 — PO External</v-card-title
      >
      <v-card-text class="pa-3">
        <input
          v-model="poState.search"
          class="f-inp mb-2"
          placeholder="Cari nomor, supplier, atau SPK..."
          autofocus
          @input="searchPoDebounced"
        />
        <div style="max-height: 340px; overflow-y: auto">
          <div v-if="poState.loading" class="text-center py-4 text-grey">
            Memuat...
          </div>
          <table v-else class="mini-table">
            <thead>
              <tr>
                <th style="width: 140px">Nomor</th>
                <th style="width: 100px">Tanggal</th>
                <th style="width: 110px">SPK</th>
                <th>Supplier</th>
                <th style="width: 120px" class="text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in poState.allItems"
                :key="p.nomor"
                class="mini-row"
                @click="selectPo(p)"
              >
                <td>{{ p.nomor }}</td>
                <td>{{ p.tanggal }}</td>
                <td>{{ p.spk }}</td>
                <td>{{ p.supplier }}</td>
                <td class="text-right">{{ numFmt(p.nominal) }}</td>
              </tr>
              <tr v-if="poState.allItems.length === 0">
                <td colspan="5" class="text-center text-grey py-3">
                  Tidak ada hasil
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Modal Petty Cash (F4) -->
  <v-dialog v-model="showPcModal" max-width="580px" scrollable>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 text-subtitle-1 text-white"
        style="background: #00695c"
        >F4 — Petty Cash</v-card-title
      >
      <v-card-text class="pa-3">
        <input
          v-model="pcState.search"
          class="f-inp mb-2"
          placeholder="Cari nomor atau store..."
          autofocus
          @input="searchPcDebounced"
        />
        <div style="max-height: 340px; overflow-y: auto">
          <div v-if="pcState.loading" class="text-center py-4 text-grey">
            Memuat...
          </div>
          <table v-else class="mini-table">
            <thead>
              <tr>
                <th style="width: 140px">Nomor</th>
                <th style="width: 100px">Tanggal</th>
                <th style="width: 80px">Store</th>
                <th>Nama Store</th>
                <th style="width: 120px" class="text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in pcState.allItems"
                :key="p.nomor"
                class="mini-row"
                @click="selectPc(p)"
              >
                <td>{{ p.nomor }}</td>
                <td>{{ p.tanggal }}</td>
                <td>{{ p.store }}</td>
                <td>{{ p.namaStore }}</td>
                <td class="text-right">{{ numFmt(p.nominal) }}</td>
              </tr>
              <tr v-if="pcState.allItems.length === 0">
                <td colspan="5" class="text-center text-grey py-3">
                  Tidak ada hasil
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Modal Account All (realisasi) -->
  <v-dialog v-model="showAccModal" max-width="520px" scrollable>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1"
        >Pilih Account</v-card-title
      >
      <v-card-text class="pa-3">
        <input
          v-model="accAllState.search"
          class="f-inp mb-2"
          placeholder="Cari kode atau nama..."
          autofocus
          @input="searchAccDebounced"
        />
        <div style="max-height: 340px; overflow-y: auto">
          <div v-if="accAllState.loading" class="text-center py-4 text-grey">
            Memuat...
          </div>
          <table v-else class="mini-table">
            <thead>
              <tr>
                <th style="width: 100px">Kode</th>
                <th>Nama</th>
                <th style="width: 70px">Cabang</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="a in accAllState.allItems"
                :key="a.kode"
                class="mini-row"
                @click="selectAcc(a)"
              >
                <td>{{ a.kode }}</td>
                <td>{{ a.nama }}</td>
                <td class="text-center">{{ a.cabang }}</td>
              </tr>
              <tr v-if="accAllState.allItems.length === 0">
                <td colspan="3" class="text-center text-grey py-3">
                  Ketik utk cari
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Modal Cost Center (realisasi) -->
  <v-dialog v-model="showCcModal" max-width="440px" scrollable>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1"
        >Pilih Cost Center</v-card-title
      >
      <v-card-text class="pa-3">
        <input
          v-model="ccAllState.search"
          class="f-inp mb-2"
          placeholder="Cari nama cost center..."
          autofocus
          @input="searchCcDebounced"
        />
        <div style="max-height: 340px; overflow-y: auto">
          <div v-if="ccAllState.loading" class="text-center py-4 text-grey">
            Memuat...
          </div>
          <table v-else class="mini-table">
            <thead>
              <tr>
                <th style="width: 80px">Kode</th>
                <th>Nama</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in ccAllState.allItems"
                :key="c.kode"
                class="mini-row"
                @click="selectCc(c)"
              >
                <td>{{ c.kode }}</td>
                <td>{{ c.nama }}</td>
              </tr>
              <tr v-if="ccAllState.allItems.length === 0">
                <td colspan="2" class="text-center text-grey py-3">
                  Ketik utk cari
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Modal Detail CC (realisasi) -->
  <v-dialog v-model="showDcModal" max-width="440px" scrollable>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1"
        >Pilih Detail Cost Center</v-card-title
      >
      <v-card-text class="pa-3">
        <input
          v-model="dcAllState.search"
          class="f-inp mb-2"
          placeholder="Cari detail CC..."
          autofocus
          @input="searchDcDebounced"
        />
        <div style="max-height: 340px; overflow-y: auto">
          <div v-if="dcAllState.loading" class="text-center py-4 text-grey">
            Memuat...
          </div>
          <table v-else class="mini-table">
            <thead>
              <tr>
                <th style="width: 80px">Kode</th>
                <th>Nama</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="dc in dcAllState.allItems"
                :key="dc.kode"
                class="mini-row"
                @click="selectDc(dc)"
              >
                <td>{{ dc.kode }}</td>
                <td>{{ dc.nama }}</td>
              </tr>
              <tr v-if="dcAllState.allItems.length === 0">
                <td colspan="2" class="text-center text-grey py-3">
                  Tidak ada hasil
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Dialog Batal Item -->
  <v-dialog v-model="showBatalDialog" max-width="380px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #cc0000"
        >Batalkan Item</v-card-title
      >
      <v-card-text class="pa-4">
        <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px">
          Item: <strong>{{ form.detail[activeBatalIdx]?.nama }}</strong>
        </div>
        <label style="font-size: 11px; font-weight: 600; color: #4b5563"
          >Keterangan Batal <span style="color: red">*</span></label
        >
        <input
          v-model="batalKet"
          class="f-inp mt-1"
          placeholder="Alasan pembatalan..."
          autofocus
          @keydown.enter="confirmBatal"
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="showBatalDialog = false">Tutup</v-btn>
        <v-spacer />
        <v-btn
          color="error"
          variant="flat"
          :disabled="!batalKet.trim()"
          @click="confirmBatal"
          >Konfirmasi Batal</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Konfirmasi Gak Jadi Batal -->
  <v-dialog v-model="showUnbatalDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="pa-3" style="font-size: 13px; font-weight: 700"
        >Konfirmasi</v-card-title
      >
      <v-card-text class="pa-4" style="font-size: 12px"
        >Gak jadi batal?</v-card-text
      >
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="showUnbatalDialog = false">Tidak</v-btn>
        <v-btn color="primary" variant="flat" @click="confirmUnbatal">Ya</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Cetak -->
  <v-dialog v-model="showPrintDialog" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconTransfer :size="18" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold"
          >Pengajuan Transfer Tersimpan</span
        >
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
.pt-layout {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.pt-left {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pt-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.pt-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
}
.pt-sec-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.pt-sec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.f-field {
  margin-bottom: 8px;
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
.f-hint {
  font-size: 10px;
  color: #6b7280;
  margin-top: 2px;
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
.f-inp.f-ro {
  background: #f5f5f5;
  color: #616161;
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
.total-box {
  background: #1565c0;
  color: white;
  border-radius: 4px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 13px;
}
.hint-box {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px 12px;
}
.hint-title {
  font-size: 10px;
  font-weight: 700;
  color: #6b7280;
  margin-bottom: 4px;
}
.hint-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
  font-size: 11px;
  color: #374151;
}
.hint-key {
  background: #e5e7eb;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  padding: 0 5px;
  font-family: monospace;
  color: #374151;
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
  background: #0d47a1;
}
.pt-table-wrap {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
}
.pt-table {
  width: 100%;
  min-width: 1900px;
  border-collapse: collapse;
  background: white;
}
.pt-table thead th {
  background: #1565c0;
  color: white;
  font-weight: 600;
  padding: 6px;
  position: sticky;
  top: 0;
  font-size: 11px;
  border: 1px solid #0d47a1;
  white-space: nowrap;
}
.pt-table td {
  border: 1px solid #eeeeee;
}
.pt-table tr:nth-of-type(even) td {
  background: #fafafa;
}
.td-ctr {
  text-align: center;
  padding: 4px 6px;
}
.td-inp {
  padding: 0;
}
.cell {
  width: 100%;
  height: 30px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 6px;
  font-family: inherit;
  color: #212121;
}
.cell:focus {
  background: #e3f2fd;
}
.cell.tr {
  text-align: right;
}
.cell[readonly] {
  background: #f5f5f5;
  color: #9e9e9e;
}
.cell-igrp {
  display: flex;
  align-items: center;
  height: 30px;
}
.cell-val {
  flex: 1;
  padding: 0 6px;
  font-size: 11px;
  color: #212121;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cell-val-ro {
  display: block;
  padding: 0 6px;
  font-size: 11px;
  color: #616161;
  line-height: 30px;
}
.cell-search {
  width: 26px;
  height: 100%;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #e0e0e0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cell-search:hover {
  background: #bbdefb;
}
.trs-btn-group {
  display: flex;
  gap: 1px;
  flex-shrink: 0;
}
.trs-btn {
  width: 18px;
  height: 18px;
  border: 1px solid #ccc;
  border-radius: 2px;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 9px;
  font-weight: 700;
  color: #555;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.trs-btn:hover {
  background: #e3f2fd;
  border-color: #1565c0;
  color: #1565c0;
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
.btn-del:disabled {
  opacity: 0.3;
  cursor: default;
}
.batal-btn {
  background: none;
  border: 1px solid #cc0000;
  border-radius: 3px;
  cursor: pointer;
  color: #cc0000;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  white-space: nowrap;
  flex-shrink: 0;
}
.batal-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #ccc;
  color: #999;
}
.unbatal-btn {
  background: none;
  border: 1px solid #2e7d32;
  border-radius: 3px;
  cursor: pointer;
  color: #2e7d32;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  white-space: nowrap;
  flex-shrink: 0;
}
.foot-lbl {
  text-align: right;
  font-weight: 700;
  padding: 6px 10px;
  background: #f5f5f5;
}
.foot-val {
  font-weight: 700;
  padding: 6px 10px;
  background: #e3f2fd;
  color: #1565c0;
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
</style>
