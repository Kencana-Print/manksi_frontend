<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import { useRouter } from "vue-router";
import type { VForm } from "vuetify/components";
import BaseForm from "@/components/BaseForm.vue";
import SpkProduksiSearchModal from "@/components/lookups/SpkProduksiSearchModal.vue";
import BagianProduksiSearchModal from "@/components/lookups/BagianProduksiSearchModal.vue";
import KaryawanSearchModal from "@/components/lookups/KaryawanSearchModal.vue";
import { IconAlertCircle } from "@tabler/icons-vue";

interface BapData {
  Nomor: string;
  Tanggal: string;
  Cab: string;
  Tipe: string;
  BagKode: string;
  BagNama: string;
  Masalah: string;
  SumberMasalah: string;
  Solusi: string;
  Pertanggungjawaban: string;
  SPK: string;
  SpkNama: string;
  Jumlah: number;
  Harga: number;
  Approve: string | boolean;
  StatusEdit: string;
  UrutPin5: number;
  Kategori: string[];
  Karyawan: { nik: string; nama: string }[];
}

interface SaveResponse {
  data: {
    nomor: string;
  };
}

const toast = useToast();
const router = useRouter();
const vFormRef = ref<VForm | null>(null);

const cabangOptions = ref<string[]>([]);
const hasAccKorAccess = ref(true);
const showSpkModal = ref(false);
const showBagianModal = ref(false);
const statusPengajuan = ref("");

const initialBapData = {
  Nomor: "",
  Tanggal: new Date().toISOString().substr(0, 10),
  Cab: "HO-",
  Tipe: "BERITA ACARA",
  BagKode: "",
  BagNama: "",
  Masalah: "",
  SumberMasalah: "",
  Solusi: "",
  Pertanggungjawaban: "",
  SPK: "",
  SpkNama: "",
  Jumlah: 0,
  Harga: 0,
  Approve: false,
  StatusEdit: "",
  UrutPin5: 0,
  Kategori: [] as string[],
  Karyawan: [] as { nik: string; nama: string }[],
};

const KATEGORI_OPTIONS = [
  "Manusia",
  "Mesin",
  "Metode",
  "Material",
  "Pengukuran",
  "Lingkungan",
];

const {
  isEditMode,
  isLoading,
  isSaving,
  formData,
  fetchData,
  executeSave,
  params,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  executeCancel,
  executeClose,
} = useForm({
  menuId: "142",
  initialData: initialBapData,
  fetchApi: async (): Promise<BapData> => {
    const res = await api.get<{ data: BapData }>(
      `/master/bap-produksi-form/${params.nomor}`,
    );

    const ed = res.data.data;

    statusPengajuan.value = ed.StatusEdit;

    return {
      ...ed,
      Approve: !!ed.Approve,
    };
  },
  submitApi: async (dataToSave) => {
    await api.post("/master/bap-produksi-form/save", {
      isNewMode: !isEditMode.value,
      data: dataToSave,
    });
    toast.success("BAP berhasil disimpan.");
  },
  onSuccess: (response) => {
    const res = response as SaveResponse;
    const nomorTerupdate = res.data.nomor || formData.value.Nomor;
    if (confirm("Data berhasil disimpan. Ingin Cetak?")) {
      const url = router.resolve({
        name: "BapProduksiPrint",
        params: { nomor: nomorTerupdate },
      }).href;
      window.open(url, "_blank");
    }
  },
  onSuccessRoute: "/daftar/berita-acara",
});

const loadLookup = async () => {
  try {
    const res = await api.get("/lookups/cabang-pabrik");
    cabangOptions.value = res.data.data.map((c: any) => c.Kode);
    if (
      cabangOptions.value.length > 0 &&
      !isEditMode.value &&
      !formData.value.Cab
    ) {
      formData.value.Cab = cabangOptions.value[0];
    }
  } catch (e) {
    console.error("Gagal load cabang");
  }
};

onMounted(async () => {
  await loadLookup();
  if (isEditMode.value) await fetchData();
});

const totalHarga = computed(
  () =>
    (Number(formData.value.Jumlah) || 0) * (Number(formData.value.Harga) || 0),
);

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("id-ID").format(val);

// Modal karyawan
const showKaryawanModal = ref(false);

const addKaryawan = (item: any) => {
  const exists = formData.value.Karyawan.find((k) => k.nik === item.Nik);
  if (exists) return toast.warning("Karyawan sudah ditambahkan.");
  formData.value.Karyawan.push({ nik: item.Nik, nama: item.Nama });
};

const removeKaryawan = (idx: number) => {
  formData.value.Karyawan.splice(idx, 1);
};

