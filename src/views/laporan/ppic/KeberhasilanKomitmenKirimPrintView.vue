<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import KomitmenGantt from "@/components/laporan/KomitmenGantt.vue";
import { keberhasilanKomitmenKirimService } from "@/services/laporan/ppic/keberhasilanKomitmenKirimService";

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const ringkasan = ref<any>(null);
const periode = ref<any[]>([]);
const detailAll = ref<any[]>([]);

const pad2 = (n: number) => String(n).padStart(2, "0");
const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const getAwalBulan = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
};

const q = route.query;
const startDate = String(q.startDate || getAwalBulan());
const endDate = String(q.endDate || getLocalDate());
const cabang = q.cabang ? String(q.cabang) : "";
const tipe = q.tipe ? String(q.tipe) : "";
const includeBerjalan = q.includeBerjalan === "1";
const withDetail = q.detail === "1";

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

const waktuCetak = computed(() => {
  const d = new Date();
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
});

const handlePrint = () => window.print();

onMounted(async () => {
  try {
    const res = await keberhasilanKomitmenKirimService.getBrowse({
      startDate,
      endDate,
      cabang: cabang || undefined,
      tipe: tipe || undefined,
      includeBerjalan: includeBerjalan ? 1 : undefined,
    });
    const d = res.data.data || {};
    ringkasan.value = d.ringkasan || null;
    periode.value = d.periode || [];
    detailAll.value = d.detail || [];
    isLoaded.value = true;
  } catch {
    isError.value = true;
  }
});
</script>

<template>
  <div v-if="isError" class="loading-state">Gagal memuat data laporan.</div>
  <div v-else-if="!isLoaded" class="loading-state">
    Mempersiapkan dokumen cetak...
  </div>
  <div v-else class="print-container">
    <div class="no-print print-actions">
      <button @click="handlePrint">🖨️ Cetak</button>
    </div>

    <div class="print-page">
      <div class="p-head">
        <div>
          <div class="p-title">KEBERHASILAN KOMITMEN KIRIM</div>
          <div class="p-sub">
            Periode {{ fmtDate(startDate) }} s.d. {{ fmtDate(endDate) }} ·
            Cabang: {{ cabang || "Semua" }} · Tipe: {{ tipe || "Semua" }}
            <span v-if="!includeBerjalan">
              · Minggu berjalan tidak dihitung</span
            >
          </div>
        </div>
        <div v-if="ringkasan" class="p-kpi">
          <div class="p-kpi-big" :class="pctClass(ringkasan.Persen)">
            {{ fmtPct(ringkasan.Persen) }}
          </div>
          <div class="p-kpi-sub">
            {{ fmtNum(ringkasan.Tercapai) }} /
            {{ fmtNum(ringkasan.Rencana) }} pcs
          </div>
          <div class="p-kpi-sub">
            SO {{ fmtPct(ringkasan.PersenSO) }} · MAP
            {{ fmtPct(ringkasan.PersenMAP) }}
          </div>
        </div>
      </div>

      <KomitmenGantt
        :periode="periode"
        :detail="detailAll"
        :start-date="startDate"
        :end-date="endDate"
        :include-berjalan="includeBerjalan"
        print-mode
        :initial-expand="withDetail"
      />

      <div class="p-foot">Dicetak {{ waktuCetak }}</div>
    </div>
  </div>
</template>

<style scoped>
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-family: Arial, sans-serif;
}
.print-container {
  font-family: Arial, sans-serif;
  color: #000;
}
.print-actions {
  text-align: right;
  padding: 10px 15px;
  background: #f5f5f5;
}
.print-actions button {
  padding: 8px 16px;
  font-size: 10pt;
  font-weight: bold;
  cursor: pointer;
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 4px;
}
.print-page {
  width: 1030px;
  margin: 0 auto;
  padding: 10px 8px 16px;
  background: #fff;
}
.p-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  border-bottom: 2px solid #0d3b66;
  padding-bottom: 6px;
}
.p-title {
  font-size: 15pt;
  font-weight: 800;
  color: #0d3b66;
}
.p-sub {
  font-size: 9pt;
  color: #444;
  margin-top: 2px;
}
.p-kpi {
  text-align: right;
}
.p-kpi-big {
  font-size: 22pt;
  font-weight: 800;
  line-height: 1;
}
.p-kpi-sub {
  font-size: 8.5pt;
  color: #444;
}
.p-foot {
  text-align: right;
  font-size: 7.5pt;
  color: #666;
  margin-top: 6px;
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

@media screen {
  .print-container {
    background: #555;
    padding: 0 0 20px;
  }
  .print-page {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    margin-top: 12px;
  }
}
@media print {
  @page {
    size: A4 landscape;
    margin: 8mm;
  }
  .no-print {
    display: none !important;
  }
  .print-container {
    background: transparent;
  }
  .print-page {
    width: 100%;
    padding: 0;
  }
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
