<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from "vue";
import { useToast } from "vue-toastification";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useForm } from "@/composables/useForm";
import { poPaperprintService } from "@/services/mmt/poPaperprintService";
import BaseForm from "@/components/BaseForm.vue";
import SpkSearchModal from "@/modal/SpkLookupModal.vue";
import SupplierSearchModal from "@/modal/SupplierLookupModal.vue";
import {
  IconFileText,
  IconSearch,
  IconTrash,
  IconPlus,
  IconCircleCheck,
  IconPrinter,
  IconX,
  IconPhoto,
} from "@tabler/icons-vue";

interface DetailItem {
  spk: string;
  nama: string;
  ukuran: string;
  bahan: string;
  finishing: string;
  jumlah: number;
  ket: string;
  idgambar: string;
  imageUrl?: string | null;
  newFile?: File | null;
  removeImage?: boolean;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const cabangOptions = ref<string[]>(["P01", "P02", "P04", "P05"]);
const ukuranOptions = ref<string[]>([]);
const bahanOptions = ref<string[]>([]);

// Modals Visibility State
const showSpkModal = ref(false);
const showSupplierModal = ref(false);
const activeDetailIndex = ref(-1);
const isLookupOpening = ref(false);
const supDirty = ref(false);

const showPrintConfirm = ref(false);
const savedNomor = ref("");

// Refs Focus
const spkRefs = ref<Record<number, HTMLInputElement | null>>({});
const jumlahRefs = ref<Record<number, HTMLInputElement | null>>({});
const fileInputRefs = ref<Record<number, HTMLInputElement | null>>({});

// --- EXTRACTION DATA LOOKUP SPK ---
// 1. EXTRACTION REKURSIF (Menembus semua lapisan wrapper modal Vuetify)
const extractItemData = (input: any): Record<string, any> => {
  if (!input) return {};

  let val = input;

  // Jika input berupa Array (pilihan checklist/single select datatable)
  if (Array.isArray(val)) {
    if (val.length === 0) return {};
    val = val[0];
  }

  // Rekursif menembus wrapper .raw atau .item
  let depth = 0;
  while (val && typeof val === "object" && depth < 5) {
    if (val.raw && typeof val.raw === "object") {
      val = val.raw;
    } else if (val.item && typeof val.item === "object") {
      val = val.item;
    } else {
      break;
    }
    depth++;
  }

  return val && typeof val === "object" ? val : {};
};

// 2. DETEKTIF KEY SPK (Mencari semua variasi penulisan No. SPK)
const findSpkNomor = (d: any): string => {
  if (!d || typeof d !== "object") return "";

  // Urutan prioritas key dari respon backend / modal
  const possibleKeys = [
    "SPK",
    "spk",
    "spk_nomor",
    "spkNomor",
    "Nomor",
    "nomor",
    "Kode",
    "kode",
    "No_SPK",
    "no_spk",
    "spk_no",
    "SPK_Nomor",
    "Nomor_SPK",
    "nomor_spk",
    "spk_id",
    "ID_SPK",
  ];

  for (const key of possibleKeys) {
    if (
      d[key] !== undefined &&
      d[key] !== null &&
      String(d[key]).trim() !== ""
    ) {
      return String(d[key]).trim();
    }
  }

  // Fallback: Jika key ber-format bertingkat/lainnya, scan semua key yang mengandung kata 'spk' atau 'nomor'
  for (const key of Object.keys(d)) {
    const k = key.toLowerCase();
    if (
      (k.includes("spk") || k.includes("nomor")) &&
      typeof d[key] === "string" &&
      d[key].trim() !== ""
    ) {
      return String(d[key]).trim();
    }
  }

  return "";
};

// 3. DETEKTIF KEY NAMA SPK
const findSpkNama = (d: any): string => {
  if (!d || typeof d !== "object") return "";
  const possibleKeys = [
    "Nama",
    "nama",
    "spk_nama",
    "spkNama",
    "namaspk",
    "NamaSpk",
    "Nama_SPK",
    "nama_spk",
  ];
  for (const key of possibleKeys) {
    if (
      d[key] !== undefined &&
      d[key] !== null &&
      String(d[key]).trim() !== ""
    ) {
      return String(d[key]).trim();
    }
  }
  return "";
};

// 4. FUNGSIONALITAS UTAMA PENERAPAN DATA SPK KE ROW
const applySpkToRow = (idx: number, rawData: any) => {
  console.log("RAW DATA DARI MODAL:", rawData); // Debugging di Console Browser

  const data = extractItemData(rawData);
  console.log("EXTRACTED DATA:", data); // Debugging Hasil Ekstraksi

  if (!formData.value.details[idx]) return;

  const spkNomor = findSpkNomor(data);
  const spkNama = findSpkNama(data);

  if (!spkNomor) {
    console.error("Gagal menemukan key SPK pada objek:", data);
    toast.error("Gagal membaca Nomor SPK dari data terpilih!");
    return;
  }

  const spkUkuran =
    formData.value.cab === "P05"
      ? data.Ukuran || data.ukuran || data.spk_ukuran || ""
      : "";
  const spkBahan =
    formData.value.cab === "P05"
      ? data.Bahan || data.bahan || data.spk_kain || data.spk_bahan || ""
      : "";
  const spkFinishing =
    formData.value.cab === "P05"
      ? data.Finishing || data.finishing || data.spk_finishing || ""
      : "";

  const spkJumlah = Number(data.Jumlah ?? data.jumlah ?? data.spk_jumlah ?? 0);

  // Alokasi objek reaktif baru
  formData.value.details[idx] = {
    ...formData.value.details[idx],
    spk: spkNomor,
    nama: spkNama,
    ukuran: String(spkUkuran),
    bahan: String(spkBahan),
    finishing: String(spkFinishing),
    jumlah: spkJumlah,
    idgambar: "",
    imageUrl: null,
    newFile: null,
    removeImage: false,
  };

  ensureTrailingRow();

  nextTick(() => {
    jumlahRefs.value[idx]?.focus();
  });
};

const createEmptyRow = (): DetailItem => {
  return {
    spk: "",
    nama: "",
    ukuran: "",
    bahan: "",
    finishing: "",
    jumlah: 0,
    ket: "",
    idgambar: "",
    imageUrl: null,
    newFile: null,
    removeImage: false,
  };
};

const ensureTrailingRow = () => {
  const details = formData.value.details;
  const last = details[details.length - 1];
  if (!last || last.spk) {
    details.push(createEmptyRow());
  }
};

// Initial State
const initialData = {
  nomor: "",
  tanggal: formatDateLocal(new Date()),
  dateline: formatDateLocal(new Date()),
  cab: "P01",
  supKode: "00164",
  supNama: "MMT KENCANA PRINT",
  supAlamat: "DEMEN, JERON, NOGOSARI",
  keterangan: "",
  details: [] as DetailItem[],
};

// Setup useForm Composable
const {
  formData,
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  executeSave,
  executeCancel,
  executeClose,
  fetchData,
} = useForm({
  menuId: "128",
  initialData,
  fetchApi: async () => {
    const targetNomor = route.params.nomor as string;
    const res = await poPaperprintService.getFormData(targetNomor);
    const responseData = res.data?.data || res.data;
    const h = responseData.header || responseData;
    const d = responseData.details || responseData.Detail || [];

    return {
      nomor: h.pjh_nomor || h.Nomor || "",
      tanggal: formatDateLocal(h.pjh_tanggal || h.Tanggal),
      dateline: formatDateLocal(h.pjh_dateline || h.Dateline),
      cab: h.pjh_cab || h.Cab || "P01",
      supKode: h.pjh_sup_kode || h.KodeSup || "00164",
      supNama: h.sup_nama || h.Supplier || h.Nama || "",
      supAlamat: h.sup_alamat || h.Alamat || "",
      keterangan: h.pjh_ket || h.Keterangan || "",
      details: d.map((item: any) => {
        const qty = Number(item.pjd_qty || item.Qty || item.jumlah) || 0;
        return {
          spk: item.pjd_spk || item.Spk || item.SPK || "",
          nama: item.pjd_nama || item.NamaSpk || item.Nama || "",
          ukuran: item.pjd_ukuran || item.Ukuran || "",
          bahan: item.pjd_bahan || item.Bahan || "",
          finishing: item.pjd_finishing || item.Finishing || "",
          jumlah: qty,
          ket: item.pjd_ket || item.Keterangan || "",
          idgambar: item.pjd_idgambar || item.IdGambar || "",
          imageUrl: item.hasImage ? item.imageUrl : null,
          newFile: null,
          removeImage: false,
        };
      }),
    };
  },
  submitApi: async (data: typeof initialData): Promise<unknown> => {
    const filledDetails = data.details.filter((r) => r.spk.trim() !== "");
    const payload = new FormData();

    const detailsPayload = filledDetails.map((r, i) => {
      const hasNewFile = !!r.newFile;
      if (hasNewFile) {
        payload.append(`img_${i}`, r.newFile as File);
      }
      return {
        spk: r.spk,
        nama: r.nama,
        ukuran: r.ukuran,
        bahan: r.bahan,
        finishing: r.finishing,
        jumlah: r.jumlah,
        harga: 0,
        ket: r.ket,
        idgambar: r.idgambar,
        newImageField: hasNewFile ? `img_${i}` : null,
        removeImage: r.removeImage || false,
      };
    });

    payload.append(
      "data",
      JSON.stringify({
        tanggal: data.tanggal,
        dateline: data.dateline,
        cabang: data.cab,
        supKode: data.supKode,
        keterangan: data.keterangan,
        details: detailsPayload,
      }),
    );

    let res;
    if (isEditMode.value) {
      res = await poPaperprintService.update(data.nomor, payload);
    } else {
      res = await poPaperprintService.create(payload);
    }

    savedNomor.value = res.data?.data?.nomor || res.data?.nomor || data.nomor;
    showPrintConfirm.value = true;
    return res;
  },
});

const loadMasterOptions = async () => {
  try {
    const res = await poPaperprintService.getMeta();
    cabangOptions.value = res.data?.data?.cabangOptions || [
      "P01",
      "P02",
      "P04",
      "P05",
    ];
    ukuranOptions.value = res.data?.data?.ukuranOptions || [];
    bahanOptions.value = res.data?.data?.bahanOptions || [];
  } catch (e) {
    cabangOptions.value = ["P01", "P02", "P04", "P05"];
  }
};

onMounted(async () => {
  await loadMasterOptions();

  const userCab = authStore.userCabang;
  if (userCab && cabangOptions.value.includes(userCab)) {
    formData.value.cab = userCab;
  }

  if (isEditMode.value) {
    await fetchData();
    ensureTrailingRow();
  } else {
    formData.value.details = [createEmptyRow()];
  }
});

// Supplier Lookup
const openSupplierModal = () => {
  isLookupOpening.value = true;
  showSupplierModal.value = true;
};

const onSupplierSelected = (selectedItem: any) => {
  const item = extractItemData(selectedItem);
  formData.value.supKode =
    item.Kode || item.sup_kode || item.kode || item.supKode || "";
  formData.value.supNama =
    item.Nama || item.sup_nama || item.nama || item.supNama || "";
  formData.value.supAlamat =
    item.Alamat || item.sup_alamat || item.alamat || item.supAlamat || "";

  showSupplierModal.value = false;
  supDirty.value = false;
  isLookupOpening.value = false;
};

const onSupBlur = async () => {
  if (isLookupOpening.value || showSupplierModal.value) return;
  if (!supDirty.value || !formData.value.supKode.trim()) return;
  supDirty.value = false;
  try {
    const res = await poPaperprintService.resolveSupplier(
      formData.value.supKode.trim(),
    );
    const data = res.data?.data || res.data || {};
    const item = Array.isArray(data) ? data[0] : data;
    formData.value.supNama = item.nama || item.sup_nama || item.Nama || "";
    formData.value.supAlamat =
      item.alamat || item.sup_alamat || item.Alamat || "";
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Supplier tsb tidak ada di database.",
    );
  }
};

