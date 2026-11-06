<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconSkull, IconSearch } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import * as lhkForm from "@/services/spanduk/lhk/lhkDesignFormService";
import type {
  LhkDesignForm,
  LhkDesignBatchPayload,
  SaveResponse,
  SesiTimer,
  DesignerOption,
  MesinOption,
  BahanOption,
} from "@/services/spanduk/lhk/lhkDesignFormService";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);

const STATUS_SELESAI = "DONE";
const MAKS_ANGKA = 99999999.99;
const MAKS_TAB = 20; // sama dengan MAKS_MAP_SESI di backend
const KUNCI_DESIGNER = "lhk-design-designer-terakhir";

const formatDateLocal = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const todayLocal = formatDateLocal(new Date());

// ── Model data ──
interface KomponenRow {
  bahan: string;
  panjang: number;
  jumlah: number;
  c: number;
  m: number;
  y: number;
  k: number;
  mesin: string;
  keterangan: string;
}

interface StatusRow {
  cabang: string;
  designer: string;
  status: string;
  tanggal: string;
  jam: string;
  durasi: string;
  catatan: string;
}

// Satu tab = satu SPK/MAP = satu LHK Design (nomor LHK-D sendiri)
interface TabMap {
  nomor: string;
  jenis: string;
  nama: string;
  tanggalSpk: string;
  dateline: string;
  finishing: string;
  nomorLhk: string;
  ada: boolean;
  status: StatusRow[];
  komponen: KomponenRow[];
}

interface FormState {
  tanggal: string; // sama untuk semua tab
  tabs: TabMap[];
}

interface PorsiRow {
  nomor: string;
  persen: number;
}

const num = (v: unknown) => Number(v) || 0;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const komponenKosong = (): KomponenRow => ({
  bahan: "",
  panjang: 0,
  jumlah: 0,
  c: 0,
  m: 0,
  y: 0,
  k: 0,
  mesin: "",
  keterangan: "",
});

const defaultData = (): FormState => ({ tanggal: todayLocal, tabs: [] });

const mapStatus = (s: LhkDesignForm["Status"][number]): StatusRow => ({
  cabang: s.Kode_Cabang ?? "",
  designer: s.Designer ?? "",
  status: s.Status,
  tanggal: s.Tanggal ?? "",
  jam: s.Jam ?? "",
  durasi: s.Durasi ?? "",
  catatan: s.Catatan ?? "",
});

const mapTab = (d: LhkDesignForm): TabMap => {
  const komponen: KomponenRow[] = d.Komponen.map((k) => ({
    bahan: k.Bahan ?? "",
    panjang: num(k.Panjang),
    jumlah: num(k.Jumlah),
    c: num(k.C),
    m: num(k.M),
    y: num(k.Y),
    k: num(k.K),
    mesin: k.Mesin ?? "",
    keterangan: k.Keterangan ?? "",
  }));
  return {
    nomor: d.Nomor,
    jenis: d.Jenis,
    nama: d.Nama_SPK ?? "",
    tanggalSpk: d.Tanggal_SPK ?? "",
    dateline: d.Dateline ?? "",
    finishing: d.Finishing ?? "",
    nomorLhk: d.Nomor_LHK ?? "",
    ada: d.Ada,
    status: d.Status.map(mapStatus),
    komponen: komponen.length > 0 ? komponen : [komponenKosong()],
  };
};

function barisKosong(r: KomponenRow): boolean {
  return (
    !r.bahan &&
    !r.mesin &&
    !r.keterangan.trim() &&
    [r.panjang, r.jumlah, r.c, r.m, r.y, r.k].every((v) => num(v) === 0)
  );
}

const bangunPayload = (data: FormState): LhkDesignBatchPayload => ({
  Tanggal: data.tanggal,
  Daftar: data.tabs.map((t) => ({
    Nomor_SPK: t.nomor,
    Komponen: t.komponen
      .filter((r) => !barisKosong(r))
      .map((r) => ({
        Bahan: r.bahan,
        Panjang: num(r.panjang),
        Jumlah: num(r.jumlah),
        C: num(r.c),
        M: num(r.m),
        Y: num(r.y),
        K: num(r.k),
        Mesin: r.mesin,
        Keterangan: r.keterangan.trim(),
      })),
  })),
});

// ── State UI ──
const inputNomor = ref("");
const showHasilSimpan = ref(false);
const sedangAksi = ref(false);
const tabIdx = ref(0);

const designerOpts = ref<DesignerOption[]>([]);
const mesinOpts = ref<MesinOption[]>([]);
const bahanOpts = ref<BahanOption[]>([]);
const designerIdx = ref(-1);
const catatanAksi = ref("");

const showSpk = ref(false);

const showDlgPause = ref(false);
const alasanPause = ref("");
const showDlgSelesai = ref(false);
const showDlgBatal = ref(false);
const porsiInput = ref<PorsiRow[]>([]);

