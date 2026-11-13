<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { IconFileSpreadsheet, IconNotebook } from "@tabler/icons-vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportExcel, type ExcelColumn } from "@/utils/excelExport";
import { buatKopPreLines } from "@/utils/kopLaporan";
import { formatTanggal } from "@/utils/dateFormat";
import {
  kartuStokKainService,
  type KartuStokKainDetailRow,
  type KartuStokKainGudang,
  type KartuStokKainRow,
} from "@/services/laporan/spanduk/kartuStokKainService";

const toast = useToast();

const pad = (n: number): string => String(n).padStart(2, "0");
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filterState = ref({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
  gudang: "",
});
const daftarGudang = ref<KartuStokKainGudang[]>([]);
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// --- Expand (detail transaksi, lazy load) ---
const expandedRows = ref<KartuStokKainRow[]>([]);
const detailCache = ref<Record<string, KartuStokKainDetailRow[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const { items, isLoading, canExport, fetchData } = useBrowse<KartuStokKainRow>({
  menuId: "963",
  fetchApi: async () => {
    const f = filterState.value;
    if (!f.dtAwal || !f.dtAkhir) {
      toast.warning("Periode wajib diisi.");
      return [];
    }
    if (f.dtAwal > f.dtAkhir) {
      toast.warning("Tanggal awal tidak boleh melebihi tanggal akhir.");
      return [];
    }
    // Filter berubah: detail lama tidak berlaku lagi
    expandedRows.value = [];
    detailCache.value = {};
    const res = await kartuStokKainService.getBrowse({
      tglAwal: f.dtAwal,
      tglAkhir: f.dtAkhir,
      gudang: f.gudang,
    });
    return res.data?.data ?? [];
  },
  immediate: false,
});

const itemsTampil = computed<KartuStokKainRow[]>(() => items.value ?? []);

onMounted(async () => {
  try {
    const res = await kartuStokKainService.getGudang();
    daftarGudang.value = res.data?.data ?? [];
  } catch {
    toast.error("Gagal memuat daftar gudang.");
  }
  fetchData();
});
watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);
watch(() => filterState.value.gudang, fetchData);

const onUpdateExpanded = async (baru: KartuStokKainRow[]) => {
  expandedRows.value = baru;
  const f = filterState.value;
  const belumDimuat = baru.filter(
    (r) => !detailCache.value[r.kode] && !expandedLoading.value[r.kode],
  );
  for (const r of belumDimuat) {
    expandedLoading.value[r.kode] = true;
    try {
      const res = await kartuStokKainService.getDetail({
        kode: r.kode,
        tglAwal: f.dtAwal,
        tglAkhir: f.dtAkhir,
        gudang: f.gudang,
      });
      detailCache.value[r.kode] = res.data?.data ?? [];
    } catch {
      toast.error(`Gagal memuat detail ${r.kode}`);
    } finally {
      expandedLoading.value[r.kode] = false;
    }
  }
};

// --- Tampilan ---
const headers = [
  { title: "Kode Bahan", key: "kode", width: "110px" },
  { title: "Nama Bahan", key: "nama", width: "300px" },
  { title: "Konstruksi", key: "konstruksi", width: "90px" },
  { title: "Panjang", key: "panjang", width: "80px", align: "end" },
  { title: "Lebar", key: "lebar", width: "70px", align: "end" },
  { title: "Stock Awal", key: "stock_awal", width: "120px", align: "end" },
  { title: "Jml In", key: "jml_in", width: "120px", align: "end" },
  { title: "Jml Out", key: "jml_out", width: "120px", align: "end" },
  { title: "Stock Akhir", key: "stock_akhir", width: "120px", align: "end" },
  { title: "Satuan", key: "satuan", width: "70px" },
];

const angka = (v: number | null | undefined): string => {
  const n = Number(v) || 0;
  if (n === 0) return "-";
  const s = Math.abs(n).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `(${s})` : s;
};

const kolomTotal = ["stock_awal", "jml_in", "jml_out", "stock_akhir"] as const;

const summaryFormatters: Record<string, (rows: KartuStokKainRow[]) => string> =
  {
    kode: (rows) => `TOTAL (${rows.length})`,
    ...Object.fromEntries(
      kolomTotal.map((k) => [
        k,
        (rows: KartuStokKainRow[]) =>
          angka(rows.reduce((a, r) => a + (Number(r[k]) || 0), 0)),
      ]),
    ),
  };

const totalDetail = (kode: string, kolom: "jml_in" | "jml_out"): number =>
  (detailCache.value[kode] ?? []).reduce((a, d) => a + d[kolom], 0);

// --- Export ---
const NUM = '#,##0.00_);[Red](#,##0.00);"-"_)';

