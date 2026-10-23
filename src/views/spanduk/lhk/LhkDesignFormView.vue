<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconSkull, IconSearch } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import * as lhkForm from "@/services/spanduk/lhk/lhkDesignFormService";
import type {
  LhkDesignForm,
  LhkDesignPayload,
  SaveResponse,
  DesignerOption,
  MesinOption,
  BahanOption,
} from "@/services/spanduk/lhk/lhkDesignFormService";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);

const STATUS_MULAI = "ON PROGRESS";
const STATUS_SELESAI = "DONE";
const MAKS_ANGKA = 99999999.99;
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

interface FormState {
  header: {
    nomor: string;
    jenis: string;
    nama: string;
    tanggalSpk: string;
    dateline: string;
    finishing: string;
    tanggal: string;
    ada: boolean;
    userCreate: string;
  };
  status: StatusRow[];
  komponen: KomponenRow[];
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

const defaultData = (): FormState => ({
  header: {
    nomor: "",
    jenis: "",
    nama: "",
    tanggalSpk: "",
    dateline: "",
    finishing: "",
    tanggal: todayLocal,
    ada: false,
    userCreate: "",
  },
  status: [],
  komponen: [komponenKosong()],
});

const mapStatus = (s: LhkDesignForm["Status"][number]): StatusRow => ({
  cabang: s.Kode_Cabang ?? "",
  designer: s.Designer ?? "",
  status: s.Status,
  tanggal: s.Tanggal ?? "",
  jam: s.Jam ?? "",
  durasi: s.Durasi ?? "",
  catatan: s.Catatan ?? "",
});

const mapDariServer = (d: LhkDesignForm): FormState => {
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
    header: {
      nomor: d.Nomor,
      jenis: d.Jenis,
      nama: d.Nama_SPK ?? "",
      tanggalSpk: d.Tanggal_SPK ?? "",
      dateline: d.Dateline ?? "",
      finishing: d.Finishing ?? "",
      tanggal: d.Tanggal_LHK ?? todayLocal,
      ada: d.Ada,
      userCreate: d.User_Create ?? "",
    },
    status: d.Status.map(mapStatus),
    komponen: komponen.length > 0 ? komponen : [komponenKosong()],
  };
};

// ── State UI ──
const inputNomor = ref("");
const nomorTerakhir = ref("");
const showSelesai = ref(false);
const showKonfirmasiSelesai = ref(false);
const sedangAksi = ref(false);

const designerOpts = ref<DesignerOption[]>([]);
const mesinOpts = ref<MesinOption[]>([]);
const bahanOpts = ref<BahanOption[]>([]);
const designerIdx = ref(-1);
const catatanAksi = ref("");

// Lookup SPK/MAP
const showSpk = ref(false);

// Selisih jam server - jam browser, untuk stopwatch yang akurat
const offsetMs = ref(0);
const sekarangMs = ref(Date.now());
let pewaktu: ReturnType<typeof setInterval> | null = null;

// "YYYY-MM-DD HH:mm:ss" diparse sebagai jam lokal; selisihnya tetap benar
const keMs = (s: string) => new Date(s.replace(" ", "T")).getTime();

const aturOffset = (serverSekarang: string) => {
  const ms = keMs(serverSekarang);
  if (!Number.isNaN(ms)) {
    offsetMs.value = ms - Date.now();
  }
};

const bangunPayload = (data: FormState): LhkDesignPayload => ({
  Tanggal: data.header.tanggal,
  Komponen: data.komponen
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
});

