<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import { useForm } from "@/composables/useForm";
import { useAuthStore } from "@/stores/authStore";
import { IconFold, IconSearch } from "@tabler/icons-vue";
import * as lhkForm from "@/services/spanduk/lhk/lhkLipatFormService";
import type {
  KaryawanOption,
  LhkLipatPayload,
  PabrikOption,
  SaveResponse,
} from "@/services/spanduk/lhk/lhkLipatFormService";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const isEditMode = computed(() => !!route.params.nomor);

// Delphi: hanya Lokasi MT1 yang boleh mengisi Qty Lipat manual
const LOKASI_QTY_MANUAL = "MT1";
const MAKS_ABSENSI = 999.99;

const formatDateLocal = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const todayLocal = formatDateLocal(new Date());

// ── Model data ──
interface KarRow {
  nik: string;
  nama: string;
  absensi: number;
  qty: number;
}

interface FormRow {
  spk: string;
  nama: string;
  jumlahOrder: number;
  panjang: number;
  lebar: number;
  qtyManual: number; // dipakai hanya bila Lokasi = MT1
  tambahLipat: number;
  mataAyam: number;
  karyawan: KarRow[];
}

interface FormState {
  header: {
    nomor: string;
    tanggal: string;
    kodePabrik: string;
    namaPabrik: string;
  };
  items: FormRow[];
}

const num = (v: unknown) => Number(v) || 0;

const barisKosong = (): FormRow => ({
  spk: "",
  nama: "",
  jumlahOrder: 0,
  panjang: 0,
  lebar: 0,
  qtyManual: 0,
  tambahLipat: 0,
  mataAyam: 0,
  karyawan: [],
});

const defaultData = (): FormState => ({
  header: { nomor: "", tanggal: todayLocal, kodePabrik: "", namaPabrik: "" },
  items: [barisKosong()],
});

// ── State UI ──
const showSpkModal = ref(false);
const activeIdx = ref(0); // baris SPK yang karyawannya sedang ditampilkan
const showSelesai = ref(false);
const nomorTerakhir = ref("");
const pabrikOpts = ref<PabrikOption[]>([]);
const cacheKaryawan = new Map<string, KaryawanOption[]>();

const jumlahKaryawan = (row: FormRow) =>
  row.karyawan.reduce((a, k) => a + num(k.qty), 0);

const bangunPayload = (data: FormState): LhkLipatPayload => {
  const manual = data.header.kodePabrik === LOKASI_QTY_MANUAL;
  return {
    Tanggal: data.header.tanggal,
    Kode_Pabrik: data.header.kodePabrik,
    // Delphi: baris tanpa nomor SPK tidak disimpan
    Detail: data.items
      .filter((r) => r.spk.trim() !== "")
      .map((r) => ({
        Nomor_SPK: r.spk.trim(),
        Qty_Lipat: manual ? num(r.qtyManual) : jumlahKaryawan(r),
        Tambah_Lipat: num(r.tambahLipat),
        Mata_Ayam: num(r.mataAyam),
        Karyawan: r.karyawan.map((k) => ({
          NIK: k.nik,
          Absensi: num(k.absensi),
          Qty: num(k.qty),
        })),
      })),
  };
};

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
  menuId: "1223",
  initialData: defaultData(),
  fetchApi: async (): Promise<FormState> => {
    const d = await lhkForm.getById(String(route.params.nomor));
    const items: FormRow[] = d.Detail.map((r) => ({
      spk: r.Nomor_SPK,
      nama: r.Nama_SPK ?? "",
      jumlahOrder: num(r.Jumlah_Order),
      panjang: num(r.Panjang),
      lebar: num(r.Lebar),
      qtyManual: num(r.Qty_Lipat),
      tambahLipat: num(r.Tambah_Lipat),
      mataAyam: num(r.Mata_Ayam),
      karyawan: r.Karyawan.map((k) => ({
        nik: k.NIK,
        nama: k.Nama ?? "",
        absensi: num(k.Absensi),
        qty: num(k.Qty),
      })),
    }));
    activeIdx.value = 0;
    return {
      header: {
        nomor: d.Nomor,
        tanggal: d.Tanggal,
        kodePabrik: d.Kode_Pabrik ?? "",
        namaPabrik: d.Nama_Pabrik ?? "",
      },
      items: items.length > 0 ? items : [barisKosong()],
    };
  },
  submitApi: async (data: FormState): Promise<SaveResponse> => {
    const payload = bangunPayload(data);
    return isEditMode.value
      ? lhkForm.update(String(route.params.nomor), payload)
      : lhkForm.create(payload);
  },
  onSuccess: (response: unknown) => {
    const res = response as SaveResponse;
    const nomor = res.data?.data?.Nomor ?? "";
    nomorTerakhir.value = nomor;
    formData.value.header.nomor = nomor;
    showSelesai.value = true;
  },
  onFormReset: () => {
    isiLokasiDefault();
  },
});

