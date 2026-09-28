<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import { useTabsStore } from "@/stores/tabsStore";
import { useForm } from "@/composables/useForm";
import { bbkFormService } from "@/services/piutang/bbkFormService";
import BaseForm from "@/components/BaseForm.vue";
import CostCenterSearchModal from "@/components/lookups/CostCenterSearchModal.vue";
import {
  IconBuildingBank,
  IconPlus,
  IconTrash,
  IconSearch,
  IconShoppingCartPlus,
  IconSettings,
} from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const tabsStore = useTabsStore();
const isEditMode = computed(() => !!route.params.nomor);

const showPrintDialog = ref(false);
const savedNomor = ref("");

// ── Modal state ──
const showHeaderAccModal = ref(false);
const showRowAccModal = ref(false);
const showRowCcModal = ref(false);
const showSupplierModal = ref(false);
const activeRowIndex = ref(-1);

// ── Dialog "Detail Baris" — Supplier/Bank/Rekening/Atas Nama, sama
// pola dengan BKK (kolom sekunder dipindah ke sini biar grid ramping)
const showRowDetailDialog = ref(false);
const activeDetailRow = ref<any>(null);
const openRowDetailDialog = (row: any) => {
  activeDetailRow.value = row;
  showRowDetailDialog.value = true;
};
// ── Header Account — opsinya bergantung cabang (default P01) ──
const headerAccOptions = ref<any[]>([]);
const headerAccSearch = ref("");
const filteredHeaderAccOptions = computed(() => {
  if (!headerAccSearch.value) return headerAccOptions.value;
  const q = headerAccSearch.value.toLowerCase();
  return headerAccOptions.value.filter(
    (a: any) =>
      a.kode.toLowerCase().includes(q) || a.nama.toLowerCase().includes(q),
  );
});
const loadHeaderAccOptions = async () => {
  try {
    const res = await bbkFormService.getAccountOptions(
      formData.value.Cabang || "P01",
    );
    headerAccOptions.value = res.data.data || [];
  } catch (e) {
    console.error("Gagal memuat account header", e);
  }
};
const openHeaderAccModal = async () => {
  headerAccSearch.value = "";
  await loadHeaderAccOptions();
  showHeaderAccModal.value = true;
};
const setHeaderAcc = (item: any) => {
  formData.value.RekKode = item.kode;
  formData.value.RekNama = item.nama;
  formData.value.Cabang =
    item.cabang === "P02" || item.cabang === "P04" ? item.cabang : "P01";
  showHeaderAccModal.value = false;
};

// ── Row Account modal (semua) ──
const rowAccOptions = ref<any[]>([]);
const rowAccSearch = ref("");
const filteredRowAccOptions = computed(() => {
  if (!rowAccSearch.value) return rowAccOptions.value;
  const q = rowAccSearch.value.toLowerCase();
  return rowAccOptions.value.filter(
    (a: any) =>
      a.kode.toLowerCase().includes(q) || a.nama.toLowerCase().includes(q),
  );
});
const openRowAccModal = async (idx: number) => {
  activeRowIndex.value = idx;
  rowAccSearch.value = "";
  if (rowAccOptions.value.length === 0) {
    try {
      const res = await bbkFormService.getAccountAll();
      rowAccOptions.value = res.data.data || [];
    } catch (e) {
      console.error("Gagal memuat account", e);
    }
  }
  showRowAccModal.value = true;
};
const setRowAcc = (item: any) => {
  const row = formData.value.Detail[activeRowIndex.value];
  if (row) {
    if (item.kode === formData.value.RekKode) {
      toast.warning("Account tidak boleh sama dengan Account header.");
      return;
    }
    row.rekkode = item.kode;
    row.reknama = item.nama;
  }
  activeRowIndex.value = -1;
  showRowAccModal.value = false;
};
const onRowAccKodeEnter = async (row: any) => {
  const kode = (row.rekkode || "").trim();
  if (!kode) {
    row.reknama = "";
    return;
  }
  try {
    if (rowAccOptions.value.length === 0) {
      const res = await bbkFormService.getAccountAll();
      rowAccOptions.value = res.data.data || [];
    }
    const found = rowAccOptions.value.find(
      (i: any) => (i.kode || "").toUpperCase() === kode.toUpperCase(),
    );
    if (found) {
      row.rekkode = found.kode;
      row.reknama = found.nama;
    } else {
      toast.error("Kode account tidak ditemukan.");
      row.rekkode = "";
      row.reknama = "";
    }
  } catch {
    toast.error("Gagal validasi kode account.");
  }
};

