<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconPrinter, IconSearch } from "@tabler/icons-vue";
import api from "@/services/api";

import MapSearchModal from "@/components/lookups/MapSearchModal.vue";
import AccesoriesSearchModal from "@/components/lookups/AccesoriesSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";

interface RouteParams {
  nomor?: string;
}

interface Komponen {
  kode: string;
  bhn_name: string;
  bhn_satuan: string;
  komponen: string;
  warna: string;
  babaran: number;
  babarank: number;
}

interface Aksesoris {
  kode: string;
  nama: string;
  satuan: string;
  qty: number;
  note: string;
}

interface SizeBreakdown {
  komponen: string;
  size: string;
  babaran: number;
}

interface Header {
  mspk_nomor: string;
  mspk_tanggal: string;
  mspk_nama: string;
  mspk_nama2: string;
  mspk_ukuran: string;
  mspk_kain: string;
  mspk_finishing: string;
  mspk_kendala: string;
  mspk_jumlah_jadi: number;
  mspk_tipe: string;
  mspk_gramasi: string;
  mspk_rencana_size: string;
  mspk_keterangan: string;
}

const router = useRouter();
const toast = useToast();
const activeTab = ref(0);
const showMapModal = ref(false);
const showAccModal = ref(false);
const activeAccIdx = ref(-1);
const showPrintDialog = ref(false);
const savedNomor = ref("");
const showBahanModal = ref(false);
const activeBahanIdx = ref(-1);
const listKomponen = ref<string[]>([]);
let cachedSizesNomor = "";
let cachedSizes: any[] | null = null;
let hasWarnedNoSizes = false;

function normalizeHeader(h: any) {
  return {
    mspk_nomor: h.mspk_nomor ?? h.MSPK_Nomor ?? "",
    mspk_tanggal: h.mspk_tanggal ?? h.Mspk_Tanggal ?? "",
    mspk_nama: h.mspk_nama ?? h.Mspk_nama ?? "",
    mspk_nama2: h.mspk_nama2 ?? h.Mspk_nama2 ?? "",
    mspk_ukuran: h.mspk_ukuran ?? h.Mspk_ukuran ?? "",
    mspk_kain: h.mspk_kain ?? h.Mspk_kain ?? "",
    mspk_finishing: h.mspk_finishing ?? h.Mspk_finishing ?? "",
    mspk_kendala: h.mspk_kendala ?? h.Mspk_kendala ?? "",
    mspk_jumlah_jadi: h.mspk_jumlah_jadi ?? h.Mspk_jumlah ?? 0,
    mspk_tipe: h.mspk_tipe ?? h.Mspk_tipe ?? "",
    mspk_gramasi: h.mspk_gramasi ?? h.Mspk_gramasi ?? "",
    mspk_rencana_size: h.mspk_rencana_size ?? h.Mspk_rencana_size ?? "",
    mspk_keterangan: h.mspk_keterangan ?? h.Mspk_keterangan ?? "",
  };
}

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";

  const d = new Date(value);

  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const initialData: {
  header: Header;
  checklist: any[];
  komponen: Komponen[];
  aksesoris: Aksesoris[];
  obat: any[];
  sizeBreakdown: SizeBreakdown[];
  lock: any;
  isLocked: boolean;
  isApproved: boolean;
  alasanApproval: string;
  payloadLock?: {
    isLocked: boolean;
    isApproved: boolean;
    alasan: string;
  };
} = {
  header: {
    mspk_nomor: "",
    mspk_tanggal: formatDateLocal(new Date()),
    mspk_nama: "",
    mspk_nama2: "",
    mspk_ukuran: "",
    mspk_kain: "",
    mspk_finishing: "",
    mspk_kendala: "",
    mspk_jumlah_jadi: 0,
    mspk_tipe: "Premium",
    mspk_gramasi: "",
    mspk_rencana_size: "",
    mspk_keterangan: "",
  },
  checklist: [],
  komponen: [],
  aksesoris: [],
  obat: [],
  sizeBreakdown: [],
  lock: null,
  isLocked: false,
  isApproved: false,
  alasanApproval: "",
};

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
  params,
} = useForm<typeof initialData, RouteParams>({
  menuId: "117",
  initialData,
  fetchApi: async (): Promise<typeof initialData> => {
    const res = await api.get<{ data: typeof initialData }>(
      `/garmen/cetak-bast/form/${encodeURIComponent(params.nomor ?? "")}`,
    );

    const data = res.data.data;

    // Normalisasi header
    data.header = normalizeHeader(data.header);

    if (data.aksesoris && data.aksesoris.length > 0) {
      data.aksesoris = data.aksesoris.map((acc: any) => ({
        kode: acc.kode || "",
        nama: acc.acc_nama || acc.nama || "", // Ambil dari acc_nama
        satuan: acc.acc_satuan || acc.satuan || "", // Ambil dari acc_satuan
        qty: Number(acc.qty) || 0,
        note: acc.acc_note || acc.note || "", // Ambil dari acc_note
      }));
    }

    // Set status lock
    if (data.lock) {
      data.isLocked = true;
      data.isApproved = data.lock.apv === "Y";
      data.alasanApproval = data.lock.alasan || "";
    }

    return data;
  },
  submitApi: async (data) => await api.post("/garmen/cetak-bast/form", data),
  onSuccess: (res: any) => {
    toast.success("Data BAST berhasil disimpan.");
    savedNomor.value =
      formData.value.header.mspk_nomor || formData.value.header.mspk_nomor;
    showPrintDialog.value = true;
  },
});

