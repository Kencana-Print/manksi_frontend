<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { inputPlanningSpkFormService } from "@/services/garmen/inputPlanningSpkFormService";
import { IconCalendarStats, IconTrash } from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const nomorSpk = String(route.params.nomor || "");

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const defaultData = {
  header: {
    nomor: nomorSpk,
    nama: "",
    tanggal: "",
    dateline: "",
    jumlah: 0,
    cab: "",
    workshop: "",
    tipe: "",
    kain: "",
    finishing: "",
    sablon: false,
    sublim: false,
    bordir: false,
  },
  rows: [] as any[],
};

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
} = useForm({
  menuId: "80",
  initialData: defaultData,
  fetchApi: async () => {
    const res = await inputPlanningSpkFormService.getDetail(nomorSpk);
    const d = res.data.data;
    return {
      header: {
        nomor: d.header.nomor,
        nama: d.header.nama || "",
        tanggal: formatDateLocal(d.header.tanggal),
        dateline: formatDateLocal(d.header.dateline),
        jumlah: Number(d.header.jumlah) || 0,
        cab: d.header.cab || "",
        workshop: d.header.workshop || "",
        tipe: d.header.tipe || "",
        kain: d.header.kain || "",
        finishing: d.header.finishing || "",
        sablon: !!d.header.sablon,
        sublim: !!d.header.sublim,
        bordir: !!d.header.bordir,
      },
      rows: (d.detail || []).map((r: any) => ({
        tanggal: formatDateLocal(r.tanggal),
        datang: Number(r.datang) || 0,
        cutting: Number(r.cutting) || 0,
        cetak: Number(r.cetak) || 0,
        sublim: Number(r.sublim) || 0,
        bordir: Number(r.bordir) || 0,
        jahit: Number(r.jahit) || 0,
        finishing: Number(r.finishing) || 0,
        kirim: Number(r.kirim) || 0,
        ketcutting: r.ketcutting || "",
        ketcetak: r.ketcetak || "",
        ketsublim: r.ketsublim || "",
        ketbordir: r.ketbordir || "",
        ketjahit: r.ketjahit || "",
        ketfinishing: r.ketfinishing || "",
        ketkirim: r.ketkirim || "",
        lama: !!r.lama, // baris lama dari DB, tidak boleh dihapus
      })),
    };
  },
  submitApi: async (data: any) => {
    const validRows = data.rows.filter((r: any) => r.tanggal);
    return await inputPlanningSpkFormService.saveData({
      nomor: nomorSpk,
      rows: validRows,
    });
  },
  onSuccess: () => {
    toast.success("Berhasil disimpan.");
    router.push({ name: "InputPlanningSpkBrowse" });
  },
});

// ── Auto-trailing-row: selalu ada 1 baris kosong di akhir siap diisi ──
const addRow = () =>
  formData.value.rows.push({
    tanggal: "",
    datang: 0,
    cutting: 0,
    cetak: 0,
    sublim: 0,
    bordir: 0,
    jahit: 0,
    finishing: 0,
    kirim: 0,
    ketcutting: "",
    ketcetak: "",
    ketsublim: "",
    ketbordir: "",
    ketjahit: "",
    ketfinishing: "",
    ketkirim: "",
    lama: false,
  });

watch(
  () => formData.value.rows,
  (rows) => {
    if (!rows || rows.length === 0) {
      addRow();
      return;
    }
    const lastRow = rows[rows.length - 1];
    if (lastRow.tanggal) {
      addRow();
    }
  },
  { deep: true, immediate: true },
);

// ── Validasi duplikasi tanggal (mirror cltanggalPropertiesEditValueChanged) ──
const onTanggalBlur = (idx: number) => {
  const row = formData.value.rows[idx];
  if (!row.tanggal) return;
  const dupIdx = formData.value.rows.findIndex(
    (r: any, i: number) => i !== idx && r.tanggal === row.tanggal,
  );
  if (dupIdx !== -1) {
    toast.warning(`Tanggal tsb sudah terinput di baris ${dupIdx + 1}.`);
    row.tanggal = "";
  }
};