// ── Cost Center + Detail CC digabung 1 lookup ──
const openRowCcModal = (idx: number) => {
  activeRowIndex.value = idx;
  showRowCcModal.value = true;
};
const setRowCc = (item: any) => {
  const row = formData.value.Detail[activeRowIndex.value];
  if (row) {
    row.cckode = item.cc_kode;
    row.ccnama = item.cc_nama;
    row.dcnama = item.dc_nama;
  }
  activeRowIndex.value = -1;
};

// ── Supplier — modal custom (backend bawa bank/rekening/atasnama
// langsung per baris hasil pencarian) ──
const supplierSearch = ref("");
const supplierResults = ref<any[]>([]);
const isSupplierSearching = ref(false);
let supplierSearchTimer: ReturnType<typeof setTimeout> | null = null;

const fetchSupplierSearch = async () => {
  isSupplierSearching.value = true;
  try {
    const res = await bbkFormService.getSupplierOptions(supplierSearch.value);
    supplierResults.value = res.data.data || [];
  } catch (e) {
    console.error("Gagal mencari supplier", e);
  } finally {
    isSupplierSearching.value = false;
  }
};
const onSupplierSearchInput = () => {
  if (supplierSearchTimer) clearTimeout(supplierSearchTimer);
  supplierSearchTimer = setTimeout(fetchSupplierSearch, 400);
};
const openSupplierModal = (idx: number) => {
  activeRowIndex.value = idx;
  supplierSearch.value = "";
  supplierResults.value = [];
  showSupplierModal.value = true;
  fetchSupplierSearch();
};
const setSupplier = (item: any) => {
  const row = formData.value.Detail[activeRowIndex.value];
  if (row) {
    row.kdsup = item.kode;
    row.supplier = item.nama;
    row.bank = item.bank || "";
    row.rekening = item.rekening || "";
    row.atasnama = item.atasnama || "";
  }
  activeRowIndex.value = -1;
  showSupplierModal.value = false;
};

// ── Modal "Ambil dari Minta Beli" (outstanding, bulk-push baris) ──
const showMbSearchModal = ref(false);
const mbSearchKeyword = ref("");
const MB_JENIS_OPTIONS = ["ALL", "ACCESORIES", "OBAT", "SPAREPART", "ATK/RTK"];
const mbJenisFilter = ref("ALL");
const mbSearchResults = ref<any[]>([]);
const isMbSearching = ref(false);
let mbSearchTimer: ReturnType<typeof setTimeout> | null = null;

const mbPage = ref(1);
const mbLimit = 25;
const mbTotal = ref(0);
const mbTotalPages = computed(() =>
  Math.max(1, Math.ceil(mbTotal.value / mbLimit)),
);
const mbPageStart = computed(() =>
  mbTotal.value === 0 ? 0 : (mbPage.value - 1) * mbLimit + 1,
);
const mbPageEnd = computed(() =>
  Math.min(mbPage.value * mbLimit, mbTotal.value),
);

