<template>
  <div>
    <!-- Dialog Utama Lookup LHK Sublim -->
    <v-dialog
      :model-value="isVisible"
      @update:modelValue="emit('close')"
      max-width="950px"
      persistent
    >
      <v-card class="dialog-card d-flex flex-column" style="height: 78vh">
        <!-- Header Toolbar -->
        <v-toolbar color="indigo-darken-2" density="compact">
          <v-toolbar-title class="text-subtitle-1 font-weight-bold">
            🔥 Pilih LHK Sublim & Detail Realisasi Bahan
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-close"
            @click="emit('close')"
            variant="text"
            size="small"
          ></v-btn>
        </v-toolbar>

        <!-- Body Content -->
        <v-card-text class="pa-4 d-flex flex-column flex-grow-1">
          <!-- Filter Tanggal & Pencarian -->
          <v-row class="mb-3 flex-shrink-0" dense>
            <v-col cols="3">
              <v-text-field
                v-model="startDate"
                type="date"
                label="Mulai Tanggal"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="3">
              <v-text-field
                v-model="endDate"
                type="date"
                label="Sampai Tanggal"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="4">
              <v-text-field
                v-model="searchKeyword"
                label="Cari Nomor LHK / SPK / Gudang..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                clearable
                hide-details
                @keyup.enter="fetchLhkHeaders"
              />
            </v-col>
            <v-col cols="2">
              <v-btn
                color="indigo-darken-2"
                block
                height="40"
                @click="fetchLhkHeaders"
                :loading="loading"
              >
                Cari
              </v-btn>
            </v-col>
          </v-row>

          <!-- Tabel Utama Header LHK dengan Expand & Checkbox -->
          <v-data-table
            :headers="headerColumns"
            :items="lhkList"
            :loading="loading"
            item-value="nomor"
            show-select
            v-model="selectedHeaders"
            density="compact"
            class="desktop-table flex-grow-1"
            fixed-header
            show-expand
            return-object
            v-model:expanded="expandedHeaders"
          >
            <!-- Kolom Total Meter -->
            <template #[`item.total_meter`]="{ item }">
              <span class="font-weight-bold text-teal-darken-3">
                {{
                  item.total_meter
                    ? Number(item.total_meter).toFixed(2) + " m²"
                    : "-"
                }}
              </span>
            </template>

            <!-- Kolom Status Mutasi -->
            <template #[`item.lsb_status`]="{ item }">
              <v-chip
                size="x-small"
                :color="
                  item.lsb_status === 'close'
                    ? 'error'
                    : item.lsb_status === 'progress'
                      ? 'warning'
                      : 'success'
                "
                variant="flat"
                class="font-weight-bold text-uppercase"
              >
                {{ item.lsb_status || "open" }}
              </v-chip>
            </template>

            <!-- Template Expanded Row untuk Detail Item LHK (Dengan Checkbox per Baris) -->
            <template #expanded-row="{ columns, item }">
              <tr>
                <td :colspan="columns.length" class="bg-grey-lighten-4 pa-3">
                  <v-card flat border>
                    <v-data-table
                      :headers="detailColumns"
                      :items="item.details || []"
                      :items-per-page="-1"
                      density="compact"
                      hide-default-footer
                      show-select
                      v-model="item.selectedDetails"
                      item-value="No_Urut"
                      return-object
                    >
                      <template #[`item.Nomor_SPK`]="{ item: dItem }">
                        <span class="font-weight-bold color-spk">{{
                          dItem.Nomor_SPK
                        }}</span>
                      </template>
                      <template #[`item.Jumlah_meter`]="{ item: dItem }">
                        <span>{{
                          dItem.Jumlah_meter
                            ? Number(dItem.Jumlah_meter).toFixed(2) + " m²"
                            : "-"
                        }}</span>
                      </template>
                      <template #[`item.Sisa_Belum_Mutasi`]="{ item: dItem }">
                        <span class="font-weight-bold text-teal-darken-3">{{
                          dItem.Sisa_Belum_Mutasi
                        }}</span>
                      </template>
                    </v-data-table>
                  </v-card>
                </td>
              </tr>
            </template>

            <template #no-data>
              <div class="text-center pa-4">
                Tidak ada data LHK Sublim ditemukan.
              </div>
            </template>
          </v-data-table>
        </v-card-text>

        <!-- Footer Actions -->
        <v-card-actions class="d-flex justify-space-between border-top pa-3">
          <div class="text-caption font-weight-bold text-grey-darken-2">
            Tip: Klik ikon panah pada baris LHK, lalu centang baris detail
            tertentu yang ingin diambil.
          </div>
          <div>
            <v-btn
              @click="emit('close')"
              color="secondary"
              variant="outlined"
              size="small"
              class="mr-2"
              >Batal</v-btn
            >
            <v-btn
              @click="confirmSelection"
              color="indigo-darken-3"
              variant="flat"
              size="small"
            >
              Ambil Item Terpilih
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Konfirmasi jika LHK yang dipilih sudah pernah dimutasi (CLOSE).
         Tetap boleh dilanjutkan selama masih ada sisa stok. -->
    <v-dialog v-model="showClosedConfirm" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center text-warning text-subtitle-1 font-weight-bold">
          <v-icon start color="warning">mdi-alert-circle-outline</v-icon>
          LHK Sudah Pernah Dimutasi
        </v-card-title>
        <v-card-text class="text-body-2">
          <div class="mb-2">
            LHK berikut statusnya <strong>CLOSE</strong> karena sudah pernah
            dimutasi:
          </div>
          <div class="mb-3">
            <v-chip
              v-for="nomor in closedLhkNumbers"
              :key="nomor"
              size="small"
              color="warning"
              variant="tonal"
              class="mr-1 mb-1 font-weight-bold"
            >
              {{ nomor }}
            </v-chip>
          </div>
          <v-alert
            type="info"
            variant="tonal"
            density="compact"
            class="text-caption"
          >
            Status CLOSE tidak mengunci data. Anda tetap bisa melanjutkan
            mutasi selama masih ada sisa stok pada detail LHK.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            color="secondary"
            @click="cancelClosedSelection"
          >
            Batal
          </v-btn>
          <v-btn
            variant="flat"
            color="warning"
            @click="proceedClosedSelection"
          >
            Tetap Lanjutkan
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { format } from "date-fns";

