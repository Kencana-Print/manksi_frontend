<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import { useAuthStore } from "@/stores/authStore";
import { jadwalKirimFormService } from "@/services/penjualan/jadwalKirimFormService";
import { jadwalKirimService } from "@/services/penjualan/jadwalKirimService";
import BaseForm from "@/components/BaseForm.vue";
import GudangJadiSearchModal from "@/components/lookups/GudangJadiSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import {
  IconTruckDelivery,
  IconSearch,
  IconPlus,
  IconTrash,
  IconAlertTriangle,
} from "@tabler/icons-vue";

// ── Tipe ──────────────────────────────────────────────────────────────
interface DetailRow {
  _key: number; // internal key untuk v-for
  kota: string;
  uraian: string;
  jumlah: number;
  koli: number;
  jam_input: string; // jami — auto saat jumlah diisi
  jam_ready: string; // jam barang ready
  jumlah_kirim: number;
  koli_kirim: number;
  jam_kirim: string;
  expedisi: string;
  jam_ambil: string;
}

interface PlanningRow {
  no_planning: string;
  tanggal: string;
  jumlah: number;
  status: string;
  line_kelompok: string;
  dipilih: boolean;
}

interface FormData {
  NomorKirim: string;
  Gudang: string;
  NamaGudang: string;
  Tanggal: string;
  NomorSpk: string;
  NamaSpk: string;
  Ukuran: string;
  CusKode: string;
  CusNama: string;
  CusAlamat: string;
  JumlahSpk: number;
  SudahDijadwalkan: number;
  BelumDijadwalkan: number;
  JkPlanNomor: string;
  JkPlanTanggal: string;
  JkPlanJumlah: number;
  Detail: DetailRow[];
}

// ── Store & router ─────────────────────────────────────────────────────
const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

// Divisi user untuk validasi SPK
const divisiUser = computed(() => authStore.user?.divisi ?? 0);

// Mode HO/ADMINISTRATOR — read-only seperti Delphi FormShow
const isHoMode = computed(
  () =>
    !authStore.user?.cabang ||
    authStore.user.cabang === "HO-" ||
    authStore.user?.kode === "ADMINISTRATOR",
);

// ── Helpers tanggal WIB ────────────────────────────────────────────────
const todayWIB = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const nowTimeStr = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// ── Initial data ───────────────────────────────────────────────────────
let _keyCounter = 1;
const makeEmptyRow = (): DetailRow => ({
  _key: _keyCounter++,
  kota: "",
  uraian: "",
  jumlah: 0,
  koli: 0,
  jam_input: "",
  jam_ready: "",
  jumlah_kirim: 0,
  koli_kirim: 0,
  jam_kirim: "",
  expedisi: "",
  jam_ambil: "",
});

const initialData: FormData = {
  NomorKirim: "",
  Gudang: "",
  NamaGudang: "",
  Tanggal: todayWIB(),
  NomorSpk: "",
  NamaSpk: "",
  Ukuran: "",
  CusKode: "",
  CusNama: "",
  CusAlamat: "",
  JumlahSpk: 0,
  SudahDijadwalkan: 0,
  BelumDijadwalkan: 0,
  JkPlanNomor: "",
  JkPlanTanggal: "",
  JkPlanJumlah: 0,
  Detail: [makeEmptyRow()],
};

// ── useForm ────────────────────────────────────────────────────────────
const {
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  fetchData,
  executeSave,
  executeCancel,
  executeClose,
  params,
} = useForm<FormData>({
  menuId: "119",
  initialData,
  fetchApi: async () => {
    const res = await jadwalKirimFormService.getById(params.nomor as string);
    const d = res.data.data;
    // Map detail dari backend ke format internal
    const detail: DetailRow[] = (d.detail || []).map((r: any) => ({
      _key: _keyCounter++,
      kota: r.kota || "",
      uraian: r.uraian || "",
      jumlah: Number(r.jumlah) || 0,
      koli: Number(r.koli) || 0,
      jam_input: r.jam_input || "",
      jam_ready: r.jam_ready || "",
      jumlah_kirim: Number(r.jumlah_kirim) || 0,
      koli_kirim: Number(r.koli_kirim) || 0,
      jam_kirim: r.jam_kirim || "",
      expedisi: r.expedisi || "",
      jam_ambil: r.jam_ambil || "",
    }));
    if (detail.length === 0) detail.push(makeEmptyRow());

    return {
      NomorKirim: d.Nomor_Kirim || "",
      Gudang: d.Gudang || "",
      NamaGudang: d.gdg_nama || "",
      Tanggal: d.Tanggal || todayWIB(),
      NomorSpk: d.spk_nomor || "",
      NamaSpk: d.spk_nama || "",
      Ukuran: d.spk_ukuran || "",
      CusKode: d.spk_cus_kode || "",
      CusNama: d.Cus_nama || "",
      CusAlamat: d.Cus_alamat || "",
      JumlahSpk: Number(d.jumlah_spk) || 0,
      SudahDijadwalkan: Number(d.sudah_dijadwalkan) || 0,
      BelumDijadwalkan: Number(d.belum_dijadwalkan) || 0,
      JkPlanNomor: d.jk_plan_nomor || "",
      JkPlanTanggal: d.jk_plan_tanggal || "",
      JkPlanJumlah: Number(d.jk_plan_jumlah) || 0,
      Detail: detail,
    };
  },
  submitApi: async (data) => {
    // Ambil planning yang dipilih
    const planDipilih = planningList.value.find((p) => p.dipilih);
    const payload = {
      ...data,
      JkPlanNomor: planDipilih?.no_planning || "",
      JkPlanTanggal: planDipilih?.tanggal || null,
      JkPlanJumlah: planDipilih?.jumlah || 0,
      // Strip internal field _key
      Detail: data.Detail.map(({ _key, ...r }) => r),
    };
    if (isEditMode.value) {
      return jadwalKirimFormService.update(data.NomorKirim, payload);
    }
    return jadwalKirimFormService.save(payload);
  },
  onSuccess: (res: any) => {
    const nomor = res?.data?.data?.nomor || "";
    toast.success(`Data ${nomor} berhasil disimpan.`);
    router.push("/penjualan/jadwal-kirim");
  },
});