const {
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  executeSave,
  executeCancel,
  executeClose,
  goBack,
} = useForm({
  menuId: "4",
  initialData: defaultData(),
  fetchApi: async (): Promise<FormState> => {
    const d = await lhkForm.getById(String(route.params.nomor));
    return { tanggal: d.Tanggal_LHK ?? todayLocal, tabs: [mapTab(d)] };
  },
  submitApi: async (data: FormState): Promise<SaveResponse> =>
    lhkForm.simpanBatch(bangunPayload(data)),
  onSuccess: () => {
    showHasilSimpan.value = true;
  },
  onFormReset: () => {
    inputNomor.value = "";
    catatanAksi.value = "";
    tabIdx.value = 0;
  },
});

const tabAktif = computed<TabMap | null>(
  () => formData.value.tabs[tabIdx.value] ?? null,
);

const statusAkhirTab = computed<StatusRow | null>(() => {
  const s = tabAktif.value?.status ?? [];
  return s.length > 0 ? s[s.length - 1] : null;
});

const hasilSimpan = computed(() =>
  formData.value.tabs.map((t) => t.nomorLhk || t.nomor),
);

// ── Lookup ──
const opsiMesinUntuk = (nilai: string): MesinOption[] =>
  nilai && !mesinOpts.value.some((m) => m.Kode === nilai)
    ? [{ Kode: nilai, Nama: null, Keterangan: null }, ...mesinOpts.value]
    : mesinOpts.value;

const opsiBahanUntuk = (nilai: string): BahanOption[] =>
  nilai && !bahanOpts.value.some((b) => b.Kode === nilai)
    ? [{ Kode: nilai }, ...bahanOpts.value]
    : bahanOpts.value;

const designerTerpilih = computed<DesignerOption | null>(
  () => designerOpts.value[designerIdx.value] ?? null,
);

const pulihkanDesigner = () => {
  try {
    const simpanan = localStorage.getItem(KUNCI_DESIGNER);
    if (!simpanan) {
      return;
    }
    const idx = designerOpts.value.findIndex(
      (d) => `${d.Kode}|${d.Designer}` === simpanan,
    );
    if (idx >= 0) {
      designerIdx.value = idx;
    }
  } catch {
    // localStorage tidak tersedia: abaikan
  }
};

const catatDesigner = () => {
  const d = designerTerpilih.value;
  if (!d) {
    return;
  }
  try {
    localStorage.setItem(KUNCI_DESIGNER, `${d.Kode}|${d.Designer}`);
  } catch {
    // abaikan
  }
};

// ── Timer sesi ──
// Server memberi durasi bersih pada saat respons; browser hanya menambah
// selisih jam lokal sejak respons diterima.
const sesi = ref<SesiTimer | null>(null);
const sesiDiterimaMs = ref(0);
const sekarangMs = ref(Date.now());
let pewaktu: ReturnType<typeof setInterval> | null = null;

const setSesi = (s: SesiTimer | null) => {
  sesi.value = s;
  sesiDiterimaMs.value = Date.now();
};

const berjalan = computed(() => sesi.value?.Status === "BERJALAN");
const dipause = computed(() => sesi.value?.Status === "PAUSE");
const sesiAktif = computed(() => berjalan.value || dipause.value);

const selisihDetik = computed(() =>
  Math.max(0, Math.floor((sekarangMs.value - sesiDiterimaMs.value) / 1000)),
);

const detikBersih = computed(() => {
  const s = sesi.value;
  if (!s || s.Durasi_Bersih_Detik === null) {
    return 0;
  }
  return s.Durasi_Bersih_Detik + (berjalan.value ? selisihDetik.value : 0);
});

const sisaPauseDetik = computed(() => {
  const p = sesi.value?.Pause_Aktif;
  return p ? Math.max(0, p.Sisa_Detik - selisihDetik.value) : 0;
});

const pauseHabis = computed(() => dipause.value && sisaPauseDetik.value <= 0);

const pad = (n: number) => String(n).padStart(2, "0");

const formatDurasi = (detik: number) => {
  const d = Math.max(0, Math.floor(detik));
  return `${pad(Math.floor(d / 3600))}:${pad(Math.floor((d % 3600) / 60))}:${pad(d % 60)}`;
};

const formatMenitDetik = (detik: number) =>
  `${pad(Math.floor(detik / 60))}:${pad(detik % 60)}`;

const lamaTeks = computed(() => formatDurasi(detikBersih.value));

const bisaMulai = computed(
  () =>
    formData.value.tabs.length > 0 &&
    !sesiAktif.value &&
    !sedangAksi.value &&
    !!designerTerpilih.value,
);

const jalankan = async (kerja: () => Promise<void>, galatDefault: string) => {
  sedangAksi.value = true;
  try {
    await kerja();
  } catch (e) {
    toast.error(lhkForm.pesanError(e, galatDefault));
  } finally {
    sedangAksi.value = false;
  }
};

// Hanya status/nomor yang diperbarui: komponen yang sedang diedit tidak tertimpa
const segarkanSemuaTab = async () => {
  await Promise.all(
    formData.value.tabs.map(async (t) => {
      const d = await lhkForm.getById(t.nomor);
      t.ada = d.Ada;
      t.nomorLhk = d.Nomor_LHK ?? "";
      t.status = d.Status.map(mapStatus);
    }),
  );
};

