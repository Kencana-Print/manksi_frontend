<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useToast } from "vue-toastification";
import { IconPalette } from "@tabler/icons-vue";
import LaporanTable from "@/components/laporan/LaporanTable.vue";
import type {
  LaporanKolom,
  LaporanTableApi,
} from "@/components/laporan/laporanTypes";
import { useBrowse } from "@/composables/useBrowse";
import {
  monitoringHasilProofService,
  type MonitoringHasilProofRow,
} from "@/services/laporan/spanduk/monitoringHasilProofService";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();

interface FilterState {
  dtAwal: string;
  dtAkhir: string;
}

const pad = (n: number): string => String(n).padStart(2, "0");
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filter = ref<FilterState>({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
});
const tabel = ref<LaporanTableApi<MonitoringHasilProofRow> | null>(null);

// Periode yang dipakai saat data diambil (bukan nilai input yang sedang diubah)
const periodeTampil = ref({
  awal: filter.value.dtAwal,
  akhir: filter.value.dtAkhir,
});

const { items, isLoading, canExport, fetchData } =
  useBrowse<MonitoringHasilProofRow>({
    menuId: "963",
    fetchApi: async () => {
      const res = await monitoringHasilProofService.getBrowse({
        tglAwal: periodeTampil.value.awal,
        tglAkhir: periodeTampil.value.akhir,
      });
      return res.data?.data ?? [];
    },
    immediate: false,
  });

const itemsTampil = computed<MonitoringHasilProofRow[]>(
  () => items.value ?? [],
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
  opsi: Partial<LaporanKolom> = {},
): LaporanKolom => ({
  key,
  title,
  width: 85,
  tipe: "number",
  total: true,
  align: "right",
  excelWidth: 11,
  ...opsi,
});

const ukuran = (key: string, title: string): LaporanKolom =>
  angka(key, title, {
    group: "Uraian Plangkan",
    width: 48,
    excelWidth: 7,
  });

const warna = (n: number): LaporanKolom => ({
  key: `Warna${n}`,
  title: String(n),
  group: "Urutan Jalan Cetak",
  width: 90,
  excelWidth: 14,
});

const columns: LaporanKolom[] = [
  { key: "Hari", title: "Hari", width: 70, excelWidth: 10 },
  { key: "Tanggal", title: "Tanggal", width: 90, tipe: "date", excelWidth: 12 },
  { key: "Nomor_LHK", title: "Nomor LHK", width: 130, excelWidth: 17 },
  { key: "Nama", title: "Nama SPK", width: 340, excelWidth: 70 },
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
  { key: "Nomor", title: "Nomor SPK", width: 160, excelWidth: 20 },
  ukuran("U050", "0.50"),
  ukuran("U100", "1"),
  ukuran("U120", "1.2"),
  ukuran("U150", "1.5"),
  ukuran("U180", "1.8"),
  ukuran("U230", "2.3"),
  ukuran("U250", "2.5"),
  ukuran("U280", "2.8"),
  ukuran("U350", "3.5"),
  ukuran("U400", "4"),
  ukuran("U450", "4.5"),
  ukuran("U550", "5.5"),
  ukuran("U580", "5.8"),
  ukuran("U650", "6.5"),
  ukuran("U750", "7.5"),
  angka("J_Plangkan", "J. Plangkan", { width: 90, excelWidth: 12 }),
  warna(1),
  warna(2),
  warna(3),
  warna(4),
  warna(5),
  warna(6),
  warna(7),
  warna(8),
  warna(9),
  warna(10),
  angka("J_Proof", "Jumlah Proof", { width: 95, excelWidth: 13 }),
  { key: "Kain", title: "Jenis Kain", width: 130, excelWidth: 18 },
  angka("Meter_Bahan", "Meter Bahan", { width: 95, excelWidth: 13 }),
  angka("Jumlah_Meter", "Jumlah Meter", { width: 95, excelWidth: 13 }),
];

const onExport = () => {
  const p = periodeTampil.value;
  tabel.value?.exportToExcel({
    fileName: `Monitoring_Hasil_Proof_${p.awal}_${p.akhir}`,
    sheetName: "monitoringhasilproof",
    judul: "LAPORAN MONITORING HASIL PROOF",
    periode: `Periode: ${formatTanggal(p.awal)} s.d ${formatTanggal(p.akhir)}`,
  });
};

onMounted(() => muatData());
</script>

<template>
  <LaporanTable
    ref="tabel"
    v-model:filter-state="filter"
    title="Laporan Monitoring Hasil Proof"
    menu-id="963"
    storage-id="spanduk-monitoring-hasil-proof"
    :icon="IconPalette"
    :columns="columns"
    :items="itemsTampil"
    row-key="Kunci"
    satuan="baris"
    search-placeholder="Cari nomor LHK / nomor SPK / nama SPK / warna..."
    :is-loading="isLoading"
    :can-export="canExport"
    @refresh="muatData"
    @export="onExport"
  >
    <template #filter-left>
      <span class="mh-lbl">Periode</span>
      <input v-model="filter.dtAwal" type="date" class="mh-inp" />
      <span class="mh-lbl">s.d</span>
      <input v-model="filter.dtAkhir" type="date" class="mh-inp" />
    </template>
  </LaporanTable>
</template>

<style scoped>
.mh-lbl {
  font-size: 11px;
  font-weight: 500;
}
.mh-inp {
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
}
.mh-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
</style>
