<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import { useTabsStore } from "@/stores/tabsStore";
import { jurnalUmumFormService } from "@/services/piutang/jurnalUmumFormService";
import BaseForm from "@/components/BaseForm.vue";
import AccountSearchModal from "@/components/lookups/AccountSearchModal.vue";
import CostCenterSearchModal from "@/components/lookups/CostCenterSearchModal.vue";
import { IconBook, IconPlus, IconTrash, IconSearch } from "@tabler/icons-vue";
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

// ── Modal state ──
const showRowAccModal = ref(false);
const showRowCcModal = ref(false);
const activeRowIndex = ref(-1);
const rowAccOptions = ref<any[]>([]);

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
const onRowAccKodeEnter = async (row: any) => {
  const kode = (row.rekkode || "").trim();
  if (!kode) {
    row.reknama = "";
    return;
  }
  try {
    if (rowAccOptions.value.length === 0) {
      const res = await jurnalUmumFormService.getAccountAll();
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
  menuId: "956",
  initialData,
  fetchApi: async () => {
    const res = await jurnalUmumFormService.getDetailForm(
      String(route.params.nomor),
    );
    const d = res.data.data;
    return {
      Nomor: d.nomor,
      Tanggal: d.tanggal,
      Cabang: d.cabang,
      Keterangan: d.keterangan,
      Detail: d.detail || [],
    };
  },
  submitApi: async (data) => {
    const payload = {
      nomor: data.Nomor,
      tanggal: data.Tanggal,
      cabang: data.Cabang,
      keterangan: data.Keterangan,
      detail: data.Detail,
    };
    return isEditMode.value
      ? jurnalUmumFormService.update(payload)
      : jurnalUmumFormService.save(payload);
  },
  onSuccess: () => {
    toast.success("Data Jurnal Umum berhasil disimpan.");
    tabsStore.closeTab(route.path);
    router.push("/piutang/jurnal-umum");
  },
});

onMounted(async () => {
  await loadCabang();
  if (isEditMode.value) {
    await fetchData();
  } else {
    addRow();
  }
});

// ── Detail grid ──
const addRow = () => {
  formData.value.Detail.push({
    no: formData.value.Detail.length + 1,
    uraian: "",
    debet: 0,
    kredit: 0,
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

const totalDebet = computed(() =>
  formData.value.Detail.reduce(
    (sum: number, d: any) => sum + (Number(d.debet) || 0),
    0,
  ),
);
const totalKredit = computed(() =>
  formData.value.Detail.reduce(
    (sum: number, d: any) => sum + (Number(d.kredit) || 0),
    0,
  ),
);
const isBalance = computed(() => totalDebet.value === totalKredit.value);

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
const parseNum = (v: string) =>
  Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;

const onDebetFocus = (row: any, e: Event) => {
  (e.target as HTMLInputElement).value = row.debet ? String(row.debet) : "";
};
const onDebetInput = (row: any, e: Event) => {
  row.debet = Math.max(0, parseNum((e.target as HTMLInputElement).value));
};
const onDebetBlur = (row: any, e: Event) => {
  (e.target as HTMLInputElement).value = numFmt(row.debet);
};
const onKreditFocus = (row: any, e: Event) => {
  (e.target as HTMLInputElement).value = row.kredit ? String(row.kredit) : "";
};
const onKreditInput = (row: any, e: Event) => {
  row.kredit = Math.max(0, parseNum((e.target as HTMLInputElement).value));
};
const onKreditBlur = (row: any, e: Event) => {
  (e.target as HTMLInputElement).value = numFmt(row.kredit);
};

// ── Validasi ── (sesuai referensi: reknama wajib per baris, DC wajib
// kalau uraian terisi & prefix account bukan A/B)
const validateSave = () => {
  if (!isEditMode.value && !formData.value.Cabang) {
    toast.warning("Cabang wajib diisi.");
    return;
  }
  if (!formData.value.Keterangan?.trim()) {
    toast.warning("Keterangan harus diisi.");
    return;
  }
  if (!formData.value.Detail || formData.value.Detail.length === 0) {
    toast.warning("Minimal harus ada 1 baris detail.");
    return;
  }
  for (const row of formData.value.Detail) {
    if (!row.reknama) {
      toast.warning("Nama Account harus diisi pada semua baris.");
      return;
    }
    if (row.uraian?.trim() && Number(row.dckode) === 0) {
      const prefix = (row.rekkode || "").substring(0, 1);
      if (prefix !== "A" && prefix !== "B") {
        toast.warning(`Detail CC harus diisi pada baris: ${row.uraian}`);
        return;
      }
    }
  }
  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Jurnal Umum' : 'Tambah Jurnal Umum'"
    menu-id="956"
    :icon="IconBook"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Jurnal Umum"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="ju-layout">
      <!-- ══ KOLOM KIRI: Informasi Jurnal ══ -->
      <div class="ju-left">
        <div class="ju-section">
          <div class="ju-sec-title">Informasi Jurnal</div>

          <div class="f-field">
            <label class="f-lbl">Nomor Jurnal</label>
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
            <label class="f-lbl">Keterangan <span class="req">*</span></label>
            <input
              v-model="formData.Keterangan"
              class="f-inp"
              placeholder="Keterangan jurnal"
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

        <div class="total-wrap">
          <div class="total-row">
            <span>Total Debet</span>
            <span>{{ numFmt(totalDebet) }}</span>
          </div>
          <div class="total-row">
            <span>Total Kredit</span>
            <span>{{ numFmt(totalKredit) }}</span>
          </div>
          <div
            class="balance-row"
            :class="isBalance ? 'balanced' : 'unbalanced'"
          >
            <span>{{ isBalance ? "✓ Balance" : "✗ Tidak Balance" }}</span>
            <span v-if="!isBalance" style="font-size: 10px">
              Selisih: {{ numFmt(Math.abs(totalDebet - totalKredit)) }}
            </span>
          </div>
        </div>
      </div>

      <!-- ══ KOLOM KANAN: Detail Jurnal ══ -->
      <div class="ju-right">
        <div class="ju-sec-header">
          <span class="ju-sec-title">Detail Jurnal</span>
          <button type="button" class="btn-add" @click="addRow">
            <IconPlus :size="14" class="mr-1" /> Tambah Baris
          </button>
        </div>

        <div class="ju-table-wrap">
          <table class="ju-table">
            <thead>
              <tr>
                <th style="width: 40px" class="text-center">No</th>
                <th style="min-width: 180px">Uraian</th>
                <th style="width: 110px" class="text-right">Debet</th>
                <th style="width: 110px" class="text-right">Kredit</th>
                <th style="width: 90px">Account</th>
                <th style="min-width: 160px">Nama Account</th>
                <th style="min-width: 180px">Cost Center</th>
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
                    placeholder="Keterangan baris"
                  />
                </td>
                <td class="td-inp">
                  <input
                    :value="numFmt(row.debet)"
                    type="text"
                    inputmode="numeric"
                    class="cell tr"
                    @focus="onDebetFocus(row, $event)"
                    @input="onDebetInput(row, $event)"
                    @blur="onDebetBlur(row, $event)"
                  />
                </td>
                <td class="td-inp">
                  <input
                    :value="numFmt(row.kredit)"
                    type="text"
                    inputmode="numeric"
                    class="cell tr"
                    @focus="onKreditFocus(row, $event)"
                    @input="onKreditInput(row, $event)"
                    @blur="onKreditBlur(row, $event)"
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
                  <span
                    class="cell-val-ro"
                    :class="{ 'cell-required': !row.reknama }"
                  >
                    {{ row.reknama || "(wajib)" }}
                  </span>
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
                <td colspan="8" class="text-center text-grey py-4 font-italic">
                  Belum ada baris detail. Klik "Tambah Baris".
                </td>
              </tr>
            </tbody>
            <tfoot v-if="formData.Detail && formData.Detail.length > 0">
              <tr>
                <td colspan="2" class="foot-lbl">Subtotal</td>
                <td class="foot-val tr">{{ numFmt(totalDebet) }}</td>
                <td class="foot-val tr">{{ numFmt(totalKredit) }}</td>
                <td colspan="4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </BaseForm>

  <AccountSearchModal
    v-model="showRowAccModal"
    jenis="ALL"
    @selected="setRowAcc"
  />
  <CostCenterSearchModal v-model="showRowCcModal" @selected="setRowCc" />
</template>

<style scoped>
.ju-layout {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.ju-left {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ju-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.ju-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
}
.ju-sec-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.ju-sec-header {
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
.total-wrap {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.total-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
}
.balance-row {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
}
.balanced {
  color: #2e7d32;
}
.unbalanced {
  color: #c62828;
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
.ju-table-wrap {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
}
.ju-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}
.ju-table thead th {
  background: #1565c0;
  color: white;
  font-weight: 600;
  padding: 6px;
  position: sticky;
  top: 0;
  font-size: 11px;
  border: 1px solid #0d47a1;
  white-space: nowrap;
}
.ju-table td {
  border: 1px solid #eeeeee;
}
.ju-table tr:nth-of-type(even) td {
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
.cell-required {
  color: #c62828;
  font-style: italic;
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
.foot-lbl {
  text-align: right;
  font-weight: 700;
  padding: 6px 10px;
  background: #f5f5f5;
}
.foot-val {
  font-weight: 700;
  padding: 6px 10px;
  background: #e3f2fd;
  color: #1565c0;
}
</style>
