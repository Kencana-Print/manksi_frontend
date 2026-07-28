<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import BaseForm from "@/components/BaseForm.vue";
import { poInternalSpkFormService } from "@/services/garmen/poInternalSpkFormService";
import {
  IconTruckDelivery,
  IconSearch,
  IconTrash,
  IconPlus,
  IconPhotoCheck,
  IconPhotoOff,
  IconPrinter,
} from "@tabler/icons-vue";

import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import PabrikSearchModal from "@/components/lookups/PabrikSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import JasaSearchModal from "@/components/lookups/JasaSearchModal.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEdit = computed(() => !!route.params.nomor);
const nomorParam = computed(() =>
  route.params.nomor ? decodeURIComponent(route.params.nomor as string) : "",
);

const showSpkModal = ref(false);
const showGdgAsalModal = ref(false);
const showSupModal = ref(false);
const showBahanModal = ref(false);
const showJasaModal = ref(false);
const activeRowIndex = ref(-1);

const showPrintDialog = ref(false);
const savedNomor = ref("");

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const emptyDetailRow = () => ({
  kode: "",
  nama: "",
  satuan: "",
  size: "",
  jumlah: 0,
  sudahpo: 0,
});

const emptyData = {
  nomor: "",
  tanggal: formatDateLocal(new Date()),
  dateline: formatDateLocal(new Date()),
  nomorSpk: "",
  namaSpk: "",
  bahan: "",
  ukuran: "",
  jumlahSpk: 0,
  adaGambar: false,
  jasa: "",
  namaJasa: "",
  gdgAsal: "",
  gdgAsalNama: "",
  supKode: "",
  supNama: "",
  keterangan: "",
  planning: [] as any[],
  detail: [] as any[],
};

const buildPayload = (data: typeof emptyData) => {
  const selected = data.planning.find((p: any) => p.ambil);
  return {
    nomor: isEdit.value ? data.nomor : "",
    tanggal: data.tanggal,
    dateline: data.dateline,
    nomorSpk: data.nomorSpk,
    jasa: data.jasa,
    gdgAsal: data.gdgAsal,
    supKode: data.supKode,
    keterangan: data.keterangan,
    detail: data.detail
      .filter((d: any) => d.kode) // buang baris kosong trailing
      .map((d: any) => ({
        kode: d.kode,
        size: d.size,
        jumlah: Number(d.jumlah) || 0,
      })),
    selectedPlanning: selected
      ? {
          noPlanning: selected.noPlanning,
          tanggal: selected.tanggal,
          jumlah: selected.jumlah,
        }
      : null,
  };
};

const {
  formData,
  isLoading,
  isSaving,
  canSave,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  fetchData,
  executeSave,
  executeCancel,
  executeClose,
} = useForm({
  menuId: "124",
  initialData: emptyData,
  fetchApi: async () => {
    const res = await poInternalSpkFormService.getById(nomorParam.value);
    const d = res.data.data;
    const h = d.header;
    return {
      nomor: h.poi_nomor,
      tanggal: formatDateLocal(h.poi_tanggal),
      dateline: formatDateLocal(h.poi_dateline),
      nomorSpk: h.poi_spk_nomor,
      namaSpk: h.namaspk,
      bahan: h.bahan,
      ukuran: h.ukuran,
      jumlahSpk: Number(h.jumlah) || 0,
      adaGambar: !!h.adaGambar,
      jasa: h.poi_jasa_kode,
      namaJasa: h.jasa_nama,
      gdgAsal: h.poi_cab,
      gdgAsalNama: h.namacab,
      supKode: h.poi_sup,
      supNama: h.namasup,
      keterangan: h.poi_ket || "",
      planning: (d.planning || []).map((p: any) => ({ ...p })),
      detail: (d.detail || []).map((r: any) => ({ ...r })),
    };
  },
  submitApi: async (data: typeof emptyData) => {
    return await poInternalSpkFormService.save(buildPayload(data));
  },
  onSuccessRoute: "",
  onSuccess: (res: any) => {
    toast.success("PO Internal SPK berhasil disimpan.");
    savedNomor.value = res.data?.data?.nomor || formData.value.nomor;
    showPrintDialog.value = true;
  },
});