const openMbSearchModal = () => {
  mbSearchKeyword.value = "";
  mbJenisFilter.value = "ALL";
  mbPage.value = 1;
  fetchMbSearch();
  showMbSearchModal.value = true;
};
const fetchMbSearch = async () => {
  isMbSearching.value = true;
  try {
    const res = await bbkFormService.getOutstandingMintaBeli({
      keyword: mbSearchKeyword.value,
      jenis: mbJenisFilter.value,
      page: mbPage.value,
      limit: mbLimit,
    });
    mbSearchResults.value = res.data.data?.items || [];
    mbTotal.value = res.data.data?.total || 0;
  } catch (e) {
    console.error("Gagal mencari Minta Beli", e);
  } finally {
    isMbSearching.value = false;
  }
};
const onMbSearchInput = () => {
  mbPage.value = 1;
  if (mbSearchTimer) clearTimeout(mbSearchTimer);
  mbSearchTimer = setTimeout(fetchMbSearch, 400);
};
const goToMbPage = (p: number) => {
  mbPage.value = Math.max(1, Math.min(p, mbTotalPages.value));
  fetchMbSearch();
};

const pilihMintaBeli = async (headerItem: any) => {
  const nomor = headerItem.Nomor;
  const sudahAda = formData.value.Detail.some((d: any) => d.mb === nomor);
  if (sudahAda) {
    toast.warning(`Minta Beli ${nomor} sudah diambil sebelumnya.`);
    return;
  }
  try {
    const res = await bbkFormService.getOutstandingMintaBeliDetail(nomor);
    const items = res.data.data || [];

    const emptyIdx = formData.value.Detail.findIndex(
      (d: any) => !d.uraian && !d.mb,
    );
    if (emptyIdx !== -1) formData.value.Detail.splice(emptyIdx, 1);

    items.forEach((it: any) => {
      formData.value.Detail.push({
        no: formData.value.Detail.length + 1,
        uraian: it.Nama || "",
        satuan: it.Satuan || "",
        qty: Number(it.Qty) || 0,
        harga: Number(it.Harga) || 0,
        total: (Number(it.Qty) || 0) * (Number(it.Harga) || 0),
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
        kdbrg: it.KodeBrg || "",
        mb: nomor,
        jenis_item: headerItem.Jenis || "",
        cab_item: headerItem.Cab || "",
      });
    });
    showMbSearchModal.value = false;
    toast.success(`${items.length} item dari Minta Beli ${nomor} ditambahkan.`);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat detail Minta Beli.");
  }
};

const initialData = {
  Nomor: "",
  Tanggal: new Date().toISOString().substring(0, 10),
  Cabang: "P01",
  CabangOld: "",
  RekKode: "",
  RekNama: "",
  Penerima: "",
  Nota: "",
  Keterangan: "",
  Detail: [] as any[],
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
} = useForm({
  menuId: "955",
  initialData,
  fetchApi: async () => {
    const res = await bbkFormService.getDetailForm(String(route.params.nomor));
    const d = res.data.data;
    return {
      Nomor: d.nomor,
      Tanggal: d.tanggal,
      Cabang: d.cabang,
      CabangOld: d.cabang_old,
      RekKode: d.rek_kode,
      RekNama: d.rek_nama,
      Penerima: d.penerima,
      Nota: d.nota,
      Keterangan: d.keterangan,
      Detail: d.detail || [],
    };
  },
  submitApi: async (data) => {
    const payload = {
      nomor: data.Nomor,
      tanggal: data.Tanggal,
      cabang: data.Cabang,
      cabang_old: data.CabangOld,
      rek_kode: data.RekKode,
      penerima: data.Penerima,
      nota: data.Nota,
      keterangan: data.Keterangan,
      detail: data.Detail,
    };
    return isEditMode.value
      ? bbkFormService.update(payload)
      : bbkFormService.save(payload);
  },
  onSuccess: (res: any) => {
    toast.success("Data BBK berhasil disimpan.");
    savedNomor.value = res.data?.data?.nomor || formData.value.Nomor;
    showPrintDialog.value = true;
  },
});

onMounted(async () => {
  if (isEditMode.value) {
    await fetchData();
  } else {
    // Default: pilih account pertama sesuai cabang default
    await loadHeaderAccOptions();
    if (headerAccOptions.value.length > 0) {
      setHeaderAcc(headerAccOptions.value[0]);
    }
  }
});

