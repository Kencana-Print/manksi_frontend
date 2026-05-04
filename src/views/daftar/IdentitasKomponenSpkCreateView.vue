<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import { useForm } from "@/composables/useForm";
import BaseForm from "@/components/BaseForm.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";

const toast = useToast();
const lookupOptions = ref<any[]>([]);
const lookupBordirOptions = ref<any[]>([]);
const showSpkModal = ref(false);
const activeTab = ref("potong");
// State Modal Bahan
const showBahanModal = ref(false);
const activeBahanType = ref<"ListPotong" | "ListCetak" | "ListBordir">(
  "ListPotong",
);
const activeBahanIndex = ref(-1);

const initialData = {
  NomorSPK: "",
  NamaBarang: "",
  JenisBarang: "",
  Map: "",
  Jumlah: 0,
  Cetak: false,
  Bordir: false,
  ListPotong: [] as any[],
  ListCetak: [] as any[],
  ListBordir: [] as any[],
};

const {
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  params,
  goBack,
  executeSave,
  executeCancel,
  executeClose,
} = useForm({
  menuId: "18",
  initialData,
  submitApi: async (data) => {
    if (!data.NomorSPK) throw new Error("Nomor SPK tidak boleh kosong.");
    await api.post("/master/komponen-spk-form/save", data);
  },
  onSuccessRoute: "/daftar/komponen-spk",
});

// ── Lookups ────────────────────────────────────────────────────────────
const loadLookups = async () => {
  try {
    const [resAll, resBordir] = await Promise.all([
      api.get("/master/komponen-spk-form/lookup-bahan"),
      api.get("/master/komponen-spk-form/lookup-bahan?isBordir=true"),
    ]);
    lookupOptions.value = resAll.data.data;
    lookupBordirOptions.value = resBordir.data.data;
  } catch {
    toast.error("Gagal memuat lookup bahan.");
  }
};

// ── Load SPK ───────────────────────────────────────────────────────────
const fetchSpkData = async () => {
  if (!formData.value.NomorSPK) return;
  isLoading.value = true;
  try {
    const res = await api.get(
      `/master/komponen-spk-form/load?nomor=${formData.value.NomorSPK}`,
    );
    Object.assign(formData.value, res.data.data);
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal memuat info SPK");
    formData.value.NamaBarang = "";
  } finally {
    isLoading.value = false;
  }
};

// FIX 1: openSpkModal — pastikan tidak ada kondisi yang mencegahnya
const openSpkModal = () => {
  if (isEditMode.value) return; // hanya blokir saat edit mode
  showSpkModal.value = true;
};

const handleSpkSelected = (spk: any) => {
  formData.value.NomorSPK = spk.Nomor;
  showSpkModal.value = false; // tutup modal dulu sebelum fetch
  fetchSpkData();
};

// Fungsi Buka Modal Bahan (klik input Kode di tabel)
const openBahanModal = (
  listName: "ListPotong" | "ListCetak" | "ListBordir",
  index: number,
) => {
  activeBahanType.value = listName;
  activeBahanIndex.value = index;
  showBahanModal.value = true;
};

// Handle Saat Komponen Dipilih dari Modal
const handleBahanSelected = (bahan: any) => {
  const listName = activeBahanType.value;
  const index = activeBahanIndex.value;

  // Cek Duplikat
  const isDuplicate = formData.value[listName].some(
    (row, i) => row.Kode === bahan.Kode && i !== index,
  );
  if (isDuplicate) {
    toast.warning(`Kode ${bahan.Kode} sudah ada di baris lain.`);
    return;
  }

  formData.value[listName][index].Kode = bahan.Kode;
  formData.value[listName][index].Nama = bahan.Nama;
};

onMounted(() => {
  loadLookups();
  if (isEditMode.value && params.nomor) {
    formData.value.NomorSPK = String(params.nomor);
    fetchSpkData();
  }
});

