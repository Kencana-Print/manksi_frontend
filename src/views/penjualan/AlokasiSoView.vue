<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { alokasiSoService } from "@/services/penjualan/alokasiSoService";
import {
  IconMapPin,
  IconX,
  IconPlus,
  IconTrash,
  IconFileExcel,
  IconHistory,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import * as XLSX from "xlsx";
import api from "@/services/api";
import HistoryAlokasiModal from "@/components/lookups/HistoryAlokasiModal.vue";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();

// ── Filter ──
const getToday = () => new Date().toISOString().substr(0, 10);
const getMinus7 = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().substr(0, 10);
};
const filterState = ref<Record<string, any>>({});

const startDate = ref(getMinus7());
const endDate = ref(getToday());
const divisiKode = ref("0");
const divisiOptions = ref<{ value: string; title: string }[]>([]);

watch([startDate, endDate, divisiKode], () => fetchData());

const loadDivisi = async () => {
  try {
    const res = await api.get("/lookups/divisi");
    divisiOptions.value = [
      { value: "0", title: "SEMUA DIVISI" },
      ...res.data.data.map((d: any) => ({
        value: String(d.kode),
        title: `${d.kode} - ${d.nama}`,
      })),
    ];
  } catch {
    console.error("Gagal load divisi");
  }
};

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const { items, isLoading, selected, canEdit, canExport, fetchData } = useBrowse(
  {
    menuId: "183",
    fetchApi: async () => {
      const res = await alokasiSoService.getBrowse({
        startDate: startDate.value,
        endDate: endDate.value,
        divisi: divisiKode.value,
      });
      return res.data.data;
    },
  },
);

onMounted(async () => {
  await loadDivisi();
  fetchData();
});

const headers = [
  { title: "NOMOR SO", key: "Nomor", width: "160px" },
  { title: "TANGGAL", key: "Tanggal", width: "100px", align: "center" },
  { title: "DIVISI", key: "Divisi", width: "120px" },
  { title: "CUSTOMER", key: "Customer", width: "200px" },
  { title: "SALES", key: "Sales", width: "130px" },
  { title: "NAMA PEKERJAAN", key: "NamaPekerjaan", width: "220px" },
  { title: "Qty Order", key: "QtyOrder", width: "100px", align: "end" },
  { title: "Jml Alokasi", key: "JmlAlokasi", width: "100px", align: "center" },
  {
    title: "Total Alokasi",
    key: "TotalAlokasi",
    width: "120px",
    align: "end",
  },
  { title: "SPK Turunan", key: "SpkTurunan", width: "150px" },
];

const fmtNum = (v: any) =>
  new Intl.NumberFormat("id-ID").format(Number(v) || 0);

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (Number(item.JmlAlokasi) === 0) return { class: "text-grey-darken-1" };
  if (Number(item.TotalAlokasi) !== Number(item.QtyOrder))
    return { class: "text-warning font-weight-medium" };
  return { class: "text-green-darken-2 font-weight-medium" };
};

// ── Dialog alokasi ──
const showDialog = ref(false);
const showHistoryModal = ref(false);
const isDialogLoading = ref(false);
const isDialogSaving = ref(false);
const dialogData = ref<any>({
  nomor: "",
  namaPekerjaan: "",
  customer: "",
  qtyOrder: 0,
  spkTurunan: null,
  alokasi: [],
});

const totalAlokasi = () =>
  (dialogData.value.alokasi || []).reduce(
    (sum: number, r: any) => sum + (Number(r.jumlah) || 0),
    0,
  );

const openDialog = async (item: any) => {
  showDialog.value = true;
  isDialogLoading.value = true;
  try {
    const res = await alokasiSoService.getAlokasi(item.Nomor);
    dialogData.value = res.data.data;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data alokasi.");
    showDialog.value = false;
  } finally {
    isDialogLoading.value = false;
  }
};

