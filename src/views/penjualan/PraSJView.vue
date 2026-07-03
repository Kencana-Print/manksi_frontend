<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { praSuratJalanService as svc } from "@/services/penjualan/praSuratJalanService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconFileDots,
  IconFileExport,
  IconListDetails,
  IconTruckDelivery,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();

// ── Helpers ────────────────────────────────────────────────
const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");
const fmtDate = (v: string) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

// ── Filter — default hari ini s.d. hari ini ─────────────────
const tglAwal = ref(todayLocal());
const tglAkhir = ref(todayLocal());

const filterState = computed(() => ({
  tglAwal: tglAwal.value,
  tglAkhir: tglAkhir.value,
}));
const onFilterStateRestore = (val: any) => {
  if (val?.tglAwal) tglAwal.value = val.tglAwal;
  if (val?.tglAkhir) tglAkhir.value = val.tglAkhir;
};

// ── useBrowse ──────────────────────────────────────────────
const { items, isLoading, selected, canInsert, canEdit, canDelete, fetchData } =
  useBrowse({
    menuId: "168",
    fetchApi: async () => {
      const res = await svc.getBrowse(tglAwal.value, tglAkhir.value);
      return res.data.data ?? [];
    },
  });

const selectedItem = computed(() => selected.value[0] ?? null);

// ── Expand detail ────────────────────────────────────────────
const detailCache = ref<Record<string, any[]>>({});
const loadingDetails = ref<Set<string>>(new Set());
const expandedItems = ref<any[]>([]);

const onExpandChange = async (newExpanded: any[]) => {
  expandedItems.value = newExpanded;
  const newKeys = newExpanded.map((i: any) => (i.raw || i).PraSJ);
  for (const praSj of newKeys) {
    if (!detailCache.value[praSj] && !loadingDetails.value.has(praSj)) {
      loadingDetails.value = new Set([...loadingDetails.value, praSj]);
      try {
        const res = await svc.getBrowseDetail(
          tglAwal.value,
          tglAkhir.value,
          praSj,
        );
        detailCache.value[praSj] = res.data.data ?? [];
      } catch {
        detailCache.value[praSj] = [];
      } finally {
        loadingDetails.value.delete(praSj);
        loadingDetails.value = new Set(loadingDetails.value);
      }
    }
  }
};

