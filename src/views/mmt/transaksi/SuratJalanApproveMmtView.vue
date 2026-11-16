<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed } from "vue";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import { format, subDays, parseISO, isValid } from "date-fns";
import BaseBrowse from "@/components/BaseBrowse.vue";

const toast = useToast();
const API_SURAT_JALAN = "/mmt/surat-jalan";

// --- State Management ---
const masterData = ref<any[]>([]);
const details = ref<Record<string, any[]>>({});
const loading = ref(true);
const loadingDetails = ref(new Set<string>());
const selected = ref<any[]>([]);
const expanded = ref<any[]>([]);

const startDate = ref(format(subDays(new Date(), 30), "yyyy-MM-dd"));
const endDate = ref(format(new Date(), "yyyy-MM-dd"));
const pendingOnly = ref(false);

// --- EXCEL-STYLE & GLOBAL FILTER STATE ---
// 1. Filter Nomor SJ
const menuNomor = ref(false);
const filterNomorInput = ref<string>("");

// 2. Filter Gudang
const menuGudang = ref(false);
const selectedGudangFilter = ref<string[]>([]);

// 3. Filter Customer
const menuCustomer = ref(false);
const filterCustomerInput = ref<string>("");

// 4. Filter SPK (Global Input)
const filterSpkInput = ref<string>("");

// --- Ambil Cabang Dinamis dari Session Storage / Local Storage ---
const getSessionUser = () => {
  try {
    const userSession = localStorage.getItem("userData");
    return userSession ? JSON.parse(userSession) : null;
  } catch (e) {
    console.error("Gagal membaca userData", e);
    return null;
  }
};

const userConfig = reactive({
  cab: getSessionUser()?.cab || "",
  zcus: 1,
});

// --- DYNAMIC FILTER OPTIONS & COMPUTED ---
const availableGudangList = computed(() => {
  const setGudang = new Set<string>();
  masterData.value.forEach((item) => {
    if (item.Gudang) setGudang.add(item.Gudang);
  });
  return Array.from(setGudang).sort();
});

// Indikator Status Aktif Filter
const isNomorFilterActive = computed(
  () => filterNomorInput.value.trim().length > 0,
);
const isCustomerFilterActive = computed(
  () => filterCustomerInput.value.trim().length > 0,
);
const isGudangFilterActive = computed(() => {
  return (
    selectedGudangFilter.value.length > 0 &&
    selectedGudangFilter.value.length < availableGudangList.value.length
  );
});

const isAllGudangSelected = computed(() => {
  return (
    availableGudangList.value.length > 0 &&
    selectedGudangFilter.value.length === availableGudangList.value.length
  );
});

const toggleSelectAllGudang = () => {
  if (isAllGudangSelected.value) {
    selectedGudangFilter.value = [];
  } else {
    selectedGudangFilter.value = [...availableGudangList.value];
  }
};

const resetGudangFilter = () => {
  selectedGudangFilter.value = [...availableGudangList.value];
};

const resetNomorFilter = () => {
  filterNomorInput.value = "";
};

const resetCustomerFilter = () => {
  filterCustomerInput.value = "";
};

