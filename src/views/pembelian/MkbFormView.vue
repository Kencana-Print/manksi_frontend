<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import { mkbFormService } from "@/services/pembelian/mkbFormService";
import api from "@/services/api";
import BaseForm from "@/components/BaseForm.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import PoLinkSearchModal from "@/components/lookups/PoLinkSearchModal.vue";
import {
  IconNotes,
  IconSearch,
  IconTrash,
  IconPlus,
  IconLock,
} from "@tabler/icons-vue";

interface DtlLinkItem {
  no: number;
  nomor: string;
  tanggal: string;
  kode: string;
  qtylink: number;
  link: number;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEdit = computed(() => !!route.params.nomor);
const nomorParam = computed(() =>
  route.params.nomor ? decodeURIComponent(route.params.nomor as string) : "",
);

const showSpkModal = ref(false);
const showBahanModal = ref(false);
const activeBahanRowIndex = ref<number>(-1);

const showPrintDialog = ref(false);
const savedNomor = ref("");

const showPoModal = ref(false);
const selectedRowIdx = ref(-1);

// State untuk dropdown komponen
const listKomponen = ref<string[]>([]);

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";

  // YYYY-MM-DD langsung return
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

const emptyData = {
  nomor: "",
  tanggal: formatDateLocal(new Date()),
  keterangan: "",
  nomorSpk: "",
  spkLama: "",
  namaSpk: "",
  jenisOrder: "",
  jumlahSpk: 0,
  memoSpk: "",
  dtlBahan: [] as any[],
  dtlLink: [] as DtlLinkItem[],
  dtlPlan: [] as any[],
  dtlMap: [] as any[],
  pin_status: "",
};

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
} = useForm({
  menuId: "51",
  initialData: emptyData,
  fetchApi: async () => {
    const res = await mkbFormService.getDetail(nomorParam.value);
    const d = res.data.data;
    const h = d.header;

    // HELPER 1: Mengatasi huruf besar/kecil dari MySQL
    const val = (obj: any, key: string) => obj[key] ?? obj[key.toUpperCase()];

    // HELPER 2: Parsing tanggal aman
    const parseDateSafe = (v: any) => {
      if (!v || v === "0000-00-00" || v === "0000-00-00 00:00:00") return "";

      return formatDateLocal(v);
    };

    return {
      nomor: val(h, "mkb_nomor"),
      tanggal:
        parseDateSafe(val(h, "mkb_tanggal")) || formatDateLocal(new Date()),
      keterangan: val(h, "mkb_note") || "",
      nomorSpk: val(h, "mkb_spk_nomor") || "",
      spkLama: val(h, "mkb_spk_nomor") || "",
      namaSpk: val(h, "namaspk") || "",
      jenisOrder: val(h, "jenisorder") || "",
      jumlahSpk: Number(val(h, "jumlahspk")) || 0,
      memoSpk: val(h, "spk_memo") || "",
      pin_status: h.pin_status,

      dtlBahan: (d.dtlBahan || []).map((b: any) => {
        // Ambil nilai Jumlah dan Ready
        const jumlahVal = Number(val(b, "mkbd_jumlah")) || 0;
        const readyVal = Number(val(b, "mkbd_jumlah_rs")) || 0;

        // KALKULASI ULANG PAKSA: Jika Butuh > Ready, maka sisa kekurangannya di-PO-kan
        const calcPo =
          jumlahVal > readyVal ? Number((jumlahVal - readyVal).toFixed(2)) : 0;

        return {
          no: val(b, "mkbd_nourut"),
          komponen: val(b, "mkbd_komponen"),
          ketk: val(b, "mkbd_ketk"),
          babaran: Number(val(b, "mkbd_babaran")) || 0,
          warna: val(b, "mkbd_warna"),
          jenis: val(b, "mkbd_jenis"),
          kode: val(b, "mkbd_bhn_kode"),
          namaBahan: val(b, "bhn_name"),
          satuan: val(b, "mkbd_bhn_satuan"),
          gramasi: val(b, "gramasi"),
          jumlah: jumlahVal,
          ready: readyVal,
          po: calcPo, // <--- HASIL KALKULASI DIMASUKKAN KE SINI
          tglbeli: parseDateSafe(val(b, "mkbd_tglbeli")),
          keterangan: val(b, "mkbd_keterangan") || "",
        };
      }),

      dtlLink: (d.dtlLink || []).map((l: any) => ({
        no: val(l, "mkbd2_nourut"),
        nomor: val(l, "mkbd2_po_nomor"),
        tanggal: val(l, "tgl"),
        kode: val(l, "mkbd_bhn_kode"),
        qtylink: Number(val(l, "mkbd2_qty")) || 0,
        link: val(l, "mkbd2_pourut"),
      })),

      dtlPlan: (d.dtlPlan || []).map((p: any) => ({
        tanggal: parseDateSafe(val(p, "plan_tanggal")),
        jumlah: Number(val(p, "plan_datang")) || 0,
      })),

      dtlMap: (d.dtlMap || []).map((m: any) => ({
        komponen: val(m, "ks_komponen"),
        size: val(m, "ks_size"),
        babaran: Number(val(m, "ks_babaran")) || 0,
      })),
    };
  },
  submitApi: async (payload) => mkbFormService.saveData(payload),
  onSuccessRoute: "", // KOSONGKAN agar tidak auto-back
  onSuccess: (res: any) => {
    toast.success("MKB berhasil disimpan.");
    // Tangkap nomor yang baru di-save (atau nomor lama jika mode edit)
    savedNomor.value = res.data?.data?.nomor || formData.value.nomor;
    showPrintDialog.value = true;
  },
});