// ── Hapus baris — hanya baris baru (lama=false) yang boleh dihapus ──
const removeRow = (idx: number) => {
  const row = formData.value.rows[idx];
  if (row.lama) {
    toast.warning("Hanya record baru yang bisa dihapus.");
    return;
  }
  if (formData.value.rows.length === 1 && !row.tanggal) return;
  formData.value.rows.splice(idx, 1);
};

// ── Validasi client (mirror validasi backend, backend tetap re-validasi) ──
const isLL = computed(() => nomorSpk.substring(3, 5).toUpperCase() === "LL");

const sumField = (field: string) =>
  formData.value.rows
    .filter((r: any) => r.tanggal)
    .reduce((acc: number, r: any) => acc + (Number(r[field]) || 0), 0);

const validateSave = () => {
  const validRows = formData.value.rows.filter((r: any) => r.tanggal);
  if (validRows.length === 0) {
    return toast.warning("Tidak ada data, tidak dapat disimpan.");
  }

  const sumDatang = sumField("datang");
  const sumCutting = sumField("cutting");
  const sumCetak = sumField("cetak");
  const sumSublim = sumField("sublim");
  const sumBordir = sumField("bordir");
  const sumJahit = sumField("jahit");
  const sumFinishing = sumField("finishing");
  const sumKirim = sumField("kirim");

  if (sumCutting > 0 && !isLL.value && sumDatang === 0) {
    return toast.warning(
      "SPK tsb belum input planning kedatangan bahan.\nHubungi divisi pembelian.",
    );
  }
  if (sumCetak > 0 && !isLL.value && sumCutting === 0) {
    return toast.warning(
      "SPK tsb belum input planning cutting.\nHubungi divisi tsb.",
    );
  }
  if (sumSublim > 0 && !isLL.value && sumCutting === 0) {
    return toast.warning(
      "SPK tsb belum input planning cutting.\nHubungi divisi tsb.",
    );
  }
  if (sumBordir > 0 && !isLL.value && sumCutting === 0) {
    return toast.warning(
      "SPK tsb belum input planning cutting.\nHubungi divisi tsb.",
    );
  }
  if (sumJahit > 0 && !isLL.value) {
    if (formData.value.header.sablon && sumCetak === 0) {
      return toast.warning(
        "SPK tsb belum input planning cetak sablon.\nHubungi divisi tsb.",
      );
    }
    if (formData.value.header.sublim && sumSublim === 0) {
      return toast.warning(
        "SPK tsb belum input planning cetak sublim.\nHubungi divisi tsb.",
      );
    }
    if (formData.value.header.bordir && sumBordir === 0) {
      return toast.warning(
        "SPK tsb belum input planning bordir.\nHubungi divisi tsb.",
      );
    }
  }
  if (sumFinishing > 0 && sumJahit === 0) {
    return toast.warning(
      "SPK tsb belum input planning jahit.\nHubungi divisi tsb.",
    );
  }
  if (sumKirim > 0 && sumFinishing === 0) {
    return toast.warning(
      "SPK tsb belum input planning finishing.\nHubungi divisi tsb.",
    );
  }

  showSaveDialog.value = true;
};

const fmt = (n: number) =>
  n || n === 0 ? Number(n).toLocaleString("id-ID") : "0";
</script>

