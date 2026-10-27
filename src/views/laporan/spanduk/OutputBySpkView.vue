<script setup lang="ts">
import { computed, ref } from "vue";
import { onMounted } from "vue";
import LaporanTable from "@/components/laporan/LaporanTable.vue";
import type {
  LaporanKolom,
  LaporanTableApi,
} from "@/components/laporan/laporanTypes";
import { useBrowse } from "@/composables/useBrowse";
import * as svc from "@/services/laporan/spanduk/outputBySpkService";
import type { OutputBySpkRow } from "@/services/laporan/spanduk/outputBySpkService";
import { formatTanggal } from "@/utils/dateFormat";

const pad = (n: number): string => String(n).padStart(2, "0");
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

interface FilterState {
  dtAwal: string;
  dtAkhir: string;
  status: "" | "Open" | "Closed";
}

const hariIni = new Date();
const filter = ref<FilterState>({
  dtAwal: ymd(new Date(hariIni.getFullYear(), hariIni.getMonth(), 1)),
  dtAkhir: ymd(hariIni),
  status: "",
});

const tabel = ref<LaporanTableApi<OutputBySpkRow> | null>(null);

// Periode yang dipakai saat data diambil (bukan nilai input yang sedang diubah)
const periodeTampil = ref({
  awal: filter.value.dtAwal,
  akhir: filter.value.dtAkhir,
});

const { items, isLoading, canExport, fetchData } = useBrowse<OutputBySpkRow>({
  menuId: "963",
  fetchApi: () =>
    svc.getOutputBySpk(periodeTampil.value.awal, periodeTampil.value.akhir),
  immediate: false,
});

const muatData = async () => {
  periodeTampil.value = {
    awal: filter.value.dtAwal,
    akhir: filter.value.dtAkhir,
  };
  await fetchData();
};

// Normalisasi: useBrowse bisa mengembalikan undefined sebelum data pertama dimuat
const semuaItems = computed<OutputBySpkRow[]>(() => items.value ?? []);

// Filter status Open/Closed dilakukan di sini, sebelum masuk ke tabel,
// sehingga total footer dan Excel otomatis mengikutinya.
const itemsTampil = computed<OutputBySpkRow[]>(() =>
  filter.value.status
    ? semuaItems.value.filter((r) => r.Status === filter.value.status)
    : semuaItems.value,
);

// Kolom MMT hanya muncul bila ada isinya (SPK Spanduk biasanya 0)
const adaMmt = computed(() =>
  semuaItems.value.some(
    (r) => r.MT01 + r.MT02 + r.MT03 + r.MT04 + r.MT05 + r.MI > 0,
  ),
);

const MMT = ["MT01", "MT02", "MT03", "MT04", "MT05", "MI"] as const;

const pcs = (
  key: string,
  title: string,
  group: string,
  width = 80,
): LaporanKolom => ({
  key,
  title,
  group,
  width,
  tipe: "number",
  total: true,
  align: "right",
  numFmt: "#,##0",
  excelWidth: 12,
});

const mtr = (
  key: string,
  title: string,
  group: string,
  width = 90,
): LaporanKolom => ({
  key,
  title,
  group,
  width,
  tipe: "number",
  total: true,
  align: "right",
  numFmt: "#,##0.00",
  excelWidth: 12,
});

const columns = computed<LaporanKolom[]>(() => {
  const dasar: LaporanKolom[] = [
    { key: "Memo", title: "Memo SPK", width: 120, excelWidth: 18 },
    { key: "Nomor", title: "Nomor SPK", width: 160, excelWidth: 20 },
    {
      key: "Tanggal",
      title: "Tgl SPK",
      width: 85,
      tipe: "date",
      excelWidth: 12,
    },
    {
      key: "Deadline",
      title: "Deadline",
      width: 85,
      tipe: "date",
      excelWidth: 12,
    },
    { key: "Nama", title: "Nama Order", width: 340, excelWidth: 48 },
    { key: "Sales", title: "Sales", width: 110, excelWidth: 16 },
    { key: "Jenis_Order", title: "Jenis Order", width: 120, excelWidth: 18 },
    { key: "Status", title: "Status Kirim", width: 85, excelWidth: 12 },
    {
      key: "Panjang",
      title: "Panjang",
      group: "Ukuran",
      width: 70,
      tipe: "number",
      align: "right",
      excelWidth: 10,
    },
    {
      key: "Lebar",
      title: "Lebar",
      group: "Ukuran",
      width: 60,
      tipe: "number",
      align: "right",
      excelWidth: 8,
    },
    { key: "Kain", title: "Bahan", width: 120, excelWidth: 16 },
    { key: "Finishing", title: "Finishing", width: 180, excelWidth: 26 },

    pcs("Jml_Order", "Order", "Jumlah (Pcs)"),
    pcs("Jml_Cetak", "Cetak", "Jumlah (Pcs)"),
    pcs("Jml_Jahit", "Jahit", "Jumlah (Pcs)"),
    pcs("Jml_Lipat", "Lipat", "Jumlah (Pcs)"),
    pcs("Jml_Koli", "Quiring", "Jumlah (Pcs)"),
    pcs("Jml_Jadi", "Jadi", "Jumlah (Pcs)"),
    pcs("Jml_Kirim", "Kirim", "Jumlah (Pcs)"),

    mtr("M_Cetak", "Cetak", "Meter"),
    mtr("M_Jahit", "Jahit", "Meter"),
    mtr("M_Lipat", "Lipat", "Meter"),
    mtr("M_Koli", "Quiring", "Meter"),
  ];

  if (!adaMmt.value) return dasar;

  return [
    ...dasar,
    ...MMT.map((k) => pcs(k, k, "MMT (Pcs)", 70)),
    ...MMT.map((k) => mtr(`${k}_M`, k, "MMT (Meter)", 80)),
  ];
});

const onExport = () => {
  const { awal, akhir } = periodeTampil.value;
  tabel.value?.exportToExcel({
    fileName: `Output_by_SPK_${awal}_${akhir}`,
    sheetName: "Output by SPK",
    judul: "LAPORAN OUTPUT BY SPK",
    periode: `Periode: ${formatTanggal(awal)} s.d ${formatTanggal(akhir)}`,
  });
};

onMounted(() => muatData());
</script>

<template>
  <LaporanTable
    ref="tabel"
    v-model:filter-state="filter"
    title="Output by SPK"
    menu-id="963"
    storage-id="spanduk-output-by-spk"
    :columns="columns"
    :items="itemsTampil"
    row-key="Nomor"
    satuan="SPK"
    search-placeholder="Cari nomor, memo, nama order, sales..."
    :is-loading="isLoading"
    :can-export="canExport"
    @refresh="muatData"
    @export="onExport"
  >
    <template #filter-left>
      <span class="flt-lbl">Periode</span>
      <input v-model="filter.dtAwal" type="date" class="flt-inp" />
      <span class="flt-lbl">s.d</span>
      <input v-model="filter.dtAkhir" type="date" class="flt-inp" />
      <select v-model="filter.status" class="flt-inp">
        <option value="">Semua status</option>
        <option value="Open">Open</option>
        <option value="Closed">Closed</option>
      </select>
    </template>
  </LaporanTable>
</template>

<style scoped>
.flt-lbl {
  font-size: 11px;
  font-weight: 500;
}
.flt-inp {
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
}
.flt-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
</style>
