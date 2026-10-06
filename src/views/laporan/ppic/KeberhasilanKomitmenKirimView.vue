<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import KomitmenGantt from "@/components/laporan/KomitmenGantt.vue";
import { keberhasilanKomitmenKirimService } from "@/services/laporan/ppic/keberhasilanKomitmenKirimService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import {
  IconTargetArrow,
  IconPrinter,
  IconFileSpreadsheet,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-vue";

const toast = useToast();

const pad2 = (n: number) => String(n).padStart(2, "0");
const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const getAwalBulan = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
};
const fmtDate = (val: string) => {
  if (!val) return "";
  const [y, m, d] = val.split("-");
  return `${d}/${m}/${y}`;
};
const fmtNum = (v: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Number(v) || 0,
  );
const fmtPct = (v: number) =>
  `${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(v) || 0)}%`;
const pctClass = (v: number) =>
  v >= 90 ? "c-hijau" : v >= 70 ? "c-oranye" : "c-merah";

// ── Filter ──
const cabangOptions = ["ALL", "P01", "P02", "P04", "P05"];
const tipeOptions = [
  { value: "", label: "Semua" },
  { value: "SO", label: "SO" },
  { value: "MAP", label: "MAP/Sampel" },
];
const filterState = ref({
  startDate: getAwalBulan(),
  endDate: getLocalDate(),
  cabang: "ALL",
  tipe: "",
  includeBerjalan: false,
});
const search = ref("");

// ── Data ──
const isLoading = ref(false);
const ringkasan = ref<any>(null);
const periode = ref<any[]>([]);
const detailAll = ref<any[]>([]);
const ganttRef = ref<InstanceType<typeof KomitmenGantt> | null>(null);

