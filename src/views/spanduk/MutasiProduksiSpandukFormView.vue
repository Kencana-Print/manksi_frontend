<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import LhkMutasiSearchModal from "@/components/lookups/LhkMutasiSearchModal.vue";
import LhkMutasiSpkSearchModal from "@/components/lookups/LhkMutasiSpkSearchModal.vue";
import { useForm } from "@/composables/useForm";
import { useAuthStore } from "@/stores/authStore";
import { IconArrowsExchange, IconSearch } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import * as mpsForm from "@/services/spanduk/mutasiProduksiSpandukFormService";
import type {
  HasilLhk,
  JenisSumber,
  LhkOption,
  LiniAsalOption,
  LiniTujuanOption,
  MutasiProduksiSpandukPayload,
  PabrikOption,
  SaveResponse,
  SpkDiLhk,
} from "@/services/spanduk/mutasiProduksiSpandukFormService";
import type { NilaiDetail } from "@/services/spanduk/mutasiProduksiSpandukService";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const isEditMode = computed(() => !!route.params.nomor);
const MAKS_KETERANGAN = 200;

const formatDateLocal = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const todayLocal = formatDateLocal(new Date());

// ── Model data ──
interface SpkState {
  nomor: string;
  nama: string;
  jumlahOrder: number;
  jenis: JenisSumber | "";
  tglSpk: string;
  divisi: string;
  jenisProduk: string;
}

interface FormState {
  header: {
    nomor: string;
    tanggal: string;
    kodePabrik: string;
    namaPabrik: string;
    keterangan: string;
  };
  liniAsal: string;
  liniTujuan: string;
  lhk: { nomor: string; tanggal: string };
  spk: SpkState;
  hasil: HasilLhk;
  terkunci: boolean;
  pesanKunci: string;
}

const spkKosong = (): SpkState => ({
  nomor: "",
  nama: "",
  jumlahOrder: 0,
  jenis: "",
  tglSpk: "",
  divisi: "",
  jenisProduk: "",
});

const hasilKosong = (): HasilLhk => ({ Kolom: [], Baris: [] });

const defaultData = (): FormState => ({
  header: {
    nomor: "",
    tanggal: todayLocal,
    kodePabrik: "",
    namaPabrik: "",
    keterangan: "",
  },
  liniAsal: "",
  liniTujuan: "",
  lhk: { nomor: "", tanggal: "" },
  spk: spkKosong(),
  hasil: hasilKosong(),
  terkunci: false,
  pesanKunci: "",
});

// ── State UI ──
const showLhkModal = ref(false);
const showSpkModal = ref(false);
const showSelesai = ref(false);
const showGantiLini = ref(false);
const liniTertunda = ref<LiniAsalOption | null>(null);
const nomorTerakhir = ref("");
const pabrikOpts = ref<PabrikOption[]>([]);
const liniAsalOpts = ref<LiniAsalOption[]>([]);
const liniTujuanOpts = ref<LiniTujuanOption[]>([]);

const keteranganRef = ref<HTMLInputElement | null>(null);
const lhkRef = ref<HTMLInputElement | null>(null);

const fokus = async (el: HTMLInputElement | null) => {
  await nextTick();
  el?.focus();
  el?.select();
};

const bangunPayload = (d: FormState): MutasiProduksiSpandukPayload => ({
  Tanggal: d.header.tanggal,
  Kode_Pabrik: d.header.kodePabrik,
  Lini_Asal: d.liniAsal,
  Lini_Tujuan: d.liniTujuan,
  Nomor_LHK: d.lhk.nomor,
  Nomor_SPK: d.spk.nomor,
  Keterangan: d.header.keterangan.trim(),
});

