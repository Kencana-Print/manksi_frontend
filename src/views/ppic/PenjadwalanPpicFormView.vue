<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  onActivated,
  onDeactivated,
  watch,
  reactive,
  nextTick,
} from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRoute, useRouter } from "vue-router";
import { useTabsStore } from "@/stores/tabsStore";
import { penjadwalanPpicService } from "@/services/ppic/penjadwalanPpicService";
import { useKomitmenKirimSocket } from "@/composables/useKomitmenKirimSocket";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import {
  IconCalendarWeek,
  IconDownload,
  IconTrash,
  IconSearch,
  IconX,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const authStore = useAuthStore();
const toast = useToast();
const tabsStore = useTabsStore();
const route = useRoute();
const router = useRouter();

const showQtyWarning = (warning: any) => {
  if (!warning) return;
  toast.info(
    `Total Qty periode ini sudah ${Number(warning.totalSetelah).toLocaleString("id-ID")}, melebihi batas ${Number(warning.batas).toLocaleString("id-ID")}.`,
  );
};

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const getMondayOfWeek = (d: Date) => {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon;
};

const todayMonday = getMondayOfWeek(new Date());
const todaySaturday = new Date(todayMonday);
todaySaturday.setDate(todayMonday.getDate() + 5);

interface DetailRow {
  PjwdId: number | null;
  SoNomor: string;
  NomorPraOrder: string;
  MapNomor: string;
  Sumber: string;
  Nama: string;
  Tanggal: string;
  Pesan: number;
  Kirim: number;
  Kurang: number;
  Rencana: number;
  Realisasi: number;
  PermintaanKirim: string;
  StatusPermintaan: string;
  Kesepakatan: string;
  KetKesepakatan: string;
}

const showCloseDialog = ref(false);
const executeClose = () => {
  showCloseDialog.value = false;
  const currentPath = route.path; // snapshot SEBELUM push, sesuai pola form lain
  router
    .push("/ppic/penjadwalan")
    .catch(() => {})
    .then(() => {
      tabsStore.closeTab(currentPath);
    });
};

// ── State lokal — pengganti formData dari useForm ──────────────────
const isLoading = ref(false);
const isEditMode = ref(false);

const header = reactive({
  pjw_nomor: "",
  pjw_tgl1: toLocalDate(todayMonday),
  pjw_tgl2: toLocalDate(todaySaturday),
  pjw_cab: "",
  pjw_divisi: "",
  pjw_keterangan: "",
  pjw_close: "N",
});

const detail = ref<DetailRow[]>([]);

// ── Socket & presence ────────────────────────────────────────────
const {
  presenceList,
  isConnected,
  joinRoom,
  leaveRoom,
  on,
  emitFieldFocus,
  emitFieldBlur,
} = useKomitmenKirimSocket();

const myUserKode = computed(() => authStore.user?.kode || "");

const fieldFocusMap = reactive<Record<string, { kode: string; nama: string }>>(
  {},
);
const focusKey = (pjwdId: number | null, field: string) => `${pjwdId}:${field}`;

const onFieldFocus = (row: DetailRow, field: string) => {
  if (!row.PjwdId) return;
  emitFieldFocus(header.pjw_nomor, row.PjwdId, field);
};
const onFieldBlur = (row: DetailRow, field: string) => {
  if (!row.PjwdId) return;
  emitFieldBlur(header.pjw_nomor, row.PjwdId, field);
};

const MANUAL_ADD_KEY = focusKey(0, "manual-add"); // 0 = sentinel, bukan pjwd_id asli (auto_increment mulai dari 1)

const onManualFocus = () => {
  if (!header.pjw_nomor) return;
  emitFieldFocus(header.pjw_nomor, 0, "manual-add");
};
const onManualBlur = () => {
  if (!header.pjw_nomor) return;
  emitFieldBlur(header.pjw_nomor, 0, "manual-add");
};

const isManualRow = (d: DetailRow) =>
  !d.SoNomor && !d.NomorPraOrder && !d.MapNomor && d.Sumber === "MANUAL";

// ── Role permissions ────────────────────────────────────────────
const isAdmin = computed(() => authStore.user?.kode?.toUpperCase() === "ADMIN");
const canEditMarketing = computed(
  () => isAdmin.value || authStore.user?.bagian?.toUpperCase() === "MARKETING",
);
const canEditKesepakatan = computed(
  () => isAdmin.value || authStore.user?.bagian?.toUpperCase() === "PPIC",
);

// ── Cabang → Divisi mapping tetap ───────────────────────────────
const CABANG_DIVISI_MAP: Record<string, string> = {
  P01: "4",
  P04: "4",
  P02: "1",
  P05: "5",
};

const cabangOptions = ref<{ value: string; title: string }[]>([]);
const divisiOptions = ref<{ value: string; title: string }[]>([
  { value: "0", title: "Semua Divisi" },
]);

const loadCabang = async () => {
  try {
    const res = await penjadwalanPpicService.getCabang();
    cabangOptions.value = res.data.data.map((c: any) => ({
      value: c.Kode,
      title: `${c.Kode} - ${c.Nama}`,
    }));
  } catch {
    console.error("Gagal load cabang");
  }
};
const loadDivisi = async () => {
  try {
    const res = await penjadwalanPpicService.getDivisi();
    divisiOptions.value = [
      { value: "0", title: "Semua Divisi" },
      ...res.data.data.map((d: any) => ({
        value: String(d.Kode),
        title: `${d.Kode} - ${d.Nama}`,
      })),
    ];
  } catch {
    console.error("Gagal load divisi");
  }
};

const totalRencana = computed(() =>
  detail.value.reduce((s, d) => s + (Number(d.Rencana) || 0), 0),
);

// ═══════════════════════════════════════════════════════════════
// DEBOUNCE HELPER — generik, dipakai untuk auto-save header & field
// ═══════════════════════════════════════════════════════════════
const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const debounce = (key: string, fn: () => void, delay = 700) => {
  if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
  debounceTimers[key] = setTimeout(fn, delay);
};

// ═══════════════════════════════════════════════════════════════
// HEADER — auto-save per field, debounced
// ═══════════════════════════════════════════════════════════════
const savingHeaderField = ref<string | null>(null);

const saveHeaderField = async (field: string, value: any) => {
  if (!header.pjw_nomor) return;
  savingHeaderField.value = field;
  try {
    await penjadwalanPpicService.updateHeaderField(
      header.pjw_nomor,
      field,
      value,
    );
  } catch (e: any) {
    toast.error(e.response?.data?.message || `Gagal menyimpan ${field}.`);
  } finally {
    savingHeaderField.value = null;
  }
};

const onHeaderFieldInput = (field: string, value: any) => {
  debounce(`header:${field}`, () => saveHeaderField(field, value), 700);
};

// Periode berubah — langsung save (tidak perlu debounce lama, type=date jarang berubah cepat)
watch(
  () => header.pjw_tgl1,
  (val) => {
    if (isInitialLoad.value) return;
    onHeaderFieldInput("pjw_tgl1", val);
  },
);
watch(
  () => header.pjw_tgl2,
  (val) => {
    if (isInitialLoad.value) return;
    onHeaderFieldInput("pjw_tgl2", val);
  },
);
watch(
  () => header.pjw_keterangan,
  (val) => {
    if (isInitialLoad.value) return;
    onHeaderFieldInput("pjw_keterangan", val);
  },
);
watch(
  () => header.pjw_cab,
  (kode) => {
    header.pjw_divisi = CABANG_DIVISI_MAP[kode] || "";
    if (isInitialLoad.value) return;
    onHeaderFieldInput("pjw_cab", kode);
    onHeaderFieldInput("pjw_divisi", header.pjw_divisi);
  },
);

const divisiTarik = computed(() => header.pjw_divisi || "0");

// ═══════════════════════════════════════════════════════════════
// LOAD DATA — mode edit (fetch existing) atau mode baru (create langsung)
// ═══════════════════════════════════════════════════════════════
const mapDetailRow = (r: any): DetailRow => ({
  PjwdId: r.PjwdId ?? null,
  SoNomor: r.Nomor || "",
  NomorPraOrder: r.NomorPraOrder || "",
  MapNomor: r.NomorMap || "",
  Sumber: r.Sumber || (r.Nomor ? "SO" : r.NomorMap ? "MAP" : "PRA ORDER"),
  Nama: r.Nama,
  Tanggal: r.Tanggal,
  Pesan: Number(r.Pesan) || 0,
  Kirim: Number(r.Kirim) || 0,
  Kurang: Number(r.Kurang) || 0,
  Rencana: Number(r.Rencana) || 0,
  Realisasi: Number(r.Realisasi) || 0,
  PermintaanKirim: r.PermintaanKirim || "",
  StatusPermintaan: r.StatusPermintaan || "CLOSE",
  Kesepakatan: r.Kesepakatan || "",
  KetKesepakatan: r.KetKesepakatan || "",
});

const loadExisting = async (nomor: string) => {
  isLoading.value = true;
  try {
    const res = await penjadwalanPpicService.getFormDetail(nomor);
    const d = res.data.data;
    header.pjw_nomor = d.header.pjw_nomor;
    header.pjw_tgl1 = d.header.pjw_tgl1;
    header.pjw_tgl2 = d.header.pjw_tgl2;
    header.pjw_cab = d.header.pjw_cab || "";
    header.pjw_divisi = String(d.header.pjw_divisi || "");
    header.pjw_keterangan = d.header.pjw_keterangan || "";
    header.pjw_close = d.header.pjw_close;
    detail.value = (d.detail || []).map(mapDetailRow);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
    router.push("/ppic/penjadwalan");
  } finally {
    isLoading.value = false;
    await nextTick(); // ⬅ pastikan watcher yang sudah kepicu selesai diproses dulu
    isInitialLoad.value = false; // ⬅ baru matikan guard
  }
};

const isCreating = ref(false);

const createNew = async () => {
  if (!header.pjw_tgl1 || !header.pjw_tgl2) {
    toast.warning("Isi periode terlebih dahulu.");
    return;
  }
  isCreating.value = true;
  try {
    const res = await penjadwalanPpicService.createHeader({
      pjw_tgl1: header.pjw_tgl1,
      pjw_tgl2: header.pjw_tgl2,
      pjw_cab: header.pjw_cab,
      pjw_divisi: header.pjw_divisi,
      pjw_keterangan: header.pjw_keterangan,
    });
    header.pjw_nomor = res.data.data.nomor;
    isEditMode.value = true;
    await nextTick();
    isInitialLoad.value = false;
    router.replace(
      `/ppic/penjadwalan/edit/${encodeURIComponent(header.pjw_nomor)}`,
    );
    joinRoom(header.pjw_nomor);
    toast.success(`Komitmen Kirim ${header.pjw_nomor} berhasil dibuat.`);
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Gagal membuat Komitmen Kirim baru.",
    );
  } finally {
    isCreating.value = false;
  }
};

