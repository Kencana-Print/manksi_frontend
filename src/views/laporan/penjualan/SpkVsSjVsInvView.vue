<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { spkVsSjVsInvService } from "@/services/laporan/penjualan/spkVsSjVsInvService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import api from "@/services/api";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import SalesSearchModal from "@/components/lookups/SalesSearchModal.vue";
import { IconFileInvoice, IconSearch } from "@tabler/icons-vue";

const toast = useToast();

// --- STATE FILTER (default: hari ini s.d. hari ini, divisi ALL) ---
const toLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const todayStr = toLocalDateStr(new Date());

const filterState = ref({
  dtAwal: todayStr,
  dtAkhir: todayStr,
  divisi: "0",
  customerKode: "",
  customerNama: "",
  perushKode: "",
  status: "0",
  salesKode: "",
  salesNama: "",
});

const STATUS_OPTIONS = [
  { value: "0", title: "All" },
  { value: "1", title: "Belum Terpenuhi" },
  { value: "2", title: "Sudah Terpenuhi" },
];

// --- DROPDOWN DIVISI ---
const divisiOptions = ref<{ value: string; title: string }[]>([]);
const loadDivisi = async () => {
  try {
    const res = await api.get("/lookups/divisi");
    divisiOptions.value = [
      { value: "0", title: "0 - ALL" },
      ...res.data.data.map((d: any) => ({
        value: String(d.kode ?? d.Kode),
        title: `${d.kode ?? d.Kode} - ${d.divisi ?? d.nama ?? d.Nama ?? d.Divisi}`,
      })),
    ];
  } catch {
    console.error("Gagal memuat divisi");
  }
};

// --- DROPDOWN PERUSAHAAN ---
const perusahaanOptions = ref<{ value: string; title: string }[]>([]);
const loadPerusahaan = async () => {
  try {
    const res = await api.get("/lookups/perusahaan");
    const list = res.data.data?.items || res.data.data || [];
    perusahaanOptions.value = [
      { value: "", title: "SEMUA PERUSAHAAN" },
      ...list.map((p: any) => ({
        value: p.perush_kode ?? p.Kode,
        title: `${p.perush_kode ?? p.Kode} - ${p.perush_nama ?? p.Nama}`,
      })),
    ];
  } catch {
    console.error("Gagal memuat perusahaan");
  }
};

// --- MODAL CUSTOMER & SALES ---
const showCustModal = ref(false);
const showSalesModal = ref(false);

const onCustSelected = (item: any) => {
  filterState.value.customerKode = item.Kode || item.cus_kode;
  filterState.value.customerNama = item.Nama || item.cus_nama;
};
const clearCust = () => {
  filterState.value.customerKode = "";
  filterState.value.customerNama = "";
};
const onSalesSelected = (item: any) => {
  filterState.value.salesKode = item.Kode || item.sal_kode;
  filterState.value.salesNama = item.Nama || item.sal_nama;
};
const clearSales = () => {
  filterState.value.salesKode = "";
  filterState.value.salesNama = "";
};

