<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { koreksiStokBahanService } from "@/services/garmen/koreksiStokBahanService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconSettings,
  IconPrinter,
  IconFileExport,
  IconDotsVertical,
  IconShieldLock,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

// --- STATE FILTER (default: awal bulan s.d. hari ini) ---
const d = new Date();
const toLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const firstDay = toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
const today = toLocalDateStr(d);

const filterState = ref({
  dtAwal: firstDay,
  dtAkhir: today,
});

// --- STATE DIALOG PENGAJUAN ---
const pinDialog = ref(false);
const alasanPin = ref("");

// --- BROWSE SETUP ---
const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selectedItem,
  fetchData,
} = useBrowse({
  menuId: "115",
  fetchApi: async () => {
    const res = await koreksiStokBahanService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
    });
    return res.data.data;
  },
  immediate: false,
});

// --- HEADERS UTAMA ---
const headers = [
  { title: "Nomor", key: "nomor", width: "160px", fixed: true },
  { title: "Tanggal", key: "tanggal", width: "100px", align: "center" },
  { title: "Kode Gudang", key: "kode", width: "100px" },
  { title: "Nama Gudang", key: "nama", width: "220px" },
  { title: "Keterangan", key: "keterangan", width: "260px" },
  { title: "User", key: "usr", width: "100px" },
];

