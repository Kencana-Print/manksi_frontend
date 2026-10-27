<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { IconListDetails, IconSearch, IconX } from "@tabler/icons-vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportExcel, type ExcelColumn } from "@/utils/excelExport";
import { buatKopPreLines } from "@/utils/kopLaporan";
import { formatTanggal } from "@/utils/dateFormat";
import {
  rekapMonitoringBySpkService,
  type RekapMonitoringBySpkRow,
} from "@/services/laporan/spanduk/rekapMonitoringBySpkService";

const toast = useToast();

interface PerusahaanPilihan {
  perush_kode: string;
  perush_nama: string;
}

const pad = (n: number): string => String(n).padStart(2, "0");
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filterState = ref({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
  perusahaanKode: "",
  perusahaanNama: "",
});
const showPerusahaan = ref(false);
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const { items, isLoading, canExport, fetchData } =
  useBrowse<RekapMonitoringBySpkRow>({
    menuId: "963",
    fetchApi: async () => {
      const f = filterState.value;
      if (!f.dtAwal || !f.dtAkhir) {
        toast.warning("Periode wajib diisi.");
        return [];
      }
      if (f.dtAwal > f.dtAkhir) {
        toast.warning("Tanggal awal tidak boleh melebihi tanggal akhir.");
        return [];
      }
      const res = await rekapMonitoringBySpkService.getBrowse({
        tglAwal: f.dtAwal,
        tglAkhir: f.dtAkhir,
        perusahaan: f.perusahaanKode || undefined,
      });
      return res.data?.data ?? [];
    },
    immediate: false,
  });

const itemsTampil = computed<RekapMonitoringBySpkRow[]>(
  () => items.value ?? [],
);

const onPerusahaanDipilih = (p: PerusahaanPilihan) => {
  filterState.value.perusahaanKode = p.perush_kode;
  filterState.value.perusahaanNama = p.perush_nama;
};
const kosongkanPerusahaan = () => {
  filterState.value.perusahaanKode = "";
  filterState.value.perusahaanNama = "";
};

onMounted(fetchData);
watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);
watch(() => filterState.value.perusahaanKode, fetchData);

// --- Tampilan: satu header (BaseBrowse) ---
const headers = [
  { title: "Perusahaan", key: "Perusahaan", width: "90px" },
  { title: "Tanggal SPK", key: "Tgl_SPK", width: "130px", align: "center" },
  { title: "Deadline", key: "Deadline", width: "95px", align: "center" },
  { title: "Nama SPK", key: "Nama_SPK", width: "340px" },
  { title: "Panjang", key: "Panjang", width: "80px", align: "end" },
  { title: "Lebar", key: "Lebar", width: "70px", align: "end" },
  { title: "Nomor SPK", key: "Nomor_SPK", width: "160px" },
  { title: "Jumlah Order", key: "Jml_Order", width: "110px", align: "end" },
  { title: "Kurang Cetak", key: "Kurang_Cetak", width: "110px", align: "end" },
  { title: "Kurang Jahit", key: "Kurang_Jahit", width: "110px", align: "end" },
  { title: "Kurang Lipat", key: "Kurang_Lipat", width: "110px", align: "end" },
];

// Tanggal SPK membawa jam (sama dengan Delphi)
const tglJam = (v: string | null): string =>
  v ? `${formatTanggal(v.slice(0, 10))} ${v.slice(11, 16)}` : "-";

// Angka 2 desimal, negatif dalam kurung (sama dengan Delphi)
const angka = (v: number | null | undefined): string => {
  const n = Number(v) || 0;
  const s = Math.abs(n).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `(${s})` : s;
};

const kolomTotal = [
  "Jml_Order",
  "Kurang_Cetak",
  "Kurang_Jahit",
  "Kurang_Lipat",
] as const;

const summaryFormatters: Record<
  string,
  (rows: RekapMonitoringBySpkRow[]) => string