const isMapMode = computed(() =>
  String(formData.value.nomorSpk || "").startsWith("MAP"),
);
const isTutupBuku = computed(() =>
  ["WAIT", "TOLAK"].includes(formData.value.pin_status),
);

// Fetch master list komponen dari backend
const fetchKomponen = async () => {
  try {
    const res = await api.get("/lookups/komponen");
    listKomponen.value = res.data.data;
  } catch (error) {
    console.error("Gagal memuat list komponen", error);
  }
};

onMounted(() => {
  fetchKomponen();
});

const recalcRowBahan = (row: any) => {
  if (!row.kode) return;
  const babaran = Number(row.babaran) || 0;
  const qtySpk = Number(formData.value.jumlahSpk) || 0;
  if (babaran !== 0 && qtySpk !== 0) {
    if (row.satuan === "KG") row.jumlah = Number((qtySpk / babaran).toFixed(2));
    else if (row.satuan === "MTR" || row.satuan === "YARD")
      row.jumlah = Number((qtySpk * babaran).toFixed(2));
  }
  const butuh = Number(row.jumlah) || 0;
  const ready = Number(row.ready) || 0;
  row.po = butuh > ready ? Number((butuh - ready).toFixed(2)) : 0;
};

const openSpkModal = () => {
  if (isTutupBuku.value && isEdit.value) return;
  showSpkModal.value = true;
};