const labelDivisi = (kode: number | null, nama: string | null): string =>
  kode === null ? "" : `${kode} - ${nama ?? ""}`;

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
    const d = await mpsForm.getById(String(route.params.nomor));
    liniTujuanOpts.value = await mpsForm.getLiniTujuan(
      d.Lini_Asal,
      d.Jenis_Sumber,
    );
    return {
      header: {
        nomor: d.Nomor,
        tanggal: d.Tanggal,
        kodePabrik: d.Kode_Pabrik ?? "",
        namaPabrik: d.Nama_Pabrik ?? "",
        keterangan: d.Keterangan ?? "",
      },
      liniAsal: d.Lini_Asal,
      liniTujuan: d.Lini_Tujuan,
      lhk: { nomor: d.Nomor_LHK, tanggal: d.Tanggal_LHK ?? "" },
      spk: {
        nomor: d.Nomor_SPK,
        nama: d.Nama_SPK ?? "",
        jumlahOrder: Number(d.Jumlah_Order) || 0,
        jenis: d.Jenis_Sumber,
        tglSpk: d.Tgl_SPK ?? "",
        divisi: labelDivisi(d.Kode_Divisi, d.Nama_Divisi),
        jenisProduk: d.Jenis_Produk ?? "",
      },
      hasil: d.Detail,
      terkunci: d.Terkunci,
      pesanKunci: d.Pesan_Kunci ?? "",
    };
  },
  submitApi: async (data: FormState): Promise<SaveResponse> => {
    const payload = bangunPayload(data);
    return isEditMode.value
      ? mpsForm.update(String(route.params.nomor), payload)
      : mpsForm.create(payload);
  },
  onSuccess: (response: unknown) => {
    const res = response as SaveResponse;
    const nomor = res.data?.data?.Nomor ?? "";
    nomorTerakhir.value = nomor;
    formData.value.header.nomor = nomor;
    showSelesai.value = true;
  },
  onFormReset: () => {
    liniTujuanOpts.value = [];
    isiLokasiDefault();
  },
});

// ── Lokasi (pabrik) ──
// Server membatasi daftar ke cabang user untuk non-superadmin
const opsiPabrik = computed<PabrikOption[]>(() => {
  const h = formData.value.header;
  const ada = pabrikOpts.value.some((p) => p.Kode === h.kodePabrik);
  return h.kodePabrik && !ada
    ? [{ Kode: h.kodePabrik, Nama: h.namaPabrik }, ...pabrikOpts.value]
    : pabrikOpts.value;
});

const onPabrikChange = () => {
  const h = formData.value.header;
  h.namaPabrik =
    pabrikOpts.value.find((p) => p.Kode === h.kodePabrik)?.Nama ?? "";
};

// Lokasi default = cabang user (kode pabrik sama dengan kode cabang), hanya mode tambah
const isiLokasiDefault = () => {
  if (isEditMode.value) {
    return;
  }
  const h = formData.value.header;
  if (h.kodePabrik) {
    return;
  }
  const cabang = (authStore.user?.cabang ?? "").trim().toUpperCase();
  const p = pabrikOpts.value.find((x) => x.Kode.toUpperCase() === cabang);
  if (!p) {
    return;
  }
  h.kodePabrik = p.Kode;
  h.namaPabrik = p.Nama;
};

onMounted(async () => {
  try {
    const [pabrik, lini] = await Promise.all([
      mpsForm.getLookupPabrik(),
      mpsForm.getLiniAsal(),
    ]);
    pabrikOpts.value = pabrik;
    liniAsalOpts.value = lini;
    isiLokasiDefault();
  } catch (e) {
    toast.error(mpsForm.pesanError(e, "Gagal memuat data awal."));
  }
});

// ── Lini ──
const namaLiniAsal = computed(
  () =>
    liniAsalOpts.value.find((l) => l.Kode === formData.value.liniAsal)?.Nama ??
    "",
);

const lewatiLini = computed(() => {
  const tujuan = formData.value.liniTujuan;
  const berikutnya = liniTujuanOpts.value.find((o) => o.Default);
  return !!tujuan && !!berikutnya && berikutnya.Kode !== tujuan;
});

const muatTujuan = async (): Promise<void> => {
  const f = formData.value;
  if (!f.liniAsal) {
    liniTujuanOpts.value = [];
    return;
  }
  try {
    liniTujuanOpts.value = await mpsForm.getLiniTujuan(
      f.liniAsal,
      f.spk.jenis || "SPK",
    );
    if (!liniTujuanOpts.value.some((o) => o.Kode === f.liniTujuan)) {
      f.liniTujuan = liniTujuanOpts.value.find((o) => o.Default)?.Kode ?? "";
    }
  } catch (e) {
    toast.error(mpsForm.pesanError(e, "Gagal memuat lini tujuan."));
  }
};

const kosongkanSumber = () => {
  formData.value.lhk = { nomor: "", tanggal: "" };
  formData.value.spk = spkKosong();
  formData.value.hasil = hasilKosong();
};

const terapkanLini = async (opt: LiniAsalOption) => {
  kosongkanSumber();
  formData.value.liniAsal = opt.Kode;
  formData.value.liniTujuan = opt.Kode_Berikutnya;
  await muatTujuan();
  await fokus(lhkRef.value);
};