// ── Grid manipulation ──────────────────────────────────────────────────
const addRow = (listName: "ListPotong" | "ListCetak" | "ListBordir") => {
  formData.value[listName].push({ Kode: null, Nama: "" });
};

const removeRow = (
  listName: "ListPotong" | "ListCetak" | "ListBordir",
  index: number,
) => {
  formData.value[listName].splice(index, 1);
};

// FIX 3: gunakan listName yang benar dan options yang sesuai
const onBahanSelect = (
  itemKode: string,
  index: number,
  listName: "ListPotong" | "ListCetak" | "ListBordir",
) => {
  // Bordir pakai lookupBordirOptions, sisanya lookupOptions
  const options =
    listName === "ListBordir" ? lookupBordirOptions.value : lookupOptions.value;
  const found = options.find((x) => x.Kode === itemKode);

  if (found) {
    const isDuplicate = formData.value[listName].some(
      (row, i) => row.Kode === itemKode && i !== index,
    );
    if (isDuplicate) {
      toast.warning(`Kode ${itemKode} sudah ada di baris lain.`);
      formData.value[listName][index].Kode = null;
      formData.value[listName][index].Nama = "";
      return;
    }
    formData.value[listName][index].Nama = found.Nama;
  }
};
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? 'Ubah Identitas Komponen SPK'
        : 'Tambah Identitas Komponen SPK'
    "
    menu-id="18"
    icon="mdi-format-list-bulleted-type"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Identitas Komponen SPK"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="showSaveDialog = true"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ── Kolom kiri: Info SPK ── -->
    <template #left-column>
      <div class="info-spk-panel">
        <div class="section-label">INFO SPK</div>

        <v-text-field
          v-model="formData.NomorSPK"
          label="Nomor SPK"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3"
          :readonly="isEditMode"
          :bg-color="isEditMode ? 'grey-lighten-4' : ''"
          @keydown.enter="fetchSpkData"
          @blur="!isEditMode && fetchSpkData()"
          placeholder="Ketik lalu Enter"
        >
          <template #append-inner>
            <!-- FIX 1: pakai @mousedown.prevent agar tidak ada blur sebelum klik -->
            <v-icon
              v-if="!isEditMode"
              class="cursor-pointer"
              color="primary"
              @mousedown.prevent="openSpkModal"
            >
              mdi-magnify
            </v-icon>
          </template>
        </v-text-field>

        <v-text-field
          v-model="formData.NamaBarang"
          label="Nama Barang"
          variant="outlined"
          density="compact"
          readonly
          bg-color="grey-lighten-4"
          hide-details
          class="mb-2"
        />
        <v-text-field
          v-model="formData.JenisBarang"
          label="Jenis Order"
          variant="outlined"
          density="compact"
          readonly
          bg-color="grey-lighten-4"
          hide-details
          class="mb-2"
        />
        <v-text-field
          v-model="formData.Jumlah"
          label="Jumlah Order"
          variant="outlined"
          density="compact"
          readonly
          bg-color="grey-lighten-4"
          hide-details
          class="mb-2"
        />
        <v-text-field
          v-model="formData.Map"
          label="Map / Memo"
          variant="outlined"
          density="compact"
          readonly
          bg-color="grey-lighten-4"
          hide-details
          class="mb-2"
        />

        <div class="d-flex gap-4 mt-2">
          <v-checkbox
            v-model="formData.Cetak"
            label="Cetak"
            density="compact"
            hide-details
            readonly
            color="primary"
          />
          <v-checkbox
            v-model="formData.Bordir"
            label="Bordir"
            density="compact"
            hide-details
            readonly
            color="primary"
          />
        </div>
      </div>
    </template>

    <!-- ── Kolom kanan: Tab komponen ── -->
    <template #right-column>
      <!--
        FIX 2: Jangan bungkus v-tabs + v-window dalam satu div dengan h-100.
        Pisahkan keduanya agar background biru dari v-tabs tidak "meluber"
        ke area v-window. Gunakan flex column dengan overflow hidden.
      -->
      <div class="tab-panel">
        <!-- Tab header saja -->
        <v-tabs
          v-model="activeTab"
          bg-color="primary"
          density="compact"
          class="tab-header"
        >
          <v-tab value="potong" class="font-weight-bold">
            <v-icon start size="16">mdi-content-cut</v-icon>POTONG
          </v-tab>
          <v-tab value="cetak" class="font-weight-bold">
            <v-icon start size="16">mdi-printer</v-icon>CETAK
          </v-tab>
          <v-tab value="bordir" class="font-weight-bold">
            <v-icon start size="16">mdi-needle</v-icon>BORDIR
          </v-tab>
        </v-tabs>

        <!-- Konten tab — background putih, scroll di sini -->
        <div class="tab-body">
          <v-window v-model="activeTab">
            <!-- POTONG -->
            <v-window-item value="potong">
              <div class="tab-content">
                <div class="tab-content-header">
                  <span class="tab-content-title text-blue-darken-3">
                    <v-icon size="15" class="mr-1">mdi-content-cut</v-icon
                    >KOMPONEN POTONG
                  </span>
                  <v-btn
                    size="small"
                    color="blue-darken-3"
                    prepend-icon="mdi-plus"
                    @click="addRow('ListPotong')"
                  >
                    Tambah
                  </v-btn>
                </div>
                <v-table density="compact" class="komponen-table">
                  <thead>
                    <tr>
                      <th class="col-no">No</th>
                      <th class="col-kode">Kode Komponen</th>
                      <th>Nama Komponen</th>
                      <th class="col-aksi text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(item, idx) in formData.ListPotong"
                      :key="'p' + idx"
                    >
                      <td>{{ idx + 1 }}</td>
                      <td class="pa-1">
                        <v-text-field
                          v-model="item.Kode"
                          readonly
                          variant="outlined"
                          density="compact"
                          hide-details
                          placeholder="Klik u/ Cari"
                          class="cursor-pointer"
                          @click="openBahanModal('ListPotong', idx)"
                          append-inner-icon="mdi-magnify"
                        ></v-text-field>
                      </td>
                      <td>{{ item.Nama }}</td>
                      <td class="text-center">
                        <v-btn
                          icon="mdi-delete"
                          color="error"
                          variant="text"
                          size="small"
                          @click="removeRow('ListPotong', idx)"
                        />
                      </td>
                    </tr>
                    <tr v-if="formData.ListPotong.length === 0">
                      <td colspan="4" class="text-center text-grey py-4">
                        Belum ada data
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
            </v-window-item>

            <!-- CETAK -->
            <v-window-item value="cetak">
              <div class="tab-content">
                <div class="tab-content-header">
                  <span class="tab-content-title text-orange-darken-3">
                    <v-icon size="15" class="mr-1">mdi-printer</v-icon>KOMPONEN
                    CETAK
                  </span>
                  <v-btn
                    size="small"
                    color="orange-darken-3"
                    prepend-icon="mdi-plus"
                    @click="addRow('ListCetak')"
                  >
                    Tambah
                  </v-btn>
                </div>
                <v-table density="compact" class="komponen-table">
                  <thead>
                    <tr>
                      <th class="col-no">No</th>
                      <th class="col-kode">Kode Komponen</th>
                      <th>Nama Komponen</th>
                      <th class="col-aksi text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(item, idx) in formData.ListCetak"
                      :key="'c' + idx"
                    >
                      <td>{{ idx + 1 }}</td>
                      <td class="pa-1">
                        <v-text-field
                          v-model="item.Kode"
                          readonly
                          variant="outlined"
                          density="compact"
                          hide-details
                          placeholder="Klik u/ Cari"
                          class="cursor-pointer"
                          @click="openBahanModal('ListCetak', idx)"
                          append-inner-icon="mdi-magnify"
                        ></v-text-field>
                      </td>
                      <td>{{ item.Nama }}</td>
                      <td class="text-center">
                        <v-btn
                          icon="mdi-delete"
                          color="error"
                          variant="text"
                          size="small"
                          @click="removeRow('ListCetak', idx)"
                        />
                      </td>
                    </tr>
                    <tr v-if="formData.ListCetak.length === 0">
                      <td colspan="4" class="text-center text-grey py-4">
                        Belum ada data
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
            </v-window-item>

            <!-- BORDIR -->
            <v-window-item value="bordir">
              <div class="tab-content">
                <div class="tab-content-header">
                  <span class="tab-content-title text-purple-darken-3">
                    <v-icon size="15" class="mr-1">mdi-needle</v-icon>KOMPONEN
                    BORDIR
                  </span>
                  <v-btn
                    size="small"
                    color="purple-darken-3"
                    prepend-icon="mdi-plus"
                    @click="addRow('ListBordir')"
                  >
                    Tambah
                  </v-btn>
                </div>
                <v-table density="compact" class="komponen-table">
                  <thead>
                    <tr>
                      <th class="col-no">No</th>
                      <th class="col-kode">Kode Komponen</th>
                      <th>Nama Komponen</th>
                      <th class="col-aksi text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(item, idx) in formData.ListBordir"
                      :key="'b' + idx"
                    >
                      <td>{{ idx + 1 }}</td>
                      <td class="pa-1">
                        <!-- FIX 3: gunakan lookupBordirOptions untuk Bordir -->
                        <v-text-field
                          v-model="item.Kode"
                          readonly
                          variant="outlined"
                          density="compact"
                          hide-details
                          placeholder="Klik u/ Cari"
                          class="cursor-pointer"
                          @click="openBahanModal('ListBordir', idx)"
                          append-inner-icon="mdi-magnify"
                        ></v-text-field>
                      </td>
                      <td>{{ item.Nama }}</td>
                      <td class="text-center">
                        <v-btn
                          icon="mdi-delete"
                          color="error"
                          variant="text"
                          size="small"
                          @click="removeRow('ListBordir', idx)"
                        />
                      </td>
                    </tr>
                    <tr v-if="formData.ListBordir.length === 0">
                      <td colspan="4" class="text-center text-grey py-4">
                        Belum ada data
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
            </v-window-item>
          </v-window>
        </div>
      </div>

      <!-- FIX 1: SpkSearchModal tetap di dalam right-column agar terpasang di DOM yang benar -->
      <SpkSearchModal v-model="showSpkModal" @selected="handleSpkSelected" />

      <BahanSearchModal
        v-model="showBahanModal"
        mode="komponen"
        :is-bordir="activeBahanType === 'ListBordir'"
        @selected="handleBahanSelected"
      />
    </template>
  </BaseForm>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

