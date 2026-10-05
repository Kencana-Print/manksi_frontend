<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import { planningSpkFormService } from "@/services/ppic/planningSpkFormService";
import BaseForm from "@/components/BaseForm.vue";

import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";

import {
  IconCalendarStats,
  IconSearch,
  IconPlus,
  IconTrash,
  IconHistory,
  IconLock,
} from "@tabler/icons-vue";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TabRow {
  NomorSPK: string;
  NamaSPK: string;
  QtySPK: number;
  plan_tgl_jadwal: string;
  plan_wip: number;
  plan_qty_po: number;
  plan_qty_jadwal: number;
  plan_line_kelompok: string; // tidak dipakai di koli
  plan_keterangan: string;
  supplierKode: string;
  supplierNama: string;
  // ── khusus Sewing ──
  plan_hari: number;
  plan_jam: number;
  plan_target_output: number;
  plan_smv: number; // menit
  smv_sumber: "" | "PROOF" | "MANUAL";
  mp: number;
  actual_output: number;
  actual_jam: number | null;
  _mpLocked: boolean; // MP tersimpan di DB, tidak ikut berubah
  _smvConfirmed: boolean; // warning SMV manual sudah dikonfirmasi
  _spkResolved: string; // nomor SPK terakhir yang di-resolve di baris ini
  _key: number;
  _spkLoading: boolean;
  _supplierLoading: boolean;
  _spkDetail: string;
}

interface RiwayatRow {
  Nomor: string;
  Tgl1: string;
  Tgl2: string;
  Cabang: string;
  Close: string;
  Keterangan: string;
  NomorSPK: string;
  NamaSPK: string;
}

interface FormState {
  pl_nomor: string;
  pl_tgl1: string;
  pl_tgl2: string;
  pl_cab: string;
  pl_keterangan: string;
  detail: {
    cutting: TabRow[];
    sewing: TabRow[];
    koli: TabRow[];
  };
}

