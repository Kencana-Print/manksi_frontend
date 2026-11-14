<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
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
  type LpkGrain,
} from "@/services/laporan/spanduk/laporanLpkBulananService";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();

type BarisLpk = LpkBulananRow & {
  id: string;
  bulanLabel: string;
  hari: string;
};

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
const NAMA_HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const pad = (n: number): string => String(n).padStart(2, "0");
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Default: awal bulan s.d. hari ini
const periodeDefault = (): FilterState => {
  const s = new Date();
  return {
    dtAwal: ymd(new Date(s.getFullYear(), s.getMonth(), 1)),
    dtAkhir: ymd(s),
  };
};

// ── State per tab (Harian / Bulanan) ──
const tab = ref<LpkGrain>("hari");
const tabel = ref<LaporanTableApi<BarisLpk> | null>(null);

const filter = ref<Record<LpkGrain, FilterState>>({
  hari: periodeDefault(),
  bulan: periodeDefault(),
});
// Periode yang dipakai saat data diambil (bukan nilai input yang sedang diubah)
const periodeTampil = ref<Record<LpkGrain, { awal: string; akhir: string }>>({
  hari: { awal: filter.value.hari.dtAwal, akhir: filter.value.hari.dtAkhir },
  bulan: { awal: filter.value.bulan.dtAwal, akhir: filter.value.bulan.dtAkhir },
});
const catatan = ref<Record<LpkGrain, LpkBulananCatatan>>({
  hari: { returTanpaSpk: 0 },
  bulan: { returTanpaSpk: 0 },
});

const buatBrowse = (grain: LpkGrain) =>
  useBrowse<LpkBulananRow>({
    menuId: "963",
    fetchApi: async () => {
      const res = await laporanLpkBulananService.getData({
        tglAwal: periodeTampil.value[grain].awal,
        tglAkhir: periodeTampil.value[grain].akhir,
        grain,
      });
      catatan.value[grain] = res.data?.data?.catatan ?? { returTanpaSpk: 0 };
      return res.data?.data?.rows ?? [];
    },
    immediate: false,
  });

const browse = { hari: buatBrowse("hari"), bulan: buatBrowse("bulan") };

const isLoading = computed(() => browse[tab.value].isLoading.value);
const canExport = computed(() => browse[tab.value].canExport.value);
const catatanAktif = computed(() => catatan.value[tab.value]);

const lintasTahun = computed(
  () =>
    new Set((browse.bulan.items.value ?? []).map((r) => r.periode.slice(0, 4)))
      .size > 1,
);

const labelBulan = (ym: string): string => {
  const [tahun, bulan] = ym.split("-");
  const nama = NAMA_BULAN[Number(bulan) - 1] ?? ym;
  return lintasTahun.value ? `${nama} ${tahun}` : nama;
};

const namaHari = (tgl: string): string =>
  NAMA_HARI[new Date(`${tgl}T00:00:00`).getDay()] ?? "";

const itemsTampil = computed<BarisLpk[]>(() =>
  (browse[tab.value].items.value ?? []).map((r) => ({
    ...r,
    id: `${r.periode}|${r.spk}`,
    bulanLabel: tab.value === "bulan" ? labelBulan(r.periode) : "",
    hari: tab.value === "hari" ? namaHari(r.periode) : "",
  })),
);

const muatData = async (grain: LpkGrain = tab.value) => {
  const f = filter.value[grain];
  if (!f.dtAwal || !f.dtAkhir) {
    toast.warning("Periode wajib diisi.");
    return;
  }
  if (f.dtAwal > f.dtAkhir) {
    toast.warning("Tanggal awal tidak boleh melebihi tanggal akhir.");
    return;
  }
  periodeTampil.value[grain] = { awal: f.dtAwal, akhir: f.dtAkhir };
  await browse[grain].fetchData();
};

// Komponen tabel dibuat ulang saat tab berganti (key), lalu data tab itu dimuat.
// nextTick: beri kesempatan filter tersimpan tab itu dipulihkan komponen.
watch(tab, async (grain) => {
  await nextTick();
  await muatData(grain);
});

onMounted(() => muatData());

// ── Kolom ──
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

// Kolom di depan berbeda per tab; mulai Kd Produk sampai Waste sama.
const kolomDepan: Record<LpkGrain, LaporanKolom[]> = {
  hari: [
    {
      key: "periode",
      title: "Tanggal",
      tipe: "date",
      width: 110,
      excelWidth: 12,
    },
    { key: "lokasi", title: "Lokasi", width: 110, excelWidth: 12 },
    { key: "hari", title: "Hari", width: 90, excelWidth: 10 },
  ],
  bulan: [
    { key: "lokasi", title: "Lokasi", width: 110, excelWidth: 12 },
    { key: "bulanLabel", title: "Bulan", width: 105, excelWidth: 12 },
  ],
};

const kolomBersama: LaporanKolom[] = [
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

const columns = computed<LaporanKolom[]>(() => [
  ...kolomDepan[tab.value],
  ...kolomBersama,
]);

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
  const p = periodeTampil.value[tab.value];
  const nama = tab.value === "hari" ? "Harian" : "Bulanan";
  tabel.value?.exportToExcel({
    fileName: `Laporan_LPK_${nama}_${p.awal}_${p.akhir}`,
    sheetName: `LPK ${nama}`,
    judul: `LAPORAN LPK ${nama.toUpperCase()}`,
    periode: `Periode: ${formatTanggal(p.awal)} s.d ${formatTanggal(p.akhir)}`,
  });
};
</script>

<template>
  <LaporanTable
    :key="tab"
    ref="tabel"
    v-model:filter-state="filter[tab]"
    title="Laporan LPK"
    menu-id="963"
    :storage-id="`spanduk-laporan-lpk-${tab}`"
    :icon="IconReportAnalytics"
    :columns="columns"
    :items="itemsTampil"
    row-key="id"
    satuan="baris"
    search-placeholder="Cari SPK / nama SPK / kain / supplier..."
    :is-loading="isLoading"
    :can-export="canExport"
    :footer-tambahan="footerTambahan"
    @refresh="muatData(tab)"
    @export="onExport"
  >
    <template #filter-left>
      <v-btn-toggle
        v-model="tab"
        mandatory
        divided
        density="compact"
        variant="outlined"
        color="primary"
        class="lk-tab"
      >
        <v-btn value="hari">Harian</v-btn>
        <v-btn value="bulan">Bulanan</v-btn>
      </v-btn-toggle>
      <span class="lk-lbl">Periode</span>
      <input v-model="filter[tab].dtAwal" type="date" class="lk-inp" />
      <span class="lk-lbl">s.d</span>
      <input v-model="filter[tab].dtAkhir" type="date" class="lk-inp" />
    </template>

    <template #filter-right>
      <v-chip
        v-if="catatanAktif.returTanpaSpk > 0"
        size="small"
        color="warning"
        variant="tonal"
      >
        Retur tanpa SPK {{ catatanAktif.returTanpaSpk }} yd tidak ikut dihitung
      </v-chip>
    </template>
  </LaporanTable>
</template>

<style scoped>
.lk-lbl {
  font-size: 11px;
  font-weight: 500;
}
.lk-inp {
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
}
.lk-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
.lk-tab {
  height: 28px;
}
.lk-tab :deep(.v-btn) {
  font-size: 11px;
  height: 28px;
  padding: 0 12px;
}
</style>