const openBagianModal = () => {
  if (!formData.value.Cab) {
    toast.warning("Pilih cabang terlebih dahulu!");
    return;
  }
  showBagianModal.value = true;
};

const handleBagianSelected = (item: any) => {
  formData.value.BagKode = item.Kode;
  formData.value.BagNama = item.Nama;
};

const handleSpkSelected = async (item: any) => {
  try {
    // BUG FIX UTAMA: Gunakan item.Nomor, bukan item.Kode!
    const spkNo = item.Nomor;

    if (!spkNo) {
      toast.error("Nomor SPK tidak valid.");
      return;
    }

    const res = await api.get(`/master/bap-produksi-form/spk/${spkNo}`);
    const data = res.data.data;

    formData.value.SPK = data.Nomor;
    formData.value.SpkNama = data.Nama;
    formData.value.Jumlah = Number(data.Jumlah) || 0;
    formData.value.Harga = Number(data.Harga) || 0;
  } catch (e) {
    toast.error("Gagal mengambil detail perhitungan SPK.");
  }
};

const isFormDisabled = computed(
  () =>
    isEditMode.value &&
    ["WAIT", "TOLAK", "MINTA"].includes(statusPengajuan.value),
);

const handlePreSave = async () => {
  const { valid } = await vFormRef.value!.validate();
  if (!valid) return;
  if (isFormDisabled.value) {
    toast.warning("Belum bisa menyimpan. Status: " + statusPengajuan.value);
    return;
  }
  executeSave();
};
</script>

