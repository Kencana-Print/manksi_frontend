<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import api from "@/services/api";
import { realisasiPengirimanSpkService } from "@/services/laporan/marketing/realisasiPengirimanSpkService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import {
  IconTruckDelivery,
  IconMessageCircle,
  IconFileSpreadsheet,
} from "@tabler/icons-vue";

const MENU_ID = "302";
const authStore = useAuthStore();
const toast = useToast();

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const filterState = ref({
  dtAwal: toLocalDateStr(firstDayOfMonth),
  dtAkhir: toLocalDateStr(today),
  divisi: "0",
});

// ── Dropdown divisi (0 - ALL + daftar dari /lookups/divisi) ──
const divisiOptions = ref<{ value: string; title: string }[]>([
  { value: "0", title: "0 - ALL" },
]);
const loadDivisi = async () => {
  try {
    const res = await api.get("/lookups/divisi");
    divisiOptions.value = [
      { value: "0", title: "0 - ALL" },
      ...res.data.data.map((d: any) => ({
        value: String(d.kode ?? d.Kode),
        title: `${d.kode ?? d.Kode} - ${d.divisi ?? d.nama ?? d.Nama ?? d.Divisi}`,
      })),
    ];
  } catch {
    console.error("Gagal memuat divisi");
  }
};
loadDivisi();

// ⚠️ canLihatCus dibaca dari flag user (user_lihat_cus, integer 0/1) —
// replikasi `if zcus=1` di Delphi. Kolom Customer/Alamat cuma tampil
// kalau user punya izin ini. Backend JUGA menegakkan ini (kolom
// dikirim NULL kalau tidak diizinkan) — frontend cuma menyesuaikan
// header, bukan satu-satunya penjaga akses.
const canLihatCus = computed(() => authStore.canLihatCus);

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId: MENU_ID,
  fetchApi: async () => {
    const res = await realisasiPengirimanSpkService.getBrowse(
      filterState.value.dtAwal,
      filterState.value.dtAkhir,
      filterState.value.divisi,
    );
    return res.data.data || [];
  },
});

watch(
  () => [
    filterState.value.dtAwal,
    filterState.value.dtAkhir,
    filterState.value.divisi,
  ],
  fetchData,
);

const rows = computed(() => items.value ?? []);