// ─── Router / Toast ───────────────────────────────────────────────────────────
const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEdit = computed(() => !!route.params.nomor);
const nomorParam = computed(() =>
  route.params.nomor ? decodeURIComponent(route.params.nomor as string) : "",
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatDateLocal = (v?: string | Date): string => {
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : toLocalDate(d);
};
// Clamp tanggal jadwal Sewing/Koli supaya tidak bisa keluar dari
// periode planning (pl_tgl1 s/d pl_tgl2). Dipanggil di @change karena
// min/max HTML5 date input cuma membatasi popup kalender, bukan input
// manual via keyboard.
const clampToPeriode = (tab: TabKey, idx: number) => {
  if (tab === "cutting") return; // cutting tidak terikat periode mingguan
  const row = formData.value.detail[tab][idx];
  if (!row.plan_tgl_jadwal) return;

  const val = row.plan_tgl_jadwal;
  const min = formData.value.pl_tgl1;
  const max = formData.value.pl_tgl2;

  if (min && val < min) {
    row.plan_tgl_jadwal = min;
    toast.warning(`Tanggal jadwal disesuaikan ke awal periode (${min}).`);
  } else if (max && val > max) {
    row.plan_tgl_jadwal = max;
    toast.warning(`Tanggal jadwal disesuaikan ke akhir periode (${max}).`);
  }
};

// Ganti getMondayOfWeek agar tidak kena timezone issue
const getMondayOfWeek = (d: Date) => {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon;
};

// Ganti today agar pakai waktu lokal Indonesia (WIB)
const todayWIB = new Date(
  new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
);
const today = todayWIB;
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const monday = getMondayOfWeek(today);
const saturday = new Date(monday);
saturday.setDate(monday.getDate() + 5);
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

let _key = 0;
const newKey = () => ++_key;

const emptyRow = (defaultTgl: string): TabRow => ({
  NomorSPK: "",
  NamaSPK: "",
  QtySPK: 0,
  plan_tgl_jadwal: defaultTgl,
  plan_wip: 0,
  plan_qty_po: 0,
  plan_qty_jadwal: 0,
  plan_line_kelompok: "",
  plan_keterangan: "",
  supplierKode: "",
  supplierNama: "",
  plan_hari: 5,
  plan_jam: 6.5,
  plan_target_output: 0,
  plan_smv: 0,
  smv_sumber: "",
  mp: 0,
  actual_output: 0,
  actual_jam: null,
  _mpLocked: false,
  _smvConfirmed: false,
  _spkResolved: "",
  _spkDetail: "",
  _key: newKey(),
  _spkLoading: false,
  _supplierLoading: false,
});

const mapRow = (r: any, defaultTgl: string): TabRow => ({
  NomorSPK: r.NomorSPK ?? "",
  NamaSPK: r.NamaSPK ?? "",
  QtySPK: Number(r.QtySPK) || 0,
  plan_tgl_jadwal: formatDateLocal(r.plan_tgl_jadwal) || defaultTgl,
  plan_wip: Number(r.plan_wip) || 0,
  plan_qty_po: Number(r.plan_qty_po) || 0,
  plan_qty_jadwal: Number(r.plan_qty_jadwal) || 0,
  plan_line_kelompok: r.plan_line_kelompok ?? "",
  plan_keterangan: r.plan_keterangan ?? "",
  supplierKode: r.supplierKode ?? "",
  supplierNama: r.supplierNama ?? "",
  plan_hari: Number(r.plan_hari) > 0 ? Number(r.plan_hari) : 5,
  plan_jam: Number(r.plan_jam) > 0 ? Number(r.plan_jam) : 6.5,
  plan_target_output: Number(r.plan_target_output) || 0,
  plan_smv: Number(r.smv ?? r.plan_smv) || 0,
  smv_sumber: r.smv_sumber ?? "",
  mp: Number(r.mp) || 0,
  actual_output: Number(r.actual_output) || 0,
  actual_jam: r.actual_jam == null ? null : Number(r.actual_jam),
  _mpLocked: Number(r.plan_mp) > 0,
  _smvConfirmed: true, // baris yang sudah tersimpan dianggap sudah dikonfirmasi
  _spkResolved: r.NomorSPK ?? "",
  _spkDetail: r.NamaSPK ? `${r.NomorSPK} | ${r.NamaSPK} | ${r.QtySPK} pcs` : "",
  _key: newKey(),
  _spkLoading: false,
  _supplierLoading: false,
});

const emptyData: FormState = {
  pl_nomor: "",
  pl_tgl1: toLocalDate(monday),
  pl_tgl2: toLocalDate(saturday),
  pl_cab: "",
  pl_keterangan: "",
  detail: {
    cutting: [emptyRow(toLocalDate(tomorrow))],
    sewing: [],
    koli: [emptyRow(toLocalDate(monday))],
  },
};

// ─── Riwayat ──────────────────────────────────────────────────────────────────
const riwayat = ref<RiwayatRow[]>([]);
const showRiwayatDialog = ref(false);
const riwayatLoading = ref(false);

// Kumpulkan semua SPK unik dari ketiga tab
const getAllSpkList = (): string[] => {
  const fd = formData.value;
  const all = [
    ...fd.detail.cutting.map((r) => r.NomorSPK),
    ...fd.detail.sewing.map((r) => r.NomorSPK),
    ...fd.detail.koli.map((r) => r.NomorSPK),
  ].filter(Boolean);
  return [...new Set(all)];
};

const loadRiwayat = async () => {
  const spkList = getAllSpkList();
  if (!spkList.length) {
    riwayat.value = [];
    return;
  }
  riwayatLoading.value = true;
  try {
    const res = await planningSpkFormService.getRiwayatSpk(
      spkList,
      formData.value.pl_nomor,
    );
    riwayat.value = res.data.data ?? [];
  } catch {
    riwayat.value = [];
  } finally {
    riwayatLoading.value = false;
  }
};

// ─── useForm ──────────────────────────────────────────────────────────────────
const {
  formData,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  canSave,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<FormState>({
  menuId: "56",
  initialData: emptyData,
  fetchApi: async () => {
    const res = await planningSpkFormService.getFormDetail(nomorParam.value);
    const d = res.data.data;
    const h = d.header;

    const result: FormState = {
      pl_nomor: h.pl_nomor ?? "",
      pl_tgl1: formatDateLocal(h.pl_tgl1) || toLocalDate(monday),
      pl_tgl2: formatDateLocal(h.pl_tgl2) || toLocalDate(saturday),
      pl_cab: h.pl_cab ?? "",
      pl_keterangan: h.pl_keterangan ?? "",
      detail: {
        cutting: (d.detail?.cutting?.length
          ? d.detail.cutting
          : [emptyRow(toLocalDate(yesterday))]
        ).map((r: any) => mapRow(r, toLocalDate(yesterday))),
        sewing: (d.detail?.sewing ?? []).map((r: any) =>
          mapRow(r, toLocalDate(monday)),
        ),
        koli: (d.detail?.koli?.length
          ? d.detail.koli
          : [emptyRow(toLocalDate(monday))]
        ).map((r: any) => mapRow(r, toLocalDate(monday))),
      },
    };

    // Load riwayat setelah data siap
    setTimeout(loadRiwayat, 100);
    return result;
  },
  submitApi: async (payload) => {
    const clean = {
      ...payload,
      detail: {
        cutting: (payload.detail.cutting as TabRow[])
          .filter((r) => r.NomorSPK && r.plan_tgl_jadwal)
          .map(
            ({
              _key,
              _spkLoading,
              _supplierLoading,
              NamaSPK,
              QtySPK,
              supplierKode,
              supplierNama,
              ...r
            }) => r,
          ),
        sewing: (payload.detail.sewing as TabRow[])
          .filter((r) => r.NomorSPK)
          .map((r) => ({
            NomorSPK: r.NomorSPK,
            plan_tgl_jadwal: payload.pl_tgl1, // sewing mingguan: tanggal = awal periode
            plan_line_kelompok: r.plan_line_kelompok,
            plan_keterangan: r.plan_keterangan,
            plan_hari: r.plan_hari,
            plan_jam: r.plan_jam,
            plan_target_output: r.plan_target_output,
            plan_smv: r.plan_smv,
            plan_mp: r.mp,
          })),
        koli: (payload.detail.koli as TabRow[])
          .filter((r) => r.NomorSPK && r.plan_tgl_jadwal)
          .map(
            ({
              _key,
              _spkLoading,
              _supplierLoading,
              NamaSPK,
              QtySPK,
              plan_line_kelompok,
              supplierKode,
              supplierNama,
              ...r
            }) => r,
          ),
      },
    };
    return planningSpkFormService.saveData(clean);
  },
  onSuccessRoute: "",
  onSuccess: () => {
    toast.success("Planning berhasil disimpan.");
    router.push({ name: "PpicPlanningSpk" });
  },
});

// ─── SPK Lookup per baris ─────────────────────────────────────────────────────
type TabKey = "cutting" | "sewing" | "koli";
const showSpkModal = ref(false);
const activeTab = ref<TabKey>("cutting");
const activeRowIdx = ref(-1);

// Master Line/Kelompok dari tkelompok (cab P04)
const kelompokCutting = ref<string[]>([]); // lini POTONG
const kelompokSewing = ref<string[]>([]); // lini JAHIT
const LINE_EXTERNAL = "LINE EXTERNAL"; // bukan bagian dari master
const LINE_OPTIONS = computed(() => [
  ...kelompokSewing.value.filter((l) => l !== LINE_EXTERNAL),
  LINE_EXTERNAL,
]);

const loadKelompok = async () => {
  try {
    const [potong, jahit] = await Promise.all([
      planningSpkFormService.getKelompok("POTONG", "P04"),
      planningSpkFormService.getKelompok("JAHIT", "P04"),
    ]);
    kelompokCutting.value = potong.data.data ?? [];
    kelompokSewing.value = jahit.data.data ?? [];
  } catch (e: any) {
    toast.error(
      e.response?.data?.message ?? "Gagal memuat daftar Line/Kelompok.",
    );
  }
};
loadKelompok();

// Data lama bisa berisi teks bebas yang tidak ada di master: tetap ditampilkan
// supaya tidak hilang diam-diam saat form dibuka dan disimpan ulang.
const cuttingOptions = (row: TabRow) =>
  !row.plan_line_kelompok ||
  kelompokCutting.value.includes(row.plan_line_kelompok)
    ? kelompokCutting.value
    : [row.plan_line_kelompok, ...kelompokCutting.value];

const openSpkModal = (tab: TabKey, idx: number) => {
  activeTab.value = tab;
  activeRowIdx.value = idx;
  showSpkModal.value = true;
};

const onSpkKeydown = (e: KeyboardEvent, tab: TabKey, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openSpkModal(tab, idx);
  }
};

const onSpkEnter = async (tab: TabKey, idx: number) => {
  const row = formData.value.detail[tab][idx];
  if (!row.NomorSPK?.trim()) return;
  await resolveSpk(tab, idx, row.NomorSPK.trim());
};

const onSpkSelected = async (item: any) => {
  showSpkModal.value = false;
  const nomor = (item?.Nomor ?? item?.spk_nomor ?? "").trim();
  if (!nomor) return;
  const tab = activeTab.value;
  const idx = activeRowIdx.value;
  formData.value.detail[tab][idx].NomorSPK = nomor;
  await resolveSpk(tab, idx, nomor);
};

const resolveSpk = async (tab: TabKey, idx: number, nomor: string) => {
  const rows = formData.value.detail[tab];
  const row = rows[idx];

  // Sewing: duplikat dinilai per SPK + Line (satu SPK boleh di beberapa line).
  // Tab lain: SPK + tanggal jadwal yang sama.
  const isDup =
    tab === "sewing"
      ? !!row.plan_line_kelompok &&
        rows.some(
          (r, i) =>
            i !== idx &&
            r.NomorSPK === nomor &&
            r.plan_line_kelompok === row.plan_line_kelompok,
        )
      : rows.some(
          (r, i) =>
            i !== idx &&
            r.NomorSPK === nomor &&
            r.plan_tgl_jadwal === row.plan_tgl_jadwal,
        );
  if (isDup) {
    toast.warning(
      tab === "sewing"
        ? `SPK ${nomor} sudah ada di ${row.plan_line_kelompok} pada tab Sewing.`
        : `SPK ${nomor} sudah ada di baris lain pada tanggal ${row.plan_tgl_jadwal} untuk tab ini.`,
    );
    row.NomorSPK = "";
    return;
  }

  row._spkLoading = true;
  try {
    // Paralel: ambil info SPK + qty PO Jasa sekaligus
    const [resSpk, resPo] = await Promise.all([
      planningSpkFormService.getSpkInfo(nomor),
      planningSpkFormService.getQtyPoJasa(nomor),
    ]);

    const s = resSpk.data.data;
    const po = resPo.data.data;

    row.NamaSPK = s.spk_nama ?? "";
    row.QtySPK = Number(s.spk_jumlah) || 0;
    row._spkDetail = [
      `SPK     : ${s.spk_nomor}`,
      `Tgl SPK : ${s.spk_tanggal ?? "-"}`,
      `Dateline: ${s.spk_dateline ?? "-"}`,
      `Desain  : ${s.spk_nama ?? "-"}`,
      `Jumlah  : ${Number(s.spk_jumlah).toLocaleString("id-ID")} pcs`,
      `Workshop: ${s.spk_workshop_kode ?? ""} ${s.spk_workshop ?? ""}`.trim(),
      `Tipe    : ${s.spk_tipe ?? "-"}`,
      `Kain    : ${s.spk_kain ?? "-"}`,
      `Finishing: ${s.spk_finishing ?? "-"}`,
      `Proses  : ${
        [
          s.spk_sablon === "Y" ? "Sablon" : "",
          s.spk_sublim === "Y" ? "Sublim" : "",
          s.spk_bordir === "Y" ? "Bordir" : "",
        ]
          .filter(Boolean)
          .join(", ") || "-"
      }`,
    ].join("\n");

    if (tab === "koli") row.plan_qty_po = po.koli;
    // cutting: qty_po tetap 0, tidak ada PO Jasa

    if (tab === "sewing") {
      // SPK berganti → buang nilai lama yang melekat ke SPK sebelumnya
      if (row._spkResolved !== nomor) {
        row.plan_smv = 0;
        row.smv_sumber = "";
        row._mpLocked = false;
        row._smvConfirmed = false;
        row._spkResolved = nomor;
      }
      if (await refreshSewingRef()) {
        applyMpSmv(row);
        applyActual(row);
      }
      if (needsSmvConfirm(row)) openSmvDialog(idx);
    }

    const rows = formData.value.detail[tab];
    if (tab === "sewing") {
      // Baris SPK kosong berikutnya muncul di LINE yang sama
      const line = row.plan_line_kelompok;
      const isLastOfLine = !rows.some(
        (r, i) => i > idx && r.plan_line_kelompok === line,
      );
      if (line && isLastOfLine) rows.push(newSewingRow(line));
    } else if (idx === rows.length - 1) {
      const defaultTgl =
        tab === "cutting" ? toLocalDate(yesterday) : toLocalDate(monday);
      rows.push(emptyRow(defaultTgl));
    }

    await loadRiwayat();
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? "SPK tidak ditemukan.");
    row.NomorSPK = "";
    row.NamaSPK = "";
    row.QtySPK = 0;
    row._spkDetail = "";
  } finally {
    row._spkLoading = false;
  }
};