// ── SINKRONISASI: Babaran di grid Bahan (komponen) ↔ Keterangan
// checklist no.8 (Babaran), dan propagasi ke Babaran per Size.
// Guard flag mencegah watcher saling memicu tak terbatas (infinite loop).
const isSyncingBabaran = ref(false);

const buildKeteranganFromKomponen = () => {
  const parts = formData.value.komponen
    .filter((k: any) => k.komponen && k.komponen.trim())
    .map((k: any) => `${k.komponen}=${k.babaran ?? 0}`);
  return parts.length > 0 ? parts.join(", ") : "-";
};

// Arah 1: Bahan (komponen.babaran) → Keterangan checklist no.8 — LIVE,
// karena teks yang dihasilkan murni programatik (bukan ketikan user).
watch(
  () => formData.value.komponen,
  () => {
    if (isSyncingBabaran.value) return;
    const check8 = formData.value.checklist.find(
      (c: any) => Number(c.no) === 8,
    );
    if (!check8) return;
    isSyncingBabaran.value = true;
    check8.keterangan = buildKeteranganFromKomponen();
    nextTick(() => {
      isSyncingBabaran.value = false;
    });
  },
  { deep: true },
);

// Arah 2: Keterangan checklist no.8 → Bahan (komponen.babaran) — dipicu
// saat blur (bukan tiap ketikan), parse format "KOMPONEN=nilai, ...".
const onKeterangan8Blur = () => {
  if (isSyncingBabaran.value) return;
  const check8 = formData.value.checklist.find((c: any) => Number(c.no) === 8);
  if (!check8 || !check8.keterangan || check8.keterangan === "-") return;

  const parts = check8.keterangan
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  isSyncingBabaran.value = true;
  parts.forEach((p: string) => {
    const [komp, val] = p.split("=").map((s: string) => s.trim());
    if (!komp || val === undefined || isNaN(Number(val))) return;
    const row = formData.value.komponen.find((k: any) => k.komponen === komp);
    if (row) {
      row.babaran = Number(val);
      syncBabaranToSizeBreakdown(row);
    }
  });
  nextTick(() => {
    isSyncingBabaran.value = false;
  });
};

