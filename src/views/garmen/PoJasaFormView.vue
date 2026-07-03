<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import { useForm } from "@/composables/useForm";
import BaseForm from "@/components/BaseForm.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import GudangBahanSearchModal from "@/components/lookups/GudangBahanSearchModal.vue";
import api from "@/services/api";
import {
  IconClipboardList,
  IconSearch,
  IconPlus,
  IconTrash,
  IconAlertTriangle,
  IconRefresh,
} from "@tabler/icons-vue";

// ── Types ──────────────────────────────────────────────────────────────
interface KomponenRow {
  _key: number;
  kode: string;
  nama: string;
  satuan: string;
  jumlah: number;
  gdg_kode: string;
  sudah_po: number;
  sudah_lhk: number;
  total_sudah: number;
  kurang: number;
}
interface BahanRow {
  _key: number;
  kode: string;
  nama: string;
  satuan: string;
  jumlah: number;
  harga: number;
  total: number;
  gdg_kode: string;
}
interface PlanningRow {
  no_planning: string;
  tanggal: string;
  jumlah: number;
  status: string;
  ambil: boolean;
}
interface FormData {
  Nomor: string;
  Tanggal: string;
  Dateline: string;
  Cab: string;
  Keterangan: string;
  Note: string;
  StatusCetak: number;
  SupKode: string;
  SupNama: string;
  SupAlamat: string;
  SupKota: string;
  SpkNomor: string;
  SpkNama: string;
  SpkJumlah: number;
  SpkUkuran: string;
  JasaKode: string;
  JasaNama: string;
  GdgpKode: string;
  GdgpNama: string;
  JumlahPO: number;
  Tarif: number;
  StatusPPN: number;
  PPN: number;
  IsSet: boolean;
  pin5Status: string;
  pin5Urut: number;
  PlanNomor: string;
  PlanTanggal: string | null;
  PlanJumlah: number;
  KomponenRows: KomponenRow[];
  BahanRows: BahanRow[];
}

// ── Store ──────────────────────────────────────────────────────────────
const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();
const userCab = computed(() => authStore.user?.cabang || "");

// ── Helpers ────────────────────────────────────────────────────────────
const todayWIB = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
let _key = 1;
const mkK = (): KomponenRow => ({
  _key: _key++,
  kode: "",
  nama: "",
  satuan: "",
  jumlah: 0,
  gdg_kode: "",
  sudah_po: 0,
  sudah_lhk: 0,
  total_sudah: 0,
  kurang: 0,
});
const mkB = (): BahanRow => ({
  _key: _key++,
  kode: "",
  nama: "",
  satuan: "",
  jumlah: 0,
  harga: 0,
  total: 0,
  gdg_kode: "",
});
const num = (v: any, d = 0) =>
  Number(v || 0).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
const sel = (e: FocusEvent) => (e.target as HTMLInputElement).select();

// ── init ───────────────────────────────────────────────────────────────
const init: FormData = {
  Nomor: "",
  Tanggal: todayWIB(),
  Dateline: todayWIB(),
  Cab: "",
  Keterangan: "",
  Note: "",
  StatusCetak: 0,
  SupKode: "",
  SupNama: "",
  SupAlamat: "",
  SupKota: "",
  SpkNomor: "",
  SpkNama: "",
  SpkJumlah: 0,
  SpkUkuran: "",
  JasaKode: "",
  JasaNama: "",
  GdgpKode: "",
  GdgpNama: "",
  JumlahPO: 0,
  Tarif: 0,
  StatusPPN: 0,
  PPN: 0,
  IsSet: false,
  pin5Status: "",
  pin5Urut: 0,
  PlanNomor: "",
  PlanTanggal: null,
  PlanJumlah: 0,
  KomponenRows: [mkK()],
  BahanRows: [mkB()],
};

// ── State ──────────────────────────────────────────────────────────────
const planList = ref<PlanningRow[]>([]);
const isLoadingPlan = ref(false);
const activeTab = ref<"komponen" | "bahan">("komponen");

// ── useForm ────────────────────────────────────────────────────────────
const savedNomor = ref("");
const showPrintDialog = ref(false);
const showPrintSjDialog = ref(false);

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
} = useForm<FormData>({
  menuId: "102",
  initialData: init,
  immediate: false,
  fetchApi: async (): Promise<FormData> => {
    const res = await api.get("/garmen/po-jasa-form/by-nomor", {
      params: { nomor: (params as any).nomor },
    });
    const d = res.data.data as any;
    const h = d.header as any;
    const komponen: KomponenRow[] = (d.komponen || []).map((r: any) => ({
      _key: _key++,
      kode: r.kode || "",
      nama: r.nama || "",
      satuan: r.satuan || "",
      jumlah: Number(r.jumlah) || 0,
      gdg_kode: r.gdg_kode || "",
      sudah_po: Number(r.sudah_po) || 0,
      sudah_lhk: Number(r.sudah_lhk) || 0,
      total_sudah: Number(r.total_sudah) || 0,
      kurang: Number(h.pojh_jumlah || 0) - Number(r.total_sudah || 0),
    }));
    const bahan: BahanRow[] = (d.bahan || []).map((r: any) => ({
      _key: _key++,
      kode: r.kode || "",
      nama: r.nama || "",
      satuan: r.satuan || "",
      jumlah: Number(r.jumlah) || 0,
      harga: Number(r.harga) || 0,
      total: Number(r.jumlah || 0) * Number(r.harga || 0),
      gdg_kode: r.gdg_kode || "",
    }));
    if (!komponen.length) komponen.push(mkK());
    if (!bahan.length) bahan.push(mkB());
    planList.value = (d.planning || []).map((p: any) => ({ ...p }));
    return {
      Nomor: h.pojh_nomor || "",
      Tanggal: h.pojh_tanggal || todayWIB(),
      Dateline: h.pojh_dateline || todayWIB(),
      Cab: h.pojh_cab || "",
      Keterangan: h.pojh_keterangan || "",
      Note: h.pojh_note || "",
      StatusCetak: Number(h.pojh_cetak) || 0,
      SupKode: h.pojh_sup_kode || "",
      SupNama: h.sup_nama || "",
      SupAlamat: h.sup_alamat || "",
      SupKota: h.sup_kota || "",
      SpkNomor: h.pojh_spk_nomor || "",
      SpkNama: d.spkInfo?.nama || "",
      SpkJumlah: Number(d.spkInfo?.total_jumlah) || 0,
      SpkUkuran: d.spkInfo?.ukuran || "",
      JasaKode: h.pojh_jasa_kode || "",
      JasaNama: h.jasa_nama || "",
      GdgpKode: h.pojh_gdgp_kode || "",
      GdgpNama: h.gdgp_nama || "",
      JumlahPO: Number(h.pojh_jumlah) || 0,
      Tarif: Number(h.pojh_tarif) || 0,
      StatusPPN: Number(h.pojh_status_ppn) || 0,
      PPN: Number(h.pojh_ppn) || 0,
      IsSet: false,
      pin5Status: d.pin5Status || "",
      pin5Urut: d.pin5Urut || 0,
      PlanNomor: h.pojh_plan_nomor || "",
      PlanTanggal: h.pojh_plan_tanggal || null,
      PlanJumlah: Number(h.pojh_plan_jumlah) || 0,
      KomponenRows: komponen,
      BahanRows: bahan,
    };
  },
  submitApi: async (data): Promise<any> => {
    const planSel = planList.value.find((p) => p.ambil);
    const payload = {
      ...data,
      PlanNomor: planSel?.no_planning || "",
      PlanTanggal: planSel?.tanggal || null,
      PlanJumlah: planSel?.jumlah || 0,
      KomponenRows: data.KomponenRows.filter(
        (r) => r.kode && Number(r.jumlah) > 0,
      ).map(({ _key: _k, ...r }) => r),
      BahanRows: data.BahanRows.filter(
        (r) => r.kode && Number(r.jumlah) > 0,
      ).map(({ _key: _k, ...r }) => r),
    };
    return isEditMode.value
      ? api.put("/garmen/po-jasa-form/by-nomor", {
          ...payload,
          Nomor: data.Nomor,
        })
      : api.post("/garmen/po-jasa-form", payload);
  },
  onSuccess: (res: any) => {
    const nomor = res?.data?.data?.nomor || "";
    toast.success(`Data ${nomor} berhasil disimpan.`);
    savedNomor.value = nomor;
    showPrintDialog.value = true; // tanya cetak dulu, bukan langsung pindah halaman
  },
});