const onSpkSelected = async (spk: any) => {
  try {
    isLoading.value = true;
    const res = await mkbFormService.checkSpk(spk.Nomor, formData.value.nomor);
    const { info, planning } = res.data.data;

    // Set data produk
    formData.value.nomorSpk = info.Nomor;
    formData.value.namaSpk = info.Nama;
    formData.value.jumlahSpk = info.Jumlah;
    formData.value.jenisOrder = info.JenisOrder;
    formData.value.memoSpk = info.Memo;

    // Rekalkulasi rincian bahan (Babaran)
    formData.value.dtlBahan.forEach(recalcRowBahan);

    // Isi Planning (Kecuali MAP)
    if (!isMapMode.value) {
      formData.value.dtlPlan = planning.map((p: any) => ({
        tanggal: formatDateLocal(p.plan_tanggal),
        jumlah: p.plan_datang,
      }));
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memvalidasi SPK");
    formData.value.nomorSpk = ""; // Reset jika error
  } finally {
    isLoading.value = false;
  }
};

const addRowBahan = () => {
  formData.value.dtlBahan.push({
    komponen: "",
    ketk: "",
    babaran: 0,
    warna: "",
    jenis: "",
    kode: "",
    namaBahan: "",
    satuan: "",
    gramasi: "",
    jumlah: 0,
    ready: 0,
    po: 0,
    tglbeli: "",
    keterangan: "",
  });
};

const openBahanModal = (index: number) => {
  activeBahanRowIndex.value = index;
  showBahanModal.value = true;
};

const onBahanSelected = (bahan: any) => {
  const idx = activeBahanRowIndex.value;
  if (idx > -1 && formData.value.dtlBahan[idx]) {
    const row = formData.value.dtlBahan[idx];
    row.kode = bahan.Kode || bahan.Bhn_kode;
    row.namaBahan = bahan.Nama || bahan.bhn_name;
    row.satuan = bahan.Satuan || bahan.Bhn_satuan;

    // Auto-fill Gramasi dan Stok (Ready) yang disesuaikan
    row.gramasi = bahan.Gramasi || bahan.gramasi || "";
    row.ready = Number(bahan.Stok || 0);

    recalcRowBahan(row);
  }
};

const removeRowBahan = (index: number) =>
  formData.value.dtlBahan.splice(index, 1);
const addRowPlan = () =>
  formData.value.dtlPlan.push({ tanggal: "", jumlah: 0 });
const removeRowPlan = (index: number) =>
  formData.value.dtlPlan.splice(index, 1);

const validateSave = () => {
  if (!canSave.value) return toast.error("Hak akses simpan ditolak.");
  if (isTutupBuku.value)
    return toast.error(
      "Transaksi tsb sudah diclose.\nSilahkan minta approve (PIN) untuk menyimpan.",
    );
  if (!formData.value.nomorSpk?.trim())
    return toast.warning("Nomor SPK wajib diisi.");
  if (formData.value.dtlBahan.length === 0)
    return toast.warning("Tidak ada detail barang, tidak dapat di simpan.");
  for (let i = 0; i < formData.value.dtlBahan.length; i++) {
    const row = formData.value.dtlBahan[i];
    if (row.komponen && (Number(row.babaran) || 0) === 0)
      return toast.warning(`Babaran pada baris ke-${i + 1} harus diisi.`);
  }
  if (!isMapMode.value) {
    const totalPlan = formData.value.dtlPlan.reduce(
      (acc: number, cur: any) => acc + (Number(cur.jumlah) || 0),
      0,
    );
    if (totalPlan === 0)
      return toast.warning("Qty Kedatangan (Planning) bahan harus diisi.");
  }
  showSaveDialog.value = true;
};

// Fungsi untuk Cetak atau Tutup
const closePrintAndExit = () => {
  showPrintDialog.value = false;
  router.back();
};

const doCetak = () => {
  showPrintDialog.value = false;
  // Buka tab baru dengan query parameter
  window.open(
    `/pembelian/mkb/print?nomor=${encodeURIComponent(savedNomor.value)}`,
    "_blank",
  );
  router.back();
};

// --- LOGIKA LINK PO ---
const openPoLinkModal = () => {
  // Cari baris yang sedang di-fokus atau baris pertama yang ada kodenya
  if (selectedRowIdx.value === -1) {
    return toast.warning("Pilih baris rincian bahan terlebih dahulu.");
  }

  const row = formData.value.dtlBahan[selectedRowIdx.value];
  if (!row.kode)
    return toast.warning("Baris rincian belum memiliki kode bahan.");
  if (row.po === 0)
    return toast.warning("Jumlah PO baris ini 0. Tidak perlu link PO.");

  showPoModal.value = true;
};

const onPoSelected = (po: any) => {
  const rowBahan = formData.value.dtlBahan[selectedRowIdx.value];

  // Validasi 1: Sisa PO mencukupi?
  if (rowBahan.po > po.Sisa) {
    return toast.error("Sisa PO tidak mencukupi kebutuhan MKB ini.");
  }

  // Validasi 2: Sudah ada BPB? (Backend sudah cek, tapi kita cek lagi)
  if (po.BPB > 0) {
    return toast.error(
      "PO tersebut sudah ada penerimaan BPB. Tidak bisa di-link.",
    );
  }

  // Hapus link lama untuk baris nomor (nourut) ini (Fungsi hapuslink di Delphi)
  formData.value.dtlLink = formData.value.dtlLink.filter(
    (l: DtlLinkItem) => l.no !== rowBahan.no,
  );

  // Tambah link baru
  formData.value.dtlLink.push({
    no: rowBahan.no, // nourut rincian bahan
    nomor: po.NOPO,
    tanggal: po.TglPO,
    kode: po.Kode,
    qtylink: rowBahan.po,
    link: po.NoUrut, // pourut (pod_nourut)
  });

  toast.success(`Berhasil link ke PO: ${po.NOPO}`);
};
</script>

<template>
  <BaseForm
    :title="(isEdit ? 'Ubah' : 'Baru') + ' Memo Kebutuhan Bahan (MKB)'"
    menuId="51"
    :icon="IconNotes"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:showSaveDialog="showSaveDialog"
    v-model:showCancelDialog="showCancelDialog"
    v-model:showCloseDialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div
      class="mkb-layout"
      :style="isTutupBuku ? 'pointer-events:none; opacity:0.8' : ''"
    >
      <div v-if="isTutupBuku" class="mkb-alert">
        <IconLock :size="13" class="mr-1" />
        Transaksi sudah diclose. Menunggu ACC PIN untuk membuka.
      </div>

      <div class="mkb-header-card">
        <div class="mkb-header-left">
          <div class="sec-title">Info Dokumen</div>
          <div class="f-row">
            <label class="f-lbl">Nomor</label>
            <input
              :value="formData.nomor"
              readonly
              class="f-inp f-ro"
              style="width: 160px"
              placeholder=""
            />
            <span
              v-if="!isEdit"
              class="text-error font-italic font-weight-bold ml-2"
              style="font-size: 10px"
            >
              <-- Kosong=Baru
            </span>
          </div>
          <div class="f-row">
            <label class="f-lbl">Tanggal</label>
            <input
              type="date"
              v-model="formData.tanggal"
              class="f-date"
              style="width: 130px"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Keterangan</label>
            <input
              type="text"
              v-model="formData.keterangan"
              class="f-inp"
              style="flex: 1"
            />
          </div>
        </div>

        <div class="mkb-header-divider" />

        <div class="mkb-header-right">
          <div class="sec-title">Info SPK</div>
          <div class="f-row">
            <label class="f-lbl">Nomor SPK</label>
            <div class="inp-grp" style="width: 200px">
              <input
                :value="formData.nomorSpk"
                readonly
                class="f-inp f-ro"
                style="flex: 1"
                placeholder="F1..."
              />
              <button type="button" class="btn-lkp" @click="openSpkModal">
                <IconSearch :size="14" />
              </button>
            </div>
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
            <label class="f-lbl">Jenis Produk</label>
            <input
              :value="formData.jenisOrder"
              readonly
              class="f-inp f-ro"
              style="flex: 1"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Total Jumlah</label>
            <input
              :value="formData.jumlahSpk"
              readonly
              class="f-inp f-ro"
              style="width: 80px"
            />
            <template v-if="isMapMode">
              <label class="f-lbl" style="width: 40px; text-align: right"
                >MAP</label
              >
              <input
                :value="formData.memoSpk"
                readonly
                class="f-inp f-ro"
                style="flex: 1"
              />
            </template>
          </div>
        </div>
      </div>

      <div class="mkb-bahan-section">
        <div class="sec-header">
          <span class="sec-title" style="color: #1565c0"
            >Detail Rincian Bahan</span
          >
          <v-btn
            size="x-small"
            color="primary"
            variant="tonal"
            @click="addRowBahan"
          >
            <template #prepend><IconPlus :size="13" /></template>
            Tambah Bahan
          </v-btn>
        </div>
        <div class="grid-scroll">
          <table class="grid-table">
            <thead>
              <tr>
                <th style="width: 32px">No</th>
                <th style="width: 120px">Komponen</th>
                <th style="width: 120px">Ket Komp.</th>
                <th style="width: 72px" class="tr">Babaran</th>
                <th style="width: 90px">Warna</th>
                <th style="width: 80px">Jenis</th>
                <th style="width: 220px">Kode &amp; Nama Bahan</th>
                <th style="width: 60px">Satuan</th>
                <th style="width: 80px">Gramasi</th>
                <th
                  style="width: 72px"
                  class="tr bg-yellow-darken-2 text-black"
                >
                  Jumlah
                </th>
                <th style="width: 72px" class="tr">Ready</th>
                <th style="width: 72px" class="tr bg-red-darken-2 text-white">
                  Akan PO
                </th>
                <th style="width: 110px">Tgl Beli</th>
                <th style="width: 160px">Keterangan</th>
                <th style="width: 36px"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in formData.dtlBahan"
                :key="idx"
                :class="{ 'bg-blue-lighten-5': selectedRowIdx === Number(idx) }"
                @click="selectedRowIdx = Number(idx)"
              >
                <td class="tc bg-grey-lighten-4">{{ Number(idx) + 1 }}</td>
                <td style="padding: 0">
                  <select
                    v-model="row.komponen"
                    class="gi"
                    style="cursor: pointer"
                  >
                    <option value="" disabled selected>Pilih...</option>
                    <option v-for="k in listKomponen" :key="k" :value="k">
                      {{ k }}
                    </option>
                  </select>
                </td>
                <td><input type="text" v-model="row.ketk" class="gi" /></td>
                <td>
                  <input
                    type="number"
                    v-model="row.babaran"
                    class="gi tr"
                    @input="recalcRowBahan(row)"
                  />
                </td>
                <td><input type="text" v-model="row.warna" class="gi" /></td>
                <td><input type="text" v-model="row.jenis" class="gi" /></td>
                <td>
                  <div class="gi-group">
                    <input
                      type="text"
                      :value="row.kode ? `${row.kode} - ${row.namaBahan}` : ''"
                      class="gi gi-ro"
                      readonly
                      placeholder="Pilih Bahan..."
                    />
                    <button
                      class="btn-gi-search"
                      @click="openBahanModal(Number(idx))"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>
                <td>
                  <input
                    type="text"
                    v-model="row.satuan"
                    class="gi gi-ro"
                    readonly
                    tabindex="-1"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    v-model="row.gramasi"
                    class="gi gi-ro"
                    readonly
                    tabindex="-1"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    v-model="row.jumlah"
                    class="gi tr fw bg-blue-lighten-5"
                    @input="recalcRowBahan(row)"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    :value="row.ready"
                    class="gi tr gi-ro"
                    readonly
                    tabindex="-1"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    :value="row.po"
                    class="gi tr fw gi-ro text-red-darken-2 bg-red-lighten-5"
                    readonly
                    tabindex="-1"
                  />
                </td>
                <td><input type="date" v-model="row.tglbeli" class="gi" /></td>
                <td>
                  <input type="text" v-model="row.keterangan" class="gi" />
                </td>
                <td class="tc">
                  <button
                    class="btn-gi-del"
                    @click="removeRowBahan(Number(idx))"
                  >
                    <IconTrash :size="13" />
                  </button>
                </td>
              </tr>
              <tr v-if="formData.dtlBahan.length === 0">
                <td colspan="15" class="empty-row">
                  Klik Tambah Bahan untuk memulai
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mkb-bottom-row">
        <div class="mkb-panel">
          <div class="sec-header">
            <span class="sec-title" style="color: #37474f">Link PO</span>
            <v-btn
              size="x-small"
              color="blue-grey"
              variant="tonal"
              @click="openPoLinkModal"
            >
              <template #prepend><IconSearch :size="11" /></template>
              Link PO Baru
            </v-btn>
          </div>
          <div class="grid-scroll" style="flex: 1">
            <table class="grid-table">
              <thead>
                <tr>
                  <th>No. PO</th>
                  <th style="width: 90px">Tgl PO</th>
                  <th style="width: 100px">Kode Bahan</th>
                  <th style="width: 70px" class="tr">Qty Link</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(l, idx) in formData.dtlLink" :key="idx">
                  <td class="fw text-blue-darken-2">{{ l.nomor }}</td>
                  <td>{{ l.tanggal }}</td>
                  <td>{{ l.kode }}</td>
                  <td class="tr">{{ l.qtylink }}</td>
                </tr>
                <tr v-if="formData.dtlLink.length === 0">
                  <td colspan="4" class="empty-row">
                    &lt;No data to display&gt;
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mkb-panel">
          <div class="sec-header">
            <span class="sec-title" style="color: #37474f"
              >Komponen BAST MAP</span
            >
          </div>
          <div class="grid-scroll" style="flex: 1">
            <table class="grid-table">
              <thead>
                <tr>
                  <th style="width: 32px">No</th>
                  <th>Nama Komponen</th>
                  <th style="width: 50px">Size</th>
                  <th style="width: 70px" class="tr">Babaran</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(m, idx) in formData.dtlMap" :key="idx">
                  <td class="tc">{{ Number(idx) + 1 }}</td>
                  <td>{{ m.komponen }}</td>
                  <td>{{ m.size }}</td>
                  <td class="tr">{{ m.babaran }}</td>
                </tr>
                <tr v-if="formData.dtlMap.length === 0">
                  <td colspan="4" class="empty-row">
                    &lt;No data to display&gt;
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          class="mkb-panel"
          style="background: #fffde7; border-color: #ffe082"
        >
          <div class="sec-header">
            <span class="sec-title" style="color: #e65100"
              >Planning SPK (Bahan Datang)</span
            >
            <v-btn
              size="x-small"
              color="orange-darken-3"
              variant="outlined"
              @click="addRowPlan"
              :disabled="isMapMode"
            >
              <template #prepend><IconPlus :size="11" /></template>
              Add
            </v-btn>
          </div>
          <div
            v-if="isMapMode"
            class="text-caption text-error font-italic mb-1 mt-1"
            style="padding: 0 8px"
          >
            MAP tidak perlu input planning SPK.
          </div>
          <div class="grid-scroll" style="flex: 1">
            <table class="grid-table">
              <thead>
                <tr>
                  <th style="width: 32px">No</th>
                  <th>Tanggal</th>
                  <th class="tr" style="background: #fff9c4">
                    Jumlah Datang (Pcs)
                  </th>
                  <th style="width: 36px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, idx) in formData.dtlPlan" :key="idx">
                  <td class="tc">{{ Number(idx) + 1 }}</td>
                  <td>
                    <input
                      type="date"
                      v-model="p.tanggal"
                      class="gi"
                      style="background: white"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      v-model="p.jumlah"
                      class="gi tr fw"
                      style="background: #fffde7"
                    />
                  </td>
                  <td class="tc">
                    <button
                      class="btn-gi-del"
                      @click="removeRowPlan(Number(idx))"
                    >
                      <IconTrash :size="13" />
                    </button>
                  </td>
                </tr>
                <tr v-if="formData.dtlPlan.length === 0">
                  <td colspan="4" class="empty-row">
                    &lt;No data to display&gt;
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </BaseForm>

  <SpkSearchModal v-model="showSpkModal" @selected="onSpkSelected" />
  <BahanSearchModal
    v-model="showBahanModal"
    @selected="onBahanSelected"
    mode="all"
  />
  <PoLinkSearchModal
    v-model="showPoModal"
    :kode-bahan="
      selectedRowIdx !== -1 ? formData.dtlBahan[selectedRowIdx].kode : ''
    "
    :mkb-nomor="formData.nomor"
    @selected="onPoSelected"
  />

  <v-dialog v-model="showPrintDialog" max-width="400px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3 text-subtitle-1 font-weight-bold"
      >
        Simpan Berhasil
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        MKB <b>{{ savedNomor }}</b> telah tersimpan.<br />
        Apakah Anda ingin mencetak dokumen ini sekarang?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" color="error" @click="closePrintAndExit">
          Tutup
        </v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="doCetak">
          Ya, Cetak
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ── Layout utama ── */
.mkb-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 8px;
  padding: 10px;
  overflow: hidden;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}

