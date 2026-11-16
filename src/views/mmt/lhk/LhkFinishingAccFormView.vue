<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import PageLayout from "@/components/PageLayout.vue";
import SpkLookupView from "@/modal/SpkLookupModal.vue";

const toast = useToast();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

// --- State ---
const isSaving = ref(false);
const isLoadingDetails = ref(false);
const isSpkLookupVisible = ref(false);
const activeRowIndex = ref<number | null>(null);

const API_BASE_URL = "/mmt/lhk-finishing";

const formData = reactive({
  nomor: "",
  tanggal: "",
  shift: 1,
  operator: "",
  gudang: "",
  nama_gudang: "",
});

const detailData = ref<any[]>([]);

// --- Headers (Sesuai style LHK Cetak) ---
const detailHeaders = [
  { title: "No", key: "no", width: "50px", sortable: false },
  { title: "No. SPK", key: "spk_nomor", width: "160px" },
  { title: "Nama Produk", key: "spk_nama", minWidth: "250px" },
  { title: "Jml Order", key: "j_order", width: "100px", align: "end" },
  { title: "Jml Potong", key: "j_potong", width: "100px", align: "end" },
  { title: "Seaming", key: "j_seaming", width: "90px", align: "end" },
  { title: "Mata Ayam", key: "j_mataayam", width: "90px", align: "end" },
  { title: "Coly", key: "j_coly", width: "90px", align: "end" },
  { title: "BS", key: "j_bs", width: "90px", align: "end" },
  {
    title: "Mata Ayam Qty",
    key: "mata_ayam_qty",
    width: "120px",
    align: "end",
  },
  { title: "XBanner Qty", key: "xbanner_qty", width: "120px", align: "end" },
  { title: "Plastik Qty", key: "plastik_qty", width: "120px", align: "end" },
  { title: "Karung Qty", key: "karung_qty", width: "120px", align: "end" },
  {
    title: "Rollup Banner Qty",
    key: "rollupbanner_qty",
    width: "150px",
    align: "end",
  },
  { title: "", key: "actions", width: "50px", sortable: false },
];

// --- Handlers ---
const openSpkSearch = (index: number | null = null) => {
  activeRowIndex.value = index;
  isSpkLookupVisible.value = true;
};

const handleSpkSelect = (spk: any) => {
  const nomorSpk = spk.Spk || spk.spk_nomor || spk.Nomor;
  const namaSpk = spk.Nama || spk.spk_nama || spk.Nama_Produk;

  if (activeRowIndex.value !== null) {
    const row = detailData.value[activeRowIndex.value];
    row.spk_nomor = nomorSpk;
    row.spk_nama = namaSpk;
  } else {
    detailData.value.push({
      spk_nomor: nomorSpk,
      spk_nama: namaSpk,
      j_order: spk.Jumlah || 0,
      j_potong: spk.J_Potong || 0,
      j_seaming: 0,
      j_mataayam: 0,
      j_coly: 1,
      j_bs: 0,
      mata_ayam_qty: spk.Mata_Ayam || 0,
      xbanner_qty: spk.XBanner || 0,
      plastik_qty: spk.Plastik || 0,
      karung_qty: spk.Karung || 0,
      rollupbanner_qty: spk.RollupBanner || 0,

      isNew: true, // Mark sebagai tambahan baru saat ACC
    });
  }
  isSpkLookupVisible.value = false;
};

