<script setup lang="ts">
import { ref, onMounted, computed, reactive } from "vue";
import { useRouter, useRoute } from "vue-router";
import api from "@/services/api";
import PageLayout from "@/components/PageLayout.vue";
import POLookupModal from "@/modal/PoExternalMmtLookupModal.vue";
import { format } from "date-fns";
import { useToast } from "vue-toastification";

// --- Interfaces ---
interface FormDataState {
  nomor: string;
  tanggal: string;
  nomorPo: string;
  dateline: string;
  nomorSpk: string;
  namaSpk: string;
  divisi: string;
  joKode: string;
  joNama: string;
  bahan: string;
  ukuran: string;
  panjang: number;
  lebar: number;
  jumlahSpk: number;
  supKode: string;
  supNama: string;
  supAlamat: string;
  supKota: string;
  cabang: string;
  finishing: string;
  keteranganHeader: string; // Memo catatan asli dari PO
  keteranganBpb: string; // Catatan baru untuk penerimaan barang ini
  jmlPo: number;
  sudahTerima: number;
  terimaBaru: number;
  sudahFinishing: number;
  terimaFinishing: number;
  gpAsalKode: string;
  gpAsalNama: string;
  gpTujuanKode: string;
  gpTujuanNama: string;
  bahanSendiri: boolean;
}

// --- Setup & State ---
const router = useRouter();
const route = useRoute();
const toast = useToast();

const API_URL = "/mmt/po-external-mmt";
const API_PENERIMAAN_URL = "/mmt/penerimaan-po-ext-mmt";

const isEditMode = ref(!!route.params.nomor);
const isSaving = ref(false);
const isPoModalVisible = ref(false);
const currentUserKode = ref("");

const getCurrentUser = () => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      try {
        const item = localStorage.getItem(key);
        const parsed = JSON.parse(item || "");
        if (parsed && parsed.kdUser) {
          currentUserKode.value = parsed.kdUser;
          return;
        }
      } catch (e) {
        /* bukan JSON */
      }
    }
  }
  currentUserKode.value = localStorage.getItem("kdUser") || "";
};

const formData = reactive<FormDataState>({
  nomor: "AUTO",
  tanggal: format(new Date(), "yyyy-MM-dd"),
  nomorPo: "",
  dateline: "",
  nomorSpk: "",
  namaSpk: "",
  divisi: "",
  joKode: "",
  joNama: "",
  bahan: "",
  ukuran: "",
  panjang: 0,
  lebar: 0,
  jumlahSpk: 0,
  supKode: "",
  supNama: "",
  supAlamat: "",
  supKota: "",
  cabang: "",
  finishing: "",
  keteranganHeader: "",
  keteranganBpb: "",
  jmlPo: 0,
  sudahTerima: 0,
  terimaBaru: 0,
  sudahFinishing: 0,
  terimaFinishing: 0,
  gpAsalKode: "GP0033",
  gpAsalNama: "GUDANG MITRA",
  gpTujuanKode: "",
  gpTujuanNama: "",
  bahanSendiri: false,
});

// --- Computed ---
const sisaKurang = computed(() => {
  const totalPo = Number(formData.jmlPo) || 0;
  const sudah = Number(formData.sudahTerima) || 0;
  const baru = Number(formData.terimaBaru) || 0;
  return (totalPo - (sudah + baru)).toFixed(2);
});

const sisaFinishing = computed(() => {
  const totalPo = Number(formData.jmlPo) || 0;
  const sudah = Number(formData.sudahFinishing) || 0;
  const baru = Number(formData.terimaFinishing) || 0;
  return (totalPo - (sudah + baru)).toFixed(2);
});

const isFormValid = computed(() => {
  return !!formData.nomorPo && Number(formData.terimaBaru) > 0;
});

