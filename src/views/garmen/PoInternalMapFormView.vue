<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { poInternalMapFormService } from "@/services/garmen/poInternalMapFormService";

// Modals
import PabrikSearchModal from "@/components/lookups/PabrikSearchModal.vue";
import MapSearchModal from "@/components/lookups/MapSearchModal.vue";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const showPrintDialog = ref(false);
const savedNomor = ref("");

// ── INISIALISASI DATA ──
const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createEmptyRow = () => ({
  KodeMAP: "",
  NamaMAP: "",
  Bahan: "",
  Ukuran: "",
  QtyMAP: 0,
  JumlahPO: 0,
  Dateline: "",
  Keterangan: "",
  Gambar: false, // Untuk indikator Pict
});

const initialData = {
  Nomor: "",
  Tanggal: getLocalDate(),
  GudangAsal: "",
  GudangAsalNama: "",
  Tujuan: "",
  TujuanNama: "",
  Details: [createEmptyRow()],
};

// Fungsi helper untuk normalisasi huruf kecil semua (case-insensitive)
const normalizeKeys = (obj: any) => {
  if (!obj) return {};
  const normalized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      normalized[key.toLowerCase()] = obj[key];
    }
  }
  return normalized;
};

// Fungsi helper untuk mapping data dari Backend ke Frontend
const mapDataToForm = (backendData: any) => {
  if (!backendData) return initialData;

  // 1. Normalisasi header
  const header = normalizeKeys(backendData.header);

  // 2. Normalisasi setiap baris detail
  const detail = backendData.detail || [];

  return {
    Nomor: header.poi_nomor || "",
    Tanggal: header.poi_tanggal
      ? header.poi_tanggal.substring(0, 10)
      : getLocalDate(),
    GudangAsal: header.poi_cab || "",
    GudangAsalNama: header.namacab || "",
    Tujuan: header.poi_sup || "",
    TujuanNama: header.namasup || "",
    Details:
      detail.length > 0
        ? detail.map((rawRow: any) => {
            const d = normalizeKeys(rawRow);
            return {
              KodeMAP: d.poid_kode || "",
              NamaMAP: d.mspk_nama || "",
              Bahan: d.mspk_kain || "", // Dulu d.Mspk_kain, sekarang aman mspk_kain
              Ukuran: d.mspk_ukuran || "", // Dulu d.Mspk_ukuran
              QtyMAP: Number(d.mspk_jumlah) || 0,
              JumlahPO: Number(d.poid_jumlah) || 0,
              Dateline:
                d.poid_dateline &&
                !d.poid_dateline.startsWith("1899") &&
                !d.poid_dateline.startsWith("0000")
                  ? d.poid_dateline.substring(0, 10)
                  : "",
              Keterangan: d.poid_ket || "",
              Gambar: false,
            };
          })
        : [createEmptyRow()],
  };
};

import { useForm } from "@/composables/useForm";
const {
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  fetchData,
  executeSave,
  executeCancel,
  executeClose,
  params,
} = useForm({
  menuId: "138",
  initialData,
  fetchApi: async () => {
    const res = await poInternalMapFormService.getById(params.nomor as string);
    return mapDataToForm(res.data.data);
  },
  submitApi: async (dataToSave) => {
    // ── Validasi Frontend Sebelum Simpan ──
    if (!dataToSave.GudangAsal) throw new Error("Gudang Asal belum di isi.");
    if (!dataToSave.Tujuan) throw new Error("Tujuan belum di isi.");
    if (dataToSave.GudangAsal === dataToSave.Tujuan) {
      throw new Error("Asal Gudang dan Tujuan tidak boleh sama.");
    }

    const hasValidDetails = dataToSave.Details.some(
      (d: any) => d.KodeMAP && Number(d.JumlahPO) > 0,
    );
    if (!hasValidDetails) {
      throw new Error("Detail harus diisi (Kode MAP dan Jumlah PO > 0).");
    }

    // Pengecekan dateline per baris
    for (const d of dataToSave.Details) {
      if (d.KodeMAP && Number(d.JumlahPO) > 0 && !d.Dateline) {
        throw new Error(`Dateline untuk MAP ${d.KodeMAP} harus diisi.`);
      }
    }

    const res = await poInternalMapFormService.save(
      dataToSave,
      !isEditMode.value,
    );
    return res;
  },
  onSuccess: (res: any) => {
    toast.success("Data berhasil disimpan.");
    // Tangkap nomor PO yang baru saja disimpan
    savedNomor.value = res.data?.nomor || formData.value.Nomor;
    // Munculkan dialog konfirmasi cetak
    showPrintDialog.value = true;
  },
});

