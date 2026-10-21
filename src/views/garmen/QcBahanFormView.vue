<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import api from "@/services/api";
import { useForm } from "@/composables/useForm";
import {
  qcBahanFormService,
  type QcDetailResponse,
  type QcFormData,
  type QcLampiran,
  type QcLotRow,
  type QcPoLookupItem,
  type QcPoSource,
  type QcRollHasil,
  type QcRollRow,
  type QcSaveResult,
} from "@/services/garmen/qcBahanFormService";
import QcBahanPoSearchModal from "@/components/lookups/QcBahanPoSearchModal.vue";
import {
  IconClipboardCheck,
  IconSearch,
  IconPrinter,
  IconCamera,
} from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);

const todayLocal = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
})();

const EPS = 1e-9;
const MAX_LOT = 50;

const emptyHasil = (): QcRollHasil => ({
  gramasi: "",
  setting: "",
  warna: "",
  handfeel: "",
  bowing: "",
  shrinkage: "",
  kelunturan: "",
});

const newRoll = (): QcRollRow => ({
  no_roll: "",
  qty: 0,
  gramasi_atas: 0,
  gramasi_bawah: 0,
  setting_cek: 0,
  sesuai: false,
  catatan: "",
  hasil: emptyHasil(),
});

const r2 = (n: number): number => Math.round(n * 100) / 100;

// Rata-rata hanya dari bacaan > 0 (gramasi atas/bawah boleh kosong bila PO tanpa gramasi)
const rataPositif = (vals: number[]): number => {
  const v = vals.filter((n) => n > 0);
  return v.length ? r2(v.reduce((a, b) => a + b, 0) / v.length) : 0;
};

const OK_NO = ["OK", "NO"];
const PARAM_OKNO = ["handfeel", "bowing", "shrinkage", "kelunturan"] as const;

// null = kosong / bukan angka
const parseWarna = (v: string): number | null => {
  const s = String(v ?? "")
    .trim()
    .replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const okNoBersih = (v: string): string => {
  const s = String(v ?? "")
    .trim()
    .toUpperCase();
  return OK_NO.includes(s) ? s : "";
};

// Dokumen lama menyimpan hasil sebagai teks bebas. Dirapikan saat dibuka.
const bersihHasil = (h: QcRollHasil): QcRollHasil => {
  const w = parseWarna(h.warna);
  return {
    gramasi: "",
    setting: "",
    warna: w === null ? "" : String(w),
    handfeel: okNoBersih(h.handfeel),
    bowing: okNoBersih(h.bowing),
    shrinkage: okNoBersih(h.shrinkage),
    kelunturan: okNoBersih(h.kelunturan),
  };
};

// Roll wajib cek: dibulatkan ke atas, minimal 1 (sama dengan backend)
const rollCekOf = (roll: number, persen: number): number =>
  roll > 0 ? Math.max(1, Math.ceil((roll * persen) / 100)) : 0;

const isRollBlank = (x: QcRollRow): boolean =>
  !x.no_roll.trim() &&
  !(Number(x.qty) > 0) &&
  !(Number(x.gramasi_atas) > 0) &&
  !(Number(x.gramasi_bawah) > 0) &&
  !(Number(x.setting_cek) > 0) &&
  !x.catatan.trim() &&
  Object.values(x.hasil).every((v) => !v.trim());

// Gramasi PO kosong / "-" / tidak terbaca → gramasi atas & bawah tidak wajib
const gramasiPoAda = (): boolean => {
  const p = formData.value.po;
  return p.gramasi_min > 0 && p.gramasi_max > 0;
};

const settingPoAda = (): boolean => {
  const p = formData.value.po;
  return p.setting_min > 0 && p.setting_max > 0;
};

// Kolom yang belum lengkap pada satu roll
const rollKurang = (x: QcRollRow): string[] => {
  const kurang: string[] = [];
  if (gramasiPoAda()) {
    if (!(Number(x.gramasi_atas) > 0)) kurang.push("gramasi atas");
    if (!(Number(x.gramasi_bawah) > 0)) kurang.push("gramasi bawah");
  }
  if (!(Number(x.setting_cek) > 0)) kurang.push("setting");
  if (parseWarna(x.hasil.warna) === null) kurang.push("warna");
  for (const k of PARAM_OKNO) {
    if (!OK_NO.includes(x.hasil[k])) kurang.push(k);
  }
  return kurang;
};

const rollTerisi = (x: QcRollRow): boolean => rollKurang(x).length === 0;

const MAX_ROLL = 300;

// Jumlah baris roll = jumlah roll lot. Baris kosong dibuang dari belakang
// bila jumlah roll dikurangi; baris yang sudah terisi tidak pernah dihapus.
const syncRolls = (row: QcLotRow, persen: number) => {
  const raw = Math.max(0, Math.floor(Number(row.qty_roll) || 0));
  const total = Math.min(raw, MAX_ROLL);
  row.roll_cek = rollCekOf(raw, persen);
  while (row.rolls.length < total) row.rolls.push(newRoll());
  for (let i = row.rolls.length - 1; i >= 0 && row.rolls.length > total; i--) {
    const rl = row.rolls[i];
    if (rl && isRollBlank(rl)) row.rolls.splice(i, 1);
  }
};

const defaultData: QcFormData = {
  header: {
    qc_nomor: "",
    qc_tgl_datang: todayLocal,
    qc_po_nomor: "",
    qc_bhn_kode: "",
    qc_pod_nourut: 0,
    qc_vendor_greige: "",
    qc_jenis_kain: "",
    qc_vendor_celup: "",
    qc_qty_datang: 0,
    qc_jml_lot: 0,
    qc_jenis_cek: "",
    qc_persen_cek: 0,
    qc_status: "DRAFT",
    qc_keterangan: "",
    jenis_po: "",
  },
  dtl: [],
  po: {
    qty: 0,
    sisa: 0,
    roll: 0,
    satuan: "",
    gramasi: "",
    gramasi_min: 0,
    gramasi_max: 0,
    setting: "",
    setting_min: 0,
    setting_max: 0,
    spec_terbaca: false,
    warna: "",
  },
  toleransi: { gramasi: 5, setting: 0.5, warna_nilai3: 1.5, warna_nilai2: 2 },
};

// ── Dialog setelah simpan ──
const showPrintConfirm = ref(false);
const nomorTerakhir = ref("");

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
} = useForm<QcFormData>({
  menuId: "186",
  initialData: defaultData,
  fetchApi: async (): Promise<QcFormData> => {
    const res = await qcBahanFormService.getDetail(String(route.params.nomor));
    const d = res.data.data as QcDetailResponse;
    const first = d.dtl[0];
    const persen = Number(d.header.qc_persen_cek) || 0;
    return {
      header: {
        ...d.header,
        qc_keterangan: d.header.qc_keterangan || "",
        jenis_po: "",
      },
      dtl: d.dtl.map((r) => {
        const row: QcLotRow = {
          ...r,
          nilai: 0,
          alasan_nilai: "",
          rolls: r.rolls.map((x) => ({ ...x, hasil: bersihHasil(x.hasil) })),
        };
        syncRolls(row, persen);
        return row;
      }),
      po: {
        qty: d.po?.qty ?? 0,
        sisa: d.po?.sisa ?? 0,
        roll: d.po?.roll ?? 0,
        satuan: d.po?.satuan ?? "",
        gramasi: first?.gramasi_po ?? "",
        gramasi_min: d.po?.gramasi_min ?? 0,
        gramasi_max: d.po?.gramasi_max ?? 0,
        setting: first?.setting_po ?? "",
        setting_min: d.po?.setting_min ?? 0,
        setting_max: d.po?.setting_max ?? 0,
        spec_terbaca: d.po?.spec_terbaca ?? false,
        warna: first?.warna ?? "",
      },
      toleransi: d.toleransi,
    };
  },
  submitApi: async (data: QcFormData): Promise<unknown> => {
    return await qcBahanFormService.save({
      isEdit: isEditMode.value,
      qc_nomor: data.header.qc_nomor,
      qc_po_nomor: data.header.qc_po_nomor,
      qc_pod_nourut: data.header.qc_pod_nourut,
      qc_tgl_datang: data.header.qc_tgl_datang,
      qc_keterangan: data.header.qc_keterangan,
      qc_qty_datang: Number(data.header.qc_qty_datang) || 0,
      submit: simpanSubmit.value,
      dtl: data.dtl.map((r) => ({
        lot: r.lot,
        qty_kg: Number(r.qty_kg) || 0,
        qty_roll: Number(r.qty_roll) || 0,
        warna: r.warna,
        nilai: 0, // dihitung server
        alasan_nilai: "",
        rolls: rollsTersimpan(r).map((x) => ({
          no_roll: x.no_roll,
          qty: Number(x.qty) || 0,
          gramasi_atas: Number(x.gramasi_atas) || 0,
          gramasi_bawah: Number(x.gramasi_bawah) || 0,
          setting_cek: Number(x.setting_cek) || 0,
          catatan: x.catatan,
          hasil: x.hasil,
        })),
      })),
    });
  },
  onSuccess: async (response: unknown) => {
    const result = (response as { data?: { data?: QcSaveResult } }).data?.data;
    if (!result) return;
    nomorTerakhir.value = result.qc_nomor;
    formData.value.header.qc_nomor = result.qc_nomor;
    if (!isEditMode.value) {
      await uploadFotoPending(result.qc_nomor);
    }
    if (result.status === "DRAFT") {
      toast.success("Tersimpan sebagai DRAFT.");
    } else {
      toast.success(
        `QC Bahan disubmit. ${result.lot_lanjut} lot otomatis LANJUT, ${result.lot_pembelian} lot menunggu keputusan Pembelian.`,
        { timeout: 8000 },
      );
    }
    result.warnings.forEach((w) => toast.warning(w, { timeout: 8000 }));
    showPrintConfirm.value = true;
  },
});