// Arah 3: Bahan (komponen.babaran) → Babaran per Size — begitu babaran
// suatu komponen diisi:
// - Kalau sudah ada baris size untuk komponen itu, update nilainya.
// - Kalau belum ada sama sekali, auto-generate baris dari daftar size MAP.
const syncBabaranToSizeBreakdown = async (k: any) => {
  const komponenStr = (k.komponen || "").trim();
  if (!komponenStr) return;

  const existingRows = formData.value.sizeBreakdown.filter(
    (s: any) => s.komponen === komponenStr,
  );

  if (existingRows.length > 0) {
    existingRows.forEach((s: any) => {
      s.babaran = k.babaran;
    });
    return;
  }

  const nomor =
    formData.value.header.mspk_nomor || formData.value.header.mspk_nomor;

  // Cache: kalau nomor MAP sama dengan cache sebelumnya, pakai hasil
  // yang sudah diambil, jangan hit API lagi.
  if (cachedSizesNomor !== nomor) {
    cachedSizesNomor = nomor;
    cachedSizes = null;
    hasWarnedNoSizes = false;
    try {
      const res = await api.get(
        `/garmen/cetak-bast/form/${encodeURIComponent(nomor)}/sizes`,
      );
      cachedSizes = res.data.data || [];
    } catch (error: any) {
      console.error(
        "Gagal mengambil daftar size MAP untuk sinkronisasi",
        error,
      );
      toast.error(
        `Gagal memuat daftar size dari server: ${error.response?.data?.message || error.message}`,
      );
      cachedSizes = [];
    }
  }

  if (cachedSizes && cachedSizes.length > 0) {
    cachedSizes.forEach((sz: any) => {
      formData.value.sizeBreakdown.push({
        komponen: komponenStr,
        size: sz.mspks_size,
        babaran: k.babaran,
      });
    });
  } else if (!hasWarnedNoSizes) {
    // Toast cuma sekali per pemilihan MAP, bukan per komponen.
    hasWarnedNoSizes = true;
    toast.warning(
      `Tidak ditemukan data ukuran/size untuk MAP ini. Babaran per Size perlu diisi manual.`,
    );
  }
};

const onMapSelected = async (map: any) => {
  isLoading.value = true;
  try {
    const res = await api.get(
      `/garmen/cetak-bast/form/${encodeURIComponent(map.Nomor)}`,
    );
    const data = res.data.data;
    data.header = normalizeHeader(data.header);

    if (data.aksesoris && data.aksesoris.length > 0) {
      data.aksesoris = data.aksesoris.map((acc: any) => ({
        kode: acc.kode || "",
        nama: acc.acc_nama || acc.nama || "",
        satuan: acc.acc_satuan || acc.satuan || "",
        qty: Number(acc.qty) || 0,
        note: acc.acc_note || acc.note || "",
      }));
    }
    if (data.lock) {
      data.isLocked = true;
      data.isApproved = data.lock.apv === "Y";
      data.alasanApproval = data.lock.alasan || "";
    } else {
      data.isLocked = false;
      data.isApproved = false;
      data.alasanApproval = "";
    }
    formData.value = data;
    showMapModal.value = false;

    // Reset cache size — MAP baru dipilih, cache lama (kalau ada) sudah
    // tidak relevan.
    cachedSizesNomor = "";
    cachedSizes = null;
    hasWarnedNoSizes = false;

    await nextTick();
    for (const k of formData.value.komponen) {
      if (k.komponen && Number(k.babaran) !== 0) {
        await syncBabaranToSizeBreakdown(k);
      }
    }
  } catch (e: any) {
    toast.error("Gagal memuat data MAP: " + e.message);
  } finally {
    isLoading.value = false;
  }
};

const onBahanSelected = (item: any) => {
  if (activeBahanIdx.value >= 0) {
    const row = formData.value.komponen[activeBahanIdx.value];
    row.kode = item.Kode;
    row.bhn_name = item.Nama;
    row.bhn_satuan = item.Satuan;
  }
};

const openBahanModal = (idx: number) => {
  activeBahanIdx.value = idx;
  showBahanModal.value = true;
};

const onBabaranChange = async (k: any) => {
  const komponenStr = (k.komponen || "").trim();
  if (!komponenStr) {
    toast.warning("Komponen silahkan di isi dulu ya");
    k.babaran = 0;
    return;
  }
  await syncBabaranToSizeBreakdown(k);
};

const addAccRow = () =>
  formData.value.aksesoris.push({
    kode: "",
    nama: "",
    satuan: "",
    qty: 0,
    note: "",
  });
const removeAccRow = (i: number) => formData.value.aksesoris.splice(i, 1);
const addSizeRow = () =>
  formData.value.sizeBreakdown.push({ komponen: "", size: "", babaran: 0 });
const removeSizeRow = (i: number) => formData.value.sizeBreakdown.splice(i, 1);

const fmtDateTime = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const onKeteranganFocus = (c: any) => {
  if (c.keterangan === "-") {
    c.keterangan = "";
  }
};

const onAccSelected = (item: any) => {
  if (activeAccIdx.value >= 0) {
    const row = formData.value.aksesoris[activeAccIdx.value];
    row.kode = item.Kode;
    row.nama = item.Nama;
    row.satuan = item.Satuan;
    row.note = item.Note;
  }
};

