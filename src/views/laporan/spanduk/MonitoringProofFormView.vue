<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconFileCheck, IconSearch } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import MonitoringProofMapSearchModal from "@/components/lookups/MonitoringProofMapSearchModal.vue";
import * as proofForm from "@/services/laporan/spanduk/monitoringProofFormService";
import type {
  GudangOption,
  MapOption,
  MonitoringProofFormData,
  MonitoringProofPayload,
  SaveResponse,
} from "@/services/laporan/spanduk/monitoringProofFormService";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);
const MAKS_ARSIP = 20;
const STATUS_PILIHAN = ["OK", "NOK"];

// ── Model data ──
interface MapInfo {
  nomor: string;
  tanggal: string;
  deadline: string;
  perusahaanKode: string;
  perusahaanNama: string;
  nama: string;
  jumlah: number;
  panjang: number;
  lebar: number;
  gramasi: string;
  kain: string;
  rencanaOrder: number;
  keterangan: string;
}

interface ProofInfo {
  tglProof: string;
  jumlahProof: number;
  gudang: string;
  gudangNama: string;
  status: string;
  tglStatus: string;
  arsip: string;
}

interface FormState {
  map: MapInfo;
  proof: ProofInfo;
}

const toLocalDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const defaultData = (): FormState => ({
  map: {
    nomor: "",
    tanggal: "",
    deadline: "",
    perusahaanKode: "",
    perusahaanNama: "",
    nama: "",
    jumlah: 0,
    panjang: 0,
    lebar: 0,
    gramasi: "",
    kain: "",
    rencanaOrder: 0,
    keterangan: "",
  },
  proof: {
    tglProof: toLocalDateStr(new Date()),
    jumlahProof: 0,
    gudang: "",
    gudangNama: "",
    status: "",
    tglStatus: toLocalDateStr(new Date()),
    arsip: "",
  },
});

const bangunState = (d: MonitoringProofFormData): FormState => ({
  map: {
    nomor: d.Nomor,
    tanggal: d.Tanggal ?? "",
    deadline: d.Deadline ?? "",
    perusahaanKode: d.Perush_Kode ?? "",
    perusahaanNama: d.Perush_Nama ?? "",
    nama: d.Nama ?? "",
    jumlah: Number(d.Jumlah) || 0,
    panjang: Number(d.Panjang) || 0,
    lebar: Number(d.Lebar) || 0,
    gramasi: d.Gramasi ?? "",
    kain: d.Kain ?? "",
    rencanaOrder: Number(d.Rencana_Order) || 0,
    keterangan: d.Keterangan ?? "",
  },
  proof: {
    tglProof: d.Tgl_Proof ?? toLocalDateStr(new Date()),
    jumlahProof: Number(d.Jml_Proof) || 0,
    gudang: d.Gudang_Kode ?? "",
    gudangNama: d.Gudang_Nama ?? "",
    status: STATUS_PILIHAN.includes(d.Status) ? d.Status : "",
    tglStatus: d.Tg_Status ?? toLocalDateStr(new Date()),
    arsip: d.Arsip ?? "",
  },
});

const bangunPayload = (data: FormState): MonitoringProofPayload => ({
  jumlahProof: Number(data.proof.jumlahProof) || 0,
  gudang: data.proof.gudang.trim(),
  tglProof: data.proof.tglProof,
  tglStatus: data.proof.tglStatus,
  status: data.proof.status,
  arsip: data.proof.arsip.trim(),
});

// ── State UI ──
// sudahAda ditentukan server: true bila MAP ini sudah punya data proof
const sudahAda = ref(false);
const showSelesai = ref(false);
const nomorTerakhir = ref("");
const showMapModal = ref(false);
const daftarGudang = ref<GudangOption[]>([]);

const {
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  executeSave,
  executeCancel,
  executeClose,
  goBack,
} = useForm({
  menuId: "963",
  initialData: defaultData(),
  fetchApi: async (): Promise<FormState> => {
    const d = await proofForm.getById(String(route.params.nomor));
    sudahAda.value = d.Ada_Proof;
    return bangunState(d);
  },
  submitApi: async (data: FormState): Promise<SaveResponse> =>
    proofForm.simpan(data.map.nomor, bangunPayload(data)),
  onSuccess: (response: unknown) => {
    const res = response as SaveResponse;
    nomorTerakhir.value = res.data?.nomor ?? formData.value.map.nomor;
    sudahAda.value = true;
    showSelesai.value = true;
  },
  onFormReset: () => {
    sudahAda.value = false;
    showMapModal.value = false;
  },
});

onMounted(async () => {
  try {
    daftarGudang.value = await proofForm.getGudang();
  } catch (e) {
    toast.error(proofForm.pesanError(e, "Gagal memuat daftar gudang."));
  }
});