const qtyManual = computed(
  () => formData.value.header.kodePabrik === LOKASI_QTY_MANUAL,
);

const qtyLipatBaris = (row: FormRow) =>
  qtyManual.value ? num(row.qtyManual) : jumlahKaryawan(row);

const barisAktif = computed<FormRow | undefined>(
  () => formData.value.items[activeIdx.value],
);

const totalQtyAktif = computed(() =>
  barisAktif.value ? jumlahKaryawan(barisAktif.value) : 0,
);

// ── Lokasi (pabrik) ──
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
  if (formData.value.items.some((r) => r.spk.trim() !== "")) {
    toast.info(
      "Lokasi diubah: daftar karyawan pada baris SPK yang sudah terisi tidak ikut berubah.",
    );
  }
};

// Lokasi default = cabang user (kode pabrik sama dengan kode cabang).
// Hanya di mode tambah, hanya bila Lokasi masih kosong dan kodenya ada di daftar.
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
    pabrikOpts.value = await lhkForm.getLookupPabrik();
    isiLokasiDefault();
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat daftar lokasi."));
  }
});

// ── Grid SPK ──
const addRow = () => {
  formData.value.items.push(barisKosong());
  activeIdx.value = formData.value.items.length - 1;
};

const removeRow = (idx: number) => {
  formData.value.items.splice(idx, 1);
  if (formData.value.items.length === 0) {
    formData.value.items.push(barisKosong());
  }
  activeIdx.value = Math.min(activeIdx.value, formData.value.items.length - 1);
  if (idx < activeIdx.value) {
    activeIdx.value = Math.max(0, activeIdx.value - 1);
  }
};

const pilihBaris = (idx: number) => {
  activeIdx.value = idx;
};

const openLookupSpk = (idx: number) => {
  activeIdx.value = idx;
  showSpkModal.value = true;
};

// Daftar karyawan lipat aktif di Lokasi (di-cache per lokasi)
const ambilKaryawanLokasi = async (kode: string): Promise<KaryawanOption[]> => {
  const cache = cacheKaryawan.get(kode);
  if (cache) {
    return cache;
  }
  const daftar = await lhkForm.getLookupKaryawan(kode);
  cacheKaryawan.set(kode, daftar);
  return daftar;
};

// Isi satu baris dari nomor SPK/MAP. Data diambil server (sekaligus validasi
// divisi dan cabang). Karyawan diisi dari master per Lokasi, absensi & qty 0.
const isiBarisDariSpk = async (
  idx: number,
  nomorInput: string,
): Promise<boolean> => {
  const nomor = nomorInput.trim();
  if (idx < 0 || !nomor) {
    return false;
  }

  const kodePabrik = formData.value.header.kodePabrik;
  if (!kodePabrik) {
    toast.warning("Pilih Lokasi terlebih dahulu.");
    return false;
  }

  const dup = formData.value.items.findIndex(
    (r, i) => i !== idx && r.spk.toUpperCase() === nomor.toUpperCase(),
  );
  if (dup >= 0) {
    toast.warning(`Uraian ada yang sama dengan baris ${dup + 1}`);
    return false;
  }

  try {
    const [info, daftar] = await Promise.all([
      lhkForm.getInfoSpk(nomor),
      ambilKaryawanLokasi(kodePabrik),
    ]);
    const row = formData.value.items[idx];
    const sama = row.spk.toUpperCase() === info.Nomor_SPK.toUpperCase();
    row.spk = info.Nomor_SPK;
    row.nama = info.Nama_SPK ?? "";
    row.jumlahOrder = num(info.Jumlah_Order);
    row.panjang = num(info.Panjang);
    row.lebar = num(info.Lebar);
    // SPK yang sama dipilih ulang: pertahankan isian karyawan
    if (!sama || row.karyawan.length === 0) {
      row.karyawan = daftar.map((k) => ({
        nik: k.NIK,
        nama: k.Nama,
        absensi: 0,
        qty: 0,
      }));
    }
    activeIdx.value = idx;
    if (daftar.length === 0) {
      toast.warning(
        `Tidak ada karyawan lipat aktif di lokasi ${kodePabrik}. LHK tidak bisa disimpan tanpa karyawan.`,
      );
    }
    return true;
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat data SPK."));
    return false;
  }
};