const forceSubmit = computed<boolean>(
  () => isEditMode.value && formData.value.header.qc_status !== "DRAFT",
);

const simpanSubmit = ref(false);

// ── Foto (2 per dokumen) ──
type JenisFoto = "BAHAN" | "TRIMCARD";
const FOTO_SLOTS: { jenis: JenisFoto; label: string }[] = [
  { jenis: "BAHAN", label: "Foto Bahan Datang" },
  { jenis: "TRIMCARD", label: "Foto TRIMCARD Pembanding" },
];
const MAX_FOTO_BYTES = 2 * 1024 * 1024;
const uploadBase = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

const fotoPending = ref<Record<JenisFoto, File | null>>({
  BAHAN: null,
  TRIMCARD: null,
});
const fotoPreview = ref<Record<JenisFoto, string>>({ BAHAN: "", TRIMCARD: "" });
const fotoTersimpan = ref<Record<JenisFoto, string>>({
  BAHAN: "",
  TRIMCARD: "",
});

const fotoSrc = (jenis: JenisFoto) =>
  fotoPreview.value[jenis] || fotoTersimpan.value[jenis];

const showFoto = ref(false);
const fotoCount = computed(
  () => FOTO_SLOTS.filter((s) => !!fotoSrc(s.jenis)).length,
);

const loadFoto = async (nomor: string) => {
  try {
    const res = await qcBahanFormService.getLampiran(nomor);
    const list = res.data.data as QcLampiran[];
    fotoTersimpan.value = { BAHAN: "", TRIMCARD: "" };
    for (const l of list) {
      fotoTersimpan.value[l.Jenis] = `${uploadBase}/uploads/${l.File}`;
    }
  } catch {
    toast.error("Gagal memuat foto.");
  }
};

const clearPending = (jenis: JenisFoto) => {
  if (fotoPreview.value[jenis]) URL.revokeObjectURL(fotoPreview.value[jenis]);
  fotoPending.value[jenis] = null;
  fotoPreview.value[jenis] = "";
};