const appendHistoryAlokasi = (selectedRows: any[]) => {
  selectedRows.forEach((row) => {
    const exists = dialogData.value.alokasi.some(
      (a: any) => a.alamat === row.Alamat && a.kota === row.Kota,
    );
    if (!exists) {
      dialogData.value.alokasi.push({
        alamat: row.Alamat,
        kota: row.Kota,
        person: "",
        hp: "",
        jumlah: 0,
      });
    }
  });
};
const addRow = () => {
  dialogData.value.alokasi.push({
    alamat: "",
    kota: "",
    person: "",
    hp: "",
    jumlah: 0,
  });
};
const removeRow = (idx: number) => {
  dialogData.value.alokasi.splice(idx, 1);
};

const fileInputRef = ref<HTMLInputElement | null>(null);
const triggerExcelUpload = () => fileInputRef.value?.click();
const handleExcelUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (jsonData.length <= 1) {
        toast.warning("File Excel kosong atau hanya berisi header.");
        return;
      }
      let count = 0;
      for (let r = 1; r < jsonData.length; r++) {
        const row = jsonData[r];
        if (row[0] && String(row[0]).trim() !== "") {
          dialogData.value.alokasi.push({
            alamat: String(row[0] || "").trim(),
            kota: String(row[1] || "").trim(),
            person: String(row[2] || "").trim(),
            hp: String(row[3] || "").trim(),
            jumlah: Number(row[4]) || 0,
          });
          count++;
        }
      }
      toast.success(`${count} baris alokasi ditambahkan dari Excel.`);
    } catch {
      toast.error("Gagal membaca file Excel. Pastikan format sesuai.");
    } finally {
      (e.target as HTMLInputElement).value = "";
    }
  };
  reader.readAsArrayBuffer(file);
};

const saveDialog = async () => {
  isDialogSaving.value = true;
  try {
    const res = await alokasiSoService.saveAlokasi(
      dialogData.value.nomor,
      dialogData.value.alokasi,
    );
    toast.success(
      res.data.data?.synced
        ? `Alokasi tersimpan dan tersinkron ke SPK ${res.data.data.spkNomor}.`
        : "Alokasi berhasil disimpan.",
    );
    showDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan alokasi.");
  } finally {
    isDialogSaving.value = false;
  }
};

const isExporting = ref(false);

