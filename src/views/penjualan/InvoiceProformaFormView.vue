<script setup lang="ts">
import { computed, ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import BaseForm from "@/components/BaseForm.vue";
import { invoiceProformaFormService } from "@/services/penjualan/invoiceProformaFormService";
import {
  IconSearch,
  IconTrash,
  IconPlus,
  IconFileInvoice,
} from "@tabler/icons-vue";

// Asumsi: Modal-modal umum ini sudah Anda miliki dari pengerjaan modul Penawaran / SJ MAP
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import RekeningSearchModal from "@/components/lookups/RekeningSearchModal.vue";
import BarangInvProSearchModal from "@/components/lookups/BarangInvProSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEdit = computed(() => !!route.params.nomor);
const nomorParam = computed(() => route.params.nomor as string);

// State Modal Lookup
const showPerushModal = ref(false);
const showCusModal = ref(false);
const showRekModal = ref(false);
const showBarangModal = ref(false);
const activeRowIndex = ref(-1);

const listDivisi = ref<any[]>([]);

const emptyRow = { kode: "", nama: "", ukuran: "", jumlah: 0, harga: 0 };

const showPrintDialog = ref(false);
const savedNomor = ref("");

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";

  const d = new Date(value);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const initialData = {
  nomor: "",
  tanggal: new Date().toISOString().substring(0, 10),
  tanggalTempo: new Date().toISOString().substring(0, 10),
  divisi: 1, // SPANDUK
  keterangan: "",
  kodePerush: "",
  namaPerush: "",
  cusKode: "",
  cusNama: "",
  alamatCus: "",
  kotaCus: "",
  rekBank: "",
  namaBank: "",
  atasNama: "",
  stsPpn: 0,
  ppnPersen: 0,
  uangMuka: 0,
  pin_status: "",
  details: [{ ...emptyRow }],
};

const {
  formData,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  canSave,
  executeSave,
  executeCancel,
  executeClose,
} = useForm({
  menuId: "157",
  initialData,
  fetchApi: async () => {
    const res = await invoiceProformaFormService.getDetail(nomorParam.value);
    const { header, details } = res.data.data;

    const mappedDetails = details.map((d: any) => ({
      kode: d.kode,
      nama: d.nama,
      ukuran: d.ukuran,
      jumlah: d.jumlah,
      harga: d.harga,
    }));

    if (mappedDetails.length === 0) mappedDetails.push({ ...emptyRow });

    return {
      nomor: header.inv_nomor,
      tanggal: formatDateLocal(header.inv_tanggal),
      tanggalTempo: formatDateLocal(header.inv_tanggal_tempo),
      divisi: header.inv_divisi,
      keterangan: header.inv_keterangan,
      kodePerush: header.inv_perush_kode,
      namaPerush: header.perush_nama,
      cusKode: header.inv_cus_kode,
      cusNama: header.cus_nama,
      alamatCus: header.inv_cus_alamat || header.cus_alamat,
      kotaCus: header.inv_cus_kota || header.cus_kota || "",
      rekBank: header.inv_rekening,
      namaBank: header.perushd_bank,
      atasNama: header.perushd_atasnama,
      stsPpn: header.inv_sts_ppn,
      ppnPersen: header.inv_ppn,
      uangMuka: header.uang_muka || 0,
      pin_status: header.pin_status,
      details: mappedDetails,
    };
  },
  submitApi: async (payload) => {
    return await invoiceProformaFormService.saveData(payload);
  },
  onSuccess: (res: any) => {
    savedNomor.value = res.data?.data?.nomor || formData.value.nomor;
    showPrintDialog.value = true;
  },
});

onMounted(async () => {
  try {
    const res = await invoiceProformaFormService.getDivisi();
    listDivisi.value = res.data.data;
  } catch (error) {
    console.error("Gagal load divisi");
  }
});

// --- KALKULASI TOTAL ---
const totalNominal = computed(() => {
  return formData.value.details.reduce(
    (
      sum: number,
      d: {
        jumlah: number | string;
        harga: number | string;
      },
    ) => sum + (Number(d.jumlah) || 0) * (Number(d.harga) || 0),
    0,
  );
});

const totalPpn = computed(() => {
  if (formData.value.stsPpn === 1) {
    return totalNominal.value * ((Number(formData.value.ppnPersen) || 0) / 100);
  }
  return 0;
});

const grandTotal = computed(() => totalNominal.value + totalPpn.value);

const nilaiPiutang = computed(() => {
  return grandTotal.value - (Number(formData.value.uangMuka) || 0);
});

// --- HANDLERS PPN ---
watch(
  () => formData.value.stsPpn,
  (val) => {
    if (val === 1 && formData.value.ppnPersen === 0) {
      formData.value.ppnPersen = 11; // Default PPN
    } else if (val === 0) {
      formData.value.ppnPersen = 0;
    }
  },
);

watch(
  () => formData.value.ppnPersen,
  (val) => {
    if (Number(val) > 0) formData.value.stsPpn = 1;
    else formData.value.stsPpn = 0;
  },
);

// --- HANDLERS LOOKUPS ---
const onPerushSelected = (item: any) => {
  // Modal PerusahaanSearchModal lama (legacy) mungkin me-return struktur aslinya (perush_kode)
  // Atau jika API diubah, ia me-return alias 'Kode' dan 'Nama'.
  // Kita buat fleksibel agar membaca keduanya.
  formData.value.kodePerush = item.perush_kode || item.Kode;
  formData.value.namaPerush = item.perush_nama || item.Nama;

  // Reset Rekening jika Perusahaan berubah
  formData.value.rekBank = "";
  formData.value.namaBank = "";
  formData.value.atasNama = "";
};

const onCusSelected = (item: any) => {
  // Modal CustomerSearchModal lama (legacy) mungkin me-return struktur aslinya (cus_kode)
  formData.value.cusKode = item.cus_kode || item.Kode;
  formData.value.cusNama = item.cus_nama || item.Nama;
  formData.value.alamatCus = item.cus_alamat || item.Alamat;
  formData.value.kotaCus = item.cus_kota || item.Kota;
};

const openRekModal = () => {
  if (!formData.value.kodePerush)
    return toast.warning("Pilih Perusahaan terlebih dahulu.");
  showRekModal.value = true;
};

const onRekSelected = (item: any) => {
  formData.value.rekBank = item.Rekening;
  formData.value.namaBank = item.Bank;
  formData.value.atasNama = item.AtasNama;
};

const openBarangModal = (index: number) => {
  if (!formData.value.kodePerush || !formData.value.cusKode) {
    return toast.warning("Perusahaan dan Customer harus dipilih dulu.");
  }
  activeRowIndex.value = index;
  showBarangModal.value = true;
};

const onBarangSelected = (item: any) => {
  const row = formData.value.details[activeRowIndex.value];

  // Cek duplikasi
  const isDup = formData.value.details.some(
    (
      d: {
        kode: string;
      },
      idx: number,
    ) => d.kode === item.Kode && idx !== activeRowIndex.value,
  );
  if (isDup) return toast.warning("Barang ini sudah ada di daftar.");

  row.kode = item.Kode;
  row.nama = item.Nama;
  row.ukuran = item.Ukuran;
  row.jumlah = 1;
  row.harga = item.Harga;

  if (activeRowIndex.value === formData.value.details.length - 1) {
    addRow();
  }
};

// ─────────────────────────────────────────────
// KEYBOARD HANDLERS: PERUSAHAAN
// ─────────────────────────────────────────────

const onPerushKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    showPerushModal.value = true;
  }
};

