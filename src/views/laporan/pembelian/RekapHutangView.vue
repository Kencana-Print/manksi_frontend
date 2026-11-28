<script setup lang="ts">
import { ref, computed } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  rekapHutangService,
  type RekapHutangRow,
  type RekapHutangDetailRow,
  type RekapHutangDetailSemuaRow,
} from "@/services/laporan/pembelian/rekapHutangService";
import { tipeNotaLabel } from "@/services/laporan/pembelian/kartuHutangService";
import { formatTanggal } from "@/utils/dateFormat";
import { IconFileAnalytics, IconFileExport } from "@tabler/icons-vue";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
const menuId = "975";
const toast = useToast();

const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const filterState = ref({ endDate: getLocalDate() });

interface HeaderDef {
  title: string;
  key: string;
  width?: string;
  minWidth?: string;
  align?: "end";
}

const allMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

// Kolom bulan tampil sampai bulan dari endDate
const visibleMonths = computed(() => {
  const bulan = Number(filterState.value.endDate.substring(5, 7)) || 12;
  return allMonths.slice(0, bulan);
});

const numericKeys = computed(() => [
  "TahunLalu",
  ...visibleMonths.value,
  "GrandTotal",
]);

const dynamicHeaders = computed<HeaderDef[]>(() => [
  { title: "Kode", key: "Kode", width: "100px" },
  { title: "Supplier", key: "Supplier", minWidth: "260px" },
  { title: "Tahun Lalu", key: "TahunLalu", width: "120px", align: "end" },
  ...visibleMonths.value.map(
    (m): HeaderDef => ({ title: m, key: m, width: "120px", align: "end" }),
  ),
  { title: "Grand Total", key: "GrandTotal", width: "140px", align: "end" },
]);

const { items, isLoading, canExport, fetchData, exportToExcel } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await rekapHutangService.getBrowse({
      endDate: filterState.value.endDate,
    });
    return res.data.data || [];
  },
  immediate: true,
});

const onTanggalChange = () => {
  if (!filterState.value.endDate) {
    toast.warning("Tanggal wajib diisi.");
    return;
  }
  fetchData();
};

const fmtNum = (v: number | string | null | undefined) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
    Number(v) || 0,
  );

// Slot/row dari BaseBrowse bisa berbentuk { raw } atau item langsung
const rowOf = (item: unknown): RekapHutangRow => {
  const wrapped = item as { raw?: RekapHutangRow };
  return (wrapped.raw ?? item) as RekapHutangRow;
};

const getTotal = (key: string, rows: RekapHutangRow[]) =>
  rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

const summaryFormatters = computed(() => {
  const result: Record<string, (rows: RekapHutangRow[]) => string> = {};
  for (const key of numericKeys.value) {
    result[key] = (rows) => fmtNum(getTotal(key, rows));
  }
  return result;
});

// ── Export: ikut search + filter kolom di BaseBrowse ──
const browseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const buildExportData = (): RekapHutangRow[] => {
  const all = items.value ?? [];
  const rows: RekapHutangRow[] = browseRef.value?.getFilteredItems?.() ?? all;
  if (rows.length !== all.length) {
    toast.info(
      `Export ${rows.length} dari ${all.length} supplier sesuai filter.`,
    );
  }

  const totalRow: RekapHutangRow = {
    id: "GRAND_TOTAL",
    Kode: "",
    Supplier: "GRAND TOTAL",
    TahunLalu: getTotal("TahunLalu", rows),
    GrandTotal: getTotal("GrandTotal", rows),
  };
  for (const bulan of visibleMonths.value) {
    totalRow[bulan] = getTotal(bulan, rows);
  }

  return [...rows, totalRow];
};

// ── Export Detail: nota outstanding per supplier ──
const isExportingDetail = ref(false);

