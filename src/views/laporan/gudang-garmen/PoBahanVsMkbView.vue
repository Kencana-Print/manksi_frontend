<script setup lang="ts">
import { ref, watch } from "vue";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { poBahanVsMkbService } from "@/services/laporan/gudang-garmen/poBahanVsMkbService";
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
const todayString = toLocalDate(today);

const filters = ref({
  startDate: todayString,
  endDate: todayString,
  supplier: "",
});

// ── Composable ──
const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId: "511",
  fetchApi: async () => {
    const res = await poBahanVsMkbService.getBrowse({
      startDate: filters.value.startDate,
      endDate: filters.value.endDate,
      supplier: filters.value.supplier || undefined,
    });
    return res.data.data;
  },
  immediate: true,
});

watch(
  [
    () => filters.value.startDate,
    () => filters.value.endDate,
    () => filters.value.supplier,
  ],
  fetchData,
);

// ── Headers ──
const masterHeaders = [
  { title: "Nomor PO", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" },
  { title: "Kode Sup", key: "KodeSupplier", width: "100px" },
  { title: "Nama Supplier", key: "NamaSupplier", minWidth: "200px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
];

// ── Expand state ──
// expandedRows harus berisi OBJECT ROW (bukan string) agar Vuetify bisa match
const expandedRows = ref<any[]>([]);
const detailData = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (val: any[]) => {
  // val dari BaseBrowse/@update:expanded = array of row objects
  expandedRows.value = val;

  // Ekstrak Nomor untuk fetch detail
  const nomorList: string[] = val.map((v) =>
    typeof v === "object" && v !== null ? String(v.Nomor ?? v) : String(v),
  );

  for (const nomor of nomorList.filter((n) => n && !detailData.value[n])) {
    detailLoading.value = { ...detailLoading.value, [nomor]: true };
    try {
      const res = await poBahanVsMkbService.getDetail(nomor);
      detailData.value = { ...detailData.value, [nomor]: res.data.data };
    } catch {
      detailData.value = { ...detailData.value, [nomor]: [] };
    } finally {
      detailLoading.value = { ...detailLoading.value, [nomor]: false };
    }
  }
};

// ── Helpers ──
// item dari BaseBrowse #detail slot bisa berupa raw object atau wrapper {raw}
const getNomor = (item: any): string =>
  String((item?.raw ?? item)?.Nomor ?? "");

const num = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);

const formatTgl = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

// ── Export ──
const onExport = () => {
  if (!canExport.value) return;
  const rows: any[] = [];

  (items.value ?? []).forEach((master: any) => {
    rows.push({
      "Nomor PO": master.Nomor,
      "Tanggal PO": formatTgl(master.Tanggal),
      "Kode Supplier": master.KodeSupplier,
      Supplier: master.NamaSupplier,
      Keterangan: master.Keterangan,
      "Kode Bahan": "",
      "Nama Bahan": "",
      Satuan: "",
      "Jml PO": "",
      "Akan PO": "",
      Sisa: "",
      "Nomor MKB": "",
      "Tgl MKB": "",
      "Qty MKB": "",
    });

    (detailData.value[master.Nomor] || []).forEach((det: any) => {
      rows.push({
        "Nomor PO": "",
        "Tanggal PO": "",
        "Kode Supplier": "",
        Supplier: "",
        Keterangan: "",
        "Kode Bahan": det.KodeBahan,
        "Nama Bahan": det.NamaBahan,
        Satuan: det.Satuan,
        "Jml PO": det.JmlPO,
        "Akan PO": det.AkanPO,
        Sisa: det.Sisa,
        "Nomor MKB": "",
        "Tgl MKB": "",
        "Qty MKB": "",
      });

      (det.RiwayatMkb || []).forEach((mkb: any) => {
        rows.push({
          "Nomor PO": "",
          "Tanggal PO": "",
          "Kode Supplier": "",
          Supplier: "",
          Keterangan: "",
          "Kode Bahan": "",
          "Nama Bahan": "",
          Satuan: "",
          "Jml PO": "",
          "Akan PO": "",
          Sisa: "",
          "Nomor MKB": mkb.NomorMKB,
          "Tgl MKB": mkb.TanggalMKB,
          "Qty MKB": mkb.AkanPO,
        });
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PO vs MKB");
  XLSX.writeFile(wb, "Laporan_PO_vs_MKB.xlsx");
};
</script>

<template>
  <BaseBrowse
    title="PO Bahan vs MKB"
    menu-id="511"
    :icon="IconReportAnalytics"
    :headers="masterHeaders"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport"
    show-expand
    item-value="Nomor"
    v-model:expanded="expandedRows"
    v-model:filter-state="filters"
    @refresh="fetchData"
    @export="onExport"
    @update:expanded="onUpdateExpanded"
  >
    <!-- ── Filter ── -->
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal</span>
        <input type="date" v-model="filters.startDate" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filters.endDate" class="f-date" />
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <span class="f-label">Kode Sup</span>
        <input
          v-model.lazy="filters.supplier"
          type="text"
          class="f-date"
          style="width: 100px"
          placeholder="Cari kode..."
        />
      </div>
    </template>

    <!-- ── Format kolom Tanggal ── -->
    <template #item.Tanggal="{ item }">{{ formatTgl(item.Tanggal) }}</template>

    <!-- ── Expand detail ── -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <!-- Loading -->
        <v-progress-linear
          v-if="detailLoading[getNomor(item)]"
          indeterminate
          color="primary"
          height="2"
        />

        <!-- Kosong -->
        <div
          v-else-if="!detailData[getNomor(item)]?.length"
          class="text-caption text-grey font-italic px-2 py-2"
        >
          Tidak ada detail bahan untuk PO ini.
        </div>

        <!-- Isi -->
        <template v-else>
          <div class="tbl-header">Detail Bahan — {{ getNomor(item) }}</div>
          <div class="tbl-wrap">
            <table class="gt">
              <thead>
                <tr>
                  <th style="width: 110px">Kode Bahan</th>
                  <th style="min-width: 200px">Nama Bahan</th>
                  <th style="width: 80px; text-align: center">Satuan</th>
                  <th style="width: 100px; text-align: right">Jml PO</th>
                  <th style="width: 100px; text-align: right">Akan PO</th>
                  <th style="width: 100px; text-align: right">Sisa</th>
                </tr>
              </thead>

              <!-- Tiap bahan bisa punya sub-tabel MKB -->
              <tbody
                v-for="(det, idx) in detailData[getNomor(item)]"
                :key="idx"
              >
                <!-- Baris bahan -->
                <tr class="tr-bahan">
                  <td class="fw text-primary pl-8">{{ det.KodeBahan }}</td>
                  <td class="fw">{{ det.NamaBahan }}</td>
                  <td class="tc">{{ det.Satuan }}</td>
                  <td class="tr">{{ num(det.JmlPO) }}</td>
                  <td class="tr">{{ num(det.AkanPO) }}</td>
                  <td
                    class="tr fw"
                    :class="Number(det.Sisa) < 0 ? 'c-err' : ''"
                  >
                    {{ num(det.Sisa) }}
                  </td>
                </tr>

                <!-- Sub-baris MKB (jika ada) -->
                <tr v-if="det.RiwayatMkb?.length" class="tr-mkb-wrap">
                  <td colspan="6" class="p0">
                    <div class="mkb-inner">
                      <div class="mkb-title">Riwayat MKB</div>
                      <table class="mkb-tbl">
                        <thead>
                          <tr>
                            <th style="width: 160px">Nomor MKB</th>
                            <th style="width: 110px; text-align: center">
                              Tanggal
                            </th>
                            <th style="width: 110px; text-align: right">
                              Qty Akan PO
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(mkb, mi) in det.RiwayatMkb" :key="mi">
                            <td class="fw-mono">{{ mkb.NomorMKB }}</td>
                            <td class="tc">{{ formatTgl(mkb.TanggalMKB) }}</td>
                            <td class="tr fw">{{ num(mkb.AkanPO) }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
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

/* ── Expand wrapper ── */
.expand-wrap {
  background: #eceff1;
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
}
.tr-bahan td {
  background: #fafafa;
}
.tr-bahan:hover td {
  background: #e3f2fd;
}
.tr-mkb-wrap td {
  padding: 0;
  border: none;
}

/* ── Sub-tabel MKB ── */
.mkb-inner {
  padding: 6px 12px 10px 32px;
  background: #f9fbe7;
  border-bottom: 2px solid #e0e0e0;
}
.mkb-title {
  font-size: 10px;
  font-weight: 700;
  color: #00695c;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.mkb-tbl {
  width: 100%;
  max-width: 420px;
  border-collapse: collapse;
  font-size: 11px;
  border: 1px solid #b2dfdb;
}
.mkb-tbl thead th {
  background: #e0f2f1;
  color: #00695c;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 700;
  border-bottom: 1px solid #b2dfdb;
  text-align: left;
}
.mkb-tbl tbody td {
  padding: 3px 8px;
  border-bottom: 1px solid #e0f2f1;
}
.mkb-tbl tbody tr:hover td {
  background: #f1f8e9;
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
.p0 {
  padding: 0 !important;
}
.pl-8 {
  padding-left: 8px;
}
.c-err {
  color: #d32f2f;
}
.text-primary {
  color: #1565c0;
}
.text-grey {
  color: #9e9e9e;
}
</style>