// --- EXPAND LOGIC (DETAIL) ---
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.nomor] && !expandedLoading.value[item.nomor],
  );

  for (const item of newlyExpanded) {
    const nomor = item.nomor;
    expandedLoading.value[nomor] = true;
    try {
      const res = await koreksiStokBahanService.getDetail(nomor);
      detailCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal memuat detail Koreksi Stok ${nomor}`);
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// --- STYLING BARIS (warna sesuai status Ngedit) ---
const getNomorStyle = (ngedit: string) => {
  if (ngedit === "WAIT") return "background-color: #1976d2; color: white;";
  if (ngedit === "TOLAK") return "background-color: #d32f2f; color: white;";
  if (ngedit === "ACC") return "background-color: #388e3c; color: white;";
  return "";
};

// --- HANDLERS ---
onMounted(() => fetchData());
watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);

const onAdd = () => {
  router.push({ name: "KoreksiStokBahanCreate" });
};

const onEdit = (item: any) => {
  if (!item || !item.nomor) return;
  router.push(
    `/garmen/bahan-baku/koreksi-stok/form/${encodeURIComponent(item.nomor)}`,
  );
};

const onDelete = async (item: any) => {
  try {
    await koreksiStokBahanService.delete(item.nomor);
    toast.success("Koreksi stok berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  }
};

const onPrint = () => {
  if (!selectedItem.value) {
    return toast.warning("Pilih data terlebih dahulu.");
  }
  const url = router.resolve({
    name: "KoreksiStokBahanPrint",
    params: { nomor: selectedItem.value.nomor },
  }).href;
  window.open(url, "_blank");
};

// --- EXPORT (header) ---
const onExport = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  try {
    await exportExcelSingle(
      `Export_Koreksi_Stok_Bahan_${today}.xlsx`,
      "Koreksi Stok Bahan",
      [
        { header: "Nomor", key: "nomor", width: 20 },
        { header: "Tanggal", key: "tanggal", width: 14, align: "center" },
        { header: "Kode Gudang", key: "kode", width: 14 },
        { header: "Nama Gudang", key: "nama", width: 26 },
        { header: "Keterangan", key: "keterangan", width: 30 },
        { header: "User", key: "usr", width: 14 },
      ],
      items.value.map((it: any) => ({
        ...it,
        tanggal: formatTanggal(it.tanggal),
      })),
      "Laporan Koreksi Stok Bahan",
    );
    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  }
};

// --- EXPORT DETAIL ---
const exportDetail = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  toast.info("Menyiapkan data detail untuk diexport... Mohon tunggu.");

  try {
    const allDetails: any[] = [];

    for (const item of items.value) {
      let detail = detailCache.value[item.nomor];
      if (!detail) {
        const res = await koreksiStokBahanService.getDetail(item.nomor);
        detail = res.data.data;
        detailCache.value[item.nomor] = detail;
      }

      if (detail && detail.length > 0) {
        detail.forEach((dRow: any) => {
          allDetails.push({
            nomor: item.nomor,
            tanggal: formatTanggal(item.tanggal),
            gudang: item.nama,
            kode: dRow.kode,
            nama: dRow.nama,
            satuan: dRow.satuan,
            stok: Number(dRow.stok) || 0,
            jumlah: Number(dRow.jumlah) || 0,
            selisih: Number(dRow.selisih) || 0,
          });
        });
      }
    }

    if (allDetails.length === 0) {
      return toast.warning(
        "Tidak ada satupun detail yang ditemukan dari rentang tanggal ini.",
      );
    }

    await exportExcelSingle(
      `Export_Detail_Koreksi_Stok_Bahan_${today}.xlsx`,
      "Detail Koreksi Stok Bahan",
      [
        { header: "No. Koreksi", key: "nomor", width: 20 },
        { header: "Tanggal", key: "tanggal", width: 14, align: "center" },
        { header: "Gudang", key: "gudang", width: 24 },
        { header: "Kode Bahan", key: "kode", width: 14 },
        { header: "Nama Bahan", key: "nama", width: 30 },
        { header: "Satuan", key: "satuan", width: 10, align: "center" },
        {
          header: "Stok",
          key: "stok",
          width: 14,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Jumlah",
          key: "jumlah",
          width: 14,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Selisih",
          key: "selisih",
          width: 14,
          align: "right",
          numFmt: "#,##0",
        },
      ],
      allDetails,
      "Detail Koreksi Stok Bahan",
    );

    toast.success("Berhasil export detail.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor detail.");
  }
};

// --- HANDLER PENGAJUAN PIN ---
const openPinDialog = () => {
  if (selected.value.length === 0) return toast.warning("Pilih data...");
  alasanPin.value = "";
  pinDialog.value = true;
};

const submitPin = async () => {
  if (!alasanPin.value.trim())
    return toast.error("Alasan pengajuan wajib diisi.");
  try {
    await koreksiStokBahanService.requestPin({
      nomor: selectedItem.value.nomor,
      alasan: alasanPin.value,
    });
    toast.success("Pengajuan perubahan data berhasil dikirim.");
    pinDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mengirim pengajuan.");
  }
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
</script>

<template>
  <BaseBrowse
    title="Koreksi Stok Bahan"
    menu-id="115"
    :icon="IconSettings"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="nomor"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @refresh="fetchData"
    @export="onExport"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>

      <div class="f-divider" />

      <div class="legend-container">
        <span class="f-label text-grey">Warna Status:</span>
        <div class="legend-item">
          <span class="l-box bg-red-darken-3"></span> Tolak
        </div>
        <div class="legend-item">
          <span class="l-box bg-blue-darken-2"></span> Nunggu Acc
        </div>
        <div class="legend-item">
          <span class="l-box bg-green-darken-2"></span> Sudah Acc
        </div>
      </div>
    </template>

    <template #item.nomor="{ item }">
      <div class="nomor-cell" :style="getNomorStyle(item.ngedit)">
        {{ item.nomor }}
      </div>
    </template>

    <template #item.tanggal="{ item }">
      {{ formatTanggal(item.tanggal) }}
    </template>

    <!-- Detail Expand (Lazy Load) -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="expandedLoading[item.nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">Detail Bahan - {{ item.nomor }}</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="100">Kode</th>
                <th>Nama Bahan</th>
                <th width="80" class="text-center">Satuan</th>
                <th width="100" class="tr">Stok</th>
                <th width="100" class="tr">Jumlah</th>
                <th width="100" class="tr">Selisih</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(dRow, i) in detailCache[item.nomor]" :key="i">
                <td>{{ dRow.kode }}</td>
                <td class="font-weight-bold">{{ dRow.nama }}</td>
                <td class="text-center">{{ dRow.satuan }}</td>
                <td class="tr">{{ numFmt(dRow.stok) }}</td>
                <td class="tr text-blue-darken-2 font-weight-bold">
                  {{ numFmt(dRow.jumlah) }}
                </td>
                <td class="tr">{{ numFmt(dRow.selisih) }}</td>
              </tr>
              <tr
                v-if="
                  !detailCache[item.nomor] ||
                  detailCache[item.nomor].length === 0
                "
              >
                <td colspan="6" class="text-center text-grey py-3 font-italic">
                  Detail koreksi tidak ditemukan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Additional Actions -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend><IconPrinter :size="15" /></template>Cetak
      </v-btn>
      <v-btn size="small" color="deep-purple-darken-1" @click="exportDetail">
        <template #prepend><IconFileExport :size="15" /></template>Export Detail
      </v-btn>

      <v-menu v-if="selected.length > 0">
        <template #activator="{ props }">
          <v-btn size="small" color="teal-darken-3" v-bind="props" class="ml-2">
            <template #prepend><IconDotsVertical :size="15" /></template
            >Tindakan
          </v-btn>
        </template>
        <v-list density="compact" class="text-caption">
          <v-list-item @click="openPinDialog" :disabled="!canEdit">
            <template #prepend
              ><IconShieldLock :size="14" class="mr-2 text-primary"
            /></template>
            <v-list-item-title>Pengajuan Perubahan Data</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </BaseBrowse>

  <!-- Dialog Request PIN -->
  <v-dialog v-model="pinDialog" max-width="400">
    <v-card rounded="lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Pengajuan Perubahan Data
      </v-card-title>
      <v-card-text class="pa-4">
        <p class="text-caption mb-2">
          Nomor: <b>{{ selectedItem?.nomor }}</b>
        </p>
        <v-textarea
          v-model="alasanPin"
          label="Alasan Perubahan"
          variant="outlined"
          density="compact"
          rows="3"
          hide-details
          autofocus
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="pinDialog = false">Batal</v-btn>
        <v-btn color="primary" variant="elevated" @click="submitPin"
          >Ajukan</v-btn
        >
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
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}

.legend-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  padding: 2px 8px;
  border-radius: 4px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #424242;
  white-space: nowrap;
}
.l-box {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  display: inline-block;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.nomor-cell {
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  display: inline-block;
  min-width: 100%;
  font-weight: bold;
}

.expand-wrap {
  padding: 10px 10px 10px 40px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: bold;
  color: #1565c0;
  text-transform: uppercase;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-size: 11px;
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 8px;
  font-weight: bold;
}
.detail-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
}
.tr {
  text-align: right !important;
}
</style>