/* ── Info SPK panel ── */
.info-spk-panel {
  padding: 16px;
}
.section-label {
  font-size: 12px;
  font-weight: 700;
  color: #1867c0;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

/* ── Tab panel ── */
.tab-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

/* Tab header — hanya baris tab, tidak ada konten di sini */
.tab-header {
  flex-shrink: 0;
}

/*
  Tab body — area putih di bawah tab header.
  Background putih di sini memutus "luberan" biru dari v-tabs.
*/
.tab-body {
  flex: 1;
  overflow-y: auto;
  background: #f5f5f5;
}

/* Konten dalam setiap tab item */
.tab-content {
  padding: 16px;
}

.tab-content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.tab-content-title {
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
}

/* ── Tabel komponen ── */
.komponen-table {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
}

.komponen-table :deep(thead th) {
  background: #f5f5f5;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  height: 32px !important;
  white-space: nowrap;
}

.komponen-table :deep(tbody td) {
  height: 40px !important;
  font-size: 12px;
}

.col-no {
  width: 48px;
}
.col-kode {
  width: 200px;
}
.col-aksi {
  width: 56px;
}

/* Autocomplete dalam tabel — pastikan background putih dan terlihat */
:deep(.v-autocomplete .v-field) {
  background-color: white !important;
  font-size: 12px;
}
</style>