// ── Planning PPIC ──────────────────────────────────────────────────────
const planningList = ref<PlanningRow[]>([]);

const loadPlanning = async (nomorSpk: string) => {
  if (!nomorSpk) {
    planningList.value = [];
    return;
  }
  try {
    const res = await jadwalKirimFormService.getPlanningPpic(nomorSpk);
    const rows: PlanningRow[] = (res.data.data || []).map(
      (r: any, i: number) => ({
        no_planning: r.no_planning,
        tanggal: r.tanggal,
        jumlah: Number(r.jumlah) || 0,
        status: r.status || "Kirim",
        line_kelompok: r.line_kelompok || "",
        dipilih: i === 0,
      }),
    );

    if (isEditMode.value && formData.value.JkPlanNomor) {
      rows.forEach((r) => {
        r.dipilih = r.no_planning === formData.value.JkPlanNomor;
      });
    }
    planningList.value = rows;
  } catch {
    planningList.value = [];
  }
};

const selectPlanning = (idx: number) => {
  if (isHoMode.value) return; // HO read-only
  planningList.value.forEach((r, i) => (r.dipilih = i === idx));
};

// ── Gudang lookup ──────────────────────────────────────────────────────
const showGudangModal = ref(false);

const onGudangSelected = (item: { Kode: string; Nama: string }) => {
  formData.value.Gudang = item.Kode;
  formData.value.NamaGudang = item.Nama;
};

const onGudangKodeEnter = async () => {
  const kode = formData.value.Gudang?.trim();
  if (!kode) {
    formData.value.NamaGudang = "";
    return;
  }
  try {
    const res = await jadwalKirimService.getListGudang();
    const found = (res.data.data || []).find(
      (g: { Kode: string; Nama: string }) =>
        g.Kode.toUpperCase() === kode.toUpperCase(),
    );
    if (found) {
      formData.value.Gudang = found.Kode;
      formData.value.NamaGudang = found.Nama;
    } else {
      toast.error("Kode gudang tidak ditemukan.");
      formData.value.Gudang = "";
      formData.value.NamaGudang = "";
    }
  } catch {
    toast.error("Gagal validasi kode gudang.");
  }
};

// ── SPK search ─────────────────────────────────────────────────────────
const showSpkModal = ref(false);

const onSpkSelected = async (item: any) => {
  await applySpk(item.Nomor || item.spk_nomor || item.mspk_nomor);
};

// Setelah SPK dipilih/diisi manual — load detail SPK + sudah dijadwalkan
const applySpk = async (nomorSpk: string) => {
  if (!nomorSpk?.trim()) return;
  try {
    const res = await jadwalKirimFormService.getSpkInfo(
      nomorSpk,
      divisiUser.value,
    );
    const spk = res.data.data;
    formData.value.NomorSpk = spk.spk_nomor;
    formData.value.NamaSpk = spk.spk_nama;
    formData.value.Ukuran = spk.spk_ukuran;
    formData.value.CusKode = spk.spk_cus_kode;
    formData.value.CusNama = spk.Cus_nama || "";
    formData.value.CusAlamat = spk.Cus_alamat || "";
    formData.value.JumlahSpk = Number(spk.spk_jumlah) || 0;

    // Cek apakah SPK ini sudah ada jadwal di tanggal yang sama (auto-load)
    const excludeNomor = isEditMode.value ? formData.value.NomorKirim : "";
    const sudahRes = await jadwalKirimFormService.getSudahDijadwalkan(
      nomorSpk,
      excludeNomor,
    );
    const sudah = Number(sudahRes.data.data.sudah) || 0;
    formData.value.SudahDijadwalkan = sudah;
    formData.value.BelumDijadwalkan = formData.value.JumlahSpk - sudah;

    // Load planning PPIC
    await loadPlanning(nomorSpk);

    // Cek apakah sudah ada jadwal kirim untuk SPK ini di tanggal yang sama
    // Sesuai Delphi edtnospkExit: loaddataall jika ada
    try {
      const cekRes = await jadwalKirimFormService.cekJadwalByTanggal(
        nomorSpk,
        formData.value.Tanggal,
      );
      const existingNomor = cekRes.data.data?.nomor;
      if (existingNomor && existingNomor !== formData.value.NomorKirim) {
        toast.info(
          `SPK ini sudah memiliki jadwal kirim di tanggal ini: ${existingNomor}. Silakan ubah data tersebut.`,
        );
      }
    } catch {
      /* silent */
    }

    // Cek apakah sudah ada jadwal kirim di tanggal ini
    // (sesuai Delphi edtnospkExit: loaddataall jika sudah ada)
    // Di web: hanya info, tidak auto-load karena sudah ada mode edit terpisah
  } catch (err: any) {
    toast.error(err.response?.data?.message || "SPK tidak ditemukan.");
    formData.value.NomorSpk = "";
  }
};

