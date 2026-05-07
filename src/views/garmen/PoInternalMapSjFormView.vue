<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import api from "@/services/api";
import { IconTruckDelivery, IconCheck, IconX } from "@tabler/icons-vue";

// Modals
import PabrikSearchModal from "@/components/lookups/PabrikSearchModal.vue";
import PoSearchModal from "@/components/lookups/PoSearchModal.vue";

type RouteParams = {
  nomor?: string;
};

const toast = useToast();
const router = useRouter();
const authStore = useAuthStore();

const showPrintDialog = ref(false);
const savedNomor = ref("");

const getLocalDate = () => new Date().toISOString().substring(0, 10);

const createEmptyRow = () => ({
  NomorPO: "",
  KodeMAP: "",
  NamaMAP: "",
  Bahan: "",
  Ukuran: "",
  QtyMAP: 0, // Kolom Baru
  JumlahPO: 0, // Kolom Baru
  JumlahSJ: 0,
  Koli: 0,
  SudahSJ: 0,
  Kurang: 0,
  HasBast: false,
  Keterangan: "",
});

const initialData = {
  Nomor: "",
  Tanggal: getLocalDate(),
  GudangAsal: "",
  GudangAsalNama: "",
  Tujuan: "",
  TujuanNama: "",
  Details: [createEmptyRow()],
  StatusEdit: "",
};

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
} = useForm<typeof initialData, RouteParams>({
  menuId: "139",
  initialData,
  fetchApi: async (): Promise<typeof initialData> => {
    const res: { data: { data: any } } = await api.get(
      `/garmen/po-internal-map/surat-jalan/form/${encodeURIComponent(params.nomor as string)}`,
    );

    const d: any = res.data.data;
    return {
      Nomor: d.header.poisj_nomor,
      Tanggal: d.header.poisj_tanggal.substring(0, 10),
      GudangAsal: d.header.poisj_cab,
      GudangAsalNama: d.header.namacab,
      Tujuan: d.header.poisj_tujuan,
      TujuanNama: d.header.tujuan,
      Details: d.detail.map((row: any) => ({
        NomorPO: row.poisjd_po,
        KodeMAP: row.poisjd_kode,
        NamaMAP: row.mspk_nama,
        Bahan: row.Mspk_kain,
        Ukuran: row.Mspk_ukuran,
        QtyMAP: row.mspk_jumlah,
        QtyPO: row.qty_po,
        JumlahSJ: row.poisjd_jumlah,
        Koli: row.poisjd_koli,
        SudahSJ: row.sudah_sj,
        Kurang: row.kurang,
        HasBast: row.has_bast,
        Keterangan: row.poisjd_ket,
      })),
      StatusEdit: d.header.StatusEdit, // Dari PIN 5
    };
  },
  submitApi: async (dataToSave) => {
    // Validasi BAST
    const missingBast = dataToSave.Details.find(
      (d: any) => d.KodeMAP && !d.HasBast,
    );
    if (missingBast)
      throw new Error(
        `MAP ${missingBast.KodeMAP} belum memiliki BAST. Simpan dibatalkan.`,
      );

    return await api.post(
      "/garmen/po-internal-map/surat-jalan/form",
      dataToSave,
    );
  },
  onSuccess: (res: any) => {
    toast.success("Data berhasil disimpan.");
    savedNomor.value = res.data?.nomor || formData.value.Nomor;
    showPrintDialog.value = true; // Munculkan dialog konfirmasi
  },
});

// ── LOGIKA DEFAULT (Seperti Delphi refreshdata) ──
onMounted(() => {
  if (!isEditMode.value) {
    formData.value.GudangAsal =
      authStore.userCabang !== "HO-" ? authStore.userCabang : "P04";
    formData.value.GudangAsalNama =
      authStore.userCabang !== "HO-"
        ? "GUDANG " + authStore.userCabang
        : "JERON";
    // Set default tujuan (Cross Jeron-Padokan)
    if (formData.value.GudangAsal === "P04") {
      formData.value.Tujuan = "P01";
      formData.value.TujuanNama = "PADOKAN";
    } else if (formData.value.GudangAsal === "P01") {
      formData.value.Tujuan = "P04";
      formData.value.TujuanNama = "JERON";
    }
  }
});

// ── MODAL STATES ──
const showPabrikAsalModal = ref(false);
const showPabrikTujuanModal = ref(false);
const showPoModal = ref(false);
const activeRowIdx = ref(-1);

// ── SELECTION HANDLERS ──
const setGudangAsal = (v: any) => {
  formData.value.GudangAsal = v.Kode;
  formData.value.GudangAsalNama = v.Nama;
};

const setTujuan = (v: any) => {
  formData.value.Tujuan = v.Kode;
  formData.value.TujuanNama = v.Nama;
};

const loadPoToGrid = async (nomorPo: string, idx: number) => {
  try {
    const res = await api.get(
      `/garmen/po-internal-map/surat-jalan/form/load-po?nomorPo=${nomorPo}`,
    );
    const items = res.data.data;
    formData.value.Details.splice(idx, 1);
    items.forEach((item: any) => {
      formData.value.Details.push({
        NomorPO: item.Nomor_PO,
        KodeMAP: item.Kode_MAP,
        NamaMAP: item.Nama_MAP,
        Bahan: item.Bahan,
        Ukuran: item.Ukuran,
        QtyMAP: item.Qty_MAP, // Set data baru
        JumlahPO: item.Qty_PO,
        JumlahSJ: item.Sisa_PO,
        Koli: 0,
        SudahSJ: item.Sudah_SJ,
        Kurang: item.Sisa_PO,
        HasBast: item.Has_Bast,
        Keterangan: "",
      });
    });
    formData.value.Details.push(createEmptyRow());
  } catch (e: any) {
    toast.error("Gagal memuat item PO.");
  }
};

