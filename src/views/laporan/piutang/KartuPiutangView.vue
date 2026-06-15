<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { kartuPiutangService } from "@/services/laporan/piutang/kartuPiutangService";
import {
  IconFileDescription,
  IconReceipt2,
  IconHistory,
  IconX,
} from "@tabler/icons-vue";

const toast = useToast();
const menuId = "968";

const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const filterState = ref({
  endDate: getLocalDate(),
});

// ── HEADER MASTER: DAFTAR CUSTOMER ──
const headers = [
  { title: "Kode", key: "Kode", width: "100px" },
  { title: "Customer", key: "Nama", minWidth: "220px" },
  { title: "Alamat", key: "Alamat", minWidth: "250px" },
  { title: "Kota", key: "Kota", width: "120px" },
  { title: "Debet", key: "Debet", width: "120px", align: "right" },
  { title: "Kredit", key: "Kredit", width: "120px", align: "right" },
  { title: "Saldo", key: "Saldo", width: "120px", align: "right" },
  { title: "Status", key: "Status", width: "80px", align: "center" },
  // Kolom "Aksi" dihapus dari sini
];

const {
  items,
  isLoading,
  canExport,
  fetchData,
  exportToExcel,
  selected,
  isSingleSelected,
} = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await kartuPiutangService.getBrowse(filterState.value);
    return res.data.data || [];
  },
  immediate: true,
});

// ── STATE DIALOG 1: DAFTAR INVOICE ──
const showInvoiceDialog = ref(false);
const isInvoiceLoading = ref(false);
const currentCustomer = ref<any>({});
const invoiceList = ref<any[]>([]);

const openInvoiceDialog = async (customer: any) => {
  currentCustomer.value = customer;
  showInvoiceDialog.value = true;
  isInvoiceLoading.value = true;
  try {
    const res = await kartuPiutangService.getInvoiceByCustomer(
      customer.Kode,
      filterState.value,
    );
    invoiceList.value = res.data.data || [];
  } catch (error) {
    toast.error("Gagal memuat daftar invoice");
    showInvoiceDialog.value = false;
  } finally {
    isInvoiceLoading.value = false;
  }
};

// ── STATE DIALOG 2: DAFTAR PEMBAYARAN ──
const showBayarDialog = ref(false);
const isBayarLoading = ref(false);
const currentInvoice = ref<any>({});
const bayarList = ref<any[]>([]);

const openBayarDialog = async (invoice: any) => {
  currentInvoice.value = invoice;
  showBayarDialog.value = true;
  isBayarLoading.value = true;
  try {
    const res = await kartuPiutangService.getPembayaranByInvoice(
      invoice.Invoice,
      filterState.value,
    );
    bayarList.value = res.data.data || [];
  } catch (error) {
    toast.error("Gagal memuat histori pembayaran");
    showBayarDialog.value = false;
  } finally {
    isBayarLoading.value = false;
  }
};

// ── UTILS ──
const fmtNum = (val: number) =>
  new Intl.NumberFormat("id-ID").format(Math.ceil(val || 0));

// Delphi: Jika status pasif warnanya merah
const getRowProps = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Status === "Pasif")
    return { style: "color: #c62828; font-weight: 500;" };
  return {};
};

const getTotal = (key: string, arr: any[]) => {
  return arr.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
};
</script>

