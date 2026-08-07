<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { insentifFormService as svc } from "@/services/penjualan/insentifFormService";
import { IconCoin, IconSearch, IconTrash } from "@tabler/icons-vue";

// ── Types ───────────────────────────────────────────────────────────────
interface InvoiceRow {
  _key: number;
  Kode: string;
  Kodex: string;
  Tanggal: string;
  Pajak: string;
  Nominal: number;
  Bayar: number;
  Sisa: number;
  Keterangan: string;
  Invt: string;
}
interface DetailRow {
  _key: number;
  Inv: string; // nomor invoice pemilik baris ini
  Kode: string;
  Nama: string;
  Jumlah: number;
  Harga: number;
  Riil: number;
  Fee: number;
  Total: number;
  Xfee: number;
}

const router = useRouter();
const toast = useToast();

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

let _key = 1;

// ── Form state ─────────────────────────────────────────────────────────
const fd = ref({
  Tanggal: todayLocal(),
  CusKode: "",
  CusNama: "",
  CusAlamat: "",
  CusKota: "",
  Bank: "",
  NoRek: "",
  AtasNama: "",
  InvoiceList: [] as InvoiceRow[],
  DetailSpk: [] as DetailRow[],
});

const isLoading = ref(false);
const isSaving = ref(false);
const showSaveDialog = ref(false);
const showCloseDialog = ref(false);

// ── Customer ───────────────────────────────────────────────────────────
const onCusKodeEnter = async () => {
  const kode = fd.value.CusKode.trim();
  if (!kode) {
    fd.value.CusNama = "";
    fd.value.CusAlamat = "";
    fd.value.CusKota = "";
    return;
  }
  try {
    const res = await svc.getCustomerInfo(kode);
    const c = res.data.data;
    fd.value.CusKode = c.cus_kode;
    fd.value.CusNama = c.cus_nama;
    fd.value.CusAlamat = c.cus_alamat;
    fd.value.CusKota = c.cus_kota;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode tidak ditemukan.");
    fd.value.CusKode = "";
    fd.value.CusNama = "";
    fd.value.CusAlamat = "";
    fd.value.CusKota = "";
    // Ganti customer → grid invoice/detail yang sudah ada jadi tidak
    // valid (semua terikat ke customer sebelumnya), reset.
    fd.value.InvoiceList = [];
    fd.value.DetailSpk = [];
  }
};

// Ganti customer manual (bukan lewat error) juga reset grid — replikasi
// edtCusKodeChange Delphi (initgrid + initgrid2 tiap CusKode berubah).
const onCusKodeChange = () => {
  if (fd.value.InvoiceList.length > 0 || fd.value.DetailSpk.length > 0) {
    fd.value.InvoiceList = [];
    fd.value.DetailSpk = [];
  }
};

// ── Grid Invoice ───────────────────────────────────────────────────────
const invoiceInput = ref("");
const isLoadingInvoice = ref(false);
const showInvoiceModal = ref(false);
const invoiceModalQ = ref("");
const invoiceModalList = ref<any[]>([]);
const isLoadingModal = ref(false);

const addInvoice = async (nomor: string) => {
  if (!fd.value.CusKode) {
    toast.warning("Customer belum di isi.");
    return;
  }
  const dup = fd.value.InvoiceList.find((r) => r.Kode === nomor);
  if (dup) {
    toast.warning("Invoice ini sudah di input.");
    return;
  }

  isLoadingInvoice.value = true;
  try {
    const res = await svc.checkInvoice(fd.value.CusKode, nomor);
    const { invoice, detail } = res.data.data;

    fd.value.InvoiceList.push({
      _key: _key++,
      Kode: invoice.Kode,
      Kodex: invoice.Kodex,
      Tanggal: invoice.Tanggal,
      Pajak: invoice.Pajak,
      Nominal: Number(invoice.Nominal) || 0,
      Bayar: Number(invoice.Bayar) || 0,
      Sisa: Number(invoice.Sisa) || 0,
      Keterangan: invoice.Keterangan,
      Invt: invoice.Invt,
    });

    (detail || []).forEach((d: any) => {
      fd.value.DetailSpk.push({
        _key: _key++,
        Inv: invoice.Kode,
        Kode: d.Kode,
        Nama: d.Nama,
        Jumlah: Number(d.Jumlah) || 0,
        Harga: Number(d.Harga) || 0,
        Riil: Number(d.Riil) || 0,
        Fee: Number(d.Fee) || 0,
        Total: Number(d.Total) || 0,
        Xfee: Number(d.Xfee) || 0,
      });
    });
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Invoice tidak valid.");
  } finally {
    isLoadingInvoice.value = false;
  }
};

