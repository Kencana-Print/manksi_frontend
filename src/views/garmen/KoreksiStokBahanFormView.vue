<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import GudangBahanSearchModal from "@/components/lookups/GudangBahanSearchModal.vue";
import { koreksiStokBahanFormService } from "@/services/garmen/koreksiStokBahanFormService";
import {
  IconSettings,
  IconSearch,
  IconTrash,
  IconPlus,
} from "@tabler/icons-vue";

interface DetailRow {
  kode: string;
  nama: string;
  satuan: string;
  stok: number;
  jumlah: number;
  selisih: number;
  hpp: number; // internal, gak ditampilin
  total: number; // internal, gak ditampilin
  ket: string;
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
const tanggal = ref("");
const gdgKode = ref("GB001");
const gdgNama = ref("");
const keterangan = ref("");

// --- STATE APPROVAL ---
const approval = ref<{ status: string; urut: number | null }>({
  status: "",
  urut: null,
});

const approvalBadge = computed(() => {
  const map: Record<string, { text: string; color: string }> = {
    MINTA: { text: "Perlu Pengajuan Approval", color: "orange" },
    WAIT: { text: "Menunggu Approval", color: "blue" },
    ACC: { text: "Disetujui", color: "green" },
    TOLAK: { text: "Ditolak", color: "red" },
  };
  return map[approval.value.status] || null;
});

// Blok simpan kalau status masih MINTA/WAIT/TOLAK (replikasi FormKeyDown)
const isSaveBlocked = computed(() =>
  ["MINTA", "WAIT", "TOLAK"].includes(approval.value.status),
);

// --- STATE DETAIL (TABEL) ---
const rows = ref<DetailRow[]>([]);

const blankRow = (): DetailRow => ({
  kode: "",
  nama: "",
  satuan: "",
  stok: 0,
  jumlah: 0,
  selisih: 0,
  hpp: 0,
  total: 0,
  ket: "",
});

const ensureTrailingBlankRow = () => {
  const last = rows.value[rows.value.length - 1];
  if (!last || last.kode) rows.value.push(blankRow());
};

// --- KONFIRMASI HAPUS BARIS ---
const deleteRowDialog = ref(false);
const rowToDeleteIdx = ref<number | null>(null);

const requestRemoveRow = (idx: number) => {
  rowToDeleteIdx.value = idx;
  deleteRowDialog.value = true;
};

const confirmRemoveRow = () => {
  if (rowToDeleteIdx.value === null) return;
  rows.value.splice(rowToDeleteIdx.value, 1);
  ensureTrailingBlankRow();
  deleteRowDialog.value = false;
  rowToDeleteIdx.value = null;
};

const onJumlahChange = (row: DetailRow) => {
  row.selisih = Number(row.jumlah || 0) - Number(row.stok || 0);
  row.total = row.selisih * Number(row.hpp || 0); // internal
};

// --- MODAL BAHAN ---
const bahanModalOpen = ref(false);
const activeRowIndex = ref<number | null>(null);

const openBahanModal = (idx: number) => {
  activeRowIndex.value = idx;
  bahanModalOpen.value = true;
};

// ✅ Dipakai bareng dari 2 jalur: pilih dari modal ATAU ketik manual+Enter
const fetchBarangIntoRow = async (idx: number, kodeBaru: string) => {
  // ✅ Replikasi cek "barang sudah diinput di baris lain" — state lokal
  const dupIdx = rows.value.findIndex(
    (r, i) => i !== idx && r.kode === kodeBaru,
  );
  if (dupIdx !== -1) {
    toast.warning(`Barang ini sudah di input, di baris ${dupIdx + 1}`);
    rows.value[idx].kode = "";
    return;
  }

  try {
    const res = await koreksiStokBahanFormService.getBarang(kodeBaru, {
      gdgKode: gdgKode.value,
      tanggal: tanggal.value,
      nomorSedangDiedit: nomor.value || "",
    });
    const d = res.data.data;
    rows.value[idx] = {
      kode: d.kode,
      nama: d.nama,
      satuan: d.satuan,
      stok: d.stok,
      jumlah: 0,
      selisih: 0 - d.stok,
      hpp: d.hpp,
      total: 0,
      ket: "",
    };
    ensureTrailingBlankRow();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data barang.");
    rows.value[idx].kode = "";
  }
};

const onBahanSelected = (item: any) => {
  const idx = activeRowIndex.value;
  if (idx === null) return;
  fetchBarangIntoRow(idx, item.Kode);
};

// ─────────────────────────────────────────────
// KEYBOARD HANDLERS: KODE BARANG DI TABEL
// ─────────────────────────────────────────────
const onKodeKeydown = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openBahanModal(idx);
  }
};

const onKodeBlur = (idx: number) => {
  const kode = (rows.value[idx].kode || "").trim().toUpperCase();
  if (!kode) return; // biar blur natural (tab-out row kosong) gak numpuk-nge-modal
  fetchBarangIntoRow(idx, kode);
};

