<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import { mutasiProduksiFormService } from "@/services/garmen/mutasiProduksiFormService";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import api from "@/services/api";
import {
  IconBuildingFactory2,
  IconSearch,
  IconPlus,
  IconTrash,
  IconTable,
  IconListDetails,
  IconAlertTriangle,
} from "@tabler/icons-vue";

import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import HistoryPakaiMaterialModal from "@/components/lookups/HistoryPakaiMaterialModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import SpgSearchModal from "@/components/lookups/SpgSearchModal.vue";

// ── Types ──────────────────────────────────────────────────────────────
interface DetailRow {
  _key: number;
  kode: string;
  nama: string;
  satuan: string;
  size: string;
  qtyorder: number;
  lhk: number;
  jumlah: number;
  sudah: number;
  kurang: number;
  bslini: number;
  bskainsablon: number;
  bskain: number;
  gantibs: number;
  panjang: number;
  lebar: number;
  terima?: number;
  stok?: number;
}
interface PlanningRow {
  no_planning: string;
  tanggal: string;
  jumlah: number;
  status: string;
  line_kelompok: string;
  dipilih: boolean;
}
interface FormData {
  Nomor: string;
  Tanggal: string;
  Cab: string;
  Keterangan: string;
  NomorSpk: string;
  NamaSpk: string;
  JenisBarang: string;
  Finishing: string;
  JumlahSpk: number;
  TglSpk: string;
  ckCetak: boolean;
  ckBordir: boolean;
  Divisi: string;
  SpkKodek: string;
  JenisMutasi: string;
  GdgAsal: string;
  NamaGdgAsal: string;
  GdgTujuan: string;
  NamaGdgTujuan: string;
  Kelompok: string;
  KelompokTujuan: string;
  Jumlah: number;
  Komponen: string;
  BabaranStd: number;
  BabaranActual: number;
  SelisihBabaran: number;
  GramasiMkb: string;
  SettingMkb: string;
  QtyBerat: number;
  SatBerat: string;
  NoMaterial: string;
  TglMaterial: string;
  KodeKain: string;
  NamaKain: string;
  SatKain: string;
  JmlKain: number;
  Gramasi: string;
  Setting: string;
  SupKode: string;
  SupplierKain: string;
  LhkSudah: number;
  LhkKurang: number;
  Alasan: string;
  AsalKerjaan: string;
  ckapv: boolean;
  xApv: string;
  PlanNomor: string;
  PlanTanggal: string;
  PlanJumlah: number;
  PlanStatus: string;
  pin5Status: string;
  noPlanStatus: string;
  pin5Urut: number;
  Detail: DetailRow[];
}

// ── Store & router ─────────────────────────────────────────────────────
const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();
const userCab = computed(() => authStore.user?.cabang || "");
const userKode = computed(() => authStore.user?.kode || "");
const isHo = computed(() => !userCab.value || userCab.value === "HO-");

// ── Helpers ────────────────────────────────────────────────────────────
const todayWIB = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
let _key = 1;
const mkRow = (): DetailRow => ({
  _key: _key++,
  kode: "",
  nama: "",
  satuan: "",
  size: "",
  qtyorder: 0,
  lhk: 0,
  jumlah: 0,
  sudah: 0,
  kurang: 0,
  bslini: 0,
  bskainsablon: 0,
  bskain: 0,
  gantibs: 0,
  panjang: 0,
  lebar: 0,
});
const num = (v: any, d = 0) =>
  Number(v || 0).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
const sel = (e: FocusEvent) => (e.target as HTMLInputElement).select();

// ── Tab ────────────────────────────────────────────────────────────────
const tab = ref<"h" | "d">("h");

// ── Mutasi labels ──────────────────────────────────────────────────────
const MUTASI = computed(() => {
  const isP01 = (fd.value.Cab || userCab.value) === "P01";
  return [
    { val: "1", label: "Potong ke QC Ptg" },
    { val: "2", label: "QC Ptg ke Cetak" },
    { val: "3", label: "Cetak ke QC Cetak" },
    { val: "4", label: isP01 ? "QC Cetak ke Jahit" : "DC ke Jahit" },
    { val: "5", label: "Jahit ke Lipat" },
    { val: "6", label: "Lipat ke Koli" },
  ];
});

// ── Initial data ───────────────────────────────────────────────────────
const init: FormData = {
  Nomor: "",
  Tanggal: todayWIB(),
  Cab: "",
  Keterangan: "",
  NomorSpk: "",
  NamaSpk: "",
  JenisBarang: "",
  Finishing: "",
  JumlahSpk: 0,
  TglSpk: "",
  ckCetak: false,
  ckBordir: false,
  Divisi: "",
  SpkKodek: "",
  JenisMutasi: "",
  GdgAsal: "",
  NamaGdgAsal: "",
  GdgTujuan: "",
  NamaGdgTujuan: "",
  Kelompok: "",
  KelompokTujuan: "",
  Jumlah: 0,
  Komponen: "",
  BabaranStd: 0,
  BabaranActual: 0,
  SelisihBabaran: 0,
  GramasiMkb: "",
  SettingMkb: "",
  QtyBerat: 0,
  SatBerat: "",
  NoMaterial: "",
  TglMaterial: "",
  KodeKain: "",
  NamaKain: "",
  SatKain: "",
  JmlKain: 0,
  Gramasi: "",
  Setting: "",
  SupKode: "",
  SupplierKain: "",
  LhkSudah: 0,
  LhkKurang: 0,
  Alasan: "",
  AsalKerjaan: "",
  ckapv: false,
  xApv: "Y",
  PlanNomor: "",
  PlanTanggal: "",
  PlanJumlah: 0,
  PlanStatus: "",
  pin5Status: "",
  noPlanStatus: "",
  pin5Urut: 0,
  Detail: [mkRow()],
};

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
  params,
} = useForm<FormData>({
  menuId: "109",
  initialData: init,
  immediate: false,
  fetchApi: async () => {
    try {
      const res = await mutasiProduksiFormService.getById(
        params.nomor as string,
      );

      const d = res.data.data;
      const h = d.header;
      const gdgAsal = h.mph_gdgasal || "";
      const cab = h.mph_cab || userCab.value || "P04";

      const GUDANG_TO_MUTASI: Record<string, Record<string, string>> = {
        P04: {
          GP001: "1",
          GP012: "2",
          GP002: "3",
          GP032: "4",
          GP003: "5",
          GP004: "6",
        },
        P01: {
          GP015: "1",
          GP021: "2",
          GP017: "3",
          GP022: "4",
          GP018: "5",
          GP019: "6",
        },
      };
      const cabKey = cab === "P01" ? "P01" : "P04";
      const jenisMutasi = GUDANG_TO_MUTASI[cabKey]?.[gdgAsal] || "";
      const detail: DetailRow[] = (d.detail || []).map((r: any) => ({
        _key: _key++,
        kode: r.mpd_bhn_kode || "",
        nama: r.mpd_nama || "",
        satuan: r.mpd_satuan || "",
        size: r.mpd_size || "",
        qtyorder: Number(r.qtyorder) || 0,
        lhk: Number(r.mpd_lhk) || 0,
        jumlah: Number(r.mpd_jumlah) || 0,
        sudah: Number(r.sudah) || 0,
        kurang: Number(r.kurang) || 0,
        bslini: Number(r.mpd_jumlah_bs) || 0,
        bskainsablon: Number(r.mpd_jumlah_sablon) || 0,
        bskain: Number(r.mpd_jumlah_kain) || 0,
        gantibs: Number(r.mpd_gantibs) || 0,
        panjang: Number(r.mpd_panjang) || 0,
        lebar: Number(r.mpd_lebar) || 0,
        terima: Number(r.terima) || 0,
        stok: Number(r.stok) || 0,
      }));
      if (!detail.length) detail.push(mkRow());
      const j = Number(h.mph_jumlah) || 0,
        b = Number(h.qtyberat) || 0;
      const std = Number(h.bbrstd) || 0,
        sat = h.satberat || "";
      const actual = j > 0 && b > 0 ? (sat === "KG" ? j / b : b / j) : 0;
      const selisih =
        std > 0 && actual > 0
          ? sat === "KG"
            ? actual - std
            : std - actual
          : 0;
      return {
        Nomor: h.mph_nomor || "",
        Tanggal: h.mph_tanggal || todayWIB(),
        Cab: h.mph_cab || userCab.value || "P04",
        Keterangan: h.mph_keterangan || "",
        NomorSpk: h.mph_spk_nomor || "",
        NamaSpk: h.spk_nama || "",
        JenisBarang: h.jo_nama || "",
        Finishing: h.finishing || "",
        JumlahSpk: Number(h.spk_jumlah) || 0,
        TglSpk: h.tglspk ? h.tglspk.toString().substring(0, 10) : "",
        ckCetak: h.xcetak === "Y",
        ckBordir: h.xbordir === "Y",
        Divisi: String(h.spk_divisi || ""),
        SpkKodek: "",
        JenisMutasi: jenisMutasi,
        GdgAsal: gdgAsal,
        NamaGdgAsal: h.nama_gdg_asal || "",
        GdgTujuan: h.mph_gdgtujuan || "",
        NamaGdgTujuan: h.nama_gdg_tujuan || "",
        Kelompok: h.mph_kelompok || "",
        KelompokTujuan: h.mph_kelompok_tujuan || "",
        Jumlah: j,
        Komponen: h.mph_komponen || "",
        BabaranStd: std,
        BabaranActual: actual,
        SelisihBabaran: selisih,
        GramasiMkb: "",
        SettingMkb: "",
        QtyBerat: b,
        SatBerat: sat,
        NoMaterial: h.mph_nomaterial || "",
        KodeKain: h.mph_bhn_kode || "",
        NamaKain: h.namakain || "",
        SatKain: h.satkain || "",
        JmlKain: Number(h.jmlkain) || 0,
        TglMaterial: h.promin_tanggal || "",
        Gramasi: h.gramasi || "",
        Setting: h.sett || "",
        SupKode: h.supkode || "",
        SupplierKain: h.mph_supplierkain || "",
        LhkSudah: Number(h.lhk_sudah) || 0,
        LhkKurang: Number(h.lhk_kurang) || 0,
        Alasan: h.mph_alasan || "",
        AsalKerjaan: h.mph_asal_kerjaan || "",
        ckapv: h.mph_apv !== "N",
        xApv: h.mph_apv || "Y",
        PlanNomor: d.planning?.no_planning || "",
        PlanTanggal: d.planning?.tanggal || "",
        PlanJumlah: d.planning?.jumlah || 0,
        PlanStatus: d.planning?.status || "",
        pin5Status: d.pin5Status || "",
        noPlanStatus: d.noPlanStatus || "",
        pin5Urut: 0,
        Detail: detail,
      };
    } catch (e) {
      console.error("fetchApi error:", e);
      throw e;
    }
  },
  submitApi: async (data): Promise<any> => {
    const pl = planList.value.find((p) => p.dipilih);
    const payload = {
      ...data,
      PlanNomor: pl?.no_planning || "",
      PlanTanggal: pl?.tanggal || null,
      PlanJumlah: pl?.jumlah || 0,
      PlanStatus: pl?.status || "",
      Detail: data.Detail.map(({ _key, ...r }) => r),
    };
    return isEditMode.value
      ? mutasiProduksiFormService.update(data.Nomor, payload)
      : mutasiProduksiFormService.save(payload);
  },
  onSuccess: (res: any) => {
    toast.success(`Data ${res?.data?.data?.nomor || ""} berhasil disimpan.`);
    router.push("/garmen/mutasi-produksi");
  },
});

