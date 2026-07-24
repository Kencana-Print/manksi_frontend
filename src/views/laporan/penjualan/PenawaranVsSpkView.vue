<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { useToast } from "vue-toastification";
import { penawaranVsSpkService } from "@/services/laporan/penjualan/penawaranVsSpkService";
import api from "@/services/api";
import { IconReportAnalytics } from "@tabler/icons-vue";

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString()
  .substring(0, 10);
const todayString = today.toISOString().substring(0, 10);

const filters = ref({
  startDate: firstDayOfMonth,
  endDate: todayString,
  divisi: "0",
});
const toast = useToast();

const divisiOptions = ref<any[]>([]);
const loadDivisi = async () => {
  try {
    const res = await api.get("/lookups/divisi");
    divisiOptions.value = [
      { kode: "0", nama: "ALL" },
      ...res.data.data.map((d: any) => ({
        kode: d.kode,
        nama: `${d.kode} - ${d.nama}`,
      })),
    ];
  } catch {
    divisiOptions.value = [{ kode: "0", nama: "ALL" }];
  }
};

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId: "301",
  fetchApi: async () => {
    const res = await penawaranVsSpkService.getBrowse({
      startDate: filters.value.startDate,
      endDate: filters.value.endDate,
      divisi: filters.value.divisi,
    });
    return res.data.data;
  },
  immediate: false,
});

onMounted(async () => {
  await loadDivisi();
  fetchData();
});
watch(
  [
    () => filters.value.startDate,
    () => filters.value.endDate,
    () => filters.value.divisi,
  ],
  fetchData,
);

