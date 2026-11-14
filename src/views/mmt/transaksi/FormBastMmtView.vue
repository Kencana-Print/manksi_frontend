<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconPrinter, IconSearch } from "@tabler/icons-vue";
import api from "@/services/api";
import SpkLookupView from "@/modal/SpkMemoLookupModal.vue";
import { useAuthStore } from "@/stores/authStore";

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
  proof_nomor: string;
  barcode: string;
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
  mmpt_nomor: string;
  mmpt_tanggal: string;
  mmpt_nama: string;
  mmpt_nama2: string;
  mmpt_ukuran: string;
  mmpt_kain: string;
  mmpt_finishing: string;
  mmpt_kendala: string;
  mmpt_jumlah_jadi: number;
  mmpt_tipe: string;
  mmpt_gramasi: string;
  mmpt_rencana_size: string;
  mmpt_keterangan: string;
  mmpt_proof_number: string;
  mmpt_bahan_proof: string;
  mmpt_barcode_proof: string;
  mmpt_cabang: string;
  mmpt_workshop: string;
  mmpt_sublim: string;
}

const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();
const API_BASE_URL = "/mmt/bast-map";

// User penyimpan untuk stempel audit checklist (kolom Created/Modified).
const currentUserKode = () => {
  const u: any = authStore.user || {};
  return u.kode || u.nama || "";
};
// Format DATETIME MySQL dari waktu simpan lokal.
const nowDbDatetime = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const activeTab = ref(0);
const isSpkLookupVisible = ref(false);
const showAccModal = ref(false);
const activeAccIdx = ref(-1);
const showPrintDialog = ref(false);
const savedNomor = ref("");
const showBahanModal = ref(false);
const activeBahanIdx = ref(-1);
const listKomponen = ref<string[]>([]);
let cachedSizesNomor = "";
let cachedSizes: any[] | null = null;