const openAccModal = (idx: number) => {
  activeAccIdx.value = idx;
  showAccModal.value = true;
};

const addBahanRow = () =>
  formData.value.komponen.push({
    kode: "",
    bhn_name: "",
    bhn_satuan: "",
    komponen: "",
    warna: "",
    babaran: 0,
    babarank: 0,
  });
const removeBahanRow = (i: number) => formData.value.komponen.splice(i, 1);

const validateBeforeSave = () => {
  const data = formData.value;

  if (!data.header.mspk_nomor && !data.header.mspk_nomor) {
    toast.error("Pilih MAP terlebih dahulu.");
    return false;
  }

  if (!data.header.mspk_tipe) {
    toast.error("Tipe MAP belum dipilih.");
    return false;
  }

  if (data.isApproved && !data.alasanApproval) {
    toast.error("Alasan Approval harus diisi.");
    return false;
  }

  let isLocked = false;
  let keteranganBabaran = "";
  let isBahanValid = true;

  // Cek Grid Komponen (Bahan)
  for (const k of data.komponen) {
    if (!k.komponen) continue;

    // 1. Kumpulkan teks untuk checklist no 8
    keteranganBabaran += `${k.komponen}=${k.babaran}, `;

    // 2. Validasi bahan kosong
    if (!k.bhn_name) {
      isBahanValid = false;
    }

    // 3. Cek Lock: Babaran kosong atau < Kalkulasi
    if (Number(k.babaran) === 0 || Number(k.babaran) < Number(k.babarank)) {
      isLocked = true;
    }
  }

  if (!isBahanValid) {
    toast.error("Bahan belum diinput (Ada komponen tanpa nama bahan).");
    return false;
  }

  // Update otomatis Checklist No 8 (Babaran)
  const check8 = data.checklist.find((c: any) => Number(c.no) === 8);
  if (check8 && keteranganBabaran) {
    check8.keterangan = keteranganBabaran.slice(0, -2); // Hapus koma & spasi terakhir
  }

  // Jika kondisi memaksa lock, timpa state isLocked
  if (isLocked) {
    data.isLocked = true;
    // Jika BAST di-lock tapi user belum centang approval, beritahu
    if (!data.isApproved) {
      toast.warning("BAST On Progress (Babaran < Kalkulasi). Tunggu Approval.");
    }
  } else {
    // Jika aman, buka gemboknya
    data.isLocked = false;
  }

  // Persiapkan payload final untuk dikirim ke backend
  // Kita tambahkan properties lock ke payload
  data.payloadLock = {
    isLocked: data.isLocked,
    isApproved: data.isApproved,
    alasan: data.alasanApproval,
  };

  return true;
};

const fetchListKomponen = async () => {
  try {
    const res = await api.get("/lookups/komponen");
    listKomponen.value = res.data.data || [];
  } catch (error) {
    console.error("Gagal memuat list komponen", error);
  }
};

