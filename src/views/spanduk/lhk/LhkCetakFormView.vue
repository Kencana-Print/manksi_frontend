<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import { useForm } from "@/composables/useForm";
import { useAuthStore } from "@/stores/authStore";
import { IconPrinter, IconSearch } from "@tabler/icons-vue";
import * as lhkForm from "@/services/spanduk/lhk/lhkCetakFormService";
import type {
  LhkCetakPayload,
  PabrikOption,
  SaveResponse,
} from "@/services/spanduk/lhk/lhkCetakFormService";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const isEditMode = computed(() => !!route.params.nomor);

const BAGIAN_SUPERADMIN = ["EDP", "DIR", "AUDIT"];
const isSuperadmin = computed(() =>
  BAGIAN_SUPERADMIN.includes(
    (authStore.user?.bagian ?? "").trim().toUpperCase(),
  ),
);

const formatDateLocal = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const hariIni = () => formatDateLocal(new Date());

// ── Model data ──
interface FormRow {
  spk: string;
  nama: string;
  jumlahOrder: number;
  panjang: number;
  lebar: number;
  qtyCetak: number;
  jmlPlangkan: number;
}

interface KaryawanRow {
  nik: string;
  nama: string;
  jamMasuk: string;
  jamPulang: string;
  jamKerja: string;
  jamLembur: string;
  absensi: number; // legacy (LHK lama)
  lembur: number; // legacy (LHK lama)
}

interface FormState {
  header: {
    nomor: string;
    tanggal: string;
    kodePabrik: string;
    namaPabrik: string;
    sesi: string;
    karBorongan: number;
    karHarian: number;
  };
  items: FormRow[];
  karyawan: KaryawanRow[];
}

const num = (v: unknown) => Number(v) || 0;

const barisKosong = (): FormRow => ({
  spk: "",
  nama: "",
  jumlahOrder: 0,
  panjang: 0,
  lebar: 0,
  qtyCetak: 0,
  jmlPlangkan: 0,
});

const defaultData = (): FormState => ({
  header: {
    nomor: "",
    tanggal: hariIni(),
    kodePabrik: "",
    namaPabrik: "",
    sesi: "",
    karBorongan: 0,
    karHarian: 0,
  },
  items: [barisKosong()],
  karyawan: [],
});

// ── State UI ──
const showSpkModal = ref(false);
const activeIdx = ref(-1);
const showSelesai = ref(false);
const nomorTerakhir = ref("");
const pabrikOpts = ref<PabrikOption[]>([]);
const isLoadingKaryawan = ref(false);