const pilihMutasi = (opt: LiniAsalOption) => {
  if (isEditMode.value || !opt.Tersedia) {
    return;
  }
  if (formData.value.liniAsal === opt.Kode) {
    return;
  }
  if (formData.value.lhk.nomor) {
    liniTertunda.value = opt;
    showGantiLini.value = true;
    return;
  }
  terapkanLini(opt);
};

const konfirmasiGantiLini = () => {
  showGantiLini.value = false;
  if (liniTertunda.value) {
    terapkanLini(liniTertunda.value);
  }
  liniTertunda.value = null;
};

// ── LHK (modal 1) ──
const bolehUbahSumber = computed(() => !isEditMode.value);

const bukaModalLhk = () => {
  if (!bolehUbahSumber.value) {
    return;
  }
  if (!formData.value.liniAsal) {
    toast.warning("Pilih Pilihan Mutasi terlebih dahulu.");
    return;
  }
  showLhkModal.value = true;
};

const onLhkSelected = async (v: LhkOption) => {
  if (formData.value.lhk.nomor !== v.Nomor) {
    formData.value.spk = spkKosong();
    formData.value.hasil = hasilKosong();
  }
  formData.value.lhk = { nomor: v.Nomor, tanggal: v.Tanggal };
  showSpkModal.value = true;
};

// Ketik nomor LHK + Enter: cocokkan persis dengan hasil lookup server
const onEnterLhk = async (e: KeyboardEvent) => {
  const el = e.target as HTMLInputElement;
  const nomor = el.value.trim();
  if (!nomor) {
    bukaModalLhk();
    return;
  }
  if (!formData.value.liniAsal) {
    toast.warning("Pilih Pilihan Mutasi terlebih dahulu.");
    el.value = formData.value.lhk.nomor;
    return;
  }
  try {
    const hasil = await mpsForm.getLhk(formData.value.liniAsal, nomor);
    const cocok = hasil.find(
      (r) => r.Nomor.toUpperCase() === nomor.toUpperCase(),
    );
    if (!cocok) {
      toast.warning(
        "LHK tidak ditemukan, atau semua SPK di dalamnya sudah dimutasi.",
      );
      el.value = formData.value.lhk.nomor;
      el.select();
      return;
    }
    await onLhkSelected(cocok);
  } catch (err) {
    toast.error(mpsForm.pesanError(err, "Gagal memeriksa nomor LHK."));
  }
};

const onBlurLhk = (e: FocusEvent) => {
  (e.target as HTMLInputElement).value = formData.value.lhk.nomor;
};

// ── SPK (modal 2) ──
const bukaModalSpk = () => {
  if (!bolehUbahSumber.value) {
    return;
  }
  if (!formData.value.lhk.nomor) {
    toast.warning("Pilih nomor LHK terlebih dahulu.");
    return;
  }
  showSpkModal.value = true;
};

const onSpkSelected = async (v: SpkDiLhk) => {
  const f = formData.value;
  f.spk = {
    nomor: v.Nomor_SPK,
    nama: v.Nama_SPK ?? "",
    jumlahOrder: Number(v.Jumlah_Order) || 0,
    jenis: v.Jenis_Sumber,
    tglSpk: v.Tgl_SPK ?? "",
    divisi: labelDivisi(v.Kode_Divisi, v.Nama_Divisi),
    jenisProduk: v.Jenis_Produk ?? "",
  };

  // Jenis (SPK/MAP) menentukan batas lini tujuan
  await muatTujuan();
  if (liniTujuanOpts.value.length === 0) {
    toast.warning(
      `${v.Jenis_Sumber} tidak dapat dimutasi dari lini ${namaLiniAsal.value}.`,
    );
    f.spk = spkKosong();
    f.hasil = hasilKosong();
    return;
  }

  try {
    f.hasil = await mpsForm.getHasilLhk(f.liniAsal, f.lhk.nomor, v.Nomor_SPK);
  } catch (e) {
    toast.error(mpsForm.pesanError(e, "Gagal memuat hasil LHK."));
    f.hasil = hasilKosong();
  }
  await fokus(keteranganRef.value);
};

// ── Panel hasil ──
const tampil = (v: NilaiDetail | undefined): string => {
  if (v === null || v === undefined || v === "") {
    return "-";
  }
  if (typeof v === "number") {
    return v.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  }
  return v;
};