// --- LOGIKA FILTERING & SORTING (PENDING FIRST) ---
const filteredMasterData = computed(() => {
  // 1. Filter Data
  const filtered = masterData.value.filter((item) => {
    // Filter Nomor SJ
    const nomorSJ = item.Nomor || "";
    const matchesNomor =
      !filterNomorInput.value ||
      nomorSJ
        .toLowerCase()
        .includes(filterNomorInput.value.trim().toLowerCase());

    // Filter Gudang
    const matchesGudang =
      selectedGudangFilter.value.length === 0 ||
      selectedGudangFilter.value.length === availableGudangList.value.length ||
      selectedGudangFilter.value.includes(item.Gudang);

    // Filter Customer
    const customer = item.Customer || "";
    const matchesCustomer =
      !filterCustomerInput.value ||
      customer
        .toLowerCase()
        .includes(filterCustomerInput.value.trim().toLowerCase());

    // Filter SPK (Mengecek ke data detail yang sudah/sedang di-load)
    let matchesSpk = true;
    if (filterSpkInput.value.trim()) {
      const keyword = filterSpkInput.value.trim().toLowerCase();
      const itemDetails = details.value[item.Nomor] || [];

      // Jika detail belum selesai di-load, kembalikan false dulu sampai datanya siap
      if (!details.value.hasOwnProperty(item.Nomor)) {
        matchesSpk = false;
      } else {
        matchesSpk = itemDetails.some(
          (d) =>
            (d.SPK && d.SPK.toLowerCase().includes(keyword)) ||
            (d.Nama && d.Nama.toLowerCase().includes(keyword)),
        );
      }
    }

    return matchesNomor && matchesGudang && matchesCustomer && matchesSpk;
  });

  // 2. Sorting Data: Prioritaskan status PENDING di paling atas
  return filtered.sort((a, b) => {
    const getPriority = (status: string) => {
      if (!status || status === "Pending") return 1; // Prioritas Utama: Pending
      if (status === "Sudah") return 2; // Prioritas Kedua: Sudah Approved
      if (status === "Batal") return 3; // Prioritas Terakhir: Batal
      return 4;
    };

    const priorityA = getPriority(a.Approved);
    const priorityB = getPriority(b.Approved);

    if (priorityA !== priorityB) {
      return priorityA - priorityB; // Urutkan berdasarkan hirarki status
    }

    // Jika status sama, urutkan berdasarkan Nomor SJ (Terbaru/Terbesar diatas)
    return (b.Nomor || "").localeCompare(a.Nomor || "");
  });
});

// --- Grid Header Definition ---
const masterHeaders = computed(() => {
  const baseHeaders = [
    {
      title: "Detail",
      key: "data-table-expand",
      minWidth: "60px",
      align: "center",
      fixed: true,
    },
    { title: "Approved", key: "Approved", minWidth: "120px", fixed: true },
    { title: "Divisi", key: "Divisi", minWidth: "120px" },
    { title: "Nomor", key: "Nomor", minWidth: "160px", fixed: true },
    { title: "Tanggal", key: "Tanggal", minWidth: "120px" },
    { title: "Kode Gdg", key: "KodeGdg", minWidth: "100px" },
    { title: "Gudang", key: "Gudang", minWidth: "180px" },
  ];

  if (userConfig.zcus === 1) {
    baseHeaders.push(
      { title: "Kode Customer", key: "KodeCustomer", minWidth: "130px" },
      { title: "Customer", key: "Customer", minWidth: "220px" },
      { title: "Alamat", key: "Alamat", minWidth: "250px" },
      { title: "Kota", key: "Kota", minWidth: "120px" },
    );
  }

  baseHeaders.push(
    { title: "Keterangan", key: "Keterangan", minWidth: "250px" },
    { title: "ID", key: "ID", minWidth: "80px" },
  );

  return baseHeaders;
});

const detailHeaders = [
  { title: "Nomor SJ", key: "Nomor", minWidth: "140px", fixed: true },
  { title: "Nomor SPK", key: "SPK", minWidth: "150px" },
  { title: "Nama SPK", key: "Nama", minWidth: "250px" },
  { title: "Ukuran", key: "Ukuran", minWidth: "120px" },
  { title: "Panjang", key: "Panjang", minWidth: "100px", align: "end" },
  { title: "Lebar", key: "Lebar", minWidth: "100px", align: "end" },
  { title: "Jumlah", key: "Jumlah", minWidth: "100px", align: "end" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
];

const formatDateDisplay = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-";

  try {
    let d = parseISO(dateStr);

    if (!isValid(d)) {
      const parts = dateStr.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2]),
          );
        } else {
          d = new Date(
            Number(parts[2]),
            Number(parts[1]) - 1,
            Number(parts[0]),
          );
        }
      }
    }

    return isValid(d) ? format(d, "dd/MM/yyyy") : "-";
  } catch (e) {
    return dateStr;
  }
};