const props = defineProps<{ isVisible: boolean }>();
const emit = defineEmits(["close", "select"]);
const toast = useToast();

const loading = ref(false);
const startDate = ref(format(new Date(), "yyyy-MM-01"));
const endDate = ref(format(new Date(), "yyyy-MM-dd"));
const searchKeyword = ref("");

const lhkList = ref<any[]>([]);
const selectedHeaders = ref<any[]>([]);
const expandedHeaders = ref<any[]>([]);
const showClosedConfirm = ref(false);
const pendingSelection = ref<any[]>([]);
const closedLhkNumbers = ref<string[]>([]);

const headerColumns = [
  { title: "Nomor LHK", key: "nomor", width: "180px" },
  { title: "Tanggal", key: "Tanggal", width: "110px" },
  { title: "Kode Gdg", key: "Gudang", width: "90px" },
  { title: "Nama Gudang", key: "Nama_Gudang", width: "200px" },
  {
    title: "Total Luas Meter",
    key: "total_meter",
    width: "130px",
    align: "end" as const,
  },
  {
    title: "Status Mutasi",
    key: "lsb_status",
    width: "110px",
    align: "center" as const,
  },
];

const detailColumns = [
  {
    title: "No. Urut",
    key: "No_Urut",
    width: "70px",
    align: "center" as const,
  },
  { title: "Nomor SPK", key: "Nomor_SPK", width: "150px" },
  { title: "Nama SPK", key: "Nama_SPK", width: "200px" },
  { title: "Bahan", key: "Jenis_Bahan", width: "130px" },
  { title: "Lokasi", key: "Lokasi", width: "80px" },
  { title: "P (cm)", key: "Panjang", width: "80px", align: "end" as const },
  { title: "L (cm)", key: "Lebar", width: "80px", align: "end" as const },
  { title: "J. Order", key: "J_Order", width: "80px", align: "end" as const },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "end" as const },
  {
    title: "Sisa Mutasi",
    key: "Sisa_Belum_Mutasi",
    width: "100px",
    align: "end" as const,
  },
  {
    title: "Total Meter",
    key: "Jumlah_meter",
    width: "110px",
    align: "end" as const,
  },
];

