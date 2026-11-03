<template>
  <v-dialog
    :model-value="isVisible"
    @update:modelValue="emit('close')"
    max-width="1100px"
    persistent
  >
    <v-card class="dialog-card d-flex flex-column" style="height: 85vh">
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          🔍 Pilih SPK untuk STBJ
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          @click="emit('close')"
          variant="text"
          size="small"
        ></v-btn>
      </v-toolbar>

      <v-card-text class="pa-4 d-flex flex-column flex-grow-1">
        <v-row dense class="mb-2 flex-shrink-0">
          <v-col cols="12" md="8">
            <v-text-field
              v-model="searchKeyword"
              label="Cari Nomor SPK atau Nama Proyek..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              @keyup.enter="fetchSPKData"
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-center">
            <v-checkbox
              v-model="filterSisa"
              label="Hanya sisa STBJ > 0"
              density="compact"
              hide-details
              color="primary"
            ></v-checkbox>
          </v-col>
        </v-row>

        <v-data-table
          :headers="headers"
          :items="filteredSPKList"
          :loading="loading"
          hover
          class="desktop-table flex-grow-1 clickable-row"
          density="compact"
          item-key="SPK"
          fixed-header
          :items-per-page="50"
          @dblclick:row="handleDoubleClick"
        >
          <!-- Format Tanggal -->
          <template #item.Tanggal="{ item }">
            {{
              item.Tanggal
                ? new Date(item.Tanggal).toLocaleDateString("id-ID")
                : "-"
            }}
          </template>

          <!-- Status Badge -->
          <template #item.STATUS="{ item }">
            <v-chip
              :color="item.STATUS === 'Open' ? 'green' : 'red'"
              size="x-small"
              variant="tonal"
              class="text-uppercase"
            >
              {{ item.STATUS }}
            </v-chip>
          </template>

          <!-- Highlight Kolom Sisa (Kurang_STBJ) -->
          <template #item.Kurang_STBJ="{ item }">
            <v-chip
              :color="item.Kurang_STBJ > 0 ? 'orange-darken-3' : 'grey'"
              size="x-small"
              variant="flat"
              class="font-weight-bold"
            >
              {{ item.Kurang_STBJ }}
            </v-chip>
          </template>

          <template #item.actions="{ item }">
            <v-btn
              color="primary"
              size="x-small"
              @click.stop="selectSPK(item as SPKItem)"
              variant="tonal"
            >
              Pilih
            </v-btn>
          </template>

          <template #no-data>
            <div class="text-center pa-4">Data SPK tidak ditemukan.</div>
          </template>
        </v-data-table>
      </v-card-text>

      <v-card-actions class="pa-3 border-t">
        <v-spacer></v-spacer>
        <v-btn @click="emit('close')" color="secondary" variant="text"
          >Batal</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";

// Interface disesuaikan dengan Response JSON
interface SPKItem {
  SPK: string;
  Nama: string;
  Tanggal: string;
  Qty_Order: number;
  Sudah_STBJ: number;
  Kurang_STBJ: number;
  Kepentingan: string;
  STATUS: string;
  [key: string]: any;
}

const props = defineProps<{ isVisible: boolean }>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", data: SPKItem): void;
}>();

const toast = useToast();
const loading = ref(false);
const searchKeyword = ref("");
const filterSisa = ref(true);
const SPKList = ref<SPKItem[]>([]);

const headers = [
  { title: "Nomor SPK", key: "SPK", width: "150px" },
  { title: "Nama SPK / Proyek", key: "Nama", width: "350px" },
  { title: "Tanggal", key: "Tanggal", width: "110px" },
  { title: "Order", key: "Qty_Order", width: "90px", align: "end" as const },
  {
    title: "Sdh STBJ",
    key: "Sudah_STBJ",
    width: "90px",
    align: "end" as const,
  },
  { title: "Sisa", key: "Kurang_STBJ", width: "90px", align: "end" as const },
  { title: "Status", key: "STATUS", width: "90px", align: "center" as const },
  {
    title: "Aksi",
    key: "actions",
    sortable: false,
    width: "80px",
    align: "center" as const,
  },
];

const filteredSPKList = computed(() => {
  return filterSisa.value
    ? SPKList.value.filter((item) => item.Kurang_STBJ > 0)
    : SPKList.value;
});

const fetchSPKData = async () => {
  loading.value = true;
  try {
    const response = await api.get<{ success: boolean; data: SPKItem[] }>(
      "/mmt/spk/stbj/lookup", // Endpoint disesuaikan
      { params: { keyword: searchKeyword.value } },
    );
    SPKList.value = response.data.data || [];
  } catch (error) {
    toast.error("Gagal memuat daftar SPK");
  } finally {
    loading.value = false;
  }
};

const selectSPK = (item: SPKItem) => {
  emit("select", item);
  emit("close");
};

const handleDoubleClick = (_event: any, { item }: any) => {
  selectSPK(item);
};

watch(
  () => props.isVisible,
  (val) => {
    if (val) {
      searchKeyword.value = "";
      fetchSPKData();
    }
  },
);
</script>

<style scoped>
.desktop-table :deep(td) {
  height: 38px !important;
  font-size: 12px;
}
.desktop-table :deep(thead th) {
  background-color: #f5f5f5 !important;
  font-weight: bold;
}
.clickable-row :deep(tbody tr):hover {
  cursor: pointer;
  background-color: #e3f2fd !important;
}
</style>
