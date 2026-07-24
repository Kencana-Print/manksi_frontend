<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { spkVsSjService } from "@/services/laporan/penjualan/spkVsSjService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import api from "@/services/api";
import { IconTruckDelivery, IconFileExport } from "@tabler/icons-vue";

const toast = useToast();

// --- STATE FILTER (default: awal bulan s.d. hari ini, divisi 4) ---
const d = new Date();
const toLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const firstDay = toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
const today = toLocalDateStr(d);

const filterState = ref({
  dtAwal: firstDay,
  dtAkhir: today,
  divisi: "4",
});

// --- DROPDOWN DIVISI (dari tdivisi, "0" = SEMUA) ---
const divisiOptions = ref<{ value: string; title: string }[]>([]);
const loadDivisi = async () => {
  try {
    const res = await api.get("/lookups/divisi");
    divisiOptions.value = [
      { value: "0", title: "0 - SEMUA DIVISI" },
      ...res.data.data.map((d: any) => ({
        value: String(d.kode ?? d.Kode),
        title: `${d.kode ?? d.Kode} - ${d.divisi ?? d.nama ?? d.Nama ?? d.Divisi}`,
      })),
    ];
  } catch {
    console.error("Gagal memuat divisi");
  }
};

// --- BROWSE SETUP ---
const { items, isLoading, selected, canExport, fetchData } = useBrowse({
  menuId: "305",
  fetchApi: async () => {
    const res = await spkVsSjService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      divisi: filterState.value.divisi,
    });
    return res.data.data;
  },
  immediate: false,
});

// --- HEADERS UTAMA ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Divisi", key: "Divisi", width: "110px" },
  { title: "Kode Cus", key: "KodeCustomer", width: "90px" },
  { title: "Nama Customer", key: "NamaCustomer", minWidth: "200px" },
  { title: "Nama", key: "Nama", minWidth: "200px" },
  { title: "Ukuran", key: "Ukuran", width: "160px" },
  { title: "Panjang", key: "Panjang", width: "80px", align: "right" },
  { title: "Lebar", key: "Lebar", width: "80px", align: "right" },
  { title: "Jenis", key: "Jenis", width: "70px", align: "center" },
  { title: "Jumlah", key: "Jumlah", width: "90px", align: "right" },
  { title: "Prasj", key: "Prasj", width: "80px", align: "right" },
  { title: "Kirim", key: "Kirim", width: "90px", align: "right" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Status", key: "Stat", width: "130px" },
];

// --- EXPAND LOGIC (DETAIL SJ) ---
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.Nomor] && !expandedLoading.value[item.Nomor],
  );

  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    expandedLoading.value[nomor] = true;
    try {
      const res = await spkVsSjService.getDetail(nomor);
      detailCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal memuat detail SJ ${nomor}`);
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// --- HANDLERS ---
onMounted(() => {
  loadDivisi();
  fetchData();
});
watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);
watch(() => filterState.value.divisi, fetchData);

const numFmt = (v: any) =>
  v || v === 0 ? Number(v).toLocaleString("id-ID") : "0";

const getStatClass = (stat: string) => {
  if (stat === "Belum Terkirim") return "stat-belum";
  if (stat === "Terkirim Sebagian") return "stat-sebagian";
  return "stat-lengkap";
};

// --- EXPORT (header) ---
const onExport = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  try {
    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 20 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Divisi", key: "Divisi", width: 16 },
      { header: "Kode Customer", key: "KodeCustomer", width: 14 },
      { header: "Nama Customer", key: "NamaCustomer", width: 26 },
      { header: "Nama", key: "Nama", width: 30 },
      { header: "Ukuran", key: "Ukuran", width: 20 },
      {
        header: "Panjang",
        key: "Panjang",
        width: 10,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Lebar",
        key: "Lebar",
        width: 10,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "Jenis", key: "Jenis", width: 10, align: "center" },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Prasj",
        key: "Prasj",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kirim",
        key: "Kirim",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Dateline", key: "Dateline", width: 14, align: "center" },
      { header: "Status", key: "Stat", width: 18 },
    ];

    const rows = items.value.map((it: any) => ({
      ...it,
      Tanggal: formatTanggal(it.Tanggal),
      Dateline: formatTanggal(it.Dateline),
    }));

    await exportExcelSingle(
      `Laporan_SPK_vs_SJ_${today}.xlsx`,
      "SPK vs SJ",
      columns,
      rows,
      `Laporan SPK vs SJ  |  Periode: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  }
};