// Gudang tersimpan yang tidak ada di daftar tetap tampil, agar tidak hilang diam-diam
const opsiGudang = computed<GudangOption[]>(() => {
  const { gudang, gudangNama } = formData.value.proof;
  if (gudang && !daftarGudang.value.some((g) => g.Kode === gudang)) {
    return [{ Kode: gudang, Nama: gudangNama }, ...daftarGudang.value];
  }
  return daftarGudang.value;
});

// ── Turunan ──
const ukuranTampil = computed(() => {
  const { panjang, lebar } = formData.value.map;
  return `${fmt(panjang)} x ${fmt(lebar)} Mtr`;
});

// Selisih hari kalender (bertanda), tanpa pengaruh zona waktu
const lamaHari = computed<number | null>(() => {
  const a = formData.value.map.tanggal.slice(0, 10);
  const b = formData.value.proof.tglProof.slice(0, 10);
  if (!a || !b) return null;
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000,
  );
});

const fmt = (v: number) =>
  Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 });

// ── MAP ──
const pilihMap = async (m: MapOption) => {
  isLoading.value = true;
  try {
    const d = await proofForm.getById(m.Nomor);
    sudahAda.value = d.Ada_Proof;
    formData.value = bangunState(d);
  } catch (e) {
    toast.error(proofForm.pesanError(e, "Gagal memuat data MAP."));
  } finally {
    isLoading.value = false;
  }
};

// ── Validasi (mencerminkan server) ──
const validateSave = () => {
  const { map, proof } = formData.value;
  if (!map.nomor) {
    toast.warning("Pilih Nomor Pra SPK terlebih dahulu.");
    return;
  }
  const qty = Number(proof.jumlahProof);
  if (!Number.isInteger(qty) || qty < 1) {
    toast.warning("Jumlah Proof belum diisi (bilangan bulat, minimal 1).");
    return;
  }
  if (!proof.gudang) {
    toast.warning("Lokasi Proof belum diisi.");
    return;
  }
  if (!proof.tglProof) {
    toast.warning("Tanggal Proof harus diisi.");
    return;
  }
  if (proof.arsip.trim().length > MAKS_ARSIP) {
    toast.warning(`Arsip maksimal ${MAKS_ARSIP} karakter.`);
    return;
  }
  showSaveDialog.value = true;
};

// ── Setelah simpan ──
const resetBaru = () => {
  showSelesai.value = false;
  if (isEditMode.value) {
    router.replace({ name: "LaporanSpandukMonitoringProofCreate" });
    return;
  }
  formData.value = defaultData();
  sudahAda.value = false;
};

const tutupSetelahSimpan = () => {
  showSelesai.value = false;
  goBack();
};
</script>