const fd = formData;
const canEdit = computed(
  () => !["MINTA", "WAIT", "TOLAK"].includes(fd.value.pin5Status),
);

// ── SPK ────────────────────────────────────────────────────────────────
const showSpkModal = ref(false);
const spkDirty = ref(false);

const applySpk = async (nomor: string) => {
  try {
    const r = await api.get("/garmen/po-jasa-form/spk-info", {
      params: { nomor },
    });
    const s = r.data.data;
    fd.value.SpkNomor = s.nomor || nomor;
    fd.value.SpkNama = s.nama || "";
    fd.value.SpkJumlah = Number(s.total_jumlah) || 0;
    fd.value.SpkUkuran = s.ukuran || "";
    fd.value.KomponenRows = [mkK()];
    fd.value.BahanRows = [mkB()];
    planList.value = [];
    if (fd.value.JasaKode) await loadPlanning();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "SPK tidak ditemukan.");
    fd.value.SpkNomor = "";
  }
};
const selectSpk = async (item: any) => {
  showSpkModal.value = false;
  await applySpk(item.Nomor || item.spk_nomor || "");
};
const onSpkEnter = async () => {
  if (!spkDirty.value || !fd.value.SpkNomor) return;
  spkDirty.value = false;
  await applySpk(fd.value.SpkNomor.trim());
};

// ── Supplier ───────────────────────────────────────────────────────────
const showSupModal = ref(false);
const supDirty = ref(false);

const selectSup = (item: any) => {
  fd.value.SupKode = item.Kode || item.sup_kode || "";
  fd.value.SupNama = item.Nama || item.sup_nama || "";
  fd.value.SupAlamat = item.Alamat || item.sup_alamat || "";
  fd.value.SupKota = item.Kota || item.sup_kota || "";
  showSupModal.value = false;
};
const onSupExit = async () => {
  if (!supDirty.value || !fd.value.SupKode) return;
  supDirty.value = false;
  try {
    const r = await api.get("/garmen/po-jasa-form/supplier", {
      params: { kode: fd.value.SupKode },
    });
    const s = r.data.data;
    fd.value.SupNama = s.Nama || "";
    fd.value.SupAlamat = s.Alamat || "";
    fd.value.SupKota = s.Kota || "";
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode Supplier tidak ditemukan.");
    fd.value.SupKode = "";
    fd.value.SupNama = "";
  }
};

// ── Jasa ───────────────────────────────────────────────────────────────
const showJasaModal = ref(false);
const jasaModalList = ref<
  { Kode: string; Nama: string; gdgp_kode: string; gdgp_nama: string }[]
>([]);
const jasaQ = ref("");
const isJasaLoading = ref(false);
const jasaDirty = ref(false);

const openJasaModal = async () => {
  jasaQ.value = "";
  isJasaLoading.value = true;
  try {
    const r = await api.get("/garmen/po-jasa-form/jasa", {
      params: { cab: fd.value.Cab },
    });
    jasaModalList.value = r.data.data || [];
    showJasaModal.value = true;
  } catch {
    toast.error("Gagal memuat daftar jasa.");
  } finally {
    isJasaLoading.value = false;
  }
};

const jasaFiltered = computed(() => {
  const q = jasaQ.value.toLowerCase();
  return jasaModalList.value.filter(
    (j) =>
      !q ||
      j.Kode.toLowerCase().includes(q) ||
      j.Nama.toLowerCase().includes(q),
  );
});

const selectJasa = async (item: {
  Kode: string;
  Nama: string;
  gdgp_kode: string;
  gdgp_nama: string;
}) => {
  showJasaModal.value = false;
  fd.value.JasaKode = item.Kode;
  fd.value.JasaNama = item.Nama;
  // Auto-fill gudang sesuai Delphi varglobal2/varglobal3
  if (item.gdgp_kode) {
    fd.value.GdgpKode = item.gdgp_kode;
    fd.value.GdgpNama = item.gdgp_nama;
  }
  planList.value = [];
  if (fd.value.SpkNomor) await loadPlanning();
};