const onPilihFoto = async (jenis: JenisFoto, ev: Event) => {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    return toast.warning("File harus berupa gambar.");
  }
  if (file.size > MAX_FOTO_BYTES) {
    return toast.warning("Ukuran foto maksimal 2 MB.");
  }

  const nomor = formData.value.header.qc_nomor;
  if (isEditMode.value && nomor) {
    try {
      await qcBahanFormService.uploadLampiran(nomor, jenis, file);
      await loadFoto(nomor);
      toast.success("Foto tersimpan.");
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Gagal mengunggah foto.");
    }
    return;
  }

  clearPending(jenis);
  fotoPending.value[jenis] = file;
  fotoPreview.value[jenis] = URL.createObjectURL(file);
};

const hapusFoto = async (jenis: JenisFoto) => {
  const nomor = formData.value.header.qc_nomor;
  if (isEditMode.value && nomor && fotoTersimpan.value[jenis]) {
    try {
      await qcBahanFormService.deleteLampiran(nomor, jenis);
      await loadFoto(nomor);
    } catch {
      toast.error("Gagal menghapus foto.");
    }
    return;
  }
  clearPending(jenis);
};

// Dipanggil setelah simpan dokumen baru berhasil (nomor baru sudah ada)
const uploadFotoPending = async (nomor: string) => {
  for (const slot of FOTO_SLOTS) {
    const file = fotoPending.value[slot.jenis];
    if (!file) continue;
    try {
      await qcBahanFormService.uploadLampiran(nomor, slot.jenis, file);
    } catch {
      toast.error(
        `${slot.label} gagal diunggah. Unggah ulang lewat menu Ubah.`,
      );
    }
  }
};

watch(
  () => formData.value.header.qc_nomor,
  (nomor) => {
    if (isEditMode.value && nomor) loadFoto(nomor);
  },
  { immediate: true },
);

interface LotCalc {
  rollCek: number;
  dicek: number;
  nilai: number;
  atasRata: number;
  bawahRata: number;
  settingRata: number;
}
const EMPTY_CALC: LotCalc = {
  rollCek: 0,
  dicek: 0,
  nilai: 0,
  atasRata: 0,
  bawahRata: 0,
  settingRata: 0,
};

const rollsTersimpan = (row: QcLotRow): QcRollRow[] =>
  row.rolls.filter((x) => !isRollBlank(x));

// Nilai satu roll = nilai terendah dari semua parameter. 0 bila belum lengkap.
// Server tetap penentu; ini hanya tampilan.
const rollNilai = (x: QcRollRow): number => {
  if (!rollTerisi(x)) return 0;
  const p = formData.value.po;
  const t = formData.value.toleransi;
  const w = parseWarna(x.hasil.warna) ?? 0;
  const skor: number[] = [
    w <= t.warna_nilai3 + EPS ? 3 : w <= t.warna_nilai2 + EPS ? 2 : 1,
    x.hasil.handfeel === "OK" ? 3 : 2,
    x.hasil.bowing === "OK" ? 3 : 1,
    x.hasil.shrinkage === "OK" ? 3 : 1,
    x.hasil.kelunturan === "OK" ? 3 : 1,
  ];
  const okG = (v: number) =>
    v >= p.gramasi_min - t.gramasi - EPS &&
    v <= p.gramasi_max + t.gramasi + EPS;
  const s = Number(x.setting_cek);
  const okS =
    s >= p.setting_min - t.setting - EPS &&
    s <= p.setting_max + t.setting + EPS;
  if (gramasiPoAda()) {
    skor.push(
      okG(Number(x.gramasi_atas)) && okG(Number(x.gramasi_bawah)) ? 3 : 1,
    );
  }
  if (settingPoAda()) skor.push(okS ? 3 : 1);
  return Math.min(...skor);
};

const hitungLot = (row: QcLotRow): LotCalc => {
  const rollCek = rollCekOf(
    Number(row.qty_roll) || 0,
    Number(formData.value.header.qc_persen_cek) || 0,
  );
  const dicek = row.rolls.filter(rollTerisi);
  const ns = dicek.map(rollNilai);
  let nilai = 0;
  if (ns.length > 0) {
    nilai = ns.every((n) => n === 3) ? 3 : ns.every((n) => n === 1) ? 1 : 2;
  }
  return {
    rollCek,
    dicek: dicek.length,
    nilai,
    atasRata: rataPositif(dicek.map((x) => Number(x.gramasi_atas))),
    bawahRata: rataPositif(dicek.map((x) => Number(x.gramasi_bawah))),
    settingRata: rataPositif(dicek.map((x) => Number(x.setting_cek))),
  };
};

const lotCalc = computed<LotCalc[]>(() => formData.value.dtl.map(hitungLot));
const calcOf = (i: number): LotCalc => lotCalc.value[i] ?? EMPTY_CALC;

// Rata-rata semua roll yang sudah dicek (lintas lot), untuk footer tabel 1
const rataSemua = computed(() => {
  const dicek = formData.value.dtl.flatMap((r) => r.rolls.filter(rollTerisi));

  return {
    n: dicek.length,
    atas: rataPositif(dicek.map((x) => Number(x.gramasi_atas))),
    bawah: rataPositif(dicek.map((x) => Number(x.gramasi_bawah))),
    setting: rataPositif(dicek.map((x) => Number(x.setting_cek))),
  };
});

const prediksi = (i: number): string => {
  const n = calcOf(i).nilai;
  if (n === 3) return "Auto LANJUT";
  return n > 0 ? "Ke Pembelian" : "-";
};

const newLot = (): QcLotRow => ({
  lot: "",
  qty_kg: 0,
  qty_roll: 0,
  roll_cek: 0,
  qty_kg_po: formData.value.po.qty,
  gramasi_po: formData.value.po.gramasi,
  gramasi_min: formData.value.po.gramasi_min,
  gramasi_max: formData.value.po.gramasi_max,
  setting_po: formData.value.po.setting,
  warna: formData.value.po.warna,
  gramasi_cek: 0,
  setting_cek: "",
  nilai: 0,
  nilai_saran: 0,
  alasan_nilai: "",
  keputusan: "",
  rolls: [],
});

