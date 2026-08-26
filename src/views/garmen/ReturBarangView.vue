<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { useAuthStore } from "@/stores/authStore";
import { returBarangService } from "@/services/garmen/returBarangService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import {
  IconArrowBack,
  IconFileDots,
  IconPrinter,
  IconFileSpreadsheet,
  IconPencil,
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const getLocalDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const getAwalBulan = () => {
  const d = new Date();
  return getLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
};

// --- STATE FILTER ---
const filterState = ref({
  startDate: getAwalBulan(),
  endDate: getLocalDate(),
  cabang: "ALL",
  jenis: "ACCESORIES",
});

// Sesuai cbCab.Items.Add di Delphi FormCreate (bukan fetch API)
const cabangOptions = ["P01", "P02", "P03", "P04", "P05", "HO-", "ALL"];
const jenisOptions = ref<string[]>([]);

onMounted(() => {
  // Replikasi persis FormCreate .pas — visibilitas jenis per bagian
  const bagian = (authStore.user?.bagian || "").toUpperCase();

  if (
    [
      "ADMIN",
      "PPIC",
      "GUDANG",
      "PRODUKSI",
      "POTONG",
      "CETAK",
      "JAHIT",
      "LIPAT",
      "FINANCE",
      "AUDIT",
      "DIREKSI",
      "EDP",
    ].includes(bagian)
  ) {
    jenisOptions.value = ["ACCESORIES", "OBAT", "SPAREPART", "ATK/RTK"];
    filterState.value.jenis = "ACCESORIES";
  } else if (bagian === "GA") {
    jenisOptions.value = ["ATK/RTK"];
    filterState.value.jenis = "ATK/RTK";
  } else if (bagian === "TEKNISI" || bagian === "IT") {
    jenisOptions.value = ["SPAREPART"];
    filterState.value.jenis = "SPAREPART";
  } else {
    // Sesuai Delphi: bagian lain -> btnRefresh.Visible:=False (tidak ada akses)
    jenisOptions.value = [];
  }

  // Default cabang: pakai cabang user kalau ada di daftar, else ALL
  const userCab = authStore.user?.cabang || "";
  filterState.value.cabang = cabangOptions.includes(userCab) ? userCab : "ALL";
});

const canBrowse = computed(() => jenisOptions.value.length > 0);
const showApproveColumns = computed(() =>
  ["ACCESORIES", "OBAT"].includes(filterState.value.jenis),
);
const showMintaSpk = computed(() => filterState.value.jenis === "ACCESORIES");

// --- KOMPOSISI BROWSE ---
const {
  items,
  isLoading,
  selected,
  fetchData,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  exportToExcel,
} = useBrowse({
  menuId: "61",
  fetchApi: async () => {
    if (!canBrowse.value) return [];
    const res = await returBarangService.getBrowse(
      filterState.value.startDate,
      filterState.value.endDate,
      filterState.value.cabang,
      filterState.value.jenis,
    );
    return res.data.data;
  },
  deleteApi: async (nomor: string) => {
    await returBarangService.deleteData(nomor);
  },
});

// --- KONFIGURASI TABEL (dinamis, tergantung jenis) ---
const headers = computed(() => {
  const base = [
    { title: "Nomor", key: "Nomor", width: "135px" },
    { title: "Jenis", key: "Jenis", width: "100px" },
    { title: "Tanggal", key: "Tanggal", width: "90px" },
    { title: "Cab", key: "Cab", width: "70px" },
    { title: "Dari", key: "Dari", minWidth: "160px" },
    { title: "Keterangan", key: "Keterangan", minWidth: "150px" },
    { title: "Usr", key: "Usr", width: "80px" },
  ];
  if (showApproveColumns.value) {
    base.push(
      { title: "No Approve", key: "NoApprov", width: "135px" },
      { title: "Tgl Approve", key: "TglApprov", width: "100px" },
      { title: "Approved By", key: "Approved", width: "100px" },
    );
  }
  return base;
});

const num = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);