const fetchLhkHeaders = async () => {
  loading.value = true;
  try {
    const res = await api.get("/mmt/lhk-sublim/lookup", {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
        keyword: searchKeyword.value,
      },
    });

    const rawHeaders = res.data.data || [];

    const kw = (searchKeyword.value || "").trim().toLowerCase();

    let dataWithDetails = await Promise.all(
      rawHeaders.map(async (hdr: any) => {
        try {
          const detailRes = await api.get(
            `/mmt/lhk-sublim/detail/${hdr.nomor}`,
          );
          return {
            ...hdr,
            allDetails: detailRes.data.data || [],
            details: detailRes.data.data || [],
            selectedDetails: [], // Menyimpan item detail yang dicentang per baris LHK
          };
        } catch {
          return { ...hdr, allDetails: [], details: [], selectedDetails: [] };
        }
      }),
    );

    // Saat mencari dengan keyword (mis. Nomor SPK), filter detail agar yang
    // tampil di baris expand hanya SPK yang cocok dengan kata kunci.
    // Detail disaring pada field Nomor_SPK, Nama_SPK, dan Nomor (nomor LHK).
    // Jika tidak ada detail yang cocok pada satu header (mis. search gagal
    // cocok dengan nama gudang), detail lengkap header tersebut tetap tampil.
    if (kw) {
      dataWithDetails = dataWithDetails.map((hdr: any) => {
        const matched = (hdr.allDetails || []).filter((d: any) =>
          [d.Nomor_SPK, d.Nama_SPK, d.Nomor]
            .map((v) => String(v || "").toLowerCase())
            .some((v) => v.includes(kw)),
        );
        return {
          ...hdr,
          details: matched.length > 0 ? matched : hdr.allDetails,
        };
      });
    }

    lhkList.value = dataWithDetails;

    // Saat mencari dengan keyword, otomatis expand semua baris LHK yang
    // kena filter agar detail SPK-nya langsung terlihat.
    expandAllIfSearching();
  } catch (error) {
    console.error("Fetch LHK Headers Error:", error);
    toast.error("Gagal memuat data LHK Sublim.");
    lhkList.value = [];
  } finally {
    loading.value = false;
  }
};

// Buka expand semua baris jika sedang ada keyword pencarian aktif.
const expandAllIfSearching = () => {
  const kw = (searchKeyword.value || "").trim();
  if (kw) {
    expandedHeaders.value = lhkList.value.map((h) => h.nomor);
  }
};

const confirmSelection = () => {
  const collectedItems: any[] = [];
  const closedNumbers = new Set<string>();

  lhkList.value.forEach((hdr) => {
    let items: any[] = [];

    // 1. Ambil detail yang spesifik dicentang user pada tabel rincian (misal baris 2 & 3)
    if (hdr.selectedDetails && hdr.selectedDetails.length > 0) {
      items = hdr.selectedDetails;
    }
    // 2. Jika header LHK utama yang dicentang (ambil semua detail di LHK tersebut)
    else if (selectedHeaders.value.some((h) => h.nomor === hdr.nomor)) {
      items = hdr.details || [];
    }

    if (items.length > 0) {
      collectedItems.push(...items);
      if (String(hdr.lsb_status || "").toLowerCase() === "close") {
        closedNumbers.add(hdr.nomor);
      }
    }
  });

  if (collectedItems.length === 0) {
    toast.warning(
      "Silakan centang minimal satu baris detail LHK (atau Header LHK).",
    );
    return;
  }

  // LHK yang sudah pernah dimutasi tetap boleh dipilih, tetapi beri
  // peringatan agar user sadar bahwa stoknya mungkin sudah berkurang.
  if (closedNumbers.size > 0) {
    pendingSelection.value = collectedItems;
    closedLhkNumbers.value = [...closedNumbers];
    showClosedConfirm.value = true;
    return;
  }

  emit("select", collectedItems);
  emit("close");
};

const cancelClosedSelection = () => {
  showClosedConfirm.value = false;
  pendingSelection.value = [];
  closedLhkNumbers.value = [];
};

const proceedClosedSelection = () => {
  const items = pendingSelection.value;
  showClosedConfirm.value = false;
  pendingSelection.value = [];
  closedLhkNumbers.value = [];
  emit("select", items);
  emit("close");
};

watch(
  () => props.isVisible,
  (val) => {
    if (val) {
      searchKeyword.value = "";
      selectedHeaders.value = [];
      expandedHeaders.value = [];
      fetchLhkHeaders();
    } else {
      lhkList.value = [];
      selectedHeaders.value = [];
      expandedHeaders.value = [];
      showClosedConfirm.value = false;
      pendingSelection.value = [];
      closedLhkNumbers.value = [];
    }
  },
);
</script>

<style scoped>
.dialog-card {
  font-size: 13px;
}
.border-top {
  border-top: 1px solid #e0e0e0;
}
.desktop-table {
  font-size: 12px;
}
.desktop-table :deep(td),
.desktop-table :deep(th) {
  padding: 0 8px !important;
  height: 36px !important;
}
.desktop-table :deep(thead th) {
  background-color: #f8f9fa !important;
  font-weight: bold;
  color: #2c3e50 !important;
}
.color-spk {
  color: #1a237e;
}
.flex-grow-1 {
  height: 100%;
}
</style>