> = {
  Perusahaan: (rows) => `TOTAL (${rows.length})`,
  ...Object.fromEntries(
    kolomTotal.map((k) => [
      k,
      (rows: RekapMonitoringBySpkRow[]) =>
        angka(rows.reduce((a, r) => a + (Number(r[k]) || 0), 0)),
    ]),
  ),
};

// --- Export: header dua tingkat, TOTAL, tanda tangan ---
const NUM = "#,##0.00_);(#,##0.00)";

const kolomExcel: ExcelColumn[] = [
  { header: "PERUSAHAAN", key: "Perusahaan", width: 14 },
  { header: "TANGGAL SPK", key: "Tgl_SPK", width: 18, align: "center" },
  { header: "DEADLINE", key: "Deadline", width: 12, align: "center" },
  { header: "NAMA SPK", key: "Nama_SPK", width: 60 },
  {
    header: "UKURAN",
    subHeader: "PANJANG",
    key: "Panjang",
    width: 10,
    align: "right",
    numFmt: NUM,
  },
  {
    header: "UKURAN",
    subHeader: "LEBAR",
    key: "Lebar",
    width: 10,
    align: "right",
    numFmt: NUM,
  },
  { header: "NOMOR SPK", key: "Nomor_SPK", width: 22 },
  {
    header: "JUMLAH ORDER",
    key: "Jml_Order",
    width: 15,
    align: "right",
    numFmt: NUM,
  },
  {
    header: "KURANG",
    subHeader: "CETAK",
    key: "Kurang_Cetak",
    width: 14,
    align: "right",
    numFmt: NUM,
  },
  {
    header: "KURANG",
    subHeader: "JAHIT",
    key: "Kurang_Jahit",
    width: 14,
    align: "right",
    numFmt: NUM,
  },
  {
    header: "KURANG",
    subHeader: "LIPAT",
    key: "Kurang_Lipat",
    width: 14,
    align: "right",
    numFmt: NUM,
  },
];

type NilaiExcel = string | number | null;
type ExportRow = Record<keyof RekapMonitoringBySpkRow, NilaiExcel>;

const barisKosong = (): ExportRow => ({
  Perusahaan: null,
  Tgl_SPK: null,
  Deadline: null,
  Nama_SPK: null,
  Panjang: null,
  Lebar: null,
  Nomor_SPK: null,
  Jml_Order: null,
  Kurang_Cetak: null,
  Kurang_Jahit: null,
  Kurang_Lipat: null,
});

