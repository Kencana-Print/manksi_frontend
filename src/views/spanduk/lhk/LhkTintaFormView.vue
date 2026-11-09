<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import LhkCetakSearchModal from "@/components/lookups/LhkCetakSearchModal.vue";
import { useForm } from "@/composables/useForm";
import { IconPalette, IconSearch } from "@tabler/icons-vue";
import * as lhkForm from "@/services/spanduk/lhk/lhkTintaFormService";
import type {
  BahanOption,
  CetakOption,
  LhkTintaBahan,
  LhkTintaPayload,
  LhkTintaSpk,
  SaveResponse,
} from "@/services/spanduk/lhk/lhkTintaFormService";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);

const formatDateLocal = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const todayLocal = formatDateLocal(new Date());

// ── Model data ──
interface SpkRow {
  spk: string;
  nama: string;
  jumlahOrder: number;
  panjang: number;
  lebar: number;
}

interface BahanRow {
  kode: string;
  nama: string;
  satuan: string; // satuan master (KG / LITER)
  stok: number | null; // stok per lokasi, null = lokasi belum dipilih
  kg: string; // teks agar kosong = tidak dipakai
  ons: string;
  gram: string;
  nonaktif: boolean; // sudah tercatat di LHK tapi kini tidak ada di daftar aktif
}

interface FormState {
  header: {
    nomor: string;
    tanggal: string;
    nomorCetak: string;
    tanggalCetak: string;
    kodePabrik: string;
    namaPabrik: string;
  };
  spk: SpkRow[];
  bahan: BahanRow[];
}

const num = (v: unknown) => Number(v) || 0;

const defaultData = (): FormState => ({
  header: {
    nomor: "",
    tanggal: todayLocal,
    nomorCetak: "",
    tanggalCetak: "",
    kodePabrik: "",
    namaPabrik: "",
  },
  spk: [],
  bahan: [],
});

const spkDariServer = (r: LhkTintaSpk): SpkRow => ({
  spk: r.Nomor_SPK,
  nama: r.Nama_SPK ?? "",
  jumlahOrder: num(r.Jumlah_Order),
  panjang: num(r.Panjang),
  lebar: num(r.Lebar),
});

// ── Qty & konversi satuan ──
// Hanya untuk tampilan. Hasil yang disimpan dihitung server (sumber kebenaran).
// Total dalam satuan master (KG/LITER), sama dengan LHK Proof:
// 1 ons = 0,1 dan 1 gram = 0,001
const FAKTOR_ONS = 0.1;
const FAKTOR_GRAM = 0.001;

type KolomQty = "kg" | "ons" | "gram";
const URUTAN: KolomQty[] = ["kg", "ons", "gram"];

const round4 = (n: number) => Math.round(n * 10000) / 10000;

const tampilAngka = (n: number) =>
  n.toLocaleString("id-ID", { maximumFractionDigits: 4 });

// Koma boleh dipakai sebagai pemisah desimal; maksimal 4 desimal
const normQty = (s: string) => s.trim().replace(",", ".");

// Kosong dianggap 0; null = format salah
const parseQty = (s: string): number | null => {
  const t = normQty(s);
  if (t === "") {
    return 0;
  }
  return /^\d+(\.\d{1,4})?$/.test(t) ? Number(t) : null;
};

const barisTerisi = (b: BahanRow) =>
  b.kg.trim() !== "" || b.ons.trim() !== "" || b.gram.trim() !== "";

const kolomInvalid = (b: BahanRow, k: KolomQty) => parseQty(b[k]) === null;

// null bila ada kolom yang formatnya salah
const totalBaris = (b: BahanRow): number | null => {
  const kg = parseQty(b.kg);
  const ons = parseQty(b.ons);
  const gram = parseQty(b.gram);
  if (kg === null || ons === null || gram === null) {
    return null;
  }
  return round4(kg + ons * FAKTOR_ONS + gram * FAKTOR_GRAM);
};

const tampilTotal = (b: BahanRow): string => {
  if (!barisTerisi(b)) {
    return "";
  }
  const t = totalBaris(b);
  return t === null ? "" : tampilAngka(t);
};

const stokKurang = (b: BahanRow): boolean => {
  const t = totalBaris(b);
  return b.stok !== null && t !== null && t > round4(b.stok);
};

const labelSatuan = (s: string) => (s && s !== "0" ? s : "-");

