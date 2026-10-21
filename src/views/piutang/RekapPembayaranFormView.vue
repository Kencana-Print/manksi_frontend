<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import { useForm } from "@/composables/useForm";
import {
  IconCalendarDue,
  IconDownload,
  IconPrinter,
  IconSearch,
  IconTrash,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-vue";
import { pesanError } from "@/services/piutang/rekapPembayaranService";
import {
  rekapPembayaranFormService as svc,
  type InfoNota,
  type RekapPayload,
  type SaveHasil,
  type TagihanItem,
} from "@/services/piutang/rekapPembayaranFormService";

interface BarisForm {
  key: number;
  kategori: string;
  kategoriUrut: number;
  supKode: string;
  supNama: string;
  bulanTagihan: string;
  tipe: string;
  nota: string;
  tglNota: string;
  sisaNota: number;
  tersedia: number;
  nominal: number;
  tglRencana: string;
  fakturPajak: string;
  invoice: string;
  keterangan: string;
  vouNomor: string;
}

interface RekapForm {
  nomor: string;
  tanggal: string;
  keterangan: string;
  status: string;
  alasanBatal: string;
  bisaUbah: boolean;
  detail: BarisForm[];
}

interface Grup {
  key: string;
  supKode: string;
  supNama: string;
  bulanTagihan: string;
  tipe: string;
  total: number;
  terkunci: boolean;
  rows: BarisForm[];
}

interface Kelompok {
  kategori: string;
  subtotal: number;
  grup: Grup[];
}

const route = useRoute();
const toast = useToast();

const nomorEdit = computed(() =>
  typeof route.params.nomor === "string" ? route.params.nomor : "",
);

// ── Helper ──
const pad = (n: number) => String(n).padStart(2, "0");
const tglLokal = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hariIni = (): string => tglLokal(new Date());
const bulanIni = (): string => hariIni().slice(0, 7);
const awalTigaBulan = (): string => {
  const d = new Date();
  return tglLokal(new Date(d.getFullYear(), d.getMonth() - 2, 1));
};
const fmtTgl = (v: string | null | undefined): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ""));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "-";
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const numFmt = (v: number): string =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(v || 0);
// "1.500.000,5" atau "1500000,5" → 1500000.5
const parseNum = (v: string): number =>
  Number(v.replace(/\./g, "").replace(",", ".")) || 0;