// --- SPK LOOKUP HANDLER (GAYA LHK MESIN - MODAL & INPUT GROUP) ---
const openSpkLookup = (index: number) => {
  isLookupOpening.value = true;
  activeDetailIndex.value = index;
  showSpkModal.value = true;
};

const onSpkSelected = (selectedItem: any) => {
  const idx = activeDetailIndex.value;
  if (idx !== null && idx >= 0) {
    applySpkToRow(idx, selectedItem);
  }
  showSpkModal.value = false;
  activeDetailIndex.value = -1;
  isLookupOpening.value = false;
};

const onSpkKeydown = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openSpkLookup(idx);
  }
};

const onSpkBlur = async (idx: number) => {
  if (isLookupOpening.value || showSpkModal.value) return;
  const row = formData.value.details[idx];
  if (!row) return;
  const kode = (row.spk || "").trim();
  if (!kode || row.nama) return;
  try {
    const res = await poPaperprintService.resolveSpk(kode);
    const d = res.data?.data || res.data;
    applySpkToRow(idx, d);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Spk ini belum ada.");
    row.spk = "";
  }
};

const clearSpkRow = (index: number) => {
  const row = formData.value.details[index];
  if (!row) return;
  row.spk = "";
  row.nama = "";
  row.ukuran = "";
  row.bahan = "";
  row.finishing = "";
  row.jumlah = 0;
  row.imageUrl = null;
  row.newFile = null;
};

