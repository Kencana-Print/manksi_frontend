<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import { IconShoppingCart, IconSearch } from "@tabler/icons-vue";
import { pesanError } from "@/services/piutang/rekapPembayaranService";
import { useAuthStore } from "@/stores/authStore";
import {
  permintaanPembelianBahanFormService,
  type PermintaanPembelianBahanLoaded,
  type PermintaanPembelianBahanPayload,
} from "@/services/garmen/permintaanPembelianBahanFormService";

interface BahanRow {
  kode: string;
  nama: string;
  setting: string;
  satuan: string;
  jumlah: number | null;
  keterangan: string;
}

interface PembelianHeader {
  nomor: string;
  tanggal: string;
  keterangan: string;
  cab: string;
  status: string;
}

interface PembelianFormData {
  header: PembelianHeader;
  dtl: BahanRow[];
}

interface BahanItem {
  Kode: string;
  Nama: string;
  Satuan: string;
  Setting?: string;
}

// Cermin aturan server: cabang spanduk hanya bahan SB, cabang lain hanya non-SB
const CAB_SPANDUK = ["P02", "P05"];
const MAX_JUMLAH = 999999.99;

const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

const isEditMode = computed(() => !!route.params.nomor);

const todayLocal = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
})();

const newRow = (): BahanRow => ({
  kode: "",
  nama: "",
  setting: "",
  satuan: "",
  jumlah: null,
  keterangan: "",
});

const isBlank = (r: BahanRow): boolean =>
  !r.kode && !(Number(r.jumlah) > 0) && !r.keterangan.trim();

const defaultData: PembelianFormData = {
  header: {
    nomor: "",
    tanggal: todayLocal,
    keterangan: "",
    cab: "",
    status: "",
  },
  dtl: [newRow()],
};

const toRows = (d: PermintaanPembelianBahanLoaded): BahanRow[] =>
  d.detail.map((x) => ({
    kode: x.Kode,
    nama: x.Nama,
    setting: x.Setting ?? "",
    satuan: x.Satuan,
    jumlah: Number(x.Jumlah),
    keterangan: x.Keterangan ?? "",
  }));

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
} = useForm<PembelianFormData>({
  menuId: "190",
  initialData: defaultData,
  fetchApi: async (): Promise<PembelianFormData> => {
    const res = await permintaanPembelianBahanFormService.getDetail(
      String(route.params.nomor),
    );
    const d = res.data.data as PermintaanPembelianBahanLoaded;
    const rows = toRows(d);
    return {
      header: {
        nomor: d.header.Nomor,
        tanggal: d.header.Tanggal,
        keterangan: d.header.Keterangan ?? "",
        cab: d.header.Cab,
        status: d.header.Status,
      },
      dtl: rows.length ? rows : [newRow()],
    };
  },
  submitApi: async (data: PembelianFormData): Promise<unknown> => {
    const payload: PermintaanPembelianBahanPayload = {
      tanggal: data.header.tanggal,
      keterangan: data.header.keterangan.trim(),
      items: data.dtl
        .filter((r) => !isBlank(r))
        .map((r) => ({
          kode: r.kode,
          jumlah: Number(r.jumlah) || 0,
          keterangan: r.keterangan.trim(),
        })),
    };
    return isEditMode.value
      ? await permintaanPembelianBahanFormService.update(
          data.header.nomor,
          payload,
        )
      : await permintaanPembelianBahanFormService.save(payload);
  },
  onSuccess: () => {
    toast.success("Permintaan Pembelian Bahan tersimpan.");
    goBack();
  },
});

// ── Cabang dokumen & aturan jenis bahan ──
const cabDokumen = computed(() =>
  isEditMode.value
    ? formData.value.header.cab
    : String(authStore.user?.cabang || "HO-"),
);

const jenisSesuai = (kode: string): boolean =>
  kode.startsWith("SB") === CAB_SPANDUK.includes(cabDokumen.value);

// ── Aksi baris ──
const editable = computed(() =>
  isEditMode.value ? formData.value.header.status === "" : true,
);

const addRow = () => {
  formData.value.dtl.push(newRow());
};

const removeRow = (idx: number) => {
  if (formData.value.dtl.length <= 1) {
    formData.value.dtl[0] = newRow();
    return;
  }
  formData.value.dtl.splice(idx, 1);
};

const showBahanModal = ref(false);
const modalIdx = ref(0);

const openBahan = (idx: number) => {
  modalIdx.value = idx;
  showBahanModal.value = true;
};

const onBahanSelected = (item: BahanItem) => {
  const row = formData.value.dtl[modalIdx.value];
  if (!row) return;
  if (!jenisSesuai(item.Kode)) {
    toast.warning(
      `Bahan ${item.Kode} tidak sesuai jenis bahan cabang ${cabDokumen.value}.`,
    );
    return;
  }
  const dobel = formData.value.dtl.some(
    (r, i) => i !== modalIdx.value && r.kode === item.Kode,
  );
  if (dobel) {
    toast.warning(`Bahan ${item.Kode} sudah ada di baris lain.`);
    return;
  }
  row.kode = item.Kode;
  row.nama = item.Nama;
  row.satuan = item.Satuan;
  row.setting = item.Setting ?? "";
};

