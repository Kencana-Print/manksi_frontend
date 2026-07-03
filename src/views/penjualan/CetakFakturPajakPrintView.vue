<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { cetakFakturPajakService as svc } from "@/services/penjualan/cetakFakturPajakService";
import FakturPajakDocument from "./components/FakturPajakDocument.vue";

const route = useRoute();
const authStore = useAuthStore();
const nomor = route.query.nomor as string;

const header = ref<any>({});
const detail = ref<any[]>([]);
const isReady = ref(false);
const isLoading = ref(true);

const doPrint = () => window.print();
const doClose = () => window.close();

const formatPrintedAt = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const printedAtDisplay = ref(formatPrintedAt());
const printedByDisplay = computed(
  () => authStore.user?.nama || authStore.user?.kode || "-",
);

const fetchData = async () => {
  try {
    const res = await svc.getDataCetak(nomor);
    const d = res.data.data;
    header.value = d.header;
    detail.value = d.detail;
    isReady.value = true;
    setTimeout(() => window.print(), 600);
  } catch {
    alert("Gagal memuat data cetak.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  document.title = `Faktur Pajak - ${nomor}`;
  fetchData();
});
</script>

<template>
  <div class="print-root">
    <div v-if="isLoading" class="loading-screen">Menyiapkan cetak...</div>
    <template v-else-if="isReady">
      <div class="no-print toolbar">
        <span style="font-weight: 700; color: #1565c0"
          >Faktur Pajak — {{ nomor }}</span
        >
        <div style="display: flex; gap: 8px">
          <button class="tbtn" @click="doPrint">🖨️ Cetak</button>
          <button class="tbtn tbtn-grey" @click="doClose">✕ Tutup</button>
        </div>
      </div>

      <div
        v-for="lembar in [1, 2, 3]"
        :key="lembar"
        class="page"
        :class="{ 'page-break': lembar < 3 }"
      >
        <FakturPajakDocument
          :header="header"
          :detail="detail"
          :lembar="lembar"
        />
        <div class="printed-info">
          Dicetak oleh: {{ printedByDisplay }} — {{ printedAtDisplay }}
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 14px;
  color: #777;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: #1565c0;
  color: white;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 99;
}
.tbtn {
  padding: 5px 14px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.tbtn:hover {
  background: rgba(255, 255, 255, 0.25);
}
.tbtn-grey {
  background: rgba(0, 0, 0, 0.2);
}

.print-root {
  background: #e0e0e0;
  min-height: 100vh;
  padding-top: 50px;
  padding-bottom: 20px;
}
.page {
  width: 210mm;
  min-height: 297mm;
  background: white;
  margin: 10px auto;
  border: 1px solid #ccc;
  box-sizing: border-box;
}
.printed-info {
  font-size: 7.5pt;
  color: #777;
  text-align: right;
  padding: 0 12mm 8mm;
}
.page-break {
  page-break-after: always;
}

@media print {
  .no-print {
    display: none !important;
  }
  .print-root {
    background: white;
    padding: 0;
    margin: 0;
  }
  @page {
    size: 210mm 297mm;
    margin: 0;
  }
  .page {
    border: none;
    margin: 0;
    box-shadow: none;
  }
}
</style>
