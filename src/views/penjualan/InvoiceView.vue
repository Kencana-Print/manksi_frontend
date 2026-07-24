<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { invoiceService as svc } from "@/services/penjualan/invoiceService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconReceipt,
  IconPrinter,
  IconFileExport,
  IconListDetails,
  IconRefreshDot,
  IconAlertTriangle,
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

const router = useRouter();
const toast = useToast();

// ── Helpers ────────────────────────────────────────────────
const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const firstOfMonth = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

// ── Filter ─────────────────────────────────────────────────
const tglAwal = ref(firstOfMonth());
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
    menuId: "156",
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
  const newNomors = newExpanded.map((i: any) => (i.raw || i).Nomor);
  for (const nomor of newNomors) {
    if (!detailCache.value[nomor] && !loadingDetails.value.has(nomor)) {
      loadingDetails.value = new Set([...loadingDetails.value, nomor]);
      try {
        const res = await svc.getBrowseDetail(
          tglAwal.value,
          tglAkhir.value,
          nomor,
        );
        detailCache.value[nomor] = res.data.data ?? [];
      } catch {
        detailCache.value[nomor] = [];
      } finally {
        loadingDetails.value.delete(nomor);
        loadingDetails.value = new Set(loadingDetails.value);
      }
    }
  }
};

// ── Headers ────────────────────────────────────────────────
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "90px" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Customer", key: "NamaCustomer", minWidth: "180px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "220px" },
  { title: "Status", key: "Status", width: "100px" },
  { title: "Otomatis", key: "Otomatis", width: "90px" },
  { title: "Total", key: "Total", width: "120px", align: "end" },
  { title: "Faktur Pajak", key: "Faktur_Pajak", width: "150px" },
  { title: "Status Exp.", key: "Stat_Exp", width: "110px" },
  { title: "Bayar", key: "Bayar", width: "110px", align: "end" },
  { title: "Tgl Pelunasan", key: "Tanggal_Pelunasan", width: "100px" },
  { title: "Tgl Bayar", key: "Tanggal_Bayar", width: "100px" },
  { title: "Tgl Terima", key: "inv_Tgl_Terima", width: "95px" },
  { title: "Penerima", key: "inv_Penerima", width: "140px" },
  { title: "Rencana Bayar", key: "inv_RencanaBayar", width: "95px" },
  { title: "ApvNoSJ", key: "ApvNoSJ", width: "85px", align: "center" },
  { title: "ACC Edit", key: "ACC_Edit", width: "100px" },
  { title: "Alasan", key: "Alasan", minWidth: "180px" },
  { title: "User", key: "Usr", width: "90px" },
  { title: "Created", key: "Created", width: "140px" },
];

const detailHeaders = [
  { title: "Kode", key: "Kode", width: "120px" },
  { title: "Nama", key: "Nama", minWidth: "200px" },
  { title: "Ukuran", key: "Ukuran", width: "100px" },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "end" },
  { title: "Harga", key: "Harga", width: "100px", align: "end" },
  { title: "Harga Riil", key: "HargaRiil", width: "100px", align: "end" },
  { title: "Fee", key: "Fee", width: "90px", align: "end" },
];

// ── Row color — merah jika ApvNoSJ='N', ungu jika 'T' ───────
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item?.ApvNoSJ === "N") return { style: "color:#c62828" };
  if (item?.ApvNoSJ === "T") return { style: "color:#7b1fa2" };
  return {};
};

// ── Auto refresh ───────────────────────────────────────────
watch([tglAwal, tglAkhir], fetchData);
onMounted(fetchData);

// ── Navigate (form belum dibuat, placeholder route) ─────────
const goNew = () => {
  router.push({ name: "InvoiceFormCreate" });
};

const goEdit = async () => {
  if (!selectedItem.value) return;
  try {
    const res = await svc.cekBisaUbah(selectedItem.value.Nomor);
    const cek = res.data.data;
    if (!cek.bisa) {
      toast.error(cek.reason);
      return;
    }
    router.push({
      name: "InvoiceFormEdit",
      query: { nomor: selectedItem.value.Nomor },
    });
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal cek data.");
  }
};

// ── Delete ─────────────────────────────────────────────────
const showDeleteDialog = ref(false);

const checkBisaHapus = async (item: any): Promise<boolean> => {
  try {
    const res = await svc.cekBisaHapus(item.Nomor);
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
    await svc.deleteData(item.Nomor);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal hapus.");
  }
};

const confirmDelete = async () => {
  showDeleteDialog.value = false;
  try {
    await svc.deleteData(selectedItem.value!.Nomor);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal hapus.");
  }
};

// ── Cetak ──────────────────────────────────────────────────
const showCetakDialog = ref(false);

