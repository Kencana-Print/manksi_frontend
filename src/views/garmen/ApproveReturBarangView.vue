<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  approveReturBarangService,
  type ApproveDetailItem,
} from "@/services/garmen/approveReturBarangService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { IconChecks, IconFileSpreadsheet } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

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
  jenis: "ACCESORIES",
});

const jenisOptions = ref<string[]>([]);

onMounted(() => {
  // Replikasi FormCreate .pas — visibilitas jenis per bagian, sama pola
  // dengan modul Retur Barang, cuma SPAREPART tidak dibatasi ke bagian
  // TEKNISI/IT khusus di sini (approval bukan modul entri harian mereka)
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
  } else if (["FINANCE", "AUDIT", "DIREKSI", "EDP"].includes(bagian)) {
    jenisOptions.value = ["ACCESORIES", "OBAT", "SPAREPART", "ATK/RTK"];
    filterState.value.jenis = "ACCESORIES";
  } else {
    jenisOptions.value = [];
  }
});

const canBrowse = computed(() => jenisOptions.value.length > 0);
const showApproveFields = computed(() =>
  ["ACCESORIES", "OBAT"].includes(filterState.value.jenis),
);

// --- KOMPOSISI BROWSE ---
const { items, isLoading, selected, fetchData, canEdit, canExport } = useBrowse(
  {
    menuId: "63",
    fetchApi: async () => {
      if (!canBrowse.value) return [];
      const res = await approveReturBarangService.getBrowse(
        filterState.value.startDate,
        filterState.value.endDate,
        filterState.value.jenis,
      );
      return res.data.data;
    },
  },
);

const headers = computed(() => [
  { title: "Nomor", key: "Nomor", width: "135px" },
  { title: "Jenis", key: "Jenis", width: "100px" },
  { title: "Tanggal", key: "Tanggal", width: "90px" },
  { title: "Cab", key: "Cab", width: "70px" },
  { title: "Dari", key: "Dari", minWidth: "160px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "150px" },
  { title: "Usr", key: "Usr", width: "80px" },
  { title: "No Approve", key: "NoApprov", width: "135px" },
  { title: "Tgl Approve", key: "TglApprov", width: "100px" },
  { title: "Approved By", key: "Approved", width: "100px" },
]);

const num = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);

// Merah kalau belum di-approve, sesuai cxGrdMasterCustomDrawCell
const handleRowProps = (data: any) => {
  const item = data.item?.raw || data.item;
  if (!item.NoApprov) {
    return { style: "color: #c62828 !important;" };
  }
  return {};
};

const expandedRows = ref<any[]>([]);

// --- EXPORT ---
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
    { header: "No Approve", key: "NoApprov", width: 18 },
    { header: "Tgl Approve", key: "TglApprov", width: 12 },
    { header: "Approved By", key: "Approved", width: 12 },
  ];

  const rows = items.value.map((r: any) => ({
    ...r,
    Tanggal: formatTanggal(r.Tanggal),
    TglApprov: formatTanggal(r.TglApprov),
  }));

  await exportExcelSingle(
    `Approve_Retur_Barang_${filterState.value.jenis}_${filterState.value.startDate}.xlsx`,
    "Approve Retur Barang",
    columns,
    rows,
    `Approve Retur Barang - ${filterState.value.jenis}`,
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
        rows.push({
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
          NoMinta: dtl.NoMinta || "",
          SPK: dtl.SPK || "",
        });
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
    { header: "No Minta", key: "NoMinta", width: 18 },
    { header: "SPK", key: "SPK", width: 18 },
  ];

  await exportExcelSingle(
    `Detail_Approve_Retur_Barang_${filterState.value.jenis}_${filterState.value.startDate}.xlsx`,
    "Detail Approve Retur Barang",
    columns,
    rows,
    `Detail Approve Retur Barang - ${filterState.value.jenis}`,
  );
  toast.success("Berhasil export detail data.");
};

// --- DIALOG APPROVE ---
const showApproveDialog = ref(false);
const isDialogLoading = ref(false);
const isDialogSaving = ref(false);
const approveForm = ref({
  isEdit: false,
  noApprov: "",
  jenis: "",
  logNomor: "",
  tanggalApprove: getLocalDate(),
  tanggalRetur: "",
  keterangan: "",
  gpKode: "",
  gpNama: "",
  details: [] as ApproveDetailItem[],
});

const dialogShowApproveFields = computed(() =>
  ["ACCESORIES", "OBAT"].includes(approveForm.value.jenis),
);