const baseHeaders = [
  { title: "Tanggal", key: "spkTanggal", width: "95px", align: "center" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "SPK Nomor", key: "SpkNomor", width: "140px" },
  { title: "Nama", key: "Nama", minWidth: "220px" },
  { title: "Jml Order", key: "JmlOrder", width: "90px", align: "end" },
  { title: "Harga", key: "Harga", width: "110px", align: "end" },
  { title: "Nilai", key: "Nilai", width: "130px", align: "end" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
];
const custHeaders = [
  { title: "Cus Nama", key: "CusNama", minWidth: "200px" },
  { title: "Cus Alamat", key: "CusAlamat", minWidth: "220px" },
];
const sjHeaders = [
  { title: "SJ Nomor Awal", key: "SjNomorAwal", width: "130px" },
  { title: "SJ Tgl Awal", key: "SjTglAwal", width: "100px", align: "center" },
  { title: "SJ Nomor Akhir", key: "SjNomorAkhir", width: "130px" },
  { title: "SJ Tgl Akhir", key: "SjTglAkhir", width: "100px", align: "center" },
  {
    title: "Lambat Kirim Awal",
    key: "LambatKirimAwal",
    width: "110px",
    align: "end",
  },
  {
    title: "Lambat Kirim Akhir",
    key: "LambatKirimAkhir",
    width: "110px",
    align: "end",
  },
  { title: "Tipe", key: "Tipe", width: "80px" },
  { title: "Reason", key: "Reason", minWidth: "140px" },
];

// Kolom Customer cuma disisipkan kalau canLihatCus true — sesuai
// urutan Delphi (nempel setelah Dateline, sebelum kolom SJ)
const headers = computed(() => [
  ...baseHeaders,
  ...(canLihatCus.value ? custHeaders : []),
  ...sjHeaders,
]);

const numFmt = (v: any) =>
  v || v === 0 ? Number(v).toLocaleString("id-ID") : "0";
const fmtTgl = (v: any) => (v ? formatTanggal(v) : "");
const lambatFmt = (v: any) =>
  v === "" || v === null || v === undefined ? "-" : v;

// ── Dialog Reason ──
const showReasonDialog = ref(false);
const reasonTarget = ref<any>(null);
const reasonValue = ref("");
const isSavingReason = ref(false);
const REASON_OPTIONS = ["BAHAN", "PRODUKSI", "DESAIN", "APPROVAL", "LAIN-LAIN"];

const openReasonDialog = (row: any) => {
  reasonTarget.value = row;
  reasonValue.value = row.Reason || "";
  showReasonDialog.value = true;
};

const saveReason = async () => {
  if (!reasonTarget.value) return;
  isSavingReason.value = true;
  try {
    await realisasiPengirimanSpkService.updateReason(
      reasonTarget.value.SpkNomor,
      reasonValue.value,
    );
    reasonTarget.value.Reason = reasonValue.value;
    toast.success("Sukses.");
    showReasonDialog.value = false;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal simpan.");
  } finally {
    isSavingReason.value = false;
  }
};

// ── Export ──
const isExporting = ref(false);
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const dataRows = rows.value ?? [];
  if (!dataRows.length) return toast.warning("Tidak ada data.");
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Tanggal", key: "spkTanggal", width: 12, align: "center" },
      { header: "Divisi", key: "Divisi", width: 12 },
      { header: "SPK Nomor", key: "SpkNomor", width: 18 },
      { header: "Nama", key: "Nama", width: 30 },
      {
        header: "Jml Order",
        key: "JmlOrder",
        width: 10,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Harga",
        key: "Harga",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Nilai",
        key: "Nilai",
        width: 16,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "Dateline", key: "Dateline", width: 12, align: "center" },
      ...(canLihatCus.value
        ? [
            { header: "Cus Nama", key: "CusNama", width: 26 },
            { header: "Cus Alamat", key: "CusAlamat", width: 30 },
          ]
        : []),
      { header: "SJ Nomor Awal", key: "SjNomorAwal", width: 18 },
      { header: "SJ Tgl Awal", key: "SjTglAwal", width: 12, align: "center" },
      { header: "SJ Nomor Akhir", key: "SjNomorAkhir", width: 18 },
      { header: "SJ Tgl Akhir", key: "SjTglAkhir", width: 12, align: "center" },
      {
        header: "Lambat Awal",
        key: "LambatKirimAwal",
        width: 10,
        align: "right",
      },
      {
        header: "Lambat Akhir",
        key: "LambatKirimAkhir",
        width: 10,
        align: "right",
      },
      { header: "Tipe", key: "Tipe", width: 10 },
      { header: "Reason", key: "Reason", width: 18 },
    ];
    await exportExcelSingle(
      `Realisasi_Kirim_SPK_${filterState.value.dtAwal}_${filterState.value.dtAkhir}.xlsx`,
      "Realisasi Kirim SPK",
      columns,
      dataRows.map((r) => ({
        spkTanggal: fmtTgl(r.spkTanggal),
        Divisi: r.Divisi ?? "",
        SpkNomor: r.SpkNomor ?? "",
        Nama: r.Nama ?? "",
        JmlOrder: r.JmlOrder ?? 0,
        Harga: r.Harga ?? 0,
        Nilai: r.Nilai ?? 0,
        Dateline: fmtTgl(r.Dateline),
        ...(canLihatCus.value
          ? { CusNama: r.CusNama ?? "", CusAlamat: r.CusAlamat ?? "" }
          : {}),
        SjNomorAwal: r.SjNomorAwal ?? "",
        SjTglAwal: fmtTgl(r.SjTglAwal),
        SjNomorAkhir: r.SjNomorAkhir ?? "",
        SjTglAkhir: fmtTgl(r.SjTglAkhir),
        LambatKirimAwal: r.LambatKirimAwal ?? "",
        LambatKirimAkhir: r.LambatKirimAkhir ?? "",
        Tipe: r.Tipe ?? "",
        Reason: r.Reason ?? "",
      })),
      `Laporan Realisasi Pengiriman SPK — ${filterState.value.dtAwal} s.d ${filterState.value.dtAkhir}`,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Laporan Realisasi Pengiriman SPK"
    :menu-id="MENU_ID"
    :icon="IconTruckDelivery"
    :headers="headers"
    :items="rows"
    :is-loading="isLoading"
    :can-export="false"
    item-value="SpkNomor"
    search-placeholder="Cari nomor SPK / nama..."
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s.d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Divisi</span>
        <select v-model="filterState.divisi" class="f-select">
          <option v-for="d in divisiOptions" :key="d.value" :value="d.value">
            {{ d.title }}
          </option>
        </select>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="green"
        :loading="isExporting"
        :disabled="!rows.length"
        @click="onExport"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
    </template>

    <template #item.spkTanggal="{ item }">{{
      fmtTgl(item.spkTanggal)
    }}</template>
    <template #item.JmlOrder="{ item }">{{ numFmt(item.JmlOrder) }}</template>
    <template #item.Harga="{ item }">{{ numFmt(item.Harga) }}</template>
    <template #item.Nilai="{ item }">{{ numFmt(item.Nilai) }}</template>
    <template #item.Dateline="{ item }">{{ fmtTgl(item.Dateline) }}</template>
    <template #item.SjTglAwal="{ item }">{{ fmtTgl(item.SjTglAwal) }}</template>
    <template #item.SjTglAkhir="{ item }">{{
      fmtTgl(item.SjTglAkhir)
    }}</template>
    <template #item.LambatKirimAwal="{ item }">
      <span
        :class="Number(item.LambatKirimAwal) > 0 ? 'txt-telat' : 'txt-ontime'"
      >
        {{ lambatFmt(item.LambatKirimAwal) }}
      </span>
    </template>
    <template #item.LambatKirimAkhir="{ item }">
      <span
        :class="Number(item.LambatKirimAkhir) > 0 ? 'txt-telat' : 'txt-ontime'"
      >
        {{ lambatFmt(item.LambatKirimAkhir) }}
      </span>
    </template>
    <template #item.Reason="{ item }">
      <button class="reason-btn" @click="openReasonDialog(item)">
        <IconMessageCircle :size="12" />
        {{ item.Reason || "Isi Reason" }}
      </button>
    </template>
  </BaseBrowse>

  <!-- ── Dialog Reason ── -->
  <v-dialog v-model="showReasonDialog" max-width="360px">
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Reason
      </v-card-title>
      <v-card-text class="pa-4">
        <div style="font-size: 11px; color: #777; margin-bottom: 8px">
          SPK: <b>{{ reasonTarget?.SpkNomor }}</b>
        </div>
        <select
          v-model="reasonValue"
          class="f-select"
          style="width: 100%; height: 32px"
        >
          <option value=""></option>
          <option v-for="r in REASON_OPTIONS" :key="r" :value="r">
            {{ r }}
          </option>
        </select>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="showReasonDialog = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          :loading="isSavingReason"
          @click="saveReason"
        >
          Simpan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-date,
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}
.txt-telat {
  color: #c62828;
  font-weight: 700;
}
.txt-ontime {
  color: #2e7d32;
}
.reason-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid #90caf9;
  border-radius: 4px;
  background: #e3f2fd;
  color: #1565c0;
  cursor: pointer;
}
.reason-btn:hover {
  background: #bbdefb;
}
</style>