const isExternalLine = (row: TabRow) =>
  row.plan_line_kelompok === "LINE EXTERNAL";

// ─── Sewing: referensi MP / SMV / actual ──────────────────────────────────────
interface SewingRef {
  mpByLine: Record<string, number>;
  actualJamByLine: Record<string, number>;
  smvBySpk: Record<string, { smv: number; sumber: "PROOF" | "MANUAL" }>;
  actualOutputBySpkLine: Record<string, number>;
}
const emptySewingRef = (): SewingRef => ({
  mpByLine: {},
  actualJamByLine: {},
  smvBySpk: {},
  actualOutputBySpkLine: {},
});
const sewingRef = ref<SewingRef>(emptySewingRef());
let refSeq = 0; // buang respons lama kalau ada request yang lebih baru

// Ambil referensi untuk semua line & SPK yang ada di tab Sewing.
// Return true kalau data berhasil diperbarui.
const refreshSewingRef = async (): Promise<boolean> => {
  const { pl_tgl1, pl_tgl2 } = formData.value;
  if (!pl_tgl1 || !pl_tgl2 || pl_tgl1 > pl_tgl2) return false;

  const rows = formData.value.detail.sewing;
  const lines = [
    ...new Set(rows.map((r) => r.plan_line_kelompok).filter(Boolean)),
  ];
  const spkList = [...new Set(rows.map((r) => r.NomorSPK).filter(Boolean))];
  if (!lines.length && !spkList.length) {
    sewingRef.value = emptySewingRef();
    return true;
  }

  const seq = ++refSeq;
  try {
    const res = await planningSpkFormService.getSewingReferensi({
      tgl1: pl_tgl1,
      tgl2: pl_tgl2,
      lines,
      spkList,
    });
    if (seq !== refSeq) return false;
    sewingRef.value = { ...emptySewingRef(), ...res.data.data };
    return true;
  } catch (e: any) {
    toast.error(
      e.response?.data?.message ?? "Gagal memuat data MP/SMV/actual Sewing.",
    );
    return false;
  }
};

// MP dari line, SMV dari SPK
const applyMpSmv = (row: TabRow) => {
  const ref = sewingRef.value;
  if (!row.plan_line_kelompok) {
    row.mp = 0;
  } else if (!row._mpLocked) {
    row.mp = ref.mpByLine[row.plan_line_kelompok] ?? 0;
  }
  if (!row.NomorSPK) return;

  const p = ref.smvBySpk[row.NomorSPK];
  if (p?.sumber === "PROOF") {
    row.plan_smv = p.smv;
    row.smv_sumber = "PROOF";
  } else {
    if (row.smv_sumber !== "MANUAL") row.plan_smv = 0;
    row.smv_sumber = "MANUAL";
  }
};

// Actual output (per SPK + line) dan actual jam kerja (per line)
const applyActual = (row: TabRow) => {
  const ref = sewingRef.value;
  row.actual_jam = row.plan_line_kelompok
    ? (ref.actualJamByLine[row.plan_line_kelompok] ?? null)
    : null;
  row.actual_output =
    row.NomorSPK && row.plan_line_kelompok
      ? (ref.actualOutputBySpkLine[
          `${row.NomorSPK}|${row.plan_line_kelompok}`
        ] ?? 0)
      : 0;
};

// Rumus sama persis dengan backend
const waktuProduksi = (row: TabRow) =>
  (Number(row.plan_hari) || 0) * (Number(row.plan_jam) || 0) * 60;
const resumeOf = (row: TabRow): number | null =>
  row.mp > 0 && row.plan_smv > 0
    ? ((Number(row.plan_target_output) || 0) * row.plan_smv) / row.mp
    : null;
const isOverTime = (row: TabRow) => {
  const r = resumeOf(row);
  return r !== null && r > waktuProduksi(row);
};
const fmtDec = (n: number | null | undefined, d = 2) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("id-ID", { maximumFractionDigits: d });

const isDupSewing = (idx: number) => {
  const rows = formData.value.detail.sewing;
  const r = rows[idx];
  return (
    !!r.NomorSPK &&
    !!r.plan_line_kelompok &&
    rows.some(
      (o, i) =>
        i !== idx &&
        o.NomorSPK === r.NomorSPK &&
        o.plan_line_kelompok === r.plan_line_kelompok,
    )
  );
};

const onLineChange = async (idx: number) => {
  const row = formData.value.detail.sewing[idx];
  row._mpLocked = false; // MP tersimpan milik line lama
  if (isDupSewing(idx)) {
    toast.warning(
      `SPK ${row.NomorSPK} sudah ada di ${row.plan_line_kelompok} pada tab Sewing.`,
    );
    row.plan_line_kelompok = "";
  }
  if (await refreshSewingRef()) {
    applyMpSmv(row);
    applyActual(row);
  }
  if (needsSmvConfirm(row)) openSmvDialog(idx);
};

// ── Dialog konfirmasi SMV manual ──
const needsSmvConfirm = (row: TabRow) =>
  !!row.NomorSPK &&
  row.smv_sumber === "MANUAL" &&
  !isExternalLine(row) &&
  !row._smvConfirmed;

