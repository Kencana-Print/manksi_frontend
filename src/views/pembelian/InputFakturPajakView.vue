<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  inputFakturPajakService,
  type FakturVoucherRow,
  type StatusFaktur,
} from "@/services/pembelian/inputFakturPajakService";
import { IconReceiptTax, IconFileExport } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const MAX_NO_FAKTUR = 30; // sama dengan vou_nomor_pajak varchar(30)

const toast = useToast();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// --- Periode & status ---
const pad = (n: number) => String(n).padStart(2, "0");
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const getAwalBulan = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};

const filterState = ref<Record<string, unknown>>({});
const startDate = ref(getAwalBulan());
const endDate = ref(getToday());
const status = ref<StatusFaktur>("OUTSTANDING");
// Outstanding menampilkan semua periode, jadi tanggal tidak dipakai
const periodeAktif = computed(() => status.value !== "OUTSTANDING");

// --- Data ---
const items = ref<FakturVoucherRow[]>([]);
const isLoading = ref(false);
const selected = ref<FakturVoucherRow[]>([]);
const selectedItem = computed(() => selected.value[0] ?? null);

const headers = [
  { title: "Nomor", key: "Nomor", width: "150px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Kode Sup", key: "KodeSupplier", width: "90px" },
  { title: "Supplier", key: "Supplier", width: "240px" },
  { title: "No. Invoice", key: "NomorInvoice", width: "150px" },
  { title: "PPN %", key: "Ppn", width: "70px", align: "end" },
  { title: "No. Faktur Pajak", key: "NomorPajak", width: "170px" },
  { title: "Total", key: "Total", width: "130px", align: "end" },
  { title: "Net", key: "Net", width: "130px", align: "end" },
  { title: "Umur (hari)", key: "UmurHari", width: "90px", align: "end" },
  { title: "Status", key: "StatusFaktur", width: "100px", align: "center" },
  { title: "Diinput", key: "TglInputFaktur", width: "130px" },
  { title: "User", key: "UserInputFaktur", width: "80px", align: "center" },
  { title: "Keterangan", key: "Keterangan", width: "220px" },
];

const numFmt = (v: unknown) => (v ? Number(v).toLocaleString("id-ID") : "");
const rowOf = (item: unknown): FakturVoucherRow => {
  const x = item as { raw?: FakturVoucherRow };
  return (x.raw ?? item) as FakturVoucherRow;
};

const summaryFormatters = {
  NomorPajak: () => "TOTAL :",
  Total: (rows: FakturVoucherRow[]) =>
    numFmt(Math.round(rows.reduce((s, r) => s + (Number(r.Total) || 0), 0))),
  Net: (rows: FakturVoucherRow[]) =>
    numFmt(Math.round(rows.reduce((s, r) => s + (Number(r.Net) || 0), 0))),
};

