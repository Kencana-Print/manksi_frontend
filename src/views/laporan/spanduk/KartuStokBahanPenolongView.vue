<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { IconClipboardList, IconFileSpreadsheet } from "@tabler/icons-vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportExcel, type ExcelColumn } from "@/utils/excelExport";
import { buatKopPreLines } from "@/utils/kopLaporan";
import { formatTanggal } from "@/utils/dateFormat";
import {
  DAFTAR_JENIS_PENOLONG,
  kartuStokBahanPenolongService,
  type JenisPenolong,
  type KartuStokPenolongCabang,
  type KartuStokPenolongDetailRow,
  type KartuStokPenolongRow,
} from "@/services/laporan/spanduk/kartuStokBahanPenolongService";

const toast = useToast();

const TANPA_MASTER = "(tidak ada di master jenis ini)";

const pad = (n: number): string => String(n).padStart(2, "0");
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filterState = ref<{
  dtAwal: string;
  dtAkhir: string;
  jenis: JenisPenolong;
  cabang: string;
}>({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
  jenis: "OBAT",
  cabang: "",
});
const daftarCabang = ref<KartuStokPenolongCabang[]>([]);
// Server mengunci cabang user biasa; dropdown hanya berguna bila ada pilihan
const tampilCabang = computed<boolean>(() => daftarCabang.value.length > 1);
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// --- Expand (detail transaksi, lazy load) ---
const expandedRows = ref<KartuStokPenolongRow[]>([]);
const detailCache = ref<Record<string, KartuStokPenolongDetailRow[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const { items, isLoading, canExport, fetchData } =
  useBrowse<KartuStokPenolongRow>({
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
      const res = await kartuStokBahanPenolongService.getBrowse({
        jenis: f.jenis,
        tglAwal: f.dtAwal,
        tglAkhir: f.dtAkhir,
        cabang: f.cabang,
      });
      return res.data?.data ?? [];
    },
    immediate: false,
  });

const itemsTampil = computed<KartuStokPenolongRow[]>(() => items.value ?? []);

const muatCabang = async () => {
  try {
    const res = await kartuStokBahanPenolongService.getCabang(
      filterState.value.jenis,
    );
    daftarCabang.value = res.data?.data ?? [];
    const dipilih = filterState.value.cabang;
    if (dipilih && !daftarCabang.value.some((c) => c.kode === dipilih)) {
      filterState.value.cabang = "";
    }
  } catch {
    toast.error("Gagal memuat daftar cabang.");
  }
};

onMounted(async () => {
  await muatCabang();
  fetchData();
});
watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);
watch(() => filterState.value.cabang, fetchData);
watch(
  () => filterState.value.jenis,
  async () => {
    const sebelum = filterState.value.cabang;
    await muatCabang();
    // Bila cabang ikut direset, watcher cabang sudah memuat ulang
    if (filterState.value.cabang === sebelum) fetchData();
  },
);

const kunciParameter = (): string => {
  const f = filterState.value;
  return [f.jenis, f.cabang, f.dtAwal, f.dtAkhir].join("|");
};

const onUpdateExpanded = async (baru: KartuStokPenolongRow[]) => {
  expandedRows.value = baru;
  const f = { ...filterState.value };
  const kunciAwal = kunciParameter();
  const belumDimuat = baru.filter(
    (r) => !detailCache.value[r.kode] && !expandedLoading.value[r.kode],
  );
  for (const r of belumDimuat) {
    expandedLoading.value[r.kode] = true;
    try {
      const res = await kartuStokBahanPenolongService.getDetail({
        kode: r.kode,
        jenis: f.jenis,
        tglAwal: f.dtAwal,
        tglAkhir: f.dtAkhir,
        cabang: f.cabang,
      });
      // Filter berubah selagi memuat: hasil lama dibuang
      if (kunciAwal === kunciParameter()) {
        detailCache.value[r.kode] = res.data?.data ?? [];
      }
    } catch {
      toast.error(`Gagal memuat detail ${r.kode}`);
    } finally {
      expandedLoading.value[r.kode] = false;
    }
  }
};