const onApprove = async () => {
  if (!selected.value.length)
    return toast.warning("Pilih data terlebih dahulu.");
  const item = selected.value[0];

  isDialogLoading.value = true;
  showApproveDialog.value = true;
  try {
    const res = await approveReturBarangService.getApprovalDetail(
      item.Nomor,
      item.NoApprov || undefined,
    );
    const d = res.data.data;
    approveForm.value = {
      isEdit: d.isEdit,
      noApprov: d.noApprov,
      jenis: d.jenis,
      logNomor: d.logNomor,
      tanggalApprove: getLocalDate(new Date(d.tanggalApprove)),
      tanggalRetur: formatTanggal(d.tanggalRetur),
      keterangan: d.keterangan,
      gpKode: d.gudangProduksi?.kode || "",
      gpNama: d.gudangProduksi?.nama || "",
      details: d.details,
    };
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
    showApproveDialog.value = false;
  } finally {
    isDialogLoading.value = false;
  }
};

const removeDetailRow = (index: number) => {
  // Sesuai cxGrdMasterKeyUp: hapus baris cuma boleh kalau BELUM pernah
  // di-approve (draft baru, isEdit=false). Record yang sudah approved
  // tidak bisa hapus baris lagi.
  if (approveForm.value.isEdit) return;
  approveForm.value.details.splice(index, 1);
};

const submitApprove = async () => {
  const filled = approveForm.value.details.filter((d) => d.kode);
  if (filled.length === 0) {
    toast.error("Detail harus diisi.");
    return;
  }
  for (const d of filled) {
    if (!d.jumlah || Number(d.jumlah) === 0) {
      toast.error("Jumlah harus di isi!");
      return;
    }
  }

  isDialogSaving.value = true;
  try {
    const res = await approveReturBarangService.saveApproval({
      logNomor: approveForm.value.logNomor,
      noApprov: approveForm.value.noApprov,
      jenis: approveForm.value.jenis,
      tanggalApprove: approveForm.value.tanggalApprove,
      keterangan: approveForm.value.keterangan,
      gudangProduksi: {
        kode: approveForm.value.gpKode,
        nama: approveForm.value.gpNama,
      },
      details: approveForm.value.details,
    });
    toast.success(res.data.message || "Berhasil di approve.");
    showApproveDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan approval.");
  } finally {
    isDialogSaving.value = false;
  }
};

const numFmt = (val: any) => Number(val || 0).toLocaleString("id-ID");
</script>

<template>
  <BaseBrowse
    title="Approve Retur Barang"
    menu-id="63"
    :icon="IconChecks"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    show-expand
    v-model:expanded="expandedRows"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport && canBrowse"
    :row-props-fn="handleRowProps"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <template v-if="canBrowse">
        <div class="filter-group">
          <span class="filter-label">Tgl Retur</span>
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
          <span class="badge-belum-approve">Belum di Approve</span>
        </div>
      </template>
      <template v-else>
        <span class="filter-label" style="color: #c62828">
          Bagian Anda tidak punya akses ke modul Approve Retur Barang.
        </span>
      </template>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        v-if="canEdit && canBrowse"
        size="small"
        color="green-darken-2"
        :disabled="selected.length === 0"
        @click="onApprove"
      >
        <template #prepend
          ><IconChecks :size="15" :stroke-width="1.7"
        /></template>
        Approve
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
          <div class="det-head">Detail Barang</div>
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
                    v-if="showApproveFields"
                    style="width: 130px; text-align: left"
                  >
                    No Minta
                  </th>
                  <th
                    v-if="showApproveFields"
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
                  <td v-if="showApproveFields">{{ dtl.NoMinta }}</td>
                  <td v-if="showApproveFields">{{ dtl.SPK }}</td>
                  <td>{{ dtl.Keterangan }}</td>
                </tr>
                <tr v-if="!item.details?.length">
                  <td :colspan="showApproveFields ? 8 : 6" class="empty-td">
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

  <!-- ── DIALOG APPROVE ── -->
  <v-dialog
    v-model="showApproveDialog"
    max-width="1200px"
    persistent
    scrollable
  >
    <div class="apv-dlg">
      <div class="apv-dlg-header">
        <IconChecks :size="15" :stroke-width="1.7" color="white" class="mr-2" />
        {{ approveForm.isEdit ? "Ubah Approval" : "Approve Retur" }}
        {{ approveForm.jenis }}
        <button class="dlg-x" @click="showApproveDialog = false">✕</button>
      </div>

      <div v-if="isDialogLoading" class="apv-loading">Memuat data...</div>

      <template v-else>
        <div class="apv-dlg-body">
          <div class="apv-form-row">
            <div class="apv-field">
              <label class="apv-lbl">No. Approve</label>
              <input
                :value="approveForm.noApprov || '<--Kosong=Baru'"
                readonly
                class="apv-inp apv-ro"
              />
            </div>
            <div class="apv-field">
              <label class="apv-lbl">Tgl. Approve</label>
              <input
                type="date"
                v-model="approveForm.tanggalApprove"
                class="apv-inp"
              />
            </div>
            <div class="apv-field">
              <label class="apv-lbl">No. Retur (Draft)</label>
              <input
                :value="`${approveForm.logNomor} (${approveForm.tanggalRetur})`"
                readonly
                class="apv-inp apv-ro"
              />
            </div>
          </div>

          <div v-if="dialogShowApproveFields" class="apv-form-row">
            <div class="apv-field" style="flex: 1">
              <label class="apv-lbl">Gudang Produksi</label>
              <input
                :value="approveForm.gpNama"
                readonly
                class="apv-inp apv-ro"
                style="width: 100%"
              />
            </div>
          </div>

          <div class="apv-field">
            <label class="apv-lbl">Keterangan</label>
            <textarea
              v-model="approveForm.keterangan"
              class="apv-textarea"
              rows="2"
            />
          </div>

          <div class="apv-det-head">Detail Barang</div>
          <div class="apv-det-scroll">
            <table class="apv-dt">
              <thead>
                <tr>
                  <th style="width: 28px">No</th>
                  <th v-if="dialogShowApproveFields" style="width: 120px">
                    No.Minta
                  </th>
                  <th style="width: 110px">Kode</th>
                  <th>Nama</th>
                  <th style="width: 60px">Satuan</th>
                  <th style="width: 80px; text-align: right">Retur (Draft)</th>
                  <th style="width: 90px; text-align: right">Jumlah</th>
                  <th style="width: 80px; text-align: right">Sudah</th>
                  <th style="width: 150px">Keterangan</th>
                  <th v-if="dialogShowApproveFields" style="width: 110px">
                    SPK
                  </th>
                  <th v-if="!approveForm.isEdit" style="width: 32px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, i) in approveForm.details" :key="i">
                  <td class="tc">{{ i + 1 }}</td>
                  <td v-if="dialogShowApproveFields">{{ d.nominta }}</td>
                  <td style="font-weight: 600; color: #1565c0">{{ d.kode }}</td>
                  <td>{{ d.nama }}</td>
                  <td class="tc">{{ d.satuan }}</td>
                  <td class="tr">{{ numFmt(d.retur) }}</td>
                  <td>
                    <input
                      type="number"
                      v-model.number="d.jumlah"
                      class="apv-cell-inp tr"
                    />
                  </td>
                  <td class="tr">{{ numFmt(d.sudah) }}</td>
                  <td>
                    <input v-model="d.keterangan" class="apv-cell-inp" />
                  </td>
                  <td v-if="dialogShowApproveFields">{{ d.spk }}</td>
                  <td v-if="!approveForm.isEdit" class="tc">
                    <button class="row-del-btn" @click="removeDetailRow(i)">
                      ✕
                    </button>
                  </td>
                </tr>
                <tr v-if="!approveForm.details.length">
                  <td colspan="10" class="empty-td">
                    Tidak ada rincian barang.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="apv-dlg-footer">
          <button
            class="dlg-btn text-white"
            style="background: #2e7d32"
            :disabled="isDialogSaving"
            @click="submitApprove"
          >
            {{ isDialogSaving ? "Menyimpan..." : "Simpan Approve" }}
          </button>
          <button class="dlg-btn cancel" @click="showApproveDialog = false">
            Batal
          </button>
        </div>
      </template>
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

