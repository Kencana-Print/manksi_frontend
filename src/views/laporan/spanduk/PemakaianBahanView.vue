<script setup lang="ts">
// Rekap Pemakaian Kain: LHK Cetak x kain + master + stok per gudang (satu tabel, tanpa tab).
import { computed, ref, watch } from "vue";
import { IconRuler } from "@tabler/icons-vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportExcel, type ExcelColumn } from "@/utils/excelExport";
import { buatKopPreLines } from "@/utils/kopLaporan";
import {
  pemakaianBahanService,
  type PemakaianBahanData,
  type PemakaianBahanRow,
} from "@/services/laporan/spanduk/pemakaianBahanService";
import { formatTanggal } from "@/utils/dateFormat";

type Baris = Record<string, unknown>;

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hariIni = new Date();
const dtAwal = ref(ymd(new Date(hariIni.getFullYear(), hariIni.getMonth(), 1)));
const dtAkhir = ref(ymd(hariIni));

const data = ref<PemakaianBahanData>({ rows: [], gudang: [] });

const { items, isLoading, canExport, fetchData } = useBrowse<PemakaianBahanRow>(
  {
    menuId: "963",
    immediate: false,
    fetchApi: async () => {
      const res = await pemakaianBahanService.getBrowse({
        tglAwal: dtAwal.value,
        tglAkhir: dtAkhir.value,
      });
      data.value = res.data?.data ?? { rows: [], gudang: [] };
      return data.value.rows;
    },
  },
);

let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  [dtAwal, dtAkhir],
  () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (dtAwal.value && dtAkhir.value) fetchData();
    }, 300);
  },
  { immediate: true },
);

const sesiLabel = (s: unknown) =>
  Number(s) === 1 ? "PAGI" : Number(s) === 2 ? "SIANG" : String(s ?? "");