// --- Methods ---
const handlePoSelect = async (po: any) => {
  isSaving.value = true;
  try {
    const response = await api.get(`/mmt/po-external-mmt/detail/${po.Nomor}`);
    const d = response.data.data;

    if (!d) {
      toast.error("Data Detail PO tidak ditemukan dalam respon server");
      return;
    }

    // Mapping Data ke Form
    formData.nomorPo = d.poe_nomor;
    formData.dateline = d.poe_dateline;
    formData.nomorSpk = d.poe_spk_nomor;
    formData.namaSpk = d.spk_nama;
    formData.divisi = d.nama_divisi;
    formData.joKode = d.spk_jo_kode;
    formData.joNama = d.jo_nama;
    formData.bahan = d.spk_kain;
    formData.ukuran = d.spk_ukuran;
    formData.panjang = d.spk_panjang;
    formData.lebar = d.spk_lebar;
    formData.jumlahSpk = d.spk_jumlah;

    // 🌟 MAPPING SUPPLIER (Menampilkan Kode & Nama)
    formData.supKode = d.poe_sup;
    formData.supNama = d.Sup_nama;
    formData.supAlamat = d.Sup_alamat;
    formData.supKota = d.Sup_kota;

    formData.cabang = d.poe_cab;
    formData.finishing = d.poe_finishing;
    formData.keteranganHeader = d.poe_ket; // Keterangan asli dari PO
    formData.jmlPo = d.poe_jumlah;
    formData.bahanSendiri = d.poe_bahansendiri === "Y";
    formData.sudahTerima = d.totalTerima || 0;
    formData.sudahFinishing = d.totalFinishing || 0;

    // Logika penentuan kode gudang belakang layar (Tetap dipertahankan untuk payload simpan)
    if (formData.cabang === "P02") {
      formData.gpTujuanKode = "GP020";
      formData.gpTujuanNama = "06.GD KOLI P1";
    } else {
      formData.gpTujuanKode = "GP013";
      formData.gpTujuanNama = "06.GD KOLI P4";
    }

    toast.success(`Berhasil memuat data PO ${d.poe_nomor}`);
  } catch (error: any) {
    console.error("Error Detail PO:", error);
    toast.error("Gagal memuat detail PO.");
  } finally {
    isSaving.value = false;
    isPoModalVisible.value = false;
  }
};

const loaddataall = async (nomor: string) => {
  isSaving.value = true;
  try {
    // 🌟 PERBAIKAN: Gunakan API_PENERIMAAN_URL, bukan API_URL!
    const response = await api.get(`${API_PENERIMAAN_URL}/${nomor}`);

    // Ambil object data dari backend
    const d = response.data.data || response.data;

    if (!d) {
      toast.error("Data Penerimaan (BPB) tidak ditemukan.");
      return;
    }

    // Mapping state dari response database tbpbpoexternal_hdr
    formData.nomor = d.bpe_nomor;
    formData.tanggal = format(new Date(d.bpe_tanggal), "yyyy-MM-dd");
    formData.nomorPo = d.bpe_po;
    formData.terimaBaru = Number(d.bpe_jumlah) || 0;
    formData.terimaFinishing = Number(d.bpe_finishing) || 0;
    formData.keteranganBpb = d.bpe_ket || "";

    // 🌟 Sinkronisasi Otomatis: Tarik data spesifikasi PO referensinya
    if (formData.nomorPo) {
      await handlePoSelect({ Nomor: formData.nomorPo });
    }
  } catch (error) {
    console.error("Error Load BPB:", error);
    toast.error("Gagal memuat data riwayat BPB.");
  } finally {
    isSaving.value = false;
  }
};

