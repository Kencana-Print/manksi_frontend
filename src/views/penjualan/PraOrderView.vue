<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { praOrderService } from "@/services/penjualan/praOrderService";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  IconNotebook,
  IconClipboardList,
  IconPencilOff,
  IconSend,
  IconArrowBigRightLine,
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";
import { type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();
const router = useRouter();

// ── Filter state ──────────────────────────────────────────────────────
const getToday = () => new Date().toISOString().substr(0, 10);
const getPlus5 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toISOString().substr(0, 10);
};
const filterState = ref<Record<string, any>>({});
const divisiOptions = ref<any[]>([{ Kode: "0", Nama: "ALL" }]);

const startDate = computed({
  get: () => filterState.value.startDate ?? getToday(),
  set: (v) => {
    filterState.value = { ...filterState.value, startDate: v };
  },
});
const endDate = computed({
  get: () => filterState.value.endDate ?? getPlus5(),
  set: (v) => {
    filterState.value = { ...filterState.value, endDate: v };
  },
});
const divisiKode = computed({
  get: () => filterState.value.divisiKode ?? "0",
  set: (v) => {
    filterState.value = { ...filterState.value, divisiKode: v };
  },
});

watch(
  filterState,
  () => {
    fetchData();
  },
  { deep: true },
);

const loadDivisi = async () => {
  try {
    const res = await praOrderService.getDivisi();
    divisiOptions.value = [
      { Kode: "0", Nama: "ALL" },
      ...res.data.data.map((d: any) => ({
        Kode: d.Kode,
        Nama: `${d.Kode} - ${d.Nama}`,
      })),
    ];
  } catch {
    console.error("Gagal load divisi");
  }
};
onMounted(loadDivisi);

// ── Browse ────────────────────────────────────────────────────────────
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const {
  items,
  isLoading,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selected,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "175",
  fetchApi: async () => {
    const res = await praOrderService.getBrowseList({
      startDate: startDate.value,
      endDate: endDate.value,
      divisi: divisiKode.value,
    });
    return res.data.data;
  },
});

// ── Headers ───────────────────────────────────────────────────────────
const headers = [
  { title: "NOMOR", key: "Nomor", width: "150px" },
  { title: "DIVISI", key: "Divisi", width: "120px" },
  { title: "TANGGAL", key: "Tanggal", width: "100px", align: "center" },
  { title: "CUSTOMER", key: "Customer", width: "180px" },
  { title: "SALES", key: "Sales", width: "130px" },
  { title: "NAMA PEKERJAAN", key: "NamaPekerjaan", width: "220px" },
  { title: "Qty Rencana", key: "QtyRencana", width: "110px", align: "end" },
  { title: "Tgl Kirim", key: "TglKirim", width: "110px", align: "center" },
  {
    title: "Status Bahan",
    key: "StatusBahan",
    width: "130px",
    align: "center",
  },
  { title: "Status PPIC", key: "StatusPpic", width: "130px", align: "center" },
  { title: "No. MH", key: "NomorMH", width: "140px" },
  { title: "Status", key: "Status", width: "90px", align: "center" },
  { title: "Created", key: "Created", width: "150px" },
];

// ── Row coloring ──────────────────────────────────────────────────────
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Status === "CLOSE")
    return { class: "text-grey-darken-1 font-weight-medium" };
  if (item.StatusPpic === "TIDAK SANGGUP")
    return { class: "text-red font-weight-medium" };
  if (item.StatusPpic === "SANGGUP")
    return { class: "text-green font-weight-medium" };
  return {};
};

const fmtNum = (v: any) =>
  new Intl.NumberFormat("id-ID").format(Number(v) || 0);

// ── Navigation ────────────────────────────────────────────────────────
const handleAdd = () => router.push("/penjualan/pra-order/create");
const handleEdit = (item: any) =>
  router.push(`/penjualan/pra-order/edit/${item.Nomor}`);
const handleDelete = async (item: any) => {
  try {
    await praOrderService.deleteData(item.Nomor);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  }
};