const onExport = async () => {
  if (!canExport.value) {
    return toast.error("Akses ditolak: Anda tidak memiliki izin untuk export.");
  }
  const data = baseBrowseRef.value?.getFilteredItems() ?? itemsTampil.value;
  if (data.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }

  const rows: ExportRow[] = data.map((r) => ({
    ...r,
    Tgl_SPK: tglJam(r.Tgl_SPK),
    Deadline: r.Deadline ? formatTanggal(r.Deadline) : "-",
  }));

  const total = barisKosong();
  total.Perusahaan = "TOTAL";
  for (const k of kolomTotal) {
    total[k] = data.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  }
  rows.push(total);

  // Blok tanda tangan (sama dengan Delphi)
  rows.push(barisKosong());
  const judulTtd = barisKosong();
  judulTtd.Perusahaan = "TERTANDA";
  judulTtd.Nomor_SPK = "MENGETAHUI";
  rows.push(judulTtd);
  for (let i = 0; i < 3; i++) rows.push(barisKosong());
  const namaTtd = barisKosong();
  namaTtd.Perusahaan = "ADMIN PRODUKSI";
  namaTtd.Nomor_SPK = "SUPERVISOR PRODUKSI";
  rows.push(namaTtd);

  const f = filterState.value;
  const periode = `Periode: ${formatTanggal(f.dtAwal)} s.d ${formatTanggal(f.dtAkhir)}`;
  const penanda = new Set(["TOTAL", "TERTANDA", "ADMIN PRODUKSI"]);

  try {
    await exportExcel(`Rekap_Monitoring_By_SPK_${f.dtAwal}_${f.dtAkhir}.xlsx`, [
      {
        sheetName: "rekapmonitoringbyspk",
        columns: kolomExcel,
        rows,
        preLines: buatKopPreLines("REKAP MONITORING BY SPK", periode),
        rowStyleFn: (row: ExportRow) =>
          row.Perusahaan !== null && penanda.has(String(row.Perusahaan))
            ? { bold: true }
            : null,
      },
    ]);
    toast.success("Berhasil export Rekap Monitoring by SPK.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor data.");
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Rekap Monitoring by SPK"
    menu-id="963"
    storage-id="spanduk-rekap-monitoring-by-spk"
    :icon="IconListDetails"
    :headers="headers"
    :items="itemsTampil"
    :is-loading="isLoading"
    :can-export="canExport"
    v-model:filter-state="filterState"
    :summary-columns="[...kolomTotal]"
    :summary-formatters="summaryFormatters"
    :items-per-page="200"
    item-value="Nomor_SPK"
    search-placeholder="Cari nomor SPK / nama SPK..."
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <span class="rk-lbl">Tanggal</span>
      <input v-model="filterState.dtAwal" type="date" class="rk-inp" />
      <span class="rk-lbl">s/d</span>
      <input v-model="filterState.dtAkhir" type="date" class="rk-inp" />

      <span class="rk-lbl rk-sep">Perusahaan</span>
      <input
        :value="filterState.perusahaanKode"
        readonly
        placeholder="Semua"
        class="rk-inp rk-kode"
        @click="showPerusahaan = true"
      />
      <button
        type="button"
        class="rk-btn-ic"
        title="Pilih perusahaan"
        @click="showPerusahaan = true"
      >
        <IconSearch :size="14" :stroke-width="1.8" />
      </button>
      <input
        :value="filterState.perusahaanNama"
        readonly
        class="rk-inp rk-nama"
      />
      <button
        v-if="filterState.perusahaanKode"
        type="button"
        class="rk-btn-ic"
        title="Kosongkan perusahaan"
        @click="kosongkanPerusahaan"
      >
        <IconX :size="14" :stroke-width="1.8" />
      </button>
    </template>

    <template #item.Tgl_SPK="{ item }">{{ tglJam(item.Tgl_SPK) }}</template>
    <template #item.Deadline="{ item }">
      {{ item.Deadline ? formatTanggal(item.Deadline) : "-" }}
    </template>
    <template #item.Panjang="{ item }">{{ angka(item.Panjang) }}</template>
    <template #item.Lebar="{ item }">{{ angka(item.Lebar) }}</template>
    <template #item.Jml_Order="{ item }">{{ angka(item.Jml_Order) }}</template>
    <template #item.Kurang_Cetak="{ item }">
      <span :class="{ neg: item.Kurang_Cetak < 0 }">{{
        angka(item.Kurang_Cetak)
      }}</span>
    </template>
    <template #item.Kurang_Jahit="{ item }">
      <span :class="{ neg: item.Kurang_Jahit < 0 }">{{
        angka(item.Kurang_Jahit)
      }}</span>
    </template>
    <template #item.Kurang_Lipat="{ item }">
      <span :class="{ neg: item.Kurang_Lipat < 0 }">{{
        angka(item.Kurang_Lipat)
      }}</span>
    </template>
  </BaseBrowse>

  <PerusahaanSearchModal
    v-model="showPerusahaan"
    @selected="onPerusahaanDipilih"
  />
</template>

<style scoped>
.rk-lbl {
  font-size: 11px;
  font-weight: 500;
}
.rk-sep {
  margin-left: 8px;
}
.rk-inp {
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
}
.rk-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
.rk-kode {
  width: 70px;
  cursor: pointer;
}
.rk-nama {
  width: 200px;
}
.rk-btn-ic {
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
.rk-btn-ic:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}
.neg {
  color: #c62828;
}
</style>