const mulaiTimer = () =>
  jalankan(async () => {
    const pelaku = designerTerpilih.value;
    if (!pelaku) {
      toast.warning("Pilih designer terlebih dahulu.");
      return;
    }
    const s = await lhkForm.mulaiSesi({
      Kode_Cabang: pelaku.Kode,
      Designer: pelaku.Designer,
      Catatan: catatanAksi.value.trim(),
      Daftar_Spk: formData.value.tabs.map((t) => t.nomor),
    });
    setSesi(s);
    catatDesigner();
    catatanAksi.value = "";
    await segarkanSemuaTab();
    toast.success("Timer dimulai.");
  }, "Gagal memulai timer.");

const konfirmasiPause = () =>
  jalankan(async () => {
    const s = sesi.value;
    if (!s) {
      return;
    }
    const alasan = alasanPause.value.trim();
    if (!alasan) {
      toast.warning("Alasan pause wajib diisi.");
      return;
    }
    setSesi(await lhkForm.pauseSesi(s.Sesi_Id, alasan));
    showDlgPause.value = false;
    alasanPause.value = "";
    toast.success("Timer di-pause.");
  }, "Gagal mem-pause timer.");

const lanjutTimer = () =>
  jalankan(async () => {
    const s = sesi.value;
    if (!s) {
      return;
    }
    setSesi(await lhkForm.resumeSesi(s.Sesi_Id));
    toast.success("Timer dilanjutkan.");
  }, "Gagal melanjutkan timer.");

// Porsi awal dibagi rata; designer yang mengatur per tab
const bukaSelesai = () => {
  const tabs = formData.value.tabs;
  const n = tabs.length;
  if (n === 0) {
    return;
  }
  const dasar = Math.floor(10000 / n) / 100;
  porsiInput.value = tabs.map((t, i) => ({
    nomor: t.nomor,
    persen: i === n - 1 ? round2(100 - dasar * (n - 1)) : dasar,
  }));
  showDlgSelesai.value = true;
};

const totalPorsi = computed(() =>
  round2(porsiInput.value.reduce((a, p) => a + num(p.persen), 0)),
);
const porsiValid = computed(() => Math.abs(totalPorsi.value - 100) <= 0.01);

const estimasiDurasi = (persen: number) =>
  formatDurasi((detikBersih.value * num(persen)) / 100);

const konfirmasiSelesai = () =>
  jalankan(async () => {
    const s = sesi.value;
    if (!s) {
      return;
    }
    if (!porsiValid.value) {
      toast.warning("Total porsi harus 100%.");
      return;
    }
    const banyak = porsiInput.value.length > 1;
    const hasil = await lhkForm.selesaiSesi(s.Sesi_Id, {
      Catatan: catatanAksi.value.trim(),
      Porsi: banyak
        ? porsiInput.value.map((p) => ({
            Nomor_SPK: p.nomor,
            Persen: num(p.persen),
          }))
        : undefined,
    });
    showDlgSelesai.value = false;
    setSesi(hasil);
    catatanAksi.value = "";
    await segarkanSemuaTab();
    toast.success("Pekerjaan selesai.");
  }, "Gagal menyelesaikan timer.");

const konfirmasiBatal = () =>
  jalankan(async () => {
    const s = sesi.value;
    if (!s) {
      return;
    }
    const hasil = await lhkForm.batalSesi(s.Sesi_Id);
    showDlgBatal.value = false;
    setSesi(null);
    catatanAksi.value = "";
    await segarkanSemuaTab();
    const tahan = hasil.Header_Dipertahankan ?? [];
    if (tahan.length > 0) {
      toast.info(
        `Timer dibatalkan. LHK ${tahan.join(", ")} dipertahankan karena sudah berisi komponen.`,
      );
    } else {
      toast.success("Timer dibatalkan.");
    }
  }, "Gagal membatalkan timer.");

// Memulihkan timer yang masih aktif setelah halaman dimuat ulang
const pulihkanSesi = async () => {
  const s = await lhkForm.getSesiAktif();
  if (!s) {
    return;
  }
  const daftar = await Promise.all(
    s.Daftar.map((m) => lhkForm.getById(m.Nomor_SPK)),
  );
  formData.value.tabs = daftar.map(mapTab);
  formData.value.tanggal = todayLocal;
  tabIdx.value = 0;
  setSesi(s);
  const idx = designerOpts.value.findIndex(
    (d) => d.Kode === s.Kode_Cabang && d.Designer === s.Designer,
  );
  if (idx >= 0) {
    designerIdx.value = idx;
  }
};

onMounted(async () => {
  pewaktu = setInterval(() => {
    sekarangMs.value = Date.now();
  }, 1000);
  try {
    const [designer, mesin, bahan] = await Promise.all([
      lhkForm.getLookupDesigner(),
      lhkForm.getLookupMesin(),
      lhkForm.getLookupBahan(),
    ]);
    designerOpts.value = designer;
    mesinOpts.value = mesin;
    bahanOpts.value = bahan;
    pulihkanDesigner();
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat data lookup."));
  }
  if (!isEditMode.value) {
    try {
      await pulihkanSesi();
    } catch (e) {
      toast.error(lhkForm.pesanError(e, "Gagal memulihkan timer."));
    }
  }
});

onBeforeUnmount(() => {
  if (pewaktu) {
    clearInterval(pewaktu);
  }
});