const doExportDetail = async () => {
  const all = items.value ?? [];
  const suppliers: RekapHutangRow[] =
    browseRef.value?.getFilteredItems?.() ?? all;
  if (!suppliers.length) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }
  if (suppliers.length !== all.length) {
    toast.info(
      `Export ${suppliers.length} dari ${all.length} supplier sesuai filter.`,
    );
  }

  // Snapshot supaya tidak berubah kalau user mengganti tanggal saat proses berjalan
  const { endDate } = filterState.value;

  isExportingDetail.value = true;
  try {
    const res = await rekapHutangService.getDetailSemua({ endDate });

    const perSupplier = new Map<string, RekapHutangDetailSemuaRow[]>();
    for (const r of res.data.data || []) {
      const daftar = perSupplier.get(r.KodeSupplier) ?? [];
      daftar.push(r);
      perSupplier.set(r.KodeSupplier, daftar);
    }

    const rows: Record<string, string | number>[] = [];
    let gTotal = 0;
    let gBayar = 0;
    let gSisa = 0;
    const mismatch: string[] = [];

    for (const s of suppliers) {
      const daftar = perSupplier.get(s.Kode) ?? [];
      let sTotal = 0;
      let sBayar = 0;
      let sSisa = 0;

      for (const r of daftar) {
        const total = Number(r.Total) || 0;
        const bayar = Number(r.Bayar) || 0;
        const sisa = Number(r.Sisa) || 0;
        rows.push({
          Kode: s.Kode,
          Supplier: s.Supplier,
          Nomor: r.Nomor,
          Jenis: tipeNotaLabel(r.Tipe),
          Tanggal: formatTanggal(r.Tanggal),
          JatuhTempo: r.JatuhTempo ? formatTanggal(r.JatuhTempo) : "",
          Total: total,
          Bayar: bayar,
          Sisa: sisa,
        });
        sTotal += total;
        sBayar += bayar;
        sSisa += sisa;
      }

      if (daftar.length) {
        rows.push({
          Kode: s.Kode,
          Supplier: s.Supplier,
          Nomor: "SUBTOTAL",
          Jenis: "",
          Tanggal: "",
          JatuhTempo: "",
          Total: sTotal,
          Bayar: sBayar,
          Sisa: sSisa,
        });
      }
      gTotal += sTotal;
      gBayar += sBayar;
      gSisa += sSisa;

      // Detail harus sama dengan Grand Total di rekap (toleransi Rp 1)
      if (Math.abs(sSisa - (Number(s.GrandTotal) || 0)) > 1)
        mismatch.push(s.Kode);
    }

    rows.push({
      Kode: "",
      Supplier: "GRAND TOTAL",
      Nomor: "",
      Jenis: "",
      Tanggal: "",
      JatuhTempo: "",
      Total: gTotal,
      Bayar: gBayar,
      Sisa: gSisa,
    });

    const columns: ExcelColumn[] = [
      { header: "Kode", key: "Kode" },
      { header: "Supplier", key: "Supplier", width: 30 },
      { header: "Nomor Nota", key: "Nomor", width: 22 },
      { header: "Jenis Nota", key: "Jenis", width: 20 },
      { header: "Tanggal", key: "Tanggal" },
      { header: "Jatuh Tempo", key: "JatuhTempo" },
      { header: "Total", key: "Total", align: "right", numFmt: "#,##0.00" },
      { header: "Dibayar", key: "Bayar", align: "right", numFmt: "#,##0.00" },
      { header: "Sisa", key: "Sisa", align: "right", numFmt: "#,##0.00" },
    ];

    await exportExcelSingle(
      `Detail_Rekap_Hutang_${endDate}.xlsx`,
      "Detail Hutang",
      columns,
      rows,
      `Detail Rekap Hutang  |  S.D Tgl Nota: ${formatTanggal(endDate)}`,
    );

    if (mismatch.length) {
      toast.warning(
        `${mismatch.length} supplier selisih antara rekap dan detail (mis. ${mismatch.slice(0, 3).join(", ")}). Refresh lalu export ulang.`,
      );
    }
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.error(err.response?.data?.message || "Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

// ── Dialog detail ──
const showDetailDialog = ref(false);
const detailLoading = ref(false);
const detailItems = ref<RekapHutangDetailRow[]>([]);
const detailSupplierNama = ref("");

const detailHeaders = [
  { title: "Nomor Nota", key: "Nomor" },
  { title: "Jenis Nota", key: "Tipe" },
  { title: "Tanggal", key: "Tanggal" },
  { title: "Jatuh Tempo", key: "JatuhTempo" },
  { title: "Total", key: "Total", align: "end" },
  { title: "Dibayar", key: "Bayar", align: "end" },
  { title: "Sisa", key: "Sisa", align: "end" },
] as const;

const openDetailDialog = async (item: unknown) => {
  const sup = rowOf(item);
  detailSupplierNama.value = `[${sup.Kode}] ${sup.Supplier}`;
  detailItems.value = [];
  showDetailDialog.value = true;
  detailLoading.value = true;
  try {
    const res = await rekapHutangService.getDetail({
      supKode: sup.Kode,
      endDate: filterState.value.endDate,
    });
    detailItems.value = res.data.data || [];
  } catch {
    toast.error("Gagal memuat detail hutang");
    showDetailDialog.value = false;
  } finally {
    detailLoading.value = false;
  }
};

const detailTotalSisa = computed(() =>
  detailItems.value.reduce((s, r) => s + (Number(r.Sisa) || 0), 0),
);
</script>

<template>
  <BaseBrowse
    ref="browseRef"
    title="Laporan Rekap Hutang"
    :menu-id="menuId"
    :icon="IconFileAnalytics"
    :headers="dynamicHeaders"
    :items="items ?? []"
    item-value="id"
    :is-loading="isLoading"
    v-model:filterState="filterState"
    :can-export="canExport"
    :summary-columns="numericKeys"
    :summary-formatters="summaryFormatters"
    @refresh="fetchData"
    @export="
      exportToExcel('Laporan_Rekap_Hutang', { getData: buildExportData })
    "
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Hutang S.D Tanggal Nota</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="f-date"
          @change="onTanggalChange"
        />
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        v-if="canExport"
        size="small"
        color="green-darken-2"
        :disabled="isLoading || isExportingDetail || !(items ?? []).length"
        :loading="isExportingDetail"
        @click="doExportDetail"
      >
        <template #prepend><IconFileExport :size="14" /></template>
        Export Detail
      </v-btn>
    </template>

    <template #item.Supplier="{ item }">
      <span class="supplier-link" @click="openDetailDialog(item)">
        {{ rowOf(item).Supplier }}
      </span>
    </template>

    <template v-for="k in numericKeys" :key="k" #[`item.${k}`]="{ item }">
      <span
        class="num-cell"
        :class="k === 'GrandTotal' ? 'font-weight-bold text-primary' : ''"
      >
        {{ fmtNum(rowOf(item)[k] as number) }}
      </span>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showDetailDialog" max-width="900">
    <v-card rounded="lg" class="detail-card">
      <v-card-title
        class="detail-header d-flex align-center justify-space-between"
      >
        <div>
          <div class="detail-title">Detail Hutang Outstanding</div>
          <div class="detail-subtitle">{{ detailSupplierNama }}</div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          color="white"
          density="comfortable"
          @click="showDetailDialog = false"
        />
      </v-card-title>

      <v-card-text class="pa-0">
        <v-data-table-virtual
          :headers="detailHeaders"
          :items="detailItems"
          :loading="detailLoading"
          height="420"
          fixed-header
          density="compact"
          no-data-text="Tidak ada hutang outstanding"
          class="detail-table"
        >
          <template #item.Tipe="{ item }">{{
            tipeNotaLabel(item.Tipe)
          }}</template>
          <template #item.Tanggal="{ item }">{{
            formatTanggal(item.Tanggal)
          }}</template>
          <template #item.JatuhTempo="{ item }">
            {{ item.JatuhTempo ? formatTanggal(item.JatuhTempo) : "" }}
          </template>
          <template #item.Total="{ item }">{{ fmtNum(item.Total) }}</template>
          <template #item.Bayar="{ item }">{{ fmtNum(item.Bayar) }}</template>
          <template #item.Sisa="{ item }">
            <span
              class="sisa-val"
              :class="item.Sisa < 0 ? 'text-success' : 'text-error'"
            >
              {{ fmtNum(item.Sisa) }}
            </span>
          </template>
        </v-data-table-virtual>
      </v-card-text>

      <v-divider />

      <v-card-actions
        class="detail-footer d-flex justify-space-between align-center px-4 py-3"
      >
        <span class="text-caption text-medium-emphasis">
          {{ detailItems.length }} nota outstanding
        </span>
        <div class="d-flex align-center gap-2">
          <span class="text-body-2 font-weight-medium">Total Sisa Hutang</span>
          <span class="total-sisa">{{ fmtNum(detailTotalSisa) }}</span>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.gap-2 {
  gap: 8px;
}
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
.num-cell {
  font-variant-numeric: tabular-nums;
}
.supplier-link {
  color: #1565c0;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.15s;
}
.supplier-link:hover {
  text-decoration-color: #1565c0;
}
.detail-card {
  overflow: hidden;
}
.detail-header {
  background: linear-gradient(135deg, #1565c0, #1976d2);
  padding: 16px 20px;
}
.detail-title {
  font-size: 15px;
  font-weight: 700;
  color: white;
  line-height: 1.2;
}
.detail-subtitle {
  font-size: 12px;
  color: #e3f2fd;
}
.detail-table {
  font-size: 11px;
}
.detail-table :deep(thead th) {
  background: #f5f7fa !important;
  font-weight: 700 !important;
  font-size: 11px !important;
  text-transform: uppercase;
  color: #555 !important;
}
.detail-table :deep(tbody tr:hover) {
  background: #f0f7ff !important;
}
.sisa-val {
  font-weight: 700;
}
.detail-footer {
  background: #fafafa;
}
.total-sisa {
  font-size: 14px;
  font-weight: 800;
  color: #1565c0;
}
</style>
