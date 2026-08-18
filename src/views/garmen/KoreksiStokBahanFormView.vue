<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import GudangBahanSearchModal from "@/components/lookups/GudangBahanSearchModal.vue";
import { koreksiStokBahanFormService } from "@/services/garmen/koreksiStokBahanFormService";
import { useForm } from "@/composables/useForm";
import { IconSettings, IconSearch, IconTrash } from "@tabler/icons-vue";

interface DetailRow {
  kode: string;
  nama: string;
  satuan: string;
  stok: number;
  jumlah: number;
  selisih: number;
  hpp: number;
  total: number;
  ket: string;
}

interface ApprovalState {
  status: string;
  urut: number | null;
}

interface KoreksiStokBahanFormData {
  nomor: string;
  tanggal: string;
  gdgKode: string;
  gdgNama: string;
  keterangan: string;
  approval: ApprovalState;
  rows: DetailRow[];
}

const route = useRoute();
const toast = useToast();

// nomor dari URL — dipakai sebagai identifier stabil untuk fetch/submit,
// gak ikut berubah selama komponen ini hidup (beda sama formData.nomor
// yang baru terisi setelah fetch sukses)
const nomorParam = route.params.nomor as string | undefined;

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

const ensureTrailingBlankRow = (rows: DetailRow[]) => {
  const last = rows[rows.length - 1];
  if (!last || last.kode) rows.push(blankRow());
};

