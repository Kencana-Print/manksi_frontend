<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconTruckDelivery } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import * as mmForm from "@/services/spanduk/mutasiMarketingSpandukFormService";
import SpandukMutasiMapSearchModal from "@/components/lookups/SpandukMutasiMapSearchModal.vue";
import type {
  MapSerahOption,
  MutasiMarketingFormData,
  MutasiMarketingPayload,
  SaveResponse,
} from "@/services/spanduk/mutasiMarketingSpandukFormService";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);
const MAKS_KETERANGAN = 200;

// ── Model data ──
interface MapRow {
  nomor: string;
  nama: string;
  ukuran: string;
  mo: string;
  lokasi: string;
  qty: number;
  tglDiterima: string | null;
}

interface FormState {
  header: {
    nomor: string;
    tanggal: string;
    keterangan: string;
    cab: string;
  };
  maps: MapRow[];
  sudahDiterima: boolean;
}

const toLocalDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const defaultData = (): FormState => ({
  header: {
    nomor: "",
    tanggal: toLocalDateStr(new Date()),
    keterangan: "",
    cab: "",
  },
  maps: [],
  sudahDiterima: false,
});

const bangunState = (d: MutasiMarketingFormData): FormState => ({
  header: {
    nomor: d.header.nomor,
    tanggal: d.header.tanggal,
    keterangan: d.header.keterangan ?? "",
    cab: d.header.cab ?? "",
  },
  maps: d.maps.map((m) => ({
    nomor: m.nomor,
    nama: m.nama ?? "",
    ukuran: m.ukuran ?? "",
    mo: m.mo ?? "",
    lokasi: d.header.cab ?? "",
    qty: Number(m.qty) || 0,
    tglDiterima: m.tglDiterima,
  })),
  sudahDiterima: d.sudahDiterima,
});

const bangunPayload = (data: FormState): MutasiMarketingPayload => ({
  tanggal: data.header.tanggal,
  keterangan: data.header.keterangan.trim(),
  maps: data.maps.map((m) => m.nomor),
});

// ── State UI ──
// modeUbah: false = dokumen baru (POST), true = ubah (PUT).
// Setelah simpan pertama, simpan berikutnya di layar yang sama menjadi PUT.
const modeUbah = ref(isEditMode.value);
const showSelesai = ref(false);
const nomorTerakhir = ref("");
const showMapModal = ref(false);

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
  menuId: "1327",
  initialData: defaultData(),
  fetchApi: async (): Promise<FormState> => {
    const d = await mmForm.getById(String(route.params.nomor));
    return bangunState(d);
  },
  submitApi: async (data: FormState): Promise<SaveResponse> => {
    const payload = bangunPayload(data);
    return modeUbah.value
      ? mmForm.update(data.header.nomor, payload)
      : mmForm.create(payload);
  },
  onSuccess: (response: unknown) => {
    const res = response as SaveResponse;
    nomorTerakhir.value = res.data?.nomor ?? formData.value.header.nomor;
    formData.value.header.nomor = nomorTerakhir.value;
    modeUbah.value = true;
    showSelesai.value = true;
  },
  onFormReset: () => {
    modeUbah.value = false;
    showMapModal.value = false;
  },
});

// ── Turunan ──
const lokasiTampil = computed(() => {
  const set = new Set(
    formData.value.maps.map((m) => m.lokasi).filter((l) => l !== ""),
  );
  return [...set].join(", ");
});

const totalQty = computed(() =>
  formData.value.maps.reduce((s, m) => s + m.qty, 0),
);

const fmtQty = (v: number) =>
  Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 });

const terkunci = computed(() => formData.value.sudahDiterima);

// ── MAP ──
const pilihMap = (daftar: MapSerahOption[]) => {
  const ada = new Set(formData.value.maps.map((m) => m.nomor.toUpperCase()));
  for (const m of daftar) {
    if (ada.has(m.Nomor.toUpperCase())) continue;
    formData.value.maps.push({
      nomor: m.Nomor,
      nama: m.Nama,
      ukuran: m.Ukuran,
      mo: m.MO,
      lokasi: m.Lokasi,
      qty: Number(m.Jumlah) || 0,
      tglDiterima: null,
    });
  }
};

