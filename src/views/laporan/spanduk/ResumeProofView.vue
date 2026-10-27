<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import { useTabsStore } from "@/stores/tabsStore";
import {
  IconChartBar,
  IconFileSpreadsheet,
  IconReport,
  IconRefresh,
  IconX,
} from "@tabler/icons-vue";
import { exportExcel, type ExcelColumn } from "@/utils/excelExport";
import { buatKopPreLines } from "@/utils/kopLaporan";
import {
  resumeProofService,
  type ResumeProofData,
} from "@/services/laporan/spanduk/resumeProofService";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();
const route = useRoute();
const tabsStore = useTabsStore();
const tutup = () => tabsStore.closeTab(route.path);

type BarisExport = Record<string, string | number>;

// ── Helper ──
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtN = (v: number) => new Intl.NumberFormat("id-ID").format(v);
const fmtPersen = (v: number) =>
  `${new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)} %`;
const pesanError = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { message?: string } } })?.response?.data
    ?.message || fallback;

// ── State ──
const sekarang = new Date();
const tglAwal = ref(
  ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
);
const tglAkhir = ref(ymd(sekarang));
const data = ref<ResumeProofData | null>(null);
const isLoading = ref(false);
const eksporJenis = ref<"" | "polos" | "resume">("");

const units = computed(() => data.value?.Units ?? []);

// Penjaga respons usang: periode bisa diganti saat request sebelumnya masih jalan
let seq = 0;
const fetchData = async () => {
  if (!tglAwal.value || !tglAkhir.value) {
    return toast.warning("Periode wajib diisi.");
  }
  if (tglAwal.value > tglAkhir.value) {
    return toast.warning("Tanggal awal tidak boleh melebihi tanggal akhir.");
  }
  const saya = ++seq;
  isLoading.value = true;
  try {
    const res = await resumeProofService.getResume({
      tglAwal: tglAwal.value,
      tglAkhir: tglAkhir.value,
    });
    if (saya !== seq) return;
    data.value = res.data?.data ?? null;
  } catch (e) {
    if (saya !== seq) return;
    data.value = null;
    toast.error(pesanError(e, "Gagal memuat data."));
  } finally {
    if (saya === seq) isLoading.value = false;
  }
};

onMounted(fetchData);

// Muat ulang saat tab diaktifkan kembali (aktivasi pertama sudah ditangani onMounted)
let sudahAktif = false;
onActivated(() => {
  if (!sudahAktif) {
    sudahAktif = true;
    return;
  }
  fetchData();
});

// ── Export ──
const kolomHari = (): ExcelColumn[] => [
  { header: "LAMA PROOF (HARI)", key: "Label", width: 20, align: "center" },
  ...units.value.map(
    (u): ExcelColumn => ({
      header: u,
      key: `u_${u}`,
      width: 12,
      align: "center",
      numFmt: "#,##0",
    }),
  ),
  {
    header: "TOTAL",
    key: "Total",
    width: 12,
    align: "center",
    numFmt: "#,##0",
  },
];

const barisHari = (): BarisExport[] => {
  const d = data.value;
  if (!d) return [];
  const baris: BarisExport[] = d.Rows.map((r) => {
    const o: BarisExport = { Label: r.Label, Total: r.Total };
    for (const u of d.Units) o[`u_${u}`] = r.Per_Unit[u] ?? 0;
    return o;
  });
  const tot: BarisExport = { Label: "TOTAL", Total: d.Total, _total: 1 };
  for (const u of d.Units) tot[`u_${u}`] = d.Total_Per_Unit[u] ?? 0;
  baris.push(tot);
  return baris;
};

const kolomRekap: ExcelColumn[] = [
  { header: "LAMA PROOF (HARI)", key: "Label", width: 20, align: "center" },
  {
    header: "JUMLAH SPK",
    key: "Jumlah",
    width: 14,
    align: "center",
    numFmt: "#,##0",
  },
  {
    header: "PERSEN",
    key: "Persen",
    width: 12,
    align: "center",
    numFmt: '0.00"%"',
  },
];

