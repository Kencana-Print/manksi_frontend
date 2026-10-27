<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useToast } from "vue-toastification";
import { IconAlertTriangle, IconSearch, IconX } from "@tabler/icons-vue";
import LaporanTable from "@/components/laporan/LaporanTable.vue";
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import type {
  LaporanFooterTambahan,
  LaporanKolom,
  LaporanTableApi,
} from "@/components/laporan/laporanTypes";
import { useBrowse } from "@/composables/useBrowse";
import {
  kekuranganProduksiService,
  type KekuranganProduksiRow,
} from "@/services/laporan/spanduk/kekuranganProduksiService";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();

// Konstanta hard-code di Delphi: kapasitas cetak (meter) per hari kerja
const KAPASITAS_METER_PER_HARI = 7500;

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
const dua = (v: number): number => Math.round(v * 100) / 100;

const sekarang = new Date();
const filter = ref<FilterState>({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
  perusahaanKode: "",
  perusahaanNama: "",
});
const showPerusahaan = ref(false);
const tabel = ref<LaporanTableApi<KekuranganProduksiRow> | null>(null);

// Parameter yang dipakai saat data diambil (bukan nilai input yang sedang diubah)
const periodeTampil = ref({
  awal: filter.value.dtAwal,
  akhir: filter.value.dtAkhir,
  perusahaanKode: "",
  perusahaanNama: "",
});

const { items, isLoading, canExport, fetchData } =
  useBrowse<KekuranganProduksiRow>({
    menuId: "963",
    fetchApi: async () => {
      const res = await kekuranganProduksiService.getBrowse({
        tglAwal: periodeTampil.value.awal,
        tglAkhir: periodeTampil.value.akhir,
        perusahaan: periodeTampil.value.perusahaanKode || undefined,
      });
      return res.data?.data ?? [];
    },
    immediate: false,
  });

const itemsTampil = computed<KekuranganProduksiRow[]>(() => items.value ?? []);

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
  width: 105,
  tipe: "number",
  total: true,
  align: "right",
  excelWidth: 13,
  ...opsi,
});
const kurang = (key: string, title: string, group: string): LaporanKolom =>
  angka(key, title, group, { sorotPositif: true });

const columns: LaporanKolom[] = [
  {
    key: "Tanggal",
    title: "TGL SPK",
    width: 130,
    tipe: "datetime",
    excelWidth: 17,
  },
  {
    key: "Deadline",
    title: "DEADLINE",
    width: 90,
    tipe: "date",
    excelWidth: 12,
  },
  { key: "Nama", title: "NAMA ORDER", width: 340, excelWidth: 60 },
  {
    key: "Panjang",
    title: "PANJANG",
    width: 70,
    tipe: "number",
    excelWidth: 9,
  },
  { key: "Lebar", title: "LEBAR", width: 60, tipe: "number", excelWidth: 8 },
  { key: "Nomor", title: "NOMOR SPK", width: 150, excelWidth: 20 },
  angka("Jml_Order", "PCS", "JML ORDER", { width: 90, excelWidth: 11 }),
  kurang("Kurang_Cetak", "PCS", "KURANG CETAK"),
  kurang("Kurang_Jahit", "PCS", "KURANG JAHIT"),
  kurang("Kurang_Lipat", "PCS", "KURANG LIPAT"),
  kurang("Kurang_Cetak_M", "METER", "KURANG CETAK"),
  kurang("Kurang_Jahit_M", "METER", "KURANG JAHIT"),
  kurang("Kurang_Lipat_M", "METER", "KURANG LIPAT"),
];

// Hari Kerja mengikuti baris yang tampil (pencarian dan filter kolom), seperti Delphi
const footerTambahan = (t: Record<string, number>): LaporanFooterTambahan[] => [
  {
    labelKey: "Kurang_Lipat",
    label: "Hari Kerja",
    nilaiKey: "Kurang_Cetak_M",
    nilai: dua((t.Kurang_Cetak_M ?? 0) / KAPASITAS_METER_PER_HARI),
    desimal: 2,
  },
];

const onExport = () => {
  const p = periodeTampil.value;
  tabel.value?.exportToExcel({
    fileName: `Laporan_Kekurangan_Produksi_${p.awal}_${p.akhir}`,
    sheetName: "LMKP",
    judul: `LAPORAN MONITORING KEKURANGAN PRODUKSI (LMKP) :${p.perusahaanNama}`,
    periode: `Periode: ${formatTanggal(p.awal)} s.d ${formatTanggal(p.akhir)}`,
  });
};

onMounted(() => muatData());
</script>

<template>
  <LaporanTable
    ref="tabel"
    v-model:filter-state="filter"
    title="Laporan Kekurangan Produksi"
    menu-id="963"
    storage-id="spanduk-kekurangan-produksi"
    :icon="IconAlertTriangle"
    :columns="columns"
    :items="itemsTampil"
    row-key="Nomor"
    satuan="SPK"
    search-placeholder="Cari nomor SPK / nama order..."
    :is-loading="isLoading"
    :can-export="canExport"
    :footer-tambahan="footerTambahan"
    @refresh="muatData"
    @export="onExport"
  >
    <template #filter-left>
      <span class="kp-lbl">Periode</span>
      <input v-model="filter.dtAwal" type="date" class="kp-inp" />
      <span class="kp-lbl">s.d</span>
      <input v-model="filter.dtAkhir" type="date" class="kp-inp" />

      <span class="kp-lbl kp-sep">Perusahaan</span>
      <input
        :value="filter.perusahaanKode"
        readonly
        placeholder="Semua"
        class="kp-inp kp-kode"
        @click="showPerusahaan = true"
      />
      <button
        type="button"
        class="kp-btn-ic"
        title="Pilih perusahaan"
        @click="showPerusahaan = true"
      >
        <IconSearch :size="14" :stroke-width="1.8" />
      </button>
      <input :value="filter.perusahaanNama" readonly class="kp-inp kp-nama-p" />
      <button
        v-if="filter.perusahaanKode"
        type="button"
        class="kp-btn-ic"
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
.kp-kode {
  width: 70px;
  cursor: pointer;
}
.kp-nama-p {
  width: 200px;
}
.kp-btn-ic {
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
.kp-btn-ic:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}
</style>
