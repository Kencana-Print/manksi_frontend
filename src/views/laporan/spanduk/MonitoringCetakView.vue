<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import LaporanTable from "@/components/laporan/LaporanTable.vue";
import type {
  LaporanKolom,
  LaporanTableApi,
} from "@/components/laporan/laporanTypes";
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import { useBrowse } from "@/composables/useBrowse";
import { formatTanggal } from "@/utils/dateFormat";
import { IconPrinter, IconSearch, IconX } from "@tabler/icons-vue";
import {
  monitoringCetakService,
  type MonitoringCetakRow,
} from "@/services/laporan/spanduk/monitoringCetakService";

const toast = useToast();

// Bentuk item yang dikirim PerusahaanSearchModal (item mentah dari /lookups/perusahaan)
interface PerusahaanPilihan {
  perush_kode: string;
  perush_nama: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ── Filter (disimpan LaporanTable ke sessionStorage lewat filterState) ──
const sekarang = new Date();
const filterState = ref({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
  perusahaanKode: "",
  perusahaanNama: "",
});
const showPerusahaan = ref(false);

const onPerusahaanDipilih = (p: PerusahaanPilihan) => {
  filterState.value = {
    ...filterState.value,
    perusahaanKode: p.perush_kode,
    perusahaanNama: p.perush_nama,
  };
};
const kosongkanPerusahaan = () => {
  filterState.value = {
    ...filterState.value,
    perusahaanKode: "",
    perusahaanNama: "",
  };
};

// Periode saat data diambil; dipakai judul dan nama file Excel agar tidak
// berbeda dari isi tabel bila user mengubah tanggal tanpa menekan Refresh
const periodeTampil = ref({ awal: "", akhir: "" });

const muatData = async (): Promise<MonitoringCetakRow[]> => {
  const { dtAwal, dtAkhir, perusahaanKode } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }
  const res = await monitoringCetakService.getBrowse({
    tglAwal: dtAwal,
    tglAkhir: dtAkhir,
    perusahaan: perusahaanKode || undefined,
  });
  periodeTampil.value = { awal: dtAwal, akhir: dtAkhir };
  return res.data?.data ?? [];
};

const { items, isLoading, canExport, fetchData } =
  useBrowse<MonitoringCetakRow>({
    menuId: "963",
    fetchApi: muatData,
    immediate: false,
  });

// Refresh manual seperti Delphi: saat dibuka dan saat tombol refresh ditekan
onMounted(() => fetchData());

// ── Kolom: dasar tabel di layar dan Excel ──
const kolom: LaporanKolom[] = [
  { key: "Hari", title: "Hari", width: 80 },
  { key: "Tanggal", title: "Tanggal", width: 105, tipe: "date" },
  { key: "Perusahaan", title: "Perusahaan", width: 105 },
  { key: "Tgl_SPK", title: "Tanggal SPK", width: 115, tipe: "date" },
  { key: "Deadline", title: "Deadline", width: 105, tipe: "date" },
  { key: "Jenis_Order", title: "Jenis Order", width: 105 },
  { key: "Nama", title: "Nama SPK", width: 340, excelWidth: 70 },
  { key: "Nomor", title: "Nomor SPK", width: 160, excelWidth: 20 },
  {
    key: "Panjang",
    title: "Panjang",
    group: "Ukuran",
    width: 90,
    tipe: "number",
  },
  { key: "Lebar", title: "Lebar", group: "Ukuran", width: 85, tipe: "number" },
  {
    key: "Jml_Order",
    title: "J Order",
    width: 95,
    tipe: "number",
    total: true,
  },
  {
    key: "J_Meter",
    title: "J. Meter",
    width: 100,
    tipe: "number",
    total: true,
  },
  { key: "Kain", title: "Kain", width: 120 },
  {
    key: "Kurang",
    title: "Kurang",
    width: 95,
    tipe: "number",
    total: true,
    negativeRed: true,
  },
  {
    key: "Jml_Luar",
    title: "Luar",
    group: "Jumlah Cetak",
    width: 90,
    tipe: "number",
    total: true,
  },
  {
    key: "Jml_P02",
    title: "P02",
    group: "Jumlah Cetak",
    width: 90,
    tipe: "number",
    total: true,
  },
  {
    key: "Jml_Cetak",
    title: "Jumlah",
    group: "Jumlah Cetak",
    width: 100,
    tipe: "number",
    total: true,
  },
  {
    key: "Meter_P02",
    title: "P02",
    group: "Meter",
    width: 105,
    tipe: "number",
    total: true,
  },
  {
    key: "Meter_Cetak",
    title: "Jumlah",
    group: "Meter",
    width: 110,
    tipe: "number",
    total: true,
  },
];

const tabel = ref<LaporanTableApi<MonitoringCetakRow> | null>(null);

const onExport = () => {
  const { awal, akhir } = periodeTampil.value;
  return tabel.value?.exportToExcel({
    fileName: `Monitoring_Cetak_${awal}_${akhir}`,
    sheetName: "monitoringcetak",
    judul: "LAPORAN MONITORING CETAK",
    periode: `Periode: ${formatTanggal(awal)} s.d ${formatTanggal(akhir)}`,
  });
};
</script>

<template>
  <LaporanTable
    ref="tabel"
    title="Monitoring Cetak"
    menu-id="963"
    storage-id="spanduk-monitoring-cetak"
    :icon="IconPrinter"
    :columns="kolom"
    :items="items ?? []"
    row-key="Nomor"
    :is-loading="isLoading"
    :can-export="canExport"
    satuan="SPK"
    search-placeholder="Cari SPK / nama / kain..."
    v-model:filter-state="filterState"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="filterState.dtAwal" class="f-inp" />
        <span class="f-sep">s.d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-inp" />
      </div>

      <div class="f-group">
        <span class="f-label">Perusahaan</span>
        <input
          :value="filterState.perusahaanKode"
          readonly
          placeholder="Semua"
          class="f-inp f-kode"
          @click="showPerusahaan = true"
        />
        <button
          type="button"
          class="f-ic"
          title="Pilih perusahaan"
          @click="showPerusahaan = true"
        >
          <IconSearch :size="14" :stroke-width="1.8" />
        </button>
        <input
          :value="filterState.perusahaanNama"
          readonly
          class="f-inp f-nama"
        />
        <button
          v-if="filterState.perusahaanKode"
          type="button"
          class="f-ic"
          title="Kosongkan perusahaan"
          @click="kosongkanPerusahaan"
        >
          <IconX :size="14" :stroke-width="1.8" />
        </button>
      </div>

      <PerusahaanSearchModal
        v-model="showPerusahaan"
        @selected="onPerusahaanDipilih"
      />
    </template>
  </LaporanTable>
</template>

<style scoped>
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
}
.f-kode {
  width: 80px;
  cursor: pointer;
}
.f-nama {
  width: 200px;
}
.f-ic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  color: #555;
  cursor: pointer;
}
.f-ic:hover {
  border-color: #1565c0;
  color: #1565c0;
}
</style>
