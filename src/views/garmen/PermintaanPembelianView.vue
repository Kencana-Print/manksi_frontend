<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import * as XLSX from "xlsx";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { permintaanPembelianService } from "@/services/garmen/permintaanPembelianService";
import { useAuthStore } from "@/stores/authStore";
import {
  IconShoppingCart,
  IconPrinter,
  IconFileExport,
  IconDotsVertical,
  IconShieldLock,
  IconCircleCheck,
  IconFileDescription,
} from "@tabler/icons-vue";

interface ExportDetailItem {
  Nomor: string;
  Jenis: string;
  Tanggal: string;
  Keterangan: string;
  "Minta Ke": string;
  Priority: string;
  User: string;
  Bagian: string;
  Cabang: string;
  Status: string;
  "Kode Barang": string;
  "Nama Barang": string;
  Satuan: string;
  Jumlah: number;
  Terima: number;
  "Ket Pembelian": string;
  Spesifikasi: string;
  Kegunaan: string;
}

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const getCabangDefault = () => {
  const bagian = (authStore.user?.bagian || "").toUpperCase();
  const exemptBagian = ["FINANCE", "AUDIT", "EDP", "DIREKSI"];

  // Bagian yang dikecualikan → default ALL
  if (exemptBagian.includes(bagian)) return "ALL";

  // Punya cabang spesifik → pakai cabang sendiri
  if (authStore.user?.cabang) return authStore.user.cabang;

  return "ALL";
};

// --- STATE FILTER (FIX TIMEZONE BUG) ---
const getLocalDate = (d = new Date()) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const currDate = new Date();
const filterState = ref({
  dtAwal: getLocalDate(
    new Date(currDate.getFullYear(), currDate.getMonth(), 1),
  ),
  dtAkhir: getLocalDate(currDate),
  jenis: "ACCESORIES", // Default sesuai Delphi
  cabang: getCabangDefault(),
});

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
  menuId: "65",
  fetchApi: async () => {
    const res = await permintaanPembelianService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      jenis: filterState.value.jenis,
      cabang: filterState.value.cabang,
    });
    return res.data.data;
  },
  immediate: false,
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "140px", fixed: true },
  { title: "Jenis", key: "Jenis", width: "100px" },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "220px" },
  { title: "Minta Ke", key: "MintaKe", width: "90px", align: "center" },
  { title: "Priority", key: "Priority", width: "90px", align: "center" },
  { title: "User", key: "Usr", width: "90px" },
  { title: "Bagian", key: "Bagian", width: "100px" },
  { title: "Cabang", key: "Cab", width: "70px", align: "center" },
  { title: "Created", key: "Created", width: "140px" },
  { title: "Modified", key: "Modified", width: "140px" },
  { title: "Status", key: "Status", width: "100px", align: "center" },
];

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const num = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);

// --- EXPAND DETAIL ---
const expandedRows = ref<any[]>([]);
const detailsData = ref<Record<string, any[]>>({});
const loadingDetails = ref<Set<string>>(new Set());

watch(expandedRows, async (newVal) => {
  if (newVal.length === 0) return;
  const item = newVal[newVal.length - 1];
  const nomor = item?.Nomor;

  if (!nomor || detailsData.value[nomor] || loadingDetails.value.has(nomor))
    return;

  loadingDetails.value.add(nomor);
  try {
    const res = await permintaanPembelianService.getDetail(nomor, item.Jenis);
    detailsData.value[nomor] = res.data.data;
  } catch {
    toast.error(`Gagal memuat detail ${nomor}`);
  } finally {
    loadingDetails.value.delete(nomor);
  }
});

// --- STYLING BARIS ---
const rowPropsFn = (data: any) => {
  // Parsing aman ke objek data asli
  const raw = data.item?.raw || data.item || data;
  const status =
    typeof raw.Status === "string" ? raw.Status.trim().toUpperCase() : "";

  // Jika CLOSE, biarkan hitam/abu-abu pekat
  if (status === "CLOSE" || status === "DICLOSE") {
    return { style: "color: #333333;" };
  }
  // OPEN = Merah
  if (status === "") {
    return { style: "color: #d32f2f; font-weight: 600;" };
  }
  // PROSES BELI = Biru
  if (status.includes("PROSES")) {
    return { style: "color: #1976d2; font-weight: 600;" };
  }

  return { style: "color: #333333;" };
};

