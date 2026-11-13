<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useToast } from "vue-toastification";
import { IconReportAnalytics } from "@tabler/icons-vue";
import LaporanTable from "@/components/laporan/LaporanTable.vue";
import type {
  LaporanFooterTambahan,
  LaporanKolom,
  LaporanTableApi,
} from "@/components/laporan/laporanTypes";
import { useBrowse } from "@/composables/useBrowse";
import {
  laporanLpkBulananService,
  type LpkBulananCatatan,
  type LpkBulananRow,
} from "@/services/laporan/spanduk/laporanLpkBulananService";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();

type BarisLpk = LpkBulananRow & { id: string; bulanLabel: string };

interface FilterState {
  dtAwal: string;
  dtAkhir: string;
}

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const pad = (n: number): string => String(n).padStart(2, "0");
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Default: awal bulan s.d. hari ini
const sekarang = new Date();
const filter = ref<FilterState>({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
});
const tabel = ref<LaporanTableApi<BarisLpk> | null>(null);
const catatan = ref<LpkBulananCatatan>({ returTanpaSpk: 0 });

// Periode yang dipakai saat data diambil (bukan nilai input yang sedang diubah)
const periodeTampil = ref({
  awal: filter.value.dtAwal,
  akhir: filter.value.dtAkhir,
});

const { items, isLoading, canExport, fetchData } = useBrowse<LpkBulananRow>({
  menuId: "963",
  fetchApi: async () => {
    const res = await laporanLpkBulananService.getData({
      tglAwal: periodeTampil.value.awal,
      tglAkhir: periodeTampil.value.akhir,
    });
    catatan.value = res.data?.data?.catatan ?? { returTanpaSpk: 0 };
    return res.data?.data?.rows ?? [];
  },
  immediate: false,
});

const lintasTahun = computed(
  () => new Set((items.value ?? []).map((r) => r.bulan.slice(0, 4))).size > 1,
);

const labelBulan = (ym: string): string => {
  const [tahun, bulan] = ym.split("-");
  const nama = NAMA_BULAN[Number(bulan) - 1] ?? ym;
  return lintasTahun.value ? `${nama} ${tahun}` : nama;
};

const itemsTampil = computed<BarisLpk[]>(() =>
  (items.value ?? []).map((r) => ({
    ...r,
    id: `${r.bulan}|${r.spk}`,
    bulanLabel: labelBulan(r.bulan),
  })),
);

const muatData = async () => {
  const f = filter.value;
  if (!f.dtAwal || !f.dtAkhir) {
    toast.warning("Periode wajib diisi.");
    return;
  }
  if (f.dtAwal > f.dtAkhir) {
    toast.warning("Tanggal awal tidak boleh melebihi tanggal akhir.");
    return;
  }
  periodeTampil.value = { awal: f.dtAwal, akhir: f.dtAkhir };
  await fetchData();
};

const angka = (
  key: string,
  title: string,
  group?: string,
  opsi: Partial<LaporanKolom> = {},
): LaporanKolom => ({
  key,
  title,
  group,
  width: 80,
  tipe: "number",
  total: true,
  align: "right",
  excelWidth: 11,
  ...opsi,
});

const PCS = { numFmt: "#,##0" };

const columns: LaporanKolom[] = [
  { key: "lokasi", title: "Lokasi", width: 110, excelWidth: 12 },
  { key: "bulanLabel", title: "Bulan", width: 105, excelWidth: 12 },
  { key: "kodeProduk", title: "Kd Produk", width: 135, excelWidth: 10 },
  angka("yardToleransi", "Yard", "Toleransi", { width: 85 }),
  angka("toleransiPersen", "Persen", "Toleransi", {
    width: 95,
    total: false,
    excelWidth: 9,
  }),
  { key: "nama", title: "Nama SPK", width: 300, excelWidth: 50 },
  angka("panjang", "Panjang", "Ukuran", {
    width: 105,
    total: false,
    excelWidth: 9,
  }),
  angka("lebar", "Lebar", "Ukuran", { width: 90, total: false, excelWidth: 9 }),
  { key: "spk", title: "No SPK", width: 160, excelWidth: 20 },
  { key: "kain", title: "Jenis Kain", width: 150, excelWidth: 18 },
  { key: "supplier", title: "Supplier", width: 170, excelWidth: 24 },
  angka("jmlOrder", "Pcs", "Order SPK", { ...PCS, width: 80 }),
  angka("yardOrder", "Yard", "Order SPK", { width: 85 }),
  angka("hasilCetak", "Pcs", "Hasil Cetak", { ...PCS, width: 80 }),
  angka("yardCetak", "Yard", "Hasil Cetak", { width: 85 }),
  angka("ambil", "Ambil", "Pemakaian Kain", { width: 90 }),
  angka("sisa", "Sisa", "Pemakaian Kain", { width: 85 }),
  angka("aktual", "Aktual", "Pemakaian Kain", { width: 100 }),
  angka("waste", "Kain", "Waste", { width: 85 }),
  angka("loss", "Loss", "Waste", { width: 85, negativeRed: true }),
  angka("persenLoss", "%", "Waste", {
    width: 75,
    total: false,
    negativeRed: true,
    excelWidth: 9,
  }),
];

// % total = (Σ waste + Σ loss) / Σ yard order × 100 (rumus footer Delphi);
// mengikuti pencarian dan filter kolom karena memakai total dari komponen.
const footerTambahan = (
  total: Record<string, number>,
): LaporanFooterTambahan[] => {
  const yardOrder = total.yardOrder ?? 0;
  const persen =
    yardOrder > 0
      ? (((total.waste ?? 0) + (total.loss ?? 0)) / yardOrder) * 100
      : 0;
  return [
    {
      labelKey: "loss",
      label: "% TOTAL",
      nilaiKey: "persenLoss",
      nilai: persen,
    },
  ];
};

const onExport = () => {
  const p = periodeTampil.value;
  tabel.value?.exportToExcel({
    fileName: `Laporan_LPK_Bulanan_${p.awal}_${p.akhir}`,
    sheetName: "LPK Bulanan",
    judul: "LAPORAN LPK BULANAN",
    periode: `Periode: ${formatTanggal(p.awal)} s.d ${formatTanggal(p.akhir)}`,
  });
};

onMounted(() => muatData());
</script>

<template>
  <LaporanTable
    ref="tabel"
    v-model:filter-state="filter"
    title="Laporan LPK Bulanan"
    menu-id="963"
    storage-id="spanduk-laporan-lpk-bulanan"
    :icon="IconReportAnalytics"
    :columns="columns"
    :items="itemsTampil"
    row-key="id"
    satuan="baris"
    search-placeholder="Cari SPK / nama SPK / kain / supplier..."
    :is-loading="isLoading"
    :can-export="canExport"
    :footer-tambahan="footerTambahan"
    @refresh="muatData"
    @export="onExport"
  >
    <template #filter-left>
      <span class="lb-lbl">Periode</span>
      <input v-model="filter.dtAwal" type="date" class="lb-inp" />
      <span class="lb-lbl">s.d</span>
      <input v-model="filter.dtAkhir" type="date" class="lb-inp" />
    </template>

    <template #filter-right>
      <v-chip
        v-if="catatan.returTanpaSpk > 0"
        size="small"
        color="warning"
        variant="tonal"
      >
        Retur tanpa SPK {{ catatan.returTanpaSpk }} yd tidak ikut dihitung
      </v-chip>
    </template>
  </LaporanTable>
</template>

<style scoped>
.lb-lbl {
  font-size: 11px;
  font-weight: 500;
}
.lb-inp {
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
}
.lb-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
</style>