const isInitialLoad = ref(false); // ⬅ default false, bukan true

onMounted(async () => {
  await Promise.all([loadCabang(), loadDivisi()]);

  const nomorParam = route.params.nomor as string | undefined;
  if (nomorParam) {
    isEditMode.value = true;
    isInitialLoad.value = true; // ⬅ guard baru diaktifkan HANYA saat load existing
    await loadExisting(decodeURIComponent(nomorParam));
    if (header.pjw_nomor) {
      joinRoom(header.pjw_nomor);
    }
  }
});

// ── KeepAlive tidak memicu onUnmounted saat tab ditutup/dipindah —
// dia cuma deactivate. Socket join/leave HARUS mengikuti siklus
// activate/deactivate, bukan mount/unmount, supaya presence akurat
// tanpa perlu refresh.
onDeactivated(() => {
  leaveRoom();
});

onActivated(() => {
  if (header.pjw_nomor) {
    joinRoom(header.pjw_nomor);
  }
});

// ═══════════════════════════════════════════════════════════════
// TARIK SO / PRA ORDER / MAP — langsung POST ke server (bukan cuma push lokal)
// ═══════════════════════════════════════════════════════════════
const isTarikLoading = ref(false);
const isTarikPraOrderLoading = ref(false);
const isTarikMapLoading = ref(false);
const isManualLoading = ref(false);
const manualSoNomor = ref("");