/* Dialog Approve */
.apv-dlg {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}
.apv-dlg-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #2e7d32;
  color: white;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
.dlg-x {
  margin-left: auto;
  background: transparent;
  border: none;
  color: white;
  font-size: 15px;
  cursor: pointer;
}
.apv-loading {
  padding: 40px;
  text-align: center;
  color: #999;
}
.apv-dlg-body {
  padding: 14px 16px;
  overflow-y: auto;
  flex: 1;
}
.apv-form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}
.apv-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.apv-lbl {
  font-size: 10px;
  font-weight: 700;
  color: #666;
}
.apv-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.apv-inp:focus {
  border-color: #2e7d32;
}
.apv-ro {
  background: #f0f0f0;
  color: #555;
}
.apv-textarea {
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  outline: none;
  resize: none;
  box-sizing: border-box;
  font-family: inherit;
}
.apv-textarea:focus {
  border-color: #2e7d32;
}
.apv-det-head {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #2e7d32;
  margin: 12px 0 6px;
}
.apv-det-scroll {
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  overflow: auto;
  max-height: 320px;
}
.apv-dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.apv-dt th {
  padding: 5px 6px;
  font-size: 10px;
  font-weight: 700;
  text-align: left;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  position: sticky;
  top: 0;
  z-index: 2;
}
.apv-dt td {
  padding: 3px 6px;
  border-bottom: 1px solid #eee;
}
.apv-cell-inp {
  width: 100%;
  height: 24px;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
}
.apv-cell-inp:focus {
  border-color: #2e7d32;
  background: #fffde7;
}
.apv-cell-inp.tr {
  text-align: right;
}
.row-del-btn {
  background: transparent;
  border: none;
  color: #c62828;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.6;
}
.row-del-btn:hover {
  opacity: 1;
}
.apv-dlg-footer {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.dlg-btn {
  height: 30px;
  padding: 0 16px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.dlg-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.dlg-btn.cancel {
  background: #e0e0e0;
  color: #424242;
  margin-left: auto;
}
</style>