// ── Navigasi Enter ──
const fieldRefs = ref<Record<string, HTMLInputElement>>({});

const setFieldRef = (el: unknown, kunci: string) => {
  if (el instanceof HTMLInputElement) {
    fieldRefs.value[kunci] = el;
  }
};

const fokusKunci = async (kunci: string) => {
  await nextTick();
  const el = fieldRefs.value[kunci];
  if (el) {
    el.focus();
    el.select();
  }
};

const KOLOM_SPK = ["qty", "tambahLipat", "mataAyam"] as const;
type KolomSpk = (typeof KOLOM_SPK)[number];

const kolomSpkAktif = computed<readonly KolomSpk[]>(() =>
  qtyManual.value ? KOLOM_SPK : ["tambahLipat", "mataAyam"],
);

const onEnterSpkKolom = async (idx: number, col: KolomSpk) => {
  const urut = kolomSpkAktif.value;
  const ci = urut.indexOf(col);
  if (ci < urut.length - 1) {
    await fokusKunci(`s_${idx}_${urut[ci + 1]}`);
  } else {
    pilihBaris(idx);
    await fokusKunci("k_0_absensi");
  }
};

const onEnterKaryawan = async (j: number, col: "absensi" | "qty") => {
  if (col === "absensi") {
    await fokusKunci(`k_${j}_qty`);
  } else {
    await fokusKunci(`k_${j + 1}_absensi`);
  }
};

// Dari modal pencarian (tombol atau F1)
const onSpkSelected = async (v: { Nomor?: string }) => {
  const idx = activeIdx.value;
  if (await isiBarisDariSpk(idx, String(v?.Nomor ?? ""))) {
    await fokusKunci(`k_0_absensi`);
  }
};

// Ketik nomor lalu Enter
const onEnterSpk = async (e: KeyboardEvent, idx: number) => {
  const el = e.target as HTMLInputElement;
  if (!el.value.trim()) {
    return;
  }
  if (await isiBarisDariSpk(idx, el.value)) {
    await fokusKunci(`k_0_absensi`);
  } else {
    el.value = formData.value.items[idx].spk; // balikkan ke nilai terakhir yang valid
    el.select();
  }
};

// Keluar dari field tanpa Enter: buang ketikan yang belum divalidasi
const onBlurSpk = (e: FocusEvent, idx: number) => {
  (e.target as HTMLInputElement).value = formData.value.items[idx].spk;
};

// ── Validasi sebelum konfirmasi simpan (sama dengan validasi server) ──
const validateSave = () => {
  const { tanggal, kodePabrik } = formData.value.header;
  if (!tanggal) {
    toast.warning("Tanggal tidak boleh kosong.");
    return;
  }
  if (!kodePabrik) {
    toast.warning("Lokasi belum dipilih.");
    return;
  }

  const terisi = formData.value.items
    .map((r, i) => ({ r, no: i + 1 }))
    .filter(({ r }) => r.spk.trim() !== "");
  if (terisi.length === 0) {
    toast.warning("Minimal satu baris SPK harus diisi.");
    return;
  }

  const sudah = new Map<string, number>();
  for (const { r, no } of terisi) {
    const kunci = r.spk.trim().toUpperCase();
    const pertama = sudah.get(kunci);
    if (pertama !== undefined) {
      toast.warning(`Baris ${no}: uraian sama dengan baris ${pertama}.`);
      return;
    }
    sudah.set(kunci, no);

    const bulat = [r.mataAyam, ...(qtyManual.value ? [r.qtyManual] : [])];
    if (bulat.some((v) => !Number.isInteger(num(v)))) {
      toast.warning(`Baris ${no}: qty dan mata ayam harus bilangan bulat.`);
      return;
    }
    if (bulat.some((v) => num(v) < 0) || num(r.tambahLipat) < 0) {
      toast.warning(`Baris ${no}: angka tidak boleh negatif.`);
      return;
    }

    let adaKerja = false;
    for (const k of r.karyawan) {
      if (!Number.isInteger(num(k.qty))) {
        toast.warning(`Baris ${no}, ${k.nama}: qty harus bilangan bulat.`);
        return;
      }
      if (num(k.qty) < 0 || num(k.absensi) < 0) {
        toast.warning(`Baris ${no}, ${k.nama}: angka tidak boleh negatif.`);
        return;
      }
      if (num(k.absensi) > MAKS_ABSENSI) {
        toast.warning(
          `Baris ${no}, ${k.nama}: absensi maksimal ${MAKS_ABSENSI}.`,
        );
        return;
      }
      if (num(k.absensi) > 0 || num(k.qty) > 0) {
        adaKerja = true;
      }
    }
    if (!adaKerja) {
      toast.warning(
        `Baris ${no}: SPK ${r.spk} wajib punya minimal satu karyawan dengan absensi atau qty lebih dari 0.`,
      );
      pilihBaris(no - 1);
      return;
    }
  }

  showSaveDialog.value = true;
};