const fetchData = async () => {
  const f = filterState.value;
  if (!f.startDate) f.startDate = getAwalBulan();
  if (!f.endDate) f.endDate = getLocalDate();
  if (f.startDate > f.endDate)
    return toast.warning("Tanggal awal melebihi tanggal akhir.");
  isLoading.value = true;
  try {
    const res = await keberhasilanKomitmenKirimService.getBrowse({
      startDate: f.startDate,
      endDate: f.endDate,
      cabang: f.cabang && f.cabang !== "ALL" ? f.cabang : undefined,
      tipe: f.tipe || undefined,
      includeBerjalan: f.includeBerjalan ? 1 : undefined,
    });
    const d = res.data.data || {};
    ringkasan.value = d.ringkasan || null;
    periode.value = d.periode || [];
    detailAll.value = d.detail || [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};
onMounted(fetchData);

// ── Cetak: halaman baru ──
const openPrint = (withDetail: boolean) => {
  const f = filterState.value;
  const q = new URLSearchParams({
    startDate: f.startDate,
    endDate: f.endDate,
    detail: withDetail ? "1" : "0",
  });
  if (f.cabang && f.cabang !== "ALL") q.set("cabang", f.cabang);
  if (f.tipe) q.set("tipe", f.tipe);
  if (f.includeBerjalan) q.set("includeBerjalan", "1");
  window.open(
    `/laporan/ppic/keberhasilan-komitmen-kirim/print?${q.toString()}`,
    "_blank",
  );
};

// ── Export ──
const onExport = async () => {
  if (!detailAll.value.length)
    return toast.warning("Tidak ada data untuk diekspor.");
  const columns: ExcelColumn[] = [
    { header: "Cabang", key: "Cab", width: 8, align: "center" },
    { header: "Periode", key: "Periode", width: 16 },
    { header: "Mulai", key: "Mulai", width: 12, align: "center" },
    { header: "Selesai", key: "Selesai", width: 12, align: "center" },
    { header: "Tipe", key: "Tipe", width: 8, align: "center" },
    { header: "Jenis", key: "Jenis", width: 16 },
    { header: "Nomor", key: "Nomor", width: 18 },
    { header: "Nama", key: "Nama", width: 34 },
    {
      header: "Rencana",
      key: "Rencana",
      width: 11,
      align: "right",
      numFmt: "#,##0",
    },
    {
      header: "Kirim Kum.",
      key: "Aktual",
      width: 11,
      align: "right",
      numFmt: "#,##0",
    },
    {
      header: "Tercapai",
      key: "Tercapai",
      width: 11,
      align: "right",
      numFmt: "#,##0",
    },
    {
      header: "Persen (%)",
      key: "Persen",
      width: 11,
      align: "right",
      numFmt: "0.0",
    },
    {
      header: "Tgl Target Tercapai",
      key: "TglCapai",
      width: 18,
      align: "center",
    },
    { header: "Status", key: "Status", width: 12, align: "center" },
  ];
  const data = detailAll.value.map((d) => ({
    ...d,
    Mulai: fmtDate(d.Tgl1),
    Selesai: fmtDate(d.Tgl2),
    TglCapai: d.TglTercapai ? fmtDate(d.TglTercapai) : "",
  }));
  await exportExcelSingle(
    `Keberhasilan_Komitmen_Kirim_${filterState.value.startDate}_sd_${filterState.value.endDate}.xlsx`,
    "Keberhasilan Komitmen Kirim",
    columns,
    data,
    `Keberhasilan Komitmen Kirim | ${fmtDate(filterState.value.startDate)} s.d ${fmtDate(filterState.value.endDate)}`,
  );
};
</script>

<template>
  <div class="gantt-page">
    <div class="g-title">
      <IconTargetArrow :size="20" :stroke-width="1.8" />
      Keberhasilan Komitmen Kirim
    </div>

    <div class="g-filter">
      <span class="f-label">Periode</span>
      <input
        type="date"
        v-model="filterState.startDate"
        class="f-date"
        @change="fetchData"
      />
      <span class="f-label">s.d.</span>
      <input
        type="date"
        v-model="filterState.endDate"
        class="f-date"
        @change="fetchData"
      />

      <span class="f-label ml">Cabang</span>
      <select v-model="filterState.cabang" class="f-date" @change="fetchData">
        <option v-for="c in cabangOptions" :key="c" :value="c">{{ c }}</option>
      </select>

      <span class="f-label">Tipe</span>
      <select v-model="filterState.tipe" class="f-date" @change="fetchData">
        <option v-for="t in tipeOptions" :key="t.value" :value="t.value">
          {{ t.label }}
        </option>
      </select>

      <label class="f-check">
        <input
          type="checkbox"
          v-model="filterState.includeBerjalan"
          @change="fetchData"
        />
        Termasuk minggu berjalan
      </label>

      <v-text-field
        v-model="search"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        placeholder="Cari no. SO / MAP / nama / KK..."
        style="max-width: 300px"
      >
        <template #prepend-inner><IconSearch :size="16" /></template>
      </v-text-field>

      <div class="g-actions">
        <v-btn
          size="small"
          color="primary"
          variant="flat"
          :loading="isLoading"
          @click="fetchData"
        >
          <template #prepend
            ><IconRefresh :size="15" :stroke-width="1.7"
          /></template>
          Muat Ulang
        </v-btn>
        <v-btn size="small" variant="outlined" @click="ganttRef?.expandAll()"
          >Buka semua</v-btn
        >
        <v-btn size="small" variant="outlined" @click="ganttRef?.collapseAll()"
          >Tutup semua</v-btn
        >
        <v-btn size="small" color="grey-darken-3" @click="openPrint(false)">
          <template #prepend
            ><IconPrinter :size="15" :stroke-width="1.7"
          /></template>
          Cetak Ringkas
        </v-btn>
        <v-btn
          size="small"
          color="grey-darken-3"
          variant="outlined"
          @click="openPrint(true)"
        >
          Cetak + Rincian
        </v-btn>
        <v-btn
          size="small"
          color="green-darken-3"
          variant="outlined"
          @click="onExport"
        >
          <template #prepend
            ><IconFileSpreadsheet :size="15" :stroke-width="1.7"
          /></template>
          Export
        </v-btn>
      </div>
    </div>

    <v-progress-linear
      v-if="isLoading"
      indeterminate
      color="primary"
      height="3"
      class="mb-2"
    />

    <div class="g-kpi" v-if="ringkasan">
      <span class="kpi" :class="pctClass(ringkasan.Persen)">
        Keberhasilan {{ fmtPct(ringkasan.Persen) }}
      </span>
      <span class="kpi-sub">
        {{ fmtNum(ringkasan.Tercapai) }} / {{ fmtNum(ringkasan.Rencana) }} pcs
        ({{ ringkasan.JmlPeriode }} periode selesai)
      </span>
      <span class="kpi-sub">
        SO {{ fmtPct(ringkasan.PersenSO) }} · MAP
        {{ fmtPct(ringkasan.PersenMAP) }}
      </span>
    </div>

    <KomitmenGantt
      ref="ganttRef"
      :periode="periode"
      :detail="detailAll"
      :start-date="filterState.startDate || getAwalBulan()"
      :end-date="filterState.endDate || getLocalDate()"
      :include-berjalan="filterState.includeBerjalan"
      :loading="isLoading"
      :search="search"
    />
  </div>
</template>

<style scoped>
.gantt-page {
  padding: 10px 14px;
  font-size: 12px;
}
.g-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 800;
  color: #0d3b66;
  margin-bottom: 8px;
}
.g-filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.g-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-label.ml {
  margin-left: 10px;
}
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
}
.f-date:focus {
  border-color: #1976d2;
}
.f-check {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #555;
  cursor: pointer;
}
.g-kpi {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}
.kpi {
  font-size: 14px;
  font-weight: 800;
  padding: 3px 12px;
  border-radius: 4px;
  background: #f5f5f5;
}
.kpi-sub {
  font-size: 11px;
  color: #555;
}
.c-hijau {
  color: #2e7d32;
}
.c-oranye {
  color: #ef6c00;
}
.c-merah {
  color: #c62828;
}
</style>