const hapusMap = (i: number) => {
  formData.value.maps.splice(i, 1);
};

// ── Validasi ──
const validateSave = () => {
  const { tanggal, keterangan } = formData.value.header;
  if (terkunci.value) {
    toast.error(
      "Dokumen tidak bisa diubah: sudah ada MAP yang diterima marketing.",
    );
    return;
  }
  if (!tanggal) {
    toast.warning("Tanggal harus diisi.");
    return;
  }
  if (formData.value.maps.length === 0) {
    toast.warning("Pilih minimal satu MAP.");
    return;
  }
  if (keterangan.length > MAKS_KETERANGAN) {
    toast.warning(`Keterangan maksimal ${MAKS_KETERANGAN} karakter.`);
    return;
  }
  const cab = new Set(
    formData.value.maps.map((m) => m.lokasi).filter((l) => l !== ""),
  );
  if (cab.size > 1) {
    toast.warning(
      "Semua MAP dalam satu dokumen harus berasal dari cabang yang sama.",
    );
    return;
  }
  showSaveDialog.value = true;
};

// ── Setelah simpan ──
const resetBaru = () => {
  showSelesai.value = false;
  if (isEditMode.value) {
    router.replace({ name: "SpandukMutasiMarketingCreate" });
    return;
  }
  formData.value = defaultData();
  modeUbah.value = false;
};

const tutupSetelahSimpan = () => {
  showSelesai.value = false;
  goBack();
};

const cetakSekarang = () => {
  window.open(
    `/spanduk/mutasi-marketing/print/${encodeURIComponent(nomorTerakhir.value)}`,
    "_blank",
  );
  tutupSetelahSimpan();
};
</script>

