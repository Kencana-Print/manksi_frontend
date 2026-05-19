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

// ── Composable ──
const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId: "512",
  fetchApi: async () => {
    const res = await poBahanVsBpbService.getBrowse({
      startDate: filters.value.startDate,
      endDate: filters.value.endDate,
    });
    return res.data.data;
  },
  immediate: true,
});

watch([() => filters.value.startDate, () => filters.value.endDate], fetchData);

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

// ── Expand state ──
const expandedRows = ref<any[]>([]);
const detailData = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (val: any[]) => {
  expandedRows.value = val;
  const nomorList: string[] = val.map((v) =>
    typeof v === "object" && v !== null ? String(v.Nomor ?? v) : String(v),
  );

  for (const nomor of nomorList.filter((n) => n && !detailData.value[n])) {
    detailLoading.value = { ...detailLoading.value, [nomor]: true };
    try {
      const res = await poBahanVsBpbService.getDetail(nomor);
      detailData.value = { ...detailData.value, [nomor]: res.data.data };
    } catch {
      detailData.value = { ...detailData.value, [nomor]: [] };
    } finally {
      detailLoading.value = { ...detailLoading.value, [nomor]: false };
    }
  }
};

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
const onExport = () => {
  if (!canExport.value) return;
  const rows: any[] = [];

  (items.value ?? []).forEach((master: any) => {
    // Baris Master
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

      // Kolom Detail dikosongkan
      "Kode Bahan": "",
      "Nama Bahan": "",
      Satuan: "",
      "Jml PO": "",
      "Tgl Commit": "",
      "Jml Commit": "",
      "No BPB": "",
      "Tgl BPB": "",
      "Jml BPB": "",
      "No Retur": "",
      "Tgl Retur": "",
      "Jml Retur": "",
    });

    // Baris Detail
    (detailData.value[master.Nomor] || []).forEach((det: any) => {
      rows.push({
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

        "Kode Bahan": det.Kode,
        "Nama Bahan": det.Nama,
        Satuan: det.Satuan,
        "Jml PO": det.QtyPO || "",
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
          <div class="tbl-wrap">
            <table class="gt">
              <thead>
                <tr>
                  <th style="width: 100px">Kode</th>
                  <th style="min-width: 180px">Nama Bahan</th>
                  <th style="width: 70px; text-align: center">Satuan</th>
                  <th style="width: 90px; text-align: right">Qty PO</th>
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
                  v-for="(det, idx) in detailData[getNomor(item)]"
                  :key="idx"
                  class="tr-bahan"
                >
                  <td class="fw text-primary">{{ det.Kode }}</td>
                  <td class="fw">{{ det.Nama }}</td>
                  <td class="tc">{{ det.Satuan }}</td>
                  <td class="tr fw text-success">
                    {{ det.QtyPO ? num(det.QtyPO) : "" }}
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
              </tbody>
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