const loaddataall = async (nomor: string) => {
  isLoadingDetails.value = true;
  try {
    // 1. Panggil API details (yang sudah kita perbaiki di backend untuk return Full Data)
    const response = await api.get(`${API_BASE_URL}/details`, {
      params: { nomor: nomor },
    });

    // Response data sekarang berbentuk: { success: true, data: { Nomor, Tanggal, ..., Detail: [...] } }
    const fullData = response.data.data;

    if (fullData) {
      // 2. Mapping Data Header (Bagian Atas Form)
      // Gunakan key sesuai dengan yang direturn oleh SQL di service getDetailsByNomor
      formData.nomor = fullData.Nomor;
      formData.tanggal = fullData.Tanggal;
      formData.shift = fullData.Shift;
      formData.operator = fullData.Operator;
      formData.gudang = fullData.Gudang;
      formData.nama_gudang = fullData.Nama_Gudang;
      if (fullData.Detail && Array.isArray(fullData.Detail)) {
        detailData.value = fullData.Detail.map((d: any) => ({
          spk_nomor: d.Nomor_SPK,
          spk_nama: d.Nama_SPK,
          j_order: Number(d.J_Order) || 0,
          j_seaming: Number(d.J_Seaming) || 0,
          j_mataayam: Number(d.J_MataAyam) || 0,
          j_coly: Number(d.J_Coly) || 0,
          j_bs: Number(d.J_Bs) || 0,
          j_potong: Number(d.J_Potong) || 0,
          mata_ayam_qty: Number(d.Mata_Ayam) || 0,
          xbanner_qty: Number(d.XBanner) || 0,
          plastik_qty: Number(d.Plastik) || 0,
          karung_qty: Number(d.Karung) || 0,
          rollupbanner_qty: Number(d.RollupBanner) || 0,
          isNew: false,
        }));
      } else {
        detailData.value = [];
        toast.warning("Data detail tidak ditemukan.");
      }
    }
  } catch (error) {
    console.error("Load Data Error:", error);
    toast.error("Gagal memuat rincian data Finishing.");
  } finally {
    isLoadingDetails.value = false;
  }
};

const removeRow = (idx: number) => detailData.value.splice(idx, 1);

const handleSave = async () => {
  if (detailData.value.length === 0) {
    toast.error("Rincian SPK tidak boleh kosong!");
    return;
  }

  const isAccMode = route.name === "LhkFinishingAcc";
  const confirmMessage = isAccMode
    ? "Simpan perubahan dan berikan ACC?"
    : "Simpan perubahan data (Update)?";

  if (!window.confirm(confirmMessage)) return;

  isSaving.value = true;

  // Variabel untuk menandai apakah request API sebenarnya berhasil
  let isSuccess = false;

  try {
    const payload = {
      nomor: formData.nomor,
      tanggal: formData.tanggal,
      operator: formData.operator,
      details: detailData.value.map((d) => ({
        spk_nomor: d.spk_nomor,
        j_potong: d.j_potong,
        j_seaming: d.j_seaming,
        j_mataayam: d.j_mataayam,
        j_coly: d.j_coly,
        j_bs: d.j_bs,
        mata_ayam_qty: d.mata_ayam_qty || 0,
        xbanner_qty: d.xbanner_qty || 0,
        plastik_qty: d.plastik_qty || 0,
        karung_qty: d.karung_qty || 0,
        rollupbanner_qty: d.rollupbanner_qty || 0,
      })),
    };

    const endpoint = isAccMode
      ? "/mmt/lhk-finishing/acc"
      : "/mmt/lhk-finishing/update";

    const res = await api.post(endpoint, payload);

    // Cek respon dengan lebih longgar (mengantisipasi jika res.data.success undefined tapi status 200)
    if (res.data?.success || res.status === 200) {
      isSuccess = true; // Tandai sukses
      toast.success(res.data?.message || "Data berhasil disimpan");

      // Gunakan setTimeout agar user sempat melihat toast sukses sebelum pindah halaman
      setTimeout(() => {
        router.replace({ name: "LHKFinishingBrowse" });
      }, 500);
    } else {
      toast.error(res.data?.message || "Server menolak permintaan");
    }
  } catch (error: any) {
    // JANGAN tampilkan toast error jika sebenarnya API sudah sukses (mencegah double toast)
    if (!isSuccess) {
      console.error("Save Error:", error);
      const errorMsg =
        error.response?.data?.message ||
        (isAccMode ? "Gagal melakukan ACC" : "Gagal mengupdate data");
      toast.error(errorMsg);
    } else {
      // Jika masuk sini, berarti API sukses tapi ada error di kode Vue setelahnya (misal router error)
      console.warn(
        "API Sukses, tapi terjadi error di client-side logic:",
        error,
      );
    }
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  const nomor = route.params.nomor;
  if (nomor) loaddataall(nomor as string);
});
</script>