const barisRekap = (): BarisExport[] => {
  const d = data.value;
  if (!d) return [];
  const baris: BarisExport[] = d.Rekap.map((r) => ({
    Label: r.Label,
    Jumlah: r.Jumlah,
    Persen: r.Persen,
  }));
  baris.push({
    Label: "TOTAL",
    Jumlah: d.Total,
    Persen: d.Total > 0 ? 100 : 0,
    _total: 1,
  });
  return baris;
};

const gayaTotal = (row: BarisExport) =>
  row._total ? { bold: true, fillColor: "E3F2FD" } : null;

// Export: Excel polos tabel hari x perusahaan (tanpa kop)
const onExport = async () => {
  if (!data.value) return;
  eksporJenis.value = "polos";
  try {
    await exportExcel(
      `Export_Resume_Proof_${tglAwal.value}_${tglAkhir.value}.xlsx`,
      [
        {
          sheetName: "Resume Proof",
          columns: kolomHari(),
          rows: barisHari(),
          headerColor: "A9C8F0",
          headerFontColor: "000000",
          zebra: false,
          autoFilter: false,
          rowStyleFn: gayaTotal,
        },
      ],
    );
    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    eksporJenis.value = "";
  }
};

// Resume Proof: Excel berkop, dua sheet (hari x perusahaan, rekap kelompok)
const onResume = async () => {
  if (!data.value) return;
  eksporJenis.value = "resume";
  try {
    const kop = () =>
      buatKopPreLines(
        "NAMA LAPORAN : Resume Proof",
        `PERIODE : ${formatTanggal(tglAwal.value)} s.d ${formatTanggal(tglAkhir.value)}`,
      );
    const gaya = {
      headerColor: "A9C8F0",
      headerFontColor: "000000",
      zebra: false,
      autoFilter: false,
      rowStyleFn: gayaTotal,
    };
    await exportExcel(`Resume_Proof_${tglAwal.value}_${tglAkhir.value}.xlsx`, [
      {
        sheetName: "Resume Proof",
        columns: kolomHari(),
        rows: barisHari(),
        preLines: kop(),
        ...gaya,
      },
      {
        sheetName: "Rekap Kelompok",
        columns: kolomRekap,
        rows: barisRekap(),
        preLines: kop(),
        ...gaya,
      },
    ]);
    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    eksporJenis.value = "";
  }
};
</script>

