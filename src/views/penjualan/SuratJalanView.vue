<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { suratJalanService as svc } from "@/services/penjualan/suratJalanService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconTruck,
  IconPrinter,
  IconFileExport,
  IconListDetails,
  IconDotsVertical,
  IconAlertTriangle,
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();

// ── Helpers ────────────────────────────────────────────────
const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ── Filter ─────────────────────────────────────────────────
const tglAwal = ref(todayLocal());
const tglAkhir = ref(todayLocal());

// ── useBrowse ──────────────────────────────────────────────
const { items, isLoading, selected, canInsert, canEdit, canDelete, fetchData } =
  useBrowse({
    menuId: "153",
    fetchApi: async () => {
      const res = await svc.getBrowse(tglAwal.value, tglAkhir.value);
      return res.data.data ?? [];
    },
  });

const selectedItem = computed(() => selected.value[0] ?? null);

// ── Expand detail — manual, tidak dari useBrowse ──────────
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
  { title: "Invoice", key: "Invoice", width: "140px" },
  { title: "Customer", key: "Customer", minWidth: "180px" },
  { title: "Kota", key: "Kota", width: "120px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "140px" },
  { title: "Gudang", key: "Gudang", minWidth: "140px" },
  { title: "Qty Kirim", key: "QtyKirim", width: "90px", align: "end" },
  { title: "Approved", key: "Approved", width: "80px", align: "center" },
  { title: "Created", key: "Created", width: "140px" },
];

const detailHeaders = [
  { title: "SPK", key: "SPK", width: "130px" },
  { title: "Nama", key: "Nama", minWidth: "160px" },
  { title: "Ukuran", key: "Ukuran", width: "110px" },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "end" },
  { title: "Koli", key: "Koli", width: "70px", align: "end" },
  { title: "Keterangan", key: "Keterangan", minWidth: "120px" },
  { title: "No. Kirim", key: "NoKirim", width: "100px" },
];

// ── Warna row sesuai Delphi ────────────────────────────────
// Approved kosong = merah, Ngedit=WAIT=biru, ACC=hijau, TOLAK=merah
const getRowClass = (row: any) => {
  if (!row.Approved) return "row-belum-approve";
  return "";
};

const getNgeditClass = (row: any) => {
  if (row.Ngedit === "WAIT") return "ngedit-wait";
  if (row.Ngedit === "ACC") return "ngedit-acc";
  if (row.Ngedit === "TOLAK") return "ngedit-tolak";
  return "";
};

// ── Auto refresh ───────────────────────────────────────────
watch([tglAwal, tglAkhir], fetchData);
onMounted(fetchData);

// ── Navigate ───────────────────────────────────────────────
const goNew = async () => {
  // Cek SJ kemarin belum approve
  try {
    const res = await svc.cekSjKemarinBelumApprove();
    if (res.data.data?.ada) {
      toast.warning(
        "Kemarin ada Surat Jalan yang belum di Approval. Segera Approval jika barang sudah dikirim.",
      );
    }
  } catch {
    /* ignore */
  }
  router.push({ name: "SuratJalanFormCreate" });
};

const goEdit = () => {
  if (!selectedItem.value) return;

  // Sesuai Delphi cxButton1Click
  if (selectedItem.value.Approved === "Batal") {
    toast.error("Status Batal.\nTidak bisa di ubah.");
    return;
  }
  if (selectedItem.value.Approved === "Sudah") {
    toast.error("Sudah di Approve.\nSilahkan Pending supaya bisa diUbah.");
    return;
  }

  router.push({
    name: "SuratJalanFormEdit",
    query: { nomor: selectedItem.value.Nomor },
  });
};

// ── Delete ─────────────────────────────────────────────────
const showDeleteDialog = ref(false);

