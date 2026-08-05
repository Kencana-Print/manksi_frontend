<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
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

const route = useRoute();
const router = useRouter();
const toast = useToast();

const nomorParam = computed(() => route.params.nomor as string | undefined);
const isEditMode = computed(() => !!nomorParam.value);

const isLoading = ref(true);
const isSaving = ref(false);

const showSaveDialog = ref(false);
const showCancelDialog = ref(false);
const showCloseDialog = ref(false);

// --- STATE HEADER ---
const nomor = ref("");
const jenis = ref(
  sessionStorage.getItem("last_jenis_retur_pembelian") || "ACCESORIES",
);
const tanggal = ref(getLocalDate());
const keterangan = ref("");

function getLocalDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// --- STATE BPB & SUPPLIER (auto-fill, read-only, immutable setelah create) ---
const bpbNomor = ref("");
const bpbTanggal = ref("");
const supKode = ref("");
const supNama = ref("");
const supAlamat = ref("");
const supKota = ref("");

const isBpbLocked = computed(() => isEditMode.value); // edtbpb.Enabled:=False pasca-load

// --- STATE APPROVAL (PIN5) — pola sama Retur Barang/Koreksi Stok ---
const statusPin5 = ref("");
const statusLabel: Record<string, { text: string; color: string }> = {
  MINTA: { text: "Perlu Pengajuan", color: "#c62828" },
  WAIT: { text: "Nunggu ACC", color: "#1976d2" },
  ACC: { text: "Sudah ACC", color: "#2e7d32" },
  TOLAK: { text: "Ditolak", color: "#c62828" },
};
const isSaveBlocked = computed(() =>
  ["MINTA", "WAIT", "TOLAK"].includes(statusPin5.value),
);

// --- STATE DETAIL (grid 100% dari BPB — TIDAK ada tambah/hapus/cari
// barang manual, sesuai temuan: cxGrdMainEditKeyDown F1/F2 di-comment-out
// total di source Delphi. Satu-satunya interaksi user = isi Jumlah) ---
const rows = ref<DetailRow[]>([]);

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
      jenis.value,
      nomorBpb,
    );
    const d = res.data.data;
    bpbNomor.value = d.bpbNomor;
    bpbTanggal.value = String(d.bpbTanggal).substring(0, 10);
    supKode.value = d.supplier.kode || "";
    supNama.value = d.supplier.nama || "";
    supAlamat.value = d.supplier.alamat || "";
    supKota.value = d.supplier.kota || "";
    rows.value = d.details.map((r: any) => ({
      kode: r.kode,
      nama: r.nama,
      satuan: r.satuan,
      qtyBpb: Number(r.qtyBpb) || 0,
      jumlah: 0,
    }));
  } catch (e: any) {
    toast.error(e.response?.data?.message || "BPB tsb belum ada.");
    bpbNomor.value = "";
    rows.value = [];
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
  const val = (bpbNomor.value || "").trim();
  if (!val || isBpbLocked.value) return;
  resolveBpb(val);
};

