<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { mkbService } from "@/services/pembelian/mkbService";
import {
  IconPrinter,
  IconFileExport,
  IconShieldLock,
  IconNotes,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();

const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
const dtAwal = ref(firstDay.toISOString().substring(0, 10));
const dtAkhir = ref(today.toISOString().substring(0, 10));

const filterState = ref({
  dtAwal: dtAwal.value,
  dtAkhir: dtAkhir.value,
});

watch(
  filterState,
  (newVal) => {
    if (newVal.dtAwal) dtAwal.value = newVal.dtAwal;
    if (newVal.dtAkhir) dtAkhir.value = newVal.dtAkhir;
  },
  { deep: true },
);

const headers = [
  { title: "Nomor", key: "Nomor", width: "130px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "PO", key: "PO", width: "60px", align: "center" },
  { title: "SPK", key: "SPK", width: "130px" },
  { title: "Tgl SPK", key: "TglSPK", width: "100px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "100px", align: "center" },
  { title: "Nama SPK", key: "NamaSpk", width: "250px" },
  { title: "Jumlah SPK", key: "JumlahSPK", width: "100px", align: "right" },
  { title: "Kain", key: "Kain", width: "160px" },
  { title: "Finishing", key: "Finishing", width: "160px" },
  { title: "Customer", key: "Customer", width: "200px" },
  { title: "Keterangan", key: "Keterangan", width: "250px" },
  { title: "User", key: "usr", width: "100px" },
];

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  isSingleSelected,
  selectedItem,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "51",
  fetchApi: async () => {
    const res = await mkbService.getBrowse(dtAwal.value, dtAkhir.value);
    return res.data.data;
  },
  immediate: false,
});

onMounted(() => fetchData());

watch([dtAwal, dtAkhir], () => {
  filterState.value.dtAwal = dtAwal.value;
  filterState.value.dtAkhir = dtAkhir.value;
  fetchData();
});

const expandedRows = ref<any[]>([]);
const poCache = ref<Record<string, any[]>>({});
const poLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) => !poCache.value[item.Nomor] && !poLoading.value[item.Nomor],
  );

  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    poLoading.value[nomor] = true;
    try {
      const res = await mkbService.getLinkedPo(nomor);
      poCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal memuat detail PO untuk ${nomor}`);
    } finally {
      poLoading.value[nomor] = false;
    }
  }
};

const onAdd = () => router.push("/pembelian/mkb/create");
const onEdit = (item: any) =>
  router.push(`/pembelian/mkb/edit/${encodeURIComponent(item.Nomor)}`);
const onDelete = async (item: any) => {
  try {
    await mkbService.deleteData(item.Nomor, item.Tanggal);
    toast.success("MKB berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  }
};

const onPrint = () => {
  if (!selectedItem.value) return toast.warning("Pilih data yang akan dicetak");
  toast.info("Fitur cetak sedang disiapkan: " + selectedItem.value.Nomor);
};

const onExportDetail = () =>
  toast.info("Fitur export detail akan memuat DTL terlebih dahulu...");

// Dialog Pengajuan PIN
const pinDialog = ref(false);
const pinForm = ref({ alasan: "" });

const openPinDialog = () => {
  if (!selectedItem.value) return;
  pinForm.value.alasan = "";
  pinDialog.value = true;
};

const submitPin = async () => {
  if (!pinForm.value.alasan) return toast.error("Alasan wajib diisi.");
  try {
    await mkbService.requestPin({
      nomor: selectedItem.value.Nomor,
      tanggal: selectedItem.value.Tanggal,
      spk: selectedItem.value.SPK,
      alasan: pinForm.value.alasan,
    });
    toast.success("Berhasil diajukan. Menunggu ACC.");
    pinDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mengajukan PIN.");
  }
};

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  const ket = item.Keterangan || "";
  const classes: string[] = ["font-weight-bold"];

  if (ket === "Belum ready") classes.push("text-red-darken-1");
  else if (ket === "Stok ready") classes.push("text-blue-darken-1");
  else if (ket === "Belum ready dan sudah po")
    classes.push("text-teal-darken-2");
  else if (ket === "Ready sebagian dan belum po")
    classes.push("text-purple-darken-1");
  else if (ket === "Ready sebagian dan sudah po")
    classes.push("text-orange-darken-2");

  const style = item.Plan === 0 ? "background-color: #fff59d;" : "";

  return { class: classes.join(" "), style };
};

const getSpkStyle = (ngedit: string) => {
  if (ngedit === "WAIT") return "background-color: #1976d2; color: #fff;";
  if (ngedit === "TOLAK") return "background-color: #d32f2f; color: #fff;";
  if (ngedit === "ACC") return "background-color: #388e3c; color: #fff;";
  return "";
};

const formatTgl = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};
</script>

<template>
  <BaseBrowse
    title="Memo Kebutuhan Bahan (MKB)"
    menu-id="51"
    :icon="IconNotes"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="exportToExcel('Data_MKB')"
    @refresh="fetchData"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="dtAwal"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="dtAkhir"
          class="date-inp"
          @change="fetchData"
        />
      </div>

      <div class="filter-divider" />

      <div class="legend-grid">
        <div class="legend-item">
          <div class="legend-dot" style="background: #e53935"></div>
          Belum Ready
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background: #1565c0"></div>
          Stok Ready
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background: #00695c"></div>
          Belum Ready dan sudah po
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background: #000"></div>
          Belum Ready dan kedatangan partial
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background: #e65100"></div>
          Ready sebagian dan sudah po
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background: #6a1b9a"></div>
          Ready sebagian dan belum po
        </div>
        <div class="legend-item">
          <div
            class="legend-dot"
            style="background: #fff59d; border: 1px solid #bdbdbd"
          ></div>
          Belum planning SPK
        </div>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend>
          <IconPrinter :size="15" :stroke-width="1.7" />
        </template>
        Cetak
      </v-btn>

      <v-btn size="small" color="teal-darken-2" @click="onExportDetail">
        <template #prepend>
          <IconFileExport :size="15" :stroke-width="1.7" />
        </template>
        Export Detail
      </v-btn>

      <v-btn
        v-if="canEdit"
        size="small"
        color="primary"
        variant="outlined"
        :disabled="selected.length === 0"
        @click="openPinDialog"
      >
        <template #prepend>
          <IconShieldLock :size="15" :stroke-width="1.7" />
        </template>
        Pengajuan Ubah
      </v-btn>
    </template>

    <template #item.SPK="{ item }">
      <div class="custom-cell" :style="getSpkStyle((item.raw || item).Ngedit)">
        {{ (item.raw || item).SPK }}
      </div>
    </template>

    <template #item.Tanggal="{ item }">{{
      formatTgl((item.raw || item).Tanggal)
    }}</template>
    <template #item.TglSPK="{ item }">{{
      formatTgl((item.raw || item).TglSPK)
    }}</template>
    <template #item.Dateline="{ item }">{{
      formatTgl((item.raw || item).Dateline)
    }}</template>

    <template #detail="{ item }">
      <div class="det-wrap">
        <div class="text-caption font-weight-bold mb-1 text-primary">
          Informasi PO Terkait: {{ item.Nomor }}
        </div>
        <v-progress-linear
          v-if="poLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <table v-else class="dt">
          <thead>
            <tr>
              <th style="text-align: left">No. PO</th>
              <th style="text-align: center; width: 110px">Tanggal</th>
              <th style="text-align: center; width: 70px">Link</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="po in poCache[item.Nomor]" :key="po.nomor">
              <td style="font-weight: 600; color: #1565c0">{{ po.nomor }}</td>
              <td style="text-align: center">{{ po.tanggal }}</td>
              <td style="text-align: center">
                <v-chip
                  size="x-small"
                  :color="po.link === 'Y' ? 'green' : 'grey'"
                  >{{ po.link }}</v-chip
                >
              </td>
            </tr>
            <tr v-if="!poCache[item.Nomor] || poCache[item.Nomor].length === 0">
              <td colspan="3" class="text-center text-grey py-2 font-italic">
                Tidak ada PO terkait
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <!-- Dialog Pengajuan PIN -->
  <v-dialog v-model="pinDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3">
        Pengajuan Perubahan Data (MKB)
      </v-card-title>
      <v-card-text class="pa-4">
        <div class="mb-3 text-body-2">
          <div><strong>Nomor:</strong> {{ selectedItem?.Nomor }}</div>
          <div><strong>SPK:</strong> {{ selectedItem?.SPK }}</div>
        </div>
        <v-textarea
          v-model="pinForm.alasan"
          label="Alasan Pengajuan"
          variant="outlined"
          density="compact"
          rows="3"
          autofocus
          hide-details
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="pinDialog = false">
          Batal
        </v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="submitPin">
          Ajukan Sekarang
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Filter ── */
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
  height: 22px;
  background: #d0d0d0;
  margin: 0 10px;
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
}
.date-inp:focus {
  border-color: #1976d2;
}

/* ── Legend ── */
.legend-grid {
  display: grid;
  grid-template-columns: repeat(4, auto);
  gap: 4px 12px;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}
.legend-item {
  display: flex;
  align-items: center;
  font-size: 10px;
  font-weight: 500;
  color: #424242;
  white-space: nowrap;
  gap: 4px;
}
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

/* ── Custom cell ── */
.custom-cell {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 4px;
  margin: 0 -8px;
}

/* ── Detail expand ── */
.det-wrap {
  padding: 8px 12px 10px 48px;
  background: #f5f6f8;
}
.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  max-width: 400px;
  background: white;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  overflow: hidden;
}
.dt th {
  background: #455a64;
  color: white;
  padding: 5px 8px;
  font-size: 10px;
  font-weight: 700;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.dt td {
  border-bottom: 1px solid #eeeeee;
  padding: 4px 8px;
  vertical-align: middle;
  font-size: 11px;
}
.dt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
</style>