const showSmvDialog = ref(false);
const smvDialogIdx = ref(-1);
const smvDialogSpk = computed(
  () => formData.value.detail.sewing[smvDialogIdx.value]?.NomorSPK ?? "",
);
const openSmvDialog = (idx: number) => {
  if (showSmvDialog.value) return;
  smvDialogIdx.value = idx;
  showSmvDialog.value = true;
};
const confirmSmvManual = () => {
  const row = formData.value.detail.sewing[smvDialogIdx.value];
  if (row) row._smvConfirmed = true;
  showSmvDialog.value = false;
};
const cancelSmvManual = () => {
  const row = formData.value.detail.sewing[smvDialogIdx.value];
  if (row) {
    row.NomorSPK = "";
    row.NamaSPK = "";
    row.QtySPK = 0;
    row._spkDetail = "";
    row._spkResolved = "";
    row.plan_qty_po = 0;
    row.plan_smv = 0;
    row.smv_sumber = "";
    row.actual_output = 0;
    row._smvConfirmed = false;
  }
  showSmvDialog.value = false;
};

// Periode berubah → actual output & actual jam ikut dihitung ulang
watch(
  () => `${formData.value.pl_tgl1}|${formData.value.pl_tgl2}`,
  async () => {
    if (await refreshSewingRef()) {
      formData.value.detail.sewing.forEach(applyActual);
    }
  },
);

// ─── Sewing: blok per Line (LINE A–K, tiap line bisa banyak SPK) ──────────────
// Data tetap datar di formData.detail.sewing (1 baris = 1 SPK + line-nya).
// Pengelompokan hanya untuk tampilan.
const sewingGroups = computed(() => {
  const map = new Map<
    string,
    { line: string; items: { row: TabRow; idx: number }[] }
  >();
  formData.value.detail.sewing.forEach((row, idx) => {
    const k = row.plan_line_kelompok || "";
    if (!map.has(k)) map.set(k, { line: k, items: [] });
    map.get(k)!.items.push({ row, idx });
  });
  const orderOf = (l: string) => {
    if (!l) return -1; // tanpa line (data lama) paling atas
    const i = LINE_OPTIONS.value.indexOf(l);
    return i === -1 ? 999 : i; // line yang tidak ada di master: paling bawah
  };
  return [...map.values()].sort((a, b) => orderOf(a.line) - orderOf(b.line));
});

const availableLines = computed(() =>
  LINE_OPTIONS.value.filter(
    (l) =>
      !formData.value.detail.sewing.some((r) => r.plan_line_kelompok === l),
  ),
);

// Baris SPK baru di sebuah line: MP & actual jam ikut baris lain di line itu
const newSewingRow = (line: string): TabRow => {
  const row = emptyRow(toLocalDate(monday));
  row.plan_line_kelompok = line;
  const sib = formData.value.detail.sewing.find(
    (r) => r.plan_line_kelompok === line,
  );
  if (sib) {
    row.mp = sib.mp;
    row._mpLocked = sib._mpLocked;
    row.actual_jam = sib.actual_jam;
  }
  return row;
};

const newLineSel = ref("");
const onPickNewLine = async () => {
  const line = newLineSel.value;
  newLineSel.value = "";
  if (!line) return;
  const rows = formData.value.detail.sewing;
  if (rows.some((r) => r.plan_line_kelompok === line)) {
    toast.warning(`${line} sudah ada.`);
    return;
  }
  rows.push(newSewingRow(line));
  await onLineChange(rows.length - 1); // ambil MP & actual jam line ini
};

const addSewingSpk = (line: string) => {
  formData.value.detail.sewing.push(newSewingRow(line));
};

// MP per line: default dari DB, boleh diedit. Berlaku ke semua SPK di line itu.
const setLineMp = (line: string, val: string) => {
  const mp = Math.max(0, Math.floor(Number(val) || 0));
  formData.value.detail.sewing.forEach((r) => {
    if (r.plan_line_kelompok === line) {
      r.mp = mp;
      r._mpLocked = true; // jangan ditimpa refresh dari DB
    }
  });
};

const mpDiffersFromDb = (line: string, mp: number) =>
  mp !== (sewingRef.value.mpByLine[line] ?? 0);

const resetLineMp = async (line: string) => {
  const rows = formData.value.detail.sewing.filter(
    (r) => r.plan_line_kelompok === line,
  );
  rows.forEach((r) => (r._mpLocked = false));
  if (await refreshSewingRef()) rows.forEach(applyMpSmv);
};

// Hanya boleh kalau semua baris di line itu masih kosong (tombolnya disabled
// selama masih ada SPK) supaya tidak ada SPK yang hilang tanpa sengaja.
const removeSewingLine = (line: string) => {
  const rows = formData.value.detail.sewing;
  if (rows.some((r) => r.plan_line_kelompok === line && r.NomorSPK)) {
    toast.warning("Hapus dulu SPK di line ini.");
    return;
  }
  formData.value.detail.sewing = rows.filter(
    (r) => r.plan_line_kelompok !== line,
  );
};

// Data lama yang tersimpan tanpa line: pilih line untuk semua barisnya
const assignLine = async (newLine: string) => {
  if (!newLine) return;
  const rows = formData.value.detail.sewing;
  if (rows.some((r) => r.plan_line_kelompok === newLine)) {
    toast.warning(
      `${newLine} sudah ada. Tambah SPK langsung di blok ${newLine}.`,
    );
    return;
  }
  const blanks = rows.filter((r) => !r.plan_line_kelompok);
  blanks.forEach((r) => {
    r.plan_line_kelompok = newLine;
    r._mpLocked = false;
  });
  if (await refreshSewingRef()) {
    blanks.forEach((r) => {
      applyMpSmv(r);
      applyActual(r);
    });
  }
  const i = rows.findIndex(
    (r) => r.plan_line_kelompok === newLine && needsSmvConfirm(r),
  );
  if (i >= 0) openSmvDialog(i);
};

// ─── Row helpers ──────────────────────────────────────────────────────────────
const addRow = (tab: TabKey) => {
  const defaultTgl =
    tab === "cutting"
      ? toLocalDate(tomorrow) // H+1
      : toLocalDate(monday);
  formData.value.detail[tab].push(emptyRow(defaultTgl));
};

const removeRow = (tab: TabKey, idx: number) => {
  // Hapus validasi minimal 1 baris
  formData.value.detail[tab].splice(idx, 1);
  loadRiwayat();
};