// --- MODAL GUDANG ---
const gudangModalOpen = ref(false);

const onGudangSelected = async (item: any) => {
  try {
    // Validasi ulang ke backend (gdg_bahan=4), jaga-jaga filter modal
    // belum tentu sepersis backend
    const res = await koreksiStokBahanFormService.getGudang(item.Kode);
    gdgKode.value = res.data.data.kode;
    gdgNama.value = res.data.data.nama;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode gudang tsb tidak ada.");
  }
};

// --- LOAD DATA ---
const loadData = async () => {
  isLoading.value = true;
  try {
    if (isEditMode.value) {
      const res = await koreksiStokBahanFormService.getFormData(
        nomorParam.value!,
      );
      const d = res.data.data;
      nomor.value = d.header.nomor;
      tanggal.value = String(d.header.tanggal).substring(0, 10);
      gdgKode.value = d.header.gdgKode;
      gdgNama.value = d.header.gdgNama;
      keterangan.value = d.header.keterangan;
      approval.value = d.approval;
      rows.value = d.detail.map((r: any) => ({
        kode: r.kode,
        nama: r.nama,
        satuan: r.satuan,
        stok: Number(r.stok) || 0,
        jumlah: Number(r.jumlah) || 0,
        selisih: Number(r.selisih) || 0,
        hpp: Number(r.hpp) || 0,
        total: Number(r.total) || 0,
        ket: r.ket || "",
      }));
      ensureTrailingBlankRow();
    } else {
      const res = await koreksiStokBahanFormService.getDefault();
      const d = res.data.data;
      tanggal.value = d.tanggal;
      gdgKode.value = d.gdgKode;
      gdgNama.value = d.gdgNama;
      keterangan.value = "";
      rows.value = [blankRow()];
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
    router.push({ name: "KoreksiStokBahanBrowse" });
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// --- VALIDASI LOKAL (sebelum buka dialog konfirmasi) ---
const onValidateSave = () => {
  if (isSaveBlocked.value) {
    return toast.warning(
      "Transaksi tsb sudah diclose. Silahkan minta approve untuk bisa menyimpan perubahan data.",
    );
  }
  if (!keterangan.value.trim()) {
    return toast.error("Keterangan harus diisi.");
  }
  const filled = rows.value.filter((r) => r.kode);
  if (filled.length === 0) {
    return toast.error("Detail barang harus diisi.");
  }
  for (const r of filled) {
    if (!r.ket.trim()) {
      return toast.error("Detail Keterangan harus diisi.");
    }
  }
  showSaveDialog.value = true;
};

// --- SUBMIT SIMPAN ---
const onConfirmSave = async () => {
  isSaving.value = true;
  try {
    const payload = {
      tanggal: tanggal.value,
      gdgKode: gdgKode.value,
      keterangan: keterangan.value,
      detail: rows.value
        .filter((r) => r.kode)
        .map((r) => ({
          kode: r.kode,
          stok: r.stok,
          jumlah: r.jumlah,
          selisih: r.selisih,
          hpp: r.hpp,
          ket: r.ket,
        })),
    };

    if (isEditMode.value) {
      await koreksiStokBahanFormService.update(nomor.value, payload);
    } else {
      await koreksiStokBahanFormService.create(payload);
    }

    toast.success("Berhasil Simpan.");
    showSaveDialog.value = false;
    router.push({ name: "KoreksiStokBahanBrowse" });
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan data.");
  } finally {
    isSaving.value = false;
  }
};

// --- BATAL / TUTUP ---
const onConfirmCancel = () => {
  showCancelDialog.value = false;
  loadData();
};

const onConfirmClose = () => {
  router.push({ name: "KoreksiStokBahanBrowse" });
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
</script>

<template>
  <BaseForm
    :title="isEditMode ? `Ubah Koreksi Stok - ${nomor}` : 'Tambah Koreksi Stok'"
    menu-id="115"
    :icon="IconSettings"
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
          <label class="f-label">No. Koreksi</label>
          <v-text-field
            :model-value="nomor || '<-- Kosong = Baru'"
            variant="outlined"
            density="compact"
            readonly
            hide-details
          />
          <div v-if="approvalBadge" class="mt-1">
            <v-chip size="small" :color="approvalBadge.color" variant="flat">
              {{ approvalBadge.text }}
            </v-chip>
          </div>
        </div>

        <div class="mb-3">
          <label class="f-label">Tanggal</label>
          <v-text-field
            v-model="tanggal"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
          />
        </div>

        <div class="mb-3">
          <label class="f-label">Gudang</label>
          <div class="d-flex align-center ga-1">
            <v-text-field
              :model-value="`${gdgKode} - ${gdgNama}`"
              variant="outlined"
              density="compact"
              readonly
              hide-details
              @click="gudangModalOpen = true"
              style="cursor: pointer"
            />
            <v-btn
              icon
              size="small"
              variant="tonal"
              color="primary"
              @click="gudangModalOpen = true"
            >
              <IconSearch :size="15" />
            </v-btn>
          </div>
        </div>

        <div class="mb-3">
          <label class="f-label">Keterangan</label>
          <v-textarea
            v-model="keterangan"
            variant="outlined"
            density="compact"
            rows="3"
            hide-details
          />
        </div>

        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="text-caption"
        >
          Note: Jumlah Koreksi adalah Jumlah yang ada pada pagi hari sebelum ada
          transaksi. Jika sudah ada transaksi, maka akan di akumulasi ke stok
          pagi.
        </v-alert>
      </div>
    </template>

    <!-- RIGHT COLUMN: Tabel Detail -->
    <template #right-column>
      <div class="desktop-form-section" style="flex: 1">
        <table class="detail-table">
          <thead>
            <tr>
              <th width="36" class="text-center">No</th>
              <th width="110">Kode</th>
              <th>Nama Barang</th>
              <th width="70" class="text-center">Satuan</th>
              <th width="90" class="tr">Stok Awal</th>
              <th width="90" class="tr">Jumlah</th>
              <th width="90" class="tr">Selisih</th>
              <th>Keterangan</th>
              <th width="36"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in rows" :key="idx">
              <td class="text-center">{{ idx + 1 }}</td>
              <td class="p0">
                <div class="cell-grp">
                  <input
                    v-model="row.kode"
                    class="ci"
                    style="
                      text-transform: uppercase;
                      font-weight: 600;
                      color: #1565c0;
                    "
                    placeholder="F1 / kode + Enter"
                    :readonly="!!row.nama"
                    autocomplete="off"
                    :name="`kode-koreksi-${idx}`"
                    @keydown="onKodeKeydown($event, idx)"
                    @keydown.enter.prevent="
                      ($event.target as HTMLInputElement).blur()
                    "
                    @blur="onKodeBlur(idx)"
                  />
                  <button
                    v-if="!row.nama"
                    type="button"
                    class="ci-btn"
                    title="Cari Barang (F1)"
                    @click="openBahanModal(idx)"
                  >
                    <IconSearch :size="11" />
                  </button>
                </div>
              </td>
              <td>{{ row.nama }}</td>
              <td class="text-center">{{ row.satuan }}</td>
              <td class="tr">{{ numFmt(row.stok) }}</td>
              <td>
                <input
                  v-model.number="row.jumlah"
                  type="number"
                  class="cell-input tr"
                  :disabled="!row.nama"
                  @input="onJumlahChange(row)"
                  v-select-on-focus
                />
              </td>
              <td
                class="tr font-weight-bold"
                :class="row.selisih < 0 ? 'text-red' : 'text-green'"
              >
                {{ numFmt(row.selisih) }}
              </td>
              <td>
                <input
                  v-model="row.ket"
                  class="cell-input"
                  :disabled="!row.nama"
                  placeholder="Keterangan detail..."
                />
              </td>
              <td class="text-center">
                <v-btn
                  v-if="row.kode"
                  icon
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="requestRemoveRow(idx)"
                >
                  <IconTrash :size="14" />
                </v-btn>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseForm>

  <BahanSearchModal v-model="bahanModalOpen" @selected="onBahanSelected" />
  <GudangBahanSearchModal
    v-model="gudangModalOpen"
    @selected="onGudangSelected"
  />

  <v-dialog v-model="deleteRowDialog" max-width="360">
    <v-card rounded="lg">
      <v-card-title class="text-subtitle-1 pa-4 d-flex align-center">
        <v-icon color="warning" class="mr-2">mdi-alert-circle-outline</v-icon>
        Hapus Baris?
      </v-card-title>
      <v-card-text class="pa-4 pt-0 text-body-2">
        Baris
        <b>{{ rowToDeleteIdx !== null ? rows[rowToDeleteIdx]?.nama : "" }}</b>
        akan dihapus dari daftar koreksi. Lanjutkan?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="deleteRowDialog = false">Batal</v-btn>
        <v-btn color="error" variant="elevated" @click="confirmRemoveRow"
          >Ya, Hapus</v-btn
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
  border: 1px solid transparent;
  padding: 4px 6px;
  font-size: 11px;
  outline: none;
  background: transparent;
}
.cell-input:not([disabled]):not([readonly]) {
  border-color: #ccc;
  background: white;
  border-radius: 3px;
}
.cell-input:focus {
  border-color: #1976d2;
}
.tr {
  text-align: right !important;
}
.cell-grp {
  display: flex;
  align-items: center;
  height: 25px;
}
.cell-grp .ci {
  flex: 1;
}
.ci {
  width: 100%;
  height: 25px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 5px;
  font-family: inherit;
  color: #212121;
}
.ci-btn {
  width: 22px;
  flex-shrink: 0;
  background: #eeeeee;
  border: none;
  border-left: 1px solid #e0e0e0;
  cursor: pointer;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ci-btn:hover {
  background: #e0e0e0;
}
</style>