const onSpkEnter = async () => {
  await applySpk(formData.value.NomorSpk);
};

// ── Detail grid helpers ────────────────────────────────────────────────

// Cek duplikat kota — warning (bukan block)
const cekKota = async (row: DetailRow) => {
  if (!row.kota || !formData.value.NomorSpk) return;
  const excludeNomor = isEditMode.value ? formData.value.NomorKirim : "";
  try {
    const res = await jadwalKirimFormService.cekDuplikatKota(
      formData.value.NomorSpk,
      row.kota,
      excludeNomor,
    );
    if (res.data.data.duplikat) {
      toast.warning(
        `Jadwal pengiriman ke Kota "${row.kota}" sudah dibuatkan di ${res.data.data.nomorKirim}. Pastikan tidak dobel kirim.`,
      );
    }
  } catch {
    /* silent */
  }
};

// Saat jumlah diisi → set jam_input otomatis (sesuai Delphi clJumlahPropertiesEditValueChanged)
const onJumlahChange = (row: DetailRow) => {
  if (Number(row.jumlah) > 0 && !row.jam_input) {
    row.jam_input = nowTimeStr(); // "HH:MM"
  }
};

// ── Replace All Dialog ─────────────────────────────────────────────────
const replaceDialog = ref(false);
const replaceDialogMsg = ref("");
const replaceDialogCallback = ref<(() => void) | null>(null);

const showReplaceConfirm = (msg: string, callback: () => void) => {
  replaceDialogMsg.value = msg;
  replaceDialogCallback.value = callback;
  replaceDialog.value = true;
};

const confirmReplace = () => {
  replaceDialogCallback.value?.();
  replaceDialog.value = false;
};

const replaceAllExpedisi = (val: string) => {
  if (!val) return;
  showReplaceConfirm(`Replace semua Expedisi dengan "${val}"?`, () =>
    formData.value.Detail.forEach((r) => (r.expedisi = val)),
  );
};

const replaceAllJamKirim = (val: string) => {
  if (!val) return;
  showReplaceConfirm(`Replace semua Jam Kirim dengan "${val}"?`, () =>
    formData.value.Detail.forEach((r) => (r.jam_kirim = val)),
  );
};

const replaceAllJamAmbil = (val: string) => {
  if (!val) return;
  showReplaceConfirm(`Replace semua Jam Ambil dengan "${val}"?`, () =>
    formData.value.Detail.forEach((r) => (r.jam_ambil = val)),
  );
};

const isDetailDisabled = computed(
  () => isHoMode.value || !formData.value.NomorSpk?.trim(),
);

const addRow = () => {
  if (!formData.value.NomorSpk?.trim()) {
    toast.warning("Pilih No. SPK terlebih dahulu.");
    return;
  }
  formData.value.Detail.push(makeEmptyRow());
};

const removeRow = (idx: number) => {
  if (formData.value.Detail.length <= 1) {
    formData.value.Detail[0] = makeEmptyRow();
    return;
  }
  formData.value.Detail.splice(idx, 1);
};

// Footer summary (sesuai Delphi GetFooterSummary)
const totalJumlah = computed(() =>
  formData.value.Detail.reduce((s, r) => s + (Number(r.jumlah) || 0), 0),
);
const totalKoli = computed(() =>
  formData.value.Detail.reduce((s, r) => s + (Number(r.koli) || 0), 0),
);
const totalKirim = computed(() =>
  formData.value.Detail.reduce((s, r) => s + (Number(r.jumlah_kirim) || 0), 0),
);
const totalKoliKirim = computed(() =>
  formData.value.Detail.reduce((s, r) => s + (Number(r.koli_kirim) || 0), 0),
);

const selectOnFocus = (e: FocusEvent) => {
  const input = e.target as HTMLInputElement;
  input.select();
};

// ── Import Excel (sesuai Delphi cxButton3Click) ────────────────────────
const fileImportRef = ref<HTMLInputElement | null>(null);