// Total tersimpan (satuan master) dipecah ke KG/Ons/Gram untuk ditampilkan.
// Dihitung dalam satuan 0,0001 supaya total tidak bergeser saat disimpan ulang.
const pecahQty = (total: number) => {
  const t = Math.round(total * 10000);
  const sisa = t % 10000;
  const teks = (n: number) => (n > 0 ? String(n) : "");
  return {
    kg: teks(Math.floor(t / 10000)),
    ons: teks(Math.floor(sisa / 1000)),
    gram: teks((sisa % 1000) / 10),
  };
};

// Gabungkan daftar obat aktif dengan isian yang sudah tersimpan.
// Obat tersimpan yang tidak ada di daftar ditambahkan di bawah.
const susunBahan = (
  master: BahanOption[],
  tersimpan: LhkTintaBahan[],
): BahanRow[] => {
  const peta = new Map(tersimpan.map((t) => [t.Kode_Bahan, t]));
  const baris: BahanRow[] = master.map((m) => {
    const t = peta.get(m.Kode);
    return {
      kode: m.Kode,
      nama: m.Nama,
      satuan: m.Satuan,
      stok: m.Stok,
      ...(t ? pecahQty(t.Qty) : { kg: "", ons: "", gram: "" }),
      nonaktif: false,
    };
  });
  const ada = new Set(master.map((m) => m.Kode));
  for (const t of tersimpan) {
    if (ada.has(t.Kode_Bahan)) {
      continue;
    }
    baris.push({
      kode: t.Kode_Bahan,
      nama: t.Nama_Bahan ?? t.Kode_Bahan,
      satuan: t.Satuan ?? "",
      stok: null,
      ...pecahQty(t.Qty),
      nonaktif: true,
    });
  }
  return baris;
};

// ── State UI ──
const showSelesai = ref(false);
const nomorTerakhir = ref("");
const cari = ref("");
const hanyaTerisi = ref(false);
const lewatBatas = ref(false); // LHK Cetak terpilih sudah lewat h+7 (hanya penanda)

const bangunPayload = (data: FormState): LhkTintaPayload => ({
  Tanggal: data.header.tanggal,
  Kode_Pabrik: data.header.kodePabrik,
  Nomor_Cetak: data.header.nomorCetak,
  // Hanya obat yang salah satu kolomnya diisi
  Bahan: data.bahan.filter(barisTerisi).map((b) => ({
    Kode_Bahan: b.kode,
    Kg: normQty(b.kg),
    Ons: normQty(b.ons),
    Gram: normQty(b.gram),
  })),
});

const isiBahanDefault = async () => {
  if (isEditMode.value) {
    return;
  }
  const h = formData.value.header;
  formData.value.bahan = susunBahan(
    await lhkForm.getLookupBahan(h.kodePabrik, ""),
    [],
  );
};

// Stok bergantung pada lokasi: muat ulang setelah LHK Cetak dipilih.
// Isian tidak disentuh, hanya kolom stok.
const segarkanStok = async () => {
  const h = formData.value.header;
  try {
    const master = await lhkForm.getLookupBahan(h.kodePabrik, h.nomor);
    const peta = new Map(master.map((m) => [m.Kode, m.Stok]));
    for (const b of formData.value.bahan) {
      b.stok = peta.get(b.kode) ?? null;
    }
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat stok obat."));
  }
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
  menuId: "4",
  initialData: defaultData(),
  fetchApi: async (): Promise<FormState> => {
    const d = await lhkForm.getById(String(route.params.nomor));
    // stok per lokasi LHK ini, tanpa pemakaian LHK itu sendiri
    const master = await lhkForm.getLookupBahan(d.Kode_Pabrik ?? "", d.Nomor);
    return {
      header: {
        nomor: d.Nomor,
        tanggal: d.Tanggal,
        nomorCetak: d.Nomor_Cetak ?? "",
        tanggalCetak: d.Tanggal_Cetak ?? "",
        kodePabrik: d.Kode_Pabrik ?? "",
        namaPabrik: d.Nama_Pabrik ?? "",
      },
      spk: d.Detail.map(spkDariServer),
      bahan: susunBahan(master, d.Bahan),
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
    isiBahanDefault().catch(() => undefined);
  },
});

onMounted(async () => {
  try {
    await isiBahanDefault();
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat daftar bahan."));
  }
  // Dari baris merah browse: ?cetak=<nomor LHK Cetak>
  const cetak = route.query.cetak;
  if (!isEditMode.value && typeof cetak === "string" && cetak.trim()) {
    if (await pilihCetak(cetak)) {
      await fokusKunci("cari");
    }
  }
});

// ── Daftar obat: filter cari + hanya yang terisi ──
const bahanTampil = computed(() => {
  const kata = cari.value.trim().toUpperCase();
  return formData.value.bahan.filter(
    (b) =>
      (!hanyaTerisi.value || barisTerisi(b)) &&
      (!kata || b.nama.toUpperCase().includes(kata) || b.kode.includes(kata)),
  );
});

