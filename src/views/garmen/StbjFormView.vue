<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { stbjFormService as svc } from "@/services/garmen/stbjFormService";
import {
  IconClipboardCheck,
  IconSearch,
  IconAlertTriangle,
  IconPackage,
} from "@tabler/icons-vue";

import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import SpgSearchModal from "@/components/lookups/SpgSearchModal.vue";

// ── Types ──────────────────────────────────────────────────────────────
interface DetailRow {
  _key: number;
  Packing: string;
  SpkNomor: string;
  NamaSpk: string;
  Ukuran: string;
  TotalOrder: number;
  Size: string;
  QtyOrder: number;
  Jumlah: number;
  Koli: number;
  Jadi: number;
  Kurang: number;
  Keterangan: string;
}

interface Detail2Row {
  _key: number;
  Packing: string;
  SpkNomor: string;
  KodeKaosan: string;
  NamaKaosan: string;
  Size: string;
  Jumlah: number;
}

interface FormData {
  Nomor: string;
  Tanggal: string;
  GudangKode: string;
  GudangNama: string;
  GudangProduksiKode: string;
  GudangProduksiNama: string;
  Keterangan: string;
  Detail: DetailRow[];
  Detail2: Detail2Row[];
}

// ── Store & Router ─────────────────────────────────────────────────────
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const userCab = computed(() => auth.user?.cabang || "");
const userKode = computed(() => auth.user?.kode || "");

const gudangFromBrowse = computed(() => ({
  kode: (route.query.gudang as string) || "",
  nama: (route.query.gudangNama as string) || "",
}));

// ── Helpers ────────────────────────────────────────────────────────────
const todayLocal = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
let _key = 1;
const num = (v: any, d = 0) =>
  Number(v || 0).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
const sel = (e: FocusEvent) => (e.target as HTMLInputElement).select();

// ── Default Gudang Produksi sesuai Delphi refreshdata ─────────────────
const defaultGdgProduksi = () => {
  const cab = userCab.value;
  if (cab === "P01") return { kode: "GP020", nama: "06.GD KOLI P1" };
  if (cab === "P04") return { kode: "GP013", nama: "06.GD KOLI P4" };
  return { kode: "GP-001", nama: "GUDANG FINISHING" };
};

// ── Init ───────────────────────────────────────────────────────────────
const gdgProd = defaultGdgProduksi();
const init: FormData = {
  Nomor: "",
  Tanggal: todayLocal(),
  GudangKode: "",
  GudangNama: "",
  GudangProduksiKode: gdgProd.kode,
  GudangProduksiNama: gdgProd.nama,
  Keterangan: "",
  Detail: [],
  Detail2: [],
};

// ── State ──────────────────────────────────────────────────────────────
const showPrintDialog = ref(false);
const savedNomor = ref("");
const isLoadingPacking = ref(false);
const activeTab = ref(0);

