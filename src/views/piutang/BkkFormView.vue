<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import { useTabsStore } from "@/stores/tabsStore";
import { useForm } from "@/composables/useForm";
import { bkkFormService } from "@/services/piutang/bkkFormService";
import BaseForm from "@/components/BaseForm.vue";
import AccountSearchModal from "@/components/lookups/AccountSearchModal.vue";
import CostCenterSearchModal from "@/components/lookups/CostCenterSearchModal.vue";
import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import PettyCashSearchModal from "@/components/lookups/PettyCashSearchModal.vue";
import {
  IconReceipt2,
  IconPlus,
  IconTrash,
  IconSearch,
  IconSettings,
  IconShoppingCartPlus,
} from "@tabler/icons-vue";
import api from "@/services/api";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const tabsStore = useTabsStore();
const isEditMode = computed(() => !!route.params.nomor);

const showPrintDialog = ref(false);
const savedNomor = ref("");

// ── Modal state (Account/CC/Supplier/Petty Cash per baris) ──
const showHeaderAccModal = ref(false);
const showRowAccModal = ref(false);
const showRowCcModal = ref(false);
const showRowSupplierModal = ref(false);
const showRowPckModal = ref(false);
const activeRowIndex = ref(-1);

// ── Dialog "Detail Baris" (field sekunder per baris) ──
const showRowDetailDialog = ref(false);
const activeDetailRow = ref<any>(null);

