<!-- frontend/src/modal/MppbLookupView.vue -->
<template>
  <v-dialog v-model="dialogModel" max-width="1100px" scrollable>
    <v-card class="d-flex flex-column" style="max-height: 85vh">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <v-icon icon="mdi-file-document-outline" class="mr-2" size="20" />
        <span class="text-subtitle-1 font-weight-bold">
          Lookup Memo Permintaan Pembelian Bahan (MPPB)
        </span>
        <v-spacer />
        <v-btn
          icon="mdi-close"
          variant="text"
          density="comfortable"
          @click="dialogModel = false"
        />
      </v-card-title>

      <!-- Bar Pencarian & Filter Tanggal -->
      <v-card-text class="pa-3 bg-grey-lighten-4 border-b">
        <div class="d-flex flex-wrap gap-2 align-center">
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            label="Cari Nomor, Produk, Bahan, SPK..."
            variant="outlined"
            density="compact"
            hide-details
            class="flex-grow-1"
            clearable
          />

          <!-- Input Tanggal Sederhana (Replikasi startdate & enddate Delphi) -->
          <v-text-field
            v-model="startDate"
            type="date"
            label="Mulai"
            variant="outlined"
            density="compact"
            hide-details
            style="max-width: 155px"
            @change="fetchData"
          />
          <v-text-field
            v-model="endDate"
            type="date"
            label="Sampai"
            variant="outlined"
            density="compact"
            hide-details
            style="max-width: 155px"
            @change="fetchData"
          />

          <v-btn
            color="primary"
            variant="flat"
            density="comfortable"
            prepend-icon="mdi-refresh"
            :loading="loading"
            @click="fetchData"
          >
            Refresh
          </v-btn>
        </div>
      </v-card-text>

      <v-card-text class="pa-0 flex-grow-1">
        <v-data-table
          :headers="headers"
          :items="items"
          :search="search"
          :loading="loading"
          density="compact"
          hover
          fixed-header
          height="450px"
          @click:row="handleRowClick"
          @dblclick:row="handleRowClick"
        >
          <!-- Custom Render untuk Tanggal -->
          <template #[`item.tanggal`]="{ value }">
            {{ formatDate(value) }}
          </template>

          <!-- Format Qty Order -->
          <template #[`item.qty_order`]="{ value }">
            {{ Number(value || 0).toLocaleString("id-ID") }}
          </template>

          <!-- Custom Status Badge untuk Approve (Mirip pewarnaan Font clRed di Delphi) -->
          <template #[`item.approve`]="{ value }">
            <v-chip
              :color="value === 'Y' ? 'success' : 'error'"
              size="x-small"
              label
            >
              {{ value === "Y" ? "APPROVED" : "BELUM ACC" }}
            </v-chip>
          </template>

          <!-- Status Ngedit Pin (WAIT, ACC, TOLAK) dari custom draw cell Delphi -->
          <template #[`item.ngedit`]="{ value }">
            <v-chip
              :color="getNgeditColor(value)"
              v-if="value"
              size="x-small"
              class="text-white"
            >
              {{ value }}
            </v-chip>
          </template>

          <!-- Tombol Aksi Pilih -->
          <template #[`item.actions`]="{ item }">
            <v-btn
              color="primary"
              size="x-small"
              variant="flat"
              @click.stop="selectItem(item)"
            >
              Pilih
            </v-btn>
          </template>

          <!-- Fallback jika data kosong -->
          <template #no-data>
            <div class="pa-6 text-center text-grey">
              <v-icon
                icon="mdi-file-search-outline"
                size="32"
                class="mb-2 text-grey-lighten-1"
              />
              <div>Tidak ada memo MPPB ditemukan untuk periode ini.</div>
            </div>
          </template>
        </v-data-table>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-3 bg-white d-flex align-center justify-space-between">
        <div class="text-caption text-grey-darken-1 font-weight-medium">
          Total: {{ items.length }} Dokumen MPPB
        </div>
        <v-btn
          color="grey-darken-1"
          variant="text"
          size="small"
          @click="dialogModel = false"
        >
          Tutup
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import { format, subDays } from "date-fns";

const props = defineProps<{
  isVisible?: boolean;
  modelValue?: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", item: any): void;
  (e: "selected", item: any): void;
  (e: "update:isVisible", val: boolean): void;
  (e: "update:modelValue", val: boolean): void;
}>();

// Format tanggal default (30 hari terakhir)
const todayStr = format(new Date(), "yyyy-MM-dd");
const thirtyDaysAgoStr = format(subDays(new Date(), 30), "yyyy-MM-dd");

const startDate = ref(thirtyDaysAgoStr);
const endDate = ref(todayStr);
const items = ref<any[]>([]);
const loading = ref(false);
const search = ref("");

// Writable Computed untuk Sinkronisasi State Dialog Open/Close
const dialogModel = computed({
  get() {
    return props.isVisible !== undefined ? !!props.isVisible : !!props.modelValue;
  },
  set(value) {
    emit("update:isVisible", value);
    emit("update:modelValue", value);
    if (!value) emit("close");
  },
});

// Definisi Header Grid disesuaikan dengan Field Query Delphi
const headers = [
  { title: "No. MPPB", key: "nomor", sortable: true, width: "140px" },
  { title: "Tanggal", key: "tanggal", width: "105px" },
  { title: "Nama Produk", key: "nama_produk", minWidth: "150px" },
  { title: "Bahan", key: "bahan", minWidth: "140px" },
  { title: "Ukuran", key: "ukuran", width: "110px" },
  { title: "Gramasi", key: "gramasi", width: "95px" },
  { title: "Qty Order", key: "qty_order", align: "end" as const, width: "95px" },
  { title: "No. SPK", key: "spk", width: "120px" },
  { title: "No. PO", key: "no_po", width: "120px" },
  { title: "Approve", key: "approve", align: "center" as const, width: "95px" },
  { title: "Status Edit", key: "ngedit", align: "center" as const, width: "95px" },
  { title: "Keterangan", key: "keterangan", minWidth: "160px" },
  { title: "Aksi", key: "actions", sortable: false, align: "center" as const, width: "75px" },
];

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await api.get("/mmt/mppb/lookup", {
      params: {
        start_date: startDate.value,
        end_date: endDate.value,
      },
    });
    items.value = res.data?.success
      ? res.data.data
      : Array.isArray(res.data)
        ? res.data
        : [];
  } catch (e) {
    console.error("Gagal memuat data MPPB", e);
  } finally {
    loading.value = false;
  }
};

const selectItem = (row: any) => {
  const raw = row?.raw || row;
  emit("select", raw);
  emit("selected", raw);
  dialogModel.value = false;
};

const handleRowClick = (event: any, rowData: any) => {
  const item = rowData?.item || rowData;
  selectItem(item);
};

const formatDate = (date: any) =>
  date ? format(new Date(date), "dd/MM/yyyy") : "-";

// Replikasi logika warna dari cxGrdMasterCustomDrawCell di Delphi
const getNgeditColor = (status: string) => {
  switch (status) {
    case "WAIT":
      return "blue"; // clblue
    case "TOLAK":
      return "red"; // clred
    case "ACC":
      return "green"; // clgreen
    default:
      return "grey";
  }
};

watch(
  () => (props.isVisible !== undefined ? props.isVisible : props.modelValue),
  (newVal) => {
    if (newVal) fetchData();
  },
);
</script>