const onExport = async () => {
  const dataToExport =
    baseBrowseRef.value?.getFilteredItems?.() ?? items.value ?? [];

  if (!dataToExport || dataToExport.length === 0) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }

  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = headers
      .filter((h) => h.key)
      .map((h: any) => ({
        header: h.title,
        key: h.key,
        width: h.width ? Math.max(10, Math.round(parseInt(h.width) / 7)) : 16,
        align: h.align ?? "left",
        numFmt: ["QtyOrder", "TotalAlokasi"].includes(h.key)
          ? "#,##0"
          : undefined,
      }));

    const rows = dataToExport.map((it: any) => {
      const row: Record<string, any> = {};
      columns.forEach((c) => {
        let val = it[c.key];
        if (c.key === "Tanggal") val = val ? formatTanggal(val) : "";
        else if (c.key === "SpkTurunan") val = val || "-";
        row[c.key] = val ?? "";
      });
      return row;
    });

    const periodeLabel = `Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`;
    await exportExcelSingle(
      `Alokasi_SO_${startDate.value}_${endDate.value}.xlsx`,
      "Alokasi SO",
      columns,
      rows,
      `Laporan Alokasi Sales Order  |  ${periodeLabel}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Alokasi Sales Order"
    menu-id="183"
    :icon="IconMapPin"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-insert="false"
    :can-edit="canEdit"
    :can-delete="false"
    :can-export="canExport"
    item-value="Nomor"
    v-model:filter-state="filterState"
    :row-props-fn="rowPropsFn"
    v-model:selected="selected"
    @refresh="fetchData"
    @edit="openDialog"
    @export="onExport"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input type="date" v-model="startDate" class="date-inp" />
        <span class="filter-sep">s/d</span>
        <input type="date" v-model="endDate" class="date-inp" />
      </div>
      <div class="filter-divider" />
      <div class="filter-group">
        <span class="filter-label">Divisi</span>
        <select v-model="divisiKode" class="filter-select">
          <option
            v-for="opt in divisiOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.title }}
          </option>
        </select>
      </div>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>
    <template #item.QtyOrder="{ item }">{{
      fmtNum((item.raw || item).QtyOrder)
    }}</template>
    <template #item.TotalAlokasi="{ item }">{{
      fmtNum((item.raw || item).TotalAlokasi)
    }}</template>
    <template #item.SpkTurunan="{ item }">
      <span v-if="(item.raw || item).SpkTurunan">{{
        (item.raw || item).SpkTurunan
      }}</span>
      <span v-else class="text-grey">-</span>
    </template>

    <template #item.actions="{ item }">
      <v-btn
        size="x-small"
        variant="tonal"
        color="primary"
        @click="openDialog(item.raw || item)"
      >
        Kelola Alokasi
      </v-btn>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showDialog" max-width="1200px" scrollable>
    <v-card class="rounded-lg alokasi-dialog-card">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconMapPin :size="18" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold">
          Alokasi Pengiriman — {{ dialogData.nomor }}
        </span>
        <v-spacer />
        <v-btn
          variant="text"
          size="small"
          color="white"
          @click="showDialog = false"
        >
          <IconX :size="18" :stroke-width="2" />
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-3" style="max-height: 65vh">
        <div v-if="isDialogLoading" class="text-center py-8 text-grey">
          Memuat data...
        </div>
        <template v-else>
          <div class="dlg-info mb-3">
            <div class="dlg-info-row">
              <b>Customer:</b> {{ dialogData.customer }}
            </div>
            <div class="dlg-info-row">
              <b>Nama Pekerjaan:</b> {{ dialogData.namaPekerjaan }}
            </div>
            <div class="dlg-info-row">
              <b>Qty Order:</b> {{ fmtNum(dialogData.qtyOrder) }}
            </div>
            <div v-if="dialogData.spkTurunan" class="dlg-info-row text-primary">
              <b>SPK Turunan:</b> {{ dialogData.spkTurunan }} (otomatis
              tersinkron)
            </div>
          </div>

          <div class="d-flex align-center mb-2" style="gap: 8px">
            <button
              type="button"
              class="btn-action green"
              @click="triggerExcelUpload"
            >
              <IconFileExcel :size="14" class="mr-1" /> Import From Excel
            </button>
            <button
              type="button"
              class="btn-action orange"
              @click="showHistoryModal = true"
            >
              <IconHistory :size="14" class="mr-1" /> Import From History
            </button>
            <button type="button" class="btn-action blue" @click="addRow">
              <IconPlus :size="14" class="mr-1" /> Tambah Baris
            </button>
          </div>
          <input
            type="file"
            ref="fileInputRef"
            accept=".xls,.xlsx"
            style="display: none"
            @change="handleExcelUpload"
          />

          <div class="ll-table-wrap">
            <table class="ll-table">
              <thead>
                <tr>
                  <th style="width: 40px" class="text-center">No</th>
                  <th style="text-align: left; min-width: 320px">Alamat</th>
                  <th style="text-align: left; width: 160px">Kota</th>
                  <th style="text-align: left; width: 150px">Kontak Person</th>
                  <th style="text-align: left; width: 140px">No. HP</th>
                  <th style="width: 100px; text-align: right">Jumlah</th>
                  <th style="width: 50px" class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in dialogData.alokasi" :key="idx">
                  <td class="ll-td-ctr ll-td-lbl">{{ Number(idx) + 1 }}</td>
                  <td class="ll-td-inp">
                    <input
                      type="text"
                      v-model="row.alamat"
                      class="ll-cell"
                      placeholder="Detail alamat..."
                    />
                  </td>
                  <td class="ll-td-inp">
                    <input
                      type="text"
                      v-model="row.kota"
                      class="ll-cell"
                      placeholder="Kota"
                    />
                  </td>
                  <td class="ll-td-inp">
                    <input
                      type="text"
                      v-model="row.person"
                      class="ll-cell"
                      placeholder="Nama kontak"
                    />
                  </td>
                  <td class="ll-td-inp">
                    <input
                      type="text"
                      v-model="row.hp"
                      class="ll-cell"
                      placeholder="08xxx"
                    />
                  </td>
                  <td class="ll-td-inp">
                    <input
                      type="number"
                      v-model.number="row.jumlah"
                      class="ll-cell tr font-weight-bold"
                    />
                  </td>
                  <td class="ll-td-ctr">
                    <button
                      type="button"
                      class="btn-del"
                      @click="removeRow(Number(idx))"
                    >
                      <IconTrash :size="14" />
                    </button>
                  </td>
                </tr>
                <tr
                  v-if="!dialogData.alokasi || dialogData.alokasi.length === 0"
                >
                  <td
                    colspan="7"
                    class="text-center text-grey py-4 font-italic"
                  >
                    Belum ada data alokasi.
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="dialogData.alokasi && dialogData.alokasi.length > 0">
                <tr>
                  <td
                    colspan="5"
                    class="text-right font-weight-bold py-1 px-2"
                    style="background: #f5f5f5"
                  >
                    TOTAL QTY ALOKASI :
                  </td>
                  <td
                    class="text-right font-weight-bold py-1 px-2"
                    :class="
                      totalAlokasi() === dialogData.qtyOrder
                        ? 'text-success'
                        : 'text-warning'
                    "
                    style="background: #e3f2fd"
                  >
                    {{ fmtNum(totalAlokasi()) }}
                  </td>
                  <td style="background: #f5f5f5"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </template>
      </v-card-text>

      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="isDialogSaving"
          @click="showDialog = false"
          >Batal</v-btn
        >
        <v-btn
          color="primary"
          variant="elevated"
          :loading="isDialogSaving"
          :disabled="isDialogLoading"
          @click="saveDialog"
        >
          Simpan Alokasi
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <HistoryAlokasiModal
    v-model="showHistoryModal"
    :cust-kode="dialogData.custKode"
    @selected="appendHistoryAlokasi"
  />
</template>

<style scoped>
.filter-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  color: #212121;
  cursor: pointer;
  outline: none;
  min-width: 140px;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.filter-sep {
  font-size: 11px;
  color: #888;
}
.filter-divider {
  width: 1px;
  height: 20px;
  background: #d0d0d0;
  margin: 0 8px;
  flex-shrink: 0;
}
.date-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
  color: #212121;
}
.date-inp:focus {
  border-color: #1976d2;
}

.dlg-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #37474f;
  background: #f5f7fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px 14px;
}
.dlg-info-row {
  line-height: 1.4;
}

.btn-action {
  color: white;
  border: none;
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.btn-action.blue {
  background: #1976d2;
}
.btn-action.blue:hover {
  background: #1565c0;
}
.btn-action.green {
  background: #2e7d32;
}
.btn-action.green:hover {
  background: #1b5e20;
}
.btn-action.orange {
  background: #f57c00;
}
.btn-action.orange:hover {
  background: #e65100;
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

.ll-table-wrap {
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  max-height: 360px;
}
.ll-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}
.ll-table thead th {
  background: #1565c0;
  color: white;
  font-weight: 600;
  padding: 6px;
  position: sticky;
  top: 0;
  z-index: 1;
  font-size: 11px;
  border: 1px solid #0d47a1;
}
.ll-table td {
  border: 1px solid #eeeeee;
}
.ll-table tr:nth-of-type(even) td {
  background: #fafafa;
}
.ll-table tr:hover td {
  background: #e3f2fd !important;
}
.ll-td-lbl {
  padding: 4px 6px;
  background: #f5f5f5 !important;
  color: #424242;
}
.ll-td-inp {
  padding: 0;
}
.ll-td-ctr {
  text-align: center;
}
.ll-cell {
  width: 100%;
  height: 26px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 6px;
  font-family: inherit;
  color: #212121;
}
.ll-cell:focus {
  background: #e3f2fd;
}
.tr {
  text-align: right;
}
.alokasi-dialog-card :deep(.v-card-title),
.alokasi-dialog-card :deep(.v-card-text),
.alokasi-dialog-card :deep(.v-card-actions),
.alokasi-dialog-card :deep(.v-btn) {
  font-size: 12px !important;
}
.alokasi-dialog-card :deep(.v-card-title) {
  font-size: 14px !important;
}
</style>
