<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { IconListDetails } from "@tabler/icons-vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportExcel, type ExcelColumn } from "@/utils/excelExport";
import { buatKopPreLines } from "@/utils/kopLaporan";
import { formatTanggal } from "@/utils/dateFormat";
import {
  KOLOM_ANGKA,
  rekapMonitoringByGudangService,
  type JenisRekapMonitoring,
  type RekapMonitoringByGudangRow,
} from "@/services/laporan/spanduk/rekapMonitoringByGudangService";

const toast = useToast();

const pad = (n: number): string => String(n).padStart(2, "0");
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Bagian sama dengan pilihan Delphi (C/J/L/Q)
const BAGIAN: { kode: string; jenis: JenisRekapMonitoring }[] = [
  { kode: "C", jenis: "CETAK" },
  { kode: "J", jenis: "JAHIT" },
  { kode: "L", jenis: "LIPAT" },
  { kode: "Q", jenis: "QUIRING" },
];

const sekarang = new Date();
const filterState = ref({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
  jenis: "CETAK" as JenisRekapMonitoring,
});
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const { items, isLoading, canExport, fetchData } =
  useBrowse<RekapMonitoringByGudangRow>({
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
      const res = await rekapMonitoringByGudangService.getBrowse({
        tglAwal: f.dtAwal,
        tglAkhir: f.dtAkhir,
        jenis: f.jenis,
      });
      return res.data?.data ?? [];
    },
    immediate: false,
  });

const itemsTampil = computed<RekapMonitoringByGudangRow[]>(
  () => items.value ?? [],
);

onMounted(fetchData);
watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);
watch(() => filterState.value.jenis, fetchData);

// Quiring dikelompokkan per bagian (koli/oven/jemuran/potong), bukan pabrik
const judulKelompok = computed(() =>
  filterState.value.jenis === "QUIRING" ? "Bagian" : "Pabrik",
);

// --- Tampilan: satu header (BaseBrowse) ---
const headers = computed(() => [
  { title: judulKelompok.value, key: "Kelompok", width: "130px" },
  ...KOLOM_ANGKA.map((k) => ({
    title: k.replace("_", " "),
    key: k,
    width: "100px",
    align: "end",
  })),
]);

// Slot sel angka dibuat dinamis supaya tidak 12 template berulang
const kolomSlot = KOLOM_ANGKA.map((k) => ({ key: k, slot: `item.${k}` }));

const angka = (v: number | null | undefined): string => {
  const n = Number(v) || 0;
  const s = Math.abs(n).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `(${s})` : s;
};

const summaryFormatters: Record<
  string,
  (rows: RekapMonitoringByGudangRow[]) => string
> = {
  Kelompok: (rows) => `TOTAL (${rows.length})`,
  ...Object.fromEntries(
    KOLOM_ANGKA.map((k) => [
      k,
      (rows: RekapMonitoringByGudangRow[]) =>
        angka(rows.reduce((a, r) => a + (Number(r[k]) || 0), 0)),
    ]),
  ),
};

// --- Export: header dua tingkat (PCS / METER), TOTAL, tanda tangan ---
const NUM = "#,##0.00_);(#,##0.00)";

const buatKolomExcel = (judul: string): ExcelColumn[] => [
  { header: judul.toUpperCase(), key: "Kelompok", width: 16 },
  ...KOLOM_ANGKA.map((k) => ({
    header: k.startsWith("Pcs") ? "PCS" : "METER",
    subHeader: k.slice(k.indexOf("_") + 1).toUpperCase(),
    key: k,
    width: 13,
    align: "right" as const,
    numFmt: NUM,
  })),
];

type NilaiExcel = string | number | null;
type ExportRow = Record<keyof RekapMonitoringByGudangRow, NilaiExcel>;

const barisKosong = (): ExportRow =>
  Object.fromEntries([
    ["Kelompok", null],
    ...KOLOM_ANGKA.map((k) => [k, null]),
  ]) as ExportRow;

const onExport = async () => {
  if (!canExport.value) {
    return toast.error("Akses ditolak: Anda tidak memiliki izin untuk export.");
  }
  const data = baseBrowseRef.value?.getFilteredItems() ?? itemsTampil.value;
  if (data.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }

  const rows: ExportRow[] = data.map((r) => ({ ...r }));

  const total = barisKosong();
  total.Kelompok = "TOTAL";
  for (const k of KOLOM_ANGKA) {
    total[k] = data.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  }
  rows.push(total);

  // Blok tanda tangan (sama dengan Delphi)
  rows.push(barisKosong());
  const judulTtd = barisKosong();
  judulTtd.Kelompok = "TERTANDA";
  judulTtd.Meter_JA = "MENGETAHUI";
  rows.push(judulTtd);
  for (let i = 0; i < 3; i++) rows.push(barisKosong());
  const namaTtd = barisKosong();
  namaTtd.Kelompok = "ADMIN PRODUKSI";
  namaTtd.Meter_JA = "SUPERVISOR PRODUKSI";
  rows.push(namaTtd);

  const f = filterState.value;
  const periode = `Bagian: ${f.jenis} | Periode: ${formatTanggal(f.dtAwal)} s.d ${formatTanggal(f.dtAkhir)}`;
  const penanda = new Set(["TOTAL", "TERTANDA", "ADMIN PRODUKSI"]);

  try {
    await exportExcel(
      `Rekap_Monitoring_By_Gudang_${f.jenis}_${f.dtAwal}_${f.dtAkhir}.xlsx`,
      [
        {
          sheetName: "rekapmonitoringbygudang",
          columns: buatKolomExcel(judulKelompok.value),
          rows,
          preLines: buatKopPreLines(`LAPORAN REKAP LHK ${f.jenis}`, periode),
          rowStyleFn: (row: ExportRow) =>
            row.Kelompok !== null && penanda.has(String(row.Kelompok))
              ? { bold: true }
              : null,
        },
      ],
    );
    toast.success("Berhasil export Rekap Monitoring by Gudang.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor data.");
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Rekap Monitoring by Gudang"
    menu-id="963"
    storage-id="spanduk-rekap-monitoring-by-gudang"
    :icon="IconListDetails"
    :headers="headers"
    :items="itemsTampil"
    :is-loading="isLoading"
    :can-export="canExport"
    v-model:filter-state="filterState"
    :summary-columns="[...KOLOM_ANGKA]"
    :summary-formatters="summaryFormatters"
    :items-per-page="200"
    item-value="Kelompok"
    search-placeholder="Cari pabrik / bagian..."
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <span class="rk-lbl">Periode</span>
      <input v-model="filterState.dtAwal" type="date" class="rk-inp" />
      <span class="rk-lbl">s/d</span>
      <input v-model="filterState.dtAkhir" type="date" class="rk-inp" />

      <span class="rk-lbl rk-sep">Bagian</span>
      <select v-model="filterState.jenis" class="rk-inp rk-sel">
        <option v-for="b in BAGIAN" :key="b.jenis" :value="b.jenis">
          {{ b.kode }} - {{ b.jenis }}
        </option>
      </select>
    </template>

    <template v-for="c in kolomSlot" :key="c.key" #[c.slot]="{ item }">
      {{ angka(item[c.key]) }}
    </template>
  </BaseBrowse>
</template>

<style scoped>
.rk-lbl {
  font-size: 11px;
  font-weight: 500;
}
.rk-sep {
  margin-left: 8px;
}
.rk-inp {
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
}
.rk-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
.rk-sel {
  width: 150px;
  cursor: pointer;
}
</style>