// ── useForm ────────────────────────────────────────────────────────────
const {
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  fetchData,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<FormData>({
  menuId: "105",
  initialData: init,
  immediate: false,

  fetchApi: async (): Promise<FormData> => {
    const nomorEdit = route.query.nomor as string;
    const res = await svc.getById(nomorEdit);
    const d = res.data.data;
    const h = d.header;
    return {
      Nomor: h.stbj_nomor || "",
      Tanggal: h.stbj_tanggal || todayLocal(),
      GudangKode: h.stbj_gdg_kode || "",
      GudangNama: h.gdg_nama || "",
      GudangProduksiKode: h.stbj_gdgp_kode || "",
      GudangProduksiNama: h.gdgp_nama || "",
      Keterangan: h.stbj_keterangan || "",
      Detail: (d.detail || []).map((r: any) => ({
        _key: _key++,
        Packing: r.Packing || "",
        SpkNomor: r.SpkNomor || "",
        NamaSpk: r.NamaSpk || "",
        Ukuran: r.Ukuran || "",
        TotalOrder: Number(r.TotalOrder) || 0,
        Size: r.Size || "",
        QtyOrder: Number(r.QtyOrder) || 0,
        Jumlah: Number(r.Jumlah) || 0,
        Koli: Number(r.Koli) || 0,
        Jadi: Number(r.Jadi) || 0,
        Kurang: Number(r.Kurang) || 0,
        Keterangan: r.Keterangan || "",
      })),
      Detail2: (d.detail2 || []).map((r: any) => ({
        _key: _key++,
        Packing: r.Packing || "",
        SpkNomor: r.SpkNomor || "",
        KodeKaosan: r.KodeKaosan || "",
        NamaKaosan: r.NamaKaosan || "",
        Size: r.Size || "",
        Jumlah: Number(r.Jumlah) || 0,
      })),
    };
  },

  submitApi: async (data): Promise<any> => {
    const payload = {
      ...data,
      Nomor: route.query.nomor || data.Nomor,
      Detail: data.Detail.filter((r) => r.SpkNomor && Number(r.Jumlah) !== 0) // ← filter baris kosong
        .map(({ _key: _k, ...r }) => r),
      Detail2: data.Detail2.filter(
        (r) => r.KodeKaosan && Number(r.Jumlah) !== 0,
      ).map(({ _key: _k, ...r }) => r),
    };
    return isEditMode.value ? svc.update(payload) : svc.save(payload);
  },

  onSuccess: (res: any) => {
    const nomor = res?.data?.data?.nomor || "";
    toast.success(`Data ${nomor} berhasil disimpan.`);
    savedNomor.value = nomor;
    showPrintDialog.value = true;
  },
});

const fd = formData;
const isWH003 = computed(() => fd.value.GudangKode === "WH003");

// ── Lookup Modals ──────────────────────────────────────────────────────
const showGdgPModal = ref(false);
const showSpkModal = ref(false);
const showSpgModal = ref(false);

// Gudang Produksi Koli
const gdgPList = ref<any[]>([]);
const gdgPQ = ref("");
const gdgPFiltered = computed(() => {
  const q = gdgPQ.value.toLowerCase();
  return gdgPList.value.filter(
    (g) =>
      !q ||
      g.Kode.toLowerCase().includes(q) ||
      g.Nama.toLowerCase().includes(q),
  );
});
const openGdgPModal = async () => {
  gdgPQ.value = "";
  try {
    const res = await svc.getGudangProduksiKoli("", userCab.value);
    gdgPList.value = res.data.data || [];
    showGdgPModal.value = true;
  } catch {
    toast.error("Gagal memuat gudang produksi.");
  }
};
const selectGudangProduksi = (item: any) => {
  showGdgPModal.value = false;
  fd.value.GudangProduksiKode = item.Kode;
  fd.value.GudangProduksiNama = item.Nama;
};

// SPK Modal
// Ref untuk input SPK di baris aktif
const activeRowKey = ref<number | null>(null);

const openSpkModal = (rowKey?: number) => {
  activeRowKey.value = rowKey ?? null;
  showSpkModal.value = true;
};

const selectSpk = async (item: any) => {
  showSpkModal.value = false;
  // Jika dipanggil dari baris kosong, hapus dulu baris placeholder itu
  if (activeRowKey.value !== null) {
    const idx = fd.value.Detail.findIndex(
      (r) => r._key === activeRowKey.value && !r.SpkNomor,
    );
    if (idx !== -1) fd.value.Detail.splice(idx, 1);
    activeRowKey.value = null;
  }
  await addSpkToGrid(item.Nomor);
  ensureEmptyRow();
};

// SPG Modal (F2, khusus WH003)
const openSpgModal = () => {
  showSpgModal.value = true;
};
const selectSpg = async (item: any) => {
  showSpgModal.value = false;
  if (fd.value.GudangKode !== "WH003") {
    fd.value.GudangKode = "WH003";
    fd.value.GudangNama = "GUDANG JADI KAOS";
    toast.info("Gudang otomatis menjadi GUDANG JADI KAOS");
  }
  await addSpgToGrid(item.Nomor);
  ensureEmptyRow();
};

// Selalu ada 1 baris kosong di bawah sebagai input area
const ensureEmptyRow = () => {
  const lastRow = fd.value.Detail[fd.value.Detail.length - 1];
  if (!lastRow || lastRow.SpkNomor) {
    fd.value.Detail.push({
      _key: _key++,
      Packing: "",
      SpkNomor: "",
      NamaSpk: "",
      Ukuran: "",
      TotalOrder: 0,
      Size: "",
      QtyOrder: 0,
      Jumlah: 0,
      Koli: 0,
      Jadi: 0,
      Kurang: 0,
      Keterangan: "",
    });
  }
};

// ── Add SPK ke Grid ────────────────────────────────────────────────────
const addSpkToGrid = async (spkNomor: string) => {
  if (!spkNomor) return;
  // Cek duplikat untuk SPK lama (tanpa size)
  const existing = fd.value.Detail.find(
    (r) => r.SpkNomor === spkNomor && !r.Size,
  );
  if (existing) {
    toast.warning(`SPK ${spkNomor} sudah ada di baris.`);
    return;
  }
  try {
    const res = await svc.getSpkDetail(
      spkNomor,
      fd.value.GudangKode,
      (route.query.nomor as string) || "",
    );
    const { detail, detail2 } = res.data.data;

    // Tambah ke Grid 1 — cek duplikat per size
    for (const r of detail) {
      const dup = fd.value.Detail.find(
        (x) => x.SpkNomor === r.SpkNomor && x.Size === r.Size,
      );
      if (!dup) {
        fd.value.Detail.push({ ...r, _key: _key++ });
      }
    }

    // Tambah ke Grid 2 jika WH003
    if (isWH003.value) {
      for (const r of detail2) {
        const dup = fd.value.Detail2.find(
          (x) => x.SpkNomor === r.SpkNomor && x.Size === r.Size,
        );
        if (!dup) {
          fd.value.Detail2.push({ ...r, _key: _key++ });
        }
      }
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "SPK tidak ditemukan.");
  }
};

// ── Add SPG ke Grid ────────────────────────────────────────────────────
const addSpgToGrid = async (spgNomor: string) => {
  if (!spgNomor) return;
  try {
    const res = await svc.getSpgDetail(
      spgNomor,
      (route.query.nomor as string) || "",
    );
    const { detail, detail2 } = res.data.data;

    for (const r of detail) {
      const dup = fd.value.Detail.find(
        (x) => x.SpkNomor === r.SpkNomor && x.Size === r.Size,
      );
      if (!dup) fd.value.Detail.push({ ...r, _key: _key++ });
    }

    if (isWH003.value) {
      for (const r of detail2) {
        const dup = fd.value.Detail2.find(
          (x) =>
            x.SpkNomor === r.SpkNomor &&
            x.KodeKaosan === r.KodeKaosan &&
            x.Size === r.Size,
        );
        if (!dup) fd.value.Detail2.push({ ...r, _key: _key++ });
      }
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "SPG tidak ditemukan.");
  }
};

// ── Load from Packing (btnPacking) ────────────────────────────────────
const showPackingConfirmDialog = ref(false);

// Sesuai Delphi btnPackingClick — load SEMUA packing tersedia
const loadFromPacking = async () => {
  showPackingConfirmDialog.value = true;
};

const confirmLoadPacking = async () => {
  showPackingConfirmDialog.value = false;
  isLoadingPacking.value = true;
  try {
    const res = await svc.getPackingAll();
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Belum ada nomor packing.");
      return;
    }
    fd.value.Detail = [];
    fd.value.Detail2 = [];
    for (const r of rows) {
      fd.value.Detail.push({
        _key: _key++,
        Packing: r.nomor,
        SpkNomor: r.spk,
        NamaSpk: r.spk_nama,
        Ukuran: r.spk_ukuran,
        TotalOrder: r.spk_jumlah,
        Size: r.size,
        QtyOrder: r.qtyorder,
        Jumlah: r.jml,
        Koli: 0,
        Jadi: 0,
        Kurang: r.qtyorder,
        Keterangan: "",
      });
      for (const dc of r.dc || []) {
        fd.value.Detail2.push({
          _key: _key++,
          Packing: r.nomor,
          SpkNomor: r.spk,
          KodeKaosan: dc.brg_kode,
          NamaKaosan: dc.Nama,
          Size: dc.size,
          Jumlah: dc.packd_qty,
        });
      }
    }
    ensureEmptyRow();
    toast.success("Data packing berhasil dimuat.");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal load packing.");
  } finally {
    isLoadingPacking.value = false;
  }
};