function barisKosong(r: KomponenRow): boolean {
  return (
    !r.bahan &&
    !r.mesin &&
    !r.keterangan.trim() &&
    [r.panjang, r.jumlah, r.c, r.m, r.y, r.k].every((v) => num(v) === 0)
  );
}

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
    aturOffset(d.Server_Sekarang);
    return mapDariServer(d);
  },
  submitApi: async (data: FormState): Promise<SaveResponse> =>
    lhkForm.simpan(data.header.nomor, bangunPayload(data)),
  onSuccess: (response: unknown) => {
    const res = response as SaveResponse;
    nomorTerakhir.value = res.data?.data?.Nomor ?? formData.value.header.nomor;
    showSelesai.value = true;
  },
  onFormReset: () => {
    inputNomor.value = "";
    catatanAksi.value = "";
  },
});

watch(
  () => formData.value.header.nomor,
  (n) => {
    inputNomor.value = n;
  },
);

const nomorTerkunci = computed(() => !!formData.value.header.nomor);

// ── Lookup ──
const opsiMesinUntuk = (nilai: string): MesinOption[] =>
  nilai && !mesinOpts.value.some((m) => m.Kode === nilai)
    ? [{ Kode: nilai, Nama: null, Keterangan: null }, ...mesinOpts.value]
    : mesinOpts.value;

const opsiBahanUntuk = (nilai: string): BahanOption[] =>
  nilai && !bahanOpts.value.some((b) => b.Kode === nilai)
    ? [{ Kode: nilai }, ...bahanOpts.value]
    : bahanOpts.value;

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
});

onBeforeUnmount(() => {
  if (pewaktu) {
    clearInterval(pewaktu);
  }
});

// ── Pilih SPK/MAP ──
const muatSpkNomor = async (nomorInput: string) => {
  const nomor = nomorInput.trim();
  if (!nomor) {
    return;
  }
  isLoading.value = true;
  try {
    const d = await lhkForm.getById(nomor);
    aturOffset(d.Server_Sekarang);
    formData.value = mapDariServer(d);
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat data SPK/MAP."));
    inputNomor.value = "";
  } finally {
    isLoading.value = false;
  }
};

const onEnterNomor = () => {
  if (!nomorTerkunci.value) {
    void muatSpkNomor(inputNomor.value);
  }
};

const bukaLookupSpk = () => {
  if (nomorTerkunci.value) {
    return;
  }
  showSpk.value = true;
};

const onSpkDipilih = (item: { Nomor: string }) => {
  void muatSpkNomor(item.Nomor);
};

// ── Stopwatch ──
const designerTerpilih = computed<DesignerOption | null>(
  () => designerOpts.value[designerIdx.value] ?? null,
);

const statusAkhir = computed<StatusRow | null>(() => {
  const s = formData.value.status;
  return s.length > 0 ? s[s.length - 1] : null;
});

const berjalan = computed(() => statusAkhir.value?.status === STATUS_MULAI);

const pad = (n: number) => String(n).padStart(2, "0");

const lamaTeks = computed(() => {
  const s = statusAkhir.value;
  if (!s) {
    return "00:00:00";
  }
  if (s.status !== STATUS_MULAI) {
    return s.durasi || "00:00:00";
  }
  const mulai = keMs(`${s.tanggal} ${s.jam}`);
  if (Number.isNaN(mulai)) {
    return "00:00:00";
  }
  const detik = Math.max(
    0,
    Math.floor((sekarangMs.value + offsetMs.value - mulai) / 1000),
  );
  return `${pad(Math.floor(detik / 3600))}:${pad(Math.floor((detik % 3600) / 60))}:${pad(detik % 60)}`;
});

const bisaMulai = computed(
  () =>
    nomorTerkunci.value &&
    !berjalan.value &&
    !sedangAksi.value &&
    !!designerTerpilih.value,
);
const bisaSelesai = computed(
  () => berjalan.value && !sedangAksi.value && !!designerTerpilih.value,
);

// Hanya status (dan tanggal bila header baru dibuat) yang diganti:
// komponen yang sedang diedit di layar tidak boleh tertimpa.
const terapkanStatus = (d: LhkDesignForm) => {
  const h = formData.value.header;
  if (!h.ada) {
    h.tanggal = d.Tanggal_LHK ?? h.tanggal;
  }
  h.ada = d.Ada;
  h.userCreate = d.User_Create ?? h.userCreate;
  formData.value.status = d.Status.map(mapStatus);
  aturOffset(d.Server_Sekarang);
};

