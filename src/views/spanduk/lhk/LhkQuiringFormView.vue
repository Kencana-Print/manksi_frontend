<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import { useForm } from "@/composables/useForm";
import { useAuthStore } from "@/stores/authStore";
import { IconFlame, IconSearch } from "@tabler/icons-vue";
import * as lhkForm from "@/services/spanduk/lhk/lhkQuiringFormService";
import type {
  KaryawanForm,
  KaryawanOption,
  LhkQuiringPayload,
  PabrikOption,
  SaveResponse,
} from "@/services/spanduk/lhk/lhkQuiringFormService";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const isEditMode = computed(() => !!route.params.nomor);

const formatDateLocal = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const todayLocal = formatDateLocal(new Date());

// ── Model data ──
interface FormRow {
  spk: string;
  nama: string;
  jumlahOrder: number;
  panjang: number;
  lebar: number;
  oven: number;
  jemuran: number;
  potong: number;
}

interface KaryawanRow {
  nik: string;
  nama: string;
  jamMasuk: string;
  jamPulang: string;
  jamKerja: string;
  jamLembur: string;
  pilih: boolean;
}

interface FormState {
  header: {
    nomor: string;
    tanggal: string;
    kodePabrik: string;
    namaPabrik: string;
    sesi: string; // '' = belum dipilih, atau LHK lama (sebelum ada sesi)
  };
  items: FormRow[];
  karyawan: KaryawanRow[];
}

const KOLOM_JUMLAH = [
  { key: "oven", label: "J Oven (m)" },
  { key: "jemuran", label: "J Jemuran (m)" },
  { key: "potong", label: "J Potong (pcs)" },
] as const;

const num = (v: unknown) => Number(v) || 0;

const barisKosong = (): FormRow => ({
  spk: "",
  nama: "",
  jumlahOrder: 0,
  panjang: 0,
  lebar: 0,
  oven: 0,
  jemuran: 0,
  potong: 0,
});

const defaultData = (): FormState => ({
  header: {
    nomor: "",
    tanggal: todayLocal,
    kodePabrik: "",
    namaPabrik: "",
    sesi: "",
  },
  items: [barisKosong()],
  karyawan: [],
});

// Karyawan tersimpan: jam masuk/pulang tidak disimpan, hanya jam kerja dan lembur
const karyawanDariServer = (k: KaryawanForm): KaryawanRow => ({
  nik: k.Nik,
  nama: k.Nama ?? "",
  jamMasuk: "",
  jamPulang: "",
  jamKerja: k.Jam_Kerja,
  jamLembur: k.Jam_Lembur,
  pilih: true,
});

const karyawanDariLookup = (
  d: KaryawanOption,
  pilih: boolean,
): KaryawanRow => ({
  nik: d.Nik,
  nama: d.Nama,
  jamMasuk: d.Jam_Masuk,
  jamPulang: d.Jam_Pulang,
  jamKerja: d.Jam_Kerja,
  jamLembur: d.Jam_Lembur,
  pilih,
});

// ── State UI ──
const showSpkModal = ref(false);
const activeIdx = ref(-1);
const showSelesai = ref(false);
const nomorTerakhir = ref("");
const pabrikOpts = ref<PabrikOption[]>([]);

// Snapshot LHK tersimpan (mode ubah). Karyawan tersimpan memakai jam tersimpan
// hanya bila tanggal dan lokasi tidak berubah (aturan server); selain itu
// dihitung ulang dari absensi.
let karyawanTersimpan: KaryawanRow[] = [];
let asal: { tanggal: string; pabrik: string } | null = null;

const resetKaryawanAsal = () => {
  karyawanTersimpan = [];
  asal = null;
};

// LHK lama (dibuat sebelum ada sesi): karyawan tidak dicatat dan tidak diubah
const isLegacy = computed(
  () => isEditMode.value && formData.value.header.sesi === "",
);