const pushRowFromServer = (pjwdId: number, rowInput: any) => {
  if (detail.value.some((d) => d.PjwdId === pjwdId)) return; // ⬅ guard — cegah duplikat siapa pun pemanggilnya
  detail.value.push({
    PjwdId: pjwdId,
    SoNomor: rowInput.SoNomor || "",
    NomorPraOrder: rowInput.NomorPraOrder || "",
    MapNomor: rowInput.MapNomor || "",
    Sumber: rowInput.Sumber,
    Nama: rowInput.Nama,
    Tanggal: rowInput.Tanggal,
    Pesan: Number(rowInput.Pesan) || 0,
    Kirim: Number(rowInput.Kirim) || 0,
    Kurang: Number(rowInput.Kurang) || 0,
    Rencana: Number(rowInput.Rencana) || 0,
    Realisasi: 0,
    PermintaanKirim: rowInput.PermintaanKirim || "",
    StatusPermintaan: "CLOSE",
    Kesepakatan: "",
    KetKesepakatan: "",
  });
};

const isDuplicate = (sumber: string, nomor: string) => {
  if (sumber === "SO") return detail.value.some((d) => d.SoNomor === nomor);
  if (sumber === "MAP") return detail.value.some((d) => d.MapNomor === nomor);
  return detail.value.some((d) => d.NomorPraOrder === nomor);
};

const tarikSo = async () => {
  if (!header.pjw_cab) return toast.warning("Pilih Cabang terlebih dahulu.");
  if (!header.pjw_tgl1 || !header.pjw_tgl2)
    return toast.warning("Isi periode terlebih dahulu.");

  isTarikLoading.value = true;
  try {
    const res = await penjadwalanPpicService.searchKandidatSo(
      header.pjw_tgl1,
      header.pjw_tgl2,
      divisiTarik.value,
      header.pjw_nomor,
    );
    const kandidat = res.data.data || [];
    if (!kandidat.length) {
      toast.info(
        "Tidak ada SO baru yang perlu dijadwalkan di periode/divisi ini.",
      );
      return;
    }
    let ditambah = 0;
    for (const k of kandidat) {
      if (isDuplicate("SO", k.Nomor)) continue;
      const rowInput = {
        SoNomor: k.Nomor,
        NomorPraOrder: "",
        MapNomor: "",
        Sumber: "SO",
        Nama: k.Nama,
        Tanggal: k.Tanggal,
        Pesan: k.Pesan,
        Kirim: k.Kirim,
        Kurang: k.Kurang,
        Rencana: Number(k.Kurang) || 0,
        PermintaanKirim: k.DatelineAsli || "",
      };
      const saveRes = await penjadwalanPpicService.addDetailRow(
        header.pjw_nomor,
        rowInput,
      );
      pushRowFromServer(saveRes.data.data.pjwd_id, rowInput);
      showQtyWarning(saveRes.data.data.warning);
      ditambah++;
    }
    toast.success(`${ditambah} SO baru ditambahkan ke daftar.`);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menarik data SO.");
  } finally {
    isTarikLoading.value = false;
  }
};

const tarikPraOrder = async () => {
  if (!header.pjw_cab) return toast.warning("Pilih Cabang terlebih dahulu.");
  if (!header.pjw_tgl1 || !header.pjw_tgl2)
    return toast.warning("Isi periode terlebih dahulu.");

  isTarikPraOrderLoading.value = true;
  try {
    const res = await penjadwalanPpicService.searchKandidatPraOrder(
      header.pjw_tgl1,
      header.pjw_tgl2,
      divisiTarik.value,
      header.pjw_nomor,
    );
    const kandidat = res.data.data || [];
    if (!kandidat.length) {
      toast.info("Tidak ada rencana Pra Order di periode/divisi ini.");
      return;
    }
    let ditambah = 0;
    for (const k of kandidat) {
      if (isDuplicate("PRA ORDER", k.Nomor)) continue;
      const rowInput = {
        SoNomor: "",
        NomorPraOrder: k.Nomor,
        MapNomor: "",
        Sumber: "PRA ORDER",
        Nama: k.Nama,
        Tanggal: k.Tanggal,
        Pesan: k.QtyRencana,
        Kirim: 0,
        Kurang: k.QtyRencana,
        Rencana: Number(k.QtyRencana) || 0,
        PermintaanKirim: k.TglKirim || "",
      };
      const saveRes = await penjadwalanPpicService.addDetailRow(
        header.pjw_nomor,
        rowInput,
      );
      pushRowFromServer(saveRes.data.data.pjwd_id, rowInput);
      showQtyWarning(saveRes.data.data.warning);
      ditambah++;
    }
    toast.success(`${ditambah} rencana Pra Order ditambahkan ke daftar.`);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menarik data Pra Order.");
  } finally {
    isTarikPraOrderLoading.value = false;
  }
};

