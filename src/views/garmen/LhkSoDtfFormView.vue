<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { lhkSoDtfFormService } from "@/services/garmen/lhkSoDtfFormService";
import { IconSearch, IconTrash, IconClipboardList } from "@tabler/icons-vue";

import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import SoDtfSearchModal from "@/components/lookups/SoDtfSearchModal.vue";
import MaklonSearchModal from "@/components/lookups/MaklonSearchModal.vue";
import BarangGarmenSearchModal from "@/components/lookups/BarangGarmenSearchModal.vue";

interface DtfRow {
  Kode: string;
  Nama: string;
  Tipe: "" | "SPK" | "SODTF" | "MAKLON";
  Depan: number;
  Belakang: number;
  Lengan: number;
  Variasi: number;
  Saku: number;
  Panjang: number;
  Buangan: number;
  Ket: string;
  // Khusus Maklon — dipakai/ditampilkan menggantikan kolom di atas
  KodePolos: string;
  Satuan: string;
  KodeHasil: string;
  NamaHasil: string;
  QtyHasil: number;
  BsAfval: number;
  CabTujuan: string;
  TargetJadiOptions?: any[];
}
interface DtfFormData {
  cab: string;
  tanggal: string;
  rows: DtfRow[];
}

const route = useRoute();
const router = useRouter();
const toast = useToast();

const emptyRow = (): DtfRow => ({
  Kode: "",
  Nama: "",
  Tipe: "",
  Depan: 0,
  Belakang: 0,
  Lengan: 0,
  Variasi: 0,
  Saku: 0,
  Panjang: 0,
  Buangan: 0,
  Ket: "",
  KodePolos: "",
  Satuan: "",
  KodeHasil: "",
  NamaHasil: "",
  QtyHasil: 0,
  BsAfval: 0,
  CabTujuan: "",
});

const KETERANGAN_OPTIONS = [
  "PRES DTF",
  "CETAK DTF",
  "CETAK DTG",
  "CETAK PLASTISOL",
];

const initialCab = (route.query.cab as string) || "";
const initialTanggal =
  (route.query.tanggal as string) || new Date().toISOString().substring(0, 10);
const hasMaklonRow = computed(() =>
  formData.value.rows.some((r) => r.Tipe === "MAKLON"),
);
const showCetakSjDialog = ref(false);
const generatedSjList = ref<{ mklNomor: string; sjmNomor: string }[]>([]);

const {
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  goBack,
  executeCancel,
  executeClose,
  executeSave,
} = useForm<DtfFormData>({
  menuId: "123",
  initialData: { cab: initialCab, tanggal: initialTanggal, rows: [emptyRow()] },
  // Simpan = full replace baris cab+tanggal. Baris kosong (Kode='')
  // difilter di sini, backend juga memfilter ulang sebagai pengaman.
  submitApi: (data) =>
    lhkSoDtfFormService.save({
      cab: data.cab,
      tanggal: data.tanggal,
      rows: data.rows
        .filter((r) => r.Kode.trim() !== "")
        .map((r) =>
          r.Tipe === "MAKLON"
            ? {
                Kode: r.Kode,
                Tipe: r.Tipe,
                Ket: r.Ket,
                KodePolos: r.KodePolos,
                QtyMasuk: r.Depan, // Depan dipinjam sebagai Qty Masuk
                Satuan: r.Satuan,
                KodeHasil: r.KodeHasil,
                QtyHasil: r.QtyHasil,
                BsAfval: r.BsAfval,
              }
            : { ...r },
        ),
    }),
  // Replikasi F10 Delphi: setelah simpan sukses TIDAK keluar dari form,
  // cuma reload data (refreshdata()) dan tampilkan pesan sukses.
  onSuccess: (res: any) => {
    toast.success("LHK berhasil disimpan.");
    const sjList = res?.data?.data?.sjHasilMaklon || [];
    if (sjList.length) {
      generatedSjList.value = sjList;
      showCetakSjDialog.value = true;
    } else {
      goBack();
    }
  },
  immediate: false,
});

const isLoadingRows = ref(false);

