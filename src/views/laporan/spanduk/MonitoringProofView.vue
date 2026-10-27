<script setup lang="ts">
import { computed, onActivated, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { IconEdit, IconFileCheck, IconFilePlus } from "@tabler/icons-vue";
import LaporanTable from "@/components/laporan/LaporanTable.vue";
import type {
  LaporanKolom,
  LaporanTableApi,
} from "@/components/laporan/laporanTypes";
import { useBrowse } from "@/composables/useBrowse";
import {
  monitoringProofService,
  type MonitoringProofRow,
} from "@/services/laporan/spanduk/monitoringProofService";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();
const router = useRouter();

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
const tabel = ref<LaporanTableApi<MonitoringProofRow> | null>(null);
const nomorTerpilih = ref<string | null>(null);

// Periode yang dipakai saat data diambil (bukan nilai input yang sedang diubah)
const periodeTampil = ref({
  awal: filter.value.dtAwal,
  akhir: filter.value.dtAkhir,
});

const { items, isLoading, canExport, canEdit, fetchData } =
  useBrowse<MonitoringProofRow>({
    menuId: "963",
    fetchApi: async () => {
      const res = await monitoringProofService.getBrowse({
        tglAwal: periodeTampil.value.awal,
        tglAkhir: periodeTampil.value.akhir,
      });
      return res.data?.data ?? [];
    },
    immediate: false,
  });

const itemsTampil = computed<MonitoringProofRow[]>(() => items.value ?? []);

// Pilihan dibatalkan bila barisnya tidak ada lagi setelah muat ulang
watch(itemsTampil, (daftar) => {
  if (!daftar.some((r) => r.Nomor === nomorTerpilih.value)) {
    nomorTerpilih.value = null;
  }
});

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

// Tab dipertahankan: muat ulang saat kembali dari form (lewati aktivasi pertama)
let aktivasiPertama = true;
onMounted(() => muatData());
onActivated(() => {
  if (aktivasiPertama) {
    aktivasiPertama = false;
    return;
  }
  fetchData();
});

const onBaru = () => {
  router.push({ name: "LaporanSpandukMonitoringProofCreate" });
};

const keForm = (nomor: string) => {
  router.push({
    name: "LaporanSpandukMonitoringProofEdit",
    params: { nomor },
  });
};

const onUbah = () => {
  if (!nomorTerpilih.value) {
    toast.warning("Pilih baris yang akan diubah.");
    return;
  }
  keForm(nomorTerpilih.value);
};

const onDblKlik = (r: MonitoringProofRow) => {
  if (canEdit.value) keForm(r.Nomor);
};

const columns: LaporanKolom[] = [
  { key: "Nomor", title: "NOMOR MEMO", width: 140, excelWidth: 20 },
  {
    key: "Tanggal",
    title: "TGL MEMO",
    width: 90,
    tipe: "date",
    excelWidth: 12,
  },
  {
    key: "Deadline",
    title: "DEADLINE",
    width: 90,
    tipe: "date",
    excelWidth: 12,
  },
  { key: "Nama", title: "NAMA ORDER", width: 300, excelWidth: 45 },
  { key: "Jo_Kode", title: "JENIS", width: 55, excelWidth: 8 },
  { key: "Jenis_Order", title: "JENIS ORDER", width: 150, excelWidth: 22 },
  {
    key: "Panjang",
    title: "PANJANG",
    group: "UKURAN",
    width: 80,
    tipe: "number",
    excelWidth: 10,
  },
  {
    key: "Lebar",
    title: "LEBAR",
    group: "UKURAN",
    width: 70,
    tipe: "number",
    excelWidth: 9,
  },
  {
    key: "Rencana_Order",
    title: "PCS",
    group: "RENCANA ORDER",
    width: 110,
    tipe: "number",
    total: true,
    excelWidth: 15,
  },
  {
    key: "Jml_Proof",
    title: "JUMLAH AKTUAL",
    group: "PROOF",
    width: 120,
    tipe: "number",
    total: true,
    excelWidth: 16,
  },
  {
    key: "Lama_Proof",
    title: "LAMA (HARI)",
    group: "PROOF",
    width: 110,
    tipe: "number",
    total: true,
    excelWidth: 13,
  },
  {
    key: "Tgl_Proof",
    title: "TANGGAL PROOF",
    group: "PROOF",
    width: 120,
    tipe: "date",
    excelWidth: 16,
  },
  { key: "Gudang", title: "LOKASI PROOFING", width: 130, excelWidth: 17 },
  { key: "Status", title: "STATUS", width: 70, excelWidth: 9 },
  {
    key: "Tg_Status",
    title: "TANGGAL STATUS",
    width: 120,
    tipe: "date",
    excelWidth: 16,
  },
  { key: "No_Arsip", title: "NO ARSIP", width: 100, excelWidth: 12 },
  { key: "Kain", title: "BAHAN", width: 160, excelWidth: 22 },
];

const onExport = () => {
  const p = periodeTampil.value;
  tabel.value?.exportToExcel({
    fileName: `Laporan_Monitoring_Proof_${p.awal}_${p.akhir}`,
    sheetName: "Monitoring Proof",
    judul: "LAPORAN MONITORING PROOF",
    periode: `Periode: ${formatTanggal(p.awal)} s.d ${formatTanggal(p.akhir)}`,
  });
};
</script>

<template>
  <LaporanTable
    ref="tabel"
    v-model:filter-state="filter"
    v-model:selected-key="nomorTerpilih"
    title="Laporan Monitoring Proof"
    menu-id="963"
    storage-id="spanduk-monitoring-proof"
    :icon="IconFileCheck"
    :columns="columns"
    :items="itemsTampil"
    row-key="Nomor"
    satuan="memo"
    search-placeholder="Cari nomor / nama order / bahan / arsip..."
    :is-loading="isLoading"
    :can-export="canExport"
    @refresh="muatData"
    @export="onExport"
    @row-dblclick="onDblKlik"
  >
    <template #extra-actions>
      <v-btn v-if="canEdit" size="small" color="primary" @click="onBaru">
        <template #prepend
          ><IconFilePlus :size="15" :stroke-width="1.7"
        /></template>
        Baru
      </v-btn>
      <v-btn
        v-if="canEdit"
        size="small"
        color="primary"
        variant="tonal"
        :disabled="!nomorTerpilih"
        @click="onUbah"
      >
        <template #prepend
          ><IconEdit :size="15" :stroke-width="1.7"
        /></template>
        Ubah
      </v-btn>
    </template>

    <template #filter-left>
      <span class="mp-lbl">Periode</span>
      <input v-model="filter.dtAwal" type="date" class="mp-inp" />
      <span class="mp-lbl">s.d</span>
      <input v-model="filter.dtAkhir" type="date" class="mp-inp" />
    </template>
  </LaporanTable>
</template>

<style scoped>
.mp-lbl {
  font-size: 11px;
  font-weight: 500;
}
.mp-inp {
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
}
.mp-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
</style>