const fd = formData;
const isLiniPotong = computed(
  () => fd.value.GdgAsal === "GP001" || fd.value.GdgAsal === "GP015",
);
const isDC = computed(() => fd.value.GdgAsal === "GP032");
const isSpg = computed(() => fd.value.NomorSpk.startsWith("SPG"));
const divisiMap = ref<Record<string, string>>({});
const divisiLabel = computed(() => {
  const d = fd.value.Divisi;
  if (!d) return "";
  const nama = divisiMap.value[d];
  return nama ? `${d} - ${nama}` : d;
});

const loadDivisi = async () => {
  try {
    const res = await api.get("/lookups/divisi");
    const rows: { kode: number; nama: string }[] = res.data.data || [];
    divisiMap.value = Object.fromEntries(
      rows.map((r) => [String(r.kode), r.nama]),
    );
  } catch {
    /**/
  }
};
const canEdit = computed(
  () => !["MINTA", "WAIT", "TOLAK"].includes(fd.value.pin5Status),
);
const showKelompokTujuan = computed(
  () => fd.value.GdgTujuan === "GP003" && kelTujuanOpts.value.length > 0,
);
const showAsalKerjaan = computed(
  () =>
    fd.value.GdgAsal === "GP022" && (fd.value.Cab === "P01" || !userCab.value),
);

// ── Lookups ────────────────────────────────────────────────────────────
const komponenOpts = ref<{ komponen: string; babaran: number }[]>([]);
const kelOpts = ref<string[]>([]);
const kelTujuanOpts = ref<string[]>([]);
const planList = ref<PlanningRow[]>([]);

// ── SPK Modal ──────────────────────────────────────────────────────────
const showSpkModal = ref(false);
const spkDirty = ref(false);
const spkLama = ref("");
const onSpkSelected = async (item: any) => {
  showSpkModal.value = false;
  spkDirty.value = false;
  const nomor = item.Nomor || item.spk_nomor || item.mspk_nomor || "";

  // Cek jika detail sudah ada dan SPK berubah
  if (spkLama.value && nomor !== spkLama.value) {
    const adaDetail = fd.value.Detail.some((r) => r.nama);
    if (adaDetail) {
      const ok = confirm("Detail sudah ada.\nYakin ingin ganti SPK?");
      if (!ok) return;
      fd.value.Detail = [mkRow()];
      fd.value.GdgAsal = "";
      fd.value.NamaGdgAsal = "";
      fd.value.NoMaterial = "";
      fd.value.TglMaterial = "";
      fd.value.KodeKain = "";
      fd.value.NamaKain = "";
      fd.value.SatKain = "";
      fd.value.JmlKain = 0;
      fd.value.LhkSudah = 0;
      fd.value.LhkKurang = 0;
      fd.value.Komponen = "";
      fd.value.BabaranStd = 0;
      fd.value.BabaranActual = 0;
      fd.value.SelisihBabaran = 0;
      kelOpts.value = [];
    }
  }
  await applySpk(nomor);
};
const onSpkEnter = async () => {
  if (!spkDirty.value) return;
  const nomor = fd.value.NomorSpk.trim();
  if (!nomor) return;

  // Cek jika detail sudah ada dan SPK berubah
  if (spkLama.value && nomor !== spkLama.value) {
    const adaDetail = fd.value.Detail.some((r) => r.nama);
    if (adaDetail) {
      const ok = confirm("Detail sudah ada.\nYakin ingin ganti SPK?");
      if (!ok) {
        // Kembalikan SPK lama
        fd.value.NomorSpk = spkLama.value;
        spkDirty.value = false;
        return;
      }
      // Reset detail dan field terkait
      fd.value.Detail = [mkRow()];
      fd.value.GdgAsal = "";
      fd.value.NamaGdgAsal = "";
      fd.value.NoMaterial = "";
      fd.value.TglMaterial = "";
      fd.value.KodeKain = "";
      fd.value.NamaKain = "";
      fd.value.SatKain = "";
      fd.value.JmlKain = 0;
      fd.value.LhkSudah = 0;
      fd.value.LhkKurang = 0;
      fd.value.Komponen = "";
      fd.value.BabaranStd = 0;
      fd.value.BabaranActual = 0;
      fd.value.SelisihBabaran = 0;
      kelOpts.value = [];
    }
  }

  spkDirty.value = false;
  await applySpk(nomor);
};
const applySpk = async (nomor: string) => {
  try {
    const res = await mutasiProduksiFormService.getSpkInfo(nomor);
    const s = res.data.data;
    fd.value.NomorSpk = s.spk_nomor;
    fd.value.NamaSpk = s.spk_nama || "";
    fd.value.JenisBarang = s.jo_nama || "";
    fd.value.Finishing = s.spk_finishing || "";
    fd.value.JumlahSpk = Number(s.spk_jumlah) || 0;
    fd.value.TglSpk = s.spk_tanggal
      ? s.spk_tanggal.toString().substring(0, 10)
      : "";
    fd.value.ckCetak = s.xcetak === "Y";
    fd.value.ckBordir = s.xbordir === "Y";
    fd.value.Divisi = String(s.spk_divisi || "");
    fd.value.SpkKodek = s.spk_kodek || "";
    fd.value.BabaranActual = 0;
    fd.value.SelisihBabaran = 0;
    if (nomor.startsWith("SPG")) {
      fd.value.JenisBarang = "";
      fd.value.Jumlah = 0;
    }
    fd.value.Detail = [mkRow()];
    spkLama.value = s.spk_nomor;
    await loadKomponen();
    if (fd.value.JenisMutasi) await loadPlanning();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "SPK tidak ditemukan.");
    fd.value.NomorSpk = spkLama.value;
  }
};