// ── Load / reload baris untuk cab+tanggal aktif ──
const reloadRows = async () => {
  isLoadingRows.value = true;
  try {
    const res = await lhkSoDtfFormService.getDetail(
      formData.value.cab,
      formData.value.tanggal,
    );
    const rows: DtfRow[] = (res.data.data || []).map((r: any) => {
      if (r.Tipe === "MAKLON") {
        return {
          Kode: r.Kode || "",
          Nama: r.Nama || "",
          Tipe: "MAKLON",
          Depan: Number(r.QtyMasuk) || 0,
          Belakang: 0,
          Lengan: 0,
          Variasi: Number(r.QtyHasil) || 0,
          Saku: Number(r.BsAfval) || 0,
          Panjang: 0,
          Buangan: 0,
          Ket: r.Ket || "",
          KodePolos: r.KodePolos || "", // ⬅ FIX: sebelumnya selalu ""
          Satuan: r.Satuan || "",
          KodeHasil: r.KodeHasil || "",
          NamaHasil: r.NamaHasil || "",
          QtyHasil: Number(r.QtyHasil) || 0,
          BsAfval: Number(r.BsAfval) || 0,
          CabTujuan: "",
        };
      }
      return {
        Kode: r.Kode || "",
        Nama: r.Nama || "",
        Tipe: r.Tipe || "SPK",
        Depan: Number(r.Depan) || 0,
        Belakang: Number(r.Belakang) || 0,
        Lengan: Number(r.Lengan) || 0,
        Variasi: Number(r.Variasi) || 0,
        Saku: Number(r.Saku) || 0,
        Panjang: Number(r.Panjang) || 0,
        Buangan: Number(r.Buangan) || 0,
        Ket: r.Ket || "",
        KodePolos: "",
        Satuan: "",
        KodeHasil: "",
        NamaHasil: "",
        QtyHasil: 0,
        BsAfval: 0,
        CabTujuan: "",
      };
    });
    formData.value.rows = rows;
    ensureTrailingEmptyRow();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoadingRows.value = false;
  }
};

onMounted(() => {
  if (!formData.value.cab || !formData.value.tanggal) {
    toast.error("Cabang/Tanggal tidak valid.");
    goBack();
    return;
  }
  reloadRows();
});

// ── Tanggal berubah (replikasi dtTanggalExit → loaddataall) ──
const onTanggalChange = async () => {
  await reloadRows();
  toast.info(`Data dimuat ulang untuk tanggal ${formData.value.tanggal}.`);
};

// ── Auto-tambah baris kosong kalau baris terakhir sudah terisi ──
// (emulasi behavior grid infinite-row AdvGrid di Delphi)
const ensureTrailingEmptyRow = () => {
  const rows = formData.value.rows;
  const last = rows[rows.length - 1];
  if (!last || last.Kode.trim() !== "") {
    rows.push(emptyRow());
  }
};

// ── Hapus baris (replikasi VK_DELETE + MessageDlg confirm) ──
const showDeleteRowDialog = ref(false);
const rowIndexToDelete = ref<number | null>(null);
const confirmDeleteRow = (idx: number) => {
  // Baris kosong terakhir (placeholder) tidak perlu dikonfirmasi, langsung no-op
  if (
    formData.value.rows[idx]?.Kode.trim() === "" &&
    idx === formData.value.rows.length - 1
  ) {
    return;
  }
  rowIndexToDelete.value = idx;
  showDeleteRowDialog.value = true;
};
const doDeleteRow = () => {
  if (rowIndexToDelete.value !== null) {
    formData.value.rows.splice(rowIndexToDelete.value, 1);
    ensureTrailingEmptyRow();
  }
  showDeleteRowDialog.value = false;
  rowIndexToDelete.value = null;
};

// ── Kode manual diketik (blur) → validateKode, replikasi loadspk() ──
// ⚠️ Scope BEDA dari F1: hanya tspk(spk_aktif='Y') + retail.tsodtf_hdr,
// TIDAK termasuk tmemospk. Kalau nomor MAP, harus dipilih via F1.
const onKodeBlur = async (row: DtfRow) => {
  const kode = row.Kode.trim();
  if (!kode || row.Nama) return;
  try {
    const res = await lhkSoDtfFormService.validateKode(kode);
    row.Kode = res.data.data.Nomor;
    row.Nama = res.data.data.Nama;
    row.Tipe = res.data.data.Tipe;
    if (row.Tipe === "MAKLON") {
      await applyMaklonAutofill(row);
    }
    ensureTrailingEmptyRow();
  } catch (e: any) {
    toast.warning(
      e.response?.data?.message || "Spk/SO DTF/Maklon tsb belum ada.",
    );
  }
};

