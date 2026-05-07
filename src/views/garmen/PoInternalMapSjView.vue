<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";
import MapSearchModal from "@/components/lookups/MapSearchModal.vue";
import * as XLSX from "xlsx"; // Pastikan Anda sudah install xlsx
import {
  IconTruckDelivery,
  IconPrinter,
  IconFileSpreadsheet,
  IconChevronDown,
  IconSearch,
  IconFileDescription,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const menuId = "139"; // ID Menu Surat Jalan PO Internal MAP

const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const filterState = ref({
  startDate: getLocalDate(),
  endDate: getLocalDate(),
  cabang: authStore.userCabang || "ALL",
  nomorMap: "",
});

const cabangOptions = ref<string[]>(["ALL"]);

// ── STATE KHUSUS ──
const expandedItems = ref<any[]>([]);
const loadedDetails = ref<Record<string, any[]>>({});
const isDetailLoading = ref<Record<string, boolean>>({});
const showMapModal = ref(false);
const namaMapFilter = ref("");
const isExporting = ref(false);

// ── STATE MODAL PIN 5 ──
const dialogAlasan = ref(false);
const alasanText = ref("");
const alasanNomor = ref("");

onMounted(async () => {
  try {
    const res = await api.get("/lookups/cabang-pabrik");
    const branches = res.data.data.map((b: any) => b.Kode);
    cabangOptions.value = ["ALL", ...branches];
  } catch (error) {
    console.error("Gagal memuat opsi cabang", error);
  }
});

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId,
  fetchApi: async () => {
    expandedItems.value = [];
    loadedDetails.value = {};
    const res = await api.get("/garmen/po-internal-map/surat-jalan", {
      params: filterState.value,
    });
    return res.data.data || [];
  },
  immediate: true,
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Gudang Asal", key: "GudangAsal", width: "120px" },
  { title: "Tujuan", key: "Tujuan", width: "120px" },
  { title: "Approve", key: "Approve", width: "80px", align: "center" },
  { title: "User", key: "Usr", width: "100px" },
];

const onExpandedUpdate = async (newExpandedArray: any[]) => {
  expandedItems.value = newExpandedArray;
  for (const item of newExpandedArray) {
    const nomorSJ = item.Nomor || item.raw?.Nomor;
    if (!nomorSJ) continue;

    if (!loadedDetails.value[nomorSJ] && !isDetailLoading.value[nomorSJ]) {
      isDetailLoading.value[nomorSJ] = true;
      try {
        const res = await api.get(
          `/garmen/po-internal-map/surat-jalan/${encodeURIComponent(nomorSJ)}/detail`,
        );
        loadedDetails.value[nomorSJ] = res.data.data;
      } catch (error) {
        toast.error(`Gagal memuat detail untuk SJ ${nomorSJ}`);
        loadedDetails.value[nomorSJ] = [];
      } finally {
        isDetailLoading.value[nomorSJ] = false;
      }
    }
  }
};

const validateMap = async () => {
  if (!filterState.value.nomorMap || filterState.value.nomorMap.trim() === "") {
    namaMapFilter.value = "";
    return;
  }
  try {
    const res = await api.get(
      `/lookups/map-garmen/validate/${encodeURIComponent(filterState.value.nomorMap)}`,
    );
    if (res.data.data) {
      namaMapFilter.value = res.data.data.Nama;
    } else {
      toast.warning("Nomor MAP tsb tidak ada.");
      namaMapFilter.value = "";
      filterState.value.nomorMap = "";
    }
  } catch (error) {
    namaMapFilter.value = "";
    toast.error("Gagal memvalidasi MAP.");
  }
};

const selectMapFromModal = (item: any) => {
  filterState.value.nomorMap = item.Nomor;
  namaMapFilter.value = item.Nama;
  fetchData();
};

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const fmtNum = (val: number | string | null) => {
  if (!val) return "0";
  return new Intl.NumberFormat("id-ID").format(Number(val));
};

const getRowProps = (data: any) => {
  const row = data.item?.raw || data.item;
  // Delphi: if Approve='N' then ACanvas.Font.Color := clred
  if (row.Approve === "N")
    return { class: "text-red-darken-2 font-weight-medium" };
  return {};
};

// ── AKSI DASAR ──
const goAdd = () =>
  router.push({ name: "PoInternalMapSjFormCreate", query: { mode: "new" } });

const goEdit = (item: any) => {
  if (
    authStore.userCabang !== "HO-" &&
    item.GudangAsal !== authStore.userCabang
  ) {
    toast.warning("Data tsb bukan cabang anda.");
    return;
  }
  if (item.Approve === "Y") {
    toast.warning("Sudah di Approve.\nTidak bisa di ubah.");
    return;
  }

  router.push({
    name: "PoInternalMapSjFormEdit",
    params: { nomor: encodeURIComponent(item.Nomor) },
  });
};