// --- BROWSE SETUP ---
const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId: "306",
  fetchApi: async () => {
    const res = await spkVsSjVsInvService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      divisi: filterState.value.divisi,
      customerKode: filterState.value.customerKode,
      perushKode: filterState.value.perushKode,
      status: filterState.value.status,
      salesKode: filterState.value.salesKode,
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
  { title: "Nama Customer", key: "NamaCustomer", minWidth: "200px" },
  { title: "Nama", key: "Nama", minWidth: "200px" },
  { title: "Ukuran", key: "Ukuran", width: "160px" },
  { title: "Jenis", key: "Jenis", width: "70px", align: "center" },
  { title: "Jumlah", key: "Jumlah", width: "90px", align: "right" },
  { title: "Prasj", key: "Prasj", width: "80px", align: "right" },
  { title: "Kirim", key: "Kirim", width: "90px", align: "right" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Nomor PO", key: "NomorPO", width: "130px" },
];

const numFmt = (v: any) =>
  v || v === 0 ? Number(v).toLocaleString("id-ID") : "0";

// --- EXPAND LOGIC (Detail SJ + Invoice) ---
const expandedRows = ref<any[]>([]);
const detailCache = ref<
  Record<string, { sjDetails: any[]; invDetails: any[] }>
>({});
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
      const res = await spkVsSjVsInvService.getDetail(nomor);
      detailCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal memuat detail ${nomor}`);
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// --- HANDLERS ---
onMounted(() => {
  loadDivisi();
  loadPerusahaan();
  fetchData();
});
watch(
  () => [
    filterState.value.dtAwal,
    filterState.value.dtAkhir,
    filterState.value.divisi,
    filterState.value.customerKode,
    filterState.value.perushKode,
    filterState.value.status,
    filterState.value.salesKode,
  ],
  fetchData,
);

// --- EXPORT (gabungan Master + SJ + Invoice, interleaved) ---
const isExporting = ref(false);
const onExport = async () => {
  isExporting.value = true;
  try {
    const res = await spkVsSjVsInvService.getExportData({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      divisi: filterState.value.divisi,
      customerKode: filterState.value.customerKode,
      perushKode: filterState.value.perushKode,
      status: filterState.value.status,
      salesKode: filterState.value.salesKode,
    });
    const { master, sjDetails, invDetails } = res.data.data;

    if (!master || master.length === 0) {
      return toast.warning("Tidak ada data untuk diexport.");
    }

    // ✅ Kelompokkan SJ & Invoice per Nomor SPK (2 list independen)
    const sjByNomor: Record<string, any[]> = {};
    sjDetails.forEach((r: any) => {
      if (!sjByNomor[r.SpkNomor]) sjByNomor[r.SpkNomor] = [];
      sjByNomor[r.SpkNomor].push(r);
    });
    const invByNomor: Record<string, any[]> = {};
    invDetails.forEach((r: any) => {
      if (!invByNomor[r.SpkNomor]) invByNomor[r.SpkNomor] = [];
      invByNomor[r.SpkNomor].push(r);
    });

    const combinedRows: any[] = [];

    master.forEach((m: any) => {
      const sjList = sjByNomor[m.Nomor] || [];
      const invList = invByNomor[m.Nomor] || [];
      // ✅ replikasi persis: SJ & Invoice punya baris sendiri-sendiri
      // (gak saling terkait), tinggi blok = yang paling banyak barisnya
      const rowCount = Math.max(sjList.length, invList.length, 1);

      const masterCells = {
        Nomor: m.Nomor,
        Tanggal: formatTanggal(m.Tanggal),
        Divisi: m.Divisi,
        NamaCustomer: m.NamaCustomer,
        Nama: m.Nama,
        Ukuran: m.Ukuran,
        Jenis: m.Jenis,
        Jumlah: Number(m.Jumlah) || 0,
        Prasj: Number(m.Prasj) || 0,
        Kirim: Number(m.Kirim) || 0,
        Dateline: formatTanggal(m.Dateline),
        NomorPO: m.NomorPO,
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );
      const blankSj = {
        NomorSJ: "",
        TanggalSJ: "",
        Gudang: "",
        UkuranSJ: "",
        JumlahSJ: "",
        Alamat: "",
        Kota: "",
      };
      const blankInv = {
        NomorInv: "",
        TanggalInv: "",
        Keterangan: "",
        JumlahInv: "",
        Harga: "",
      };

      for (let i = 0; i < rowCount; i++) {
        const sj = sjList[i];
        const inv = invList[i];
        combinedRows.push({
          ...(i === 0 ? masterCells : blankMaster),
          ...(sj
            ? {
                NomorSJ: sj.NomorSJ,
                TanggalSJ: formatTanggal(sj.TanggalSJ),
                Gudang: sj.Gudang,
                UkuranSJ: sj.Ukuran,
                JumlahSJ: Number(sj.Jumlah) || 0,
                Alamat: sj.Alamat,
                Kota: sj.Kota,
              }
            : blankSj),
          ...(inv
            ? {
                NomorInv: inv.NomorInv,
                TanggalInv: formatTanggal(inv.TanggalInv),
                Keterangan: inv.Keterangan,
                JumlahInv: Number(inv.Jumlah) || 0,
                Harga: Number(inv.Harga) || 0,
              }
            : blankInv),
        });
      }
    });

    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 18 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Divisi", key: "Divisi", width: 14 },
      { header: "Nama Customer", key: "NamaCustomer", width: 24 },
      { header: "Nama", key: "Nama", width: 30 },
      { header: "Ukuran", key: "Ukuran", width: 18 },
      { header: "Jenis Order", key: "Jenis", width: 10, align: "center" },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 10,
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
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Dateline", key: "Dateline", width: 14, align: "center" },
      { header: "Nomor PO", key: "NomorPO", width: 18 },
      { header: "Nomor SJ", key: "NomorSJ", width: 18 },
      { header: "Tanggal SJ", key: "TanggalSJ", width: 14, align: "center" },
      { header: "Gudang", key: "Gudang", width: 18 },
      { header: "Size", key: "UkuranSJ", width: 12 },
      {
        header: "Jumlah",
        key: "JumlahSJ",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Alamat", key: "Alamat", width: 28 },
      { header: "Kota", key: "Kota", width: 16 },
      { header: "Nomor Inv", key: "NomorInv", width: 18 },
      {
        header: "Tanggal Inv",
        key: "TanggalInv",
        width: 14,
        align: "center",
      },
      { header: "Keterangan", key: "Keterangan", width: 28 },
      {
        header: "Jumlah",
        key: "JumlahInv",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Harga",
        key: "Harga",
        width: 14,
        align: "right",
        numFmt: "#,##0",
      },
    ];

    const divisiLabel =
      divisiOptions.value.find((d) => d.value === filterState.value.divisi)
        ?.title || filterState.value.divisi;
    const perushLabel =
      perusahaanOptions.value.find(
        (p) => p.value === filterState.value.perushKode,
      )?.title || "SEMUA";
    const statusLabel =
      STATUS_OPTIONS.find((s) => s.value === filterState.value.status)?.title ||
      "All";

    const titleLines = [
      "Laporan SPK vs SJ vs Invoice",
      `Periode: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`,
      `Divisi: ${divisiLabel}  |  Perusahaan: ${perushLabel}  |  Status: ${statusLabel}`,
      `Customer: ${filterState.value.customerNama || "SEMUA"}  |  Sales: ${filterState.value.salesNama || "SEMUA"}`,
    ].join("\n");

    await exportExcelSingle(
      `Laporan_SPK_vs_SJ_vs_Inv_${todayStr}.xlsx`,
      "SPK vs SJ vs Inv",
      columns,
      combinedRows,
      titleLines,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Laporan SPK vs SJ vs Invoice"
    menu-id="306"
    :icon="IconFileInvoice"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:filter-state="filterState"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport"
    item-value="Nomor"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
    @export="onExport"
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
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Perusahaan</span>
        <select v-model="filterState.perushKode" class="f-select">
          <option
            v-for="opt in perusahaanOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.title }}
          </option>
        </select>
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Status</span>
        <select v-model="filterState.status" class="f-select">
          <option
            v-for="opt in STATUS_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.title }}
          </option>
        </select>
      </div>
    </template>

    <template #filter-right>
      <div class="f-group">
        <div class="f-lookup" @click="showCustModal = true">
          {{ filterState.customerNama || "SEMUA CUSTOMER" }}
          <IconSearch :size="14" class="ml-auto" />
        </div>
        <button
          v-if="filterState.customerKode"
          class="f-clear"
          @click="clearCust"
        >
          ✕
        </button>
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <div class="f-lookup" @click="showSalesModal = true">
          {{ filterState.salesNama || "SEMUA SALES" }}
          <IconSearch :size="14" class="ml-auto" />
        </div>
        <button
          v-if="filterState.salesKode"
          class="f-clear"
          @click="clearSales"
        >
          ✕
        </button>
      </div>
    </template>

    <template #item.Tanggal="{ item }">{{
      formatTanggal(item.Tanggal)
    }}</template>
    <template #item.Dateline="{ item }">{{
      formatTanggal(item.Dateline)
    }}</template>
    <template #item.Jumlah="{ item }">{{ numFmt(item.Jumlah) }}</template>
    <template #item.Prasj="{ item }">{{ numFmt(item.Prasj) }}</template>
    <template #item.Kirim="{ item }">{{ numFmt(item.Kirim) }}</template>

    <template #detail="{ item }">
      <div class="expand-container pa-3 bg-grey-lighten-4">
        <div v-if="expandedLoading[item.Nomor]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat detail...</span>
        </div>
        <div v-else class="detail-side-by-side">
          <!-- Detail SJ -->
          <div class="detail-col">
            <div class="border rounded overflow-hidden shadow-sm bg-white">
              <div class="detail-header bg-blue-grey-darken-3 text-white">
                Detail Surat Jalan
              </div>
              <table class="dtl-table">
                <thead>
                  <tr>
                    <th>Nomor SJ</th>
                    <th class="tc">Tanggal</th>
                    <th>Gudang</th>
                    <th>Size</th>
                    <th class="tr">Jumlah</th>
                    <th>Alamat</th>
                    <th>Kota</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(d, i) in detailCache[item.Nomor]?.sjDetails"
                    :key="i"
                  >
                    <td class="font-weight-bold text-primary">
                      {{ d.NomorSJ }}
                    </td>
                    <td class="tc">{{ formatTanggal(d.TanggalSJ) }}</td>
                    <td>{{ d.Gudang }}</td>
                    <td>{{ d.Ukuran }}</td>
                    <td class="tr">{{ numFmt(d.Jumlah) }}</td>
                    <td>{{ d.Alamat }}</td>
                    <td>{{ d.Kota }}</td>
                  </tr>
                  <tr v-if="!detailCache[item.Nomor]?.sjDetails?.length">
                    <td colspan="7" class="empty-row">
                      Belum ada Surat Jalan.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <!-- Detail Invoice -->
          <div class="detail-col">
            <div class="border rounded overflow-hidden shadow-sm bg-white">
              <div class="detail-header bg-teal-darken-3 text-white">
                Detail Invoice
              </div>
              <table class="dtl-table">
                <thead>
                  <tr>
                    <th>Nomor Inv</th>
                    <th class="tc">Tanggal</th>
                    <th>Keterangan</th>
                    <th class="tr">Jumlah</th>
                    <th class="tr">Harga</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(d, i) in detailCache[item.Nomor]?.invDetails"
                    :key="i"
                  >
                    <td class="font-weight-bold text-teal-darken-3">
                      {{ d.NomorInv }}
                    </td>
                    <td class="tc">{{ formatTanggal(d.TanggalInv) }}</td>
                    <td>{{ d.Keterangan }}</td>
                    <td class="tr">{{ numFmt(d.Jumlah) }}</td>
                    <td class="tr">{{ numFmt(d.Harga) }}</td>
                  </tr>
                  <tr v-if="!detailCache[item.Nomor]?.invDetails?.length">
                    <td colspan="5" class="empty-row">Belum ada Invoice.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <CustomerSearchModal v-model="showCustModal" @selected="onCustSelected" />
  <SalesSearchModal v-model="showSalesModal" @selected="onSalesSelected" />
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
.f-lookup {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 11px;
  display: flex;
  align-items: center;
  min-width: 150px;
  cursor: pointer;
  background: #f9f9f9;
}
.f-clear {
  background: none;
  border: none;
  color: #f44336;
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
}
.detail-loading {
  display: flex;
  align-items: center;
  padding: 12px;
  color: #555;
}
.detail-side-by-side {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.detail-col {
  flex: 1 1 420px;
  min-width: 0;
}
.detail-header {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.dtl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dtl-table th {
  background: #eceff1;
  color: #37474f;
  padding: 5px 8px;
  text-align: left;
  font-weight: 700;
  border-bottom: 2px solid #b0bec5;
  white-space: nowrap;
}
.dtl-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #f0f0f0;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  padding: 12px;
  font-style: italic;
}
</style>