const onInvoiceInputEnter = async () => {
  const val = invoiceInput.value.trim();
  if (!val) return;
  await addInvoice(val);
  invoiceInput.value = "";
};

const openInvoiceModal = async () => {
  if (!fd.value.CusKode) {
    toast.warning("Customer belum di isi.");
    return;
  }
  invoiceModalQ.value = "";
  showInvoiceModal.value = true;
  await searchInvoiceModal();
};
const searchInvoiceModal = async () => {
  isLoadingModal.value = true;
  try {
    const res = await svc.searchInvoice(fd.value.CusKode, invoiceModalQ.value);
    invoiceModalList.value = res.data.data || [];
  } catch {
    invoiceModalList.value = [];
  } finally {
    isLoadingModal.value = false;
  }
};
const selectInvoiceFromModal = async (item: any) => {
  showInvoiceModal.value = false;
  await addInvoice(item.Invoice);
};

// Hapus baris invoice — ikut hapus semua baris detail SPK miliknya
// (replikasi cxGrdMain2KeyUp VK_DELETE: cascade delete CDS grid1).
const showDeleteInvoiceDialog = ref(false);
const pendingDeleteInvoice = ref<InvoiceRow | null>(null);
const requestRemoveInvoice = (row: InvoiceRow) => {
  pendingDeleteInvoice.value = row;
  showDeleteInvoiceDialog.value = true;
};
const confirmRemoveInvoice = () => {
  if (pendingDeleteInvoice.value) {
    const kode = pendingDeleteInvoice.value.Kode;
    fd.value.InvoiceList = fd.value.InvoiceList.filter((r) => r.Kode !== kode);
    fd.value.DetailSpk = fd.value.DetailSpk.filter((r) => r.Inv !== kode);
  }
  showDeleteInvoiceDialog.value = false;
  pendingDeleteInvoice.value = null;
};

// ── Ringkasan / Totals ───────────────────────────────────────────────
const totalNominalInvoice = computed(() =>
  fd.value.InvoiceList.reduce((s, r) => s + (Number(r.Nominal) || 0), 0),
);
const totalFeeTransfer = computed(() =>
  fd.value.DetailSpk.reduce(
    (s, r) => s + (Number(r.Jumlah) || 0) * (Number(r.Fee) || 0),
    0,
  ),
);

// Styling baris detail SPK — replikasi cxGrdMasterCustomDrawCell:
// fee=0 & xfee=0 → abu (tidak relevan); fee=0 & xfee<>0 → merah (perlu
// input fee di master SPK dulu).
const rowClass = (r: DetailRow) => {
  if (Number(r.Fee) === 0 && Number(r.Xfee) === 0) return "row-muted";
  if (Number(r.Fee) === 0 && Number(r.Xfee) !== 0) return "row-danger";
  return "";
};

const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

// ── Print dialog ───────────────────────────────────────────────────────
const showPrintDialog = ref(false);
const savedNomor = ref("");