<template>
  <PageLayout
    :title="
      route.name === 'LhkFinishingAcc'
        ? 'ACC LHK Finishing MMT'
        : 'Ubah LHK Finishing MMT'
    "
    :icon="
      route.name === 'LhkFinishingAcc'
        ? 'mdi-check-decagram'
        : 'mdi-pencil-box-multiple'
    "
  >
    <template #header-actions>
      <v-btn
        size="small"
        :color="route.name === 'LhkFinishingAcc' ? 'primary' : 'warning'"
        @click="handleSave"
        :loading="isSaving"
        class="mr-2"
      >
        <v-icon start>{{
          route.name === "LhkFinishingAcc"
            ? "mdi-content-save-check"
            : "mdi-database-edit"
        }}</v-icon>
        {{
          route.name === "LhkFinishingAcc" ? "Simpan & ACC" : "Simpan & Update"
        }}
      </v-btn>

      <v-btn
        size="small"
        variant="outlined"
        color="error"
        @click="router.back()"
      >
        <v-icon start>mdi-exit-to-app</v-icon> Batal
      </v-btn>
    </template>

    <v-row dense>
      <v-col cols="12">
        <v-card flat border class="bg-grey-lighten-5 pa-3">
          <v-row dense>
            <v-col cols="12" md="2">
              <v-text-field
                v-model="formData.nomor"
                label="No. LHK"
                readonly
                density="compact"
                variant="solo-filled"
                flat
                hide-details
              />
            </v-col>
            <v-col cols="12" md="2">
              <v-text-field
                v-model="formData.tanggal"
                label="Tanggal"
                readonly
                density="compact"
                variant="solo-filled"
                flat
                hide-details
              />
            </v-col>
            <v-col cols="12" md="2">
              <v-text-field
                v-model="formData.nama_gudang"
                label="Gudang"
                readonly
                density="compact"
                variant="solo-filled"
                flat
                hide-details
              />
            </v-col>
            <v-col cols="12" md="1">
              <v-text-field
                v-model="formData.shift"
                label="Shift"
                readonly
                density="compact"
                variant="solo-filled"
                flat
                hide-details
              />
            </v-col>
            <v-col cols="12" md="5">
              <v-text-field
                v-model="formData.operator"
                label="Operator"
                readonly
                density="compact"
                variant="solo-filled"
                flat
                hide-details
              />
            </v-col>
          </v-row>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card flat border>
          <v-toolbar density="compact" color="primary" flat>
            <v-icon start class="ml-2 text-white">mdi-playlist-check</v-icon>
            <v-toolbar-title class="text-subtitle-2 text-white"
              >Verifikasi Data Produksi Finishing</v-toolbar-title
            >
            <v-spacer />
            <v-btn
              size="small"
              color="success"
              variant="elevated"
              prepend-icon="mdi-plus"
              @click="openSpkSearch(null)"
            >
              Tambah SPK Belum Rekap
            </v-btn>
          </v-toolbar>

          <v-data-table
            :headers="detailHeaders"
            :items="detailData"
            :items-per-page="-1"
            density="compact"
            height="450px"
            fixed-header
            hide-default-footer
          >
            <template #[`item.no`]="{ index }">{{ index + 1 }}</template>

            <template #[`item.spk_nomor`]="{ item }">
              <span :class="{ 'text-primary font-weight-bold': item.isNew }">
                {{ item.spk_nomor }}
                <v-chip
                  v-if="item.isNew"
                  size="x-small"
                  color="success"
                  class="ml-1"
                  >Baru</v-chip
                >
              </span>
            </template>

            <template #[`item.j_order`]="{ item }">
              <v-text-field
                v-model.number="item.j_order"
                type="number"
                density="compact"
                hide-details
                variant="underlined"
                class="text-right"
              />
            </template>
            <template #[`item.j_potong`]="{ item }">
              <v-text-field
                v-model.number="item.j_potong"
                type="number"
                density="compact"
                hide-details
                variant="underlined"
                class="text-right"
              />
            </template>
            <template #[`item.j_seaming`]="{ item }">
              <v-text-field
                v-model.number="item.j_seaming"
                type="number"
                density="compact"
                hide-details
                variant="underlined"
                class="text-right"
              />
            </template>
            <template #[`item.j_mataayam`]="{ item }">
              <v-text-field
                v-model.number="item.j_mataayam"
                type="number"
                density="compact"
                hide-details
                variant="underlined"
                class="text-right"
              />
            </template>
            <template #[`item.j_coly`]="{ item }">
              <v-text-field
                v-model.number="item.j_coly"
                type="number"
                density="compact"
                hide-details
                variant="underlined"
                class="text-right"
              />
            </template>
            <template #[`item.j_bs`]="{ item }">
              <v-text-field
                v-model.number="item.j_bs"
                type="number"
                density="compact"
                hide-details
                variant="underlined"
                class="text-right"
                color="error"
              />
            </template>
            <template #[`item.mata_ayam_qty`]="{ item }">
              <v-text-field
                v-model.number="item.mata_ayam_qty"
                type="number"
                density="compact"
                hide-details
                variant="underlined"
                class="text-right"
              />
            </template>
            <template #[`item.xbanner_qty`]="{ item }">
              <v-text-field
                v-model.number="item.xbanner_qty"
                type="number"
                density="compact"
                hide-details
                variant="underlined"
                class="text-right"
              />
            </template>
            <template #[`item.plastik_qty`]="{ item }">
              <v-text-field
                v-model.number="item.plastik_qty"
                type="number"
                density="compact"
                hide-details
                variant="underlined"
                class="text-right"
              />
            </template>
            <template #[`item.karung_qty`]="{ item }">
              <v-text-field
                v-model.number="item.karung_qty"
                type="number"
                density="compact"
                hide-details
                variant="underlined"
                class="text-right"
              />
            </template>
            <template #[`item.rollupbanner_qty`]="{ item }">
              <v-text-field
                v-model.number="item.rollupbanner_qty"
                type="number"
                density="compact"
                hide-details
                variant="underlined"
                class="text-right"
              />
            </template>

            <template #[`item.actions`]="{ index }">
              <v-btn
                icon="mdi-delete"
                size="x-small"
                color="error"
                variant="text"
                @click="removeRow(index)"
              />
            </template>

            <template #body.append v-if="detailData.length > 0">
              <tr class="bg-blue-lighten-5 font-weight-bold">
                <td colspan="3" class="text-end">TOTAL :</td>

                <td class="text-end text-primary">
                  {{
                    detailData
                      .reduce((s, i) => s + (Number(i.j_order) || 0), 0)
                      .toLocaleString()
                  }}
                </td>

                <td class="text-end">
                  {{
                    detailData
                      .reduce((s, i) => s + (Number(i.j_potong) || 0), 0)
                      .toLocaleString()
                  }}
                </td>

                <td class="text-end">
                  {{
                    detailData
                      .reduce((s, i) => s + (Number(i.j_seaming) || 0), 0)
                      .toLocaleString()
                  }}
                </td>

                <td class="text-end">
                  {{
                    detailData
                      .reduce((s, i) => s + (Number(i.j_mataayam) || 0), 0)
                      .toLocaleString()
                  }}
                </td>

                <td class="text-end">
                  {{
                    detailData
                      .reduce((s, i) => s + (Number(i.j_coly) || 0), 0)
                      .toLocaleString()
                  }}
                </td>

                <td class="text-end text-error">
                  {{
                    detailData
                      .reduce((s, i) => s + (Number(i.j_bs) || 0), 0)
                      .toLocaleString()
                  }}
                </td>

                <td class="text-end">
                  {{
                    detailData
                      .reduce((s, i) => s + (Number(i.mata_ayam_qty) || 0), 0)
                      .toLocaleString()
                  }}
                </td>

                <td class="text-end">
                  {{
                    detailData
                      .reduce((s, i) => s + (Number(i.xbanner_qty) || 0), 0)
                      .toLocaleString()
                  }}
                </td>

                <td class="text-end">
                  {{
                    detailData
                      .reduce((s, i) => s + (Number(i.plastik_qty) || 0), 0)
                      .toLocaleString()
                  }}
                </td>

                <td class="text-end">
                  {{
                    detailData
                      .reduce((s, i) => s + (Number(i.karung_qty) || 0), 0)
                      .toLocaleString()
                  }}
                </td>

                <td class="text-end">
                  {{
                    detailData
                      .reduce(
                        (s, i) => s + (Number(i.rollupbanner_qty) || 0),
                        0,
                      )
                      .toLocaleString()
                  }}
                </td>

                <td></td>
              </tr>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <SpkLookupView
      :isVisible="isSpkLookupVisible"
      @close="isSpkLookupVisible = false"
      @select="handleSpkSelect"
    />
  </PageLayout>
</template>

<style scoped>
:deep(.v-data-table) {
  font-family: "Inter", sans-serif !important;
}

:deep(thead th) {
  background-color: #87cefa !important; /* Biru muda sesuai LHK Cetak */
  color: white !important;
  font-weight: 600 !important;
  font-size: 11px !important;
  height: 48px !important;
}

:deep(tbody td) {
  font-size: 11px !important;
  color: #333 !important;
}

:deep(.v-field__input) {
  font-size: 11px !important;
  min-height: 32px !important;
}
</style>