// ── Validasi sebelum konfirmasi simpan ──
const validateSave = () => {
  const f = formData.value;
  if (f.terkunci) {
    toast.error(f.pesanKunci || "Mutasi ini terkunci dan tidak bisa diubah.");
    return;
  }
  if (!f.header.tanggal) {
    toast.warning("Tanggal tidak boleh kosong.");
    return;
  }
  if (!f.header.kodePabrik) {
    toast.warning("Lokasi belum dipilih.");
    return;
  }
  if (!f.liniAsal) {
    toast.warning("Pilih Pilihan Mutasi terlebih dahulu.");
    return;
  }
  if (!f.liniTujuan) {
    toast.warning("Lini tujuan belum dipilih.");
    return;
  }
  if (!f.lhk.nomor) {
    toast.warning("Nomor LHK belum dipilih.");
    return;
  }
  if (!f.spk.nomor) {
    toast.warning("Nomor SPK/MAP belum dipilih.");
    return;
  }
  if (f.lhk.tanggal && f.header.tanggal < f.lhk.tanggal) {
    toast.warning(
      `Tanggal mutasi tidak boleh lebih awal dari tanggal LHK (${formatTanggal(f.lhk.tanggal)}).`,
    );
    return;
  }
  if (f.header.keterangan.trim().length > MAKS_KETERANGAN) {
    toast.warning(`Keterangan maksimal ${MAKS_KETERANGAN} karakter.`);
    return;
  }
  if (lewatiLini.value && !f.header.keterangan.trim()) {
    toast.warning("Keterangan wajib diisi karena lini tujuan melewati lini.");
    return;
  }

  showSaveDialog.value = true;
};

// ── Setelah simpan ──
const resetBaru = () => {
  showSelesai.value = false;
  if (isEditMode.value) {
    router.replace({ name: "SpandukMutasiProduksiCreate" });
    return;
  }
  formData.value = defaultData();
  liniTujuanOpts.value = [];
  isiLokasiDefault();
};