// --- Tampilan ---
const headers = [
  { title: "Kode", key: "kode", width: "130px" },
  { title: "Nama", key: "nama", width: "300px" },
  { title: "Kategori", key: "kategori", width: "90px" },
  { title: "Spesifikasi", key: "spesifikasi", width: "200px" },
  { title: "Stock Awal", key: "stock_awal", width: "110px", align: "end" },
  { title: "Jml In", key: "jml_in", width: "110px", align: "end" },
  { title: "Jml Out", key: "jml_out", width: "110px", align: "end" },
  { title: "Stock Akhir", key: "stock_akhir", width: "110px", align: "end" },
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

const summaryFormatters: Record<
  string,
  (rows: KartuStokPenolongRow[]) => string
> = {
  kode: (rows) => `TOTAL (${rows.length})`,
  ...Object.fromEntries(
    kolomTotal.map((k) => [
      k,
      (rows: KartuStokPenolongRow[]) =>
        angka(rows.reduce((a, r) => a + (Number(r[k]) || 0), 0)),
    ]),
  ),
};

const totalDetail = (kode: string, kolom: "jml_in" | "jml_out"): number =>
  (detailCache.value[kode] ?? []).reduce((a, d) => a + d[kolom], 0);

// --- Export ---
const NUM = '#,##0.00_);[Red](#,##0.00);"-"_)';

const kolomMaster: ExcelColumn[] = [
  { header: "KODE", key: "kode", width: 16 },
  { header: "NAMA", key: "nama", width: 42 },
  { header: "KATEGORI", key: "kategori", width: 13 },
  { header: "SPESIFIKASI", key: "spesifikasi", width: 28 },
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
  { header: "IN", key: "d_in", width: 13, align: "right", numFmt: NUM },
  { header: "OUT", key: "d_out", width: 13, align: "right", numFmt: NUM },
];

type NilaiExcel = string | number | null;
type ExportRow = Record<string, NilaiExcel>;

const barisMaster = (r: KartuStokPenolongRow): ExportRow => ({
  kode: r.kode,
  nama: r.nama,
  kategori: r.kategori,
  spesifikasi: r.spesifikasi,
  stock_awal: r.stock_awal,
  jml_in: r.jml_in,
  jml_out: r.jml_out,
  stock_akhir: r.stock_akhir,
  satuan: r.satuan,
});

const kopExcel = () => {
  const f = filterState.value;
  const tambahan = [`Jenis Barang: ${f.jenis}`];
  if (f.cabang) tambahan.push(`Cabang: ${f.cabang}`);
  return buatKopPreLines(
    "KARTU STOK BAHAN PENOLONG",
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

// "ATK/RTK" mengandung karakter yang tidak boleh ada di nama berkas
const namaBerkas = (awalan: string): string => {
  const f = filterState.value;
  const jenis = f.jenis.replace(/[^A-Za-z0-9]+/g, "_");
  return `${awalan}_${jenis}_${f.dtAwal}_${f.dtAkhir}.xlsx`;
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

  try {
    await exportExcel(namaBerkas("Kartu_Stok_Bahan_Penolong"), [
      {
        sheetName: "kartustokpenolong",
        columns: kolomMaster,
        rows,
        preLines: kopExcel(),
        ...gayaExcel,
      },
    ]);
    toast.success("Berhasil export Kartu Stok Bahan Penolong.");
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

  const f = { ...filterState.value };
  isExportingDetail.value = true;
  try {
    const res = await kartuStokBahanPenolongService.getDetail({
      jenis: f.jenis,
      tglAwal: f.dtAwal,
      tglAkhir: f.dtAkhir,
      cabang: f.cabang,
    });
    const perKode = new Map<string, KartuStokPenolongDetailRow[]>();
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
          d_in: d.jml_in,
          d_out: d.jml_out,
        });
      });
    }

    await exportExcel(namaBerkas("Kartu_Stok_Bahan_Penolong_Detail"), [
      {
        sheetName: "kartustokpenolongdetail",
        columns: [...kolomMaster, ...kolomDetail],
        rows,
        preLines: kopExcel(),
        ...gayaExcel,
      },
    ]);
    toast.success("Berhasil export detail Kartu Stok Bahan Penolong.");
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
    title="Kartu Stok Bahan Penolong"
    menu-id="963"
    storage-id="spanduk-kartu-stok-bahan-penolong"
    :icon="IconClipboardList"
    :headers="headers"
    :items="itemsTampil"
    :is-loading="isLoading"
    :can-export="canExport"
    v-model:filter-state="filterState"
    :summary-columns="[...kolomTotal]"
    :summary-formatters="summaryFormatters"
    :items-per-page="200"
    item-value="kode"
    search-placeholder="Cari kode / nama barang..."
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="kp-radio">
        <label
          v-for="j in DAFTAR_JENIS_PENOLONG"
          :key="j"
          class="kp-radio-item"
        >
          <input v-model="filterState.jenis" type="radio" :value="j" />
          {{ j }}
        </label>
      </div>

      <span class="kp-lbl kp-sep">Periode</span>
      <input v-model="filterState.dtAwal" type="date" class="kp-inp" />
      <span class="kp-lbl">s/d</span>
      <input v-model="filterState.dtAkhir" type="date" class="kp-inp" />

      <template v-if="tampilCabang">
        <span class="kp-lbl kp-sep">Cabang</span>
        <select v-model="filterState.cabang" class="kp-inp">
          <option value="">Semua Cabang</option>
          <option v-for="c in daftarCabang" :key="c.kode" :value="c.kode">
            {{ c.kode }}
          </option>
        </select>
      </template>
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

    <template #item.nama="{ item }">
      <span :class="{ orphan: item.nama === TANPA_MASTER }">{{
        item.nama
      }}</span>
    </template>
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
                <th>Keterangan</th>
                <th width="110" class="tr">In</th>
                <th width="110" class="tr">Out</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in detailCache[item.kode]" :key="i">
                <td class="text-center">{{ formatTanggal(d.tanggal) }}</td>
                <td>{{ d.nomor_ref }}</td>
                <td>{{ d.keterangan }}</td>
                <td class="tr">{{ angka(d.jml_in) }}</td>
                <td class="tr">{{ angka(d.jml_out) }}</td>
              </tr>
              <tr v-if="!detailCache[item.kode]?.length">
                <td colspan="5" class="text-center text-grey">
                  Tidak ada transaksi pada periode ini (hanya saldo awal).
                </td>
              </tr>
              <tr v-else class="total-row">
                <td colspan="3">TOTAL</td>
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
.kp-radio {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
  height: 28px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
}
.kp-radio-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}
.kp-lbl {
  font-size: 11px;
  font-weight: 500;
}
.kp-sep {
  margin-left: 8px;
}
.kp-inp {
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
}
.kp-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
.neg {
  color: #c62828;
}
.orphan {
  color: #c62828;
  font-style: italic;
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
