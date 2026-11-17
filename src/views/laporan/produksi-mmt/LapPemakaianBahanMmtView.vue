<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import LaporanTable from "@/components/laporan/LaporanTable.vue";
import type {
  LaporanKolom,
  LaporanTableApi,
} from "@/components/laporan/laporanTypes";
import { useBrowse } from "@/composables/useBrowse";
import { formatTanggal } from "@/utils/dateFormat";
import { IconPrinter, IconFileSpreadsheet, IconScissors } from "@tabler/icons-vue";
import {
  pemakaianBahanMmtService,
  type PemakaianBahanMmtRow,
} from "@/services/laporan/mmt/pemakaianBahanMmtService";

const toast = useToast();

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filterState = ref({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
  tipeLhk: "ALL",
});

const tipeLhkOptions = [
  { title: "Semua LHK", value: "ALL" },
  { title: "Cetak MMT", value: "MMT" },
  { title: "Proof MMT", value: "PROOF" },
  { title: "Tekstil", value: "TEKSTIL" },
  { title: "Sublim RTR", value: "SUBLIM" },
  { title: "Paperprint", value: "PAPERPRINT" },
];

const periodeTampil = ref({ awal: "", akhir: "" });

const muatData = async (): Promise<PemakaianBahanMmtRow[]> => {
  const { dtAwal, dtAkhir, tipeLhk } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const res = await pemakaianBahanMmtService.getReport({
    startDate: dtAwal,
    endDate: dtAkhir,
    tipeLhk: tipeLhk || "ALL",
  });

  const raw = Array.isArray(res.data) ? res.data : [];
  periodeTampil.value = { awal: dtAwal, akhir: dtAkhir };

  return raw.map((r: any) => ({
    ...r,
    p: Number(r.p || 0),
    l: Number(r.l || 0),
    orderPcs: Number(r.orderPcs || 0),
    orderLuas: Number(r.orderLuas || 0),
    toleransiM2: Number(r.toleransiM2 || 0),
    persenToleransi: Number(r.persenToleransi || 0),
    hasilQty: Number(r.hasilQty || 0),
    hasilLuas: Number(r.hasilLuas || 0),
    ambilP: Number(r.ambilP || 0),
    ambilL: Number(r.ambilL || 0),
    ambilLuas: Number(r.ambilLuas || 0),
    sisaBisaPakaiP: Number(r.sisaBisaPakaiP || 0),
    sisaBisaPakaiL: Number(r.sisaBisaPakaiL || 0),
    sisaBisaPakaiLuas: Number(r.sisaBisaPakaiLuas || 0),
    sisaRongsokP: Number(r.sisaRongsokP || 0),
    sisaRongsokL: Number(r.sisaRongsokL || 0),
    sisaRongsokLuas: Number(r.sisaRongsokLuas || 0),
    aktualLuasPakai: Number(r.aktualLuasPakai || 0),
    wasteM2: Number(r.wasteM2 || 0),
    wastePersen: Number(r.wastePersen || 0),
    lostM2: Number(r.lostM2 || 0),
    lostPersen: Number(r.lostPersen || 0),
    totalWasteM2: Number(r.totalWasteM2 || 0),
    totalWastePersen: Number(r.totalWastePersen || 0),
  }));
};

const { items, isLoading, canExport, fetchData } = useBrowse<PemakaianBahanMmtRow>({
  menuId: "5562",
  fetchApi: muatData,
  immediate: false,
});

onMounted(() => fetchData());