// --- fetchApi: cabang edit vs create di satu tempat ---
const fetchApi = async (): Promise<KoreksiStokBahanFormData> => {
  if (nomorParam) {
    const res = await koreksiStokBahanFormService.getFormData(nomorParam);
    const d = res.data.data;
    const rows: DetailRow[] = d.detail.map((r: any) => ({
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
    ensureTrailingBlankRow(rows);
    return {
      nomor: d.header.nomor,
      tanggal: String(d.header.tanggal).substring(0, 10),
      gdgKode: d.header.gdgKode,
      gdgNama: d.header.gdgNama,
      keterangan: d.header.keterangan,
      approval: d.approval,
      rows,
    };
  }
  const res = await koreksiStokBahanFormService.getDefault();
  const d = res.data.data;
  return {
    nomor: "",
    tanggal: d.tanggal,
    gdgKode: d.gdgKode,
    gdgNama: d.gdgNama,
    keterangan: "",
    approval: { status: "", urut: null },
    rows: [blankRow()],
  };
};

// --- submitApi: toast sukses ditaruh di sini, bukan di caller —
// biar executeSave bawaan useForm bisa langsung goBack() setelahnya
// tanpa perlu onSuccess custom ---
const submitApi = async (data: KoreksiStokBahanFormData) => {
  const payload = {
    tanggal: data.tanggal,
    gdgKode: data.gdgKode,
    keterangan: data.keterangan,
    detail: data.rows
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
  const res = nomorParam
    ? await koreksiStokBahanFormService.update(nomorParam, payload)
    : await koreksiStokBahanFormService.create(payload);
  toast.success("Berhasil Simpan.");
  return res;
};

const {
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
} = useForm<KoreksiStokBahanFormData>({
  menuId: "115",
  initialData: {
    nomor: "",
    tanggal: "",
    gdgKode: "GB001",
    gdgNama: "",
    keterangan: "",
    approval: { status: "", urut: null },
    rows: [blankRow()],
  },
  fetchApi,
  submitApi,
  // immediate: false — kita panggil fetchData() manual di onMounted supaya
  // jalan di mode create JUGA (bawaan useForm cuma auto-fetch kalau
  // isEditMode true; di sini fetchApi sendiri yang membedakan cabangnya)
  immediate: false,
});

onMounted(fetchData);

const isEditMode = computed(() => !!nomorParam);

const approvalBadge = computed(() => {
  const map: Record<string, { text: string; color: string }> = {
    MINTA: { text: "Perlu Pengajuan Approval", color: "orange" },
    WAIT: { text: "Menunggu Approval", color: "blue" },
    ACC: { text: "Disetujui", color: "green" },
    TOLAK: { text: "Ditolak", color: "red" },
  };
  return map[formData.value.approval.status] || null;
});

// --- KONFIRMASI HAPUS BARIS ---
const deleteRowDialog = ref(false);
const rowToDeleteIdx = ref<number | null>(null);
const requestRemoveRow = (idx: number) => {
  rowToDeleteIdx.value = idx;
  deleteRowDialog.value = true;
};
const confirmRemoveRow = () => {
  if (rowToDeleteIdx.value === null) return;
  formData.value.rows.splice(rowToDeleteIdx.value, 1);
  ensureTrailingBlankRow(formData.value.rows);
  deleteRowDialog.value = false;
  rowToDeleteIdx.value = null;
};

const onJumlahChange = (row: DetailRow) => {
  row.selisih = Number(row.jumlah || 0) - Number(row.stok || 0);
  row.total = row.selisih * Number(row.hpp || 0);
};

// --- MODAL BAHAN ---
const bahanModalOpen = ref(false);
const activeRowIndex = ref<number | null>(null);
const openBahanModal = (idx: number) => {
  activeRowIndex.value = idx;
  bahanModalOpen.value = true;
};

const fetchBarangIntoRow = async (idx: number, kodeBaru: string) => {
  const dupIdx = formData.value.rows.findIndex(
    (r, i) => i !== idx && r.kode === kodeBaru,
  );
  if (dupIdx !== -1) {
    toast.warning(`Barang ini sudah di input, di baris ${dupIdx + 1}`);
    formData.value.rows[idx].kode = "";
    return;
  }
  try {
    const res = await koreksiStokBahanFormService.getBarang(kodeBaru, {
      gdgKode: formData.value.gdgKode,
      tanggal: formData.value.tanggal,
      nomorSedangDiedit: nomorParam || "",
    });
    const d = res.data.data;
    formData.value.rows[idx] = {
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
    ensureTrailingBlankRow(formData.value.rows);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data barang.");
    formData.value.rows[idx].kode = "";
  }
};

const onBahanSelected = (item: any) => {
  const idx = activeRowIndex.value;
  if (idx === null) return;
  fetchBarangIntoRow(idx, item.Kode);
};

const onKodeKeydown = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openBahanModal(idx);
  }
};

const onKodeBlur = (idx: number) => {
  const kode = (formData.value.rows[idx].kode || "").trim().toUpperCase();
  if (!kode) return;
  fetchBarangIntoRow(idx, kode);
};

// --- MODAL GUDANG ---
const gudangModalOpen = ref(false);
const onGudangSelected = async (item: any) => {
  try {
    const res = await koreksiStokBahanFormService.getGudang(item.Kode);
    formData.value.gdgKode = res.data.data.kode;
    formData.value.gdgNama = res.data.data.nama;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode gudang tsb tidak ada.");
  }
};

// --- VALIDASI LOKAL (sebelum buka dialog konfirmasi simpan) ---
const onValidateSave = () => {
  const data = formData.value;
  if (["MINTA", "WAIT", "TOLAK"].includes(data.approval.status)) {
    toast.warning(
      "Transaksi tsb sudah diclose. Silahkan minta approve untuk bisa menyimpan perubahan data.",
    );
    return;
  }
  if (!data.keterangan.trim()) {
    toast.error("Keterangan harus diisi.");
    return;
  }
  const filled = data.rows.filter((r) => r.kode);
  if (filled.length === 0) {
    toast.error("Detail barang harus diisi.");
    return;
  }
  for (const r of filled) {
    if (!r.ket.trim()) {
      toast.error("Detail Keterangan harus diisi.");
      return;
    }
  }
  showSaveDialog.value = true;
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? `Ubah Koreksi Stok - ${formData.nomor}`
        : 'Tambah Koreksi Stok'
    "
    menu-id="115"
    :icon="IconSettings"
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
          <label class="f-label">No. Koreksi</label>
          <v-text-field
            :model-value="formData.nomor || '<-- Kosong = Baru'"
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
            v-model="formData.tanggal"
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
              :model-value="`${formData.gdgKode} - ${formData.gdgNama}`"
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
            v-model="formData.keterangan"
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
            <tr v-for="(row, idx) in formData.rows" :key="idx">
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
        <b>{{
          rowToDeleteIdx !== null ? formData.rows[rowToDeleteIdx]?.nama : ""
        }}</b>
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