const onCetak = async () => {
  if (!selectedItem.value) return;
  try {
    const res = await svc.cekBisaCetak(selectedItem.value.Nomor);
    const cek = res.data.data;
    if (!cek.bisa) {
      toast.error(cek.reason);
      return;
    }
    showCetakDialog.value = true;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal cek data.");
  }
};

const doCetak = (mode: "dotmatrix" | "inkjet") => {
  showCetakDialog.value = false;
  const url = router.resolve({
    name: "InvoicePrint",
    query: { nomor: selectedItem.value!.Nomor, mode },
  }).href;
  window.open(url, "_blank");
};

// ── Update Status ────────────────────────────────────────────
const showStatusDialog = ref(false);
const statusNomor = ref("");
const isLoadingStatus = ref(false);
const isSavingStatus = ref(false);
const statusPenerima = ref("");
const statusTglTerima = ref(todayLocal());
const statusRencanaBayar = ref(todayLocal());

const onUpdateStatus = async () => {
  if (!selectedItem.value) return;
  statusNomor.value = selectedItem.value.Nomor;
  showStatusDialog.value = true;
  isLoadingStatus.value = true;
  try {
    const res = await svc.getStatusInfo(statusNomor.value);
    const d = res.data.data;
    statusPenerima.value = d.inv_Penerima || "";
    statusTglTerima.value = d.inv_Tgl_Terima || todayLocal();
    statusRencanaBayar.value = d.inv_RencanaBayar || todayLocal();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
    showStatusDialog.value = false;
  } finally {
    isLoadingStatus.value = false;
  }
};

const saveStatus = async () => {
  isSavingStatus.value = true;
  try {
    await svc.saveStatusUpdate(statusNomor.value, {
      penerima: statusPenerima.value,
      tglTerima: statusTglTerima.value,
      rencanaBayar: statusRencanaBayar.value,
    });
    toast.success("Berhasil diupdate.");
    showStatusDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan.");
  } finally {
    isSavingStatus.value = false;
  }
};

// ── Pengajuan Ubah ─────────────────────────────────────────
const showPengajuanDialog = ref(false);
const pengajuanAlasan = ref("");
const pengajuanUrut = ref(1);

const onPengajuanUbah = async () => {
  if (!selectedItem.value) return;
  try {
    const cekRes = await svc.cekPerluPengajuan(selectedItem.value.Nomor);
    if (!cekRes.data.data?.perlu) {
      toast.info(
        cekRes.data.data?.reason || "Tidak perlu pengajuan perubahan data.",
      );
      return;
    }
    const res = await svc.getPengajuanStatus(selectedItem.value.Nomor);
    pengajuanUrut.value = res.data.data.urut;
    pengajuanAlasan.value = res.data.data.alasan || "";
    showPengajuanDialog.value = true;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal load status pengajuan.");
  }
};