// ── Tab SPK/MAP ──
const tambahTab = async (nomorInput: string) => {
  const nomor = nomorInput.trim();
  if (!nomor) {
    return;
  }
  if (sesiAktif.value) {
    toast.warning(
      "Daftar SPK/MAP dikunci selama timer berjalan atau di-pause.",
    );
    return;
  }
  const tabs = formData.value.tabs;
  const sudahAda = (n: string) =>
    tabs.some((t) => t.nomor.toUpperCase() === n.toUpperCase());
  if (sudahAda(nomor)) {
    toast.warning(`SPK/MAP ${nomor} sudah ada di daftar.`);
    inputNomor.value = "";
    return;
  }
  if (tabs.length >= MAKS_TAB) {
    toast.warning(`Maksimal ${MAKS_TAB} SPK/MAP dalam satu timer.`);
    return;
  }
  isLoading.value = true;
  try {
    const d = await lhkForm.getById(nomor);
    if (sudahAda(d.Nomor)) {
      toast.warning(`SPK/MAP ${d.Nomor} sudah ada di daftar.`);
      inputNomor.value = "";
      return;
    }
    tabs.push(mapTab(d));
    tabIdx.value = tabs.length - 1;
    inputNomor.value = "";
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat data SPK/MAP."));
  } finally {
    isLoading.value = false;
  }
};

const hapusTab = (idx: number) => {
  if (sesiAktif.value) {
    toast.warning(
      "Daftar SPK/MAP dikunci selama timer berjalan atau di-pause.",
    );
    return;
  }
  formData.value.tabs.splice(idx, 1);
  if (tabIdx.value >= formData.value.tabs.length) {
    tabIdx.value = Math.max(0, formData.value.tabs.length - 1);
  }
};

const bukaLookupSpk = () => {
  if (sesiAktif.value) {
    return;
  }
  showSpk.value = true;
};

const onSpkDipilih = (item: { Nomor: string }) => {
  void tambahTab(item.Nomor);
};

// ── Komponen (tab aktif) ──
const addRow = () => {
  tabAktif.value?.komponen.push(komponenKosong());
};

const removeRow = (idx: number) => {
  const t = tabAktif.value;
  if (!t) {
    return;
  }
  t.komponen.splice(idx, 1);
  if (t.komponen.length === 0) {
    t.komponen.push(komponenKosong());
  }
};

const totalBaris = (r: KomponenRow) => round2(num(r.panjang) * num(r.jumlah));

const totalSemua = computed(() =>
  round2(
    (tabAktif.value?.komponen ?? []).reduce((a, r) => a + totalBaris(r), 0),
  ),
);

const fmt = (n: number) =>
  n.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const selesaiStatus = (s: string | null | undefined) =>
  (s ?? "").trim().toUpperCase() === STATUS_SELESAI;

// ── Validasi sebelum konfirmasi simpan (sama dengan server) ──
const validateSave = () => {
  const f = formData.value;
  if (f.tabs.length === 0) {
    toast.warning("Minimal satu SPK/MAP harus diisi.");
    return;
  }
  if (!f.tanggal) {
    toast.warning("Tanggal LHK tidak boleh kosong.");
    return;
  }

  const kolom = (r: KomponenRow) =>
    [
      ["Panjang Output", r.panjang],
      ["Jumlah Output", r.jumlah],
      ["C", r.c],
      ["M", r.m],
      ["Y", r.y],
      ["K", r.k],
    ] as const;

  for (const t of f.tabs) {
    if (!t.ada) {
      toast.warning(
        `${t.nomor}: tekan Mulai terlebih dahulu sebelum menyimpan.`,
      );
      return;
    }
    for (const [i, r] of t.komponen.entries()) {
      if (barisKosong(r)) {
        continue;
      }
      const no = i + 1;
      if (!r.bahan) {
        toast.warning(`${t.nomor} baris ${no}: Bahan wajib dipilih.`);
        return;
      }
      for (const [label, v] of kolom(r)) {
        const n = num(v);
        if (n < 0 || n > MAKS_ANGKA) {
          toast.warning(
            `${t.nomor} baris ${no}: ${label} harus 0 sampai 99.999.999,99.`,
          );
          return;
        }
      }
      if (r.keterangan.trim().length > 200) {
        toast.warning(
          `${t.nomor} baris ${no}: Keterangan maksimal 200 karakter.`,
        );
        return;
      }
    }
  }

  showSaveDialog.value = true;
};

// ── Setelah simpan ──
const resetBaru = () => {
  showHasilSimpan.value = false;
  if (sesiAktif.value) {
    toast.warning("Timer masih aktif. Selesaikan atau batalkan dulu.");
    return;
  }
  if (isEditMode.value) {
    router.replace({ name: "SpandukLhkDesignCreate" });
    return;
  }
  formData.value = defaultData();
  inputNomor.value = "";
  catatanAksi.value = "";
  tabIdx.value = 0;
  setSesi(null);
};