onMounted(async () => {
  if (isEdit.value) {
    await fetchData();
  } else {
    try {
      const res = await poInternalSpkFormService.getDefaultGudang();
      const d = res.data.data;
      formData.value.gdgAsal = d.gdgKode;
      formData.value.gdgAsalNama = d.gdgNama;
      formData.value.supKode = d.supKode;
      formData.value.supNama = d.supNama;
    } catch {
      /* silent — default gudang cuma kemudahan, bukan wajib */
    }
  }
});

// Auto trailing row: selalu ada 1 baris kosong di bawah supaya user
// bisa langsung ketik kode + Enter, atau F1 buka modal, tanpa perlu
// klik "Tambah Bahan" dulu. Tombol itu sekarang cuma helper opsional.
watch(
  () => formData.value.detail,
  (rows) => {
    if (!rows || rows.length === 0) {
      rows.push(emptyDetailRow());
      return;
    }
    const last = rows[rows.length - 1];
    if (last.kode) {
      rows.push(emptyDetailRow());
    }
  },
  { deep: true, immediate: true },
);

// ── SPK ──
const loadSpkInfo = async (nomor: string) => {
  const res = await poInternalSpkFormService.checkSpk(nomor);
  const d = res.data.data;
  formData.value.nomorSpk = d.Nomor;
  formData.value.namaSpk = d.Nama;
  formData.value.bahan = d.Bahan;
  formData.value.ukuran = d.Ukuran;
  formData.value.jumlahSpk = Number(d.Jumlah) || 0;
  formData.value.adaGambar = !!d.adaGambar;
  formData.value.planning = [];
  if (formData.value.jasa) {
    try {
      await loadJasaInfo(formData.value.jasa);
    } catch {
      formData.value.planning = [];
    }
  }
};

const onSpkBlur = async () => {
  const nomor = formData.value.nomorSpk?.trim();
  if (!nomor) {
    formData.value.namaSpk = "";
    formData.value.bahan = "";
    formData.value.ukuran = "";
    formData.value.jumlahSpk = 0;
    formData.value.adaGambar = false;
    return;
  }
  try {
    isLoading.value = true;
    await loadSpkInfo(nomor);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Nomor Spk tsb tidak ada.");
    formData.value.nomorSpk = "";
    formData.value.namaSpk = "";
    formData.value.bahan = "";
    formData.value.ukuran = "";
    formData.value.jumlahSpk = 0;
    formData.value.adaGambar = false;
  } finally {
    isLoading.value = false;
  }
};

const onSpkSelected = async (item: any) => {
  const nomor = item.Nomor || item.spk_nomor;
  try {
    isLoading.value = true;
    await loadSpkInfo(nomor);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Nomor Spk tsb tidak ada.");
  } finally {
    isLoading.value = false;
  }
};

// ── Jasa (belum ada modal F1 khusus — validasi via blur) ──
const loadJasaInfo = async (kode: string) => {
  const res = await poInternalSpkFormService.checkJasa(
    kode,
    formData.value.nomorSpk,
  );
  formData.value.namaJasa = res.data.data.namaJasa;
  formData.value.planning = res.data.data.planning;
};

const onJasaBlur = async () => {
  const kode = formData.value.jasa?.trim();
  if (!kode) {
    formData.value.namaJasa = "";
    formData.value.planning = [];
    return;
  }
  try {
    isLoading.value = true;
    await loadJasaInfo(kode);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode Jasa tidak ditemukan.");
    formData.value.jasa = "";
    formData.value.namaJasa = "";
    formData.value.planning = [];
  } finally {
    isLoading.value = false;
  }
};

const onJasaSelected = async (item: any) => {
  const kode = item.Kode || item.jasa_kode;
  try {
    isLoading.value = true;
    formData.value.jasa = kode;
    await loadJasaInfo(kode);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode Jasa tidak ditemukan.");
    formData.value.jasa = "";
    formData.value.namaJasa = "";
    formData.value.planning = [];
  } finally {
    isLoading.value = false;
  }
};