// Mewarnai baris:
// 1. Prioritas: status pengajuan tutup buku (Ngedit: WAIT/ACC/TOLAK) —
//    background solid + font putih (paling prominent)
// 2. Kalau Ngedit kosong & jenis butuh approval (ACCESORIES/OBAT) & belum
//    di-approve (NoApprov kosong) — font merah saja, sesuai
//    cxGrdMasterCustomDrawCell di Delphi ("Belum di Approve")
const handleRowProps = (data: any) => {
  const item = data.item?.raw || data.item;

  if (item.Ngedit === "WAIT") {
    return {
      style: "color: white !important; background-color: #1976d2 !important;",
    };
  } else if (item.Ngedit === "ACC") {
    return {
      style: "color: white !important; background-color: #2e7d32 !important;",
    };
  } else if (item.Ngedit === "TOLAK") {
    return {
      style: "color: white !important; background-color: #c62828 !important;",
    };
  }

  if (showApproveColumns.value && !item.NoApprov) {
    return { style: "color: #c62828 !important;" };
  }

  return {};
};

const expandedRows = ref<any[]>([]);

// --- FUNGSI AKSI ---
const onAdd = () => {
  router.push(
    `/garmen/barang/retur-barang/form/create/${encodeURIComponent(filterState.value.jenis)}`,
  );
};

const onEdit = (item: any) => {
  router.push(
    `/garmen/barang/retur-barang/form/${encodeURIComponent(item.Nomor)}`,
  );
};

const onDelete = async (item: any) => {
  try {
    await returBarangService.deleteData(item.Nomor);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal menghapus data.");
  }
};

const onPrint = () => {
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const nomor = selected.value[0].Nomor;
  window.open(
    `/garmen/barang/retur-barang/print/${encodeURIComponent(nomor)}`,
    "_blank",
  );
};

const onExport = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diexport.");

  const columns: ExcelColumn[] = [
    { header: "Nomor", key: "Nomor", width: 18 },
    { header: "Jenis", key: "Jenis", width: 14 },
    { header: "Tanggal", key: "Tanggal", width: 12 },
    { header: "Cab", key: "Cab", width: 8 },
    { header: "Dari", key: "Dari", width: 22 },
    { header: "Keterangan", key: "Keterangan", width: 28 },
    { header: "Usr", key: "Usr", width: 10 },
  ];
  if (showApproveColumns.value) {
    columns.push(
      { header: "No Approve", key: "NoApprov", width: 18 },
      { header: "Tgl Approve", key: "TglApprov", width: 12 },
      { header: "Approved By", key: "Approved", width: 12 },
    );
  }

  const rows = items.value.map((r: any) => ({
    ...r,
    Tanggal: formatTanggal(r.Tanggal),
    TglApprov: formatTanggal(r.TglApprov),
  }));

  await exportExcelSingle(
    `Retur_Barang_${filterState.value.jenis}_${filterState.value.startDate}.xlsx`,
    "Retur Barang",
    columns,
    rows,
    `Retur Barang - ${filterState.value.jenis}`,
  );
  toast.success("Berhasil export data.");
};

const onExportDetail = async () => {
  if (!items.value?.length)
    return toast.warning("Tidak ada data untuk diexport.");

  const rows: any[] = [];
  items.value.forEach((master: any) => {
    if (master.details?.length > 0) {
      master.details.forEach((dtl: any) => {
        const row: any = {
          Nomor: master.Nomor,
          Jenis: master.Jenis,
          Tanggal: formatTanggal(master.Tanggal),
          Cab: master.Cab,
          Dari: master.Dari,
          Kode: dtl.Kode,
          Nama: dtl.Nama,
          Satuan: dtl.Satuan,
          Jumlah: dtl.Jumlah,
          Keterangan: dtl.Keterangan || "",
        };
        if (showMintaSpk.value) {
          row.NoMinta = dtl.NoMinta || "";
          row.SPK = dtl.SPK || "";
        }
        rows.push(row);
      });
    }
  });

  if (rows.length === 0)
    return toast.warning("Tidak ada rincian untuk diexport.");

  const columns: ExcelColumn[] = [
    { header: "Nomor Retur", key: "Nomor", width: 18 },
    { header: "Jenis", key: "Jenis", width: 14 },
    { header: "Tanggal", key: "Tanggal", width: 12 },
    { header: "Cab", key: "Cab", width: 8 },
    { header: "Dari", key: "Dari", width: 22 },
    { header: "Kode Barang", key: "Kode", width: 16 },
    { header: "Nama Barang", key: "Nama", width: 30 },
    { header: "Satuan", key: "Satuan", width: 10 },
    { header: "Jumlah", key: "Jumlah", width: 12, align: "right" },
    { header: "Keterangan", key: "Keterangan", width: 28 },
  ];
  if (showMintaSpk.value) {
    columns.push(
      { header: "No Minta", key: "NoMinta", width: 18 },
      { header: "SPK", key: "SPK", width: 18 },
    );
  }

  await exportExcelSingle(
    `Detail_Retur_Barang_${filterState.value.jenis}_${filterState.value.startDate}.xlsx`,
    "Detail Retur Barang",
    columns,
    rows,
    `Detail Retur Barang - ${filterState.value.jenis}`,
  );
  toast.success("Berhasil export detail data.");
};