const tarikMap = async () => {
  if (!header.pjw_tgl1 || !header.pjw_tgl2)
    return toast.warning("Isi periode terlebih dahulu.");

  isTarikMapLoading.value = true;
  try {
    const res = await penjadwalanPpicService.searchKandidatMap(
      header.pjw_tgl1,
      header.pjw_tgl2,
      header.pjw_divisi,
      header.pjw_nomor,
    );
    const kandidat = res.data.data || [];
    if (!kandidat.length) {
      toast.info("Tidak ada MAP yang perlu dijadwalkan di periode/divisi ini.");
      return;
    }
    let ditambah = 0;
    for (const k of kandidat) {
      if (isDuplicate("MAP", k.Nomor)) continue;
      const rowInput = {
        SoNomor: "",
        NomorPraOrder: "",
        MapNomor: k.Nomor,
        Sumber: "MAP",
        Nama: k.Nama,
        Tanggal: k.Tanggal,
        Pesan: k.Pesan,
        Kirim: k.Kirim,
        Kurang: k.Kurang,
        Rencana: Number(k.Kurang) || 0,
        PermintaanKirim: k.DatelineAsli || "",
      };
      const saveRes = await penjadwalanPpicService.addDetailRow(
        header.pjw_nomor,
        rowInput,
      );
      pushRowFromServer(saveRes.data.data.pjwd_id, rowInput);
      showQtyWarning(saveRes.data.data.warning);
      ditambah++;
    }
    toast.success(`${ditambah} MAP baru ditambahkan ke daftar.`);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menarik data MAP.");
  } finally {
    isTarikMapLoading.value = false;
  }
};

const tambahManual = async () => {
  const nomor = manualSoNomor.value.trim();
  if (!nomor) return;
  if (!header.pjw_cab) return toast.warning("Pilih Cabang terlebih dahulu.");

  const isMapNomor = nomor.toUpperCase().startsWith("MAP-");
  if (isDuplicate(isMapNomor ? "MAP" : "SO", nomor)) {
    toast.warning(`${isMapNomor ? "MAP" : "SO"} ini sudah ada di daftar.`);
    return;
  }

  isManualLoading.value = true;
  try {
    let rowInput: any;
    if (isMapNomor) {
      const res = await penjadwalanPpicService.getMapInfo(
        nomor,
        header.pjw_divisi,
      );
      const k = res.data.data;
      rowInput = {
        SoNomor: "",
        NomorPraOrder: "",
        MapNomor: k.Nomor,
        Sumber: "MAP",
        Nama: k.Nama,
        Tanggal: k.Tanggal,
        Pesan: k.Pesan,
        Kirim: k.Kirim,
        Kurang: k.Kurang,
        Rencana: Number(k.Kurang) || 0,
        PermintaanKirim: k.DatelineAsli || "",
      };
    } else {
      const res = await penjadwalanPpicService.getSoInfo(
        nomor,
        header.pjw_divisi,
      );
      const k = res.data.data;
      rowInput = {
        SoNomor: k.Nomor,
        NomorPraOrder: "",
        MapNomor: "",
        Sumber: "SO",
        Nama: k.Nama,
        Tanggal: k.Tanggal,
        Pesan: k.Pesan,
        Kirim: k.Kirim,
        Kurang: k.Kurang,
        Rencana: Number(k.Kurang) || 0,
        PermintaanKirim: k.DatelineAsli || "",
      };
    }
    const saveRes = await penjadwalanPpicService.addDetailRow(
      header.pjw_nomor,
      rowInput,
    );
    pushRowFromServer(saveRes.data.data.pjwd_id, rowInput);
    showQtyWarning(saveRes.data.data.warning);
    manualSoNomor.value = "";
    toast.success(
      `${isMapNomor ? "MAP" : "SO"} ${rowInput.SoNomor || rowInput.MapNomor} ditambahkan.`,
    );
  } catch (e: any) {
    toast.error(
      e.response?.data?.message ||
        `${isMapNomor ? "MAP" : "SO"} tidak ditemukan.`,
    );
  } finally {
    isManualLoading.value = false;
  }
};

const isManualAddLoading = ref(false);
const tambahBarisManual = async () => {
  if (!header.pjw_cab) return toast.warning("Pilih Cabang terlebih dahulu.");
  isManualAddLoading.value = true;
  try {
    const rowInput = {
      SoNomor: "",
      NomorPraOrder: "",
      MapNomor: "",
      Sumber: "MANUAL",
      Nama: "Baris Baru",
      Tanggal: "",
      Pesan: 0,
      Kirim: 0,
      Kurang: 0,
      Rencana: 0,
      PermintaanKirim: "",
      NamaManual: "Baris Baru",
      PesanManual: 0,
      KirimManual: 0,
      RealisasiManual: 0,
    };
    const saveRes = await penjadwalanPpicService.addDetailRow(
      header.pjw_nomor,
      rowInput,
    );
    pushRowFromServer(saveRes.data.data.pjwd_id, rowInput);
    toast.success("Baris manual ditambahkan — silakan isi datanya.");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menambah baris manual.");
  } finally {
    isManualAddLoading.value = false;
  }
};

const onManualNamaChange = (row: DetailRow) =>
  onDetailFieldChange(row, "Nama", "pjwd_nama_manual");
const onManualPesanChange = (row: DetailRow) =>
  onDetailFieldChange(row, "Pesan", "pjwd_pesan_manual");
const onManualKirimChange = (row: DetailRow) =>
  onDetailFieldChange(row, "Kirim", "pjwd_kirim_manual");
const onManualRealisasiChange = (row: DetailRow) =>
  onDetailFieldChange(row, "Realisasi", "pjwd_realisasi_manual");

// ═══════════════════════════════════════════════════════════════
// UPDATE FIELD PER-BARIS — debounced auto-save
// ═══════════════════════════════════════════════════════════════
const onDetailFieldChange = (
  row: DetailRow,
  field: keyof DetailRow,
  dbField: string,
) => {
  if (!row.PjwdId) return;
  const previousValue = (row as any)[field];
  debounce(
    `row:${row.PjwdId}:${dbField}`,
    async () => {
      try {
        const res = await penjadwalanPpicService.updateDetailField(
          header.pjw_nomor,
          row.PjwdId!,
          dbField,
          (row as any)[field],
        );
        showQtyWarning(res.data?.data?.warning);
      } catch (e: any) {
        toast.error(e.response?.data?.message || "Gagal menyimpan perubahan.");
        (row as any)[field] = previousValue;
      }
    },
    700,
  );
};