// ── Gudang Asal / Tujuan ──
const onGdgAsalBlur = async () => {
  const kode = formData.value.gdgAsal?.trim();
  if (!kode) {
    formData.value.gdgAsalNama = "";
    return;
  }
  try {
    const res = await poInternalSpkFormService.checkPabrik(
      kode,
      formData.value.supKode,
    );
    formData.value.gdgAsal = res.data.data.kode;
    formData.value.gdgAsalNama = res.data.data.nama;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode Gudang tidak ditemukan.");
    formData.value.gdgAsal = "";
    formData.value.gdgAsalNama = "";
  }
};
const onSupBlur = async () => {
  const kode = formData.value.supKode?.trim();
  if (!kode) {
    formData.value.supNama = "";
    return;
  }
  try {
    const res = await poInternalSpkFormService.checkPabrik(
      kode,
      formData.value.gdgAsal,
    );
    formData.value.supKode = res.data.data.kode;
    formData.value.supNama = res.data.data.nama;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode Gudang tidak ditemukan.");
    formData.value.supKode = "";
    formData.value.supNama = "";
  }
};
const onGdgAsalSelected = (item: any) => {
  formData.value.gdgAsal = item.Kode || item.pab_kode;
  formData.value.gdgAsalNama = item.Nama || item.pab_nama;
  onGdgAsalBlur();
};
const onSupSelected = (item: any) => {
  formData.value.supKode = item.Kode || item.pab_kode;
  formData.value.supNama = item.Nama || item.pab_nama;
  onSupBlur();
};

// ── Detail Bahan ──
const headerLengkapUntukBahan = () => {
  if (!formData.value.nomorSpk) {
    toast.warning("SPK di isi dulu ya!");
    return false;
  }
  if (!formData.value.jasa) {
    toast.warning("Jasa di isi dulu ya!");
    return false;
  }
  if (!formData.value.gdgAsal) {
    toast.warning("Gudang Asal di isi dulu ya!");
    return false;
  }
  if (!formData.value.supKode) {
    toast.warning("Tujuan di isi dulu ya!");
    return false;
  }
  return true;
};

// Resolusi 1 kode bahan jadi baris (atau BEBERAPA baris kalau SPK
// punya breakdown size) — mengganti baris kosong yang sedang diisi
// (idx) dengan hasilnya, replikasi loadkode() Delphi.
const resolveKode = async (kode: string, idx: number) => {
  try {
    isLoading.value = true;
    const res = await poInternalSpkFormService.loadBahan({
      kode,
      nomorSpk: formData.value.nomorSpk,
      jasa: formData.value.jasa,
      gdgAsal: formData.value.gdgAsal,
      poiNomor: formData.value.nomor || "",
      existingRows: formData.value.detail
        .filter((_: any, i: number) => i !== idx)
        .map((d: any) => ({ kode: d.kode, size: d.size })),
    });
    const { rows, skipped } = res.data.data;
    if (rows.length === 0) {
      toast.warning("Kode tsb sudah di input.");
      formData.value.detail[idx].kode = "";
      return;
    }
    formData.value.detail.splice(idx, 1, ...rows);
    if (skipped?.length) {
      toast.warning(
        `${skipped.length} size sudah ada di daftar, dilewati: ${skipped
          .map((s: any) => s.size || "-")
          .join(", ")}`,
      );
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menambah bahan.");
    formData.value.detail[idx].kode = "";
  } finally {
    isLoading.value = false;
  }
};

const onKodeKeydown = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    if (!headerLengkapUntukBahan()) return;
    activeRowIndex.value = idx;
    showBahanModal.value = true;
  }
};

const onKodeEnter = async (idx: number) => {
  const kode = formData.value.detail[idx].kode?.trim();
  if (!kode) return;
  if (!headerLengkapUntukBahan()) return;
  await resolveKode(kode, idx);
};

const openBahanModal = () => {
  if (!headerLengkapUntukBahan()) return;
  activeRowIndex.value = formData.value.detail.length - 1;
  showBahanModal.value = true;
};

const onBahanSelected = async (item: any) => {
  const kode = item.Kode || item.Bhn_kode || item.bhn_kode;
  const idx =
    activeRowIndex.value >= 0
      ? activeRowIndex.value
      : formData.value.detail.length - 1;
  await resolveKode(kode, idx);
};

const removeDetail = (idx: number) => {
  formData.value.detail.splice(idx, 1);
};

// ── Planning — single select ──
const selectPlanning = (idx: number) => {
  formData.value.planning.forEach((p: any, i: number) => {
    p.ambil = i === idx;
  });
};