// ── Hapus row Grid 1 ──────────────────────────────────────────────────
const removeDetail = (row: DetailRow) => {
  if (!row.SpkNomor) return; // jangan hapus baris kosong
  if (row.Packing && isEditMode.value) {
    toast.warning("Row dengan packing tidak bisa dihapus saat edit.");
    return;
  }
  const idx = fd.value.Detail.indexOf(row);
  if (idx !== -1) fd.value.Detail.splice(idx, 1);

  if (row.Size) {
    fd.value.Detail2 = fd.value.Detail2.filter(
      (r) => !(r.SpkNomor === row.SpkNomor && r.Size === row.Size),
    );
  } else {
    fd.value.Detail2 = fd.value.Detail2.filter(
      (r) => r.SpkNomor !== row.SpkNomor,
    );
  }
  ensureEmptyRow();
};

// ── Watch Jumlah Grid1 → sync ke Grid2 (sesuai Delphi clumlahPropertiesEditValueChanged) ──
const syncJumlahToDetail2 = (row: DetailRow) => {
  if (!row.Size) return;
  fd.value.Detail2.forEach((r) => {
    if (r.SpkNomor === row.SpkNomor && r.Size === row.Size) {
      r.Jumlah = row.Jumlah;
    }
  });
};

// ── Validate & Save ───────────────────────────────────────────────────
const validateSave = () => {
  const validDtl = fd.value.Detail.filter(
    (r) => r.SpkNomor && Number(r.Jumlah) !== 0,
  );

  if (!fd.value.GudangKode) {
    toast.warning("Gudang tidak boleh kosong.");
    return;
  }
  if (!fd.value.GudangProduksiKode) {
    toast.warning("Gudang Produksi tidak boleh kosong.");
    return;
  }
  if (!validDtl.length) {
    toast.warning("Detail harus diisi.");
    return;
  }

  const totalJumlah = validDtl.reduce((s, r) => s + Number(r.Jumlah), 0);
  const totalKoli = validDtl.reduce((s, r) => s + Number(r.Koli), 0);

  if (totalKoli === 0) {
    toast.warning("Qty Koli belum diisi.");
    return;
  }
  if (totalJumlah === 0) {
    toast.warning("Jumlah belum diisi.");
    return;
  }

  if (isWH003.value) {
    const validDtl2 = fd.value.Detail2.filter(
      (r) => r.NamaKaosan && Number(r.Jumlah) !== 0,
    );
    const totalJml2 = validDtl2.reduce((s, r) => s + Number(r.Jumlah), 0);
    if (totalJumlah !== totalJml2) {
      toast.warning("Total Qty STBJ vs Qty DC harus sama.");
      return;
    }
  }

  showSaveDialog.value = true;
};