const onEnterNext = (e: KeyboardEvent) => {
  const target = e.target as HTMLInputElement;
  const table = target.closest("table");
  if (!table) return;
  const fields = Array.from(
    table.querySelectorAll<HTMLInputElement>(
      "input:not([readonly]):not([disabled])",
    ),
  );
  const next = fields[fields.indexOf(target) + 1];
  if (!next) return;
  next.focus();
  next.select();
};

// ── Ringkasan ──
const rowsTerisi = computed(() =>
  formData.value.dtl.filter((r) => !isBlank(r)),
);
const totalJumlah = computed(() =>
  rowsTerisi.value.reduce((s, r) => s + (Number(r.jumlah) || 0), 0),
);

// ── Validasi (cermin aturan server; server tetap penentu) ──
const validateSave = () => {
  const h = formData.value.header;
  if (isEditMode.value && !editable.value) {
    return toast.warning("Permintaan ini tidak dapat diubah.");
  }
  if (!h.tanggal) return toast.warning("Tanggal wajib diisi.");
  if (rowsTerisi.value.length === 0) {
    return toast.warning("Minimal satu baris bahan harus diisi.");
  }

  const seen = new Set<string>();
  for (const [i, r] of rowsTerisi.value.entries()) {
    const no = i + 1;
    if (!r.kode) return toast.warning(`Baris ${no}: bahan wajib diisi.`);
    if (!jenisSesuai(r.kode)) {
      return toast.warning(
        `Baris ${no}: bahan tidak sesuai jenis bahan cabang ${cabDokumen.value}.`,
      );
    }
    const jml = Number(r.jumlah);
    if (!Number.isFinite(jml) || jml <= 0) {
      return toast.warning(`Baris ${no}: jumlah harus lebih dari 0.`);
    }
    if (jml > MAX_JUMLAH) {
      return toast.warning(`Baris ${no}: jumlah melebihi batas.`);
    }
    if (seen.has(r.kode)) {
      return toast.warning(`Baris ${no}: bahan ${r.kode} sudah ada.`);
    }
    seen.add(r.kode);
  }
  showSaveDialog.value = true;
};

const fmtJml = (v: number): string =>
  v.toLocaleString("id-ID", { maximumFractionDigits: 2 });

// Pesan error umum dari simpan sudah ditangani useForm; helper ini untuk jaga-jaga
void pesanError;
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? 'Ubah Permintaan Pembelian Bahan'
        : 'Tambah Permintaan Pembelian Bahan'
    "
    menu-id="190"
    item-name="Permintaan Pembelian Bahan"
    :icon="IconShoppingCart"
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
    <!-- ══ KOLOM KIRI: HEADER ══ -->
    <template #left-column>
      <div class="pb-left">
        <div class="fr">
          <label class="lbl">Nomor</label>
          <input
            :value="formData.header.nomor"
            readonly
            class="inp ro"
            style="flex: 1"
            placeholder="Otomatis"
          />
        </div>
        <div class="fr">
          <label class="lbl">Cabang</label>
          <input
            :value="cabDokumen"
            readonly
            class="inp ro"
            style="width: 80px"
          />
        </div>
        <div class="fr">
          <label class="lbl fw">Tanggal</label>
          <input
            type="date"
            v-model="formData.header.tanggal"
            class="idate"
            style="width: 150px"
            :disabled="!editable"
          />
        </div>
        <div class="fr" style="align-items: flex-start">
          <label class="lbl" style="padding-top: 4px">Keterangan</label>
          <textarea
            v-model="formData.header.keterangan"
            class="ta"
            rows="3"
            maxlength="200"
            style="flex: 1"
            :disabled="!editable"
          />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">Jumlah Item</label>
          <input
            :value="rowsTerisi.length"
            readonly
            class="inp ro"
            style="width: 80px"
          />
          <label class="lbl" style="width: 85px">Total</label>
          <input
            :value="fmtJml(totalJumlah)"
            readonly
            class="inp ro"
            style="width: 90px"
          />
        </div>

        <div v-if="isEditMode && !editable" class="warn-box">
          Permintaan ini sudah {{ formData.header.status }}, tidak dapat diubah.
        </div>
      </div>
    </template>

    <!-- ══ KOLOM KANAN: DETAIL ══ -->
    <template #right-column>
      <div class="pb-right">
        <div class="tbl-header">
          <span class="tbl-title">Detail Bahan</span>
          <button
            type="button"
            class="btn-add"
            :disabled="!editable"
            @click="addRow"
          >
            + Tambah Baris
          </button>
        </div>
        <div class="tbl-wrap" style="min-height: 50vh; max-height: 78vh">
          <table class="gt" style="min-width: 950px">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 170px">Kode Bahan</th>
                <th style="width: 290px">Nama Bahan</th>
                <th style="width: 130px">Setting</th>
                <th style="width: 70px">Satuan</th>
                <th style="width: 100px" class="tr">Jumlah</th>
                <th style="width: 240px">Keterangan</th>
                <th style="width: 32px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in formData.dtl" :key="idx">
                <td class="tc gt-lbl">{{ idx + 1 }}</td>
                <td class="p0">
                  <div class="cell-flex">
                    <input
                      :value="row.kode"
                      readonly
                      class="ci ro"
                      placeholder="Klik cari..."
                    />
                    <button
                      type="button"
                      class="btn-mini"
                      :disabled="!editable"
                      @click="openBahan(idx)"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>
                <td class="px-1" :title="row.nama">{{ row.nama }}</td>
                <td class="px-1">{{ row.setting }}</td>
                <td class="px-1">{{ row.satuan }}</td>
                <td class="p0">
                  <input
                    v-model.number="row.jumlah"
                    type="number"
                    min="0.01"
                    step="0.01"
                    class="ci tr"
                    :disabled="!editable"
                    @keydown.enter.prevent="onEnterNext"
                    v-select-on-focus
                  />
                </td>
                <td class="p0">
                  <input
                    v-model="row.keterangan"
                    class="ci"
                    maxlength="150"
                    :disabled="!editable"
                    @keydown.enter.prevent="onEnterNext"
                  />
                </td>
                <td class="tc">
                  <button
                    type="button"
                    class="btn-del"
                    :disabled="!editable"
                    @click="removeRow(idx)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" class="tr">TOTAL</td>
                <td class="tr">{{ fmtJml(totalJumlah) }}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="legend">
          Satuan mengikuti master bahan. Satu bahan hanya boleh satu baris per
          dokumen.
        </div>
      </div>
    </template>
  </BaseForm>

  <BahanSearchModal
    v-model="showBahanModal"
    :tipe="CAB_SPANDUK.includes(cabDokumen) ? 'SPANDUK' : undefined"
    @selected="onBahanSelected"
  />