const onExport = () => {
  const columns: ExcelColumn[] = [
    { header: "NOMOR", key: "Nomor" },
    { header: "DIVISI", key: "Divisi" },
    { header: "TANGGAL", key: "Tanggal", align: "center" },
    { header: "CUSTOMER", key: "Customer" },
    { header: "SALES", key: "Sales" },
    { header: "NAMA PEKERJAAN", key: "NamaPekerjaan", width: 26 },
    {
      header: "Qty Rencana",
      key: "QtyRencana",
      align: "right",
      numFmt: "#,##0",
    },
    { header: "Tgl Kirim", key: "TglKirim", align: "center" },
    { header: "Status Bahan", key: "StatusBahan", align: "center" },
    { header: "Status PPIC", key: "StatusPpic", align: "center" },
    { header: "No. MH", key: "NomorMH" },
    { header: "Status", key: "Status", align: "center" },
    { header: "Created", key: "Created" },
  ];

  exportToExcel("Data_Pra_Order", {
    getData: () => {
      const rawData =
        baseBrowseRef.value?.getFilteredItems?.() ?? items.value ?? [];
      return rawData.map((r: any) => ({
        ...r,
        Tanggal: formatTanggal(r.Tanggal),
        TglKirim: formatTanggal(r.TglKirim),
        Created: formatTanggalJam(r.Created),
      }));
    },
    columns,
    sheetName: "Pra Order",
    title: `Data Pra Order — Periode ${startDate.value} s.d ${endDate.value}`,
  });
};

// ── Pengajuan perubahan (PIN 5) ───────────────────────────────────────
const showPinDialog = ref(false);
const isPinLoading = ref(false);
const pinData = ref({ Nomor: "", Urut: 1, Alasan: "" });

const openPengajuanEdit = async () => {
  if (!selected.value.length) return;
  const item = selected.value[0];
  isPinLoading.value = true;
  try {
    const res = await praOrderService.getPengajuanStatus(item.Nomor);
    pinData.value = {
      Nomor: item.Nomor,
      Urut: res.data.data.urut,
      Alasan: res.data.data.alasan,
    };
    showPinDialog.value = true;
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Gagal mengecek status pengajuan.",
    );
  } finally {
    isPinLoading.value = false;
  }
};

const submitPengajuan = async () => {
  if (!pinData.value.Alasan.trim()) {
    toast.warning("Alasan harus diisi.");
    return;
  }
  isPinLoading.value = true;
  try {
    const res = await praOrderService.submitPengajuan(
      pinData.value.Nomor,
      pinData.value.Urut,
      pinData.value.Alasan,
    );
    toast.success(res.data.message);
    showPinDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal melakukan pengajuan.");
  } finally {
    isPinLoading.value = false;
  }
};