const lotAdaIsi = (r: QcLotRow): boolean =>
  !!r.lot.trim() ||
  Number(r.qty_kg) > 0 ||
  Number(r.qty_roll) > 0 ||
  r.rolls.some((x) => !isRollBlank(x));

const addLot = () => {
  if (!formData.value.header.qc_po_nomor) {
    return toast.warning("Pilih PO Bahan terlebih dahulu.");
  }
  if (formData.value.dtl.length >= MAX_LOT) {
    return toast.warning(`Maksimal ${MAX_LOT} lot.`);
  }
  formData.value.dtl.push(newLot());
};

const removeLot = (idx: number) => {
  if (formData.value.dtl.length <= 1) {
    return toast.warning("Minimal satu lot.");
  }
  formData.value.dtl.splice(idx, 1);
};

// Input "Jumlah Lot" di header: menambah/mengurangi baris lot otomatis
const jmlLotInput = ref(0);
watch(
  () => formData.value.dtl.length,
  (n) => {
    jmlLotInput.value = n;
  },
  { immediate: true },
);

const showKurangiLot = ref(false);
const pendingJml = ref(0);

const onJmlLotChange = () => {
  const sekarang = formData.value.dtl.length;
  const n = Math.floor(Number(jmlLotInput.value) || 0);
  if (!formData.value.header.qc_po_nomor) {
    jmlLotInput.value = sekarang;
    return toast.warning("Pilih PO Bahan terlebih dahulu.");
  }
  if (n < 1 || n > MAX_LOT) {
    jmlLotInput.value = sekarang;
    return toast.warning(`Jumlah lot harus 1 sampai ${MAX_LOT}.`);
  }
  if (n > sekarang) {
    for (let i = sekarang; i < n; i++) formData.value.dtl.push(newLot());
    return;
  }
  if (n < sekarang) {
    if (formData.value.dtl.slice(n).some(lotAdaIsi)) {
      pendingJml.value = n;
      showKurangiLot.value = true;
      return;
    }
    formData.value.dtl.splice(n);
  }
};

const konfirmasiKurangi = () => {
  formData.value.dtl.splice(pendingJml.value);
  showKurangiLot.value = false;
};
const batalKurangi = () => {
  jmlLotInput.value = formData.value.dtl.length;
  showKurangiLot.value = false;
};

watch(
  () =>
    `${formData.value.header.qc_persen_cek}|` +
    formData.value.dtl.map((r) => Number(r.qty_roll) || 0).join(","),
  () => {
    const persen = Number(formData.value.header.qc_persen_cek) || 0;
    if (formData.value.dtl.some((r) => Number(r.qty_roll) > MAX_ROLL)) {
      toast.warning(`Baris roll dibatasi ${MAX_ROLL} per lot.`);
    }
    formData.value.dtl.forEach((r) => syncRolls(r, persen));
  },
);

// ── PO ──
const showPoModal = ref(false);

const onPoSelected = async (item: QcPoLookupItem) => {
  try {
    const res = await qcBahanFormService.getPoSource(item.PO, item.Nourut);
    const src = res.data.data as QcPoSource;
    Object.assign(formData.value.header, src.header);
    formData.value.po = src.po;
    formData.value.toleransi = src.toleransi;
    formData.value.header.qc_qty_datang = 0;
    formData.value.dtl = [newLot()];

    toast.success(`PO ${item.PO} dimuat. Isi qty kedatangan dan jumlah lot.`);
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.error(err.response?.data?.message || "Gagal memuat data PO.");
  }
};

// ── Ringkasan ──
const totalQty = computed(() =>
  formData.value.dtl.reduce((s, r) => s + (Number(r.qty_kg) || 0), 0),
);
const totalRoll = computed(() =>
  formData.value.dtl.reduce((s, r) => s + (Number(r.qty_roll) || 0), 0),
);
const qtyDatang = computed(
  () => Number(formData.value.header.qc_qty_datang) || 0,
);
const qtyBeda = computed(
  () =>
    qtyDatang.value > 0 && Math.abs(totalQty.value - qtyDatang.value) > 0.01,
);
const melebihiSisa = computed(
  () => qtyDatang.value > 0 && qtyDatang.value > formData.value.po.sisa + 0.01,
);

// ── Enter pindah ke input berikutnya dalam tabel ──
const onEnterNext = (e: KeyboardEvent) => {
  const target = e.target as HTMLInputElement | HTMLSelectElement;
  const table = target.closest("table");
  if (!table) return;
  const fields = Array.from(
    table.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "input:not([readonly]):not([disabled]), select:not([disabled])",
    ),
  );
  const next = fields[fields.indexOf(target) + 1];
  if (!next) return;
  next.focus();
  if (next instanceof HTMLInputElement) next.select();
};

// ── Validasi (cermin aturan server; server tetap penentu) ──
const cekSubmit = (): string => {
  if (!(qtyDatang.value > 0)) return "Qty kedatangan wajib diisi.";
  if (qtyBeda.value) {
    return `Total qty lot (${totalQty.value.toFixed(2)}) tidak sama dengan qty kedatangan (${qtyDatang.value.toFixed(2)}).`;
  }
  const persen = formData.value.header.qc_persen_cek;
  for (const [i, r] of formData.value.dtl.entries()) {
    const c = calcOf(i);
    if (!(Number(r.qty_kg) > 0)) return `Lot ${r.lot}: qty wajib diisi.`;
    if (!(Number(r.qty_roll) > 0)) return `Lot ${r.lot}: roll wajib diisi.`;

    const rolls = rollsTersimpan(r);
    const idxKurang = r.rolls.findIndex(
      (x) => !isRollBlank(x) && !rollTerisi(x),
    );
    if (idxKurang >= 0) {
      const rl = r.rolls[idxKurang];
      return `Lot ${r.lot}, baris roll ke-${idxKurang + 1}: ${rl ? rollKurang(rl).join(", ") : "data"} harus diisi lengkap.`;
    }
    if (rolls.length < c.rollCek) {
      return `Lot ${r.lot}: minimal ${c.rollCek} roll harus dicek (${persen}% dari ${r.qty_roll} roll). Baru ${rolls.length}.`;
    }
    if (rolls.length > Number(r.qty_roll)) {
      return `Lot ${r.lot}: roll yang dicek (${rolls.length}) melebihi jumlah roll lot.`;
    }
    if (!c.nilai) {
      return `Lot ${r.lot}: nilai belum dapat dihitung. Lengkapi hasil cek roll.`;
    }
  }
  return "";
};