function normalizeHeader(h: any) {
  if (!h) return {};
  return {
    mmpt_nomor: h.mmpt_nomor ?? h.MMPT_Nomor ?? h.Nomor ?? "",
    mmpt_tanggal: h.mmpt_tanggal ?? h.Mmpt_Tanggal ?? h.Tanggal ?? "",
    mmpt_nama: h.mmpt_nama ?? h.Mmpt_nama ?? h.Nama ?? "",
    mmpt_nama2: h.mmpt_nama2 ?? h.Mmpt_nama2 ?? "",
    mmpt_ukuran: h.mmpt_ukuran ?? h.Mmpt_ukuran ?? h.Ukuran ?? "",
    mmpt_kain: h.mmpt_kain ?? h.Mmpt_kain ?? h.Kain ?? "",
    mmpt_finishing: h.mmpt_finishing ?? h.Mmpt_finishing ?? h.Finishing ?? "",
    mmpt_kendala: h.mmpt_kendala ?? h.Mmpt_kendala ?? "",
    mmpt_jumlah_jadi: h.mmpt_jumlah_jadi ?? h.Mmpt_jumlah ?? h.Jumlah ?? 0,
    mmpt_tipe: h.mmpt_tipe ?? h.Mmpt_tipe ?? h.Tipe ?? "Standard",
    mmpt_gramasi: h.mmpt_gramasi ?? h.Mmpt_gramasi ?? h.Gramasi ?? "",
    mmpt_rencana_size: h.mmpt_rencana_size ?? h.Mmpt_rencana_size ?? "",
    mmpt_keterangan: h.mmpt_keterangan ?? h.Mmpt_keterangan ?? "",
    mmpt_proof_number: h.mmpt_proof_number ?? h.proof_number ?? "",
    mmpt_bahan_proof: h.mmpt_bahan_proof ?? h.bahan_proof ?? "",
    mmpt_barcode_proof: h.mmpt_barcode_proof ?? h.barcode_proof ?? "",
    mmpt_cabang: h.mmpt_cabang ?? h.Cabang ?? "",
    mmpt_workshop: h.mmpt_workshop ?? h.Workshop ?? "",
    mmpt_sublim: h.mmpt_sublim ?? h.Sublim ?? "",
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
    mmpt_nomor: "",
    mmpt_tanggal: formatDateLocal(new Date()),
    mmpt_nama: "",
    mmpt_nama2: "",
    mmpt_ukuran: "",
    mmpt_kain: "",
    mmpt_finishing: "",
    mmpt_kendala: "",
    mmpt_jumlah_jadi: 0,
    mmpt_tipe: "Standard",
    mmpt_gramasi: "",
    mmpt_rencana_size: "",
    mmpt_keterangan: "",
    mmpt_proof_number: "",
    mmpt_bahan_proof: "",
    mmpt_barcode_proof: "",
    mmpt_cabang: "",
    mmpt_workshop: "",
    mmpt_sublim: "",
  },
  // Checklist hanya 4 item (tanpa Babaran); default N sesuai aturan:
  // Y/N default N, otomatis Y bila keterangan diisi.
  checklist: [
    { no: 1, kesesuaian: "Bahan", status: "N", keterangan: "" },
    { no: 2, kesesuaian: "Desain", status: "N", keterangan: "" },
    { no: 3, kesesuaian: "Model Finishing", status: "N", keterangan: "" },
    { no: 4, kesesuaian: "Ukuran", status: "N", keterangan: "" },
  ],
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
  menuId: "118",
  initialData,
  onFormReset: () => {
    activeTab.value = 0;
    isSpkLookupVisible.value = false;
    showAccModal.value = false;
    activeAccIdx.value = -1;
    showPrintDialog.value = false;
    savedNomor.value = "";
    showBahanModal.value = false;
    activeBahanIdx.value = -1;
    cachedSizesNomor = "";
    cachedSizes = null;
  },
  fetchApi: async (): Promise<typeof initialData> => {
    const response = await api.get(
      `${API_BASE_URL}/${encodeURIComponent(params.nomor ?? "")}`,
    );
    const res = response.data.data || response.data;
    // Flag jumlah-dari-proof dibaca sebelum normalizeHeader (yang hanya
    // meneruskan field header baku).
    const jumlahFromProof = !!(res.header as any)?.jumlah_from_proof;
    const proofJumlahBackend = Number((res.header as any)?.proof_jumlah) || 0;
    res.header = normalizeHeader(res.header || {});

    // Data BAST (header/komponen/checklist/lock) sudah dari backend.
    // Bahan + nomor proof ikut dari backend (res.proof/proofList, dari LHK Proof).
    // Fallback: ambil via endpoint proof bila backend lama belum kirim.
    const proofFromDetail = (res as any).proof || null;
    const proofList: any[] = (res as any).proofList || [];
    if (proofFromDetail) {
      // Backend sudah mengirim daftar nomor proof gabungan; pertahankan.
      res.header.mmpt_proof_number =
        res.header.mmpt_proof_number ||
        proofFromDetail.nomor_proof ||
        "";
      res.header.mmpt_bahan_proof =
        proofFromDetail.nama_bahan ||
        proofFromDetail.kode_bahan ||
        proofFromDetail.bahan ||
        res.header.mmpt_bahan_proof ||
        "";
      res.header.mmpt_barcode_proof =
        proofFromDetail.barcode || res.header.mmpt_barcode_proof || "";
    } else if (res.header.mmpt_nomor) {
      try {
        const proofRes = await api.get(
          `${API_BASE_URL}/proof/${encodeURIComponent(res.header.mmpt_nomor)}`,
        );
        const proofRows = proofRes.data?.data || [];
        if (proofRows.length > 0) {
          proofList.push(...proofRows);
          res.header.mmpt_proof_number = distinctProofNumbers(proofRows);
          res.header.mmpt_bahan_proof =
            proofRows[0].nama_bahan ||
            proofRows[0].kode_bahan ||
            proofRows[0].bahan ||
            "";
          res.header.mmpt_barcode_proof = proofRows[0].barcode || "";
          // Fallback jumlah cetak dari total J_Proof LHK bila backend lama
          // belum mengirim (sama seperti jalur utama di atas).
          const total = sumProofQty(proofRows);
          if (total > 0) {
            res.header.mmpt_jumlah_jadi = total;
            toast.info(
              `Jumlah cetak diambil dari LHK Proof (J_Proof total ${total}).`,
            );
          }
        }
      } catch (e) {
        console.error("Gagal mengambil data LHK Proof:", e);
      }
    }

    // Normalisasi baris komponen + tulis bahan & nomor LHK Proof
    // ke tabel BAHAN MMT & TINTA bila tabel masih kosong.
    res.komponen = (res.komponen || []).map((k: any) => ({
      kode: k.kode || "",
      bhn_name: k.bhn_name || "",
      bhn_satuan: k.bhn_satuan || "",
      komponen: k.komponen || "",
      warna: k.warna || "",
      babaran: Number(k.babaran) || 0,
      babarank: Number(k.babarank) || 0,
      proof_nomor: k.proof_nomor || "",
      barcode: k.barcode || "",
    }));
    if (res.komponen.length === 0 && proofList.length > 0) {
      res.komponen = buildKomponenFromProof(proofList);
    }

    if (res.aksesoris && res.aksesoris.length > 0) {
      res.aksesoris = res.aksesoris.map((acc: any) => ({
        kode: acc.kode || "",
        nama: acc.acc_nama || acc.nama || "",
        satuan: acc.acc_satuan || acc.satuan || "",
        qty: Number(acc.qty) || 0,
        note: acc.acc_note || acc.note || "",
      }));
    }

    if (!res.checklist || res.checklist.length === 0) {
      res.checklist = [
        { no: 1, kesesuaian: "Bahan", status: "N", keterangan: "" },
        { no: 2, kesesuaian: "Desain", status: "N", keterangan: "" },
        { no: 3, kesesuaian: "Model Finishing", status: "N", keterangan: "" },
        { no: 4, kesesuaian: "Ukuran", status: "N", keterangan: "" },
      ];
    } else {
      // Buang item Babaran (no 5) bila masih tersimpan di data lama
      res.checklist = res.checklist.filter((c: any) => Number(c.no) !== 5);
    }

    if (res.lock) {
      res.isLocked = true;
      res.isApproved = res.lock.apv === "Y";
      res.alasanApproval = res.lock.alasan || "";
    }

    // Jumlah cetak sudah diisi backend dari total J_Proof LHK agar
    // tidak double input — beri tahu user dari mana angka itu berasal.
    if (jumlahFromProof && proofJumlahBackend > 0) {
      toast.info(
        `Jumlah cetak diambil dari LHK Proof (J_Proof total ${proofJumlahBackend}).`,
      );
    }

    return res;
  },
  submitApi: async (data) => {
    // Aturan simpan checklist: keterangan diisi → status otomatis Y;
    // Created + Date Create diisi penyimpan saat baris baru disimpan,
    // Modified + Date Modify diisi penyimpan saat baris lama diubah.
    const u = currentUserKode();
    const now = nowDbDatetime();
    for (const c of data.checklist || []) {
      const ket = String(c.keterangan ?? "").trim();
      c.keterangan = ket;
      if (ket) c.status = "Y";
      if (!c.user_create) {
        c.user_create = u;
        c.date_create = now;
      } else {
        c.user_modify = u;
        c.date_modify = now;
      }
    }
    return await api.post(`${API_BASE_URL}/`, data);
  },
  onSuccess: () => {
    toast.success("Data BAST MMT berhasil disimpan.");
    savedNomor.value = formData.value.header.mmpt_nomor;
    showPrintDialog.value = true;
  },
});