const fetchData = async () => {
  isLoading.value = true;
  selected.value = [];
  try {
    const res = await inputFakturPajakService.getBrowse(
      startDate.value,
      endDate.value,
      status.value,
    );
    items.value = res.data.data || [];
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.error(err.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchData);
watch(status, fetchData);
watch([startDate, endDate], () => {
  if (periodeAktif.value) fetchData();
});

// Baris merah = PPN dicentang tapi nomor faktur pajak belum diinput
const rowPropsFn = (data: { item?: unknown }) => {
  const item = rowOf(data.item);
  if (item?.StatusFaktur === "OUTSTANDING")
    return { style: "background:#ffebee;color:#c62828" };
  return {};
};

// --- Dialog input faktur ---
const showDialog = ref(false);
const isSaving = ref(false);
const noFaktur = ref("");
const target = ref<FakturVoucherRow | null>(null);

const sudahAdaFaktur = computed(() => !!target.value?.NomorPajak);

const onInput = () => {
  if (!selectedItem.value) {
    toast.warning("Pilih voucher terlebih dahulu.");
    return;
  }
  target.value = selectedItem.value;
  noFaktur.value = selectedItem.value.NomorPajak || "";
  showDialog.value = true;
};

const onSimpan = async () => {
  if (!target.value || isSaving.value) return;
  const faktur = noFaktur.value.trim();
  if (!faktur) {
    toast.warning("Nomor faktur pajak harus diisi.");
    return;
  }
  if (faktur === (target.value.NomorPajak || "").trim()) {
    toast.info("Nomor faktur tidak berubah.");
    return;
  }
  isSaving.value = true;
  try {
    const res = await inputFakturPajakService.simpan(
      target.value.Nomor,
      faktur,
    );
    toast.success(`Faktur pajak ${target.value.Nomor} tersimpan.`);
    if (res.data.data.peringatan) toast.warning(res.data.data.peringatan);
    showDialog.value = false;
    await fetchData();
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.error(err.response?.data?.message || "Gagal menyimpan faktur.");
  } finally {
    isSaving.value = false;
  }
};

// --- Export ---
const isExporting = ref(false);

const onExport = async () => {
  const data =
    (baseBrowseRef.value?.getFilteredItems?.() as FakturVoucherRow[]) ??
    items.value;
  if (!data || data.length === 0) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = headers.map((h) => ({
      header: h.title,
      key: h.key,
      width: Math.max(10, Math.round(parseInt(h.width) / 7)),
      align: (h.align as ExcelColumn["align"]) ?? "left",
      numFmt: ["Total", "Net"].includes(h.key) ? "#,##0" : undefined,
    }));
    const rows = data.map((it) => {
      const row: Record<string, unknown> = {};
      columns.forEach((c) => {
        const val = (it as unknown as Record<string, unknown>)[c.key];
        row[c.key] =
          c.key === "Tanggal" && val ? formatTanggal(String(val)) : (val ?? "");
      });
      return row;
    });
    const label = periodeAktif.value
      ? `Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`
      : "Semua periode";
    await exportExcelSingle(
      `Faktur_Pajak_Voucher_${getToday()}.xlsx`,
      "Faktur Pajak Voucher",
      columns,
      rows,
      `Input Faktur Pajak Voucher  |  Status: ${status.value}  |  ${label}`,
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
    title="Input Faktur Pajak Voucher"
    menu-id="974"
    :icon="IconReceiptTax"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="true"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    :summary-columns="['Total', 'Net']"
    :summary-formatters="summaryFormatters"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Status</span>
        <select v-model="status" class="f-sel">
          <option value="OUTSTANDING">Belum Ada Faktur</option>
          <option value="SUDAH">Sudah Ada Faktur</option>
          <option value="SEMUA">Semua</option>
        </select>
        <span class="f-label">Periode</span>
        <input
          type="date"
          v-model="startDate"
          class="f-date"
          :disabled="!periodeAktif"
        />
        <span class="f-sep">s/d</span>
        <input
          type="date"
          v-model="endDate"
          class="f-date"
          :disabled="!periodeAktif"
        />
      </div>
      <div class="f-divider" />
      <div class="legend-wrap">
        <span class="legend-dot" style="background: #c62828"></span>
        <span class="legend-lbl">Belum ada faktur pajak</span>
      </div>
    </template>

    <template #extra-actions="{ selected: sel }">
      <v-btn
        size="small"
        color="primary"
        :disabled="sel.length === 0"
        @click="onInput"
      >
        <template #prepend><IconReceiptTax :size="15" /></template>
        Input / Koreksi Faktur
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(rowOf(item).Tanggal) }}
    </template>
    <template
      v-for="col in ['Total', 'Net']"
      :key="col"
      v-slot:[`item.${col}`]="{ item }"
    >
      <span class="num-cell">{{
        numFmt((rowOf(item) as unknown as Record<string, unknown>)[col])
      }}</span>
    </template>
    <template #item.StatusFaktur="{ item }">
      <span
        :class="
          rowOf(item).StatusFaktur === 'OUTSTANDING' ? 'st-belum' : 'st-sudah'
        "
      >
        {{ rowOf(item).StatusFaktur === "OUTSTANDING" ? "Belum" : "Sudah" }}
      </span>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showDialog" max-width="460px" persistent>
    <v-card rounded="lg" class="dlg-card">
      <v-card-title
        class="pa-3"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #1565c0"
      >
        {{ sudahAdaFaktur ? "Koreksi" : "Input" }} Faktur Pajak
      </v-card-title>
      <v-card-text class="pa-4">
        <table class="info-tbl">
          <tr>
            <td class="lbl">Voucher</td>
            <td>
              <strong>{{ target?.Nomor }}</strong>
            </td>
          </tr>
          <tr>
            <td class="lbl">Supplier</td>
            <td>{{ target?.Supplier }}</td>
          </tr>
          <tr>
            <td class="lbl">Tanggal</td>
            <td>{{ target ? formatTanggal(target.Tanggal) : "" }}</td>
          </tr>
          <tr>
            <td class="lbl">No. Invoice</td>
            <td>{{ target?.NomorInvoice || "-" }}</td>
          </tr>
          <tr>
            <td class="lbl">PPN</td>
            <td>{{ target?.Ppn }} %</td>
          </tr>
          <tr>
            <td class="lbl">Net</td>
            <td>{{ numFmt(target?.Net) }}</td>
          </tr>
        </table>

        <label class="inp-lbl">
          No. Faktur Pajak <span style="color: red">*</span>
        </label>
        <input
          v-model="noFaktur"
          class="f-inp"
          :maxlength="MAX_NO_FAKTUR"
          placeholder="Nomor faktur pajak"
          autofocus
          @keydown.enter.prevent="onSimpan"
        />
        <div v-if="sudahAdaFaktur" class="warn-timpa">
          Voucher ini sudah punya faktur ({{ target?.NomorPajak }}). Menyimpan
          akan menimpa nomor tersebut.
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" :disabled="isSaving" @click="showDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          :loading="isSaving"
          :disabled="!noFaktur.trim()"
          @click="onSimpan"
        >
          Simpan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-sep {
  font-size: 11px;
  color: #555;
}
.f-date,
.f-sel {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: white;
  color: #212121;
}
.f-date:disabled {
  background: #f3f4f6;
  color: #9ca3af;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}
.legend-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-lbl {
  font-size: 11px;
  color: #374151;
}
.num-cell {
  font-variant-numeric: tabular-nums;
}
.st-belum {
  font-size: 11px;
  font-weight: 700;
  color: #c62828;
}
.st-sudah {
  font-size: 11px;
  font-weight: 600;
  color: #2e7d32;
}

.dlg-card :deep(*) {
  font-size: 11px;
}
.info-tbl {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}
.info-tbl td {
  padding: 2px 0;
  vertical-align: top;
}
.info-tbl .lbl {
  width: 90px;
  color: #6b7280;
}
.inp-lbl {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #4b5563;
  margin-bottom: 4px;
}
.f-inp {
  width: 100%;
  height: 30px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
}
.f-inp:focus {
  border-color: #1565c0;
}
.warn-timpa {
  margin-top: 8px;
  padding: 6px 8px;
  font-size: 11px;
  color: #e65100;
  background: #fff3e0;
  border: 1px solid #ffcc80;
  border-radius: 4px;
}
</style>