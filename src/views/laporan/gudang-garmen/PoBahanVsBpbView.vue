<script setup lang="ts">
import { ref, watch } from "vue";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { poBahanVsBpbService } from "@/services/laporan/gudang-garmen/poBahanVsBpbService";
import { IconReportAnalytics } from "@tabler/icons-vue";
import * as XLSX from "xlsx";

// ── Tanggal lokal (hindari UTC shift) ──
const toLocalDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const filters = ref({
  startDate: toLocalDate(firstDayOfMonth),
  endDate: toLocalDate(today),
});

// ── Tipe data ──
interface MasterRow {
  Nomor: string;
  Tanggal: string;
  Keterangan: string;
  KodeSupplier: string;
  Supplier: string;
  QtyPO: number;
  QtyCommit: number;
  QtyBPB: number;
  QtyRetur: number;
  Status: string;
}

interface DetailRow {
  Nomor: string;
  Kode: string;
  Nama: string;
  Satuan: string;
  Supplier: string;
  SPK: string;
  NamaSPK: string;
  Awal: boolean;
  QtyPO: number;
  Sisa: number;
  TglCommit: string | null;
  QtyCommit: number;
  NoBPB: string;
  TglBPB: string | null;
  QtyBPB: number;
  NoRetur: string;
  TglRetur: string | null;
  QtyRetur: number;
}

type ExpandedItem = string | { Nomor?: string };

// ── Expand state (harus di atas useBrowse karena dipakai fetchApi) ──
const expandedRows = ref<ExpandedItem[]>([]);
const detailData = ref<Record<string, DetailRow[]>>({});
const detailLoading = ref<Record<string, boolean>>({});
const detailFilter = ref<Record<string, string>>({});

// ── Composable ──
const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId: "512",
  fetchApi: async () => {
    // Data dimuat ulang: buang cache rincian & tutup semua expand
    detailData.value = {};
    detailFilter.value = {};
    expandedRows.value = [];
    const res = await poBahanVsBpbService.getBrowse({
      startDate: filters.value.startDate,
      endDate: filters.value.endDate,
    });
    return res.data.data;
  },
  immediate: true,
});

watch([() => filters.value.startDate, () => filters.value.endDate], fetchData);

// ── Headers Master ── (biarkan blok masterHeaders yang sekarang di sini)

const loadDetail = async (nomor: string) => {
  if (!nomor || detailData.value[nomor] || detailLoading.value[nomor]) return;
  detailLoading.value = { ...detailLoading.value, [nomor]: true };
  try {
    const res = await poBahanVsBpbService.getDetail(nomor);
    detailData.value = {
      ...detailData.value,
      [nomor]: res.data.data as DetailRow[],
    };
  } catch {
    detailData.value = { ...detailData.value, [nomor]: [] };
  } finally {
    detailLoading.value = { ...detailLoading.value, [nomor]: false };
  }
};

const onUpdateExpanded = async (val: ExpandedItem[]) => {
  expandedRows.value = val;
  const nomorList = val.map((v) =>
    typeof v === "object" && v !== null ? String(v.Nomor ?? "") : String(v),
  );
  await Promise.all(nomorList.map(loadDetail));
};

// ── Headers Master ──
const masterHeaders = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
  { title: "Kode Sup", key: "KodeSupplier", width: "100px" },
  { title: "Supplier", key: "Supplier", minWidth: "200px" },
  { title: "Qty PO", key: "QtyPO", width: "100px", align: "right" },
  { title: "Qty Commit", key: "QtyCommit", width: "100px", align: "right" },
  { title: "Qty BPB", key: "QtyBPB", width: "100px", align: "right" },
  { title: "Qty Retur", key: "QtyRetur", width: "100px", align: "right" },
  { title: "Status", key: "Status", width: "100px", align: "center" },
];

// ── Helpers ──
const getNomor = (item: any): string =>
  String((item?.raw ?? item)?.Nomor ?? "");
const num = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);

const formatTgl = (v: string | null) => {
  if (!v) return "";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

// ── Filter & total rincian per PO ──
const filteredDetail = (nomor: string): DetailRow[] => {
  const rows = detailData.value[nomor] ?? [];
  const q = (detailFilter.value[nomor] ?? "").trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) =>
    [r.Kode, r.Nama, r.Supplier, r.SPK, r.NamaSPK].some((v) =>
      String(v ?? "")
        .toLowerCase()
        .includes(q),
    ),
  );
};

