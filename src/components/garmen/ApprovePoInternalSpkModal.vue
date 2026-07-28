<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useToast } from "vue-toastification";
import { approvePoInternalSpkFormService } from "@/services/garmen/approvePoInternalSpkFormService";
import { sjPoInternalSpkFormService } from "@/services/garmen/sjPoInternalSpkFormService";
import GudangProduksiSearchModal from "@/components/lookups/GudangProduksiSearchModal.vue";
import {
  IconCircleCheck,
  IconSearch,
  IconDeviceFloppy,
  IconX,
} from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  nomor: string; // Nomor SJ yang sedang di-approve
}>();
const emit = defineEmits(["update:modelValue", "approved"]);

const toast = useToast();

const isLoading = ref(false);
const isSaving = ref(false);
const showSaveConfirm = ref(false);
const showCancelConfirm = ref(false);

const showLiniAsalModal = ref(false);
const showLiniTujuanModal = ref(false);

const komponenSelectRef = ref<HTMLSelectElement | null>(null);
const komponenOptions = ref<string[]>([]);
const kelompokOptions = ref<string[]>([]);

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

const emptyData = () => ({
  nomorSj: "",
  tanggalSj: "",
  // dttanggal Delphi — TANGGAL MUTASI, default HARI INI (bukan
  // tanggal SJ), dipakai buat generate nomor MP baru saat simpan.
  tanggal: formatDateLocal(new Date()),
  keterangan: "",
  nomorSpk: "",
  namaSpk: "",
  bahan: "",
  ukuran: "",
  jumlahSpk: 0,
  noMaterial: "",
  tanggalMinta: "",
  namaKain: "",
  satKain: "",
  kodeKain: "",
  jmlKain: 0,
  gdgAsalKode: "",
  gdgAsalNama: "",
  gdgTujuanKode: "",
  gdgTujuanNama: "",
  jasaNama: "", // internal, dipakai buat fetch opsi Kelompok — gak ditampilkan sebagai field
  liniAsal: "",
  liniAsalNama: "",
  liniTujuan: "",
  liniTujuanNama: "",
  jumlahJasa: 0,
  kelompok: "",
  cmt: false,
  supKode: "",
  supplierKain: "",
  qtyBerat: 0,
  satBerat: "",
  komponen: "",
  babaranStd: 0,
  alasan: "",
  detail: [] as any[],
});

const formData = ref(emptyData());
const prosesSebelumnya = ref<any[]>([]);

// ── Preview babaran (mirror hitung() Delphi) ──
const babaranPreview = computed(() => {
  const j = Number(formData.value.jumlahJasa) || 0;
  const b = Number(formData.value.qtyBerat) || 0;
  if (j === 0 || b === 0) return 0;
  return formData.value.satBerat === "KG" ? j / b : b / j;
});
const selisihBabaranPreview = computed(() => {
  const std = Number(formData.value.babaranStd) || 0;
  const bbr = babaranPreview.value;
  if (std === 0 || bbr === 0) return 0;
  return bbr - std;
});

const loadKomponenOptions = async () => {
  try {
    const res = await sjPoInternalSpkFormService.getKomponenOptions(
      formData.value.nomorSpk,
    );
    komponenOptions.value = res.data.data || [];
  } catch {
    komponenOptions.value = [];
  }
};
const loadKelompokOptions = async () => {
  try {
    const res = await sjPoInternalSpkFormService.getKelompokOptions(
      formData.value.jasaNama,
      formData.value.gdgAsalKode,
    );
    kelompokOptions.value = res.data.data || [];
  } catch {
    kelompokOptions.value = [];
  }
};