/* ── Alert ── */
.mkb-alert {
  display: flex;
  align-items: center;
  background: #fff8e1;
  color: #f57f17;
  border: 1px solid #ffe082;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

/* ── Header Card ── */
.mkb-header-card {
  display: flex;
  gap: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.mkb-header-left,
.mkb-header-right {
  flex: 1;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.mkb-header-divider {
  width: 1px;
  background: #e0e0e0;
  margin: 8px 0;
}

/* ── Section titles ── */
.sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1565c0;
  margin-bottom: 4px;
}
.sec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  background: #f5f6f8;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

/* ── Form fields ── */
.f-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
}
.f-lbl {
  width: 85px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #555;
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
}
.f-ro {
  background: #f0f0f0 !important;
  color: #555;
}
.f-date {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
}
.inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
}
.inp-grp .f-inp {
  border: none;
  border-radius: 0;
}
.btn-lkp {
  width: 28px;
  background: #f5f5f5;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #424242;
  flex-shrink: 0;
}
.btn-lkp:hover {
  background: #e0e0e0;
}

/* ── Bahan Section ── */
.mkb-bahan-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

/* ── Bottom Row ── */
.mkb-bottom-row {
  display: flex;
  gap: 8px;
  height: 220px;
  flex-shrink: 0;
}
.mkb-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