const bangunPayload = (data: FormState): LhkQuiringPayload => ({
  Tanggal: data.header.tanggal,
  Kode_Pabrik: data.header.kodePabrik,
  Sesi: data.header.sesi,
  // Delphi: baris tanpa nomor SPK tidak disimpan
  Detail: data.items
    .filter((r) => r.spk.trim() !== "")
    .map((r) => ({
      Nomor_SPK: r.spk.trim(),
      J_Oven: num(r.oven),
      J_Jemuran: num(r.jemuran),
      J_Potong: num(r.potong),
    })),
  Karyawan: data.karyawan.filter((k) => k.pilih).map((k) => ({ Nik: k.nik })),
});

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
  menuId: "1224",
  initialData: defaultData(),
  fetchApi: async (): Promise<FormState> => {
    const d = await lhkForm.getById(String(route.params.nomor));
    const items: FormRow[] = d.Detail.map((r) => ({
      spk: r.Nomor_SPK,
      nama: r.Nama_SPK ?? "",
      jumlahOrder: num(r.Jumlah_Order),
      panjang: num(r.Panjang),
      lebar: num(r.Lebar),
      oven: num(r.J_Oven),
      jemuran: num(r.J_Jemuran),
      potong: num(r.J_Potong),
    }));
    const karyawan = d.Karyawan.map(karyawanDariServer);
    karyawanTersimpan = karyawan;
    asal = { tanggal: d.Tanggal, pabrik: d.Kode_Pabrik ?? "" };
    return {
      header: {
        nomor: d.Nomor,
        tanggal: d.Tanggal,
        kodePabrik: d.Kode_Pabrik ?? "",
        namaPabrik: d.Nama_Pabrik ?? "",
        sesi: d.Sesi ?? "",
      },
      items: items.length > 0 ? items : [barisKosong()],
      karyawan: karyawan.map((k) => ({ ...k })),
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
    resetKaryawanAsal();
    isiLokasiDefault();
  },
});

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

// ── Karyawan quiring (absensi HRD) ──
let reqKaryawan = 0;

const muatKaryawan = async () => {
  if (isLegacy.value) {
    return;
  }
  const h = formData.value.header;
  if (!h.sesi || !h.kodePabrik || !h.tanggal) {
    formData.value.karyawan = [];
    return;
  }
  const no = ++reqKaryawan;
  try {
    const daftar = await lhkForm.getLookupKaryawan(
      h.kodePabrik,
      h.sesi,
      h.tanggal,
    );
    if (no !== reqKaryawan) {
      return;
    }
    const pilihan = new Map(
      formData.value.karyawan.map((k) => [k.nik, k.pilih]),
    );
    const sah =
      asal !== null &&
      asal.tanggal === h.tanggal &&
      asal.pabrik.toUpperCase() === h.kodePabrik.toUpperCase();
    const simpanan = new Map(karyawanTersimpan.map((k) => [k.nik, k]));

    const baris = daftar.map((d) => {
      const s = sah ? simpanan.get(d.Nik) : undefined;
      const pilih = pilihan.get(d.Nik) ?? true;
      return s ? { ...s, pilih } : karyawanDariLookup(d, pilih);
    });
    if (sah) {
      const ada = new Set(daftar.map((d) => d.Nik));
      for (const s of karyawanTersimpan) {
        if (!ada.has(s.nik)) {
          baris.push({ ...s, pilih: pilihan.get(s.nik) ?? true });
        }
      }
    }
    formData.value.karyawan = baris;
  } catch (e) {
    if (no !== reqKaryawan) {
      return;
    }
    if (!isEditMode.value) {
      formData.value.karyawan = [];
    }
    toast.error(lhkForm.pesanError(e, "Gagal memuat daftar karyawan."));
  }
};

// Muat ulang saat tanggal, lokasi, atau sesi berubah (juga setelah data ubah dimuat)
watch(
  () => {
    const h = formData.value.header;
    return `${h.tanggal}|${h.kodePabrik}|${h.sesi}`;
  },
  () => {
    muatKaryawan();
  },
);

const jumlahDipilih = computed(
  () => formData.value.karyawan.filter((k) => k.pilih).length,
);

const semuaDipilih = computed({
  get: () =>
    formData.value.karyawan.length > 0 &&
    jumlahDipilih.value === formData.value.karyawan.length,
  set: (v: boolean) => {
    for (const k of formData.value.karyawan) {
      k.pilih = v;
    }
  },
});

const pesanKaryawanKosong = computed(() => {
  const h = formData.value.header;
  if (isLegacy.value) {
    return "LHK lama (tanpa sesi): karyawan tidak dicatat.";
  }
  if (!h.sesi || !h.kodePabrik) {
    return "Pilih Lokasi dan Sesi untuk menampilkan karyawan.";
  }
  return "Tidak ada karyawan yang memenuhi syarat sesi pada tanggal ini.";
});

// ── Grid ──
const addRow = () => {
  formData.value.items.push(barisKosong());
};

const removeRow = (idx: number) => {
  formData.value.items.splice(idx, 1);
  if (formData.value.items.length === 0) {
    formData.value.items.push(barisKosong());
  }
};

const openLookupSpk = (idx: number) => {
  activeIdx.value = idx;
  showSpkModal.value = true;
};

