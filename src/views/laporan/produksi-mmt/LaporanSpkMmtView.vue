<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import LaporanTable from "@/components/laporan/LaporanTable.vue";
import type {
  LaporanKolom,
  LaporanTableApi,
} from "@/components/laporan/laporanTypes";
import SpkPreviewDialog from "@/components/laporan/SpkPreviewDialog.vue";
import { useBrowse } from "@/composables/useBrowse";
import { formatTanggal } from "@/utils/dateFormat";
import { IconPrinter, IconFileText } from "@tabler/icons-vue";
import {
  laporanSpkMmtService,
  type LaporanSpkMmtRow,
} from "@/services/laporan/mmt/laporanSpkMmtService";

const toast = useToast();

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filterState = ref({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
  status: "SEMUA",
});

const selectedSpk = ref("");
const showSpkPreview = ref(false);
const periodeTampil = ref({ awal: "", akhir: "" });

const muatData = async (): Promise<LaporanSpkMmtRow[]> => {
  const { dtAwal, dtAkhir, status } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const res = await laporanSpkMmtService.getReport({
    startDate: dtAwal,
    endDate: dtAkhir,
  });

  const raw = Array.isArray(res.data)
    ? res.data
    : (res.data as any)?.data || [];

  periodeTampil.value = { awal: dtAwal, akhir: dtAkhir };

  let data = raw.map((r: any) => ({
    ...r,
    PANJANG: Number(r.PANJANG || 0),
    LEBAR: Number(r.LEBAR || 0),
    spk_jumlah: Number(r.spk_jumlah || 0),
    mt01: Number(r.mt01 || 0),
    mt02: Number(r.mt02 || 0),
    mt03: Number(r.mt03 || 0),
    mt04: Number(r.mt04 || 0),
    mt05: Number(r.mt05 || 0),
    mi: Number(r.mi || 0),
    JML_CETAK: Number(r.JML_CETAK || 0),
    JML_seaming: Number(r.JML_seaming || 0),
    JML_mataayam: Number(r.JML_mataayam || 0),
    JML_coly: Number(r.JML_coly || 0),
    JML_JADI: Number(r.JML_JADI || 0),
    JML_KIRIM: Number(r.JML_KIRIM || 0),
    JML_meter_KIRIM: Number(r.JML_meter_KIRIM || 0),
    M_CETAK: Number(r.M_CETAK || 0),
  }));

  if (status && status !== "SEMUA") {
    data = data.filter((d) => String(d.status || "").toUpperCase() === status.toUpperCase());
  }

  return data;
};

const { items, isLoading, canExport, fetchData } = useBrowse<LaporanSpkMmtRow>({
  menuId: "5563",
  fetchApi: muatData,
  immediate: false,
});

onMounted(() => fetchData());

const kolom: LaporanKolom[] = [
  { key: "NOMOR", title: "No SPK", width: 140, sticky: "left" },
  { key: "spk_nama", title: "Nama Order", width: 220, sticky: "left" },
  { key: "spk_tanggal", title: "Tgl SPK", width: 95, tipe: "date" },
  { key: "deadline", title: "Deadline", width: 95, tipe: "date" },
  { key: "DIVISI", title: "Divisi", width: 80 },
  { key: "jo_nama", title: "Jenis Order", width: 120 },
  { key: "status", title: "Status", width: 85 },

  // Ukuran
  { key: "PANJANG", title: "P", group: "Ukuran", width: 65, tipe: "number", desimal: 2 },
  { key: "LEBAR", title: "L", group: "Ukuran", width: 65, tipe: "number", desimal: 2 },
  { key: "KAIN", title: "Bahan", width: 110 },
  { key: "spk_jumlah", title: "Order (PCS)", width: 85, tipe: "number", total: true },

  // Hasil Cetak Mesin
  { key: "mt01", title: "MT01", group: "Mesin", width: 65, tipe: "number", total: true },
  { key: "mt02", title: "MT02", group: "Mesin", width: 65, tipe: "number", total: true },
  { key: "mt03", title: "MT03", group: "Mesin", width: 65, tipe: "number", total: true },
  { key: "mt04", title: "MT04", group: "Mesin", width: 65, tipe: "number", total: true },
  { key: "mt05", title: "MT05", group: "Mesin", width: 65, tipe: "number", total: true },

  // Total Cetak
  { key: "JML_CETAK", title: "PCS", group: "Total Cetak", width: 75, tipe: "number", total: true },
  { key: "M_CETAK", title: "M2", group: "Total Cetak", width: 85, tipe: "number", desimal: 2, total: true },

  // Finishing
  { key: "JML_seaming", title: "Seaming", group: "Finishing", width: 75, tipe: "number", total: true },
  { key: "JML_mataayam", title: "Mata Ayam", group: "Finishing", width: 80, tipe: "number", total: true },
  { key: "JML_coly", title: "Coly", group: "Finishing", width: 70, tipe: "number", total: true },

  // Jadi & Kirim
  { key: "JML_JADI", title: "Brg Jadi", width: 80, tipe: "number", total: true },
  { key: "JML_KIRIM", title: "Kirim (PCS)", width: 85, tipe: "number", total: true },
  { key: "JML_meter_KIRIM", title: "Kirim (M2)", width: 85, tipe: "number", desimal: 2, total: true },
];

const tableRef = ref<LaporanTableApi | null>(null);

const onRowDblClick = (row: LaporanSpkMmtRow) => {
  const spk = (row.NOMOR || "").trim();
  if (spk && spk !== "-") {
    selectedSpk.value = spk;
    showSpkPreview.value = true;
  }
};

const bukaPrint = () => {
  const { dtAwal, dtAkhir, status } = filterState.value;
  const p = new URLSearchParams({
    startDate: dtAwal,
    endDate: dtAkhir,
    ...(status && status !== "SEMUA" ? { status } : {}),
  });
  window.open(
    `/laporan/produksi-mmt/lap-spk-mmt/print?${p.toString()}`,
    "_blank",
  );
};

const judulLaporan = computed(() => {
  if (periodeTampil.value.awal && periodeTampil.value.akhir) {
    return `Laporan SPK MMT Periode ${formatTanggal(periodeTampil.value.awal)} s/d ${formatTanggal(periodeTampil.value.akhir)}`;
  }
  return "Laporan SPK MMT";
});

const onExport = () => {
  const { awal, akhir } = periodeTampil.value;
  return tableRef.value?.exportToExcel({
    fileName: `Laporan_SPK_MMT_${awal}_sd_${akhir}`,
    sheetName: "SPK_MMT",
    judul: "LAPORAN SPK MMT",
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
    menu-id="5563"
    storage-id="mmt-lap-spk"
    :icon="IconFileText"
    :columns="kolom"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-export="canExport"
    row-key="NOMOR"
    search-placeholder="Cari SPK, nama order, bahan..."
    satuan="spk"
    @refresh="fetchData"
    @export="onExport"
    @row-dblclick="onRowDblClick"
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
          :model-value="filter.status"
          :items="[
            { title: 'Semua Status', value: 'SEMUA' },
            { title: 'Open', value: 'Open' },
            { title: 'Closed', value: 'Closed' },
          ]"
          item-title="title"
          item-value="value"
          label="Status"
          density="compact"
          variant="outlined"
          hide-details
          style="min-width: 140px"
          @update:model-value="(v: string) => updateFilter({ status: v })"
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

  <SpkPreviewDialog
    v-model="showSpkPreview"
    :nomor-spk="selectedSpk"
  />
</template>