const applyMaklonAutofill = async (row: DtfRow) => {
  try {
    const res = await lhkSoDtfFormService.getMaklonAutofill(row.Kode);
    const d = res.data.data;
    row.KodePolos = d.kodePolos;
    row.Satuan = d.satuan;
    row.Depan = Number(d.qtyMasuk) || 0;
    row.CabTujuan = d.cabTujuan;

    if (d.targetJadiOptions.length === 1) {
      // Cuma 1 rencana — langsung isi otomatis
      row.KodeHasil = d.targetJadiOptions[0].Kode;
      row.NamaHasil = d.targetJadiOptions[0].Nama;
    } else if (d.targetJadiOptions.length > 1) {
      // Lebih dari 1 — belum dipilih, munculkan pilihan ke user
      row.KodeHasil = "";
      row.NamaHasil = "";
      row.TargetJadiOptions = d.targetJadiOptions;
      toast.info(
        `${row.Kode} punya ${d.targetJadiOptions.length} rencana Barang Jadi — pilih salah satu.`,
      );
    } else {
      row.KodeHasil = "";
      row.NamaHasil = "";
    }

    if (d.multiItem) {
      toast.warning(
        `${row.Kode} punya lebih dari 1 item barang polos — Qty Masuk digabung, silakan cek manual.`,
      );
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data Maklon.");
  }
};

// ── F1 (SPK/MAP) & F2 (SO DTF Kaosan) — sekarang pakai SearchModal reusable ──
const showSpkMapLookup = ref(false);
const showSoDtfLookup = ref(false);
const showMaklonLookup = ref(false);
const lookupTargetIndex = ref<number | null>(null);

const openSpkMapLookup = (idx: number) => {
  if (formData.value.rows[idx].Nama) return;
  lookupTargetIndex.value = idx;
  showSpkMapLookup.value = true;
};
const openSoDtfLookup = (idx: number) => {
  if (formData.value.rows[idx].Nama) return;
  lookupTargetIndex.value = idx;
  showSoDtfLookup.value = true;
};
const openMaklonLookup = (idx: number) => {
  if (formData.value.rows[idx].Nama) return;
  lookupTargetIndex.value = idx;
  showMaklonLookup.value = true;
};

// Selection langsung assign Kode+Nama tanpa validasi tambahan —
// replikasi persis cxGrdMainEditKeyDown (assign langsung dari hasil
// frmbantuan, tidak lewat loadspk()).
const selectLookupResult = async (item: any) => {
  if (lookupTargetIndex.value === null) return;
  const row = formData.value.rows[lookupTargetIndex.value];
  row.Kode = item.Nomor;
  row.Nama = item.Nama;
  row.Tipe = item.Tipe || "SPK";
  if (row.Tipe === "MAKLON") {
    await applyMaklonAutofill(row);
  }
  ensureTrailingEmptyRow();
};

const showItemHasilModal = ref(false);
const itemHasilTargetIndex = ref<number | null>(null);

const openItemHasilModal = (idx: number) => {
  const row = formData.value.rows[idx];
  if (!row.CabTujuan) {
    toast.warning("Pilih No. Maklon terlebih dahulu.");
    return;
  }
  itemHasilTargetIndex.value = idx;
  showItemHasilModal.value = true;
};

const selectItemHasil = (item: any) => {
  const idx = itemHasilTargetIndex.value;
  if (idx === null) return;
  formData.value.rows[idx].KodeHasil = item.Kode;
  formData.value.rows[idx].NamaHasil = item.Nama;
  showItemHasilModal.value = false;
};

// ── Enter = pindah field berikutnya ──
// Replikasi FormKeyPress Delphi: `if Key=#13 then SelectNext(ActiveControl,True,True)`
// yaitu Enter berperan sama seperti Tab di SELURUH form, bukan cuma di grid.
const handleEnterAsTab = (e: KeyboardEvent) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const focusable = Array.from(
    document.querySelectorAll<HTMLElement>(
      "input:not([disabled]):not([readonly]):not([tabindex='-1'])",
    ),
  ).filter((el) => el.offsetParent !== null); // hanya elemen yang tampak
  const idx = focusable.indexOf(document.activeElement as HTMLElement);
  if (idx > -1 && idx < focusable.length - 1) {
    focusable[idx + 1].focus();
    (focusable[idx + 1] as HTMLInputElement).select?.();
  }
};