// ── Validasi & Save ──
const validateSave = () => {
  if (!canSave.value) return toast.error("Hak akses simpan ditolak.");
  if (
    formData.value.dateline &&
    formData.value.tanggal &&
    new Date(formData.value.dateline) < new Date(formData.value.tanggal)
  ) {
    return toast.warning("Dateline salah.");
  }
  if (!formData.value.nomorSpk?.trim())
    return toast.warning("Isi SPK dengan benar.");
  if (!formData.value.gdgAsal?.trim())
    return toast.warning("Gudang Asal belum di isi.");
  if (!formData.value.supKode?.trim())
    return toast.warning("Tujuan belum di isi.");
  if (!formData.value.jasa?.trim()) return toast.warning("Jasa diisi dulu.");
  if (
    formData.value.gdgAsal.trim().toUpperCase() ===
    formData.value.supKode.trim().toUpperCase()
  ) {
    return toast.warning("Asal Gudang dan Tujuan tidak boleh sama.");
  }
  const validDetail = formData.value.detail.filter((d: any) => d.nama);
  if (validDetail.length === 0) return toast.warning("Detail harus diisi.");
  for (const d of validDetail) {
    if (!Number(d.jumlah)) {
      return toast.warning(
        `Jumlah PO untuk ${d.nama} (${d.size || "-"}) harus diisi.`,
      );
    }
  }
  showSaveDialog.value = true;
};

