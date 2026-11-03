<!-- frontend/src/components/lookups/PermintaanPembelianSearchModal.vue -->
<template>
  <v-dialog
    :model-value="isOpen"
    @update:model-value="isOpen = $event"
    max-width="1150px"
    scrollable
  >
    <v-card class="d-flex flex-column" style="max-height: 88vh">
      <!-- Toolbar Header -->
      <v-card-title class="bg-orange-darken-3 text-white d-flex align-center pa-3">
        <v-icon :icon="IconClipboardList" size="22" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold">
          Lookup Dokumen Pengajuan Permintaan (Persiapan)
        </span>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          size="small"
          density="comfortable"
          @click="isOpen = false"
        >
          <v-icon :icon="IconX" size="18" />
        </v-btn>
      </v-card-title>

      <!-- Petunjuk Aturan Sistem MMT -->
      <div class="px-3 py-2 bg-orange-lighten-5 border-b d-flex align-center gap-2">
        <v-icon icon="mdi-information-outline" size="18" color="orange-darken-4" />
        <div class="text-caption text-orange-darken-4">
          <strong>Aturan Persiapan MMT:</strong> Dokumen berstatus
          <span class="font-weight-bold text-success">OPEN</span> dapat ditarik untuk pembuatan Purchase Request.
          Dokumen berstatus <span class="font-weight-bold text-grey-darken-2">CLOSE</span> sudah diproses menjadi Minta Bahan/PR sebelumnya dan <strong>tidak dapat diambil kembali</strong>.
        </div>
      </div>

      <!-- Filter Controls: Periode, Keyword, Refresh, & Filter Status -->
      <v-card-text class="pa-3 bg-grey-lighten-4 border-b">
        <div class="d-flex flex-wrap align-center gap-2 mb-2">
          <div class="d-flex align-center gap-1">
            <span class="text-caption font-weight-bold text-grey-darken-2">Periode:</span>
            <input
              type="date"
              v-model="startDate"
              class="date-inp"
              @change="fetchData"
            />
            <span class="text-caption text-grey-darken-1">s/d</span>
            <input
              type="date"
              v-model="endDate"
              class="date-inp"
              @change="fetchData"
            />
          </div>

          <v-text-field
            v-model="search"
            label="Cari No PP / Keterangan / Jenis / Pembuat..."
            variant="outlined"
            density="compact"
            hide-details
            class="flex-grow-1"
            clearable
          >
            <template #prepend-inner>
              <v-icon :icon="IconSearch" size="16" />
            </template>
          </v-text-field>

          <v-btn
            color="orange-darken-3"
            variant="flat"
            density="comfortable"
            prepend-icon="mdi-refresh"
            :loading="isLoading"
            @click="fetchData"
          >
            Refresh
          </v-btn>
        </div>

        <!-- Quick Status Filter Tabs -->
        <div class="d-flex align-center gap-2 pt-1">
          <span class="text-caption font-weight-bold text-grey-darken-2 mr-1">
            Tampilkan:
          </span>
          <v-btn-toggle
            v-model="statusFilter"
            mandatory
            density="compact"
            color="orange-darken-3"
            rounded="sm"
          >
            <v-btn value="ALL" size="small" variant="outlined" class="text-caption">
              Semua ({{ items.length }})
            </v-btn>
            <v-btn
              value="OPEN"
              size="small"
              variant="outlined"
              class="text-caption text-success font-weight-bold"
            >
              <v-icon start :icon="IconCheck" size="14" />
              Bisa Diambil / OPEN ({{ countOpen }})
            </v-btn>
            <v-btn
              value="CLOSE"
              size="small"
              variant="outlined"
              class="text-caption text-grey-darken-2"
            >
              <v-icon start :icon="IconLock" size="14" />
              Sudah Diproses / CLOSE ({{ countClose }})
            </v-btn>
          </v-btn-toggle>
        </div>
      </v-card-text>

      <!-- Data Table -->
      <v-card-text class="pa-0 flex-grow-1">
        <v-data-table
          :headers="headers"
          :items="filteredItems"
          :loading="isLoading"
          density="compact"
          class="clickable-table"
          hover
          fixed-header
          height="430px"
          :items-per-page="15"
          :row-props="getRowProps"
          @click:row="onRowClick"
          @dblclick:row="onRowClick"
        >
          <!-- Tanggal Render -->
          <template #[`item.Tanggal`]="{ value }">
            {{ formatDate(value) }}
          </template>

          <!-- Jenis Render -->
          <template #[`item.Jenis`]="{ value }">
            <v-chip size="x-small" label color="blue-grey-lighten-4">
              {{ value || "-" }}
            </v-chip>
          </template>

          <!-- Keterangan Render -->
          <template #[`item.Keterangan`]="{ value }">
            <span :title="value || '-'">
              {{
                value
                  ? value.length > 50
                    ? value.substring(0, 50) + "..."
                    : value
                  : "-"
              }}
            </span>
          </template>

          <!-- Status ACC Render -->
          <template #[`item.Status_Acc`]="{ value }">
            <v-chip
              size="x-small"
              :color="value === 'Y' ? 'success' : 'warning'"
              label
              class="font-weight-bold"
            >
              {{ value === "Y" ? "ACC" : "PENDING" }}
            </v-chip>
          </template>

          <!-- Status Proses (Pembeda OPEN vs CLOSE) -->
          <template #[`item.Status_Proses`]="{ value }">
            <v-chip
              size="small"
              :color="value === 'OPEN' ? 'success' : 'grey-darken-1'"
              :variant="value === 'OPEN' ? 'flat' : 'tonal'"
              class="font-weight-bold text-caption"
            >
              <v-icon
                start
                :icon="value === 'OPEN' ? IconCheck : IconLock"
                size="13"
              />
              {{ value === "OPEN" ? "Bisa Diambil (OPEN)" : "Sudah Diproses (CLOSE)" }}
            </v-chip>
          </template>

          <!-- Tombol Aksi Pilih -->
          <template #[`item.actions`]="{ item }">
            <div class="text-center">
              <v-btn
                v-if="item.Status_Proses === 'OPEN'"
                color="orange-darken-3"
                size="x-small"
                variant="flat"
                class="font-weight-bold text-white px-3"
                @click.stop="selectItem(item)"
              >
                Pilih Dokumen
              </v-btn>
              <v-chip
                v-else
                size="x-small"
                color="grey-darken-1"
                variant="text"
                class="text-caption font-weight-medium"
              >
                <v-icon start :icon="IconLock" size="12" />
                Terkunci (CLOSE)
              </v-chip>
            </div>
          </template>

          <template #no-data>
            <div class="text-center py-6 text-grey">
              <v-icon icon="mdi-file-search-outline" size="32" class="mb-2 text-grey-lighten-1" />
              <div>Tidak ada dokumen pengajuan persiapan untuk kriteria filter ini.</div>
            </div>
          </template>
        </v-data-table>
      </v-card-text>

      <v-divider />

      <!-- Footer Modal -->
      <v-card-actions class="pa-3 bg-white d-flex align-center justify-space-between">
        <div class="text-caption text-grey-darken-1 font-weight-medium">
          Ditemukan: {{ filteredItems.length }} dokumen ({{ countOpen }} siap diambil, {{ countClose }} selesai diproses)
        </div>
        <v-btn color="grey-darken-1" variant="text" size="small" @click="isOpen = false">
          Tutup
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import {
  IconClipboardList,
  IconSearch,
  IconX,
  IconCheck,
  IconLock,
} from "@tabler/icons-vue";
import { useToast } from "vue-toastification";
import { format, subDays } from "date-fns";