const importExcel = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const { read, utils } = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    // Delphi mulai dari row 2 (row 1 = header)
    const rawRows: any[] = utils.sheet_to_json(ws, { header: 1, range: 1 });
    formData.value.Detail = rawRows
      .filter((r) => r[0] !== undefined && r[0] !== "")
      .map((r) => ({
        _key: _keyCounter++,
        kota: String(r[0] ?? ""),
        uraian: String(r[1] ?? ""),
        jumlah: Number(r[2]) || 0,
        koli: Number(r[3]) || 0,
        jam_input: "",
        jam_ready: String(r[4] ?? ""),
        jumlah_kirim: 0,
        koli_kirim: 0,
        jam_kirim: "",
        expedisi: "",
        jam_ambil: "",
      }));
    if (formData.value.Detail.length === 0)
      formData.value.Detail.push(makeEmptyRow());
    toast.success(`${rawRows.length} baris berhasil diimport.`);
  } catch {
    toast.error("Gagal import Excel.");
  } finally {
    if (fileImportRef.value) fileImportRef.value.value = "";
  }
};

const downloadTemplate = async () => {
  const { exportExcelSingle } = await import("@/utils/excelExport");
  await exportExcelSingle(
    "Template_JadwalKirim.xlsx",
    "Template",
    [
      { header: "Kota", key: "kota", width: 15 },
      { header: "Uraian", key: "uraian", width: 40 },
      { header: "Jumlah", key: "jumlah", width: 10, align: "right" },
      { header: "Koli", key: "koli", width: 10, align: "right" },
      { header: "Jam Ready", key: "jam_ready", width: 12, align: "center" },
    ],
    [], // rows kosong — hanya header
    "Template Import Jadwal Kirim — isi mulai baris 2",
  );
};

// ── Validate & Save ────────────────────────────────────────────────────
const validateSave = () => {
  if (!formData.value.Gudang?.trim()) {
    toast.warning("Kode Gudang belum diisi.");
    return;
  }
  if (!formData.value.NomorSpk?.trim()) {
    toast.warning("SPK belum diisi.");
    return;
  }
  const validRows = formData.value.Detail.filter((r) => Number(r.jumlah) !== 0);
  if (validRows.length === 0) {
    toast.warning("Detail harus diisi.");
    return;
  }
  for (const row of validRows) {
    if (!row.kota?.trim()) {
      toast.warning("Kota belum diisi pada salah satu baris.");
      return;
    }
    if (!row.uraian?.trim()) {
      toast.warning("Uraian belum diisi pada salah satu baris.");
      return;
    }
    if (!row.jam_ready?.trim()) {
      toast.warning("Jam Barang Ready harus diisi jika Jumlah > 0.");
      return;
    }
  }
  if (totalJumlah.value > formData.value.BelumDijadwalkan) {
    toast.warning(
      `Total Jumlah (${totalJumlah.value}) melebihi Qty yg belum dijadwalkan (${formData.value.BelumDijadwalkan}).`,
    );
    return;
  }
  showSaveDialog.value = true;
};

