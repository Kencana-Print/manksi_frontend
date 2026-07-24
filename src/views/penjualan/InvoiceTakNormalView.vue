<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { invoiceTakNormalService as svc } from "@/services/penjualan/invoiceTakNormalService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconReceipt2,
  IconPrinter,
  IconFileExport,
  IconListDetails,
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
// NOTE: default dipakai sama seperti Invoice biasa (awal bulan s.d. hari
// ini). Kalau maunya "hari ini s.d. hari ini", ganti firstOfMonth() jadi
// todayLocal() di bawah.
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
    menuId: "158",
    fetchApi: async () => {
      const res = await svc.getBrowse(tglAwal.value, tglAkhir.value);
      return res.data.data ?? [];
    },
  });

const selectedItem = computed(() => selected.value[0] ?? null);

// ── Expand detail — DUA detail terpisah ──────────────────────
// 1) Detail barang milik Invoice Tak Normal itu sendiri
// 2) Daftar Invoice Normal yang dinaungi (via tinv_flag)
const detailBarangCache = ref<Record<string, any[]>>({});
const detailInvoiceNormalCache = ref<Record<string, any[]>>({});
const loadingDetails = ref<Set<string>>(new Set());
const expandedItems = ref<any[]>([]);

const onExpandChange = async (newExpanded: any[]) => {
  expandedItems.value = newExpanded;
  const newNomors = newExpanded.map((i: any) => (i.raw || i).Nomor);
  for (const nomor of newNomors) {
    if (!detailBarangCache.value[nomor] && !loadingDetails.value.has(nomor)) {
      loadingDetails.value = new Set([...loadingDetails.value, nomor]);
      try {
        const [resBarang, resInvNormal] = await Promise.all([
          svc.getBrowseDetailBarang(tglAwal.value, tglAkhir.value, nomor),
          svc.getBrowseDetailInvoiceNormal(nomor),
        ]);
        detailBarangCache.value[nomor] = resBarang.data.data ?? [];
        detailInvoiceNormalCache.value[nomor] = resInvNormal.data.data ?? [];
      } catch {
        detailBarangCache.value[nomor] = [];
        detailInvoiceNormalCache.value[nomor] = [];
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
  { title: "ACC Edit", key: "ACC_Edit", width: "100px" },
  { title: "Alasan", key: "Alasan", minWidth: "180px" },
  { title: "User", key: "Usr", width: "90px" },
  { title: "Created", key: "Created", width: "140px" },
];

// ── Row color — merah utk Nomor kalau ACC_Edit WAIT/REJECTED (via chip,
// tidak perlu rowPropsFn khusus seperti Invoice biasa krn tidak ada
// ApvNoSJ di modul ini) ────────────────────────────────────

// ── Auto refresh ───────────────────────────────────────────
watch([tglAwal, tglAkhir], fetchData);
onMounted(fetchData);

// ── Navigate ─────────────────────────────────────────────────
// CATATAN: route & view Form/Print belum dibuat — akan error sampai
// InvoiceTakNormalFormView.vue & InvoiceTakNormalPrintView.vue dibuat
// dan route-nya didaftarkan di index.ts.
const goNew = () => {
  router.push({ name: "InvoiceTakNormalFormCreate" });
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
      name: "InvoiceTakNormalFormEdit",
      query: { nomor: selectedItem.value.Nomor },
    });
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal cek data.");
  }
};