const props = defineProps<{
  modelValue?: boolean;
  isVisible?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
  (e: "update:isVisible", val: boolean): void;
  (e: "selected", item: any): void;
  (e: "select", item: any): void;
  (e: "close"): void;
}>();

const toast = useToast();

const todayStr = format(new Date(), "yyyy-MM-dd");
const thirtyDaysAgoStr = format(subDays(new Date(), 30), "yyyy-MM-dd");

const startDate = ref(thirtyDaysAgoStr);
const endDate = ref(todayStr);
const search = ref("");
const statusFilter = ref<"ALL" | "OPEN" | "CLOSE">("ALL");
const items = ref<any[]>([]);
const isLoading = ref(false);

const isOpen = computed({
  get: () =>
    props.modelValue !== undefined ? !!props.modelValue : !!props.isVisible,
  set: (val: boolean) => {
    emit("update:modelValue", val);
    emit("update:isVisible", val);
    if (!val) emit("close");
  },
});

const headers = [
  { title: "No. Pengajuan (PP)", key: "Nomor", width: "165px", sortable: true },
  { title: "Tanggal", key: "Tanggal", width: "105px", align: "center" as const },
  { title: "Jenis", key: "Jenis", width: "110px", align: "center" as const },
  { title: "Priority", key: "Priority", width: "85px", align: "center" as const },
  { title: "Status ACC", key: "Status_Acc", width: "100px", align: "center" as const },
  { title: "Status Proses", key: "Status_Proses", width: "170px", align: "center" as const },
  { title: "Ditujukan Ke", key: "Ditujukan_Ke", width: "125px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
  { title: "Aksi", key: "actions", sortable: false, width: "135px", align: "center" as const },
];

const countOpen = computed(
  () => items.value.filter((it) => it.Status_Proses === "OPEN").length
);
const countClose = computed(
  () => items.value.filter((it) => it.Status_Proses === "CLOSE").length
);

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await api.get(
      "/mmt/bahan-baku-produksi/permintaan-pembelian/lookup",
      {
        params: { startDate: startDate.value, endDate: endDate.value },
      }
    );
    const d = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    items.value = d;
  } catch (err) {
    console.error("Gagal load lookup Pengajuan Permintaan:", err);
    toast.error("Gagal memuat data lookup Pengajuan Permintaan.");
  } finally {
    isLoading.value = false;
  }
};

