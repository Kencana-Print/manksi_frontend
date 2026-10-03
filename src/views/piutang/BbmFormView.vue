<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useTabsStore } from "@/stores/tabsStore";
import { useForm } from "@/composables/useForm";
import { bbmFormService } from "@/services/piutang/bbmFormService";
import BaseForm from "@/components/BaseForm.vue";
import CollapsiblePanel from "@/components/CollapsiblePanel.vue";
import CostCenterSearchModal from "@/components/lookups/CostCenterSearchModal.vue";
import {
  IconBuildingBank,
  IconPlus,
  IconTrash,
  IconSearch,
} from "@tabler/icons-vue";
import api from "@/services/api";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const tabsStore = useTabsStore();
const isEditMode = computed(() => !!route.params.nomor);

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

// ── Modal Account header — opsinya bergantung Cabang, refetch tiap
// cabang berubah (pola beda dari BKM/BKK, ikut backend asli) ──
const showHeaderAccModal = ref(false);
const headerAccOptions = ref<any[]>([]);
const headerAccSearch = ref("");
const filteredHeaderAccOptions = computed(() => {
  if (!headerAccSearch.value) return headerAccOptions.value;
  const q = headerAccSearch.value.toLowerCase();
  return headerAccOptions.value.filter(
    (a: any) =>
      a.kode.toLowerCase().includes(q) || a.nama.toLowerCase().includes(q),
  );
});
const loadHeaderAccOptions = async () => {
  try {
    const res = await bbmFormService.getAccountOptions(formData.value.Cabang);
    headerAccOptions.value = res.data.data || [];
  } catch (e) {
    console.error("Gagal memuat account header", e);
  }
};
const openHeaderAccModal = async () => {
  headerAccSearch.value = "";
  await loadHeaderAccOptions();
  showHeaderAccModal.value = true;
};
const setHeaderAcc = (item: any) => {
  formData.value.RekKode = item.kode;
  formData.value.RekNama = item.nama;
  showHeaderAccModal.value = false;
};

// ── Modal Account detail (semua) ──
const showRowAccModal = ref(false);
const rowAccOptions = ref<any[]>([]);
const rowAccSearch = ref("");
const activeRowIndex = ref(-1);
const filteredRowAccOptions = computed(() => {
  if (!rowAccSearch.value) return rowAccOptions.value;
  const q = rowAccSearch.value.toLowerCase();
  return rowAccOptions.value.filter(
    (a: any) =>
      a.kode.toLowerCase().includes(q) || a.nama.toLowerCase().includes(q),
  );
});
const openRowAccModal = async (idx: number) => {
  activeRowIndex.value = idx;
  rowAccSearch.value = "";
  if (rowAccOptions.value.length === 0) {
    try {
      const res = await bbmFormService.getAccountAll();
      rowAccOptions.value = res.data.data || [];
    } catch (e) {
      console.error("Gagal memuat account", e);
    }
  }
  showRowAccModal.value = true;
};
const setRowAcc = (item: any) => {
  const row = formData.value.Detail[activeRowIndex.value];
  if (row) {
    row.rekkode = item.kode;
    row.reknama = item.nama;
  }
  activeRowIndex.value = -1;
  showRowAccModal.value = false;
};
// ── Validasi kode Account header diketik manual (Enter/blur) ──
const onHeaderAccKodeEnter = async () => {
  const kode = (formData.value.RekKode || "").trim();
  if (!kode) {
    formData.value.RekNama = "";
    return;
  }
  try {
    const res = await bbmFormService.getAccountOptions(formData.value.Cabang);
    const items = res.data.data || [];
    const found = items.find(
      (i: any) => (i.kode || "").toUpperCase() === kode.toUpperCase(),
    );
    if (found) {
      formData.value.RekKode = found.kode;
      formData.value.RekNama = found.nama;
    } else {
      toast.error("Kode account tidak ditemukan untuk cabang ini.");
      formData.value.RekKode = "";
      formData.value.RekNama = "";
    }
  } catch {
    toast.error("Gagal validasi kode account.");
  }
};

