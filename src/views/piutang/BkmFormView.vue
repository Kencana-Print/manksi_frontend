<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useTabsStore } from "@/stores/tabsStore";
import { useForm } from "@/composables/useForm";
import { bkmFormService } from "@/services/piutang/bkmFormService";
import api from "@/services/api";
import BaseForm from "@/components/BaseForm.vue";
import AccountSearchModal from "@/components/lookups/AccountSearchModal.vue";
import CostCenterSearchModal from "@/components/lookups/CostCenterSearchModal.vue";
import {
  IconReceipt,
  IconPlus,
  IconTrash,
  IconSearch,
} from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const tabsStore = useTabsStore();
const isEditMode = computed(() => !!route.params.nomor);

// Cabang diambil dari backend, dibatasi hanya HO-, P01, P04
const ALLOWED_CABANG = ["HO-", "P01", "P04"];
const listCabang = ref<{ kode: string; nama: string }[]>([]);

const loadCabang = async () => {
  try {
    const res = await api.get("/lookups/cabang-pabrik");
    const items = res.data.data?.items || res.data.data || [];
    listCabang.value = items
      .map((c: any) => ({
        kode: c.pab_kode || c.Kode,
        nama: c.pab_nama || c.Nama,
      }))
      .filter((c: any) => ALLOWED_CABANG.includes(c.kode));
  } catch (e) {
    console.error("Gagal load cabang", e);
  }
};
const showPrintDialog = ref(false);
const savedNomor = ref("");

// ── Modal state ──
const showHeaderAccModal = ref(false);
const showRowAccModal = ref(false);
const showRowCcModal = ref(false);
const activeRowIndex = ref(-1);

const initialData = {
  Nomor: "",
  Tanggal: new Date().toISOString().substring(0, 10),
  Cabang: "P01",
  CabangOld: "",
  RekKode: "",
  RekNama: "",
  Penerima: "",
  Nota: "",
  Keterangan: "",
  Detail: [] as any[],
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
} = useForm({
  menuId: "952",
  initialData,
  fetchApi: async () => {
    const res = await bkmFormService.getDetailForm(String(route.params.nomor));
    const d = res.data.data;
    return {
      Nomor: d.nomor,
      Tanggal: d.tanggal,
      Cabang: d.cabang,
      CabangOld: d.cabang_old,
      RekKode: d.rek_kode,
      RekNama: d.rek_nama,
      Penerima: d.penerima,
      Nota: d.nota,
      Keterangan: d.keterangan,
      Detail: d.detail || [],
    };
  },
  submitApi: async (data) => {
    const payload = {
      nomor: data.Nomor,
      tanggal: data.Tanggal,
      cabang: data.Cabang,
      cabang_old: data.CabangOld,
      rek_kode: data.RekKode,
      penerima: data.Penerima,
      nota: data.Nota,
      keterangan: data.Keterangan,
      detail: data.Detail,
    };
    return isEditMode.value
      ? bkmFormService.update(payload)
      : bkmFormService.save(payload);
  },
  onSuccess: (res: any) => {
    toast.success("Data BKM berhasil disimpan.");
    savedNomor.value = res.data?.data?.nomor || formData.value.Nomor;
    showPrintDialog.value = true;
  },
});

onMounted(async () => {
  await loadCabang();
  if (isEditMode.value) {
    await fetchData();
  }
});

// ── Header Account ──
const openHeaderAccModal = () => {
  showHeaderAccModal.value = true;
};
const setHeaderAcc = (item: any) => {
  formData.value.RekKode = item.Kode;
  formData.value.RekNama = item.Nama;
};

// ── Detail grid ──
const addRow = () => {
  formData.value.Detail.push({
    no: formData.value.Detail.length + 1,
    uraian: "",
    nominal: 0,
    rekkode: "",
    reknama: "",
    cckode: 0,
    ccnama: "",
    dcnama: "",
  });
};

const removeRow = (idx: number) => {
  formData.value.Detail.splice(idx, 1);
};

const totalNominal = computed(() =>
  formData.value.Detail.reduce(
    (sum: number, d: any) => sum + (Number(d.nominal) || 0),
    0,
  ),
);

// ── Row Account modal ──
const openRowAccModal = (idx: number) => {
  activeRowIndex.value = idx;
  showRowAccModal.value = true;
};
const setRowAcc = (item: any) => {
  const row = formData.value.Detail[activeRowIndex.value];
  if (row) {
    row.rekkode = item.Kode;
    row.reknama = item.Nama;
  }
  activeRowIndex.value = -1;
};

