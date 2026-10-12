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
  type QcSaveResult,
} from "@/services/garmen/qcBahanFormService";
import QcBahanPoSearchModal from "@/components/lookups/QcBahanPoSearchModal.vue";
import { IconClipboardCheck, IconSearch, IconPrinter } from "@tabler/icons-vue";

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

const emptyHasil = () => ({
  gramasi: "",
  setting: "",
  warna: "",
  handfeel: "",
  bowing: "",
  shrinkage: "",
  kelunturan: "",
});

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
    qc_status: "DRAFT",
    qc_keterangan: "",
    jenis_po: "",
  },
  dtl: [],
  po: {
    qty: 0,
    roll: 0,
    satuan: "",
    gramasi: "",
    gramasi_min: 0,
    gramasi_max: 0,
    setting: "",
    warna: "",
  },
  toleransi: 0,
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
    return {
      header: {
        ...d.header,
        qc_keterangan: d.header.qc_keterangan || "",
        jenis_po: "",
      },
      dtl: d.dtl.map((r) => ({ ...r })),
      po: {
        qty: d.po?.qty ?? 0,
        roll: d.po?.roll ?? 0,
        satuan: d.po?.satuan ?? "",
        gramasi: first?.gramasi_po ?? "",
        gramasi_min: first?.gramasi_min ?? 0,
        gramasi_max: first?.gramasi_max ?? 0,
        setting: first?.setting_po ?? "",
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
      submit: false,
      dtl: data.dtl.map((r) => ({
        lot: r.lot,
        qty_kg: Number(r.qty_kg) || 0,
        qty_roll: Number(r.qty_roll) || 0,
        warna: r.warna,
        gramasi_cek: Number(r.gramasi_cek) || 0,
        setting_cek: r.setting_cek,
        nilai: Number(r.nilai) || 0,
        alasan_nilai: r.alasan_nilai,
        hasil: r.hasil,
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
    toast.success(
      result.status === "DRAFT"
        ? "Tersimpan sebagai DRAFT."
        : "QC Bahan berhasil disubmit.",
    );
    result.warnings.forEach((w) => toast.warning(w, { timeout: 8000 }));
    showPrintConfirm.value = true;
  },
});

const forceSubmit = computed<boolean>(
  () => isEditMode.value && formData.value.header.qc_status !== "DRAFT",
);

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

// ── Saran nilai (sama dengan backend) ──
const hitungSaran = (cek: number, min: number, max: number, tol: number) => {
  if (!(min > 0 && max > 0) || !(cek > 0)) return 0;
  if (cek >= min && cek <= max) return 3;
  const selisih = cek < min ? min - cek : cek - max;
  return selisih <= tol ? 2 : 1;
};

const newLot = (): QcLotRow => ({
  lot: "",
  qty_kg: 0,
  qty_roll: 0,
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
  hasil: emptyHasil(),
});

const addLot = () => {
  if (!formData.value.header.qc_po_nomor) {
    return toast.warning("Pilih PO Bahan terlebih dahulu.");
  }
  formData.value.dtl.push(newLot());
};

const removeLot = (idx: number) => {
  if (formData.value.dtl.length <= 1) {
    return toast.warning("Minimal satu lot.");
  }
  formData.value.dtl.splice(idx, 1);
};

const onGramasiCekChange = (row: QcLotRow) => {
  const saran = hitungSaran(
    Number(row.gramasi_cek) || 0,
    row.gramasi_min,
    row.gramasi_max,
    formData.value.toleransi,
  );
  // Nilai ikut saran selama user belum menimpanya secara manual
  if (!row.nilai || row.nilai === row.nilai_saran) row.nilai = saran;
  row.nilai_saran = saran;
};

const perluAlasan = (row: QcLotRow) =>
  row.nilai_saran > 0 && row.nilai > 0 && row.nilai !== row.nilai_saran;

// ── PO ──
const showPoModal = ref(false);

const onPoSelected = async (item: QcPoLookupItem) => {
  try {
    const res = await qcBahanFormService.getPoSource(item.PO, item.Nourut);
    const src = res.data.data as QcPoSource;
    Object.assign(formData.value.header, src.header);
    formData.value.po = src.po;
    formData.value.toleransi = src.toleransi;
    formData.value.dtl = [newLot()];
    toast.success(`PO ${item.PO} dimuat. Isi lot dan hasil cek.`);
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
const qtyLebih = computed(
  () => formData.value.po.qty > 0 && totalQty.value > formData.value.po.qty,
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

// ── Validasi ──
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

    if (forceSubmit.value) {
      if (!r.nilai) return toast.warning(`Lot ${r.lot}: nilai wajib diisi.`);
      if (!(Number(r.gramasi_cek) > 0)) {
        return toast.warning(`Lot ${r.lot}: gramasi hasil cek wajib diisi.`);
      }
      if (!r.setting_cek.trim()) {
        return toast.warning(`Lot ${r.lot}: setting hasil cek wajib diisi.`);
      }
      if (perluAlasan(r) && !r.alasan_nilai.trim()) {
        return toast.warning(
          `Lot ${r.lot}: nilai berbeda dari saran (${r.nilai_saran}), alasan wajib diisi.`,
        );
      }
      if (!(Number(r.qty_roll) > 0)) {
        return toast.warning(`Lot ${r.lot}: roll wajib diisi.`);
      }
      if (!(Number(r.qty_kg) > 0)) {
        return toast.warning(`Lot ${r.lot}: qty wajib diisi.`);
      }
    }
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
          <label class="lbl" style="width: 55px">Setting</label>
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
          <label class="lbl" style="width: 55px">Roll PO</label>
          <input
            :value="formData.po.roll"
            readonly
            class="inp ro"
            style="width: 70px"
          />
        </div>
        <div class="fr">
          <label class="lbl">Total Lot</label>
          <input
            :value="`${totalQty.toFixed(2)} ${formData.po.satuan}`"
            readonly
            class="inp ro fw"
            :class="{ 'bg-red text-white': qtyLebih }"
            style="width: 110px"
          />
          <label class="lbl" style="width: 55px">Roll</label>
          <input
            :value="totalRoll"
            readonly
            class="inp ro fw"
            style="width: 70px"
          />
        </div>
        <div v-if="qtyLebih" class="warn-box">
          Total qty lot melebihi qty PO ({{ formData.po.qty }}
          {{ formData.po.satuan }}).
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
      </div>
    </template>

    <!-- ══ KOLOM KANAN: DETAIL ══ -->
    <template #right-column>
      <div class="qc-right">
        <!-- Tabel 1 -->
        <div class="tbl-header">
          <span class="tbl-title">1. Detail Lot dan Hasil Cek</span>
          <button type="button" class="btn-add" @click="addLot">
            + Tambah Lot
          </button>
        </div>
        <div class="tbl-wrap" style="max-height: 38vh; min-height: 150px">
          <table class="gt" style="min-width: 1180px">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 120px">Lot No.</th>
                <th style="width: 80px" class="tr">
                  Qty {{ formData.po.satuan }}
                </th>
                <th style="width: 60px" class="tr">Roll</th>
                <th style="width: 120px">Warna</th>
                <th style="width: 85px" class="tc">Gramasi PO</th>
                <th style="width: 70px" class="tc">Setting PO</th>
                <th style="width: 90px" class="tr bg-yellow">Gramasi Cek</th>
                <th style="width: 80px" class="bg-yellow">Setting Cek</th>
                <th style="width: 75px" class="tc bg-yellow">Nilai</th>
                <th style="width: 55px" class="tc">Saran</th>
                <th style="width: 170px">Alasan (jika beda saran)</th>
                <th style="width: 85px" class="tc">Keputusan</th>
                <th style="width: 32px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in formData.dtl" :key="idx">
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
                    class="ci tr"
                    @keydown.enter.prevent="onEnterNext"
                    v-select-on-focus
                  />
                </td>
                <td class="p0">
                  <input
                    v-model="row.warna"
                    class="ci"
                    @keydown.enter.prevent="onEnterNext"
                  />
                </td>
                <td class="p0">
                  <input :value="row.gramasi_po" class="ci tc ro" readonly />
                </td>
                <td class="p0">
                  <input :value="row.setting_po" class="ci tc ro" readonly />
                </td>
                <td class="p0">
                  <input
                    v-model.number="row.gramasi_cek"
                    type="number"
                    step="0.01"
                    class="ci tr fw bg-yellow-light"
                    @blur="onGramasiCekChange(row)"
                    @keydown.enter.prevent="onEnterNext"
                    v-select-on-focus
                  />
                </td>
                <td class="p0">
                  <input
                    v-model="row.setting_cek"
                    class="ci bg-yellow-light"
                    @keydown.enter.prevent="onEnterNext"
                  />
                </td>
                <td class="p0">
                  <input
                    v-model.number="row.nilai"
                    type="number"
                    min="0"
                    step="1"
                    class="ci tc fw"
                    placeholder="-"
                    @keydown.enter.prevent="onEnterNext"
                    v-select-on-focus
                  />
                </td>
                <td class="tc">
                  <span
                    v-if="row.nilai_saran"
                    class="status-chip"
                    :class="nilaiClass(row.nilai_saran)"
                  >
                    {{ row.nilai_saran }}
                  </span>
                  <span v-else class="text-grey">-</span>
                </td>
                <td class="p0">
                  <input
                    v-model="row.alasan_nilai"
                    class="ci"
                    :class="{
                      'bg-red-light': perluAlasan(row) && !row.alasan_nilai,
                    }"
                    :placeholder="perluAlasan(row) ? 'Wajib diisi' : ''"
                    @keydown.enter.prevent="onEnterNext"
                  />
                </td>
                <td class="tc">{{ row.keputusan || "-" }}</td>
                <td class="tc">
                  <button type="button" class="btn-del" @click="removeLot(idx)">
                    ✕
                  </button>
                </td>
              </tr>
              <tr v-if="formData.dtl.length === 0">
                <td colspan="14" class="empty-row">
                  Pilih PO Bahan di kiri untuk mulai mengisi lot.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="legend">
          Nilai: <b>1</b> = Tidak diterima, <b>2</b> = Kebijakan (tambah jumlah
          cek), <b>3</b> = Diterima. Saran dihitung dari gramasi hasil cek
          terhadap rentang PO (toleransi {{ formData.toleransi }} gram).
        </div>

        <!-- Tabel 2 -->
        <div class="tbl-header teal mt-2">
          <span class="tbl-title">2. Hasil Cek Detail (per Lot)</span>
        </div>
        <div class="tbl-wrap" style="max-height: 30vh; min-height: 130px">
          <table class="gt" style="min-width: 1050px">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 120px">Lot No.</th>
                <th style="width: 150px">Gramasi</th>
                <th style="width: 130px">Setting</th>
                <th style="width: 130px">Warna</th>
                <th style="width: 130px">Handfeel</th>
                <th style="width: 110px">Bowing</th>
                <th style="width: 110px">Shrinkage</th>
                <th style="width: 110px">Kelunturan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in formData.dtl" :key="idx">
                <td class="tc gt-lbl">{{ idx + 1 }}</td>
                <td class="px-1 fw">{{ row.lot || "-" }}</td>
                <td class="p0">
                  <input
                    v-model="row.hasil.gramasi"
                    class="ci"
                    placeholder="mis. Rendah"
                    @keydown.enter.prevent="onEnterNext"
                  />
                </td>
                <td class="p0">
                  <input
                    v-model="row.hasil.setting"
                    class="ci"
                    placeholder="mis. OK"
                    @keydown.enter.prevent="onEnterNext"
                  />
                </td>
                <td class="p0">
                  <input
                    v-model="row.hasil.warna"
                    class="ci"
                    placeholder="mis. 0,41"
                    @keydown.enter.prevent="onEnterNext"
                  />
                </td>
                <td class="p0">
                  <input
                    v-model="row.hasil.handfeel"
                    class="ci"
                    placeholder="mis. OK"
                    @keydown.enter.prevent="onEnterNext"
                  />
                </td>
                <td class="p0">
                  <input
                    v-model="row.hasil.bowing"
                    class="ci"
                    @keydown.enter.prevent="onEnterNext"
                  />
                </td>
                <td class="p0">
                  <input
                    v-model="row.hasil.shrinkage"
                    class="ci"
                    @keydown.enter.prevent="onEnterNext"
                  />
                </td>
                <td class="p0">
                  <input
                    v-model="row.hasil.kelunturan"
                    class="ci"
                    @keydown.enter.prevent="onEnterNext"
                  />
                </td>
              </tr>
              <tr v-if="formData.dtl.length === 0">
                <td colspan="9" class="empty-row">Belum ada lot.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Foto -->
        <div class="tbl-header mt-2" style="background: #37474f">
          <span class="tbl-title">3. Dokumentasi Foto</span>
        </div>
        <div class="foto-grid">
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
        <div class="legend">
          Maksimal 2 MB per foto. Pada dokumen baru, foto terkirim otomatis
          setelah disimpan.
        </div>
      </div>
    </template>
  </BaseForm>

  <QcBahanPoSearchModal v-model="showPoModal" @selected="onPoSelected" />

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
.submit-box {
  margin-top: 6px;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 3px;
  padding: 6px 8px;
}
.chk {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.hint {
  font-size: 10px;
  color: #6d4c41;
  margin-top: 2px;
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