const kolom: LaporanKolom[] = [
  { key: "tgl", title: "Tanggal", width: 95, tipe: "date", sticky: "left" },
  { key: "shift", title: "Shift", width: 60, sticky: "left" },
  { key: "tipeLhk", title: "Tipe LHK", width: 90 },
  { key: "kodeMesin", title: "Mesin", width: 70 },
  { key: "noSpk", title: "No SPK", width: 150 },
  { key: "namaOrder", title: "Nama Order", width: 220 },
  { key: "barcodeRoll", title: "Barcode Roll", width: 170 },

  // Ukuran
  { key: "p", title: "P", group: "Ukuran", width: 65, tipe: "number", desimal: 2 },
  { key: "l", title: "L", group: "Ukuran", width: 65, tipe: "number", desimal: 2 },
  { key: "gsm", title: "Gramasi", group: "Ukuran", width: 90 },

  // Toleransi
  { key: "persenToleransi", title: "%", group: "Toleransi", width: 65, tipe: "number", desimal: 2 },
  { key: "toleransiM2", title: "M2", group: "Toleransi", width: 75, tipe: "number", desimal: 2, total: true },

  // Order SPK
  { key: "orderPcs", title: "PCS", group: "Order SPK", width: 70, tipe: "number", total: true },
  { key: "orderLuas", title: "Luas (M2)", group: "Order SPK", width: 85, tipe: "number", desimal: 2, total: true },

  // Hasil Cetak
  { key: "hasilQty", title: "PCS", group: "Hasil Cetak", width: 70, tipe: "number", total: true },
  { key: "hasilLuas", title: "Luas (M2)", group: "Hasil Cetak", width: 85, tipe: "number", desimal: 2, total: true },

  // Ambil Bahan
  { key: "ambilP", title: "P", group: "Ambil Bahan", width: 65, tipe: "number", desimal: 2 },
  { key: "ambilL", title: "L", group: "Ambil Bahan", width: 65, tipe: "number", desimal: 2 },
  { key: "ambilLuas", title: "M2", group: "Ambil Bahan", width: 85, tipe: "number", desimal: 2, total: true },

  // Kembalian Bisa Pakai
  { key: "sisaBisaPakaiP", title: "P", group: "Sisa Bisa Pakai", width: 65, tipe: "number", desimal: 2 },
  { key: "sisaBisaPakaiL", title: "L", group: "Sisa Bisa Pakai", width: 65, tipe: "number", desimal: 2 },
  { key: "sisaBisaPakaiLuas", title: "M2", group: "Sisa Bisa Pakai", width: 85, tipe: "number", desimal: 2, total: true },

  // Kembalian Rongsok
  { key: "sisaRongsokP", title: "P", group: "Sisa Rongsok", width: 65, tipe: "number", desimal: 2 },
  { key: "sisaRongsokL", title: "L", group: "Sisa Rongsok", width: 65, tipe: "number", desimal: 2 },
  { key: "sisaRongsokLuas", title: "M2", group: "Sisa Rongsok", width: 85, tipe: "number", desimal: 2, total: true },

  // Aktual Luas Pakai
  { key: "aktualLuasPakai", title: "Aktual Pakai (M2)", width: 110, tipe: "number", desimal: 2, total: true },

  // Waste
  { key: "totalWasteM2", title: "Waste (M2)", group: "Total Waste", width: 85, tipe: "number", desimal: 2, total: true },
  { key: "totalWastePersen", title: "Waste (%)", group: "Total Waste", width: 80, tipe: "number", desimal: 2 },
];

const tableRef = ref<LaporanTableApi | null>(null);

const bukaPrint = () => {
  const { dtAwal, dtAkhir, tipeLhk } = filterState.value;
  const p = new URLSearchParams({
    startDate: dtAwal,
    endDate: dtAkhir,
    ...(tipeLhk && tipeLhk !== "ALL" ? { tipeLhk } : {}),
  });
  window.open(
    `/laporan/produksi-mmt/lap-pemakaian-bahan/print?${p.toString()}`,
    "_blank",
  );
};

const judulLaporan = computed(() => {
  if (periodeTampil.value.awal && periodeTampil.value.akhir) {
    return `Lap. Pemakaian Bahan Periode ${formatTanggal(periodeTampil.value.awal)} s/d ${formatTanggal(periodeTampil.value.akhir)}`;
  }
  return "Lap. Pemakaian Bahan";
});

const onExport = () => {
  const { awal, akhir } = periodeTampil.value;
  return tableRef.value?.exportToExcel({
    fileName: `Pemakaian_Bahan_${awal}_sd_${akhir}`,
    sheetName: "Pemakaian_Bahan",
    judul: "LAPORAN PEMAKAIAN BAHAN & KONSUMSI TINTA (MMT)",
    periode:
      awal && akhir
        ? `Periode: ${formatTanggal(awal)} s.d ${formatTanggal(akhir)}`
        : undefined,
  });
};
</script>

<template>
  <LaporanTable
    ref="tableRef"
    v-model:filter-state="filterState"
    :title="judulLaporan"
    menu-id="5562"
    storage-id="mmt-pemakaian-bahan"
    :icon="IconScissors"
    :columns="kolom"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-export="canExport"
    row-key="noSpk"
    search-placeholder="Cari SPK, order, mesin, barcode..."
    satuan="baris"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter="{ filter, updateFilter }">
      <div class="d-flex align-center flex-wrap ga-2">
        <v-text-field
          :model-value="filter.dtAwal"
          type="date"
          label="Mulai"
          density="compact"
          variant="outlined"
          hide-details
          style="width: 145px"
          @update:model-value="(v: string) => updateFilter({ dtAwal: v })"
        />
        <v-text-field
          :model-value="filter.dtAkhir"
          type="date"
          label="Sampai"
          density="compact"
          variant="outlined"
          hide-details
          style="width: 145px"
          @update:model-value="(v: string) => updateFilter({ dtAkhir: v })"
        />

        <v-select
          :model-value="filter.tipeLhk"
          :items="tipeLhkOptions"
          item-title="title"
          item-value="value"
          label="Tipe LHK"
          density="compact"
          variant="outlined"
          hide-details
          style="min-width: 160px"
          @update:model-value="(v: string) => updateFilter({ tipeLhk: v })"
        />
      </div>
    </template>

    <template #actions-trailing>
      <v-btn
        color="secondary"
        variant="tonal"
        size="small"
        prepend-icon="mdi-printer"
        @click="bukaPrint"
      >
        Cetak
      </v-btn>
    </template>
  </LaporanTable>
</template>