</template>

<style scoped>
.pb-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 0;
  width: 100%;
}
.pb-right {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  min-height: 0;
  min-width: 0;
  overflow: auto;
}

.fr {
  display: flex;
  align-items: center;
  min-height: 24px;
  gap: 4px;
  width: 100%;
}
.lbl {
  width: 85px;
  flex-shrink: 0;
  font-weight: 600;
  color: #333;
  font-size: 11px;
  white-space: nowrap;
}
.fw {
  font-weight: 700;
}
.sep {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
  width: 100%;
}

.inp {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 5px;
  font-size: 11px;
  background: white;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  color: #212121;
  min-width: 0;
}
.inp:focus {
  border-color: #1565c0;
}
.ro {
  background: #dde8f0 !important;
  color: #444 !important;
}
.idate {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  outline: none;
  box-sizing: border-box;
}
.ta {
  border: 1px solid #a0a0a0;
  padding: 3px 5px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  resize: vertical;
}

.warn-box {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
  border-radius: 3px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
}

.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 5px 10px;
  border-radius: 3px 3px 0 0;
  flex-shrink: 0;
}
.tbl-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.btn-add {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 2px;
}
.btn-add:disabled {
  opacity: 0.5;
  cursor: default;
}
.tbl-wrap {
  overflow: auto;
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
  border-radius: 0 0 3px 3px;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.gt thead th {
  background: #f0f4f8;
  border: 1px solid #bdbdbd;
  padding: 4px 5px;
  font-size: 10px;
  font-weight: 700;
  color: #37474f;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}
.gt tbody td {
  border: 1px solid #e8e8e8;
  height: 26px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gt tbody tr:hover td {
  background: #e3f2fd !important;
}
.gt tfoot td {
  position: sticky;
  bottom: 0;
  z-index: 1;
  background: #fff9c4;
  border: 1px solid #bdbdbd;
  height: 26px;
  font-size: 11px;
  font-weight: 700;
  color: #37474f;
  white-space: nowrap;
  padding: 0 5px;
}
.p0 {
  padding: 0 !important;
}
.px-1 {
  padding: 0 5px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.gt-lbl {
  background: #f5f5f5 !important;
  color: #555;
  font-size: 10px;
}
.cell-flex {
  display: flex;
  align-items: center;
  width: 100%;
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
  box-sizing: border-box;
  min-width: 0;
}
.ci:disabled {
  color: #757575;
}
.ci:focus {
  background: #e3f2fd !important;
  outline: 1px solid #1976d2;
  outline-offset: -1px;
}
.ci.tr {
  text-align: right;
}
.btn-mini {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  background: #e0e0e0;
  border: none;
  border-left: 1px solid #a0a0a0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-mini:hover {
  background: #d0d0d0;
}
.btn-mini:disabled {
  opacity: 0.5;
  cursor: default;
}
.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  font-size: 11px;
}
.btn-del:hover {
  background: #ffebee;
  border-radius: 2px;
}
.btn-del:disabled {
  opacity: 0.4;
  cursor: default;
}
.legend {
  font-size: 10px;
  color: #555;
  margin-top: 4px;
}
</style>
