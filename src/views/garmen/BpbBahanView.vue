<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { bpbBahanService } from "@/services/garmen/bpbBahanService";
import * as XLSX from "xlsx";
import {
  IconTruckDelivery,
  IconPrinter,
  IconFileExport,
  IconDotsVertical,
  IconShieldLock,
  IconSearch,
} from "@tabler/icons-vue";

interface ExportDetailRow {
  "No. BPB": string;
  "No. PO": string;
  "Tanggal BPB": string;
  Gudang: string;
  Supplier: string;
  "Kode Bahan": string;
  "Nama Bahan": string;
  Satuan: string;
  Jumlah: number;
  Roll: number;
  Gramasi: string;
  Warna: string;
  Setting: string;
}

const router = useRouter();
const toast = useToast();

// --- STATE FILTER ---
const d = new Date();
const firstDay = new Date(d.getFullYear(), d.getMonth(), 1)
  .toISOString()
  .substring(0, 10);
const today = d.toISOString().substring(0, 10);

const filterState = ref({
  dtAwal: firstDay,
  dtAkhir: today,
  isPo: true, // true = PO, false = NON PO
  gudang: "GB001",
  search: "",
});

// --- STATE DIALOG ---
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
  exportToExcel,
} = useBrowse({
  menuId: "101",
  fetchApi: async () => {
    const res = await bpbBahanService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      isPo: filterState.value.isPo,
      gudang: filterState.value.gudang,
    });
    return res.data.data;
  },
  immediate: false, // Panggil manual setelah komponen di-mount
});

// --- HEADERS UTAMA ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "140px", fixed: true },
  { title: "Nomor PO", key: "Nomor_PO", width: "140px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Jatuh Tempo", key: "Jatuhtempo", width: "100px", align: "center" },
  { title: "Barcode", key: "BuatBarcode", width: "90px", align: "center" },
  { title: "Supplier", key: "Supplier", width: "200px" },
  { title: "Ket. PO", key: "Ket_PO", width: "250px" },
  { title: "Keterangan", key: "Keterangan", width: "200px" },
  { title: "Voucher", key: "Voucher_bayar", width: "80px", align: "center" },
  { title: "Lunas", key: "Lunas", width: "80px", align: "center" },
  { title: "Gudang", key: "Gudang", width: "80px", align: "center" },
  { title: "User", key: "Usr", width: "100px" },
];