const filteredItems = computed(() => {
  let list = items.value;

  if (statusFilter.value === "OPEN") {
    list = list.filter((it) => it.Status_Proses === "OPEN");
  } else if (statusFilter.value === "CLOSE") {
    list = list.filter((it) => it.Status_Proses === "CLOSE");
  }

  const q = search.value.trim().toLowerCase();
  if (!q) return list;

  return list.filter(
    (it) =>
      (it.Nomor && it.Nomor.toLowerCase().includes(q)) ||
      (it.Keterangan && it.Keterangan.toLowerCase().includes(q)) ||
      (it.Jenis && it.Jenis.toLowerCase().includes(q)) ||
      (it.Ditujukan_Ke && it.Ditujukan_Ke.toLowerCase().includes(q)) ||
      (it.Pembuat && it.Pembuat.toLowerCase().includes(q))
  );
});

const selectItem = (rowOrItem: any) => {
  const raw = rowOrItem?.raw || rowOrItem;
  if (!raw) return;

  // Logika MMT: Dokumen yang CLOSE sudah diproses menjadi Minta Bahan/PR
  if (raw.Status_Proses === "CLOSE") {
    toast.warning(
      `Dokumen Pengajuan ${raw.Nomor} sudah diproses (Status CLOSE) dan tidak dapat diambil kembali.`
    );
    return;
  }

  emit("selected", raw);
  emit("select", raw);
  isOpen.value = false;
};

const onRowClick = (_e: any, rowData: any) => {
  const item = rowData?.item?.raw || rowData?.item || rowData;
  selectItem(item);
};

const getRowProps = (data: any) => {
  const item = data.item?.raw || data.item;
  const isClose = item?.Status_Proses === "CLOSE";
  return {
    class: isClose ? "row-closed" : "row-open",
  };
};

const formatDate = (date: any) =>
  date ? format(new Date(date), "dd/MM/yyyy") : "-";

watch(
  () => (props.modelValue !== undefined ? props.modelValue : props.isVisible),
  (val) => {
    if (val) {
      search.value = "";
      fetchData();
    }
  }
);
</script>

<style scoped>
.date-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  color: #212121;
}

.clickable-table :deep(tr.row-open) {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.clickable-table :deep(tr.row-open:hover td) {
  background-color: #fff3e0 !important;
}

.clickable-table :deep(tr.row-closed td) {
  background-color: #f7f7f7 !important;
  color: #888888 !important;
  cursor: not-allowed !important;
}

.clickable-table :deep(tr.row-closed:hover td) {
  background-color: #eeeeee !important;
}
</style>