const moveCursorToEnd = (e: Event) => {
  const input = e.target as HTMLInputElement;
  nextTick(() => {
    const len = input.value.length;
    input.setSelectionRange(len, len);
  });
};

const onRencanaInput = (row: DetailRow, raw: string, e: Event) => {
  const val = raw.replace(/[^0-9]/g, "");
  row.Rencana = val ? Number(val) : 0;
  if (row.StatusPermintaan !== "NECESSARY") {
    row.StatusPermintaan = row.Rencana >= row.Kurang ? "CLOSE" : "PARTIAL";
    onDetailFieldChange(row, "StatusPermintaan", "pjwd_status_permintaan");
  }
  onDetailFieldChange(row, "Rencana", "pjwd_rencana");
  moveCursorToEnd(e);
};

const onManualPesanInput = (row: DetailRow, raw: string, e: Event) => {
  const val = raw.replace(/[^0-9]/g, "");
  row.Pesan = val ? Number(val) : 0;
  row.Kurang = Math.max(row.Pesan - row.Kirim, 0);
  onManualPesanChange(row);
  moveCursorToEnd(e);
};

const onManualKirimInput = (row: DetailRow, raw: string, e: Event) => {
  const val = raw.replace(/[^0-9]/g, "");
  row.Kirim = val ? Number(val) : 0;
  row.Kurang = Math.max(row.Pesan - row.Kirim, 0);
  onManualKirimChange(row);
  moveCursorToEnd(e);
};

const onPermintaanKirimChange = (row: DetailRow) =>
  onDetailFieldChange(row, "PermintaanKirim", "pjwd_tgl_permintaan_kirim");
const onStatusPermintaanChange = (row: DetailRow) =>
  onDetailFieldChange(row, "StatusPermintaan", "pjwd_status_permintaan");
const onKesepakatanChange = (row: DetailRow) =>
  onDetailFieldChange(row, "Kesepakatan", "pjwd_tgl_kesepakatan");
const onKetKesepakatanChange = (row: DetailRow) =>
  onDetailFieldChange(row, "KetKesepakatan", "pjwd_ket_kesepakatan");

// ═══════════════════════════════════════════════════════════════
// HAPUS BARIS
// ═══════════════════════════════════════════════════════════════
const removeDetail = async (idx: number) => {
  const row = detail.value[idx];
  if (!row.PjwdId) {
    detail.value.splice(idx, 1);
    return;
  }
  try {
    await penjadwalanPpicService.deleteDetailRow(header.pjw_nomor, row.PjwdId);
    detail.value.splice(idx, 1);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus baris.");
  }
};

// ═══════════════════════════════════════════════════════════════
// SOCKET LISTENERS — perubahan dari user lain
// ═══════════════════════════════════════════════════════════════
onMounted(() => {
  on("pjw:row-added", (payload: any) => {
    // Hindari duplikasi kalau event ini justru echo dari aksi saya sendiri
    // (server broadcast ke SEMUA anggota room termasuk pengirim)
    if (detail.value.some((d) => d.PjwdId === payload.pjwd_id)) return;
    pushRowFromServer(payload.pjwd_id, payload.row);
  });

  on("pjw:field-updated", (payload: any) => {
    const row = detail.value.find((d) => d.PjwdId === payload.pjwd_id);
    if (!row) return;
    const fieldMap: Record<string, keyof DetailRow> = {
      pjwd_rencana: "Rencana",
      pjwd_tgl_permintaan_kirim: "PermintaanKirim",
      pjwd_status_permintaan: "StatusPermintaan",
      pjwd_tgl_kesepakatan: "Kesepakatan",
      pjwd_ket_kesepakatan: "KetKesepakatan",
    };
    const localField = fieldMap[payload.field];
    if (localField) (row as any)[localField] = payload.value;
  });

  on("pjw:row-deleted", (payload: any) => {
    const idx = detail.value.findIndex((d) => d.PjwdId === payload.pjwd_id);
    if (idx !== -1) detail.value.splice(idx, 1);
  });

  on("pjw:header-updated", (payload: any) => {
    if ((header as any)[payload.field] !== undefined) {
      (header as any)[payload.field] = payload.value;
    }
  });

  on("pjw:field-focus", (payload: any) => {
    fieldFocusMap[focusKey(payload.pjwdId, payload.field)] = {
      kode: payload.kode,
      nama: payload.nama,
    };
  });
  on("pjw:field-blur", (payload: any) => {
    delete fieldFocusMap[focusKey(payload.pjwdId, payload.field)];
  });
  on("pjw:user-disconnected", (payload: any) => {
    // Bersihkan semua badge milik user yang disconnect, di field manapun
    Object.keys(fieldFocusMap).forEach((key) => {
      if (fieldFocusMap[key]?.kode === payload.kode) delete fieldFocusMap[key];
    });
  });
});

const fmt = (n: number) => (n ?? 0).toLocaleString("id-ID");
const sel = (e: FocusEvent) => (e.target as HTMLInputElement).select();