const tutupSetelahSimpan = () => {
  showHasilSimpan.value = false;
  goBack();
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah LHK Design' : 'Tambah LHK Design'"
    menu-id="4"
    :icon="IconSkull"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ══ KOLOM KIRI ══ -->
    <template #left-column>
      <div class="lhk-left">
        <div class="fr">
          <label class="lbl">Tambah SPK/MAP</label>
          <div class="cell-grp inp-grp" style="flex: 1">
            <input
              v-model="inputNomor"
              :readonly="sesiAktif"
              class="ci"
              :class="{ ro: sesiAktif }"
              placeholder="Nomor + Enter / F1 cari"
              autocomplete="off"
              @keydown.enter.prevent="tambahTab(inputNomor)"
              @keydown.f1.prevent="bukaLookupSpk"
            />
            <button
              type="button"
              class="ci-btn"
              title="Cari SPK/MAP"
              :disabled="sesiAktif"
              @click="bukaLookupSpk"
            >
              <IconSearch :size="11" />
            </button>
          </div>
        </div>

        <div class="fr">
          <label class="lbl">Tgl LHK</label>
          <input
            type="date"
            v-model="formData.tanggal"
            class="idate"
            style="width: 150px"
          />
          <span class="hint">semua tab</span>
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">No. LHK</label>
          <input
            :value="tabAktif?.nomorLhk || '-'"
            readonly
            class="inp ro"
            style="width: 140px"
          />
        </div>

        <div class="fr">
          <label class="lbl">SPK/MAP</label>
          <input
            :value="tabAktif?.nomor ?? ''"
            readonly
            class="inp ro"
            style="width: 140px"
          />
          <input
            :value="tabAktif?.jenis ?? ''"
            readonly
            class="inp ro"
            style="width: 50px"
          />
        </div>

        <div class="fr">
          <label class="lbl">Nama Design</label>
          <input
            :value="tabAktif?.nama ?? ''"
            readonly
            class="inp ro"
            style="flex: 1"
            :title="tabAktif?.nama ?? ''"
          />
        </div>

        <div class="fr">
          <label class="lbl">Tgl SPK</label>
          <input
            :value="
              tabAktif?.tanggalSpk ? formatTanggal(tabAktif.tanggalSpk) : ''
            "
            readonly
            class="inp ro"
            style="width: 110px"
          />
        </div>

        <div class="fr">
          <label class="lbl">Dateline</label>
          <input
            :value="tabAktif?.dateline ? formatTanggal(tabAktif.dateline) : ''"
            readonly
            class="inp ro"
            style="width: 110px"
          />
        </div>

        <div class="fr">
          <label class="lbl">Finishing</label>
          <input
            :value="tabAktif?.finishing ?? ''"
            readonly
            class="inp ro"
            style="flex: 1"
            :title="tabAktif?.finishing ?? ''"
          />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">Status</label>
          <span
            class="status-chip"
            :class="
              selesaiStatus(statusAkhirTab?.status) ? 'st-done' : 'st-open'
            "
          >
            {{ statusAkhirTab?.status || "Belum dimulai" }}
          </span>
        </div>
      </div>
    </template>

    <!-- ══ KOLOM KANAN ══ -->
    <template #right-column>
      <div class="lhk-right">
        <!-- Timer sesi + tab SPK/MAP + status tab aktif -->
        <div class="blok" style="flex: 0 0 auto">
          <div class="tbl-header">
            <span class="tbl-title">Timer Pengerjaan</span>
            <span v-if="sesi" class="sesi-chip">
              {{ sesi.Status }} · {{ sesi.Designer }}
            </span>
          </div>

          <div class="sw-bar">
            <select
              v-model.number="designerIdx"
              class="inp"
              style="width: 210px"
              :disabled="sesiAktif"
            >
              <option :value="-1" disabled>Pilih designer...</option>
              <option
                v-for="(d, i) in designerOpts"
                :key="`${d.Kode}-${d.Designer}`"
                :value="i"
              >
                {{ d.Kode }} - {{ d.Designer }}
              </option>
            </select>
            <input
              v-model="catatanAksi"
              class="inp"
              style="flex: 1"
              maxlength="100"
              placeholder="Catatan (opsional)"
            />
            <div class="sw-time" :class="{ run: berjalan, pause: dipause }">
              {{ lamaTeks }}
            </div>

            <button
              v-if="!sesiAktif"
              type="button"
              class="btn-mulai"
              :disabled="!bisaMulai"
              @click="mulaiTimer"
            >
              ▶ Mulai
            </button>
            <template v-else>
              <button
                v-if="berjalan"
                type="button"
                class="btn-pause"
                :disabled="sedangAksi"
                @click="showDlgPause = true"
              >
                ⏸ Pause
              </button>
              <button
                v-else
                type="button"
                class="btn-mulai"
                :disabled="sedangAksi || pauseHabis"
                @click="lanjutTimer"
              >
                ▶ Lanjut
              </button>
              <button
                type="button"
                class="btn-selesai"
                :disabled="sedangAksi"
                @click="bukaSelesai"
              >
                ■ Selesai
              </button>
              <button
                type="button"
                class="btn-batal"
                :disabled="sedangAksi"
                @click="showDlgBatal = true"
              >
                ✕ Batal
              </button>
            </template>
          </div>

          <div v-if="dipause && sesi?.Pause_Aktif" class="sw-info">
            <b>Di-pause:</b> {{ sesi.Pause_Aktif.Alasan }} ·
            <span v-if="!pauseHabis">
              sisa {{ formatMenitDetik(sisaPauseDetik) }} sebelum batas
              {{ sesi.Batas_Pause_Menit }} menit
            </span>
            <span v-else class="st-open">
              batas pause {{ sesi.Batas_Pause_Menit }} menit terlewati. Pilih
              Selesai atau Batal.
            </span>
          </div>

          <div class="tab-bar">
            <button
              v-for="(t, i) in formData.tabs"
              :key="t.nomor"
              type="button"
              class="tab-btn"
              :class="{ aktif: i === tabIdx }"
              @click="tabIdx = i"
            >
              <span>{{ t.nomor }}</span>
              <span v-if="t.nomorLhk" class="tab-lhk">{{ t.nomorLhk }}</span>
              <span
                v-if="!sesiAktif"
                class="tab-x"
                title="Hapus dari daftar"
                @click.stop="hapusTab(i)"
              >
                ✕
              </span>
            </button>
            <span v-if="formData.tabs.length === 0" class="tab-kosong">
              Belum ada SPK/MAP. Isi nomor di kolom kiri, lalu pilih designer
              dan tekan Mulai.
            </span>
          </div>

          <div class="tbl-wrap" style="max-height: 130px; min-height: 60px">
            <table class="gt" style="min-width: 760px">
              <thead>
                <tr>
                  <th style="width: 32px" class="tc">No</th>
                  <th style="width: 55px">Cab</th>
                  <th style="width: 110px">Designer</th>
                  <th style="width: 110px">Status</th>
                  <th style="width: 95px" class="tc">Tanggal</th>
                  <th style="width: 80px" class="tc">Jam</th>
                  <th style="width: 80px" class="tc">Durasi</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!tabAktif || tabAktif.status.length === 0">
                  <td colspan="8" class="kosong">Belum ada status.</td>
                </tr>
                <tr v-for="(s, i) in tabAktif?.status ?? []" :key="i">
                  <td class="tc gt-lbl">{{ i + 1 }}</td>
                  <td class="pad">{{ s.cabang }}</td>
                  <td class="pad">{{ s.designer }}</td>
                  <td
                    class="pad"
                    :class="selesaiStatus(s.status) ? 'st-done' : 'st-open'"
                  >
                    {{ s.status }}
                  </td>
                  <td class="tc">
                    {{ s.tanggal ? formatTanggal(s.tanggal) : "" }}
                  </td>
                  <td class="tc">{{ s.jam }}</td>
                  <td class="tc">{{ s.durasi }}</td>
                  <td class="pad" :title="s.catatan">{{ s.catatan }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Komponen -->
        <div v-if="tabAktif" class="blok" style="flex: 1; min-height: 0">
          <div class="tbl-header tbl-header-sub">
            <span class="tbl-title">Komponen</span>
            <button type="button" class="btn-add" @click="addRow">
              + Tambah Baris
            </button>
          </div>
          <div class="tbl-wrap" style="flex: 1; min-height: 150px">
            <table class="gt" style="min-width: 960px">
              <thead>
                <tr>
                  <th style="width: 32px" class="tc">No</th>
                  <th style="width: 140px">Bahan</th>
                  <th style="width: 95px" class="tr">Panjang Output</th>
                  <th style="width: 85px" class="tr">Jumlah Output</th>
                  <th style="width: 95px" class="tr">Total Output</th>
                  <th style="width: 65px" class="tr h-c">C</th>
                  <th style="width: 65px" class="tr h-m">M</th>
                  <th style="width: 65px" class="tr h-y">Y</th>
                  <th style="width: 65px" class="tr h-k">K</th>
                  <th style="width: 100px">Mesin</th>
                  <th>Keterangan</th>
                  <th style="width: 32px" class="tc"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in tabAktif.komponen" :key="idx">
                  <td class="tc gt-lbl">{{ idx + 1 }}</td>
                  <td class="p0">
                    <select v-model="row.bahan" class="ci">
                      <option value="">-</option>
                      <option
                        v-for="b in opsiBahanUntuk(row.bahan)"
                        :key="b.Kode"
                        :value="b.Kode"
                      >
                        {{ b.Kode }}
                      </option>
                    </select>
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.panjang"
                      type="number"
                      min="0"
                      step="any"
                      class="ci tr bg-yellow-light"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.jumlah"
                      type="number"
                      min="0"
                      step="any"
                      class="ci tr bg-yellow-light"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      :value="fmt(totalBaris(row))"
                      class="ci tr ro"
                      readonly
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.c"
                      type="number"
                      min="0"
                      step="any"
                      class="ci tr bg-yellow-light"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.m"
                      type="number"
                      min="0"
                      step="any"
                      class="ci tr bg-yellow-light"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.y"
                      type="number"
                      min="0"
                      step="any"
                      class="ci tr bg-yellow-light"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.k"
                      type="number"
                      min="0"
                      step="any"
                      class="ci tr bg-yellow-light"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <select v-model="row.mesin" class="ci">
                      <option value="">-</option>
                      <option
                        v-for="m in opsiMesinUntuk(row.mesin)"
                        :key="m.Kode"
                        :value="m.Kode"
                        :title="m.Nama ?? ''"
                      >
                        {{ m.Kode }}
                      </option>
                    </select>
                  </td>
                  <td class="p0">
                    <input
                      v-model="row.keterangan"
                      class="ci"
                      maxlength="200"
                      :title="row.keterangan"
                    />
                  </td>
                  <td class="tc">
                    <button
                      type="button"
                      class="btn-del"
                      @click="removeRow(idx)"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4" class="tr fw">Total</td>
                  <td class="tr fw">{{ fmt(totalSemua) }}</td>
                  <td colspan="7" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- Lookup SPK/MAP -->
  <SpkSearchModal
    v-model="showSpk"
    filter-mode="lhk-design"
    :divisi="1"
    @selected="onSpkDipilih"
  />

  <!-- Pause -->
  <v-dialog v-model="showDlgPause" max-width="420" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-orange text-white pa-3">Pause Timer</v-card-title>
      <v-card-text class="pa-4">
        <div class="text-body-2 mb-2">
          Waktu pause tidak dihitung ke durasi. Maksimal
          {{ sesi?.Batas_Pause_Menit ?? 30 }} menit; lewat batas, timer tidak
          bisa dilanjutkan (hanya Selesai atau Batal).
        </div>
        <input
          v-model="alasanPause"
          class="inp"
          style="width: 100%"
          maxlength="100"
          placeholder="Alasan pause (wajib)"
          @keydown.enter.prevent="konfirmasiPause"
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="showDlgPause = false">Kembali</v-btn>
        <v-spacer />
        <v-btn
          color="orange"
          variant="elevated"
          :disabled="sedangAksi || !alasanPause.trim()"
          @click="konfirmasiPause"
        >
          Pause
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Selesai + porsi durasi -->
  <v-dialog v-model="showDlgSelesai" max-width="560" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-warning text-white pa-3"
        >Tandai DONE?</v-card-title
      >
      <v-card-text class="pa-4">
        <div class="text-body-2 mb-3">
          Status DONE dan durasi dicatat dengan jam server dan
          <b>tidak dapat dibatalkan</b>. Durasi bersih
          <b>{{ lamaTeks }}</b>
          <span v-if="porsiInput.length > 1">
            dibagi ke tiap LHK sesuai porsi di bawah.
          </span>
        </div>
        <table
          v-if="porsiInput.length > 1"
          class="gt"
          style="table-layout: auto"
        >
          <thead>
            <tr>
              <th>SPK/MAP</th>
              <th style="width: 110px" class="tr">Porsi (%)</th>
              <th style="width: 100px" class="tc">Durasi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in porsiInput" :key="p.nomor">
              <td class="pad">{{ p.nomor }}</td>
              <td class="p0">
                <input
                  v-model.number="p.persen"
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  class="ci tr bg-yellow-light"
                  v-select-on-focus
                />
              </td>
              <td class="tc">{{ estimasiDurasi(p.persen) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="fw">Total</td>
              <td class="tr fw" :class="porsiValid ? 'st-done' : 'st-open'">
                {{ fmt(totalPorsi) }}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
        <div v-if="porsiInput.length > 1 && !porsiValid" class="hint-err">
          Total porsi harus 100%.
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="showDlgSelesai = false">Kembali</v-btn>
        <v-spacer />
        <v-btn
          color="warning"
          variant="elevated"
          :disabled="sedangAksi || !porsiValid"
          @click="konfirmasiSelesai"
        >
          Ya, Selesai
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Batal -->
  <v-dialog v-model="showDlgBatal" max-width="440" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-error text-white pa-3">
        Batalkan Timer?
      </v-card-title>
      <v-card-text class="pa-4">
        Timer dianggap <b>cancel, bukan DONE</b>. LHK yang baru dibuat oleh
        timer ini dan belum berisi komponen akan dihapus (nomornya dipakai
        ulang). LHK yang sudah berisi komponen tetap dipertahankan.
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="showDlgBatal = false">Kembali</v-btn>
        <v-spacer />
        <v-btn
          color="error"
          variant="elevated"
          :disabled="sedangAksi"
          @click="konfirmasiBatal"
        >
          Ya, Batalkan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Setelah simpan -->
  <v-dialog v-model="showHasilSimpan" max-width="420" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconSkull class="mr-2" :size="20" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-2">
          LHK Design telah disimpan:
          <div v-for="n in hasilSimpan" :key="n" class="fw">{{ n }}</div>
        </div>
        <div class="text-body-2 text-grey-darken-1">
          Mau input LHK Design lain?
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="tutupSetelahSimpan">Tidak, Tutup</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="resetBaru">
          Ya, Input Baru
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.lhk-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 0;
  width: 100%;
}
.lhk-right {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  gap: 10px;
}
.blok {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.fr {
  display: flex;
  align-items: center;
  min-height: 24px;
  gap: 4px;
  width: 100%;
}
.lbl {
  width: 90px;
  flex-shrink: 0;
  font-weight: 600;
  color: #333;
  font-size: 11px;
  white-space: nowrap;
}
.sep {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
  width: 100%;
}
.fw {
  font-weight: 700;
}
.tr {
  text-align: right;
}
.tc {
  text-align: center;
}

.inp {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 5px;
  font-size: 11px;
  background: white;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  color: #212121;
  min-width: 0;
}
.inp:focus {
  border-color: #1565c0;
}
.ro {
  background: #dde8f0 !important;
  color: #444 !important;
}
.idate {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  outline: none;
  box-sizing: border-box;
}
.idate:focus {
  border-color: #1565c0;
}
.inp-grp {
  border: 1px solid #a0a0a0;
  background: white;
}

.status-chip {
  font-weight: 700;
  font-size: 12px;
}
.st-done {
  color: #2e7d32;
  font-weight: 600;
}
.st-open {
  color: #c62828;
  font-weight: 600;
}

.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 5px 10px;
  border-radius: 3px 3px 0 0;
  flex-shrink: 0;
}
.tbl-header-sub {
  background: #546e7a;
}
.tbl-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.btn-add {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 2px;
}
.btn-add:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Stopwatch */
.sw-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: #eceff1;
  border: 1px solid #bdbdbd;
  border-top: none;
}
.sw-time {
  min-width: 86px;
  text-align: center;
  font-family: "Consolas", monospace;
  font-size: 15px;
  font-weight: 700;
  color: #616161;
  background: white;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 2px 6px;
}
.sw-time.run {
  color: #c62828;
  border-color: #c62828;
}
.btn-mulai,
.btn-selesai {
  height: 26px;
  padding: 0 12px;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  cursor: pointer;
}
.btn-mulai {
  background: #2e7d32;
}
.btn-selesai {
  background: #c62828;
}
.btn-mulai:disabled,
.btn-selesai:disabled {
  opacity: 0.35;
  cursor: default;
}
.btn-mulai,
.btn-selesai,
.btn-pause,
.btn-batal {
  height: 26px;
  padding: 0 12px;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  cursor: pointer;
}
.btn-pause {
  background: #ef6c00;
}
.btn-batal {
  background: #616161;
}
.btn-mulai:disabled,
.btn-selesai:disabled,
.btn-pause:disabled,
.btn-batal:disabled {
  opacity: 0.35;
  cursor: default;
}
.sw-time.pause {
  color: #ef6c00;
  border-color: #ef6c00;
}
.sw-info {
  padding: 4px 8px;
  font-size: 11px;
  background: #fff3e0;
  border: 1px solid #bdbdbd;
  border-top: none;
}
.sesi-chip {
  font-size: 10px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  padding: 1px 8px;
}
.hint {
  font-size: 10px;
  color: #757575;
}
.hint-err {
  margin-top: 6px;
  font-size: 11px;
  color: #c62828;
}

.tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 6px 8px 0;
  background: #eceff1;
  border: 1px solid #bdbdbd;
  border-top: none;
  border-bottom: none;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: #37474f;
  background: #cfd8dc;
  border: 1px solid #b0bec5;
  border-bottom: none;
  border-radius: 3px 3px 0 0;
  cursor: pointer;
}
.tab-btn.aktif {
  background: white;
  color: #1565c0;
  border-color: #1565c0;
}
.tab-lhk {
  font-size: 10px;
  font-weight: 400;
  color: #546e7a;
}
.tab-x {
  color: #c62828;
  font-size: 10px;
}
.tab-kosong {
  padding: 4px 6px;
  font-size: 11px;
  font-style: italic;
  color: #757575;
}

.tbl-wrap {
  overflow: auto;
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
  border-radius: 0 0 3px 3px;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.gt thead th {
  background: #f0f4f8;
  border: 1px solid #bdbdbd;
  padding: 4px 5px;
  font-size: 10px;
  font-weight: 700;
  color: #37474f;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}
.gt thead th.h-c {
  background: #b2ebf2;
}
.gt thead th.h-m {
  background: #f8bbd0;
}
.gt thead th.h-y {
  background: #fff59d;
}
.gt thead th.h-k {
  background: #cfd8dc;
}
.gt tbody td {
  border: 1px solid #e8e8e8;
  height: 26px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.gt tbody tr:hover td {
  background: #e3f2fd !important;
}
.gt tfoot td {
  background: #eceff1;
  border: 1px solid #bdbdbd;
  height: 26px;
  padding: 0 6px;
  font-size: 11px;
}
.kosong {
  padding: 14px 10px !important;
  color: #757575;
  font-style: italic;
  font-size: 11px;
  text-align: center;
}
.pad {
  padding: 0 6px;
}
.p0 {
  padding: 0 !important;
}
.gt-lbl {
  background: #f5f5f5 !important;
  color: #555;
  padding: 0 4px;
  font-size: 10px;
}

.ci {
  width: 100%;
  height: 25px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 5px;
  font-family: inherit;
  color: #212121;
}
.ci.ro {
  background: #dde8f0 !important;
}
.ci.bg-yellow-light {
  background: #fffde7 !important;
}
.ci:focus {
  background: #e3f2fd !important;
  outline: 1px solid #1976d2;
  outline-offset: -1px;
}
.ci.tr {
  text-align: right;
}

.cell-grp {
  display: flex;
  align-items: center;
  height: 25px;
}
.cell-grp .ci {
  flex: 1;
}
.ci-btn {
  width: 22px;
  flex-shrink: 0;
  background: #eeeeee;
  border: none;
  border-left: 1px solid #e0e0e0;
  cursor: pointer;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ci-btn:hover:not(:disabled) {
  background: #e0e0e0;
}
.ci-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}
.btn-del:hover {
  background: #ffebee;
  border-radius: 2px;
}
</style>