const loadData = async () => {
  isLoading.value = true;
  try {
    const res = await approvePoInternalSpkFormService.getById(props.nomor);
    const d = res.data.data;
    const h = d.header;

    formData.value = {
      ...emptyData(),
      nomorSj: h.NomorSJ,
      tanggalSj: formatDateLocal(h.Tanggal),
      keterangan: h.Keterangan || "",
      nomorSpk: h.NomorSPK,
      namaSpk: h.NamaSPK,
      bahan: h.Bahan,
      ukuran: h.Ukuran,
      jumlahSpk: Number(h.Jumlah) || 0,
      noMaterial: h.NoMaterial || "",
      tanggalMinta: formatDateLocal(h.TanggalMinta),
      namaKain: h.NamaKain || "",
      satKain: h.SatKain || "",
      kodeKain: h.KodeKain || "",
      jmlKain: Number(h.JmlKain) || 0,
      gdgAsalKode: h.GudangAsalKode,
      gdgAsalNama: h.GudangAsalNama,
      gdgTujuanKode: h.GudangTujuanKode,
      gdgTujuanNama: h.GudangTujuanNama,
      jasaNama: h.JasaNama,
      liniAsal: h.LiniAsal,
      liniAsalNama: h.LiniAsalNama || "",
      liniTujuan: h.LiniTujuan,
      liniTujuanNama: h.LiniTujuanNama || "",
      jumlahJasa: Number(h.JumlahJasa) || 0,
      kelompok: h.Kelompok || "",
      cmt: !!h.Cmt,
      supKode: h.SupKode || "",
      supplierKain: h.SupplierKain || "",
      qtyBerat: Number(h.QtyBerat) || 0,
      satBerat: h.SatBerat || "",
      komponen: h.Komponen || "",
      babaranStd: Number(h.BabaranStd) || 0,
      alasan: h.Alasan || "",
      detail: (d.detail || []).map((r: any) => ({ ...r })),
    };
    prosesSebelumnya.value = d.prosesSebelumnya || [];

    await Promise.all([loadKomponenOptions(), loadKelompokOptions()]);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data approval.");
    emit("update:modelValue", false);
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen && props.nomor) loadData();
  },
);

// ── Lini Asal / Lini Tujuan ──
const onLiniAsalBlur = async () => {
  const kode = formData.value.liniAsal?.trim();
  if (!kode) {
    formData.value.liniAsalNama = "";
    return;
  }
  try {
    const res = await sjPoInternalSpkFormService.checkGudangProduksi(
      kode,
      formData.value.gdgAsalKode,
    );
    formData.value.liniAsal = res.data.data.kode;
    formData.value.liniAsalNama = res.data.data.nama;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode Lini tidak ditemukan.");
    formData.value.liniAsal = "";
    formData.value.liniAsalNama = "";
  }
};
const onLiniTujuanBlur = async () => {
  const kode = formData.value.liniTujuan?.trim();
  if (!kode) {
    formData.value.liniTujuanNama = "";
    return;
  }
  try {
    const res = await sjPoInternalSpkFormService.checkGudangProduksi(
      kode,
      formData.value.gdgAsalKode,
    );
    formData.value.liniTujuan = res.data.data.kode;
    formData.value.liniTujuanNama = res.data.data.nama;
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode Lini tidak ditemukan.");
    formData.value.liniTujuan = "";
    formData.value.liniTujuanNama = "";
  }
};
const onLiniAsalSelected = (item: any) => {
  formData.value.liniAsal = item.Kode || item.gdgp_kode;
  formData.value.liniAsalNama = item.Nama || item.gdgp_nama;
};
const onLiniTujuanSelected = (item: any) => {
  formData.value.liniTujuan = item.Kode || item.gdgp_kode;
  formData.value.liniTujuanNama = item.Nama || item.gdgp_nama;
};

// ── Komponen & Berat Kain (guard sama pola SJ form) ──
const onKomponenChange = async () => {
  if (!formData.value.komponen) {
    formData.value.babaranStd = 0;
    return;
  }
  try {
    const res = await sjPoInternalSpkFormService.getBabaranStandar(
      formData.value.nomorSpk,
      formData.value.komponen,
    );
    formData.value.babaranStd = res.data.data || 0;
  } catch {
    formData.value.babaranStd = 0;
  }
};
const onBeratBlur = async () => {
  if (!formData.value.komponen) {
    formData.value.qtyBerat = 0;
    toast.warning("Komponen dipilih dulu ya!");
    await nextTick();
    komponenSelectRef.value?.focus();
    return;
  }
  if (
    formData.value.qtyBerat === null ||
    formData.value.qtyBerat === undefined
  ) {
    formData.value.qtyBerat = 0;
  }
};

// ── Grid Komponen (Kurang dihitung live di template, gak disimpan) ──
const kurangRow = (row: any) =>
  (Number(row.jumlah) || 0) - (Number(row.sudah) || 0);

// ── Save ──
const onF10 = () => {
  showSaveConfirm.value = true;
};