// ── Print ─────────────────────────────────────────────────────────────
const skipPrint = () => {
  showPrintDialog.value = false;
  router.push({ name: "StbjBrowse" });
};
const doCetak = (mode: "biasa" | "rangkap3" = "biasa") => {
  const url = router.resolve({
    name: "StbjPrint",
    query: { nomor: savedNomor.value, mode },
  }).href;
  window.open(url, "_blank");
  showPrintDialog.value = false;
  router.push({ name: "StbjBrowse" });
};

// ── Lifecycle ─────────────────────────────────────────────────────────
onMounted(async () => {
  if (route.query.nomor) {
    await fetchData();
    ensureEmptyRow();
  } else {
    fd.value.Tanggal = todayLocal();
    fd.value.GudangKode = gudangFromBrowse.value.kode;
    fd.value.GudangNama = gudangFromBrowse.value.nama;
    const gp = defaultGdgProduksi();
    fd.value.GudangProduksiKode = gp.kode;
    fd.value.GudangProduksiNama = gp.nama;
    ensureEmptyRow();
  }
});

// ── Computed summary ──────────────────────────────────────────────────
const totalJumlah = computed(() =>
  fd.value.Detail.reduce((s, r) => s + Number(r.Jumlah || 0), 0),
);
const totalKoli = computed(() =>
  fd.value.Detail.reduce((s, r) => s + Number(r.Koli || 0), 0),
);
const totalJumlah2 = computed(() =>
  fd.value.Detail2.reduce((s, r) => s + Number(r.Jumlah || 0), 0),
);
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah STBJ' : 'Tambah STBJ'"
    menu-id="105"
    :icon="IconClipboardCheck"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="STBJ"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section">
        <div class="sec-title">Header</div>

        <div class="fg">
          <label class="lb w100">Nomor</label>
          <input
            :value="fd.Nomor || '(Otomatis)'"
            readonly
            class="inp ro"
            style="width: 160px"
          />
        </div>
        <div class="fg mt4">
          <label class="lb w100">Tanggal</label>
          <input type="date" v-model="fd.Tanggal" class="inp" />
        </div>
        <div class="fg mt4">
          <label class="lb w100">Gudang</label>
          <div class="ig" style="flex: 1">
            <input
              :value="fd.GudangKode"
              readonly
              class="inp ro"
              style="width: 65px; flex-shrink: 0"
            />
            <input
              :value="fd.GudangNama"
              readonly
              class="inp ro"
              style="flex: 1; min-width: 0"
            />
          </div>
        </div>
        <div class="fg mt4">
          <label class="lb w100">Gdg Produksi</label>
          <div class="ig" style="flex: 1">
            <input
              :value="fd.GudangProduksiKode"
              readonly
              class="inp ro"
              style="width: 65px; flex-shrink: 0"
            />
            <input
              :value="fd.GudangProduksiNama"
              readonly
              class="inp ro"
              style="flex: 1; min-width: 0"
            />
            <button class="ibtn" @click="openGdgPModal">
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
        </div>
        <div class="fg mt4">
          <label class="lb w100">Keterangan</label>
          <input
            v-model="fd.Keterangan"
            class="inp"
            style="flex: 1"
            placeholder="Keterangan..."
          />
        </div>
      </div>

      <!-- Summary -->
      <div class="desktop-form-section">
        <div class="sec-title">Ringkasan</div>
        <div class="fg mt4">
          <label class="lb w100">Total Jumlah</label>
          <span class="summary-val">{{ num(totalJumlah) }}</span>
        </div>
        <div class="fg mt4">
          <label class="lb w100">Total Koli</label>
          <span class="summary-val">{{ num(totalKoli) }}</span>
        </div>
        <div v-if="isWH003" class="fg mt4">
          <label class="lb w100">Total DC</label>
          <span
            class="summary-val"
            :style="
              totalJumlah !== totalJumlah2
                ? 'color:#c62828;font-weight:700'
                : ''
            "
          >
            {{ num(totalJumlah2) }}
            <span
              v-if="totalJumlah !== totalJumlah2"
              style="font-size: 10px; margin-left: 4px"
              >≠ Jumlah!</span
            >
          </span>
        </div>
      </div>
    </template>

    <template #right-column>
      <!-- Tab Header -->
      <div
        class="pf-container"
        style="flex: 1; min-height: 0; display: flex; flex-direction: column"
      >
        <div class="pf-tabs">
          <button
            class="pf-tab"
            :class="{ active: activeTab === 0 }"
            @click="activeTab = 0"
          >
            Komponen SPK
            <span class="tab-badge">{{
              fd.Detail.filter((r) => r.SpkNomor).length
            }}</span>
          </button>
          <button
            v-if="isWH003"
            class="pf-tab"
            :class="{ active: activeTab === 1 }"
            @click="activeTab = 1"
          >
            Detail DC Kaosan
            <span
              class="tab-badge"
              :class="totalJumlah !== totalJumlah2 ? 'badge-red' : ''"
            >
              {{ num(totalJumlah2) }}
            </span>
          </button>
        </div>

        <div class="pf-tab-body">
          <!-- Tab 0: Komponen SPK -->
          <div class="pf-tab-pane" :class="{ active: activeTab === 0 }">
            <div class="dtbar">
              <span class="note"
                >Tekan F1 atau Enter di baris kosong untuk pilih SPK</span
              >
              <div style="display: flex; gap: 6px; margin-left: auto">
                <button
                  v-if="isWH003"
                  class="tbtn tbtn-blue"
                  :disabled="isLoadingPacking"
                  @click="loadFromPacking"
                >
                  <template v-if="isLoadingPacking">
                    <v-progress-circular
                      indeterminate
                      size="11"
                      width="2"
                      color="white"
                      style="margin-right: 4px"
                    />
                    Memuat...
                  </template>
                  <template v-else>
                    <IconPackage :size="12" style="margin-right: 3px" />
                    Load from Packing
                  </template>
                </button>
                <button class="tbtn tbtn-green" @click="openSpkModal()">
                  + SPK
                </button>
                <button
                  v-if="isWH003"
                  class="tbtn tbtn-teal"
                  @click="openSpgModal"
                >
                  + SPG
                </button>
              </div>
            </div>

            <div
              style="
                position: relative;
                flex: 1;
                min-height: 0;
                display: flex;
                flex-direction: column;
              "
            >
              <!-- Loading overlay -->
              <div v-if="isLoadingPacking" class="grid-loading-overlay">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="28"
                  width="3"
                />
                <span>Memuat data packing...</span>
              </div>

              <div class="gwrap">
                <table class="gtbl">
                  <thead>
                    <tr>
                      <th style="width: 24px">#</th>
                      <th v-if="isWH003" style="width: 110px">No. Packing</th>
                      <th style="width: 120px">No. SPK</th>
                      <th style="min-width: 150px">Nama SPK</th>
                      <th style="width: 130px">Ukuran</th>
                      <th style="width: 72px" class="tr">Total Order</th>
                      <th style="width: 60px" class="tc">Size</th>
                      <th style="width: 72px" class="tr">Order</th>
                      <th style="width: 80px" class="tr hl-col">Jumlah</th>
                      <th style="width: 72px" class="tr hl-col">Koli</th>
                      <th style="width: 68px" class="tr">Jadi</th>
                      <th style="width: 68px" class="tr">Kurang</th>
                      <th style="width: 100px">Keterangan</th>
                      <th style="width: 30px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(row, i) in fd.Detail"
                      :key="row._key"
                      :class="[
                        i % 2 === 1 && row.SpkNomor ? 'rs' : '',
                        row.SpkNomor && row.Jumlah > row.Kurang
                          ? 'row-over'
                          : '',
                        !row.SpkNomor ? 'row-empty' : '',
                      ]"
                    >
                      <td class="tc muted" style="font-size: 10px">
                        {{ row.SpkNomor ? i + 1 : "" }}
                      </td>
                      <td v-if="isWH003">
                        <input
                          :value="row.Packing"
                          readonly
                          class="ci mono"
                          style="color: #6a1b9a; font-size: 10px"
                        />
                      </td>
                      <td>
                        <template v-if="!row.SpkNomor">
                          <div
                            style="display: flex; align-items: center; gap: 2px"
                          >
                            <input
                              class="ci mono"
                              placeholder="Enter / F1"
                              style="
                                color: #9e9e9e;
                                font-size: 10px;
                                flex: 1;
                                cursor: text;
                              "
                              @keydown.f1.prevent="openSpkModal(row._key)"
                              @keydown.enter.prevent="openSpkModal(row._key)"
                              @keydown.prevent
                            />
                            <button
                              class="ibtn-sm"
                              tabindex="-1"
                              @click.stop="openSpkModal(row._key)"
                            >
                              <IconSearch :size="9" color="#1565c0" />
                            </button>
                          </div>
                        </template>
                        <input
                          v-else
                          :value="row.SpkNomor"
                          readonly
                          class="ci mono"
                        />
                      </td>
                      <td>
                        <input :value="row.NamaSpk" readonly class="ci" />
                      </td>
                      <td>
                        <input
                          :value="row.Ukuran"
                          readonly
                          class="ci"
                          style="font-size: 10px; color: #555"
                          :title="row.Ukuran"
                        />
                      </td>
                      <td>
                        <input
                          :value="row.SpkNomor ? num(row.TotalOrder) : ''"
                          readonly
                          class="ci tr ro"
                        />
                      </td>
                      <td class="tc">
                        <input
                          :value="row.Size || (row.SpkNomor ? '-' : '')"
                          readonly
                          class="ci tc"
                        />
                      </td>
                      <td>
                        <input
                          :value="row.SpkNomor ? num(row.QtyOrder) : ''"
                          readonly
                          class="ci tr ro"
                        />
                      </td>
                      <td>
                        <input
                          v-if="row.SpkNomor"
                          v-model.number="row.Jumlah"
                          type="number"
                          class="ci tr hl"
                          :readonly="!!row.Packing"
                          @focus="sel"
                          @input="syncJumlahToDetail2(row)"
                        />
                      </td>
                      <td>
                        <input
                          v-if="row.SpkNomor"
                          v-model.number="row.Koli"
                          type="number"
                          class="ci tr hl"
                          @focus="sel"
                        />
                      </td>
                      <td>
                        <input
                          :value="row.SpkNomor ? num(row.Jadi) : ''"
                          readonly
                          class="ci tr ro"
                        />
                      </td>
                      <td>
                        <input
                          v-if="row.SpkNomor"
                          :value="num(row.Kurang)"
                          readonly
                          class="ci tr ro"
                          :style="
                            row.Kurang < 0
                              ? 'color:#c62828;font-weight:700'
                              : ''
                          "
                        />
                      </td>
                      <td>
                        <input
                          v-if="row.SpkNomor"
                          v-model="row.Keterangan"
                          class="ci"
                        />
                      </td>
                      <td class="tc">
                        <button
                          v-if="row.SpkNomor"
                          class="del-btn"
                          @click="removeDetail(row)"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="grid-summary">
                <span
                  >Total: <b>{{ num(totalJumlah) }}</b></span
                >
                <span class="ml16"
                  >Koli: <b>{{ num(totalKoli) }}</b></span
                >
              </div>
            </div>
          </div>

          <!-- Tab 1: Detail DC Kaosan (read-only) -->
          <div
            v-if="isWH003"
            class="pf-tab-pane"
            :class="{ active: activeTab === 1 }"
          >
            <div class="dtbar">
              <span class="note"
                >Data otomatis terisi dari pilihan SPK/SPG</span
              >
              <span
                class="ml8"
                :style="
                  totalJumlah !== totalJumlah2
                    ? 'color:#c62828;font-weight:700;font-size:11px'
                    : 'color:#388e3c;font-size:11px'
                "
              >
                Total DC: <b>{{ num(totalJumlah2) }}</b>
                <span v-if="totalJumlah !== totalJumlah2">
                  ≠ Total SPK {{ num(totalJumlah) }}</span
                >
                <span v-else> ✓</span>
              </span>
            </div>
            <div class="gwrap">
              <table class="gtbl">
                <thead>
                  <tr>
                    <th style="width: 24px">#</th>
                    <th style="width: 110px">No. Packing</th>
                    <th style="width: 120px">No. SPK</th>
                    <th style="width: 130px">Kode Kaosan</th>
                    <th style="min-width: 200px">Nama Kaosan</th>
                    <th style="width: 70px" class="tc">Size</th>
                    <th style="width: 80px" class="tr hl-col">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="fd.Detail2.length">
                    <tr
                      v-for="(row, i) in fd.Detail2"
                      :key="row._key"
                      :class="i % 2 === 1 ? 'rs' : ''"
                    >
                      <td class="tc muted" style="font-size: 10px">
                        {{ i + 1 }}
                      </td>
                      <td>
                        <input
                          :value="row.Packing"
                          readonly
                          class="ci mono"
                          style="color: #6a1b9a; font-size: 10px"
                        />
                      </td>
                      <td>
                        <input :value="row.SpkNomor" readonly class="ci mono" />
                      </td>
                      <td>
                        <input
                          :value="row.KodeKaosan"
                          readonly
                          class="ci mono"
                        />
                      </td>
                      <td>
                        <input :value="row.NamaKaosan" readonly class="ci" />
                      </td>
                      <td class="tc">
                        <input :value="row.Size" readonly class="ci tc" />
                      </td>
                      <td class="tr">
                        <input
                          :value="num(row.Jumlah)"
                          readonly
                          class="ci tr ro"
                          style="font-weight: 600"
                        />
                      </td>
                    </tr>
                  </template>
                  <tr v-else>
                    <td colspan="7" class="tc empty-cell">
                      Belum ada data — pilih SPK/SPG di tab Komponen SPK
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="grid-summary">
              <span
                >Total DC: <b>{{ num(totalJumlah2) }}</b></span
              >
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- ── Modal Gudang Produksi Koli ── -->
  <v-dialog v-model="showGdgPModal" max-width="420px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        Pilih Gudang Produksi (Koli)
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="gdgPQ"
          class="ms"
          placeholder="Cari gudang..."
          autofocus
        />
        <div class="ml">
          <div
            v-for="g in gdgPFiltered"
            :key="g.Kode"
            class="mi"
            @click="selectGudangProduksi(g)"
          >
            <span class="mk">{{ g.Kode }}</span>
            <span>{{ g.Nama }}</span>
          </div>
          <div v-if="!gdgPFiltered.length" class="me">Tidak ada gudang</div>
        </div>
      </v-card-text>
      <v-card-actions class="pa-2">
        <v-spacer /><v-btn
          size="small"
          variant="text"
          @click="showGdgPModal = false"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Modal SPK ── -->
  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="mutasi"
    @selected="selectSpk"
  />

  <!-- ── Modal SPG (WH003) ── -->
  <SpgSearchModal v-model="showSpgModal" @selected="selectSpg" />

  <!-- ── Dialog Print ── -->
  <v-dialog v-model="showPrintDialog" max-width="380px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Cetak STBJ
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Data <b>{{ savedNomor }}</b> berhasil disimpan.<br />
        Pilih jenis cetakan:
      </v-card-text>
      <v-card-actions class="pa-3 border-t" style="gap: 8px">
        <v-btn variant="text" size="small" @click="skipPrint">Tidak</v-btn>
        <v-spacer />
        <v-btn
          variant="outlined"
          size="small"
          color="primary"
          @click="doCetak('biasa')"
        >
          Biasa (2x)
        </v-btn>
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          @click="doCetak('rangkap3')"
        >
          Rangkap 3
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ── Dialog Konfirmasi Load Packing ── -->
  <v-dialog v-model="showPackingConfirmDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        <IconPackage :size="15" style="margin-right: 6px" />
        Load dari Packing
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        Data grid akan direset dan diisi ulang dari semua packing yang
        tersedia.<br />
        <span style="color: #e65100; font-size: 11px"
          >Data yang sudah diinput akan terhapus.</span
        >
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn
          variant="text"
          size="small"
          @click="showPackingConfirmDialog = false"
        >
          Batal
        </v-btn>
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          :loading="isLoadingPacking"
          @click="confirmLoadPacking"
        >
          Ya, Load
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.fg {
  display: flex;
  align-items: center;
  gap: 5px;
}
.mt4 {
  margin-top: 4px;
}
.ml8 {
  margin-left: 8px;
}
.ml16 {
  margin-left: 16px;
}
.lb {
  font-size: 11px;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
}
.w100 {
  width: 100px;
  flex-shrink: 0;
}
.note {
  font-size: 10px;
  color: #777;
}
.tr {
  text-align: right;
}
.tc {
  text-align: center;
}
.muted {
  color: #9e9e9e;
}