// --- Fetch Detail secara Background untuk keperluan Search SPK ---
const fetchAllDetailsInBackground = async (items: any[]) => {
  for (const item of items) {
    const nomorSJ = item.Nomor;
    if (nomorSJ && !details.value[nomorSJ]) {
      try {
        const res = await api.get(`${API_SURAT_JALAN}/detail`, {
          params: { nomor: nomorSJ },
        });
        details.value[nomorSJ] = res.data.data || res.data || [];
      } catch (error) {
        details.value[nomorSJ] = [];
      }
    }
  }
};

// --- Data Fetching ---
const fetchData = async () => {
  loading.value = true;
  userConfig.cab = getSessionUser()?.cab || "";
  details.value = {}; // Reset cache detail saat data master diperbarui

  try {
    const res = await api.get(`${API_SURAT_JALAN}/`, {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
        cab: userConfig.cab,
        zcus: userConfig.zcus,
        pendingOnly: pendingOnly.value,
      },
    });

    masterData.value = res.data.data || [];
    selectedGudangFilter.value = [...availableGudangList.value];

    // Ambil detail secara background agar pencarian SPK langsung bisa mendeteksi data
    fetchAllDetailsInBackground(masterData.value);
  } catch (error) {
    console.error("Gagal mengambil data Surat Jalan:", error);
    toast.error("Gagal mengambil data Surat Jalan");
    masterData.value = [];
  } finally {
    loading.value = false;
  }
};

const handleExpandUpdate = async (expandedKeys: any[]) => {
  const lastItem = expandedKeys[expandedKeys.length - 1];
  if (!lastItem) return;

  const nomorSJ = typeof lastItem === "object" ? lastItem.Nomor : lastItem;
  if (!nomorSJ || details.value[nomorSJ]) return;

  loadingDetails.value.add(nomorSJ);
  try {
    const res = await api.get(`${API_SURAT_JALAN}/detail`, {
      params: { nomor: nomorSJ },
    });
    details.value[nomorSJ] = res.data.data || res.data || [];
  } catch (error) {
    details.value[nomorSJ] = [];
  } finally {
    loadingDetails.value.delete(nomorSJ);
  }
};

const isLoadingDetails = (nomor: string) => loadingDetails.value.has(nomor);

const getStatusColor = (status: string) => {
  if (!status) return "red";
  if (status === "Batal") return "blue";
  return "green";
};

// --- Logika Aksi Bulk Action ---
const handleProcessAction = async (
  actionType: "approve" | "pending" | "batal",
) => {
  if (selected.value.length === 0) {
    toast.warning("Silahkan pilih surat jalannya dulu.");
    return;
  }

  let validItems: any[] = [];

  for (const item of selected.value) {
    if (actionType === "approve") {
      if (item.Approved === "Sudah") continue;
      if (item.Approved === "Batal") {
        toast.warning(
          `Nomor ${item.Nomor} status Batal. Masukkan ke Pending dulu.`,
        );
        return;
      }
    } else if (actionType === "pending") {
      if (!item.Approved) continue;
    } else if (actionType === "batal") {
      if (item.Approved === "Sudah") {
        toast.warning(
          `Nomor ${item.Nomor} sudah di-approve. Pendingkan dulu baru batalkan.`,
        );
        return;
      }
      if (item.Approved === "Batal") continue;
    }
    validItems.push(item);
  }

  if (validItems.length === 0) {
    toast.info(
      "Tidak ada data baru yang perlu diproses berdasarkan validasi status.",
    );
    return;
  }

  const confirmMessage =
    actionType === "approve"
      ? `Yakin akan meng-Approve ${validItems.length} data?`
      : actionType === "pending"
        ? `Yakin akan membatalkan Approve / Pending ${validItems.length} data?`
        : `Yakin ${validItems.length} SJ ini akan dibatalkan?`;

  if (!confirm(confirmMessage)) return;

  loading.value = true;
  try {
    const promises = validItems.map((item) =>
      api.post(
        `${API_SURAT_JALAN}/${actionType}/${encodeURIComponent(item.Nomor)}`,
        { kodeGdg: item.KodeGdg },
      ),
    );

    await Promise.all(promises);

    toast.success(`Berhasil memproses ${validItems.length} data Surat Jalan!`);
    selected.value = [];
    fetchData();
  } catch (error: any) {
    toast.error(
      error.response?.data?.message ||
        `Gagal memproses beberapa aksi ${actionType}`,
    );
  } finally {
    loading.value = false;
  }
};