const totalOf = (nomor: string) => {
  const t = { QtyPO: 0, Sisa: 0, QtyCommit: 0, QtyBPB: 0, QtyRetur: 0 };
  for (const r of filteredDetail(nomor)) {
    t.QtyPO += Number(r.QtyPO) || 0;
    t.Sisa += Number(r.Sisa) || 0;
    t.QtyCommit += Number(r.QtyCommit) || 0;
    t.QtyBPB += Number(r.QtyBPB) || 0;
    t.QtyRetur += Number(r.QtyRetur) || 0;
  }
  return t;
};

// Kolom Supplier & SPK hanya muncul bila PO punya data itu (PO Lain-lain)
const adaSupplier = (nomor: string): boolean =>
  (detailData.value[nomor] ?? []).some((r) => !!r.Supplier);

// ── Pewarnaan Baris (Status) ──
const getRowTextColor = (data: any) => {
  const item = data.item?.raw || data.item;
  const status = item?.Status ?? "";

  const classes: string[] = ["font-weight-medium"];

  if (status === "OPEN") {
    classes.push("text-error"); // Merah
  } else if (status === "ONPROSES") {
    classes.push("text-info"); // Biru (bisa juga pakai text-primary)
  }

  return { class: classes.join(" ") };
};

// ── Export ──
const isExporting = ref(false);