const fmt = (v: unknown) =>
  v == null || v === ""
    ? ""
    : Number(v).toLocaleString("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
const sel = (item: unknown, key: string): unknown => (item as Baris)[key];

const headers = computed(() => [
  { title: "Tanggal", key: "Tanggal", width: 100 },
  { title: "Nomor LHK", key: "Nomor_LHK", width: 150 },
  { title: "Sesi", key: "Sesi", width: 80 },
  { title: "Pabrik", key: "Kode_Pabrik", width: 90 },
  { title: "Kode Bahan", key: "Kode_Bahan", width: 120 },
  { title: "Kode Supplier", key: "Kode_Supplier", width: 110 },
  { title: "Nama Bahan", key: "Nama_Bahan", width: 240 },
  { title: "Nama Supplier", key: "Nama_Supplier", width: 200 },
  { title: "Konstruksi", key: "Konstruksi", width: 110 },
  { title: "Satuan", key: "Satuan", width: 80 },
  { title: "Lebar", key: "Lebar", width: 80, align: "end" as const },
  ...data.value.gudang.map((g) => ({
    title: g.nama,
    key: `g_${g.kode}`,
    width: 120,
    align: "end" as const,
  })),
  { title: "Jumlah (m)", key: "Qty_Meter", width: 110, align: "end" as const },
]);

// Ratakan Gudang{} jadi kolom g_<kode> agar bisa disortir/difilter BaseBrowse
const tampil = computed<Baris[]>(() =>
  (items.value ?? []).map((r) => {
    const o: Baris = { ...r };
    for (const g of data.value.gudang)
      o[`g_${g.kode}`] = r.Gudang?.[g.kode] ?? 0;
    return o;
  }),
);

const browseRef = ref<{ getFilteredItems?: () => Baris[] } | null>(null);

async function onExport() {
  const list = browseRef.value?.getFilteredItems?.() ?? tampil.value;
  const gudang = data.value.gudang;
  const total = list.reduce((a, r) => a + (Number(r.Qty_Meter) || 0), 0);

  // Kolom non-gudang tanpa subHeader (di-merge vertikal); gudang: header pita + subHeader nama gudang
  const kolom: ExcelColumn[] = [
    { header: "TANGGAL", key: "Tanggal", width: 12 },
    { header: "NOMOR LHK", key: "Nomor_LHK", width: 20 },
    { header: "SESI", key: "SesiL", width: 9 },
    { header: "PABRIK", key: "Kode_Pabrik", width: 10 },
    { header: "KODE BAHAN", key: "Kode_Bahan", width: 14 },
    { header: "KODE SUPPLIER", key: "Kode_Supplier", width: 14 },
    { header: "NAMA BAHAN", key: "Nama_Bahan", width: 34 },
    { header: "NAMA SUPPLIER", key: "Nama_Supplier", width: 28 },
    { header: "KONSTRUKSI", key: "Konstruksi", width: 14 },
    { header: "SATUAN", key: "Satuan", width: 10 },
    {
      header: "LEBAR",
      key: "Lebar",
      width: 9,
      numFmt: "#,##0.00",
      align: "right",
    },
    ...gudang.map((g) => ({
      header: "LOKASI GUDANG",
      subHeader: g.nama.toUpperCase(),
      key: `g_${g.kode}`,
      width: 16,
      numFmt: "#,##0.00",
      align: "right",
    })),
    {
      header: "JUMLAH",
      key: "Qty_Meter",
      width: 14,
      numFmt: "#,##0.00",
      align: "right",
    },
  ];

  const rows: Baris[] = list.map((r) => ({
    ...r,
    Tanggal: formatTanggal(r.Tanggal as string),
    SesiL: sesiLabel(r.Sesi),
  }));
  rows.push({ Nomor_LHK: "TOTAL", Qty_Meter: total, _total: true });

  // Blok tanda tangan (baris data, karena exportExcel tidak punya footer)
  rows.push(
    {},
    { Nomor_LHK: "TERTANDA,", Nama_Supplier: "MENGETAHUI," },
    {},
    {},
    {},
  );
  rows.push({
    Nomor_LHK: "ADMIN GUDANG",
    Nama_Bahan: "SUPERVISOR GUDANG",
    Nama_Supplier: "MANAGER GUDANG",
  });

  await exportExcel(
    `Rekap_Pemakaian_Kain_${dtAwal.value}_${dtAkhir.value}.xlsx`,
    [
      {
        sheetName: "Pemakaian Kain",
        columns: kolom,
        rows,
        preLines: buatKopPreLines(
          "LAPORAN PEMAKAIAN BAHAN",
          `Periode: ${dtAwal.value} s/d ${dtAkhir.value}`,
          ["Kategori Bahan : BAHAN BAKU UTAMA"],
        ),
        headerColor: "9DC3E6",
        headerFontColor: "000000",
        zebra: false,
        autoFilter: false, // agar baris TOTAL dan tanda tangan tidak ikut tersortir
        rowStyleFn: (r) =>
          r._total ? { fillColor: "9DC3E6", bold: true } : null,
      },
    ],
  );
}
</script>

<template>
  <BaseBrowse
    ref="browseRef"
    title="Rekap Pemakaian Kain"
    menu-id="963"
    storage-id="spanduk-pemakaian-bahan"
    :icon="IconRuler"
    :headers="headers"
    :items="tampil"
    :is-loading="isLoading"
    :can-export="canExport"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <v-text-field
        v-model="dtAwal"
        type="date"
        label="Dari"
        density="compact"
        hide-details
        style="max-width: 160px"
      />
      <v-text-field
        v-model="dtAkhir"
        type="date"
        label="Sampai"
        density="compact"
        hide-details
        style="max-width: 160px"
      />
    </template>
    <template #extra-actions>
      <v-btn disabled size="small">Return</v-btn>
    </template>
    <template #item.Sesi="{ item }">{{
      sesiLabel(sel(item, "Sesi"))
    }}</template>
    <template #item.Tanggal="{ item }">{{
      formatTanggal(sel(item, "Tanggal") as string)
    }}</template>
    <template #item.Qty_Meter="{ item }">{{
      fmt(sel(item, "Qty_Meter"))
    }}</template>
    <template
      v-for="g in data.gudang"
      :key="g.kode"
      #[`item.g_${g.kode}`]="{ item }"
      >{{ fmt(sel(item, `g_${g.kode}`)) }}</template
    >
  </BaseBrowse>
</template>