const getNomorClass = (item: any) => {
  if (item.Ngedit === "WAIT") return "badge-wait";
  if (item.Ngedit === "TOLAK") return "badge-tolak";
  if (item.Ngedit === "ACC") return "badge-acc";
  return "nomor-text";
};

// --- HANDLERS ---
onMounted(() => fetchData());

const onAdd = () => {
  router.push({
    name: "PermintaanPembelianFormCreate", // <--- Sesuaikan dengan nama di router
    query: { jenis: filterState.value.jenis },
  });
};

const onEdit = (item: any) => {
  if (item.Status !== "") {
    return toast.warning(`Data sudah ${item.Status}, tidak bisa diubah.`);
  }
  // <--- Sesuaikan path-nya ke /edit/ (bukan /form/)
  router.push(
    `/garmen/barang/permintaan-pembelian/edit/${encodeURIComponent(item.Nomor)}`,
  );
};

const onDelete = async (item: any) => {
  if (item.Status !== "")
    return toast.error(`Sudah ${item.Status}. Tidak bisa dihapus.`);
  try {
    await permintaanPembelianService.delete(item.Nomor);
    toast.success("Berhasil dihapus");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus");
  }
};

const onCloseManual = async () => {
  if (!selectedItem.value) return;
  if (!confirm("Yakin akan diclose?")) return;
  try {
    await permintaanPembelianService.close(selectedItem.value.Nomor);
    toast.success("Berhasil diclose.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal close");
  }
};