// ─── Validasi ─────────────────────────────────────────────────────────────────
const validateSave = () => {
  if (!canSave.value) return toast.error("Hak akses simpan ditolak.");
  if (!formData.value.pl_tgl1 || !formData.value.pl_tgl2)
    return toast.warning("Periode planning wajib diisi.");

  const hasData =
    formData.value.detail.cutting.some((r) => r.NomorSPK) ||
    formData.value.detail.sewing.some((r) => r.NomorSPK) ||
    formData.value.detail.koli.some((r) => r.NomorSPK);
  if (!hasData)
    return toast.warning("Minimal isi satu baris SPK di salah satu tab.");

  // ── Validasi khusus Sewing ──
  const sw = formData.value.detail.sewing.filter((r) => r.NomorSPK);
  if (sw.some((r) => !r.plan_line_kelompok))
    return toast.warning("Pilih Line untuk setiap baris Sewing.");
  if (sw.some((r) => !(r.plan_hari > 0) || !(r.plan_jam > 0)))
    return toast.warning("Jumlah hari dan jam Sewing harus lebih dari 0.");
  if (sw.some((r) => !(r.plan_target_output > 0)))
    return toast.warning("Target output Sewing wajib diisi (lebih dari 0).");
  if (sw.some((r) => !isExternalLine(r) && !(r.mp > 0)))
    return toast.warning(
      "MP wajib diisi (lebih dari 0) untuk setiap Line Sewing.",
    );
  const swKeys = new Set<string>();
  for (const r of sw) {
    const k = `${r.NomorSPK}|${r.plan_line_kelompok}`;
    if (swKeys.has(k))
      return toast.warning(
        `SPK ${r.NomorSPK} dobel di ${r.plan_line_kelompok} pada tab Sewing.`,
      );
    swKeys.add(k);
  }
  if (sw.some(needsSmvConfirm))
    return toast.warning(
      "Ada SPK Sewing tanpa Proof Garmen yang SMV-nya belum dikonfirmasi.",
    );
  if (
    sw.some(
      (r) =>
        !isExternalLine(r) && r.smv_sumber === "MANUAL" && !(r.plan_smv > 0),
    )
  )
    return toast.warning(
      "SMV wajib diisi untuk SPK Sewing tanpa Proof Garmen.",
    );

  showSaveDialog.value = true;
};

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("id-ID");

watch(
  () => [formData.value.pl_tgl1, formData.value.pl_tgl2],
  () => {
    formData.value.detail.koli.forEach((_, i) => clampToPeriode("koli", i));
  },
);
</script>