// ── Headers ────────────────────────────────────────────────
const headers = [
  { title: "Pra SJ", key: "PraSJ", width: "140px" },
  { title: "Tanggal", key: "Tanggal", width: "90px" },
  { title: "Nomor SJ", key: "NomorSJ", width: "140px" },
  { title: "Tgl SJ", key: "TglSJ", width: "90px" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Kode Cus", key: "KdCus", width: "90px" },
  { title: "Customer", key: "Customer", minWidth: "180px" },
  { title: "Alamat", key: "Alamat", minWidth: "200px" },
  { title: "Kota", key: "Kota", width: "120px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "140px" },
  { title: "Gudang", key: "Gudang", minWidth: "140px" },
  { title: "Qty Kirim", key: "QtyKirim", width: "90px", align: "end" },
];

// ── Row color — merah utk yang belum jadi SJ ─────────────────
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (!item?.NomorSJ) return { style: "color:#c62828" };
  return {};
};

// ── Auto refresh ───────────────────────────────────────────
watch([tglAwal, tglAkhir], fetchData);
onMounted(fetchData);

// ── Navigate ─────────────────────────────────────────────────
// CATATAN: route & view Form belum dibuat — akan error sampai
// PraSJFormView.vue (Baru/Ubah) dan form "Create SJ" dibuat.
const goNew = () => {
  router.push({ name: "PraSJFormCreate" });
};

const goEdit = async () => {
  if (!selectedItem.value) return;
  try {
    const res = await svc.cekBisaUbah(selectedItem.value.PraSJ);
    const cek = res.data.data;
    if (!cek.bisa) {
      toast.error(cek.reason);
      return;
    }
    router.push({
      name: "PraSJFormEdit",
      query: { praSj: selectedItem.value.PraSJ },
    });
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal cek data.");
  }
};

// ── Create SJ (bulk dialog) ──────────────────────────────────
const showCreateSjDialog = ref(false);
const createSjTanggal = ref(todayLocal());
const createSjList = ref<any[]>([]);
const createSjSelected = ref<Set<string>>(new Set());
const isLoadingCreateSjList = ref(false);
const isConverting = ref(false);

const createSjAllChecked = computed(
  () =>
    createSjList.value.length > 0 &&
    createSjSelected.value.size === createSjList.value.length,
);

const openCreateSjDialog = async () => {
  showCreateSjDialog.value = true;
  createSjTanggal.value = todayLocal();
  await fetchCreateSjList();
};

const fetchCreateSjList = async () => {
  isLoadingCreateSjList.value = true;
  createSjSelected.value = new Set();
  try {
    const res = await svc.getListForCreateSj();
    createSjList.value = res.data.data || [];
  } catch {
    toast.error("Gagal memuat daftar Pra SJ.");
  } finally {
    isLoadingCreateSjList.value = false;
  }
};

const toggleCreateSjRow = (nomor: string) => {
  const s = new Set(createSjSelected.value);
  if (s.has(nomor)) s.delete(nomor);
  else s.add(nomor);
  createSjSelected.value = s;
};

const toggleCreateSjAll = () => {
  if (createSjAllChecked.value) {
    createSjSelected.value = new Set();
  } else {
    createSjSelected.value = new Set(createSjList.value.map((r) => r.Nomor));
  }
};

const doConvertToSj = async () => {
  if (!createSjSelected.value.size) {
    toast.warning(
      "Tidak ada data yang akan di approval.\nSilahkan di refresh dulu.",
    );
    return;
  }
  isConverting.value = true;
  try {
    const res = await svc.convertToSj(
      createSjTanggal.value,
      Array.from(createSjSelected.value),
    );
    const { successCount, results } = res.data.data;
    const failed = results.filter((r: any) => !r.success);

    toast.success(`Selesai.\n${successCount} berhasil dibuat.`);
    if (failed.length) {
      failed.forEach((f: any) => toast.warning(`${f.praSj}: ${f.message}`));
    }

    showCreateSjDialog.value = false;
    fetchData(); // refresh browse utama
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal Simpan.");
  } finally {
    isConverting.value = false;
  }
};

// ── Delete ─────────────────────────────────────────────────
const checkBisaHapus = async (item: any): Promise<boolean> => {
  try {
    const res = await svc.cekBisaHapus(item.PraSJ);
    const cek = res.data.data;
    if (!cek.bisaHapus) {
      toast.error(cek.reason);
      return false;
    }
    return true;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal cek data.");
    return false;
  }
};

const onDelete = async (item: any) => {
  try {
    await svc.deleteData(item.PraSJ);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal hapus.");
  }
};

// ── Export ─────────────────────────────────────────────────
const isExporting = ref(false);
const isExportingDetail = ref(false);

const onExport = async () => {
  isExporting.value = true;
  try {
    const res = await svc.getExportData(tglAwal.value, tglAkhir.value);
    const data = res.data.data ?? [];
    await exportExcelSingle(
      `Pra_SJ_${tglAwal.value}_${tglAkhir.value}`,
      "Pra SJ",
      [
        { header: "Pra SJ", key: "PraSJ" },
        { header: "Tanggal", key: "Tanggal" },
        { header: "Nomor SJ", key: "NomorSJ" },
        { header: "Tgl SJ", key: "TglSJ" },
        { header: "Divisi", key: "Divisi" },
        { header: "Kode Cus", key: "KdCus" },
        { header: "Customer", key: "Customer" },
        { header: "Alamat", key: "Alamat" },
        { header: "Kota", key: "Kota" },
        { header: "Keterangan", key: "Keterangan" },
        { header: "Gudang", key: "Gudang" },
        { header: "Qty Kirim", key: "QtyKirim", align: "right" },
      ],
      data,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await svc.getExportDetail(tglAwal.value, tglAkhir.value);
    const data = res.data.data ?? [];
    await exportExcelSingle(
      `Pra_SJ_Detail_${tglAwal.value}_${tglAkhir.value}`,
      "Detail",
      [
        { header: "Pra SJ", key: "PraSJ" },
        { header: "SPK", key: "SPK" },
        { header: "Nama", key: "Nama" },
        { header: "Ukuran", key: "Ukuran" },
        { header: "Panjang", key: "Panjang", align: "right" },
        { header: "Lebar", key: "Lebar", align: "right" },
        { header: "Jumlah", key: "Jumlah", align: "right" },
        { header: "Keterangan", key: "Keterangan" },
      ],
      data,
    );
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Pra Surat Jalan"
    menu-id="168"
    :icon="IconFileDots"
    :is-loading="isLoading"
    :headers="headers"
    :items="items ?? []"
    item-value="PraSJ"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :before-delete="checkBisaHapus"
    search-placeholder="Cari pra SJ, customer, keterangan..."
    :selected="selected"
    :show-expand="true"
    :loading-details="loadingDetails"
    :expanded="expandedItems"
    :filter-state="filterState"
    @update:filter-state="onFilterStateRestore"
    @update:selected="selected = $event"
    @update:expanded="onExpandChange"
    @add="goNew"
    @edit="goEdit"
    @delete="onDelete"
    @refresh="fetchData"
    :row-props-fn="rowPropsFn"
  >
    <!-- ── Filter ── -->
    <template #filter-left>
      <label class="flbl">Tanggal</label>
      <input type="date" v-model="tglAwal" class="finp" />
      <span class="fsep">s.d.</span>
      <input type="date" v-model="tglAkhir" class="finp" />
    </template>

    <template #filter-right>
      <div class="legend-row">
        <span class="legend-dot dot-red"></span>
        <span class="legend-lbl">Belum Jadi Surat Jalan</span>
      </div>
    </template>

    <!-- ── Extra actions ── -->
    <template #extra-actions>
      <v-btn
        size="small"
        variant="flat"
        color="teal"
        @click="openCreateSjDialog"
      >
        <IconTruckDelivery :size="14" style="margin-right: 4px" />
        Create SJ
      </v-btn>

      <v-btn
        size="small"
        variant="outlined"
        color="success"
        :loading="isExporting"
        @click="onExport"
      >
        <IconFileExport :size="14" style="margin-right: 4px" />
        Export
      </v-btn>

      <v-btn
        size="small"
        variant="outlined"
        color="success"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <IconListDetails :size="14" style="margin-right: 4px" />
        Export Detail
      </v-btn>
    </template>

    <!-- ── Custom cell rendering ── -->
    <template #item.QtyKirim="{ item }">
      {{ num(item.QtyKirim) }}
    </template>

    <template #item.TglSJ="{ item }">
      {{ item.TglSJ ? fmtDate(item.TglSJ) : "-" }}
    </template>

    <!-- ── Expanded detail ── -->
    <template #detail="{ item }">
      <div class="dtbl-wrap">
        <table class="dtbl">
          <thead>
            <tr>
              <th style="width: 26px">#</th>
              <th style="width: 130px">SPK</th>
              <th style="min-width: 200px">Nama</th>
              <th style="width: 100px">Ukuran</th>
              <th style="width: 80px; text-align: right">Panjang</th>
              <th style="width: 80px; text-align: right">Lebar</th>
              <th style="width: 80px; text-align: right">Jumlah</th>
              <th style="min-width: 140px">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="detailCache[item.PraSJ]?.length">
              <tr v-for="(d, j) in detailCache[item.PraSJ]" :key="j">
                <td style="text-align: center; color: #9e9e9e; font-size: 10px">
                  {{ j + 1 }}
                </td>
                <td
                  style="
                    font-family: monospace;
                    font-size: 10px;
                    color: #1565c0;
                  "
                >
                  {{ d.SPK }}
                </td>
                <td>{{ d.Nama }}</td>
                <td>{{ d.Ukuran }}</td>
                <td style="text-align: right">{{ d.Panjang || "-" }}</td>
                <td style="text-align: right">{{ d.Lebar || "-" }}</td>
                <td style="text-align: right">{{ num(d.Jumlah) }}</td>
                <td>{{ d.Keterangan }}</td>
              </tr>
            </template>
            <tr v-else-if="loadingDetails.has(item.PraSJ)">
              <td
                colspan="8"
                style="text-align: center; padding: 8px; color: #9e9e9e"
              >
                Memuat...
              </td>
            </tr>
            <tr v-else>
              <td
                colspan="8"
                style="
                  text-align: center;
                  padding: 8px;
                  color: #9e9e9e;
                  font-style: italic;
                "
              >
                Tidak ada detail
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <!-- ── Dialog Create SJ (bulk) — sesuai Delphi ufrmPraSJ2 ── -->
  <v-dialog v-model="showCreateSjDialog" max-width="900px" persistent>
    <div class="lookup-card">
      <div class="lookup-header">
        <IconTruckDelivery :size="14" />
        Create Surat Jalan dari Pra SJ
        <v-spacer />
        <button class="lookup-close" @click="showCreateSjDialog = false">
          ✕
        </button>
      </div>

      <div class="createsj-toolbar">
        <label class="flbl">Tanggal SJ</label>
        <input type="date" v-model="createSjTanggal" class="finp" />
        <v-spacer />
        <v-btn
          size="small"
          variant="outlined"
          :loading="isLoadingCreateSjList"
          @click="fetchCreateSjList"
        >
          Refresh
        </v-btn>
      </div>

      <div class="lookup-table-wrap" style="min-height: 300px">
        <div v-if="isLoadingCreateSjList" class="lookup-state">Memuat...</div>
        <div v-else-if="!createSjList.length" class="lookup-state">
          Tidak ada Pra SJ yang belum jadi Surat Jalan
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 34px; text-align: center">
                <input
                  type="checkbox"
                  :checked="createSjAllChecked"
                  @change="toggleCreateSjAll"
                />
              </th>
              <th style="width: 70px">Divisi</th>
              <th style="width: 110px">Nomor</th>
              <th style="width: 90px">Tanggal</th>
              <th style="min-width: 140px">Gudang</th>
              <th style="width: 80px">Kd Cus</th>
              <th style="min-width: 160px">Customer</th>
              <th style="min-width: 160px">Alamat</th>
              <th style="width: 100px">Kota</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in createSjList"
              :key="item.Nomor"
              class="lookup-row"
              @click="toggleCreateSjRow(item.Nomor)"
            >
              <td style="text-align: center" @click.stop>
                <input
                  type="checkbox"
                  :checked="createSjSelected.has(item.Nomor)"
                  @change="toggleCreateSjRow(item.Nomor)"
                />
              </td>
              <td>{{ item.Divisi }}</td>
              <td class="td-kode">{{ item.Nomor }}</td>
              <td>{{ fmtDate(item.Tanggal) }}</td>
              <td>{{ item.Gudang }}</td>
              <td>{{ item.KdCus }}</td>
              <td>{{ item.Nama }}</td>
              <td>{{ item.Alamat }}</td>
              <td>{{ item.Kota }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="createsj-footer">
        <span class="footer-count">
          {{ createSjSelected.size }} dari {{ createSjList.length }} dipilih
        </span>
        <v-spacer />
        <v-btn variant="text" size="small" @click="showCreateSjDialog = false"
          >Batal</v-btn
        >
        <v-btn
          variant="flat"
          size="small"
          color="teal"
          :loading="isConverting"
          :disabled="!createSjSelected.size"
          @click="doConvertToSj"
        >
          Create SJ
        </v-btn>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.flbl {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  white-space: nowrap;
}
.finp {
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
}
.finp:focus {
  border-color: #1565c0;
}
.fsep {
  font-size: 11px;
  color: #777;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}
.dot-red {
  background: #c62828;
}
.legend-lbl {
  color: #555;
}

.dtbl-wrap {
  overflow-x: auto;
  max-width: 100%;
  margin: 6px 0 6px 32px;
  width: calc(100% - 32px);
  border-radius: 4px;
}
.dtbl {
  min-width: 700px;
  border-collapse: collapse;
  font-size: 11px;
  width: 100%;
}
.dtbl th {
  background: #455a64;
  color: white;
  padding: 3px 6px;
  font-size: 10px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}
.dtbl td {
  padding: 3px 6px;
  border-bottom: 0.3px solid #ececec;
  white-space: nowrap;
}

.createsj-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.createsj-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.footer-count {
  font-size: 11px;
  color: #757575;
}
.td-kode {
  font-family: monospace;
  font-weight: 600;
  color: #1565c0;
}
.lookup-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-size: 12px;
  max-height: 80vh;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}
.lookup-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  gap: 6px;
  flex-shrink: 0;
}
.lookup-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
  padding: 0;
}
.lookup-close:hover {
  color: white;
}
.lookup-table-wrap {
  flex: 1;
  overflow-y: auto;
}
.lookup-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  color: #9e9e9e;
  font-size: 12px;
}
.lookup-table {
  width: 100%;
  border-collapse: collapse;
}
.lookup-table thead tr {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #1565c0;
}
.lookup-table th {
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: white;
  text-align: left;
  white-space: nowrap;
}
.lookup-table td {
  padding: 5px 10px;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
  color: #212121;
  white-space: nowrap;
}
.lookup-row {
  cursor: pointer;
  transition: background 0.1s;
}
.lookup-row:hover td {
  background: #e3f2fd;
}
</style>