// --- DIALOG PENGAJUAN PIN 5 (Buka Tutup Buku) ---
const actionDialog = ref(false);
const actionForm = ref({ nomor: "", tanggal: "", keterangan: "", alasan: "" });

const onAjukanPerubahan = () => {
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const item = selected.value[0];

  if (item.Ngedit === "WAIT") {
    toast.info("Data ini sedang dalam antrian pengajuan.");
    return;
  }

  actionForm.value = {
    nomor: item.Nomor,
    tanggal: item.Tanggal,
    keterangan: item.Keterangan,
    alasan: "",
  };
  actionDialog.value = true;
};

const submitAjukan = async () => {
  if (!actionForm.value.alasan) return toast.warning("Alasan harus diisi.");
  try {
    await returBarangService.ajukanPerubahan(actionForm.value);
    toast.success("Berhasil diajukan. Menunggu ACC.");
    actionDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal Pengajuan.");
  }
};
</script>

<template>
  <BaseBrowse
    title="Retur Barang Garmen"
    menu-id="61"
    :icon="IconArrowBack"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    show-expand
    v-model:expanded="expandedRows"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert && canBrowse"
    :can-edit="canEdit && canBrowse"
    :can-delete="canDelete && canBrowse"
    :can-export="canExport && canBrowse"
    :row-props-fn="handleRowProps"
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="onExport"
  >
    <template #filter-left>
      <template v-if="canBrowse">
        <div class="filter-group">
          <span class="filter-label">Tanggal</span>
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
            style="width: 90px"
            @change="fetchData"
          >
            <option v-for="c in cabangOptions" :key="c" :value="c">
              {{ c }}
            </option>
          </select>
        </div>

        <div class="filter-group ml-3">
          <span class="filter-label">Jenis</span>
          <div class="radio-wrap">
            <label v-for="jns in jenisOptions" :key="jns" class="radio-label">
              <input
                type="radio"
                v-model="filterState.jenis"
                :value="jns"
                @change="fetchData"
              />
              {{ jns }}
            </label>
          </div>
        </div>

        <div class="filter-divider" />

        <div class="legend-group">
          <span class="filter-label" style="color: #888">Status:</span>
          <span v-if="showApproveColumns" class="badge-belum-approve"
            >Belum di Approve</span
          >
          <span class="badge-wait">Nunggu Acc</span>
          <span class="badge-acc">Sudah Acc</span>
          <span class="badge-tolak">Tolak</span>
        </div>
      </template>
      <template v-else>
        <span class="filter-label" style="color: #c62828">
          Bagian Anda tidak punya akses ke modul Retur Barang.
        </span>
      </template>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        v-if="canEdit && canBrowse"
        size="small"
        color="orange-darken-3"
        :disabled="selected.length === 0"
        @click="onAjukanPerubahan"
      >
        <template #prepend
          ><IconFileDots :size="15" :stroke-width="1.7"
        /></template>
        Pengajuan
      </v-btn>
      <v-btn
        v-if="canBrowse"
        size="small"
        color="grey-darken-3"
        class="ml-2"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak
      </v-btn>
      <v-btn
        v-if="canBrowse"
        size="small"
        color="green-darken-3"
        variant="outlined"
        class="ml-2"
        @click="onExportDetail"
      >
        <template #prepend
          ><IconFileSpreadsheet :size="15" :stroke-width="1.7"
        /></template>
        Export Detail
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>
    <template #item.TglApprov="{ item }">
      {{ formatTanggal(item.TglApprov) }}
    </template>

    <template #detail="{ item }">
      <div v-if="item" class="det-wrap">
        <div class="det-card">
          <div class="det-head">Detail Barang Retur</div>
          <div class="dt-scroll">
            <table class="dt">
              <thead>
                <tr>
                  <th style="width: 28px">No</th>
                  <th style="width: 140px; text-align: left">Kode</th>
                  <th style="text-align: left">Nama Barang</th>
                  <th style="width: 60px">Satuan</th>
                  <th style="width: 90px; text-align: right">Jumlah</th>
                  <th
                    v-if="showMintaSpk"
                    style="width: 130px; text-align: left"
                  >
                    No Minta
                  </th>
                  <th
                    v-if="showMintaSpk"
                    style="width: 130px; text-align: left"
                  >
                    SPK
                  </th>
                  <th style="text-align: left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(dtl, i) in item.details" :key="i">
                  <td class="tc">{{ Number(i) + 1 }}</td>
                  <td style="font-weight: 600; color: #00796b">
                    {{ dtl.Kode }}
                  </td>
                  <td>{{ dtl.Nama }}</td>
                  <td class="tc">{{ dtl.Satuan }}</td>
                  <td class="tr" style="font-weight: 700; background: #fffde7">
                    {{ num(dtl.Jumlah) }}
                  </td>
                  <td v-if="showMintaSpk">{{ dtl.NoMinta }}</td>
                  <td v-if="showMintaSpk">{{ dtl.SPK }}</td>
                  <td>{{ dtl.Keterangan }}</td>
                </tr>
                <tr v-if="!item.details?.length">
                  <td :colspan="showMintaSpk ? 8 : 6" class="empty-td">
                    Tidak ada rincian barang.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="actionDialog" max-width="400px" persistent>
    <div class="close-dlg">
      <div class="close-dlg-header" style="background: #1565c0">
        <IconPencil :size="14" :stroke-width="1.7" color="white" class="mr-2" />
        Pengajuan Perubahan Data
        <button class="dlg-x" @click="actionDialog = false">✕</button>
      </div>
      <div class="close-dlg-body">
        <div class="f-lbl-sm mb-1">Alasan Pengajuan:</div>
        <textarea
          v-model="actionForm.alasan"
          class="close-area"
          rows="3"
          placeholder="Masukkan alasan pengajuan edit (wajib)..."
        ></textarea>
      </div>
      <div class="close-dlg-footer">
        <button
          class="dlg-btn text-white"
          style="background: #1565c0"
          @click="submitAjukan"
        >
          Kirim Pengajuan
        </button>
        <button class="dlg-btn cancel" @click="actionDialog = false">
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
.ml-3 {
  margin-left: 12px;
}
.legend-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.badge-belum-approve {
  color: #c62828;
  border: 1px solid #c62828;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 700;
  background: white;
}
.badge-wait {
  background: #1976d2;
  color: white;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
}
.badge-acc {
  background: #2e7d32;
  color: white;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
}
.badge-tolak {
  background: #c62828;
  color: white;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
}
.det-wrap {
  padding: 6px 8px 8px 48px;
  background: #f5f6f8;
}
.det-card {
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  overflow: hidden;
  background: white;
}
.det-head {
  background: #00796b;
  color: white;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 4px 9px;
  flex-shrink: 0;
}
.dt-scroll {
  overflow-y: auto;
  max-height: 200px;
}
.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dt th {
  padding: 4px 7px;
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #f5f5f5;
  color: #333;
  position: sticky;
  top: 0;
  z-index: 2;
}
.dt td {
  border-bottom: 1px solid #eeeeee;
  padding: 3px 6px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.empty-td {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px !important;
}
.close-dlg {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  font-family: sans-serif;
  font-size: 12px;
}
.close-dlg-header {
  display: flex;
  align-items: center;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  color: white;
}
.dlg-x {
  margin-left: auto;
  background: transparent;
  border: none;
  color: white;
  font-size: 15px;
  cursor: pointer;
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
  font-size: 11px;
  outline: none;
  resize: none;
  box-sizing: border-box;
}
.close-area:focus {
  border-color: #1565c0;
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
.radio-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  height: 28px;
}
.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  cursor: pointer;
  white-space: nowrap;
}
.radio-label input[type="radio"] {
  accent-color: #1565c0;
  cursor: pointer;
  width: 13px;
  height: 13px;
  margin: 0;
}
</style>