// ── Cari SPK (edtspk) — pencarian client-side di baris yang sudah dimuat ──
const cariSpkKeyword = ref("");
const highlightedRowIndex = ref<number | null>(null);
const rowRefs = ref<Record<number, HTMLElement>>({});
const onCariSpk = () => {
  const kw = cariSpkKeyword.value.trim();
  if (!kw) return;
  const idx = formData.value.rows.findIndex((r) => r.Kode === kw);
  if (idx === -1) {
    toast.warning("Tidak ketemu.");
    highlightedRowIndex.value = null;
    return;
  }
  highlightedRowIndex.value = idx;
  nextTick(() => {
    rowRefs.value[idx]?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
};

// ── Validasi sebelum Simpan (replikasi urutan & pesan F10 persis) ──
const onValidateSave = () => {
  const filled = formData.value.rows.filter((r) => r.Kode.trim() !== "");
  if (filled.length === 0) return toast.error("Detail harus diisi.");

  for (const r of filled) {
    if (!r.Ket.trim()) return toast.error("Keterangan harus diisi.");
    if (r.Tipe === "MAKLON") {
      if (!r.KodeHasil)
        return toast.error(`${r.Kode}: Item Hasil wajib diisi.`);
      if (!r.QtyHasil && !r.BsAfval)
        return toast.error(`${r.Kode}: Qty Hasil atau BS/Afval harus diisi.`);
    } else {
      const qtySum = r.Depan + r.Belakang + r.Lengan + r.Variasi + r.Saku;
      if (qtySum === 0) return toast.error("Qty harus di isi");
    }
  }
  showSaveDialog.value = true;
};

const openPrintSj = (sjmNomor: string) => {
  const url = router.resolve({
    name: "SjHasilMakloonPrint",
    params: { nomor: sjmNomor },
  }).href;
  window.open(url, "_blank");
};

const num = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
</script>

<template>
  <BaseForm
    title="Form LHK SO DTF/DTG"
    menu-id="123"
    :icon="IconClipboardList"
    :is-loading="isLoadingRows"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="onValidateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- Kiri: Gudang (readonly), Tanggal, Cari SPK -->
    <template #left-column>
      <div class="desktop-form-section" @keydown="handleEnterAsTab">
        <div class="section-title">Filter</div>

        <label class="f-lbl">Gudang</label>
        <input :value="formData.cab" disabled class="f-input f-readonly" />
        <div class="f-hint">Mengikuti cabang Anda — tidak dapat diubah.</div>

        <label class="f-lbl mt-3">Tanggal</label>
        <input
          type="date"
          v-model="formData.tanggal"
          class="f-input"
          @change="onTanggalChange"
        />

        <label class="f-lbl mt-3">Cari SPK</label>
        <input
          type="text"
          v-model="cariSpkKeyword"
          class="f-input"
          placeholder="Ketik nomor SPK..."
          @keydown.enter="onCariSpk"
        />
      </div>
    </template>

    <!-- Kanan: Grid detail -->
    <template #right-column>
      <div class="desktop-form-section grid-wrap" @keydown="handleEnterAsTab">
        <div class="section-title">
          Detail LHK
          <span class="section-hint"
            >F1: Help SPK/MAP · F2: Help SO DTF Kaosan · F3: Help No.
            Maklon</span
          >
        </div>
        <div class="table-scroll">
          <table class="dt-tbl">
            <thead>
              <tr>
                <th style="width: 30px">No</th>
                <th style="width: 220px">SPK/MAP/Maklon</th>
                <th style="min-width: 200px">Nama</th>
                <th style="width: 90px">
                  {{ hasMaklonRow ? "Qty Masuk" : "Depan" }}
                </th>
                <th style="width: 90px">
                  {{ hasMaklonRow ? "Satuan" : "Belakang" }}
                </th>
                <th style="width: 170px">
                  {{ hasMaklonRow ? "Item Hasil" : "Lengan" }}
                </th>
                <th style="width: 85px">
                  {{ hasMaklonRow ? "Qty Hasil" : "Variasi" }}
                </th>
                <th style="width: 80px">
                  {{ hasMaklonRow ? "BS/Afval" : "Saku" }}
                </th>
                <th style="width: 80px">Panjang(M)</th>
                <th style="width: 80px">Buangan(M)</th>
                <th style="min-width: 160px">Keterangan</th>
                <th style="width: 36px"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in formData.rows"
                :key="idx"
                :ref="
                  (el) => {
                    if (el) rowRefs[idx] = el as HTMLElement;
                  }
                "
                :class="{
                  'row-highlight': highlightedRowIndex === idx,
                  'row-maklon': row.Tipe === 'MAKLON',
                }"
              >
                <td class="tc">{{ idx + 1 }}</td>
                <td>
                  <div class="kode-cell">
                    <input
                      type="text"
                      v-model="row.Kode"
                      class="cell-input nav-field"
                      @blur="onKodeBlur(row)"
                      @keydown.f1.prevent="openSpkMapLookup(idx)"
                      @keydown.f2.prevent="openSoDtfLookup(idx)"
                      @keydown.f3.prevent="openMaklonLookup(idx)"
                    />
                    <button
                      class="lk-btn"
                      tabindex="-1"
                      :disabled="!!row.Nama"
                      title="F1 Help SPK/MAP"
                      @click="openSpkMapLookup(idx)"
                    >
                      F1
                    </button>
                    <button
                      class="lk-btn"
                      tabindex="-1"
                      :disabled="!!row.Nama"
                      title="F2 Help SO DTF Kaosan"
                      @click="openSoDtfLookup(idx)"
                    >
                      F2
                    </button>
                    <button
                      class="lk-btn"
                      tabindex="-1"
                      :disabled="!!row.Nama"
                      title="F3 Help No. Maklon"
                      @click="openMaklonLookup(idx)"
                    >
                      F3
                    </button>
                  </div>
                </td>
                <td>
                  <input
                    type="text"
                    v-model="row.Nama"
                    class="cell-input"
                    readonly
                  />
                  <span v-if="row.Tipe === 'MAKLON'" class="tipe-badge"
                    >MAKLON</span
                  >
                </td>

                <!-- Depan / Qty Masuk -->
                <td>
                  <input
                    v-if="row.Tipe === 'MAKLON'"
                    type="number"
                    v-model.number="row.Depan"
                    class="cell-input tr"
                    readonly
                  />
                  <input
                    v-else
                    type="number"
                    v-model.number="row.Depan"
                    class="cell-input tr"
                  />
                </td>

                <!-- Belakang / Satuan -->
                <td>
                  <input
                    v-if="row.Tipe === 'MAKLON'"
                    type="text"
                    v-model="row.Satuan"
                    class="cell-input"
                    readonly
                  />
                  <input
                    v-else
                    type="number"
                    v-model.number="row.Belakang"
                    class="cell-input tr"
                  />
                </td>

                <!-- Lengan / Item Hasil -->
                <td>
                  <div v-if="row.Tipe === 'MAKLON'" class="kode-cell">
                    <span class="cell-text mono">{{
                      row.KodeHasil || "—"
                    }}</span>
                    <button
                      class="lk-btn"
                      tabindex="-1"
                      title="Ganti Item Hasil"
                      @click="openItemHasilModal(idx)"
                    >
                      <IconSearch :size="10" />
                    </button>
                  </div>
                  <input
                    v-else
                    type="number"
                    v-model.number="row.Lengan"
                    class="cell-input tr"
                  />
                </td>

                <!-- Variasi / Qty Hasil -->
                <td>
                  <input
                    v-if="row.Tipe === 'MAKLON'"
                    type="number"
                    v-model.number="row.QtyHasil"
                    class="cell-input tr"
                  />
                  <input
                    v-else
                    type="number"
                    v-model.number="row.Variasi"
                    class="cell-input tr"
                  />
                </td>

                <!-- Saku / BS-Afval -->
                <td>
                  <input
                    v-if="row.Tipe === 'MAKLON'"
                    type="number"
                    v-model.number="row.BsAfval"
                    class="cell-input tr"
                  />
                  <input
                    v-else
                    type="number"
                    v-model.number="row.Saku"
                    class="cell-input tr"
                  />
                </td>

                <!-- Panjang, Buangan: tidak relevan buat Maklon, disable -->
                <td>
                  <input
                    type="number"
                    step="0.1"
                    v-model.number="row.Panjang"
                    class="cell-input tr"
                    :disabled="row.Tipe === 'MAKLON'"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.1"
                    v-model.number="row.Buangan"
                    class="cell-input tr"
                    :disabled="row.Tipe === 'MAKLON'"
                  />
                </td>

                <td>
                  <select v-model="row.Ket" class="cell-input cell-select">
                    <option value="">-- Pilih --</option>
                    <option
                      v-if="row.Ket && !KETERANGAN_OPTIONS.includes(row.Ket)"
                      :value="row.Ket"
                    >
                      {{ row.Ket }}
                    </option>
                    <option
                      v-for="opt in KETERANGAN_OPTIONS"
                      :key="opt"
                      :value="opt"
                    >
                      {{ opt }}
                    </option>
                  </select>
                </td>
                <td class="tc">
                  <button
                    class="del-btn"
                    tabindex="-1"
                    title="Hapus baris"
                    @click="confirmDeleteRow(idx)"
                  >
                    <IconTrash :size="14" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseForm>

  <!-- Dialog Lookup F1/F2 -->
  <SpkSearchModal
    v-model="showSpkMapLookup"
    filter-mode="spk-map"
    @selected="selectLookupResult"
  />
  <SoDtfSearchModal v-model="showSoDtfLookup" @selected="selectLookupResult" />
  <BarangGarmenSearchModal
    v-model="showItemHasilModal"
    jenis="ACCESORIES"
    :cabang="formData.rows[itemHasilTargetIndex ?? 0]?.CabTujuan || ''"
    @selected="selectItemHasil"
  />
  <MaklonSearchModal
    v-model="showMaklonLookup"
    @selected="selectLookupResult"
  />

  <!-- Dialog Konfirmasi Hapus Baris -->
  <v-dialog v-model="showDeleteRowDialog" max-width="360px">
    <v-card rounded="lg">
      <v-card-title class="bg-error text-white pa-3 text-subtitle-1"
        >Hapus Record?</v-card-title
      >
      <v-card-text class="pa-4"
        >Baris ini akan dihapus dari daftar.</v-card-text
      >
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="showDeleteRowDialog = false">Tidak</v-btn>
        <v-btn color="error" variant="elevated" @click="doDeleteRow"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showCetakSjDialog" max-width="420px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        SJ Hasil Maklon Terbit
      </v-card-title>
      <v-card-text class="pa-4">
        <div class="mb-2" style="font-size: 12px">
          Berikut SJ Hasil Maklon yang otomatis dibuat:
        </div>
        <div
          v-for="s in generatedSjList"
          :key="s.sjmNomor"
          class="d-flex justify-space-between align-center mb-1"
        >
          <span class="mono">{{ s.sjmNomor }}</span>
          <v-btn size="x-small" color="primary" @click="openPrintSj(s.sjmNomor)"
            >Cetak</v-btn
          >
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="
            showCetakSjDialog = false;
            goBack();
          "
          >Selesai</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #1565c0;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.section-hint {
  font-size: 9px;
  font-weight: 400;
  color: #888;
  text-transform: none;
}
.f-lbl {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: #555;
  margin-bottom: 3px;
}
.mt-3 {
  margin-top: 12px;
}
.f-input {
  width: 100%;
  height: 30px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.f-input:focus {
  border-color: #1976d2;
}
.f-readonly {
  background: #eeeeee;
  color: #555;
  cursor: not-allowed;
}
.f-hint {
  font-size: 9px;
  color: #999;
  margin-top: 3px;
}
.grid-wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.table-scroll {
  flex: 1;
  overflow: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.dt-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dt-tbl thead th {
  background: #f5f5f5;
  padding: 5px 6px;
  border-bottom: 1px solid #ccc;
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: nowrap;
}
.dt-tbl tbody td {
  border-bottom: 1px solid #eee;
  padding: 2px 4px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.muted {
  color: #999;
  font-style: italic;
  padding: 12px !important;
}
.cell-input {
  width: 100%;
  height: 26px;
  border: 1px solid transparent;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: transparent;
}
.cell-input:focus {
  border-color: #1976d2;
  background: white;
}
.cell-select {
  width: 100%;
  height: 26px;
  border: 1px solid transparent;
  padding: 0 2px;
  font-size: 11px;
  outline: none;
  background: transparent;
  cursor: pointer;
  appearance: auto;
}
.cell-select:focus {
  border-color: #1976d2;
  background: white;
}
.kode-cell {
  display: flex;
  align-items: center;
  gap: 2px;
}
.lk-btn {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: #f5f5f5;
  cursor: pointer;
}
.lk-btn:hover {
  background: #e3f2fd;
  border-color: #1976d2;
}
.lk-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.del-btn {
  border: none;
  background: transparent;
  color: #c62828;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.row-highlight {
  background: #fff9c4 !important;
}
.lookup-scroll {
  max-height: 340px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.lookup-row {
  cursor: pointer;
}
.lookup-row:hover {
  background: #e3f2fd;
}
.row-maklon td {
  background: #fff8e1 !important;
}
.cell-text {
  flex: 1;
  font-size: 10px;
  padding: 0 2px;
}
.tipe-badge {
  font-size: 8px;
  font-weight: 700;
  color: #f57c00;
  background: #fff3e0;
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 4px;
}
</style>
