<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import { format, subDays } from "date-fns";
import * as XLSX from "xlsx";
import BaseBrowse from "@/components/BaseBrowse.vue";

const toast = useToast();
const router = useRouter();
const API_SURAT_JALAN = "/mmt/surat-jalan";

// --- Interfaces ---
interface MasterSJ {
  Nomor: string;
  Tanggal: string;
  Divisi?: string;
  Invoice?: string;
  KdCus?: string;
  Customer?: string;
  Alamat?: string;
  Kota?: string;
  Keterangan?: string;
  Gudang?: string;
  QtyKirim?: number;
  Approved?: string;
  Ngedit?: string; // 'WAIT' | 'ACC' | 'TOLAK' | ''
  Created?: string;
  Modified?: string;
  ListSPK?: string;
}

interface DetailSJ {
  Nomor: string;
  SPK: string;
  Nama: string;
  Ukuran?: string;
  Panjang?: number;
  Lebar?: number;
  Jumlah: number;
  Koli?: number;
  Keterangan?: string;
}

// --- State Management ---
const masterData = ref<MasterSJ[]>([]);
const details = ref<Record<string, DetailSJ[]>>({});
const loading = ref(true);
const loadingExport = ref(false);
const loadingDetails = ref(new Set<string>());
const selected = ref<MasterSJ[]>([]);
const expanded = ref<any[]>([]);

const startDate = ref(format(subDays(new Date(), 30), "yyyy-MM-dd"));
const endDate = ref(format(new Date(), "yyyy-MM-dd"));

// State Filter Search SPK
const searchSpk = ref("");
const allPeriodSpk = ref(false);

// State Dialog Pengajuan Edit
const dialogPengajuan = ref(false);
const loadingPengajuan = ref(false);
const formPengajuan = reactive({
  nomor: "",
  tanggal: "",
  keterangan: "",
  urut: 1,
  alasan: "",
});

// --- User Config ---
const getSessionUser = () => {
  try {
    const userSession = localStorage.getItem("userData");
    return userSession ? JSON.parse(userSession) : null;
  } catch (e) {
    return null;
  }
};

const userConfig = reactive({
  kdUser: getSessionUser()?.kdUser || "ADMIN",
  zcus: 1,
  zdivisi: 0,
});

// --- Headers Grid ---
const masterHeaders = computed(() => {
  const headers = [
    {
      title: "Detail",
      key: "data-table-expand",
      minWidth: "60px",
      align: "center",
      fixed: true,
    },
    { title: "Status Edit", key: "Ngedit", minWidth: "120px", fixed: true },
    { title: "Nomor SJ", key: "Nomor", minWidth: "150px", fixed: true },
    { title: "Tanggal", key: "Tanggal", minWidth: "120px" },
    { title: "Approved", key: "Approved", minWidth: "110px" },
    { title: "Gudang", key: "Gudang", minWidth: "180px" },
    { title: "Total Qty", key: "QtyKirim", minWidth: "110px", align: "end" },
  ];

  if (userConfig.zcus === 1) {
    headers.push(
      { title: "Kode Cus", key: "KdCus", minWidth: "110px" },
      { title: "Customer", key: "Customer", minWidth: "200px" },
      { title: "Alamat", key: "Alamat", minWidth: "220px" },
      { title: "Kota", key: "Kota", minWidth: "120px" },
    );
  }

  headers.push(
    { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
    { title: "Invoice", key: "Invoice", minWidth: "140px" },
    { title: "Created", key: "Created", minWidth: "160px" },
  );

  return headers;
});

const detailHeaders = [
  { title: "Nomor SPK", key: "SPK", minWidth: "140px" },
  { title: "Nama SPK", key: "Nama", minWidth: "220px" },
  { title: "Ukuran", key: "Ukuran", minWidth: "120px" },
  { title: "Panjang", key: "Panjang", minWidth: "100px", align: "end" },
  { title: "Lebar", key: "Lebar", minWidth: "100px", align: "end" },
  { title: "Jumlah", key: "Jumlah", minWidth: "100px", align: "end" },
  { title: "Koli", key: "Koli", minWidth: "80px", align: "end" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
];

const parseCustomDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parts = dateString.split("-");
  if (parts.length !== 3) return null;
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
};

// --- Data Fetching ---
const fetchData = async () => {
  loading.value = true;
  try {
    const res = await api.get(`${API_SURAT_JALAN}/`, {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
        zcus: userConfig.zcus,
        zdivisi: userConfig.zdivisi,
        spk: searchSpk.value?.trim() || undefined,
        allPeriod:
          searchSpk.value?.trim() && allPeriodSpk.value ? true : undefined,
      },
    });
    masterData.value = res.data.data || res.data || [];

    // Jika sedang mencari nomor SPK, otomatis buka detail agar nomor SPK langsung terlihat di detail
    if (searchSpk.value.trim() && masterData.value.length > 0) {
      expanded.value = masterData.value.map((m) => m.Nomor);
      const unCached = masterData.value
        .map((m) => m.Nomor)
        .filter((nomor) => !details.value[nomor]);
      if (unCached.length > 0) {
        api
          .post(`${API_SURAT_JALAN}/detail-bulk`, { nomorList: unCached })
          .then((resDtl) => {
            const dtls = resDtl.data.data || [];
            dtls.forEach((d: DetailSJ) => {
              if (!details.value[d.Nomor]) details.value[d.Nomor] = [];
              details.value[d.Nomor].push(d);
            });
          })
          .catch((e) => console.error("Auto fetch detail error:", e));
      }
    }
  } catch (error: any) {
    toast.error(
      error.response?.data?.message || "Gagal mengambil data Surat Jalan",
    );
  } finally {
    loading.value = false;
  }
};