<template>
  <BaseForm
    :title="modeUbah ? 'Ubah Mutasi Marketing' : 'Buat Mutasi Marketing'"
    menu-id="1327"
    :icon="IconTruckDelivery"
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
    <!-- ── Kolom kiri: info dokumen ── -->
    <template #left-column>
      <div class="mm-card">
        <div class="f-row">
          <label class="f-lbl">Nomor</label>
          <input
            :value="formData.header.nomor"
            readonly
            class="f-inp f-ro"
            style="font-weight: 600; color: #1565c0"
            placeholder="Otomatis"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.header.tanggal"
            :disabled="terkunci"
            class="f-inp"
            style="max-width: 150px"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Lokasi</label>
          <input
            :value="lokasiTampil"
            readonly
            class="f-inp f-ro"
            style="max-width: 100px"
            placeholder="Dari MAP"
          />
        </div>

        <div class="f-divider" />

        <div class="f-row">
          <label class="f-lbl">Jumlah MAP</label>
          <input
            :value="formData.maps.length"
            readonly
            class="f-inp f-ro"
            style="max-width: 100px; text-align: right; font-weight: 600"
          />
        </div>
        <div class="f-row">
          <label class="f-lbl">Total Qty</label>
          <input
            :value="fmtQty(totalQty)"
            readonly
            class="f-inp f-ro"
            style="max-width: 100px; text-align: right; font-weight: 600"
          />
        </div>

        <div class="f-divider" />

        <div class="sec-title">Keterangan</div>
        <textarea
          v-model="formData.header.keterangan"
          :maxlength="MAKS_KETERANGAN"
          :disabled="terkunci"
          rows="6"
          class="ket-textarea"
          placeholder="Catatan pengiriman..."
        ></textarea>

        <div class="note-box">
          Qty diambil dari BAST MAP (jumlah jadi) saat dokumen disimpan. Tidak
          ada pengurangan stok.
        </div>
      </div>
    </template>

    <!-- ── Kolom kanan: daftar MAP ── -->
    <template #right-column>
      <div
        class="mm-card"
        style="display: flex; flex-direction: column; height: 100%"
      >
        <div v-if="terkunci" class="warn-box">
          Dokumen tidak bisa diubah: sudah ada MAP yang diterima marketing.
        </div>

        <div class="sec-title">MAP yang diserahkan :</div>
        <div style="overflow: auto; flex: 1; min-height: 0">
          <table class="bt" style="min-width: 760px">
            <thead>
              <tr>
                <th style="width: 30px">No</th>
                <th style="width: 160px; text-align: left">Nomor MAP</th>
                <th style="text-align: left">Nama Pekerjaan</th>
                <th style="width: 110px; text-align: left">Ukuran</th>
                <th style="width: 160px; text-align: left">MO</th>
                <th style="width: 80px">Qty</th>
                <th style="width: 90px">Diterima</th>
                <th style="width: 30px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(m, i) in formData.maps" :key="m.nomor">
                <td class="tc">{{ i + 1 }}</td>
                <td class="td-kode">{{ m.nomor }}</td>
                <td class="font-weight-bold">{{ m.nama }}</td>
                <td>{{ m.ukuran }}</td>
                <td>{{ m.mo }}</td>
                <td class="tr">{{ fmtQty(m.qty) }}</td>
                <td class="tc muted">
                  {{ m.tglDiterima ? formatTanggal(m.tglDiterima) : "-" }}
                </td>
                <td class="tc p0">
                  <button
                    type="button"
                    class="del-btn"
                    :disabled="terkunci"
                    @click="hapusMap(i)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
              <tr v-if="formData.maps.length === 0">
                <td colspan="8" class="empty-row">
                  Belum ada MAP. Klik "Tambah MAP" untuk memilih.
                </td>
              </tr>
            </tbody>
          </table>
          <button
            type="button"
            class="add-row-btn"
            :disabled="terkunci"
            @click="showMapModal = true"
          >
            + Tambah MAP
          </button>
        </div>
      </div>
    </template>
  </BaseForm>

  <SpandukMutasiMapSearchModal
    v-model="showMapModal"
    :exclude="formData.maps.map((m) => m.nomor)"
    @selected="pilihMap"
  />

  <!-- Setelah simpan -->
  <v-dialog v-model="showSelesai" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconTruckDelivery class="mr-2" :size="20" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-2">
          Mutasi Marketing <b>{{ nomorTerakhir }}</b> telah disimpan.
        </div>
        <div class="text-body-2 text-grey-darken-1">
          Mau input Mutasi Marketing baru?
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="tutupSetelahSimpan">Tidak, Tutup</v-btn>
        <v-btn variant="text" color="primary" @click="cetakSekarang">
          Cetak
        </v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="resetBaru">
          Ya, Input Baru
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.mm-card {
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
  width: 90px;
  flex-shrink: 0;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
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
  box-sizing: border-box;
  font-family: inherit;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-inp:disabled {
  background: #f0f0f0;
  color: #616161;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #616161 !important;
  cursor: default;
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
.warn-box {
  margin-bottom: 8px;
  padding: 6px 10px;
  background: #fff3e0;
  border: 1px solid #ffb74d;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #e65100;
  flex-shrink: 0;
}

.sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1565c0;
  margin-bottom: 5px;
}

.bt {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.bt thead tr {
  background: #1565c0;
}
.bt th {
  padding: 4px 6px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  text-align: center;
  border: 1px solid #0d47a1;
  white-space: nowrap;
}
.bt td {
  border: 1px solid #eeeeee;
  padding: 3px 6px;
  vertical-align: middle;
}
.bt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.bt tbody tr:hover td {
  background: #e3f2fd !important;
}
.td-kode {
  font-family: monospace;
  font-weight: 600;
  color: #1565c0;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.p0 {
  padding: 0 !important;
}
.muted {
  color: #9e9e9e;
  font-size: 9px;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 14px 0 !important;
}

.del-btn {
  width: 22px;
  height: 22px;
  background: #ffebee;
  border: none;
  border-radius: 3px;
  color: #c62828;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}
.del-btn:hover:not(:disabled) {
  background: #ffcdd2;
}
.del-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.add-row-btn {
  margin-top: 6px;
  padding: 4px 12px;
  background: transparent;
  border: 1px dashed #1565c0;
  border-radius: 3px;
  color: #1565c0;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.add-row-btn:hover:not(:disabled) {
  background: #e3f2fd;
}
.add-row-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
}
.ket-textarea:focus {
  border-color: #1565c0;
}
.ket-textarea:disabled {
  background: #f0f0f0;
  color: #616161;
}
</style>