const checkBisaHapus = async (item: any): Promise<boolean> => {
  try {
    const res = await svc.cekBisaHapusUbah(item.Nomor);
    const cek = res.data.data;
    if (!cek.bisaHapus) {
      toast.error(cek.reason);
      return false;
    }
    if (cek.approved === 1) {
      toast.warning("Sudah di Approve. Silahkan Pending supaya bisa diHapus.");
      return false;
    }
    if (cek.approved === 2) {
      toast.warning("Status Batal. Tidak bisa dihapus.");
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
    toast.success("Data berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal hapus.");
  }
};

const confirmDelete = async () => {
  showDeleteDialog.value = false;
  try {
    await svc.deleteData(selectedItem.value!.Nomor);
    toast.success("Data berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal hapus.");
  }
};

// ── Cetak ──────────────────────────────────────────────────
const showCetakDialog = ref(false);
const cetakTargetNomor = ref("");

const onCetak = () => {
  if (!selectedItem.value) return;
  cetakTargetNomor.value = selectedItem.value.Nomor;
  showCetakDialog.value = true;
};

const doCetak = (mode: string) => {
  showCetakDialog.value = false;
  const url = router.resolve({
    name: "SuratJalanPrint",
    query: { nomor: cetakTargetNomor.value, mode },
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
    // 1. Cek dulu apakah perlu pengajuan
    const cekRes = await svc.cekPerluPengajuan(selectedItem.value.Nomor);
    if (!cekRes.data.data?.perlu) {
      toast.info("Tidak perlu pengajuan perubahan data.");
      return;
    }

    // 2. Baru lanjut get status pengajuan
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
      keterangan: selectedItem.value!.Keterangan,
      alasan: pengajuanAlasan.value,
      urut: pengajuanUrut.value,
    });
    toast.success("Pengajuan berhasil. Menunggu ACC.");
    showPengajuanDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal pengajuan.");
  }
};

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (!item?.Approved) return { style: "color:#c62828" };
  return {};
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
      `Surat_Jalan_${tglAwal.value}_${tglAkhir.value}`,
      "Surat Jalan",
      [
        { header: "Nomor", key: "Nomor" },
        { header: "Tanggal", key: "Tanggal" },
        { header: "Divisi", key: "Divisi" },
        { header: "Invoice", key: "Invoice" },
        { header: "KdCus", key: "KdCus" },
        { header: "Customer", key: "Customer" },
        { header: "Alamat", key: "Alamat" },
        { header: "Kota", key: "Kota" },
        { header: "Keterangan", key: "Keterangan" },
        { header: "Gudang", key: "Gudang" },
        { header: "Qty Kirim", key: "QtyKirim", align: "right" },
        { header: "Approved", key: "Approved" },
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
      `Surat_Jalan_Detail_${tglAwal.value}_${tglAkhir.value}`,
      "Detail",
      [
        { header: "Nomor SJ", key: "Nomor" },
        { header: "SPK", key: "SPK" },
        { header: "Nama", key: "Nama" },
        { header: "Ukuran", key: "Ukuran" },
        { header: "Jumlah", key: "Jumlah", align: "right" },
        { header: "Koli", key: "Koli", align: "right" },
        { header: "Keterangan", key: "Keterangan" },
        { header: "No. Kirim", key: "NoKirim" },
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
    title="Surat Jalan"
    menu-id="153"
    :icon="IconTruck"
    :is-loading="isLoading"
    :headers="headers"
    :items="items ?? []"
    item-value="Nomor"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :before-delete="checkBisaHapus"
    search-placeholder="Cari nomor, customer, kota..."
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
    <template #delete-warning>
      <div style="color: #e65100; font-size: 11px; margin-top: 6px">
        Invoice terkait juga akan dihapus.
      </div>
    </template>

    <!-- ── Filter ── -->
    <template #filter-left>
      <label class="flbl">Tanggal</label>
      <input type="date" v-model="tglAwal" class="finp" />
      <span class="fsep">s.d.</span>
      <input type="date" v-model="tglAkhir" class="finp" />
    </template>

    <template #filter-right>
      <div class="legend-row">
        <span class="legend-dot dot-red"></span
        ><span class="legend-lbl">Belum Approval</span>
        <span class="legend-dot dot-blue" style="margin-left: 12px"></span
        ><span class="legend-lbl">Nunggu ACC</span>
        <span class="legend-dot dot-green" style="margin-left: 12px"></span
        ><span class="legend-lbl">Sudah ACC</span>
        <span class="legend-dot dot-redx" style="margin-left: 12px"></span
        ><span class="legend-lbl">Tolak</span>
      </div>
    </template>

    <!-- ── Extra actions ── -->
    <template #extra-actions>
      <!-- Cetak -->
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

      <!-- Export -->
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

      <!-- Export Detail -->
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

      <!-- Tindakan -->
      <v-menu>
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            size="small"
            variant="outlined"
            color="secondary"
            :disabled="!selectedItem"
          >
            <IconDotsVertical :size="14" style="margin-right: 4px" />
            Tindakan
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
      <span class="nomor-cell" :class="getNgeditClass(item)">
        {{ item.Nomor }}
      </span>
    </template>
    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <template #item.Approved="{ item }">
      <span v-if="item.Approved === 'Sudah'" class="chip chip-green"
        >Sudah</span
      >
      <span v-else-if="item.Approved === 'Batal'" class="chip chip-red"
        >Batal</span
      >
      <span v-else class="chip chip-grey">—</span>
    </template>

    <template #item.QtyKirim="{ item }">
      {{ Number(item.QtyKirim || 0).toLocaleString("id-ID") }}
    </template>

    <template #item.Created="{ item }">
      {{ formatTanggalJam(item.Created) }}
    </template>

    <!-- ── Row color via rowPropsFn ── -->

    <!-- ── Expanded detail — pakai slot #detail persis seperti STBJ ── -->
    <template #detail="{ item }">
      <table class="dtbl">
        <thead>
          <tr>
            <th style="width: 26px">#</th>
            <th style="width: 130px">SPK</th>
            <th style="min-width: 180px">Nama</th>
            <th style="width: 110px">Ukuran</th>
            <!-- Panjang & Lebar hanya untuk Divisi MMT/Spanduk -->
            <th
              v-if="['MMT', 'SPANDUK'].includes(item.Divisi)"
              style="width: 70px; text-align: right"
            >
              Panjang
            </th>
            <th
              v-if="['MMT', 'SPANDUK'].includes(item.Divisi)"
              style="width: 70px; text-align: right"
            >
              Lebar
            </th>
            <th style="width: 80px; text-align: right">Jumlah</th>
            <th style="width: 60px; text-align: right">Koli</th>
            <th style="min-width: 120px">Keterangan</th>
            <th style="width: 140px">No. Kirim</th>
            <th style="width: 100px">Id Kirim</th>
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
                {{ d.SPK }}
              </td>
              <td>{{ d.Nama }}</td>
              <td>{{ d.Ukuran }}</td>
              <td
                v-if="['MMT', 'SPANDUK'].includes(item.Divisi)"
                style="text-align: right"
              >
                {{ d.Panjang || "-" }}
              </td>
              <td
                v-if="['MMT', 'SPANDUK'].includes(item.Divisi)"
                style="text-align: right"
              >
                {{ d.Lebar || "-" }}
              </td>
              <td style="text-align: right">
                {{ Number(d.Jumlah || 0).toLocaleString("id-ID") }}
              </td>
              <td style="text-align: right">
                {{ Number(d.Koli || 0).toLocaleString("id-ID") }}
              </td>
              <td>{{ d.Keterangan }}</td>
              <td style="font-family: monospace; font-size: 10px">
                {{ d.NoKirim }}
              </td>
              <td style="font-family: monospace; font-size: 10px; color: #777">
                {{ d.IdKirim }}
              </td>
            </tr>
          </template>
          <tr v-else-if="loadingDetails.has(item.Nomor)">
            <td
              colspan="11"
              style="text-align: center; padding: 8px; color: #9e9e9e"
            >
              Memuat...
            </td>
          </tr>
          <tr v-else>
            <td
              colspan="11"
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

  <!-- ── Dialog Delete ── -->
  <v-dialog v-model="showDeleteDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-error text-white"
        style="font-size: 13px; font-weight: 700"
      >
        <IconAlertTriangle :size="15" style="margin-right: 6px" />
        Hapus Surat Jalan
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Yakin ingin hapus <b>{{ selectedItem?.Nomor }}</b
        >?<br />
        <span style="color: #e65100; font-size: 11px"
          >Invoice terkait juga akan dihapus.</span
        >
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

  <!-- ── Dialog Cetak ── -->
  <v-dialog v-model="showCetakDialog" max-width="320px">
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Cetak Surat Jalan
      </v-card-title>
      <v-card-text class="pa-3" style="font-size: 12px">
        Pilih jenis cetakan untuk <b>{{ cetakTargetNomor }}</b>
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
</template>

<style scoped>
.filter-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
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

/* Legend */
.legend-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 2px 0;
}
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}
.legend-lbl {
  color: #555;
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
.dot-redx {
  background: #d32f2f;
}

/* Row colors */
.row-belum-approve td {
  color: #c62828 !important;
}

/* Nomor cell ngedit */
.nomor-cell {
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  font-family: monospace;
}
.ngedit-wait .nomor-cell {
  background: #1565c0;
  color: white;
}
.ngedit-acc .nomor-cell {
  background: #2e7d32;
  color: white;
}
.ngedit-tolak .nomor-cell {
  background: #c62828;
  color: white;
}

/* Chip approved */
.chip {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
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
.chip-grey {
  background: #f5f5f5;
  color: #9e9e9e;
}

/* Cell */
.td-cell {
  padding: 4px 6px;
  border-bottom: 0.3px solid #e0e0e0;
  vertical-align: middle;
  font-size: 12px;
  white-space: nowrap;
}

/* Expand */
.expand-cell {
  padding: 0;
  background: #f8f9fa;
}
.expand-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 12px;
  color: #757575;
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
  background: #e8eaf6;
  color: #283593;
  padding: 4px 8px;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #c5cae9;
  white-space: nowrap;
}
.dtd {
  padding: 3px 8px;
  border-bottom: 0.3px solid #e8eaf6;
}
.drs .dtd {
  background: #f5f5f5;
}
.empty-detail {
  padding: 12px;
  text-align: center;
  color: #9e9e9e;
  font-size: 11px;
  font-style: italic;
}
.dtbl {
  border-collapse: collapse;
  font-size: 11px;
  min-width: 600px;
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
</style>