const tutupSetelahSimpan = () => {
  showSelesai.value = false;
  goBack();
};
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? 'Ubah Mutasi Produksi Spanduk'
        : 'Tambah Mutasi Produksi Spanduk'
    "
    menu-id="4"
    :icon="IconArrowsExchange"
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
        <div v-if="formData.terkunci" class="banner-kunci">
          {{ formData.pesanKunci }}
        </div>

        <div class="fr">
          <label class="lbl">Nomor</label>
          <input
            :value="formData.header.nomor"
            readonly
            class="inp ro"
            style="flex: 1"
            placeholder="Otomatis"
          />
        </div>

        <div class="fr">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.header.tanggal"
            class="idate"
            style="width: 150px"
            :disabled="formData.terkunci"
            @keydown.enter.prevent="fokus(keteranganRef)"
          />
        </div>

        <div class="fr">
          <label class="lbl">Lokasi</label>
          <select
            v-model="formData.header.kodePabrik"
            class="inp"
            style="width: 90px"
            :disabled="isEditMode"
            @change="onPabrikChange"
          >
            <option value="" disabled>Pilih...</option>
            <option v-for="p in opsiPabrik" :key="p.Kode" :value="p.Kode">
              {{ p.Kode }}
            </option>
          </select>
          <input
            :value="formData.header.namaPabrik"
            readonly
            class="inp ro ml-1"
            style="flex: 1"
          />
        </div>

        <div class="fr">
          <label class="lbl">
            Keterangan<span v-if="lewatiLini" class="req"> *</span>
          </label>
          <input
            ref="keteranganRef"
            v-model="formData.header.keterangan"
            class="inp"
            style="flex: 1"
            :maxlength="MAKS_KETERANGAN"
            :disabled="formData.terkunci"
            @keydown.enter.prevent="fokus(lhkRef)"
          />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">No. LHK</label>
          <div class="cell-grp box" style="flex: 1">
            <input
              ref="lhkRef"
              :value="formData.lhk.nomor"
              class="ci"
              :readonly="!bolehUbahSumber"
              placeholder="Ketik nomor + Enter / F1 cari"
              autocomplete="off"
              @keydown.enter.prevent="onEnterLhk"
              @keydown.f1.prevent="bukaModalLhk"
              @blur="onBlurLhk"
            />
            <button
              type="button"
              class="ci-btn"
              title="Cari LHK"
              :disabled="!bolehUbahSumber"
              @click="bukaModalLhk"
            >
              <IconSearch :size="11" />
            </button>
          </div>
        </div>

        <div class="fr">
          <label class="lbl">Tgl LHK</label>
          <input
            :value="
              formData.lhk.tanggal ? formatTanggal(formData.lhk.tanggal) : ''
            "
            readonly
            class="inp ro"
            style="width: 110px"
          />
        </div>

        <div class="fr">
          <label class="lbl">No. SPK</label>
          <div class="cell-grp box" style="flex: 1">
            <input
              :value="formData.spk.nomor"
              class="ci ro"
              readonly
              placeholder="Pilih lewat tombol cari / Enter / F1"
              @keydown.enter.prevent="bukaModalSpk"
              @keydown.f1.prevent="bukaModalSpk"
            />
            <button
              type="button"
              class="ci-btn"
              title="Cari SPK/MAP di LHK"
              :disabled="!bolehUbahSumber"
              @click="bukaModalSpk"
            >
              <IconSearch :size="11" />
            </button>
          </div>
        </div>

        <div class="fr">
          <label class="lbl">Jenis</label>
          <input
            :value="formData.spk.jenis"
            readonly
            class="inp ro"
            style="width: 70px"
          />
          <label class="lbl ml-1" style="width: 60px">Tgl SPK</label>
          <input
            :value="
              formData.spk.tglSpk ? formatTanggal(formData.spk.tglSpk) : ''
            "
            readonly
            class="inp ro"
            style="width: 110px"
          />
        </div>

        <div class="fr">
          <label class="lbl">Divisi</label>
          <input
            :value="formData.spk.divisi"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>

        <div class="fr">
          <label class="lbl">Product</label>
          <input
            :value="formData.spk.nama"
            readonly
            class="inp ro"
            style="flex: 1"
            :title="formData.spk.nama"
          />
        </div>

        <div class="fr">
          <label class="lbl">Jml SPK</label>
          <input
            :value="formData.spk.jumlahOrder.toLocaleString('id-ID')"
            readonly
            class="inp ro tr"
            style="width: 110px"
          />
        </div>

        <div class="fr">
          <label class="lbl">Jenis Produk</label>
          <input
            :value="formData.spk.jenisProduk"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>
      </div>
    </template>

    <!-- ══ KOLOM KANAN ══ -->
    <template #right-column>
      <div class="lhk-right">
        <div class="box-card">
          <div class="box-title">Pilihan Mutasi</div>
          <div class="mut-grid">
            <button
              v-for="o in liniAsalOpts"
              :key="o.Kode"
              type="button"
              class="mut-btn"
              :class="{ aktif: formData.liniAsal === o.Kode }"
              :disabled="
                !o.Tersedia || (isEditMode && formData.liniAsal !== o.Kode)
              "
              :title="o.Tersedia ? '' : `LHK ${o.Nama} belum tersedia di web`"
              @click="pilihMutasi(o)"
            >
              {{ o.Nama }} ke {{ o.Nama_Berikutnya }}
            </button>
          </div>
        </div>

        <div class="box-card">
          <div class="fr">
            <label class="lbl">Lini Asal</label>
            <input
              :value="namaLiniAsal"
              readonly
              class="inp ro"
              style="width: 180px"
            />
            <label class="lbl ml-2" style="width: 80px">Lini Tujuan</label>
            <select
              v-model="formData.liniTujuan"
              class="inp"
              style="width: 200px"
              :disabled="isEditMode || liniTujuanOpts.length === 0"
            >
              <option value="" disabled>Pilih...</option>
              <option v-for="o in liniTujuanOpts" :key="o.Kode" :value="o.Kode">
                {{ o.Nama }}
              </option>
            </select>
          </div>
          <div v-if="lewatiLini" class="warn-lewati">
            Lini tujuan melewati lini berikutnya. Keterangan wajib diisi sebagai
            catatan alasan.
          </div>
        </div>

        <div class="tbl-header">
          <span class="tbl-title">
            Hasil di LHK {{ namaLiniAsal }}
            <span v-if="formData.lhk.nomor">- {{ formData.lhk.nomor }}</span>
          </span>
        </div>
        <div class="tbl-wrap" style="flex: 1; min-height: 120px">
          <table class="gt" style="table-layout: auto">
            <thead>
              <tr>
                <th v-for="k in formData.hasil.Kolom" :key="k.Key">
                  {{ k.Label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(b, i) in formData.hasil.Baris" :key="i">
                <td
                  v-for="k in formData.hasil.Kolom"
                  :key="k.Key"
                  class="cell"
                  :class="{ tr: typeof b[k.Key] === 'number' }"
                >
                  {{ tampil(b[k.Key]) }}
                </td>
              </tr>
              <tr v-if="formData.hasil.Baris.length === 0">
                <td
                  :colspan="Math.max(formData.hasil.Kolom.length, 1)"
                  class="empty"
                >
                  Pilih LHK dan SPK/MAP untuk melihat hasilnya.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseForm>

  <LhkMutasiSearchModal
    v-model="showLhkModal"
    :lini="formData.liniAsal"
    :lini-nama="namaLiniAsal"
    @selected="onLhkSelected"
  />
  <LhkMutasiSpkSearchModal
    v-model="showSpkModal"
    :lini="formData.liniAsal"
    :lhk="formData.lhk.nomor"
    @selected="onSpkSelected"
  />

  <!-- Ganti Pilihan Mutasi saat LHK/SPK sudah terisi -->
  <v-dialog v-model="showGantiLini" max-width="420" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-warning text-white pa-3">
        Ganti Pilihan Mutasi?
      </v-card-title>
      <v-card-text class="pa-4">
        LHK dan SPK/MAP yang sudah dipilih akan dikosongkan, karena LHK berasal
        dari lini yang berbeda.
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="showGantiLini = false">Batal</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="konfirmasiGantiLini">
          Ya, Ganti
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Setelah simpan -->
  <v-dialog v-model="showSelesai" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconArrowsExchange class="mr-2" :size="20" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-2">
          Mutasi produksi <b>{{ nomorTerakhir }}</b> telah disimpan.
        </div>
        <div class="text-body-2 text-grey-darken-1">
          Mau input mutasi produksi baru?
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
  gap: 8px;
  height: 100%;
  padding: 10px 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.fr {
  display: flex;
  align-items: center;
  min-height: 24px;
  gap: 4px;
  width: 100%;
}
.lbl {
  width: 80px;
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
.ml-1 {
  margin-left: 4px;
}
.ml-2 {
  margin-left: 12px;
}
.tr {
  text-align: right;
}
.req {
  color: #d32f2f;
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
.inp:disabled,
.idate:disabled {
  background: #eceff1;
  color: #666;
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

.banner-kunci {
  background: #fff3e0;
  border: 1px solid #ffb74d;
  color: #e65100;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 3px;
  margin-bottom: 4px;
}

.cell-grp {
  display: flex;
  align-items: center;
  height: 24px;
}
.cell-grp.box {
  border: 1px solid #a0a0a0;
  background: white;
}
.cell-grp .ci {
  flex: 1;
  min-width: 0;
}
.ci {
  width: 100%;
  height: 22px;
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
.ci:focus {
  background: #e3f2fd !important;
}
.ci-btn {
  width: 24px;
  flex-shrink: 0;
  background: #eeeeee;
  border: none;
  border-left: 1px solid #e0e0e0;
  cursor: pointer;
  height: 22px;
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

.box-card {
  border: 1px solid #cfd8dc;
  border-radius: 4px;
  padding: 8px 10px;
  background: white;
  flex-shrink: 0;
}
.box-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  margin-bottom: 6px;
  text-transform: uppercase;
}
.mut-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
}
.mut-btn {
  height: 26px;
  border: 1px solid #b0bec5;
  background: white;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  padding: 0 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mut-btn:hover:not(:disabled) {
  background: #e3f2fd;
  border-color: #1976d2;
}
.mut-btn.aktif {
  background: #1565c0;
  border-color: #1565c0;
  color: white;
  font-weight: 700;
}
.mut-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.warn-lewati {
  margin-top: 6px;
  background: #fff8e1;
  border: 1px solid #ffe082;
  color: #8d6e00;
  padding: 4px 8px;
  font-size: 11px;
  border-radius: 3px;
}

.tbl-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 5px 10px;
  border-radius: 3px 3px 0 0;
  flex-shrink: 0;
  margin-bottom: -8px;
}
.tbl-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
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
}
.gt thead th {
  background: #f0f4f8;
  border: 1px solid #bdbdbd;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 700;
  color: #37474f;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}
.gt tbody td.cell {
  border: 1px solid #e8e8e8;
  padding: 4px 8px;
  font-size: 11px;
  white-space: nowrap;
}
.gt td.empty {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 16px 8px;
}
</style>