// ── Mutasi → auto gudang ───────────────────────────────────────────────
const onMutasi = async (val: string) => {
  if (!canEdit.value) return;
  fd.value.JenisMutasi = val;
  fd.value.Detail = [mkRow()];
  try {
    const cab = fd.value.Cab || userCab.value || "P04";
    const r = await mutasiProduksiFormService.getGudangByMutasi(cab, val);
    const { asal, tujuan } = r.data.data;
    const [rA, rT] = await Promise.all([
      mutasiProduksiFormService.getNamaGudang(asal),
      mutasiProduksiFormService.getNamaGudang(tujuan),
    ]);
    fd.value.GdgAsal = asal;
    fd.value.NamaGdgAsal = rA.data.data?.gdgp_nama || "";
    fd.value.GdgTujuan = tujuan;
    fd.value.NamaGdgTujuan = rT.data.data?.gdgp_nama || "";
    if (rA.data.data?.gdgp_cab) fd.value.Cab = rA.data.data.gdgp_cab;
    await Promise.all([loadKelompok(), loadKelompokTujuan()]);
    await loadPlanning();
    if (isDC.value && fd.value.NomorSpk) await loadKomponenProof();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat gudang.");
  }
};

// ── Gudang modal ───────────────────────────────────────────────────────
const showGdgModal = ref(false);
const gdgMode = ref<"asal" | "tujuan">("asal");
const gdgQ = ref("");
const gdgList = ref<any[]>([]);
const gdgFiltered = computed(() => {
  const q = gdgQ.value.toLowerCase();
  return gdgList.value.filter(
    (g) =>
      !q ||
      g.Kode.toLowerCase().includes(q) ||
      g.Nama.toLowerCase().includes(q),
  );
});
const openGdg = async (mode: "asal" | "tujuan") => {
  gdgQ.value = "";
  gdgMode.value = mode;
  const cab = fd.value.Cab || userCab.value;
  const res = await mutasiProduksiFormService.searchGudangProduksi("", cab);
  gdgList.value = res.data.data || [];
  showGdgModal.value = true;
};
const selectGdg = async (item: any) => {
  const mode = gdgMode.value;
  showGdgModal.value = false;
  if (mode === "asal") {
    if (!fd.value.NamaSpk) {
      toast.warning("SPK harus diisi terlebih dahulu.");
      return;
    }
    try {
      await mutasiProduksiFormService.cekGudangAsal({
        nomorSpk: fd.value.NomorSpk,
        gdgAsal: item.Kode,
        ckcetak: fd.value.ckCetak,
        ckbordir: fd.value.ckBordir,
        lbldivisi: fd.value.Divisi,
      });
      fd.value.GdgAsal = item.Kode;
      fd.value.NamaGdgAsal = item.Nama;
      await loadKelompok();
      await loadPlanning();
      if (isDC.value) await loadKomponenProof();
      else fd.value.Detail = [mkRow()];
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Validasi gagal.");
    }
  } else {
    fd.value.GdgTujuan = item.Kode;
    fd.value.NamaGdgTujuan = item.Nama;
    await loadKelompokTujuan();
  }
};

// ── Kelompok ───────────────────────────────────────────────────────────
const loadKelompok = async () => {
  if (!fd.value.NamaGdgAsal) return;
  try {
    const res = await mutasiProduksiFormService.getKelompokList(
      fd.value.NamaGdgAsal,
      fd.value.Cab || userCab.value,
    );
    kelOpts.value = res.data.data || [];
    if (isDC.value) fd.value.Kelompok = "DC";
    else if (kelOpts.value.length && !fd.value.Kelompok)
      fd.value.Kelompok = kelOpts.value[0];
  } catch {
    /**/
  }
};
const loadKelompokTujuan = async () => {
  try {
    const res = await mutasiProduksiFormService.getKelompokTujuanList(
      fd.value.GdgTujuan,
      fd.value.Cab || userCab.value,
    );
    kelTujuanOpts.value = res.data.data || [];
    if (kelTujuanOpts.value.length && !fd.value.KelompokTujuan)
      fd.value.KelompokTujuan = kelTujuanOpts.value[0];
  } catch {
    /**/
  }
};

// ── Komponen ───────────────────────────────────────────────────────────
const loadKomponen = async () => {
  if (!fd.value.NomorSpk) return;
  const res = await mutasiProduksiFormService.getKomponenList(
    fd.value.NomorSpk,
  );
  komponenOpts.value = res.data.data || [];
};
const onKomponen = async () => {
  if (!fd.value.Komponen || !fd.value.NomorSpk) return;
  const res = await mutasiProduksiFormService.getBabaranInfo(
    fd.value.NomorSpk,
    fd.value.Komponen,
  );
  fd.value.BabaranStd = res.data.data.babaran || 0;
  fd.value.GramasiMkb = res.data.data.mkb?.gramasi || "";
  fd.value.SettingMkb = res.data.data.mkb?.setting || "";
  hitung();
  if (isLiniPotong.value && !isSpg.value) await loadKomponenMap();
};
const loadKomponenMap = async () => {
  const excl = isEditMode.value ? fd.value.Nomor : "";
  const res = await mutasiProduksiFormService.loadKomponenMap(
    fd.value.NomorSpk,
    fd.value.Komponen,
    fd.value.JumlahSpk,
    isEditMode.value ? fd.value.Nomor : "",
    fd.value.GdgAsal,
  );

  if (res.data.data?.length) {
    fd.value.Detail = res.data.data.map((r: any) => ({
      _key: _key++,
      ...r,
      lhk: 0,
      jumlah: 0,
      bslini: 0,
      bskainsablon: 0,
      bskain: 0,
      gantibs: 0,
      panjang: 0,
      lebar: 0,
    }));
  }
};

// ── Hitung babaran ─────────────────────────────────────────────────────
const hitung = () => {
  const j = Number(fd.value.Jumlah) || 0;
  const b = Number(fd.value.QtyBerat) || 0;
  if (!j || !b) {
    fd.value.BabaranActual = 0;
    fd.value.SelisihBabaran = 0;
    return;
  }
  const actual = fd.value.SatBerat === "KG" ? j / b : b / j;
  fd.value.BabaranActual = actual;
  const std = fd.value.BabaranStd || 0;
  fd.value.SelisihBabaran =
    !std || !actual
      ? 0
      : fd.value.SatBerat === "KG"
        ? actual - std
        : std - actual;
};

// ── Planning ───────────────────────────────────────────────────────────
const loadPlanning = async () => {
  if (!fd.value.NomorSpk || !fd.value.JenisMutasi) return;
  try {
    const res = await mutasiProduksiFormService.getPlanningPpic(
      fd.value.NomorSpk,
      fd.value.JenisMutasi,
      fd.value.Kelompok,
      fd.value.TglSpk,
    );
    planList.value = (res.data.data || []).map((r: any, i: number) => ({
      ...r,
      dipilih: i === 0,
    }));
    if (isEditMode.value && fd.value.PlanNomor)
      planList.value.forEach((r) => {
        r.dipilih = r.no_planning === fd.value.PlanNomor;
      });
  } catch {
    planList.value = [];
  }
};
const selPlan = (i: number) =>
  planList.value.forEach((r, idx) => {
    r.dipilih = idx === i;
  });

// ── No Material ────────────────────────────────────────────────────────
const showMatModal = ref(false);
const matQ = ref("");
const matList = ref<any[]>([]);
const openMaterial = async () => {
  if (!fd.value.NomorSpk) {
    toast.warning("Isi No SPK terlebih dahulu.");
    return;
  }
  const res = await mutasiProduksiFormService.searchNoMaterial(
    fd.value.NomorSpk,
    "",
  );
  matList.value = res.data.data || [];
  showMatModal.value = true;
};
const filterMat = async () => {
  const res = await mutasiProduksiFormService.searchNoMaterial(
    fd.value.NomorSpk,
    matQ.value,
  );
  matList.value = res.data.data || [];
};
const selectMat = async (m: any) => {
  showMatModal.value = false;
  fd.value.NoMaterial = m.Nomor;
  fd.value.TglMaterial = m.Tanggal;
  fd.value.KodeKain = m.Kode;
  fd.value.NamaKain = m.JenisKain;
  fd.value.SatKain = m.Satuan;
  fd.value.JmlKain = Number(m.Jumlah) || 0;
  fd.value.SupKode = m.Kodesup;
  fd.value.SupplierKain = m.NamaSupplier;
  fd.value.SatBerat = m.Satuan === "KG" ? "KG" : "MTR";
  await refreshLhk();
};
const refreshLhk = async () => {
  if (!fd.value.NoMaterial || !fd.value.KodeKain) return;
  try {
    const excl = isEditMode.value ? fd.value.Nomor : "";
    const res = await mutasiProduksiFormService.getNoMaterialDetail(
      fd.value.NoMaterial,
      fd.value.KodeKain,
      excl,
    );
    fd.value.LhkSudah = res.data.data.lhk || 0;
    fd.value.LhkKurang = fd.value.JmlKain - fd.value.LhkSudah;
    fd.value.Gramasi = res.data.data.detail?.gramasi || "";
    fd.value.Setting = res.data.data.detail?.sett || "";
  } catch {
    /**/
  }
};