// ── Header Account (KAS) — cabang lintas, cabang BKK diturunkan
// otomatis dari cabang account yang dipilih ──
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
const openHeaderAccModal = async () => {
  if (headerAccOptions.value.length === 0) {
    try {
      const res = await bkkFormService.getAccountKasHeaderOptions();
      headerAccOptions.value = res.data.data || [];
    } catch (e) {
      console.error("Gagal memuat account KAS", e);
    }
  }
  headerAccSearch.value = "";
  showHeaderAccModal.value = true;
};
const setHeaderAcc = (item: any) => {
  formData.value.RekKode = item.kode;
  formData.value.RekNama = item.nama;
  formData.value.Cabang =
    item.cabang === "P02" || item.cabang === "P04" ? item.cabang : "P01";
  showHeaderAccModal.value = false;
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
    const res = await bkkFormService.getOutstandingMintaBeli({
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
    const res = await bkkFormService.getOutstandingMintaBeliDetail(nomor);
    const items = res.data.data || [];

    // Buang baris kosong yang sedang aktif (belum diisi apa-apa)
    const emptyIdx = formData.value.Detail.findIndex(
      (d: any) => !d.uraian && !d.mb && !d.pck,
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
        supkode: "",
        supnama: "",
        bank: "",
        rekening: "",
        atasnama: "",
        mb: nomor,
        pck: "",
        pckStore: "",
        kdbrg: it.KodeBrg || "",
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
  Cabang: "",
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
  menuId: "953",
  initialData,
  fetchApi: async () => {
    const res = await bkkFormService.getDetailForm(String(route.params.nomor));
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
      ? bkkFormService.update(payload)
      : bkkFormService.save(payload);
  },
  onSuccess: (res: any) => {
    toast.success("Data BKK berhasil disimpan.");
    savedNomor.value = res.data?.data?.nomor || formData.value.Nomor;
    showPrintDialog.value = true;
  },
});

onMounted(async () => {
  if (isEditMode.value) {
    await fetchData();
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
    supkode: "",
    supnama: "",
    bank: "",
    rekening: "",
    atasnama: "",
    mb: "",
    pck: "",
    pckStore: "",
    kdbrg: "",
    jenis_item: "",
    cab_item: "",
  });
};

// Baris yang terkait Minta Beli/Petty Cash dihapus SEKALIGUS (semua
// baris dengan referensi mb/pck yang sama), dengan dialog konfirmasi —
// mencegah baris "yatim" tanpa header referensinya.
const showRemoveRowDialog = ref(false);
const removeRowTarget = ref<number | null>(null);
const removeRowLabel = ref("");

const removeRow = (idx: number) => {
  const row = formData.value.Detail[idx];
  const ref = row?.mb || row?.pck;
  if (!ref) {
    formData.value.Detail.splice(idx, 1);
    return;
  }
  removeRowTarget.value = idx;
  removeRowLabel.value = row.mb
    ? `Minta Beli ${row.mb}`
    : `Petty Cash ${row.pck}`;
  showRemoveRowDialog.value = true;
};

const confirmRemoveRow = () => {
  if (removeRowTarget.value === null) return;
  const row = formData.value.Detail[removeRowTarget.value];
  formData.value.Detail = formData.value.Detail.filter((d: any) =>
    row.mb ? d.mb !== row.mb : d.pck !== row.pck,
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

// ── Row Account modal ──
const openRowAccModal = (idx: number) => {
  activeRowIndex.value = idx;
  showRowAccModal.value = true;
};
const setRowAcc = (item: any) => {
  const row = formData.value.Detail[activeRowIndex.value];
  if (row) {
    if (item.Kode === formData.value.RekKode) {
      toast.warning("Account tidak boleh sama dengan Account header.");
      return;
    }
    row.rekkode = item.Kode;
    row.reknama = item.Nama;
  }
  activeRowIndex.value = -1;
};

// ── Validasi kode Account diketik manual (Enter/blur) — pola sama
// seperti onCustKodeEnter di form-form lain: cari exact match by kode.
const onRowAccKodeEnter = async (row: any) => {
  const kode = (row.rekkode || "").trim();
  if (!kode) {
    row.reknama = "";
    return;
  }
  if (kode === formData.value.RekKode) {
    toast.warning("Account tidak boleh sama dengan Account header.");
    row.rekkode = "";
    row.reknama = "";
    return;
  }
  try {
    const res = await api.get("/lookups/account", {
      params: { q: kode, page: 1, limit: 1, jenis: "ALL" },
    });
    const items = res.data.data?.items || [];
    const found = items.find(
      (i: any) => (i.Kode || "").toUpperCase() === kode.toUpperCase(),
    );
    if (found) {
      row.rekkode = found.Kode;
      row.reknama = found.Nama;
    } else {
      toast.error("Kode account tidak ditemukan.");
      row.rekkode = "";
      row.reknama = "";
    }
  } catch {
    toast.error("Gagal validasi kode account.");
  }
};

// ── Row Cost Center modal ──
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

// ── Row Supplier modal ──
const openRowSupplierModal = (idx: number) => {
  activeRowIndex.value = idx;
  showRowSupplierModal.value = true;
};
const setRowSupplier = async (item: any) => {
  const row = formData.value.Detail[activeRowIndex.value];
  if (!row) return;
  row.supkode = item.Kode;
  row.supnama = item.Nama;
  row.bank = "";
  row.rekening = "";
  row.atasnama = "";
  try {
    const res = await bkkFormService.getSupplierDetail(item.Kode);
    const banks = res.data.data || [];
    if (banks.length > 0) {
      row.bank = banks[0].bank || "";
      row.rekening = banks[0].rekening || "";
      row.atasnama = banks[0].atasnama || "";
    }
  } catch (e) {
    console.error("Gagal memuat detail bank supplier", e);
  }
  activeRowIndex.value = -1;
};

// ── Row Petty Cash modal ──
const openRowPckModal = (idx: number) => {
  activeRowIndex.value = idx;
  showRowPckModal.value = true;
};
const setRowPck = (item: any) => {
  const row = formData.value.Detail[activeRowIndex.value];
  if (row) {
    row.pck = item.nomor;
    row.pckStore = item.namaStore || item.store || "";
  }
  activeRowIndex.value = -1;
};

// ── Dialog Detail Baris (field sekunder) ──
const openRowDetailDialog = (row: any) => {
  activeDetailRow.value = row;
  showRowDetailDialog.value = true;
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

// ── Format angka bolak-balik utk input Qty/Harga — biar bisa
// nampilin separator ribuan tanpa pakai <input type="number"> yang
// nolak format ber-titik.
const parseNum = (v: string) =>
  Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;

const onQtyFocus = (row: any, e: Event) => {
  (e.target as HTMLInputElement).value = row.qty ? String(row.qty) : "";
};
const onQtyInput = (row: any, e: Event) => {
  row.qty = Math.max(0, parseNum((e.target as HTMLInputElement).value));
  recalcRowTotal(row);
};
const onQtyBlur = (row: any, e: Event) => {
  (e.target as HTMLInputElement).value = numFmt(row.qty);
};

const onHargaFocus = (row: any, e: Event) => {
  (e.target as HTMLInputElement).value = row.harga ? String(row.harga) : "";
};
const onHargaInput = (row: any, e: Event) => {
  row.harga = Math.max(0, parseNum((e.target as HTMLInputElement).value));
  recalcRowTotal(row);
};
const onHargaBlur = (row: any, e: Event) => {
  (e.target as HTMLInputElement).value = numFmt(row.harga);
};

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
  router.push("/piutang/bkk");
};
const pilihCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/piutang/bkk/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  tabsStore.closeTab(route.path);
  router.push("/piutang/bkk");
};
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? 'Ubah Bukti Kas Keluar (BKK)'
        : 'Tambah Bukti Kas Keluar (BKK)'
    "
    menu-id="953"
    :icon="IconReceipt2"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="BKK"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="bkk-layout">
      <!-- ══ KOLOM KIRI: Informasi BKK ══ -->
      <div class="bkk-left">
        <div class="bkk-section">
          <div class="bkk-sec-title">Informasi BKK</div>

          <div class="f-field">
            <label class="f-lbl">Nomor BKK</label>
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
          <span>Total BKK</span>
          <span>{{ numFmt(totalNominal) }}</span>
        </div>
      </div>

      <!-- ══ KOLOM KANAN: Detail Pengeluaran ══ -->
      <div class="bkk-right">
        <div class="bkk-sec-header">
          <span class="bkk-sec-title">Detail Pengeluaran</span>
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

        <div class="bkk-table-wrap">
          <table class="bkk-table">
            <thead>
              <tr>
                <th style="width: 40px" class="text-center">No</th>
                <th style="min-width: 180px">Uraian</th>
                <th style="width: 70px" class="text-right">Qty</th>
                <th style="width: 100px" class="text-right">Harga</th>
                <th style="width: 110px" class="text-right">Total</th>
                <th style="width: 90px">Account</th>
                <th style="min-width: 140px">Nama Account</th>
                <th style="min-width: 130px">Cost Center</th>
                <th style="min-width: 90px">Ref</th>
                <th style="width: 60px" class="text-center">Detail</th>
                <th style="width: 40px" class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in formData.Detail" :key="idx">
                <td class="td-ctr">{{ Number(idx) + 1 }}</td>
                <td class="td-inp">
                  <input
                    v-model="row.uraian"
                    class="cell"
                    placeholder="Uraian pengeluaran"
                  />
                </td>
                <td class="td-inp">
                  <input
                    :value="numFmt(row.qty)"
                    type="text"
                    inputmode="numeric"
                    class="cell tr"
                    @focus="onQtyFocus(row, $event)"
                    @input="onQtyInput(row, $event)"
                    @blur="onQtyBlur(row, $event)"
                  />
                </td>
                <td class="td-inp">
                  <input
                    :value="numFmt(row.harga)"
                    type="text"
                    inputmode="numeric"
                    class="cell tr"
                    @focus="onHargaFocus(row, $event)"
                    @input="onHargaInput(row, $event)"
                    @blur="onHargaBlur(row, $event)"
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
                <td class="td-inp">
                  <span class="cell-val-ro" style="font-size: 10px">
                    {{
                      row.mb
                        ? `MB: ${row.mb}`
                        : row.pck
                          ? `PCK: ${row.pck}`
                          : "-"
                    }}
                  </span>
                </td>
                <td class="td-ctr">
                  <button
                    type="button"
                    class="btn-detail"
                    title="Detail (Supplier/Petty Cash)"
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

  <!-- Modal Account header (KAS lintas cabang) -->
  <v-dialog v-model="showHeaderAccModal" max-width="500px">
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Pilih Account (KAS)
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

  <AccountSearchModal
    v-model="showRowAccModal"
    jenis="ALL"
    @selected="setRowAcc"
  />
  <CostCenterSearchModal v-model="showRowCcModal" @selected="setRowCc" />
  <SupplierSearchModal
    v-model="showRowSupplierModal"
    @selected="setRowSupplier"
  />
  <PettyCashSearchModal v-model="showRowPckModal" @selected="setRowPck" />

  <!-- Dialog Detail Baris — Supplier + Petty Cash -->
  <v-dialog v-model="showRowDetailDialog" max-width="760px" persistent>
    <v-card v-if="activeDetailRow" class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Detail Baris — {{ activeDetailRow.uraian || "(baris baru)" }}
      </v-card-title>
      <v-card-text class="pa-4">
        <div class="dr-columns">
          <!-- ══ KOLOM KIRI: Satuan + Supplier ══ -->
          <div class="dr-col">
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
                <span class="dr-val">{{ activeDetailRow.supnama || "-" }}</span>
                <button
                  type="button"
                  class="dr-search"
                  @click="
                    openRowSupplierModal(
                      formData.Detail.indexOf(activeDetailRow),
                    )
                  "
                >
                  <IconSearch :size="13" color="#1565c0" />
                </button>
              </div>
            </div>
            <div class="dr-field">
              <label class="dr-lbl">Bank</label>
              <input v-model="activeDetailRow.bank" class="dr-inp" />
            </div>
            <div class="dr-field">
              <label class="dr-lbl">No. Rekening</label>
              <input v-model="activeDetailRow.rekening" class="dr-inp" />
            </div>
            <div class="dr-field">
              <label class="dr-lbl">Atas Nama</label>
              <input v-model="activeDetailRow.atasnama" class="dr-inp" />
            </div>
          </div>

          <!-- ══ KOLOM KANAN: Referensi ══ -->
          <div class="dr-col">
            <div class="dr-section-title">Referensi</div>
            <div v-if="activeDetailRow.mb" class="dr-hint mb-2">
              Terkait Minta Beli: <b>{{ activeDetailRow.mb }}</b>
              (hapus lewat tombol hapus baris, akan hapus semua item terkait)
            </div>
            <div class="dr-field">
              <label class="dr-lbl">No. Petty Cash</label>
              <div class="dr-igrp">
                <span class="dr-val">{{ activeDetailRow.pck || "-" }}</span>
                <button
                  type="button"
                  class="dr-search"
                  :disabled="!!activeDetailRow.mb"
                  @click="
                    openRowPckModal(formData.Detail.indexOf(activeDetailRow))
                  "
                >
                  <IconSearch :size="13" color="#1565c0" />
                </button>
              </div>
              <div v-if="activeDetailRow.pckStore" class="dr-hint">
                Store: {{ activeDetailRow.pckStore }}
              </div>
            </div>
            <div class="dr-field">
              <label class="dr-lbl">Jenis</label>
              <input
                :value="activeDetailRow.jenis_item || '-'"
                readonly
                class="dr-inp dr-inp-ro"
              />
            </div>
            <div class="dr-field">
              <label class="dr-lbl">Cabang Item</label>
              <input
                :value="activeDetailRow.cab_item || '-'"
                readonly
                class="dr-inp dr-inp-ro"
              />
            </div>
            <div class="dr-field">
              <label class="dr-lbl">Kode Barang</label>
              <input
                v-model="activeDetailRow.kdbrg"
                class="dr-inp"
                :readonly="!!activeDetailRow.mb"
              />
            </div>
          </div>
        </div>
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

  <v-dialog v-model="showPrintDialog" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconReceipt2 :size="18" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold">BKK Tersimpan</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-3 text-grey-darken-3">
          BKK <b class="text-primary">{{ savedNomor }}</b> berhasil disimpan.
          Cetak sekarang?
        </div>
        <v-btn color="primary" variant="flat" block @click="pilihCetak">
          Cetak BKK
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
</template>

<style scoped>
.bkk-layout {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.bkk-left {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bkk-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.bkk-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
}
.bkk-sec-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.bkk-sec-header {
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

.bkk-table-wrap {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
}
.bkk-table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  background: white;
}
.bkk-table thead th {
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
.bkk-table td {
  border: 1px solid #eeeeee;
}
.bkk-table tr:nth-of-type(even) td {
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
.dr-inp:read-only {
  background: #f5f5f5;
  color: #616161;
}
.dr-inp-ro {
  background: #f5f5f5;
  color: #616161;
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
.dr-search:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.dr-section-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.dr-columns {
  display: flex;
  gap: 24px;
}
.dr-col {
  flex: 1;
  min-width: 0;
}
.dr-hint {
  font-size: 10px;
  color: #757575;
  margin-top: 3px;
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
