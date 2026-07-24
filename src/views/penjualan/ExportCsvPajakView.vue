<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportCsvPajakService as svc } from "@/services/penjualan/exportCsvPajakService";
import {
  IconFileSpreadsheet,
  IconFileTypeCsv,
  IconFileTypeXls,
  IconSearch,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import InvoiceFakturPajakSearchModal from "@/components/lookups/InvoiceFakturPajakSearchModal.vue";

const toast = useToast();

// ── Helpers ────────────────────────────────────────────────
const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

// ── Filter — default hari ini s.d. hari ini ─────────────────
const tglAwal = ref(todayLocal());
const tglAkhir = ref(todayLocal());
const cusKode = ref("");
const perushKode = ref("");
const nomor = ref("");
// ── Lookup Modals ────────────────────────────────────────────────────
const showCusModal = ref(false);
const showPerushModal = ref(false);
const showInvoiceModal = ref(false);

// Display name — murni utk UX, tidak dikirim ke backend (filter tetap
// pakai kode)
const cusNamaDisplay = ref("");
const perushNamaDisplay = ref("");

const selectCustomer = (item: any) => {
  cusKode.value = item.Kode || item.cus_kode || "";
  cusNamaDisplay.value = item.Nama || item.cus_nama || "";
  showCusModal.value = false;
};

const selectPerush = (item: any) => {
  perushKode.value = item.perush_kode || item.Kode || "";
  perushNamaDisplay.value = item.perush_nama || item.Nama || "";
  showPerushModal.value = false;
};

const selectInvoice = (item: any) => {
  nomor.value = item.Nomor || "";
  showInvoiceModal.value = false;
};

// Kalau user ngetik manual (bukan lewat modal), display name jadi basi
// — bersihkan supaya nggak nyesatkan
watch(cusKode, (val) => {
  if (!val) cusNamaDisplay.value = "";
});
watch(perushKode, (val) => {
  if (!val) perushNamaDisplay.value = "";
});

const filterState = computed(() => ({
  tglAwal: tglAwal.value,
  tglAkhir: tglAkhir.value,
  cusKode: cusKode.value,
  perushKode: perushKode.value,
  nomor: nomor.value,
}));
const onFilterStateRestore = (val: any) => {
  if (val?.tglAwal) tglAwal.value = val.tglAwal;
  if (val?.tglAkhir) tglAkhir.value = val.tglAkhir;
  if (val?.cusKode !== undefined) cusKode.value = val.cusKode;
  if (val?.perushKode !== undefined) perushKode.value = val.perushKode;
  if (val?.nomor !== undefined) nomor.value = val.nomor;
};

// ── useBrowse ──────────────────────────────────────────────
const { items, isLoading, selected, fetchData } = useBrowse({
  menuId: "160",
  fetchApi: async () => {
    const res = await svc.getBrowse(
      tglAwal.value,
      tglAkhir.value,
      cusKode.value,
      perushKode.value,
      nomor.value,
    );
    return res.data.data ?? [];
  },
});

// ── Expand detail ────────────────────────────────────────────
const detailCache = ref<Record<string, any[]>>({});
const loadingDetails = ref<Set<string>>(new Set());
const expandedItems = ref<any[]>([]);

const onExpandChange = async (newExpanded: any[]) => {
  expandedItems.value = newExpanded;
  const newKeys = newExpanded.map((i: any) => (i.raw || i).Nomor);
  for (const nom of newKeys) {
    if (!detailCache.value[nom] && !loadingDetails.value.has(nom)) {
      loadingDetails.value = new Set([...loadingDetails.value, nom]);
      try {
        const res = await svc.getBrowseDetail(nom);
        detailCache.value[nom] = res.data.data ?? [];
      } catch {
        detailCache.value[nom] = [];
      } finally {
        loadingDetails.value.delete(nom);
        loadingDetails.value = new Set(loadingDetails.value);
      }
    }
  }
};

// ── Headers ────────────────────────────────────────────────
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "90px" },
  { title: "Customer", key: "NamaCustomer", minWidth: "180px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
  { title: "Status", key: "Status", width: "100px" },
  { title: "Otomatis", key: "Otomatis", width: "90px" },
  { title: "Total", key: "Total", width: "130px", align: "end" },
  { title: "Faktur Pajak", key: "FakturPajak", width: "160px" },
];

// ── Auto refresh — debounce untuk filter teks, langsung utk tanggal ──
let debounce: ReturnType<typeof setTimeout> | null = null;
const debouncedFetch = () => {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(fetchData, 400);
};

