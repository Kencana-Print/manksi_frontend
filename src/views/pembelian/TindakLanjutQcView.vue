<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  tindakLanjutQcService,
  type TlQcLot,
  type TlQcRiwayat,
  type TlQcKeputusanItem,
} from "@/services/pembelian/tindakLanjutQcService";
import {
  IconGavel,
  IconDotsVertical,
  IconShieldLock,
  IconSearch,
  IconHistory,
  IconPrinter,
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";

interface TlQcRow {
  Nomor: string;
  TglDatang: string;
  Nomor_PO: string;
  VendorGreige: string;
  VendorCelup: string;
  JenisKain: string;
  Status: string;
  Keterangan: string | null;
  JumlahLot: number;
  LotLanjut: number;
  LotReject: number;
  LotTunda: number;
  LotBelum: number;
  TotalKg: number;
  TotalRoll: number;
  Satuan: string;
  Usr: string;
  Created: string;
  Ngedit: string;
  KeputusanTahap: string;
}

interface LotEdit extends TlQcLot {
  keputusanBaru: string;
  catatan: string;
  atasNama: string;
}

const toast = useToast();

// --- STATE FILTER ---
const toLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const now = new Date();
const firstDay = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
const today = toLocalDateStr(now);

const STATUS_OPTIONS = [
  "ALL",
  "MENUNGGU",
  "TUNDA",
  "SEBAGIAN",
  "LANJUT",
  "REJECT",
];

const filterState = ref({
  dtAwal: firstDay,
  dtAkhir: today,
  status: "ALL",
  search: "",
});

// --- BROWSE SETUP ---
const {
  items,
  isLoading,
  selected,
  canEdit,
  canExport,
  selectedItem,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "187",
  fetchApi: async () => {
    const res = await tindakLanjutQcService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      status: filterState.value.status,
    });
    return res.data.data;
  },
  immediate: false,
});

const filteredItems = computed<TlQcRow[]>(() => {
  const rows = (items.value ?? []) as TlQcRow[];
  const q = filterState.value.search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) =>
    [
      r.Nomor,
      r.Nomor_PO,
      r.JenisKain,
      r.VendorGreige,
      r.VendorCelup,
      r.Keterangan,
    ]
      .map((v) => String(v ?? "").toLowerCase())
      .some((v) => v.includes(q)),
  );
});

// --- HEADERS ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px", fixed: true },
  { title: "Tgl Datang", key: "TglDatang", width: "100px", align: "center" },
  { title: "Status", key: "Status", width: "110px", align: "center" },
  { title: "Nomor PO", key: "Nomor_PO", width: "140px" },
  { title: "Jenis Kain", key: "JenisKain", width: "240px" },
  { title: "Vendor Greige", key: "VendorGreige", width: "160px" },
  { title: "Vendor Celup", key: "VendorCelup", width: "160px" },
  { title: "Lot", key: "JumlahLot", width: "50px", align: "right" },
  { title: "Lanjut", key: "LotLanjut", width: "60px", align: "right" },
  { title: "Reject", key: "LotReject", width: "60px", align: "right" },
  { title: "Tunda", key: "LotTunda", width: "60px", align: "right" },
  { title: "Belum", key: "LotBelum", width: "60px", align: "right" },
  { title: "Total Qty", key: "TotalKg", width: "110px", align: "right" },
  { title: "Total Roll", key: "TotalRoll", width: "80px", align: "right" },
  { title: "Keterangan", key: "Keterangan", width: "180px" },
  { title: "Dibuat", key: "Created", width: "140px", align: "center" },
];