const onExport = async () => {
  if (!canExport.value || isExporting.value) return;
  const masters = (items.value ?? []) as MasterRow[];
  isExporting.value = true;
  try {
    // Muat rincian semua PO yang belum ada di cache (5 request paralel)
    const belum = masters
      .map((m) => m.Nomor)
      .filter((n) => !detailData.value[n]);
    for (let i = 0; i < belum.length; i += 5) {
      await Promise.all(belum.slice(i, i + 5).map(loadDetail));
    }

    const blankMaster = {
      "Nomor PO": "",
      "Tanggal PO": "",
      Keterangan: "",
      "Kode Supplier": "",
      Supplier: "",
      "Qty PO (Master)": "",
      "Qty Commit (Master)": "",
      "Qty BPB (Master)": "",
      "Qty Retur (Master)": "",
      Status: "",
    };
    const blankDetail = {
      "Kode Bahan": "",
      "Nama Bahan": "",
      Satuan: "",
      "Supplier Item": "",
      SPK: "",
      "Nama SPK": "",
      "Jml PO": "",
      Sisa: "",
      "Tgl Commit": "",
      "Jml Commit": "",
      "No BPB": "",
      "Tgl BPB": "",
      "Jml BPB": "",
      "No Retur": "",
      "Tgl Retur": "",
      "Jml Retur": "",
    };

    const rows: Record<string, string | number>[] = [];
    masters.forEach((master) => {
      rows.push({
        "Nomor PO": master.Nomor,
        "Tanggal PO": formatTgl(master.Tanggal),
        Keterangan: master.Keterangan,
        "Kode Supplier": master.KodeSupplier,
        Supplier: master.Supplier,
        "Qty PO (Master)": master.QtyPO,
        "Qty Commit (Master)": master.QtyCommit,
        "Qty BPB (Master)": master.QtyBPB,
        "Qty Retur (Master)": master.QtyRetur,
        Status: master.Status,
        ...blankDetail,
      });

      (detailData.value[master.Nomor] ?? []).forEach((det) => {
        rows.push({
          ...blankMaster,
          "Kode Bahan": det.Kode,
          "Nama Bahan": det.Nama,
          Satuan: det.Satuan,
          "Supplier Item": det.Supplier,
          SPK: det.SPK,
          "Nama SPK": det.NamaSPK,
          "Jml PO": det.Awal ? det.QtyPO : "",
          Sisa: det.Awal ? det.Sisa : "",
          "Tgl Commit": formatTgl(det.TglCommit),
          "Jml Commit": det.QtyCommit || "",
          "No BPB": det.NoBPB,
          "Tgl BPB": formatTgl(det.TglBPB),
          "Jml BPB": det.QtyBPB || "",
          "No Retur": det.NoRetur,
          "Tgl Retur": formatTgl(det.TglRetur),
          "Jml Retur": det.QtyRetur || "",
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PO vs BPB");
    XLSX.writeFile(wb, "Laporan_PO_vs_BPB.xlsx");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="PO Bahan vs BPB"
    menu-id="512"
    :icon="IconReportAnalytics"
    :headers="masterHeaders"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport"
    :row-props-fn="getRowTextColor"
    show-expand
    item-value="Nomor"
    v-model:expanded="expandedRows"
    v-model:filter-state="filters"
    @refresh="fetchData"
    @export="onExport"
    @update:expanded="onUpdateExpanded"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal</span>
        <input type="date" v-model="filters.startDate" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filters.endDate" class="f-date" />
      </div>

      <div class="f-divider" />
      <div class="f-group ml-2">
        <div class="legend-box bg-error"></div>
        <span class="f-label">= OPEN</span>
        <div class="legend-box bg-info ml-3"></div>
        <span class="f-label">= ONPROSES</span>
      </div>
    </template>

    <template #item.Tanggal="{ item }">{{ formatTgl(item.Tanggal) }}</template>
    <template #item.QtyPO="{ item }">{{ num(item.QtyPO) }}</template>
    <template #item.QtyCommit="{ item }">{{ num(item.QtyCommit) }}</template>
    <template #item.QtyBPB="{ item }">{{ num(item.QtyBPB) }}</template>
    <template #item.QtyRetur="{ item }">{{ num(item.QtyRetur) }}</template>

    <template #item.Status="{ item }">
      <span
        class="font-weight-bold"
        :class="{
          'text-error': item.Status === 'OPEN',
          'text-info': item.Status === 'ONPROSES',
        }"
      >
        {{ item.Status }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="detailLoading[getNomor(item)]"
          indeterminate
          color="primary"
          height="2"
        />

        <div
          v-else-if="!detailData[getNomor(item)]?.length"
          class="text-caption text-grey font-italic px-2 py-2"
        >
          Tidak ada rincian data untuk PO ini.
        </div>

        <template v-else>
          <div class="tbl-header">
            Rincian Barang & BPB — {{ getNomor(item) }}
          </div>
          <div class="filter-bar">
            <input
              v-model="detailFilter[getNomor(item)]"
              type="text"
              class="f-date"
              style="width: 320px"
              placeholder="Filter kode / nama bahan / supplier / SPK..."
            />
          </div>
          <div class="tbl-wrap">
            <table class="gt">
              <thead>
                <tr>
                  <th style="width: 100px">Kode</th>
                  <th style="min-width: 180px">Nama Bahan</th>
                  <th style="width: 70px; text-align: center">Satuan</th>
                  <template v-if="adaSupplier(getNomor(item))">
                    <th style="width: 160px">Supplier</th>
                    <th style="width: 170px">SPK</th>
                  </template>
                  <th style="width: 90px; text-align: right">Qty PO</th>
                  <th style="width: 90px; text-align: right">Sisa</th>
                  <th style="width: 90px; text-align: center">Tgl Commit</th>
                  <th style="width: 90px; text-align: right">Qty Commit</th>
                  <th style="width: 120px">No. BPB</th>
                  <th style="width: 90px; text-align: center">Tgl BPB</th>
                  <th style="width: 90px; text-align: right">Qty BPB</th>
                  <th style="width: 120px">No. Retur</th>
                  <th style="width: 90px; text-align: center">Tgl Retur</th>
                  <th style="width: 90px; text-align: right">Qty Retur</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(det, idx) in filteredDetail(getNomor(item))"
                  :key="idx"
                  class="tr-bahan"
                  :class="{ 'row-awal': det.Awal }"
                >
                  <td class="fw text-primary">
                    {{ det.Awal ? det.Kode : "" }}
                  </td>
                  <td class="fw">{{ det.Awal ? det.Nama : "" }}</td>
                  <td class="tc">{{ det.Awal ? det.Satuan : "" }}</td>
                  <template v-if="adaSupplier(getNomor(item))">
                    <td>{{ det.Awal ? det.Supplier : "" }}</td>
                    <td>
                      <template v-if="det.Awal">
                        {{ det.SPK }}
                        <span v-if="det.NamaSPK" class="text-grey">
                          — {{ det.NamaSPK }}</span
                        >
                      </template>
                    </td>
                  </template>
                  <td class="tr fw text-success">
                    {{ det.Awal ? num(det.QtyPO) : "" }}
                  </td>
                  <td
                    class="tr fw"
                    :class="{ 'text-error': det.Awal && det.Sisa < 0 }"
                  >
                    {{ det.Awal ? num(det.Sisa) : "" }}
                  </td>
                  <td class="tc">{{ formatTgl(det.TglCommit) }}</td>
                  <td class="tr">
                    {{ det.QtyCommit ? num(det.QtyCommit) : "" }}
                  </td>
                  <td class="fw-mono">{{ det.NoBPB }}</td>
                  <td class="tc">{{ formatTgl(det.TglBPB) }}</td>
                  <td class="tr fw text-info">
                    {{ det.QtyBPB ? num(det.QtyBPB) : "" }}
                  </td>
                  <td class="fw-mono text-error">{{ det.NoRetur }}</td>
                  <td class="tc text-error">{{ formatTgl(det.TglRetur) }}</td>
                  <td class="tr fw text-error">
                    {{ det.QtyRetur ? num(det.QtyRetur) : "" }}
                  </td>
                </tr>
                <tr v-if="!filteredDetail(getNomor(item)).length">
                  <td
                    :colspan="adaSupplier(getNomor(item)) ? 15 : 13"
                    class="tc text-grey"
                    style="height: 32px"
                  >
                    Tidak ada data yang cocok dengan filter.
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="tr-total">
                  <td :colspan="adaSupplier(getNomor(item)) ? 5 : 3">TOTAL</td>
                  <td class="tr">{{ num(totalOf(getNomor(item)).QtyPO) }}</td>
                  <td class="tr">{{ num(totalOf(getNomor(item)).Sisa) }}</td>
                  <td></td>
                  <td class="tr">
                    {{ num(totalOf(getNomor(item)).QtyCommit) }}
                  </td>
                  <td></td>
                  <td></td>
                  <td class="tr">{{ num(totalOf(getNomor(item)).QtyBPB) }}</td>
                  <td></td>
                  <td></td>
                  <td class="tr">
                    {{ num(totalOf(getNomor(item)).QtyRetur) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </template>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
/* ── Filter bar ── */
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
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.f-date:focus {
  border-color: #1565c0;
}

/* Legend Box */
.legend-box {
  width: 14px;
  height: 14px;
  border-radius: 2px;
}
.bg-error {
  background-color: #d32f2f;
}
.bg-info {
  background-color: #0288d1;
}
.text-error {
  color: #d32f2f !important;
}
.text-info {
  color: #0288d1 !important;
}
.text-success {
  color: #2e7d32 !important;
}

/* ── Expand wrapper ── */
.expand-wrap {
  background: #eceff1;
  padding-bottom: 8px;
}

/* ── Tabel header bar ── */
.tbl-header {
  background: #37474f;
  color: white;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
}
.tbl-wrap {
  overflow-x: auto;
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
}

/* ── Tabel utama ── */
.gt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.gt thead th {
  background: #f0f4f8;
  border: 1px solid #bdbdbd;
  padding: 5px 6px;
  font-size: 10px;
  font-weight: 700;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}
.gt tbody td {
  border: 1px solid #e8e8e8;
  height: 26px;
  padding: 0 6px;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tr-bahan td {
  background: #fafafa;
}
.tr-bahan:hover td {
  background: #e3f2fd;
}
.row-awal td {
  border-top: 2px solid #90a4ae;
}
.filter-bar {
  padding: 6px 8px;
  background: #f5f7f9;
  border: 1px solid #bdbdbd;
  border-top: none;
}
.tr-total td {
  background: #e8eef3;
  font-weight: 700;
  border-top: 2px solid #607d8b;
  position: sticky;
  bottom: 0;
}

/* ── Utility ── */
.fw {
  font-weight: 700;
}
.fw-mono {
  font-family: monospace;
  font-size: 11px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.text-primary {
  color: #1565c0;
}
.text-grey {
  color: #9e9e9e;
}
</style>
