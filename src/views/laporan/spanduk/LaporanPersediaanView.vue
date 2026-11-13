<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { IconPackages } from "@tabler/icons-vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportExcel, type ExcelColumn } from "@/utils/excelExport";
import { buatKopPreLines } from "@/utils/kopLaporan";
import { formatTanggal } from "@/utils/dateFormat";
import {
  laporanPersediaanService,
  type LaporanPersediaanGudang,
  type LaporanPersediaanRow,
} from "@/services/laporan/spanduk/laporanPersediaanService";

const toast = useToast();

type KunciGudang = `g_${string}`;
type BarisGrid = Omit<LaporanPersediaanRow, "stok"> &
  Partial<Record<KunciGudang, number>>;

const kunciGudang = (kode: string): KunciGudang => `g_${kode}`;

const pad = (n: number): string => String(n).padStart(2, "0");
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const filterState = ref({
  tanggal: ymd(new Date()),
  sembunyiNol: false,
});
const gudang = ref<LaporanPersediaanGudang[]>([]);
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const ratakan = (
  r: LaporanPersediaanRow,
  daftarGudang: LaporanPersediaanGudang[],
): BarisGrid => {
  const { stok, ...lain } = r;
  const perGudang: Partial<Record<KunciGudang, number>> = {};
  daftarGudang.forEach((g) => {
    perGudang[kunciGudang(g.kode)] = stok[g.kode] ?? 0;
  });
  return { ...lain, ...perGudang };
};

const { items, isLoading, canExport, fetchData } = useBrowse<BarisGrid>({
  menuId: "963",
  fetchApi: async () => {
    const f = filterState.value;
    if (!f.tanggal) {
      toast.warning("Tanggal periode wajib diisi.");
      return [];
    }
    const res = await laporanPersediaanService.getBrowse({
      tanggal: f.tanggal,
      sembunyiNol: f.sembunyiNol,
    });
    const data = res.data?.data;
    gudang.value = data?.gudang ?? [];
    return (data?.rows ?? []).map((r) => ratakan(r, gudang.value));
  },
  immediate: false,
});

const itemsTampil = computed<BarisGrid[]>(() => items.value ?? []);

onMounted(fetchData);
watch(() => filterState.value.tanggal, fetchData);
watch(() => filterState.value.sembunyiNol, fetchData);

// --- Tampilan ---
const headers = computed(() => [
  { title: "Kode Bahan", key: "kode", width: "100px" },
  { title: "Nama Bahan", key: "nama", width: "260px" },
  { title: "Supplier", key: "supplier_nama", width: "200px" },
  { title: "Konstruksi", key: "konstruksi", width: "90px" },
  { title: "Satuan", key: "satuan", width: "70px" },
  { title: "Lebar", key: "lebar", width: "70px", align: "end" },
  { title: "Panjang", key: "panjang", width: "80px", align: "end" },
  ...gudang.value.map((g) => ({
    title: g.nama,
    key: kunciGudang(g.kode),
    width: "120px",
    align: "end",
  })),
  { title: "Jumlah", key: "jumlah", width: "120px", align: "end" },
]);

const angka = (v: number | null | undefined): string => {
  const n = Number(v) || 0;
  if (n === 0) return "-";
  const s = Math.abs(n).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `(${s})` : s;
};

const stokGudang = (r: BarisGrid, kode: string): number =>
  r[kunciGudang(kode)] ?? 0;

const nilaiKolom = (r: BarisGrid, kunci: string): number =>
  Number((r as Record<string, unknown>)[kunci]) || 0;

const kolomTotal = computed<string[]>(() => [
  ...gudang.value.map((g) => kunciGudang(g.kode)),
  "jumlah",
]);

const summaryFormatters = computed<
  Record<string, (rows: BarisGrid[]) => string>
>(() => ({
  kode: (rows) => `TOTAL (${rows.length})`,
  ...Object.fromEntries(
    kolomTotal.value.map((k) => [
      k,
      (rows: BarisGrid[]) =>
        angka(rows.reduce((a, r) => a + nilaiKolom(r, k), 0)),
    ]),
  ),
}));

// --- Export ---
const NUM = '#,##0.00_);[Red](#,##0.00);"-"_)';

const kolomExcel = computed<ExcelColumn[]>(() => [
  { header: "DIVISI", key: "divisi", width: 11 },
  { header: "KATEGORI", key: "kategori", width: 20 },
  { header: "KODE BAHAN", key: "kode", width: 13 },
  { header: "SUPPLIER", key: "supplier_kode", width: 10, align: "right" },
  { header: "NAMA BAHAN", key: "nama", width: 38 },
  { header: "NAMA SUPPLIER", key: "supplier_nama", width: 28 },
  { header: "KONSTRUKSI", key: "konstruksi", width: 13 },
  { header: "SATUAN", key: "satuan", width: 9 },
  { header: "LEBAR", key: "lebar", width: 9, align: "right", numFmt: NUM },
  { header: "PANJANG", key: "panjang", width: 10, align: "right", numFmt: NUM },
  ...gudang.value.map<ExcelColumn>((g) => ({
    header: "LOKASI GUDANG",
    subHeader: g.nama,
    key: kunciGudang(g.kode),
    width: 14,
    align: "right",
    numFmt: NUM,
  })),
  { header: "JUMLAH", key: "jumlah", width: 15, align: "right", numFmt: NUM },
]);