const onPoSelected = (item: any) => {
  if (activeRowIdx.value >= 0) loadPoToGrid(item.Nomor, activeRowIdx.value);
};

const handlePrint = () => {
  window.open(
    `/garmen/po-internal-map/surat-jalan/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  router.push("/garmen/po-internal-map/surat-jalan");
};
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? 'Ubah Surat Jalan PO Internal'
        : 'Tambah Surat Jalan PO Internal'
    "
    menu-id="139"
    :icon="IconTruckDelivery"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="f-row">
          <label class="f-lbl">Nomor SJ</label>
          <input
            :value="formData.Nomor"
            readonly
            class="f-inp f-ro"
            style="width: 140px"
            placeholder="Baru= Otomatis"
          />
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
              v-model="formData.GudangAsalNama"
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
              v-model="formData.TujuanNama"
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
        <div
          class="table-responsive"
          style="flex: 1; overflow: auto; border: 1px solid #ccc"
        >
          <table class="form-table">
            <thead>
              <tr>
                <th style="width: 30px">No</th>
                <th style="width: 130px">Nomor PO</th>
                <th style="width: 130px">MAP</th>
                <th style="width: 40px">BAST</th>
                <th>Nama MAP</th>
                <th style="width: 100px">Bahan</th>
                <th style="width: 60px">Ukuran</th>
                <th style="width: 60px">Qty MAP</th>
                <th style="width: 60px">Jml PO</th>
                <th style="width: 70px; background: yellow">Jml SJ</th>
                <th style="width: 50px; background: yellow">Koli</th>
                <th style="width: 60px">Sudah</th>
                <th style="width: 60px">Kurang</th>
                <th style="width: 150px; background: yellow">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in formData.Details" :key="idx">
                <td class="text-center">{{ idx + 1 }}</td>
                <td>
                  <div class="inp-grp">
                    <input
                      v-model="row.NomorPO"
                      class="f-inp"
                      @keyup.enter="loadPoToGrid(row.NomorPO, idx)"
                    />
                    <button
                      type="button"
                      class="btn-lkp"
                      @click="
                        activeRowIdx = idx;
                        showPoModal = true;
                      "
                    >
                      🔍
                    </button>
                  </div>
                </td>
                <td class="bg-grey-lighten-4 text-center">{{ row.KodeMAP }}</td>
                <td class="text-center">
                  <IconCheck v-if="row.HasBast" :size="16" color="green" />
                  <IconX v-else :size="16" color="red" />
                </td>
                <td class="bg-grey-lighten-4">{{ row.NamaMAP }}</td>
                <td class="bg-grey-lighten-4">{{ row.Bahan }}</td>
                <td class="bg-grey-lighten-4 text-center">{{ row.Ukuran }}</td>
                <td class="bg-grey-lighten-4 text-right">{{ row.QtyMAP }}</td>
                <td class="bg-grey-lighten-4 text-right font-weight-bold">
                  {{ row.JumlahPO }}
                </td>
                <td class="p-0">
                  <input
                    type="number"
                    v-model.number="row.JumlahSJ"
                    class="f-inp-cell text-right"
                  />
                </td>
                <td class="p-0">
                  <input
                    type="number"
                    v-model.number="row.Koli"
                    class="f-inp-cell text-right"
                  />
                </td>
                <td class="bg-grey-lighten-4 text-right">{{ row.SudahSJ }}</td>
                <td
                  class="bg-grey-lighten-4 text-right font-weight-bold text-error"
                >
                  {{ row.Kurang }}
                </td>
                <td class="p-0">
                  <input v-model="row.Keterangan" class="f-inp-cell" />
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
  <PoSearchModal
    v-model="showPoModal"
    :cabang-tujuan="formData.GudangAsal"
    @selected="onPoSelected"
  />

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3"
        >Simpan Berhasil</v-card-title
      >
      <v-card-text class="pa-4 text-center">
        SJ <b>{{ savedNomor }}</b> tersimpan.<br />Cetak dokumen ini sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn
          variant="text"
          color="error"
          @click="router.push('/garmen/po-internal-map/surat-jalan')"
          >Tidak</v-btn
        >
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="elevated" @click="handlePrint"
          >Ya, Cetak</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.f-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 6px;
  font-size: 11px;
}
.f-lbl {
  width: 80px;
  font-weight: 600;
}
.f-inp {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  flex: 1;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #555 !important;
  border-color: #ddd;
}
.f-date {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 11px;
  padding: 0 4px;
}
.inp-grp {
  display: flex;
  border: 1px solid #ccc;
  border-radius: 3px;
  height: 26px;
  overflow: hidden;
  background: white;
}
.inp-grp .f-inp {
  border: none;
}
.btn-lkp {
  width: 24px;
  background: #eee;
  border-left: 1px solid #ccc;
  cursor: pointer;
  font-size: 11px;
}
.form-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.form-table th {
  background: #1565c0;
  color: white;
  padding: 5px;
  border: 1px solid #0d47a1;
  position: sticky;
  top: 0;
}
.form-table td {
  border: 1px solid #ddd;
  padding: 3px;
}
.f-inp-cell {
  width: 100%;
  border: none;
  height: 24px;
  outline: none;
  padding: 0 4px;
  font-size: 10px;
}
.f-inp-cell:focus {
  background: #fffde7;
}
</style>