<template>
  <BaseForm
    title="Input Planning per SPK"
    menu-id="80"
    :icon="IconCalendarStats"
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
    <template #left-column>
      <div class="plan-container">
        <!-- ── Header (straight top-bottom, bukan left-right) ── -->
        <div class="header-section">
          <div class="fr">
            <label class="lbl">SPK</label>
            <input
              :value="formData.header.nomor"
              readonly
              class="inp ro"
              style="width: 180px"
            />
            <label class="lbl ml-3">Workshop</label>
            <input
              :value="formData.header.cab"
              readonly
              class="inp ro"
              style="width: 70px"
            />
            <input
              :value="formData.header.workshop"
              readonly
              class="inp ro flex-grow-1"
            />
          </div>

          <div class="fr">
            <label class="lbl">Tgl. SPK</label>
            <input
              :value="formData.header.tanggal"
              readonly
              class="inp ro"
              style="width: 130px"
            />
            <label class="lbl ml-3" style="width: 60px">Dateline</label>
            <input
              :value="formData.header.dateline"
              readonly
              class="inp ro"
              style="width: 130px"
            />
            <label class="lbl ml-3">Tipe</label>
            <input
              :value="formData.header.tipe"
              readonly
              class="inp ro"
              style="width: 150px"
            />
          </div>

          <div class="fr">
            <label class="lbl">Nama Design</label>
            <input
              :value="formData.header.nama"
              readonly
              class="inp ro flex-grow-1"
              style="max-width: 460px"
            />
            <label class="lbl ml-3">Kain</label>
            <input
              :value="formData.header.kain"
              readonly
              class="inp ro flex-grow-1"
            />
          </div>

          <div class="fr">
            <label class="lbl">Jumlah Order</label>
            <input
              :value="fmt(formData.header.jumlah)"
              readonly
              class="inp ro text-right"
              style="width: 100px"
            />
            <label class="lbl ml-3">Finishing</label>
            <input
              :value="formData.header.finishing"
              readonly
              class="inp ro flex-grow-1"
            />
          </div>

          <div class="fr">
            <span class="ml-auto legend-item">
              <span class="legend-box" style="background: #f44336"></span>
              Record baru
            </span>
            <label class="chk-lbl ml-3"
              ><input
                type="checkbox"
                :checked="formData.header.sablon"
                disabled
              />
              Cetak Sablon</label
            >
            <label class="chk-lbl ml-3"
              ><input
                type="checkbox"
                :checked="formData.header.sublim"
                disabled
              />
              Sublim</label
            >
            <label class="chk-lbl ml-3"
              ><input
                type="checkbox"
                :checked="formData.header.bordir"
                disabled
              />
              Bordir</label
            >
          </div>
        </div>

        <!-- ── Tabel Planning ── -->
        <div class="table-section">
          <div class="tbl-wrap">
            <table class="gt">
              <thead>
                <tr>
                  <th style="width: 35px" class="tc">No</th>
                  <th style="width: 110px" class="bg-yellow">Tanggal</th>
                  <th style="width: 90px" class="tr bg-yellow">
                    Qty Bahan Datang
                  </th>
                  <th style="width: 80px" class="tr bg-yellow">Qty Cutting</th>
                  <th style="width: 80px" class="tr bg-yellow">Qty Cetak</th>
                  <th style="width: 80px" class="tr bg-yellow">Qty Sublim</th>
                  <th style="width: 80px" class="tr bg-yellow">Qty Bordir</th>
                  <th style="width: 80px" class="tr bg-yellow">Qty Jahit</th>
                  <th style="width: 85px" class="tr bg-yellow">
                    Qty Finishing
                  </th>
                  <th style="width: 80px" class="tr bg-yellow">Qty Kirim</th>
                  <th style="width: 110px">Ket.Cutting</th>
                  <th style="width: 110px">Ket.Cetak</th>
                  <th style="width: 110px">Ket.Sublim</th>
                  <th style="width: 110px">Ket.Bordir</th>
                  <th style="width: 110px">Ket.Jahit</th>
                  <th style="width: 110px">Ket.Finishing</th>
                  <th style="width: 110px">Ket.Kirim</th>
                  <th style="width: 40px" class="tc">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in formData.rows"
                  :key="idx"
                  :class="{ 'row-new': !row.lama }"
                >
                  <td class="tc gt-lbl">{{ Number(idx) + 1 }}</td>
                  <td class="p0">
                    <input
                      type="date"
                      v-model="row.tanggal"
                      class="ci"
                      @blur="onTanggalBlur(Number(idx))"
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.datang"
                      type="number"
                      class="ci tr"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.cutting"
                      type="number"
                      class="ci tr"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.cetak"
                      type="number"
                      class="ci tr"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.sublim"
                      type="number"
                      class="ci tr"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.bordir"
                      type="number"
                      class="ci tr"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.jahit"
                      type="number"
                      class="ci tr"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.finishing"
                      type="number"
                      class="ci tr"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.kirim"
                      type="number"
                      class="ci tr"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input v-model="row.ketcutting" class="ci" />
                  </td>
                  <td class="p0">
                    <input v-model="row.ketcetak" class="ci" />
                  </td>
                  <td class="p0">
                    <input v-model="row.ketsublim" class="ci" />
                  </td>
                  <td class="p0">
                    <input v-model="row.ketbordir" class="ci" />
                  </td>
                  <td class="p0">
                    <input v-model="row.ketjahit" class="ci" />
                  </td>
                  <td class="p0">
                    <input v-model="row.ketfinishing" class="ci" />
                  </td>
                  <td class="p0">
                    <input v-model="row.ketkirim" class="ci" />
                  </td>
                  <td class="tc">
                    <button
                      v-if="!row.lama"
                      type="button"
                      class="btn-del"
                      title="Hapus"
                      @click="removeRow(Number(idx))"
                    >
                      <IconTrash :size="13" />
                    </button>
                  </td>
                </tr>
                <tr v-if="formData.rows.length === 0">
                  <td colspan="18" class="empty-row">
                    Belum ada data planning. Isi tanggal di baris kosong untuk
                    menambah.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>