const handleClearSearchSpk = () => {
  searchSpk.value = "";
  fetchData();
};

const handleExpandUpdate = async (expandedKeys: any[]) => {
  const lastItem = expandedKeys[expandedKeys.length - 1];
  if (!lastItem) return;

  const nomorSJ = typeof lastItem === "object" ? lastItem.Nomor : lastItem;
  if (!nomorSJ || details.value[nomorSJ]) return;

  loadingDetails.value.add(nomorSJ);
  try {
    const res = await api.get(`${API_SURAT_JALAN}/detail`, {
      params: { nomor: nomorSJ },
    });
    details.value[nomorSJ] = res.data.data || res.data || [];
  } catch (error) {
    details.value[nomorSJ] = [];
  } finally {
    loadingDetails.value.delete(nomorSJ);
  }
};

const isLoadingDetails = (nomor: string) => loadingDetails.value.has(nomor);

// --- Warna Status Ngedit & Approval ---
const getNgeditBadge = (status: string) => {
  switch (status) {
    case "WAIT":
      return { color: "info", text: "MENUNGGU ACC" };
    case "ACC":
      return { color: "success", text: "DIETAPKAN / ACC" };
    case "TOLAK":
      return { color: "error", text: "DITOLAK" };
    default:
      return { color: "grey", text: "-" };
  }
};

const getStatusColor = (status: string) => {
  if (status === "Batal") return "blue";
  if (status === "Sudah") return "green";
  return "red";
};

const handleRowClick = (_event: any, row: any) => {
  const index = selected.value.findIndex((s) => s.Nomor === row.item.Nomor);
  if (index > -1) {
    selected.value.splice(index, 1);
  } else {
    selected.value = [row.item];
  }
};

const getRowProps = ({ item }: any) => ({
  class: selected.value.some((s) => s.Nomor === item.Nomor)
    ? "row-selected"
    : "",
});

// =========================================================================
// FITUR 1: CETAK SURAT JALAN (MEMBUKA FILE PRINT TERPISAH)
// =========================================================================
const handlePrint = () => {
  if (selected.value.length === 0) {
    toast.warning("Pilih Surat Jalan yang akan dicetak.");
    return;
  }

  const item = selected.value[0];

  // Membuka tab cetak tanpa query mode=inkjet
  const routeData = router.resolve({
    path: "/mmt/surat-jalan/print",
    query: {
      nomor: item.Nomor,
    },
  });

  window.open(routeData.href, "_blank");
};