// --- LOAD DATA ---
const loadData = async () => {
  isLoading.value = true;
  try {
    if (isEditMode.value) {
      const res = await returPembelianFormService.getFormData(
        nomorParam.value!,
      );
      const d = res.data.data;
      nomor.value = d.nomor;
      jenis.value = d.jenis;
      tanggal.value = String(d.tanggal).substring(0, 10);
      keterangan.value = d.keterangan;
      bpbNomor.value = d.bpbNomor;
      bpbTanggal.value = d.bpbTanggal
        ? String(d.bpbTanggal).substring(0, 10)
        : "";
      supKode.value = d.supplier.kode || "";
      supNama.value = d.supplier.nama || "";
      supAlamat.value = d.supplier.alamat || "";
      supKota.value = d.supplier.kota || "";
      statusPin5.value = d.statusPin5;
      rows.value = d.details.map((r: any) => ({
        kode: r.kode,
        nama: r.nama,
        satuan: r.satuan,
        qtyBpb: Number(r.qtyBpb) || 0,
        jumlah: Number(r.jumlah) || 0,
      }));
    } else {
      keterangan.value = "";
      rows.value = [];
      await nextTick();
      bpbInputRef.value?.focus();
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
    router.push("/garmen/barang/retur-pembelian");
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// --- VALIDASI LOKAL ---
// ⚠️ Tidak ada validasi Keterangan wajib (beda dari Koreksi Stok/Retur
// Barang) — form Delphi ini memang tidak cek edtKeterangan sama sekali.
const onValidateSave = () => {
  if (isSaveBlocked.value) {
    return toast.warning(
      "Transaksi tsb sudah diclose. Silahkan minta approve untuk bisa menyimpan perubahan data.",
    );
  }
  if (!isEditMode.value && !bpbNomor.value) {
    return toast.error("Nomor BPB belum diisi.");
  }

  const totalQty = rows.value.reduce((s, r) => s + (Number(r.jumlah) || 0), 0);
  if (totalQty === 0) {
    return toast.error("Qty Retur 0 semua , tidak bisa di simpan.");
  }

  showSaveDialog.value = true;
};

// --- SUBMIT SIMPAN ---
const showPrintDialog = ref(false);
const savedNomor = ref("");

const onConfirmSave = async () => {
  isSaving.value = true;
  try {
    const payload = {
      jenis: jenis.value,
      tanggal: tanggal.value,
      keterangan: keterangan.value,
      bpbNomor: bpbNomor.value,
      supKode: supKode.value,
      details: rows.value.map((r) => ({ kode: r.kode, jumlah: r.jumlah })),
    };

    let resultNomor = nomor.value;
    if (isEditMode.value) {
      const res = await returPembelianFormService.update(nomor.value, payload);
      resultNomor = res.data.data.nomor;
    } else {
      const res = await returPembelianFormService.create(payload);
      resultNomor = res.data.data.nomor;
    }

    showSaveDialog.value = false;
    savedNomor.value = resultNomor;
    showPrintDialog.value = true;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal Simpan.");
  } finally {
    isSaving.value = false;
  }
};

const doCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/garmen/barang/retur-pembelian/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  router.push("/garmen/barang/retur-pembelian");
};
const skipCetak = () => {
  showPrintDialog.value = false;
  router.push("/garmen/barang/retur-pembelian");
};

// --- BATAL / TUTUP ---
const onConfirmCancel = () => {
  showCancelDialog.value = false;
  loadData();
};
const onConfirmClose = () => {
  router.push("/garmen/barang/retur-pembelian");
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

// Enter -> pindah antar field (Tanggal -> BPB -> Keterangan -> grid Jumlah)
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
    :title="isEditMode ? `Ubah Retur Beli ${jenis}` : `Retur Beli ${jenis}`"
    menu-id="68"
    :icon="IconTruckOff"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="onValidateSave"
    @confirm-save="onConfirmSave"
    @confirm-cancel="onConfirmCancel"
    @confirm-close="onConfirmClose"
  >
    <!-- LEFT COLUMN: Header -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="mb-3">
          <label class="f-label">Nomor</label>
          <v-text-field
            :model-value="nomor || '<-- Kosong = Baru'"
            variant="outlined"
            density="compact"
            readonly
            hide-details
          />
          <div v-if="statusPin5" class="mt-1">
            <span
              class="status-badge"
              :style="{ background: statusLabel[statusPin5]?.color }"
            >
              {{ statusLabel[statusPin5]?.text || statusPin5 }}
            </span>
          </div>
        </div>

        <div class="mb-3">
          <label class="f-label">Tanggal</label>
          <input
            ref="tanggalRef"
            v-model="tanggal"
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
              v-model="bpbNomor"
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
          <div v-if="bpbTanggal" class="f-hint">Tgl BPB: {{ bpbTanggal }}</div>
        </div>

        <div class="mb-3">
          <label class="f-label">Keterangan</label>
          <input
            ref="keteranganRef"
            v-model="keterangan"
            class="f-inp"
            style="width: 100%"
            @keydown.enter.prevent="onKeteranganEnter"
          />
        </div>
      </div>

      <div class="desktop-form-section">
        <div class="f-label mb-2">Supplier</div>
        <input
          :value="supKode"
          readonly
          class="f-inp f-ro mb-1"
          style="width: 100%"
        />
        <input
          :value="supNama"
          readonly
          class="f-inp f-ro mb-1"
          style="width: 100%"
        />
        <input
          :value="supAlamat"
          readonly
          class="f-inp f-ro mb-1"
          style="width: 100%"
        />
        <input
          :value="supKota"
          readonly
          class="f-inp f-ro"
          style="width: 100%"
        />
      </div>
    </template>

    <!-- RIGHT COLUMN: Tabel Detail (semua baris dari BPB, TIDAK ada
         tambah/hapus/cari barang manual) -->
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
            <tr v-for="(row, idx) in rows" :key="row.kode">
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
            <tr v-if="!rows.length">
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
    :extra-params="{ jenis: jenis }"
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