// --- EXPORT DETAIL ---
const exportDetail = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  toast.info("Menyiapkan data detail untuk diexport... Mohon tunggu.");

  try {
    const combinedRows: any[] = [];

    for (const item of items.value) {
      let detail = detailCache.value[item.Nomor];
      if (!detail) {
        const res = await spkVsSjService.getDetail(item.Nomor);
        detail = res.data.data;
        detailCache.value[item.Nomor] = detail;
      }

      const masterCells = {
        Nomor: item.Nomor,
        Tanggal: formatTanggal(item.Tanggal),
        Divisi: item.Divisi,
        NamaCustomer: item.NamaCustomer,
        Nama: item.Nama,
        Jumlah: Number(item.Jumlah) || 0,
        Kirim: Number(item.Kirim) || 0,
        Dateline: formatTanggal(item.Dateline),
        Stat: item.Stat,
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      if (!detail || detail.length === 0) {
        combinedRows.push({
          ...masterCells,
          NomorSJ: "",
          Perusahaan: "",
          TanggalSJ: "",
          Alamat: "",
          Kota: "",
          Gudang: "",
          JumlahSJ: "",
        });
      } else {
        detail.forEach((dRow: any, idx: number) => {
          combinedRows.push({
            ...(idx === 0 ? masterCells : blankMaster),
            NomorSJ: dRow.NomorSJ,
            Perusahaan: dRow.Perusahaan,
            TanggalSJ: formatTanggal(dRow.TanggalSJ),
            Alamat: dRow.Alamat,
            Kota: dRow.Kota,
            Gudang: dRow.Gudang,
            JumlahSJ: Number(dRow.Jumlah) || 0,
          });
        });
      }
    }

    const columns: ExcelColumn[] = [
      { header: "Nomor SPK", key: "Nomor", width: 20 },
      { header: "Tgl SPK", key: "Tanggal", width: 14, align: "center" },
      { header: "Divisi", key: "Divisi", width: 14 },
      { header: "Customer", key: "NamaCustomer", width: 26 },
      { header: "Nama", key: "Nama", width: 28 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kirim",
        key: "Kirim",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Dateline", key: "Dateline", width: 14, align: "center" },
      { header: "Status", key: "Stat", width: 16 },
      { header: "No. SJ", key: "NomorSJ", width: 20 },
      { header: "Perush", key: "Perusahaan", width: 10, align: "center" },
      { header: "Tgl SJ", key: "TanggalSJ", width: 14, align: "center" },
      { header: "Alamat", key: "Alamat", width: 30 },
      { header: "Kota", key: "Kota", width: 18 },
      { header: "Gudang", key: "Gudang", width: 20 },
      {
        header: "Jml SJ",
        key: "JumlahSJ",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
    ];

    await exportExcelSingle(
      `Export_Detail_SPK_vs_SJ_${today}.xlsx`,
      "SPK vs SJ",
      columns,
      combinedRows,
      `Laporan SPK vs SJ  |  Periode: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`,
    );

    toast.success("Berhasil export detail.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor detail.");
  }
};
</script>

<template>
  <BaseBrowse
    title="Laporan SPK vs SJ"
    menu-id="305"
    :icon="IconTruckDelivery"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport"
    item-value="Nomor"
    @refresh="fetchData"
    @export="onExport"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Divisi</span>
        <select v-model="filterState.divisi" class="f-select">
          <option
            v-for="opt in divisiOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.title }}
          </option>
        </select>
      </div>
    </template>

    <template #item.Tanggal="{ item }">{{
      formatTanggal(item.Tanggal)
    }}</template>
    <template #item.Dateline="{ item }">{{
      formatTanggal(item.Dateline)
    }}</template>
    <template #item.Panjang="{ item }">{{ numFmt(item.Panjang) }}</template>
    <template #item.Lebar="{ item }">{{ numFmt(item.Lebar) }}</template>
    <template #item.Jumlah="{ item }">{{ numFmt(item.Jumlah) }}</template>
    <template #item.Prasj="{ item }">{{ numFmt(item.Prasj) }}</template>
    <template #item.Kirim="{ item }">{{ numFmt(item.Kirim) }}</template>
    <template #item.Stat="{ item }">
      <span class="stat-badge" :class="getStatClass(item.Stat)">{{
        item.Stat
      }}</span>
    </template>

    <!-- Detail Expand (Lazy Load) -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="expandedLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">Detail SJ - {{ item.Nomor }}</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="150">Nomor SJ</th>
                <th width="70">Perush</th>
                <th width="100">Tanggal</th>
                <th width="220">Alamat</th>
                <th width="140">Kota</th>
                <th width="150">Gudang</th>
                <th width="100" class="tr">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(dRow, i) in detailCache[item.Nomor]" :key="i">
                <td class="font-weight-bold text-blue-darken-2">
                  {{ dRow.NomorSJ }}
                </td>
                <td class="text-center">
                  <span class="perush-badge">{{ dRow.Perusahaan }}</span>
                </td>
                <td>{{ formatTanggal(dRow.TanggalSJ) }}</td>
                <td>{{ dRow.Alamat }}</td>
                <td>{{ dRow.Kota }}</td>
                <td>{{ dRow.Gudang }}</td>
                <td class="tr font-weight-bold">{{ numFmt(dRow.Jumlah) }}</td>
              </tr>
              <tr
                v-if="
                  !detailCache[item.Nomor] ||
                  detailCache[item.Nomor].length === 0
                "
              >
                <td colspan="7" class="text-center text-grey py-3 font-italic">
                  Belum ada Surat Jalan untuk SPK ini.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Additional Actions -->
    <template #extra-actions>
      <v-btn size="small" color="deep-purple-darken-1" @click="exportDetail">
        <template #prepend><IconFileExport :size="15" /></template>Export Detail
      </v-btn>
    </template>
  </BaseBrowse>
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
.f-date,
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
  color: #212121;
}
.f-date:focus,
.f-select:focus {
  border-color: #1976d2;
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

.stat-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10.5px;
  font-weight: 700;
  white-space: nowrap;
}
.stat-belum {
  background: #ffebee;
  color: #c62828;
}
.stat-sebagian {
  background: #fff8e1;
  color: #e65100;
}
.stat-lengkap {
  background: #e8f5e9;
  color: #2e7d32;
}
.perush-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  background: #eceff1;
  color: #455a64;
  font-size: 10px;
  font-weight: 700;
}

.expand-wrap {
  padding: 10px 10px 10px 40px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: bold;
  color: #1565c0;
  text-transform: uppercase;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-size: 11px;
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 8px;
  font-weight: bold;
}
.detail-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
}
.tr {
  text-align: right !important;
}
</style>