// ── Setelah simpan: tutup, atau input baru (pengganti Save & New) ──
const resetBaru = () => {
  showSelesai.value = false;
  if (isEditMode.value) {
    router.replace({ name: "SpandukLhkLipatCreate" });
    return;
  }
  formData.value = defaultData();
  activeIdx.value = 0;
  isiLokasiDefault();
};

const tutupSetelahSimpan = () => {
  showSelesai.value = false;
  goBack();
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah LHK Lipat' : 'Tambah LHK Lipat'"
    menu-id="1223"
    :icon="IconFold"
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
          />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">Lokasi</label>
          <select
            v-model="formData.header.kodePabrik"
            class="inp"
            style="width: 90px"
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

        <div v-if="qtyManual" class="hint">
          Lokasi {{ LOKASI_QTY_MANUAL }}: Qty Lipat diisi manual.
        </div>
      </div>
    </template>

    <!-- ══ KOLOM KANAN ══ -->
    <template #right-column>
      <div class="lhk-right">
        <!-- Grid SPK -->
        <div class="tbl-header">
          <span class="tbl-title">Rincian SPK</span>
          <button type="button" class="btn-add" @click="addRow">
            + Tambah Baris
          </button>
        </div>
        <div
          class="tbl-wrap"
          style="flex: 0 0 auto; max-height: 260px; min-height: 110px"
        >
          <table class="gt" style="min-width: 1000px">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 170px">Nomor SPK</th>
                <th style="width: 260px">Nama Order</th>
                <th style="width: 90px" class="tr">Jml Order</th>
                <th style="width: 75px" class="tr">Panjang</th>
                <th style="width: 75px" class="tr">Lebar</th>
                <th style="width: 90px" class="tr bg-yellow">Qty Lipat</th>
                <th style="width: 100px" class="tr bg-yellow">Tambah Lipat</th>
                <th style="width: 95px" class="tr bg-yellow">Mata Ayam</th>
                <th style="width: 32px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in formData.items"
                :key="idx"
                :class="{ 'row-aktif': idx === activeIdx }"
                @click="pilihBaris(idx)"
              >
                <td class="tc gt-lbl">{{ idx + 1 }}</td>
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      :value="row.spk"
                      class="ci"
                      placeholder="Ketik nomor + Enter / F1 cari"
                      autocomplete="off"
                      @keydown.enter.prevent="onEnterSpk($event, idx)"
                      @keydown.f1.prevent="openLookupSpk(idx)"
                      @blur="onBlurSpk($event, idx)"
                    />
                    <button
                      type="button"
                      class="ci-btn"
                      title="Cari SPK"
                      @click="openLookupSpk(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>
                <td class="p0">
                  <input
                    :value="row.nama"
                    class="ci ro"
                    readonly
                    :title="row.nama"
                  />
                </td>
                <td class="p0">
                  <input :value="row.jumlahOrder" class="ci tr ro" readonly />
                </td>
                <td class="p0">
                  <input :value="row.panjang" class="ci tr ro" readonly />
                </td>
                <td class="p0">
                  <input :value="row.lebar" class="ci tr ro" readonly />
                </td>
                <td class="p0">
                  <input
                    v-if="qtyManual"
                    v-model.number="row.qtyManual"
                    type="number"
                    min="0"
                    step="1"
                    class="ci tr fw bg-yellow-light"
                    :ref="(el) => setFieldRef(el, `s_${idx}_qty`)"
                    @keydown.enter.prevent="onEnterSpkKolom(idx, 'qty')"
                    v-select-on-focus
                  />
                  <input
                    v-else
                    :value="qtyLipatBaris(row)"
                    class="ci tr fw ro"
                    readonly
                  />
                </td>
                <td class="p0">
                  <input
                    v-model.number="row.tambahLipat"
                    type="number"
                    min="0"
                    step="any"
                    class="ci tr bg-yellow-light"
                    :ref="(el) => setFieldRef(el, `s_${idx}_tambahLipat`)"
                    @keydown.enter.prevent="onEnterSpkKolom(idx, 'tambahLipat')"
                    v-select-on-focus
                  />
                </td>
                <td class="p0">
                  <input
                    v-model.number="row.mataAyam"
                    type="number"
                    min="0"
                    step="1"
                    class="ci tr bg-yellow-light"
                    :ref="(el) => setFieldRef(el, `s_${idx}_mataAyam`)"
                    @keydown.enter.prevent="onEnterSpkKolom(idx, 'mataAyam')"
                    v-select-on-focus
                  />
                </td>
                <td class="tc">
                  <button
                    type="button"
                    class="btn-del"
                    @click.stop="removeRow(idx)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Grid karyawan untuk SPK terpilih -->
        <div class="kar-block">
          <div class="tbl-header kar-head">
            <span class="tbl-title">
              Karyawan
              <template v-if="barisAktif && barisAktif.spk">
                — {{ barisAktif.spk }}
              </template>
            </span>
            <span class="kar-total">Total Qty: {{ totalQtyAktif }}</span>
          </div>
          <div class="tbl-wrap" style="flex: 1; min-height: 120px">
            <div
              v-if="!barisAktif || barisAktif.karyawan.length === 0"
              class="kosong"
            >
              Pilih SPK pada baris di atas untuk menampilkan daftar karyawan.
            </div>
            <table v-else class="gt" style="min-width: 560px">
              <thead>
                <tr>
                  <th style="width: 32px" class="tc">No</th>
                  <th style="width: 110px">NIK</th>
                  <th>Nama</th>
                  <th style="width: 90px" class="tr bg-yellow">Absensi</th>
                  <th style="width: 90px" class="tr bg-yellow">Qty</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(k, j) in barisAktif.karyawan" :key="k.nik">
                  <td class="tc gt-lbl">{{ j + 1 }}</td>
                  <td class="p0">
                    <input :value="k.nik" class="ci ro" readonly />
                  </td>
                  <td class="p0">
                    <input
                      :value="k.nama"
                      class="ci ro"
                      readonly
                      :title="k.nama"
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="k.absensi"
                      type="number"
                      min="0"
                      step="any"
                      class="ci tr bg-yellow-light"
                      :ref="(el) => setFieldRef(el, `k_${j}_absensi`)"
                      @keydown.enter.prevent="onEnterKaryawan(j, 'absensi')"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="k.qty"
                      type="number"
                      min="0"
                      step="1"
                      class="ci tr fw bg-yellow-light"
                      :ref="(el) => setFieldRef(el, `k_${j}_qty`)"
                      @keydown.enter.prevent="onEnterKaryawan(j, 'qty')"
                      v-select-on-focus
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="hint">
            Karyawan dengan absensi 0 dan qty 0 tidak disimpan. Tiap SPK wajib
            punya minimal satu karyawan yang bekerja.
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <SpkSearchModal v-model="showSpkModal" @selected="onSpkSelected" />

  <!-- Setelah simpan: pengganti Save & New / Save & Close -->
  <v-dialog v-model="showSelesai" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconFold class="mr-2" :size="20" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-2">
          LHK Lipat <b>{{ nomorTerakhir }}</b> telah disimpan.
        </div>
        <div class="text-body-2 text-grey-darken-1">
          Mau input LHK Lipat baru?
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
}
.kar-block {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  margin-top: 10px;
}
.kar-head {
  background: #455a64;
}
.kar-total {
  font-size: 11px;
  font-weight: 700;
}
.kosong {
  padding: 16px;
  color: #757575;
  text-align: center;
}
.hint {
  margin-top: 4px;
  font-size: 10px;
  color: #757575;
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
.gt thead th.bg-yellow {
  background: #fff9c4;
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
.gt tbody tr.row-aktif td {
  background: #bbdefb !important;
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
.ci.fw {
  font-weight: 700;
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
.ci-btn:hover {
  background: #e0e0e0;
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