const handleRowClick = (_event: any, row: any) => {
  const index = selected.value.findIndex(
    (s: any) => s.Nomor === row.item.Nomor,
  );
  if (index > -1) {
    selected.value.splice(index, 1);
  } else {
    selected.value.push(row.item);
  }
};

const getRowProps = ({ item }: any) => ({
  class: selected.value.some((s: any) => s.Nomor === item.Nomor)
    ? "row-selected"
    : "",
});

watch([startDate, endDate, pendingOnly], fetchData);
onMounted(fetchData);
</script>

<template>
  <div class="sj-approval-wrapper">
    <!-- Baris Atas: Switch Pending & Input Search SPK Berdampingan -->
    <v-row class="px-4 py-2 align-center bg-grey-lighten-4 rounded mb-2">
      <v-col cols="12" sm="4">
        <v-switch
          v-model="pendingOnly"
          color="primary"
          label="Tampilkan Hanya Data Pending (btnShow)"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="4" class="ml-auto">
        <v-text-field
          v-model="filterSpkInput"
          placeholder="Cari Nomor / Nama SPK..."
          density="compact"
          variant="outlined"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
          bg-color="white"
        />
      </v-col>
    </v-row>

    <BaseBrowse
      title="Approval Surat Jalan"
      menu-id="mmt-surat-jalan-approve"
      icon="mdi-file-check-outline"
      :headers="masterHeaders"
      :items="filteredMasterData"
      :is-loading="loading"
      :loading="loading"
      :show-actions="false"
      :can-insert="false"
      v-model:startDate="startDate"
      v-model:endDate="endDate"
      v-model:selected="selected"
      v-model:expanded="expanded"
      @refresh="fetchData"
      @row-click="handleRowClick"
      :row-props-fn="getRowProps"
      :row-props="getRowProps"
      @update:expanded="handleExpandUpdate(expanded)"
    >
      <template #extra-actions>
        <v-btn
          size="x-small"
          color="success"
          class="mr-2 text-none custom-action"
          :disabled="selected.length === 0"
          @click="handleProcessAction('approve')"
        >
          <v-icon start>mdi-check-circle</v-icon>
          Approve ({{ selected.length }})
        </v-btn>
        <v-btn
          size="x-small"
          color="warning"
          class="mr-2 text-none custom-action"
          :disabled="selected.length === 0"
          @click="handleProcessAction('pending')"
        >
          <v-icon start>mdi-clock-alert-outline</v-icon>
          Pending / Cancel Apv
        </v-btn>
        <v-btn
          size="x-small"
          color="error"
          class="text-none custom-action"
          :disabled="selected.length === 0"
          @click="handleProcessAction('batal')"
        >
          <v-icon start>mdi-close-circle</v-icon>
          Batal SJ
        </v-btn>
      </template>

      <!-- ======================================================== -->
      <!-- EXCEL-STYLE FILTER HEADERS                              -->
      <!-- ======================================================== -->

      <!-- 1. FILTER NOMOR SURAT JALAN -->
      <template #header.Nomor="{ column }">
        <div class="d-flex align-center justify-space-between w-100">
          <span class="font-weight-bold">{{ column.title }}</span>
          <v-menu
            v-model="menuNomor"
            :close-on-content-click="false"
            location="bottom start"
          >
            <template #activator="{ props }">
              <v-btn
                icon
                variant="text"
                density="compact"
                size="small"
                v-bind="props"
                :color="isNomorFilterActive ? 'primary' : 'default'"
              >
                <v-icon size="18">
                  {{
                    isNomorFilterActive ? "mdi-filter" : "mdi-filter-variant"
                  }}
                </v-icon>
              </v-btn>
            </template>

            <v-card min-width="240" class="pa-2 border shadow-2 rounded-lg">
              <div
                class="text-caption font-weight-bold px-1 py-1 text-grey-darken-1"
              >
                Cari Nomor SJ
              </div>
              <v-divider class="mb-2" />
              <v-text-field
                v-model="filterNomorInput"
                placeholder="Ketik Nomor SJ..."
                density="compact"
                variant="outlined"
                hide-details
                clearable
                autofocus
                append-inner-icon="mdi-magnify"
                @keyup.enter="menuNomor = false"
              />
              <v-divider class="mt-3 mb-2" />
              <div class="d-flex justify-space-between align-center">
                <v-btn
                  size="x-small"
                  variant="text"
                  color="grey-darken-1"
                  @click="resetNomorFilter"
                >
                  Reset
                </v-btn>
                <v-btn
                  size="x-small"
                  color="primary"
                  variant="flat"
                  @click="menuNomor = false"
                >
                  OK
                </v-btn>
              </div>
            </v-card>
          </v-menu>
        </div>
      </template>

      <!-- 2. FILTER GUDANG (CHECKLIST DINAMIS) -->
      <template #header.Gudang="{ column }">
        <div class="d-flex align-center justify-space-between w-100">
          <span class="font-weight-bold">{{ column.title }}</span>
          <v-menu
            v-model="menuGudang"
            :close-on-content-click="false"
            location="bottom end"
          >
            <template #activator="{ props }">
              <v-btn
                icon
                variant="text"
                density="compact"
                size="small"
                v-bind="props"
                :color="isGudangFilterActive ? 'primary' : 'default'"
              >
                <v-icon size="18">
                  {{
                    isGudangFilterActive ? "mdi-filter" : "mdi-filter-variant"
                  }}
                </v-icon>
              </v-btn>
            </template>

            <v-card min-width="220" class="pa-2 border shadow-2 rounded-lg">
              <div
                class="text-caption font-weight-bold px-2 py-1 text-grey-darken-1"
              >
                Filter Gudang
              </div>
              <v-divider class="mb-1" />

              <v-checkbox
                :model-value="isAllGudangSelected"
                label="(Select All)"
                density="compact"
                hide-details
                color="primary"
                @click="toggleSelectAllGudang"
              />
              <v-divider class="my-1" />

              <div style="max-height: 180px; overflow-y: auto">
                <v-checkbox
                  v-for="gdg in availableGudangList"
                  :key="gdg"
                  v-model="selectedGudangFilter"
                  :value="gdg"
                  :label="gdg"
                  density="compact"
                  hide-details
                  color="primary"
                />
              </div>

              <v-divider class="mt-1 mb-2" />
              <div class="d-flex justify-space-between align-center">
                <v-btn
                  size="x-small"
                  variant="text"
                  color="grey-darken-1"
                  @click="resetGudangFilter"
                >
                  Reset
                </v-btn>
                <v-btn
                  size="x-small"
                  color="primary"
                  variant="flat"
                  @click="menuGudang = false"
                >
                  OK
                </v-btn>
              </div>
            </v-card>
          </v-menu>
        </div>
      </template>

      <!-- 3. FILTER CUSTOMER -->
      <template #header.Customer="{ column }">
        <div class="d-flex align-center justify-space-between w-100">
          <span class="font-weight-bold">{{ column.title }}</span>
          <v-menu
            v-model="menuCustomer"
            :close-on-content-click="false"
            location="bottom start"
          >
            <template #activator="{ props }">
              <v-btn
                icon
                variant="text"
                density="compact"
                size="small"
                v-bind="props"
                :color="isCustomerFilterActive ? 'primary' : 'default'"
              >
                <v-icon size="18">
                  {{
                    isCustomerFilterActive ? "mdi-filter" : "mdi-filter-variant"
                  }}
                </v-icon>
              </v-btn>
            </template>

            <v-card min-width="240" class="pa-2 border shadow-2 rounded-lg">
              <div
                class="text-caption font-weight-bold px-1 py-1 text-grey-darken-1"
              >
                Cari Customer
              </div>
              <v-divider class="mb-2" />
              <v-text-field
                v-model="filterCustomerInput"
                placeholder="Ketik Nama Customer..."
                density="compact"
                variant="outlined"
                hide-details
                clearable
                autofocus
                append-inner-icon="mdi-magnify"
                @keyup.enter="menuCustomer = false"
              />
              <v-divider class="mt-3 mb-2" />
              <div class="d-flex justify-space-between align-center">
                <v-btn
                  size="x-small"
                  variant="text"
                  color="grey-darken-1"
                  @click="resetCustomerFilter"
                >
                  Reset
                </v-btn>
                <v-btn
                  size="x-small"
                  color="primary"
                  variant="flat"
                  @click="menuCustomer = false"
                >
                  OK
                </v-btn>
              </div>
            </v-card>
          </v-menu>
        </div>
      </template>

      <!-- ======================================================== -->
      <!-- SLOTS DATA BODY                                          -->
      <!-- ======================================================== -->

      <template #item.Tanggal="{ value }">
        {{ formatDateDisplay(value) }}
      </template>

      <template #item.Approved="{ value }">
        <span :style="{ color: getStatusColor(value), fontWeight: 'bold' }">
          {{ value || "Pending" }}
        </span>
      </template>

      <template #expanded-content="{ item }">
        <div v-if="isLoadingDetails(item.Nomor)" class="text-center pa-2">
          <v-progress-circular
            indeterminate
            size="20"
            color="primary"
            class="mr-2"
          />
          <span class="text-caption">Memuat detail item...</span>
        </div>

        <div
          v-else-if="!details[item.Nomor] || details[item.Nomor].length === 0"
          class="text-center pa-2 text-caption text-grey"
        >
          Tidak ada data detail item untuk nomor {{ item.Nomor }}
        </div>

        <v-data-table
          v-else
          :headers="detailHeaders"
          :items="details[item.Nomor]"
          density="compact"
          class="bg-white border rounded"
          :items-per-page="-1"
          hide-default-footer
        >
          <template #[`item.sjd_jumlah`]="{ item: d }">
            <div class="text-right">
              {{ Number(d.sjd_jumlah || 0).toFixed(2) }}
            </div>
          </template>
          <template #[`item.Panjang`]="{ item: d }">
            <div class="text-right">
              {{ Number(d.Panjang || 0).toFixed(2) }}
            </div>
          </template>
          <template #[`item.Lebar`]="{ item: d }">
            <div class="text-right">{{ Number(d.Lebar || 0).toFixed(2) }}</div>
          </template>
        </v-data-table>
      </template>
    </BaseBrowse>
  </div>
</template>

<style scoped>
.row-selected {
  background-color: #d8efff !important;
}
:deep(.row-selected td) {
  background-color: #d8efff !important;
}
.sj-approval-wrapper {
  width: 100%;
}

:deep(.v-btn:not(.custom-action)[color="success"]),
:deep(.v-btn:not(.custom-action)[color="warning"]),
:deep(.v-btn:not(.custom-action)[color="error"]) {
  display: none !important;
}
</style>