// ── Validasi kode Account baris detail diketik manual (Enter/blur) ──
const onRowAccKodeEnter = async (row: any) => {
  const kode = (row.rekkode || "").trim();
  if (!kode) {
    row.reknama = "";
    return;
  }
  try {
    if (rowAccOptions.value.length === 0) {
      const res = await bbmFormService.getAccountAll();
      rowAccOptions.value = res.data.data || [];
    }
    const found = rowAccOptions.value.find(
      (i: any) => (i.kode || "").toUpperCase() === kode.toUpperCase(),
    );
    if (found) {
      row.rekkode = found.kode;
      row.reknama = found.nama;
    } else {
      toast.error("Kode account tidak ditemukan.");
      row.rekkode = "";
      row.reknama = "";
    }
  } catch {
    toast.error("Gagal validasi kode account.");
  }
};

// ── Cost Center + Detail CC digabung 1 lookup ──
const showRowCcModal = ref(false);
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
  menuId: "954",
  initialData,
  fetchApi: async () => {
    const res = await bbmFormService.getDetailForm(String(route.params.nomor));
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
      ? bbmFormService.update(payload)
      : bbmFormService.save(payload);
  },
  onSuccess: (res: any) => {
    toast.success("Data BBM berhasil disimpan.");
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

// Kalau Cabang diganti manual (mode create), Account header yang
// sudah dipilih jadi tidak valid lagi utk cabang baru — reset.
watch(
  () => formData.value.Cabang,
  () => {
    if (!isEditMode.value) {
      formData.value.RekKode = "";
      formData.value.RekNama = "";
    }
  },
);

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

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
const parseNum = (v: string) =>
  Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;

const onNominalFocus = (row: any, e: Event) => {
  (e.target as HTMLInputElement).value = row.nominal ? String(row.nominal) : "";
};
const onNominalInput = (row: any, e: Event) => {
  row.nominal = Math.max(0, parseNum((e.target as HTMLInputElement).value));
};
const onNominalBlur = (row: any, e: Event) => {
  (e.target as HTMLInputElement).value = numFmt(row.nominal);
};

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
  router.push("/piutang/bbm");
};
const pilihCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/piutang/bbm/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  tabsStore.closeTab(route.path);
  router.push("/piutang/bbm");
};
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? 'Ubah Bukti Bank Masuk (BBM)'
        : 'Tambah Bukti Bank Masuk (BBM)'
    "
    menu-id="954"
    :icon="IconBuildingBank"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="BBM"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="bbm-layout">
      <!-- ══ KOLOM KIRI: Informasi BBM ══ -->
      <CollapsiblePanel width="300px">
        <div class="bbm-left">
          <div class="bbm-section">
            <div class="bbm-sec-title">Informasi BBM</div>

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

            <div class="f-field">
              <label class="f-lbl">Nomor BBM</label>
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
                  v-model="formData.RekKode"
                  class="f-inp-in"
                  style="width: 90px"
                  placeholder="Kode"
                  @keydown.enter.prevent="onHeaderAccKodeEnter"
                  @blur="onHeaderAccKodeEnter"
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
          </div>

          <div class="total-box">
            <span>Total BBM</span>
            <span>{{ numFmt(totalNominal) }}</span>
          </div>
        </div>
      </CollapsiblePanel>

      <!-- ══ KOLOM KANAN: Detail Penerimaan ══ -->
      <div class="bbm-right">
        <div class="bbm-sec-header">
          <span class="bbm-sec-title">Detail Penerimaan</span>
          <button type="button" class="btn-add" @click="addRow">
            <IconPlus :size="14" class="mr-1" /> Tambah Baris
          </button>
        </div>

        <div class="bbm-table-wrap">
          <table class="bbm-table">
            <thead>
              <tr>
                <th style="width: 40px" class="text-center">No</th>
                <th style="min-width: 200px">Uraian</th>
                <th style="width: 120px" class="text-right">Nominal</th>
                <th style="width: 90px">Account</th>
                <th style="min-width: 160px">Nama Account</th>
                <th style="min-width: 200px">Cost Center</th>
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
                    placeholder="Uraian penerimaan"
                  />
                </td>
                <td class="td-inp">
                  <input
                    :value="numFmt(row.nominal)"
                    type="text"
                    inputmode="numeric"
                    class="cell tr"
                    @focus="onNominalFocus(row, $event)"
                    @input="onNominalInput(row, $event)"
                    @blur="onNominalBlur(row, $event)"
                  />
                </td>
                <td class="td-inp">
                  <div class="cell-igrp">
                    <input
                      v-model="row.rekkode"
                      class="cell"
                      style="width: 70px; flex-shrink: 0"
                      placeholder="Kode"
                      @keydown.enter.prevent="onRowAccKodeEnter(row)"
                      @blur="onRowAccKodeEnter(row)"
                    />
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
                    <span class="cell-val">
                      {{
                        row.ccnama
                          ? row.dcnama
                            ? `${row.ccnama} - ${row.dcnama}`
                            : row.ccnama
                          : "-"
                      }}
                    </span>
                    <button
                      type="button"
                      class="cell-search"
                      @click="openRowCcModal(Number(idx))"
                    >
                      <IconSearch :size="12" color="#1565c0" />
                    </button>
                  </div>
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
                <td colspan="7" class="text-center text-grey py-4 font-italic">
                  Belum ada baris detail. Klik "Tambah Baris".
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </BaseForm>

  <!-- Modal Account header (bergantung Cabang) -->
  <v-dialog v-model="showHeaderAccModal" max-width="550px">
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Pilih Account Bank ({{ formData.Cabang }})
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="headerAccSearch"
          class="f-inp mb-2"
          placeholder="Cari kode atau nama..."
          autofocus
        />
        <div style="max-height: 340px; overflow-y: auto">
          <table class="mini-table">
            <thead>
              <tr>
                <th style="width: 90px">Kode</th>
                <th>Nama</th>
                <th style="width: 140px">Rekening</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="a in filteredHeaderAccOptions"
                :key="a.kode"
                class="mini-row"
                @click="setHeaderAcc(a)"
              >
                <td>{{ a.kode }}</td>
                <td>{{ a.nama }}</td>
                <td>{{ a.rekening || "-" }}</td>
              </tr>
              <tr v-if="filteredHeaderAccOptions.length === 0">
                <td colspan="3" class="text-center text-grey py-3">
                  Tidak ada hasil
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Modal Account detail (semua) -->
  <v-dialog v-model="showRowAccModal" max-width="500px">
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Pilih Account
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="rowAccSearch"
          class="f-inp mb-2"
          placeholder="Cari kode atau nama..."
          autofocus
        />
        <div style="max-height: 340px; overflow-y: auto">
          <table class="mini-table">
            <thead>
              <tr>
                <th style="width: 90px">Kode</th>
                <th>Nama</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="a in filteredRowAccOptions"
                :key="a.kode"
                class="mini-row"
                @click="setRowAcc(a)"
              >
                <td>{{ a.kode }}</td>
                <td>{{ a.nama }}</td>
              </tr>
              <tr v-if="filteredRowAccOptions.length === 0">
                <td colspan="2" class="text-center text-grey py-3">
                  Tidak ada hasil
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <CostCenterSearchModal v-model="showRowCcModal" @selected="setRowCc" />

  <v-dialog v-model="showPrintDialog" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconBuildingBank :size="18" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold">BBM Tersimpan</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-3 text-grey-darken-3">
          BBM <b class="text-primary">{{ savedNomor }}</b> berhasil disimpan.
          Cetak sekarang?
        </div>
        <v-btn color="primary" variant="flat" block @click="pilihCetak">
          Cetak BBM
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
.bbm-layout {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.bbm-left {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bbm-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.bbm-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
}
.bbm-sec-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.bbm-sec-header {
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
.bbm-table-wrap {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
}
.bbm-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}
.bbm-table thead th {
  background: #1565c0;
  color: white;
  font-weight: 600;
  padding: 6px;
  position: sticky;
  top: 0;
  font-size: 11px;
  border: 1px solid #0d47a1;
}
.bbm-table td {
  border: 1px solid #eeeeee;
}
.bbm-table tr:nth-of-type(even) td {
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
.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.mini-table th {
  background: #f5f5f5;
  padding: 6px 8px;
  text-align: left;
  border-bottom: 2px solid #e0e0e0;
  font-size: 11px;
  font-weight: 700;
  position: sticky;
  top: 0;
}
.mini-table td {
  padding: 5px 8px;
  border-bottom: 1px solid #f0f0f0;
}
.mini-row {
  cursor: pointer;
}
.mini-row:hover td {
  background: #e3f2fd;
}
</style>