<template>
  <PageLayout title="Resume Proof" menu-id="963" :icon="IconChartBar">
    <template #header-actions>
      <v-btn
        size="small"
        color="green"
        :disabled="!data || eksporJenis !== ''"
        :loading="eksporJenis === 'polos'"
        @click="onExport"
      >
        <template #prepend
          ><IconFileSpreadsheet :size="15" :stroke-width="1.7"
        /></template>
        Export
      </v-btn>
      <v-btn
        size="small"
        color="primary"
        :disabled="!data || eksporJenis !== ''"
        :loading="eksporJenis === 'resume'"
        @click="onResume"
      >
        <template #prepend
          ><IconReport :size="15" :stroke-width="1.7"
        /></template>
        Resume Proof
      </v-btn>
      <v-btn size="small" variant="text" @click="tutup">
        <template #prepend><IconX :size="15" :stroke-width="2" /></template>
        Tutup
      </v-btn>
    </template>

    <div class="rp-content">
      <!-- Filter -->
      <div class="rp-filter">
        <span class="rp-lbl">Periode</span>
        <input v-model="tglAwal" type="date" class="rp-inp" />
        <span class="rp-lbl">s.d</span>
        <input v-model="tglAkhir" type="date" class="rp-inp" />
        <v-btn
          size="small"
          color="primary"
          :loading="isLoading"
          @click="fetchData"
        >
          <template #prepend
            ><IconRefresh :size="15" :stroke-width="1.7"
          /></template>
          Refresh
        </v-btn>
        <span class="rp-hint"
          >Periode mengikuti tanggal MAP; lama proof = tanggal proof dikurangi
          tanggal MAP.</span
        >
      </div>

      <div v-if="data && data.Tanpa_Tgl_Proof > 0" class="rp-note">
        {{ fmtN(data.Tanpa_Tgl_Proof) }} proof pada periode ini belum diisi
        tanggal proof, sehingga tidak ikut dihitung.
      </div>

      <div v-if="!data" class="rp-empty">
        {{ isLoading ? "Memuat data..." : "Belum ada data." }}
      </div>

      <div v-else class="rp-body">
        <!-- Tabel kiri: hari x perusahaan -->
        <div class="rp-box rp-box-hari">
          <div class="rp-title">Jumlah Proof per Lama Proof dan Perusahaan</div>
          <div class="rp-scroll">
            <table class="rp-table">
              <thead>
                <tr>
                  <th>LAMA PROOF (HARI)</th>
                  <th v-for="u in units" :key="u">{{ u }}</th>
                  <th>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in data.Rows" :key="r.Hari">
                  <td class="rp-lbl-hari">{{ r.Label }}</td>
                  <td
                    v-for="u in units"
                    :key="u"
                    :class="{ 'rp-nol': !r.Per_Unit[u] }"
                  >
                    {{ fmtN(r.Per_Unit[u] ?? 0) }}
                  </td>
                  <td class="rp-tot-kol" :class="{ 'rp-nol': !r.Total }">
                    {{ fmtN(r.Total) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>TOTAL</td>
                  <td v-for="u in units" :key="u">
                    {{ fmtN(data.Total_Per_Unit[u] ?? 0) }}
                  </td>
                  <td>{{ fmtN(data.Total) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Tabel kanan: rekap kelompok -->
        <div class="rp-box rp-box-rekap">
          <div class="rp-title">Rekap Kelompok Lama Proof</div>
          <div class="rp-scroll">
            <table class="rp-table">
              <thead>
                <tr>
                  <th>LAMA PROOF (HARI)</th>
                  <th>JUMLAH SPK</th>
                  <th>PERSEN</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in data.Rekap" :key="r.Label">
                  <td class="rp-lbl-hari">{{ r.Label }}</td>
                  <td :class="{ 'rp-nol': !r.Jumlah }">
                    {{ fmtN(r.Jumlah) }}
                  </td>
                  <td :class="{ 'rp-nol': !r.Jumlah }">
                    {{ fmtPersen(r.Persen) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>TOTAL</td>
                  <td>{{ fmtN(data.Total) }}</td>
                  <td>{{ fmtPersen(data.Total > 0 ? 100 : 0) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div class="rp-foot">
            Persen dihitung dari proof yang sudah bertanggal proof.
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.rp-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1 1 0;
  min-height: 0;
  gap: 8px;
  padding: 8px;
  overflow: auto;
  font-size: 11px;
}
.rp-filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
  padding: 7px 12px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
}
.rp-lbl {
  font-size: 11px;
  font-weight: 500;
}
.rp-hint {
  margin-left: auto;
  font-size: 10px;
  color: #757575;
}
.rp-inp {
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
}
.rp-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
.rp-note {
  flex-shrink: 0;
  padding: 6px 10px;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 4px;
  color: #6d4c00;
  font-size: 11px;
}
.rp-empty {
  padding: 40px 16px;
  text-align: center;
  color: #9e9e9e;
}
.rp-body {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.rp-box {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}
.rp-box-hari {
  flex: 1 1 520px;
  min-width: 0;
}
.rp-box-rekap {
  flex: 0 0 360px;
}
.rp-title {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  background: #e3f2fd;
  border-bottom: 1px solid #bbdefb;
}
.rp-scroll {
  overflow-x: auto;
}
.rp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.rp-table th {
  background: #1565c0;
  color: #fff;
  font-weight: 700;
  padding: 6px 8px;
  text-align: center;
  white-space: nowrap;
  border-right: 1px solid rgba(255, 255, 255, 0.25);
}
.rp-table td {
  padding: 4px 8px;
  text-align: center;
  border-bottom: 1px solid #f0f0f0;
  font-variant-numeric: tabular-nums;
}
.rp-lbl-hari {
  font-weight: 600;
}
.rp-tot-kol {
  font-weight: 700;
  background: #fafafa;
}
.rp-nol {
  color: #bdbdbd;
}
.rp-table tbody tr:hover td {
  background: #e3f2fd;
}
.rp-table tfoot td {
  background: #1565c0;
  color: #fff;
  font-weight: 700;
  font-family: monospace;
  padding: 6px 8px;
}
.rp-foot {
  padding: 5px 10px;
  font-size: 10px;
  color: #757575;
  border-top: 1px solid #e0e0e0;
}
</style>