const rowClass = (d: DetailRow) => {
  if (d.StatusPermintaan === "NECESSARY") return "row-necessary";
  if (d.StatusPermintaan === "PARTIAL") return "row-partial";
  if (Number(d.Kurang) <= 0) return "row-done";
  return "";
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Komitmen Kirim' : 'Tambah Komitmen Kirim'"
    menu-id="176"
    :icon="IconCalendarWeek"
    :is-loading="isLoading"
    item-name="Komitmen Kirim"
    v-model:show-close-dialog="showCloseDialog"
    @confirm-close="executeClose"
  >
    <template #header-actions>
      <v-btn
        size="small"
        variant="tonal"
        color="error"
        @click="showCloseDialog = true"
      >
        <template #prepend>
          <IconX :size="15" :stroke-width="2" />
        </template>
        Tutup
      </v-btn>
    </template>
    <div class="pjw-form">
      <!-- Presence bar -->
      <div class="pjw-presence-bar">
        <span class="presence-status" :class="{ on: isConnected }">
          {{ isConnected ? "● Terhubung" : "○ Menghubungkan..." }}
        </span>
        <div class="presence-users">
          <span
            v-for="u in presenceList"
            :key="u.kode"
            class="presence-chip"
            :class="{ me: u.kode === myUserKode }"
          >
            {{ u.nama }} <small>({{ u.bagian }})</small>
          </span>
        </div>
      </div>

      <div class="pjw-hdr-section">
        <div class="pjw-hdr-row">
          <label class="pjw-lbl">Nomor</label>
          <input
            :value="header.pjw_nomor || '(Belum dibuat)'"
            readonly
            class="pjw-inp-ro"
            style="width: 200px"
          />

          <label class="pjw-lbl" style="margin-left: 16px">Periode</label>
          <input
            type="date"
            v-model="header.pjw_tgl1"
            class="pjw-date"
            :disabled="isEditMode || !canEditMarketing"
          />
          <span class="pjw-sep">s/d</span>
          <input
            type="date"
            v-model="header.pjw_tgl2"
            class="pjw-date"
            :disabled="isEditMode || !canEditMarketing"
          />

          <label class="pjw-lbl" style="margin-left: 16px">Cabang</label>
          <select
            v-model="header.pjw_cab"
            class="pjw-select"
            style="width: 160px"
            :disabled="!canEditMarketing"
          >
            <option value="">- Pilih Cabang -</option>
            <option v-for="c in cabangOptions" :key="c.value" :value="c.value">
              {{ c.title }}
            </option>
          </select>

          <button
            v-if="!header.pjw_nomor && canEditMarketing"
            type="button"
            class="pjw-tarik-btn"
            style="margin-left: 16px"
            :disabled="isCreating"
            @click="createNew"
          >
            {{ isCreating ? "Membuat..." : "Buat Komitmen Kirim" }}
          </button>
        </div>
        <div class="pjw-hdr-row">
          <label class="pjw-lbl">Keterangan</label>
          <input
            v-model="header.pjw_keterangan"
            class="pjw-inp flex-1"
            placeholder="Catatan periode ini..."
            :disabled="!canEditMarketing"
          />
        </div>
      </div>

      <div class="pjw-toolbar">
        <input
          :value="
            divisiOptions.find((d) => d.value === header.pjw_divisi)?.title ||
            'Pilih Cabang dulu'
          "
          readonly
          class="pjw-inp-ro"
          style="width: 170px"
        />
        <button
          type="button"
          class="pjw-tarik-btn"
          :disabled="isTarikLoading || !canEditMarketing"
          @click="tarikSo"
        >
          <IconDownload :size="14" class="mr-1" />{{
            isTarikLoading ? "Menarik..." : "Tarik SO Periode Ini"
          }}
        </button>
        <button
          type="button"
          class="pjw-tarik-btn pra-order"
          :disabled="isTarikPraOrderLoading || !canEditMarketing"
          @click="tarikPraOrder"
        >
          <IconDownload :size="14" class="mr-1" />{{
            isTarikPraOrderLoading ? "Menarik..." : "Tarik dari Pra Order"
          }}
        </button>
        <button
          type="button"
          class="pjw-tarik-btn map"
          :disabled="isTarikMapLoading || !canEditMarketing"
          @click="tarikMap"
        >
          <IconDownload :size="14" class="mr-1" />{{
            isTarikMapLoading ? "Menarik..." : "Tarik dari MAP"
          }}
        </button>
        <button
          type="button"
          class="pjw-tarik-btn manual"
          :disabled="isManualAddLoading || !canEditMarketing"
          @click="tambahBarisManual"
        >
          <IconDownload :size="14" class="mr-1" />{{
            isManualAddLoading ? "Menambah..." : "Tambah Baris Manual"
          }}
        </button>
        <div class="pjw-manual-wrap">
          <span v-if="fieldFocusMap[MANUAL_ADD_KEY]" class="field-focus-badge">
            {{ fieldFocusMap[MANUAL_ADD_KEY].nama }} sedang mengetik...
          </span>
          <div class="pjw-manual-add">
            <input
              v-model="manualSoNomor"
              type="text"
              class="pjw-manual-inp"
              placeholder="Ketik nomor SO atau MAP..."
              :disabled="!canEditMarketing"
              @focus="onManualFocus"
              @blur="onManualBlur"
              @keydown.enter.prevent="tambahManual"
            />
            <button
              type="button"
              class="pjw-manual-btn"
              :disabled="isManualLoading || !canEditMarketing"
              @click="tambahManual"
            >
              <IconSearch :size="13" />
            </button>
          </div>
        </div>
        <span class="pjw-total-info"
          >Total: <strong>{{ detail.length }}</strong></span
        >
      </div>

      <div class="pjw-table-wrap">
        <table class="pjw-dt">
          <thead>
            <tr>
              <th style="width: 90px">Tanggal</th>
              <th>Nomor / Nama SO</th>
              <th style="width: 80px" class="tr">Pesan</th>
              <th style="width: 80px" class="tr">Kirim</th>
              <th style="width: 80px" class="tr">Kurang</th>
              <th style="width: 80px" class="tr">Rencana</th>
              <th style="width: 80px" class="tr">Realisasi</th>
              <th style="width: 130px" class="tc">Permintaan Kirim</th>
              <th style="width: 100px" class="tc">Permintaan</th>
              <th style="width: 200px">Kesepakatan</th>
              <th style="width: 36px"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, idx) in detail"
              :key="d.PjwdId ?? idx"
              :class="rowClass(d)"
            >
              <td>{{ formatTanggal(d.Tanggal) }}</td>
              <td>
                <div class="mono" v-if="!isManualRow(d)">
                  {{ d.SoNomor || d.MapNomor || d.NomorPraOrder }}
                </div>
                <input
                  v-if="isManualRow(d)"
                  type="text"
                  v-model="d.Nama"
                  class="pjw-cell-text"
                  placeholder="Nama..."
                  :disabled="!canEditMarketing"
                  @focus="onFieldFocus(d, 'pjwd_nama_manual')"
                  @blur="
                    () => {
                      onFieldBlur(d, 'pjwd_nama_manual');
                      onManualNamaChange(d);
                    }
                  "
                />
                <div v-else>{{ d.Nama }}</div>
                <span
                  class="sumber-badge"
                  :class="{
                    'is-pra': d.Sumber === 'PRA ORDER',
                    'is-map': d.Sumber === 'MAP',
                    'is-so': d.Sumber === 'SO',
                    'is-manual': d.Sumber === 'MANUAL',
                  }"
                  >{{ d.Sumber }}</span
                >
              </td>
              <td class="tr">
                <input
                  v-if="isManualRow(d)"
                  type="text"
                  inputmode="numeric"
                  class="pjw-cell-num"
                  :value="d.Pesan"
                  :disabled="!canEditMarketing"
                  @input="
                    onManualPesanInput(
                      d,
                      ($event.target as HTMLInputElement).value,
                      $event,
                    )
                  "
                />
                <template v-else>{{ fmt(d.Pesan) }}</template>
              </td>
              <td class="tr">
                <input
                  v-if="isManualRow(d)"
                  type="text"
                  inputmode="numeric"
                  class="pjw-cell-num"
                  :value="d.Kirim"
                  :disabled="!canEditMarketing"
                  @input="
                    onManualKirimInput(
                      d,
                      ($event.target as HTMLInputElement).value,
                      $event,
                    )
                  "
                />
                <template v-else>{{ fmt(d.Kirim) }}</template>
              </td>
              <td class="tr" :class="{ 'text-red fw': d.Kurang > 0 }">
                {{ fmt(d.Kurang) }}
              </td>
              <td class="tr" style="position: relative">
                <span
                  v-if="fieldFocusMap[focusKey(d.PjwdId, 'pjwd_rencana')]"
                  class="field-focus-badge"
                >
                  {{ fieldFocusMap[focusKey(d.PjwdId, "pjwd_rencana")].nama }}
                </span>
                <input
                  type="text"
                  inputmode="numeric"
                  class="pjw-cell-num"
                  :value="d.Rencana"
                  :disabled="!canEditMarketing"
                  @focus="
                    (e) => {
                      sel(e);
                      onFieldFocus(d, 'pjwd_rencana');
                    }
                  "
                  @blur="onFieldBlur(d, 'pjwd_rencana')"
                  @input="
                    onRencanaInput(
                      d,
                      ($event.target as HTMLInputElement).value,
                      $event,
                    )
                  "
                />
              </td>
              <td class="tr">
                <input
                  v-if="isManualRow(d)"
                  type="text"
                  inputmode="numeric"
                  class="pjw-cell-num"
                  v-model.number="d.Realisasi"
                  :disabled="!canEditMarketing"
                  @blur="onManualRealisasiChange(d)"
                />
                <template v-else>{{ fmt(d.Realisasi) }}</template>
              </td>
              <td class="tc" style="position: relative">
                <span
                  v-if="
                    fieldFocusMap[
                      focusKey(d.PjwdId, 'pjwd_tgl_permintaan_kirim')
                    ]
                  "
                  class="field-focus-badge"
                >
                  {{
                    fieldFocusMap[
                      focusKey(d.PjwdId, "pjwd_tgl_permintaan_kirim")
                    ].nama
                  }}
                </span>
                <input
                  type="date"
                  v-model="d.PermintaanKirim"
                  class="pjw-cell-date"
                  :disabled="!canEditMarketing"
                  @focus="onFieldFocus(d, 'pjwd_tgl_permintaan_kirim')"
                  @blur="
                    () => {
                      onFieldBlur(d, 'pjwd_tgl_permintaan_kirim');
                      onPermintaanKirimChange(d);
                    }
                  "
                />
              </td>
              <td class="tc" style="position: relative">
                <span
                  v-if="
                    fieldFocusMap[focusKey(d.PjwdId, 'pjwd_status_permintaan')]
                  "
                  class="field-focus-badge"
                >
                  {{
                    fieldFocusMap[focusKey(d.PjwdId, "pjwd_status_permintaan")]
                      .nama
                  }}
                </span>
                <select
                  v-model="d.StatusPermintaan"
                  class="pjw-cell-select"
                  :disabled="!canEditMarketing"
                  @focus="onFieldFocus(d, 'pjwd_status_permintaan')"
                  @blur="onFieldBlur(d, 'pjwd_status_permintaan')"
                  @change="onStatusPermintaanChange(d)"
                >
                  <option value="CLOSE">CLOSE</option>
                  <option value="PARTIAL">PARTIAL</option>
                  <option value="NECESSARY">NECESSARY</option>
                </select>
              </td>
              <td style="position: relative">
                <span
                  v-if="
                    fieldFocusMap[focusKey(d.PjwdId, 'pjwd_tgl_kesepakatan')]
                  "
                  class="field-focus-badge"
                >
                  {{
                    fieldFocusMap[focusKey(d.PjwdId, "pjwd_tgl_kesepakatan")]
                      .nama
                  }}
                </span>
                <div class="pjw-kesepakatan-cell">
                  <input
                    type="date"
                    v-model="d.Kesepakatan"
                    class="pjw-cell-date"
                    :disabled="!canEditKesepakatan"
                    @focus="onFieldFocus(d, 'pjwd_tgl_kesepakatan')"
                    @blur="
                      () => {
                        onFieldBlur(d, 'pjwd_tgl_kesepakatan');
                        onKesepakatanChange(d);
                      }
                    "
                  />
                  <input
                    type="text"
                    v-model="d.KetKesepakatan"
                    class="pjw-cell-text"
                    :disabled="!canEditKesepakatan"
                    @focus="onFieldFocus(d, 'pjwd_ket_kesepakatan')"
                    @blur="onFieldBlur(d, 'pjwd_ket_kesepakatan')"
                    @change="onKetKesepakatanChange(d)"
                  />
                </div>
              </td>
              <td class="tc">
                <button
                  v-if="canEditMarketing"
                  type="button"
                  class="pjw-row-del"
                  @click="removeDetail(idx)"
                >
                  <IconTrash :size="13" />
                </button>
              </td>
            </tr>
            <tr v-if="!detail.length">
              <td colspan="11" class="pjw-empty">
                Belum ada SO/MAP/Pra Order. Klik tombol Tarik atau tambahkan
                manual di atas.
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="pjw-footer-row">
              <td colspan="5" class="pjw-footer-label">Total Rencana</td>
              <td class="tr pjw-footer-val">{{ fmt(totalRencana) }}</td>
              <td colspan="5"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </BaseForm>