const validateSave = () => {
  const h = formData.value.header;
  if (!h.qc_tgl_datang) return toast.warning("Tanggal kedatangan wajib diisi.");
  if (!h.qc_po_nomor) return toast.warning("PO Bahan belum dipilih.");
  if (formData.value.dtl.length === 0) {
    return toast.warning("Minimal satu lot harus diisi.");
  }

  const seen = new Set<string>();
  for (const [i, r] of formData.value.dtl.entries()) {
    const lot = r.lot.trim().toUpperCase();
    if (!lot) return toast.warning(`Baris ${i + 1}: Lot No. wajib diisi.`);
    if (seen.has(lot)) return toast.warning(`Lot ${r.lot} terduplikasi.`);
    seen.add(lot);
  }

  if (forceSubmit.value || simpanSubmit.value) {
    const err = cekSubmit();
    if (err) return toast.warning(err);
  }
  showSaveDialog.value = true;
};

// ── Cetak ──
const doPrint = () => {
  showPrintConfirm.value = false;
  const url = router.resolve({
    name: "QcBahanPrint",
    params: { nomor: nomorTerakhir.value },
  }).href;
  window.open(url, "_blank");
  goBack();
};

const nilaiClass = (n: number) =>
  n === 3
    ? "chip-ok"
    : n === 2
      ? "chip-partial"
      : n === 1
        ? "chip-reject"
        : "chip-draft";
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah QC Bahan' : 'Tambah QC Bahan'"
    menu-id="186"
    item-name="QC Bahan"
    :icon="IconClipboardCheck"
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
    <template #header-actions-prepend>
      <v-btn
        size="small"
        variant="outlined"
        color="primary"
        class="mr-2"
        @click="showFoto = true"
      >
        <template #prepend>
          <span class="d-flex align-center">
            <IconCamera :size="15" :stroke-width="1.7" />
          </span>
        </template>
        Foto ({{ fotoCount }}/2)
      </v-btn>
    </template>
    <!-- ══ KOLOM KIRI: HEADER ══ -->
    <template #left-column>
      <div class="qc-left">
        <div class="fr">
          <label class="lbl">Nomor</label>
          <input
            :value="formData.header.qc_nomor"
            readonly
            class="inp ro"
            style="flex: 1"
            placeholder="Otomatis"
          />
        </div>
        <div class="fr">
          <label class="lbl">Status</label>
          <span class="status-chip" :class="`st-${formData.header.qc_status}`">
            {{ formData.header.qc_status }}
          </span>
        </div>
        <div class="fr">
          <label class="lbl fw">Tgl Datang</label>
          <input
            type="date"
            v-model="formData.header.qc_tgl_datang"
            class="idate"
            style="width: 150px"
          />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl fw text-primary">Nomor PO</label>
          <div class="igrp" style="flex: 1">
            <input
              v-model="formData.header.qc_po_nomor"
              class="inp"
              style="flex: 1; background: #ddeeff"
              readonly
              placeholder="Klik cari..."
            />
            <button
              type="button"
              class="blkp"
              :disabled="isEditMode"
              @click="showPoModal = true"
            >
              <IconSearch :size="13" />
            </button>
          </div>
        </div>
        <div class="fr">
          <label class="lbl">Jenis Kain</label>
          <input
            :value="formData.header.qc_jenis_kain"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>
        <div class="fr">
          <label class="lbl">Vendor Greige</label>
          <input
            :value="formData.header.qc_vendor_greige"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>
        <div class="fr">
          <label class="lbl">Vendor Celup</label>
          <input
            :value="formData.header.qc_vendor_celup"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">Gramasi PO</label>
          <input
            :value="formData.po.gramasi"
            readonly
            class="inp ro"
            style="width: 90px"
          />
          <label class="lbl" style="width: 70px">Setting PO</label>
          <input
            :value="formData.po.setting"
            readonly
            class="inp ro"
            style="width: 70px"
          />
        </div>
        <div class="fr">
          <label class="lbl">Qty PO</label>
          <input
            :value="`${formData.po.qty} ${formData.po.satuan}`"
            readonly
            class="inp ro"
            style="width: 110px"
          />
          <label class="lbl" style="width: 70px">Roll PO</label>
          <input
            :value="formData.po.roll"
            readonly
            class="inp ro"
            style="width: 70px"
          />
        </div>
        <div class="fr">
          <label class="lbl">Sisa PO</label>
          <input
            :value="`${formData.po.sisa} ${formData.po.satuan}`"
            readonly
            class="inp ro"
            style="width: 110px"
          />
          <label class="lbl" style="width: 70px">Persen Cek</label>
          <input
            :value="
              formData.header.qc_persen_cek
                ? `${formData.header.qc_persen_cek}%`
                : ''
            "
            readonly
            class="inp ro"
            style="width: 110px"
          />
        </div>
        <div
          v-if="
            formData.header.qc_po_nomor && (!gramasiPoAda() || !settingPoAda())
          "
          class="warn-box"
        >
          {{ !gramasiPoAda() ? "Gramasi" : "Setting" }} di PO tidak terbaca,
          jadi parameter itu tidak ikut dinilai.
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl fw text-primary">Qty Datang</label>
          <input
            v-model.number="formData.header.qc_qty_datang"
            type="number"
            step="0.01"
            min="0"
            class="inp"
            style="width: 110px"
            v-select-on-focus
          />
          <label class="lbl fw text-primary" style="width: 70px"
            >Jumlah Lot</label
          >
          <input
            v-model.number="jmlLotInput"
            type="number"
            min="1"
            :max="MAX_LOT"
            class="inp"
            style="width: 70px"
            @change="onJmlLotChange"
            v-select-on-focus
          />
        </div>
        <div class="fr">
          <label class="lbl">Total Qty</label>
          <input
            :value="`${totalQty.toFixed(2)} ${formData.po.satuan}`"
            readonly
            class="inp ro fw"
            :class="{ 'bg-red': qtyBeda }"
            style="width: 110px"
          />
          <label class="lbl" style="width: 70px">Total Roll</label>
          <input
            :value="totalRoll"
            readonly
            class="inp ro fw"
            style="width: 70px"
          />
        </div>
        <div v-if="qtyBeda" class="warn-box">
          Total qty lot ({{ totalQty.toFixed(2) }}) tidak sama dengan qty
          kedatangan ({{ qtyDatang.toFixed(2) }}). Submit akan ditolak.
        </div>
        <div v-if="melebihiSisa" class="warn-box warn-amber">
          Qty kedatangan melebihi sisa PO ({{ formData.po.sisa }}
          {{ formData.po.satuan }}). Hanya peringatan, tetap bisa disimpan.
        </div>

        <div class="sep" />

        <div class="fr" style="align-items: flex-start">
          <label class="lbl" style="padding-top: 3px">Catatan</label>
          <textarea
            v-model="formData.header.qc_keterangan"
            class="ta"
            rows="3"
            style="flex: 1"
          />
        </div>

        <div v-if="!forceSubmit" class="fr">
          <label class="lbl"></label>
          <label style="display: flex; gap: 6px; align-items: center">
            <input v-model="simpanSubmit" type="checkbox" />
            Simpan &amp; Submit sekarang
          </label>
        </div>
        <div v-if="simpanSubmit && !forceSubmit" class="warn-line">
          Lot nilai 3 otomatis LANJUT, lot nilai 1 atau 2 langsung ke Pembelian.
          Untuk melanjutkan lot nilai 2 sebagai Gudang, simpan sebagai DRAFT
          lalu Submit dari browse.
        </div>
      </div>
    </template>

    <!-- ══ KOLOM KANAN: DETAIL ══ -->
    <template #right-column>
      <div class="qc-right">
        <div class="tbl-header">
          <span class="tbl-title">Lot dan Pengecekan Roll</span>
          <button type="button" class="btn-add" @click="addLot">
            + Tambah Lot
          </button>
        </div>
        <div class="tbl-wrap" style="min-height: 50vh; max-height: 78vh">
          <table class="gt" style="min-width: 1520px">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 110px">Lot No.</th>
                <th style="width: 80px" class="tr">
                  Qty {{ formData.po.satuan }}
                </th>
                <th style="width: 55px" class="tr">Roll</th>
                <th style="width: 95px" class="tc">Dicek</th>
                <th style="width: 110px">Nama Warna</th>
                <th style="width: 90px" class="tr bg-yellow">Gramasi Bawah</th>
                <th style="width: 90px" class="tr bg-yellow">Gramasi Atas</th>
                <th style="width: 75px" class="tr bg-yellow">Setting</th>
                <th style="width: 85px" class="tr bg-yellow">Warna ΔE</th>
                <th style="width: 80px" class="tc bg-yellow">Handfeel</th>
                <th style="width: 75px" class="tc bg-yellow">Bowing</th>
                <th style="width: 85px" class="tc bg-yellow">Shrinkage</th>
                <th style="width: 90px" class="tc bg-yellow">Kelunturan</th>
                <th style="width: 60px" class="tc">Nilai</th>
                <th style="width: 180px">Catatan Roll</th>
                <th style="width: 95px" class="tc">Keputusan</th>
                <th style="width: 32px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(row, idx) in formData.dtl" :key="idx">
                <!-- Baris lot -->
                <tr class="lot-row">
                  <td class="tc gt-lbl">{{ idx + 1 }}</td>
                  <td class="p0">
                    <input
                      v-model="row.lot"
                      class="ci fw"
                      @keydown.enter.prevent="onEnterNext"
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.qty_kg"
                      type="number"
                      step="0.01"
                      class="ci tr"
                      @keydown.enter.prevent="onEnterNext"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="row.qty_roll"
                      type="number"
                      min="0"
                      class="ci tr"
                      @keydown.enter.prevent="onEnterNext"
                      v-select-on-focus
                    />
                  </td>
                  <td
                    class="tc"
                    :class="{
                      'text-red': calcOf(idx).dicek < calcOf(idx).rollCek,
                    }"
                  >
                    {{ calcOf(idx).dicek }} (min {{ calcOf(idx).rollCek }})
                  </td>
                  <td class="p0">
                    <input
                      v-model="row.warna"
                      class="ci"
                      @keydown.enter.prevent="onEnterNext"
                    />
                  </td>
                  <td class="tr px-1">{{ calcOf(idx).bawahRata || "-" }}</td>
                  <td class="tr px-1">{{ calcOf(idx).atasRata || "-" }}</td>
                  <td class="tr px-1">{{ calcOf(idx).settingRata || "-" }}</td>
                  <td colspan="5"></td>
                  <td class="tc">
                    <span
                      v-if="calcOf(idx).nilai"
                      class="status-chip"
                      :class="nilaiClass(calcOf(idx).nilai)"
                    >
                      {{ calcOf(idx).nilai }}
                    </span>
                    <span v-else class="text-grey">-</span>
                  </td>
                  <td></td>
                  <td class="tc">{{ row.keputusan || prediksi(idx) }}</td>
                  <td class="tc">
                    <button
                      type="button"
                      class="btn-del"
                      @click="removeLot(idx)"
                    >
                      ✕
                    </button>
                  </td>
                </tr>

                <!-- Baris roll (otomatis sebanyak jumlah roll) -->
                <tr
                  v-for="(rl, ri) in row.rolls"
                  :key="`${idx}-${ri}`"
                  class="roll-row"
                >
                  <td class="gt-lbl"></td>
                  <td class="roll-lbl">Roll {{ ri + 1 }}</td>
                  <td class="p0">
                    <input
                      v-model.number="rl.qty"
                      type="number"
                      step="0.01"
                      class="ci tr"
                      @keydown.enter.prevent="onEnterNext"
                      v-select-on-focus
                    />
                  </td>
                  <td colspan="3"></td>
                  <td class="p0">
                    <input
                      v-model.number="rl.gramasi_atas"
                      type="number"
                      step="0.01"
                      class="ci tr fw bg-yellow-light"
                      @keydown.enter.prevent="onEnterNext"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="rl.gramasi_bawah"
                      type="number"
                      step="0.01"
                      class="ci tr fw bg-yellow-light"
                      @keydown.enter.prevent="onEnterNext"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model.number="rl.setting_cek"
                      type="number"
                      step="0.01"
                      class="ci tr fw bg-yellow-light"
                      @keydown.enter.prevent="onEnterNext"
                      v-select-on-focus
                    />
                  </td>
                  <td class="p0">
                    <input
                      v-model="rl.hasil.warna"
                      type="number"
                      step="0.01"
                      min="0"
                      class="ci tr fw bg-yellow-light"
                      @keydown.enter.prevent="onEnterNext"
                      v-select-on-focus
                    />
                  </td>
                  <td v-for="k in PARAM_OKNO" :key="k" class="p0">
                    <select
                      v-model="rl.hasil[k]"
                      class="ci fw bg-yellow-light"
                      @keydown.enter.prevent="onEnterNext"
                    >
                      <option value="">-</option>
                      <option value="OK">OK</option>
                      <option value="NO">NO</option>
                    </select>
                  </td>
                  <td class="tc">
                    <span
                      class="status-chip"
                      :class="nilaiClass(rollNilai(rl))"
                    >
                      {{ rollNilai(rl) || "-" }}
                    </span>
                  </td>
                  <td class="p0">
                    <input
                      v-model="rl.catatan"
                      class="ci"
                      @keydown.enter.prevent="onEnterNext"
                    />
                  </td>
                  <td colspan="2"></td>
                </tr>
              </template>
              <tr v-if="formData.dtl.length === 0">
                <td colspan="18" class="empty-row">
                  Pilih PO Bahan di kiri, lalu isi Jumlah Lot.
                </td>
              </tr>
            </tbody>
            <tfoot v-if="formData.dtl.length">
              <tr>
                <td colspan="6" class="tr">
                  Rata-rata semua roll dicek ({{ rataSemua.n }} roll)
                </td>
                <td class="tr px-1">{{ rataSemua.atas || "-" }}</td>
                <td class="tr px-1">{{ rataSemua.bawah || "-" }}</td>
                <td class="tr px-1">{{ rataSemua.setting || "-" }}</td>
                <td colspan="9"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="legend">
          Isi nomor lot dan jumlah roll, baris roll muncul otomatis. Isi semua
          kolom kuning hanya pada roll yang dicek (minimal sesuai kolom Dicek);
          baris kosong tidak dihitung. Nilai dihitung sistem dan tidak dapat
          diubah. Nilai roll = nilai terendah dari semua parameter. Gramasi dan
          setting: dalam rentang PO ±{{ formData.toleransi.gramasi }} gram / ±{{
            formData.toleransi.setting
          }}
          bernilai 3, di luar rentang bernilai 1 (dilewati bila spesifikasi PO
          tidak terbaca). Warna: sampai
          {{ formData.toleransi.warna_nilai3 }} bernilai 3, sampai
          {{ formData.toleransi.warna_nilai2 }} bernilai 2, di atasnya bernilai
          1. Handfeel: OK 3, NO 2. Bowing, shrinkage, kelunturan: OK 3, NO 1.
          Nilai lot: <b>3</b> bila semua roll bernilai 3 (otomatis LANJUT),
          <b>1</b> bila semua roll bernilai 1, selain itu <b>2</b>
          (diputuskan Pembelian, atau dilanjutkan Gudang lewat Tindakan &gt;
          Submit di browse dengan alasan).
        </div>
      </div>
    </template>
  </BaseForm>

  <QcBahanPoSearchModal v-model="showPoModal" @selected="onPoSelected" />

  <v-dialog v-model="showFoto" max-width="820">
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 d-flex align-center">
        <IconCamera :size="18" class="mr-2" />
        <span style="font-size: 13px">Dokumentasi Foto</span>
      </v-card-title>
      <v-card-text class="pa-0">
        <div class="foto-grid" style="border: none">
          <div v-for="slot in FOTO_SLOTS" :key="slot.jenis" class="foto-box">
            <div class="foto-label">{{ slot.label }}</div>
            <div class="foto-area">
              <img
                v-if="fotoSrc(slot.jenis)"
                :src="fotoSrc(slot.jenis)"
                class="foto-img"
                alt=""
              />
              <span v-else class="foto-kosong">Belum ada foto</span>
            </div>
            <div class="foto-actions">
              <label class="foto-btn">
                {{ fotoSrc(slot.jenis) ? "Ganti" : "Pilih Foto" }}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  @change="onPilihFoto(slot.jenis, $event)"
                />
              </label>
              <button
                v-if="fotoSrc(slot.jenis)"
                type="button"
                class="foto-btn foto-btn-del"
                @click="hapusFoto(slot.jenis)"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
        <div class="legend pa-3">
          Maksimal 2 MB per foto.
          {{
            isEditMode
              ? "Foto langsung tersimpan saat dipilih."
              : "Pada dokumen baru, foto terkirim otomatis setelah dokumen disimpan."
          }}
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" size="small" @click="showFoto = false">
          Tutup
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog cetak setelah simpan -->
  <v-dialog v-model="showPrintConfirm" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconPrinter class="mr-2" :size="20" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-2">
          QC Bahan <b>{{ nomorTerakhir }}</b> telah disimpan.
        </div>
        <div class="text-body-2 text-grey-darken-1">
          Cetak form pengecekan bahan sekarang?
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="goBack">Tidak, Tutup</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doPrint">
          <IconPrinter :size="16" class="mr-1" /> Ya, Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog konfirmasi kurangi jumlah lot -->
  <v-dialog v-model="showKurangiLot" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-warning text-white pa-3">
        Kurangi Jumlah Lot
      </v-card-title>
      <v-card-text class="pa-4">
        Lot yang dihapus sudah berisi data (lot no., qty, atau hasil cek roll).
        Data baris ke-{{ pendingJml + 1 }} sampai terakhir akan hilang.
        Lanjutkan?
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="batalKurangi">Batal</v-btn>
        <v-spacer />
        <v-btn color="warning" variant="elevated" @click="konfirmasiKurangi">
          Ya, Hapus
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.qc-left {
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
.qc-right {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  min-height: 0;
  min-width: 0;
  overflow: auto;
}

.fr {
  display: flex;
  align-items: center;
  min-height: 24px;
  gap: 4px;
  width: 100%;
}
.lbl {
  width: 85px;
  flex-shrink: 0;
  font-weight: 600;
  color: #333;
  font-size: 11px;
  white-space: nowrap;
}
.fw {
  font-weight: 700;
}
.sep {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
  width: 100%;
}
.mt-2 {
  margin-top: 8px;
}
.text-primary {
  color: #1565c0;
}
.text-grey {
  color: #757575;
}
.text-white {
  color: #fff !important;
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
.igrp {
  display: flex;
  border: 1px solid #a0a0a0;
  height: 24px;
  background: white;
  overflow: hidden;
  flex-shrink: 0;
}
.igrp .inp {
  border: none;
  height: 22px;
}
.blkp {
  width: 24px;
  flex-shrink: 0;
  background: #e0e0e0;
  border: none;
  border-left: 1px solid #a0a0a0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.blkp:hover {
  background: #d0d0d0;
}
.blkp:disabled {
  opacity: 0.5;
  cursor: default;
}
.ta {
  border: 1px solid #a0a0a0;
  padding: 3px 5px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  resize: vertical;
}

.warn-box {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
  border-radius: 3px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
}
.warn-box.warn-amber {
  background: #fff8e1;
  color: #e65100;
  border-color: #ffe082;
}
.warn-line {
  margin-top: 4px;
  font-size: 11px;
  color: #b26a00;
}

.text-red {
  color: #c62828;
  font-weight: 700;
}

.gt tbody tr.lot-row td {
  background: #eef3fb;
  font-weight: 600;
}
.gt tbody tr.roll-row td {
  background: #fff;
}
.roll-lbl {
  padding-left: 18px;
  color: #607d8b;
  font-size: 10px;
}

.status-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 9.5px;
  font-weight: 700;
  white-space: nowrap;
}
.st-DRAFT,
.chip-draft {
  background: #f5f5f5;
  color: #757575;
}
.st-MENUNGGU {
  background: #fff3e0;
  color: #e65100;
}
.st-LANJUT,
.chip-ok {
  background: #e8f5e9;
  color: #2e7d32;
}
.st-REJECT,
.chip-reject {
  background: #ffebee;
  color: #c62828;
}
.st-SEBAGIAN,
.chip-partial {
  background: #fffde7;
  color: #f57f17;
}
.st-TUNDA {
  background: #f3e5f5;
  color: #6a1b9a;
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
.tbl-header.teal {
  background: #00695c;
}
.tbl-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
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
.gt tbody tr:hover td {
  background: #e3f2fd !important;
}
.gt tfoot td {
  position: sticky;
  bottom: 0;
  z-index: 1;
  background: #fff9c4;
  border: 1px solid #bdbdbd;
  height: 26px;
  font-size: 11px;
  font-weight: 700;
  color: #37474f;
  white-space: nowrap;
}
.p0 {
  padding: 0 !important;
}
.px-1 {
  padding: 0 5px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.gt-lbl {
  background: #f5f5f5 !important;
  color: #555;
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
  box-sizing: border-box;
}
.ci.ro {
  background: #dde8f0 !important;
}
.ci.bg-yellow-light {
  background: #fffde7 !important;
}
.ci.bg-red-light {
  background: #ffcdd2 !important;
}
.ci:focus {
  background: #e3f2fd !important;
  outline: 1px solid #1976d2;
  outline-offset: -1px;
}
.ci.tc {
  text-align: center;
}
.ci.tr {
  text-align: right;
}
.ci.fw {
  font-weight: 700;
}
.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  font-size: 11px;
}
.btn-del:hover {
  background: #ffebee;
  border-radius: 2px;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 14px 8px;
}
.legend {
  font-size: 10px;
  color: #555;
  margin-top: 4px;
}
.bg-red {
  background-color: #d32f2f !important;
  color: #fff !important;
}
.foto-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
  flex-shrink: 0;
}
.foto-box {
  padding: 8px;
  min-width: 0;
}
.foto-box + .foto-box {
  border-left: 1px solid #bdbdbd;
}
.foto-label {
  font-size: 11px;
  font-weight: 700;
  color: #37474f;
  text-align: center;
  margin-bottom: 6px;
}
.foto-area {
  height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border: 1px dashed #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
}
.foto-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.foto-kosong {
  font-size: 11px;
  color: #9e9e9e;
}
.foto-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 6px;
}
.foto-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 12px;
  border: 1px solid #1565c0;
  border-radius: 3px;
  color: #1565c0;
  background: white;
  cursor: pointer;
}
.foto-btn:hover {
  background: #e3f2fd;
}
.foto-btn-del {
  border-color: #c62828;
  color: #c62828;
}
.foto-btn-del:hover {
  background: #ffebee;
}
</style>