const onPerushEnter = async () => {
  const kode = (formData.value.kodePerush || "").trim().toUpperCase();
  if (!kode) {
    showPerushModal.value = true;
    return;
  }

  try {
    isLoading.value = true;
    const res = await invoiceProformaFormService.getPerusahaanByKode(kode);
    onPerushSelected(res.data.data);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Perusahaan tidak ditemukan.");
    formData.value.kodePerush = "";
    formData.value.namaPerush = "";
  } finally {
    isLoading.value = false;
  }
};

// ─────────────────────────────────────────────
// KEYBOARD HANDLERS: CUSTOMER
// ─────────────────────────────────────────────

const onCusKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    showCusModal.value = true;
  }
};

const onCusEnter = async () => {
  const kode = (formData.value.cusKode || "").trim().toUpperCase();
  if (!kode) {
    showCusModal.value = true;
    return;
  }

  try {
    isLoading.value = true;
    const res = await invoiceProformaFormService.getCustomerByKode(kode);
    onCusSelected(res.data.data);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Customer tidak ditemukan.");
    formData.value.cusKode = "";
    formData.value.cusNama = "";
    formData.value.alamatCus = "";
    formData.value.kotaCus = "";
  } finally {
    isLoading.value = false;
  }
};

// ─────────────────────────────────────────────
// KEYBOARD HANDLERS: REKENING BANK
// ─────────────────────────────────────────────

const onRekKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    openRekModal();
  }
};

const onRekEnter = async () => {
  const rek = (formData.value.rekBank || "").trim();
  if (!rek) {
    openRekModal();
    return;
  }

  try {
    isLoading.value = true;
    const res = await invoiceProformaFormService.getRekeningByNomor(
      rek,
      formData.value.kodePerush,
    );
    onRekSelected(res.data.data);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Rekening tidak ditemukan.");
    formData.value.rekBank = "";
    formData.value.namaBank = "";
    formData.value.atasNama = "";
  } finally {
    isLoading.value = false;
  }
};

// ─────────────────────────────────────────────
// KEYBOARD HANDLERS: KODE BARANG DI GRID
// ─────────────────────────────────────────────

const onBarangKeydown = (e: KeyboardEvent, index: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openBarangModal(index);
  }
};

const onBarangEnter = async (index: number) => {
  const kode = (formData.value.details[index]?.kode || "").trim().toUpperCase();
  if (!kode) {
    openBarangModal(index);
    return;
  }

  if (!formData.value.kodePerush || !formData.value.cusKode) {
    return toast.warning("Perusahaan dan Customer harus dipilih dulu.");
  }

  try {
    isLoading.value = true;
    const res = await invoiceProformaFormService.getBarangByKode(
      kode,
      formData.value.kodePerush,
      formData.value.cusKode,
    );
    onBarangSelected(res.data.data);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode barang tidak ditemukan.");
    formData.value.details[index].kode = "";
  } finally {
    isLoading.value = false;
  }
};

const addRow = () => formData.value.details.push({ ...emptyRow });
const removeRow = (index: number) => {
  formData.value.details.splice(index, 1);
  if (formData.value.details.length === 0) addRow();
};

// --- VALIDASI SEBELUM SIMPAN ---
const validateSave = () => {
  if (!canSave.value) return toast.error("Hak akses ditolak.");
  if (!formData.value.kodePerush)
    return toast.warning("Perusahaan belum dipilih.");
  if (!formData.value.cusKode) return toast.warning("Customer belum dipilih.");

  const valid = formData.value.details.filter(
    (d: { kode: string; jumlah: number | string }) =>
      d.kode && Number(d.jumlah) > 0,
  );
  if (valid.length === 0)
    return toast.warning("Detail barang masih kosong / jumlah 0.");

  if (["MINTA", "WAIT", "TOLAK"].includes(formData.value.pin_status)) {
    return toast.error(
      "Transaksi sudah diclose.\nSilahkan minta approve perubahan data (PIN 5).",
    );
  }

  showSaveDialog.value = true;
};

const doCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/penjualan/invoice-proforma/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  router.push({ name: "InvoiceProformaBrowse" });
};

const doTidakCetak = () => {
  showPrintDialog.value = false;
  router.push({ name: "InvoiceProformaBrowse" });
};

const num = (val: any) =>
  Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
</script>