const jumlahTerisi = computed(
  () => formData.value.bahan.filter(barisTerisi).length,
);

const jumlahStokKurang = computed(
  () => formData.value.bahan.filter(stokKurang).length,
);

// ── Fokus & Enter ──
const fieldRefs = ref<Record<string, HTMLInputElement | HTMLSelectElement>>({});

const simpanRef = (el: unknown, kunci: string) => {
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
    fieldRefs.value[kunci] = el;
  }
};

const fokusKunci = async (kunci: string) => {
  await nextTick();
  const el = fieldRefs.value[kunci];
  if (el) {
    el.focus();
    if (el instanceof HTMLInputElement) {
      el.select();
    }
  }
};

// Enter: KG → Ons → Gram → KG obat berikutnya pada daftar yang tampil
const onEnterQty = async (kode: string, kolom: KolomQty) => {
  const i = URUTAN.indexOf(kolom);
  if (i < URUTAN.length - 1) {
    await fokusKunci(`${URUTAN[i + 1]}_${kode}`);
    return;
  }
  const daftar = bahanTampil.value;
  const berikut = daftar[daftar.findIndex((b) => b.kode === kode) + 1];
  if (berikut) {
    await fokusKunci(`kg_${berikut.kode}`);
  }
};

// ── LHK Cetak (rujukan) ──
const pilihCetak = async (nomorInput: string): Promise<boolean> => {
  const nomor = nomorInput.trim();
  if (!nomor) {
    return false;
  }
  try {
    const info = await lhkForm.getInfoCetak(nomor);
    if (!["", "Y"].includes((info.Apv_Status ?? "").trim())) {
      toast.warning(
        `LHK Cetak ${info.Nomor} belum disetujui (menunggu atau ditolak approval).`,
      );
      return false;
    }
    const h = formData.value.header;
    h.nomorCetak = info.Nomor;
    h.tanggalCetak = info.Tanggal;
    h.kodePabrik = info.Kode_Pabrik ?? "";
    h.namaPabrik = info.Nama_Pabrik ?? "";
    formData.value.spk = info.Detail.map(spkDariServer);
    lewatBatas.value = info.Lewat_Batas === 1;
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat LHK Cetak."));
    return false;
  }
  await segarkanStok();
  return true;
};

const showCetakModal = ref(false);

const bukaCetak = () => {
  if (isEditMode.value) {
    return;
  }
  showCetakModal.value = true;
};

// Modal menutup dirinya sendiri setelah event selected
const onCetakDipilih = async (c: CetakOption) => {
  if (await pilihCetak(c.Nomor)) {
    await fokusKunci("cari");
  }
};

// Ketik nomor lalu Enter
const onEnterCetak = async (e: KeyboardEvent) => {
  if (isEditMode.value) {
    return;
  }
  const el = e.target as HTMLInputElement;
  if (!el.value.trim()) {
    return;
  }
  if (await pilihCetak(el.value)) {
    await fokusKunci("cari");
  } else {
    el.value = formData.value.header.nomorCetak; // balikkan ke nilai valid terakhir
    el.select();
  }
};

// Keluar dari field tanpa Enter: buang ketikan yang belum divalidasi
const onBlurCetak = (e: FocusEvent) => {
  (e.target as HTMLInputElement).value = formData.value.header.nomorCetak;
};