const saveForm = async (saveAndNew: boolean) => {
  if (!isFormValid.value) return;
  if (Number(formData.terimaFinishing) > Number(formData.terimaBaru)) {
    toast.error(
      `Finishing baru (${formData.terimaFinishing}) tidak boleh melebihi terima baru (${formData.terimaBaru}).`,
    );
    return;
  }
  isSaving.value = true;
  try {
    const payload = {
      Nomor: isEditMode.value ? formData.nomor : null,
      Tanggal: formData.tanggal,
      NomorPO: formData.nomorPo,
      NomorSPK: formData.nomorSpk,
      Cabang: formData.cabang,
      Supplier: formData.supKode,
      GpAsal: formData.gpAsalKode,
      GpTujuan: formData.gpTujuanKode,
      Keterangan: formData.keteranganBpb,
      JumlahTerima: formData.terimaBaru,
      JumlahFinishing: formData.terimaFinishing,
    };

    if (isEditMode.value) {
      await api.put(`${API_PENERIMAAN_URL}/${formData.nomor}`, payload);
    } else {
      await api.post(API_PENERIMAAN_URL, payload);
    }

    toast.success("Data BPB berhasil disimpan!");
    if (saveAndNew) {
      window.location.reload();
    } else {
      router.back();
    }
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal menyimpan data.");
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  getCurrentUser();
  if (isEditMode.value && route.params.nomor)
    loaddataall(route.params.nomor as string);
});
</script>