// File Upload Handler
const handleFileUpload = (event: Event, item: DetailItem) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    if (file.size > 1_000_000) {
      toast.error("Ukuran gambar tidak boleh > 1 Mb.");
      target.value = "";
      return;
    }
    item.newFile = file;
    item.imageUrl = URL.createObjectURL(file);
    item.removeImage = false;
  }
};

const removeRowImage = (item: DetailItem) => {
  if (item.newFile) {
    item.newFile = null;
    item.imageUrl = null;
    return;
  }
  if (item.idgambar) {
    toast.warning("Gambar existing akan dihapus saat disimpan.");
    item.removeImage = true;
    item.imageUrl = null;
  }
};

const validateBeforeSave = () => {
  if (!formData.value.supKode.trim()) {
    return toast.warning("Supplier harus diisi.");
  }

  const validDetails = formData.value.details.filter(
    (d: DetailItem) => d.spk.trim() !== "",
  );

  if (validDetails.length === 0) {
    return toast.warning("Detail SPK harus diisi minimal 1 baris.");
  }

  for (const row of validDetails) {
    if (Number(row.jumlah) <= 0) {
      return toast.warning(`Jumlah untuk SPK ${row.spk} harus lebih dari 0.`);
    }
  }

  showSaveDialog.value = true;
};

