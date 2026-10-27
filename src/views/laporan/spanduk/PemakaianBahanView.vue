<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { IconRuler, IconArrowBackUp } from "@tabler/icons-vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportExcel, type ExcelColumn } from "@/utils/excelExport";
import { buatKopPreLines } from "@/utils/kopLaporan";
import { formatTanggal } from "@/utils/dateFormat";
import {
  pemakaianBahanService,
  type PemakaianBahanRow,
} from "@/services/laporan/spanduk/pemakaianBahanService";

const toast = useToast();

const pad = (n: number): string => String(n).padStart(2, "0");
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filterState = ref({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
});
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const { items, isLoading, canExport, fetchData } = useBrowse<PemakaianBahanRow>(
  {
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
      const res = await pemakaianBahanService.getBrowse({
        tglAwal: f.dtAwal,
        tglAkhir: f.dtAkhir,
      });
      return res.data?.data ?? [];
    },
    immediate: false,
  },
);

const itemsTampil = computed<PemakaianBahanRow[]>(() => items.value ?? []);

onMounted(fetchData);
watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);

// --- Tampilan ---
const headers = [
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Nomor LHK", key: "Nomor_LHK", width: "150px" },
  { title: "Sesi", key: "Sesi", width: "80px", align: "center" },
  { title: "Pabrik", key: "Kode_Pabrik", width: "80px" },
  { title: "Kode Bahan", key: "Kode_Bahan", width: "100px" },
  { title: "Nama Kain", key: "Nama_Bahan", width: "300px" },
  { title: "Lebar", key: "Lebar", width: "80px", align: "end" },
  { title: "Qty (meter)", key: "Qty_Meter", width: "120px", align: "end" },
];

const sesiLabel = (s: string | null | undefined): string =>
  s === "PAGI" ? "Pagi" : s === "SIANG" ? "Siang" : "-";

const angka = (v: number | null | undefined): string =>
  (Number(v) || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const totalQty = (rows: PemakaianBahanRow[]): number =>
  rows.reduce((a, r) => a + (Number(r.Qty_Meter) || 0), 0);

const summaryFormatters: Record<string, (rows: PemakaianBahanRow[]) => string> =
  {
    Tanggal: (rows) => `TOTAL (${rows.length})`,
    Qty_Meter: (rows) => angka(totalQty(rows)),
  };

// --- Export ---
const NUM = "#,##0.00";

const kolomExcel: ExcelColumn[] = [
  { header: "TANGGAL", key: "Tanggal", width: 14, align: "center" },
  { header: "NOMOR LHK", key: "Nomor_LHK", width: 20 },
  { header: "SESI", key: "Sesi", width: 10, align: "center" },
  { header: "PABRIK", key: "Kode_Pabrik", width: 10 },
  { header: "KODE BAHAN", key: "Kode_Bahan", width: 14 },
  { header: "NAMA KAIN", key: "Nama_Bahan", width: 44 },
  { header: "LEBAR", key: "Lebar", width: 10, align: "right" },
  {
    header: "QTY (METER)",
    key: "Qty_Meter",
    width: 16,
    align: "right",
    numFmt: NUM,
  },
];

type NilaiExcel = string | number | null;
type ExportRow = Record<Exclude<keyof PemakaianBahanRow, "Kunci">, NilaiExcel>;

const barisKosong = (): ExportRow => ({
  Tanggal: null,
  Nomor_LHK: null,
  Sesi: null,
  Kode_Pabrik: null,
  Kode_Bahan: null,
  Nama_Bahan: null,
  Lebar: null,
  Qty_Meter: null,
});

const onExport = async () => {
  if (!canExport.value) {
    return toast.error("Akses ditolak: Anda tidak memiliki izin untuk export.");
  }
  const data = baseBrowseRef.value?.getFilteredItems() ?? itemsTampil.value;
  if (data.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }

  const rows: ExportRow[] = data.map((r) => ({
    Tanggal: formatTanggal(r.Tanggal),
    Nomor_LHK: r.Nomor_LHK,
    Sesi: sesiLabel(r.Sesi),
    Kode_Pabrik: r.Kode_Pabrik ?? "",
    Kode_Bahan: String(r.Kode_Bahan),
    Nama_Bahan: r.Nama_Bahan ?? "",
    Lebar: r.Lebar ?? "",
    Qty_Meter: Number(r.Qty_Meter) || 0,
  }));

  const total = barisKosong();
  total.Tanggal = "TOTAL";
  total.Qty_Meter = totalQty(data);
  rows.push(total);

  // Blok tanda tangan (sama dengan Delphi)
  rows.push(barisKosong());
  const judul = barisKosong();
  judul.Tanggal = "TERTANDA";
  judul.Nama_Bahan = "MENGETAHUI";
  rows.push(judul);
  for (let i = 0; i < 3; i++) rows.push(barisKosong());
  const nama = barisKosong();
  nama.Tanggal = "ADMIN GUDANG";
  nama.Nama_Bahan = "SUPERVISOR GUDANG";
  nama.Qty_Meter = "MANAGER GUDANG";
  rows.push(nama);

  const f = filterState.value;
  const periode = `Periode: ${formatTanggal(f.dtAwal)} s.d ${formatTanggal(f.dtAkhir)}`;
  const penanda = new Set(["TOTAL", "TERTANDA", "ADMIN GUDANG"]);

  try {
    await exportExcel(`Pemakaian_Bahan_${f.dtAwal}_${f.dtAkhir}.xlsx`, [
      {
        sheetName: "pemakaianbahan",
        columns: kolomExcel,
        rows,
        preLines: buatKopPreLines("LAPORAN PEMAKAIAN BAHAN", periode),
        rowStyleFn: (row: ExportRow) =>
          row.Tanggal !== null && penanda.has(String(row.Tanggal))
            ? { bold: true }
            : null,
      },
    ]);
    toast.success("Berhasil export Laporan Pemakaian Bahan.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor data.");
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Laporan Pemakaian Bahan"
    menu-id="963"
    storage-id="spanduk-pemakaian-bahan"
    :icon="IconRuler"
    :headers="headers"
    :items="itemsTampil"
    :is-loading="isLoading"
    :can-export="canExport"
    v-model:filter-state="filterState"
    :summary-columns="['Qty_Meter']"
    :summary-formatters="summaryFormatters"
    :items-per-page="200"
    item-value="Kunci"
    search-placeholder="Cari nomor LHK / nama kain..."
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <span class="pb-lbl">Tanggal</span>
      <input v-model="filterState.dtAwal" type="date" class="pb-inp" />
      <span class="pb-lbl">s/d</span>
      <input v-model="filterState.dtAkhir" type="date" class="pb-inp" />
    </template>

    <template #extra-actions>
      <!-- Placeholder: Return aktif setelah terhubung dengan stok (PRD #82) -->
      <v-btn
        size="small"
        color="orange-darken-2"
        disabled
        title="Return tersedia setelah terhubung dengan stok"
      >
        <template #prepend><IconArrowBackUp :size="15" /></template>
        Return
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">{{
      formatTanggal(item.Tanggal)
    }}</template>
    <template #item.Sesi="{ item }">{{ sesiLabel(item.Sesi) }}</template>
    <template #item.Qty_Meter="{ item }">{{ angka(item.Qty_Meter) }}</template>
  </BaseBrowse>
</template>

<style scoped>
.pb-lbl {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.pb-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
}
</style>