const submitPengajuan = async () => {
  if (!pengajuanAlasan.value.trim()) {
    toast.warning("Alasan harus diisi.");
    return;
  }
  try {
    await svc.pengajuanUbah({
      nomor: selectedItem.value!.Nomor,
      tanggal: selectedItem.value!.Tanggal,
      namaCustomer: selectedItem.value!.NamaCustomer,
      alasan: pengajuanAlasan.value,
      urut: pengajuanUrut.value,
    });
    toast.success("Berhasil diajukan. Menunggu ACC.");
    showPengajuanDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal pengajuan.");
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
      `Invoice_${tglAwal.value}_${tglAkhir.value}`,
      "Invoice",
      [
        { header: "Nomor", key: "Nomor" },
        { header: "Tanggal", key: "Tanggal" },
        { header: "Divisi", key: "Divisi" },
        { header: "Customer", key: "NamaCustomer" },
        { header: "Keterangan", key: "Keterangan" },
        { header: "Status", key: "Status" },
        { header: "Otomatis", key: "Otomatis" },
        { header: "Total", key: "Total", align: "right" },
        { header: "Faktur Pajak", key: "Faktur_Pajak" },
        { header: "Status Export", key: "Stat_Exp" },
        { header: "Bayar", key: "Bayar", align: "right" },
        { header: "Tgl Pelunasan", key: "Tanggal_Pelunasan" },
        { header: "Tgl Bayar", key: "Tanggal_Bayar" },
        { header: "Tgl Terima", key: "inv_Tgl_Terima" },
        { header: "Penerima", key: "inv_Penerima" },
        { header: "Rencana Bayar", key: "inv_RencanaBayar" },
        { header: "User", key: "Usr" },
        { header: "Created", key: "Created" },
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
      `Invoice_Detail_${tglAwal.value}_${tglAkhir.value}`,
      "Detail",
      [
        { header: "Nomor Inv", key: "Nomor" },
        { header: "Kode", key: "Kode" },
        { header: "Nama", key: "Nama" },
        { header: "Ukuran", key: "Ukuran" },
        { header: "Jumlah", key: "Jumlah", align: "right" },
        { header: "Harga", key: "Harga", align: "right" },
        { header: "Harga Riil", key: "HargaRiil", align: "right" },
        { header: "Fee", key: "Fee", align: "right" },
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
    title="Invoice"
    menu-id="156"
    :icon="IconReceipt"
    :is-loading="isLoading"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :before-delete="checkBisaHapus"
    search-placeholder="Cari nomor, customer, keterangan..."
    :selected="selected"
    :show-expand="true"
    :loading-details="loadingDetails"
    :expanded="expandedItems"
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
        <span class="legend-lbl"
          >Belum approval (Ada SPK belum dibuatkan SJ, Invoice tidak bisa
          dicetak dan tidak masuk piutang)</span
        >
      </div>
    </template>

    <!-- ── Extra actions ── -->
    <template #extra-actions>
      <v-btn
        size="small"
        variant="outlined"
        color="primary"
        :disabled="!selectedItem"
        @click="onCetak"
      >
        <IconPrinter :size="14" style="margin-right: 4px" />
        Cetak
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

      <v-btn
        size="small"
        variant="outlined"
        color="primary"
        :disabled="!selectedItem"
        @click="onUpdateStatus"
      >
        <IconRefreshDot :size="14" style="margin-right: 4px" />
        Update Status
      </v-btn>

      <v-menu v-if="selectedItem">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            size="small"
            variant="outlined"
            color="secondary"
          >
            Tindakan ▾
          </v-btn>
        </template>
        <v-list density="compact" style="font-size: 12px; min-width: 200px">
          <v-list-item @click="onPengajuanUbah">
            <v-list-item-title>Pengajuan Perubahan Data</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>

    <!-- ── Custom cell rendering ── -->
    <template #item.Nomor="{ item }">
      <span
        class="nomor-cell"
        :class="{
          'acc-waiting': item.ACC_Edit === 'WAITING',
          'acc-rejected': item.ACC_Edit === 'REJECTED',
          'acc-acc': item.ACC_Edit === 'ACC',
        }"
        >{{ item.Nomor }}</span
      >
    </template>

    <template #item.Status="{ item }">
      <span
        class="chip"
        :class="{
          'chip-green': item.Status === 'Normal',
          'chip-orange': item.Status === 'Proforma',
          'chip-red': item.Status === 'Tidak Normal',
        }"
        >{{ item.Status }}</span
      >
    </template>

    <template #item.Total="{ item }">
      {{ num(item.Total) }}
    </template>

    <template #item.Bayar="{ item }">
      {{ num(item.Bayar) }}
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <template #item.Tanggal_Pelunasan="{ item }">
      {{ formatTanggal(item.Tanggal_Pelunasan) }}
    </template>

    <template #item.Tanggal_Bayar="{ item }">
      {{ formatTanggal(item.Tanggal_Bayar) }}
    </template>

    <template #item.inv_Tgl_Terima="{ item }">
      {{ formatTanggal(item.inv_Tgl_Terima) }}
    </template>

    <template #item.inv_RencanaBayar="{ item }">
      {{ formatTanggal(item.inv_RencanaBayar) }}
    </template>

    <template #item.Created="{ item }">
      {{ formatTanggalJam(item.Created) }}
    </template>

    <template #item.ApvNoSJ="{ item }">
      <span
        class="chip"
        :class="{
          'chip-green': item.ApvNoSJ === 'Y',
          'chip-red': item.ApvNoSJ === 'N',
          'chip-purple': item.ApvNoSJ === 'T',
        }"
        >{{ item.ApvNoSJ || "-" }}</span
      >
    </template>

    <template #item.ACC_Edit="{ item }">
      <span
        class="chip"
        :class="{
          'chip-blue': item.ACC_Edit === 'WAITING',
          'chip-green': item.ACC_Edit === 'ACC',
          'chip-red': item.ACC_Edit === 'REJECTED',
          'chip-grey': item.ACC_Edit === 'ACC - USED',
        }"
        >{{ item.ACC_Edit || "-" }}</span
      >
    </template>

    <!-- ── Expanded detail ── -->
    <template #detail="{ item }">
      <div class="dtbl-wrap">
        <table class="dtbl">
          <thead>
            <tr>
              <th style="width: 26px">#</th>
              <th style="width: 120px">Kode</th>
              <th style="min-width: 200px">Nama</th>
              <th style="width: 100px">Ukuran</th>
              <th style="width: 80px; text-align: right">Jumlah</th>
              <th style="width: 100px; text-align: right">Harga</th>
              <th style="width: 100px; text-align: right">Harga Riil</th>
              <th style="width: 90px; text-align: right">Fee</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="detailCache[item.Nomor]?.length">
              <tr v-for="(d, j) in detailCache[item.Nomor]" :key="j">
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
                  {{ d.Kode }}
                </td>
                <td>{{ d.Nama }}</td>
                <td>{{ d.Ukuran }}</td>
                <td style="text-align: right">{{ num(d.Jumlah) }}</td>
                <td style="text-align: right">{{ num(d.Harga) }}</td>
                <td style="text-align: right">{{ num(d.HargaRiil) }}</td>
                <td style="text-align: right">{{ num(d.Fee) }}</td>
              </tr>
            </template>
            <tr v-else-if="loadingDetails.has(item.Nomor)">
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

  <!-- ── Dialog Delete ── -->
  <v-dialog v-model="showDeleteDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-error text-white"
        style="font-size: 13px; font-weight: 700"
      >
        <IconAlertTriangle :size="15" style="margin-right: 6px" />
        Hapus Invoice
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Yakin ingin hapus <b>{{ selectedItem?.Nomor }}</b
        >?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="showDeleteDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn variant="flat" size="small" color="error" @click="confirmDelete"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Update Status ── -->
  <v-dialog v-model="showStatusDialog" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Update Status Invoice — {{ statusNomor }}
      </v-card-title>
      <v-card-text class="pa-4">
        <div v-if="isLoadingStatus" class="status-loading">
          <v-progress-circular
            indeterminate
            color="primary"
            size="24"
            width="3"
          />
          <span>Memuat data...</span>
        </div>
        <template v-else>
          <label class="status-lbl">Penerima</label>
          <input
            v-model="statusPenerima"
            class="status-inp"
            placeholder="Nama penerima..."
          />

          <label class="status-lbl mt8">Tanggal Terima</label>
          <input type="date" v-model="statusTglTerima" class="status-inp" />

          <label class="status-lbl mt8">Rencana Bayar</label>
          <input type="date" v-model="statusRencanaBayar" class="status-inp" />
        </template>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="showStatusDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          :loading="isSavingStatus"
          :disabled="isLoadingStatus"
          @click="saveStatus"
          >Simpan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Pengajuan Ubah ── -->
  <v-dialog v-model="showPengajuanDialog" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Pengajuan Perubahan Data
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        <div style="margin-bottom: 6px">
          Nomor: <b>{{ selectedItem?.Nomor }}</b> &nbsp;|&nbsp; Urut:
          <b>{{ pengajuanUrut }}</b>
        </div>
        <label style="font-size: 11px; font-weight: 600"
          >Alasan <span style="color: #c62828">*</span></label
        >
        <textarea
          v-model="pengajuanAlasan"
          rows="3"
          style="
            width: 100%;
            border: 1px solid #bdbdbd;
            border-radius: 4px;
            padding: 6px;
            font-size: 12px;
            resize: vertical;
            margin-top: 4px;
            font-family: inherit;
          "
          placeholder="Masukkan alasan perubahan..."
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="showPengajuanDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          @click="submitPengajuan"
          >Ajukan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Cetak ── -->
  <v-dialog v-model="showCetakDialog" max-width="320px">
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Cetak Invoice
      </v-card-title>
      <v-card-text class="pa-3" style="font-size: 12px">
        Pilih jenis cetakan untuk <b>{{ selectedItem?.Nomor }}</b>
      </v-card-text>
      <v-card-actions class="pa-3 border-t" style="gap: 8px">
        <v-btn variant="text" size="small" @click="showCetakDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="outlined"
          size="small"
          color="blue-grey"
          @click="doCetak('dotmatrix')"
        >
          🖨️ Dot Matrix
        </v-btn>
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          @click="doCetak('inkjet')"
        >
          🖨️ InkJet (A4)
        </v-btn>
      </v-card-actions>
    </v-card>
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
  max-width: 600px;
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

.nomor-cell {
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  font-family: monospace;
}
.acc-waiting {
  background: #1565c0;
  color: white;
}
.acc-rejected {
  background: #c62828;
  color: white;
}
.acc-acc {
  background: #2e7d32;
  color: white;
}

.chip {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 8px;
}
.chip-green {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip-orange {
  background: #fff3e0;
  color: #e65100;
}
.chip-red {
  background: #ffebee;
  color: #c62828;
}
.chip-blue {
  background: #e3f2fd;
  color: #1565c0;
}
.chip-purple {
  background: #f3e5f5;
  color: #7b1fa2;
}
.chip-grey {
  background: #f5f5f5;
  color: #9e9e9e;
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

.status-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 30px;
  color: #1565c0;
  font-size: 12px;
  font-weight: 600;
}
.status-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  display: block;
  margin-bottom: 4px;
}
.status-inp {
  width: 100%;
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.status-inp:focus {
  border-color: #1565c0;
}
.mt8 {
  margin-top: 8px;
}
</style>