const kolomMaster: ExcelColumn[] = [
  { header: "KODE BAHAN", key: "kode", width: 13 },
  { header: "NAMA BAHAN", key: "nama", width: 42 },
  { header: "DIVISI", key: "divisi", width: 11 },
  { header: "KATEGORI", key: "kategori", width: 20 },
  { header: "PANJANG", key: "panjang", width: 10, align: "right", numFmt: NUM },
  { header: "LEBAR", key: "lebar", width: 9, align: "right", numFmt: NUM },
  { header: "KONSTRUKSI", key: "konstruksi", width: 13 },
  {
    header: "STOCK AWAL",
    key: "stock_awal",
    width: 14,
    align: "right",
    numFmt: NUM,
  },
  { header: "JML IN", key: "jml_in", width: 14, align: "right", numFmt: NUM },
  { header: "JML OUT", key: "jml_out", width: 14, align: "right", numFmt: NUM },
  {
    header: "STOCK AKHIR",
    key: "stock_akhir",
    width: 14,
    align: "right",
    numFmt: NUM,
  },
  { header: "SATUAN", key: "satuan", width: 9 },
];

const kolomDetail: ExcelColumn[] = [
  { header: "NOMOR REF", key: "nomor_ref", width: 20 },
  { header: "TANGGAL", key: "tanggal", width: 12, align: "center" },
  { header: "KETERANGAN", key: "keterangan", width: 28 },
  { header: "GUDANG", key: "gudang", width: 26 },
  { header: "IN", key: "d_in", width: 13, align: "right", numFmt: NUM },
  { header: "OUT", key: "d_out", width: 13, align: "right", numFmt: NUM },
];

type NilaiExcel = string | number | null;
type ExportRow = Record<string, NilaiExcel>;

const barisMaster = (r: KartuStokKainRow): ExportRow => ({
  kode: r.kode,
  nama: r.nama,
  divisi: r.divisi,
  kategori: r.kategori,
  panjang: r.panjang,
  lebar: r.lebar,
  konstruksi: r.konstruksi,
  stock_awal: r.stock_awal,
  jml_in: r.jml_in,
  jml_out: r.jml_out,
  stock_akhir: r.stock_akhir,
  satuan: r.satuan,
});

const namaGudangTerpilih = computed<string>(
  () =>
    daftarGudang.value.find((g) => g.kode === filterState.value.gudang)?.nama ??
    "",
);

const kopExcel = () => {
  const f = filterState.value;
  const tambahan = ["Kategori Bahan: BAHAN BAKU UTAMA"];
  if (f.gudang)
    tambahan.push(`Gudang: ${namaGudangTerpilih.value || f.gudang}`);
  return buatKopPreLines(
    "KARTU STOK KAIN",
    `Periode: ${formatTanggal(f.dtAwal)} s.d ${formatTanggal(f.dtAkhir)}`,
    tambahan,
  );
};

const gayaExcel = {
  headerColor: "9DC3E6",
  headerFontColor: "000000",
  zebra: false,
  autoFilter: false,
  rowStyleFn: (row: ExportRow) =>
    row._gaya === "total" ? { bold: true, fillColor: "9DC3E6" } : null,
};

const onExport = async () => {
  if (!canExport.value) {
    return toast.error("Akses ditolak: Anda tidak memiliki izin untuk export.");
  }
  const data = baseBrowseRef.value?.getFilteredItems() ?? itemsTampil.value;
  if (data.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }

  const rows: ExportRow[] = data.map(barisMaster);
  const total: ExportRow = { kode: "TOTAL:", _gaya: "total" };
  for (const k of kolomTotal) {
    total[k] = data.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  }
  rows.push(total);

  const f = filterState.value;
  try {
    await exportExcel(`Kartu_Stok_Kain_${f.dtAwal}_${f.dtAkhir}.xlsx`, [
      {
        sheetName: "kartustokkain",
        columns: kolomMaster,
        rows,
        preLines: kopExcel(),
        ...gayaExcel,
      },
    ]);
    toast.success("Berhasil export Kartu Stok Kain.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor data.");
  }
};

// Export Detail: satu header; nilai master hanya di baris pertama tiap bahan
const isExportingDetail = ref(false);