const goDelete = async (item: any) => {
  if (
    authStore.userCabang !== "HO-" &&
    item.GudangAsal !== authStore.userCabang
  ) {
    toast.warning("Data tsb bukan cabang anda.");
    return;
  }
  if (item.Approve === "Y") {
    toast.warning("Sudah di Approve.\nTidak bisa di hapus.");
    return;
  }

  if (!confirm(`Yakin ingin menghapus Surat Jalan ${item.Nomor}?`)) return;

  isLoading.value = true;
  try {
    await api.delete(
      `/garmen/po-internal-map/surat-jalan/${encodeURIComponent(item.Nomor)}`,
    );
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  } finally {
    isLoading.value = false;
  }
};

const cetak = () => {
  if (selected.value.length === 0) return;
  const nomor = selected.value[0].Nomor;
  window.open(
    `/garmen/po-internal-map/surat-jalan/print/${encodeURIComponent(nomor)}`,
    "_blank",
  );
};

// ── EXPORT DETAIL ──
const exportDetail = async () => {
  isExporting.value = true;
  toast.info("Sedang menyiapkan data Excel (Master-Detail)...");
  try {
    const res = await api.get(
      "/garmen/po-internal-map/surat-jalan/export-detail",
      { params: filterState.value },
    );
    const exportData = res.data.data;
    if (!exportData || exportData.length === 0) {
      toast.warning("Tidak ada data untuk diekspor pada rentang filter ini.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const colWidths = [
      { wch: 18 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 18 },
      { wch: 18 },
      { wch: 35 },
      { wch: 20 },
      { wch: 15 },
      { wch: 8 },
      { wch: 30 },
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SJ_MAP_Detail");

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    XLSX.writeFile(workbook, `sj_internal_map_detail_${dateStr}.xlsx`);
    toast.success("Berhasil mengunduh dokumen Excel.");
  } catch (error: any) {
    toast.error(
      "Gagal mengekspor data: " + (error.message || "Terjadi kesalahan."),
    );
  } finally {
    isExporting.value = false;
  }
};

// ── PIN 5 (PENGAJUAN PERUBAHAN) ──
const pengajuanPerubahan = () => {
  if (selected.value.length === 0) return;
  alasanNomor.value = selected.value[0].Nomor;
  alasanText.value = "";
  dialogAlasan.value = true;
};

const submitPengajuan = async () => {
  if (!alasanText.value.trim()) {
    toast.warning("Alasan harus diisi!");
    return;
  }
  isLoading.value = true;
  try {
    await api.post(
      `/garmen/po-internal-map/surat-jalan/${encodeURIComponent(alasanNomor.value)}/pin5`,
      {
        alasan: alasanText.value,
      },
    );
    toast.success("Berhasil diajukkan. Nunggu ACC.");
    dialogAlasan.value = false;
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal mengajukan.");
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Surat Jalan PO Internal MAP"
    :menu-id="menuId"
    :icon="IconTruckDelivery"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filterState="filterState"
    v-model:expanded="expandedItems"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    can-export
    show-expand
    :row-props-fn="getRowProps"
    @refresh="fetchData"
    @add="goAdd"
    @edit="goEdit"
    @delete="goDelete"
    @update:expanded="onExpandedUpdate"
    @export="exportToExcel('SJ_PO_INTERNAL_MAP')"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Filter Periode</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>

      <div class="filter-group ml-3">
        <span class="filter-label">Cabang</span>
        <select
          v-model="filterState.cabang"
          class="date-inp"
          style="width: 80px"
          @change="fetchData"
        >
          <option v-for="cab in cabangOptions" :key="cab" :value="cab">
            {{ cab }}
          </option>
        </select>
      </div>

      <div class="filter-group ml-3">
        <span class="filter-label">Filter MAP</span>
        <div class="inp-grp-custom">
          <input
            type="text"
            v-model="filterState.nomorMap"
            class="f-inp-kode"
            placeholder="Kode MAP"
            @blur="validateMap"
            @keyup.enter="fetchData"
          />
          <input
            type="text"
            v-model="namaMapFilter"
            class="f-inp-nama"
            placeholder="Nama MAP"
            readonly
            disabled
          />
          <button class="f-btn-lookup" @click="showMapModal = true">
            <IconSearch :size="12" :stroke-width="1.7" />
          </button>
        </div>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        variant="flat"
        color="blue-grey"
        :disabled="selected.length === 0"
        @click="cetak"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak
      </v-btn>

      <v-btn
        size="small"
        variant="flat"
        color="green-darken-1"
        :loading="isExporting"
        @click="exportDetail"
      >
        <template #prepend
          ><IconFileSpreadsheet :size="15" :stroke-width="1.7"
        /></template>
        Export Detail
      </v-btn>

      <v-menu v-if="selected.length > 0">
        <template v-slot:activator="{ props }">
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            v-bind="props"
            class="ml-2"
          >
            Aksi SJ
            <template #append
              ><IconChevronDown :size="14" :stroke-width="2"
            /></template>
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item @click="pengajuanPerubahan">
            <template #prepend
              ><IconFileDescription :size="16" :stroke-width="1.7"
            /></template>
            <v-list-item-title>Pengajuan Perubahan Data</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>

    <template #item.Nomor="{ item }">
      <div class="d-flex align-center gap-2">
        <span class="font-weight-bold">{{ item.Nomor }}</span>
        <v-chip
          v-if="item.Ngedit === 'WAIT'"
          color="info"
          size="x-small"
          density="comfortable"
          class="font-weight-bold"
          >WAIT</v-chip
        >
        <v-chip
          v-if="item.Ngedit === 'TOLAK'"
          color="error"
          size="x-small"
          density="comfortable"
          class="font-weight-bold"
          >TOLAK</v-chip
        >
        <v-chip
          v-if="item.Ngedit === 'ACC'"
          color="success"
          size="x-small"
          density="comfortable"
          class="font-weight-bold"
          >ACC</v-chip
        >
      </div>
    </template>

    <template #item.Tanggal="{ item }">{{ fmtDate(item.Tanggal) }}</template>

    <template #detail="{ item }">
      <div class="detail-container">
        <div class="detail-header">
          Detail Barang Surat Jalan: <strong>{{ item.Nomor }}</strong>
        </div>

        <div
          v-if="isDetailLoading[item.Nomor]"
          class="text-center py-2 text-grey"
        >
          <v-progress-circular
            indeterminate
            size="24"
            width="2"
            color="primary"
          ></v-progress-circular>
        </div>

        <table v-else class="detail-table">
          <thead>
            <tr>
              <th style="width: 140px">No PO</th>
              <th style="width: 140px">MAP</th>
              <th style="text-align: left">Nama MAP</th>
              <th style="text-align: left; width: 200px">Bahan</th>
              <th style="width: 100px">Ukuran</th>
              <th style="width: 70px; text-align: right">Qty SJ</th>
              <th style="text-align: left; width: 250px">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in loadedDetails[item.Nomor] || []" :key="d.MAP">
              <td class="text-center">{{ d.Nomor_PO }}</td>
              <td class="text-center font-weight-bold">{{ d.MAP }}</td>
              <td>{{ d.Nama_MAP }}</td>
              <td>{{ d.Bahan }}</td>
              <td class="text-center">{{ d.Ukuran }}</td>
              <td class="text-right text-blue-darken-2 font-weight-bold">
                {{ fmtNum(d.Jumlah) }}
              </td>
              <td>{{ d.Keterangan }}</td>
            </tr>
            <tr v-if="(loadedDetails[item.Nomor] || []).length === 0">
              <td colspan="7" class="text-center text-grey">
                Belum ada detail barang.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <MapSearchModal v-model="showMapModal" @selected="selectMapFromModal" />

  <v-dialog v-model="dialogAlasan" max-width="500px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3 text-subtitle-1 font-weight-bold d-flex align-center"
      >
        <IconFileDescription
          :size="18"
          :stroke-width="1.7"
          color="white"
          class="mr-2"
        />
        Pengajuan Perubahan Surat Jalan
      </v-card-title>
      <v-card-text class="pa-4 pt-4">
        <div class="text-body-2 mb-2 font-weight-medium">
          Nomor SJ: {{ alasanNomor }}
        </div>
        <v-textarea
          v-model="alasanText"
          label="Alasan Pengajuan"
          variant="outlined"
          auto-grow
          rows="3"
          hide-details
          placeholder="Tuliskan alasan perubahan data secara jelas..."
        ></v-textarea>
      </v-card-text>
      <v-card-actions class="pa-3 bg-grey-lighten-4 border-t">
        <v-spacer></v-spacer>
        <v-btn variant="text" color="error" @click="dialogAlasan = false"
          >Batal</v-btn
        >
        <v-btn
          color="primary"
          variant="elevated"
          :loading="isLoading"
          @click="submitPengajuan"
          >Kirim Pengajuan</v-btn
        >
      </v-card-actions>
    </v-card>
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

/* Filter Custom Input MAP */
.inp-grp-custom {
  display: flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  height: 28px;
  background: white;
}
.f-inp-kode {
  width: 130px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: #fff9c4;
}
.f-inp-nama {
  width: 150px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: #f5f5f5;
  border-left: 1px solid #e0e0e0;
}
.f-btn-lookup {
  width: 28px;
  height: 100%;
  background: #eeeeee;
  border-left: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.f-btn-lookup:hover {
  background: #e0e0e0;
}

.gap-2 {
  gap: 8px;
}

/* ── STYLE UNTUK TABEL DETAIL ── */
.detail-container {
  padding: 8px 12px 12px 48px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}
.detail-header {
  font-size: 11px;
  font-weight: 600;
  color: #1565c0;
  margin-bottom: 6px;
  text-transform: uppercase;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border: 1px solid #cfd8dc;
  border-radius: 4px;
  overflow: hidden;
  font-size: 11px;
}
.detail-table th {
  background-color: #eceff1;
  color: #37474f;
  padding: 6px 8px;
  font-weight: 700;
  border-bottom: 1px solid #cfd8dc;
  border-right: 1px solid #eceff1;
}
.detail-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #eceff1;
  border-right: 1px solid #eceff1;
  vertical-align: middle;
}
.detail-table tr:last-child td {
  border-bottom: none;
}
.detail-table tr:hover td {
  background-color: #f1f8e9;
}
</style>