// --- EXPAND LOGIC (DETAIL LOT) ---
const expandedRows = ref<TlQcRow[]>([]);
const detailCache = ref<Record<string, TlQcLot[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: TlQcRow[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.Nomor] && !expandedLoading.value[item.Nomor],
  );

  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    expandedLoading.value[nomor] = true;
    try {
      const res = await tindakLanjutQcService.getDetailLot(nomor);
      detailCache.value[nomor] = res.data.data as TlQcLot[];
    } catch {
      toast.error(`Gagal memuat detail QC ${nomor}`);
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// --- STYLING ---
const STATUS_ROW_COLOR: Record<string, string> = {
  MENUNGGU: "#e65100",
  LANJUT: "#2e7d32",
  REJECT: "#c62828",
  SEBAGIAN: "#f9a825",
  TUNDA: "#6a1b9a",
};

const rowPropsFn = (data: { item?: { raw?: TlQcRow } & TlQcRow }) => {
  const item = data.item?.raw || data.item;
  let style = "";
  if (item) {
    const color = STATUS_ROW_COLOR[item.Status];
    if (color) style = `color: ${color} !important;`;
  }
  return { class: "font-weight-bold", style };
};

const getNomorStyle = (ngedit: string) => {
  if (ngedit === "WAIT") return "background-color: #1976d2; color: white;";
  if (ngedit === "TOLAK") return "background-color: #d32f2f; color: white;";
  if (ngedit === "ACC") return "background-color: #388e3c; color: white;";
  return "";
};

const statusClass = (status: string) => {
  switch (status) {
    case "MENUNGGU":
      return "chip-wait";
    case "LANJUT":
      return "chip-ok";
    case "REJECT":
      return "chip-reject";
    case "SEBAGIAN":
      return "chip-partial";
    case "TUNDA":
      return "chip-hold";
    default:
      return "chip-draft";
  }
};

const nilaiClass = (nilai: number) => {
  if (nilai === 3) return "chip-ok";
  if (nilai === 2) return "chip-partial";
  if (nilai === 1) return "chip-reject";
  return "chip-draft";
};

const numFmt = (v: number | string | null) =>
  v ? Number(v).toLocaleString("id-ID") : "0";

// --- HANDLERS ---
onMounted(() => fetchData());

watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);
watch(() => filterState.value.status, fetchData);

const getErr = (e: unknown, fallback: string) => {
  const err = e as { response?: { data?: { message?: string } } };
  return err.response?.data?.message || fallback;
};

const onPrint = () => {
  if (selected.value.length === 0) {
    return toast.warning("Pilih data terlebih dahulu.");
  }
  const nomor = (selectedItem.value as TlQcRow).Nomor;
  window.open(
    `/garmen/bahan-baku/qc-bahan/print/${encodeURIComponent(nomor)}`,
    "_blank",
  );
};

// --- KEPUTUSAN LOT ---
const kepDialog = ref(false);
const kepLoading = ref(false);
const isSaving = ref(false);
const kepRows = ref<LotEdit[]>([]);
const kepKontak = ref("");
const kepDoc = ref<TlQcRow | null>(null);

// Lot terkunci: sudah diterima di BPB, atau sudah LANJUT/REJECT tanpa ACC pengajuan
const lotTerkunci = (r: LotEdit) => {
  if (r.SudahBpb === 1 || r.QtyRetur > 0) return true;
  const sudahFinal = r.Keputusan === "LANJUT" || r.Keputusan === "REJECT";
  return sudahFinal && kepDoc.value?.Ngedit !== "ACC";
};

const alasanKunci = (r: LotEdit) => {
  if (r.SudahBpb === 1) return "Sudah diterima di BPB";
  if (r.QtyRetur > 0) return "Sudah diretur ke supplier";
  return "Butuh pengajuan perubahan";
};

const lotBerubah = (r: LotEdit) =>
  !!r.keputusanBaru && r.keputusanBaru !== r.Keputusan;

const adaPerubahan = computed(() => kepRows.value.some(lotBerubah));

const openKeputusanDialog = async () => {
  if (selected.value.length === 0) {
    return toast.warning("Pilih data terlebih dahulu.");
  }
  const row = selectedItem.value as TlQcRow;
  kepDoc.value = { ...row };
  kepRows.value = [];
  kepKontak.value = "";
  kepDialog.value = true;
  kepLoading.value = true;
  try {
    const res = await tindakLanjutQcService.getDetailLot(row.Nomor);
    const list = res.data.data as TlQcLot[];
    kepRows.value = list.map((d) => ({
      ...d,
      keputusanBaru: d.Keputusan || "",
      catatan: "",
      atasNama: "",
    }));
  } catch (e) {
    toast.error(getErr(e, "Gagal memuat detail lot."));
    kepDialog.value = false;
  } finally {
    kepLoading.value = false;
  }
};