<template>
  <BaseForm
    :title="(isEdit ? 'Ubah' : 'Baru') + ' Planning SPK PPIC'"
    menu-id="56"
    :icon="IconCalendarStats"
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
    <!-- ══ LEFT COLUMN ══ -->
    <template #left-column>
      <div class="lc-wrap">
        <div class="sec-card">
          <div class="sec-label">Dokumen</div>
          <div class="fr">
            <span class="lbl">Nomor</span>
            <input
              :value="formData.pl_nomor"
              class="inp ro"
              placeholder="&lt;-- Otomatis"
              readonly
            />
          </div>
          <div class="fr">
            <span class="lbl">Tgl Awal</span>
            <input type="date" v-model="formData.pl_tgl1" class="idate" />
          </div>
          <div class="fr">
            <span class="lbl">Tgl Akhir</span>
            <input type="date" v-model="formData.pl_tgl2" class="idate" />
          </div>
          <div class="fr">
            <span class="lbl">Cabang</span>
            <input v-model="formData.pl_cab" class="inp" maxlength="10" />
          </div>
          <div class="fr">
            <span class="lbl">Keterangan</span>
            <input
              v-model="formData.pl_keterangan"
              class="inp"
              maxlength="200"
            />
          </div>
        </div>

        <!-- Tombol Riwayat -->
        <div class="mt-2">
          <v-btn
            size="small"
            variant="tonal"
            color="blue-grey"
            :loading="riwayatLoading"
            :disabled="!getAllSpkList().length"
            @click="showRiwayatDialog = true"
          >
            <template #prepend><IconHistory :size="14" /></template>
            Riwayat Planning
            <v-chip
              v-if="riwayat.length"
              size="x-small"
              color="primary"
              variant="flat"
              class="ml-2"
            >
              {{ riwayat.length }}
            </v-chip>
          </v-btn>
        </div>

        <!-- Info SPK yang sudah diinput -->
        <div class="spk-summary mt-2" v-if="getAllSpkList().length">
          <div class="sec-label">SPK Dalam Planning Ini</div>
          <div
            v-for="tab in ['cutting', 'sewing', 'koli'] as TabKey[]"
            :key="tab"
          >
            <template v-if="formData.detail[tab].some((r) => r.NomorSPK)">
              <div class="spk-summary-tab">{{ tab.toUpperCase() }}</div>
              <div
                v-for="r in formData.detail[tab].filter((r) => r.NomorSPK)"
                :key="r._key"
                class="spk-summary-row"
              >
                <span class="mono">{{ r.NomorSPK }}</span>
                <span class="spk-summary-nama">{{ r.NamaSPK }}</span>
                <span class="spk-summary-qty">{{ fmt(r.QtySPK) }} pcs</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ RIGHT COLUMN — 3 Tab ══ -->
    <template #right-column>
      <div class="rc-wrap">
        <v-tabs v-model="activeTab" density="compact" class="tab-header">
          <v-tab value="cutting" class="tab-item"
            >Cutting
            <v-chip
              v-if="formData.detail.cutting.some((r) => r.NomorSPK)"
              size="x-small"
              color="blue-grey"
              variant="flat"
              class="ml-1"
            >
              {{ formData.detail.cutting.filter((r) => r.NomorSPK).length }}
            </v-chip>
          </v-tab>
          <v-tab value="sewing" class="tab-item"
            >Sewing
            <v-chip
              v-if="formData.detail.sewing.some((r) => r.NomorSPK)"
              size="x-small"
              color="green"
              variant="flat"
              class="ml-1"
            >
              {{ formData.detail.sewing.filter((r) => r.NomorSPK).length }}
            </v-chip>
          </v-tab>
          <v-tab value="koli" class="tab-item"
            >Koli
            <v-chip
              v-if="formData.detail.koli.some((r) => r.NomorSPK)"
              size="x-small"
              color="orange"
              variant="flat"
              class="ml-1"
            >
              {{ formData.detail.koli.filter((r) => r.NomorSPK).length }}
            </v-chip>
          </v-tab>
        </v-tabs>

        <v-tabs-window v-model="activeTab" class="tab-content">
          <!-- ── Tab Cutting ── -->
          <v-tabs-window-item value="cutting" class="tab-pane">
            <div class="tab-info">
              Jadwal default: <b>H+1</b> (hari sesudah planning dibuat)
            </div>
            <div class="tbl-hdr blue">
              <span>Divisi Cutting</span>
              <button type="button" class="btn-add" @click="addRow('cutting')">
                <IconPlus :size="12" /> Tambah Baris
              </button>
            </div>
            <div class="tbl-wrap">
              <table class="gt">
                <thead>
                  <tr>
                    <th style="width: 28px">No</th>
                    <th style="width: 130px">Nomor SPK</th>
                    <th style="width: 220px">Nama SPK</th>
                    <th style="width: 75px" class="tr">Qty SPK</th>
                    <th style="width: 110px">Tgl Jadwal</th>
                    <th style="width: 80px" class="tr">WIP</th>
                    <th style="width: 80px" class="tr">Qty PO</th>
                    <th style="width: 85px" class="tr bg-yellow">Qty Jadwal</th>
                    <th style="width: 150px">Line/Kelompok</th>
                    <th style="width: 150px">Keterangan</th>
                    <th style="width: 32px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, idx) in formData.detail.cutting"
                    :key="row._key"
                  >
                    <td class="tc lbl-cell">{{ (idx as number) + 1 }}</td>
                    <td style="padding: 0">
                      <div class="gi-group">
                        <input
                          v-model="row.NomorSPK"
                          class="gi"
                          style="text-transform: uppercase"
                          placeholder="F1 / Enter"
                          @keydown="
                            (e) => onSpkKeydown(e, 'cutting', idx as number)
                          "
                          @keydown.enter.prevent="
                            onSpkEnter('cutting', idx as number)
                          "
                        />
                        <button
                          class="btn-gi-lkp"
                          :class="{ loading: row._spkLoading }"
                          @click="openSpkModal('cutting', idx as number)"
                        >
                          <IconSearch :size="11" />
                        </button>
                      </div>
                    </td>
                    <td class="ro-cell" :title="row._spkDetail">
                      {{ row.NamaSPK || "—" }}
                    </td>
                    <td class="ro-cell tr">
                      {{ row.QtySPK ? fmt(row.QtySPK) : "—" }}
                    </td>
                    <td style="padding: 0">
                      <input
                        type="date"
                        v-model="row.plan_tgl_jadwal"
                        class="gi"
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="number"
                        v-model.number="row.plan_wip"
                        min="0"
                        class="gi tr"
                        v-select-on-focus
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="number"
                        v-model.number="row.plan_qty_po"
                        min="0"
                        class="gi tr"
                        v-select-on-focus
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="number"
                        v-model.number="row.plan_qty_jadwal"
                        min="0"
                        class="gi tr yellow-cell"
                        v-select-on-focus
                      />
                    </td>
                    <td style="padding: 0">
                      <select
                        v-model="row.plan_line_kelompok"
                        class="gi gi-sel"
                      >
                        <option value="">-- Pilih --</option>
                        <option
                          v-for="k in cuttingOptions(row)"
                          :key="k"
                          :value="k"
                        >
                          {{ k }}
                        </option>
                      </select>
                    </td>
                    <td style="padding: 0">
                      <input
                        type="text"
                        v-model="row.plan_keterangan"
                        class="gi"
                        maxlength="200"
                        placeholder="Keterangan..."
                      />
                    </td>
                    <td class="tc" style="padding: 0">
                      <button
                        type="button"
                        class="btn-del"
                        @click="removeRow('cutting', idx as number)"
                      >
                        <IconTrash :size="12" />
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!formData.detail.cutting.length">
                    <td colspan="11" class="empty-row">Klik + Tambah Baris</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-tabs-window-item>

          <!-- ── Tab Sewing ── -->
          <v-tabs-window-item value="sewing" class="tab-pane">
            <div class="tab-info">
              Periode: <b>{{ formData.pl_tgl1 }}</b> s/d
              <b>{{ formData.pl_tgl2 }}</b>
              · Actual output (mutasi GP003 → GP004) dan actual jam (absensi)
              dihitung pada periode ini.
            </div>
            <div class="tbl-hdr green">
              <span>Divisi Sewing</span>
              <select
                v-model="newLineSel"
                class="sel-add-line"
                @change="onPickNewLine"
              >
                <option value="">+ Tambah Line...</option>
                <option v-for="l in availableLines" :key="l" :value="l">
                  {{ l }}
                </option>
              </select>
            </div>
            <div class="tbl-wrap">
              <table class="gt">
                <thead>
                  <tr>
                    <th style="width: 28px">No</th>
                    <th style="width: 130px">Nomor SPK</th>
                    <th style="width: 220px">Nama SPK</th>
                    <th style="width: 70px" class="tr">Qty SPK</th>
                    <th style="width: 80px" class="tr">SMV (mnt)</th>
                    <th style="width: 55px" class="tr">Hari</th>
                    <th style="width: 55px" class="tr">Jam</th>
                    <th style="width: 85px" class="tr bg-yellow">Target</th>
                    <th style="width: 80px" class="tr">Act. Output</th>
                    <th style="width: 85px" class="tr">Waktu Prod (mnt)</th>
                    <th style="width: 85px" class="tr">Resume (mnt)</th>
                    <th style="width: 200px">Keterangan</th>
                    <th style="width: 32px"></th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="g in sewingGroups" :key="g.line || '_blank'">
                    <!-- Header blok Line: Line, MP, Actual Jam sekali saja -->
                    <tr class="grp-row">
                      <td colspan="13">
                        <div class="grp-bar">
                          <span v-if="g.line" class="grp-title">{{
                            g.line
                          }}</span>
                          <select
                            v-else
                            class="grp-sel"
                            @change="
                              assignLine(
                                ($event.target as HTMLSelectElement).value,
                              )
                            "
                          >
                            <option value="">-- Pilih Line --</option>
                            <option
                              v-for="l in availableLines"
                              :key="l"
                              :value="l"
                            >
                              {{ l }}
                            </option>
                          </select>
                          <span class="grp-chip"
                            >MP
                            <input
                              type="number"
                              class="grp-mp"
                              min="0"
                              step="1"
                              :disabled="!g.line"
                              :value="g.line ? g.items[0].row.mp : ''"
                              :title="
                                g.line
                                  ? `Dari database: ${fmtDec(sewingRef.mpByLine[g.line] ?? 0, 0)}`
                                  : ''
                              "
                              v-select-on-focus
                              @change="
                                setLineMp(
                                  g.line,
                                  ($event.target as HTMLInputElement).value,
                                )
                              "
                            />
                            <button
                              v-if="
                                g.line &&
                                mpDiffersFromDb(g.line, g.items[0].row.mp)
                              "
                              type="button"
                              class="btn-mp-reset"
                              title="Kembalikan ke jumlah dari database"
                              @click="resetLineMp(g.line)"
                            >
                              reset
                            </button>
                          </span>
                          <span class="grp-chip"
                            >Act. Jam
                            <b>{{ fmtDec(g.items[0].row.actual_jam) }}</b></span
                          >
                          <span class="grp-spacer"></span>
                          <button
                            type="button"
                            class="btn-grp"
                            @click="addSewingSpk(g.line)"
                          >
                            <IconPlus :size="11" /> SPK
                          </button>
                          <button
                            type="button"
                            class="btn-grp del"
                            :disabled="g.items.some((i) => i.row.NomorSPK)"
                            title="Hapus line (hanya bisa kalau belum ada SPK)"
                            @click="removeSewingLine(g.line)"
                          >
                            <IconTrash :size="11" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    <!-- Baris SPK di dalam line -->
                    <tr v-for="({ row, idx }, n) in g.items" :key="row._key">
                      <td class="tc lbl-cell">{{ n + 1 }}</td>

                      <td style="padding: 0">
                        <div class="gi-group">
                          <input
                            v-model="row.NomorSPK"
                            class="gi"
                            style="text-transform: uppercase"
                            placeholder="F1 / Enter"
                            @keydown="(e) => onSpkKeydown(e, 'sewing', idx)"
                            @keydown.enter.prevent="onSpkEnter('sewing', idx)"
                          />
                          <button
                            class="btn-gi-lkp"
                            :class="{ loading: row._spkLoading }"
                            @click="openSpkModal('sewing', idx)"
                          >
                            <IconSearch :size="11" />
                          </button>
                        </div>
                      </td>
                      <td class="ro-cell" :title="row._spkDetail">
                        {{ row.NamaSPK || "—" }}
                      </td>
                      <td class="ro-cell tr">
                        {{ row.QtySPK ? fmt(row.QtySPK) : "—" }}
                      </td>

                      <!-- SMV: PROOF = terkunci, MANUAL = input -->
                      <td style="padding: 0">
                        <span v-if="!row.NomorSPK" class="ro-cell dash">—</span>
                        <div
                          v-else-if="row.smv_sumber === 'PROOF'"
                          class="lock-cell"
                          title="Dari Proof Garmen lini Jahit (tidak bisa diubah)"
                        >
                          <IconLock :size="11" />
                          {{ fmtDec(row.plan_smv, 3) }}
                        </div>
                        <input
                          v-else
                          type="number"
                          v-model.number="row.plan_smv"
                          min="0"
                          step="0.01"
                          class="gi tr manual-cell"
                          title="Input manual: SPK ini tidak punya Proof Garmen lini Jahit"
                          v-select-on-focus
                        />
                      </td>

                      <td style="padding: 0">
                        <input
                          type="number"
                          v-model.number="row.plan_hari"
                          min="0"
                          step="0.5"
                          class="gi tr"
                          v-select-on-focus
                        />
                      </td>
                      <td style="padding: 0">
                        <input
                          type="number"
                          v-model.number="row.plan_jam"
                          min="0"
                          step="0.5"
                          class="gi tr"
                          v-select-on-focus
                        />
                      </td>
                      <td style="padding: 0">
                        <input
                          type="number"
                          v-model.number="row.plan_target_output"
                          min="0"
                          class="gi tr yellow-cell"
                          v-select-on-focus
                        />
                      </td>

                      <td class="ro-cell tr">
                        {{ row.NomorSPK ? fmt(row.actual_output) : "—" }}
                      </td>
                      <td class="ro-cell tr">
                        {{ row.NomorSPK ? fmtDec(waktuProduksi(row), 0) : "—" }}
                      </td>
                      <td
                        class="ro-cell tr"
                        :class="{ over: isOverTime(row) }"
                        :title="
                          isOverTime(row)
                            ? 'Resume melebihi waktu produksi: target tidak muat'
                            : ''
                        "
                      >
                        {{ fmtDec(resumeOf(row), 1) }}
                      </td>

                      <td style="padding: 0">
                        <input
                          type="text"
                          v-model="row.plan_keterangan"
                          class="gi"
                          maxlength="200"
                          placeholder="Keterangan..."
                        />
                      </td>
                      <td class="tc" style="padding: 0">
                        <button
                          type="button"
                          class="btn-del"
                          @click="removeRow('sewing', idx)"
                        >
                          <IconTrash :size="12" />
                        </button>
                      </td>
                    </tr>
                  </template>
                  <tr v-if="!formData.detail.sewing.length">
                    <td colspan="13" class="empty-row">
                      Pilih "+ Tambah Line..." untuk mulai
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-tabs-window-item>

          <!-- ── Tab Koli ── -->
          <v-tabs-window-item value="koli" class="tab-pane">
            <div class="tab-info">
              Periode: <b>{{ formData.pl_tgl1 }}</b> s/d
              <b>{{ formData.pl_tgl2 }}</b>
            </div>
            <div class="tbl-hdr orange">
              <span>Divisi Koli</span>
              <button type="button" class="btn-add" @click="addRow('koli')">
                <IconPlus :size="12" /> Tambah Baris
              </button>
            </div>
            <div class="tbl-wrap">
              <table class="gt">
                <thead>
                  <tr>
                    <th style="width: 28px">No</th>
                    <th style="width: 130px">Nomor SPK</th>
                    <th style="width: 220px">Nama SPK</th>
                    <th style="width: 75px" class="tr">Qty SPK</th>
                    <th style="width: 110px">Tgl Jadwal</th>
                    <th style="width: 80px" class="tr">WIP</th>
                    <th style="width: 80px" class="tr">Qty PO</th>
                    <th style="width: 85px" class="tr bg-yellow">Qty Jadwal</th>
                    <th style="width: 150px">Keterangan</th>
                    <th style="width: 32px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, idx) in formData.detail.koli"
                    :key="row._key"
                  >
                    <td class="tc lbl-cell">{{ (idx as number) + 1 }}</td>
                    <td style="padding: 0">
                      <div class="gi-group">
                        <input
                          v-model="row.NomorSPK"
                          class="gi"
                          style="text-transform: uppercase"
                          placeholder="F1 / Enter"
                          @keydown="
                            (e) => onSpkKeydown(e, 'koli', idx as number)
                          "
                          @keydown.enter.prevent="
                            onSpkEnter('koli', idx as number)
                          "
                        />
                        <button
                          class="btn-gi-lkp"
                          :class="{ loading: row._spkLoading }"
                          @click="openSpkModal('koli', idx as number)"
                        >
                          <IconSearch :size="11" />
                        </button>
                      </div>
                    </td>
                    <td class="ro-cell" :title="row._spkDetail">
                      {{ row.NamaSPK || "—" }}
                    </td>
                    <td class="ro-cell tr">
                      {{ row.QtySPK ? fmt(row.QtySPK) : "—" }}
                    </td>
                    <td style="padding: 0">
                      <input
                        type="date"
                        v-model="row.plan_tgl_jadwal"
                        class="gi"
                        :min="formData.pl_tgl1"
                        :max="formData.pl_tgl2"
                        @blur="clampToPeriode('koli', idx as number)"
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="number"
                        v-model.number="row.plan_wip"
                        min="0"
                        class="gi tr"
                        v-select-on-focus
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="number"
                        v-model.number="row.plan_qty_po"
                        min="0"
                        class="gi tr"
                        v-select-on-focus
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="number"
                        v-model.number="row.plan_qty_jadwal"
                        min="0"
                        class="gi tr yellow-cell"
                        v-select-on-focus
                      />
                    </td>
                    <td style="padding: 0">
                      <input
                        type="text"
                        v-model="row.plan_keterangan"
                        class="gi"
                        maxlength="200"
                        placeholder="Keterangan..."
                      />
                    </td>
                    <td class="tc" style="padding: 0">
                      <button
                        type="button"
                        class="btn-del"
                        @click="removeRow('koli', idx as number)"
                      >
                        <IconTrash :size="12" />
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!formData.detail.koli.length">
                    <td colspan="10" class="empty-row">Klik + Tambah Baris</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
      </div>
    </template>
  </BaseForm>

  <!-- SPK Modal -->
  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="spk-ppic"
    @selected="onSpkSelected"
  />

  <!-- Dialog konfirmasi SMV manual (SPK tanpa Proof Garmen) -->
  <v-dialog v-model="showSmvDialog" max-width="460" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-orange-darken-2 text-white pa-3 text-subtitle-1 font-weight-bold"
      >
        Konfirmasi SMV Manual
      </v-card-title>
      <v-card-text class="pa-4 text-body-2">
        SPK <b>{{ smvDialogSpk }}</b> tidak punya Proof Garmen lini Jahit
        (termasuk lewat nomor MAP/memo-nya), jadi SMV tidak bisa diambil
        otomatis. <br /><br />
        SMV harus Anda isi sendiri dan tidak bisa diverifikasi sistem. Nilai
        yang salah akan membuat kolom Resume tidak akurat. Lanjutkan input
        manual?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn variant="text" @click="cancelSmvManual"
          >Batal (kosongkan SPK)</v-btn
        >
        <v-btn color="orange-darken-2" variant="flat" @click="confirmSmvManual">
          Ya, input manual
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Riwayat -->
  <v-dialog v-model="showRiwayatDialog" max-width="750">
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-blue-grey-darken-2 text-white pa-3 text-subtitle-1 font-weight-bold d-flex align-center gap-2"
      >
        <IconHistory :size="16" />
        Riwayat Planning — SPK Terkait
      </v-card-title>
      <v-card-text class="pa-0">
        <div
          v-if="riwayatLoading"
          class="pa-4 text-center text-caption text-grey"
        >
          Memuat riwayat...
        </div>
        <table v-else class="rt w-100">
          <thead>
            <tr>
              <th>Nomor Plan</th>
              <th>Tgl Awal</th>
              <th>Tgl Akhir</th>
              <th>Cab</th>
              <th>Status</th>
              <th>Nomor SPK</th>
              <th>Nama SPK</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in riwayat" :key="i">
              <td class="mono">{{ r.Nomor }}</td>
              <td>{{ r.Tgl1 }}</td>
              <td>{{ r.Tgl2 }}</td>
              <td>{{ r.Cabang }}</td>
              <td>
                <span :class="r.Close === 'Y' ? 'badge-grey' : 'badge-green'">
                  {{ r.Close === "Y" ? "Closed" : "Open" }}
                </span>
              </td>
              <td class="mono">{{ r.NomorSPK }}</td>
              <td>{{ r.NamaSPK || "—" }}</td>
              <td>{{ r.Keterangan || "—" }}</td>
            </tr>
            <tr v-if="!riwayat.length">
              <td colspan="8" class="empty-row">
                Belum ada riwayat planning untuk SPK-SPK ini
              </td>
            </tr>
          </tbody>
        </table>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn variant="text" @click="showRiwayatDialog = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.lc-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px;
  overflow-y: auto;
  overflow-x: hidden;
  gap: 0;
}
.sec-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  box-sizing: border-box;
}
.sec-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #1565c0;
  margin-bottom: 2px;
}
.mt-2 {
  margin-top: 8px;
}
.fr {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 26px;
  width: 100%;
  box-sizing: border-box;
}
.lbl {
  width: 82px;
  min-width: 82px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.inp,
.idate {
  flex: 1;
  min-width: 0;
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: white;
  box-sizing: border-box;
  font-family: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inp:focus,
.idate:focus {
  border-color: #1565c0;
}
.ro {
  background: #f0f4f8 !important;
  color: #555 !important;
  cursor: default;
}

/* SPK Summary di left column */
.spk-summary {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.spk-summary-tab {
  font-size: 10px;
  font-weight: 700;
  color: #546e7a;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.spk-summary-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  padding-left: 8px;
}
.spk-summary-nama {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #424242;
}
.spk-summary-qty {
  color: #1565c0;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Right column */
.rc-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.tab-header {
  flex-shrink: 0;
  border-bottom: 2px solid #e0e0e0;
}
.tab-item {
  font-size: 11px !important;
  font-weight: 600 !important;
  text-transform: none !important;
  min-width: 110px !important;
}
.tab-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.tab-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 !important;
}
.tab-info {
  font-size: 10px;
  color: #555;
  padding: 4px 10px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.tbl-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.tbl-hdr.blue {
  background: #1565c0;
  color: white;
}
.tbl-hdr.green {
  background: #2e7d32;
  color: white;
}
.tbl-hdr.orange {
  background: #e65100;
  color: white;
}
.btn-add {
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: white;
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
}
.btn-add:hover {
  background: rgba(255, 255, 255, 0.35);
}

.tbl-wrap {
  flex: 1;
  overflow: auto;
  min-height: 0;
  border: 1px solid #bdbdbd;
  border-top: none;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  white-space: nowrap;
}
.gt thead th {
  background: #455a64;
  color: white;
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom: 2px solid #37474f;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  padding: 4px 6px;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}
.gt thead th.tr {
  text-align: right;
}
.gt thead th.bg-yellow {
  background: #f9a825 !important;
  color: #000;
}
.gt tbody td {
  border-bottom: 1px solid #eee;
  border-right: 1px solid #f0f0f0;
  height: 26px;
  vertical-align: middle;
}
.gt tbody tr:nth-of-type(even) td {
  background: rgba(0, 0, 0, 0.013);
}
.gt tbody tr:hover td {
  background: #e8f5e9 !important;
}
.lbl-cell {
  text-align: center;
  background: #f5f5f5;
  font-size: 10px;
  color: #777;
  padding: 0 4px;
}
.ro-cell {
  padding: 0 6px;
  font-size: 11px;
  color: #555;
  background: #f5f5f5 !important;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.gi {
  width: 100%;
  height: 25px;
  border: none;
  background: transparent;
  padding: 0 5px;
  font-size: 11px;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}
.gi:focus {
  background: #e3f2fd !important;
  box-shadow: inset 0 0 0 1.5px #1976d2;
}
.gi-sel {
  cursor: pointer;
}
.yellow-cell {
  background: #fffde7 !important;
}
.gi-group {
  display: flex;
  align-items: center;
  height: 25px;
}
.gi-group .gi {
  flex: 1;
}
.btn-gi-lkp {
  background: #1565c0;
  color: white;
  border: none;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 2px;
  margin-right: 2px;
}
.btn-gi-lkp:hover {
  background: #0d47a1;
}
.btn-gi-lkp.loading {
  opacity: 0.6;
  cursor: wait;
}
.btn-del {
  width: 100%;
  height: 25px;
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-del:hover {
  background: #ffebee;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px;
  font-size: 11px;
}

/* Riwayat table */
.rt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.rt thead th {
  background: #37474f;
  color: white;
  padding: 5px 8px;
  font-size: 10px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}
.rt tbody td {
  padding: 3px 8px;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
}
.w-100 {
  width: 100%;
}
.mono {
  font-family: monospace;
  font-size: 10px;
}
.badge-green {
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 2px;
}
.badge-grey {
  background: #f5f5f5;
  color: #757575;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 2px;
}

/* Sewing */
.ro-cell.dash {
  display: block;
  text-align: center;
  color: #bdbdbd;
}
.manual-cell {
  background: #fff3e0 !important;
}
.lock-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  height: 25px;
  padding: 0 6px;
  font-size: 11px;
  color: #2e7d32;
  background: #f1f8e9;
}
.ro-cell.over {
  color: #c62828;
  font-weight: 700;
  background: #ffebee !important;
}

/* Input angka tanpa spinner panah */
input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Blok Line di tab Sewing */
.gt tbody tr.grp-row td,
.gt tbody tr.grp-row:hover td {
  background: #c8e6c9 !important;
  padding: 0;
  border-bottom: 1px solid #81c784;
}
.grp-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
}
.grp-title {
  font-size: 12px;
  font-weight: 800;
  color: #1b5e20;
  min-width: 70px;
}
.grp-sel {
  height: 22px;
  font-size: 11px;
  border: 1px solid #66bb6a;
  border-radius: 3px;
  background: white;
}
.grp-chip {
  color: #2e7d32;
}
.grp-chip b {
  color: #1b5e20;
  margin-left: 2px;
}
.grp-mp {
  width: 46px;
  height: 20px;
  margin-left: 2px;
  padding: 0 4px;
  text-align: right;
  font-size: 11px;
  font-weight: 700;
  color: #1b5e20;
  background: white;
  border: 1px solid #66bb6a;
  border-radius: 3px;
  outline: none;
}
.grp-mp:focus {
  box-shadow: 0 0 0 1.5px #1976d2;
}
.grp-mp:disabled {
  background: #eee;
}
.btn-mp-reset {
  margin-left: 4px;
  height: 20px;
  padding: 0 6px;
  font-size: 10px;
  color: #1b5e20;
  background: transparent;
  border: 1px dashed #66bb6a;
  border-radius: 3px;
  cursor: pointer;
}
.grp-spacer {
  flex: 1;
}
.btn-grp {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 22px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: #1b5e20;
  background: white;
  border: 1px solid #66bb6a;
  border-radius: 3px;
  cursor: pointer;
}
.btn-grp:hover:not(:disabled) {
  background: #e8f5e9;
}
.btn-grp.del {
  color: #d32f2f;
  border-color: #ef9a9a;
}
.btn-grp:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.sel-add-line {
  height: 22px;
  font-size: 11px;
  font-weight: 600;
  color: #1b5e20;
  background: white;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 3px;
  padding: 0 6px;
  cursor: pointer;
}

/* ── Vuetify Flexbox Chain Fix ── */
:deep(.v-tabs-window) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
:deep(.v-window__container) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
:deep(.v-tabs-window-item) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: auto; /* Timpa height 100% bawaan */
}
</style>