<template>
  <BaseBrowse
    title="Laporan Kartu Piutang"
    :menu-id="menuId"
    :icon="IconFileDescription"
    :headers="headers"
    :items="items ?? []"
    item-value="Kode"
    :is-loading="isLoading"
    v-model:filterState="filterState"
    v-model:selected="selected"
    :can-export="canExport"
    :row-props-fn="getRowProps"
    @refresh="fetchData"
    @export="exportToExcel('Laporan_Kartu_Piutang')"
  >
    <template #filter-left>
      <div class="d-flex align-center gap-2">
        <span class="f-label">Piutang S.D Tanggal</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="f-date"
          @change="fetchData"
        />
        <div class="f-divider" />
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="primary"
        variant="tonal"
        class="mr-2"
        :disabled="!isSingleSelected"
        @click="openInvoiceDialog(selected[0])"
      >
        <template #prepend><IconReceipt2 :size="15" /></template>
        Lihat Invoice
      </v-btn>
    </template>

    <template #item.Debet="{ item }">{{ fmtNum(item.Debet) }}</template>
    <template #item.Kredit="{ item }">{{ fmtNum(item.Kredit) }}</template>
    <template #item.Saldo="{ item }">
      <span
        class="font-weight-bold"
        :class="item.Saldo > 0 ? 'text-primary' : ''"
      >
        {{ fmtNum(item.Saldo) }}
      </span>
    </template>
    <template #item.Aksi="{ item }">
      <v-btn
        size="x-small"
        color="primary"
        variant="tonal"
        class="px-2"
        @click.stop="openInvoiceDialog(item)"
      >
        <IconReceipt2 :size="14" class="mr-1" /> Invoice
      </v-btn>
    </template>

    <template #summary-row="{ filteredItems }">
      <div class="d-flex align-center gap-2 w-100 pr-2 summary-container">
        <span class="summary-lbl ml-auto pr-3">GRAND TOTAL:</span>
        <div class="d-flex flex-column align-end mx-2">
          <span class="summary-sublbl">DEBET</span>
          <span class="summary-val">{{
            fmtNum(getTotal("Debet", filteredItems))
          }}</span>
        </div>
        <div class="d-flex flex-column align-end mx-2">
          <span class="summary-sublbl">KREDIT</span>
          <span class="summary-val">{{
            fmtNum(getTotal("Kredit", filteredItems))
          }}</span>
        </div>
        <div
          class="d-flex flex-column align-end pl-3 ml-2"
          style="border-left: 2px solid rgba(255, 255, 255, 0.4)"
        >
          <span class="summary-sublbl text-yellow-accent-2">SALDO PIUTANG</span>
          <span
            class="summary-val text-yellow-accent-2"
            style="font-size: 14px"
            >{{ fmtNum(getTotal("Saldo", filteredItems)) }}</span
          >
        </div>
        <div style="width: 100px"></div>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showInvoiceDialog" max-width="900px" scrollable>
    <v-card class="rounded-lg">
      <div class="dialog-header">
        <div class="d-flex flex-column">
          <span class="dialog-title">Daftar Invoice Customer</span>
          <span class="dialog-subtitle"
            >[{{ currentCustomer.Kode }}] {{ currentCustomer.Nama }}</span
          >
        </div>
        <v-spacer />
        <button class="dialog-close-btn" @click="showInvoiceDialog = false">
          <IconX :size="20" />
        </button>
      </div>

      <v-card-text class="pa-0">
        <div v-if="isInvoiceLoading" class="pa-6 text-center text-grey">
          <v-progress-circular
            indeterminate
            color="primary"
            size="30"
            class="mb-2"
          />
          <div>Memuat data invoice...</div>
        </div>

        <table v-else class="nested-table">
          <thead>
            <tr>
              <th style="width: 40px" class="tc">No</th>
              <th style="width: 160px">Nomor Invoice</th>
              <th style="width: 90px" class="tc">Tanggal</th>
              <th style="width: 90px" class="tc">Jth Tempo</th>
              <th class="tr">Debet</th>
              <th class="tr">Kredit</th>
              <th class="tr">Saldo</th>
              <th style="width: 90px" class="tc">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(inv, i) in invoiceList" :key="inv.Invoice">
              <td class="tc">{{ i + 1 }}</td>
              <td class="font-weight-bold text-primary">{{ inv.Invoice }}</td>
              <td class="tc">{{ inv.Tanggal }}</td>
              <td class="tc">{{ inv.Tempo }}</td>
              <td class="tr">{{ fmtNum(inv.Debet) }}</td>
              <td class="tr">{{ fmtNum(inv.Kredit) }}</td>
              <td
                class="tr font-weight-bold"
                :class="inv.Saldo > 0 ? 'text-error' : 'text-success'"
              >
                {{ fmtNum(inv.Saldo) }}
              </td>
              <td class="tc">
                <v-btn
                  size="x-small"
                  color="teal-darken-1"
                  variant="flat"
                  @click="openBayarDialog(inv)"
                >
                  <IconHistory :size="13" class="mr-1" /> Lihat Pembayaran
                </v-btn>
              </td>
            </tr>
            <tr v-if="invoiceList.length === 0">
              <td colspan="8" class="text-center pa-4 text-grey font-italic">
                Tidak ada invoice untuk periode ini.
              </td>
            </tr>
          </tbody>
          <tfoot v-if="invoiceList.length > 0">
            <tr class="tfoot-row">
              <td colspan="4" class="tr">TOTAL INVOICE :</td>
              <td class="tr">{{ fmtNum(getTotal("Debet", invoiceList)) }}</td>
              <td class="tr">{{ fmtNum(getTotal("Kredit", invoiceList)) }}</td>
              <td class="tr">{{ fmtNum(getTotal("Saldo", invoiceList)) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showBayarDialog" max-width="800px" scrollable>
    <v-card class="rounded-lg">
      <div class="dialog-header bg-teal-darken-2">
        <div class="d-flex flex-column">
          <span class="dialog-title">Histori Pembayaran</span>
          <span class="dialog-subtitle"
            >Nota: {{ currentInvoice.Invoice }}</span
          >
        </div>
        <v-spacer />
        <button class="dialog-close-btn" @click="showBayarDialog = false">
          <IconX :size="20" />
        </button>
      </div>

      <v-card-text class="pa-0">
        <div v-if="isBayarLoading" class="pa-6 text-center text-grey">
          <v-progress-circular
            indeterminate
            color="teal"
            size="30"
            class="mb-2"
          />
          <div>Memuat data pembayaran...</div>
        </div>

        <table v-else class="nested-table">
          <thead>
            <tr>
              <th style="width: 40px" class="tc">No</th>
              <th style="width: 130px">No Penerimaan</th>
              <th style="width: 130px">No Pelunasan</th>
              <th style="width: 90px" class="tc">Tgl Terima</th>
              <th style="width: 90px" class="tc">Tgl Lunas</th>
              <th>Keterangan</th>
              <th class="tr" style="width: 120px">Bayar (Kredit)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(byr, i) in bayarList" :key="i">
              <td class="tc">{{ i + 1 }}</td>
              <td>{{ byr.NoPenerimaan }}</td>
              <td>{{ byr.NoPelunasan }}</td>
              <td class="tc">{{ byr.TglPenerimaan }}</td>
              <td class="tc">{{ byr.TglPelunasan }}</td>
              <td style="white-space: normal; line-height: 1.3">
                {{ byr.Keterangan }}
              </td>
              <td class="tr font-weight-bold text-teal-darken-3">
                {{ fmtNum(byr.Kredit) }}
              </td>
            </tr>
            <tr v-if="bayarList.length === 0">
              <td colspan="7" class="text-center pa-4 text-grey font-italic">
                Belum ada pembayaran untuk invoice ini.
              </td>
            </tr>
          </tbody>
          <tfoot v-if="bayarList.length > 0">
            <tr class="tfoot-row text-teal-darken-4">
              <td colspan="6" class="tr">TOTAL DIBAYAR :</td>
              <td class="tr">{{ fmtNum(getTotal("Kredit", bayarList)) }}</td>
            </tr>
          </tfoot>
        </table>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Filter ── */
.gap-2 {
  gap: 8px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
}
.f-date:focus {
  border-color: #1976d2;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 10px;
}

/* ── Summary Row Styles ── */
.summary-container {
  overflow-x: auto;
  padding-bottom: 2px;
}
.summary-lbl {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
}
.summary-sublbl {
  font-size: 9px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: -2px;
}
.summary-val {
  font-size: 12px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.02em;
}

/* ── Modal & Nested Table ── */
.dialog-header {
  background: #1565c0;
  color: white;
  display: flex;
  align-items: center;
  padding: 12px 16px;
}
.dialog-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.dialog-subtitle {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.8;
  margin-top: 2px;
}
.dialog-close-btn {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
}
.dialog-close-btn:hover {
  opacity: 1;
}

.nested-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.nested-table thead th {
  background: #eceff1;
  color: #37474f;
  padding: 8px 10px;
  text-align: left;
  font-weight: 700;
  border-bottom: 2px solid #b0bec5;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}
.nested-table tbody td {
  padding: 6px 10px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
  white-space: nowrap;
}
.nested-table tbody tr:hover td {
  background: #f5f9ff;
}
.nested-table tfoot .tfoot-row td {
  background: #e3f2fd;
  font-weight: 700;
  border-top: 2px solid #90caf9;
  padding: 8px 10px;
  color: #1565c0;
  position: sticky;
  bottom: 0;
  z-index: 2;
}

.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
</style>