<template>
  <PageLayout title="Penerimaan PO External (BPB)" icon="mdi-truck-delivery">
    <template #header-actions>
      <v-btn
        size="x-small"
        color="primary"
        @click="saveForm(false)"
        :loading="isSaving"
        :disabled="!isFormValid"
      >
        <v-icon start>mdi-check-circle</v-icon> Simpan
      </v-btn>

      <v-btn
        size="x-small"
        color="success"
        class="ml-1"
        @click="saveForm(true)"
        :disabled="isSaving || !isFormValid"
      >
        <v-icon start>mdi-content-save-all</v-icon> Simpan & Baru
      </v-btn>

      <v-btn size="x-small" @click="router.back()" class="ml-1">
        <v-icon start>mdi-close</v-icon> Tutup
      </v-btn>
    </template>

    <div class="form-grid-container">
      <div class="left-column">
        <v-card flat border>
          <v-card-title class="text-subtitle-1 py-2 bg-grey-lighten-4"
            >Informasi Transaksi</v-card-title
          >
          <v-divider />
          <v-card-text>
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  label="Nomor BPB"
                  v-model="formData.nomor"
                  readonly
                  variant="filled"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  label="Tanggal Terima"
                  v-model="formData.tanggal"
                  type="date"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  label="Nomor PO Referensi"
                  v-model="formData.nomorPo"
                  @click="!isEditMode && (isPoModalVisible = true)"
                  :append-inner-icon="isEditMode ? '' : 'mdi-magnify'"
                  readonly
                  density="compact"
                  variant="outlined"
                  hide-details
                  color="primary"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  label="Nomor SPK"
                  v-model="formData.nomorSpk"
                  readonly
                  bg-color="grey-lighten-4"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  label="Nama SPK"
                  v-model="formData.namaSpk"
                  readonly
                  bg-color="grey-lighten-4"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card flat border class="mt-4">
          <v-card-title class="text-subtitle-1 py-2 bg-grey-lighten-4"
            >Supplier & Catatan PO</v-card-title
          >
          <v-divider />
          <v-card-text>
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  label="Gudang Asal"
                  v-model="formData.gpAsalNama"
                  readonly
                  density="compact"
                  variant="filled"
                  hide-details
                />
              </v-col>

              <v-col cols="4">
                <v-text-field
                  label="Kode Sup"
                  v-model="formData.supKode"
                  readonly
                  density="compact"
                  variant="filled"
                  hide-details
                />
              </v-col>
              <v-col cols="8">
                <v-text-field
                  label="Nama Supplier"
                  v-model="formData.supNama"
                  readonly
                  density="compact"
                  variant="filled"
                  hide-details
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  label="Keterangan Header PO (Memo)"
                  v-model="formData.keteranganHeader"
                  readonly
                  variant="filled"
                  density="compact"
                  rows="2"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </div>

      <div class="right-column">
        <v-row dense>
          <v-col cols="12">
            <v-card flat border>
              <v-card-title class="text-subtitle-2 bg-blue-darken-3 text-white"
                >Spesifikasi Bahan dari PO</v-card-title
              >
              <v-card-text class="pt-4">
                <v-row dense>
                  <v-col cols="4">
                    <v-text-field
                      label="Bahan"
                      v-model="formData.bahan"
                      readonly
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="4">
                    <v-text-field
                      label="Ukuran"
                      v-model="formData.ukuran"
                      readonly
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="2">
                    <v-text-field
                      label="Panjang"
                      v-model="formData.panjang"
                      readonly
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="2">
                    <v-text-field
                      label="Lebar"
                      v-model="formData.lebar"
                      readonly
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" class="mt-2">
            <v-card flat border color="blue-lighten-5">
              <v-card-text>
                <v-row align="center">
                  <v-col cols="3">
                    <div class="text-caption font-weight-bold">
                      TOTAL QTY PO
                    </div>
                    <div class="text-h6">{{ formData.jmlPo }}</div>
                  </v-col>
                  <v-col cols="3">
                    <div class="text-caption font-weight-bold">
                      SUDAH TERIMA
                    </div>
                    <div class="text-h6 text-orange-darken-3">
                      {{ formData.sudahTerima }}
                    </div>
                  </v-col>
                  <v-col cols="3">
                    <v-text-field
                      label="TERIMA BARU"
                      v-model.number="formData.terimaBaru"
                      type="number"
                      variant="outlined"
                      bg-color="white"
                      density="compact"
                      hide-details
                      class="text-right-input font-weight-black"
                    />
                  </v-col>
                  <v-col cols="3">
                    <div class="text-caption font-weight-bold">SISA KURANG</div>
                    <div
                      class="text-h6"
                      :class="
                        Number(sisaKurang) < 0 ? 'text-red' : 'text-green'
                      "
                    >
                      {{ sisaKurang }}
                    </div>
                  </v-col>
                </v-row>
                <v-divider class="my-2" />
                <v-row align="center">
                  <v-col cols="3">
                    <div class="text-caption font-weight-bold">
                      SUDAH FINISHING
                    </div>
                    <div class="text-h6 text-teal-darken-2">
                      {{ formData.sudahFinishing }}
                    </div>
                  </v-col>
                  <v-col cols="3">
                    <v-text-field
                      label="FINISHING BARU"
                      v-model.number="formData.terimaFinishing"
                      type="number"
                      variant="outlined"
                      bg-color="white"
                      density="compact"
                      hide-details
                      class="text-right-input font-weight-black"
                    />
                  </v-col>
                  <v-col cols="3">
                    <div class="text-caption font-weight-bold">
                      SISA FINISHING
                    </div>
                    <div
                      class="text-h6"
                      :class="
                        Number(sisaFinishing) < 0 ? 'text-red' : 'text-green'
                      "
                    >
                      {{ sisaFinishing }}
                    </div>
                  </v-col>
                  <v-col cols="3" class="text-caption text-grey-darken-1">
                    Misal PO 1000, yang selesai finishing 700 — input 700 di
                    FINISHING BARU.
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" class="mt-2">
            <v-textarea
              label="Keterangan / Catatan Penerimaan"
              v-model="formData.keteranganBpb"
              variant="outlined"
              density="compact"
              rows="3"
            />
          </v-col>
        </v-row>
      </div>
    </div>

    <POLookupModal
      :isVisible="isPoModalVisible"
      @close="isPoModalVisible = false"
      @select="handlePoSelect"
    />
  </PageLayout>
</template>

<style scoped>
.form-grid-container {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 20px;
  padding: 15px;
}
.text-right-input :deep(input) {
  text-align: right !important;
  font-size: 1.2rem !important;
}
.v-card-title {
  font-size: 0.9rem !important;
  font-weight: bold;
}
</style>