</template>

<style scoped>
.plan-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}

.header-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.fr {
  display: flex;
  align-items: center;
  min-height: 24px;
  gap: 4px;
}
.lbl {
  width: 90px;
  flex-shrink: 0;
  font-weight: 600;
  color: #444;
  font-size: 11px;
}
.ml-3 {
  margin-left: 12px;
}
.ml-auto {
  margin-left: auto;
}
.flex-grow-1 {
  flex: 1;
}

.inp {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
  border-radius: 2px;
}
.ro {
  background: #dde8f0 !important;
  color: #444 !important;
}
.text-right {
  text-align: right;
}

.chk-lbl {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #555;
}
.chk-lbl input {
  accent-color: #1565c0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #444;
}
.legend-box {
  width: 11px;
  height: 11px;
  display: inline-block;
  border-radius: 2px;
}

.table-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tbl-wrap {
  overflow: auto;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  flex: 1;
}

.gt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.gt thead th {
  background: #eeeeee;
  border: 1px solid #bdbdbd;
  padding: 5px 4px;
  font-size: 10.5px;
  font-weight: 700;
  color: #424242;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}
.gt thead th.tc {
  text-align: center;
}
.gt thead th.tr {
  text-align: right;
}
.gt thead th.bg-yellow {
  background: #fff9c4;
}
.gt tbody td {
  border: 1px solid #e0e0e0;
  height: 26px;
}
.gt tbody tr.row-new td {
  color: #d32f2f;
}
.gt tbody tr:hover td {
  background: #e3f2fd !important;
}

.p0 {
  padding: 0 !important;
}
.gt-lbl {
  background: #f5f5f5 !important;
  color: #555;
  padding: 0 4px;
  font-size: 10px;
}

.ci {
  width: 100%;
  height: 26px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 6px;
  font-family: inherit;
  color: inherit;
  box-sizing: border-box;
}
.ci.ro {
  background: #f5f5f5 !important;
  color: #757575 !important;
}
.ci:focus {
  background: #e3f2fd !important;
  outline: 1px solid #1976d2;
  outline-offset: -1px;
}
.ci.tr {
  text-align: right;
}

.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  margin: 0 auto;
}
.btn-del:hover {
  background: #ffebee;
}

.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 16px;
  font-size: 11px;
}
</style>