// ── Detail grid ──
const addRow = () => {
  formData.value.Detail.push({
    no: formData.value.Detail.length + 1,
    uraian: "",
    satuan: "",
    qty: 0,
    harga: 0,
    total: 0,
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
    kdbrg: "",
    mb: "",
    jenis_item: "",
    cab_item: "",
  });
};

const removeRow = (idx: number) => {
  const row = formData.value.Detail[idx];
  if (!row?.mb) {
    formData.value.Detail.splice(idx, 1);
    return;
  }
  removeRowTarget.value = idx;
  removeRowLabel.value = `Minta Beli ${row.mb}`;
  showRemoveRowDialog.value = true;
};

const showRemoveRowDialog = ref(false);
const removeRowTarget = ref<number | null>(null);
const removeRowLabel = ref("");
const confirmRemoveRow = () => {
  if (removeRowTarget.value === null) return;
  const row = formData.value.Detail[removeRowTarget.value];
  formData.value.Detail = formData.value.Detail.filter(
    (d: any) => d.mb !== row.mb,
  );
  showRemoveRowDialog.value = false;
  removeRowTarget.value = null;
};

const totalNominal = computed(() =>
  formData.value.Detail.reduce(
    (sum: number, d: any) => sum + (Number(d.total) || 0),
    0,
  ),
);
const recalcRowTotal = (row: any) => {
  row.total = (Number(row.qty) || 0) * (Number(row.harga) || 0);
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

// ── Validasi ──
const validateSave = () => {
  const userCabang = authStore.user?.cabang;
  if (
    userCabang &&
    userCabang !== "HO-" &&
    userCabang !== "ADMIN" &&
    formData.value.Cabang &&
    formData.value.Cabang !== userCabang
  ) {
    toast.warning(
      `User aktif di cabang ${userCabang}. Tidak bisa membuat/ubah transaksi untuk cabang ${formData.value.Cabang}.`,
    );
    return;
  }
  if (!formData.value.RekKode) {
    toast.warning("Account (Header) wajib dipilih.");
    return;
  }
  if (!formData.value.Detail || formData.value.Detail.length === 0) {
    toast.warning("Minimal harus ada 1 baris detail.");
    return;
  }
  const validRows = formData.value.Detail.filter((d: any) => d.uraian);
  if (validRows.length === 0) {
    toast.warning("Minimal 1 baris detail harus memiliki uraian.");
    return;
  }
  for (const row of validRows) {
    if (!Number(row.total) || Number(row.total) <= 0) {
      toast.warning(`Total untuk "${row.uraian}" harus lebih dari 0.`);
      return;
    }
  }
  showSaveDialog.value = true;
};

// ── Dialog cetak ──
const closePrintAndExit = () => {
  showPrintDialog.value = false;
  tabsStore.closeTab(route.path);
  router.push("/piutang/bbk");
};
const pilihCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/piutang/bbk/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  tabsStore.closeTab(route.path);
  router.push("/piutang/bbk");
};
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? 'Ubah Bukti Bank Keluar (BBK)'
        : 'Tambah Bukti Bank Keluar (BBK)'
    "
    menu-id="955"
    :icon="IconBuildingBank"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="BBK"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="bbk-layout">
      <!-- ══ KOLOM KIRI: Informasi BBK ══ -->
      <div class="bbk-left">
        <div class="bbk-section">
          <div class="bbk-sec-title">Informasi BBK</div>

          <div class="f-field">
            <label class="f-lbl">Nomor BBK</label>
            <input
              :value="formData.Nomor || 'Otomatis'"
              readonly
              class="f-inp f-ro"
            />
          </div>

          <div class="f-field">
            <label class="f-lbl">Tanggal</label>
            <input type="date" v-model="formData.Tanggal" class="f-inp" />
          </div>

          <div class="f-field">
            <label class="f-lbl">Account <span class="req">*</span></label>
            <div class="igrp">
              <input
                :value="formData.RekKode"
                readonly
                class="f-inp-in"
                style="width: 90px"
              />
              <input
                :value="formData.RekNama"
                readonly
                class="f-inp-in f-ro"
                style="flex: 1"
              />
              <button type="button" class="blkp" @click="openHeaderAccModal">
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
          </div>

          <div class="f-field">
            <label class="f-lbl">Dibayarkan Kepada</label>
            <input
              v-model="formData.Penerima"
              class="f-inp"
              placeholder="Nama penerima"
            />
          </div>

          <div class="f-field">
            <label class="f-lbl">No. Nota</label>
            <input
              v-model="formData.Nota"
              class="f-inp"
              placeholder="No. nota"
            />
          </div>

          <div class="f-field">
            <label class="f-lbl">Keterangan</label>
            <input
              v-model="formData.Keterangan"
              class="f-inp"
              placeholder="Keterangan pembayaran"
            />
          </div>

          <div class="f-field">
            <label class="f-lbl">Cabang</label>
            <input
              :value="formData.Cabang || '(otomatis dari Account)'"
              readonly
              class="f-inp f-ro"
            />
          </div>
        </div>

        <div class="total-box">
          <span>Total BBK</span>
          <span>{{ numFmt(totalNominal) }}</span>
        </div>
      </div>

      <!-- ══ KOLOM KANAN: Detail Pengeluaran Bank ══ -->
      <div class="bbk-right">
        <div class="bbk-sec-header">
          <span class="bbk-sec-title">Detail Pengeluaran Bank</span>
          <div class="d-flex" style="gap: 6px">
            <button
              type="button"
              class="btn-add btn-secondary"
              @click="openMbSearchModal"
            >
              <IconShoppingCartPlus :size="14" class="mr-1" /> Ambil dari Minta
              Beli
            </button>
            <button type="button" class="btn-add" @click="addRow">
              <IconPlus :size="14" class="mr-1" /> Tambah Baris
            </button>
          </div>
        </div>

        <div class="bbk-table-wrap">
          <table class="bbk-table">
            <thead>
              <tr>
                <th style="width: 40px" class="text-center">No</th>
                <th style="min-width: 80px">Ref</th>
                <th style="min-width: 180px">Uraian</th>
                <th style="width: 70px" class="text-right">Qty</th>
                <th style="width: 100px" class="text-right">Harga</th>
                <th style="width: 110px" class="text-right">Total</th>
                <th style="width: 90px">Account</th>
                <th style="min-width: 140px">Nama Account</th>
                <th style="min-width: 130px">Cost Center</th>
                <th style="width: 60px" class="text-center">Detail</th>
                <th style="width: 40px" class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in formData.Detail" :key="idx">
                <td class="td-ctr">{{ Number(idx) + 1 }}</td>
                <td class="td-inp">
                  <span class="cell-val-ro" style="font-size: 10px">{{
                    row.mb || "-"
                  }}</span>
                </td>
                <td class="td-inp">
                  <input
                    v-model="row.uraian"
                    class="cell"
                    placeholder="Uraian pengeluaran"
                  />
                </td>
                <td class="td-inp">
                  <input
                    type="number"
                    v-model.number="row.qty"
                    class="cell tr"
                    v-select-on-focus
                    @input="recalcRowTotal(row)"
                  />
                </td>
                <td class="td-inp">
                  <input
                    type="number"
                    v-model.number="row.harga"
                    class="cell tr"
                    v-select-on-focus
                    @input="recalcRowTotal(row)"
                  />
                </td>
                <td class="td-inp">
                  <span class="cell-val-ro tr">{{ numFmt(row.total) }}</span>
                </td>
                <td class="td-inp">
                  <div class="cell-igrp">
                    <input
                      v-model="row.rekkode"
                      class="cell"
                      style="width: 70px; flex-shrink: 0"
                      placeholder="Kode"
                      @keydown.enter.prevent="onRowAccKodeEnter(row)"
                      @blur="onRowAccKodeEnter(row)"
                    />
                    <button
                      type="button"
                      class="cell-search"
                      @click="openRowAccModal(Number(idx))"
                    >
                      <IconSearch :size="12" color="#1565c0" />
                    </button>
                  </div>
                </td>
                <td class="td-inp">
                  <span class="cell-val-ro">{{ row.reknama || "-" }}</span>
                </td>
                <td class="td-inp">
                  <div class="cell-igrp">
                    <span class="cell-val">
                      {{
                        row.ccnama
                          ? row.dcnama
                            ? `${row.ccnama} - ${row.dcnama}`
                            : row.ccnama
                          : "-"
                      }}
                    </span>
                    <button
                      type="button"
                      class="cell-search"
                      @click="openRowCcModal(Number(idx))"
                    >
                      <IconSearch :size="12" color="#1565c0" />
                    </button>
                  </div>
                </td>
                <td class="td-ctr">
                  <button
                    type="button"
                    class="btn-detail"
                    title="Detail (Supplier/Bank/Rekening)"
                    @click="openRowDetailDialog(row)"
                  >
                    <IconSettings :size="14" />
                  </button>
                </td>
                <td class="td-ctr">
                  <button
                    type="button"
                    class="btn-del"
                    @click="removeRow(Number(idx))"
                  >
                    <IconTrash :size="14" />
                  </button>
                </td>
              </tr>
              <tr v-if="!formData.Detail || formData.Detail.length === 0">
                <td colspan="11" class="text-center text-grey py-4 font-italic">
                  Belum ada baris detail. Klik "Tambah Baris" atau "Ambil dari
                  Minta Beli".
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </BaseForm>

  <!-- Modal Account header (bergantung Cabang) -->
  <v-dialog v-model="showHeaderAccModal" max-width="550px">
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Pilih Account (BANK)
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="headerAccSearch"
          class="f-inp mb-2"
          placeholder="Cari kode atau nama..."
          autofocus
        />
        <div style="max-height: 340px; overflow-y: auto">
          <table class="mini-table">
            <thead>
              <tr>
                <th style="width: 90px">Kode</th>
                <th>Nama</th>
                <th style="width: 60px">Cabang</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="a in filteredHeaderAccOptions"
                :key="a.kode"
                class="mini-row"
                @click="setHeaderAcc(a)"
              >
                <td>{{ a.kode }}</td>
                <td>{{ a.nama }}</td>
                <td>{{ a.cabang }}</td>
              </tr>
              <tr v-if="filteredHeaderAccOptions.length === 0">
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

  <!-- Modal Account detail (semua) -->
  <v-dialog v-model="showRowAccModal" max-width="500px">
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Pilih Account
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="rowAccSearch"
          class="f-inp mb-2"
          placeholder="Cari kode atau nama..."
          autofocus
        />
        <div style="max-height: 340px; overflow-y: auto">
          <table class="mini-table">
            <thead>
              <tr>
                <th style="width: 90px">Kode</th>
                <th>Nama</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="a in filteredRowAccOptions"
                :key="a.kode"
                class="mini-row"
                @click="setRowAcc(a)"
              >
                <td>{{ a.kode }}</td>
                <td>{{ a.nama }}</td>
              </tr>
              <tr v-if="filteredRowAccOptions.length === 0">
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

  <CostCenterSearchModal v-model="showRowCcModal" @selected="setRowCc" />

  <!-- Modal Supplier — hasil sudah bawa bank/rekening/atasnama, bisa
  duplikat baris kalau supplier punya >1 rekening (perilaku backend) -->
  <v-dialog v-model="showSupplierModal" max-width="650px">
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Cari Supplier
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="supplierSearch"
          class="f-inp mb-2"
          placeholder="Cari nama atau kode supplier..."
          autofocus
          @input="onSupplierSearchInput"
        />
        <div style="max-height: 340px; overflow-y: auto">
          <div v-if="isSupplierSearching" class="text-center py-4 text-grey">
            Memuat...
          </div>
          <table v-else class="mini-table">
            <thead>
              <tr>
                <th style="width: 80px">Kode</th>
                <th>Nama</th>
                <th style="width: 100px">Bank</th>
                <th style="width: 120px">Rekening</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(s, i) in supplierResults"
                :key="i"
                class="mini-row"
                @click="setSupplier(s)"
              >
                <td>{{ s.kode }}</td>
                <td>{{ s.nama }}</td>
                <td>{{ s.bank || "-" }}</td>
                <td>{{ s.rekening || "-" }}</td>
              </tr>
              <tr v-if="supplierResults.length === 0">
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

  <!-- Modal Ambil dari Minta Beli (outstanding) -->
  <v-dialog v-model="showMbSearchModal" max-width="700px">
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Ambil dari Minta Beli (Outstanding)
      </v-card-title>
      <v-card-text class="pa-3">
        <div class="d-flex" style="gap: 8px; margin-bottom: 10px">
          <select
            v-model="mbJenisFilter"
            class="f-inp f-sel"
            style="width: 140px"
            @change="goToMbPage(1)"
          >
            <option v-for="j in MB_JENIS_OPTIONS" :key="j" :value="j">
              {{ j === "ALL" ? "Semua Jenis" : j }}
            </option>
          </select>
          <input
            v-model="mbSearchKeyword"
            class="f-inp"
            style="flex: 1"
            placeholder="Cari nomor atau keterangan..."
            @input="onMbSearchInput"
          />
        </div>
        <div style="max-height: 380px; overflow-y: auto">
          <div v-if="isMbSearching" class="text-center py-4 text-grey">
            Memuat...
          </div>
          <table v-else class="mini-table">
            <thead>
              <tr>
                <th style="width: 150px">Nomor</th>
                <th style="width: 100px">Tanggal</th>
                <th style="width: 110px">Jenis</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="m in mbSearchResults"
                :key="m.Nomor"
                class="mini-row"
                @click="pilihMintaBeli(m)"
              >
                <td>{{ m.Nomor }}</td>
                <td>{{ m.Tanggal }}</td>
                <td>{{ m.Jenis }}</td>
                <td>{{ m.Keterangan || "-" }}</td>
              </tr>
              <tr v-if="mbSearchResults.length === 0">
                <td colspan="4" class="text-center text-grey py-3">
                  Tidak ada Minta Beli outstanding
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mb-pagination-footer">
          <span class="mb-footer-count">
            {{ mbPageStart }}–{{ mbPageEnd }} dari {{ mbTotal }} data
          </span>
          <div class="mb-page-controls">
            <button
              type="button"
              class="mb-page-btn"
              :disabled="mbPage === 1"
              @click="goToMbPage(mbPage - 1)"
            >
              ‹
            </button>
            <span class="mb-page-label">{{ mbPage }} / {{ mbTotalPages }}</span>
            <button
              type="button"
              class="mb-page-btn"
              :disabled="mbPage === mbTotalPages"
              @click="goToMbPage(mbPage + 1)"
            >
              ›
            </button>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showRemoveRowDialog" max-width="440px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-error text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Hapus Baris Terkait Referensi
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Baris ini terkait <b>{{ removeRowLabel }}</b
        >.<br />
        Menghapus baris ini akan menghapus <b>SEMUA</b> baris terkait
        {{ removeRowLabel }}. Lanjutkan?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" size="small" @click="showRemoveRowDialog = false"
          >Batal</v-btn
        >
        <v-btn
          variant="flat"
          size="small"
          color="error"
          @click="confirmRemoveRow"
        >
          Ya, Hapus
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPrintDialog" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconBuildingBank :size="18" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold">BBK Tersimpan</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-3 text-grey-darken-3">
          BBK <b class="text-primary">{{ savedNomor }}</b> berhasil disimpan.
          Cetak sekarang?
        </div>
        <v-btn color="primary" variant="flat" block @click="pilihCetak">
          Cetak BBK
        </v-btn>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="grey-darken-1" @click="closePrintAndExit"
          >Tutup (Tidak Cetak)</v-btn
        >
        <v-spacer />
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Detail Baris — Supplier + Bank + Rekening -->
  <v-dialog v-model="showRowDetailDialog" max-width="500px" persistent>
    <v-card v-if="activeDetailRow" class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Detail Baris — {{ activeDetailRow.uraian || "(baris baru)" }}
      </v-card-title>
      <v-card-text class="pa-4">
        <div class="dr-field">
          <label class="dr-lbl">Satuan</label>
          <input
            v-model="activeDetailRow.satuan"
            class="dr-inp"
            placeholder="pcs / kg / dll"
          />
        </div>

        <v-divider class="my-3" />

        <div class="dr-section-title">Supplier</div>
        <div class="dr-field">
          <label class="dr-lbl">Supplier</label>
          <div class="dr-igrp">
            <span class="dr-val">{{ activeDetailRow.supplier || "-" }}</span>
            <button
              type="button"
              class="dr-search"
              @click="
                openSupplierModal(formData.Detail.indexOf(activeDetailRow))
              "
            >
              <IconSearch :size="13" color="#1565c0" />
            </button>
          </div>
        </div>
        <div class="dr-field">
          <label class="dr-lbl">Bank</label>
          <input
            v-model="activeDetailRow.bank"
            class="dr-inp"
            placeholder="Bank"
          />
        </div>
        <div class="dr-field">
          <label class="dr-lbl">No. Rekening</label>
          <input
            v-model="activeDetailRow.rekening"
            class="dr-inp"
            placeholder="No. Rekening"
          />
        </div>
        <div class="dr-field">
          <label class="dr-lbl">Atas Nama</label>
          <input
            v-model="activeDetailRow.atasnama"
            class="dr-inp"
            placeholder="Atas Nama"
          />
        </div>

        <template v-if="activeDetailRow.mb">
          <v-divider class="my-3" />
          <div class="dr-section-title">Referensi</div>
          <div class="dr-hint">
            Terkait Minta Beli: <b>{{ activeDetailRow.mb }}</b>
            (hapus lewat tombol hapus baris, akan hapus semua item terkait)
          </div>
        </template>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn
          variant="flat"
          color="primary"
          @click="showRowDetailDialog = false"
        >
          Selesai
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.bbk-layout {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.bbk-left {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bbk-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.bbk-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
}
.bbk-sec-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.bbk-sec-header {
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
.f-sel {
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
.btn-add.btn-secondary {
  background: #7b1fa2;
}
.btn-add.btn-secondary:hover {
  background: #6a1b9a;
}
.bbk-table-wrap {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
}
.bbk-table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  background: white;
}
.bbk-table thead th {
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
.bbk-table td {
  border: 1px solid #eeeeee;
}
.bbk-table tr:nth-of-type(even) td {
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
.btn-detail {
  background: #ede7f6;
  color: #5e35b1;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  align-items: center;
}
.btn-detail:hover {
  background: #d1c4e9;
}
.dr-field {
  margin-bottom: 10px;
}
.dr-lbl {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  margin-bottom: 3px;
}
.dr-inp {
  width: 100%;
  height: 30px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}
.dr-inp:focus {
  border-color: #1565c0;
}
.dr-igrp {
  display: flex;
  align-items: center;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  height: 30px;
  overflow: hidden;
}
.dr-val {
  flex: 1;
  padding: 0 8px;
  font-size: 12px;
  color: #212121;
}
.dr-search {
  width: 30px;
  height: 100%;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dr-search:hover {
  background: #bbdefb;
}
.dr-section-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.dr-hint {
  font-size: 10px;
  color: #757575;
  margin-top: 3px;
}
.mb-pagination-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  margin-top: 4px;
  border-top: 1px solid #e0e0e0;
}
.mb-footer-count {
  font-size: 11px;
  color: #757575;
}
.mb-page-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mb-page-btn {
  min-width: 28px;
  height: 26px;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  background: white;
  font-size: 13px;
  color: #424242;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mb-page-btn:hover:not(:disabled) {
  background: #e3f2fd;
  border-color: #90caf9;
  color: #1565c0;
}
.mb-page-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.mb-page-label {
  font-size: 12px;
  color: #424242;
  min-width: 40px;
  text-align: center;
}
</style>