<template>
  <BaseForm
    title="Berita Acara dan Komplain Produksi"
    menu-id="142"
    :icon="IconAlertCircle"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="BAP Produksi"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="handlePreSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #right-column>
      <div class="bap-scroll-wrap">
        <div v-if="isEditMode && statusPengajuan" class="bap-alert-wrap">
          <div v-if="statusPengajuan === 'WAIT'" class="bap-alert info">
            ℹ Menunggu ACC Perubahan Data dari Pusat.
          </div>
          <div v-if="statusPengajuan === 'ACC'" class="bap-alert success">
            ✔ Pengajuan ACC. Silakan lakukan perubahan dan simpan.
          </div>
          <div v-if="statusPengajuan === 'TOLAK'" class="bap-alert error">
            ✖ Pengajuan Perubahan Ditolak.
          </div>
          <div v-if="statusPengajuan === 'MINTA'" class="bap-alert warning">
            ⚠ Transaksi sudah ditutup. Ajukan perubahan data.
          </div>
        </div>

        <v-form ref="vFormRef" :disabled="isFormDisabled">
          <div class="bap-section">
            <!-- ── TOP: Header kiri + Approve+Karyawan kanan ── -->
            <div class="bap-top">
              <!-- KIRI: field header -->
              <div class="bap-fields">
                <div class="f-row">
                  <label class="f-lbl">Nomor</label>
                  <input
                    :value="formData.Nomor"
                    readonly
                    class="f-inp ro"
                    style="width: 180px"
                    placeholder="← Kosong=Baru"
                  />
                </div>
                <div class="f-row">
                  <label class="f-lbl">Tanggal</label>
                  <input
                    type="date"
                    v-model="formData.Tanggal"
                    class="f-inp idate"
                    style="width: 150px"
                  />
                </div>
                <div class="f-row">
                  <label class="f-lbl">Cabang</label>
                  <select
                    v-model="formData.Cab"
                    class="f-inp isel"
                    style="width: 120px"
                  >
                    <option v-for="c in cabangOptions" :key="c" :value="c">
                      {{ c }}
                    </option>
                  </select>
                </div>
                <div class="f-row">
                  <label class="f-lbl">Tipe</label>
                  <label class="radio-label">
                    <input
                      type="radio"
                      v-model="formData.Tipe"
                      value="BERITA ACARA"
                    />
                    Berita Acara
                  </label>
                  <label class="radio-label ml-2">
                    <input
                      type="radio"
                      v-model="formData.Tipe"
                      value="KOMPLAIN PRODUKSI"
                    />
                    Komplain Produksi
                  </label>
                </div>
                <div class="f-row">
                  <label class="f-lbl">Bagian</label>
                  <input
                    :value="formData.BagKode"
                    readonly
                    class="f-inp ro cur-ptr"
                    style="width: 110px"
                    @click="openBagianModal"
                    placeholder="Klik..."
                  />
                  <input
                    :value="formData.BagNama"
                    readonly
                    class="f-inp ro ml-1"
                    style="flex: 1"
                  />
                </div>
                <div class="f-row">
                  <label class="f-lbl">Kategori</label>
                  <div class="f-multi-check">
                    <label
                      v-for="kat in KATEGORI_OPTIONS"
                      :key="kat"
                      class="kat-chip"
                      :class="{ active: formData.Kategori.includes(kat) }"
                    >
                      <input
                        type="checkbox"
                        :value="kat"
                        v-model="formData.Kategori"
                        style="display: none"
                      />
                      {{ kat }}
                    </label>
                  </div>
                </div>
              </div>

              <!-- KANAN: Approve + Karyawan -->
              <div class="bap-right-panel">
                <!-- Approve -->
                <label
                  class="approve-label"
                  :class="{ active: formData.Approve }"
                >
                  <input
                    type="checkbox"
                    v-model="formData.Approve"
                    :disabled="!hasAccKorAccess"
                  />
                  <span>APPROVE</span>
                </label>

                <!-- Karyawan Terlibat -->
                <div class="kar-panel">
                  <div class="kar-panel-header">
                    <span class="kar-panel-title">Karyawan Terlibat</span>
                    <button
                      type="button"
                      class="btn-add-kar"
                      @click="showKaryawanModal = true"
                    >
                      + Tambah
                    </button>
                  </div>
                  <div v-if="formData.Karyawan.length === 0" class="kar-empty">
                    Belum ada.
                  </div>
                  <div v-else class="kar-list">
                    <div
                      v-for="(kar, idx) in formData.Karyawan"
                      :key="kar.nik"
                      class="kar-item"
                    >
                      <div class="kar-nik">{{ kar.nik }}</div>
                      <div class="kar-nama">{{ kar.nama }}</div>
                      <button
                        type="button"
                        class="btn-del-kar"
                        @click="removeKaryawan(idx)"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="bap-divider" />

            <!-- ── TEXTAREA 2x2 ── -->
            <div class="bap-textarea-grid">
              <div class="bap-ta-item">
                <label class="bap-ta-label"
                  >Permasalahan <span class="req">*</span></label
                >
                <textarea
                  v-model="formData.Masalah"
                  class="bap-ta"
                  rows="5"
                  :class="{ 'ta-error': !formData.Masalah }"
                />
              </div>
              <div class="bap-ta-item">
                <label class="bap-ta-label">Solusi</label>
                <textarea v-model="formData.Solusi" class="bap-ta" rows="5" />
              </div>
              <div class="bap-ta-item">
                <label class="bap-ta-label">Sumber Masalah</label>
                <textarea
                  v-model="formData.SumberMasalah"
                  class="bap-ta"
                  rows="5"
                />
              </div>
              <div class="bap-ta-item">
                <label class="bap-ta-label">Pertanggungjawaban</label>
                <textarea
                  v-model="formData.Pertanggungjawaban"
                  class="bap-ta"
                  rows="5"
                />
              </div>
            </div>

            <div class="bap-divider" />

            <!-- ── FOOTER: SPK + angka ── -->
            <div class="bap-footer-grid">
              <div class="f-row">
                <label class="f-lbl">SPK</label>
                <input
                  :value="formData.SPK"
                  readonly
                  class="f-inp ro cur-ptr"
                  style="width: 140px"
                  @click="showSpkModal = true"
                  placeholder="Klik..."
                />
                <input
                  :value="formData.SpkNama"
                  readonly
                  class="f-inp ro ml-1"
                  style="flex: 1"
                />
              </div>
              <div class="f-row">
                <label class="f-lbl">Jumlah SPK</label>
                <input
                  v-model.number="formData.Jumlah"
                  type="number"
                  class="f-inp tr"
                  style="width: 90px"
                  v-select-on-focus
                />
                <label class="f-lbl ml-2">Harga</label>
                <input
                  v-model.number="formData.Harga"
                  type="number"
                  class="f-inp tr"
                  style="width: 130px"
                  v-select-on-focus
                />
                <label class="f-lbl ml-2">Total</label>
                <input
                  :value="formatCurrency(totalHarga)"
                  readonly
                  class="f-inp ro tr fw"
                  style="width: 150px"
                />
              </div>
            </div>
          </div>
        </v-form>
      </div>
    </template>
  </BaseForm>

  <BagianProduksiSearchModal
    v-model="showBagianModal"
    :cabang="formData.Cab"
    @selected="handleBagianSelected"
  />
  <SpkProduksiSearchModal
    v-model="showSpkModal"
    @selected="handleSpkSelected"
  />
  <KaryawanSearchModal v-model="showKaryawanModal" @selected="addKaryawan" />
</template>

