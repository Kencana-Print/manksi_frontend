<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { updateStatusSjService as svc } from "@/services/penjualan/updateStatusSjService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconTruckDelivery,
  IconFileExport,
  IconListDetails,
  IconEdit,
} from "@tabler/icons-vue";

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

// ── useBrowse ──────────────────────────────────────────────
const { items, isLoading, selected, fetchData } = useBrowse({
  menuId: "155",
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
  { title: "Nomor", key: "Nomor", width: "140px" },
  { title: "Tanggal", key: "Tanggal", width: "90px" },
  { title: "Divisi", key: "Divisi", width: "80px" },
  { title: "Kd Customer", key: "KodeCustomer", width: "90px" },
  { title: "Customer", key: "Customer", minWidth: "180px" },
  { title: "Alamat", key: "Alamat", minWidth: "220px" },
  { title: "Kota", key: "Kota", width: "120px" },
  { title: "Status", key: "Status", width: "150px" },
  { title: "Expedisi", key: "Expedisi", width: "110px" },
  { title: "Kurir", key: "Kurir", width: "100px" },
  { title: "No. Resi", key: "Nomor_Resi", width: "120px" },
  { title: "Tgl Kirim", key: "Tanggal_Kirim", width: "95px" },
  { title: "Biaya Kirim", key: "Biaya_Kirim", width: "100px", align: "end" },
  { title: "Total Qty", key: "Total_Qty", width: "90px", align: "end" },
  { title: "Harga/Qty", key: "Harga", width: "90px", align: "end" },
  { title: "Tgl Terima", key: "Tanggal_Terima", width: "95px" },
  { title: "Penerima Barang", key: "Penerima_Barang", width: "140px" },
  { title: "Tgl Terima SJ", key: "Tanggal_Terima_Sj", width: "95px" },
  { title: "Contact Person", key: "Contact_Person", width: "140px" },
  { title: "Tgl Konfirmasi", key: "Tanggal_Konfirmasi", width: "95px" },
  { title: "Tgl Terima 1", key: "Tanggal_Terima_1", width: "95px" },
  { title: "Tgl Serah Terima", key: "Tanggal_SerahTerima", width: "95px" },
];

const detailHeaders = [
  { title: "SPK", key: "SpkNomor", width: "130px" },
  { title: "Nama", key: "Nama", minWidth: "180px" },
  { title: "Ukuran", key: "Ukuran", width: "110px" },
  { title: "Panjang", key: "Panjang", width: "70px", align: "end" },
  { title: "Lebar", key: "Lebar", width: "70px", align: "end" },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "end" },
  { title: "Keterangan", key: "Keterangan", minWidth: "140px" },
];

// ── Row color — biru kalau Status='Tidak Ada Status' ────────
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item?.Status === "Tidak Ada Status") return { style: "color:#1565c0" };
  return {};
};

// ── Auto refresh ───────────────────────────────────────────
watch([tglAwal, tglAkhir], fetchData);
onMounted(fetchData);

// ── Export ─────────────────────────────────────────────────
const isExporting = ref(false);
const isExportingDetail = ref(false);