// ── Row Cost Center modal — satu selection mengisi Cost Center +
// Detail CC sekaligus (lihat catatan di atas: dc_kode tidak pernah
// disimpan backend, jurd_dcnama murni text) ──
const openRowCcModal = (idx: number) => {
  activeRowIndex.value = idx;
  showRowCcModal.value = true;
};
const setRowCc = (item: any) => {
  const row = formData.value.Detail[activeRowIndex.value];
  if (row) {
    row.cckode = item.cc_kode;
    row.ccnama = item.cc_nama;
    row.dcnama = item.dc_nama;
  }
  activeRowIndex.value = -1;
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

// ── Validasi ──
const validateSave = () => {
  if (!formData.value.Cabang) {
    toast.warning("Cabang wajib diisi.");
    return;
  }
  if (!formData.value.RekKode) {
    toast.warning("Account (Header) wajib dipilih.");
    return;
  }
  if (!formData.value.Detail || formData.value.Detail.length === 0) {
    toast.warning("Minimal harus ada 1 baris detail.");
    return;
  }
  const validRows = formData.value.Detail.filter((d: any) => d.uraian);
  if (validRows.length === 0) {
    toast.warning("Minimal 1 baris detail harus memiliki uraian.");
    return;
  }
  for (const row of validRows) {
    if (!Number(row.nominal) || Number(row.nominal) <= 0) {
      toast.warning(`Nominal untuk "${row.uraian}" harus lebih dari 0.`);
      return;
    }
  }
  showSaveDialog.value = true;
};

// ── Dialog cetak ──
const closePrintAndExit = () => {
  showPrintDialog.value = false;
  tabsStore.closeTab(route.path);
  router.push("/piutang/bkm");
};
const pilihCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/piutang/bkm/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  tabsStore.closeTab(route.path);
  router.push("/piutang/bkm");
};
</script>