// ── Lifecycle ──────────────────────────────────────────────────────────
onMounted(async () => {
  if (isEditMode.value) {
    await fetchData();
    if (formData.value.NomorSpk) {
      await loadPlanning(formData.value.NomorSpk);
    }
  } else {
    // Mode create — default gudang dari gudang jadi user
    const gudangJadi = authStore.user?.gudang?.jadi;
    if (gudangJadi?.kode) {
      formData.value.Gudang = gudangJadi.kode;
      formData.value.NamaGudang = gudangJadi.nama;
    }
  }
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Jadwal Kirim' : 'Tambah Jadwal Kirim'"
    menu-id="119"
    :icon="IconTruckDelivery"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Jadwal Kirim"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="jk-form">
      <!-- ══ TOP SECTION ══ -->
      <div class="jk-top">
        <!-- Kolom kiri: Info + Customer -->
        <div class="jk-top-left">
          <!-- Informasi Jadwal Kirim — 2 kolom grid -->
          <div class="jk-section">
            <div class="jk-section-title">Informasi Jadwal Kirim</div>
            <div class="info-grid">
              <!-- Kolom A -->
              <div>
                <div class="f-row">
                  <label class="f-lbl">Nomor Kirim</label>
                  <input
                    :value="formData.NomorKirim || '(Otomatis)'"
                    readonly
                    class="f-inp f-ro"
                    style="width: 140px"
                  />
                </div>
                <div class="f-row">
                  <label class="f-lbl">Tanggal Kirim</label>
                  <input
                    type="date"
                    v-model="formData.Tanggal"
                    class="f-date"
                    :disabled="isHoMode"
                  />
                </div>
                <div class="f-row">
                  <label class="f-lbl">Gudang</label>
                  <div class="f-inp-grp" style="flex: 1">
                    <input
                      v-model="formData.Gudang"
                      class="f-inp"
                      style="width: 60px"
                      :readonly="isHoMode"
                      :class="{ 'f-ro': isHoMode }"
                      placeholder="Kode"
                      @keydown.enter.prevent="onGudangKodeEnter"
                      @keydown.f1.prevent="
                        !isHoMode && (showGudangModal = true)
                      "
                      @blur="onGudangKodeEnter"
                    />
                    <input
                      :value="formData.NamaGudang"
                      readonly
                      class="f-inp f-ro"
                      style="flex: 1; min-width: 140px"
                    />
                    <button
                      v-if="!isHoMode"
                      type="button"
                      class="f-btn-icon"
                      @click="showGudangModal = true"
                    >
                      <IconSearch :size="13" color="#1565c0" />
                    </button>
                  </div>
                </div>
                <div class="f-row">
                  <label class="f-lbl">No. SPK</label>
                  <div class="f-inp-grp">
                    <input
                      v-model="formData.NomorSpk"
                      class="f-inp"
                      style="width: 140px"
                      :readonly="isHoMode"
                      :class="{ 'f-ro': isHoMode }"
                      placeholder="Kode SPK..."
                      @keydown.enter.prevent="onSpkEnter"
                      @keydown.f1.prevent="!isHoMode && (showSpkModal = true)"
                      @blur="onSpkEnter"
                    />
                    <button
                      v-if="!isHoMode"
                      type="button"
                      class="f-btn-icon"
                      @click="showSpkModal = true"
                    >
                      <IconSearch :size="13" color="#1565c0" />
                    </button>
                  </div>
                </div>
                <div class="f-row">
                  <label class="f-lbl">Nama</label>
                  <input
                    :value="formData.NamaSpk"
                    readonly
                    class="f-inp f-ro"
                    style="flex: 1"
                  />
                </div>
                <div class="f-row">
                  <label class="f-lbl">Ukuran</label>
                  <input
                    :value="formData.Ukuran"
                    readonly
                    class="f-inp f-ro"
                    style="flex: 1"
                  />
                </div>
              </div>

              <!-- Divider vertikal -->
              <div class="info-divider"></div>

              <!-- Kolom B: Customer + Qty -->
              <div>
                <!-- Customer -->
                <div class="info-subtitle">Customer</div>
                <div class="f-row">
                  <label class="f-lbl" style="width: 55px">Kode</label>
                  <input
                    :value="formData.CusKode"
                    readonly
                    class="f-inp f-ro"
                    style="width: 75px"
                  />
                </div>
                <div class="f-row">
                  <label class="f-lbl" style="width: 55px">Nama</label>
                  <input
                    :value="formData.CusNama"
                    readonly
                    class="f-inp f-ro"
                    style="flex: 1"
                  />
                </div>
                <div class="f-row">
                  <label class="f-lbl" style="width: 55px">Alamat</label>
                  <input
                    :value="formData.CusAlamat"
                    readonly
                    class="f-inp f-ro"
                    style="flex: 1"
                  />
                </div>

                <!-- Qty -->
                <div class="info-subtitle" style="margin-top: 8px">Qty</div>
                <div class="f-row">
                  <label class="f-lbl" style="width: 110px">Jumlah SPK</label>
                  <input
                    :value="formData.JumlahSpk.toLocaleString('id-ID')"
                    readonly
                    class="f-inp f-ro text-right"
                    style="width: 80px"
                  />
                </div>
                <div class="f-row">
                  <label class="f-lbl" style="width: 110px"
                    >Sudah Dijadwalkan</label
                  >
                  <input
                    :value="formData.SudahDijadwalkan.toLocaleString('id-ID')"
                    readonly
                    class="f-inp f-ro text-right"
                    style="width: 80px"
                  />
                </div>
                <div class="f-row">
                  <label class="f-lbl" style="width: 110px"
                    >Belum Dijadwalkan</label
                  >
                  <input
                    :value="formData.BelumDijadwalkan.toLocaleString('id-ID')"
                    readonly
                    class="f-inp f-ro text-right"
                    style="width: 80px"
                    :style="
                      formData.BelumDijadwalkan < 0
                        ? 'color:#c62828;font-weight:700'
                        : ''
                    "
                  />
                </div>

                <!-- Import Excel -->
                <div
                  v-if="!isHoMode"
                  class="f-row"
                  style="margin-top: 10px; gap: 6px"
                >
                  <button
                    type="button"
                    class="f-btn"
                    style="background: #546e7a"
                    @click="downloadTemplate"
                  >
                    Template Excel
                  </button>
                  <button
                    type="button"
                    class="f-btn"
                    @click="fileImportRef?.click()"
                  >
                    Import Excel
                  </button>
                  <input
                    ref="fileImportRef"
                    type="file"
                    accept=".xlsx,.xls"
                    style="display: none"
                    @change="importExcel"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Kolom kanan: Import Excel + Planning PPIC full -->
        <div class="jk-top-right">
          <!-- Import Excel — kompak di atas -->
          <div v-if="!isHoMode" class="jk-section" style="padding: 8px 12px">
            <div class="f-row" style="margin: 0; gap: 6px">
              <button
                type="button"
                class="f-btn"
                style="background: #546e7a"
                @click="downloadTemplate"
              >
                Template Excel
              </button>
              <button
                type="button"
                class="f-btn"
                @click="fileImportRef?.click()"
              >
                Import Excel
              </button>
              <input
                ref="fileImportRef"
                type="file"
                accept=".xlsx,.xls"
                style="display: none"
                @change="importExcel"
              />
            </div>
          </div>

          <!-- Planning PPIC — sisa ruang penuh -->
          <div class="jk-section jk-plan-section">
            <div class="jk-section-title">Planning PPIC</div>
            <div v-if="!formData.NomorSpk" class="plan-empty">
              Pilih SPK terlebih dahulu
            </div>
            <div v-else-if="planningList.length === 0" class="plan-empty">
              Tidak ada planning PPIC untuk SPK ini
            </div>
            <div v-else class="plan-table-wrap">
              <table class="plan-table">
                <thead>
                  <tr>
                    <th style="width: 36px">Ambil</th>
                    <th>No Planning</th>
                    <th style="width: 88px">Tanggal</th>
                    <th style="width: 68px">Divisi</th>
                    <th style="width: 70px">Line</th>
                    <th style="width: 58px" class="text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(p, idx) in planningList"
                    :key="idx"
                    :class="{ 'plan-selected': p.dipilih }"
                    @click="selectPlanning(idx)"
                    style="cursor: pointer"
                  >
                    <td class="text-center">
                      <input
                        type="checkbox"
                        :checked="p.dipilih"
                        @click.stop="selectPlanning(idx)"
                        :disabled="isHoMode"
                      />
                    </td>
                    <td style="font-size: 10px">{{ p.no_planning }}</td>
                    <td>{{ p.tanggal }}</td>
                    <td>
                      <span
                        :class="{
                          'badge-cutting': p.status === 'CUTTING',
                          'badge-sewing': p.status === 'SEWING',
                          'badge-koli': p.status === 'KOLI',
                        }"
                        >{{ p.status }}</span
                      >
                    </td>
                    <td style="font-size: 10px">{{ p.line_kelompok }}</td>
                    <td class="text-right">
                      {{ Number(p.jumlah).toLocaleString("id-ID") }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <!-- /.jk-top -->

      <!-- ══ GRID DETAIL ════════════════════════════════════════════ -->
      <div class="jk-section jk-section-detail">
        <div class="jk-section-title d-flex align-center">
          <span>Detail Pengiriman</span>
          <span
            v-if="!formData.NomorSpk && !isHoMode"
            style="
              font-size: 10px;
              color: #f57c00;
              font-weight: 400;
              margin-left: 8px;
              font-style: italic;
            "
          >
            ⚠ Pilih SPK terlebih dahulu
          </span>
          <button
            v-if="!isDetailDisabled"
            type="button"
            class="f-btn ml-auto"
            style="background: #2e7d32"
            @click="addRow"
          >
            <IconPlus :size="12" /> Tambah Baris
          </button>
        </div>

        <div class="grid-wrap">
          <table class="detail-table">
            <thead>
              <tr>
                <th style="width: 32px">#</th>
                <th style="width: 110px">Kota</th>
                <th style="min-width: 220px">Uraian</th>
                <th style="width: 70px">Jumlah</th>
                <th style="width: 55px">J.Koli</th>
                <th style="width: 80px">Jam Input</th>
                <th style="width: 90px">Jam Brg Ready</th>
                <!-- Kolom realisasi: selalu tampil (HO bisa lihat) -->
                <th style="width: 75px">Koli Kirim</th>
                <th style="width: 90px">
                  Jam Kirim
                  <span
                    v-if="!isHoMode && formData.Detail.some((r) => r.jam_kirim)"
                    class="replace-hint"
                    @click="
                      replaceAllJamKirim(
                        formData.Detail.find((r) => r.jam_kirim)?.jam_kirim ||
                          '',
                      )
                    "
                    title="Klik untuk replace semua"
                    >▶ All</span
                  >
                </th>
                <th style="min-width: 120px">
                  Expedisi
                  <span
                    v-if="!isHoMode && formData.Detail.some((r) => r.expedisi)"
                    class="replace-hint"
                    @click="
                      replaceAllExpedisi(
                        formData.Detail.find((r) => r.expedisi)?.expedisi || '',
                      )
                    "
                    title="Klik untuk replace semua"
                    >▶ All</span
                  >
                </th>
                <th style="width: 90px">
                  Jam Ambil
                  <span
                    v-if="!isHoMode && formData.Detail.some((r) => r.jam_ambil)"
                    class="replace-hint"
                    @click="
                      replaceAllJamAmbil(
                        formData.Detail.find((r) => r.jam_ambil)?.jam_ambil ||
                          '',
                      )
                    "
                    title="Klik untuk replace semua"
                    >▶ All</span
                  >
                </th>
                <th v-if="!isHoMode" style="width: 32px"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in formData.Detail"
                :key="row._key"
                @keydown.delete.prevent="!isDetailDisabled && removeRow(idx)"
                tabindex="0"
              >
                <td class="text-center text-muted">{{ idx + 1 }}</td>
                <td>
                  <input
                    v-model="row.kota"
                    class="cell-inp"
                    :readonly="isDetailDisabled"
                    @blur="cekKota(row)"
                  />
                </td>
                <td>
                  <input
                    v-model="row.uraian"
                    class="cell-inp"
                    :readonly="isDetailDisabled"
                  />
                </td>
                <td>
                  <input
                    v-model.number="row.jumlah"
                    type="number"
                    class="cell-inp text-right"
                    :readonly="isDetailDisabled"
                    @change="onJumlahChange(row)"
                    @focus="selectOnFocus"
                  />
                </td>
                <td>
                  <input
                    v-model.number="row.koli"
                    type="number"
                    class="cell-inp text-right"
                    :readonly="isDetailDisabled"
                    @focus="selectOnFocus"
                  />
                </td>
                <td>
                  <input
                    v-model="row.jam_input"
                    type="text"
                    class="cell-inp text-center"
                    readonly
                    style="background: #f0f0f0; color: #777"
                    tabindex="-1"
                  />
                </td>
                <td>
                  <input
                    v-model="row.jam_ready"
                    type="time"
                    class="cell-inp text-center"
                    :readonly="isDetailDisabled"
                  />
                </td>
                <td>
                  <input
                    v-model.number="row.koli_kirim"
                    type="number"
                    class="cell-inp text-right"
                    :readonly="isDetailDisabled"
                    @focus="selectOnFocus"
                  />
                </td>
                <td>
                  <input
                    v-model="row.jam_kirim"
                    type="time"
                    class="cell-inp text-center"
                    :readonly="isDetailDisabled"
                    @change="replaceAllJamKirim(row.jam_kirim)"
                  />
                </td>
                <td>
                  <input
                    v-model="row.expedisi"
                    class="cell-inp"
                    :readonly="isDetailDisabled"
                    @change="replaceAllExpedisi(row.expedisi)"
                  />
                </td>
                <td>
                  <input
                    v-model="row.jam_ambil"
                    type="time"
                    class="cell-inp text-center"
                    :readonly="isDetailDisabled"
                    @change="replaceAllJamAmbil(row.jam_ambil)"
                  />
                </td>
                <td v-if="!isHoMode" class="text-center">
                  <button
                    v-if="!isDetailDisabled"
                    type="button"
                    class="cell-del-btn"
                    @click="removeRow(idx)"
                    title="Hapus baris"
                  >
                    <IconTrash :size="12" />
                  </button>
                </td>
              </tr>
            </tbody>
            <!-- Footer summary -->
            <tfoot>
              <tr class="footer-row">
                <td colspan="3" class="text-right footer-lbl">Total</td>
                <td class="text-right footer-val">
                  {{ totalJumlah.toLocaleString("id-ID") }}
                </td>
                <td class="text-right footer-val">
                  {{ totalKoli.toLocaleString("id-ID") }}
                </td>
                <td colspan="3"></td>
                <td class="text-right footer-val">
                  {{ totalKirim.toLocaleString("id-ID") }}
                </td>
                <td colspan="2"></td>
                <td v-if="!isHoMode"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </BaseForm>

  <!-- ══ MODAL GUDANG ══════════════════════════════════════════════════ -->
  <GudangJadiSearchModal
    v-model="showGudangModal"
    :divisi="divisiUser"
    @selected="onGudangSelected"
  />

  <!-- ══ MODAL SPK ═════════════════════════════════════════════════════ -->
  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="spk-ppic"
    @selected="onSpkSelected"
  />

  <!-- ── Replace All Confirmation Dialog ── -->
  <v-dialog v-model="replaceDialog" max-width="380px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Konfirmasi Replace
      </v-card-title>
      <v-card-text class="pa-4" style="font-size: 12px">
        {{ replaceDialogMsg }}
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" size="small" @click="replaceDialog = false"
          >Batal</v-btn
        >
        <v-btn
          variant="flat"
          color="primary"
          size="small"
          @click="confirmReplace"
          >Ya, Replace</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.jk-form {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  height: 100%;
  font-size: 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
}

/* Section card */
.jk-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  padding: 10px 12px;
}
.jk-section-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1565c0;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}
.jk-section-detail {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Top 2-col: kiri lebih lebar, kanan planning PPIC */
.jk-top {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 10px;
  flex-shrink: 0;
}
.jk-top-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.jk-top-right {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.jk-plan-section {
  flex: 1;
  min-height: 120px;
  display: flex;
  flex-direction: column;
}
.plan-table-wrap {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
.plan-empty {
  padding: 16px;
  text-align: center;
  color: #9e9e9e;
  font-size: 11px;
  font-style: italic;
}
.mt-2 {
  margin-top: 8px;
}

@media (max-width: 1100px) {
  .jk-top {
    grid-template-columns: 1fr;
  }
}

/* Info grid: 2 kolom di dalam section */
.info-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0 12px;
  align-items: start;
}
.info-divider {
  width: 1px;
  background: #e0e0e0;
  align-self: stretch;
  margin: 0 4px;
}
.info-subtitle {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1565c0;
  margin-bottom: 6px;
  padding-bottom: 3px;
  border-bottom: 1px solid #e3f2fd;
}

/* Badge divisi planning */
.badge-cutting {
  background: #eeeeee;
  color: #424242;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-sewing {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-koli {
  background: #fff3e0;
  color: #e65100;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

/* 2-col row */
.jk-row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

/* Field rows */
.f-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  min-height: 26px;
}
.f-lbl {
  width: 120px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
}
.ml-3 {
  margin-left: 12px;
}
.ml-auto {
  margin-left: auto;
}
.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
  font-family: inherit;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.f-date {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 12px;
  outline: none;
}
.f-date:focus {
  border-color: #1565c0;
}
.f-inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  background: white;
}
.f-inp-grp .f-inp {
  border: none;
  height: 24px;
  border-radius: 0;
}
.f-btn-icon {
  width: 28px;
  min-width: 28px;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.f-btn-icon:hover {
  background: #bbdefb;
}
.f-btn {
  height: 26px;
  padding: 0 10px;
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.f-btn:hover {
  opacity: 0.88;
}
.text-right {
  text-align: right;
}
.text-center {
  text-align: center;
}
.text-muted {
  color: #9e9e9e;
}

/* Planning table */
.plan-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.plan-table th {
  background: #1565c0;
  color: white;
  padding: 4px 8px;
  font-weight: 700;
  white-space: nowrap;
}
.plan-table td {
  padding: 3px 8px;
  border-bottom: 1px solid #e0e0e0;
  white-space: nowrap;
}
.plan-table tr:hover td {
  background: #e3f2fd;
}
.plan-selected td {
  background: #bbdefb !important;
  font-weight: 600;
}

/* Grid detail */
.grid-wrap {
  overflow-x: auto;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
}
.detail-table {
  border-collapse: collapse;
  font-size: 11px;
  min-width: max-content;
  width: 100%;
}
.detail-table th {
  background: #1565c0;
  color: white;
  padding: 4px 6px;
  font-weight: 700;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}
.detail-table td {
  padding: 2px 3px;
  border-bottom: 1px solid #e0e0e0;
  vertical-align: middle;
}
.detail-table tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.cell-inp {
  width: 100%;
  height: 24px;
  border: none;
  outline: none;
  padding: 0 4px;
  font-size: 11px;
  background: transparent;
  font-family: inherit;
}
.cell-inp:focus {
  background: #fffde7;
  outline: 1px solid #1565c0;
  border-radius: 2px;
}
.cell-inp[readonly] {
  color: #666;
  background: transparent;
}
.cell-del-btn {
  width: 22px;
  height: 22px;
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c62828;
}
.cell-del-btn:hover {
  background: #ffcdd2;
}
.footer-row td {
  background: #e8eaf6 !important;
  border-top: 2px solid #3949ab;
  padding: 4px 6px;
}
.footer-lbl {
  font-size: 11px;
  font-weight: 700;
  color: #3949ab;
}
.footer-val {
  font-size: 11px;
  font-weight: 700;
  color: #1a237e;
}

/* Replace hint */
.replace-hint {
  font-size: 9px;
  font-weight: 400;
  color: #ffd54f;
  cursor: pointer;
  margin-left: 4px;
  opacity: 0.8;
}
.replace-hint:hover {
  opacity: 1;
  text-decoration: underline;
}

/* Gudang modal */
.gudang-search {
  width: 100%;
  height: 30px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  margin-bottom: 8px;
  box-sizing: border-box;
}
.gudang-search:focus {
  border-color: #1565c0;
}
.gudang-list {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.gudang-item {
  display: flex;
  gap: 10px;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 12px;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.1s;
}
.gudang-item:hover {
  background: #e3f2fd;
}
.gudang-item.active {
  background: #1565c0;
  color: white;
}
.gudang-kode {
  font-weight: 700;
  width: 65px;
  flex-shrink: 0;
  font-family: monospace;
}
.gudang-nama {
  flex: 1;
}
.gudang-empty {
  padding: 12px;
  text-align: center;
  font-size: 11px;
  color: #9e9e9e;
}

/* SPK modal */
.spk-list {
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.spk-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.spk-table th {
  background: #1565c0;
  color: white;
  padding: 5px 8px;
  font-weight: 700;
  white-space: nowrap;
  position: sticky;
  top: 0;
}
.spk-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #e0e0e0;
  white-space: nowrap;
}
.spk-row {
  cursor: pointer;
}
.spk-row:hover td {
  background: #e3f2fd;
}

/* d-flex */
.d-flex {
  display: flex;
}
.align-center {
  align-items: center;
}

input[type="time"].cell-inp {
  min-width: 80px;
  padding: 0 2px;
  cursor: pointer;
}
input[type="time"].cell-inp::-webkit-calendar-picker-indicator {
  width: 12px;
  height: 12px;
  opacity: 0.5;
  cursor: pointer;
}
input[type="time"].cell-inp:focus::-webkit-calendar-picker-indicator {
  opacity: 1;
}
</style>