const isBulan = (v: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

const TIPE_MINUS = ["RET", "PJG"];
const isMinus = (tipe: string) => TIPE_MINUS.includes(tipe);

let seq = 0;

const buatInitial = (): RekapForm => ({
  nomor: "",
  tanggal: hariIni(),
  keterangan: "",
  status: "AKTIF",
  alasanBatal: "",
  bisaUbah: true,
  detail: [],
});

const showPrintDialog = ref(false);
const savedNomor = ref("");

// ── useForm ──
const {
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData: form,
  goBack,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<RekapForm>({
  menuId: "970",
  initialData: buatInitial(),
  fetchApi: async (): Promise<RekapForm> => {
    const res = await svc.getById(nomorEdit.value);
    const d = res.data.data;

    // Sisa & batas terbaru per nota (maks 10 paralel). Rekap BATAL hanya dilihat.
    const infoMap = new Map<string, InfoNota | null>();
    if (d.bisaUbah) {
      const unik = [
        ...new Map(
          d.detail
            .filter((r) => !r.vouNomor)
            .map((r) => [`${r.tipe}|${r.nota}|${r.supKode}`, r]),
        ).values(),
      ];
      for (let i = 0; i < unik.length; i += 10) {
        await Promise.all(
          unik.slice(i, i + 10).map(async (r) => {
            const k = `${r.tipe}|${r.nota}`;
            infoMap.set(k, null);
            try {
              const info = await svc.getInfoNota(
                r.tipe,
                r.nota,
                r.supKode,
                d.nomor,
              );
              infoMap.set(k, info.data.data);
            } catch {
              /* tetap pakai snapshot; batas dicek lagi oleh server saat simpan */
            }
          }),
        );
      }
      if ([...infoMap.values()].some((v) => v === null)) {
        toast.warning(
          "Sebagian nota tidak bisa dimuat ulang. Batas nominal dicek saat simpan.",
        );
      }
    }

    return {
      nomor: d.nomor,
      tanggal: d.tanggal,
      keterangan: d.keterangan,
      status: d.status,
      alasanBatal: d.alasanBatal,
      bisaUbah: d.bisaUbah,
      detail: d.detail.map((r) => {
        const info = infoMap.get(`${r.tipe}|${r.nota}`) ?? null;
        return {
          key: ++seq,
          kategori: r.kategori,
          kategoriUrut: r.kategoriUrut,
          supKode: r.supKode,
          supNama: r.supNama,
          bulanTagihan: r.bulanTagihan,
          tipe: r.tipe,
          nota: r.nota,
          tglNota: r.tglNota ?? "",
          sisaNota: info?.sisaNota ?? Number(r.nilaiNota),
          tersedia: r.vouNomor ? 0 : (info?.tersedia ?? Number(r.nilaiNota)),
          nominal: Math.abs(Number(r.nominal)),
          tglRencana: r.tglRencana ?? "",
          fakturPajak: r.fakturPajak,
          invoice: r.invoice,
          keterangan: r.keterangan,
          vouNomor: r.vouNomor || "",
        };
      }),
    };
  },
  submitApi: async (data: RekapForm): Promise<SaveHasil> => {
    const payload: RekapPayload = {
      tanggal: data.tanggal,
      keterangan: data.keterangan.trim(),
      detail: data.detail
        .filter((b) => !b.vouNomor)
        .map((b) => ({
          supKode: b.supKode,
          bulanTagihan: b.bulanTagihan,
          tipe: b.tipe,
          nota: b.nota,
          nominal: b.nominal,
          tglRencana: b.tglRencana || null,
          fakturPajak: b.fakturPajak.trim(),
          invoice: b.invoice.trim(),
          keterangan: b.keterangan.trim(),
        })),
    };
    const res = nomorEdit.value
      ? await svc.update(nomorEdit.value, payload)
      : await svc.save(payload);
    return res.data.data;
  },
  onSuccess: (response: unknown) => {
    const hasil = response as SaveHasil;
    savedNomor.value = hasil.nomor;
    (hasil.peringatan ?? []).forEach((p) => toast.warning(p));
    showPrintDialog.value = true;
  },
});

const pilihCetak = () => {
  window.open(
    `/piutang/rekap-pembayaran/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  showPrintDialog.value = false;
  goBack();
};

const skipCetak = () => {
  showPrintDialog.value = false;
  goBack();
};

const ro = computed(() => !form.value.bisaUbah);

const kunciGrup = (b: BarisForm): string =>
  `${b.supKode}|${b.bulanTagihan}|${b.tipe}`;

// Kategori (urutan Excel) > kelompok supplier + bulan tagihan + tipe > nota
const kelompok = computed<Kelompok[]>(() => {
  const urut = [...form.value.detail].sort(
    (a, b) =>
      a.kategoriUrut - b.kategoriUrut ||
      a.supNama.localeCompare(b.supNama) ||
      a.bulanTagihan.localeCompare(b.bulanTagihan) ||
      a.nota.localeCompare(b.nota),
  );
  const peta = new Map<string, Kelompok>();
  const petaGrup = new Map<string, Grup>();
  for (const b of urut) {
    const kel = peta.get(b.kategori) ?? {
      kategori: b.kategori,
      subtotal: 0,
      grup: [],
    };
    peta.set(b.kategori, kel);

    const k = kunciGrup(b);
    let g = petaGrup.get(k);
    if (!g) {
      g = {
        key: k,
        supKode: b.supKode,
        supNama: b.supNama,
        bulanTagihan: b.bulanTagihan,
        tipe: b.tipe,
        total: 0,
        rows: [],
        terkunci: false,
      };
      petaGrup.set(k, g);
      kel.grup.push(g);
    }
    const nilai = isMinus(b.tipe) ? -b.nominal : b.nominal;
    g.rows.push(b);
    if (b.vouNomor) g.terkunci = true;
    g.total = round2(g.total + nilai);
    kel.subtotal = round2(kel.subtotal + nilai);
  }
  return [...peta.values()];
});

const total = computed(() =>
  round2(
    form.value.detail.reduce(
      (s, b) => s + (isMinus(b.tipe) ? -b.nominal : b.nominal),
      0,
    ),
  ),
);
const jumlahSupplier = computed(
  () => new Set(form.value.detail.map((b) => b.supKode)).size,
);

const hapusBaris = (key: number) => {
  form.value.detail = form.value.detail.filter((b) => b.key !== key);
};

// ── Buka/tutup kelompok (default terbuka) ──
const tertutup = ref<Set<string>>(new Set());
const isBuka = (key: string): boolean => !tertutup.value.has(key);
const toggleGrup = (key: string) => {
  const s = new Set(tertutup.value);
  if (s.has(key)) s.delete(key);
  else s.add(key);
  tertutup.value = s;
};
const bukaSemua = () => {
  tertutup.value = new Set();
};
const tutupSemua = () => {
  tertutup.value = new Set(
    kelompok.value.flatMap((k) => k.grup.map((g) => g.key)),
  );
};

// ── Bulan tagihan di level kelompok: berlaku ke semua nota di dalamnya ──
const onBulanGrup = (g: Grup, e: Event) => {
  const bulan = (e.target as HTMLInputElement).value;
  const lama = g.key;
  for (const b of g.rows) b.bulanTagihan = bulan;
  if (tertutup.value.has(lama)) {
    const s = new Set(tertutup.value);
    s.delete(lama);
    s.add(`${g.supKode}|${bulan}|${g.tipe}`);
    tertutup.value = s;
  }
};

// ── Hapus satu kelompok (pakai konfirmasi) ──
const grupHapus = ref<Grup | null>(null);
const showHapusGrup = ref(false);
const mintaHapusGrup = (g: Grup) => {
  grupHapus.value = g;
  showHapusGrup.value = true;
};
const konfirmasiHapusGrup = () => {
  const g = grupHapus.value;
  if (g) {
    const ada = new Set(g.rows.map((r) => r.key));
    form.value.detail = form.value.detail.filter((b) => !ada.has(b.key));
  }
  showHapusGrup.value = false;
  grupHapus.value = null;
};

// ── Input nominal (teks mentah saat fokus supaya desimal bisa diketik) ──
const editKey = ref<number | null>(null);
const editText = ref("");

const tampilNominal = (b: BarisForm): string =>
  editKey.value === b.key ? editText.value : numFmt(b.nominal);

const onNominalFocus = (b: BarisForm) => {
  editKey.value = b.key;
  editText.value = b.nominal ? String(b.nominal).replace(".", ",") : "";
};
const onNominalInput = (b: BarisForm, e: Event) => {
  editText.value = (e.target as HTMLInputElement).value;
  b.nominal = parseNum(editText.value);
};
const onNominalBlur = (b: BarisForm) => {
  editKey.value = null;
  b.nominal = round2(Math.abs(b.nominal));
  if (b.nominal > b.tersedia + 0.005) {
    toast.warning(
      `Nominal melebihi yang tersedia (${numFmt(b.tersedia)}). Disesuaikan.`,
    );
    b.nominal = b.tersedia;
  }
};

// ── Tarik Tagihan ──
const showTarik = ref(false);
const showSupplierModal = ref(false);
const tarikSupKode = ref("");
const tarikSupNama = ref("");
const tarikSupInput = ref("");
const tarikStart = ref("");
const tarikEnd = ref("");
const tarikBulan = ref("");
const tarikLoading = ref(false);
const tagihan = ref<TagihanItem[]>([]);
const terpilih = ref<string[]>([]);
let tarikReq = 0;

const kunci = (t: { tipe: string; nota: string }) => `${t.tipe}|${t.nota}`;
const sudahAda = (t: TagihanItem) =>
  form.value.detail.some((b) => b.tipe === t.tipe && b.nota === t.nota);

const openTarik = () => {
  tarikReq++;
  tarikSupKode.value = "";
  tarikSupNama.value = "";
  tarikSupInput.value = "";
  tarikStart.value = awalTigaBulan();
  tarikEnd.value = hariIni();
  tarikBulan.value = bulanIni();
  tagihan.value = [];
  terpilih.value = [];
  showTarik.value = true;
};

const loadTagihan = async () => {
  if (!tarikSupKode.value) {
    toast.warning("Pilih supplier dahulu.");
    return;
  }
  if (!tarikStart.value || !tarikEnd.value) {
    toast.warning("Rentang tanggal nota belum diisi.");
    return;
  }
  const myReq = ++tarikReq;
  tarikLoading.value = true;
  try {
    const res = await svc.getTagihan({
      supKode: tarikSupKode.value,
      startDate: tarikStart.value,
      endDate: tarikEnd.value,
      excludeNomor: nomorEdit.value,
    });
    if (myReq !== tarikReq) return;
    tagihan.value = res.data.data ?? [];
    terpilih.value = [];
  } catch (e) {
    if (myReq === tarikReq) {
      toast.error(pesanError(e, "Gagal memuat tagihan."));
      tagihan.value = [];
    }
  } finally {
    if (myReq === tarikReq) tarikLoading.value = false;
  }
};

const applyTarikSupplier = async (kode: string) => {
  const k = kode.trim();
  if (!k) return;
  try {
    const res = await svc.getSupplier(k);
    tarikSupKode.value = res.data.data.kode;
    tarikSupNama.value = res.data.data.nama;
    tarikSupInput.value = res.data.data.kode;
    await loadTagihan();
  } catch (e) {
    toast.error(pesanError(e, "Kode supplier tidak ditemukan."));
    tarikSupInput.value = tarikSupKode.value;
  }
};
const selectSupplier = async (s: { Kode: string }) => {
  showSupplierModal.value = false;
  await applyTarikSupplier(s.Kode);
};

const selectable = computed(() => tagihan.value.filter((t) => !sudahAda(t)));
const allSelected = computed(
  () =>
    selectable.value.length > 0 &&
    selectable.value.every((t) => terpilih.value.includes(kunci(t))),
);
const toggleAll = () => {
  terpilih.value = allSelected.value ? [] : selectable.value.map(kunci);
};
const toggleOne = (t: TagihanItem) => {
  if (sudahAda(t)) return;
  const k = kunci(t);
  terpilih.value = terpilih.value.includes(k)
    ? terpilih.value.filter((x) => x !== k)
    : [...terpilih.value, k];
};

const tambahkanTerpilih = () => {
  if (!isBulan(tarikBulan.value)) {
    toast.warning("Isi bulan tagihan dahulu.");
    return;
  }
  const pilih = tagihan.value.filter(
    (t) => terpilih.value.includes(kunci(t)) && !sudahAda(t),
  );
  if (!pilih.length) {
    toast.warning("Pilih minimal satu tagihan.");
    return;
  }
  for (const t of pilih) {
    form.value.detail.push({
      key: ++seq,
      kategori: t.kategori,
      kategoriUrut: t.kategoriUrut,
      supKode: tarikSupKode.value,
      supNama: tarikSupNama.value,
      bulanTagihan: tarikBulan.value,
      tipe: t.tipe,
      nota: t.nota,
      tglNota: t.tanggal,
      sisaNota: t.sisaNota,
      tersedia: t.tersedia,
      nominal: t.tersedia,
      tglRencana: "",
      fakturPajak: "",
      invoice: "",
      keterangan: "",
      vouNomor: "",
    });
  }
  showTarik.value = false;
  toast.success(`${pilih.length} transaksi ditambahkan.`);
};

// ── Validasi (server tetap validasi ulang) ──
const validateSave = () => {
  if (!form.value.bisaUbah) {
    toast.warning("Rekap yang sudah dibatalkan tidak dapat diubah.");
    return;
  }
  if (!form.value.tanggal) {
    toast.warning("Tanggal rekap belum diisi.");
    return;
  }
  if (!form.value.detail.length) {
    toast.warning("Minimal satu transaksi harus diisi.");
    return;
  }
  for (const b of form.value.detail) {
    if (!isBulan(b.bulanTagihan)) {
      toast.warning(`${b.supNama} / ${b.nota}: bulan tagihan belum diisi.`);
      return;
    }
    if (!(b.nominal > 0)) {
      toast.warning(`${b.supNama} / ${b.nota}: nominal harus lebih dari 0.`);
      return;
    }
  }
  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Rekap Pembayaran' : 'Tambah Rekap Pembayaran'"
    menu-id="970"
    :icon="IconCalendarDue"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Rekap Pembayaran"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div v-if="!form.bisaUbah" class="rk-banner">
          DIBATALKAN, hanya lihat. Alasan: {{ form.alasanBatal || "-" }}
        </div>

        <div class="rk-left">
          <div class="f-field">
            <label class="f-lbl">Nomor</label>
            <input :value="form.nomor || 'Otomatis'" readonly class="f-inp" />
          </div>
          <div class="f-field">
            <label class="f-lbl">Tanggal <span class="req">*</span></label>
            <input
              type="date"
              v-model="form.tanggal"
              class="f-inp"
              :disabled="ro"
            />
          </div>
          <div class="f-field">
            <label class="f-lbl">Keterangan</label>
            <textarea
              v-model="form.keterangan"
              class="f-inp f-area"
              rows="3"
              maxlength="200"
              placeholder="Keterangan rekap"
              :disabled="ro"
            />
          </div>

          <div class="rk-ringkas">
            <div class="rk-ringkas-row">
              <span>Supplier</span><b>{{ jumlahSupplier }}</b>
            </div>
            <div class="rk-ringkas-row">
              <span>Transaksi</span><b>{{ form.detail.length }}</b>
            </div>
            <div class="rk-ringkas-row rk-ringkas-total">
              <span>Total Rencana</span><b>{{ numFmt(total) }}</b>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #right-column>
      <div class="rk-toolbar">
        <v-btn v-if="!ro" size="small" color="primary" @click="openTarik">
          <template #prepend><IconDownload :size="14" /></template>
          Tarik Tagihan
        </v-btn>
        <v-spacer />
        <v-btn size="small" variant="text" @click="bukaSemua">Buka Semua</v-btn>
        <v-btn size="small" variant="text" @click="tutupSemua"
          >Tutup Semua</v-btn
        >
      </div>

      <div class="rk-table-wrap">
        <table class="rk-table">
          <thead>
            <tr>
              <th style="width: 34px"></th>
              <th style="min-width: 260px">Supplier</th>
              <th style="width: 150px">Bulan Tagihan</th>
              <th style="width: 60px" class="text-center">Tipe</th>
              <th style="width: 80px" class="text-center">Jml Nota</th>
              <th style="width: 150px" class="text-right">Total Nominal</th>
              <th style="width: 40px"></th>
            </tr>
          </thead>
          <tbody v-for="k in kelompok" :key="k.kategori">
            <tr class="grp-row">
              <td colspan="5">{{ k.kategori }}</td>
              <td class="tr">{{ numFmt(k.subtotal) }}</td>
              <td></td>
            </tr>

            <template v-for="g in k.grup" :key="g.key">
              <tr class="sup-row">
                <td class="td-ctr">
                  <button
                    type="button"
                    class="btn-exp"
                    @click="toggleGrup(g.key)"
                  >
                    <IconChevronDown v-if="isBuka(g.key)" :size="14" />
                    <IconChevronRight v-else :size="14" />
                  </button>
                </td>
                <td class="td-txt">
                  <b>{{ g.supNama }}</b>
                </td>
                <td class="td-inp">
                  <input
                    :value="g.bulanTagihan"
                    type="month"
                    class="cell"
                    :disabled="ro || g.terkunci"
                    @change="onBulanGrup(g, $event)"
                  />
                </td>
                <td class="td-ctr">
                  <b>{{ g.tipe }}</b>
                  <span v-if="isMinus(g.tipe)" class="rk-minus"> (−)</span>
                </td>
                <td class="td-ctr">{{ g.rows.length }}</td>
                <td class="td-txt tr">
                  <b>{{ numFmt(g.total) }}</b>
                </td>
                <td class="td-ctr">
                  <button
                    v-if="!ro && !g.terkunci"
                    type="button"
                    class="btn-del"
                    @click="mintaHapusGrup(g)"
                  >
                    <IconTrash :size="14" />
                  </button>
                </td>
              </tr>

              <tr v-if="isBuka(g.key)" class="sub-row">
                <td></td>
                <td colspan="6">
                  <table class="rk-sub">
                    <thead>
                      <tr>
                        <th style="width: 160px">Nomor Nota</th>
                        <th style="width: 105px" class="text-center">
                          Tgl Nota
                        </th>
                        <th style="width: 120px" class="text-right">
                          Sisa Nota
                        </th>
                        <th style="width: 120px" class="text-right">
                          Tersedia
                        </th>
                        <th style="width: 130px" class="text-right">
                          Nominal Rencana
                        </th>
                        <th style="width: 140px">Tgl Rencana</th>
                        <th style="width: 150px">Faktur Pajak</th>
                        <th style="width: 150px">Invoice Tagihan</th>
                        <th style="min-width: 160px">Keterangan</th>
                        <th style="width: 30px"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="b in g.rows" :key="b.key">
                        <td class="td-txt">
                          {{ b.nota }}
                          <span v-if="b.vouNomor" class="rk-vou">{{
                            b.vouNomor
                          }}</span>
                        </td>
                        <td class="td-ctr" style="font-size: 10px">
                          {{ fmtTgl(b.tglNota) }}
                        </td>
                        <td class="td-txt tr">{{ numFmt(b.sisaNota) }}</td>
                        <td class="td-txt tr">
                          {{ b.vouNomor ? "-" : numFmt(b.tersedia) }}
                        </td>
                        <td class="td-inp">
                          <input
                            :value="tampilNominal(b)"
                            type="text"
                            inputmode="decimal"
                            class="cell tr"
                            :disabled="ro || !!b.vouNomor"
                            @focus="onNominalFocus(b)"
                            @input="onNominalInput(b, $event)"
                            @blur="onNominalBlur(b)"
                          />
                        </td>
                        <td class="td-inp">
                          <input
                            v-model="b.tglRencana"
                            type="date"
                            class="cell"
                            :disabled="ro || !!b.vouNomor"
                          />
                        </td>
                        <td class="td-inp">
                          <input
                            v-model="b.fakturPajak"
                            class="cell"
                            maxlength="30"
                            :disabled="ro"
                          />
                        </td>
                        <td class="td-inp">
                          <input
                            v-model="b.invoice"
                            class="cell"
                            maxlength="50"
                            :disabled="ro"
                          />
                        </td>
                        <td class="td-inp">
                          <input
                            v-model="b.keterangan"
                            class="cell"
                            maxlength="200"
                            :disabled="ro"
                          />
                        </td>
                        <td class="td-ctr">
                          <button
                            v-if="!ro && !b.vouNomor"
                            type="button"
                            class="btn-del"
                            @click="hapusBaris(b.key)"
                          >
                            <IconTrash :size="14" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </template>
          </tbody>
          <tbody v-if="!form.detail.length">
            <tr>
              <td colspan="7" class="text-center text-grey py-4 font-italic">
                Belum ada transaksi. Klik "Tarik Tagihan" untuk memuat tagihan
                supplier.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseForm>

  <SupplierSearchModal v-model="showSupplierModal" @selected="selectSupplier" />

  <!-- Dialog Tarik Tagihan -->
  <v-dialog v-model="showTarik" max-width="1100px" scrollable>
    <v-card class="rounded-lg">
      <v-card-title class="pa-3 text-subtitle-1 text-white bg-primary">
        Tarik Tagihan Supplier
      </v-card-title>
      <v-card-text class="pa-3">
        <div class="tarik-filter">
          <div class="f-field" style="flex: 1; min-width: 260px">
            <label class="f-lbl">Supplier <span class="req">*</span></label>
            <div class="igrp">
              <input
                v-model="tarikSupInput"
                class="f-inp-in"
                style="width: 90px; flex-shrink: 0"
                placeholder="Kode"
                @keydown.enter.prevent="applyTarikSupplier(tarikSupInput)"
                @blur="applyTarikSupplier(tarikSupInput)"
              />
              <input
                :value="tarikSupNama"
                readonly
                class="f-inp-in"
                style="flex: 1; background: #f5f5f5"
                placeholder="Nama supplier"
              />
              <button
                type="button"
                class="blkp"
                @click="showSupplierModal = true"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
          </div>
          <div class="f-field">
            <label class="f-lbl">Tgl Nota Dari</label>
            <input type="date" v-model="tarikStart" class="f-inp" />
          </div>
          <div class="f-field">
            <label class="f-lbl">Sampai</label>
            <input type="date" v-model="tarikEnd" class="f-inp" />
          </div>
          <div class="f-field">
            <label class="f-lbl"
              >Bulan Tagihan <span class="req">*</span></label
            >
            <input type="month" v-model="tarikBulan" class="f-inp" />
          </div>
          <v-btn
            size="small"
            color="primary"
            variant="tonal"
            :loading="tarikLoading"
            @click="loadTagihan"
            >Cari</v-btn
          >
        </div>

        <div style="max-height: 380px; overflow-y: auto; margin-top: 10px">
          <div v-if="tarikLoading" class="text-center py-4 text-grey">
            Memuat...
          </div>
          <table v-else class="mini-table">
            <thead>
              <tr>
                <th style="width: 32px" class="text-center">
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    :disabled="!selectable.length"
                    @change="toggleAll"
                  />
                </th>
                <th>Kategori</th>
                <th style="width: 160px">Nomor</th>
                <th style="width: 105px">Tgl Nota</th>
                <th style="width: 105px">Jatuh Tempo</th>
                <th style="width: 130px" class="text-right">Sisa Nota</th>
                <th style="width: 130px" class="text-right">Rencana Lain</th>
                <th style="width: 130px" class="text-right">Tersedia</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="t in tagihan"
                :key="kunci(t)"
                class="mini-row"
                :class="{
                  'mini-row--selected': terpilih.includes(kunci(t)),
                  'mini-row--used': sudahAda(t),
                }"
                @click="toggleOne(t)"
              >
                <td class="text-center">
                  <input
                    type="checkbox"
                    :checked="terpilih.includes(kunci(t))"
                    :disabled="sudahAda(t)"
                    @click.stop
                    @change="toggleOne(t)"
                  />
                </td>
                <td>
                  {{ t.kategori }}
                  <span v-if="isMinus(t.tipe)" class="rk-minus"> (−)</span>
                </td>
                <td>{{ t.nota }}</td>
                <td>{{ fmtTgl(t.tanggal) }}</td>
                <td>{{ fmtTgl(t.jatuhTempo) }}</td>
                <td class="text-right">{{ numFmt(t.sisaNota) }}</td>
                <td class="text-right">
                  {{ t.rencanaLain ? numFmt(t.rencanaLain) : "-" }}
                </td>
                <td class="text-right">{{ numFmt(t.tersedia) }}</td>
              </tr>
              <tr v-if="!tagihan.length">
                <td colspan="8" class="text-center text-grey py-3">
                  {{
                    tarikSupKode
                      ? "Tidak ada tagihan di rentang ini"
                      : "Pilih supplier untuk memuat tagihan"
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <span class="text-caption text-grey-darken-1">
          {{ terpilih.length }} tagihan dipilih
        </span>
        <v-spacer />
        <v-btn variant="text" color="grey-darken-1" @click="showTarik = false"
          >Batal</v-btn
        >
        <v-btn
          variant="flat"
          color="primary"
          :disabled="!terpilih.length"
          @click="tambahkanTerpilih"
        >
          Tambahkan ({{ terpilih.length }})
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Hapus Kelompok -->
  <v-dialog v-model="showHapusGrup" max-width="400px">
    <v-card class="rounded-lg">
      <v-card-title class="text-h6 pa-4">Hapus Kelompok</v-card-title>
      <v-card-text class="pa-4 pt-0">
        Hapus {{ grupHapus?.rows.length }} transaksi
        {{ grupHapus?.supNama }} ({{ grupHapus?.tipe }}) dari rekap ini?
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="showHapusGrup = false">Batal</v-btn>
        <v-btn color="error" variant="elevated" @click="konfirmasiHapusGrup"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Cetak -->
  <v-dialog v-model="showPrintDialog" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconPrinter :size="18" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold">Rekap Tersimpan</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-3 text-grey-darken-3">
          Nomor <b class="text-primary">{{ savedNomor }}</b> berhasil disimpan.
          Cetak sekarang?
        </div>
        <v-btn color="primary" variant="flat" block @click="pilihCetak"
          >Cetak</v-btn
        >
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="grey-darken-1" @click="skipCetak"
          >Tutup (Tidak Cetak)</v-btn
        >
        <v-spacer />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.rk-banner {
  background: #c62828;
  color: white;
  font-weight: 700;
  text-align: center;
  border-radius: 6px;
  padding: 6px 10px;
  margin-bottom: 10px;
}
.f-field {
  min-width: 0;
}
.f-lbl {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  margin-bottom: 3px;
}
.req {
  color: #e53935;
}
.f-inp {
  width: 100%;
  height: 30px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  background: white;
  box-sizing: border-box;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-inp:disabled,
.f-inp:read-only {
  background: #f5f5f5;
  color: #616161;
}
.igrp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 30px;
  background: white;
}
.f-inp-in {
  border: none;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  min-width: 0;
}
.f-inp-in + .f-inp-in {
  border-left: 1px solid #e0e0e0;
}
.blkp {
  width: 30px;
  min-width: 30px;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.blkp:hover {
  background: #bbdefb;
}
.rk-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex: none;
}
.rk-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.f-area {
  height: auto;
  padding: 6px 8px;
  resize: vertical;
  font-family: inherit;
}
.rk-ringkas {
  border-top: 1px solid #e0e0e0;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rk-ringkas-row {
  display: flex;
  justify-content: space-between;
  color: #424242;
}
.rk-ringkas-total {
  margin-top: 4px;
  padding: 6px 8px;
  background: #1565c0;
  color: white;
  border-radius: 4px;
  font-size: 13px;
}
.rk-ringkas-total b {
  color: #90caf9;
}
.tarik-filter {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}
.rk-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  background: white;
}
.rk-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}
.rk-table thead th {
  background: #1565c0;
  color: white;
  font-weight: 600;
  padding: 5px;
  position: sticky;
  top: 0;
  font-size: 11px;
  border: 1px solid #0d47a1;
  white-space: nowrap;
  z-index: 1;
}
.rk-table td {
  border: 1px solid #eeeeee;
}
.rk-table .grp-row td {
  background: #cfd8dc;
  font-weight: 700;
  font-size: 11px;
  padding: 4px 8px;
}
.rk-table .sup-row td {
  background: #f5f9ff;
  border-bottom: 1px solid #cfd8dc;
}
.rk-table .sub-row > td {
  padding: 0;
  background: white;
}
.rk-sub {
  width: 100%;
  min-width: 1180px;
  border-collapse: collapse;
}
.rk-sub th {
  background: #eceff1;
  color: #37474f;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 5px;
  border: 1px solid #cfd8dc;
  white-space: nowrap;
}
.rk-sub td {
  border: 1px solid #eeeeee;
}
.btn-exp {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px;
  color: #455a64;
}
.td-ctr {
  text-align: center;
  padding: 3px 5px;
  white-space: nowrap;
}
.td-txt {
  padding: 3px 6px;
  font-size: 11px;
  white-space: nowrap;
}
.td-inp {
  padding: 0;
}
.tr {
  text-align: right;
}
.cell {
  width: 100%;
  height: 26px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 5px;
  font-family: inherit;
  color: #212121;
}
.cell:focus {
  background: #e3f2fd;
}
.cell:disabled {
  color: #616161;
}
.rk-minus {
  color: #e65100;
  font-weight: 700;
}
.rk-vou {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 3px;
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 10px;
  font-weight: 700;
}
.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 2px;
}
.btn-del:hover {
  background: #ffebee;
  border-radius: 3px;
}

.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.mini-table th {
  background: #f5f5f5;
  padding: 6px 8px;
  text-align: left;
  border-bottom: 2px solid #e0e0e0;
  font-size: 11px;
  font-weight: 700;
  position: sticky;
  top: 0;
  white-space: nowrap;
}
.mini-table td {
  padding: 5px 8px;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}
.mini-row {
  cursor: pointer;
}
.mini-row:hover td,
.mini-row--selected td {
  background: #e3f2fd;
}
.mini-row--used {
  cursor: not-allowed;
  opacity: 0.45;
}
.mini-row--used:hover td {
  background: transparent;
}
.mini-table input[type="checkbox"] {
  accent-color: #1565c0;
  cursor: pointer;
}
</style>