// --- EXPAND LOGIC (DETAIL BPB) ---
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.Nomor] && !expandedLoading.value[item.Nomor],
  );

  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    expandedLoading.value[nomor] = true;
    try {
      const res = await bpbBahanService.getDetail(nomor);
      detailCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal memuat detail BPB ${nomor}`);
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// --- STYLING BARIS ---
const rowPropsFn = (data: any) => {
  const classes: string[] = ["font-weight-medium"];
  return { class: classes.join(" ") };
};

const getNomorStyle = (ngedit: string, barcode: string) => {
  if (ngedit === "WAIT") return "background-color: #1976d2; color: white;"; // Biru
  if (ngedit === "TOLAK") return "background-color: #d32f2f; color: white;"; // Merah
  if (ngedit === "ACC") return "background-color: #388e3c; color: white;"; // Hijau
  if (barcode === "BELUM") return "background-color: #c62828; color: white;"; // Merah (Belum Barcode)
  return "";
};

// --- HANDLERS ---
onMounted(() => fetchData());

watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);
watch(() => filterState.value.gudang, fetchData);
watch(
  () => filterState.value.isPo,
  (val) => {
    if (!val) filterState.value.gudang = "GB001";
    fetchData();
  },
);

let searchTimeout: any;
const onSearchInput = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => fetchData(), 500);
};

const onAdd = () => {
  router.push({
    name: "BpbBahanCreate",
    query: { type: filterState.value.isPo ? "PO" : "NON" },
  });
};
const onEdit = (item: any) => {
  if (!item || !item.Nomor) return;

  // --- VALIDASI GUDANG CELUP (Sesuai Delphi) ---
  if (item.Gudang === "GC001") {
    return toast.warning(
      "Transaksi tsb punya gudang celup.\nTidak bisa diubah.",
    );
  }

  router.push(
    `/garmen/bahan-baku/bpb-bahan/form/${encodeURIComponent(item.Nomor)}`,
  );
};

const onDelete = async (item: any) => {
  // --- TAMBAHAN VALIDASI GUDANG CELUP (Sesuai cxButton4Click Delphi) ---
  if (item.Gudang === "GC001") {
    return toast.warning(
      "Transaksi tsb punya gudang celup.\nTidak bisa dihapus.",
    );
  }

  try {
    await bpbBahanService.delete(item.Nomor);
    toast.success("BPB berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus BPB.");
  }
};

const onPrint = () => {
  if (!selectedItem.value) {
    return toast.warning("Pilih data BPB terlebih dahulu.");
  }

  const url = router.resolve({
    name: "BpbBahanPrint",
    params: { nomor: selectedItem.value.Nomor },
  }).href;

  window.open(url, "_blank");
};

// --- EXPORT DETAIL (FUNGSIKAN MENGGUNAKAN XLSX) ---
const exportDetail = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  toast.info("Menyiapkan data detail untuk diexport... Mohon tunggu.");

  try {
    const allDetails: ExportDetailRow[] = [];

    // Loop untuk mengumpulkan detail dari setiap baris di tabel Master
    for (const item of items.value) {
      let detail = detailCache.value[item.Nomor];

      // Jika detail belum pernah dibuka (cache kosong), fetch dari API
      if (!detail) {
        const res = await bpbBahanService.getDetail(item.Nomor);
        detail = res.data.data;
        detailCache.value[item.Nomor] = detail;
      }

      if (detail && detail.length > 0) {
        detail.forEach((d: any) => {
          allDetails.push({
            "No. BPB": item.Nomor,
            "No. PO": item.Nomor_PO || "-",
            "Tanggal BPB": formatTgl(item.Tanggal),
            Gudang: item.Gudang,
            Supplier: item.Supplier || "-",
            "Kode Bahan": d.Kode,
            "Nama Bahan": d.Nama,
            Satuan: d.Satuan,
            Jumlah: Number(d.Jumlah) || 0,
            Roll: Number(d.Roll) || 0,
            Gramasi: d.Gramasi || "",
            Warna: d.Warna || "",
            Setting: d.Setting || "",
          });
        });
      }
    }

    if (allDetails.length === 0) {
      return toast.warning(
        "Tidak ada satupun detail yang ditemukan dari rentang tanggal ini.",
      );
    }

    // Convert ke Sheet dan eksekusi Download
    const worksheet = XLSX.utils.json_to_sheet(allDetails);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Detail BPB Bahan");
    XLSX.writeFile(workbook, `Export_Detail_BPB_Bahan_${today}.xlsx`);

    toast.success("Berhasil export detail BPB.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor detail BPB.");
  }
};

// --- HANDLER PENGAJUAN PIN ---
const openPinDialog = () => {
  if (selected.value.length === 0) {
    return toast.warning("Pilih data terlebih dahulu.");
  }

  // --- TAMBAHAN VALIDASI LOGIKA (Adaptasi Delphi) ---
  // Jika user bisa klik tombol "Ubah" (canEdit), berarti sebenarnya
  // dia tidak butuh PIN untuk mengedit data ini.
  if (selectedItem.value.Ngedit === "" && canEdit.value) {
    // Catatan: Jika ingin 100% presisi seperti Delphi, Anda bisa hit API /cek-tutup-buku di sini
    toast.info(
      "Tidak perlu pengajuan perubahan data. Transaksi masih terbuka.",
    );
  }

  alasanPin.value = "";
  pinDialog.value = true;
};

const submitPin = async () => {
  if (!alasanPin.value.trim())
    return toast.error("Alasan pengajuan wajib diisi.");
  try {
    await bpbBahanService.requestPin({
      nomor: selectedItem.value.Nomor,
      alasan: alasanPin.value,
    });
    toast.success("Pengajuan perubahan data berhasil dikirim.");
    pinDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mengirim pengajuan.");
  }
};

// Formatting helpers
const formatTgl = (v: string) => {
  if (!v) return "-";
  const d = new Date(v);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};
const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
</script>

<template>
  <BaseBrowse
    title="BPB Bahan Baku"
    menu-id="101"
    :icon="IconTruckDelivery"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @refresh="fetchData"
    @export="exportToExcel('BPB_Bahan_Header')"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Kategori</span>
        <select
          v-model="filterState.isPo"
          class="f-date font-weight-bold text-primary"
        >
          <option :value="true">BPB PO</option>
          <option :value="false">BPB Non PO</option>
        </select>

        <span class="f-sep ml-2">Gudang</span>
        <select
          v-model="filterState.gudang"
          class="f-date font-weight-bold"
          :disabled="!filterState.isPo"
        >
          <option value="GB001">GB001</option>
          <option value="GC001">GC001</option>
          <option value="GB002">GB002</option>
        </select>
      </div>

      <div class="f-divider" style="height: 16px; margin: 0 8px" />

      <div class="f-group">
        <span class="f-label">Tanggal</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>

      <div class="f-divider" style="height: 16px; margin: 0 8px" />

      <div class="legend-container">
        <span class="f-label text-grey">Warna Status:</span>
        <div class="legend-item">
          <span class="l-box bg-red-darken-3"></span> Belum Barcode / Tolak
        </div>
        <div class="legend-item">
          <span class="l-box bg-blue-darken-2"></span> Nunggu Acc
        </div>
        <div class="legend-item">
          <span class="l-box bg-green-darken-2"></span> Sudah Acc
        </div>
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <div class="search-box">
          <IconSearch :size="14" class="text-grey" />
          <input
            type="text"
            v-model="filterState.search"
            @input="onSearchInput"
            placeholder="Cari Data..."
            class="f-search-inp"
          />
        </div>
      </div>
    </template>

    <template #item.Nomor="{ item }">
      <div
        class="nomor-cell"
        :style="getNomorStyle(item.Ngedit, item.BuatBarcode)"
      >
        {{ item.Nomor }}
      </div>
    </template>

    <template #item.Tanggal="{ item }">{{ formatTgl(item.Tanggal) }}</template>
    <template #item.Jatuhtempo="{ item }">{{
      formatTgl(item.Jatuhtempo)
    }}</template>

    <!-- Detail Expand (Lazy Load) -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="expandedLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">Detail Barang - {{ item.Nomor }}</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="100">Kode</th>
                <th>Nama Bahan</th>
                <th width="80" class="text-center">Satuan</th>
                <th width="100" class="tr">Jumlah</th>
                <th width="80" class="tr">Roll</th>
                <th width="100" class="text-center">Gramasi</th>
                <th width="120">Warna</th>
                <th width="100" class="text-center">Setting</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in detailCache[item.Nomor]" :key="i">
                <td>{{ d.Kode }}</td>
                <td class="font-weight-bold">{{ d.Nama }}</td>
                <td class="text-center">{{ d.Satuan }}</td>
                <td class="tr text-blue-darken-2 font-weight-bold">
                  {{ numFmt(d.Jumlah) }}
                </td>
                <td class="tr">{{ numFmt(d.Roll) }}</td>
                <td class="text-center">{{ d.Gramasi || "-" }}</td>
                <td>{{ d.Warna || "-" }}</td>
                <td class="text-center">{{ d.Setting || "-" }}</td>
              </tr>
              <tr
                v-if="
                  !detailCache[item.Nomor] ||
                  detailCache[item.Nomor].length === 0
                "
              >
                <td colspan="8" class="text-center text-grey py-3 font-italic">
                  Detail BPB tidak ditemukan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Additional Actions (Titik Tiga) -->
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
          Nomor BPB: <b>{{ selectedItem?.Nomor }}</b>
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
.f-date:disabled {
  background: #f5f5f5;
  color: #999;
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

.search-box {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  height: 28px;
  width: 180px;
}
.f-search-inp {
  border: none;
  outline: none;
  font-size: 11px;
  padding-left: 6px;
  width: 100%;
}

/* --- Keterangan Warna (Legend) --- */
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