const bangunPayload = (data: FormState): LhkCetakPayload => ({
  Tanggal: data.header.tanggal,
  Kode_Pabrik: data.header.kodePabrik,
  Sesi: data.header.sesi,
  Kar_Borongan: num(data.header.karBorongan),
  Kar_Harian: num(data.header.karHarian),
  // Delphi: baris tanpa nomor SPK tidak disimpan
  Detail: data.items
    .filter((r) => r.spk.trim() !== "")
    .map((r) => ({
      Nomor_SPK: r.spk.trim(),
      Qty_Cetak: num(r.qtyCetak),
      Jml_Plangkan: num(r.jmlPlangkan),
    })),
  // Jam kerja dan lembur dihitung server; client hanya mengirim NIK
  Karyawan: data.karyawan.map((k) => ({ Nik: k.nik })),
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
  menuId: "4",
  initialData: defaultData(),
  fetchApi: async (): Promise<FormState> => {
    const d = await lhkForm.getById(String(route.params.nomor));
    const items: FormRow[] = d.Detail.map((r) => ({
      spk: r.Nomor_SPK,
      nama: r.Nama_SPK ?? "",
      jumlahOrder: num(r.Jumlah_Order),
      panjang: num(r.Panjang),
      lebar: num(r.Lebar),
      qtyCetak: num(r.Qty_Cetak),
      jmlPlangkan: num(r.Jml_Plangkan),
    }));
    return {
      header: {
        nomor: d.Nomor,
        tanggal: d.Tanggal,
        kodePabrik: d.Kode_Pabrik ?? "",
        namaPabrik: d.Nama_Pabrik ?? "",
        sesi: d.Sesi ?? "",
        karBorongan: num(d.Kar_Borongan),
        karHarian: num(d.Kar_Harian),
      },
      items: items.length > 0 ? items : [barisKosong()],
      karyawan: d.Karyawan.map((k) => ({
        nik: k.Nik,
        nama: k.Nama,
        jamMasuk: "",
        jamPulang: "",
        jamKerja: k.Jam_Kerja,
        jamLembur: k.Jam_Lembur,
        absensi: num(k.Absensi),
        lembur: num(k.Lembur),
      })),
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

// ── Lokasi (pabrik) ──
const opsiPabrik = computed<PabrikOption[]>(() => {
  const h = formData.value.header;
  const ada = pabrikOpts.value.some((p) => p.Kode === h.kodePabrik);
  return h.kodePabrik && !ada
    ? [{ Kode: h.kodePabrik, Nama: h.namaPabrik }, ...pabrikOpts.value]
    : pabrikOpts.value;
});

const namaPabrikDari = (kode: string) =>
  pabrikOpts.value.find((p) => p.Kode === kode)?.Nama ?? "";

// Lokasi default = cabang user (kode pabrik sama dengan kode cabang).
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
    toast.error(lhkForm.pesanError(e, "Gagal memuat data lookup."));
  }
});

// ── Karyawan ──
// Daftar diambil dari absensi fingerprint hari ini sesuai sesi. Read-only:
// jam kerja dan lembur dihitung server saat simpan.
const isLegacy = computed(
  () => isEditMode.value && formData.value.header.sesi === "",
);

let tokenKaryawan = 0;

const muatKaryawan = async () => {
  const h = formData.value.header;
  if (isEditMode.value || !h.kodePabrik || !h.sesi) {
    formData.value.karyawan = [];
    return;
  }
  const token = ++tokenKaryawan;
  isLoadingKaryawan.value = true;
  try {
    const list = await lhkForm.getLookupKaryawan(
      h.kodePabrik,
      h.sesi,
      h.tanggal,
    );
    if (token !== tokenKaryawan) {
      return; // ada permintaan yang lebih baru
    }
    formData.value.karyawan = list.map((k) => ({
      nik: k.Nik,
      nama: k.Nama,
      jamMasuk: k.Jam_Masuk,
      jamPulang: k.Jam_Pulang,
      jamKerja: k.Jam_Kerja,
      jamLembur: k.Jam_Lembur,
      absensi: 0,
      lembur: 0,
    }));
  } catch (e) {
    if (token === tokenKaryawan) {
      formData.value.karyawan = [];
      toast.error(lhkForm.pesanError(e, "Gagal memuat daftar karyawan."));
    }
  } finally {
    if (token === tokenKaryawan) {
      isLoadingKaryawan.value = false;
    }
  }
};

const onSesiChange = () => {
  void muatKaryawan();
};

const onPabrikChange = () => {
  const h = formData.value.header;
  h.namaPabrik = namaPabrikDari(h.kodePabrik);
  void muatKaryawan();
};

// ── Grid SPK ──
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
    toast.warning(`SPK/MAP sudah ada di baris ${dup + 1}`);
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
    toast.error(lhkForm.pesanError(e, "Gagal memuat data SPK/MAP."));
    return false;
  }
};

// Urutan Enter: SPK → J. Cetak → J. Plangkan → SPK baris berikutnya
const fieldRefs = ref<Record<string, HTMLInputElement>>({});