<template>
  <BaseForm
    :title="(isEdit ? 'Ubah' : 'Baru') + ' Invoice Proforma'"
    menuId="157"
    :icon="IconFileInvoice"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:showSaveDialog="showSaveDialog"
    v-model:showCancelDialog="showCancelDialog"
    v-model:showCloseDialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <!-- HEADER INVOICE -->
      <div class="desktop-form-section header-section">
        <div class="tm-sec-title text-primary mb-2">HEADER INVOICE</div>

        <div class="d-flex align-center gap-2 mb-2">
          <v-chip
            v-if="formData.pin_status === 'WAIT'"
            color="blue"
            size="x-small"
            >WAITING PIN</v-chip
          >
          <v-chip
            v-else-if="formData.pin_status === 'ACC'"
            color="green"
            size="x-small"
            >PIN APPROVED</v-chip
          >
          <v-chip
            v-else-if="formData.pin_status === 'TOLAK'"
            color="red"
            size="x-small"
            >PIN REJECTED</v-chip
          >
        </div>

        <v-select
          v-model="formData.divisi"
          :items="listDivisi"
          item-title="nama"
          item-value="kode"
          label="Divisi"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
        />

        <v-text-field
          v-model="formData.nomor"
          label="No. Invoice"
          readonly
          hide-details
          variant="outlined"
          density="compact"
          class="mb-2 bg-grey-lighten-4"
          placeholder="<--Kosong=Baru"
        />

        <div class="f-row mb-2">
          <label class="f-lbl">Perusahaan</label>
          <div class="inp-grp" style="flex: 1">
            <input
              :value="formData.namaPerush || formData.kodePerush"
              readonly
              class="f-inp f-ro"
              style="flex: 1; cursor: pointer"
              :placeholder="'Klik / F1 cari...'"
              @click="showPerushModal = true"
            />
            <button
              type="button"
              class="btn-lkp"
              title="Cari Perusahaan (F1)"
              @click="showPerushModal = true"
              @keydown.f1.prevent="showPerushModal = true"
              tabindex="0"
            >
              <IconSearch :size="14" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="f-row mb-1">
          <label class="f-lbl">Customer</label>
          <div class="inp-grp" style="flex: 1">
            <input
              :value="formData.cusNama || formData.cusKode"
              readonly
              class="f-inp f-ro"
              style="flex: 1; cursor: pointer"
              placeholder="Klik / F1 cari..."
              @click="showCusModal = true"
            />
            <button
              type="button"
              class="btn-lkp"
              title="Cari Customer (F1)"
              @click="showCusModal = true"
              @keydown.f1.prevent="showCusModal = true"
              tabindex="0"
            >
              <IconSearch :size="14" color="#1565c0" />
            </button>
          </div>
        </div>
        <!-- ALAMAT CUSTOMER (Baru ditaruh di sini) -->
        <div class="f-row mb-2">
          <label class="f-lbl"></label>
          <textarea
            :value="formData.alamatCus"
            readonly
            class="f-inp f-ro w-100"
            rows="2"
            style="height: 44px; resize: none"
            placeholder="Alamat Customer..."
          ></textarea>
        </div>

        <div class="f-row mb-2">
          <label class="f-lbl"></label>
          <input
            :value="formData.kotaCus"
            readonly
            class="f-inp f-ro w-100"
            placeholder="Kota..."
          />
        </div>

        <div class="f-row mb-1">
          <label class="f-lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.tanggal"
            class="f-date"
            style="flex: 1"
          />
        </div>
        <div class="f-row mb-2">
          <label class="f-lbl">Jatuh Tempo</label>
          <input
            type="date"
            v-model="formData.tanggalTempo"
            class="f-date"
            style="flex: 1"
          />
        </div>

        <v-textarea
          v-model="formData.keterangan"
          label="Keterangan"
          hide-details
          variant="outlined"
          density="compact"
          rows="2"
          class="mb-3"
        />
      </div>
    </template>

    <template #right-column>
      <v-card border flat class="d-flex flex-column h-100">
        <div
          class="bg-blue-grey-darken-3 text-white px-3 py-2 font-weight-bold text-caption d-flex align-center"
        >
          Daftar Barang
        </div>
        <div style="overflow: auto; flex-grow: 1; background: #fff">
          <table class="manksi-table">
            <thead>
              <tr>
                <th width="40">No.</th>
                <th width="120">Kode (F1)</th>
                <th>Nama Barang</th>
                <th width="80">Ukuran</th>
                <th width="80" class="bg-yellow-darken-2 tr">Jumlah</th>
                <th width="110" class="bg-yellow-darken-2 tr">Harga</th>
                <th width="120" class="tr">Total</th>
                <th width="40"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in formData.details" :key="index">
                <td class="text-center bg-grey-lighten-4">
                  {{ Number(index) + 1 }}
                </td>
                <td>
                  <div class="d-flex align-center h-100">
                    <input
                      v-model="item.kode"
                      class="cell-input text-primary font-weight-bold"
                      placeholder="F1 / kode"
                      style="text-transform: uppercase"
                      @keydown="onBarangKeydown($event, Number(index))"
                      @keydown.enter.prevent="onBarangEnter(Number(index))"
                    />
                    <button
                      type="button"
                      class="btn-icon-only"
                      title="Cari Barang (F1)"
                      @click="openBarangModal(Number(index))"
                    >
                      <IconSearch :size="13" color="#1565c0" />
                    </button>
                  </div>
                </td>
                <td
                  class="bg-grey-lighten-4 px-2 text-truncate"
                  style="max-width: 180px"
                >
                  {{ item.nama }}
                </td>
                <td class="bg-grey-lighten-4 px-2">{{ item.ukuran }}</td>
                <td class="bg-yellow-lighten-5">
                  <input
                    type="number"
                    v-model.number="item.jumlah"
                    class="cell-input tr fw-bold"
                    step="any"
                    min="0"
                    v-select-on-focus
                  />
                </td>
                <td class="bg-yellow-lighten-5">
                  <input
                    type="number"
                    v-model.number="item.harga"
                    class="cell-input tr fw-bold"
                    step="any"
                    min="0"
                    v-select-on-focus
                  />
                </td>
                <td
                  class="tr bg-grey-lighten-4 px-2 fw-bold text-green-darken-3"
                >
                  {{
                    num((Number(item.jumlah) || 0) * (Number(item.harga) || 0))
                  }}
                </td>
                <td class="text-center bg-grey-lighten-4">
                  <v-btn
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="removeRow(Number(index))"
                  >
                    <span class="d-flex align-center justify-center"
                      ><IconTrash :size="14" :stroke-width="1.7"
                    /></span>
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pa-2 bg-grey-lighten-4 border-b">
          <v-btn size="x-small" color="primary" @click="addRow">
            <template #prepend
              ><span class="d-flex align-center"
                ><IconPlus :size="13" :stroke-width="2" /></span
            ></template>
            Tambah Baris
          </v-btn>
        </div>

        <!-- FOOTER TOTAL -->
        <div class="summary-footer">
          <!-- KIRI: Rekening -->
          <div class="rek-section">
            <div class="rek-title">Rekening Pembayaran</div>
            <div class="f-row mb-1">
              <label class="f-lbl" style="width: 70px">Rek. Bank</label>
              <div class="inp-grp" style="width: 260px">
                <input
                  v-model="formData.rekBank"
                  class="f-inp"
                  style="
                    flex: none;
                    width: 90px;
                    background: #ddeeff;
                    font-weight: 600;
                  "
                  placeholder="F1 / nomor"
                  @keydown="onRekKeydown"
                  @keydown.enter.prevent="onRekEnter"
                />
                <input
                  :value="formData.namaBank"
                  readonly
                  class="f-inp f-ro"
                  style="flex: 1"
                />
                <button
                  type="button"
                  class="btn-lkp"
                  title="Cari Rekening (F1)"
                  @click="openRekModal"
                >
                  <IconSearch :size="13" color="#1565c0" />
                </button>
              </div>
            </div>
            <div class="f-row mb-1">
              <label class="f-lbl" style="width: 70px"></label>
              <input
                :value="formData.namaBank"
                readonly
                class="f-inp f-ro"
                style="width: 260px"
                placeholder="Bank..."
              />
            </div>
            <div class="f-row">
              <label class="f-lbl" style="width: 70px"></label>
              <input
                :value="formData.atasNama"
                readonly
                class="f-inp f-ro"
                style="width: 260px"
                placeholder="Atas Nama..."
              />
            </div>
          </div>

          <!-- KANAN: Totals -->
          <div class="totals-section">
            <div class="sum-row">
              <span class="sum-lbl">Total Nominal</span>
              <span class="sum-val text-primary">{{ num(totalNominal) }}</span>
            </div>
            <div class="sum-row align-center">
              <div class="d-flex align-center gap-2">
                <input
                  type="checkbox"
                  v-model="formData.stsPpn"
                  :true-value="1"
                  :false-value="0"
                  style="cursor: pointer; width: 14px; height: 14px"
                />
                <span class="sum-lbl mb-0">PPN (%)</span>
                <input
                  type="number"
                  v-model.number="formData.ppnPersen"
                  class="f-inp"
                  style="width: 50px; text-align: center; height: 22px"
                  :disabled="formData.stsPpn === 0"
                  v-select-on-focus
                />
              </div>
              <span class="sum-val text-orange-darken-3">{{
                num(totalPpn)
              }}</span>
            </div>
            <div class="sum-row sum-grand">
              <span class="sum-lbl">Grand Total</span>
              <span class="sum-val">{{ num(grandTotal) }}</span>
            </div>
            <div class="sum-row mt-1">
              <span class="sum-lbl">Uang Muka</span>
              <span class="sum-val text-blue-grey">{{
                num(formData.uangMuka)
              }}</span>
            </div>
            <div class="sum-row sum-grand">
              <span class="sum-lbl">Nilai Piutang</span>
              <span class="sum-val text-red-darken-2">{{
                num(nilaiPiutang)
              }}</span>
            </div>
          </div>
        </div>
      </v-card>
    </template>
  </BaseForm>

  <!-- MODALS -->
  <PerusahaanSearchModal
    v-model="showPerushModal"
    @selected="onPerushSelected"
  />
  <CustomerSearchModal v-model="showCusModal" @selected="onCusSelected" />
  <RekeningSearchModal
    v-model="showRekModal"
    :kode-perusahaan="formData.kodePerush"
    @selected="onRekSelected"
  />
  <BarangInvProSearchModal
    v-model="showBarangModal"
    :perush-kode="formData.kodePerush"
    :cus-kode="formData.cusKode"
    @selected="onBarangSelected"
  />

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3">
        Simpan Berhasil
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        Invoice Proforma <b>{{ savedNomor }}</b> tersimpan.<br />Cetak dokumen
        ini sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="doTidakCetak">
          Tidak
        </v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doCetak">
          Ya, Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.h-100 {
  height: 100%;
}
.manksi-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 11px;
}
.manksi-table th {
  border-bottom: 2px solid #cfd8dc;
  border-right: 1px solid #e0e0e0;
  padding: 6px 8px;
  text-align: left;
  font-weight: 700;
  color: #37474f;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f5f6f8;
}
.manksi-table td {
  border-bottom: 1px solid #eeeeee;
  border-right: 1px solid #eeeeee;
  padding: 0;
  height: 28px;
  vertical-align: middle;
}
.cell-input {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  padding: 0 8px;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}
.cell-input:focus {
  background-color: #fff3e0;
  box-shadow: inset 0 0 0 1px #ff9800;
}
.btn-icon-only {
  padding: 0 4px;
  color: #757575;
  cursor: pointer;
  border: none;
  background: transparent;
}
.btn-icon-only:hover {
  color: #1565c0;
}
.tr {
  text-align: right !important;
}
.fw-bold {
  font-weight: 600;
}

.tm-sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1565c0;
}
.f-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 26px;
}
.f-lbl {
  width: 80px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}
.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
  box-sizing: border-box;
  font-family: inherit;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #555 !important;
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
  width: 28px;
  min-width: 28px;
  height: 100%;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-lkp:hover {
  background: #bbdefb;
}

.btn-icon-only {
  width: 24px;
  min-width: 24px;
  height: 100%;
  padding: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #eeeeee;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1565c0;
}
.btn-icon-only:hover {
  background: #bbdefb;
}

.summary-footer {
  background: #f5f6f8;
  padding: 12px 16px;
  border-top: 2px solid #cfd8dc;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.sum-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: #555;
}
.sum-grand {
  border-top: 1px dashed #bdbdbd;
  padding-top: 4px;
  margin-top: 2px;
  font-size: 13px;
  font-weight: 700;
  color: #212121;
}

.rek-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.rek-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1565c0;
  margin-bottom: 6px;
}
.totals-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 240px;
}
.f-date {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
  box-sizing: border-box;
  min-width: 0;
}
</style>