const executeSave = async () => {
  isSaving.value = true;
  try {
    const payload = {
      tanggal: formData.value.tanggal,
      keterangan: formData.value.keterangan,
      nomorSpk: formData.value.nomorSpk,
      cab: formData.value.gdgAsalKode, // poisj_cab SJ asli
      jumlahJasa: formData.value.jumlahJasa,
      liniAsal: formData.value.liniAsal,
      liniTujuan: formData.value.liniTujuan,
      kelompok: formData.value.kelompok,
      supplierKain: formData.value.supplierKain,
      noMaterial: formData.value.noMaterial,
      kodeKain: formData.value.kodeKain,
      supKode: formData.value.supKode,
      qtyBerat: formData.value.qtyBerat,
      satBerat: formData.value.satBerat,
      komponen: formData.value.komponen,
      alasan: formData.value.alasan,
      cmt: formData.value.cmt,
      detail: formData.value.detail
        .filter((d: any) => d.kode)
        .map((d: any) => ({
          kode: d.kode,
          nama: d.nama,
          satuan: d.satuan,
          size: d.size,
          jumlah: Number(d.jumlah) || 0,
          sudah: Number(d.sudah) || 0,
          bsLini: Number(d.bsLini) || 0,
          bsSablon: Number(d.bsSablon) || 0,
          bsKain: Number(d.bsKain) || 0,
        })),
    };

    const res = await approvePoInternalSpkFormService.save(
      props.nomor,
      payload,
    );
    toast.success(res.data.message);
    emit("approved");
    emit("update:modelValue", false);

    // ✅ Replikasi persis: doslippo(edtNomor.Text) dipanggil OTOMATIS
    // setelah simpan sukses (bukan tombol), cuma kalau beneran ada MP
    // baru (mpNomor terisi — CMT dicentang berarti gak ada yang
    // dicetak). Reuse print route Mutasi Produksi yang SUDAH ADA,
    // karena MP hasil approve ini nyimpen ke tabel yang sama persis
    // (tmutasiproduksi_hdr/_dtl) — gak perlu print view baru.
    const mpNomor = res.data?.data?.mpNomor;
    if (mpNomor) {
      window.open(
        `/garmen/mutasi-produksi/print?nomor=${encodeURIComponent(mpNomor)}`,
        "_blank",
      );
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal Simpan");
  } finally {
    isSaving.value = false;
    showSaveConfirm.value = false;
  }
};

// ── Batal (F7) ──
const onCancel = () => {
  showCancelConfirm.value = true;
};
const executeCancel = () => {
  showCancelConfirm.value = false;
  emit("update:modelValue", false);
};

const rp = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="1180px"
    persistent
    scrollable
  >
    <div class="apv-card">
      <div class="apv-header">
        <IconCircleCheck :size="16" :stroke-width="1.7" color="white" />
        <span>Approval Surat Jalan PO Internal</span>
        <v-spacer />
        <button class="apv-close" @click="onCancel">✕</button>
      </div>

      <div v-if="isLoading" class="apv-loading">
        <v-progress-circular indeterminate color="primary" size="28" />
        <span>Memuat data...</span>
      </div>

      <div v-else class="apv-body">
        <div class="apv-header-row">
          <!-- ── KOLOM KIRI: Dokumen + SPK + Material ── -->
          <div class="apv-section">
            <div class="f-row">
              <label class="f-lbl">Nomor</label>
              <input
                value=""
                readonly
                class="f-inp f-ro"
                style="width: 170px"
                placeholder="Terisi otomatis setelah simpan"
              />
            </div>
            <div class="f-row">
              <label class="f-lbl">Tanggal</label>
              <input
                type="date"
                v-model="formData.tanggal"
                class="f-date"
                style="width: 150px"
              />
            </div>
            <div class="f-row">
              <label class="f-lbl">Nomor SJ PO</label>
              <input
                :value="formData.nomorSj"
                readonly
                class="f-inp f-ro"
                style="width: 170px"
              />
              <input
                :value="formData.tanggalSj"
                readonly
                class="f-inp f-ro ml-1"
                style="width: 100px"
              />
            </div>
            <div class="f-row">
              <label class="f-lbl">Keterangan</label>
              <input
                v-model="formData.keterangan"
                class="f-inp"
                style="flex: 1"
              />
            </div>
            <div class="f-row">
              <label class="f-lbl">Nomor SPK</label>
              <input
                :value="formData.nomorSpk"
                readonly
                class="f-inp f-ro"
                style="flex: 1"
              />
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
              <label class="f-lbl">Ukuran/Jml</label>
              <input
                :value="formData.ukuran"
                readonly
                class="f-inp f-ro"
                style="flex: 1"
              />
              <input
                :value="rp(formData.jumlahSpk)"
                readonly
                class="f-inp f-ro text-right"
                style="width: 80px"
              />
            </div>

            <div class="divider" />

            <div class="f-row">
              <label class="f-lbl">No.Realisasi Minta</label>
              <input
                :value="formData.noMaterial"
                readonly
                class="f-inp f-ro"
                style="flex: 1"
              />
              <input
                :value="formData.tanggalMinta"
                readonly
                class="f-inp f-ro ml-1"
                style="width: 100px"
              />
            </div>
            <div class="f-row">
              <label class="f-lbl">Jenis Kain</label>
              <input
                :value="formData.namaKain"
                readonly
                class="f-inp f-ro"
                style="flex: 1"
              />
            </div>
            <div class="f-row">
              <label class="f-lbl">Jumlah Kain</label>
              <input
                :value="rp(formData.jmlKain)"
                readonly
                class="f-inp f-ro text-right"
                style="width: 90px"
              />
            </div>
          </div>

          <!-- ── KOLOM KANAN: Lini, Jumlah, Kelompok, Babaran ── -->
          <div class="apv-section">
            <div class="f-row">
              <label class="f-lbl">Lini Asal</label>
              <div class="inp-grp" style="flex: 1">
                <input
                  v-model="formData.liniAsal"
                  class="f-inp"
                  style="width: 65px; background: #ddeeff"
                  @keydown.enter.prevent="
                    ($event.target as HTMLInputElement).blur()
                  "
                  @blur="onLiniAsalBlur"
                />
                <input
                  :value="formData.liniAsalNama"
                  readonly
                  class="f-inp f-ro"
                  style="flex: 1"
                />
                <button
                  type="button"
                  class="btn-lkp"
                  title="Cari Lini Asal"
                  @click="showLiniAsalModal = true"
                >
                  <IconSearch :size="13" color="#1565c0" />
                </button>
              </div>
              <span class="ref-tag">{{ formData.gdgAsalKode }}</span>
            </div>
            <div class="f-row">
              <label class="f-lbl">Lini Tujuan</label>
              <div class="inp-grp" style="flex: 1">
                <input
                  v-model="formData.liniTujuan"
                  class="f-inp"
                  style="width: 65px; background: #ddeeff"
                  @keydown.enter.prevent="
                    ($event.target as HTMLInputElement).blur()
                  "
                  @blur="onLiniTujuanBlur"
                />
                <input
                  :value="formData.liniTujuanNama"
                  readonly
                  class="f-inp f-ro"
                  style="flex: 1"
                />
                <button
                  type="button"
                  class="btn-lkp"
                  title="Cari Lini Tujuan"
                  @click="showLiniTujuanModal = true"
                >
                  <IconSearch :size="13" color="#1565c0" />
                </button>
              </div>
              <span class="ref-tag">{{ formData.gdgTujuanKode }}</span>
            </div>

            <div class="f-row">
              <label class="f-lbl">Jumlah</label>
              <input
                type="number"
                v-model.number="formData.jumlahJasa"
                class="f-inp"
                style="width: 100px; background: #fff9c4"
                v-select-on-focus
              />
            </div>

            <div class="f-row">
              <label class="f-lbl">Kelompok</label>
              <input
                v-model="formData.kelompok"
                list="apv-kelompok-options"
                class="f-inp"
                style="flex: 1; background: #ddeeff"
              />
              <datalist id="apv-kelompok-options">
                <option v-for="k in kelompokOptions" :key="k" :value="k" />
              </datalist>
              <label class="chk-lbl ml-2">
                <input type="checkbox" v-model="formData.cmt" /> CMT
              </label>
            </div>

            <div class="divider" />

            <div class="babaran-box">
              <div class="f-row">
                <label class="f-lbl">Komponen</label>
                <select
                  ref="komponenSelectRef"
                  v-model="formData.komponen"
                  class="f-inp"
                  style="flex: 1"
                  @change="onKomponenChange"
                >
                  <option value="">Pilih...</option>
                  <option v-for="k in komponenOptions" :key="k" :value="k">
                    {{ k }}
                  </option>
                </select>
                <label class="f-lbl ml-2" style="width: 70px">Berat Kain</label>
                <input
                  type="number"
                  v-model.number="formData.qtyBerat"
                  class="f-inp text-right"
                  style="width: 90px"
                  v-select-on-focus
                  @blur="onBeratBlur"
                />
              </div>
              <div class="f-row">
                <label class="f-lbl">Babaran STD</label>
                <input
                  :value="rp(formData.babaranStd)"
                  readonly
                  class="f-inp f-ro text-right"
                  style="width: 90px"
                />
                <label class="f-lbl ml-2" style="width: 70px">Babaran</label>
                <input
                  :value="babaranPreview.toFixed(2)"
                  readonly
                  class="f-inp f-ro text-right"
                  style="width: 90px"
                />
                <label class="f-lbl ml-2" style="width: 55px">Selisih</label>
                <input
                  :value="selisihBabaranPreview.toFixed(2)"
                  readonly
                  class="f-inp f-ro text-right"
                  :style="{
                    width: '90px',
                    color: selisihBabaranPreview < 0 ? '#c62828' : '#2e7d32',
                    fontWeight: 700,
                  }"
                />
              </div>
              <div class="f-row">
                <label class="f-lbl">Alasan</label>
                <input
                  v-model="formData.alasan"
                  class="f-inp"
                  style="flex: 1"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- ── Grid ganda: Komponen + Proses Sebelumnya ── -->
        <div class="apv-grid-row">
          <div class="apv-section apv-grid-komponen">
            <div class="sec-title">Komponen Yang Disertakan</div>
            <div class="grid-scroll">
              <table class="grid-table">
                <thead>
                  <tr>
                    <th style="width: 26px">No</th>
                    <th style="width: 90px">Kode</th>
                    <th>Nama</th>
                    <th style="width: 55px">Satuan</th>
                    <th style="width: 70px" class="tr bg-yellow">Jumlah</th>
                    <th style="width: 60px" class="tr">Sudah</th>
                    <th style="width: 60px" class="tr">Kurang</th>
                    <th style="width: 60px" class="tr bg-yellow">BS Lini</th>
                    <th style="width: 75px" class="tr bg-yellow">
                      BS Kain Sablon
                    </th>
                    <th style="width: 60px" class="tr bg-yellow">BS Kain</th>
                    <th style="width: 55px">Size</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(d, idx) in formData.detail" :key="idx">
                    <td class="tc">{{ idx + 1 }}</td>
                    <td class="font-weight-bold text-blue-darken-2">
                      {{ d.kode }}
                    </td>
                    <td>
                      {{ d.nama }}
                      <span v-if="d.new" class="badge-new">BARU</span>
                    </td>
                    <td class="tc">{{ d.satuan }}</td>
                    <td class="p0">
                      <input
                        type="number"
                        v-model.number="d.jumlah"
                        class="gi tr"
                        v-select-on-focus
                      />
                    </td>
                    <td class="tr">{{ rp(d.sudah) }}</td>
                    <td
                      class="tr"
                      :style="{
                        color: kurangRow(d) < 0 ? '#c62828' : '',
                        fontWeight: 600,
                      }"
                    >
                      {{ rp(kurangRow(d)) }}
                    </td>
                    <td class="p0">
                      <input
                        type="number"
                        v-model.number="d.bsLini"
                        class="gi tr"
                        v-select-on-focus
                      />
                    </td>
                    <td class="p0">
                      <input
                        type="number"
                        v-model.number="d.bsSablon"
                        class="gi tr"
                        v-select-on-focus
                      />
                    </td>
                    <td class="p0">
                      <input
                        type="number"
                        v-model.number="d.bsKain"
                        class="gi tr"
                        v-select-on-focus
                      />
                    </td>
                    <td class="tc">{{ d.size || "-" }}</td>
                  </tr>
                  <tr v-if="formData.detail.length === 0">
                    <td colspan="11" class="empty-row">
                      Tidak ada komponen pada SJ ini.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="apv-section apv-grid-proses">
            <div class="sec-title">Proses Sebelumnya</div>
            <div class="grid-scroll">
              <table class="grid-table">
                <thead>
                  <tr>
                    <th style="width: 26px">No</th>
                    <th>Nama</th>
                    <th style="width: 60px" class="tr">Mitra</th>
                    <th style="width: 60px" class="tr">Internal</th>
                    <th style="width: 60px" class="tr">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, idx) in prosesSebelumnya" :key="idx">
                    <td class="tc">{{ idx + 1 }}</td>
                    <td>{{ p.nama }}</td>
                    <td class="tr">{{ rp(p.mitra) }}</td>
                    <td class="tr">{{ rp(p.internal) }}</td>
                    <td class="tr font-weight-bold">{{ rp(p.total) }}</td>
                  </tr>
                  <tr v-if="prosesSebelumnya.length === 0">
                    <td colspan="5" class="empty-row">
                      Belum ada proses sebelumnya.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="apv-footer">
        <span class="footer-hint">F7: Batal &nbsp;·&nbsp; F10: Simpan</span>
        <v-spacer />
        <v-btn size="small" variant="text" color="error" @click="onCancel">
          <template #prepend><IconX :size="14" /></template>Batal
        </v-btn>
        <v-btn
          size="small"
          color="primary"
          class="ml-2"
          :loading="isSaving"
          :disabled="isLoading"
          @click="onF10"
        >
          <template #prepend><IconDeviceFloppy :size="14" /></template>Simpan
        </v-btn>
      </div>
    </div>
  </v-dialog>

  <GudangProduksiSearchModal
    v-model="showLiniAsalModal"
    :cabang="formData.gdgAsalKode"
    @selected="onLiniAsalSelected"
  />
  <GudangProduksiSearchModal
    v-model="showLiniTujuanModal"
    :cabang="formData.gdgAsalKode"
    @selected="onLiniTujuanSelected"
  />

  <v-dialog v-model="showSaveConfirm" max-width="360px">
    <v-card class="rounded-lg">
      <v-card-text class="pa-4 text-center">Yakin ingin simpan?</v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showSaveConfirm = false">Batal</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="executeSave"
          >Ya, Simpan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showCancelConfirm" max-width="360px">
    <v-card class="rounded-lg">
      <v-card-text class="pa-4 text-center">Akan dibatalkan?</v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showCancelConfirm = false">Tidak</v-btn>
        <v-spacer />
        <v-btn color="error" variant="elevated" @click="executeCancel"
          >Ya, Batalkan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.apv-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  max-height: 92vh;
}
.apv-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  gap: 6px;
}
.apv-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
}
.apv-close:hover {
  color: white;
}
.apv-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 16px;
  color: #757575;
}
.apv-body {
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.apv-header-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.apv-header-row > .apv-section {
  flex: 1;
  min-width: 0;
}

.apv-section {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
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
.f-lbl {
  width: 100px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}
.chk-lbl {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #333;
}

.f-inp,
select.f-inp {
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
.text-right {
  text-align: right;
}

.inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  background: white;
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
.ref-tag {
  font-size: 10px;
  color: #9e9e9e;
  font-style: italic;
  white-space: nowrap;
}

.divider {
  height: 1px;
  background: #eeeeee;
  margin: 6px 0;
}

.babaran-box {
  border: 1px dashed #cfd8dc;
  border-radius: 4px;
  padding: 6px 8px 0;
}

.apv-grid-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.apv-grid-komponen {
  flex: 1.5;
  min-width: 0;
}
.apv-grid-proses {
  flex: 1;
  min-width: 0;
}

.grid-scroll {
  overflow-x: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  max-height: 260px;
  overflow-y: auto;
}
.grid-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.grid-table thead th {
  position: sticky;
  top: 0;
  background: #455a64;
  color: white;
  font-weight: 700;
  font-size: 9.5px;
  text-transform: uppercase;
  padding: 6px 7px;
  white-space: nowrap;
  z-index: 1;
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
  white-space: nowrap;
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

.badge-new {
  font-size: 8.5px;
  font-weight: 700;
  color: #2e7d32;
  background: #e8f5e9;
  border-radius: 3px;
  padding: 1px 4px;
  margin-left: 4px;
}

.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 14px 8px;
  font-size: 11px;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.ml-1 {
  margin-left: 4px;
}
.ml-2 {
  margin-left: 8px;
}

.apv-footer {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.footer-hint {
  font-size: 10.5px;
  color: #9e9e9e;
  font-style: italic;
}
</style>