const handlePrint = () => {
  window.open(
    `/garmen/cetak-bast/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  router.push("/garmen/cetak-bast");
};

onMounted(() => {
  fetchListKomponen(); // Ambil list dropdown komponen
  if (isEditMode.value) fetchData();
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah BAST MAP' : 'Cetak BAST MAP Baru'"
    menu-id="117"
    :icon="IconPrinter"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="
      () => {
        // Cek validasi DULU sebelum buka dialog
        if (validateBeforeSave()) {
          showSaveDialog = true;
        }
      }
    "
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ── Kolom kiri: field header MAP ── -->
    <template #left-column>
      <div class="bast-card">
        <div class="f-row">
          <label class="f-lbl">No Pra SPK</label>
          <div class="inp-grp" style="flex: 1">
            <input
              :value="formData.header.mspk_nomor || formData.header.mspk_nomor"
              readonly
              class="f-inp f-ro"
              style="font-weight: 600; color: #1565c0"
              placeholder="Pilih MAP..."
            />
            <button
              v-if="!isEditMode"
              type="button"
              class="btn-lkp"
              @click="showMapModal = true"
            >
              <IconSearch :size="12" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="f-row">
          <label class="f-lbl">Tanggal</label>
          <input
            type="date"
            :value="formatDateLocal(formData.header.mspk_tanggal)"
            @input="(e: any) => (formData.header.mspk_tanggal = e.target.value)"
            class="f-date"
            style="width: 140px"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Nama Pekerjaan</label>
          <input
            :value="formData.header.mspk_nama || formData.header.mspk_nama"
            readonly
            class="f-inp f-ro"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Nama Ext</label>
          <input
            :value="formData.header.mspk_nama2 || formData.header.mspk_nama2"
            readonly
            class="f-inp f-ro"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Ukuran</label>
          <input
            :value="formData.header.mspk_ukuran || formData.header.mspk_ukuran"
            readonly
            class="f-inp f-ro"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Kain</label>
          <input
            :value="formData.header.mspk_kain || formData.header.mspk_kain"
            readonly
            class="f-inp f-ro"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Finishing</label>
          <input
            :value="
              formData.header.mspk_finishing || formData.header.mspk_finishing
            "
            readonly
            class="f-inp f-ro"
          />
        </div>

        <div class="f-divider" />

        <div class="f-row">
          <label class="f-lbl">Kendala</label>
          <input
            v-model="formData.header.mspk_kendala"
            class="f-inp"
            placeholder="Input kendala produksi..."
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Jumlah</label>
          <input
            type="number"
            :value="
              formData.header.mspk_jumlah_jadi ||
              formData.header.mspk_jumlah_jadi ||
              0
            "
            @input="
              (e: any) =>
                (formData.header.mspk_jumlah_jadi = Number(e.target.value))
            "
            class="f-inp f-yellow"
            style="max-width: 100px; text-align: right; font-weight: 600"
            v-select-on-focus
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Tipe</label>
          <select
            v-model="formData.header.mspk_tipe"
            class="f-inp f-sel"
            style="max-width: 120px"
          >
            <option value="">—</option>
            <option value="Premium">Premium</option>
            <option value="Medium">Medium</option>
          </select>
        </div>

        <div class="f-row">
          <label class="f-lbl">Gramasi</label>
          <input
            :value="
              formData.header.mspk_gramasi || formData.header.mspk_gramasi
            "
            readonly
            class="f-inp f-ro"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Rencana Size</label>
          <input
            :value="
              formData.header.mspk_rencana_size ||
              formData.header.mspk_rencana_size
            "
            readonly
            class="f-inp f-ro"
          />
        </div>

        <!-- Approval panel -->
        <div v-if="formData.isLocked" class="approval-panel mt-2">
          <label class="apv-lbl">
            <input
              type="checkbox"
              v-model="formData.isApproved"
              style="accent-color: #1565c0"
            />
            Approval
          </label>
          <div class="f-row mt-1">
            <label class="f-lbl" style="width: 55px">Alasan</label>
            <input
              v-model="formData.alasanApproval"
              class="f-inp"
              placeholder="Input alasan..."
            />
          </div>
        </div>
      </div>
    </template>

    <!-- ── Kolom tengah: tab BAST/Bahan/Acc/Size ── -->
    <template #center-column>
      <div
        class="bast-card"
        style="display: flex; flex-direction: column; height: 100%"
      >
        <!-- Tab nav native -->
        <div class="tab-nav">
          <button
            v-for="(t, i) in ['BAST & Bahan', 'Accesories', 'Babaran per Size']"
            :key="i"
            class="tab-btn"
            :class="{ active: activeTab === i }"
            @click="activeTab = i"
          >
            {{ t }}
          </button>
        </div>

        <!-- Tab 0: BAST & Bahan -->
        <div
          v-show="activeTab === 0"
          style="
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-height: 0;
            overflow-y: auto;
          "
        >
          <div class="sec-title">Bahan :</div>
          <div style="overflow: auto; flex: 0 0 auto; max-height: 260px">
            <table class="bt">
              <thead>
                <tr>
                  <th style="width: 28px">No</th>
                  <th style="width: 110px; text-align: left">Komponen</th>
                  <th class="th-yellow" style="width: 90px; text-align: left">
                    Warna
                  </th>
                  <th class="th-yellow" style="width: 70px; text-align: right">
                    Babaran
                  </th>
                  <th style="width: 120px">Kode</th>
                  <th style="text-align: left; width: 180px">Nama Bahan</th>
                  <th style="width: 50px">Satuan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(k, i) in formData.komponen" :key="i">
                  <td class="tc">{{ i + 1 }}</td>
                  <td class="p0">
                    <select
                      v-model="k.komponen"
                      class="cell-inp font-weight-bold"
                      :style="k.babarank > 0 ? 'color: #1565c0;' : ''"
                    >
                      <option value="" disabled>Pilih...</option>
                      <option
                        v-for="comp in listKomponen"
                        :key="comp"
                        :value="comp"
                      >
                        {{ comp }}
                      </option>
                    </select>
                  </td>
                  <td class="p0">
                    <input v-model="k.warna" class="cell-inp" />
                  </td>
                  <td class="p0">
                    <input
                      type="number"
                      v-model.number="k.babaran"
                      @change="onBabaranChange(k)"
                      class="cell-inp tr fw"
                      :style="k.babaran < k.babarank ? 'color:#d32f2f' : ''"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <div class="inp-grp" style="border: none; height: 22px">
                      <input
                        v-model="k.kode"
                        class="cell-inp tc"
                        style="font-family: monospace; background: #e3f2fd"
                        placeholder="F1/Enter cari..."
                        @keydown.enter.prevent="openBahanModal(i)"
                        @keydown.f1.prevent="openBahanModal(i)"
                      />
                      <button
                        type="button"
                        class="btn-lkp"
                        style="
                          border: none;
                          border-left: 1px solid #ddd;
                          background: #e3f2fd;
                        "
                        @click="openBahanModal(i)"
                      >
                        <IconSearch :size="12" color="#1565c0" />
                      </button>
                    </div>
                  </td>
                  <td
                    style="
                      background: #f5f5f5;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                      max-width: 180px;
                    "
                  >
                    {{ k.bhn_name }}
                  </td>
                  <td class="tc" style="background: #f5f5f5">
                    <div class="d-flex align-center justify-space-between px-1">
                      <span>{{ k.bhn_satuan }}</span>
                      <button
                        type="button"
                        class="del-btn"
                        style="width: 16px; height: 16px; font-size: 9px"
                        @click="removeBahanRow(i)"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <button type="button" class="add-row-btn" @click="addBahanRow">
              + Tambah Baris
            </button>
          </div>
          <div class="f-divider" />
          <div class="sec-title">Kesesuaian :</div>
          <div style="overflow: auto; flex: 1; min-height: 0">
            <table class="bt" style="table-layout: fixed; min-width: 760px">
              <thead>
                <tr>
                  <th style="width: 28px">No</th>
                  <th style="text-align: left">Kesesuaian</th>
                  <th class="th-yellow" style="width: 48px">Y/N</th>
                  <th class="th-yellow" style="width: 180px; text-align: left">
                    Keterangan
                  </th>
                  <th style="width: 55px">Created</th>
                  <th style="width: 90px">Date Create</th>
                  <th style="width: 55px">Modified</th>
                  <th style="width: 90px">Date Modify</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in formData.checklist" :key="c.no">
                  <td class="tc">{{ c.no }}</td>
                  <td>{{ c.kesesuaian }}</td>
                  <td class="tc p0">
                    <select
                      v-model="c.status"
                      class="cell-inp tc"
                      :style="
                        c.status === 'Y'
                          ? 'background:#1565c0;color:white;font-weight:700'
                          : ''
                      "
                    >
                      <option value="Y">Y</option>
                      <option value="N">N</option>
                    </select>
                  </td>
                  <td class="p0">
                    <input
                      v-model="c.keterangan"
                      class="cell-inp"
                      @focus="onKeteranganFocus(c)"
                      @blur="
                        Number(c.no) === 8 ? onKeterangan8Blur() : undefined
                      "
                    />
                  </td>
                  <td class="tc muted">{{ c.user_create || "" }}</td>
                  <td class="muted">{{ fmtDateTime(c.date_create) }}</td>
                  <td class="tc muted">{{ c.user_modify || "" }}</td>
                  <td class="muted">{{ fmtDateTime(c.date_modify) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="f-divider" />
        </div>

        <!-- Tab 1: Accesories -->
        <div v-show="activeTab === 1" style="flex: 1; overflow-y: auto">
          <table class="bt">
            <thead>
              <tr>
                <th style="width: 28px">No</th>
                <th style="width: 140px">Kode</th>
                <th style="text-align: left">Nama Accesories</th>
                <th style="width: 60px">Satuan</th>
                <th style="text-align: left">Note</th>
                <th class="th-yellow" style="width: 70px; text-align: right">
                  Jml/Kaos
                </th>
                <th style="width: 32px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(a, i) in formData.aksesoris" :key="i">
                <td class="tc">{{ i + 1 }}</td>
                <td class="p0">
                  <div class="inp-grp" style="border: none; height: 24px">
                    <input
                      v-model="a.kode"
                      class="cell-inp tc"
                      style="font-family: monospace"
                      placeholder="F1/Enter cari..."
                      @keydown.enter.prevent="openAccModal(i)"
                      @keydown.f1.prevent="openAccModal(i)"
                    />
                    <button
                      type="button"
                      class="btn-lkp"
                      style="border: none; border-left: 1px solid #ddd"
                      @click="openAccModal(i)"
                    >
                      <IconSearch :size="12" color="#1565c0" />
                    </button>
                  </div>
                </td>
                <td style="background: #f5f5f5">{{ a.nama }}</td>
                <td class="tc" style="background: #f5f5f5">
                  {{ a.satuan }}
                </td>
                <td class="p0"><input v-model="a.note" class="cell-inp" /></td>
                <td class="p0">
                  <input
                    type="number"
                    v-model.number="a.qty"
                    class="cell-inp tr"
                    v-select-on-focus
                  />
                </td>
                <td class="tc">
                  <button
                    type="button"
                    class="del-btn"
                    @click="removeAccRow(i)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <button type="button" class="add-row-btn" @click="addAccRow">
            + Tambah Baris
          </button>
        </div>

        <!-- Tab 2: Babaran per Size -->
        <div v-show="activeTab === 2" style="flex: 1; overflow-y: auto">
          <table class="bt" style="max-width: 460px">
            <thead>
              <tr>
                <th style="width: 140px; text-align: left">Komponen</th>
                <th style="width: 90px; text-align: left">Size</th>
                <th class="th-yellow" style="width: 100px; text-align: right">
                  Babaran
                </th>
                <th style="width: 32px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in formData.sizeBreakdown" :key="i">
                <td class="p0">
                  <input v-model="s.komponen" class="cell-inp" />
                </td>
                <td class="p0">
                  <input v-model="s.size" class="cell-inp tc" />
                </td>
                <td class="p0">
                  <input
                    type="number"
                    v-model.number="s.babaran"
                    class="cell-inp tr"
                    v-select-on-focus
                  />
                </td>
                <td class="tc">
                  <button
                    type="button"
                    class="del-btn"
                    @click="removeSizeRow(i)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <button type="button" class="add-row-btn" @click="addSizeRow">
            + Tambah Baris
          </button>
        </div>

        <!-- NOTE box -->
        <div class="note-box">
          <strong>NOTE:</strong> Jika
          <strong>Babaran &lt; Babaran Kalkulasi</strong> (warna font merah)
          atau Pemakaian obat tidak diinput — BAST MAP dianggap masih
          <strong>On Progress</strong>. Dalam 6 hari jika tidak diselesaikan
          Anda tidak akan bisa membuat Bast MAP.
        </div>
      </div>
    </template>

    <!-- ── Kolom kanan: Keterangan MAP ── -->
    <template #right-column>
      <div
        class="bast-card"
        style="display: flex; flex-direction: column; height: 100%"
      >
        <div class="sec-title">Keterangan MAP</div>
        <textarea
          :value="
            formData.header.mspk_keterangan || formData.header.mspk_keterangan
          "
          readonly
          class="ket-textarea"
          style="flex: 1"
        ></textarea>
      </div>
    </template>
  </BaseForm>

  <MapSearchModal v-model="showMapModal" @selected="onMapSelected" />
  <AccesoriesSearchModal v-model="showAccModal" @selected="onAccSelected" />
  <BahanSearchModal
    v-model="showBahanModal"
    mode="all"
    @selected="onBahanSelected"
  />

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3"
        >Simpan Berhasil</v-card-title
      >
      <v-card-text class="pa-4 text-center">
        BAST MAP <b>{{ savedNomor }}</b> berhasil disimpan.<br /><br />Apakah
        Anda ingin mencetak BAST sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn
          variant="text"
          color="error"
          @click="router.push('/garmen/cetak-bast')"
          >Tidak</v-btn
        >
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="elevated" @click="handlePrint">
          <template #prepend
            ><IconPrinter :size="15" :stroke-width="1.7"
          /></template>
          Ya, Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Override grid BaseForm untuk 3 kolom ── */
:deep(.form-grid-container.three-column) {
  grid-template-columns: 360px minmax(0, 1fr) 200px !important;
}

/* ── Card wrapper ── */
.bast-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-top: 3px solid #1565c0;
  border-radius: 6px;
  padding: 10px 12px;
  height: 100%;
  box-sizing: border-box;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}

/* ── Field rows ── */
.f-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
}
.f-lbl {
  width: 95px;
  flex-shrink: 0;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}
.f-divider {
  height: 1px;
  background: #eeeeee;
  margin: 6px 0;
}

.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  outline: none;
  background: white;
  color: #212121;
  flex: 1;
  box-sizing: border-box;
  font-family: inherit;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #616161 !important;
  cursor: default;
}
.f-yellow {
  background: #fffde7 !important;
  border-color: #f9a825 !important;
}
.f-sel {
  cursor: pointer;
}
.f-date {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
}
.f-date:focus {
  border-color: #1565c0;
}

.inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  background: white;
}
.inp-grp .f-inp {
  border: none;
  height: 24px;
  border-radius: 0;
  flex: 1;
}
.btn-lkp {
  width: 26px;
  background: #f5f5f5;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}
.btn-lkp:hover {
  background: #e0e0e0;
}

/* ── Approval panel ── */
.approval-panel {
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 4px;
  padding: 8px 10px;
}
.apv-lbl {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  cursor: pointer;
  margin-bottom: 4px;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}

/* ── Tab nav ── */
.tab-nav {
  display: flex;
  gap: 2px;
  border-bottom: 2px solid #e0e0e0;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.tab-btn {
  padding: 5px 14px;
  border: 1px solid #d0d0d0;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  background: #f5f5f5;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  cursor: pointer;
  transition: all 0.12s;
}
.tab-btn:hover {
  background: #e3f2fd;
  color: #1565c0;
}
.tab-btn.active {
  background: white;
  color: #1565c0;
  border-color: #bdbdbd;
  border-bottom: 2px solid white;
  margin-bottom: -2px;
}

/* ── Section title ── */
.sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1565c0;
  margin-bottom: 5px;
}

/* ── Grid table ── */
.bt {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  font-size: 10px;
  table-layout: fixed;
}
.bt thead tr {
  background: #1565c0;
}
.bt th {
  padding: 4px 6px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  text-align: center;
  border: 1px solid #0d47a1;
  white-space: nowrap;
}
.th-yellow {
  background: #f9a825 !important;
  color: #4a2e00 !important;
  border-color: #e65100 !important;
}
.bt td {
  border: 1px solid #eeeeee;
  padding: 2px 4px;
  vertical-align: middle;
}
.bt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.bt tbody tr:hover td {
  background: #e3f2fd !important;
}

.cell-inp {
  width: 100%;
  height: 22px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 10px;
  padding: 0 4px;
  font-family: inherit;
  color: #212121;
}
.cell-inp:focus {
  background: #fffde7;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.fw {
  font-weight: 700;
}
.muted {
  color: #9e9e9e;
  font-size: 9px;
}
.p0 {
  padding: 0 !important;
}

/* ── Action buttons ── */
.del-btn {
  width: 22px;
  height: 22px;
  background: #ffebee;
  border: none;
  border-radius: 3px;
  color: #c62828;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}
.del-btn:hover {
  background: #ffcdd2;
}
.add-row-btn {
  margin-top: 6px;
  padding: 4px 12px;
  background: transparent;
  border: 1px dashed #1565c0;
  border-radius: 3px;
  color: #1565c0;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.add-row-btn:hover {
  background: #e3f2fd;
}

/* ── NOTE box ── */
.note-box {
  margin-top: 8px;
  padding: 6px 10px;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 4px;
  font-size: 10px;
  color: #0d47a1;
  flex-shrink: 0;
}

/* ── Keterangan textarea ── */
.ket-textarea {
  width: 100%;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 6px 8px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  resize: none;
  box-sizing: border-box;
  color: #616161;
  background: #f8f8f8;
  line-height: 1.5;
}
</style>