<template>
  <BaseForm
    :title="
      isEditMode ? 'Ubah Bukti Kas Masuk (BKM)' : 'Tambah Bukti Kas Masuk (BKM)'
    "
    menu-id="952"
    :icon="IconReceipt"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="BKM"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="bkm-layout">
      <!-- ══ KOLOM KIRI: Informasi BKM ══ -->
      <div class="bkm-left">
        <div class="bkm-section">
          <div class="bkm-sec-title">Informasi BKM</div>

          <div class="f-field">
            <label class="f-lbl">Nomor BKM</label>
            <input
              :value="formData.Nomor || 'Otomatis'"
              readonly
              class="f-inp f-ro"
            />
          </div>

          <div class="f-field">
            <label class="f-lbl">Tanggal</label>
            <input type="date" v-model="formData.Tanggal" class="f-inp" />
          </div>

          <div class="f-field">
            <label class="f-lbl">Account <span class="req">*</span></label>
            <div class="igrp">
              <input
                :value="formData.RekKode"
                readonly
                class="f-inp-in"
                style="width: 90px"
              />
              <input
                :value="formData.RekNama"
                readonly
                class="f-inp-in f-ro"
                style="flex: 1"
              />
              <button type="button" class="blkp" @click="openHeaderAccModal">
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
          </div>

          <div class="f-field">
            <label class="f-lbl">Diterima Dari</label>
            <input
              v-model="formData.Penerima"
              class="f-inp"
              placeholder="Nama pemberi"
            />
          </div>

          <div class="f-field">
            <label class="f-lbl">No. Nota</label>
            <input
              v-model="formData.Nota"
              class="f-inp"
              placeholder="No. nota"
            />
          </div>

          <div class="f-field">
            <label class="f-lbl">Keterangan</label>
            <input
              v-model="formData.Keterangan"
              class="f-inp"
              placeholder="Keterangan penerimaan"
            />
          </div>

          <div class="f-field">
            <label class="f-lbl">Cabang</label>
            <select
              v-model="formData.Cabang"
              class="f-inp f-sel"
              :disabled="isEditMode"
            >
              <option v-for="c in listCabang" :key="c.kode" :value="c.kode">
                {{ c.kode }} - {{ c.nama }}
              </option>
            </select>
          </div>
        </div>

        <div class="total-box">
          <span>Total BKM</span>
          <span>{{ numFmt(totalNominal) }}</span>
        </div>
      </div>

      <!-- ══ KOLOM KANAN: Detail Penerimaan ══ -->
      <div class="bkm-right">
        <div class="bkm-sec-header">
          <span class="bkm-sec-title">Detail Penerimaan</span>
          <button type="button" class="btn-add" @click="addRow">
            <IconPlus :size="14" class="mr-1" /> Tambah Baris
          </button>
        </div>

        <div class="bkm-table-wrap">
          <table class="bkm-table">
            <thead>
              <tr>
                <th style="width: 40px" class="text-center">No</th>
                <th style="min-width: 200px">Uraian</th>
                <th style="width: 120px" class="text-right">Nominal</th>
                <th style="width: 90px">Account</th>
                <th style="min-width: 160px">Nama Account</th>
                <th style="min-width: 150px">Cost Center</th>
                <th style="min-width: 150px">Detail CC</th>
                <th style="width: 40px" class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in formData.Detail" :key="idx">
                <td class="td-ctr">{{ Number(idx) + 1 }}</td>
                <td class="td-inp">
                  <input
                    v-model="row.uraian"
                    class="cell"
                    placeholder="Keterangan penerimaan"
                  />
                </td>
                <td class="td-inp">
                  <input
                    type="number"
                    v-model.number="row.nominal"
                    class="cell tr"
                    v-select-on-focus
                  />
                </td>
                <td class="td-inp">
                  <div class="cell-igrp">
                    <span class="cell-val">{{ row.rekkode || "-" }}</span>
                    <button
                      type="button"
                      class="cell-search"
                      @click="openRowAccModal(Number(idx))"
                    >
                      <IconSearch :size="12" color="#1565c0" />
                    </button>
                  </div>
                </td>
                <td class="td-inp">
                  <span class="cell-val-ro">{{ row.reknama || "-" }}</span>
                </td>
                <td class="td-inp">
                  <div class="cell-igrp">
                    <span class="cell-val">{{ row.ccnama || "-" }}</span>
                    <button
                      type="button"
                      class="cell-search"
                      @click="openRowCcModal(Number(idx))"
                    >
                      <IconSearch :size="12" color="#1565c0" />
                    </button>
                  </div>
                </td>
                <td class="td-inp">
                  <span class="cell-val-ro">{{ row.dcnama || "-" }}</span>
                </td>
                <td class="td-ctr">
                  <button
                    type="button"
                    class="btn-del"
                    @click="removeRow(Number(idx))"
                  >
                    <IconTrash :size="14" />
                  </button>
                </td>
              </tr>
              <tr v-if="!formData.Detail || formData.Detail.length === 0">
                <td colspan="8" class="text-center text-grey py-4 font-italic">
                  Belum ada baris detail. Klik "Tambah Baris".
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </BaseForm>

  <AccountSearchModal
    v-model="showHeaderAccModal"
    jenis="KAS"
    @selected="setHeaderAcc"
  />
  <AccountSearchModal
    v-model="showRowAccModal"
    jenis="ALL"
    @selected="setRowAcc"
  />
  <CostCenterSearchModal v-model="showRowCcModal" @selected="setRowCc" />

  <v-dialog v-model="showPrintDialog" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconReceipt :size="18" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold">BKM Tersimpan</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-3 text-grey-darken-3">
          BKM <b class="text-primary">{{ savedNomor }}</b> berhasil disimpan.
          Cetak sekarang?
        </div>
        <v-btn color="primary" variant="flat" block @click="pilihCetak">
          Cetak BKM
        </v-btn>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="grey-darken-1" @click="closePrintAndExit"
          >Tutup (Tidak Cetak)</v-btn
        >
        <v-spacer />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.bkm-layout {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.bkm-left {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bkm-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.bkm-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
}
.bkm-sec-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.bkm-sec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.f-field {
  margin-bottom: 8px;
}
.f-lbl {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  margin-bottom: 3px;
}
.req {
  color: #e53935;
}
.f-inp {
  width: 100%;
  height: 30px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  background: white;
  box-sizing: border-box;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-inp.f-ro {
  background: #f5f5f5;
  color: #616161;
}
.f-sel {
  cursor: pointer;
}

.igrp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 30px;
  background: white;
}
.f-inp-in {
  border: none;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.f-inp-in + .f-inp-in {
  border-left: 1px solid #e0e0e0;
}
.f-inp-in.f-ro {
  background: #f5f5f5;
  color: #616161;
}
.blkp {
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
.blkp:hover {
  background: #bbdefb;
}

.total-box {
  background: #1565c0;
  color: white;
  border-radius: 4px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 13px;
}

.btn-add {
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.btn-add:hover {
  background: #0d47a1;
}

.bkm-table-wrap {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
}
.bkm-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}
.bkm-table thead th {
  background: #1565c0;
  color: white;
  font-weight: 600;
  padding: 6px;
  position: sticky;
  top: 0;
  font-size: 11px;
  border: 1px solid #0d47a1;
}
.bkm-table td {
  border: 1px solid #eeeeee;
}
.bkm-table tr:nth-of-type(even) td {
  background: #fafafa;
}
.td-ctr {
  text-align: center;
  padding: 4px 6px;
}
.td-inp {
  padding: 0;
}
.cell {
  width: 100%;
  height: 30px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 6px;
  font-family: inherit;
  color: #212121;
}
.cell:focus {
  background: #e3f2fd;
}
.cell.tr {
  text-align: right;
}
.cell-igrp {
  display: flex;
  align-items: center;
  height: 30px;
}
.cell-val {
  flex: 1;
  padding: 0 6px;
  font-size: 11px;
  color: #212121;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cell-val-ro {
  display: block;
  padding: 0 6px;
  font-size: 11px;
  color: #616161;
  line-height: 30px;
}
.cell-search {
  width: 26px;
  height: 100%;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #e0e0e0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cell-search:hover {
  background: #bbdefb;
}
.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 2px;
}
.btn-del:hover {
  background: #ffebee;
  border-radius: 3px;
}
</style>