const ensureSizeRowsForKomponen = async (komponenStr: string) => {
  if (!komponenStr) return;

  const alreadyExists = formData.value.sizeBreakdown.some(
    (s: any) => s.komponen === komponenStr,
  );
  if (alreadyExists) return;

  const nomor = formData.value.header.mmpt_nomor;
  if (!nomor) return;

  if (cachedSizesNomor !== nomor) {
    cachedSizesNomor = nomor;
    cachedSizes = null;
    try {
      const res = await api.get(
        `${API_BASE_URL}/${encodeURIComponent(nomor)}/sizes`,
      );
      cachedSizes = res.data.data || res.data || [];
    } catch (error: any) {
      console.error("Gagal mengambil daftar size MMT", error);
      cachedSizes = [];
    }
  }

  if (cachedSizes && cachedSizes.length > 0) {
    cachedSizes.forEach((sz: any) => {
      formData.value.sizeBreakdown.push({
        komponen: komponenStr,
        size: sz.mmpts_size || sz.size,
        babaran: 0,
      });
    });
  } else {
    toast.warning(
      `Tidak ditemukan data ukuran/size untuk MMT ini. Babaran per Size perlu diisi manual.`,
    );
  }
};

const onKomponenChange = async (k: any) => {
  const komponenStr = (k.komponen || "").trim();
  await ensureSizeRowsForKomponen(komponenStr);
};