const onExportDetail = async () => {
  if (!canExport.value) {
    return toast.error("Akses ditolak: Anda tidak memiliki izin untuk export.");
  }
  const data = baseBrowseRef.value?.getFilteredItems() ?? itemsTampil.value;
  if (data.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }

  const f = filterState.value;
  isExportingDetail.value = true;
  try {
    const res = await kartuStokKainService.getDetail({
      tglAwal: f.dtAwal,
      tglAkhir: f.dtAkhir,
      gudang: f.gudang,
    });
    const perKode = new Map<string, KartuStokKainDetailRow[]>();
    for (const d of res.data?.data ?? []) {
      const daftar = perKode.get(d.kode) ?? [];
      daftar.push(d);
      perKode.set(d.kode, daftar);
    }

    const rows: ExportRow[] = [];
    for (const r of data) {
      const detail = perKode.get(r.kode) ?? [];
      if (detail.length === 0) {
        rows.push(barisMaster(r));
        continue;
      }
      detail.forEach((d, i) => {
        rows.push({
          ...(i === 0 ? barisMaster(r) : {}),
          nomor_ref: d.nomor_ref,
          tanggal: formatTanggal(d.tanggal),
          keterangan: d.keterangan,
          gudang: d.gudang,
          d_in: d.jml_in,
          d_out: d.jml_out,
        });
      });
    }

    await exportExcel(`Kartu_Stok_Kain_Detail_${f.dtAwal}_${f.dtAkhir}.xlsx`, [
      {
        sheetName: "kartustokkaindetail",
        columns: [...kolomMaster, ...kolomDetail],
        rows,
        preLines: kopExcel(),
        ...gayaExcel,
      },
    ]);
    toast.success("Berhasil export detail Kartu Stok Kain.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor detail.");
  } finally {
    isExportingDetail.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Kartu Stok Kain"
    menu-id="963"
    storage-id="spanduk-kartu-stok-kain"
    :icon="IconNotebook"
    :headers="headers"
    :items="itemsTampil"
    :is-loading="isLoading"
    :can-export="canExport"
    v-model:filter-state="filterState"
    :summary-columns="[...kolomTotal]"
    :summary-formatters="summaryFormatters"
    :items-per-page="200"
    item-value="kode"
    search-placeholder="Cari kode / nama bahan..."
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <span class="ks-lbl">Periode</span>
      <input v-model="filterState.dtAwal" type="date" class="ks-inp" />
      <span class="ks-lbl">s/d</span>
      <input v-model="filterState.dtAkhir" type="date" class="ks-inp" />

      <span class="ks-lbl ks-sep">Gudang</span>
      <select v-model="filterState.gudang" class="ks-inp ks-gudang">
        <option value="">Semua Gudang</option>
        <option v-for="g in daftarGudang" :key="g.kode" :value="g.kode">
          {{ g.nama }}
        </option>
      </select>
    </template>

    <template #extra-actions>
      <v-btn
        v-if="canExport"
        size="small"
        color="green-darken-3"
        variant="outlined"
        class="ml-2"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend>
          <IconFileSpreadsheet :size="15" :stroke-width="1.7" />
        </template>
        Export Detail
      </v-btn>
    </template>

    <template #item.panjang="{ item }">{{ angka(item.panjang) }}</template>
    <template #item.lebar="{ item }">{{ angka(item.lebar) }}</template>
    <template #item.stock_awal="{ item }">
      <span :class="{ neg: item.stock_awal < 0 }">{{
        angka(item.stock_awal)
      }}</span>
    </template>
    <template #item.jml_in="{ item }">{{ angka(item.jml_in) }}</template>
    <template #item.jml_out="{ item }">{{ angka(item.jml_out) }}</template>
    <template #item.stock_akhir="{ item }">
      <span :class="{ neg: item.stock_akhir < 0 }">{{
        angka(item.stock_akhir)
      }}</span>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="expandedLoading[item.kode]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">Transaksi - {{ item.kode }}</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="100" class="text-center">Tanggal</th>
                <th width="170">No. Referensi</th>
                <th width="200">Keterangan</th>
                <th>Gudang</th>
                <th width="110" class="tr">In</th>
                <th width="110" class="tr">Out</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in detailCache[item.kode]" :key="i">
                <td class="text-center">{{ formatTanggal(d.tanggal) }}</td>
                <td>{{ d.nomor_ref }}</td>
                <td>{{ d.keterangan }}</td>
                <td>{{ d.gudang }}</td>
                <td class="tr">{{ angka(d.jml_in) }}</td>
                <td class="tr">{{ angka(d.jml_out) }}</td>
              </tr>
              <tr v-if="!detailCache[item.kode]?.length">
                <td colspan="6" class="text-center text-grey">
                  Tidak ada transaksi pada periode ini (hanya saldo awal).
                </td>
              </tr>
              <tr v-else class="total-row">
                <td colspan="4">TOTAL</td>
                <td class="tr">
                  {{ angka(totalDetail(item.kode, "jml_in")) }}
                </td>
                <td class="tr">
                  {{ angka(totalDetail(item.kode, "jml_out")) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.ks-lbl {
  font-size: 11px;
  font-weight: 500;
}
.ks-sep {
  margin-left: 8px;
}
.ks-inp {
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
}
.ks-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
.ks-gudang {
  min-width: 180px;
}
.neg {
  color: #c62828;
}
.expand-wrap {
  padding: 10px 10px 10px 40px;
  background: #eceff1;
}
.expand-title {
  font-size: 11px;
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
.total-row td {
  font-weight: bold;
  background: #e3f2fd;
}
.tr {
  text-align: right !important;
}
</style>
