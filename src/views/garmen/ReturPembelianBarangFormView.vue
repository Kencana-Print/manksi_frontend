<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import BpbSearchModal from "@/components/lookups/BpbSearchModal.vue";
import { returPembelianFormService } from "@/services/garmen/returPembelianFormService";
import { IconTruckOff, IconSearch } from "@tabler/icons-vue";

interface DetailRow {
  kode: string;
  nama: string;
  satuan: string;
  qtyBpb: number;
  jumlah: number;
}

interface SupplierInfo {
  kode: string;
  nama: string;
  alamat: string;
  kota: string;
}

interface ReturPembelianFormData {
  nomor: string;
  jenis: string;
  tanggal: string;
  keterangan: string;
  bpbNomor: string;
  bpbTanggal: string;
  supplier: SupplierInfo;
  statusPin5: string;
  rows: DetailRow[];
}

const toast = useToast();

const BROWSE_PATH = "/garmen/barang/retur-pembelian";

function getLocalDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const statusLabel: Record<string, { text: string; color: string }> = {
  MINTA: { text: "Perlu Pengajuan", color: "#c62828" },
  WAIT: { text: "Nunggu ACC", color: "#1976d2" },
  ACC: { text: "Sudah ACC", color: "#2e7d32" },
  TOLAK: { text: "Ditolak", color: "#c62828" },
};

// ── fetchApi / submitApi ────────────────────────────────────────────────
const fetchApi = async (): Promise<ReturPembelianFormData> => {
  const nomorEdit = params.nomor as string;
  const res = await returPembelianFormService.getFormData(nomorEdit);
  const d = res.data.data;
  return {
    nomor: d.nomor,
    jenis: d.jenis,
    tanggal: String(d.tanggal).substring(0, 10),
    keterangan: d.keterangan,
    bpbNomor: d.bpbNomor,
    bpbTanggal: d.bpbTanggal ? String(d.bpbTanggal).substring(0, 10) : "",
    supplier: {
      kode: d.supplier.kode || "",
      nama: d.supplier.nama || "",
      alamat: d.supplier.alamat || "",
      kota: d.supplier.kota || "",
    },
    statusPin5: d.statusPin5,
    rows: d.details.map((r: any) => ({
      kode: r.kode,
      nama: r.nama,
      satuan: r.satuan,
      qtyBpb: Number(r.qtyBpb) || 0,
      jumlah: Number(r.jumlah) || 0,
    })),
  };
};

const submitApi = async (data: ReturPembelianFormData) => {
  const payload = {
    jenis: data.jenis,
    tanggal: data.tanggal,
    keterangan: data.keterangan,
    bpbNomor: data.bpbNomor,
    supKode: data.supplier.kode,
    details: data.rows.map((r) => ({ kode: r.kode, jumlah: r.jumlah })),
  };
  return isEditMode.value
    ? returPembelianFormService.update(data.nomor, payload)
    : returPembelianFormService.create(payload);
};

// ── useForm ──────────────────────────────────────────────────────────────
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
} = useForm<ReturPembelianFormData>({
  menuId: "68",
  initialData: {
    nomor: "",
    jenis: sessionStorage.getItem("last_jenis_retur_pembelian") || "ACCESORIES",
    tanggal: getLocalDate(),
    keterangan: "",
    bpbNomor: "",
    bpbTanggal: "",
    supplier: { kode: "", nama: "", alamat: "", kota: "" },
    statusPin5: "",
    rows: [],
  },
  fetchApi,
  submitApi,
  onSuccessRoute: BROWSE_PATH,
  immediate: false,
  onSuccess: (res: any) => {
    savedNomor.value = res?.data?.data?.nomor || formData.value.nomor;
    showPrintDialog.value = true;
  },
});

const fd = formData;
const isSaveBlocked = computed(() =>
  ["MINTA", "WAIT", "TOLAK"].includes(fd.value.statusPin5),
);

// BPB terkunci begitu sudah edit mode (nomor BPB immutable pasca-create)
const isBpbLocked = computed(() => isEditMode.value);

const loadData = async () => {
  await fetchData();
  if (!isEditMode.value) {
    await nextTick();
    bpbInputRef.value?.focus();
  }
};
loadData();

// --- MODAL BPB ---
const bpbModalOpen = ref(false);
const bpbInputRef = ref<HTMLInputElement | null>(null);

const openBpbModal = () => {
  if (isBpbLocked.value) return;
  bpbModalOpen.value = true;
};