/* ── Grid Table ── */
.grid-scroll {
  overflow: auto;
}
.grid-table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
  font-size: 11px;
}
.grid-table thead th {
  background: #455a64;
  color: white;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
  border-bottom: 2px solid #37474f;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  padding: 5px 7px;
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: nowrap;
}
.grid-table tbody td {
  border-bottom: 1px solid #eeeeee;
  border-right: 1px solid #f0f0f0;
  padding: 0;
  height: 26px;
  vertical-align: middle;
}
.grid-table tbody tr:nth-of-type(even) td {
  background-color: rgba(0, 0, 0, 0.015);
}
.grid-table tbody tr:hover td {
  background-color: #e8f5e9 !important;
}

/* ── Grid Input ── */
.gi {
  width: 100%;
  height: 25px;
  border: none;
  background: transparent;
  padding: 0 6px;
  outline: none;
  font-size: 11px;
  font-family: inherit;
  box-sizing: border-box;
}
/* Menghilangkan panah bawaan default select jika diinginkan (opsional)
.gi.select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
} */
.gi:focus {
  background: #e3f2fd !important;
  box-shadow: inset 0 0 0 1.5px #1976d2;
}
.gi-ro {
  background: #f5f5f5 !important;
  color: #616161;
}
.gi-group {
  display: flex;
  align-items: center;
  height: 25px;
}
.gi-group .gi {
  flex: 1;
}
.btn-gi-search {
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
.btn-gi-search:hover {
  background: #0d47a1;
}
.btn-gi-del {
  color: #c62828;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.btn-gi-del:hover {
  background: #ffebee;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.fw {
  font-weight: 600;
}

.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px 8px;
  font-size: 11px;
}
</style>