.sec-title {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 3px;
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
.ibtn {
  width: 24px;
  min-width: 24px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ibtn:hover {
  background: #bbdefb;
}

.summary-val {
  font-size: 13px;
  font-weight: 700;
  color: #1565c0;
}

.dtbar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-shrink: 0;
}
.gwrap {
  flex: 1;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  min-height: 0;
}
.gtbl {
  border-collapse: collapse;
  font-size: 11px;
  min-width: max-content;
  width: 100%;
}
.gtbl th {
  background: #1565c0;
  color: white;
  padding: 3px 4px;
  font-weight: 700;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}
.gtbl td {
  padding: 2px 2px;
  border-bottom: 0.3px solid #e0e0e0;
  vertical-align: middle;
}
.rs td {
  background: #fafafa;
}
.row-over td {
  background: #fff3e0 !important;
}
.hl-col {
  background: #0d47a1 !important;
}

.ci {
  width: 100%;
  height: 22px;
  border: none;
  outline: none;
  padding: 0 3px;
  font-size: 11px;
  background: transparent;
  font-family: inherit;
}
.ci:focus {
  background: #fffde7;
  outline: 1px solid #1565c0;
  border-radius: 2px;
}
.ci[readonly] {
  color: #666;
  background: transparent;
}
.ci.tr {
  text-align: right;
}
.ci.tc {
  text-align: center;
}
.ci.hl {
  background: #fffde7 !important;
}
.mono {
  font-family: monospace;
  font-size: 10px;
  color: #1565c0;
  font-weight: 600;
}

.del-btn {
  width: 18px;
  height: 18px;
  border: 1px solid #ffcdd2;
  border-radius: 2px;
  background: #ffebee;
  color: #c62828;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.del-btn:hover {
  background: #ffcdd2;
}

.grid-summary {
  background: #1565c0;
  color: white;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.tbtn {
  height: 24px;
  padding: 0 8px;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  white-space: nowrap;
}
.tbtn:disabled {
  opacity: 0.4;
  cursor: default;
}
.tbtn-green {
  background: #388e3c;
  color: white;
}
.tbtn-teal {
  background: #00796b;
  color: white;
}
.tbtn-blue {
  background: #1565c0;
  color: white;
}

.empty-cell {
  padding: 20px;
  color: #9e9e9e;
  font-size: 11px;
  font-style: italic;
}

/* Lookup modal styles */
.lookup-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-size: 12px;
  max-height: 80vh;
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
}
.lookup-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
}
.lookup-search {
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}
.search-input {
  width: 100%;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  height: 28px;
  font-size: 12px;
  outline: none;
}
.lookup-table-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 160px;
}
.lookup-table {
  width: 100%;
  border-collapse: collapse;
}
.lookup-table thead tr {
  position: sticky;
  top: 0;
}
.lookup-table th {
  background: #1565c0;
  color: white;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 700;
  text-align: left;
}
.lookup-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #f0f0f0;
}
.lookup-row {
  cursor: pointer;
}
.lookup-row:hover td {
  background: #e3f2fd;
}
.td-kode {
  font-family: monospace;
  color: #1565c0;
  font-weight: 600;
}