const handleSpkSelect = async (spk: any) => {
  isSpkLookupVisible.value = false;
  if (!spk) return;

  if (!formData.value.header) {
    formData.value.header = {} as any;
  }

  formData.value.header.mmpt_nomor = spk.SPK || spk.Nomor || "";
  formData.value.header.mmpt_tanggal = formatDateLocal(
    spk.Tanggal || new Date(),
  );
  formData.value.header.mmpt_nama = spk.Nama || "";
  formData.value.header.mmpt_nama2 = spk.Nama2 || "";
  formData.value.header.mmpt_ukuran = spk.Ukuran || "";
  formData.value.header.mmpt_kain = spk.Bahan || "";
  formData.value.header.mmpt_finishing = spk.Finishing || "";
  formData.value.header.mmpt_jumlah_jadi = Number(spk.Jumlah || 0);
  formData.value.header.mmpt_tipe = spk.Tipe_SPK || spk.Tipe || "Standard";
  formData.value.header.mmpt_gramasi = spk.Gramasi || "";
  formData.value.header.mmpt_rencana_size = spk.Ukuran || "";
  formData.value.header.mmpt_keterangan = spk.Pesan || "";
  formData.value.header.mmpt_cabang = spk.Cabang || spk.Cab || "";
  formData.value.header.mmpt_workshop = spk.Workshop || "";
  formData.value.header.mmpt_sublim = spk.Sublim || "";
  formData.value.header.mmpt_proof_number = "";
  formData.value.header.mmpt_bahan_proof = "";
  formData.value.header.mmpt_barcode_proof = "";

  // Bahan + nomor proof dari LHK Proof (untuk form Baru)
  // sekaligus ditulis ke tabel BAHAN MMT & TINTA bila masih kosong.
  try {
    const proofRes = await api.get(
      `${API_BASE_URL}/proof/${encodeURIComponent(formData.value.header.mmpt_nomor)}`,
    );
    const proofRows = proofRes.data?.data || [];
    if (proofRows.length > 0) {
      formData.value.header.mmpt_proof_number =
        distinctProofNumbers(proofRows);
      formData.value.header.mmpt_bahan_proof =
        proofRows[0].nama_bahan ||
        proofRows[0].kode_bahan ||
        proofRows[0].bahan ||
        "";
      formData.value.header.mmpt_barcode_proof = proofRows[0].barcode || "";
      if (formData.value.komponen.length === 0) {
        formData.value.komponen = buildKomponenFromProof(proofRows);
      }
    }
  } catch (e) {
    console.error("Gagal mengambil data LHK Proof:", e);
  }

  // Set ulang checklist menjadi 4 item (tanpa Babaran)
  if (!formData.value.checklist || formData.value.checklist.length === 0) {
    formData.value.checklist = [
      { no: 1, kesesuaian: "Bahan", status: "N", keterangan: "" },
      { no: 2, kesesuaian: "Desain", status: "N", keterangan: "" },
      { no: 3, kesesuaian: "Model Finishing", status: "N", keterangan: "" },
      { no: 4, kesesuaian: "Ukuran", status: "N", keterangan: "" },
    ];
  } else {
    formData.value.checklist = formData.value.checklist.filter(
      (c: any) => Number(c.no) !== 5,
    );
  }

  cachedSizesNomor = "";
  cachedSizes = null;

  toast.success(
    `Memo SPK ${formData.value.header.mmpt_nomor} berhasil dimuat.`,
  );
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

const onBabaranChange = (k: any) => {
  const komponenStr = (k.komponen || "").trim();
  if (!komponenStr) {
    toast.warning("Komponen silahkan di isi dulu ya");
    k.babaran = 0;
  }
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

// Aturan: keterangan diisi → Y/N otomatis Y (satu arah; N manual tetap bisa).
const onKeteranganInput = (c: any) => {
  const v = String(c.keterangan ?? "").trim();
  if (v && v !== "-") {
    c.status = "Y";
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
    proof_nomor: "",
    barcode: "",
  });
const removeBahanRow = (i: number) => formData.value.komponen.splice(i, 1);

// Total hasil cetak LHK Proof: SUM kolom J_Proof (j_proof) seluruh baris
// (satu MAP bisa punya beberapa dokumen proof beda bahan/tahap).
// j_meter satuannya meter bahan — hanya fallback bila tidak ada J_Proof
// terisi (data lama).
const sumProofQty = (proofRows: any[]) => {
  const rows = proofRows || [];
  const jp = rows.reduce(
    (s: number, p: any) => s + (Number(p.j_proof) || 0),
    0,
  );
  if (jp > 0) return jp;
  return rows.reduce(
    (s: number, p: any) => s + (Number(p.j_meter) || 0),
    0,
  );
};

// Daftar nomor dokumen proof distinct (urutan tanggal DESC) untuk header.
const distinctProofNumbers = (proofRows: any[]) =>
  Array.from(
    new Set(
      (proofRows || [])
        .map((p: any) => String(p.nomor_proof || "").trim())
        .filter(Boolean),
    ),
  ).join(", ");

// Bentuk baris tabel BAHAN MMT & TINTA dari data LHK Proof:
// Kode + Nama Bahan dari master (via barcode), nomor LHK Proof + barcode per baris.
const buildKomponenFromProof = (proofRows: any[]) =>
  (proofRows || []).map((p: any) => ({
    kode: p.kode_bahan || "",
    bhn_name: p.nama_bahan || p.kode_bahan || p.bahan || "",
    bhn_satuan: p.satuan_bahan || "",
    komponen: "",
    warna: "",
    babaran: 0,
    babarank: 0,
    proof_nomor: p.nomor_proof || "",
    barcode: String(p.barcode || "").trim(),
  }));

// Tombol "Ambil dari LHK Proof": isi tabel bila masih kosong.
const refillKomponenFromProof = async () => {
  const nomor = formData.value.header.mmpt_nomor;
  if (!nomor) {
    toast.error("Pilih No Order MMT terlebih dahulu.");
    return;
  }
  if (
    formData.value.komponen.some(
      (k: any) => (k.kode || "").trim() || (k.bhn_name || "").trim(),
    )
  ) {
    toast.warning(
      "Tabel bahan sudah terisi. Hapus baris dulu bila ingin isi ulang dari LHK Proof.",
    );
    return;
  }
  try {
    const proofRes = await api.get(
      `${API_BASE_URL}/proof/${encodeURIComponent(nomor)}`,
    );
    const proofRows = proofRes.data?.data || [];
    if (proofRows.length === 0) {
      toast.warning("Tidak ada LHK Proof untuk nomor ini.");
      return;
    }
    formData.value.komponen = buildKomponenFromProof(proofRows);
    formData.value.header.mmpt_proof_number = distinctProofNumbers(proofRows);
    formData.value.header.mmpt_bahan_proof =
      proofRows[0].nama_bahan ||
      proofRows[0].kode_bahan ||
      proofRows[0].bahan ||
      "";
    formData.value.header.mmpt_barcode_proof = proofRows[0].barcode || "";
    toast.success("Bahan & nomor LHK Proof dimuat ke tabel.");
  } catch (e) {
    console.error("Gagal mengambil data LHK Proof:", e);
    toast.error("Gagal mengambil data LHK Proof.");
  }
};

// Tombol "tarik ulang jumlah dari Proof": isi Jumlah Cetak dengan total
// j_meter LHK Proof terbaru (tanpa menimpa field lain).
const refillJumlahFromProof = async () => {
  const nomor = formData.value.header.mmpt_nomor;
  if (!nomor) {
    toast.error("Pilih No Order MMT terlebih dahulu.");
    return;
  }
  try {
    const proofRes = await api.get(
      `${API_BASE_URL}/proof/${encodeURIComponent(nomor)}`,
    );
    const proofRows = proofRes.data?.data || [];
    const total = sumProofQty(proofRows);
    if (total <= 0) {
      toast.warning("Tidak ada hasil J_Proof LHK Proof untuk nomor ini.");
      return;
    }
    formData.value.header.mmpt_jumlah_jadi = total;
    toast.success(`Jumlah cetak diisi dari LHK Proof (J_Proof total ${total}).`);
  } catch (e) {
    console.error("Gagal mengambil data LHK Proof:", e);
    toast.error("Gagal mengambil data LHK Proof.");
  }
};

const validateBeforeSave = () => {
  const data = formData.value;

  if (!data.header.mmpt_nomor) {
    toast.error("Pilih data MMT terlebih dahulu.");
    return false;
  }

  if (!data.header.mmpt_tipe) {
    toast.error("Tipe MMT belum dipilih.");
    return false;
  }

  if (data.isApproved && !data.alasanApproval) {
    toast.error("Alasan Approval harus diisi.");
    return false;
  }

  let isLocked = false;
  let isBahanValid = true;

  for (const k of data.komponen) {
    if (!k.komponen) continue;

    if (!k.bhn_name) {
      isBahanValid = false;
    }

    if (Number(k.babaran) === 0 || Number(k.babaran) < Number(k.babarank)) {
      isLocked = true;
    }
  }

  if (!isBahanValid) {
    toast.error("Bahan belum diinput (Ada komponen tanpa nama bahan).");
    return false;
  }

  if (isLocked) {
    data.isLocked = true;
    if (!data.isApproved) {
      toast.warning("BAST On Progress (Babaran < Kalkulasi). Tunggu Approval.");
    }
  } else {
    data.isLocked = false;
  }

  data.payloadLock = {
    isLocked: data.isLocked,
    isApproved: data.isApproved,
    alasan: data.alasanApproval,
  };

  return true;
};

const fetchListKomponen = async () => {
  try {
    const res = await api.get("/lookups/komponen-mmt");
    listKomponen.value = res.data.data || res.data || [];
  } catch (error) {
    console.error("Gagal memuat list komponen MMT", error);
  }
};

const handlePrint = () => {
  showPrintDialog.value = false;
  const url = router.resolve({
    name: "BastMmtPrint",
    params: { nomor: savedNomor.value },
  }).href;
  window.open(url, "_blank");
  router.push(API_BASE_URL);
};

const skipPrint = () => {
  showPrintDialog.value = false;
  router.push(API_BASE_URL);
};

onMounted(() => {
  fetchListKomponen();
  if (isEditMode.value) fetchData();
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah BAST MMT' : 'Cetak BAST MMT Baru'"
    menu-id="118"
    :icon="IconPrinter"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="
      () => {
        if (validateBeforeSave()) {
          showSaveDialog = true;
        }
      }
    "
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- Kolom kiri: field header MMT -->
    <template #left-column>
      <div class="bast-card">
        <div class="f-row">
          <label class="f-lbl">No Order MMT</label>
          <div class="inp-grp" style="flex: 1">
            <input
              :value="formData.header.mmpt_nomor"
              readonly
              class="f-inp f-ro"
              style="font-weight: 600; color: #1565c0"
              placeholder="Pilih MMT..."
            />
            <button
              type="button"
              class="btn-lkp"
              @click="isSpkLookupVisible = true"
            >
              <IconSearch :size="12" color="#1565c0" />
            </button>
          </div>
        </div>

        <div class="f-row">
          <label class="f-lbl">Tanggal</label>
          <input
            type="date"
            :value="formatDateLocal(formData.header.mmpt_tanggal)"
            @input="(e: any) => (formData.header.mmpt_tanggal = e.target.value)"
            class="f-date"
            style="width: 140px"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Nama Pekerjaan</label>
          <input
            :value="formData.header.mmpt_nama"
            readonly
            class="f-inp f-ro"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Nama Ext</label>
          <input
            :value="formData.header.mmpt_nama2"
            readonly
            class="f-inp f-ro"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Ukuran / Resolusi</label>
          <input
            :value="formData.header.mmpt_ukuran"
            readonly
            class="f-inp f-ro"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Bahan MMT</label>
          <input
            :value="formData.header.mmpt_kain"
            readonly
            class="f-inp f-ro"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Finishing</label>
          <input
            :value="formData.header.mmpt_finishing"
            readonly
            class="f-inp f-ro"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Nomor Proof</label>
          <input
            :value="formData.header.mmpt_proof_number || ''"
            readonly
            class="f-inp f-ro"
            placeholder="Belum ada LHK Proof"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Bahan (LHK Proof)</label>
          <input
            :value="formData.header.mmpt_bahan_proof || ''"
            readonly
            class="f-inp f-ro"
            placeholder="Belum ada LHK Proof"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Barcode (LHK Proof)</label>
          <input
            :value="formData.header.mmpt_barcode_proof || ''"
            readonly
            class="f-inp f-ro"
            placeholder="Belum ada LHK Proof"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Cabang / Workshop / Sublim</label>
          <input
            :value="`${formData.header.mmpt_cabang || ''} / ${formData.header.mmpt_workshop || ''} / ${formData.header.mmpt_sublim || ''}`"
            readonly
            class="f-inp f-ro"
          />
        </div>

        <div class="f-divider" />

        <div class="f-row">
          <label class="f-lbl">Kendala</label>
          <input
            v-model="formData.header.mmpt_kendala"
            class="f-inp"
            placeholder="Input kendala produksi..."
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Jumlah Cetak</label>
          <input
            type="number"
            :value="formData.header.mmpt_jumlah_jadi || 0"
            @input="
              (e: any) =>
                (formData.header.mmpt_jumlah_jadi = Number(e.target.value))
            "
            class="f-inp f-yellow"
            style="max-width: 100px; text-align: right; font-weight: 600"
            v-select-on-focus
          />
          <button
            type="button"
            class="add-row-btn"
            style="margin-left: 6px"
            title="Isi ulang dari total meter LHK Proof"
            @click="refillJumlahFromProof"
          >
            Dari Proof
          </button>
        </div>

        <div class="f-row">
          <label class="f-lbl">Tipe</label>
          <input
            :value="formData.header.mmpt_tipe || '-'"
            readonly
            class="f-inp f-ro"
            style="max-width: 120px; font-weight: 600"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Gramasi / Tebal</label>
          <input
            :value="formData.header.mmpt_gramasi"
            readonly
            class="f-inp f-ro"
          />
        </div>

        <div class="f-row">
          <label class="f-lbl">Rencana Size</label>
          <input
            :value="formData.header.mmpt_rencana_size"
            readonly
            class="f-inp f-ro"
          />
        </div>

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

    <!-- Kolom tengah: tab BAST/Bahan/Acc/Size -->
    <template #center-column>
      <div
        class="bast-card"
        style="display: flex; flex-direction: column; height: 100%"
      >
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
          <div class="sec-title">Bahan MMT & Tinta :</div>
          <div style="overflow: auto; flex: 0 0 auto; max-height: 260px">
            <table class="bt">
              <thead>
                <tr>
                  <th style="width: 28px">No</th>
                  <th style="width: 110px; text-align: left">Komponen</th>
                  <th class="th-yellow" style="width: 90px; text-align: left">
                    Warna / Tinta
                  </th>
                  <th class="th-yellow" style="width: 70px; text-align: right">
                    Babaran
                  </th>
                  <th style="width: 120px">Kode</th>
                  <th style="text-align: left; width: 180px">Nama Bahan</th>
                  <th style="width: 50px">Satuan</th>
                  <th style="width: 150px; text-align: left">Barcode</th>
                  <th style="width: 130px; text-align: left">No. Proof</th>
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
                      @change="onKomponenChange(k)"
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
                  <td
                    class="tc"
                    style="
                      background: #f5f5f5;
                      font-family: monospace;
                      font-size: 11px;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                      max-width: 150px;
                    "
                    :title="k.barcode || ''"
                  >
                    {{ k.barcode || "-" }}
                  </td>
                  <td
                    class="tc"
                    style="
                      background: #e8f5e9;
                      font-family: monospace;
                      font-size: 11px;
                      white-space: nowrap;
                    "
                    :title="k.proof_nomor || ''"
                  >
                    {{ k.proof_nomor || "-" }}
                  </td>
                </tr>
              </tbody>
            </table>
            <button type="button" class="add-row-btn" @click="addBahanRow">
              + Tambah Baris
            </button>
            <button
              type="button"
              class="add-row-btn"
              style="margin-left: 6px"
              @click="refillKomponenFromProof"
            >
              Ambil dari LHK Proof
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
                      @input="onKeteranganInput(c)"
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
                <th style="text-align: left">
                  Nama Accesories / Finishing Tambahan
                </th>
                <th style="width: 60px">Satuan</th>
                <th style="text-align: left">Note</th>
                <th class="th-yellow" style="width: 70px; text-align: right">
                  Jml/Pcs
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

        <div class="note-box">
          <strong>NOTE:</strong> Jika
          <strong>Babaran &lt; Babaran Kalkulasi</strong> (warna font merah)
          atau Pemakaian bahan/tinta tidak diinput — BAST MMT dianggap masih
          <strong>On Progress</strong>. Dalam 6 hari jika tidak diselesaikan
          Anda tidak akan bisa membuat BAST MMT.
        </div>
      </div>
    </template>

    <!-- Kolom kanan: Keterangan MMT -->
    <template #right-column>
      <div
        class="bast-card"
        style="display: flex; flex-direction: column; height: 100%"
      >
        <div class="sec-title">Keterangan MMT</div>
        <textarea
          :value="formData.header.mmpt_keterangan"
          readonly
          class="ket-textarea"
          style="flex: 1"
        ></textarea>
      </div>
    </template>
  </BaseForm>

  <!-- Komponen Lookup SPK / MMT menggunakan SpkLookupView -->
  <SpkLookupView
    :isVisible="isSpkLookupVisible"
    @close="isSpkLookupVisible = false"
    @select="handleSpkSelect"
    @selected="handleSpkSelect"
  />

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3"
        >Simpan Berhasil</v-card-title
      >
      <v-card-text class="pa-4 text-center">
        BAST MMT <b>{{ savedNomor }}</b> berhasil disimpan.<br /><br />Apakah
        Anda ingin mencetak BAST sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="skipPrint">Tidak</v-btn>
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
:deep(.form-grid-container.three-column) {
  grid-template-columns: 360px minmax(0, 1fr) 200px !important;
}

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

.sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1565c0;
  margin-bottom: 5px;
}

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