// ── Delete ─────────────────────────────────────────────────
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
    name: "InvoiceTakNormalPrint",
    query: { nomor: selectedItem.value!.Nomor, mode },
  }).href;
  window.open(url, "_blank");
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
      toast.info("Tidak perlu pengajuan perubahan data.");
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
      `Invoice_Tak_Normal_${tglAwal.value}_${tglAkhir.value}`,
      "Invoice Tak Normal",
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
        { header: "ACC Edit", key: "ACC_Edit" },
        { header: "Alasan", key: "Alasan" },
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
      `Invoice_Tak_Normal_Detail_${tglAwal.value}_${tglAkhir.value}`,
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
    title="Invoice Tak Normal"
    menu-id="158"
    :icon="IconReceipt2"
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
    :filter-state="filterState"
    @update:filter-state="onFilterStateRestore"
    @update:selected="selected = $event"
    @update:expanded="onExpandChange"
    @add="goNew"
    @edit="goEdit"
    @delete="onDelete"
    @refresh="fetchData"
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
        <span class="legend-dot dot-blue"></span>
        <span class="legend-lbl">Nunggu ACC</span>
        <span class="legend-dot dot-green" style="margin-left: 10px"></span>
        <span class="legend-lbl">Sudah ACC</span>
        <span class="legend-dot dot-red" style="margin-left: 10px"></span>
        <span class="legend-lbl">Ditolak</span>
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
      <span class="chip chip-red">{{ item.Status }}</span>
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

    <template #item.Created="{ item }">
      {{ formatTanggalJam(item.Created) }}
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

    <!-- ── Expanded detail — DUA tabel: barang + invoice normal ── -->
    <template #detail="{ item }">
      <div class="dual-detail">
        <!-- Detail 1: Barang -->
        <div class="detail-block">
          <div class="detail-block-title">Detail Barang</div>
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
                <template v-if="detailBarangCache[item.Nomor]?.length">
                  <tr v-for="(d, j) in detailBarangCache[item.Nomor]" :key="j">
                    <td
                      style="
                        text-align: center;
                        color: #9e9e9e;
                        font-size: 10px;
                      "
                    >
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
        </div>

        <!-- Detail 2: Invoice Normal terkait -->
        <div class="detail-block">
          <div class="detail-block-title">Invoice Normal Terkait</div>
          <div class="dtbl-wrap">
            <table class="dtbl">
              <thead>
                <tr>
                  <th style="width: 26px">#</th>
                  <th style="width: 130px">Invoice Normal</th>
                  <th style="width: 90px">Cabang</th>
                  <th style="width: 90px">Tanggal</th>
                  <th style="width: 90px">Kode Cus</th>
                  <th style="min-width: 180px">Customer</th>
                  <th style="min-width: 200px">Alamat</th>
                  <th style="width: 110px; text-align: right">Nominal</th>
                </tr>
              </thead>
              <tbody>
                <template v-if="detailInvoiceNormalCache[item.Nomor]?.length">
                  <tr
                    v-for="(d, j) in detailInvoiceNormalCache[item.Nomor]"
                    :key="j"
                  >
                    <td
                      style="
                        text-align: center;
                        color: #9e9e9e;
                        font-size: 10px;
                      "
                    >
                      {{ j + 1 }}
                    </td>
                    <td
                      style="
                        font-family: monospace;
                        font-size: 10px;
                        color: #1565c0;
                      "
                    >
                      {{ d.InvoiceNormal }}
                    </td>
                    <td>{{ d.Cabang }}</td>
                    <td>{{ formatTanggal(d.Tanggal) }}</td>
                    <td>{{ d.KodeCus }}</td>
                    <td>{{ d.NamaCustomer }}</td>
                    <td>{{ d.Alamat }}</td>
                    <td style="text-align: right">{{ num(d.Nominal) }}</td>
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
                    Tidak ada invoice normal terkait
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>

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
        Cetak Invoice Tak Normal
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
.dot-blue {
  background: #1565c0;
}
.dot-green {
  background: #2e7d32;
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
.chip-red {
  background: #ffebee;
  color: #c62828;
}
.chip-blue {
  background: #e3f2fd;
  color: #1565c0;
}
.chip-grey {
  background: #f5f5f5;
  color: #9e9e9e;
}

/* Dua tabel detail, ditumpuk vertikal dengan pembatas */
.dual-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-block {
  padding: 4px 0;
}
.detail-block + .detail-block {
  border-top: 1px dashed #d0d0d0;
  padding-top: 8px;
}
.detail-block-title {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 4px 32px;
}

.dtbl-wrap {
  overflow-x: auto;
  max-width: 100%;
  margin: 0 0 0 32px;
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
</style>
