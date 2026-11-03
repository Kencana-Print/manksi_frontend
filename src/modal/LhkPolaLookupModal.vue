<template>
  <div>
    <v-dialog
      v-model="dialogModel"
      max-width="900px"
      scrollable
      transition="dialog-bottom-transition"
    >
      <v-card class="rounded-lg elevation-4">
        <v-card-title class="bg-gradient text-white d-flex align-center pa-4">
          <v-icon start icon="mdi-text-box-search" class="mr-2"></v-icon>
          <div class="d-flex flex-column">
            <span class="text-h6 font-weight-bold line-height-tight"
              >Lookup LHK Pola</span
            >
            <span class="text-caption text-grey-lighten-2"
              >Pilih dokumen pola untuk direferensikan ke LHK Desain</span
            >
          </div>

          <v-spacer />
          <v-btn
            icon="mdi-close"
            variant="tonal"
            density="comfortable"
            color="white"
            @click="dialogModel = false"
          />
        </v-card-title>

        <v-card-text class="pa-4 bg-grey-lighten-5">
          <v-row class="align-center mb-2" dense>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="search"
                prepend-inner-icon="mdi-magnify"
                label="Cari Nomor LHK atau keterangan..."
                variant="outlined"
                density="compact"
                hide-details
                bg-color="white"
                clearable
                class="rounded-lg"
              />
            </v-col>
            <v-col
              cols="12"
              md="6"
              class="d-flex justify-md-end justify-start mt-2 mt-md-0"
            >
              <v-btn-toggle
                v-model="extractMode"
                mandatory
                density="comfortable"
                color="primary"
                variant="outlined"
                class="bg-white rounded-lg hidden-sm-and-down"
              >
                <v-btn value="SET" prepend-icon="mdi-layers-outline"
                  >Per Set Dokumen</v-btn
                >
                <v-btn value="SIZE" prepend-icon="mdi-content-cut"
                  >Per Size Marker</v-btn
                >
              </v-btn-toggle>

              <v-select
                v-model="extractMode"
                :items="[
                  { title: 'Per Set Dokumen', value: 'SET' },
                  { title: 'Per Size Marker', value: 'SIZE' },
                ]"
                density="compact"
                variant="outlined"
                hide-details
                class="hidden-md-and-up w-100 bg-white"
              />
            </v-col>
          </v-row>

          <v-card
            variant="outlined"
            class="border-grey-lighten-2 rounded-lg bg-white overflow-hidden"
          >
            <v-data-table
              :headers="headers"
              :items="groupedItems"
              :search="search"
              :loading="loading"
              density="comfortable"
              hover
              fixed-header
              height="380px"
              @click:row="handleRowClick"
              class="cursor-pointer custom-table"
            >
              <template #loading>
                <v-progress-linear
                  color="primary"
                  indeterminate
                  height="3"
                ></v-progress-linear>
              </template>

              <template #[`item.lhk_nomor`]="{ value }">
                <div class="d-flex align-center">
                  <v-icon
                    icon="mdi-file-document-outline"
                    size="small"
                    color="primary"
                    class="mr-2"
                  ></v-icon>
                  <span class="font-weight-medium text-primary">{{
                    value
                  }}</span>
                </div>
              </template>

              <template #[`item.lhk_tanggal`]="{ value }">
                <v-chip
                  size="small"
                  variant="tonal"
                  color="secondary"
                  prepend-icon="mdi-calendar"
                >
                  {{ formatDate(value) }}
                </v-chip>
              </template>

              <template #[`item.lhk_keterangan`]="{ value }">
                <span class="text-body-2 text-grey-darken-2">{{
                  value || "-"
                }}</span>
              </template>
            </v-data-table>
          </v-card>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="sizeDialog"
      max-width="520px"
      scrollable
      transition="dialog-top-transition"
    >
      <v-card class="rounded-lg">
        <v-card-title
          class="bg-blue-darken-3 text-white d-flex align-center pa-3"
        >
          <v-icon start icon="mdi-format-size" class="mr-2"></v-icon>
          <div>
            <span class="text-subtitle-1 font-weight-bold d-block"
              >Pilih Size Marker</span
            >
            <span class="text-caption text-blue-lighten-4"
              >Dokumen: {{ selectedLhkNomor }}</span
            >
          </div>
          <v-spacer />
          <v-btn
            icon="mdi-close"
            variant="text"
            density="comfortable"
            @click="sizeDialog = false"
          />
        </v-card-title>

        <v-card-text class="pa-3 bg-grey-lighten-4">
          <div class="text-caption text-grey-darken-1 mb-2">
            Silahkan pilih salah satu ukuran produksi di bawah ini:
          </div>
          <v-scroll-y-transition group>
            <v-card
              v-for="(itemSize, idx) in filteredSizes"
              :key="idx"
              v-hover
              variant="flat"
              class="mb-2 rounded-lg size-card border transition-all cursor-pointer"
              @click="confirmSizeSelect(itemSize)"
            >
              <v-card-item class="pa-3">
                <div class="d-flex align-center justify-between">
                  <div>
                    <div class="d-flex align-center mb-1">
                      <v-badge
                        inline
                        color="success"
                        :content="`Size ${itemSize.marker_size}`"
                        class="mr-2 font-weight-bold text-body-1"
                      ></v-badge>
                      <span class="text-caption text-grey-darken-2"
                        >(Lebar Kain:
                        <strong>{{ itemSize.ldm_lebar_kain || "-" }}</strong
                        >)</span
                      >
                    </div>
                    <div class="text-caption text-grey-darken-1 mt-1">
                      <v-icon
                        size="x-small"
                        icon="mdi-qrcode-scan"
                        class="mr-1"
                      ></v-icon>
                      SPK: {{ itemSize.marker_spk_nomor || "-" }}
                      <v-icon
                        size="x-small"
                        icon="mdi-engine"
                        class="ml-2 mr-1"
                      ></v-icon>
                      Mesin: {{ itemSize.ldm_mesin || "-" }}
                    </div>
                  </div>
                  <v-spacer />
                  <v-icon
                    icon="mdi-chevron-right"
                    color="grey-lighten-1"
                  ></v-icon>
                </div>
              </v-card-item>
            </v-card>
          </v-scroll-y-transition>
        </v-card-text>
        <v-card-actions class="bg-grey-lighten-3 pa-2">
          <v-spacer />
          <v-btn
            variant="text"
            color="grey-darken-1"
            size="small"
            @click="sizeDialog = false"
            >Batal</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import { format } from "date-fns";

