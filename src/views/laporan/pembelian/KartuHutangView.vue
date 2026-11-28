<script setup lang="ts">
import { ref, computed } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  kartuHutangService,
  type KartuHutangMasterRow,
  type KartuHutangNotaRow,
  type KartuHutangVoucherRow,
  tipeNotaLabel,
} from "@/services/laporan/pembelian/kartuHutangService";
import {
  IconFileDescription,
  IconReceipt2,
  IconHistory,
  IconX,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();
const menuId = "975";

const pad = (n: number) => String(n).padStart(2, "0");
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const getAwalTahun = () => `${new Date().getFullYear()}-01-01`;

const filterState = ref({
  startDate: getAwalTahun(),
  endDate: getToday(),
  hanyaSisa: false,
});

// ── HEADER MASTER: DAFTAR SUPPLIER ──
const headers = [
  { title: "Kode", key: "KodeSupplier", width: "100px" },
  { title: "Supplier", key: "Supplier", minWidth: "260px" },
  { title: "Jml Nota", key: "JmlNota", width: "80px", align: "end" },
  { title: "Total Nota", key: "Total", width: "130px", align: "end" },
  { title: "Voucher", key: "Voucher", width: "130px", align: "end" },
  { title: "Dibayar", key: "Bayar", width: "130px", align: "end" },
  { title: "Belum Voucher", key: "BelumVoucher", width: "130px", align: "end" },
  { title: "Sisa Hutang", key: "Sisa", width: "130px", align: "end" },
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
    const res = await kartuHutangService.getMaster({
      startDate: filterState.value.startDate,
      endDate: filterState.value.endDate,
      hanyaSisa: filterState.value.hanyaSisa,
    });
    return res.data.data || [];
  },
  immediate: true,
});

// ── UTILS ──
const fmtNum = (v: number | string | null | undefined) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
    Number(v) || 0,
  );

// Slot/row dari BaseBrowse bisa berbentuk { raw } atau item langsung
const rowOf = (item: unknown): KartuHutangMasterRow => {
  const wrapped = item as { raw?: KartuHutangMasterRow };
  return (wrapped.raw ?? item) as KartuHutangMasterRow;
};

const sumOf = <T,>(rows: T[], key: keyof T) =>
  rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

const periodeValid = () => {
  const { startDate, endDate } = filterState.value;
  if (!startDate || !endDate) {
    toast.warning("Periode tanggal nota wajib diisi.");
    return false;
  }
  if (startDate > endDate) {
    toast.warning("Tanggal awal tidak boleh melebihi tanggal akhir.");
    return false;
  }
  return true;
};

const onFilterChange = () => {
  if (periodeValid()) fetchData();
};

// ── DIALOG 1: DAFTAR NOTA ──
const showNotaDialog = ref(false);
const isNotaLoading = ref(false);
const currentSupplier = ref<KartuHutangMasterRow | null>(null);
const notaList = ref<KartuHutangNotaRow[]>([]);

const openNotaDialog = async (sup: KartuHutangMasterRow) => {
  currentSupplier.value = sup;
  notaList.value = [];
  showNotaDialog.value = true;
  isNotaLoading.value = true;
  try {
    const res = await kartuHutangService.getNota({
      startDate: filterState.value.startDate,
      endDate: filterState.value.endDate,
      supKode: sup.KodeSupplier,
    });
    notaList.value = res.data.data || [];
  } catch {
    toast.error("Gagal memuat daftar nota");
    showNotaDialog.value = false;
  } finally {
    isNotaLoading.value = false;
  }
};

const bukaDariTerpilih = () => {
  const sup = selected.value?.[0];
  if (sup) openNotaDialog(rowOf(sup));
};

// ── DIALOG 2: DAFTAR VOUCHER ──
const showVoucherDialog = ref(false);
const isVoucherLoading = ref(false);
const currentNota = ref<KartuHutangNotaRow | null>(null);
const voucherList = ref<KartuHutangVoucherRow[]>([]);

const openVoucherDialog = async (nota: KartuHutangNotaRow) => {
  currentNota.value = nota;
  voucherList.value = [];
  showVoucherDialog.value = true;
  isVoucherLoading.value = true;
  try {
    const res = await kartuHutangService.getVoucher({
      startDate: filterState.value.startDate,
      endDate: filterState.value.endDate,
      nomor: nota.Nomor,
    });
    voucherList.value = res.data.data || [];
  } catch {
    toast.error("Gagal memuat daftar voucher");
    showVoucherDialog.value = false;
  } finally {
    isVoucherLoading.value = false;
  }
};