const resolveBpb = async (nomorBpb: string) => {
  try {
    const res = await returPembelianFormService.resolveBpb(
      fd.value.jenis,
      nomorBpb,
    );
    const d = res.data.data;
    fd.value.bpbNomor = d.bpbNomor;
    fd.value.bpbTanggal = String(d.bpbTanggal).substring(0, 10);
    fd.value.supplier = {
      kode: d.supplier.kode || "",
      nama: d.supplier.nama || "",
      alamat: d.supplier.alamat || "",
      kota: d.supplier.kota || "",
    };
    fd.value.rows = d.details.map((r: any) => ({
      kode: r.kode,
      nama: r.nama,
      satuan: r.satuan,
      qtyBpb: Number(r.qtyBpb) || 0,
      jumlah: 0,
    }));
  } catch (e: any) {
    toast.error(e.response?.data?.message || "BPB tsb belum ada.");
    fd.value.bpbNomor = "";
    fd.value.rows = [];
  }
};

const onBpbSelected = (item: any) => {
  bpbModalOpen.value = false;
  resolveBpb(item.Nomor);
};

const onBpbKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    openBpbModal();
  }
};

const onBpbBlur = () => {
  const val = (fd.value.bpbNomor || "").trim();
  if (!val || isBpbLocked.value) return;
  resolveBpb(val);
};

// --- VALIDASI LOKAL ---
// Tidak ada validasi Keterangan wajib — replikasi form Delphi asli yang
// memang tidak cek edtKeterangan sama sekali.
const onValidateSave = () => {
  if (isSaveBlocked.value) {
    toast.warning(
      "Transaksi tsb sudah diclose. Silahkan minta approve untuk bisa menyimpan perubahan data.",
    );
    return;
  }
  if (!isEditMode.value && !fd.value.bpbNomor) {
    toast.error("Nomor BPB belum diisi.");
    return;
  }
  const totalQty = fd.value.rows.reduce(
    (s, r) => s + (Number(r.jumlah) || 0),
    0,
  );
  if (totalQty === 0) {
    toast.error("Qty Retur 0 semua , tidak bisa di simpan.");
    return;
  }
  showSaveDialog.value = true;
};

// --- PRINT DIALOG ---
const showPrintDialog = ref(false);
const savedNomor = ref("");

const doCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/garmen/barang/retur-pembelian/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  executeClose();
};

const skipCetak = () => {
  showPrintDialog.value = false;
  executeClose();
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

// Enter -> pindah antar field
const tanggalRef = ref<HTMLInputElement | null>(null);
const keteranganRef = ref<HTMLInputElement | null>(null);
const jumlahRefs = ref<Record<number, HTMLInputElement | null>>({});
const setJumlahRef = (el: any, idx: number) => (jumlahRefs.value[idx] = el);

const onTanggalEnter = async () => {
  await nextTick();
  bpbInputRef.value?.focus();
};
const onBpbEnter = async () => {
  onBpbBlur();
  await nextTick();
  keteranganRef.value?.focus();
};
const onKeteranganEnter = async () => {
  await nextTick();
  jumlahRefs.value[0]?.focus();
};
const onJumlahEnter = async (idx: number) => {
  await nextTick();
  const next = jumlahRefs.value[idx + 1];
  if (next) next.focus();
};
const moveCursorToEnd = (e: FocusEvent) => {
  const el = e.target as HTMLInputElement;
  const len = el.value.length;
  requestAnimationFrame(() => {
    try {
      el.setSelectionRange(len, len);
    } catch {
      /* abaikan */
    }
  });
};
const onJumlahInput = (row: DetailRow, e: Event) => {
  const el = e.target as HTMLInputElement;
  let v = el.value.replace(/[^0-9.]/g, "");
  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
  }
  el.value = v;
  row.jumlah = v === "" ? 0 : Number(v);
};
</script>