const onJasaExit = async () => {
  if (!jasaDirty.value || !fd.value.JasaKode) return;
  jasaDirty.value = false;
  const found = jasaModalList.value.find((j) => j.Kode === fd.value.JasaKode);
  if (found) {
    await selectJasa(found);
  } else {
    // Fetch ulang kalau modal belum dibuka
    try {
      const r = await api.get("/garmen/po-jasa-form/jasa", {
        params: { cab: fd.value.Cab },
      });
      jasaModalList.value = r.data.data || [];
      const f = jasaModalList.value.find((j) => j.Kode === fd.value.JasaKode);
      if (f) await selectJasa(f);
      else {
        toast.error("Kode jasa tidak ditemukan.");
        fd.value.JasaKode = "";
        fd.value.JasaNama = "";
      }
    } catch {
      /**/
    }
  }
};

// ── Gudang ─────────────────────────────────────────────────────────────
const showGdgModal = ref(false);
const gdgQ = ref("");
const gdgList = ref<{ Kode: string; Nama: string }[]>([]);
const gdgFiltered = computed(() => {
  const q = gdgQ.value.toLowerCase();
  return gdgList.value.filter(
    (g) =>
      !q ||
      g.Kode.toLowerCase().includes(q) ||
      g.Nama.toLowerCase().includes(q),
  );
});
const openGdg = async () => {
  if (!fd.value.SpkNomor) {
    toast.warning("SPK harus diisi terlebih dahulu.");
    return;
  }
  gdgQ.value = "";
  try {
    const r = await api.get("/garmen/po-jasa-form/search-gudang", {
      params: { cab: fd.value.Cab },
    });
    gdgList.value = r.data.data || [];
    showGdgModal.value = true;
  } catch {
    toast.error("Gagal memuat daftar gudang.");
  }
};
const selectGdg = async (item: { Kode: string; Nama: string }) => {
  showGdgModal.value = false;
  try {
    await api.post("/garmen/po-jasa-form/cek-gudang", {
      nomorSpk: fd.value.SpkNomor,
      gdgpKode: item.Kode,
    });
    fd.value.GdgpKode = item.Kode;
    fd.value.GdgpNama = item.Nama;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Validasi gudang gagal.");
  }
};

// ── Gudang Bahan ─────────────────────────────────────────────────────────────
const showGudangBahanModal = ref(false);
const activeGudangBahanIdx = ref(0);

const openGudangBahan = (idx: number) => {
  activeGudangBahanIdx.value = idx;
  showGudangBahanModal.value = true;
};

const selectGudangBahan = (item: any) => {
  fd.value.BahanRows[activeGudangBahanIdx.value].gdg_kode = item.Kode || "";
  showGudangBahanModal.value = false;
};

// ── Planning ───────────────────────────────────────────────────────────
const loadPlanning = async () => {
  if (!fd.value.SpkNomor || !fd.value.JasaKode) return;
  isLoadingPlan.value = true;
  try {
    const r = await api.get("/garmen/po-jasa-form/planning", {
      params: { nomorSpk: fd.value.SpkNomor, jasaKode: fd.value.JasaKode },
    });
    const rows = (r.data.data || []).map((p: any, i: number) => ({
      ...p,
      ambil: i === 0,
    }));
    if (isEditMode.value && fd.value.PlanNomor)
      rows.forEach((p: PlanningRow) => {
        p.ambil = p.no_planning === fd.value.PlanNomor;
      });
    planList.value = rows;
  } catch {
    planList.value = [];
  } finally {
    isLoadingPlan.value = false;
  }
};
const selPlan = (i: number) =>
  planList.value.forEach((p, idx) => {
    p.ambil = idx === i;
  });