const simpanKeputusan = async () => {
  if (!kepDoc.value) return;

  const payloadItems: TlQcKeputusanItem[] = [];
  for (const r of kepRows.value) {
    if (!lotBerubah(r)) continue;
    if (!r.catatan.trim()) {
      return toast.error(`Hasil konfirmasi klien lot ${r.Lot} wajib diisi.`);
    }
    if (!r.atasNama.trim()) {
      return toast.error(`Atas nama yang menyetujui lot ${r.Lot} wajib diisi.`);
    }
    payloadItems.push({
      nourut: r.Nourut,
      keputusan: r.keputusanBaru,
      catatan: r.catatan.trim(),
      atas_nama: r.atasNama.trim(),
    });
  }
  if (payloadItems.length === 0) {
    return toast.warning("Belum ada perubahan keputusan.");
  }

  isSaving.value = true;
  try {
    await tindakLanjutQcService.saveKeputusan(kepDoc.value.Nomor, {
      kontak: kepKontak.value.trim(),
      items: payloadItems,
    });
    toast.success("Keputusan berhasil disimpan.");
    kepDialog.value = false;
    detailCache.value = {};
    fetchData();
  } catch (e) {
    toast.error(getErr(e, "Gagal menyimpan keputusan."));
  } finally {
    isSaving.value = false;
  }
};

// --- RIWAYAT ---
const riwayatDialog = ref(false);
const riwayatLoading = ref(false);
const riwayatRows = ref<TlQcRiwayat[]>([]);
const riwayatNomor = ref("");

const openRiwayatDialog = async () => {
  if (selected.value.length === 0) {
    return toast.warning("Pilih data terlebih dahulu.");
  }
  const nomor = (selectedItem.value as TlQcRow).Nomor;
  riwayatNomor.value = nomor;
  riwayatRows.value = [];
  riwayatDialog.value = true;
  riwayatLoading.value = true;
  try {
    const res = await tindakLanjutQcService.getRiwayat(nomor);
    riwayatRows.value = res.data.data as TlQcRiwayat[];
  } catch (e) {
    toast.error(getErr(e, "Gagal memuat riwayat."));
    riwayatDialog.value = false;
  } finally {
    riwayatLoading.value = false;
  }
};

// --- PENGAJUAN PERUBAHAN KEPUTUSAN (PIN) ---
const pinDialog = ref(false);
const alasanPin = ref("");

// Ada lot LANJUT/REJECT di dokumen terpilih? Sumbernya hitungan di baris browse.
// Cek BPB/retur per lot tetap ditolak server, karena baris browse tidak membawanya.
const adaKeputusanFinal = computed(() => {
  const row = selectedItem.value as TlQcRow | null;
  return !!row && (Number(row.LotLanjut) > 0 || Number(row.LotReject) > 0);
});

const openPinDialog = () => {
  if (selected.value.length === 0) {
    return toast.warning("Pilih data terlebih dahulu.");
  }
  const row = selectedItem.value as TlQcRow;
  if (!adaKeputusanFinal.value) {
    return toast.info(
      "Belum ada lot LANJUT/REJECT. Ubah langsung lewat Keputusan Lot.",
    );
  }
  if (row.Ngedit === "ACC") {
    return toast.info("Pengajuan sudah di-ACC. Silakan ubah keputusan.");
  }
  if (row.Ngedit === "WAIT") {
    return toast.info("Pengajuan sebelumnya masih menunggu ACC.");
  }
  alasanPin.value = "";
  pinDialog.value = true;
};

const submitPin = async () => {
  if (!alasanPin.value.trim()) {
    return toast.error("Alasan pengajuan wajib diisi.");
  }
  try {
    await tindakLanjutQcService.requestPin({
      nomor: (selectedItem.value as TlQcRow).Nomor,
      alasan: alasanPin.value.trim(),
    });
    toast.success("Pengajuan perubahan keputusan berhasil dikirim.");
    pinDialog.value = false;
    fetchData();
  } catch (e) {
    toast.error(getErr(e, "Gagal mengirim pengajuan."));
  }
};
</script>

