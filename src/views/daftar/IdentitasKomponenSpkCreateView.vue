<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import { useForm } from "@/composables/useForm";
import BaseForm from "@/components/BaseForm.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import {
  IconListDetails,
  IconScissors,
  IconPrinter,
  IconPlus,
  IconTrash,
  IconSearch,
} from "@tabler/icons-vue";

const toast = useToast();
const lookupOptions = ref<any[]>([]);
const lookupBordirOptions = ref<any[]>([]);
const showSpkModal = ref(false);
const activeTab = ref("potong");
// State Modal Bahan
const showBahanModal = ref(false);
const activeBahanType = ref<"ListPotong" | "ListCetakBordir">("ListPotong");
const activeBahanIndex = ref(-1);
const prosesOptions = computed(() => {
  const opts: string[] = [];
  if (formData.value.Cetak) opts.push("SABLON", "SUBLIM");
  if (formData.value.Bordir) opts.push("BORDIR");
  if (!opts.includes("DTF")) opts.push("DTF");
  return opts;
});

const initialData = {
  NomorSPK: "",
  NamaBarang: "",
  JenisBarang: "",
  Map: "",
  Jumlah: 0,
  Cetak: false,
  Bordir: false,
  ListPotong: [] as any[],
  ListCetakBordir: [] as any[],
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
    if (!data.NomorSPK) {
      throw new Error("Nomor SPK tidak boleh kosong.");
    }

    await api.post("/master/komponen-spk-form/save", data);

    toast.success("Identitas Komponen SPK berhasil disimpan.");
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
  listName: "ListPotong" | "ListCetakBordir",
  index: number,
) => {
  activeBahanType.value = listName;
  activeBahanIndex.value = index;
  showBahanModal.value = true;
};

// Handle Saat Komponen Dipilih dari Modal
const handleBahanSelected = (bahan: any) => {
  const listName = activeBahanType.value; // "ListPotong" | "ListCetakBordir"
  const index = activeBahanIndex.value;

  const isDuplicate = formData.value[listName].some(
    (row: any, i: number) => row.Kode === bahan.Kode && i !== index,
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
const addRow = (listName: "ListPotong" | "ListCetakBordir") => {
  if (listName === "ListCetakBordir") {
    formData.value.ListCetakBordir.push({
      Kode: null,
      Nama: "",
      Proses: "DTF",
      Penempatan: "",
      Ukuran: "",
    });
  } else {
    formData.value.ListPotong.push({ Kode: null, Nama: "" });
  }
};

const removeRow = (
  listName: "ListPotong" | "ListCetakBordir",
  index: number,
) => {
  formData.value[listName].splice(index, 1);
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
    :icon="IconListDetails"
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
            <IconSearch
              v-if="!isEditMode"
              :size="16"
              :stroke-width="1.7"
              color="#1565c0"
              style="cursor: pointer"
              @mousedown.prevent="openSpkModal"
            />
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
          <v-tab value="potong">
            <template #prepend
              ><IconScissors :size="16" :stroke-width="1.7" class="mr-1"
            /></template>
            POTONG
          </v-tab>
          <v-tab value="cetakbordir">
            <template #prepend
              ><IconPrinter :size="16" :stroke-width="1.7" class="mr-1"
            /></template>
            SECOND PROCESS
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
                    <IconScissors
                      :size="15"
                      :stroke-width="1.7"
                      class="mr-1"
                    />KOMPONEN POTONG
                  </span>
                  <v-btn
                    size="small"
                    color="blue-darken-3"
                    @click="addRow('ListPotong')"
                  >
                    <template #prepend
                      ><IconPlus :size="14" :stroke-width="2"
                    /></template>
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
                        >
                          <template #append-inner>
                            <IconSearch
                              :size="14"
                              :stroke-width="1.7"
                              color="#1565c0"
                              style="cursor: pointer"
                            /> </template
                        ></v-text-field>
                      </td>
                      <td>{{ item.Nama }}</td>
                      <td class="text-center">
                        <v-btn
                          color="error"
                          variant="text"
                          size="small"
                          @click="removeRow('ListPotong', idx)"
                        >
                          <IconTrash :size="16" :stroke-width="1.7" />
                        </v-btn>
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

            <!-- SECOND PROCESS (Cetak + Bordir gabung) -->
            <v-window-item value="cetakbordir">
              <div class="tab-content">
                <div class="tab-content-header">
                  <span class="tab-content-title text-orange-darken-3">
                    <IconPrinter :size="15" :stroke-width="1.7" class="mr-1" />
                    KOMPONEN SECOND PROCESS
                  </span>
                  <v-btn
                    size="small"
                    color="orange-darken-3"
                    @click="addRow('ListCetakBordir')"
                  >
                    <template #prepend
                      ><IconPlus :size="14" :stroke-width="2"
                    /></template>
                    Tambah
                  </v-btn>
                </div>
                <v-table density="compact" class="komponen-table">
                  <thead>
                    <tr>
                      <th class="col-no">No</th>
                      <th style="width: 160px">Kode</th>
                      <th>Nama</th>
                      <th style="width: 110px">Proses</th>
                      <th style="width: 130px">Penempatan</th>
                      <th style="width: 100px">Ukuran</th>
                      <th class="col-aksi text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(item, idx) in formData.ListCetakBordir"
                      :key="'cb' + idx"
                    >
                      <td>{{ (idx as number) + 1 }}</td>
                      <td class="pa-1">
                        <v-text-field
                          v-model="item.Kode"
                          readonly
                          variant="outlined"
                          density="compact"
                          hide-details
                          placeholder="Klik u/ Cari"
                          class="cursor-pointer"
                          @click="
                            openBahanModal('ListCetakBordir', idx as number)
                          "
                        >
                          <template #append-inner>
                            <IconSearch
                              :size="14"
                              :stroke-width="1.7"
                              color="#1565c0"
                              style="cursor: pointer"
                            />
                          </template>
                        </v-text-field>
                      </td>
                      <td>{{ item.Nama }}</td>
                      <td class="pa-1">
                        <v-select
                          v-model="item.Proses"
                          :items="prosesOptions"
                          variant="outlined"
                          density="compact"
                          hide-details
                        />
                      </td>
                      <td class="pa-1">
                        <v-text-field
                          v-model="item.Penempatan"
                          variant="outlined"
                          density="compact"
                          hide-details
                          placeholder="Mis: Kanan Atas"
                        />
                      </td>
                      <td class="pa-1">
                        <v-text-field
                          v-model="item.Ukuran"
                          variant="outlined"
                          density="compact"
                          hide-details
                          placeholder="Mis: 10x10 cm"
                        />
                      </td>
                      <td class="text-center">
                        <v-btn
                          color="error"
                          variant="text"
                          size="small"
                          @click="removeRow('ListCetakBordir', idx as number)"
                        >
                          <IconTrash :size="16" :stroke-width="1.7" />
                        </v-btn>
                      </td>
                    </tr>
                    <tr v-if="!formData.ListCetakBordir.length">
                      <td colspan="7" class="text-center text-grey py-4">
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
