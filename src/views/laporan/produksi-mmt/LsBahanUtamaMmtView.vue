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
import { IconPrinter, IconLayersSubtract } from "@tabler/icons-vue";
import {
  lsBahanUtamaService,
  type LsBahanUtamaRow,
  type GudangItem,
} from "@/services/laporan/mmt/lsBahanUtamaService";

const toast = useToast();

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filterState = ref({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
  gdgKode: "WH-16",
  gdgNama: "Gudang Utama",
  jenis: "SEMUA",
  status: "SEMUA",
});

const gudangList = ref<GudangItem[]>([]);
const periodeTampil = ref({ awal: "", akhir: "" });

const loadGudang = async () => {
  try {
    const res = await lsBahanUtamaService.getGudangList();
    gudangList.value = res.data || [];
    const wh16 = gudangList.value.find((g) => g.kode === "WH-16");
    if (wh16) filterState.value.gdgNama = wh16.nama;
  } catch {
    // fallback default WH-16
  }
};

const muatData = async (): Promise<LsBahanUtamaRow[]> => {
  const { dtAwal, dtAkhir, gdgKode, jenis, status } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const res = await lsBahanUtamaService.getReport({
    startDate: dtAwal,
    endDate: dtAkhir,
    gdgKode: gdgKode || "WH-16",
  });

  const raw = Array.isArray(res.data) ? res.data : [];
  periodeTampil.value = { awal: dtAwal, akhir: dtAkhir };

  let data = raw.map((r: any) => ({
    ...r,
    Panjang: Number(r.Panjang || 0),
    Lebar: Number(r.Lebar || 0),
    m2: Number(r.m2 || 0),
    stok_awal_q: Number(r.stok_awal_q || 0),
    stok_awal_m: Number(r.stok_awal_m || 0),
    stok_awal_nominal: Number(r.stok_awal_nominal || 0),
    terima_q: Number(r.terima_q || 0),
    terima_m: Number(r.terima_m || 0),
    terima_nominal: Number(r.terima_nominal || 0),
    keluar_q: Number(r.keluar_q || 0),
    keluar_m: Number(r.keluar_m || 0),
    keluar_nominal: Number(r.keluar_nominal || 0),
    retur_q: Number(r.retur_q || 0),
    retur_m: Number(r.retur_m || 0),
    retur_nominal: Number(r.retur_nominal || 0),
    stok_akhir_q: Number(r.stok_akhir_q || 0),
    stok_akhir_m: Number(r.stok_akhir_m || 0),
    stok_akhir_nominal: Number(r.stok_akhir_nominal || 0),
  }));

  if (jenis && jenis !== "SEMUA") {
    data = data.filter((d) => String(d.jb_nama || "").toUpperCase() === jenis.toUpperCase());
  }
  if (status && status !== "SEMUA") {
    data = data.filter((d) => String(d.status_barang || "").toUpperCase() === status.toUpperCase());
  }

  return data;
};

const { items, isLoading, canExport, fetchData } = useBrowse<LsBahanUtamaRow>({
  menuId: "5560",
  fetchApi: muatData,
  immediate: false,
});

onMounted(async () => {
  await loadGudang();
  fetchData();
});

const kolom: LaporanKolom[] = [
  { key: "kode", title: "Kode", width: 110, sticky: "left" },
  { key: "Nama", title: "Nama Bahan", width: 220, sticky: "left" },
  { key: "jb_nama", title: "Jenis", width: 110 },
  { key: "type_barang", title: "Type", width: 90 },
  { key: "status_barang", title: "Status", width: 105 },

  // Spesifikasi
  { key: "Panjang", title: "Panjang", group: "Spesifikasi", width: 75, tipe: "number", desimal: 2 },
  { key: "Lebar", title: "Lebar", group: "Spesifikasi", width: 75, tipe: "number", desimal: 2 },
  { key: "m2", title: "M2/Roll", group: "Spesifikasi", width: 80, tipe: "number", desimal: 2 },

  // Stok Awal
  { key: "stok_awal_q", title: "Roll", group: "Stok Awal", width: 70, tipe: "number", total: true },
  { key: "stok_awal_m", title: "M2", group: "Stok Awal", width: 85, tipe: "number", desimal: 2, total: true },
  { key: "stok_awal_nominal", title: "Nominal (Rp)", group: "Stok Awal", width: 115, tipe: "currency", total: true },

  // Terima
  { key: "terima_q", title: "Roll", group: "Terima", width: 70, tipe: "number", total: true },
  { key: "terima_m", title: "M2", group: "Terima", width: 85, tipe: "number", desimal: 2, total: true },
  { key: "terima_nominal", title: "Nominal (Rp)", group: "Terima", width: 115, tipe: "currency", total: true },

  // Keluar
  { key: "keluar_q", title: "Roll", group: "Keluar", width: 70, tipe: "number", total: true },
  { key: "keluar_m", title: "M2", group: "Keluar", width: 85, tipe: "number", desimal: 2, total: true },
  { key: "keluar_nominal", title: "Nominal (Rp)", group: "Keluar", width: 115, tipe: "currency", total: true },

  // Retur
  { key: "retur_q", title: "Roll", group: "Retur", width: 70, tipe: "number", total: true },
  { key: "retur_m", title: "M2", group: "Retur", width: 85, tipe: "number", desimal: 2, total: true },

  // Stok Akhir
  { key: "stok_akhir_q", title: "Roll", group: "Stok Akhir", width: 70, tipe: "number", total: true },
  { key: "stok_akhir_m", title: "M2", group: "Stok Akhir", width: 85, tipe: "number", desimal: 2, total: true },
  { key: "stok_akhir_nominal", title: "Nominal (Rp)", group: "Stok Akhir", width: 115, tipe: "currency", total: true },
];

const tableRef = ref<LaporanTableApi | null>(null);

const bukaPrint = () => {
  const { dtAwal, dtAkhir, gdgKode } = filterState.value;
  const p = new URLSearchParams({
    startDate: dtAwal,
    endDate: dtAkhir,
    gdgKode: gdgKode || "WH-16",
  });
  window.open(
    `/laporan/produksi-mmt/ls-bahan-utama/print?${p.toString()}`,
    "_blank",
  );
};

const judulLaporan = computed(() => {
  if (periodeTampil.value.awal && periodeTampil.value.akhir) {
    return `LS Bahan Utama Periode ${formatTanggal(periodeTampil.value.awal)} s/d ${formatTanggal(periodeTampil.value.akhir)}`;
  }
  return "LS Bahan Utama";
});

const onExport = () => {
  const { awal, akhir } = periodeTampil.value;
  return tableRef.value?.exportToExcel({
    fileName: `LS_Bahan_Utama_${awal}_sd_${akhir}`,
    sheetName: "LS_Bahan_Utama",
    judul: "LAPORAN STOK BAHAN UTAMA (MMT)",
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
    menu-id="5560"
    storage-id="mmt-ls-bahan-utama"
    :icon="IconLayersSubtract"
    :columns="kolom"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-export="canExport"
    row-key="kode"
    search-placeholder="Cari kode, nama bahan, jenis..."
    satuan="item"
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
          :model-value="filter.gdgKode"
          :items="gudangList"
          item-title="nama"
          item-value="kode"
          label="Gudang"
          density="compact"
          variant="outlined"
          hide-details
          style="min-width: 200px"
          @update:model-value="(v: string) => {
            const gd = gudangList.find(g => g.kode === v);
            updateFilter({ gdgKode: v, gdgNama: gd ? gd.nama : v });
          }"
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
