<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportExcelSingle } from "@/utils/excelExport";
import { bpbJasaService as svc } from "@/services/garmen/bpbJasaService";
import {
  IconPrinter,
  IconRefresh,
  IconClipboardCheck,
  IconMenu2,
} from "@tabler/icons-vue";

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

const MENU_ID = "104";

// ── Filter ─────────────────────────────────────────────────────────────
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const tglAwal = ref(todayLocal());
const tglAkhir = ref(todayLocal());
const getDefaultCab = () => {
  const c = authStore.user?.cabang || "";
  if (!c || c.startsWith("HO") || c === "ALL") return "ALL";
  return c;
};
const filterCab = ref(getDefaultCab());

const cabOptions = ["ALL", "P01", "P04"];

// ── Browse ─────────────────────────────────────────────────────────────
const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
  clearSelection,
} = useBrowse<any>({
  menuId: MENU_ID,
  immediate: false,
  fetchApi: async () => {
    const res = await svc.getBrowse(
      tglAwal.value,
      tglAkhir.value,
      filterCab.value,
    );
    return res.data.data ?? [];
  },
});

onMounted(() => {
  fetchData();
});

watch([tglAwal, tglAkhir, filterCab], () => {
  fetchData();
});

// ── Expand row ────────────────────────────────────────────────────────
const expanded = ref<any[]>([]);
const detailMap = ref<Record<string, any[]>>({});
const loadingSet = ref(new Set<string>());

const onUpdateExpanded = async (val: any[]) => {
  expanded.value = val;
  for (const item of val) {
    const nomor = item.Nomor;
    if (detailMap.value[nomor]) continue;
    loadingSet.value.add(nomor);
    try {
      const res = await svc.getDetailByNomor(nomor);
      detailMap.value = { ...detailMap.value, [nomor]: res.data.data ?? [] };
    } catch {
      detailMap.value = { ...detailMap.value, [nomor]: [] };
    } finally {
      loadingSet.value.delete(nomor);
    }
  }
};

// ── Headers ────────────────────────────────────────────────────────────
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Nomor PO", key: "Nomor_PO", width: "150px" },
  { title: "Cab", key: "Cab", width: "55px" },
  { title: "Tanggal", key: "Tanggal", width: "100px" },
  { title: "Gudang", key: "Gudang", width: "130px" },
  { title: "Keterangan", key: "Keterangan", width: "160px" },
  { title: "Jatuh Tempo", key: "Jatuhtempo", width: "100px" },
  { title: "Supplier", key: "Supplier", width: "160px" },
  { title: "SPK Nomor", key: "Spk_Nomor", width: "140px" },
  { title: "SPK", key: "SPK", width: "160px" },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "right" },
  { title: "Tarif", key: "Tarif", width: "90px", align: "right" },
  { title: "Total", key: "Total", width: "100px", align: "right" },
  { title: "Voucher Bayar", key: "Voucher_bayar", width: "110px" },
  { title: "Bayar ke Prod", key: "BayarkeProduksi", width: "110px" },
  { title: "No Voucher", key: "No_voucher", width: "130px" },
  { title: "Hapus", key: "hapus", width: "70px" },
  { title: "Usr", key: "Usr", width: "80px" },
  { title: "Created", key: "created", width: "130px" },
];

// ── Row color (sesuai Delphi cxGrdMasterCustomDrawCell) ───────────────
const rowPropsFn = (data: any) => {
  const item = data.item?.raw ?? data.item;
  if (item?.hapus === "Y") return { style: "color: silver" };
  return {};
};

// ── Cell color — pakai slot item.BayarkeProduksi & Nomor di template ──
// (ditangani di template via computed class per baris)

// ── Computed selected ──────────────────────────────────────────────────
const selectedItem = computed(() => selected.value[0] ?? null);

// ── Actions ────────────────────────────────────────────────────────────
const goAdd = () => router.push({ name: "BpbJasaFormCreate" });
const goEdit = () => {
  if (!selectedItem.value) return;
  router.push({
    name: "BpbJasaFormEdit",
    query: { nomor: selectedItem.value.Nomor },
  });
};