// =========================================================================
// FITUR: EXPORT DATA EXCEL (RINGKASAN & DETAIL ITEM SPK)
// =========================================================================
const handleExportExcel = async () => {
  if (masterData.value.length === 0) {
    toast.warning("Tidak ada data Surat Jalan untuk di-export.");
    return;
  }

  loadingExport.value = true;
  try {
    // 1. Kumpulkan semua nomor SJ yang sedang tampil
    const nomorList = masterData.value.map((m) => m.Nomor);

    // 2. Ambil detail untuk semua nomor SJ secara bulk
    let allDetails: DetailSJ[] = [];
    try {
      const resDetail = await api.post(`${API_SURAT_JALAN}/detail-bulk`, {
        nomorList,
      });
      allDetails = resDetail.data.data || [];
    } catch (err) {
      console.warn("Gagal mengambil bulk detail, gunakan cached:", err);
      allDetails = Object.values(details.value).flat();
    }

    // Map detail per nomor SJ untuk lookup cepat
    const detailsByNomor: Record<string, DetailSJ[]> = {};
    allDetails.forEach((d) => {
      if (!detailsByNomor[d.Nomor]) detailsByNomor[d.Nomor] = [];
      detailsByNomor[d.Nomor].push(d);
    });

    // 3. Bangun Sheet 1: Detail Item SPK (Nomor SPK berada di detail)
    const detailData: any[] = [];
    let detailIdx = 1;

    masterData.value.forEach((m) => {
      const items = detailsByNomor[m.Nomor] || [];
      if (items.length > 0) {
        items.forEach((d) => {
          detailData.push({
            No: detailIdx++,
            "Nomor SJ": m.Nomor,
            Tanggal: m.Tanggal || "",
            Customer: m.Customer || "-",
            Gudang: m.Gudang || "-",
            "Nomor SPK": d.SPK || "-",
            "Nama SPK / Barang": d.Nama || "-",
            Ukuran: d.Ukuran || "-",
            Panjang: Number(d.Panjang || 0),
            Lebar: Number(d.Lebar || 0),
            "Jumlah (Pcs)": Number(d.Jumlah || 0),
            Koli: Number(d.Koli || 0),
            "Keterangan Item": d.Keterangan || "-",
            "Keterangan SJ": m.Keterangan || "-",
            Invoice: m.Invoice || "-",
          });
        });
      } else {
        detailData.push({
          No: detailIdx++,
          "Nomor SJ": m.Nomor,
          Tanggal: m.Tanggal || "",
          Customer: m.Customer || "-",
          Gudang: m.Gudang || "-",
          "Nomor SPK": "-",
          "Nama SPK / Barang": "-",
          Ukuran: "-",
          Panjang: 0,
          Lebar: 0,
          "Jumlah (Pcs)": Number(m.QtyKirim || 0),
          Koli: 0,
          "Keterangan Item": "-",
          "Keterangan SJ": m.Keterangan || "-",
          Invoice: m.Invoice || "-",
        });
      }
    });

    // 4. Bangun Sheet 2: Ringkasan Header Surat Jalan
    const headerData = masterData.value.map((m, idx) => ({
      No: idx + 1,
      "Nomor SJ": m.Nomor,
      Tanggal: m.Tanggal || "",
      "Status Edit": getNgeditBadge(m.Ngedit || "").text,
      Approved: m.Approved || "Pending",
      Gudang: m.Gudang || "-",
      "Total Qty": Number(m.QtyKirim || 0),
      ...(userConfig.zcus === 1
        ? {
            "Kode Cus": m.KdCus || "-",
            Customer: m.Customer || "-",
            Alamat: m.Alamat || "-",
            Kota: m.Kota || "-",
          }
        : {}),
      Keterangan: m.Keterangan || "-",
      Invoice: m.Invoice || "-",
      Created: m.Created || "-",
    }));

    // 5. Buat workbook Excel
    const wb = XLSX.utils.book_new();

    const wsDetail = XLSX.utils.json_to_sheet(detailData);
    wsDetail["!cols"] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 14 },
      { wch: 26 },
      { wch: 22 },
      { wch: 22 },
      { wch: 30 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 10 },
      { wch: 26 },
      { wch: 26 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Item SPK");

    const wsHeader = XLSX.utils.json_to_sheet(headerData);
    wsHeader["!cols"] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 22 },
      { wch: 12 },
      { wch: 12 },
      { wch: 26 },
      { wch: 30 },
      { wch: 16 },
      { wch: 26 },
      { wch: 16 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, wsHeader, "Ringkasan SJ");

    // 6. Simpan file
    const spkSuffix = searchSpk.value?.trim()
      ? `_SPK_${searchSpk.value.trim().replace(/[^a-zA-Z0-9-_]/g, "_")}`
      : "";
    const fileName = `Surat_Jalan_${startDate.value}_sd_${endDate.value}${spkSuffix}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast.success("Export Excel Berhasil!");
  } catch (error: any) {
    console.error("Export Excel error:", error);
    toast.error("Gagal melakukan export Excel.");
  } finally {
    loadingExport.value = false;
  }
};

// =========================================================================
// FITUR 2: HAPUS SURAT JALAN
// =========================================================================
const handleDelete = async () => {
  if (selected.value.length === 0) {
    toast.warning("Pilih Surat Jalan yang akan dihapus.");
    return;
  }

  const item = selected.value[0];

  if (item.Approved === "Sudah") {
    toast.error(
      "Sudah di Approve. Silahkan Pending/Batal Approve dulu sebelum dihapus.",
    );
    return;
  }

  if (!confirm(`Yakin ingin menghapus Surat Jalan nomor ${item.Nomor}?`))
    return;

  loading.value = true;
  try {
    await api.delete(`${API_SURAT_JALAN}/${encodeURIComponent(item.Nomor)}`, {
      params: { invoice: item.Invoice, approved: item.Approved },
    });
    toast.success("Surat Jalan berhasil dihapus");
    selected.value = [];
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal menghapus Surat Jalan");
  } finally {
    loading.value = false;
  }
};

// =========================================================================
// FITUR 3: PENGAJUAN EDIT DATA
// =========================================================================
const handleOpenPengajuan = async () => {
  if (selected.value.length === 0) {
    toast.warning("Pilih Surat Jalan terlebih dahulu.");
    return;
  }

  const item = selected.value[0];
  formPengajuan.nomor = item.Nomor;
  formPengajuan.tanggal = item.Tanggal;
  formPengajuan.keterangan = item.Keterangan || "";
  formPengajuan.alasan = "";

  try {
    const res = await api.get(
      `${API_SURAT_JALAN}/pengajuan/urut/${encodeURIComponent(item.Nomor)}`,
    );
    formPengajuan.urut = res.data.nextUrut || 1;
    if (res.data.lastAlasan) {
      formPengajuan.alasan = res.data.lastAlasan;
    }
    dialogPengajuan.value = true;
  } catch (error: any) {
    toast.error("Gagal mendapatkan urutan pengajuan.");
  }
};

const handleSubmitPengajuan = async () => {
  if (!formPengajuan.alasan.trim()) {
    toast.warning("Alasan pengajuan wajib diisi.");
    return;
  }

  loadingPengajuan.value = true;
  try {
    await api.post(`${API_SURAT_JALAN}/pengajuan`, {
      nomor: formPengajuan.nomor,
      tanggal: formPengajuan.tanggal,
      keterangan: formPengajuan.keterangan,
      urut: formPengajuan.urut,
      alasan: formPengajuan.alasan,
    });

    toast.success("Pengajuan berhasil dikirim. Menunggu ACC Admin.");
    dialogPengajuan.value = false;
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal mengirim pengajuan.");
  } finally {
    loadingPengajuan.value = false;
  }
};

watch([startDate, endDate], fetchData);
onMounted(fetchData);
</script>

<template>
  <div class="sj-browse-wrapper">
    <BaseBrowse
      title="Browse Surat Jalan"
      menu-id="mmt-surat-jalan"
      icon="mdi-truck-delivery-outline"
      :headers="masterHeaders"
      :items="masterData"
      :is-loading="loading"
      :loading="loading"
      :show-actions="false"
      :can-insert="false"
      v-model:startDate="startDate"
      v-model:endDate="endDate"
      v-model:selected="selected"
      v-model:expanded="expanded"
      @refresh="fetchData"
      @row-click="handleRowClick"
      :row-props-fn="getRowProps"
      :row-props="getRowProps"
      @update:expanded="handleExpandUpdate(expanded)"
    >
      <!-- Action Buttons Toolbar -->
      <template #extra-actions>
        <!-- Tombol Cetak (Inkjet) -->
        <v-btn
          size="small"
          color="info"
          class="mr-2 text-none"
          :disabled="selected.length === 0"
          @click="handlePrint"
        >
          <v-icon start>mdi-printer</v-icon>
          Cetak SJ
        </v-btn>

        <!-- Tombol Export Excel -->
        <v-btn
          size="small"
          color="success"
          class="mr-2 text-none"
          :loading="loadingExport"
          :disabled="masterData.length === 0"
          @click="handleExportExcel"
        >
          <v-icon start>mdi-file-excel</v-icon>
          Export Excel
        </v-btn>

        <!-- Tombol Pengajuan Edit -->
        <v-btn
          size="small"
          color="warning"
          class="mr-2 text-none"
          :disabled="selected.length === 0"
          @click="handleOpenPengajuan"
        >
          <v-icon start>mdi-file-document-edit-outline</v-icon>
          Pengajuan Edit
        </v-btn>

        <!-- Tombol Hapus -->
        <v-btn
          size="small"
          color="error"
          class="text-none"
          :disabled="selected.length === 0"
          @click="handleDelete"
        >
          <v-icon start>mdi-delete</v-icon>
          Hapus
        </v-btn>
      </template>

      <!-- Filter Tambahan: Cari SPK -->
      <template #filter-fields>
        <div class="d-flex align-center ga-2 flex-wrap">
          <v-text-field
            v-model="searchSpk"
            label="Cari SPK (No / Nama)"
            placeholder="Ketik No. atau Nama SPK..."
            density="compact"
            hide-details
            variant="outlined"
            prepend-inner-icon="mdi-magnify"
            style="min-width: 240px; max-width: 340px"
            clearable
            @keyup.enter="fetchData"
            @click:clear="handleClearSearchSpk"
          />

          <v-checkbox
            v-model="allPeriodSpk"
            label="Semua Periode"
            density="compact"
            hide-details
            color="primary"
            class="ma-0 pa-0"
            title="Abaikan filter tanggal saat mencari SPK"
            @update:model-value="searchSpk ? fetchData() : null"
          />

          <v-btn
            size="small"
            color="primary"
            variant="flat"
            class="text-none"
            :loading="loading"
            @click="fetchData"
          >
            <v-icon start>mdi-magnify</v-icon>
            Cari
          </v-btn>
        </div>
      </template>

      <!-- Custom Column Formatters -->
      <template #item.Tanggal="{ value }">
        {{ value ? format(parseCustomDate(value)!, "dd/MM/yyyy") : "" }}
      </template>

      <template #item.Approved="{ value }">
        <span :style="{ color: getStatusColor(value), fontWeight: 'bold' }">
          {{ value || "Pending" }}
        </span>
      </template>

      <template #item.Ngedit="{ value }">
        <v-chip
          v-if="value"
          size="x-small"
          :color="getNgeditBadge(value).color"
          variant="flat"
        >
          {{ getNgeditBadge(value).text }}
        </v-chip>
        <span v-else class="text-grey-lighten-1">-</span>
      </template>

      <!-- Sub-Grid Expanded Row Details -->
      <template #expanded-content="{ item }">
        <div v-if="isLoadingDetails(item.Nomor)" class="text-center pa-2">
          <v-progress-circular
            indeterminate
            size="20"
            color="primary"
            class="mr-2"
          />
          <span class="text-caption">Memuat detail barang...</span>
        </div>

        <div
          v-else-if="!details[item.Nomor] || details[item.Nomor].length === 0"
          class="text-center pa-2 text-caption text-grey"
        >
          Tidak ada detail item untuk Nomor SJ {{ item.Nomor }}
        </div>

        <v-data-table
          v-else
          :headers="detailHeaders"
          :items="details[item.Nomor]"
          density="compact"
          class="bg-white border rounded"
          :items-per-page="-1"
          hide-default-footer
        >
          <template #[`item.Jumlah`]="{ item: d }">
            <div class="text-right">
              {{ Number(d.Jumlah || 0).toLocaleString() }}
            </div>
          </template>
          <template #[`item.Panjang`]="{ item: d }">
            <div class="text-right">
              {{ Number(d.Panjang || 0).toFixed(2) }}
            </div>
          </template>
          <template #[`item.Lebar`]="{ item: d }">
            <div class="text-right">{{ Number(d.Lebar || 0).toFixed(2) }}</div>
          </template>
        </v-data-table>
      </template>
    </BaseBrowse>

    <!-- Dialog Modal Pengajuan Edit Data -->
    <v-dialog v-model="dialogPengajuan" max-width="500px">
      <v-card>
        <v-card-title class="bg-primary text-white text-subtitle-1">
          <v-icon start>mdi-file-document-edit-outline</v-icon>
          Pengajuan Perubahan Data (SJ)
        </v-card-title>
        <v-card-text class="pt-4">
          <v-text-field
            v-model="formPengajuan.nomor"
            label="Nomor Surat Jalan"
            readonly
            density="compact"
            variant="outlined"
          />
          <v-textarea
            v-model="formPengajuan.alasan"
            label="Alasan Pengajuan Edit"
            rows="3"
            density="compact"
            variant="outlined"
            placeholder="Tuliskan alasan mengapa data SJ ini perlu diubah..."
            required
          />
        </v-card-text>
        <v-card-actions class="justify-end bg-grey-lighten-4">
          <v-btn color="grey" variant="text" @click="dialogPengajuan = false">
            Batal
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="loadingPengajuan"
            @click="handleSubmitPengajuan"
          >
            Kirim Pengajuan
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.row-selected {
  background-color: #d8efff !important;
}
:deep(.row-selected td) {
  background-color: #d8efff !important;
}
.sj-browse-wrapper {
  width: 100%;
}
</style>