/* Inline modal styles */
.ms {
  width: 100%;
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 7px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
  margin-bottom: 6px;
}
.ms:focus {
  border-color: #1565c0;
}
.ml {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
}
.mi {
  display: flex;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 12px;
  border-bottom: 1px solid #f5f5f5;
}
.mi:hover {
  background: #e3f2fd;
}
.mk {
  font-weight: 700;
  width: 65px;
  flex-shrink: 0;
  font-family: monospace;
  font-size: 10px;
}
.me {
  padding: 12px;
  text-align: center;
  font-size: 11px;
  color: #9e9e9e;
  font-style: italic;
}

.row-empty td {
  background: #fafffe !important;
}
.row-empty:hover td {
  background: #e8f5e9 !important;
}

.ibtn-sm {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 2px;
  cursor: pointer;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.ibtn-sm:hover {
  background: #bbdefb;
}

/* Tab styles */
.pf-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #1565c0;
  flex-shrink: 0;
}
.pf-tab {
  padding: 5px 14px;
  border: none;
  background: #e3f2fd;
  color: #1565c0;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 4px 4px 0 0;
  border: 1px solid #90caf9;
  border-bottom: none;
  display: flex;
  align-items: center;
  gap: 5px;
}
.pf-tab.active {
  background: #1565c0;
  color: white;
}
.pf-tab:hover:not(.active) {
  background: #bbdefb;
}

.pf-tab-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pf-tab-pane {
  display: none;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}
.pf-tab-pane.active {
  display: flex;
}

.tab-badge {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 1px 5px;
  font-size: 10px;
}
.pf-tab:not(.active) .tab-badge {
  background: #1565c0;
  color: white;
}
.badge-red {
  background: #c62828 !important;
  color: white !important;
}

.grid-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  color: #1565c0;
  font-weight: 600;
  border-radius: 3px;
}
</style>