// ── Hapus ─────────────────────────────────────────────────────────────
const isDeleting = ref(false);
const onDelete = async (item: any) => {
  if (item.Voucher_bayar === "Sudah") {
    toast.error("BPB Jasa ini sudah dibayar. Tidak bisa dihapus.");
    return;
  }
  isDeleting.value = true;
  try {
    await svc.deleteData(item.Nomor);
    toast.success("Berhasil dihapus.");
    fetchData();
  } catch (err: any) {
    const msg = err.response?.data?.message ?? "Gagal menghapus.";
    if (msg.includes("Pengajuan")) {
      toast.warning(msg);
      openPengajuan("hapus"); // ← ganti ini
    } else {
      toast.error(msg);
    }
  } finally {
    isDeleting.value = false;
  }
};

// ── Cetak ─────────────────────────────────────────────────────────────
const onCetak = () => {
  if (!selectedItem.value) return;
  const url = router.resolve({
    name: "BpbJasaPrint",
    query: { nomor: selectedItem.value.Nomor },
  }).href;
  window.open(url, "_blank");
};

// ── Update Status Bayar ke Produksi ───────────────────────────────────
const isUpdatingBayar = ref(false);
const showBayarDialog = ref(false);
const pendingBayarStatus = ref<"Sudah" | "Belum">("Sudah");

const onUpdateBayarProduksi = async () => {
  if (!selectedItem.value) return;
  const item = selectedItem.value;

  if (!item.No_voucher) {
    toast.warning("Belum ada pembayaran.");
    return;
  }

  pendingBayarStatus.value =
    item.BayarkeProduksi === "Sudah" ? "Belum" : "Sudah";
  showBayarDialog.value = true;
};

const confirmBayarProduksi = async () => {
  if (!selectedItem.value) return;
  const item = selectedItem.value;
  isUpdatingBayar.value = true;
  showBayarDialog.value = false;
  try {
    await svc.updateBayarProduksi(item.Nomor, pendingBayarStatus.value);
    toast.success("Berhasil diupdate.");
    const idx = (items.value ?? []).findIndex(
      (r: any) => r.Nomor === item.Nomor,
    );
    if (idx !== -1) {
      (items.value as any[])[idx] = {
        ...(items.value as any[])[idx],
        BayarkeProduksi: pendingBayarStatus.value,
      };
      selected.value = [{ ...item, BayarkeProduksi: pendingBayarStatus.value }];
    }
  } catch (err: any) {
    toast.error(err.response?.data?.message ?? "Gagal update.");
  } finally {
    isUpdatingBayar.value = false;
  }
};