// ── LOGIKA DEFAULT GUDANG (Seperti Delphi `refreshdata`) ──
onMounted(async () => {
  if (isEditMode.value) {
    // INI YANG KURANG: Tarik data dari backend jika mode Edit
    await fetchData();
  } else {
    // Logika default cabang hanya berjalan jika mode Baru
    if (authStore.userCabang && authStore.userCabang !== "HO-") {
      formData.value.GudangAsal = authStore.userCabang;
      formData.value.GudangAsalNama = "GUDANG " + authStore.userCabang;
    } else {
      formData.value.GudangAsal = "P04";
      formData.value.GudangAsalNama = "JERON";
    }

    if (formData.value.GudangAsal === "P04") {
      formData.value.Tujuan = "P01";
      formData.value.TujuanNama = "PADOKAN";
    } else if (formData.value.GudangAsal === "P01") {
      formData.value.Tujuan = "P04";
      formData.value.TujuanNama = "JERON";
    }
  }
});

// ── STATE & LOGIKA LOOKUP MODAL ──
const showPabrikAsalModal = ref(false);
const showPabrikTujuanModal = ref(false);
const showMapModal = ref(false);
const activeRowIndex = ref(-1);

const setGudangAsal = (v: any) => {
  if (formData.value.Tujuan === v.Kode) {
    toast.warning("Gudang asal tidak boleh = Tujuan.");
    return;
  }
  formData.value.GudangAsal = v.Kode;
  formData.value.GudangAsalNama = v.Nama;
};

const setTujuan = (v: any) => {
  if (formData.value.GudangAsal === v.Kode) {
    toast.warning("Tujuan tidak boleh = gudang asal.");
    return;
  }
  formData.value.Tujuan = v.Kode;
  formData.value.TujuanNama = v.Nama;
};

// ── GRID DETAIL LOGIC ──
const addRow = () => formData.value.Details.push(createEmptyRow());

const removeRow = (idx: number) => {
  formData.value.Details.splice(idx, 1);
  if (formData.value.Details.length === 0) addRow();
};

const openMapLookup = (idx: number) => {
  if (!formData.value.GudangAsal) {
    toast.warning("Gudang Asal di isi dulu ya!");
    return;
  }
  if (!formData.value.Tujuan) {
    toast.warning("Tujuan di isi dulu ya!");
    return;
  }

  activeRowIndex.value = idx;
  showMapModal.value = true;
};

const checkImageExists = async (nomorMAP: string) => {
  if (!nomorMAP) return false;
  try {
    // Kita tembak ke port 8888 yang sudah kita setup sebelumnya
    const res = await fetch(
      `http://103.94.238.252:8888/file-gambar/${nomorMAP}.jpg`,
      { method: "HEAD" },
    );
    if (res.ok) return true;

    // Jika tidak ada, coba cek di folder mintaharga
    const resMh = await fetch(
      `http://103.94.238.252:8888/file-gambar/mintaharga/${nomorMAP}.jpg`,
      { method: "HEAD" },
    );
    return resMh.ok;
  } catch (e) {
    return false;
  }
};

// Dipanggil saat MAP dipilih dari Modal ATAU diketik manual onBlur
const processSelectedMap = async (mapKode: string, idx: number) => {
  if (!mapKode) return;

  // Validasi duplicate di grid
  const isDuplicate = formData.value.Details.some(
    (d: any, i: number) => d.KodeMAP === mapKode && i !== idx,
  );
  if (isDuplicate) {
    toast.warning(`Kode MAP ${mapKode} sudah diinput di baris lain.`);
    return;
  }

  try {
    const res = await poInternalMapFormService.validateMap(
      mapKode,
      formData.value.Nomor,
    );

    // Jika ada warning (misal: sudah pernah di-PO)
    if (res.data.warning) {
      if (!confirm(`${res.data.warning}`)) {
        formData.value.Details[idx].KodeMAP = "";
        return;
      }
    }

    const dataMAP = res.data.data;

    const hasImage = await checkImageExists(dataMAP.mspk_nomor);

    formData.value.Details[idx] = {
      ...formData.value.Details[idx],
      KodeMAP: dataMAP.mspk_nomor,
      NamaMAP: dataMAP.mspk_nama,
      Bahan: dataMAP.mspk_kain || "",
      Ukuran: dataMAP.mspk_ukuran || "",
      QtyMAP: Number(dataMAP.mspk_jumlah) || 0,
      JumlahPO: Number(dataMAP.mspk_jumlah) || 0,
      Gambar: hasImage, // Set true/false sesuai hasil
    };

    // Auto tambah baris baru jika ini baris terakhir
    if (idx === formData.value.Details.length - 1) {
      addRow();
    }
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal memvalidasi MAP.");
    formData.value.Details[idx].KodeMAP = "";
    formData.value.Details[idx].NamaMAP = "";
  }
};