// Isi satu baris dari nomor SPK. Data diambil server (sekaligus validasi
// divisi, cabang, dan SPK bukan MAP). Mengembalikan true kalau baris terisi.
const isiBarisDariSpk = async (
  idx: number,
  nomorInput: string,
): Promise<boolean> => {
  const nomor = nomorInput.trim();
  if (idx < 0 || !nomor) {
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
    const info = await lhkForm.getInfoSpk(nomor);
    const row = formData.value.items[idx];
    row.spk = info.Nomor_SPK;
    row.nama = info.Nama_SPK ?? "";
    row.jumlahOrder = num(info.Jumlah_Order);
    row.panjang = num(info.Panjang);
    row.lebar = num(info.Lebar);
    return true;
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat data SPK."));
    return false;
  }
};

// Enter → kolom berikutnya (Delphi: SelectNext), akhir baris → baris berikutnya
const KOLOM_EDIT = ["oven", "jemuran", "potong"] as const;
type KolomEdit = (typeof KOLOM_EDIT)[number];

const fieldRefs = ref<Record<string, HTMLInputElement>>({});

const setFieldRef = (el: unknown, idx: number, col: KolomEdit) => {
  if (el instanceof HTMLInputElement) {
    fieldRefs.value[`${idx}_${col}`] = el;
  }
};

const fokusKolom = async (idx: number, col: KolomEdit) => {
  await nextTick();
  const el = fieldRefs.value[`${idx}_${col}`];
  if (el) {
    el.focus();
    el.select();
  }
};

const onEnter = async (idx: number, col: KolomEdit) => {
  const ci = KOLOM_EDIT.indexOf(col);
  if (ci < KOLOM_EDIT.length - 1) {
    await fokusKolom(idx, KOLOM_EDIT[ci + 1]);
  } else {
    await fokusKolom(idx + 1, KOLOM_EDIT[0]);
  }
};

// Dari modal pencarian (tombol atau F1)
const onSpkSelected = async (v: { Nomor?: string }) => {
  const idx = activeIdx.value;
  if (await isiBarisDariSpk(idx, String(v?.Nomor ?? ""))) {
    await fokusKolom(idx, "oven");
  }
};