<style scoped>
.bap-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px 14px;
  font-size: 11px;
  font-family: "Segoe UI", system-ui, sans-serif;
}

.bap-scroll-wrap {
  height: 100%;
  overflow-y: auto;
  padding-right: 4px;
}

/* ── Alert ── */
.bap-alert-wrap {
  margin-bottom: 8px;
}
.bap-alert {
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 4px;
}
.bap-alert.info {
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
}
.bap-alert.success {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}
.bap-alert.error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
}
.bap-alert.warning {
  background: #fff8e1;
  color: #f57f17;
  border: 1px solid #ffe082;
}

/* ── Top split ── */
.bap-top {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

/* ── Left fields ── */
.bap-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.f-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
}
.f-lbl {
  width: 72px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  text-align: right;
  white-space: nowrap;
}
.ml-1 {
  margin-left: 4px;
}
.ml-2 {
  margin-left: 8px;
}

/* ── Inputs ── */
.f-inp {
  height: 26px;
  border: 1px solid #a0a0a0;
  padding: 0 6px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  border-radius: 2px;
  background: white;
  color: #212121;
  min-width: 0;
  box-sizing: border-box;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-inp.ro {
  background: #dde8f0 !important;
  color: #444 !important;
}
.f-inp.tr {
  text-align: right;
}
.f-inp.fw {
  font-weight: 700;
}
.idate {
  height: 26px;
}
.isel {
  height: 26px;
  cursor: pointer;
}
.cur-ptr {
  cursor: pointer;
}

/* ── Kategori chips ── */
.f-multi-check {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.kat-chip {
  padding: 2px 10px;
  border-radius: 12px;
  border: 1px solid #bdbdbd;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  color: #555;
  background: #f5f5f5;
  user-select: none;
  transition: all 0.12s;
  white-space: nowrap;
}
.kat-chip.active {
  background: #1565c0;
  color: white;
  border-color: #1565c0;
}
.kat-chip:hover:not(.active) {
  background: #e3f2fd;
  border-color: #90caf9;
}

/* ── Right panel: Approve + Karyawan ── */
.bap-right-panel {
  flex-shrink: 0;
  width: 220px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.approve-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  color: #757575;
  user-select: none;
  transition: all 0.15s;
}
.approve-label input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: #2e7d32;
  cursor: pointer;
}
.approve-label.active {
  border-color: #2e7d32;
  background: #e8f5e9;
  color: #2e7d32;
}

/* ── Karyawan panel ── */
.kar-panel {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  flex: 1;
}
.kar-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f5f5f5;
  padding: 4px 8px;
  border-bottom: 1px solid #e0e0e0;
}
.kar-panel-title {
  font-size: 10px;
  font-weight: 700;
  color: #555;
  text-transform: uppercase;
}
.btn-add-kar {
  height: 20px;
  padding: 0 7px;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  color: #1565c0;
  font-size: 10px;
  font-weight: 600;
  border-radius: 2px;
  cursor: pointer;
}
.btn-add-kar:hover {
  background: #bbdefb;
}
.kar-empty {
  font-size: 10px;
  color: #9e9e9e;
  font-style: italic;
  padding: 8px;
  text-align: center;
}
.kar-list {
  max-height: 160px;
  overflow-y: auto;
}
.kar-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 10px;
}
.kar-item:last-child {
  border-bottom: none;
}
.kar-nik {
  font-family: monospace;
  font-weight: 700;
  color: #1565c0;
  width: 80px;
  flex-shrink: 0;
  font-size: 10px;
}
.kar-nama {
  flex: 1;
  color: #212121;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.btn-del-kar {
  background: transparent;
  border: none;
  color: #d32f2f;
  cursor: pointer;
  font-size: 11px;
  padding: 0 3px;
  flex-shrink: 0;
}
.btn-del-kar:hover {
  color: #b71c1c;
}

/* ── Radio ── */
.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}
.radio-label input[type="radio"] {
  accent-color: #1565c0;
  cursor: pointer;
}

/* ── Divider ── */
.bap-divider {
  height: 1px;
  background: #eeeeee;
  margin: 10px 0;
}

/* ── Textarea 2x2 ── */
.bap-textarea-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.bap-ta-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.bap-ta-label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
}
.req {
  color: #e53935;
}
.bap-ta {
  width: 100%;
  border: 1px solid #a0a0a0;
  border-radius: 2px;
  padding: 5px 7px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  box-sizing: border-box;
  color: #212121;
}
.bap-ta:focus {
  border-color: #1565c0;
}
.ta-error {
  border-color: #e53935 !important;
}

/* ── Footer ── */
.bap-footer-grid {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
</style>