const masterHeaders = [
  { title: "Nomor", key: "Nomor", width: "140px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Divisi", key: "Divisi", width: "120px" },
  { title: "Nama Customer", key: "NamaCustomer", minWidth: "200px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
  { title: "Total SPK", key: "TotalSPK", width: "90px", align: "center" },
];

const expandedRows = ref<string[]>([]);
const detailData = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (val: any[]) => {
  expandedRows.value = val;
  // val bisa berupa array of objects atau array of strings — ekstrak Nomor
  const nomorList = val.map((v) => (typeof v === "object" ? v.Nomor : v));
  for (const nomor of nomorList.filter((n) => n && !detailData.value[n])) {
    detailLoading.value[nomor] = true;
    try {
      const res = await penawaranVsSpkService.getDetail(nomor);
      detailData.value[nomor] = res.data.data;
    } catch {
      detailData.value[nomor] = [];
    } finally {
      detailLoading.value[nomor] = false;
    }
  }
};

const onExport = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  try {
    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 22 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Divisi", key: "Divisi", width: 16 },
      { header: "Customer", key: "NamaCustomer", width: 30 },
      { header: "Keterangan", key: "Keterangan", width: 30 },
      {
        header: "Total SPK",
        key: "TotalSPK",
        width: 12,
        align: "center",
        numFmt: "#,##0",
      },
    ];

    const rows = items.value.map((it: any) => ({
      Nomor: it.Nomor,
      Tanggal: formatTgl(it.Tanggal),
      Divisi: it.Divisi,
      NamaCustomer: it.NamaCustomer,
      Keterangan: it.Keterangan,
      TotalSPK: Number(it.TotalSPK) || 0,
    }));

    await exportExcelSingle(
      `Laporan_Penawaran_vs_SPK_${filters.value.startDate}.xlsx`,
      "Penawaran vs SPK",
      columns,
      rows,
      `Laporan Penawaran vs SPK  |  Periode: ${formatTgl(filters.value.startDate)} s.d ${formatTgl(filters.value.endDate)}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  }
};

const isExportingDetail = ref(false);

const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await penawaranVsSpkService.getAllDetail({
      startDate: filters.value.startDate,
      endDate: filters.value.endDate,
      divisi: filters.value.divisi,
    });
    const allDetail: any[] = res.data.data;
    if (!allDetail.length) {
      toast.warning("Tidak ada data detail pada range tanggal ini.");
      return;
    }

    // ✅ Kelompokkan per No. Penawaran (jaga urutan kemunculan pertama)
    const groups: Record<string, any[]> = {};
    const order: string[] = [];
    allDetail.forEach((r) => {
      const key = r.NomorPenawaran;
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(r);
    });

    const combinedRows: any[] = [];

    order.forEach((key) => {
      const rowsInGroup = groups[key];
      const first = rowsInGroup[0];
      const masterCells = {
        NomorPenawaran: first.NomorPenawaran,
        TglPenawaran: formatTgl(first.TglPenawaran),
        Divisi: first.Divisi,
        NamaCustomer: first.NamaCustomer,
        Keterangan: first.Keterangan,
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      rowsInGroup.forEach((r, idx) => {
        combinedRows.push({
          ...(idx === 0 ? masterCells : blankMaster),
          NomorSPK: r.NomorSPK,
          TglSPK: formatTgl(r.TglSPK),
          NamaSPK: r.NamaSPK,
          Jumlah: Number(r.Jumlah) || 0,
        });
      });
    });

    const columns: ExcelColumn[] = [
      { header: "No. Penawaran", key: "NomorPenawaran", width: 22 },
      {
        header: "Tgl Penawaran",
        key: "TglPenawaran",
        width: 14,
        align: "center",
      },
      { header: "Divisi", key: "Divisi", width: 16 },
      { header: "Customer", key: "NamaCustomer", width: 30 },
      { header: "Keterangan", key: "Keterangan", width: 30 },
      { header: "No. SPK", key: "NomorSPK", width: 20 },
      { header: "Tgl SPK", key: "TglSPK", width: 14, align: "center" },
      { header: "Nama SPK", key: "NamaSPK", width: 30 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
    ];

    await exportExcelSingle(
      `Export_Detail_Penawaran_vs_SPK_${filters.value.startDate}.xlsx`,
      "Detail Penawaran vs SPK",
      columns,
      combinedRows,
      `Detail Penawaran vs SPK  |  Periode: ${formatTgl(filters.value.startDate)} s.d ${formatTgl(filters.value.endDate)}`,
    );

    toast.success("Berhasil export detail.");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

// Format tanggal: YYYY-MM-DDT... → DD/MM/YYYY
const formatTgl = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10); // ambil YYYY-MM-DD
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};
</script>

<template>
  <BaseBrowse
    title="Penawaran vs SPK"
    menu-id="301"
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
    <!-- ── Filter kiri ── -->
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal</span>
        <input type="date" v-model="filters.startDate" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filters.endDate" class="f-date" />
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <span class="f-label">Divisi</span>
        <select
          v-model="filters.divisi"
          class="f-date"
          style="min-width: 160px; font-weight: 700"
        >
          <option
            v-for="opt in divisiOptions"
            :key="opt.kode"
            :value="opt.kode"
          >
            {{ opt.nama }}
          </option>
        </select>
      </div>
    </template>

    <!-- ── Extra action: Export Detail ── -->
    <template #extra-actions>
      <v-btn
        v-if="canExport"
        size="small"
        color="teal-darken-1"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        Export Detail
      </v-btn>
    </template>

    <!-- ── Format kolom Tanggal ── -->
    <template #item.Tanggal="{ item }">{{ formatTgl(item.Tanggal) }}</template>

    <!-- ── Expand detail SPK ── -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="detailLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <template v-else>
          <div class="expand-title mb-2">Detail SPK — {{ item.Nomor }}</div>
          <div
            v-if="!detailData[item.Nomor]?.length"
            class="text-caption text-grey font-italic px-2"
          >
            Belum ada SPK untuk penawaran ini.
          </div>
          <table v-else class="detail-table">
            <thead>
              <tr>
                <th style="width: 150px">No. Penawaran</th>
                <th style="width: 150px">No. SPK</th>
                <th style="width: 100px; text-align: center">Tgl. SPK</th>
                <th style="min-width: 250px">Nama Barang / Spesifikasi</th>
                <th style="width: 80px; text-align: right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(det, idx) in detailData[item.Nomor]" :key="idx">
                <td>{{ det.Nomor }}</td>
                <td>{{ det.Spk }}</td>
                <td class="text-center">{{ formatTgl(det.Tanggal) }}</td>
                <td>{{ det.Nama }}</td>
                <td class="text-right fw">
                  {{ Number(det.Jumlah).toLocaleString("id-ID") }}
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
/* ── Filter bar (konsisten dengan BpbBahan) ── */
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

/* ── Expand area ── */
.expand-wrap {
  padding: 10px 10px 10px 40px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
}

/* ── Detail table ── */
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}
.detail-table th {
  background: #0277bd;
  color: white;
  font-weight: 600;
  padding: 5px 8px;
  border: 1px solid #01579b;
  text-align: left;
}
.detail-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}
.detail-table tr:hover td {
  background: #e3f2fd;
}
.fw {
  font-weight: 700;
}
</style>