const simpanRef = (el: unknown, kunci: string) => {
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

const onEnterCetak = async (idx: number) => {
  await fokusKunci(`${idx}_plg`);
};

const onEnterPlangkan = async (idx: number) => {
  if (idx + 1 >= formData.value.items.length) {
    addRow();
  }
  await fokusKunci(`${idx + 1}_spk`);
};

const onSpkSelected = async (v: { Nomor?: string }) => {
  const idx = activeIdx.value;
  if (await isiBarisDariSpk(idx, String(v?.Nomor ?? ""))) {
    await fokusKunci(`${idx}_cetak`);
  }
};

const onEnterSpk = async (e: KeyboardEvent, idx: number) => {
  const el = e.target as HTMLInputElement;
  if (!el.value.trim()) {
    return;
  }
  if (await isiBarisDariSpk(idx, el.value)) {
    await fokusKunci(`${idx}_cetak`);
  } else {
    el.value = formData.value.items[idx].spk;
    el.select();
  }
};

const onBlurSpk = (e: FocusEvent, idx: number) => {
  (e.target as HTMLInputElement).value = formData.value.items[idx].spk;
};

// Total
const totalCetak = computed(() =>
  formData.value.items.reduce((a, r) => a + num(r.qtyCetak), 0),
);
const totalPlangkan = computed(() =>
  formData.value.items.reduce((a, r) => a + num(r.jmlPlangkan), 0),
);

// Output produksi = panjang SPK/MAP x jumlah cetak (dihitung, tidak disimpan)
const dibulatkan2 = (n: number) => Math.round(n * 100) / 100;
const outputProduksi = (r: FormRow) =>
  dibulatkan2(num(r.panjang) * num(r.qtyCetak));
const akumulasiTotal = computed(() =>
  dibulatkan2(formData.value.items.reduce((a, r) => a + outputProduksi(r), 0)),
);
const fmt2 = (n: number) =>
  n.toLocaleString("id-ID", { maximumFractionDigits: 2 });

const validateSave = () => {
  const h = formData.value.header;
  if (!h.tanggal) {
    toast.warning("Tanggal tidak boleh kosong.");
    return;
  }
  if (!isLegacy.value && !h.sesi) {
    toast.warning("Sesi belum dipilih.");
    return;
  }
  if (!h.kodePabrik) {
    toast.warning("Lokasi belum dipilih.");
    return;
  }
  for (const [label, v] of [
    ["Kary. Borongan", h.karBorongan],
    ["Kary. Harian", h.karHarian],
  ] as const) {
    const n = num(v);
    if (!Number.isInteger(n) || n < 0) {
      toast.warning(`${label} harus bilangan bulat tidak negatif.`);
      return;
    }
  }

  const terisi = formData.value.items
    .map((r, i) => ({ r, no: i + 1 }))
    .filter(({ r }) => r.spk.trim() !== "");
  if (terisi.length === 0) {
    toast.warning("Minimal satu baris SPK/MAP harus diisi.");
    return;
  }

  const sudah = new Map<string, number>();
  for (const { r, no } of terisi) {
    const kunci = r.spk.trim().toUpperCase();
    const pertama = sudah.get(kunci);
    if (pertama !== undefined) {
      toast.warning(`Baris ${no}: SPK/MAP sama dengan baris ${pertama}.`);
      return;
    }
    sudah.set(kunci, no);

    const c = num(r.qtyCetak);
    if (!Number.isInteger(c) || c <= 0) {
      toast.warning(`Baris ${no}: J. Cetak harus bilangan bulat lebih dari 0.`);
      return;
    }
    const p = num(r.jmlPlangkan);
    if (!Number.isInteger(p) || p < 0) {
      toast.warning(
        `Baris ${no}: Jumlah Plangkan harus bilangan bulat tidak negatif.`,
      );
      return;
    }
  }

  showSaveDialog.value = true;
};

// ── Setelah simpan: tutup, atau input baru ──
const resetBaru = () => {
  showSelesai.value = false;
  if (isEditMode.value) {
    router.replace({ name: "SpandukLhkCetakCreate" });
    return;
  }
  formData.value = defaultData();
  isiLokasiDefault();
};

const tutupSetelahSimpan = () => {
  showSelesai.value = false;
  goBack();
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah LHK Cetak' : 'Tambah LHK Cetak'"
    menu-id="4"
    :icon="IconPrinter"
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
            :max="todayLocal"
            @change="muatKaryawan"
          />
        </div>

        <div class="fr">
          <label class="lbl">Sesi</label>
          <select
            v-model="formData.header.sesi"
            class="inp"
            style="width: 110px"
            :disabled="isEditMode"
            @change="onSesiChange"
          >
            <option value="" disabled>Pilih...</option>
            <option value="PAGI">Pagi</option>
            <option value="SIANG">Siang</option>
          </select>
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">Lokasi</label>
          <select
            v-model="formData.header.kodePabrik"
            class="inp"
            style="width: 90px"
            :disabled="!isSuperadmin || isEditMode"
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

        <div class="sep" />

        <div class="fr">
          <label class="lbl">Kary. Borongan</label>
          <input
            v-model.number="formData.header.karBorongan"
            type="number"
            min="0"
            step="1"
            class="inp tr"
            style="width: 90px"
            v-select-on-focus
          />
        </div>

        <div class="fr">
          <label class="lbl">Kary. Harian</label>
          <input
            v-model.number="formData.header.karHarian"
            type="number"
            min="0"
            step="1"
            class="inp tr"
            style="width: 90px"
            v-select-on-focus
          />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl" title="Jumlah Output Produksi semua baris">
            Akumulasi Total
          </label>
          <input
            :value="fmt2(akumulasiTotal)"
            readonly
            class="inp ro tr"
            style="width: 110px"
          />
        </div>
      </div>
    </template>

    <!-- ══ KOLOM KANAN ══ -->
    <template #right-column>
      <div class="lhk-right">
        <!-- Grid SPK -->
        <div class="blok" style="flex: 0 0 auto">
          <div class="tbl-header">
            <span class="tbl-title">Rincian SPK / MAP</span>
            <button type="button" class="btn-add" @click="addRow">
              + Tambah Baris
            </button>
          </div>
          <div class="tbl-wrap" style="max-height: 260px; min-height: 110px">
            <table class="gt" style="min-width: 960px">
              <thead>
                <tr>
                  <th style="width: 32px" class="tc">No</th>
                  <th style="width: 160px">Nomor SPK</th>
                  <th style="width: 220px">Nama Order</th>
                  <th style="width: 80px" class="tr">Jml Order</th>
                  <th style="width: 65px" class="tr">Panjang</th>
                  <th style="width: 65px" class="tr">Lebar</th>
                  <th style="width: 85px" class="tr bg-yellow">J. Cetak</th>
                  <th style="width: 95px" class="tr bg-yellow">J. Plangkan</th>
                  <th style="width: 110px" class="tr">Output Produksi</th>
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
                        :ref="(el) => simpanRef(el, `${idx}_spk`)"
                        @keydown.enter.prevent="onEnterSpk($event, idx)"
                        @keydown.f1.prevent="openLookupSpk(idx)"
                        @blur="onBlurSpk($event, idx)"
                      />
                      <button
                        type="button"
                        class="ci-btn"
                        title="Cari SPK/MAP"
                        @click="openLookupSpk(idx)"
                      >
                        <IconSearch :size="11" />
                      </button>
                    </div>
                  </td>
                  <td class="p0 td-wrap">
                    <div class="ci-wrap ro" :title="row.nama">
                      {{ row.nama }}
                    </div>
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
                      v-model.number="row.qtyCetak"
                      type="number"
                      min="0"
                      step="1"
                      class="ci tr bg-yellow-light"
                      :ref="(el) => simpanRef(el, `${idx}_cetak`)"
                      @keydown.enter.prevent="onEnterCetak(idx)"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.jmlPlangkan"
                      type="number"
                      min="0"
                      step="1"
                      class="ci tr bg-yellow-light"
                      :ref="(el) => simpanRef(el, `${idx}_plg`)"
                      @keydown.enter.prevent="onEnterPlangkan(idx)"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      :value="fmt2(outputProduksi(row))"
                      class="ci tr ro"
                      readonly
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
                  <td colspan="6" class="tr fw">Total</td>
                  <td class="tr fw">{{ totalCetak }}</td>
                  <td class="tr fw">{{ totalPlangkan }}</td>
                  <td />
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Grid Karyawan -->
        <div class="blok" style="flex: 1; min-height: 0">
          <div class="tbl-header tbl-header-sub">
            <span class="tbl-title">
              Karyawan ({{ formData.karyawan.length }})
            </span>
            <span v-if="isLoadingKaryawan" class="tbl-info">Memuat...</span>
            <button
              v-else-if="!isEditMode"
              type="button"
              class="btn-add"
              @click="muatKaryawan"
            >
              Muat Ulang
            </button>
          </div>
          <div class="tbl-wrap" style="flex: 1; min-height: 120px">
            <table class="gt" style="min-width: 560px">
              <thead>
                <tr>
                  <th style="width: 32px" class="tc">No</th>
                  <th style="width: 110px">NIK</th>
                  <th style="width: 260px">Nama</th>
                  <template v-if="isLegacy">
                    <th style="width: 90px" class="tr">Absensi</th>
                    <th style="width: 90px" class="tr">Lembur</th>
                  </template>
                  <template v-else>
                    <th style="width: 100px" class="tr">Jam Kerja</th>
                    <th style="width: 100px" class="tr">Lembur</th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <tr v-if="formData.karyawan.length === 0">
                  <td colspan="5" class="kosong">
                    {{
                      isEditMode
                        ? "Tidak ada karyawan tercatat."
                        : "Pilih Sesi dan Lokasi. Daftar terisi otomatis dari absensi hari ini."
                    }}
                  </td>
                </tr>
                <tr v-for="(k, i) in formData.karyawan" :key="k.nik">
                  <td class="tc gt-lbl">{{ i + 1 }}</td>
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
                  <template v-if="isLegacy">
                    <td class="p0">
                      <input :value="k.absensi" class="ci tr ro" readonly />
                    </td>
                    <td class="p0">
                      <input :value="k.lembur" class="ci tr ro" readonly />
                    </td>
                  </template>
                  <template v-else>
                    <td class="p0">
                      <input :value="k.jamKerja" class="ci tr ro" readonly />
                    </td>
                    <td class="p0">
                      <input :value="k.jamLembur" class="ci tr ro" readonly />
                    </td>
                  </template>
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
    @selected="onSpkSelected"
  />

  <!-- Setelah simpan -->
  <v-dialog v-model="showSelesai" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconPrinter class="mr-2" :size="20" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-2">
          LHK Cetak <b>{{ nomorTerakhir }}</b> telah disimpan.
        </div>
        <div class="text-body-2 text-grey-darken-1">
          Mau input LHK Cetak baru?
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
.tbl-header-sub {
  background: #546e7a;
}
.tbl-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.tbl-info {
  font-size: 10px;
  font-style: italic;
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
/* Nama Order: teks panjang dibungkus supaya terbaca seluruhnya */
.gt tbody td.td-wrap {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  vertical-align: top;
}
.ci-wrap {
  min-height: 25px;
  padding: 4px 5px;
  font-size: 11px;
  line-height: 1.3;
  box-sizing: border-box;
  white-space: normal;
  overflow-wrap: anywhere;
  color: #212121;
}
</style>