// ── Export Excel ──────────────────────────────────────────────────────
const isExporting = ref(false);
const onExport = async () => {
  isExporting.value = true;
  try {
    const res = await svc.getExportData(
      tglAwal.value,
      tglAkhir.value,
      filterCab.value,
    );
    const rows = res.data.data ?? [];
    await exportExcelSingle(
      `BPB_Jasa_${tglAwal.value}_${tglAkhir.value}`,
      "BPB Jasa",
      [
        { header: "Nomor", key: "Nomor", width: 20 },
        { header: "Nomor PO", key: "Nomor_PO", width: 20 },
        { header: "Cab", key: "Cab", width: 8 },
        { header: "Tanggal", key: "Tanggal", width: 14 },
        { header: "Gudang", key: "Gudang", width: 22 },
        { header: "Keterangan", key: "Keterangan", width: 26 },
        { header: "Jatuh Tempo", key: "Jatuhtempo", width: 14 },
        { header: "Supplier", key: "Supplier", width: 26 },
        { header: "SPK Nomor", key: "Spk_Nomor", width: 20 },
        { header: "SPK", key: "SPK", width: 26 },
        {
          header: "Jumlah",
          key: "Jumlah",
          width: 12,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Tarif",
          key: "Tarif",
          width: 14,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Total",
          key: "Total",
          width: 16,
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Voucher Bayar", key: "Voucher_bayar", width: 14 },
        { header: "Bayar ke Prod", key: "BayarkeProduksi", width: 14 },
        { header: "No Voucher", key: "No_voucher", width: 20 },
        { header: "User", key: "Usr", width: 12 },
        { header: "Created", key: "created", width: 18 },
      ],
      rows,
      `BPB Jasa — ${tglAwal.value} s.d. ${tglAkhir.value}`,
    );
    toast.success("Export berhasil.");
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

const onExportDetail = async () => {
  isExporting.value = true;
  try {
    const res = await svc.getExportDetail(
      tglAwal.value,
      tglAkhir.value,
      filterCab.value,
    );
    const rows = res.data.data ?? [];
    await exportExcelSingle(
      `BPB_Jasa_Detail_${tglAwal.value}_${tglAkhir.value}`,
      "Detail",
      [
        { header: "Nomor", key: "Nomor", width: 20 },
        { header: "Cab", key: "Cab", width: 8 },
        { header: "Tanggal", key: "Tanggal", width: 14 },
        { header: "Supplier", key: "Supplier", width: 26 },
        { header: "SPK Nomor", key: "Spk_Nomor", width: 20 },
        { header: "SPK", key: "SPK", width: 26 },
        { header: "Kode", key: "Kode", width: 14 },
        { header: "Nama", key: "Nama", width: 26 },
        { header: "Satuan", key: "Satuan", width: 10 },
        {
          header: "Jumlah",
          key: "Jumlah",
          width: 12,
          align: "right",
          numFmt: "#,##0",
        },
      ],
      rows,
      `BPB Jasa Detail — ${tglAwal.value} s.d. ${tglAkhir.value}`,
    );
    toast.success("Export detail berhasil.");
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExporting.value = false;
  }
};

// ── Pengajuan Ubah / Hapus (klik kanan) ──────────────────────────────
const showPengajuanDialog = ref(false);
const pengajuanMode = ref<"ubah" | "hapus">("ubah");
const pengajuanLoading = ref(false);
const pengajuanAlasan = ref("");
const cekTutupBukuLoading = ref(false);

const openPengajuan = async (mode: "ubah" | "hapus") => {
  if (!selectedItem.value) return;

  if (mode === "ubah") {
    // Sesuai Delphi PengajuanPerubahanData1Click:
    // cek tutup buku dulu — kalau tidak close, tidak perlu pengajuan
    cekTutupBukuLoading.value = true;
    try {
      const res = await svc.cekTutupBuku(selectedItem.value.Nomor);
      const { isClose } = res.data.data;
      if (!isClose) {
        toast.info("Tidak perlu pengajuan perubahan data.");
        return;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Gagal cek tutup buku.");
      return;
    } finally {
      cekTutupBukuLoading.value = false;
    }
  }

  if (mode === "hapus") {
    // Sesuai Delphi PengajuanPenghapusanData1Click:
    // validasi voucher dulu
    if (selectedItem.value.Voucher_bayar === "Sudah") {
      toast.error("BPB Jasa ini sudah dibayar. Tidak bisa dihapus.");
      return;
    }
    // Cek apakah bisa langsung hapus (date_create = hari ini)
    // Kalau bisa langsung hapus, tidak perlu pengajuan
    try {
      const res = await svc.cekBisaHapus(selectedItem.value.Nomor);
      if (res.data.data?.bisaHapus) {
        toast.info(
          "Data dibuat hari ini, tidak perlu pengajuan. Gunakan tombol Hapus.",
        );
        return;
      }
    } catch {
      // lanjut ke dialog
    }
  }

  pengajuanMode.value = mode;
  pengajuanAlasan.value = "";
  showPengajuanDialog.value = true;
};

const onPengajuanSubmit = async () => {
  if (!selectedItem.value || !pengajuanAlasan.value.trim()) return;
  pengajuanLoading.value = true;
  const item = selectedItem.value;
  try {
    if (pengajuanMode.value === "ubah") {
      await svc.pengajuanUbah({
        nomor: item.Nomor,
        tanggal: item.Tanggal,
        keterangan: item.Keterangan ?? "",
        alasan: pengajuanAlasan.value,
      });
    } else {
      await svc.pengajuanHapus({
        nomor: item.Nomor,
        tanggal: item.Tanggal,
        keterangan: item.Keterangan ?? "",
        alasan: pengajuanAlasan.value,
      });
    }
    toast.success("Berhasil diajukan. Menunggu ACC.");
    showPengajuanDialog.value = false;
    pengajuanAlasan.value = "";

    // Update local state
    const idx = (items.value ?? []).findIndex(
      (r: any) => r.Nomor === item.Nomor,
    );
    if (idx !== -1) {
      (items.value as any[])[idx] = {
        ...(items.value as any[])[idx],
        ...(pengajuanMode.value === "ubah"
          ? { Ngedit: "WAIT" }
          : { hapus: "Y" }),
      };
    }
  } catch (err: any) {
    toast.error(err.response?.data?.message ?? "Gagal mengajukan.");
  } finally {
    pengajuanLoading.value = false;
  }
};

// ── Summary: total Jumlah dan Total ───────────────────────────────────
const summaryJumlah = computed(() =>
  (items.value ?? []).reduce(
    (s: number, r: any) => s + (Number(r.Jumlah) || 0),
    0,
  ),
);
const summaryTotal = computed(() =>
  (items.value ?? []).reduce(
    (s: number, r: any) => s + (Number(r.Total) || 0),
    0,
  ),
);
const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
</script>

<template>
  <BaseBrowse
    title="BPB Jasa"
    :menu-id="MENU_ID"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :show-expand="true"
    :expanded="expanded"
    :selected="selected"
    :row-props-fn="rowPropsFn"
    search-placeholder="Cari nomor, supplier, SPK..."
    @refresh="fetchData"
    @add="goAdd"
    @edit="goEdit"
    @delete="onDelete"
    @export="onExport"
    @update:expanded="onUpdateExpanded"
    @update:selected="selected = $event"
  >
    <!-- ── Filter bar ── -->
    <template #filter-left>
      <span class="filter-label">Tanggal</span>
      <input type="date" v-model="tglAwal" class="date-input" />
      <span class="filter-sep">s.d.</span>
      <input type="date" v-model="tglAkhir" class="date-input" />

      <span class="filter-label">Cabang</span>
      <select v-model="filterCab" class="cab-select">
        <option v-for="c in cabOptions" :key="c" :value="c">{{ c }}</option>
      </select>
    </template>

    <template #filter-right>
      <div class="legend-bar">
        <span class="legend-item">
          <span class="legend-dot" style="background: #1565c0"></span>
          Nunggu Acc
        </span>
        <span class="legend-item">
          <span class="legend-dot" style="background: #2e7d32"></span>
          Sudah Acc
        </span>
        <span class="legend-item">
          <span class="legend-dot" style="background: #c62828"></span>
          Tolak
        </span>
        <span class="legend-item">
          <span
            class="legend-dot"
            style="background: silver; border: 1px solid #ccc"
          ></span>
          Diajukan Hapus
        </span>
      </div>
    </template>

    <!-- ── Tombol extra di header ── -->
    <template #extra-actions="{ selected: sel }">
      <v-btn
        size="small"
        color="teal"
        :disabled="sel.length !== 1"
        @click="onCetak"
      >
        <template #prepend><IconPrinter :size="14" /></template>
        Cetak
      </v-btn>

      <v-btn
        size="small"
        color="indigo"
        :disabled="sel.length !== 1"
        :loading="isUpdatingBayar"
        @click="onUpdateBayarProduksi"
      >
        <template #prepend><IconClipboardCheck :size="14" /></template>
        Update Bayar Produksi
      </v-btn>

      <!-- Tindakan dropdown -->
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn
            size="small"
            color="orange-darken-1"
            :disabled="sel.length !== 1"
            :loading="cekTutupBukuLoading"
            v-bind="menuProps"
          >
            <template #prepend><IconMenu2 :size="14" /></template>
            Tindakan
          </v-btn>
        </template>
        <v-list density="compact" min-width="220">
          <v-list-item
            prepend-icon="mdi-pencil-lock"
            title="Pengajuan Perubahan Data"
            @click="openPengajuan('ubah')"
          />
          <v-list-item
            prepend-icon="mdi-delete-clock"
            title="Pengajuan Penghapusan Data"
            @click="openPengajuan('hapus')"
          />
        </v-list>
      </v-menu>

      <v-btn
        size="small"
        color="green-darken-1"
        :loading="isExporting"
        @click="onExportDetail"
      >
        <template #prepend><IconMenu2 :size="14" /></template>
        Export Detail
      </v-btn>
    </template>

    <!-- ── Cell custom: warna BayarkeProduksi dan Ngedit ── -->
    <template #item.BayarkeProduksi="{ item }">
      <span
        :style="
          (item.raw ?? item)?.BayarkeProduksi === 'Belum'
            ? 'color:red;font-weight:600'
            : ''
        "
      >
        {{ (item.raw ?? item)?.BayarkeProduksi }}
      </span>
    </template>

    <template #item.Nomor="{ item }">
      <span
        :style="
          (item.raw ?? item)?.Ngedit === 'WAIT'
            ? 'background:#1565c0;color:#fff;padding:1px 5px;border-radius:3px'
            : (item.raw ?? item)?.Ngedit === 'TOLAK'
              ? 'background:#c62828;color:#fff;padding:1px 5px;border-radius:3px'
              : (item.raw ?? item)?.Ngedit === 'ACC'
                ? 'background:#2e7d32;color:#fff;padding:1px 5px;border-radius:3px'
                : ''
        "
      >
        {{ (item.raw ?? item)?.Nomor }}
      </span>
    </template>

    <template #item.Jumlah="{ item }">
      {{
        (item.raw ?? item)?.Jumlah != null
          ? fmt(Number((item.raw ?? item).Jumlah))
          : ""
      }}
    </template>

    <template #item.Tarif="{ item }">
      {{
        (item.raw ?? item)?.Tarif != null
          ? fmt(Number((item.raw ?? item).Tarif))
          : ""
      }}
    </template>

    <template #item.Total="{ item }">
      {{
        (item.raw ?? item)?.Total != null
          ? fmt(Number((item.raw ?? item).Total))
          : ""
      }}
    </template>

    <template #item.hapus="{ item }">
      <span
        v-if="(item.raw ?? item)?.hapus === 'Y'"
        style="color: silver; font-size: 11px"
      >
        Pending
      </span>
    </template>

    <!-- ── Summary bar ── -->
    <template #summary-row>
      <span class="summary-lbl">Jumlah:</span>
      <span class="summary-val">{{ fmt(summaryJumlah) }}</span>
      <span class="summary-lbl" style="margin-left: 24px">Total:</span>
      <span class="summary-val">{{ fmt(summaryTotal) }}</span>
    </template>

    <!-- ── Expanded detail ── -->
    <template #detail="{ item }">
      <div v-if="loadingSet.has(item.Nomor)" class="detail-loading">
        Memuat detail...
      </div>
      <table v-else class="detail-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama</th>
            <th>Satuan</th>
            <th style="text-align: right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in detailMap[item.Nomor] ?? []" :key="d.Kode">
            <td>{{ d.Kode }}</td>
            <td style="min-width: 200px">{{ d.Nama }}</td>
            <td>{{ d.Satuan }}</td>
            <td style="text-align: right">{{ fmt(d.Jumlah) }}</td>
          </tr>
          <tr v-if="!(detailMap[item.Nomor] ?? []).length">
            <td colspan="4" style="text-align: center; color: #999">
              Tidak ada detail
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </BaseBrowse>

  <!-- ── Pengajuan Dialog ── -->
  <v-dialog v-model="showPengajuanDialog" max-width="420px" persistent>
    <v-card class="rounded-lg" elevation="4">
      <!-- Header -->
      <div class="pj-header">
        <v-icon size="18" class="mr-2">
          {{
            pengajuanMode === "ubah" ? "mdi-pencil-lock" : "mdi-delete-clock"
          }}
        </v-icon>
        <span>{{
          pengajuanMode === "ubah"
            ? "Pengajuan Ubah Data"
            : "Pengajuan Hapus Data"
        }}</span>
        <span v-if="selectedItem" class="pj-nomor">{{
          selectedItem.Nomor
        }}</span>
      </div>

      <!-- Info baris data -->
      <div v-if="selectedItem" class="pj-info">
        <div class="pj-info-row">
          <span class="pj-info-lbl">Supplier</span>
          <span class="pj-info-val">{{ selectedItem.Supplier }}</span>
        </div>
        <div class="pj-info-row">
          <span class="pj-info-lbl">Tanggal</span>
          <span class="pj-info-val">{{ selectedItem.Tanggal }}</span>
        </div>
        <div class="pj-info-row">
          <span class="pj-info-lbl">SPK</span>
          <span class="pj-info-val">{{ selectedItem.SPK }}</span>
        </div>
      </div>

      <v-divider />

      <!-- Alasan -->
      <div class="pj-body">
        <label class="pj-label"
          >Alasan pengajuan <span style="color: red">*</span></label
        >
        <textarea
          v-model="pengajuanAlasan"
          class="pj-textarea"
          rows="3"
          placeholder="Masukkan alasan..."
          autofocus
        />
      </div>

      <v-divider />

      <!-- Actions -->
      <div class="pj-actions">
        <v-btn
          variant="text"
          size="small"
          @click="
            showPengajuanDialog = false;
            pengajuanAlasan = '';
          "
        >
          Batal
        </v-btn>
        <v-btn
          color="primary"
          size="small"
          variant="elevated"
          :loading="pengajuanLoading"
          :disabled="!pengajuanAlasan.trim()"
          @click="onPengajuanSubmit"
        >
          Ajukan
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showBayarDialog" max-width="380px" persistent>
    <v-card class="rounded-lg">
      <div class="pj-header">
        <v-icon size="18" class="mr-2">mdi-cash-check</v-icon>
        <span>Update Bayar ke Produksi</span>
        <span v-if="selectedItem" class="pj-nomor">{{
          selectedItem.Nomor
        }}</span>
      </div>

      <div class="pj-body" style="padding: 16px">
        <div style="font-size: 13px; color: rgb(var(--v-theme-on-surface))">
          Status saat ini:
          <strong
            :style="
              selectedItem?.BayarkeProduksi === 'Sudah'
                ? 'color:#2e7d32'
                : 'color:#c62828'
            "
          >
            {{ selectedItem?.BayarkeProduksi }}
          </strong>
          <br />
          Update menjadi
          <strong
            :style="
              pendingBayarStatus === 'Sudah' ? 'color:#2e7d32' : 'color:#c62828'
            "
          >
            "{{ pendingBayarStatus }}"
          </strong>
          ?
        </div>
        <div
          v-if="selectedItem"
          style="
            margin-top: 10px;
            display: flex;
            flex-direction: column;
            gap: 4px;
          "
        >
          <div class="pj-info-row">
            <span class="pj-info-lbl">Supplier</span>
            <span class="pj-info-val">{{ selectedItem.Supplier }}</span>
          </div>
          <div class="pj-info-row">
            <span class="pj-info-lbl">No Voucher</span>
            <span
              class="pj-info-val"
              style="color: #1565c0; font-family: monospace"
            >
              {{ selectedItem.No_voucher }}
            </span>
          </div>
          <div class="pj-info-row">
            <span class="pj-info-lbl">Total</span>
            <span class="pj-info-val">{{ fmt(selectedItem.Total) }}</span>
          </div>
        </div>
      </div>

      <v-divider />

      <div class="pj-actions">
        <v-btn variant="text" size="small" @click="showBayarDialog = false">
          Batal
        </v-btn>
        <v-btn
          size="small"
          variant="elevated"
          :color="
            pendingBayarStatus === 'Sudah' ? 'green-darken-2' : 'red-darken-2'
          "
          :loading="isUpdatingBayar"
          @click="confirmBayarProduksi"
        >
          Ya, Update
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.filter-label {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  white-space: nowrap;
}
.filter-sep {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.date-input {
  height: 32px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 5px;
  padding: 0 8px;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  outline: none;
}
.date-input:focus {
  border-color: rgb(var(--v-theme-primary));
}
.cab-select {
  height: 32px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 5px;
  padding: 0 6px;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  outline: none;
  cursor: pointer;
}

/* Detail table dalam expanded row */
.detail-table {
  border-collapse: collapse;
  font-size: 11px;
  min-width: 420px;
}
.detail-table th,
.detail-table td {
  padding: 3px 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  white-space: nowrap;
}
.detail-loading {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  padding: 8px;
}

.legend-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  white-space: nowrap;
}
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

/* Context menu */
.ctx-menu {
  position: fixed;
  z-index: 9999;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  min-width: 200px;
  overflow: hidden;
}
.ctx-item {
  padding: 8px 14px;
  font-size: 12px;
  cursor: pointer;
  color: rgb(var(--v-theme-on-surface));
}
.ctx-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

/* Summary bar */
.summary-lbl {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}
.summary-val {
  font-size: 13px;
  font-weight: 700;
  color: white;
  font-family: monospace;
}

/* ── Dialog Pengajuan ── */
.pj-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 8px 8px 0 0;
  gap: 4px;
}
.pj-nomor {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 400;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pj-info {
  padding: 10px 16px 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
}
.pj-info-row {
  display: flex;
  gap: 8px;
  font-size: 11px;
}
.pj-info-lbl {
  width: 60px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  flex-shrink: 0;
}
.pj-info-val {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 500;
}
.pj-body {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pj-label {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-weight: 500;
}
.pj-textarea {
  width: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 5px;
  padding: 8px 10px;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  resize: vertical;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  line-height: 1.5;
  min-height: 72px;
}
.pj-textarea:focus {
  border-color: rgb(var(--v-theme-primary));
}
.pj-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(var(--v-theme-on-surface), 0.02);
}
</style>