const doPrint = () => {
  showPrintConfirm.value = false;
  window.open(
    `/mmt/po-paperprint/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  router.push("/mmt/po-paperprint");
};

const doNotPrint = () => {
  showPrintConfirm.value = false;
  router.push("/mmt/po-paperprint");
};
</script>

<template>
  <BaseForm
    :title="(isEditMode ? 'Ubah' : 'Tambah') + ' PO Paperprint'"
    menu-id="128"
    :icon="IconFileText"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:showSaveDialog="showSaveDialog"
    v-model:showCancelDialog="showCancelDialog"
    v-model:showCloseDialog="showCloseDialog"
    @validate-save="validateBeforeSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- LEFT COLUMN: HEADER PO PAPERPRINT -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="text-caption font-weight-bold mb-3 text-primary">
          HEADER PO PAPERPRINT
        </div>

        <v-text-field
          v-model="formData.nomor"
          label="No. PO Paper"
          density="compact"
          variant="outlined"
          readonly
          placeholder="Otomatis (PP.YYYYMM.XXXX)"
          hide-details
          class="mb-2 bg-grey-lighten-4"
        />

        <v-select
          v-model="formData.cab"
          :items="cabangOptions"
          label="Cabang"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
        />

        <div class="d-flex gap-2 mb-2">
          <v-text-field
            v-model="formData.tanggal"
            type="date"
            label="Tanggal"
            density="compact"
            variant="outlined"
            hide-details
            class="flex-grow-1"
          />
          <v-text-field
            v-model="formData.dateline"
            type="date"
            label="Dateline"
            density="compact"
            variant="outlined"
            hide-details
            class="flex-grow-1"
          />
        </div>

        <v-text-field
          v-model="formData.supKode"
          label="Kode Supplier"
          density="compact"
          variant="outlined"
          hide-details
          readonly
          class="mb-2 text-primary cursor-pointer"
          @click="openSupplierModal"
        >
          <template #append-inner>
            <IconSearch
              :size="16"
              style="cursor: pointer"
              @click="openSupplierModal"
            />
          </template>
        </v-text-field>

        <v-text-field
          v-model="formData.supNama"
          label="Nama Supplier"
          density="compact"
          variant="outlined"
          readonly
          hide-details
          class="mb-2 bg-grey-lighten-4"
        />

        <v-text-field
          v-model="formData.supAlamat"
          label="Alamat Supplier"
          density="compact"
          variant="outlined"
          readonly
          hide-details
          class="mb-2 bg-grey-lighten-4"
        />

        <v-textarea
          v-model="formData.keterangan"
          label="Keterangan Header"
          density="compact"
          variant="outlined"
          rows="2"
          hide-details
          class="mb-2"
          placeholder="Keterangan PO Paper..."
        />
      </div>
    </template>

    <!-- RIGHT COLUMN: DETAIL TABEL SPK KERTAS (GAYA LHK MESIN) -->
    <template #right-column>
      <v-card border flat class="d-flex flex-column fill-height">
        <div class="table-container flex-grow-1">
          <table class="manksi-table">
            <thead>
              <tr>
                <th width="40">No</th>
                <th width="140">No. SPK (F1)</th>
                <th>Nama SPK</th>
                <th width="110">Ukuran</th>
                <th width="110">Bahan</th>
                <th width="110">Finishing</th>
                <th width="80" class="text-end">Jumlah</th>
                <th>Keterangan</th>
                <th width="60" class="text-center">Gambar</th>
                <th width="40" class="text-center"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in formData.details" :key="index">
                <td class="text-center">{{ index + 1 }}</td>

                <!-- INPUT SPK GAYA LHK MESIN (INPUT GROUP WITH SEARCH ICON & CLEAR BUTTON) -->
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      v-model="item.spk"
                      :ref="(el) => (spkRefs[index] = el as any)"
                      class="ci"
                      style="
                        text-transform: uppercase;
                        font-weight: 600;
                        color: #1565c0;
                      "
                      placeholder="F1 / Kode..."
                      :readonly="!!item.nama"
                      autocomplete="off"
                      @keydown="onSpkKeydown($event, index)"
                      @keydown.enter.prevent="
                        ($event.target as HTMLInputElement).blur()
                      "
                      @blur="onSpkBlur(index)"
                      @click="!item.nama && openSpkLookup(index)"
                    />
                    <button
                      v-if="item.spk"
                      type="button"
                      class="ci-btn"
                      title="Reset SPK"
                      @click.stop="clearSpkRow(index)"
                    >
                      <IconX :size="12" class="text-error" />
                    </button>
                    <button
                      v-if="!item.nama"
                      type="button"
                      class="ci-btn"
                      title="Cari SPK (F1)"
                      @mousedown.prevent="openSpkLookup(index)"
                      @click="openSpkLookup(index)"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>

                <!-- Nama SPK -->
                <td>
                  <input
                    v-model="item.nama"
                    class="cell-input"
                    readonly
                    placeholder="Nama SPK..."
                  />
                </td>

                <!-- Ukuran Dropdown -->
                <td>
                  <select
                    v-model="item.ukuran"
                    class="cell-input"
                    :disabled="!item.nama"
                  >
                    <option value="">-</option>
                    <option v-for="u in ukuranOptions" :key="u" :value="u">
                      {{ u }}
                    </option>
                  </select>
                </td>

                <!-- Bahan Dropdown -->
                <td>
                  <select
                    v-model="item.bahan"
                    class="cell-input"
                    :disabled="!item.nama"
                  >
                    <option value="">-</option>
                    <option v-for="b in bahanOptions" :key="b" :value="b">
                      {{ b }}
                    </option>
                  </select>
                </td>

                <!-- Finishing -->
                <td>
                  <input
                    v-model="item.finishing"
                    class="cell-input"
                    :disabled="!item.nama"
                  />
                </td>

                <!-- Jumlah / Qty -->
                <td class="bg-yellow-lighten-5">
                  <input
                    :ref="(el) => (jumlahRefs[index] = el as any)"
                    type="number"
                    v-model.number="item.jumlah"
                    class="cell-input tr fw-bold"
                    :disabled="!item.nama"
                  />
                </td>

                <!-- Keterangan Detail -->
                <td>
                  <input
                    v-model="item.ket"
                    class="cell-input"
                    :disabled="!item.nama"
                  />
                </td>

                <!-- Upload Gambar Custom -->
                <td class="text-center pa-0">
                  <div
                    v-if="item.imageUrl"
                    class="d-flex align-center justify-center ga-1"
                  >
                    <v-btn
                      size="x-small"
                      color="success"
                      variant="tonal"
                      title="Ganti Gambar"
                      @click="
                        (
                          $refs[`fileInput_${index}`] as HTMLInputElement[]
                        )[0].click()
                      "
                    >
                      <IconPhoto :size="14" />
                    </v-btn>
                    <v-btn
                      size="x-small"
                      color="error"
                      variant="text"
                      title="Hapus Gambar"
                      @click="removeRowImage(item)"
                    >
                      <IconX :size="14" />
                    </v-btn>
                  </div>
                  <v-btn
                    v-else-if="item.nama"
                    size="x-small"
                    variant="text"
                    color="grey-darken-1"
                    title="Upload Gambar"
                    @click="
                      (
                        $refs[`fileInput_${index}`] as HTMLInputElement[]
                      )[0].click()
                    "
                  >
                    <IconPlus :size="14" />
                  </v-btn>

                  <input
                    :ref="`fileInput_${index}`"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="handleFileUpload($event, item)"
                  />
                </td>

                <!-- Delete Row Action -->
                <td class="text-center">
                  <v-btn
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="formData.details.splice(index, 1)"
                  >
                    <IconTrash :size="14" :stroke-width="1.7" />
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <v-divider />

        <!-- FOOTER BAR SUMMARY -->
        <div class="pa-2 d-flex bg-grey-lighten-4 align-center">
          <v-btn
            size="x-small"
            color="primary"
            variant="flat"
            @click="formData.details.push(createEmptyRow())"
          >
            <template #prepend>
              <IconPlus :size="14" :stroke-width="2" />
            </template>
            Tambah Baris
          </v-btn>

          <v-spacer />

          <div class="text-caption font-weight-bold mr-4 text-primary">
            Total Qty:
            {{
              formData.details
                .reduce((a, b) => a + (Number(b.jumlah) || 0), 0)
                .toLocaleString("id-ID")
            }}
          </div>
        </div>
      </v-card>
    </template>
  </BaseForm>

  <!-- MODAL LOOKUP SUPPLIER -->
  <SupplierSearchModal
    :isVisible="showSupplierModal"
    :show="showSupplierModal"
    v-model="showSupplierModal"
    @close="
      showSupplierModal = false;
      isLookupOpening = false;
    "
    @select="onSupplierSelected"
    @selected="onSupplierSelected"
    @confirm="onSupplierSelected"
  />

  <!-- MODAL LOOKUP SPK -->
  <SpkSearchModal
    :isVisible="showSpkModal"
    :show="showSpkModal"
    v-model="showSpkModal"
    @close="
      showSpkModal = false;
      isLookupOpening = false;
    "
    @select="onSpkSelected"
    @selected="onSpkSelected"
    @confirm="onSpkSelected"
  />

  <!-- DIALOG CONFIRM PRINT -->
  <v-dialog v-model="showPrintConfirm" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white text-subtitle-1 font-weight-bold pa-3"
      >
        Simpan Berhasil
      </v-card-title>

      <v-card-text class="pa-4 text-center mt-2">
        <IconCircleCheck :size="48" color="green" class="mb-3" />
        <div class="text-body-1 font-weight-medium">
          PO Paperprint No. <strong>{{ savedNomor }}</strong> berhasil disimpan!
        </div>
        <div class="text-caption text-grey mt-1">
          Apakah Anda ingin mencetak transaksi ini sekarang?
        </div>
      </v-card-text>

      <v-card-actions class="bg-grey-lighten-4 pa-3">
        <v-btn color="grey-darken-2" variant="outlined" @click="doNotPrint">
          Tutup
        </v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doPrint">
          <template #prepend>
            <IconPrinter :size="15" :stroke-width="1.7" />
          </template>
          Ya, Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.manksi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.manksi-table th {
  background: #1565c0;
  color: white;
  padding: 6px;
  position: sticky;
  top: 0;
  z-index: 1;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.manksi-table td {
  border: 1px solid #e0e0e0;
  padding: 0;
  height: 28px;
}
.cell-input {
  width: 100%;
  height: 100%;
  border: none;
  padding: 0 6px;
  outline: none;
  background: transparent;
}
.cell-input:focus {
  background: #e3f2fd;
}
.table-container {
  overflow: auto;
  height: 100%;
}
.tr {
  text-align: right;
}
.fw-bold {
  font-weight: bold;
}
.cursor-pointer {
  cursor: pointer;
}
.p0 {
  padding: 0 !important;
}
.cell-grp {
  display: flex;
  align-items: center;
  height: 28px;
  background: white;
}
.cell-grp .ci {
  flex: 1;
  height: 100%;
  border: none;
  outline: none;
  padding: 0 6px;
  font-size: 11px;
}
.ci-btn {
  width: 24px;
  height: 100%;
  border: none;
  background: #e3f2fd;
  border-left: 1px solid #e0e0e0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ci-btn:hover {
  background: #bbdefb;
}
</style>