const isExportingDetail = ref(false);
const onExportDetail = async () => {
  if (!canExport.value) return toast.error("Anda tidak memiliki akses Export.");
  if (!items.value || items.value.length === 0)
    return toast.warning("Tidak ada data.");

  isExportingDetail.value = true;
  toast.info("Menyiapkan export detail...");
  try {
    const allDetails: ExportDetailItem[] = [];
    for (const item of items.value) {
      let detail = detailsData.value[item.Nomor];
      if (!detail) {
        const res = await permintaanPembelianService.getDetail(
          item.Nomor,
          item.Jenis,
        );
        detail = res.data.data;
      }
      detail.forEach((d: any) => {
        allDetails.push({
          Nomor: item.Nomor,
          Jenis: item.Jenis,
          Tanggal: fmtDate(item.Tanggal),
          Keterangan: item.Keterangan,
          "Minta Ke": item.MintaKe,
          Priority: item.Priority,
          User: item.Usr,
          Bagian: item.Bagian,
          Cabang: item.Cab,
          Status: item.Status === "" ? "OPEN" : item.Status,
          "Kode Barang": d.Kode,
          "Nama Barang": d.Nama,
          Satuan: d.Satuan,
          Jumlah: Number(d.Jumlah),
          Terima: Number(d.Bpb),
          "Ket Pembelian": d.KetPembelian || "",
          Spesifikasi: d.Spesifikasi || "",
          Kegunaan: d.Kegunaan || "",
        });
      });
    }
    const ws = XLSX.utils.json_to_sheet(allDetails);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detail_PR");
    XLSX.writeFile(
      wb,
      `Detail_Permintaan_Pembelian_${filterState.value.dtAwal}.xlsx`,
    );
    toast.success("Berhasil export detail Excel.");
  } catch (e) {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

const onPrint = () => {
  if (!selectedItem.value) return toast.warning("Pilih data terlebih dahulu.");
  // Buka tab baru menuju halaman cetak
  window.open(
    `/garmen/barang/permintaan-pembelian/print/${encodeURIComponent(selectedItem.value.Nomor)}`,
    "_blank",
  );
};

// --- PENGAJUAN PERUBAHAN (PIN 5) ---
const actionDialog = ref(false);
const actionForm = ref({
  nomor: "",
  alasan: "",
});

const onAjukanPerubahan = () => {
  if (!selectedItem.value) return toast.warning("Pilih data terlebih dahulu.");

  if (
    selectedItem.value.Ngedit === "" &&
    canEdit.value &&
    selectedItem.value.Status === ""
  ) {
    toast.info(
      "Tidak perlu pengajuan perubahan data. Transaksi masih terbuka.",
    );
  }

  actionForm.value = {
    nomor: selectedItem.value.Nomor,
    alasan: "",
  };
  actionDialog.value = true;
};

const submitPengajuan = async () => {
  if (!actionForm.value.alasan.trim())
    return toast.warning("Alasan harus diisi.");
  try {
    await permintaanPembelianService.requestPin({
      nomor: actionForm.value.nomor,
      alasan: actionForm.value.alasan,
    });
    toast.success("Berhasil diajukan. Menunggu ACC.");
    actionDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal melakukan pengajuan.");
  }
};

// --- ISI TANGGAL ESTIMASI (Khusus FINANCE) ---
const estimasiDialog = ref(false);
const estimasiForm = ref({ nomor: "", tanggal: getLocalDate() });

const onIsiEstimasi = () => {
  if (!selectedItem.value) return toast.warning("Pilih data terlebih dahulu.");
  estimasiForm.value = {
    nomor: selectedItem.value.Nomor,
    tanggal: getLocalDate(),
  };
  estimasiDialog.value = true;
};

const submitEstimasi = async () => {
  try {
    await permintaanPembelianService.updateEstimasi(
      estimasiForm.value.nomor,
      estimasiForm.value.tanggal,
    );
    toast.success("Estimasi berhasil disimpan.");
    estimasiDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan estimasi");
  }
};
</script>

<template>
  <BaseBrowse
    title="Permintaan Pembelian Garmen"
    menu-id="65"
    :icon="IconShoppingCart"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    show-expand
    v-model:expanded="expandedRows"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :row-props-fn="rowPropsFn"
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="exportToExcel(`Permintaan_Pembelian_${filterState.dtAwal}`)"
  >
    <!-- FILTER BAR KIRI (Reorder: Tanggal -> Cabang -> Jenis) -->
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Tanggal</span>
        <input
          type="date"
          v-model="filterState.dtAwal"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="filterState.dtAkhir"
          class="date-inp"
          @change="fetchData"
        />
      </div>

      <div class="filter-divider" />

      <div class="filter-group">
        <span class="filter-label">Cabang</span>
        <select
          v-model="filterState.cabang"
          class="date-inp font-weight-bold"
          @change="fetchData"
        >
          <option value="ALL">ALL</option>
          <option
            v-for="c in ['P01', 'P02', 'P03', 'P04', 'P05', 'HO-']"
            :key="c"
            :value="c"
          >
            {{ c }}
          </option>
        </select>
      </div>

      <div class="filter-divider" />

      <div class="filter-group">
        <span class="filter-label">Jenis</span>
        <div
          class="d-flex align-center gap-2"
          style="
            background: white;
            border: 1px solid #ccc;
            padding: 0 8px;
            border-radius: 4px;
            height: 28px;
          "
        >
          <label class="radio-label">
            <input
              type="radio"
              v-model="filterState.jenis"
              value="ACCESORIES"
              @change="fetchData"
            />
            ACC
          </label>
          <label class="radio-label">
            <input
              type="radio"
              v-model="filterState.jenis"
              value="OBAT"
              @change="fetchData"
            />
            OBAT
          </label>
          <label class="radio-label">
            <input
              type="radio"
              v-model="filterState.jenis"
              value="SPAREPART"
              @change="fetchData"
            />
            SPAREPART
          </label>
          <label class="radio-label">
            <input
              type="radio"
              v-model="filterState.jenis"
              value="ATK/RTK"
              @change="fetchData"
            />
            ATK
          </label>
        </div>
      </div>

      <div class="filter-divider" />

      <div class="legend-group">
        <div class="legend-item"><span class="l-box bg-red"></span> OPEN</div>
        <div class="legend-item">
          <span class="l-box bg-blue"></span> ONPROSES
        </div>
      </div>
    </template>

    <!-- EXTRA ACTIONS (Export Detail & Context Menu) -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak
      </v-btn>

      <v-btn
        v-if="canExport"
        size="small"
        color="teal-darken-2"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend
          ><IconFileExport :size="15" :stroke-width="1.7"
        /></template>
        Export Detail
      </v-btn>

      <v-menu v-if="selected.length > 0">
        <template #activator="{ props }">
          <v-btn
            size="small"
            color="blue-grey-darken-3"
            v-bind="props"
            class="ml-1"
          >
            <template #prepend><IconDotsVertical :size="15" /></template
            >Tindakan
          </v-btn>
        </template>
        <v-list density="compact" class="text-caption">
          <v-list-item @click="onCloseManual">
            <template #prepend
              ><IconCircleCheck :size="14" class="mr-2 text-error"
            /></template>
            <v-list-item-title>Close Transaksi</v-list-item-title>
          </v-list-item>

          <v-list-item
            v-if="authStore.user?.bagian === 'FINANCE'"
            @click="onIsiEstimasi"
          >
            <template #prepend
              ><IconCalendarEvent :size="14" class="mr-2 text-info"
            /></template>
            <v-list-item-title>Isi Tanggal Estimasi</v-list-item-title>
          </v-list-item>

          <v-list-item @click="onAjukanPerubahan" :disabled="!canEdit">
            <template #prepend
              ><IconShieldLock :size="14" class="mr-2 text-orange-darken-3"
            /></template>
            <v-list-item-title>Pengajuan Perubahan Data</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>

    <!-- CUSTOM CELLS -->
    <template #item.Tanggal="{ item }">{{ fmtDate(item.Tanggal) }}</template>

    <template #item.Status="{ item }">
      {{ item.Status === "" || !item.Status ? "OPEN" : item.Status }}
    </template>

    <template #item.Nomor="{ item }">
      <span :class="getNomorClass(item)">{{ item.Nomor }}</span>
    </template>

    <!-- EXPAND DETAIL ROW -->
    <template #detail="{ item }">
      <div class="det-wrap">
        <div v-if="loadingDetails.has(item.Nomor)" class="det-loading">
          <v-progress-circular
            indeterminate
            color="primary"
            size="20"
            width="2"
          />
          <span class="ml-2">Memuat detail...</span>
        </div>
        <div v-else-if="detailsData[item.Nomor]" class="det-card">
          <table class="dt">
            <thead>
              <tr>
                <th style="width: 30px">No</th>
                <th style="width: 120px; text-align: left">Kode</th>
                <th style="text-align: left">Nama Barang</th>
                <th style="width: 80px; text-align: center">Satuan</th>
                <th style="width: 90px; text-align: right">Jumlah</th>
                <th style="width: 90px; text-align: right">Terima</th>
                <th style="width: 200px; text-align: left">Ket Pembelian</th>
                <th
                  v-if="['SPAREPART', 'ATK/RTK'].includes(item.Jenis)"
                  style="width: 150px; text-align: left"
                >
                  Spesifikasi
                </th>
                <th
                  v-if="['SPAREPART', 'ATK/RTK'].includes(item.Jenis)"
                  style="width: 150px; text-align: left"
                >
                  Kegunaan
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(dtl, i) in detailsData[item.Nomor]" :key="i">
                <td class="text-center">{{ i + 1 }}</td>
                <td style="font-weight: 600; color: #1565c0">{{ dtl.Kode }}</td>
                <td>{{ dtl.Nama }}</td>
                <td class="text-center">{{ dtl.Satuan }}</td>
                <td
                  class="text-right font-weight-bold"
                  style="background: #fffde7"
                >
                  {{ num(dtl.Jumlah) }}
                </td>
                <!-- Field Bpb dialiaskan sebagai "Terima" di frontend -->
                <td class="text-right font-weight-bold text-success">
                  {{ num(dtl.Bpb) }}
                </td>
                <td class="text-caption" style="color: #666">
                  {{ dtl.KetPembelian }}
                </td>
                <td v-if="['SPAREPART', 'ATK/RTK'].includes(item.Jenis)">
                  {{ dtl.Spesifikasi }}
                </td>
                <td v-if="['SPAREPART', 'ATK/RTK'].includes(item.Jenis)">
                  {{ dtl.Kegunaan }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <!-- DIALOG PENGAJUAN PERUBAHAN -->
  <v-dialog v-model="actionDialog" max-width="400px" persistent>
    <div class="close-dlg">
      <div class="close-dlg-header" style="background: #ef6c00">
        <IconFileDescription :size="14" color="white" class="mr-2" />
        Pengajuan Perubahan
        <button class="dlg-x" @click="actionDialog = false">✕</button>
      </div>
      <div class="close-dlg-body">
        <div class="f-lbl-sm mb-1 text-primary">
          No. Dokumen: {{ actionForm.nomor }}
        </div>
        <div class="f-lbl-sm mt-3 mb-1">Alasan Pengajuan (Wajib):</div>
        <textarea
          v-model="actionForm.alasan"
          class="close-area"
          rows="3"
          placeholder="Masukkan alasan pengajuan revisi data..."
        ></textarea>
      </div>
      <div class="close-dlg-footer">
        <button
          class="dlg-btn text-white"
          style="background: #ef6c00"
          @click="submitPengajuan"
        >
          Ajukan
        </button>
        <button class="dlg-btn cancel" @click="actionDialog = false">
          Batal
        </button>
      </div>
    </div>
  </v-dialog>

  <v-dialog v-model="estimasiDialog" max-width="350px" persistent>
    <div class="close-dlg">
      <div class="close-dlg-header" style="background: #1976d2">
        <IconCalendarEvent :size="14" color="white" class="mr-2" />
        Isi Tanggal Estimasi
        <button class="dlg-x" @click="estimasiDialog = false">✕</button>
      </div>
      <div class="close-dlg-body">
        <div class="f-lbl-sm mb-1 text-primary">
          No. Dokumen: {{ estimasiForm.nomor }}
        </div>
        <div class="f-lbl-sm mt-3 mb-1">Tanggal Estimasi Beli:</div>
        <input
          type="date"
          v-model="estimasiForm.tanggal"
          class="date-inp"
          style="width: 100%; border-color: #1976d2"
        />
      </div>
      <div class="close-dlg-footer">
        <button
          class="dlg-btn text-white"
          style="background: #1976d2"
          @click="submitEstimasi"
        >
          Simpan
        </button>
        <button class="dlg-btn cancel" @click="estimasiDialog = false">
          Batal
        </button>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
/* Filter Group */
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
}

/* Radio Buton Clean Layout */
.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  cursor: pointer;
}
.radio-label input[type="radio"] {
  accent-color: #1565c0;
  cursor: pointer;
  width: 14px;
  height: 14px;
  margin: 0;
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

/* Legend Group */
.legend-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: bold;
  color: #424242;
}
.l-box {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
.bg-red {
  background: #d32f2f;
}
.bg-blue {
  background: #1976d2;
}

/* Nomor Styling (PIN) */
.nomor-text {
  font-family: monospace;
  font-size: 12px;
  font-weight: bold;
}
.badge-wait,
.badge-acc,
.badge-tolak {
  font-family: monospace;
  font-weight: bold;
  font-size: 12px;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
}
.badge-wait {
  background: #1565c0;
}
.badge-acc {
  background: #2e7d32;
}
.badge-tolak {
  background: #c62828;
}

/* Expand Detail Styling */
.det-wrap {
  padding: 8px 12px 10px 48px;
  background: #f5f6f8;
}
.det-card {
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  overflow: hidden;
  background: white;
}
.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dt th {
  background: #455a64;
  padding: 5px 8px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.dt td {
  border-bottom: 1px solid #eeeeee;
  padding: 4px 8px;
  vertical-align: middle;
}
.dt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}

/* Dialog Custom Styling */
.close-dlg {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  font-family: "Segoe UI", sans-serif;
  font-size: 12px;
}
.close-dlg-header {
  display: flex;
  align-items: center;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  gap: 4px;
}
.dlg-x {
  margin-left: auto;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}
.dlg-x:hover {
  color: white;
}
.close-dlg-body {
  padding: 14px;
}
.f-lbl-sm {
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.close-area {
  width: 100%;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 6px 8px;
  outline: none;
  resize: none;
}
.close-area:focus {
  border-color: #ef6c00;
}
.close-dlg-footer {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
}
.dlg-btn {
  height: 28px;
  padding: 0 14px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.dlg-btn.cancel {
  background: #e0e0e0;
  color: #424242;
  margin-left: auto;
}
.dlg-btn.cancel:hover {
  background: #d6d6d6;
}
</style>