const periodeLabel = computed(
  () =>
    `${formatTanggal(filterState.value.startDate)} s/d ${formatTanggal(filterState.value.endDate)}`,
);

const statusLabel = (s: string | number | null) =>
  s === null || s === "" ? "-" : String(s);
</script>

<template>
  <BaseBrowse
    title="Kartu Hutang per Supplier"
    :menu-id="menuId"
    :icon="IconFileDescription"
    :headers="headers"
    :items="items ?? []"
    item-value="id"
    :is-loading="isLoading"
    v-model:filterState="filterState"
    v-model:selected="selected"
    :can-export="canExport"
    :summary-columns="['Total', 'Voucher', 'Bayar', 'BelumVoucher', 'Sisa']"
    @refresh="fetchData"
    @export="exportToExcel('Kartu_Hutang_Supplier')"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tgl Nota</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="f-date"
          @change="onFilterChange"
        />
        <span class="f-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="f-date"
          @change="onFilterChange"
        />
      </div>
      <div class="f-divider" />
      <label class="f-check">
        <input
          type="checkbox"
          v-model="filterState.hanyaSisa"
          @change="onFilterChange"
        />
        Hanya yang ada sisa
      </label>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="primary"
        variant="tonal"
        class="mr-2"
        :disabled="!isSingleSelected"
        @click="bukaDariTerpilih"
      >
        <template #prepend><IconReceipt2 :size="15" /></template>
        Lihat Nota
      </v-btn>
    </template>

    <template
      v-for="col in ['Total', 'Voucher', 'Bayar', 'BelumVoucher']"
      :key="col"
      v-slot:[`item.${col}`]="{ item }"
    >
      <span class="num-cell">{{
        fmtNum(
          rowOf(item)[col as "Total" | "Voucher" | "Bayar" | "BelumVoucher"],
        )
      }}</span>
    </template>
    <template #item.Sisa="{ item }">
      <span
        class="num-cell font-weight-bold"
        :class="rowOf(item).Sisa > 0 ? 'text-error' : ''"
      >
        {{ fmtNum(rowOf(item).Sisa) }}
      </span>
    </template>
  </BaseBrowse>

  <!-- Dialog 1: Nota per supplier -->
  <v-dialog v-model="showNotaDialog" max-width="1100px" scrollable>
    <v-card class="rounded-lg">
      <div class="dialog-header">
        <div class="d-flex flex-column">
          <span class="dialog-title">Daftar Nota Hutang</span>
          <span class="dialog-subtitle">
            [{{ currentSupplier?.KodeSupplier }}]
            {{ currentSupplier?.Supplier }} &nbsp;|&nbsp; Tgl Nota:
            {{ periodeLabel }}
          </span>
        </div>
        <v-spacer />
        <button class="dialog-close-btn" @click="showNotaDialog = false">
          <IconX :size="20" />
        </button>
      </div>

      <v-card-text class="pa-0">
        <div v-if="isNotaLoading" class="pa-6 text-center text-grey">
          <v-progress-circular
            indeterminate
            color="primary"
            size="30"
            class="mb-2"
          />
          <div>Memuat data nota...</div>
        </div>

        <table v-else class="nested-table">
          <thead>
            <tr>
              <th style="width: 40px" class="tc">No</th>
              <th style="width: 150px">Nomor Nota</th>
              <th style="width: 210px">Jenis Nota</th>
              <th style="width: 90px" class="tc">Tanggal</th>
              <th style="width: 90px" class="tc">Jth Tempo</th>
              <th class="tr">Total</th>
              <th class="tr">Voucher</th>
              <th class="tr">Dibayar</th>
              <th class="tr">Belum Voucher</th>
              <th class="tr">Sisa</th>
              <th style="width: 110px" class="tc">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(n, i) in notaList" :key="n.id">
              <td class="tc">{{ i + 1 }}</td>
              <td class="font-weight-bold text-primary">{{ n.Nomor }}</td>
              <td>{{ tipeNotaLabel(n.Tipe) }}</td>
              <td class="tc">{{ formatTanggal(n.Tanggal) }}</td>
              <td class="tc">
                {{ n.JatuhTempo ? formatTanggal(n.JatuhTempo) : "" }}
              </td>
              <td class="tr">{{ fmtNum(n.Total) }}</td>
              <td class="tr">{{ fmtNum(n.Voucher) }}</td>
              <td class="tr">{{ fmtNum(n.Bayar) }}</td>
              <td class="tr">{{ fmtNum(n.BelumVoucher) }}</td>
              <td
                class="tr font-weight-bold"
                :class="n.Sisa > 0 ? 'text-error' : 'text-success'"
              >
                {{ fmtNum(n.Sisa) }}
              </td>
              <td class="tc">
                <v-btn
                  size="x-small"
                  color="teal-darken-1"
                  variant="flat"
                  @click="openVoucherDialog(n)"
                >
                  <IconHistory :size="13" class="mr-1" /> Voucher
                </v-btn>
              </td>
            </tr>
            <tr v-if="notaList.length === 0">
              <td colspan="11" class="text-center pa-4 text-grey font-italic">
                Tidak ada nota untuk periode ini.
              </td>
            </tr>
          </tbody>
          <tfoot v-if="notaList.length > 0">
            <tr class="tfoot-row">
              <td colspan="5" class="tr">TOTAL :</td>
              <td class="tr">{{ fmtNum(sumOf(notaList, "Total")) }}</td>
              <td class="tr">{{ fmtNum(sumOf(notaList, "Voucher")) }}</td>
              <td class="tr">{{ fmtNum(sumOf(notaList, "Bayar")) }}</td>
              <td class="tr">{{ fmtNum(sumOf(notaList, "BelumVoucher")) }}</td>
              <td class="tr">{{ fmtNum(sumOf(notaList, "Sisa")) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Dialog 2: Voucher per nota -->
  <v-dialog v-model="showVoucherDialog" max-width="760px" scrollable>
    <v-card class="rounded-lg">
      <div class="dialog-header bg-teal-darken-2">
        <div class="d-flex flex-column">
          <span class="dialog-title">Voucher / Pengajuan Pembayaran</span>
          <span class="dialog-subtitle">Nota: {{ currentNota?.Nomor }}</span>
        </div>
        <v-spacer />
        <button class="dialog-close-btn" @click="showVoucherDialog = false">
          <IconX :size="20" />
        </button>
      </div>

      <v-card-text class="pa-0">
        <div v-if="isVoucherLoading" class="pa-6 text-center text-grey">
          <v-progress-circular
            indeterminate
            color="teal"
            size="30"
            class="mb-2"
          />
          <div>Memuat data voucher...</div>
        </div>

        <table v-else class="nested-table">
          <thead>
            <tr>
              <th style="width: 40px" class="tc">No</th>
              <th style="width: 180px">Nomor Voucher</th>
              <th style="width: 100px" class="tc">Tanggal</th>
              <th class="tc" style="width: 100px">Status</th>
              <th class="tr" style="width: 130px">Nilai</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, i) in voucherList" :key="v.id">
              <td class="tc">{{ i + 1 }}</td>
              <td>{{ v.NomorVoucher }}</td>
              <td class="tc">{{ formatTanggal(v.TanggalVoucher) }}</td>
              <td class="tc">{{ statusLabel(v.StatusRealisasi) }}</td>
              <td class="tr font-weight-bold text-teal-darken-3">
                {{ fmtNum(v.Total) }}
              </td>
            </tr>
            <tr v-if="voucherList.length === 0">
              <td colspan="5" class="text-center pa-4 text-grey font-italic">
                Belum ada voucher untuk nota ini.
              </td>
            </tr>
          </tbody>
          <tfoot v-if="voucherList.length > 0">
            <tr class="tfoot-row text-teal-darken-4">
              <td colspan="4" class="tr">TOTAL :</td>
              <td class="tr">{{ fmtNum(sumOf(voucherList, "Total")) }}</td>
            </tr>
          </tfoot>
        </table>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: white;
  color: #212121;
}
.f-date:focus {
  border-color: #1565c0;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}
.f-check {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #555;
  cursor: pointer;
}
.num-cell {
  font-variant-numeric: tabular-nums;
}

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