<template>
  <BaseForm
    :title="
      isEditMode ? `Ubah Retur Beli ${fd.jenis}` : `Retur Beli ${fd.jenis}`
    "
    menu-id="68"
    :icon="IconTruckOff"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="onValidateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="mb-3">
          <label class="f-label">Nomor</label>
          <v-text-field
            :model-value="fd.nomor || '<-- Kosong = Baru'"
            variant="outlined"
            density="compact"
            readonly
            hide-details
          />
          <div v-if="fd.statusPin5" class="mt-1">
            <span
              class="status-badge"
              :style="{ background: statusLabel[fd.statusPin5]?.color }"
            >
              {{ statusLabel[fd.statusPin5]?.text || fd.statusPin5 }}
            </span>
          </div>
        </div>

        <div class="mb-3">
          <label class="f-label">Tanggal</label>
          <input
            ref="tanggalRef"
            v-model="fd.tanggal"
            type="date"
            class="f-inp"
            @keydown.enter.prevent="onTanggalEnter"
          />
        </div>

        <div class="mb-3">
          <label class="f-label">Nomor BPB</label>
          <div class="f-inp-grp">
            <input
              ref="bpbInputRef"
              v-model="fd.bpbNomor"
              class="f-inp"
              style="flex: 1"
              :readonly="isBpbLocked"
              :class="{ 'f-ro': isBpbLocked }"
              placeholder="F1 / nomor + Enter"
              @keydown="onBpbKeydown"
              @keydown.enter.prevent="onBpbEnter"
              @blur="onBpbBlur"
            />
            <button
              v-if="!isBpbLocked"
              type="button"
              class="f-btn-icon"
              @click="openBpbModal"
            >
              <IconSearch :size="13" color="#1565c0" />
            </button>
          </div>
          <div v-if="fd.bpbTanggal" class="f-hint">
            Tgl BPB: {{ fd.bpbTanggal }}
          </div>
        </div>

        <div class="mb-3">
          <label class="f-label">Keterangan</label>
          <input
            ref="keteranganRef"
            v-model="fd.keterangan"
            class="f-inp"
            style="width: 100%"
            @keydown.enter.prevent="onKeteranganEnter"
          />
        </div>
      </div>

      <div class="desktop-form-section">
        <div class="f-label mb-2">Supplier</div>
        <input
          :value="fd.supplier.kode"
          readonly
          class="f-inp f-ro mb-1"
          style="width: 100%"
        />
        <input
          :value="fd.supplier.nama"
          readonly
          class="f-inp f-ro mb-1"
          style="width: 100%"
        />
        <input
          :value="fd.supplier.alamat"
          readonly
          class="f-inp f-ro mb-1"
          style="width: 100%"
        />
        <input
          :value="fd.supplier.kota"
          readonly
          class="f-inp f-ro"
          style="width: 100%"
        />
      </div>
    </template>

    <template #right-column>
      <div class="desktop-form-section" style="flex: 1">
        <table class="detail-table">
          <thead>
            <tr>
              <th width="36" class="text-center">No</th>
              <th width="110">Kode</th>
              <th>Nama Bahan</th>
              <th width="70" class="text-center">Satuan</th>
              <th width="90" class="tr">Qty Bpb</th>
              <th width="90" class="tr">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in fd.rows" :key="row.kode">
              <td class="text-center">{{ idx + 1 }}</td>
              <td>{{ row.kode }}</td>
              <td>{{ row.nama }}</td>
              <td class="text-center">{{ row.satuan }}</td>
              <td class="tr">{{ numFmt(row.qtyBpb) }}</td>
              <td>
                <input
                  :value="row.jumlah"
                  :ref="(el) => setJumlahRef(el, idx)"
                  type="text"
                  inputmode="decimal"
                  class="cell-input tr"
                  @input="onJumlahInput(row, $event)"
                  @focus="moveCursorToEnd"
                  @keydown.enter.prevent="onJumlahEnter(idx)"
                />
              </td>
            </tr>
            <tr v-if="!fd.rows.length">
              <td colspan="6" class="empty-row">
                Belum ada data — cari No. BPB terlebih dahulu.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseForm>

  <BpbSearchModal
    v-model="bpbModalOpen"
    endpoint="/garmen/barang/retur-pembelian/form/search-bpb"
    :extra-params="{ jenis: fd.jenis }"
    title="Cari No. BPB Garmen"
    @selected="onBpbSelected"
  />

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3"
        >Simpan Berhasil</v-card-title
      >
      <v-card-text class="pa-4 text-center">
        Berhasil Simpan dengan Nomor <b>{{ savedNomor }}</b
        ><br />Ingin cetak transaksi ini sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="skipCetak">Tidak</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doCetak"
          >Ya, Cetak</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.f-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #555;
  margin-bottom: 4px;
}
.status-badge {
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 10px;
}
.f-inp {
  height: 30px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  background: white;
  font-family: inherit;
  box-sizing: border-box;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.f-inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  overflow: hidden;
  height: 30px;
  background: white;
}
.f-inp-grp .f-inp {
  border: none;
  border-radius: 0;
  height: 100%;
}
.f-btn-icon {
  width: 30px;
  min-width: 30px;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.f-btn-icon:hover {
  background: #bbdefb;
}
.f-hint {
  font-size: 10px;
  color: #888;
  margin-top: 3px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 8px;
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 1;
}
.detail-table td {
  padding: 2px 4px;
  border-bottom: 1px solid #eee;
}
.cell-input {
  width: 100%;
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: #fffde7;
  box-sizing: border-box;
}
.cell-input:focus {
  border-color: #1976d2;
}
.tr {
  text-align: right !important;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 20px !important;
}
</style>