watch([tglAwal, tglAkhir], fetchData);
watch([cusKode, perushKode, nomor], debouncedFetch);
onMounted(fetchData);

// ── Export ─────────────────────────────────────────────────
const isExportingCsv = ref(false);
const isExportingXls = ref(false);
const showExportConfirm = ref(false);
const pendingExportMode = ref<"csv" | "xlsx" | null>(null);

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const askExport = (mode: "csv" | "xlsx") => {
  if (!items.value?.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  pendingExportMode.value = mode;
  showExportConfirm.value = true;
};

const confirmExport = async () => {
  const mode = pendingExportMode.value;
  showExportConfirm.value = false;
  if (!mode) return;

  const payload = {
    tglAwal: tglAwal.value,
    tglAkhir: tglAkhir.value,
    cusKode: cusKode.value,
    perushKode: perushKode.value,
    nomor: nomor.value,
  };

  if (mode === "csv") {
    isExportingCsv.value = true;
    try {
      const res = await svc.exportCsv(payload);
      downloadBlob(
        new Blob([res.data], { type: "text/csv" }),
        `FakturPajak_${tglAwal.value}_${tglAkhir.value}.csv`,
      );
      toast.success("Export CSV berhasil.");
      fetchData();
    } catch (e: any) {
      toast.error("Gagal export CSV.");
    } finally {
      isExportingCsv.value = false;
    }
  } else {
    isExportingXls.value = true;
    try {
      const res = await svc.exportXlsx(payload);
      downloadBlob(
        new Blob([res.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `FakturPajak_${tglAwal.value}_${tglAkhir.value}.xlsx`,
      );
      toast.success("Export XLSX berhasil.");
      fetchData();
    } catch (e: any) {
      toast.error("Gagal export XLSX.");
    } finally {
      isExportingXls.value = false;
    }
  }
  pendingExportMode.value = null;
};
</script>

<template>
  <BaseBrowse
    title="Export CSV ke Faktur Pajak"
    menu-id="160"
    :icon="IconFileSpreadsheet"
    :is-loading="isLoading"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    search-placeholder="Cari nomor, customer, keterangan..."
    :selected="selected"
    :show-expand="true"
    :loading-details="loadingDetails"
    :expanded="expandedItems"
    :filter-state="filterState"
    @update:filter-state="onFilterStateRestore"
    @update:selected="selected = $event"
    @update:expanded="onExpandChange"
    @refresh="fetchData"
  >
    <!-- ── Filter ── -->
    <template #filter-left>
      <label class="flbl">Tanggal</label>
      <input type="date" v-model="tglAwal" class="finp" />
      <span class="fsep">s.d.</span>
      <input type="date" v-model="tglAkhir" class="finp" />

      <label class="flbl ml10">Customer</label>
      <div class="ig">
        <input
          v-model="cusKode"
          class="finp-ig"
          placeholder="Kode customer..."
          style="text-transform: uppercase"
          @keydown.f1.prevent="showCusModal = true"
        />
        <button class="ibtn" @click="showCusModal = true">
          <IconSearch :size="11" color="#1565c0" />
        </button>
      </div>
      <span v-if="cusNamaDisplay" class="fname">{{ cusNamaDisplay }}</span>

      <label class="flbl ml10">Perusahaan</label>
      <div class="ig">
        <input
          v-model="perushKode"
          class="finp-ig"
          placeholder="Kode perusahaan..."
          style="text-transform: uppercase"
          @keydown.f1.prevent="showPerushModal = true"
        />
        <button class="ibtn" @click="showPerushModal = true">
          <IconSearch :size="11" color="#1565c0" />
        </button>
      </div>
      <span v-if="perushNamaDisplay" class="fname">{{
        perushNamaDisplay
      }}</span>

      <label class="flbl ml10">Nomor</label>
      <div class="ig">
        <input
          v-model="nomor"
          class="finp-ig"
          placeholder="Nomor invoice..."
          style="text-transform: uppercase"
          @keydown.f1.prevent="showInvoiceModal = true"
        />
        <button class="ibtn" @click="showInvoiceModal = true">
          <IconSearch :size="11" color="#1565c0" />
        </button>
      </div>
    </template>

    <!-- ── Extra actions ── -->
    <template #extra-actions>
      <v-btn
        size="small"
        variant="outlined"
        color="success"
        :loading="isExportingCsv"
        @click="askExport('csv')"
      >
        <IconFileTypeCsv :size="14" style="margin-right: 4px" />
        Export Csv
      </v-btn>

      <v-btn
        size="small"
        variant="outlined"
        color="teal"
        :loading="isExportingXls"
        @click="askExport('xlsx')"
      >
        <IconFileTypeXls :size="14" style="margin-right: 4px" />
        Export XLS
      </v-btn>
    </template>

    <!-- ── Custom cell rendering ── -->
    <template #item.Status="{ item }">
      <span
        class="chip"
        :class="{
          'chip-green': item.Status === 'Normal',
          'chip-orange': item.Status === 'Proforma',
          'chip-red': item.Status === 'Tidak Normal',
        }"
        >{{ item.Status }}</span
      >
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <template #item.Total="{ item }">
      {{ num(item.Total) }}
    </template>

    <!-- ── Expanded detail ── -->
    <template #detail="{ item }">
      <div class="dtbl-wrap">
        <table class="dtbl">
          <thead>
            <tr>
              <th style="width: 26px">#</th>
              <th style="width: 130px">Kode</th>
              <th style="min-width: 200px">Nama</th>
              <th style="width: 100px">Ukuran</th>
              <th style="width: 80px; text-align: right">Jumlah</th>
              <th style="width: 100px; text-align: right">Harga</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="detailCache[item.Nomor]?.length">
              <tr v-for="(d, j) in detailCache[item.Nomor]" :key="j">
                <td style="text-align: center; color: #9e9e9e; font-size: 10px">
                  {{ j + 1 }}
                </td>
                <td
                  style="
                    font-family: monospace;
                    font-size: 10px;
                    color: #1565c0;
                  "
                >
                  {{ d.Kode }}
                </td>
                <td>{{ d.Nama }}</td>
                <td>{{ d.Ukuran }}</td>
                <td style="text-align: right">{{ num(d.Jumlah) }}</td>
                <td style="text-align: right">{{ num(d.Harga) }}</td>
              </tr>
            </template>
            <tr v-else-if="loadingDetails.has(item.Nomor)">
              <td
                colspan="6"
                style="text-align: center; padding: 8px; color: #9e9e9e"
              >
                Memuat...
              </td>
            </tr>
            <tr v-else>
              <td
                colspan="6"
                style="
                  text-align: center;
                  padding: 8px;
                  color: #9e9e9e;
                  font-style: italic;
                "
              >
                Tidak ada detail
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <!-- Dialog konfirmasi export -->
  <v-dialog v-model="showExportConfirm" max-width="380px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Konfirmasi Export
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Export {{ items?.length ?? 0 }} invoice ke
        <b>{{ pendingExportMode === "csv" ? "CSV" : "XLSX" }}</b
        >?<br /><br />
        Invoice yang diexport akan ditandai sebagai
        <b>"Sudah Export"</b> dan tidak akan muncul lagi di daftar ini.
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="showExportConfirm = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          @click="confirmExport"
          >Ya, Export</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <CustomerSearchModal v-model="showCusModal" @selected="selectCustomer" />
  <PerusahaanSearchModal v-model="showPerushModal" @selected="selectPerush" />
  <InvoiceFakturPajakSearchModal
    v-model="showInvoiceModal"
    @selected="selectInvoice"
  />
</template>

<style scoped>
.flbl {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  white-space: nowrap;
}
.ml10 {
  margin-left: 10px;
}
.finp {
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
}
.finp:focus {
  border-color: #1565c0;
}
.ig {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  height: 28px;
  background: white;
  overflow: hidden;
}
.finp-ig {
  border: none;
  height: 26px;
  width: 110px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  font-family: inherit;
}
.ibtn {
  width: 24px;
  min-width: 24px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ibtn:hover {
  background: #bbdefb;
}
.fname {
  font-size: 10px;
  color: #1565c0;
  font-weight: 600;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fsep {
  font-size: 11px;
  color: #777;
}

.chip {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 8px;
}
.chip-green {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip-orange {
  background: #fff3e0;
  color: #e65100;
}
.chip-red {
  background: #ffebee;
  color: #c62828;
}

.dtbl-wrap {
  overflow-x: auto;
  max-width: 100%;
  margin: 6px 0 6px 32px;
  width: calc(100% - 32px);
  border-radius: 4px;
}
.dtbl {
  min-width: 600px;
  border-collapse: collapse;
  font-size: 11px;
  width: 100%;
}
.dtbl th {
  background: #455a64;
  color: white;
  padding: 3px 6px;
  font-size: 10px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}
.dtbl td {
  padding: 3px 6px;
  border-bottom: 0.3px solid #ececec;
  white-space: nowrap;
}
</style>