// ── DC Komponen Proof ──────────────────────────────────────────────────
const loadKomponenProof = async () => {
  if (!fd.value.NomorSpk) return;
  const res = await mutasiProduksiFormService.getKomponenProof(
    fd.value.NomorSpk,
  );
  const { detail, terima, sudahDc } = res.data.data;
  fd.value.Detail = (detail || []).map((r: any) => {
    const t = terima.find((x: any) => x.kode === r.kode && x.size === r.size);
    const s = sudahDc.find((x: any) => x.kode === r.kode && x.size === r.size);
    const tq = Number(t?.qty) || 0;
    const sq = Number(s?.qty) || 0;
    return {
      _key: _key++,
      kode: r.kode,
      nama: r.nama,
      satuan: r.satuan,
      size: r.size || "",
      qtyorder: Number(r.qtyorder) || 0,
      lhk: 0,
      jumlah: 0,
      sudah: sq,
      kurang: (Number(r.qtyorder) || 0) - sq,
      bslini: 0,
      bskainsablon: 0,
      bskain: 0,
      gantibs: 0,
      panjang: 0,
      lebar: 0,
      terima: tq,
      stok: tq - sq,
    };
  });
};

// ── Bahan grid ─────────────────────────────────────────────────────────
const showBahanModal = ref(false);
const bahanRowIdx = ref(0);
const openBahan = async (idx: number) => {
  if (!fd.value.NomorSpk || !fd.value.GdgAsal) {
    toast.warning("SPK dan Lini Asal harus diisi terlebih dahulu.");
    return;
  }
  bahanRowIdx.value = idx;
  showBahanModal.value = true;
};
const onBahanSelected = async (item: any) => {
  const excl = isEditMode.value ? fd.value.Nomor : "";
  // Tentukan isBordir dari gudang asal
  const isBordir = fd.value.GdgAsal === "GP014" || fd.value.GdgAsal === "GP016";
  try {
    const res = await mutasiProduksiFormService.loadKodeBahan(
      item.Kode,
      fd.value.NomorSpk,
      fd.value.GdgAsal,
      excl,
      fd.value.SpkKodek,
    );
    const rows: DetailRow[] = (res.data.data || []).map((r: any) => ({
      _key: _key++,
      ...r,
    }));
    for (const nr of rows) {
      const dup = fd.value.Detail.some(
        (e) => e.kode === nr.kode && e.size === nr.size && e.nama,
      );
      if (dup) {
        toast.warning(`Kode ${nr.kode} size ${nr.size || "-"} sudah ada.`);
        continue;
      }
      const ei = fd.value.Detail.findIndex((e) => !e.nama);
      if (ei >= 0) fd.value.Detail.splice(ei, 1, nr);
      else fd.value.Detail.push(nr);
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat bahan.");
  }
};
const onKodeBahan = async (row: DetailRow) => {
  let input = (row.kode || "").trim();
  if (!input || !fd.value.NomorSpk || !fd.value.GdgAsal) return;

  // Auto-expand 3-6 digit angka → cari di backend dengan suffix
  // Misal: "400" → "LL-000400"
  if (/^\d{1,6}$/.test(input)) {
    const padded = input.padStart(6, "0");
    // Cari di backend dengan keyword suffix
    try {
      const res = await mutasiProduksiFormService.searchBahanBySuffix(
        padded,
        fd.value.GdgAsal,
      );
      const found = res.data.data?.[0];
      if (found) {
        row.kode = found.Kode;
        row.nama = found.Nama;
        row.satuan = found.Satuan;
        return;
      }
    } catch {
      /**/
    }
    toast.error(`Kode suffix ${input} tidak ditemukan.`);
    row.kode = "";
    row.nama = "";
    return;
  }

  // Normal full kode
  const excl = isEditMode.value ? fd.value.Nomor : "";
  try {
    const res = await mutasiProduksiFormService.loadKodeBahan(
      input,
      fd.value.NomorSpk,
      fd.value.GdgAsal,
      excl,
      fd.value.SpkKodek,
    );
    const rows = res.data.data || [];
    if (rows.length) Object.assign(row, { ...rows[0], _key: row._key });
    else {
      toast.error("Kode tidak ditemukan.");
      row.kode = "";
      row.nama = "";
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode tidak ditemukan.");
    row.kode = "";
    row.nama = "";
  }
};
const onJumlah = (row: DetailRow) => {
  row.lhk = row.jumlah;
  if (row.jumlah > row.kurang && !isSpg.value)
    toast.warning(`Jumlah melebihi kekurangan (${num(row.kurang)}).`);
};
const addRow = () => fd.value.Detail.push(mkRow());
const delRow = (i: number) => {
  if (fd.value.Detail.length <= 1) {
    fd.value.Detail[0] = mkRow();
    return;
  }
  fd.value.Detail.splice(i, 1);
};

const showSpgModal = ref(false);
const onSpgSelected = async (item: any) => {
  showSpgModal.value = false;
  spkDirty.value = false;
  // SPG: Nomor = spgi_spk, pakai applySpk langsung
  await applySpk(item.Nomor || "");
};

// ── Totals ────────────────────────────────────────────────────────────
const totJml = computed(() =>
  fd.value.Detail.reduce((s, r) => s + (Number(r.jumlah) || 0), 0),
);
const totBslini = computed(() =>
  fd.value.Detail.reduce((s, r) => s + (Number(r.bslini) || 0), 0),
);
const totBsKainSbl = computed(() =>
  fd.value.Detail.reduce((s, r) => s + (Number(r.bskainsablon) || 0), 0),
);
const totBsKain = computed(() =>
  fd.value.Detail.reduce((s, r) => s + (Number(r.bskain) || 0), 0),
);

// ── Proses sebelumnya ──────────────────────────────────────────────────
const showProsesModal = ref(false);
const prosesRows = ref<any[]>([]);
const showHistoryModal = ref(false);
const openProses = async () => {
  if (!fd.value.NomorSpk || !fd.value.GdgAsal) {
    toast.warning("SPK dan Lini Asal harus diisi.");
    return;
  }
  const excl = isEditMode.value ? fd.value.Nomor : "";
  const res = await mutasiProduksiFormService.getProsesSebelumnya(
    fd.value.NomorSpk,
    fd.value.GdgAsal,
    excl,
  );
  prosesRows.value = res.data.data || [];
  showProsesModal.value = true;
};
const openHistoryMaterial = () => {
  if (!fd.value.NoMaterial || !fd.value.KodeKain) {
    toast.warning("No Material dan Kode Kain harus diisi terlebih dahulu.");
    return;
  }
  showHistoryModal.value = true;
};
// ── Validate save ──────────────────────────────────────────────────────
const validateSave = async () => {
  if (["MINTA", "WAIT", "TOLAK"].includes(fd.value.pin5Status)) {
    toast.error(
      "Transaksi sudah diclose. Silahkan minta approve untuk menyimpan.",
    );
    return;
  }

  // 1. Tanggal tidak boleh maju
  const today = todayWIB();
  if (fd.value.Tanggal > today) {
    toast.warning("Tanggal tidak boleh maju.");
    return;
  }

  if (!fd.value.NamaSpk) {
    toast.warning("SPK belum diisi.");
    return;
  }
  if (!fd.value.GdgAsal) {
    toast.warning("Gudang Asal belum diisi.");
    return;
  }
  if (!fd.value.GdgTujuan) {
    toast.warning("Gudang Tujuan belum diisi.");
    return;
  }
  if (fd.value.GdgAsal === fd.value.GdgTujuan) {
    toast.warning("Gudang tidak boleh sama.");
    return;
  }
  if (showAsalKerjaan.value && !fd.value.AsalKerjaan) {
    toast.warning("Asal Pengerjaan harus dipilih.");
    return;
  }

  // 2. Cek komponen identifikasi — hanya SPK >= 01-12-2024 dan bukan SPG
  const batasTgl = "2024-12-01";
  const isSpgNomor = fd.value.NomorSpk.startsWith("SPG");
  if (!isSpgNomor && fd.value.TglSpk >= batasTgl) {
    const gdg = fd.value.GdgAsal;
    let liniCek: string | null = null;
    if (gdg === "GP001" || gdg === "GP015") liniCek = "POTONG";
    else if (gdg === "GP002" && fd.value.ckCetak) liniCek = "CETAK";
    else if (gdg === "GP014" && fd.value.ckBordir) liniCek = "BORDIR";

    if (liniCek) {
      try {
        const res = await mutasiProduksiFormService.cekKomponen(
          fd.value.NomorSpk,
          liniCek,
        );
        if (!res.data.data) {
          toast.warning(
            `Komponen ${liniCek.toLowerCase()} belum di identifikasi pada SPK tsb.`,
          );
          return;
        }
      } catch {
        /**/
      }
    }
  }

  if (isLiniPotong.value && !isSpg.value) {
    if (!fd.value.Jumlah || fd.value.Jumlah <= 0) {
      toast.warning("Jumlah tidak boleh kosong atau minus.");
      return;
    }
    if (!fd.value.QtyBerat || fd.value.QtyBerat <= 0) {
      toast.warning("Babaran tidak boleh kosong. Cek jumlah dan berat kain!");
      return;
    }

    // 3. Berat kain melebihi jumlah kain
    const b = fd.value.QtyBerat;
    const l = fd.value.LhkSudah;
    const k = fd.value.JmlKain;
    if (b + l > k + 0.01) {
      toast.warning("Berat kain melebihi Jumlah kain.");
      return;
    }

    if (!fd.value.Komponen) {
      toast.warning("Komponen belum dipilih.");
      return;
    }
    if (fd.value.SelisihBabaran < 0 && !fd.value.Alasan.trim()) {
      toast.warning("Babaran < standar. Alasan harus diisi.");
      return;
    }
    if (fd.value.SelisihBabaran < 0) {
      fd.value.xApv = userCab.value
        ? "N"
        : fd.value.ckapv
          ? userKode.value
          : "N";
    } else {
      fd.value.ckapv = true;
      fd.value.xApv = "Y";
    }
  } else {
    fd.value.ckapv = true;
    fd.value.xApv = "Y";
  }

  const valid = fd.value.Detail.filter((r) => {
    const tq =
      (r.jumlah || 0) +
      (r.bslini || 0) +
      (r.bskainsablon || 0) +
      (r.bskain || 0) +
      (r.gantibs || 0);
    return r.nama && tq > 0;
  });
  if (!valid.length) {
    toast.warning("Detail bahan harus diisi.");
    tab.value = "d";
    return;
  }
  for (const r of valid) {
    if (!isDC.value && r.kode === "LL-000400") {
      // ← tambah !isDC.value
      const tq =
        (r.jumlah || 0) +
        (r.bslini || 0) +
        (r.bskainsablon || 0) +
        (r.bskain || 0);
      if (tq > 0 && (r.panjang <= 0 || r.lebar <= 0)) {
        toast.warning(
          "Badan Depan (LL-000400): Panjang dan Lebar harus diisi.",
        );
        tab.value = "d";
        return;
      }
    }
    if (isSpg.value && r.nama && !r.size) {
      toast.warning("Size harus diisi untuk semua baris (SPG).");
      tab.value = "d";
      return;
    }
  }

  showSaveDialog.value = true;
};

// ── Watch ──────────────────────────────────────────────────────────────
watch(
  () => fd.value.Kelompok,
  () => {
    if (fd.value.NomorSpk && fd.value.JenisMutasi) loadPlanning();
  },
);

// ── Lifecycle ──────────────────────────────────────────────────────────
onMounted(async () => {
  loadDivisi();
  if (isEditMode.value) {
    await fetchData(); // ← ini harus await sampai selesai
    // Cek langsung dari formData (bukan fd)
    console.log("formData after fetch:", formData.value?.Nomor);
    spkLama.value = formData.value?.NomorSpk || "";
    await Promise.all([
      loadKomponen(),
      loadKelompok(),
      loadKelompokTujuan(),
      loadPlanning(),
    ]);
  } else {
    formData.value.Cab = userCab.value || "P04";
  }
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Mutasi Produksi' : 'Tambah Mutasi Produksi'"
    menu-id="109"
    :icon="IconBuildingFactory2"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Mutasi Produksi"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="() => validateSave()"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="mp">
      <!-- PIN5 banner -->
      <div
        v-if="fd.pin5Status"
        class="pin5"
        :class="`pin5-${fd.pin5Status.toLowerCase()}`"
      >
        <IconAlertTriangle :size="13" />
        <span v-if="fd.pin5Status === 'MINTA'"
          >Periode diclose — pengajuan belum dibuat</span
        >
        <span v-else-if="fd.pin5Status === 'WAIT'">Menunggu ACC dari HO</span>
        <span v-else-if="fd.pin5Status === 'ACC'"
          >Sudah di-ACC — dapat disimpan</span
        >
        <span v-else-if="fd.pin5Status === 'TOLAK'">Pengajuan DITOLAK</span>
      </div>

      <div
        v-if="fd.noPlanStatus"
        class="pin5"
        :class="`noplan-${fd.noPlanStatus.toLowerCase()}`"
      >
        <IconAlertTriangle :size="13" />
        <span v-if="fd.noPlanStatus === 'MINTA'"
          >Planning PPIC kosong untuk SPK/jenis mutasi ini — menunggu
          approval</span
        >
        <span v-else-if="fd.noPlanStatus === 'ACC'"
          >Sudah di-ACC tanpa planning — transaksi tetap berjalan</span
        >
        <span v-else-if="fd.noPlanStatus === 'TOLAK'"
          >Pengajuan tanpa planning DITOLAK — mohon lengkapi Planning PPIC</span
        >
      </div>

      <!-- Tab bar -->
      <div class="tabbar">
        <button :class="['tb', tab === 'h' ? 'tba' : '']" @click="tab = 'h'">
          <IconListDetails :size="13" /> Header &amp; Info
        </button>
        <button :class="['tb', tab === 'd' ? 'tba' : '']" @click="tab = 'd'">
          <IconTable :size="13" /> Detail Bahan
          <span v-if="fd.Detail.filter((r) => r.nama).length" class="tbadge">
            {{ fd.Detail.filter((r) => r.nama).length }}
          </span>
        </button>
      </div>

      <!-- ═══ TAB HEADER ═══ -->
      <div v-show="tab === 'h'" class="tcon">
        <div class="hgrid">
          <!-- KIRI -->
          <div class="hleft">
            <!-- Top: Nomor/Tanggal/Keterangan/SPK | Pilihan Mutasi -->
            <div class="top-row">
              <div class="info-col">
                <div class="frow">
                  <label class="flbl">Nomor</label>
                  <input
                    :value="fd.Nomor || '(Otomatis)'"
                    readonly
                    class="inp ro"
                    style="width: 130px"
                  />
                  <span class="note" style="margin-left: 8px"
                    >Gudang: <b>{{ fd.Cab || "-" }}</b></span
                  >
                  <label class="flbl" style="margin-left: 16px">Tanggal</label>
                  <input
                    type="date"
                    v-model="fd.Tanggal"
                    class="inp"
                    :disabled="!canEdit"
                  />
                </div>
                <div class="frow">
                  <label class="flbl">Keterangan</label>
                  <input
                    v-model="fd.Keterangan"
                    class="inp"
                    style="width: 300px"
                    :readonly="!canEdit"
                  />
                </div>
                <div class="frow">
                  <label class="flbl">Nomor SPK</label>
                  <div class="ig">
                    <input
                      v-model="fd.NomorSpk"
                      class="inp"
                      style="width: 140px"
                      placeholder="Kode SPK..."
                      :readonly="!canEdit || isEditMode"
                      @input="spkDirty = true"
                      @keydown.enter.prevent="onSpkEnter"
                      @keydown.f1.prevent="showSpkModal = true"
                      @keydown.f2.prevent="showSpgModal = true"
                      @keydown.tab="onSpkEnter"
                    />
                    <button
                      v-if="canEdit && !isEditMode"
                      class="ibtn"
                      type="button"
                      @click="showSpkModal = true"
                      title="F1 - Cari SPK/MAP"
                    >
                      <IconSearch :size="12" color="#1565c0" />
                    </button>
                    <button
                      v-if="canEdit && !isEditMode"
                      class="ibtn"
                      type="button"
                      @click="showSpgModal = true"
                      title="F2 - Cari SPG"
                      style="
                        background: #f3e5f5;
                        font-size: 9px;
                        font-weight: 700;
                        color: #7b1fa2;
                        min-width: 28px;
                      "
                    >
                      SPG
                    </button>
                  </div>
                  <label class="flbl" style="margin-left: 12px">Tgl SPK</label>
                  <input
                    :value="fd.TglSpk"
                    readonly
                    class="inp ro"
                    style="width: 110px"
                  />
                </div>

                <!-- frow baru: Divisi — antara SPK dan Product -->
                <div class="frow" v-if="divisiLabel">
                  <label class="flbl">Divisi</label>
                  <input
                    :value="divisiLabel"
                    readonly
                    class="inp ro divisi-chip"
                  />
                </div>
                <div class="frow">
                  <label class="flbl">Product</label>
                  <input
                    :value="fd.NamaSpk"
                    readonly
                    class="inp ro"
                    style="width: 240px"
                  />
                  <label class="flbl" style="margin-left: 12px">Jml SPK</label>
                  <input
                    :value="num(fd.JumlahSpk)"
                    readonly
                    class="inp ro tr"
                    style="width: 70px"
                  />
                </div>
                <div class="frow">
                  <label class="flbl">Jenis Produk</label>
                  <input
                    :value="fd.JenisBarang"
                    readonly
                    class="inp ro"
                    style="width: 150px"
                  />
                  <label class="flbl" style="margin-left: 12px"
                    >Finishing</label
                  >
                  <input
                    :value="fd.Finishing"
                    readonly
                    class="inp ro"
                    style="width: 100px"
                  />
                  <span
                    v-if="fd.ckCetak"
                    class="chip cp-c"
                    style="margin-left: 6px"
                    >Cetak</span
                  >
                  <span
                    v-if="fd.ckBordir"
                    class="chip cp-b"
                    style="margin-left: 4px"
                    >Bordir</span
                  >
                  <span v-if="isSpg" class="chip cp-s" style="margin-left: 4px"
                    >SPG</span
                  >
                </div>
              </div>
              <!-- Pilihan Mutasi -->
              <div class="mutasi-col">
                <label class="flbl mb4" style="font-weight: 700"
                  >Pilihan Mutasi</label
                >
                <div class="mgrid">
                  <label
                    v-for="m in MUTASI"
                    :key="m.val"
                    :class="['mopt', fd.JenisMutasi === m.val ? 'mact' : '']"
                    @click="canEdit && onMutasi(m.val)"
                  >
                    {{ m.label }}
                  </label>
                </div>
              </div>
            </div>

            <!-- Lini + Komponen + Material -->
            <div class="lini-section">
              <!-- 2-kolom: lini kiri, jumlah+kelompok kanan -->
              <div class="lini-grid">
                <div class="lini-left">
                  <div class="fg" style="margin-bottom: 4px">
                    <label class="flbl w70">Lini Asal</label>
                    <div class="ig" style="width: 240px">
                      <input
                        v-model="fd.GdgAsal"
                        class="inp"
                        style="width: 55px"
                        :readonly="!canEdit"
                      />
                      <input
                        :value="fd.NamaGdgAsal"
                        readonly
                        class="inp ro"
                        style="flex: 1"
                      />
                      <button
                        v-if="canEdit"
                        class="ibtn"
                        @click="openGdg('asal')"
                      >
                        <IconSearch :size="12" color="#1565c0" />
                      </button>
                    </div>
                  </div>
                  <div class="fg">
                    <label class="flbl w70">Lini Tujuan</label>
                    <div class="ig" style="width: 240px">
                      <input
                        v-model="fd.GdgTujuan"
                        class="inp"
                        style="width: 55px"
                        :readonly="!canEdit"
                      />
                      <input
                        :value="fd.NamaGdgTujuan"
                        readonly
                        class="inp ro"
                        style="flex: 1"
                      />
                      <button
                        v-if="canEdit"
                        class="ibtn"
                        @click="openGdg('tujuan')"
                      >
                        <IconSearch :size="12" color="#1565c0" />
                      </button>
                    </div>
                  </div>
                </div>
                <div class="lini-right">
                  <div class="fg" style="margin-bottom: 4px">
                    <label class="flbl w60">Jumlah</label>
                    <input
                      v-model.number="fd.Jumlah"
                      type="number"
                      class="inp tr"
                      style="width: 80px"
                      :readonly="!canEdit"
                      @focus="sel"
                      @change="hitung"
                    />
                  </div>
                  <div class="fg" style="margin-bottom: 4px">
                    <label class="flbl w60">Kelompok</label>
                    <select
                      v-model="fd.Kelompok"
                      class="sel"
                      :disabled="!canEdit"
                      style="width: 140px"
                    >
                      <option v-for="k in kelOpts" :key="k" :value="k">
                        {{ k }}
                      </option>
                    </select>
                  </div>
                  <div class="fg" v-if="showKelompokTujuan">
                    <label class="flbl w60">Kel. Tujuan</label>
                    <select
                      v-model="fd.KelompokTujuan"
                      class="sel"
                      :disabled="!canEdit"
                      style="width: 140px"
                    >
                      <option v-for="k in kelTujuanOpts" :key="k" :value="k">
                        {{ k }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Komponen + Babaran -->
              <div class="komponen-bar">
                <div class="fg">
                  <label class="lb w70">Komponen</label>
                  <select
                    v-model="fd.Komponen"
                    class="sel"
                    :disabled="!canEdit"
                    style="width: 140px"
                    @change="onKomponen"
                  >
                    <option value="">--</option>
                    <option
                      v-for="k in komponenOpts"
                      :key="k.komponen"
                      :value="k.komponen"
                    >
                      {{ k.komponen }}
                    </option>
                  </select>
                </div>
                <div class="fg ml8">
                  <label class="lb">Babaran STD</label>
                  <input
                    :value="num(fd.BabaranStd, 2)"
                    readonly
                    class="inp ro tr"
                    style="width: 65px"
                  />
                </div>
                <div class="fg ml8">
                  <label class="lb">Berat/Panjang Kain</label>
                  <input
                    v-model.number="fd.QtyBerat"
                    type="number"
                    class="inp tr"
                    @focus="sel"
                    @change="hitung"
                    @blur="
                      () => {
                        if (!isSpg && !fd.Komponen) {
                          toast.warning('Komponen dipilih dulu ya!');
                          fd.QtyBerat = 0;
                        } else {
                          hitung();
                        }
                      }
                    "
                  />
                  KG
                </div>
                <div class="fg ml8">
                  <label class="lb">Babaran Actual</label>
                  <input
                    :value="num(fd.BabaranActual, 2)"
                    readonly
                    class="inp ro tr"
                    style="width: 65px"
                    :style="
                      fd.SelisihBabaran < 0
                        ? 'color:#c62828;font-weight:700'
                        : ''
                    "
                  />
                  <input
                    :value="num(fd.SelisihBabaran, 2)"
                    readonly
                    class="inp ro tr ml4"
                    style="width: 60px"
                    :style="
                      fd.SelisihBabaran < 0
                        ? 'color:#c62828;font-weight:700'
                        : ''
                    "
                  />
                </div>
                <div class="fg ml8" v-if="fd.GramasiMkb">
                  <label class="lb">Gramasi Mkb</label>
                  <input
                    :value="fd.GramasiMkb"
                    readonly
                    class="inp ro"
                    style="width: 70px"
                  />
                </div>
                <div class="fg ml8" v-if="fd.SettingMkb">
                  <label class="lb">Setting Mkb</label>
                  <input
                    :value="fd.SettingMkb"
                    readonly
                    class="inp ro"
                    style="width: 70px"
                  />
                </div>
              </div>

              <!-- Alasan + Asal Kerjaan + Approval -->
              <div class="alasan-bar">
                <div class="fg" style="flex: 1">
                  <label class="lb w70">Alasan</label>
                  <input
                    v-model="fd.Alasan"
                    class="inp"
                    style="flex: 1"
                    :readonly="!canEdit"
                    placeholder="Isi jika babaran minus..."
                  />
                </div>
                <div class="fg ml8" v-if="showAsalKerjaan">
                  <label class="lb">Asal Pengerjaan</label>
                  <select
                    v-model="fd.AsalKerjaan"
                    class="sel"
                    :disabled="!canEdit"
                  >
                    <option value="">-- Pilih --</option>
                    <option value="P01">P01</option>
                    <option value="P04">P04</option>
                  </select>
                </div>
                <div
                  class="fg ml8 apv-row"
                  v-if="
                    (!userCab || userKode === 'ADMINISTRATOR') && isLiniPotong
                  "
                >
                  <label class="lb">Approval Babaran Minus</label>
                  <input
                    type="checkbox"
                    v-model="fd.ckapv"
                    :disabled="!canEdit"
                    style="width: 16px; height: 16px"
                  />
                </div>
              </div>

              <!-- No Realisasi Minta  -->
              <div class="mat-section">
                <!-- Baris 1: Nomor + Tgl + Kode Kain + Nama Kain + Satuan -->
                <div class="fg">
                  <label class="lb w70">No.Real.Minta</label>
                  <div class="ig">
                    <input
                      v-model="fd.NoMaterial"
                      class="inp"
                      style="width: 130px"
                      :readonly="!canEdit"
                      @keydown.enter.prevent="refreshLhk"
                    />
                    <button v-if="canEdit" class="ibtn" @click="openMaterial">
                      <IconSearch :size="12" color="#1565c0" />
                    </button>
                  </div>
                  <span class="note ml4">{{ fd.TglMaterial }}</span>
                  <span class="mat-sep">|</span>
                  <label class="lb-sm">Kode Kain</label>
                  <input
                    :value="fd.KodeKain"
                    readonly
                    class="inp ro mono-inp"
                    style="width: 90px"
                  />
                  <input
                    :value="fd.NamaKain"
                    readonly
                    class="inp ro"
                    style="width: 180px"
                  />
                  <input
                    :value="fd.SatKain"
                    readonly
                    class="inp ro tc"
                    style="width: 50px"
                  />
                </div>
                <!-- Baris 2: Jml Kain + Sudah + [?] + Kurang -->
                <div class="fg" style="margin-top: 3px">
                  <label class="lb w70"></label>
                  <label class="lb-sm">Jml Kain</label>
                  <input
                    :value="num(fd.JmlKain, 2)"
                    readonly
                    class="inp ro tr"
                    style="width: 80px"
                  />
                  <label class="lb-sm ml8">Sudah</label>
                  <input
                    :value="num(fd.LhkSudah, 2)"
                    readonly
                    class="inp ro tr"
                    style="width: 80px"
                  />
                  <button
                    class="ibtn ml4"
                    style="
                      width: 20px;
                      background: #e3f2fd;
                      font-size: 11px;
                      font-weight: 700;
                    "
                    @click="openHistoryMaterial"
                    title="History pemakaian"
                  >
                    ?
                  </button>
                  <label class="lb-sm ml8">Kurang</label>
                  <input
                    :value="num(fd.LhkKurang, 2)"
                    readonly
                    class="inp ro tr"
                    style="width: 80px"
                    :style="
                      fd.LhkKurang < 0 ? 'color:#c62828;font-weight:700' : ''
                    "
                  />
                </div>
                <!-- Baris 3: Gramasi + Setting -->
                <div class="fg" style="margin-top: 3px">
                  <label class="lb w70"></label>
                  <label class="lb-sm">Gramasi</label>
                  <input
                    :value="fd.Gramasi"
                    readonly
                    class="inp ro"
                    style="width: 90px"
                  />
                  <label class="lb-sm ml8">Setting</label>
                  <input
                    :value="fd.Setting"
                    readonly
                    class="inp ro"
                    style="width: 90px"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- KANAN: Planning PPIC (40%) -->
          <div class="hright">
            <div class="plan-box">
              <div class="plan-title">Planning PPIC</div>
              <div v-if="!fd.NomorSpk || !fd.JenisMutasi" class="plan-empty">
                Pilih SPK dan jenis mutasi
              </div>
              <div v-else-if="!planList.length" class="plan-empty">
                Tidak ada planning
              </div>
              <div v-else class="plan-scroll">
                <table class="pt">
                  <thead>
                    <tr>
                      <th style="width: 30px">Ambil</th>
                      <th>No Planning</th>
                      <th style="width: 85px">Tanggal</th>
                      <th style="width: 65px">Status</th>
                      <th style="width: 60px">Line</th>
                      <th style="width: 60px" class="tr">Jml</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(p, i) in planList"
                      :key="i"
                      :class="p.dipilih ? 'psel' : ''"
                      @click="canEdit && selPlan(i)"
                      style="cursor: pointer"
                    >
                      <td class="tc">
                        <input
                          type="checkbox"
                          :checked="p.dipilih"
                          @click.stop="canEdit && selPlan(i)"
                          :disabled="!canEdit"
                        />
                      </td>
                      <td style="font-size: 10px">{{ p.no_planning }}</td>
                      <td>{{ p.tanggal }}</td>
                      <td>
                        <span
                          :class="{
                            bcut: p.status === 'CUTTING',
                            bsew: p.status === 'SEWING',
                            bkol: p.status === 'KOLI',
                          }"
                        >
                          {{ p.status }}
                        </span>
                      </td>
                      <td style="font-size: 10px">{{ p.line_kelompok }}</td>
                      <td class="tr">{{ num(p.jumlah) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ TAB DETAIL ═══ -->
      <div v-show="tab === 'd'" class="tcon tcon-d">
        <div class="dtbar">
          <button v-if="canEdit && !isDC" class="btn-g" @click="addRow">
            <IconPlus :size="11" /> Tambah
          </button>
          <button class="btn-s" @click="openProses">Proses Sebelumnya</button>
          <span class="dsum">
            Jml: <b>{{ num(totJml) }}</b> · BS Lini:
            <b>{{ num(totBslini) }}</b> · BS Kain Sbl:
            <b>{{ num(totBsKainSbl) }}</b> · BS Kain:
            <b>{{ num(totBsKain) }}</b>
          </span>
        </div>
        <div class="gwrap">
          <table class="gtbl">
            <thead>
              <tr>
                <th style="width: 26px">#</th>
                <th style="width: 115px">Kode</th>
                <th style="min-width: 140px">Nama</th>
                <th style="width: 52px">Sat</th>
                <th style="width: 65px">Size</th>
                <th style="width: 65px" class="tr">Qty Order</th>
                <th style="width: 65px" class="tr" v-if="isDC">Terima</th>
                <th style="width: 60px" class="tr" v-if="isDC">Stok</th>
                <th style="width: 65px" class="tr">Jumlah</th>
                <th style="width: 60px" class="tr">Sudah</th>
                <th style="width: 60px" class="tr">Kurang</th>
                <th style="width: 65px" class="tr" v-if="!isDC">BS Lini</th>
                <th style="width: 75px" class="tr" v-if="!isDC">BS Kain Sbl</th>
                <th style="width: 65px" class="tr" v-if="!isDC">BS Kain</th>
                <th style="width: 65px" class="tr" v-if="!isDC">Ganti BS</th>
                <th style="width: 65px" class="tr" v-if="!isDC">Panjang</th>
                <th style="width: 65px" class="tr" v-if="!isDC">Lebar</th>
                <th v-if="canEdit && !isDC" style="width: 24px"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, i) in fd.Detail"
                :key="row._key"
                :class="i % 2 === 1 ? 'rs' : ''"
              >
                <td class="tc muted" style="font-size: 10px">{{ i + 1 }}</td>
                <td>
                  <div class="kw">
                    <input
                      v-model="row.kode"
                      class="ci"
                      :readonly="!canEdit || isDC"
                      placeholder="Kode..."
                      @keydown.enter.prevent="onKodeBahan(row)"
                      @keydown.f1.prevent="openBahan(i)"
                      @blur="onKodeBahan(row)"
                    />
                    <button
                      v-if="canEdit && !isDC"
                      class="csb"
                      @click="openBahan(i)"
                    >
                      <IconSearch :size="10" />
                    </button>
                  </div>
                </td>
                <td><input v-model="row.nama" class="ci" readonly /></td>
                <td><input v-model="row.satuan" class="ci tc" readonly /></td>
                <td>
                  <input
                    v-model="row.size"
                    class="ci tc"
                    :readonly="!canEdit || !isSpg || isDC"
                  />
                </td>
                <td>
                  <input :value="num(row.qtyorder)" readonly class="ci tr ro" />
                </td>
                <td v-if="isDC">
                  <input :value="num(row.terima)" readonly class="ci tr ro" />
                </td>
                <td v-if="isDC">
                  <input :value="num(row.stok)" readonly class="ci tr ro" />
                </td>
                <td>
                  <input
                    v-model.number="row.jumlah"
                    type="number"
                    class="ci tr"
                    :readonly="!canEdit"
                    @focus="sel"
                    @change="onJumlah(row)"
                  />
                </td>
                <td>
                  <input :value="num(row.sudah)" readonly class="ci tr ro" />
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
                <template v-if="!isDC">
                  <td>
                    <input
                      v-model.number="row.bslini"
                      type="number"
                      class="ci tr"
                      :readonly="!canEdit"
                      @focus="sel"
                    />
                  </td>
                  <td>
                    <input
                      v-model.number="row.bskainsablon"
                      type="number"
                      class="ci tr"
                      :readonly="!canEdit"
                      @focus="sel"
                    />
                  </td>
                  <td>
                    <input
                      v-model.number="row.bskain"
                      type="number"
                      class="ci tr"
                      :readonly="!canEdit"
                      @focus="sel"
                    />
                  </td>
                  <td>
                    <input
                      v-model.number="row.gantibs"
                      type="number"
                      class="ci tr"
                      :readonly="!canEdit"
                      @focus="sel"
                    />
                  </td>
                  <td>
                    <input
                      v-model.number="row.panjang"
                      type="number"
                      class="ci tr"
                      :readonly="!canEdit"
                      @focus="sel"
                      :style="
                        row.kode === 'LL-000400' && row.panjang <= 0
                          ? 'background:#fff3e0'
                          : ''
                      "
                    />
                  </td>
                  <td>
                    <input
                      v-model.number="row.lebar"
                      type="number"
                      class="ci tr"
                      :readonly="!canEdit"
                      @focus="sel"
                      :style="
                        row.kode === 'LL-000400' && row.lebar <= 0
                          ? 'background:#fff3e0'
                          : ''
                      "
                    />
                  </td>
                </template>
                <td v-if="canEdit && !isDC" class="tc">
                  <button class="cdb" @click="delRow(i)">
                    <IconTrash :size="10" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </BaseForm>

  <!-- SPK Modal -->
  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="mutasi"
    @selected="onSpkSelected"
  />
  <!-- SPG Modal (F2) -->
  <SpgSearchModal v-model="showSpgModal" @selected="onSpgSelected" />

  <!-- History Pemakaian Material -->
  <HistoryPakaiMaterialModal
    v-model="showHistoryModal"
    :no-material="fd.NoMaterial"
    :kode-bahan="fd.KodeKain"
    :exclude-nomor="isEditMode ? fd.Nomor : ''"
  />

  <!-- Gudang Modal — FIX: pakai showGdgModal boolean + gdgMode ref -->
  <v-dialog v-model="showGdgModal" max-width="460px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        Pilih {{ gdgMode === "asal" ? "Lini Asal" : "Lini Tujuan" }}
      </v-card-title>
      <v-card-text class="pa-3">
        <input v-model="gdgQ" class="ms" placeholder="Cari..." autofocus />
        <div class="ml">
          <div
            v-for="g in gdgFiltered"
            :key="g.Kode"
            class="mi"
            :class="{
              mia: (gdgMode === 'asal' ? fd.GdgAsal : fd.GdgTujuan) === g.Kode,
            }"
            @click="selectGdg(g)"
          >
            <span class="mk">{{ g.Kode }}</span
            ><span>{{ g.Nama }}</span>
          </div>
          <div v-if="!gdgFiltered.length" class="me">Tidak ada hasil</div>
        </div>
      </v-card-text>
      <v-card-actions class="pa-2 border-t">
        <v-spacer /><v-btn
          variant="text"
          size="small"
          @click="showGdgModal = false"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Material Modal -->
  <v-dialog v-model="showMatModal" max-width="660px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        Pilih No Realisasi Minta Kain
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="matQ"
          class="ms"
          placeholder="Cari jenis kain atau cabang..."
          @input="filterMat"
          autofocus
        />
        <div class="modal-tw">
          <table class="mtt">
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Tgl</th>
                <th>Kode</th>
                <th>Jenis Kain</th>
                <th class="tr">Jml</th>
                <th>Cab</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="m in matList"
                :key="m.Nomor"
                class="mtr"
                @click="selectMat(m)"
              >
                <td class="mono">{{ m.Nomor }}</td>
                <td>{{ m.Tanggal }}</td>
                <td class="mono">{{ m.Kode }}</td>
                <td>{{ m.JenisKain }}</td>
                <td class="tr">{{ num(m.Jumlah, 2) }}</td>
                <td>{{ m.Cab }}</td>
              </tr>
              <tr v-if="!matList.length">
                <td colspan="6" class="me">Tidak ada data</td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
      <v-card-actions class="pa-2 border-t">
        <v-spacer /><v-btn
          variant="text"
          size="small"
          @click="showMatModal = false"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Bahan Modal -->
  <BahanSearchModal
    v-model="showBahanModal"
    mode="komponen"
    :is-bordir="fd.GdgAsal === 'GP014' || fd.GdgAsal === 'GP016'"
    @selected="onBahanSelected"
  />

  <!-- Proses Sebelumnya Modal -->
  <v-dialog v-model="showProsesModal" max-width="660px">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-grey-darken-2 text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        Proses Sebelumnya — {{ fd.NomorSpk }}
      </v-card-title>
      <v-card-text class="pa-3">
        <div class="modal-tw">
          <table class="mtt">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>Sat</th>
                <th>Size</th>
                <th class="tr">Mutasi</th>
                <th class="tr">Jasa</th>
                <th class="tr">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in prosesRows" :key="i">
                <td class="mono">{{ r.kode }}</td>
                <td>{{ r.Nama }}</td>
                <td class="tc">{{ r.Satuan }}</td>
                <td class="tc">{{ r.Size }}</td>
                <td class="tr">{{ num(r.Mutasi) }}</td>
                <td class="tr">{{ num(r.Jasa) }}</td>
                <td class="tr">{{ num(r.Total) }}</td>
              </tr>
              <tr v-if="!prosesRows.length">
                <td colspan="7" class="me">Belum ada proses sebelumnya</td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
      <v-card-actions class="pa-2 border-t">
        <v-spacer /><v-btn
          variant="text"
          size="small"
          @click="showProsesModal = false"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.mp {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-size: 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  overflow: hidden;
}
.pin5 {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
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
.noplan-minta {
  background: #fff3e0;
  color: #e65100;
}
.noplan-acc {
  background: #e8f5e9;
  color: #2e7d32;
}
.noplan-tolak {
  background: #ffebee;
  color: #c62828;
}
.tabbar {
  display: flex;
  gap: 3px;
  padding: 5px 8px 0;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.tb {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid #bdbdbd;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  background: #f5f5f5;
  cursor: pointer;
  color: #555;
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
.tcon {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  min-height: 0;
}
.tcon-d {
  display: flex;
  flex-direction: column;
  padding: 6px;
}
/* Header 60:40 */
.hgrid {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 8px;
  align-items: start;
}
@media (max-width: 1200px) {
  .hgrid {
    grid-template-columns: 1fr;
  }
}
.hleft {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
/* Top row */
.top-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 0;
  min-width: 0;
}
.info-col {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 8px 12px;
  border-right: 1px solid #e0e0e0;
}
.frow {
  display: flex;
  align-items: center;
  gap: 0;
  min-height: 28px;
  padding: 2px 0;
}
.flbl {
  font-size: 11px;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
  min-width: 80px;
  flex-shrink: 0;
  padding-right: 6px;
}
.mb4 {
  margin-bottom: 4px;
}
.mutasi-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
}
.mgrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}
.mopt {
  padding: 5px 6px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  cursor: pointer;
  text-align: center;
  transition: all 0.1s;
  user-select: none;
  line-height: 1.3;
}
.mopt:hover {
  background: #e3f2fd;
  border-color: #1565c0;
  color: #1565c0;
}
.mact {
  background: #1565c0 !important;
  color: white !important;
  border-color: #1565c0 !important;
}
/* Lini section */
.lini-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 7px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.lini-grid {
  display: grid;
  grid-template-columns: auto auto;
  gap: 8px 20px;
  align-items: start;
}
.lini-left {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.lini-right {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.fg {
  display: flex;
  align-items: center;
  gap: 5px;
}
.fg-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.komponen-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  padding-top: 5px;
  border-top: 1px solid #f0f0f0;
}
.alasan-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  padding-top: 4px;
}
.apv-row {
  display: flex;
  align-items: center;
  gap: 5px;
}
.mat-section {
  padding-top: 4px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mat-sep {
  color: #bdbdbd;
  margin: 0 6px;
  font-size: 14px;
  line-height: 1;
}
.mono-inp {
  font-family: monospace;
  font-size: 11px;
  color: #1565c0;
  font-weight: 600;
}
.lb {
  font-size: 11px;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
}
.lb-sm {
  font-size: 10px;
  color: #666;
  white-space: nowrap;
}
.w70 {
  width: 70px;
  flex-shrink: 0;
}
.w60 {
  width: 60px;
  flex-shrink: 0;
}
.note {
  font-size: 10px;
  color: #777;
}
.ml4 {
  margin-left: 4px;
}
.ml8 {
  margin-left: 8px;
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
.divisi-chip {
  background: #e8f5e9 !important;
  color: #2e7d32 !important;
  font-weight: 700;
  font-size: 10px;
  padding: 0 8px;
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
.ig {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 24px;
  background: white;
}
.ig .inp {
  border: none;
  height: 22px;
  border-radius: 0;
}
.ibtn {
  width: 24px;
  min-width: 24px;
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
.chip {
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
}
.cp-c {
  background: #e3f2fd;
  color: #1565c0;
}
.cp-b {
  background: #fce4ec;
  color: #ad1457;
}
.cp-s {
  background: #f3e5f5;
  color: #7b1fa2;
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
/* Planning 40% */
.hright {
  display: flex;
  flex-direction: column;
  align-self: stretch;
}
.plan-box {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 7px 10px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 280px;
}
.plan-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1565c0;
  margin-bottom: 5px;
  padding-bottom: 3px;
  border-bottom: 1px solid #e3f2fd;
}
.plan-empty {
  padding: 16px;
  text-align: center;
  color: #9e9e9e;
  font-size: 11px;
  font-style: italic;
}
.plan-scroll {
  flex: 1;
  overflow: auto;
}
.pt {
  width: 100%;
  border-collapse: collapse;
  font-size: 10.5px;
}
.pt th {
  background: #1565c0;
  color: white;
  padding: 3px 4px;
  font-weight: 700;
  white-space: nowrap;
  position: sticky;
  top: 0;
}
.pt td {
  padding: 2px 4px;
  border-bottom: 1px solid #e0e0e0;
}
.pt tr:hover td {
  background: #e3f2fd;
}
.psel td {
  background: #bbdefb !important;
  font-weight: 600;
}
.bcut {
  background: #eeeeee;
  color: #424242;
  padding: 1px 4px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 700;
}
.bsew {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 1px 4px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 700;
}
.bkol {
  background: #fff3e0;
  color: #e65100;
  padding: 1px 4px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 700;
}
/* Detail */
.dtbar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.dsum {
  font-size: 11px;
  color: #555;
  margin-left: 4px;
}
.btn-g {
  height: 26px;
  padding: 0 10px;
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
.btn-g:hover {
  opacity: 0.88;
}
.btn-s {
  height: 26px;
  padding: 0 10px;
  background: #546e7a;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.btn-s:hover {
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
  padding: 3px 3px;
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
/* Modal */
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
.me {
  padding: 12px;
  text-align: center;
  font-size: 11px;
  color: #9e9e9e;
  font-style: italic;
}
.modal-tw {
  max-height: 300px;
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
</style>