const skipPrint = () => {
  showPrintDialog.value = false;
  router.push({ name: "InsentifBrowse" });
};
const doCetak = () => {
  window.open(
    `/penjualan/insentif/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  showPrintDialog.value = false;
  router.push({ name: "InsentifBrowse" });
};

// ── Validasi & Simpan ────────────────────────────────────────────────
const validateSave = () => {
  if (!fd.value.CusNama) {
    toast.warning("Customer harus di isi.");
    return;
  }
  const validInvoices = fd.value.InvoiceList.filter((r) => r.Kode);
  if (!validInvoices.length) {
    toast.warning("Minimal harus ada 1 invoice.");
    return;
  }
  for (const inv of validInvoices) {
    if (Number(inv.Sisa) >= 500) {
      toast.warning(`Invoice ${inv.Kode} belum lunas.`);
      return;
    }
  }
  for (const d of fd.value.DetailSpk) {
    if (Number(d.Fee) === 0 && Number(d.Xfee) !== 0) {
      toast.warning(`SPK: ${d.Kode} Belum input Fee.`);
      return;
    }
  }
  showSaveDialog.value = true;
};

const executeSave = async () => {
  showSaveDialog.value = false;
  isSaving.value = true;
  try {
    const payload = {
      tanggal: fd.value.Tanggal,
      cusKode: fd.value.CusKode,
      bank: fd.value.Bank,
      noRek: fd.value.NoRek,
      atasNama: fd.value.AtasNama,
      invoiceList: fd.value.InvoiceList.map((r) => ({
        Kode: r.Kode,
        Tanggal: r.Tanggal,
        Invt: r.Invt,
      })),
    };
    const res = await svc.save(payload);
    savedNomor.value = res.data?.data?.nomor || "";
    toast.success("Berhasil disimpan.");
    showPrintDialog.value = true;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan data.");
  } finally {
    isSaving.value = false;
  }
};

const executeClose = () => router.push({ name: "InsentifBrowse" });
</script>

<template>
  <BaseForm
    title="Tambah Insentif"
    menu-id="167"
    :icon="IconCoin"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Insentif"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section">
        <div class="sec-title">Header</div>

        <div class="fg">
          <label class="lb w90">Tanggal</label>
          <input type="date" v-model="fd.Tanggal" class="inp" />
        </div>

        <div class="fg mt4">
          <label class="lb w90">Customer</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="fd.CusKode"
              class="inp"
              style="
                width: 70px;
                flex-shrink: 0;
                text-transform: uppercase;
                padding: 0 3px;
              "
              placeholder="Kode"
              @keydown.enter.prevent="onCusKodeEnter"
              @blur="onCusKodeEnter"
              @input="onCusKodeChange"
            />
            <input
              :value="fd.CusNama"
              readonly
              class="inp ro"
              style="flex: 1"
              placeholder="Nama customer..."
              tabindex="-1"
            />
          </div>
        </div>

        <div class="fg mt4">
          <label class="lb w90">Alamat</label>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 3px">
            <input
              :value="fd.CusAlamat"
              readonly
              class="inp ro"
              placeholder="Alamat..."
            />
            <input
              :value="fd.CusKota"
              readonly
              class="inp ro"
              placeholder="Kota..."
            />
          </div>
        </div>
      </div>

      <div class="desktop-form-section">
        <div class="sec-title">Dibayarkan Ke</div>
        <div class="fg">
          <label class="lb w90">Bank</label>
          <input v-model="fd.Bank" class="inp" style="flex: 1" />
        </div>
        <div class="fg mt4">
          <label class="lb w90">No. Rekening</label>
          <input v-model="fd.NoRek" class="inp" style="flex: 1" />
        </div>
        <div class="fg mt4">
          <label class="lb w90">Atas Nama</label>
          <input v-model="fd.AtasNama" class="inp" style="flex: 1" />
        </div>
      </div>

      <div class="desktop-form-section">
        <div class="sec-title">Ringkasan</div>
        <div class="rk-row">
          <span class="rk-lbl">Total Nominal Invoice</span>
          <span class="rk-val">{{ num(totalNominalInvoice) }}</span>
        </div>
        <div class="rk-row">
          <span class="rk-lbl rk-bold">Fee yang Ditransfer</span>
          <span class="rk-val rk-bold rk-primary">{{
            num(totalFeeTransfer)
          }}</span>
        </div>
      </div>
    </template>

    <template #right-column>
      <!-- Grid Invoice -->
      <div
        class="desktop-form-section"
        style="flex: 1; min-height: 0; display: flex; flex-direction: column"
      >
        <div class="dtbar">
          <span class="sec-title">Invoice</span>
          <span class="note ml8">Ketik nomor + Enter, atau F1/tombol cari</span>
          <button
            class="tbtn tbtn-blue"
            style="margin-left: auto"
            @click="openInvoiceModal"
          >
            + Invoice (F1)
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
          <div v-if="isLoadingInvoice" class="grid-loading-overlay">
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
                  <th style="width: 130px">Invoice</th>
                  <th style="width: 85px">Tanggal</th>
                  <th style="width: 130px">Faktur Pajak</th>
                  <th style="width: 100px" class="tr">Nominal</th>
                  <th style="width: 90px" class="tr">Bayar</th>
                  <th style="width: 90px" class="tr">Sisa</th>
                  <th style="min-width: 160px">Keterangan</th>
                  <th style="width: 30px"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in fd.InvoiceList"
                  :key="row._key"
                  :class="i % 2 === 1 ? 'rs' : ''"
                >
                  <td class="tc muted" style="font-size: 10px">{{ i + 1 }}</td>
                  <td class="mono">
                    {{ row.Kode }}
                    <span
                      v-if="row.Invt"
                      title="Terhubung Invoice Tak Normal/Proforma"
                      class="badge-blue"
                      >*</span
                    >
                  </td>
                  <td>{{ row.Tanggal }}</td>
                  <td>{{ row.Pajak }}</td>
                  <td class="tr">{{ num(row.Nominal) }}</td>
                  <td class="tr">{{ num(row.Bayar) }}</td>
                  <td
                    class="tr"
                    :style="
                      row.Sisa >= 500 ? 'color:#c62828;font-weight:700' : ''
                    "
                  >
                    {{ num(row.Sisa) }}
                  </td>
                  <td>{{ row.Keterangan }}</td>
                  <td class="tc">
                    <button class="del-btn" @click="requestRemoveInvoice(row)">
                      ×
                    </button>
                  </td>
                </tr>
                <tr>
                  <td class="tc muted" style="font-size: 10px">
                    {{ fd.InvoiceList.length + 1 }}
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 2px">
                      <input
                        v-model="invoiceInput"
                        class="ci mono"
                        placeholder="Ketik nomor/Enter, F1=Cari"
                        style="flex: 1; font-size: 10px"
                        @keydown.enter.prevent="onInvoiceInputEnter"
                        @keydown.f1.prevent="openInvoiceModal"
                      />
                      <button
                        class="ibtn-sm"
                        tabindex="-1"
                        @click.stop="openInvoiceModal"
                      >
                        <IconSearch :size="9" color="#1565c0" />
                      </button>
                    </div>
                  </td>
                  <td colspan="7"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="grid-summary">
            <span
              >Total Nominal: <b>{{ num(totalNominalInvoice) }}</b></span
            >
          </div>
        </div>
      </div>

      <!-- Grid Detail SPK (read-only, otomatis dari invoice) -->
      <div
        class="desktop-form-section"
        style="flex: 1.1; min-height: 0; display: flex; flex-direction: column"
      >
        <div class="dtbar">
          <span class="sec-title">Detail SPK / Fee</span>
          <span class="note ml8">
            <span
              class="row-danger"
              style="padding: 1px 6px; border-radius: 3px"
              >Merah</span
            >
            = fee belum diisi di master SPK
          </span>
        </div>

        <div class="gwrap">
          <table class="gtbl">
            <thead>
              <tr>
                <th style="width: 24px">#</th>
                <th style="width: 100px">Invoice</th>
                <th style="width: 110px">SPK</th>
                <th style="min-width: 160px">Nama</th>
                <th style="width: 70px" class="tr">Jumlah</th>
                <th style="width: 90px" class="tr">Harga</th>
                <th style="width: 90px" class="tr">Harga Riil</th>
                <th style="width: 80px" class="tr">Fee</th>
                <th style="width: 100px" class="tr">Total Fee</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, i) in fd.DetailSpk"
                :key="row._key"
                :class="[i % 2 === 1 ? 'rs' : '', rowClass(row)]"
              >
                <td class="tc muted" style="font-size: 10px">{{ i + 1 }}</td>
                <td class="mono">{{ row.Inv }}</td>
                <td class="mono">{{ row.Kode }}</td>
                <td>{{ row.Nama }}</td>
                <td class="tr">{{ num(row.Jumlah) }}</td>
                <td class="tr">{{ num(row.Harga) }}</td>
                <td class="tr">{{ num(row.Riil) }}</td>
                <td class="tr">{{ num(row.Fee) }}</td>
                <td class="tr" style="font-weight: 700">
                  {{ num(row.Jumlah * row.Fee) }}
                </td>
              </tr>
              <tr v-if="!fd.DetailSpk.length">
                <td
                  colspan="9"
                  class="tc muted"
                  style="padding: 12px; font-style: italic"
                >
                  Tambahkan invoice untuk melihat rincian SPK.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid-summary">
          <span
            >Fee yang Ditransfer: <b>{{ num(totalFeeTransfer) }}</b></span
          >
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- ── Modal Cari Invoice ── -->
  <v-dialog v-model="showInvoiceModal" max-width="720px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        Cari Invoice
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="invoiceModalQ"
          class="ms"
          placeholder="Cari nomor invoice..."
          autofocus
          @keyup.enter="searchInvoiceModal"
        />
        <div v-if="isLoadingModal" class="pa-4 text-center text-grey">
          Memuat...
        </div>
        <div v-else class="ml">
          <table class="mtt">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Tanggal</th>
                <th class="tr">Nominal</th>
                <th class="tr">Bayar</th>
                <th class="tr">Sisa</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in invoiceModalList"
                :key="item.Invoice"
                class="mtr"
                @click="selectInvoiceFromModal(item)"
              >
                <td class="mono">{{ item.Invoice }}</td>
                <td>{{ item.Tanggal }}</td>
                <td class="tr">{{ num(item.Nominal) }}</td>
                <td class="tr">{{ num(item.Bayar) }}</td>
                <td class="tr">{{ num(item.Sisa) }}</td>
              </tr>
              <tr v-if="!invoiceModalList.length">
                <td colspan="5" class="me">Tidak ada hasil</td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
      <v-card-actions class="pa-2 border-t">
        <v-spacer />
        <v-btn variant="text" size="small" @click="showInvoiceModal = false"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Konfirmasi Hapus Baris Invoice ── -->
  <v-dialog v-model="showDeleteInvoiceDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-error text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Konfirmasi
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Ingin hapus record ini beserta rincian SPK-nya?<br />
        <b>{{ pendingDeleteInvoice?.Kode }}</b>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn
          variant="text"
          size="small"
          @click="showDeleteInvoiceDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="error"
          @click="confirmRemoveInvoice"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Print ── -->
  <v-dialog v-model="showPrintDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Cetak Pengajuan Fee
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Data <b>{{ savedNomor }}</b> berhasil disimpan.<br />Ingin mencetak?
      </v-card-text>
      <v-card-actions class="pa-3 border-t" style="gap: 6px">
        <v-btn variant="text" size="small" @click="skipPrint">Tidak</v-btn>
        <v-spacer />
        <v-btn variant="flat" size="small" color="primary" @click="doCetak"
          >🖨️ Cetak</v-btn
        >
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
  padding: 2px 4px;
  border-bottom: 0.3px solid #e0e0e0;
  vertical-align: middle;
}
.rs td {
  background: #fafafa;
}
.row-danger td {
  background: #ffebee !important;
  color: #c62828;
}
.row-muted td {
  color: #9e9e9e;
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
.tbtn-blue {
  background: #1565c0;
  color: white;
}

.rk-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 22px;
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

.badge-blue {
  color: #1565c0;
  font-weight: 700;
  margin-left: 2px;
}

.ms {
  width: 100%;
  height: 30px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  margin-bottom: 8px;
  box-sizing: border-box;
}
.ms:focus {
  border-color: #1565c0;
}
.ml {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.mtt {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.mtt th {
  background: #f5f5f5;
  padding: 6px 8px;
  font-weight: 700;
  text-align: left;
  position: sticky;
  top: 0;
}
.mtt td {
  padding: 5px 8px;
  border-bottom: 1px solid #f0f0f0;
}
.mtr {
  cursor: pointer;
}
.mtr:hover td {
  background: #e3f2fd;
}
.me {
  text-align: center;
  padding: 12px;
  color: #9e9e9e;
  font-style: italic;
}
</style>