</template>

<style scoped>
.pjw-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}

.pjw-hdr-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.pjw-hdr-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.pjw-hdr-row:last-child {
  margin-bottom: 0;
}
.pjw-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}
.pjw-inp-ro {
  height: 28px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  background: #f5f5f5;
  color: #555;
}
.pjw-inp {
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.pjw-inp:focus {
  border-color: #1976d2;
}
.pjw-date {
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.pjw-date:focus {
  border-color: #1976d2;
}
.pjw-date:disabled {
  background: #f5f5f5;
}
.pjw-sep {
  font-size: 11px;
  color: #757575;
}
.flex-1 {
  flex: 1;
  min-width: 0;
}

.pjw-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.pjw-tarik-btn {
  display: inline-flex;
  align-items: center;
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.pjw-tarik-btn:hover:not(:disabled) {
  background: #0d47a1;
}
.pjw-tarik-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
.pjw-tarik-btn.manual {
  background: #455a64;
}
.pjw-tarik-btn.manual:hover:not(:disabled) {
  background: #263238;
}
.sumber-badge.is-manual {
  background: #455a64;
}

.pjw-manual-add {
  display: flex;
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  overflow: hidden;
}
.pjw-manual-inp {
  width: 220px;
  border: none;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.pjw-manual-btn {
  width: 30px;
  background: #f0f0f0;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1565c0;
}
.pjw-manual-btn:hover {
  background: #e3f2fd;
}

.pjw-total-info {
  margin-left: auto;
  font-size: 11px;
  color: #555;
}

.pjw-table-wrap {
  flex: 1;
  overflow: auto;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.pjw-dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.pjw-dt thead th {
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #212121;
  text-align: left;
  background: #ffeb3b;
  border: 1px solid #e0d840;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}
.pjw-dt tbody td {
  padding: 4px 8px;
  border: 1px solid #eeeeee;
  vertical-align: top;
}
.tr {
  text-align: right !important;
}
.tc {
  text-align: center !important;
}
.fw {
  font-weight: 700;
}
.mono {
  font-weight: 700;
  font-size: 11px;
}

.row-done td {
  background: #e3f2fd;
}
.row-close td {
  background: #ffebee;
  opacity: 0.8;
}

.praorder-badge {
  display: inline-block;
  margin-top: 2px;
  font-size: 9px;
  background: #1565c0;
  color: white;
  padding: 1px 6px;
  border-radius: 8px;
}

.pjw-cell-date {
  width: 100%;
  height: 24px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
}
.pjw-cell-select {
  width: 100%;
  height: 24px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
  background: white;
}
.pjw-kesepakatan-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.pjw-cell-text {
  width: 100%;
  height: 24px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
}

.pjw-row-del {
  background: transparent;
  border: none;
  color: #e53935;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pjw-row-del:hover {
  color: #b71c1c;
}

.pjw-empty {
  text-align: center;
  padding: 24px;
  color: #9e9e9e;
  font-style: italic;
  font-size: 12px;
}

.pjw-select {
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
}
.pjw-select:focus {
  border-color: #1976d2;
}

.pjw-tarik-btn.pra-order {
  background: #6a1b9a;
}
.pjw-tarik-btn.pra-order:hover:not(:disabled) {
  background: #4a148c;
}

.sumber-badge {
  display: inline-block;
  margin-top: 2px;
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 8px;
  color: white;
}
.sumber-badge.is-so {
  background: #1565c0;
}
.sumber-badge.is-pra {
  background: #6a1b9a;
}
.sumber-badge.is-map {
  background: #ef6c00;
}
.pjw-tarik-btn.map {
  background: #ef6c00;
}
.pjw-tarik-btn.map:hover:not(:disabled) {
  background: #e65100;
}
.row-necessary td {
  background: #b71c1c !important;
  color: white;
  font-weight: 700;
}
.row-partial td {
  background: #fff3e0;
}
.pjw-cell-num {
  width: 100%;
  height: 24px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
  text-align: right;
}
.pjw-dt tfoot {
  position: sticky;
  bottom: 0;
  z-index: 2;
}
.pjw-footer-row td {
  background: #212121;
  color: white;
  font-weight: 700;
  padding: 6px 8px;
  border: 1px solid #424242;
}
.pjw-footer-label {
  text-align: right;
}
.pjw-footer-val {
  font-size: 13px;
}
.pjw-presence-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 8px;
  flex-shrink: 0;
  font-size: 11px;
}
.presence-status {
  font-weight: 700;
  color: #9e9e9e;
}
.presence-status.on {
  color: #2e7d32;
}
.presence-users {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.presence-chip {
  background: #e3f2fd;
  color: #1565c0;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.presence-chip.me {
  background: #1565c0;
  color: white;
}
.presence-chip small {
  opacity: 0.75;
  font-weight: 400;
}
.field-focus-badge {
  position: absolute;
  top: -8px;
  left: 2px;
  font-size: 8px;
  font-weight: 700;
  background: #ff9800;
  color: white;
  padding: 1px 5px;
  border-radius: 6px;
  z-index: 3;
  white-space: nowrap;
  pointer-events: none;
}
.pjw-manual-wrap {
  position: relative;
}
</style>