const jalankanAksi = async (aksi: "mulai" | "selesai") => {
  const h = formData.value.header;
  const pelaku = designerTerpilih.value;
  if (!h.nomor) {
    return toast.warning("Pilih SPK/MAP terlebih dahulu.");
  }
  if (!pelaku) {
    return toast.warning("Pilih designer terlebih dahulu.");
  }

  sedangAksi.value = true;
  try {
    const payload = {
      Kode_Cabang: pelaku.Kode,
      Designer: pelaku.Designer,
      Catatan: catatanAksi.value.trim(),
    };
    const d =
      aksi === "mulai"
        ? await lhkForm.mulai(h.nomor, payload)
        : await lhkForm.selesai(h.nomor, payload);
    terapkanStatus(d);
    catatDesigner();
    catatanAksi.value = "";
    toast.success(
      aksi === "mulai" ? "Pekerjaan dimulai." : "Pekerjaan selesai.",
    );
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memperbarui status."));
  } finally {
    sedangAksi.value = false;
  }
};

const konfirmasiSelesai = async () => {
  showKonfirmasiSelesai.value = false;
  await jalankanAksi("selesai");
};

// ── Komponen ──
const addRow = () => {
  formData.value.komponen.push(komponenKosong());
};

const removeRow = (idx: number) => {
  formData.value.komponen.splice(idx, 1);
  if (formData.value.komponen.length === 0) {
    formData.value.komponen.push(komponenKosong());
  }
};

const totalBaris = (r: KomponenRow) => round2(num(r.panjang) * num(r.jumlah));