// ── Konversi ke Permintaan Harga ──────────────────────────────────────
const isConverting = ref(false);
const handleConvert = async () => {
  if (!selected.value.length) return;
  const item = selected.value[0];
  if (item.StatusPpic !== "SANGGUP") {
    toast.warning("PPIC belum menyatakan sanggup untuk order ini.");
    return;
  }
  isConverting.value = true;
  try {
    const res = await praOrderService.convertToMintaHarga(item.Nomor);
    toast.success(res.data.message);
    fetchData();
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Gagal konversi ke Permintaan Harga.",
    );
  } finally {
    isConverting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Pra Order"
    menu-id="175"
    :icon="IconNotebook"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :row-props-fn="rowPropsFn"
    item-value="Nomor"
    v-model:filter-state="filterState"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="onExport"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="startDate"
          class="date-inp"
          @change="startDate = ($event.target as HTMLInputElement).value"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="endDate"
          class="date-inp"
          @change="endDate = ($event.target as HTMLInputElement).value"
        />
      </div>

      <div class="filter-divider" />

      <div class="filter-group">
        <span class="filter-label">Divisi</span>
        <select
          :value="divisiKode"
          class="filter-select"
          @change="divisiKode = ($event.target as HTMLSelectElement).value"
        >
          <option
            v-for="opt in divisiOptions"
            :key="opt.Kode"
            :value="opt.Kode"
          >
            {{ opt.Nama }}
          </option>
        </select>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        v-if="canEdit"
        size="small"
        color="success"
        variant="elevated"
        :disabled="selected.length === 0"
        :loading="isConverting"
        @click="handleConvert"
      >
        <template #prepend
          ><IconArrowBigRightLine :size="15" :stroke-width="1.7"
        /></template>
        Lanjut ke Permintaan Harga
      </v-btn>
      <v-btn
        v-if="canEdit"
        size="small"
        color="warning"
        variant="elevated"
        :disabled="selected.length === 0"
        :loading="isPinLoading"
        @click="openPengajuanEdit"
      >
        <template #prepend
          ><IconPencilOff :size="15" :stroke-width="1.7"
        /></template>
        Pengajuan Perubahan Data
      </v-btn>
    </template>

    <template #filter-right>
      <div class="legend-box">
        <div class="legend-row">
          <span class="legend-title">Status PPIC:</span>
          <div class="legend-item">
            <div class="legend-dot" style="background: #757575"></div>
            <span>PENDING</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #2e7d32"></div>
            <span>SANGGUP</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #e53935"></div>
            <span>TIDAK SANGGUP</span>
          </div>
        </div>
        <div class="legend-divider" />
        <div class="legend-row">
          <span class="legend-title">Back Color Ngedit:</span>
          <div class="legend-item">
            <div class="legend-dot" style="background: #1565c0"></div>
            <span>WAIT</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #2e7d32"></div>
            <span>ACC</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #e53935"></div>
            <span>TOLAK</span>
          </div>
        </div>
      </div>
    </template>

    <template #item.QtyRencana="{ item }">{{
      fmtNum((item.raw || item).QtyRencana)
    }}</template>
    <template #item.Tanggal="{ item }">{{
      formatTanggal((item.raw || item).Tanggal)
    }}</template>
    <template #item.TglKirim="{ item }">{{
      formatTanggal((item.raw || item).TglKirim)
    }}</template>
    <template #item.Created="{ item }">{{
      formatTanggalJam((item.raw || item).Created)
    }}</template>

    <template #item.Nomor="{ item }">
      <div
        :class="[
          'nomor-badge',
          (item.raw || item).Ngedit === 'WAIT'
            ? 'ngedit-wait'
            : (item.raw || item).Ngedit === 'ACC'
              ? 'ngedit-acc'
              : (item.raw || item).Ngedit === 'TOLAK'
                ? 'ngedit-tolak'
                : '',
        ]"
      >
        {{ (item.raw || item).Nomor }}
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showPinDialog" max-width="480px" persistent>
    <div class="pin-card">
      <div class="pin-header">
        <IconPencilOff :size="15" color="white" class="mr-2" />
        <span>Pengajuan Perubahan Data</span>
        <button class="pin-close" @click="showPinDialog = false">✕</button>
      </div>
      <div class="pin-body">
        <div class="pin-row">
          <span class="pin-label">Nomor</span>
          <span class="pin-value fw">{{ pinData.Nomor }}</span>
        </div>
        <div class="pin-row">
          <span class="pin-label">Urut Ke</span>
          <span class="pin-value fw">{{ pinData.Urut }}</span>
        </div>
        <div class="pin-row" style="align-items: flex-start; margin-top: 8px">
          <span class="pin-label" style="padding-top: 4px">Alasan *</span>
          <textarea
            v-model="pinData.Alasan"
            class="pin-textarea"
            rows="4"
            placeholder="Tuliskan alasan pengajuan..."
          ></textarea>
        </div>
      </div>
      <div class="pin-footer">
        <button
          class="pin-btn primary"
          :disabled="isPinLoading"
          @click="submitPengajuan"
        >
          <IconSend :size="13" class="mr-1" />
          {{ isPinLoading ? "Mengajukan..." : "Ajukan Sekarang" }}
        </button>
        <button
          class="pin-btn secondary"
          :disabled="isPinLoading"
          @click="showPinDialog = false"
        >
          Batal
        </button>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
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
.filter-select:focus {
  border-color: #1976d2;
}
.legend-box {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 5px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}
.legend-item span {
  font-size: 10px;
  color: #424242;
  white-space: nowrap;
}
.legend-title {
  font-size: 10px;
  font-weight: 700;
  color: #424242;
  white-space: nowrap;
}
.legend-divider {
  height: 1px;
  background: #eeeeee;
}
.nomor-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
  min-width: 110px;
}
.ngedit-wait {
  background: #1565c0;
  color: white;
}
.ngedit-acc {
  background: #2e7d32;
  color: white;
}
.ngedit-tolak {
  background: #e53935;
  color: white;
}
.pin-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.pin-header {
  display: flex;
  align-items: center;
  background: #f57c00;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  gap: 6px;
}
.pin-close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
}
.pin-close:hover {
  color: white;
}
.pin-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pin-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pin-label {
  width: 70px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #555;
}
.pin-value {
  font-size: 12px;
  color: #212121;
}
.fw {
  font-weight: 700;
}
.pin-textarea {
  flex: 1;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  color: #212121;
  min-height: 80px;
}
.pin-textarea:focus {
  border-color: #1976d2;
}
.pin-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.pin-btn {
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.pin-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.pin-btn.primary {
  background: #1565c0;
  color: white;
}
.pin-btn.primary:hover:not(:disabled) {
  background: #1557a8;
}
.pin-btn.secondary {
  background: #e0e0e0;
  color: #424242;
  margin-left: auto;
}
.pin-btn.secondary:hover:not(:disabled) {
  background: #d0d0d0;
}
</style>