const onExport = async () => {
  isExporting.value = true;
  try {
    const res = await svc.getExportData(tglAwal.value, tglAkhir.value);
    const data = res.data.data ?? [];
    await exportExcelSingle(
      `Update_Status_SJ_${tglAwal.value}_${tglAkhir.value}`,
      "Status SJ",
      [
        { header: "Nomor", key: "Nomor" },
        { header: "Tanggal", key: "Tanggal" },
        { header: "Divisi", key: "Divisi" },
        { header: "Kd Customer", key: "KodeCustomer" },
        { header: "Customer", key: "Customer" },
        { header: "Alamat", key: "Alamat" },
        { header: "Kota", key: "Kota" },
        { header: "Status", key: "Status" },
        { header: "Expedisi", key: "Expedisi" },
        { header: "Kurir", key: "Kurir" },
        { header: "No. Resi", key: "Nomor_Resi" },
        { header: "Tgl Kirim", key: "Tanggal_Kirim" },
        { header: "Biaya Kirim", key: "Biaya_Kirim", align: "right" },
        { header: "Total Qty", key: "Total_Qty", align: "right" },
        { header: "Harga/Qty", key: "Harga", align: "right" },
        { header: "Tgl Terima", key: "Tanggal_Terima" },
        { header: "Penerima Barang", key: "Penerima_Barang" },
        { header: "Tgl Terima SJ", key: "Tanggal_Terima_Sj" },
        { header: "Contact Person", key: "Contact_Person" },
        { header: "Tgl Konfirmasi", key: "Tanggal_Konfirmasi" },
        { header: "Tgl Terima 1", key: "Tanggal_Terima_1" },
        { header: "Tgl Serah Terima", key: "Tanggal_SerahTerima" },
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
      `Update_Status_SJ_Detail_${tglAwal.value}_${tglAkhir.value}`,
      "Detail",
      [
        { header: "Nomor SJ", key: "Nomor" },
        { header: "SPK", key: "SpkNomor" },
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

// ═══════════════════════════════════════════════════════════
// DIALOG FORM — Update Status (digabung di file ini)
// Sesuai Delphi ufrmUpdateStatusSJ
// ═══════════════════════════════════════════════════════════
const showFormDialog = ref(false);
const isLoadingForm = ref(false);
const isSavingForm = ref(false);
const formNomor = ref("");
const formHeader = ref<any>({});
const formDetail = ref<any[]>([]);
const statusList = ref<{ kode: number; nama: string }[]>([]);

const formStatusIndex = ref(0);
const formExpedisi = ref("");
const formKurir = ref("");
const formTanggalKirim = ref(todayLocal());
const formNomorResi = ref("");
const formBiayaKirim = ref(0);
const formTanggalKembali = ref(todayLocal());
const formContactPerson = ref("");
const formTanggalKonfirmasi = ref(todayLocal());
const formTanggalTerima = ref(todayLocal());
const formTanggalSerahTerima = ref(todayLocal());
const formTanggalTerimaSj = ref(todayLocal());
const formPenerimaBarang = ref("");

// Visibility field sesuai status — persis Delphi cbbstatusSjChange
const showPengiriman = computed(() => formStatusIndex.value === 1);
const showDokumen = computed(() => formStatusIndex.value === 2);
const showKonfirmasi = computed(() => formStatusIndex.value === 3);
const showSerahTerima = computed(() => formStatusIndex.value === 4);

const resetFormFields = () => {
  formExpedisi.value = "";
  formKurir.value = "";
  formTanggalKirim.value = todayLocal();
  formNomorResi.value = "";
  formBiayaKirim.value = 0;
  formTanggalKembali.value = todayLocal();
  formContactPerson.value = "";
  formTanggalKonfirmasi.value = todayLocal();
  formTanggalTerima.value = todayLocal();
  formTanggalSerahTerima.value = todayLocal();
  formTanggalTerimaSj.value = todayLocal();
  formPenerimaBarang.value = "";
};

const onUpdateStatus = async () => {
  if (!selectedItem.value) return;
  formNomor.value = selectedItem.value.Nomor;
  showFormDialog.value = true;
  isLoadingForm.value = true;
  resetFormFields();

  try {
    if (!statusList.value.length) {
      const sRes = await svc.getStatusList();
      statusList.value = sRes.data.data || [];
    }

    const res = await svc.getFormById(formNomor.value);
    const d = res.data.data;
    formHeader.value = d.header;
    formDetail.value = d.detail || [];

    formStatusIndex.value = Number(d.header.sj_stssj_kode) || 0;
    formExpedisi.value = d.header.expedisi || "";
    formKurir.value = d.header.kurir || "";
    formTanggalKirim.value = d.header.tanggal_kirim || todayLocal();
    formNomorResi.value = d.header.nomor_resi || "";
    formBiayaKirim.value = Number(d.header.biaya_kirim) || 0;
    formTanggalKembali.value = d.header.tanggal_kembali || todayLocal();
    formContactPerson.value = d.header.contact_person || "";
    formTanggalKonfirmasi.value = d.header.tanggal_konfirmasi || todayLocal();
    formTanggalTerima.value = d.header.tanggal_terima || todayLocal();
    formTanggalSerahTerima.value = d.header.tanggal_serahterima || todayLocal();
    formTanggalTerimaSj.value = d.header.tanggal_terima_sj || todayLocal();
    formPenerimaBarang.value = d.header.penerima_barang || "";
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
    showFormDialog.value = false;
  } finally {
    isLoadingForm.value = false;
  }
};

const closeFormDialog = () => {
  showFormDialog.value = false;
  formNomor.value = "";
};

const saveFormStatus = async () => {
  isSavingForm.value = true;
  try {
    await svc.saveStatus(formNomor.value, {
      statusIndex: formStatusIndex.value,
      expedisi: formExpedisi.value,
      kurir: formKurir.value,
      tanggalKirim: formStatusIndex.value === 1 ? formTanggalKirim.value : null,
      nomorResi: formNomorResi.value,
      biayaKirim: formBiayaKirim.value,
      tanggalKembali:
        formStatusIndex.value === 2 ? formTanggalKembali.value : null,
      contactPerson: formContactPerson.value,
      tanggalKonfirmasi:
        formStatusIndex.value === 3 ? formTanggalKonfirmasi.value : null,
      tanggalTerima:
        formStatusIndex.value === 3 ? formTanggalTerima.value : null,
      tanggalSerahTerima:
        formStatusIndex.value === 4 ? formTanggalSerahTerima.value : null,
      tanggalTerimaSj:
        formStatusIndex.value === 2 ? formTanggalTerimaSj.value : null,
      penerimaBarang: formPenerimaBarang.value,
    });
    toast.success("Berhasil di Update.");
    showFormDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan.");
  } finally {
    isSavingForm.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Update Status Surat Jalan"
    menu-id="155"
    :icon="IconTruckDelivery"
    :is-loading="isLoading"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :can-edit="false"
    search-placeholder="Cari nomor, customer, alamat..."
    :selected="selected"
    :show-expand="true"
    :loading-details="loadingDetails"
    :expanded="expandedItems"
    @update:selected="selected = $event"
    @update:expanded="onExpandChange"
    @refresh="fetchData"
    :row-props-fn="rowPropsFn"
  >
    <!-- ── Filter ── -->
    <template #filter-left>
      <label class="flbl">Periode</label>
      <input type="date" v-model="tglAwal" class="finp" />
      <span class="fsep">s.d.</span>
      <input type="date" v-model="tglAkhir" class="finp" />
    </template>

    <template #filter-right>
      <div class="legend-row">
        <span class="legend-dot dot-blue"></span>
        <span class="legend-lbl">Tidak Ada Status</span>
      </div>
    </template>

    <!-- ── Extra actions ── -->
    <template #extra-actions>
      <v-btn
        size="small"
        variant="outlined"
        color="primary"
        :disabled="!selectedItem"
        @click="onUpdateStatus"
      >
        <IconEdit :size="14" style="margin-right: 4px" />
        Update Status
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
    <template #item.Biaya_Kirim="{ item }">
      {{ num(item.Biaya_Kirim) }}
    </template>

    <template #item.Total_Qty="{ item }">
      {{ num(item.Total_Qty) }}
    </template>

    <template #item.Harga="{ item }">
      {{ num(item.Harga) }}
    </template>

    <template #item.Status="{ item }">
      <span
        class="status-chip"
        :class="{ 'status-blue': item.Status === 'Tidak Ada Status' }"
        >{{ item.Status }}</span
      >
    </template>

    <!-- ── Expanded detail ── -->
    <template #detail="{ item }">
      <table class="dtbl">
        <thead>
          <tr>
            <th style="width: 26px">#</th>
            <th style="width: 130px">SPK</th>
            <th style="min-width: 180px">Nama</th>
            <th style="width: 110px">Ukuran</th>
            <th style="width: 70px; text-align: right">Panjang</th>
            <th style="width: 70px; text-align: right">Lebar</th>
            <th style="width: 80px; text-align: right">Jumlah</th>
            <th style="min-width: 140px">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="detailCache[item.Nomor]?.length">
            <tr v-for="(d, j) in detailCache[item.Nomor]" :key="j">
              <td style="text-align: center; color: #9e9e9e; font-size: 10px">
                {{ j + 1 }}
              </td>
              <td
                style="font-family: monospace; font-size: 10px; color: #1565c0"
              >
                {{ d.SpkNomor }}
              </td>
              <td>{{ d.Nama }}</td>
              <td>{{ d.Ukuran }}</td>
              <td style="text-align: right">{{ d.Panjang || "-" }}</td>
              <td style="text-align: right">{{ d.Lebar || "-" }}</td>
              <td style="text-align: right">{{ num(d.Jumlah) }}</td>
              <td>{{ d.Keterangan }}</td>
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
    </template>
  </BaseBrowse>

  <!-- ═══════════════════════════════════════════════════════ -->
  <!-- ── Dialog Form Update Status (digabung di file ini) ── -->
  <!-- ═══════════════════════════════════════════════════════ -->
  <v-dialog v-model="showFormDialog" max-width="900px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Update Status Surat Jalan — {{ formNomor }}
      </v-card-title>

      <v-card-text class="pa-4">
        <div v-if="isLoadingForm" class="form-loading">
          <v-progress-circular
            indeterminate
            color="primary"
            size="28"
            width="3"
          />
          <span>Memuat data...</span>
        </div>

        <template v-else>
          <!-- Header info (readonly) -->
          <div class="hdr-grid">
            <div class="hdr-col">
              <div class="fg">
                <label class="flbl w90">Nomor</label>
                <input
                  :value="formHeader.sj_nomor"
                  readonly
                  class="inp ro"
                  style="width: 160px"
                />
              </div>
              <div class="fg mt4">
                <label class="flbl w90">Perusahaan</label>
                <div class="ig" style="flex: 1">
                  <input
                    :value="formHeader.sj_perush_kode"
                    readonly
                    class="inp ro"
                    style="width: 46px"
                  />
                  <input
                    :value="formHeader.perush_nama"
                    readonly
                    class="inp ro"
                    style="flex: 1"
                  />
                </div>
              </div>
              <div class="fg mt4">
                <label class="flbl w90">Tanggal</label>
                <input
                  :value="formHeader.sj_tanggal"
                  readonly
                  class="inp ro"
                  style="width: 140px"
                />
              </div>
              <div class="fg mt4">
                <label class="flbl w90">Gudang</label>
                <div class="ig" style="flex: 1">
                  <input
                    :value="formHeader.sj_gdg_kode"
                    readonly
                    class="inp ro"
                    style="width: 60px"
                  />
                  <input
                    :value="formHeader.gdg_nama"
                    readonly
                    class="inp ro"
                    style="flex: 1"
                  />
                </div>
              </div>
              <div class="fg mt4">
                <label class="flbl w90">Keterangan</label>
                <input
                  :value="formHeader.sj_keterangan"
                  readonly
                  class="inp ro"
                  style="flex: 1"
                />
              </div>
            </div>
            <div class="hdr-col">
              <div class="fg">
                <label class="flbl w90">Customer</label>
                <div class="ig" style="flex: 1">
                  <input
                    :value="formHeader.sj_cus_kode"
                    readonly
                    class="inp ro"
                    style="width: 50px"
                  />
                  <input
                    :value="formHeader.cus_nama"
                    readonly
                    class="inp ro"
                    style="flex: 1"
                  />
                </div>
              </div>
              <div class="fg mt4">
                <label class="flbl w90">Alamat</label>
                <input
                  :value="
                    formHeader.sj_alamat_customer || formHeader.cus_alamat
                  "
                  readonly
                  class="inp ro"
                  style="flex: 1"
                />
              </div>
              <div class="fg mt4">
                <label class="flbl w90">Kota</label>
                <input
                  :value="formHeader.sj_kota_customer || formHeader.cus_kota"
                  readonly
                  class="inp ro"
                  style="flex: 1"
                />
              </div>
              <div class="fg mt4">
                <label class="flbl w90">Inv. Proforma</label>
                <input
                  :value="formHeader.sj_inv_pro"
                  readonly
                  class="inp ro"
                  style="flex: 1"
                />
              </div>
            </div>
          </div>

          <!-- Detail grid -->
          <div class="sec-title mt8">Detail SPK</div>
          <div class="gwrap">
            <table class="gtbl">
              <thead>
                <tr>
                  <th style="width: 24px">#</th>
                  <th style="width: 115px">Kode</th>
                  <th style="min-width: 160px">Nama</th>
                  <th style="width: 90px">Ukuran</th>
                  <th style="width: 50px">Jenis</th>
                  <th style="width: 70px; text-align: right">Jumlah</th>
                  <th style="width: 60px; text-align: right">Koli</th>
                  <th style="min-width: 120px">Keterangan</th>
                  <th style="width: 80px; text-align: right">Jumlah Kirim</th>
                  <th style="width: 70px; text-align: right">Kurang</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, i) in formDetail" :key="i">
                  <td class="tc">{{ i + 1 }}</td>
                  <td class="mono">{{ d.kode }}</td>
                  <td>{{ d.nama }}</td>
                  <td>{{ d.ukuran }}</td>
                  <td class="tc">{{ d.jenisOrder }}</td>
                  <td class="tr hl">{{ num(d.jumlah) }}</td>
                  <td class="tr">{{ num(d.jumlahKoli) }}</td>
                  <td>{{ d.keterangan }}</td>
                  <td class="tr">{{ num(d.sudah) }}</td>
                  <td
                    class="tr"
                    :style="d.kurang < 0 ? 'color:#c62828;font-weight:700' : ''"
                  >
                    {{ num(d.kurang) }}
                  </td>
                </tr>
                <tr v-if="!formDetail.length">
                  <td
                    colspan="10"
                    class="tc"
                    style="padding: 12px; color: #9e9e9e"
                  >
                    Tidak ada detail
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Status dropdown + dynamic fields -->
          <div class="sec-title mt8">Status Surat Jalan</div>
          <div class="status-section">
            <select
              v-model.number="formStatusIndex"
              class="sel"
              style="width: 260px"
            >
              <option v-for="s in statusList" :key="s.kode" :value="s.kode">
                {{ s.nama }}
              </option>
            </select>

            <!-- Status 1: Pengiriman -->
            <div v-if="showPengiriman" class="status-fields">
              <div class="fg">
                <label class="flbl w110">Expedisi</label>
                <input v-model="formExpedisi" class="inp" style="flex: 1" />
              </div>
              <div class="fg mt4">
                <label class="flbl w110">Kurir</label>
                <input v-model="formKurir" class="inp" style="flex: 1" />
              </div>
              <div class="fg mt4">
                <label class="flbl w110">Tanggal Kirim</label>
                <input
                  type="date"
                  v-model="formTanggalKirim"
                  class="inp"
                  style="width: 160px"
                />
              </div>
              <div class="fg mt4">
                <label class="flbl w110">No. Resi</label>
                <input v-model="formNomorResi" class="inp" style="flex: 1" />
              </div>
              <div class="fg mt4">
                <label class="flbl w110">Biaya Kirim</label>
                <input
                  v-model.number="formBiayaKirim"
                  type="number"
                  class="inp tr"
                  style="width: 160px"
                />
              </div>
            </div>

            <!-- Status 2: Penyerahan Dokumen Kembali -->
            <div v-if="showDokumen" class="status-fields">
              <div class="fg">
                <label class="flbl w110">Tanggal Kembali</label>
                <input
                  type="date"
                  v-model="formTanggalKembali"
                  class="inp"
                  style="width: 160px"
                />
              </div>
              <div class="fg mt4">
                <label class="flbl w110">Penerima</label>
                <input
                  v-model="formPenerimaBarang"
                  class="inp"
                  style="flex: 1"
                />
              </div>
              <div class="fg mt4">
                <label class="flbl w110">Tgl Terima SJ</label>
                <input
                  type="date"
                  v-model="formTanggalTerimaSj"
                  class="inp"
                  style="width: 160px"
                />
              </div>
            </div>

            <!-- Status 3: Konfirmasi Ke Client -->
            <div v-if="showKonfirmasi" class="status-fields">
              <div class="fg">
                <label class="flbl w110">Contact Person</label>
                <input
                  v-model="formContactPerson"
                  class="inp"
                  style="flex: 1"
                />
              </div>
              <div class="fg mt4">
                <label class="flbl w110">Tgl Konfirmasi</label>
                <input
                  type="date"
                  v-model="formTanggalKonfirmasi"
                  class="inp"
                  style="width: 160px"
                />
              </div>
              <div class="fg mt4">
                <label class="flbl w110">Tgl Terima</label>
                <input
                  type="date"
                  v-model="formTanggalTerima"
                  class="inp"
                  style="width: 160px"
                />
              </div>
            </div>

            <!-- Status 4: Serah Terima ke Bag. Piutang -->
            <div v-if="showSerahTerima" class="status-fields">
              <div class="fg">
                <label class="flbl w110">Tgl Serah Terima</label>
                <input
                  type="date"
                  v-model="formTanggalSerahTerima"
                  class="inp"
                  style="width: 160px"
                />
              </div>
            </div>
          </div>
        </template>
      </v-card-text>

      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="closeFormDialog"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          :loading="isSavingForm"
          :disabled="isLoadingForm"
          @click="saveFormStatus"
          >Simpan</v-btn
        >
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
}
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}
.dot-blue {
  background: #1565c0;
}
.legend-lbl {
  color: #555;
}

.status-chip {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 8px;
  background: #f5f5f5;
  color: #555;
}
.status-blue {
  background: #e3f2fd;
  color: #1565c0;
}

.dtbl {
  width: 100%;
  min-width: 700px;
  border-collapse: collapse;
  font-size: 11px;
  margin: 6px 0 6px 32px;
  width: calc(100% - 32px);
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
}

/* ── Dialog form ── */
.form-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: #1565c0;
  font-size: 12px;
  font-weight: 600;
}
.hdr-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 4px;
}
.hdr-col {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.fg {
  display: flex;
  align-items: center;
  gap: 5px;
}
.mt4 {
  margin-top: 4px;
}
.mt8 {
  margin-top: 8px;
}
.w90 {
  width: 90px;
  flex-shrink: 0;
}
.w110 {
  width: 110px;
  flex-shrink: 0;
}
.tr {
  text-align: right;
}
.tc {
  text-align: center;
}
.mono {
  font-family: monospace;
  font-size: 11px;
  color: #1565c0;
}

.sec-title {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.inp {
  height: 24px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 12px;
  outline: none;
  background: white;
  font-family: inherit;
}
.inp:focus {
  border-color: #1565c0;
}
.ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.sel {
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.ig {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  height: 24px;
  background: white;
  overflow: hidden;
}
.ig .inp {
  border: none;
  height: 22px;
  border-radius: 0;
  flex: 1;
  min-width: 0;
}
.ig .inp:first-child {
  border-right: 1px solid #e0e0e0;
  font-family: monospace;
  font-weight: 600;
  color: #1565c0;
  text-align: center;
  flex: 0 0 auto;
}

.gwrap {
  max-height: 220px;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  margin-bottom: 4px;
}
.gtbl {
  border-collapse: collapse;
  font-size: 11px;
  width: 100%;
  min-width: max-content;
}
.gtbl th {
  background: #1565c0;
  color: white;
  padding: 4px 6px;
  font-weight: 700;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}
.gtbl td {
  padding: 3px 6px;
  border-bottom: 0.3px solid #e0e0e0;
}
.gtbl .hl {
  background: #fffde7;
  font-weight: 600;
}
.gtbl td:nth-child(2) {
  font-family: monospace;
  font-size: 10.5px;
  color: #1565c0;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.status-section {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.status-fields {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #ccc;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