const totalSemua = computed(() =>
  round2(formData.value.komponen.reduce((a, r) => a + totalBaris(r), 0)),
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
  const h = formData.value.header;
  if (!h.nomor) {
    toast.warning("SPK/MAP harus diisi.");
    return;
  }
  if (!h.ada) {
    toast.warning("Tekan Mulai terlebih dahulu sebelum menyimpan.");
    return;
  }
  if (!h.tanggal) {
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

  for (const [i, r] of formData.value.komponen.entries()) {
    if (barisKosong(r)) {
      continue;
    }
    const no = i + 1;
    if (!r.bahan) {
      toast.warning(`Baris ${no}: Bahan wajib dipilih.`);
      return;
    }
    for (const [label, v] of kolom(r)) {
      const n = num(v);
      if (n < 0 || n > MAKS_ANGKA) {
        toast.warning(`Baris ${no}: ${label} harus 0 sampai 99.999.999,99.`);
        return;
      }
    }
    if (r.keterangan.trim().length > 200) {
      toast.warning(`Baris ${no}: Keterangan maksimal 200 karakter.`);
      return;
    }
  }

  showSaveDialog.value = true;
};

// ── Setelah simpan ──
const resetBaru = () => {
  showSelesai.value = false;
  if (isEditMode.value) {
    router.replace({ name: "SpandukLhkDesignCreate" });
    return;
  }
  formData.value = defaultData();
  inputNomor.value = "";
  catatanAksi.value = "";
};

const tutupSetelahSimpan = () => {
  showSelesai.value = false;
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
          <label class="lbl">SPK/MAP</label>
          <div class="cell-grp inp-grp" style="flex: 1">
            <input
              v-model="inputNomor"
              :readonly="nomorTerkunci"
              class="ci"
              :class="{ ro: nomorTerkunci }"
              placeholder="Ketik nomor + Enter / F1 cari"
              autocomplete="off"
              @keydown.enter.prevent="onEnterNomor"
              @keydown.f1.prevent="bukaLookupSpk"
            />
            <button
              type="button"
              class="ci-btn"
              title="Cari SPK/MAP"
              :disabled="nomorTerkunci"
              @click="bukaLookupSpk"
            >
              <IconSearch :size="11" />
            </button>
          </div>
        </div>

        <div class="fr">
          <label class="lbl">Jenis</label>
          <input
            :value="formData.header.jenis"
            readonly
            class="inp ro"
            style="width: 90px"
          />
        </div>

        <div class="fr">
          <label class="lbl">Tgl LHK</label>
          <input
            type="date"
            v-model="formData.header.tanggal"
            class="idate"
            style="width: 150px"
          />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">Nama Design</label>
          <input
            :value="formData.header.nama"
            readonly
            class="inp ro"
            style="flex: 1"
            :title="formData.header.nama"
          />
        </div>

        <div class="fr">
          <label class="lbl">Tgl SPK</label>
          <input
            :value="
              formData.header.tanggalSpk
                ? formatTanggal(formData.header.tanggalSpk)
                : ''
            "
            readonly
            class="inp ro"
            style="width: 110px"
          />
        </div>

        <div class="fr">
          <label class="lbl">Dateline</label>
          <input
            :value="
              formData.header.dateline
                ? formatTanggal(formData.header.dateline)
                : ''
            "
            readonly
            class="inp ro"
            style="width: 110px"
          />
        </div>

        <div class="fr">
          <label class="lbl">Finishing</label>
          <input
            :value="formData.header.finishing"
            readonly
            class="inp ro"
            style="flex: 1"
            :title="formData.header.finishing"
          />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">Status</label>
          <span
            class="status-chip"
            :class="selesaiStatus(statusAkhir?.status) ? 'st-done' : 'st-open'"
          >
            {{ statusAkhir?.status || "Belum dimulai" }}
          </span>
        </div>
      </div>
    </template>

    <!-- ══ KOLOM KANAN ══ -->
    <template #right-column>
      <div class="lhk-right">
        <!-- Status + stopwatch -->
        <div class="blok" style="flex: 0 0 auto">
          <div class="tbl-header">
            <span class="tbl-title">Status Pengerjaan</span>
          </div>

          <div class="sw-bar">
            <select
              v-model.number="designerIdx"
              class="inp"
              style="width: 210px"
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
            <div class="sw-time" :class="{ run: berjalan }">{{ lamaTeks }}</div>
            <button
              type="button"
              class="btn-mulai"
              :disabled="!bisaMulai"
              @click="jalankanAksi('mulai')"
            >
              ▶ Mulai
            </button>
            <button
              type="button"
              class="btn-selesai"
              :disabled="!bisaSelesai"
              @click="showKonfirmasiSelesai = true"
            >
              ■ Selesai
            </button>
          </div>

          <div class="tbl-wrap" style="max-height: 170px; min-height: 80px">
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
                <tr v-if="formData.status.length === 0">
                  <td colspan="8" class="kosong">
                    Belum ada status. Pilih designer lalu tekan Mulai.
                  </td>
                </tr>
                <tr v-for="(s, i) in formData.status" :key="i">
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
        <div class="blok" style="flex: 1; min-height: 0">
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
                <tr v-for="(row, idx) in formData.komponen" :key="idx">
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

  <!-- Konfirmasi Selesai -->
  <v-dialog v-model="showKonfirmasiSelesai" max-width="420" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-warning text-white pa-3">
        Tandai DONE?
      </v-card-title>
      <v-card-text class="pa-4">
        Status DONE dan durasi dicatat dengan jam server dan
        <b>tidak dapat dibatalkan</b>.
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="showKonfirmasiSelesai = false">
          Batal
        </v-btn>
        <v-spacer />
        <v-btn color="warning" variant="elevated" @click="konfirmasiSelesai">
          Ya, Selesai
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Setelah simpan -->
  <v-dialog v-model="showSelesai" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconSkull class="mr-2" :size="20" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-2">
          LHK Design <b>{{ nomorTerakhir }}</b> telah disimpan.
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