const onMapModalSelected = (item: any) => {
  if (activeRowIndex.value >= 0) {
    processSelectedMap(item.Nomor, activeRowIndex.value);
  }
};

const formatAngka = (val: number | string) => {
  return new Intl.NumberFormat("id-ID").format(Number(val) || 0);
};

// Tambahkan dua method navigasi ini
const closePrintAndExit = () => {
  showPrintDialog.value = false;
  router.push("/garmen/po-internal-map"); // Kembali ke grid master
};

const confirmPrint = () => {
  showPrintDialog.value = false;
  // Buka tab print
  window.open(
    `/garmen/po-internal-map/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  // Arahkan tab saat ini kembali ke browse
  router.push("/garmen/po-internal-map");
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah PO Internal MAP' : 'Tambah PO Internal MAP'"
    menu-id="138"
    icon="mdi-cart-arrow-down"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="PO Internal MAP"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="showSaveDialog = true"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="f-row">
          <label class="f-lbl">Nomor PO</label>
          <input
            :value="formData.Nomor"
            readonly
            class="f-inp f-ro"
            style="width: 140px"
            :placeholder="!isEditMode ? '<-- Kosong= Baru' : ''"
          />
          <span v-if="!isEditMode" class="hint-new ml-1"
            >&lt;-- Kosong = Baru</span
          >
        </div>

        <div class="f-row">
          <label class="f-lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.Tanggal"
            class="f-date"
            style="width: 140px"
          />
        </div>

        <hr class="my-2" style="border: 0; border-top: 1px dashed #ccc" />

        <div class="f-row">
          <label class="f-lbl">Gudang Asal</label>
          <div class="inp-grp" style="width: 250px">
            <input
              v-model="formData.GudangAsal"
              readonly
              class="f-inp f-ro"
              style="width: 50px"
            />
            <input
              :value="formData.GudangAsalNama"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="btn-lkp"
              @click="showPabrikAsalModal = true"
            >
              🔍
            </button>
          </div>
        </div>

        <div class="f-row">
          <label class="f-lbl">Tujuan</label>
          <div class="inp-grp" style="width: 250px">
            <input
              v-model="formData.Tujuan"
              readonly
              class="f-inp f-ro"
              style="width: 50px"
            />
            <input
              :value="formData.TujuanNama"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
            <button
              type="button"
              class="btn-lkp"
              @click="showPabrikTujuanModal = true"
            >
              🔍
            </button>
          </div>
        </div>
      </div>
    </template>

    <template #right-column>
      <div
        class="desktop-form-section header-section"
        style="height: 100%; display: flex; flex-direction: column"
      >
        <div class="d-flex justify-space-between align-center mb-2">
          <div
            class="font-weight-bold text-primary text-uppercase"
            style="font-size: 11px"
          >
            Detail Item PO
          </div>
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-plus"
            @click="addRow"
            >Tambah Baris</v-btn
          >
        </div>

        <div
          class="table-responsive"
          style="
            flex: 1;
            overflow: auto;
            border: 1px solid #ccc;
            border-radius: 4px;
          "
        >
          <table class="form-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center">No.</th>
                <th style="width: 140px">MAP</th>
                <th style="width: 40px; text-align: center">Pict</th>
                <th style="min-width: 180px">Nama MAP</th>
                <th style="width: 140px">Bahan</th>
                <th style="width: 100px">Ukuran</th>
                <th style="width: 70px; text-align: right">Qty MAP</th>
                <th style="width: 80px; background: yellow">Jumlah PO</th>
                <th style="width: 110px; background: yellow">Dateline</th>
                <th style="min-width: 150px; background: yellow">Keterangan</th>
                <th style="width: 40px; text-align: center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in formData.Details" :key="idx">
                <td class="text-center">{{ Number(idx) + 1 }}</td>
                <td>
                  <div class="inp-grp" style="width: 100%">
                    <input
                      type="text"
                      v-model="row.KodeMAP"
                      class="f-inp"
                      style="flex: 1"
                      @blur="processSelectedMap(row.KodeMAP, Number(idx))"
                      @keyup.enter="
                        processSelectedMap(row.KodeMAP, Number(idx))
                      "
                    />
                    <button
                      type="button"
                      class="btn-lkp"
                      @click="openMapLookup(Number(idx))"
                    >
                      🔍
                    </button>
                  </div>
                </td>
                <td class="text-center">
                  <v-icon v-if="row.Gambar" size="14" color="success"
                    >mdi-check-circle</v-icon
                  >
                  <v-icon v-else size="14" color="grey-lighten-1"
                    >mdi-image-outline</v-icon
                  >
                </td>
                <td class="bg-grey-lighten-4">{{ row.NamaMAP }}</td>
                <td class="bg-grey-lighten-4">{{ row.Bahan }}</td>
                <td class="bg-grey-lighten-4 text-center">{{ row.Ukuran }}</td>
                <td class="bg-grey-lighten-4 text-right font-weight-bold">
                  {{ formatAngka(row.QtyMAP) }}
                </td>
                <td class="p-0">
                  <input
                    type="number"
                    v-model.number="row.JumlahPO"
                    class="f-inp-cell text-right"
                  />
                </td>
                <td class="p-0">
                  <input
                    type="date"
                    v-model="row.Dateline"
                    class="f-inp-cell"
                  />
                </td>
                <td class="p-0">
                  <input
                    type="text"
                    v-model="row.Keterangan"
                    class="f-inp-cell"
                    placeholder="..."
                  />
                </td>
                <td class="text-center">
                  <v-btn
                    icon="mdi-delete"
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="removeRow(Number(idx))"
                  ></v-btn>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseForm>

  <PabrikSearchModal
    v-model="showPabrikAsalModal"
    po-internal-only
    @selected="setGudangAsal"
  />
  <PabrikSearchModal
    v-model="showPabrikTujuanModal"
    po-internal-only
    @selected="setTujuan"
  />
  <MapSearchModal v-model="showMapModal" @selected="onMapModalSelected" />

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <v-icon start color="white">mdi-printer</v-icon>
        <span class="text-subtitle-1 font-weight-bold">Simpan Berhasil</span>
      </v-card-title>

      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-4 text-grey-darken-3">
          Data PO Internal MAP <strong>{{ savedNomor }}</strong> berhasil
          disimpan.<br /><br />
          Apakah Anda ingin langsung mencetak dokumen ini?
        </div>
      </v-card-text>

      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="closePrintAndExit"
          >Tidak, Tutup</v-btn
        >
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-printer"
          @click="confirmPrint"
          >Ya, Cetak</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Layout & Field Base ── */
.f-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 6px;
  min-height: 26px;
  font-size: 11px;
}
.f-lbl {
  width: 90px;
  flex-shrink: 0;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}
.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  outline: none;
  background: white;
  color: #212121;
  flex: 1;
  min-width: 0;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.f-date {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
}
.f-date:focus {
  border-color: #1565c0;
}

.hint-new {
  font-size: 10px;
  color: #d32f2f;
  font-style: italic;
}

/* ── Input Group (Kode + Lookup) ── */
.inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  background: white;
}
.inp-grp .f-inp {
  border: none;
  height: 24px;
  border-radius: 0;
}
.inp-grp .f-inp + .f-inp {
  border-left: 1px solid #e0e0e0;
}
.btn-lkp {
  width: 24px;
  background: #f5f5f5;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  font-size: 11px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-lkp:hover {
  background: #e0e0e0;
}

/* ── Table Grid Detail ── */
.form-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
}
.form-table thead th {
  background: #1565c0;
  color: white;
  padding: 6px 4px;
  font-weight: 600;
  border: 1px solid #0d47a1;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}
.form-table thead th[style*="background: yellow"] {
  background: #fff59d !important;
  color: #212121;
  border-color: #fbc02d;
}
.form-table tbody td {
  border: 1px solid #e0e0e0;
  padding: 4px;
  vertical-align: middle;
}
.form-table tbody td.p-0 {
  padding: 0 !important;
}
.f-inp-cell {
  width: 100%;
  height: 26px;
  border: none;
  outline: none;
  background: transparent;
  padding: 0 5px;
  font-size: 11px;
  font-family: inherit;
}
.f-inp-cell:focus {
  background: #e3f2fd;
}
</style>