// Ketik nomor lalu Enter
const onEnterSpk = async (e: KeyboardEvent, idx: number) => {
  const el = e.target as HTMLInputElement;
  if (!el.value.trim()) {
    return;
  }
  if (await isiBarisDariSpk(idx, el.value)) {
    await fokusKolom(idx, "oven");
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
  const { tanggal, kodePabrik, sesi } = formData.value.header;
  if (!tanggal) {
    toast.warning("Tanggal tidak boleh kosong.");
    return;
  }
  if (!kodePabrik) {
    toast.warning("Lokasi belum dipilih.");
    return;
  }
  if (!isLegacy.value && !sesi) {
    toast.warning("Sesi belum dipilih.");
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

    const angkaInput = [r.oven, r.jemuran, r.potong];
    if (angkaInput.some((v) => !Number.isInteger(num(v)))) {
      toast.warning(`Baris ${no}: jumlah harus bilangan bulat.`);
      return;
    }
    if (angkaInput.some((v) => num(v) < 0)) {
      toast.warning(`Baris ${no}: angka tidak boleh negatif.`);
      return;
    }
    if (angkaInput.every((v) => num(v) === 0)) {
      toast.warning(
        `Baris ${no}: minimal satu dari Oven, Jemuran, atau Potong harus lebih dari 0.`,
      );
      return;
    }
  }

  showSaveDialog.value = true;
};

// ── Setelah simpan: tutup, atau input baru (pengganti Save & New) ──
const resetBaru = () => {
  showSelesai.value = false;
  if (isEditMode.value) {
    router.replace({ name: "SpandukLhkQuiringCreate" });
    return;
  }
  formData.value = defaultData();
  resetKaryawanAsal();
  isiLokasiDefault();
};

const tutupSetelahSimpan = () => {
  showSelesai.value = false;
  goBack();
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah LHK Quiring' : 'Tambah LHK Quiring'"
    menu-id="1224"
    :icon="IconFlame"
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

        <div class="fr">
          <label class="lbl">Sesi</label>
          <select
            v-model="formData.header.sesi"
            class="inp"
            style="width: 120px"
            :disabled="isEditMode"
          >
            <option value="" disabled>Pilih...</option>
            <option value="PAGI">Pagi</option>
            <option value="SIANG">Siang</option>
          </select>
        </div>
        <div class="catatan">
          Pagi: jam kerja sampai 13.00. Siang: dari 13.00 sampai scan pulang.
          <template v-if="isEditMode">
            Sesi tidak dapat diubah setelah disimpan.
          </template>
        </div>
      </div>
    </template>

    <!-- ══ KOLOM KANAN ══ -->
    <template #right-column>
      <div class="lhk-right">
        <div class="sec-spk">
          <div class="tbl-header">
            <span class="tbl-title">Rincian SPK</span>
            <button type="button" class="btn-add" @click="addRow">
              + Tambah Baris
            </button>
          </div>
          <div class="tbl-wrap" style="flex: 1; min-height: 240px">
            <table class="gt" style="min-width: 1070px">
              <thead>
                <tr>
                  <th style="width: 32px" class="tc">No</th>
                  <th style="width: 170px">Nomor SPK</th>
                  <th style="width: 280px">Nama Order</th>
                  <th style="width: 90px" class="tr">Jml Order</th>
                  <th style="width: 80px" class="tr">Panjang</th>
                  <th style="width: 80px" class="tr">Lebar</th>
                  <th
                    v-for="k in KOLOM_JUMLAH"
                    :key="k.key"
                    style="width: 100px"
                    class="tr bg-yellow"
                  >
                    {{ k.label }}
                  </th>
                  <th style="width: 32px" class="tc"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in formData.items" :key="idx">
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
                  <td v-for="k in KOLOM_JUMLAH" :key="k.key" class="p0">
                    <input
                      v-model.number="row[k.key]"
                      type="number"
                      min="0"
                      step="1"
                      class="ci tr fw bg-yellow-light"
                      :ref="(el) => setFieldRef(el, idx, k.key)"
                      @keydown.enter.prevent="onEnter(idx, k.key)"
                      v-select-on-focus
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
            </table>
          </div>
        </div>

        <!-- Karyawan quiring dari absensi HRD -->
        <div class="sec-kar">
          <div class="tbl-header tbl-header-sub">
            <span class="tbl-title">Karyawan Quiring (absensi)</span>
            <span class="hint">
              {{ jumlahDipilih }} dipilih dari {{ formData.karyawan.length }}
            </span>
          </div>
          <div class="tbl-wrap kar-wrap">
            <table class="gt" style="min-width: 560px">
              <thead>
                <tr>
                  <th style="width: 32px" class="tc">
                    <input
                      v-model="semuaDipilih"
                      type="checkbox"
                      :disabled="isLegacy || formData.karyawan.length === 0"
                    />
                  </th>
                  <th style="width: 110px">NIK</th>
                  <th>Nama</th>
                  <th style="width: 70px" class="tc">Masuk</th>
                  <th style="width: 70px" class="tc">Pulang</th>
                  <th style="width: 80px" class="tc">Jam Kerja</th>
                  <th style="width: 80px" class="tc">Lembur</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="k in formData.karyawan" :key="k.nik">
                  <td class="tc">
                    <input
                      v-model="k.pilih"
                      type="checkbox"
                      :disabled="isLegacy"
                    />
                  </td>
                  <td class="gt-ro">{{ k.nik }}</td>
                  <td class="gt-ro" :title="k.nama">{{ k.nama }}</td>
                  <td class="gt-lbl tc">{{ k.jamMasuk || "-" }}</td>
                  <td class="gt-lbl tc">{{ k.jamPulang || "-" }}</td>
                  <td class="gt-lbl tc">{{ k.jamKerja }}</td>
                  <td class="gt-lbl tc">{{ k.jamLembur }}</td>
                </tr>
                <tr v-if="formData.karyawan.length === 0">
                  <td colspan="7" class="kar-kosong">
                    {{ pesanKaryawanKosong }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="lhk-design"
    :divisi="1"
    @selected="onSpkSelected"
  />

  <!-- Setelah simpan: pengganti Save & New / Save & Close -->
  <v-dialog v-model="showSelesai" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconFlame class="mr-2" :size="20" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-2">
          LHK Quiring <b>{{ nomorTerakhir }}</b> telah disimpan.
        </div>
        <div class="text-body-2 text-grey-darken-1">
          Mau input LHK Quiring baru?
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
.inp:disabled {
  background: #dde8f0;
  color: #444;
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
.sec-spk {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.sec-kar {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.kar-wrap {
  max-height: 180px;
}
.tbl-header-sub {
  background: #546e7a;
}
.hint {
  font-size: 10px;
  opacity: 0.85;
}
.catatan {
  margin-top: 4px;
  font-size: 10px;
  color: #757575;
  font-style: italic;
}
.gt-ro {
  padding: 0 6px;
  font-size: 11px;
}
.kar-kosong {
  padding: 12px 10px;
  color: #757575;
  font-style: italic;
  text-align: center;
}
</style>