<template>
  <BaseBrowse
    title="Tindak Lanjut QC Bahan"
    menu-id="187"
    :icon="IconGavel"
    :headers="headers"
    :items="filteredItems"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    @refresh="fetchData"
    @export="exportToExcel('Tindak_Lanjut_QC_Bahan')"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tgl Datang</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <span class="f-label">Status</span>
        <select v-model="filterState.status" class="f-date font-weight-bold">
          <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">
            {{ s === "ALL" ? "SEMUA STATUS" : s }}
          </option>
        </select>
      </div>

      <div class="f-divider" />

      <div class="legend-container">
        <span class="f-label text-grey">Nomor:</span>
        <div class="legend-item">
          <span class="l-box bg-blue-darken-2"></span> Nunggu ACC
        </div>
        <div class="legend-item">
          <span class="l-box bg-green-darken-2"></span> Sudah ACC
        </div>
        <div class="legend-item">
          <span class="l-box bg-red-darken-3"></span> Tolak
        </div>
        <span class="f-label text-grey ml-2">Font:</span>
        <div class="legend-item">
          <div class="l-box" style="background: #e65100"></div>
          Menunggu
        </div>
        <div class="legend-item">
          <div class="l-box" style="background: #2e7d32"></div>
          Lanjut
        </div>
        <div class="legend-item">
          <div class="l-box" style="background: #c62828"></div>
          Reject
        </div>
        <div class="legend-item">
          <div class="l-box" style="background: #f9a825"></div>
          Sebagian
        </div>
        <div class="legend-item">
          <div class="l-box" style="background: #6a1b9a"></div>
          Tunda
        </div>
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <div class="search-box">
          <IconSearch :size="14" class="text-grey" />
          <input
            type="text"
            v-model="filterState.search"
            placeholder="Cari nomor, PO, kain, vendor..."
            class="f-search-inp"
          />
        </div>
      </div>
    </template>

    <template #item.Nomor="{ item }">
      <div class="nomor-cell" :style="getNomorStyle(item.Ngedit)">
        {{ item.Nomor }}
      </div>
    </template>

    <template #item.TglDatang="{ item }">
      {{ formatTanggal(item.TglDatang) }}
    </template>

    <template #item.Status="{ item }">
      <span class="status-chip" :class="statusClass(item.Status)">
        {{ item.Status }}
      </span>
    </template>

    <template #item.TotalKg="{ item }">
      {{ numFmt(item.TotalKg) }} {{ item.Satuan }}
    </template>
    <template #item.TotalRoll="{ item }">{{ numFmt(item.TotalRoll) }}</template>

    <template #item.Created="{ item }">
      {{ formatTanggalJam(item.Created) }}
    </template>

    <!-- Detail Expand (Lazy Load) -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="expandedLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">Detail Lot - {{ item.Nomor }}</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="140">Lot No.</th>
                <th width="110" class="tr">Qty</th>
                <th width="70" class="tr">Roll</th>
                <th>Warna</th>
                <th width="110" class="tr">Gramasi Cek</th>
                <th width="70" class="text-center">Nilai</th>
                <th width="100" class="text-center">Keputusan</th>
                <th width="90" class="tr">Diretur</th>
                <th width="110">Oleh</th>
                <th>Catatan Keputusan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in detailCache[item.Nomor]" :key="d.Nourut">
                <td class="font-weight-bold">{{ d.Lot }}</td>
                <td class="tr text-blue-darken-2 font-weight-bold">
                  {{ numFmt(d.Kg) }} {{ d.Satuan }}
                </td>
                <td class="tr">{{ numFmt(d.Roll) }}</td>
                <td>{{ d.Warna || "-" }}</td>
                <td class="tr">{{ numFmt(d.GramasiCek) }}</td>
                <td class="text-center">
                  <span class="status-chip" :class="nilaiClass(d.Nilai)">
                    {{ d.Nilai || "-" }}
                  </span>
                </td>
                <td class="text-center font-weight-bold">
                  {{ d.Keputusan || "-" }}
                </td>
                <td class="tr">
                  {{ d.QtyRetur > 0 ? numFmt(d.QtyRetur) : "-" }}
                </td>
                <td>{{ d.KeputusanOleh || "-" }}</td>
                <td>
                  <b
                    v-if="d.KeputusanTahap && d.KeputusanTahap !== 'PEMBELIAN'"
                  >
                    [{{
                      d.KeputusanTahap === "SISTEM" ? "Otomatis" : "Gudang"
                    }}]
                  </b>
                  {{ d.KeputusanCatatan || "-" }}
                </td>
              </tr>
              <tr
                v-if="
                  !detailCache[item.Nomor] ||
                  detailCache[item.Nomor].length === 0
                "
              >
                <td colspan="10" class="text-center text-grey py-3 font-italic">
                  Detail lot tidak ditemukan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Additional Actions -->
    <template #extra-actions="{ selected }">
      <v-btn
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
      <v-menu v-if="selected.length > 0">
        <template #activator="{ props }">
          <v-btn size="small" color="teal-darken-3" v-bind="props" class="ml-2">
            <template #prepend><IconDotsVertical :size="15" /></template
            >Tindakan
          </v-btn>
        </template>
        <v-list density="compact" class="text-caption">
          <v-list-item @click="openKeputusanDialog" :disabled="!canEdit">
            <template #prepend
              ><IconGavel :size="14" class="mr-2 text-deep-purple"
            /></template>
            <v-list-item-title>Keputusan Lot</v-list-item-title>
          </v-list-item>
          <v-list-item
            @click="openPinDialog"
            :disabled="!canEdit || !adaKeputusanFinal"
          >
            <template #prepend
              ><IconShieldLock :size="14" class="mr-2 text-primary"
            /></template>
            <v-list-item-title>Pengajuan Perubahan Keputusan</v-list-item-title>
          </v-list-item>
          <v-list-item @click="openRiwayatDialog">
            <template #prepend
              ><IconHistory :size="14" class="mr-2 text-grey-darken-1"
            /></template>
            <v-list-item-title>Riwayat Keputusan</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </BaseBrowse>

  <!-- Dialog Keputusan Lot -->
  <v-dialog v-model="kepDialog" max-width="1100" persistent>
    <v-card rounded="lg" class="qc-dialog">
      <v-card-title class="bg-deep-purple text-white pa-3">
        Keputusan Lot - {{ kepDoc?.Nomor }}
      </v-card-title>
      <v-card-text class="pa-3">
        <v-progress-linear v-if="kepLoading" indeterminate height="2" />
        <template v-else>
          <div class="f-group mb-3">
            <span class="f-label" style="width: 150px"
              >Kontak Klien (opsional)</span
            >
            <input
              v-model="kepKontak"
              type="text"
              maxlength="100"
              class="f-date"
              style="flex: 1"
              placeholder="Nama / nomor klien (boleh dikosongkan)"
            />
          </div>

          <table class="detail-table">
            <thead>
              <tr>
                <th width="110">Lot No.</th>
                <th width="90" class="tr">Qty</th>
                <th>Warna</th>
                <th width="50" class="text-center">Nilai</th>
                <th width="100" class="text-center">Saat Ini</th>
                <th width="130">Keputusan Baru</th>
                <th width="260">Hasil Konfirmasi Klien</th>
                <th width="170">Atas Nama Penyetuju</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in kepRows" :key="r.Nourut">
                <td class="font-weight-bold">{{ r.Lot }}</td>
                <td class="tr">{{ numFmt(r.Kg) }} {{ r.Satuan }}</td>
                <td>{{ r.Warna || "-" }}</td>
                <td class="text-center">
                  <span class="status-chip" :class="nilaiClass(r.Nilai)">
                    {{ r.Nilai || "-" }}
                  </span>
                </td>
                <td class="text-center font-weight-bold">
                  {{ r.Keputusan || "-" }}
                </td>
                <td>
                  <select
                    v-if="!lotTerkunci(r)"
                    v-model="r.keputusanBaru"
                    class="f-date font-weight-bold"
                  >
                    <option value="">- pilih -</option>
                    <option value="LANJUT">LANJUT</option>
                    <option value="REJECT">REJECT</option>
                    <option value="TUNDA">TUNDA</option>
                  </select>
                  <span v-else class="qc-dlg-note">{{ alasanKunci(r) }}</span>
                </td>
                <td>
                  <input
                    v-if="!lotTerkunci(r)"
                    v-model="r.catatan"
                    type="text"
                    class="f-date"
                    style="width: 100%"
                    :disabled="!lotBerubah(r)"
                    :placeholder="lotBerubah(r) ? 'Wajib diisi' : ''"
                  />
                </td>
                <td>
                  <input
                    v-if="!lotTerkunci(r)"
                    v-model="r.atasNama"
                    type="text"
                    maxlength="100"
                    class="f-date"
                    style="width: 100%"
                    :disabled="!lotBerubah(r)"
                    :placeholder="lotBerubah(r) ? 'Wajib diisi' : ''"
                  />
                  <span v-else class="qc-dlg-note">
                    {{ r.KeputusanAtasNama || "-" }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <p class="qc-dlg-note mt-2 mb-0">
            Hanya lot yang keputusannya berubah yang disimpan, dan hasil
            konfirmasi klien serta atas nama penyetuju wajib diisi. Lot
            LANJUT/REJECT hanya bisa diubah setelah pengajuan perubahan
            keputusan di-ACC.
          </p>
        </template>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="kepDialog = false">Batal</v-btn>
        <v-btn
          color="deep-purple"
          variant="elevated"
          :loading="isSaving"
          :disabled="kepLoading || !adaPerubahan"
          @click="simpanKeputusan"
          >Simpan Keputusan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Riwayat -->
  <v-dialog v-model="riwayatDialog" max-width="900">
    <v-card rounded="lg" class="qc-dialog">
      <v-card-title class="bg-grey-darken-3 text-white pa-3">
        Riwayat Keputusan - {{ riwayatNomor }}
      </v-card-title>
      <v-card-text class="pa-3">
        <v-progress-linear v-if="riwayatLoading" indeterminate height="2" />
        <table v-else class="detail-table">
          <thead>
            <tr>
              <th width="130">Tanggal</th>
              <th width="120">Lot No.</th>
              <th width="90">Tahap</th>
              <th width="90" class="text-center">Keputusan</th>
              <th width="130">Kontak Klien</th>
              <th>Catatan</th>
              <th width="90">User</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in riwayatRows" :key="h.Id">
              <td>{{ h.Tanggal }}</td>
              <td class="font-weight-bold">{{ h.Lot }}</td>
              <td>{{ h.Tahap }}</td>
              <td class="text-center font-weight-bold">{{ h.Keputusan }}</td>
              <td>{{ h.KlienKontak || "-" }}</td>
              <td>{{ h.Catatan || "-" }}</td>
              <td>{{ h.Usr }}</td>
            </tr>
            <tr v-if="riwayatRows.length === 0">
              <td colspan="7" class="text-center text-grey py-3 font-italic">
                Belum ada riwayat keputusan.
              </td>
            </tr>
          </tbody>
        </table>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="riwayatDialog = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Request PIN -->
  <v-dialog v-model="pinDialog" max-width="400">
    <v-card rounded="lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Pengajuan Perubahan Keputusan
      </v-card-title>
      <v-card-text class="pa-4">
        <p class="text-caption mb-2">
          Nomor QC: <b>{{ selectedItem?.Nomor }}</b>
        </p>
        <v-textarea
          v-model="alasanPin"
          label="Alasan Perubahan"
          variant="outlined"
          density="compact"
          rows="3"
          hide-details
          autofocus
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="pinDialog = false">Batal</v-btn>
        <v-btn color="primary" variant="elevated" @click="submitPin"
          >Ajukan</v-btn
        >
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
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.f-date:disabled {
  background: #f5f5f5;
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

.search-box {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  height: 28px;
  width: 240px;
}
.f-search-inp {
  border: none;
  outline: none;
  font-size: 11px;
  padding-left: 6px;
  width: 100%;
}

.legend-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  padding: 2px 8px;
  border-radius: 4px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #424242;
  white-space: nowrap;
}
.l-box {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  display: inline-block;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.nomor-cell {
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  display: inline-block;
  min-width: 100%;
  font-weight: bold;
}

.status-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 9.5px;
  font-weight: 700;
  white-space: nowrap;
}
.chip-draft {
  background: #f5f5f5;
  color: #757575;
}
.chip-wait {
  background: #fff3e0;
  color: #e65100;
}
.chip-ok {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip-reject {
  background: #ffebee;
  color: #c62828;
}
.chip-partial {
  background: #fffde7;
  color: #f57f17;
}
.chip-hold {
  background: #f3e5f5;
  color: #6a1b9a;
}

.expand-wrap {
  padding: 10px 10px 10px 40px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: bold;
  color: #1565c0;
  text-transform: uppercase;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-size: 11px;
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 8px;
  font-weight: bold;
}
.detail-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
}
.tr {
  text-align: right !important;
}
.qc-dialog {
  font-size: 11px;
}
.qc-dialog :deep(.v-card-title) {
  font-size: 13px !important;
  font-weight: 700;
}
.qc-dialog .detail-table th,
.qc-dialog .detail-table td {
  font-size: 11px;
}
.qc-dialog .f-date,
.qc-dialog select,
.qc-dialog input {
  font-size: 11px;
}
.qc-dialog :deep(.v-btn) {
  font-size: 11px;
}
.qc-dlg-note {
  font-size: 10px;
  color: #757575;
}
</style>
