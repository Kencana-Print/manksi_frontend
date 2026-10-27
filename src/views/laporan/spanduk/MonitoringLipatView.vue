<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useToast } from "vue-toastification";
import { IconFold, IconSearch, IconX } from "@tabler/icons-vue";
import LaporanTable from "@/components/laporan/LaporanTable.vue";
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import type {
  LaporanKolom,
  LaporanTableApi,
} from "@/components/laporan/laporanTypes";
import { useBrowse } from "@/composables/useBrowse";
import {
  monitoringLipatService,
  type MonitoringLipatRow,
} from "@/services/laporan/spanduk/monitoringLipatService";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();

interface PerusahaanPilihan {
  perush_kode: string;
  perush_nama: string;
  perush_alamat?: string;
}

interface FilterState {
  dtAwal: string;
  dtAkhir: string;
  perusahaanKode: string;
  perusahaanNama: string;
}

const pad = (n: number): string => String(n).padStart(2, "0");
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filter = ref<FilterState>({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
  perusahaanKode: "",
  perusahaanNama: "",
});
const showPerusahaan = ref(false);
const tabel = ref<LaporanTableApi<MonitoringLipatRow> | null>(null);

// Parameter yang dipakai saat data diambil (bukan nilai input yang sedang diubah)
const periodeTampil = ref({
  awal: filter.value.dtAwal,
  akhir: filter.value.dtAkhir,
  perusahaanKode: "",
  perusahaanNama: "",
});

const { items, isLoading, canExport, fetchData } =
  useBrowse<MonitoringLipatRow>({
    menuId: "963",
    fetchApi: async () => {
      const res = await monitoringLipatService.getBrowse({
        tglAwal: periodeTampil.value.awal,
        tglAkhir: periodeTampil.value.akhir,
        perusahaan: periodeTampil.value.perusahaanKode || undefined,
      });
      return res.data?.data ?? [];
    },
    immediate: false,
  });

const itemsTampil = computed<MonitoringLipatRow[]>(() => items.value ?? []);

const onPerusahaanDipilih = (p: PerusahaanPilihan) => {
  filter.value.perusahaanKode = p.perush_kode;
  filter.value.perusahaanNama = p.perush_nama;
};
const kosongkanPerusahaan = () => {
  filter.value.perusahaanKode = "";
  filter.value.perusahaanNama = "";
};

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
  periodeTampil.value = {
    awal: f.dtAwal,
    akhir: f.dtAkhir,
    perusahaanKode: f.perusahaanKode,
    perusahaanNama: f.perusahaanNama,
  };
  await fetchData();
};

const angka = (
  key: string,
  title: string,
  group: string,
  opsi: Partial<LaporanKolom> = {},
): LaporanKolom => ({
  key,
  title,
  group,
  width: 85,
  tipe: "number",
  total: true,
  align: "right",
  excelWidth: 12,
  ...opsi,
});

const columns: LaporanKolom[] = [
  { key: "Hari", title: "Hari", width: 70, excelWidth: 10 },
  { key: "Tanggal", title: "Tanggal", width: 90, tipe: "date", excelWidth: 12 },
  { key: "Perusahaan", title: "Perusahaan", width: 90, excelWidth: 12 },
  {
    key: "Tgl_SPK",
    title: "Tanggal SPK",
    width: 95,
    tipe: "date",
    excelWidth: 12,
  },
  {
    key: "Deadline",
    title: "Deadline",
    width: 90,
    tipe: "date",
    excelWidth: 12,
  },
  {
    key: "Jenis_Kode",
    title: "Kode",
    group: "Jenis Order",
    width: 60,
    excelWidth: 8,
  },
  {
    key: "Jenis_Nama",
    title: "Nama",
    group: "Jenis Order",
    width: 130,
    excelWidth: 18,
  },
  { key: "Nama", title: "Nama SPK", width: 340, excelWidth: 70 },
  { key: "Nomor", title: "Nomor SPK", width: 160, excelWidth: 20 },
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
  {
    key: "Jml_Order",
    title: "J Order",
    width: 85,
    tipe: "number",
    total: true,
    align: "right",
    excelWidth: 12,
  },
  {
    key: "J_Meter",
    title: "J. Meter",
    width: 95,
    tipe: "number",
    total: true,
    align: "right",
    excelWidth: 13,
  },
  { key: "Kain", title: "Kain", width: 130, excelWidth: 18 },
  {
    key: "Kurang",
    title: "Kurang",
    width: 85,
    tipe: "number",
    total: true,
    negativeRed: true,
    align: "right",
    excelWidth: 12,
  },
  angka("Jml_P01", "P01", "Jumlah Lipat", { width: 70 }),
  angka("Jml_P02", "P02", "Jumlah Lipat"),
  angka("Jml_Lipat", "Jumlah", "Jumlah Lipat"),
  angka("Meter_P01", "P01", "Meter", { width: 80 }),
  angka("Meter_P02", "P02", "Meter", { width: 95 }),
  angka("Meter_Lipat", "Jumlah", "Meter", { width: 95 }),
];

const onExport = () => {
  const p = periodeTampil.value;
  tabel.value?.exportToExcel({
    fileName: `Monitoring_Lipat_${p.awal}_${p.akhir}`,
    sheetName: "monitoringlipat",
    judul: "LAPORAN MONITORING LIPAT",
    periode: `Periode: ${formatTanggal(p.awal)} s.d ${formatTanggal(p.akhir)}`,
  });
};

onMounted(() => muatData());
</script>

<template>
  <LaporanTable
    ref="tabel"
    v-model:filter-state="filter"
    title="Laporan Monitoring Lipat"
    menu-id="963"
    storage-id="spanduk-monitoring-lipat"
    :icon="IconFold"
    :columns="columns"
    :items="itemsTampil"
    row-key="Nomor"
    satuan="SPK"
    search-placeholder="Cari nomor SPK / nama SPK..."
    :is-loading="isLoading"
    :can-export="canExport"
    @refresh="muatData"
    @export="onExport"
  >
    <template #filter-left>
      <span class="ml-lbl">Periode</span>
      <input v-model="filter.dtAwal" type="date" class="ml-inp" />
      <span class="ml-lbl">s.d</span>
      <input v-model="filter.dtAkhir" type="date" class="ml-inp" />

      <span class="ml-lbl ml-sep">Perusahaan</span>
      <input
        :value="filter.perusahaanKode"
        readonly
        placeholder="Semua"
        class="ml-inp ml-kode"
        @click="showPerusahaan = true"
      />
      <button
        type="button"
        class="ml-btn-ic"
        title="Pilih perusahaan"
        @click="showPerusahaan = true"
      >
        <IconSearch :size="14" :stroke-width="1.8" />
      </button>
      <input :value="filter.perusahaanNama" readonly class="ml-inp ml-nama-p" />
      <button
        v-if="filter.perusahaanKode"
        type="button"
        class="ml-btn-ic"
        title="Kosongkan perusahaan"
        @click="kosongkanPerusahaan"
      >
        <IconX :size="14" :stroke-width="1.8" />
      </button>
    </template>
  </LaporanTable>

  <PerusahaanSearchModal
    v-model="showPerusahaan"
    @selected="onPerusahaanDipilih"
  />
</template>

<style scoped>
.ml-lbl {
  font-size: 11px;
  font-weight: 500;
}
.ml-sep {
  margin-left: 8px;
}
.ml-inp {
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
}
.ml-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
.ml-kode {
  width: 70px;
  cursor: pointer;
}
.ml-nama-p {
  width: 200px;
}
.ml-btn-ic {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
}
.ml-btn-ic:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}
</style>