<template>
  <BaseForm
    :title="sudahAda ? 'Ubah Monitoring Proof' : 'Buat Monitoring Proof'"
    menu-id="963"
    :icon="IconFileCheck"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ── Kolom kiri: header MAP (read-only) ── -->
    <template #left-column>
      <div class="mp-card">
        <div class="f-row">
          <label class="f-lbl">Nomor Pra SPK</label>
          <div class="inp-grp">
            <input
              :value="formData.map.nomor"
              readonly
              class="f-inp f-ro"
              style="font-weight: 600; color: #1565c0"
              placeholder="Pilih MAP..."
            />
            <button
              v-if="!isEditMode"
              type="button"
              class="btn-lkp"
              @click="showMapModal = true"
            >
              <IconSearch :size="12" color="#1565c0" />
            </button>
          </div>
        </div>
        <div class="f-row">
          <label class="f-lbl">Perusahaan</label>
          <input
            :value="formData.map.perusahaanKode"
            readonly
            class="f-inp f-ro"
            style="max-width: 70px"
          />
          <input
            :value="formData.map.perusahaanNama"
            readonly
            class="f-inp f-ro"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Tanggal</label>
          <input
            :value="
              formData.map.tanggal ? formatTanggal(formData.map.tanggal) : ''
            "
            readonly
            class="f-inp f-ro"
            style="max-width: 120px"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Nama Pekerjaan</label>
          <input :value="formData.map.nama" readonly class="f-inp f-ro" />
        </div>
        <div class="f-row">
          <label class="f-lbl">Jumlah</label>
          <input
            :value="fmt(formData.map.jumlah)"
            readonly
            class="f-inp f-ro"
            style="max-width: 100px; text-align: right"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Ukuran</label>
          <input
            :value="ukuranTampil"
            readonly
            class="f-inp f-ro"
            style="max-width: 160px"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Gramasi</label>
          <input :value="formData.map.gramasi" readonly class="f-inp f-ro" />
        </div>
        <div class="f-row">
          <label class="f-lbl">Kain</label>
          <input :value="formData.map.kain" readonly class="f-inp f-ro" />
        </div>
        <div class="f-row">
          <label class="f-lbl">Deadline</label>
          <input
            :value="
              formData.map.deadline ? formatTanggal(formData.map.deadline) : ''
            "
            readonly
            class="f-inp f-ro"
            style="max-width: 120px"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Rencana Order</label>
          <input
            :value="fmt(formData.map.rencanaOrder)"
            readonly
            class="f-inp f-ro"
            style="max-width: 100px; text-align: right"
          />
        </div>

        <div class="f-divider" />

        <div class="sec-title">Keterangan</div>
        <textarea
          :value="formData.map.keterangan"
          readonly
          rows="5"
          class="ket-textarea"
        ></textarea>
      </div>
    </template>

    <!-- ── Kolom kanan: detail proof ── -->
    <template #right-column>
      <div class="mp-card">
        <div class="sec-title">Detail Proof</div>

        <div class="f-row">
          <label class="f-lbl">Tanggal Proof</label>
          <input
            type="date"
            v-model="formData.proof.tglProof"
            class="f-inp"
            style="max-width: 150px"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Jumlah</label>
          <input
            type="number"
            min="0"
            step="1"
            v-model.number="formData.proof.jumlahProof"
            class="f-inp"
            style="max-width: 100px; text-align: right; font-weight: 600"
            v-select-on-focus
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Lama</label>
          <input
            :value="lamaHari ?? ''"
            readonly
            class="f-inp f-ro"
            style="max-width: 100px; text-align: right"
          />
          <span class="f-unit">Hari</span>
        </div>
        <div class="f-row">
          <label class="f-lbl">Lokasi</label>
          <select v-model="formData.proof.gudang" class="f-inp">
            <option value="">- Pilih lokasi -</option>
            <option v-for="g in opsiGudang" :key="g.Kode" :value="g.Kode">
              {{ g.Kode }} - {{ g.Nama }}
            </option>
          </select>
        </div>

        <div class="f-divider" />

        <div class="f-row">
          <label class="f-lbl">Tanggal Status</label>
          <input
            type="date"
            v-model="formData.proof.tglStatus"
            class="f-inp"
            style="max-width: 150px"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Status</label>
          <select
            v-model="formData.proof.status"
            class="f-inp"
            style="max-width: 120px"
          >
            <option value="">-</option>
            <option v-for="s in STATUS_PILIHAN" :key="s" :value="s">
              {{ s }}
            </option>
          </select>
        </div>
        <div class="f-row">
          <label class="f-lbl">Arsip</label>
          <input
            v-model="formData.proof.arsip"
            :maxlength="MAKS_ARSIP"
            class="f-inp"
            style="max-width: 160px"
          />
        </div>

        <div class="note-box">
          Nomor arsip diisi manual. Status kosong berarti belum diputuskan;
          laporan tetap menampilkan OK bila MAP sudah punya SPK.
        </div>
      </div>
    </template>
  </BaseForm>

  <MonitoringProofMapSearchModal v-model="showMapModal" @selected="pilihMap" />

  <!-- Setelah simpan -->
  <v-dialog v-model="showSelesai" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconFileCheck class="mr-2" :size="20" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-2">
          Proof MAP <b>{{ nomorTerakhir }}</b> telah disimpan.
        </div>
        <div class="text-body-2 text-grey-darken-1">
          Mau input proof MAP lain?
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="tutupSetelahSimpan">Tidak, Tutup</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="resetBaru">
          Ya, Input Baru
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.mp-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-top: 3px solid #1565c0;
  border-radius: 6px;
  padding: 10px 12px;
  height: 100%;
  box-sizing: border-box;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}

.f-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
}
.f-lbl {
  width: 100px;
  flex-shrink: 0;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}
.f-unit {
  color: #555;
}
.f-divider {
  height: 1px;
  background: #eeeeee;
  margin: 6px 0;
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
  box-sizing: border-box;
  font-family: inherit;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #616161 !important;
  cursor: default;
}
.inp-grp {
  display: flex;
  flex: 1;
  align-items: stretch;
  gap: 0;
}
.inp-grp .f-inp {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.btn-lkp {
  width: 28px;
  border: 1px solid #bdbdbd;
  border-left: none;
  border-radius: 0 3px 3px 0;
  background: #e3f2fd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-lkp:hover {
  background: #bbdefb;
}

.sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1565c0;
  margin-bottom: 5px;
}
.note-box {
  margin-top: 10px;
  padding: 6px 8px;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 4px;
  color: #0d47a1;
  font-size: 10px;
  line-height: 1.4;
}
.ket-textarea {
  width: 100%;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 6px 8px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  resize: none;
  box-sizing: border-box;
  line-height: 1.5;
  background: #f0f0f0;
  color: #616161;
}
</style>