type NilaiExcel = string | number | null;
type ExportRow = Record<string, NilaiExcel>;

const onExport = async () => {
  if (!canExport.value) {
    return toast.error("Akses ditolak: Anda tidak memiliki izin untuk export.");
  }
  const data = baseBrowseRef.value?.getFilteredItems() ?? itemsTampil.value;
  if (data.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }

  const rows: ExportRow[] = data.map((r) => {
    const baris: ExportRow = {
      divisi: r.divisi,
      kategori: r.kategori,
      kode: r.kode,
      supplier_kode: r.supplier_kode,
      nama: r.nama,
      supplier_nama: r.supplier_nama,
      konstruksi: r.konstruksi,
      satuan: r.satuan,
      lebar: r.lebar,
      panjang: r.panjang,
      jumlah: r.jumlah,
    };
    gudang.value.forEach((g) => {
      baris[kunciGudang(g.kode)] = stokGudang(r, g.kode);
    });
    return baris;
  });

  const total: ExportRow = { divisi: "TOTAL:", _gaya: "total" };
  kolomTotal.value.forEach((k) => {
    total[k] = data.reduce((a, r) => a + nilaiKolom(r, k), 0);
  });
  rows.push(total);

  // Blok tanda tangan (sama dengan Delphi)
  rows.push({});
  rows.push({ kode: "TERTANDA,", nama: "MENGETAHUI," });
  rows.push({});
  rows.push({
    kode: "ADMIN GUDANG",
    nama: "SUPERVISOR GUDANG",
    supplier_nama: "MANAGER GUDANG",
  });
  for (let i = 0; i < 3; i++) rows.push({});
  const garis = "(                              )";
  rows.push({ kode: garis, nama: garis, supplier_nama: garis });

  const f = filterState.value;
  const periode = `Periode: ${formatTanggal(f.tanggal)}`;

  try {
    await exportExcel(`Laporan_Persediaan_${f.tanggal}.xlsx`, [
      {
        sheetName: "laporanpersediaan",
        columns: kolomExcel.value,
        rows,
        preLines: buatKopPreLines("LAPORAN PERSEDIAAN", periode, [
          "Kategori Bahan: BAHAN BAKU UTAMA",
        ]),
        headerColor: "9DC3E6",
        headerFontColor: "000000",
        zebra: false,
        autoFilter: false,
        rowStyleFn: (row: ExportRow) =>
          row._gaya === "total" ? { bold: true, fillColor: "9DC3E6" } : null,
      },
    ]);
    toast.success("Berhasil export Laporan Persediaan.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor data.");
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Laporan Persediaan"
    menu-id="963"
    storage-id="spanduk-laporan-persediaan"
    :icon="IconPackages"
    :headers="headers"
    :items="itemsTampil"
    :is-loading="isLoading"
    :can-export="canExport"
    v-model:filter-state="filterState"
    :summary-columns="kolomTotal"
    :summary-formatters="summaryFormatters"
    :items-per-page="200"
    item-value="kode"
    search-placeholder="Cari kode / nama bahan / supplier..."
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <span class="lp-lbl">Per Tanggal</span>
      <input v-model="filterState.tanggal" type="date" class="lp-inp" />
      <label class="lp-chk">
        <input v-model="filterState.sembunyiNol" type="checkbox" />
        Sembunyikan stok 0
      </label>
    </template>

    <template #item.lebar="{ item }">{{ angka(item.lebar) }}</template>
    <template #item.panjang="{ item }">{{ angka(item.panjang) }}</template>
    <template
      v-for="g in gudang"
      :key="g.kode"
      #[`item.${kunciGudang(g.kode)}`]="{ item }"
    >
      <span :class="{ neg: stokGudang(item, g.kode) < 0 }">{{
        angka(stokGudang(item, g.kode))
      }}</span>
    </template>
    <template #item.jumlah="{ item }">
      <span :class="{ neg: item.jumlah < 0 }">{{ angka(item.jumlah) }}</span>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.lp-lbl {
  font-size: 11px;
  font-weight: 500;
}
.lp-inp {
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
}
.lp-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
.lp-chk {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  font-size: 11px;
  cursor: pointer;
}
.neg {
  color: #c62828;
}
</style>