// ── Komponen grid ──────────────────────────────────────────────────────
const onKodeBahan = async (row: KomponenRow, idx?: number) => {
  if (!row.kode) return;
  try {
    const r = await api.get("/garmen/po-jasa-form/load-bahan", {
      params: {
        kode: row.kode,
        jasaKode: fd.value.JasaKode,
        nomorSpk: fd.value.SpkNomor,
        gdgpKode: fd.value.GdgpKode,
        excludeNomor: isEditMode.value ? fd.value.Nomor : "",
      },
    });
    const d = r.data.data;
    row.kode = d.kode;
    row.nama = d.nama;
    row.satuan = d.satuan;
    row.sudah_po = d.sudah_po;
    row.sudah_lhk = d.sudah_lhk;
    row.total_sudah = d.total_sudah;
    row.kurang = fd.value.JumlahPO - d.total_sudah;

    // Auto tambah baris baru jika ini baris terakhir
    const rows = fd.value.KomponenRows;
    const currentIdx = idx ?? rows.indexOf(row);
    if (currentIdx === rows.length - 1) {
      rows.push(mkK());
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode bahan tidak ditemukan.");
    row.kode = "";
    row.nama = "";
  }
};
watch(
  () => fd.value.JumlahPO,
  (val) => {
    fd.value.KomponenRows.forEach((r) => {
      if (r.kode) {
        r.jumlah = val;
        r.kurang = val - r.total_sudah;
      }
    });
  },
);

// ── Bahan search modal ─────────────────────────────────────────────────
const showBahanKomponenModal = ref(false);
const showBahanBahanModal = ref(false);
const activeBahanIdx = ref(0);
const activeBahanTab = ref<"komponen" | "bahan">("komponen");

const openBahanModal = (idx: number, tab: "komponen" | "bahan") => {
  activeBahanIdx.value = idx;
  activeBahanTab.value = tab;
  if (tab === "komponen") showBahanKomponenModal.value = true;
  else showBahanBahanModal.value = true;
};

const selectBahan = async (item: any) => {
  const kode = item.Kode || "";
  const nama = item.Nama || "";
  const satuan = item.Satuan || "";
  const idx = activeBahanIdx.value;
  const tab = activeBahanTab.value;
  if (tab === "komponen") {
    const row = fd.value.KomponenRows[idx];
    if (!row) return;
    if (fd.value.KomponenRows.some((r, i) => i !== idx && r.kode === kode)) {
      toast.warning("Kode ini sudah diinputkan.");
      return;
    }
    row.kode = kode;
    row.nama = nama;
    row.satuan = satuan;
    await onKodeBahan(row);
  } else {
    const row = fd.value.BahanRows[idx];
    if (!row) return;
    if (fd.value.BahanRows.some((r, i) => i !== idx && r.kode === kode)) {
      toast.warning("Kode ini sudah diinputkan.");
      return;
    }
    row.kode = kode;
    row.nama = nama;
    row.satuan = satuan;

    // Auto tambah baris baru jika ini baris terakhir
    if (idx === fd.value.BahanRows.length - 1) {
      fd.value.BahanRows.push(mkB());
    }
  }
};

const onBahanCalc = (row: BahanRow) => {
  row.total = (row.jumlah || 0) * (row.harga || 0);
};

const onSetChange = async () => {
  if (!fd.value.IsSet) {
    fd.value.KomponenRows = [mkK()];
    return;
  }
  if (!fd.value.SpkNomor) {
    toast.warning("SPK harus diisi terlebih dahulu.");
    fd.value.IsSet = false;
    return;
  }
  try {
    const r = await api.get("/garmen/po-jasa-form/set-mutasi", {
      params: {
        nomorSpk: fd.value.SpkNomor,
        gdgpKode: fd.value.GdgpKode,
        jumlahPO: fd.value.JumlahPO,
        excludeNomor: isEditMode.value ? fd.value.Nomor : "",
      },
    });
    const rows: KomponenRow[] = (r.data.data || []).map((r: any) => ({
      _key: _key++,
      kode: r.kode,
      nama: r.nama,
      satuan: r.satuan,
      jumlah: Number(r.jumlah) || 0,
      gdg_kode: "",
      sudah_po: Number(r.sudah_po) || 0,
      sudah_lhk: Number(r.sudah_lhk) || 0,
      total_sudah: Number(r.total_sudah) || 0,
      kurang: Number(r.kurang) || 0,
    }));
    fd.value.KomponenRows = rows.length ? rows : [mkK()];
  } catch {
    toast.error("Gagal memuat data mutasi.");
    fd.value.IsSet = false;
  }
};

const onJumlahKomponenChange = (row: KomponenRow) => {
  row.kurang = row.jumlah - row.total_sudah;
  if (row.kurang < 0) {
    toast.warning(`Jumlah PO melebihi jumlah SPK untuk ${row.kode}.`);
  }
};

const addK = () => fd.value.KomponenRows.push(mkK());
const delK = (i: number) => {
  if (fd.value.KomponenRows.length <= 1) {
    fd.value.KomponenRows[0] = mkK();
    return;
  }
  fd.value.KomponenRows.splice(i, 1);
};
const addB = () => fd.value.BahanRows.push(mkB());
const delB = (i: number) => {
  if (fd.value.BahanRows.length <= 1) {
    fd.value.BahanRows[0] = mkB();
    return;
  }
  fd.value.BahanRows.splice(i, 1);
};

const totKomJml = computed(() =>
  fd.value.KomponenRows.reduce((s, r) => s + (Number(r.jumlah) || 0), 0),
);
const totBhnJml = computed(() =>
  fd.value.BahanRows.reduce((s, r) => s + (Number(r.jumlah) || 0), 0),
);
const totBhnTot = computed(() =>
  fd.value.BahanRows.reduce((s, r) => s + (Number(r.total) || 0), 0),
);

const validateSave = () => {
  if (["MINTA", "WAIT", "TOLAK"].includes(fd.value.pin5Status)) {
    toast.error("Transaksi sudah diclose.");
    return;
  }
  if (fd.value.Dateline < fd.value.Tanggal) {
    toast.warning("Dateline salah.");
    return;
  }
  if (!fd.value.SupNama) {
    toast.warning("Supplier belum diisi.");
    return;
  }
  if (!fd.value.SpkNama) {
    toast.warning("Isi SPK dengan benar.");
    return;
  }
  if (!fd.value.JasaKode) {
    toast.warning("Jasa harus diisi.");
    return;
  }
  if (!fd.value.GdgpKode) {
    toast.warning("Gudang Asal Produksi belum diisi.");
    return;
  }
  if (!fd.value.SupKode) {
    toast.warning("Isi Supplier dengan benar.");
    return;
  }
  if (!fd.value.KomponenRows.some((r) => r.kode && Number(r.jumlah) > 0)) {
    toast.warning("PO tidak ada detail.");
    activeTab.value = "komponen";
    return;
  }
  showSaveDialog.value = true;
};

const onPpnChange = () => {
  if (fd.value.StatusPPN === 1) {
    fd.value.PPN = 11; // default PPN 11%
  } else {
    fd.value.PPN = 0;
  }
};

const doCetak = () => {
  window.open(
    router.resolve({ name: "PoJasaPrint", params: { nomor: savedNomor.value } })
      .href,
    "_blank",
  );
  showPrintDialog.value = false;
  showPrintSjDialog.value = true;
};

const skipCetak = () => {
  showPrintDialog.value = false;
  router.push({ name: "PoJasaBrowse" });
};

const doCetakSJ = () => {
  window.open(
    router.resolve({
      name: "PoJasaPrintSJ",
      params: { nomor: savedNomor.value },
    }).href,
    "_blank",
  );
  showPrintSjDialog.value = false;
  setTimeout(() => router.push({ name: "PoJasaBrowse" }), 100);
};

const skipCetakSJ = () => {
  showPrintSjDialog.value = false;
  setTimeout(() => router.push({ name: "PoJasaBrowse" }), 100);
};

onMounted(async () => {
  // Load jasa list untuk modal (bukan dropdown)
  try {
    const r = await api.get("/garmen/po-jasa-form/jasa", {
      params: { cab: fd.value.Cab || userCab.value || "" },
    });
    jasaModalList.value = r.data.data || [];
  } catch {
    /**/
  }

  if (isEditMode.value) {
    await fetchData();
    if (fd.value.SpkNomor && fd.value.JasaKode) await loadPlanning();
  } else {
    fd.value.Cab = userCab.value || "P04";
  }
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah PO Jasa' : 'Tambah PO Jasa'"
    menu-id="102"
    :icon="IconClipboardList"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="PO Jasa"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ══════════════════════════════════════════════════════
         LEFT COLUMN — Info header + SPK + Supplier
         ══════════════════════════════════════════════════════ -->
    <template #left-column>
      <!-- PIN5 -->
      <div
        v-if="fd.pin5Status"
        class="pin5"
        :class="`pin5-${fd.pin5Status.toLowerCase()}`"
      >
        <IconAlertTriangle :size="12" />
        <span v-if="fd.pin5Status === 'MINTA'"
          >Periode diclose — belum ada pengajuan</span
        >
        <span v-else-if="fd.pin5Status === 'WAIT'">Menunggu ACC dari HO</span>
        <span v-else-if="fd.pin5Status === 'ACC'"
          >Sudah di-ACC — dapat disimpan</span
        >
        <span v-else-if="fd.pin5Status === 'TOLAK'">Pengajuan DITOLAK</span>
      </div>

      <!-- Header -->
      <div class="desktop-form-section header-section">
        <!-- Nomor dan Cab terpisah agar tidak kepotong -->
        <div class="fg">
          <label class="lb w70">Nomor</label>
          <input
            :value="fd.Nomor || '(Otomatis)'"
            readonly
            class="inp ro"
            style="width: 110px"
          />
        </div>
        <div class="fg mt4">
          <label class="lb w70">Cab</label>
          <select
            v-model="fd.Cab"
            class="sel"
            style="width: 65px"
            :disabled="!canEdit || isEditMode"
          >
            <option v-if="!userCab || userCab === 'HO-'" value="P01">
              P01
            </option>
            <option v-if="!userCab || userCab === 'HO-'" value="P04">
              P04
            </option>
            <option v-if="userCab && userCab !== 'HO-'" :value="userCab">
              {{ userCab }}
            </option>
          </select>
        </div>
        <div class="fg mt4">
          <label class="lb w70">Tanggal</label>
          <input
            type="date"
            v-model="fd.Tanggal"
            class="inp"
            :disabled="!canEdit"
          />
        </div>
        <div class="fg mt4">
          <label class="lb w70">Dateline</label>
          <input
            type="date"
            v-model="fd.Dateline"
            class="inp"
            :disabled="!canEdit"
            :style="fd.Dateline < fd.Tanggal ? 'border-color:#c62828' : ''"
          />
        </div>
        <div class="fg mt4">
          <label class="lb w70">Keterangan</label>
          <input
            v-model="fd.Keterangan"
            class="inp"
            style="flex: 1"
            :readonly="!canEdit"
          />
        </div>
        <div class="fg mt4">
          <label class="lb w70">Note</label>
          <input
            v-model="fd.Note"
            class="inp"
            style="flex: 1"
            :readonly="!canEdit"
          />
        </div>
      </div>

      <!-- SPK -->
      <div class="desktop-form-section">
        <div class="sec-title">Nomor SPK</div>
        <div class="fg mt4">
          <label class="lb w70">No SPK</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="fd.SpkNomor"
              class="inp"
              style="flex: 1; min-width: 0"
              :readonly="!canEdit || isEditMode"
              placeholder="Kode SPK... (F1)"
              @input="spkDirty = true"
              @keydown.enter.prevent="onSpkEnter"
              @keydown.f1.prevent="showSpkModal = true"
            />
            <button
              v-if="canEdit && !isEditMode"
              class="ibtn"
              @click="showSpkModal = true"
            >
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
        </div>
        <div class="fg mt4">
          <label class="lb w70">Product</label>
          <input :value="fd.SpkNama" readonly class="inp ro" style="flex: 1" />
        </div>
        <div class="fg mt4">
          <label class="lb w70">Jenis/Ukuran</label>
          <input
            :value="fd.SpkUkuran"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>
        <div class="fg mt4">
          <label class="lb w70">Total Jumlah</label>
          <input
            :value="num(fd.SpkJumlah)"
            readonly
            class="inp ro tr"
            style="width: 80px"
          />
        </div>
        <div class="fg mt4">
          <label class="lb w70">Status</label>
          <input
            :value="fd.StatusCetak === 1 ? 'Sudah Approve' : 'Belum Approve'"
            readonly
            class="inp ro"
            style="width: 130px"
            :style="
              fd.StatusCetak === 1
                ? 'color:#2e7d32;font-weight:700'
                : 'color:#e65100'
            "
          />
        </div>
      </div>

      <!-- Supplier -->
      <div class="desktop-form-section">
        <div class="sec-title">Supplier</div>
        <div class="fg mt4">
          <label class="lb w70">Kode</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="fd.SupKode"
              class="inp"
              style="width: 65px; flex-shrink: 0"
              :readonly="!canEdit"
              placeholder="(F1)"
              @input="supDirty = true"
              @keydown.enter.prevent="onSupExit"
              @blur="onSupExit"
              @keydown.f1.prevent="showSupModal = true"
            />
            <input
              :value="fd.SupNama"
              readonly
              class="inp ro"
              style="flex: 1; min-width: 0"
            />
            <button
              v-if="canEdit"
              class="ibtn"
              style="flex-shrink: 0"
              @click="showSupModal = true"
            >
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
        </div>
        <div v-if="fd.SupAlamat" class="note mt2">{{ fd.SupAlamat }}</div>
        <div v-if="fd.SupKota" class="note">{{ fd.SupKota }}</div>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════════════
         RIGHT COLUMN — split: kiri=Jasa/Gdg/Jumlah+Grid, kanan=Planning
         ══════════════════════════════════════════════════════ -->
    <template #right-column>
      <!-- Atas: Jasa/Gdg/Jumlah kiri + Planning kanan (side-by-side) -->
      <div class="desktop-form-section top-split">
        <!-- Kiri: Jasa, Gdg, Jumlah PO, PPN -->
        <div class="top-left">
          <div class="fg">
            <label class="lb w80">Jasa</label>
            <div class="ig" style="flex: 1">
              <input
                v-model="fd.JasaKode"
                class="inp"
                style="width: 50px; flex-shrink: 0"
                :readonly="!canEdit"
                placeholder="(F1)"
                @input="jasaDirty = true"
                @keydown.enter.prevent="onJasaExit"
                @keydown.f1.prevent="openJasaModal"
                @blur="onJasaExit"
              />
              <input
                :value="fd.JasaNama"
                readonly
                class="inp ro"
                style="flex: 1; min-width: 0"
              />
              <button
                v-if="canEdit"
                class="ibtn"
                style="flex-shrink: 0"
                @click="openJasaModal"
              >
                <IconSearch :size="11" color="#1565c0" />
              </button>
            </div>
          </div>
          <div class="fg mt4">
            <label class="lb w80">Gdg Asal</label>
            <div class="ig" style="flex: 1">
              <input
                :value="fd.GdgpKode"
                readonly
                class="inp ro"
                style="width: 60px; flex-shrink: 0"
                @keydown.f1.prevent="canEdit && openGdg()"
                tabindex="0"
              />
              <input
                :value="fd.GdgpNama"
                readonly
                class="inp ro"
                style="flex: 1; min-width: 0"
              />
              <button
                v-if="canEdit"
                class="ibtn"
                style="flex-shrink: 0"
                @click="openGdg"
              >
                <IconSearch :size="11" color="#1565c0" />
              </button>
            </div>
          </div>
          <div class="fg mt4">
            <label class="lb w80">Jumlah PO</label>
            <input
              v-model.number="fd.JumlahPO"
              type="number"
              class="inp tr hl"
              style="width: 90px"
              :readonly="!canEdit"
              @focus="sel"
            />
            <label class="lb ml16">Tarif</label>
            <input
              v-model.number="fd.Tarif"
              type="number"
              class="inp tr hl"
              style="width: 90px"
              :readonly="!canEdit"
              @focus="sel"
            />
          </div>
          <div class="fg mt4">
            <label class="lb w80">PPN</label>
            <input
              type="checkbox"
              v-model="fd.StatusPPN"
              :true-value="1"
              :false-value="0"
              :disabled="!canEdit"
              style="width: 14px; height: 14px"
              @change="onPpnChange"
            />
            <input
              v-if="fd.StatusPPN"
              v-model.number="fd.PPN"
              type="number"
              class="inp tr"
              style="width: 60px; margin-left: 6px"
              :readonly="!canEdit"
              @focus="sel"
            />
            <span v-if="fd.StatusPPN" class="note ml4">%</span>
            <label class="lb ml16">Set</label>
            <input
              type="checkbox"
              v-model="fd.IsSet"
              :disabled="!canEdit"
              style="width: 14px; height: 14px"
              @change="onSetChange"
            />
            <span class="note ml4">Auto-fill dari mutasi</span>
          </div>
        </div>
        <!-- Kanan: Planning PPIC -->
        <div class="top-right">
          <div class="plan-hdr">
            <span class="sec-title" style="margin: 0">Planning PPIC</span>
            <button
              v-if="fd.SpkNomor && fd.JasaKode"
              class="plan-ref"
              @click="loadPlanning"
            >
              <IconRefresh :size="11" />
            </button>
          </div>
          <div v-if="!fd.SpkNomor || !fd.JasaKode" class="plan-empty">
            Pilih SPK dan Jasa
          </div>
          <div v-else-if="isLoadingPlan" class="plan-empty">Memuat...</div>
          <div v-else-if="!planList.length" class="plan-empty">
            Tidak ada planning
          </div>
          <div v-else class="plan-scroll">
            <table class="ptbl">
              <thead>
                <tr>
                  <th style="width: 28px">Ambil</th>
                  <th>No Planning</th>
                  <th style="width: 80px">Tanggal</th>
                  <th style="width: 50px" class="tr">Jml</th>
                  <th style="width: 55px">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(p, i) in planList"
                  :key="i"
                  :class="p.ambil ? 'plan-sel' : ''"
                  @click="canEdit && selPlan(i)"
                  style="cursor: pointer"
                >
                  <td class="tc">
                    <input
                      type="checkbox"
                      :checked="p.ambil"
                      @click.stop="canEdit && selPlan(i)"
                      :disabled="!canEdit"
                    />
                  </td>
                  <td style="font-size: 10px">{{ p.no_planning }}</td>
                  <td>{{ p.tanggal }}</td>
                  <td class="tr">{{ num(p.jumlah) }}</td>
                  <td style="font-size: 10px">{{ p.status }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Bawah: Tab Komponen | Bahan — full width -->
      <div
        class="desktop-form-section"
        style="flex: 1; min-height: 0; display: flex; flex-direction: column"
      >
        <div class="tabbar">
          <button
            :class="['tb', activeTab === 'komponen' ? 'tba' : '']"
            @click="activeTab = 'komponen'"
          >
            Komponen
            <span
              v-if="fd.KomponenRows.filter((r) => r.kode).length"
              class="tbadge"
              >{{ fd.KomponenRows.filter((r) => r.kode).length }}</span
            >
          </button>
          <button
            :class="['tb', activeTab === 'bahan' ? 'tba' : '']"
            @click="activeTab = 'bahan'"
          >
            Bahan
            <span
              v-if="fd.BahanRows.filter((r) => r.kode).length"
              class="tbadge"
              >{{ fd.BahanRows.filter((r) => r.kode).length }}</span
            >
          </button>
        </div>
        <!-- Tab Komponen -->
        <div
          v-show="activeTab === 'komponen'"
          style="display: flex; flex-direction: column; flex: 1; min-height: 0"
        >
          <div class="dtbar">
            <button v-if="canEdit" class="btn-add" @click="addK">
              <IconPlus :size="10" /> Tambah
            </button>
            <span class="dsum"
              >Jml: <b>{{ num(totKomJml) }}</b></span
            >
          </div>
          <div class="gwrap">
            <table class="gtbl">
              <thead>
                <tr>
                  <th style="width: 26px">#</th>
                  <th style="width: 110px">Kode</th>
                  <th style="min-width: 130px">Nama</th>
                  <th style="width: 48px">Sat</th>
                  <th style="width: 68px" class="tr">Jumlah</th>
                  <th style="width: 65px" class="tr">Sudah PO</th>
                  <th style="width: 65px" class="tr">Sudah LHK</th>
                  <th style="width: 68px" class="tr">Total Sudah</th>
                  <th style="width: 65px" class="tr">Kurang</th>
                  <th v-if="canEdit" style="width: 24px"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in fd.KomponenRows"
                  :key="row._key"
                  :class="i % 2 === 1 ? 'rs' : ''"
                >
                  <td class="tc muted" style="font-size: 10px">{{ i + 1 }}</td>
                  <td>
                    <div class="kw">
                      <input
                        v-model="row.kode"
                        class="ci"
                        :readonly="!canEdit"
                        placeholder="Kode... (F1)"
                        @keydown.enter.prevent="onKodeBahan(row)"
                        @blur="onKodeBahan(row)"
                        @keydown.f1.prevent="openBahanModal(i, 'komponen')"
                      />
                      <button
                        v-if="canEdit"
                        class="csb"
                        @click="openBahanModal(i, 'komponen')"
                      >
                        <IconSearch :size="9" />
                      </button>
                    </div>
                  </td>
                  <td><input :value="row.nama" readonly class="ci" /></td>
                  <td><input :value="row.satuan" readonly class="ci tc" /></td>
                  <td>
                    <input
                      v-model.number="row.jumlah"
                      type="number"
                      class="ci tr"
                      :readonly="!canEdit"
                      @focus="sel"
                      @change="onJumlahKomponenChange(row)"
                    />
                  </td>
                  <td>
                    <input
                      :value="num(row.sudah_po)"
                      readonly
                      class="ci tr ro"
                    />
                  </td>
                  <td>
                    <input
                      :value="num(row.sudah_lhk)"
                      readonly
                      class="ci tr ro"
                    />
                  </td>
                  <td>
                    <input
                      :value="num(row.total_sudah)"
                      readonly
                      class="ci tr ro"
                    />
                  </td>
                  <td>
                    <input
                      :value="num(row.kurang)"
                      readonly
                      class="ci tr ro"
                      :style="
                        row.kurang < 0 ? 'color:#c62828;font-weight:700' : ''
                      "
                    />
                  </td>
                  <td v-if="canEdit" class="tc">
                    <button class="cdb" @click="delK(i)">
                      <IconTrash :size="9" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- Tab Bahan -->
        <div
          v-show="activeTab === 'bahan'"
          style="display: flex; flex-direction: column; flex: 1; min-height: 0"
        >
          <div class="dtbar">
            <button v-if="canEdit" class="btn-add" @click="addB">
              <IconPlus :size="10" /> Tambah
            </button>
            <span class="dsum"
              >Jml: <b>{{ num(totBhnJml) }}</b> &nbsp;·&nbsp; Total:
              <b>{{ num(totBhnTot, 2) }}</b></span
            >
          </div>
          <div class="gwrap">
            <table class="gtbl">
              <thead>
                <tr>
                  <th style="width: 26px">#</th>
                  <th style="width: 110px">Kode</th>
                  <th style="min-width: 130px">Nama</th>
                  <th style="width: 48px">Sat</th>
                  <th style="width: 70px" class="tr">Jumlah</th>
                  <th style="width: 80px" class="tr">Harga</th>
                  <th style="width: 90px" class="tr">Total</th>
                  <th style="width: 80px">Gudang</th>
                  <th v-if="canEdit" style="width: 24px"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in fd.BahanRows"
                  :key="row._key"
                  :class="i % 2 === 1 ? 'rs' : ''"
                >
                  <td class="tc muted" style="font-size: 10px">{{ i + 1 }}</td>
                  <td>
                    <div class="kw">
                      <input
                        v-model="row.kode"
                        class="ci"
                        :readonly="!canEdit"
                        placeholder="Kode... (F1)"
                        @keydown.f1.prevent="openBahanModal(i, 'bahan')"
                      />
                      <button
                        v-if="canEdit"
                        class="csb"
                        @click="openBahanModal(i, 'bahan')"
                      >
                        <IconSearch :size="9" />
                      </button>
                    </div>
                  </td>
                  <td><input :value="row.nama" readonly class="ci" /></td>
                  <td><input :value="row.satuan" readonly class="ci tc" /></td>
                  <td>
                    <input
                      v-model.number="row.jumlah"
                      type="number"
                      class="ci tr"
                      :readonly="!canEdit"
                      @focus="sel"
                      @change="onBahanCalc(row)"
                    />
                  </td>
                  <td>
                    <input
                      v-model.number="row.harga"
                      type="number"
                      class="ci tr"
                      :readonly="!canEdit"
                      @focus="sel"
                      @change="onBahanCalc(row)"
                    />
                  </td>
                  <td>
                    <input
                      :value="num(row.total, 2)"
                      readonly
                      class="ci tr ro"
                    />
                  </td>
                  <td>
                    <div class="kw">
                      <input
                        v-model="row.gdg_kode"
                        class="ci"
                        :readonly="!canEdit"
                        placeholder="(F1)"
                        style="width: 55px"
                        @keydown.f1.prevent="openGudangBahan(i)"
                      />
                      <button
                        v-if="canEdit"
                        class="csb"
                        @click="openGudangBahan(i)"
                      >
                        <IconSearch :size="9" />
                      </button>
                    </div>
                  </td>
                  <td v-if="canEdit" class="tc">
                    <button class="cdb" @click="delB(i)">
                      <IconTrash :size="9" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- ── SpkSearchModal (komponen resmi) ── -->
  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="mutasi"
    @selected="selectSpk"
  />

  <!-- ── SupplierSearchModal (komponen resmi) ── -->
  <SupplierSearchModal v-model="showSupModal" @selected="selectSup" />

  <!-- ── Modal Gudang (inline karena belum ada komponen) ── -->
  <v-dialog v-model="showGdgModal" max-width="440px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        Pilih Gudang Produksi
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="gdgQ"
          class="ms"
          placeholder="Cari gudang..."
          autofocus
        />
        <div class="ml">
          <div
            v-for="g in gdgFiltered"
            :key="g.Kode"
            class="mi"
            :class="{ mia: fd.GdgpKode === g.Kode }"
            @click="selectGdg(g)"
          >
            <span class="mk">{{ g.Kode }}</span
            ><span>{{ g.Nama }}</span>
          </div>
          <div v-if="!gdgFiltered.length" class="me">Tidak ada gudang</div>
        </div>
      </v-card-text>
      <v-card-actions class="pa-2 border-t">
        <v-spacer />
        <v-btn variant="text" size="small" @click="showGdgModal = false"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Modal Jasa -->
  <v-dialog v-model="showJasaModal" max-width="500px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        Cari Jasa
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="jasaQ"
          class="ms"
          placeholder="Cari kode atau nama jasa..."
          autofocus
        />
        <div class="ml">
          <div
            v-for="j in jasaFiltered"
            :key="j.Kode"
            class="mi"
            :class="{ mia: fd.JasaKode === j.Kode }"
            @click="selectJasa(j)"
          >
            <span class="mk">{{ j.Kode }}</span>
            <span style="flex: 1">{{ j.Nama }}</span>
            <span class="mute" style="font-size: 10px; color: #9e9e9e">{{
              j.gdgp_nama
            }}</span>
          </div>
          <div v-if="!jasaFiltered.length" class="me">Tidak ada data</div>
        </div>
      </v-card-text>
      <v-card-actions class="pa-2 border-t">
        <v-spacer />
        <v-btn variant="text" size="small" @click="showJasaModal = false"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Tab Komponen — bordir jika jasa J08 -->
  <BahanSearchModal
    v-model="showBahanKomponenModal"
    mode="komponen"
    :is-bordir="fd.JasaKode === 'J08'"
    @selected="selectBahan"
  />

  <!-- Tab Bahan — tidak ada filter bordir -->
  <BahanSearchModal
    v-model="showBahanBahanModal"
    mode="komponen"
    :is-bordir="false"
    @selected="selectBahan"
  />

  <GudangBahanSearchModal
    v-model="showGudangBahanModal"
    mode="all"
    @selected="selectGudangBahan"
  />

  <v-dialog v-model="showPrintDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Cetak PO Jasa
      </v-card-title>
      <v-card-text class="pa-4">
        Data <b>{{ savedNomor }}</b> berhasil disimpan.<br />
        Ingin mencetak PO Jasa?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="skipCetak">Tidak</v-btn>
        <v-spacer />
        <v-btn variant="flat" size="small" color="primary" @click="doCetak">
          Ya, Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showPrintSjDialog" max-width="360px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Cetak Surat Jalan
      </v-card-title>
      <v-card-text class="pa-4">
        Ingin mencetak Surat Jalan untuk <b>{{ savedNomor }}</b
        >?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" size="small" @click="skipCetakSJ">Tidak</v-btn>
        <v-spacer />
        <v-btn variant="flat" size="small" color="primary" @click="doCetakSJ">
          Ya, Cetak SJ
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Layout util */
.fg {
  display: flex;
  align-items: center;
  gap: 5px;
}
.mt4 {
  margin-top: 4px;
}
.ml16 {
  margin-left: 16px;
}
.ml4 {
  margin-left: 4px;
}
.mt2 {
  margin-top: 2px;
}
.lb {
  font-size: 11px;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
}
.w70 {
  width: 70px;
  flex-shrink: 0;
}
.w80 {
  width: 80px;
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

/* PIN5 */
.pin5 {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  margin-bottom: 6px;
  flex-shrink: 0;
}
.pin5-minta {
  background: #fff3e0;
  color: #e65100;
}
.pin5-wait {
  background: #e3f2fd;
  color: #1565c0;
}
.pin5-acc {
  background: #e8f5e9;
  color: #2e7d32;
}
.pin5-tolak {
  background: #ffebee;
  color: #c62828;
}

/* Section title */
.sec-title {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 3px;
}

/* Inputs */
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
.hl {
  background: #fffde7 !important;
}
.sel {
  height: 24px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 3px;
  font-size: 12px;
  outline: none;
  background: white;
}
/* ig: flex container untuk input+button, TIDAK menyembunyikan tombol */
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

/* Planning */
.plan-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.plan-ref {
  background: none;
  border: none;
  cursor: pointer;
  color: #1565c0;
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 3px;
}
.plan-ref:hover {
  background: #e3f2fd;
}
.plan-empty {
  padding: 16px;
  text-align: center;
  font-size: 11px;
  color: #9e9e9e;
  font-style: italic;
}
.plan-scroll {
  flex: 1;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  min-height: 0;
}
.ptbl {
  border-collapse: collapse;
  font-size: 10.5px;
  width: 100%;
}
.ptbl th {
  background: #1565c0;
  color: white;
  padding: 3px 4px;
  font-weight: 700;
  white-space: nowrap;
  position: sticky;
  top: 0;
}
.ptbl td {
  padding: 2px 4px;
  border-bottom: 1px solid #e0e0e0;
}
.ptbl tr:hover td {
  background: #e3f2fd;
}
.plan-sel td {
  background: #bbdefb !important;
  font-weight: 600;
}

/* Tab */
.tabbar {
  display: flex;
  gap: 3px;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 5px;
  flex-shrink: 0;
}
.tb {
  padding: 4px 12px;
  border: 1px solid #bdbdbd;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  font-size: 11px;
  font-weight: 600;
  background: #f5f5f5;
  cursor: pointer;
  color: #555;
  display: flex;
  align-items: center;
  gap: 4px;
}
.tba {
  background: white;
  color: #1565c0;
  border-color: #1565c0;
}
.tbadge {
  background: #1565c0;
  color: white;
  padding: 0 4px;
  border-radius: 8px;
  font-size: 10px;
}

/* Grid */
.dtbar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-shrink: 0;
}
.dsum {
  font-size: 11px;
  color: #555;
}
.btn-add {
  height: 24px;
  padding: 0 8px;
  background: #2e7d32;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.btn-add:hover {
  opacity: 0.88;
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
.kw {
  display: flex;
  align-items: center;
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
.csb {
  width: 18px;
  min-width: 18px;
  height: 18px;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1565c0;
  flex-shrink: 0;
}
.csb:hover {
  background: #bbdefb;
}
.cdb {
  width: 18px;
  height: 18px;
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c62828;
}
.cdb:hover {
  background: #ffcdd2;
}

/* Modal inline */
.ms {
  width: 100%;
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 7px;
  font-size: 12px;
  outline: none;
  margin-bottom: 7px;
  box-sizing: border-box;
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
.mia {
  background: #1565c0;
  color: white;
}
.mk {
  font-weight: 700;
  width: 65px;
  flex-shrink: 0;
  font-family: monospace;
  font-size: 10px;
}
.modal-tw {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
}
.mtt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.mtt th {
  background: #1565c0;
  color: white;
  padding: 3px 7px;
  font-weight: 700;
  white-space: nowrap;
  position: sticky;
  top: 0;
}
.mtt td {
  padding: 3px 7px;
  border-bottom: 1px solid #e0e0e0;
  white-space: nowrap;
}
.mtr {
  cursor: pointer;
}
.mtr:hover td {
  background: #e3f2fd;
}
.mono {
  font-family: monospace;
  font-size: 10px;
  color: #1565c0;
  font-weight: 600;
}
.me {
  padding: 12px;
  text-align: center;
  font-size: 11px;
  color: #9e9e9e;
  font-style: italic;
}
/* rc = right column internal split */
.top-split {
  display: flex !important;
  flex-direction: row !important;
  gap: 12px;
  align-items: stretch;
}
.top-left {
  flex: 1;
  min-width: 0;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.top-right {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e0e0e0;
  padding-left: 12px;
}
@media (max-width: 1400px) {
  .top-right {
    width: 320px;
  }
}
@media (max-width: 1100px) {
  .top-split {
    flex-direction: column !important;
  }
  .top-right {
    width: 100%;
    border-left: none;
    border-top: 1px solid #e0e0e0;
    padding-left: 0;
    padding-top: 8px;
    height: 180px;
  }
}
</style>