// ── Validasi sebelum konfirmasi simpan ──
const validateSave = () => {
  const { tanggal, tanggalCetak, nomorCetak } = formData.value.header;
  if (!tanggal) {
    toast.warning("Tanggal tidak boleh kosong.");
    return;
  }
  if (!nomorCetak) {
    toast.warning("LHK Cetak belum dipilih.");
    return;
  }
  if (tanggalCetak && tanggal < tanggalCetak) {
    toast.warning(
      `Tanggal tidak boleh lebih awal dari tanggal LHK Cetak (${tanggalCetak}).`,
    );
    return;
  }

  const terisi = formData.value.bahan.filter(barisTerisi);
  if (terisi.length === 0) {
    toast.warning("Minimal satu pemakaian obat harus diisi.");
    return;
  }
  for (const b of terisi) {
    const total = totalBaris(b);
    if (total === null) {
      toast.warning(
        `${b.nama}: KG/Ons/Gram harus angka 0 atau lebih (maksimal 4 desimal).`,
      );
      return;
    }
    if (total <= 0) {
      toast.warning(
        `${b.nama}: jumlah harus lebih dari 0, atau kosongkan barisnya.`,
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
    router.replace({ name: "SpandukLhkTintaCreate" });
    return;
  }
  formData.value = defaultData();
  cari.value = "";
  hanyaTerisi.value = false;
  lewatBatas.value = false;
  isiBahanDefault().catch(() => undefined);
};

const tutupSetelahSimpan = () => {
  showSelesai.value = false;
  goBack();
};
</script>

<template>
  <BaseForm
    :title="
      isEditMode ? 'Ubah LHK Pemakaian Obat' : 'Tambah LHK Pemakaian Obat'
    "
    menu-id="4"
    :icon="IconPalette"
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
          <label class="lbl">LHK Cetak</label>
          <div class="cell-grp cetak-grp">
            <input
              :value="formData.header.nomorCetak"
              class="ci"
              :class="{ ro: isEditMode }"
              :readonly="isEditMode"
              placeholder="Ketik nomor + Enter / F1 cari"
              autocomplete="off"
              :ref="(el) => simpanRef(el, 'cetak')"
              @keydown.enter.prevent="onEnterCetak"
              @keydown.f1.prevent="bukaCetak"
              @blur="onBlurCetak"
            />
            <button
              v-if="!isEditMode"
              type="button"
              class="ci-btn"
              title="Cari LHK Cetak"
              @click="bukaCetak"
            >
              <IconSearch :size="11" />
            </button>
          </div>
        </div>

        <div class="fr">
          <label class="lbl">Tgl Cetak</label>
          <input
            :value="formData.header.tanggalCetak"
            readonly
            class="inp ro"
            style="width: 150px"
          />
        </div>

        <div class="fr">
          <label class="lbl">Lokasi</label>
          <input
            :value="formData.header.kodePabrik"
            readonly
            class="inp ro"
            style="width: 90px"
          />
          <input
            :value="formData.header.namaPabrik"
            readonly
            class="inp ro ml-1"
            style="flex: 1"
          />
        </div>

        <div v-if="lewatBatas" class="peringatan">
          LHK Cetak ini sudah lewat batas input (h+7 dari tanggal LHK Cetak).
          Tetap bisa disimpan, tetapi akan ditandai terlambat.
        </div>

        <div v-if="isEditMode" class="catatan">
          LHK Cetak tidak dapat diubah. Hapus lalu buat LHK Pemakaian Obat baru
          bila salah pilih.
        </div>
      </div>
    </template>

    <!-- ══ KOLOM KANAN ══ -->
    <template #right-column>
      <div class="lhk-right">
        <div class="tbl-header" style="flex-shrink: 0">
          <span class="tbl-title">SPK / MAP pada LHK Cetak</span>
          <span class="hint">{{ formData.spk.length }} baris</span>
        </div>
        <div class="tbl-wrap" style="max-height: 170px; flex-shrink: 0">
          <table class="gt" style="min-width: 640px">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 150px">Nomor SPK/MAP</th>
                <th>Nama Order</th>
                <th style="width: 80px" class="tr">Jml Order</th>
                <th style="width: 70px" class="tr">Panjang</th>
                <th style="width: 70px" class="tr">Lebar</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, idx) in formData.spk" :key="r.spk">
                <td class="tc gt-lbl">{{ idx + 1 }}</td>
                <td class="gt-ro">{{ r.spk }}</td>
                <td class="gt-ro" :title="r.nama">{{ r.nama }}</td>
                <td class="gt-ro tr">{{ r.jumlahOrder }}</td>
                <td class="gt-ro tr">{{ r.panjang }}</td>
                <td class="gt-ro tr">{{ r.lebar }}</td>
              </tr>
              <tr v-if="formData.spk.length === 0">
                <td colspan="6" class="plg-kosong-sel">
                  Pilih LHK Cetak untuk menampilkan SPK/MAP-nya.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pemakaian obat: semua obat dalam daftar, isi yang dipakai saja -->
        <div class="plg">
          <div class="tbl-header tbl-header-sub">
            <span class="tbl-title">Pemakaian Obat</span>
            <span class="hint"
              >1 ons = 0,1 · 1 gram = 0,001 (satuan master)</span
            >
          </div>
          <div class="cari-row">
            <input
              v-model="cari"
              class="inp"
              style="flex: 1"
              placeholder="Cari obat (nama / kode)..."
              autocomplete="off"
              :ref="(el) => simpanRef(el, 'cari')"
            />
            <label class="chk">
              <input type="checkbox" v-model="hanyaTerisi" />
              Hanya yang terisi
            </label>
            <span class="cnt">{{ jumlahTerisi }} terisi</span>
            <span v-if="jumlahStokKurang > 0" class="cnt-warn">
              {{ jumlahStokKurang }} stok kurang
            </span>
          </div>
          <div class="tbl-wrap plg-wrap">
            <table class="gt" style="min-width: 720px">
              <thead>
                <tr>
                  <th style="width: 70px" class="tc">Kode</th>
                  <th>Obat</th>
                  <th style="width: 60px">Satuan</th>
                  <th style="width: 80px" class="tr">Stok</th>
                  <th style="width: 85px" class="tr bg-yellow">KG/LTR</th>
                  <th style="width: 70px" class="tr bg-yellow">Ons</th>
                  <th style="width: 70px" class="tr bg-yellow">Gram</th>
                  <th style="width: 100px" class="tr">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in bahanTampil" :key="b.kode">
                  <td class="tc gt-lbl">{{ b.kode }}</td>
                  <td class="gt-ro" :title="b.nama">
                    {{ b.nama }}
                    <span v-if="b.nonaktif" class="tag-nonaktif"
                      >di luar daftar</span
                    >
                  </td>
                  <td class="gt-lbl">{{ labelSatuan(b.satuan) }}</td>
                  <td
                    class="gt-lbl tr"
                    :class="{ 'stok-kurang': stokKurang(b) }"
                  >
                    {{ b.stok === null ? "-" : tampilAngka(b.stok) }}
                  </td>
                  <td v-for="k in URUTAN" :key="k" class="p0">
                    <input
                      v-model="b[k]"
                      type="text"
                      inputmode="decimal"
                      autocomplete="off"
                      class="ci tr bg-yellow-light"
                      :class="{ 'qty-bad': kolomInvalid(b, k) }"
                      :ref="(el) => simpanRef(el, `${k}_${b.kode}`)"
                      @keydown.enter.prevent="onEnterQty(b.kode, k)"
                      v-select-on-focus
                    />
                  </td>
                  <td
                    class="gt-lbl tr"
                    :class="{ 'stok-kurang': stokKurang(b) }"
                  >
                    {{ tampilTotal(b) }}
                  </td>
                </tr>
                <tr v-if="bahanTampil.length === 0">
                  <td colspan="8" class="plg-kosong-sel">
                    Tidak ada obat yang cocok.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <LhkCetakSearchModal v-model="showCetakModal" @selected="onCetakDipilih" />

  <!-- Setelah simpan: pengganti Save & New / Save & Close -->
  <v-dialog v-model="showSelesai" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconPalette class="mr-2" :size="20" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-2">
          LHK Pemakaian Obat <b>{{ nomorTerakhir }}</b> telah disimpan.
        </div>
        <div class="text-body-2 text-grey-darken-1">
          Mau input LHK Pemakaian Obat baru?
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
  background: #fff8e1 !important;
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

/* Pemakaian tinta */
.plg {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
}
.plg-wrap {
  flex: 1;
  min-height: 0;
}
.plg-tbl {
  width: 100%;
}
.plg-kosong {
  padding: 14px 10px;
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
  color: #757575;
  font-style: italic;
  font-size: 11px;
}

.hint {
  font-size: 10px;
  opacity: 0.85;
}
.catatan {
  margin-top: 6px;
  font-size: 10px;
  color: #757575;
  font-style: italic;
}
.cetak-grp {
  flex: 1;
  border: 1px solid #a0a0a0;
  background: white;
}
.cari-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 6px;
  border: 1px solid #bdbdbd;
  border-top: none;
  background: #fafafa;
  flex-shrink: 0;
}
.chk {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #333;
  white-space: nowrap;
  cursor: pointer;
}
.cnt {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  white-space: nowrap;
}
.gt-ro {
  padding: 0 6px;
  font-size: 11px;
}
.ci.qty-bad {
  background: #ffebee !important;
  outline: 1px solid #d32f2f;
  outline-offset: -1px;
}
.tag-nonaktif {
  margin-left: 6px;
  font-size: 9px;
  color: #b71c1c;
  border: 1px solid #b71c1c;
  border-radius: 2px;
  padding: 0 3px;
}
.peringatan {
  margin-top: 6px;
  padding: 5px 8px;
  font-size: 10px;
  color: #e65100;
  background: #fff3e0;
  border: 1px solid #ffb74d;
  border-radius: 2px;
}
.cnt-warn {
  font-size: 11px;
  font-weight: 700;
  color: #d32f2f;
  white-space: nowrap;
}
.gt tbody td.stok-kurang {
  color: #d32f2f;
  font-weight: 700;
}
.plg-kosong-sel {
  padding: 12px 10px;
  color: #757575;
  font-style: italic;
  text-align: center;
}
</style>