// ── Cetak ──
const closePrintAndExit = () => {
  showPrintDialog.value = false;
  router.push({ name: "PoInternalSpkBrowse" });
};
const doCetak = () => {
  showPrintDialog.value = false;
  window.open(
    `/garmen/po-internal-spk/po-internal/print/${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  router.push({ name: "PoInternalSpkBrowse" });
};

const rp = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);
</script>

<template>
  <BaseForm
    :title="isEdit ? 'Ubah PO Internal SPK' : 'Tambah PO Internal SPK'"
    menu-id="124"
    :icon="IconTruckDelivery"
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
    <div class="poi-layout">
      <div class="poi-header-row">
        <!-- ── Section: Info Dokumen ── -->
        <div class="poi-section poi-col-main">
          <div class="sec-title">PO Internal SPK</div>

          <div class="f-row">
            <label class="f-lbl">Nomor</label>
            <input
              :value="formData.nomor"
              readonly
              class="f-inp f-ro"
              style="width: 180px"
            />
            <span v-if="!isEdit" class="hint-new ml-1">← Kosong = Baru</span>
          </div>

          <div class="f-row">
            <label class="f-lbl">Tanggal</label>
            <input
              type="date"
              v-model="formData.tanggal"
              class="f-date"
              style="width: 150px"
            />
            <label class="f-lbl ml-3" style="width: 90px">Dateline PO</label>
            <input
              type="date"
              v-model="formData.dateline"
              class="f-date"
              style="width: 150px"
            />
          </div>

          <div class="f-row">
            <label class="f-lbl">Nomor SPK</label>
            <div class="inp-grp" style="width: 240px">
              <input
                v-model="formData.nomorSpk"
                class="f-inp"
                style="flex: 1; background: #ddeeff; text-transform: uppercase"
                placeholder="Ketik + Enter / cari"
                @keydown.enter.prevent="
                  ($event.target as HTMLInputElement).blur()
                "
                @blur="onSpkBlur"
              />
              <button
                type="button"
                class="btn-lkp"
                title="Cari SPK"
                @click="showSpkModal = true"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
            <span v-if="formData.nomorSpk" class="gbr-badge ml-2">
              <IconPhotoCheck
                v-if="formData.adaGambar"
                :size="13"
                color="#2e7d32"
              />
              <IconPhotoOff v-else :size="13" color="#9e9e9e" />
              {{ formData.adaGambar ? "Ada Gambar" : "Tanpa Gambar" }}
            </span>
          </div>

          <div class="f-row">
            <label class="f-lbl">Product</label>
            <input
              :value="formData.namaSpk"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Bahan</label>
            <input
              :value="formData.bahan"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Ukuran</label>
            <input
              :value="formData.ukuran"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
            <label class="f-lbl ml-2" style="width: 78px">Jumlah SPK</label>
            <input
              :value="rp(formData.jumlahSpk)"
              readonly
              class="f-inp f-ro text-right"
              style="width: 100px"
            />
          </div>

          <div class="divider" />

          <div class="f-row">
            <label class="f-lbl">Jasa</label>
            <div class="inp-grp" style="flex: 1">
              <input
                v-model="formData.jasa"
                class="f-inp"
                style="
                  width: 60px;
                  flex: none;
                  background: #ddeeff;
                  text-transform: uppercase;
                "
                placeholder="Kode"
                @keydown.enter.prevent="
                  ($event.target as HTMLInputElement).blur()
                "
                @blur="onJasaBlur"
              />
              <input
                :value="formData.namaJasa"
                readonly
                class="f-inp f-ro"
                style="flex: 1"
              />
              <button
                type="button"
                class="btn-lkp"
                title="Cari Jasa"
                @click="showJasaModal = true"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
          </div>

          <div class="f-row">
            <label class="f-lbl">Gudang Asal</label>
            <div class="inp-grp" style="width: 240px">
              <input
                v-model="formData.gdgAsal"
                class="f-inp"
                style="width: 70px; background: #ddeeff"
                @keydown.enter.prevent="
                  ($event.target as HTMLInputElement).blur()
                "
                @blur="onGdgAsalBlur"
              />
              <input
                :value="formData.gdgAsalNama"
                readonly
                class="f-inp f-ro"
                style="flex: 1"
              />
              <button
                type="button"
                class="btn-lkp"
                title="Cari Gudang"
                @click="showGdgAsalModal = true"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
          </div>

          <div class="f-row">
            <label class="f-lbl">Tujuan</label>
            <div class="inp-grp" style="flex: 1; max-width: 320px">
              <input
                v-model="formData.supKode"
                class="f-inp"
                style="width: 70px; background: #ddeeff"
                @keydown.enter.prevent="
                  ($event.target as HTMLInputElement).blur()
                "
                @blur="onSupBlur"
              />
              <input
                :value="formData.supNama"
                readonly
                class="f-inp f-ro"
                style="flex: 1"
              />
              <button
                type="button"
                class="btn-lkp"
                title="Cari Gudang"
                @click="showSupModal = true"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
          </div>

          <div class="f-row align-start">
            <label class="f-lbl" style="padding-top: 4px">Keterangan</label>
            <textarea
              v-model="formData.keterangan"
              class="f-inp"
              style="flex: 1; height: 44px; padding: 4px; resize: none"
            ></textarea>
          </div>

          <div class="note-text">NOTE: ACUAN SAMPEL WAJIB DISERTAKAN</div>
        </div>

        <!-- ── Section: Planning PPIC ── -->
        <div class="poi-section poi-col-side">
          <div class="sec-title">Planning PPIC</div>
          <div class="grid-scroll" style="flex: 1">
            <table class="grid-table">
              <thead>
                <tr>
                  <th style="width: 36px" class="tc">Ambil</th>
                  <th style="width: 110px">No Planning</th>
                  <th style="width: 75px">Tanggal</th>
                  <th style="width: 85px">Line/Status</th>
                  <th style="width: 65px" class="tr">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, idx) in formData.planning" :key="idx">
                  <td class="tc">
                    <input
                      type="radio"
                      name="planningAmbil"
                      :checked="p.ambil"
                      @change="selectPlanning(Number(idx))"
                    />
                  </td>
                  <td>{{ p.noPlanning }}</td>
                  <td>{{ p.tanggal }}</td>
                  <td>{{ p.status || "-" }}</td>
                  <td class="tr">{{ rp(p.jumlah) }}</td>
                </tr>
                <tr v-if="formData.planning.length === 0">
                  <td colspan="5" class="empty-row">
                    Belum ada planning PPIC untuk jasa/SPK ini.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ── Section: Detail Bahan ── -->
      <div class="poi-section">
        <div class="sec-header">
          <span class="sec-title" style="margin: 0">Detail Bahan</span>
          <button type="button" class="btn-add" @click="openBahanModal">
            <IconPlus :size="13" class="mr-1" /> Tambah Bahan
          </button>
        </div>
        <div class="grid-scroll">
          <table class="grid-table">
            <thead>
              <tr>
                <th style="width: 32px">No</th>
                <th style="width: 100px">Kode</th>
                <th>Nama Bahan</th>
                <th style="width: 70px">Satuan</th>
                <th style="width: 70px">Size</th>
                <th style="width: 90px" class="tr bg-yellow">Jumlah</th>
                <th style="width: 90px" class="tr">Sudah PO</th>
                <th style="width: 36px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, idx) in formData.detail" :key="idx">
                <td class="tc">{{ Number(idx) + 1 }}</td>
                <td class="p0">
                  <input
                    type="text"
                    v-model="d.kode"
                    class="gi"
                    :class="{ 'gi-ro': !!d.nama }"
                    :readonly="!!d.nama"
                    placeholder="F1 / ketik kode"
                    style="text-transform: uppercase"
                    @keydown="onKodeKeydown($event, Number(idx))"
                    @keydown.enter.prevent="onKodeEnter(Number(idx))"
                  />
                </td>
                <td>{{ d.nama }}</td>
                <td class="tc">{{ d.satuan }}</td>
                <td class="tc">{{ d.size || "-" }}</td>
                <td class="p0">
                  <input
                    type="number"
                    v-model.number="d.jumlah"
                    class="gi tr"
                    :disabled="!d.nama"
                    v-select-on-focus
                  />
                </td>
                <td class="tr">{{ rp(d.sudahpo) }}</td>
                <td class="tc">
                  <button
                    v-if="d.nama"
                    type="button"
                    class="btn-del"
                    @click="removeDetail(Number(idx))"
                  >
                    <IconTrash :size="13" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </BaseForm>

  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="spk-ppic"
    @selected="onSpkSelected"
  />
  <JasaSearchModal v-model="showJasaModal" @selected="onJasaSelected" />
  <PabrikSearchModal v-model="showGdgAsalModal" @selected="onGdgAsalSelected" />
  <PabrikSearchModal v-model="showSupModal" @selected="onSupSelected" />
  <BahanSearchModal
    v-model="showBahanModal"
    mode="komponen"
    @selected="onBahanSelected"
  />

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3 text-subtitle-1 font-weight-bold"
      >
        Simpan Berhasil
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        PO Internal <b>{{ savedNomor }}</b> telah tersimpan.<br />
        Apakah Anda ingin mencetak dokumen ini sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="closePrintAndExit"
          >Tutup</v-btn
        >
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doCetak">
          <template #prepend
            ><IconPrinter :size="15" :stroke-width="1.7"
          /></template>
          Ya, Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.poi-layout {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  overflow-y: auto;
  height: 100%;
  box-sizing: border-box;
}

.poi-header-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.poi-header-row > .poi-section {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.poi-col-main {
  flex: 1.4;
}
.poi-col-side {
  flex: 1;
}

.poi-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.sec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1565c0;
  margin-bottom: 6px;
}

.f-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  min-height: 26px;
}
.align-start {
  align-items: flex-start;
}
.f-lbl {
  width: 100px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: white;
  font-family: inherit;
  box-sizing: border-box;
  color: #212121;
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
  font-size: 11px;
  outline: none;
  background: white;
  box-sizing: border-box;
}

.inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  background: white;
  flex-shrink: 0;
}
.inp-grp .f-inp {
  border: none;
  height: 24px;
  border-radius: 0;
}
.btn-lkp {
  width: 26px;
  min-width: 26px;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.btn-lkp:hover {
  background: #bbdefb;
}

.divider {
  height: 1px;
  background: #eeeeee;
  margin: 6px 0;
}

.hint-new {
  font-size: 10px;
  color: #d32f2f;
  font-style: italic;
  font-weight: 600;
  white-space: nowrap;
}
.gbr-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  color: #555;
}
.note-text {
  margin-top: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
}

.btn-add {
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
  border-radius: 3px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.btn-add:hover {
  background: #bbdefb;
}

.grid-scroll {
  overflow-x: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.grid-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.grid-table thead th {
  background: #455a64;
  color: white;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  padding: 6px 7px;
  white-space: nowrap;
}
.grid-table th.bg-yellow {
  background: #f9a825;
  color: #4a2e00;
}
.grid-table td {
  border-bottom: 1px solid #eeeeee;
  border-right: 1px solid #f0f0f0;
  padding: 4px 7px;
  vertical-align: middle;
}
.grid-table tbody tr:hover td {
  background: #f5f5f5;
}
.p0 {
  padding: 0 !important;
}
.gi {
  width: 100%;
  height: 26px;
  border: none;
  background: transparent;
  padding: 0 7px;
  outline: none;
  font-size: 11px;
  box-sizing: border-box;
}
.gi:focus {
  background: #fffde7;
  box-shadow: inset 0 0 0 1.5px #f9a825;
}
.gi-ro {
  background: #f5f5f5 !important;
  color: #616161;
}

.btn-del {
  color: #c62828;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.btn-del:hover {
  background: #ffebee;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.text-right {
  text-align: right;
}
.ml-1 {
  margin-left: 4px;
}
.ml-2 {
  margin-left: 8px;
}
.ml-3 {
  margin-left: 12px;
}
.mr-1 {
  margin-right: 4px;
}

.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 14px 8px;
  font-size: 11px;
}
</style>