const props = defineProps(["isVisible"]);
const emit = defineEmits(["close", "select", "update:isVisible"]);

const dialogModel = computed({
  get() {
    return props.isVisible;
  },
  set(value) {
    emit("update:isVisible", value);
    if (!value) emit("close");
  },
});

const items = ref([]);
const loading = ref(false);
const search = ref("");
const extractMode = ref("SET");

const sizeDialog = ref(false);
const filteredSizes = ref([]);
const selectedLhkNomor = ref("");

const headers = [
  { title: "Nomor LHK Pola", key: "lhk_nomor", width: "30%" },
  { title: "Tanggal", key: "lhk_tanggal", width: "25%" },
  { title: "Keterangan / Memo", key: "lhk_keterangan", width: "45%" },
];

const groupedItems = computed(() => {
  const seen = new Set();
  return items.value.filter((item) => {
    const duplicateKey = item.lhk_nomor;
    if (seen.has(duplicateKey)) return false;
    seen.add(duplicateKey);
    return true;
  });
});

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await api.get("/mmt/lhk-pola/lookup");
    items.value = res.data.success ? res.data.data : [];
  } catch (e) {
    console.error("Gagal memuat data LHK Pola", e);
  } finally {
    loading.value = false;
  }
};

const handleRowClick = (event, { item }) => {
  const detailTerkait = items.value.filter(
    (data) => data.lhk_nomor === item.lhk_nomor,
  );

  if (extractMode.value === "SET") {
    if (detailTerkait.length > 0) {
      const baseItem = detailTerkait[0];
      const rowPerSet = {
        ...baseItem,
        marker_size: "ALL SIZE",
        ldm_lebar_kain: "ALL",
      };
      emit("select", { mode: "SET", data: [rowPerSet] });
    }
    dialogModel.value = false;
  } else {
    selectedLhkNomor.value = item.lhk_nomor;
    const seenSize = new Set();
    filteredSizes.value = detailTerkait.filter((d) => {
      if (seenSize.has(d.ldm_id)) return false;
      seenSize.add(d.ldm_id);
      return true;
    });
    sizeDialog.value = true;
  }
};

const confirmSizeSelect = (sizeItem) => {
  emit("select", { mode: "SIZE", data: [sizeItem] });
  sizeDialog.value = false;
  dialogModel.value = false;
};

const formatDate = (date) =>
  date ? format(new Date(date), "dd/MM/yyyy") : "-";

watch(
  () => props.isVisible,
  (newVal) => {
    if (newVal) fetchData();
  },
);
</script>

<style scoped>
/* Gradient Header Styling */
.bg-gradient {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important;
}

.line-height-tight {
  line-height: 1.25;
}

/* Cursor Pointer Row */
.cursor-pointer :deep(tbody tr) {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

/* Custom Table Header Modernization */
.custom-table :deep(thead th) {
  background-color: #f5f5f5 !important;
  font-weight: 700 !important;
  color: #424242 !important;
  text-transform: uppercase;
  font-size: 11px !important;
  letter-spacing: 0.5px;
}

/* Sub-dialog Size Cards */
.size-card {
  background-color: #ffffff;
  border-color: #e0e0e0 !important;
}
.size-card:hover {
  border-color: #1976d2 !important;
  background-color: #f1f8ff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
}

.transition-all {
  transition: all 0.2s ease-in-out;
}
</style>
