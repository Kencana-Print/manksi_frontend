<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import { useAuthStore } from "@/stores/authStore";
import { mintaBarangFormService } from "@/services/garmen/mintaBarangFormService";
import api from "@/services/api";
import BaseForm from "@/components/BaseForm.vue";
import {
  IconPackage,
  IconListDetails,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-vue";

// Komponen Modal
import GudangProduksiSearchModal from "@/components/lookups/GudangProduksiSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import BarangGarmenSearchModal from "@/components/lookups/BarangGarmenSearchModal.vue";

const route = useRoute();
const jenisFromQuery =
  typeof route.query.jenis === "string" ? route.query.jenis : "";
const toast = useToast();
const authStore = useAuthStore();

const isEdit = computed(() => !!route.params.nomor);
const nomorParam = computed(() => route.params.nomor as string);
const formTitle = computed(() =>
  isEdit.value
    ? `Ubah Permintaan ${formData.value.jenis || "Barang"} Garmen`
    : `Permintaan ${formData.value.jenis || "Barang"} Garmen`,
);

// State untuk memunculkan Modal
const showGudangModal = ref(false);
const showSpkModal = ref(false);
const showBarangModal = ref(false);
const activeRowIndex = ref(0);

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";

  const d = new Date(value);

  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// Initial Data Structure (Tambah field Jumlah, Divisi, MKA)
const initialData = {
  nomor: "",
  tanggal: formatDateLocal(new Date()),
  jenis: jenisFromQuery || "ACCESORIES",
  cabang: authStore.userCabang === "ALL" ? "" : authStore.userCabang,
  gudangPeminta: "",
  namaGudangPeminta: "",
  spk: "",
  namaSpk: "",
  jumlahSpk: 0,
  divisiSpk: "",
  mkaNomor: "",
  mkaTanggal: "",
  keterangan: "BARU",
  bagian: "",
  spkFlags: {
    isPendingSebagian: false,
    accPending: "Y",
    potong: "N",
    cetak: "N",
    bordir: "N",
    jahit: "N",
    finishing: "N",
  },
  details: [
    {
      kode: "",
      nama: "",
      satuan: "",
      butuh: 0,
      pemakaian: 0,
      pcs: 0,
      jumlah: 0,
      ket: "",
    },
  ] as any[],
};

const jenisOptions = ["ACCESORIES", "OBAT", "SPAREPART", "ATK/RTK"];

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
  menuId: "60",
  initialData,
  fetchApi: async () => {
    const res = await mintaBarangFormService.getDetail(nomorParam.value);
    const { header, details } = res.data.data;

    return {
      nomor: header.min_nomor,
      tanggal: formatDateLocal(header.min_tanggal),
      jenis: header.min_jenis,
      cabang: header.min_cab,
      gudangPeminta: header.min_gp,
      namaGudangPeminta: header.nama_gdg,
      spk: header.min_spk_nomor,
      namaSpk: header.namaspk,
      jumlahSpk: header.jumlahspk || 0,
      divisiSpk: header.nama_divisi || "",
      mkaNomor: header.mkb_nomor || "",
      mkaTanggal: formatDateLocal(header.mkb_tanggal),
      keterangan: header.min_ket,
      bagian: header.min_bagian,

      spkFlags: {
        isPendingSebagian: false,
        accPending: "Y",
        potong: "N",
        cetak: "N",
        bordir: "N",
        jahit: "N",
        finishing: "N",
      },

      details: details.length
        ? details
        : [
            {
              kode: "",
              nama: "",
              satuan: "",
              butuh: 0,
              pemakaian: 0,
              pcs: 0,
              jumlah: 0,
              ket: "",
            },
          ],
    };
  },
  submitApi: async (payload) => {
    return await mintaBarangFormService.saveData(payload);
  },
  onSuccess: () => {
    toast.success("Permintaan barang berhasil disimpan.");
  },
});

onMounted(() => {
  if (!isEdit.value) {
    const bag = (authStore.user?.bagian || "").toUpperCase();

    // Prioritas 1: dari query param (dikirim browse)
    if (jenisFromQuery) {
      formData.value.jenis = jenisFromQuery;
    }
    // Prioritas 2: default per bagian (fallback kalau tidak ada query)
    else if (bag === "GA") {
      formData.value.jenis = "ATK/RTK";
    } else if (bag === "TEKNISI" || bag === "IT") {
      formData.value.jenis = "SPAREPART";
      formData.value.bagian = bag;
    }
    // Else: tetap default ACCESORIES dari initialData
  }
});

const isAccesories = computed(() => formData.value.jenis === "ACCESORIES");
const isSparepart = computed(() => formData.value.jenis === "SPAREPART");

const showKolomButuh = computed(() => {
  return (
    isAccesories.value &&
    formData.value.cabang !== "P03" &&
    formData.value.cabang !== "P05"
  );
});

// -- HANDLER EVENT DARI MODAL --
const openGudangModal = () => {
  showGudangModal.value = true;
};
// Mengecek apakah gudang yang dipilih sedang dipending sebagian
const validateGudangPending = (gudangKode: string, flags: any) => {
  if (!flags.isPendingSebagian || flags.accPending === "Y") return null;

  if (
    (gudangKode === "GP001" || gudangKode === "GP015") &&
    flags.potong === "Y"
  )
    return "Cuting";
  if ((gudangKode === "GP002" || gudangKode === "GP017") && flags.cetak === "Y")
    return "Cetak";
  if (
    (gudangKode === "GP014" || gudangKode === "GP016") &&
    flags.bordir === "Y"
  )
    return "Bordir";
  if ((gudangKode === "GP003" || gudangKode === "GP018") && flags.jahit === "Y")
    return "Jahit";
  if (
    (gudangKode === "GP004" || gudangKode === "GP019") &&
    flags.finishing === "Y"
  )
    return "Finishing";

  return null;
};

const openSpkModal = () => {
  showSpkModal.value = true;
};
// Fungsi untuk memproses respon pemanggilan API validasi SPK
const onGudangSelected = (item: any) => {
  const cabang = formData.value.cabang;

  // Jika SPK sudah terisi, cek apakah gudang ini diblokir
  if (cabang !== "P03" && cabang !== "P05" && formData.value.spk) {
    const pendingPart = validateGudangPending(
      item.Kode,
      formData.value.spkFlags,
    );
    if (pendingPart) {
      return toast.warning(
        `No.Spk tsb di pending dibagian ${pendingPart}.\nHubungi marketing jika akan tetap melanjutkan transaksi.`,
      );
    }
  }

  formData.value.gudangPeminta = item.Kode;
  formData.value.namaGudangPeminta = item.Nama;
};

// Fungsi untuk memproses respon pemanggilan API validasi SPK
const processSpkData = (
  resData: any,
  selectedSpkNomor: string,
  selectedSpkNama: string,
  selectedSpkJml: number,
) => {
  const { spk, mka, details, isBaruDobel, referensiBaru } = resData;

  formData.value.spk = selectedSpkNomor;
  formData.value.namaSpk = selectedSpkNama;
  formData.value.jumlahSpk = selectedSpkJml;

  if (spk && spk.Divisi) {
    formData.value.divisiSpk = spk.Divisi;
  }

  // Simpan data pending per-departemen
  if (spk) {
    formData.value.spkFlags = {
      isPendingSebagian: spk.Pending === "PENDING SEBAGIAN",
      accPending: spk.AccPending || "N",
      potong: spk.spk_ppotong || "N",
      cetak: spk.spk_pcetak || "N",
      bordir: spk.spk_pbordir || "N",
      jahit: spk.spk_pjahit || "N",
      finishing: spk.spk_pfinishing || "N",
    };
  }

  // Jika Gudang sudah dipilih sebelumnya, validasi dengan data SPK yang baru ditarik
  if (
    formData.value.gudangPeminta &&
    formData.value.cabang !== "P03" &&
    formData.value.cabang !== "P05"
  ) {
    const pendingPart = validateGudangPending(
      formData.value.gudangPeminta,
      formData.value.spkFlags,
    );
    if (pendingPart) {
      toast.warning(
        `No.Spk tsb di pending dibagian ${pendingPart}.\nHubungi marketing jika akan tetap melanjutkan transaksi.`,
      );
      // Kosongkan gudang karena bentrok dengan SPK yg pending
      formData.value.gudangPeminta = "";
      formData.value.namaGudangPeminta = "";
    }
  }

  if (mka) {
    formData.value.mkaNomor = mka.mkb_nomor;
    formData.value.mkaTanggal = formatDateLocal(mka.mkb_tanggal);
    toast.success("Data MKA berhasil ditarik otomatis.");
  } else {
    formData.value.mkaNomor = "";
    formData.value.mkaTanggal = "";
  }

  if (
    !isEdit.value &&
    formData.value.keterangan.toUpperCase().includes("BARU")
  ) {
    if (isBaruDobel) {
      toast.warning(
        `SPK dgn Divisi tsb sudah dibuatkan permintaan baru dengan nomor: ${referensiBaru}.\nAlihkan ke tambahan atau lainnya.`,
      );
      formData.value.keterangan = "TAMBAHAN";
    }
  }

  if (details && details.length > 0) {
    formData.value.details = details;
  }
};
const onSpkSelected = async (item: any) => {
  // Pengecekan: Apakah user mengganti SPK padahal tabel detail sudah ada isinya?
  const hasDetailContent = formData.value.details.some(
    (d: any) => d.kode && d.kode.trim() !== "",
  );

  if (hasDetailContent && formData.value.spk !== item.Nomor) {
    // Jika di Delphi: MessageDlg('Detail sudah ada! Yakin akan dilanjutkan?', ...)
    const confirmed = confirm(
      "Detail barang sudah ada!\nYakin ingin melanjutkan ganti SPK? (Detail akan ditimpa)",
    );
    if (!confirmed) return; // Batal ganti SPK
  }

  // Validasi SPK dan Tarik MKA dari Backend
  try {
    const res = await api.get(
      `/garmen/barang/permintaan/form/validate-spk/${encodeURIComponent(item.Nomor)}`,
    );

    // Lanjutkan proses data
    processSpkData(res.data.data, item.Nomor, item.Nama, item.Jumlah);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memvalidasi SPK.");
    // Kosongkan ulang form SPK karena gagal validasi (Misal pending / blm diACC CMO)
    formData.value.spk = "";
    formData.value.namaSpk = "";
    formData.value.jumlahSpk = 0;
    formData.value.divisiSpk = "";
    formData.value.mkaNomor = "";
    formData.value.mkaTanggal = "";
  }
};

// Fungsi untuk memvalidasi SPK (Sesuai Delphi) sebelum modal terbuka
const openBarangModal = (index: number) => {
  // Validasi khusus Accesories (Pengecualian untuk P03 dan P05)
  if (
    isAccesories.value &&
    formData.value.cabang !== "P03" &&
    formData.value.cabang !== "P05"
  ) {
    if (!formData.value.spk) {
      return toast.warning("SPK harus diisi dulu ya!");
    }
  }

  activeRowIndex.value = index;
  showBarangModal.value = true;
};

// Menangkap item barang yang dipilih
const onBarangSelected = (item: any) => {
  const i = activeRowIndex.value;

  // Mencegah duplikasi kode barang dalam grid
  const isDuplicate = formData.value.details.some(
    (d: any, idx: number) => idx !== i && d.kode === item.Kode,
  );
  if (isDuplicate) {
    return toast.error(`Kode ${item.Kode} sudah diinput di baris lain.`);
  }

  formData.value.details[i].kode = item.Kode;
  formData.value.details[i].nama = item.Nama;
  formData.value.details[i].satuan = item.Satuan;
};

// Fungsi untuk mereset data saat Jenis Permintaan diubah
const onJenisChange = () => {
  // 1. Kosongkan grid detail
  formData.value.details = [
    {
      kode: "",
      nama: "",
      satuan: "",
      butuh: 0,
      pemakaian: 0,
      pcs: 0,
      jumlah: 0,
      ket: "",
    },
  ];

  // 2. Kosongkan info SPK dan Gudang jika sebelumnya Accesories
  formData.value.spk = "";
  formData.value.namaSpk = "";
  formData.value.jumlahSpk = 0;
  formData.value.divisiSpk = "";
  formData.value.mkaNomor = "";
  formData.value.mkaTanggal = "";
  formData.value.gudangPeminta = "";
  formData.value.namaGudangPeminta = "";
};

// -- VALIDASI SEBELUM SIMPAN --
const validateSave = () => {
  if (!canSave.value)
    return toast.error("Anda tidak memiliki hak akses simpan.");

  // Validasi SPK & Gudang khusus Accesories (Pengecualian P03 dan P05)
  if (
    isAccesories.value &&
    formData.value.cabang !== "P03" &&
    formData.value.cabang !== "P05"
  ) {
    if (!formData.value.spk) return toast.warning("SPK harus di isi.");
    if (!formData.value.gudangPeminta)
      return toast.warning("Gudang Produksi belum di isi.");
  }

  // Validasi khusus Sparepart
  if (isSparepart.value) {
    const bagian = authStore.user?.bagian?.toUpperCase() || "";
    if (bagian !== "TEKNISI" && bagian !== "IT") {
      return toast.error(
        "Hanya bagian Teknisi/IT yg diizinkan untuk menyimpan.",
      );
    }
  }

  // Filter baris yang valid (Kode ada)
  const validDetails = formData.value.details.filter(
    (d: any) => d.kode && d.kode.trim() !== "",
  );

  if (validDetails.length === 0) {
    return toast.warning("Detail harus diisi.");
  }

  // Cek apakah ada barang yang jumlahnya 0
  if (validDetails.some((d: any) => Number(d.jumlah) <= 0)) {
    return toast.warning("Jumlah harus di isi!");
  }

  formData.value.details = validDetails;
  showSaveDialog.value = true;
};

// -- FUNGSI MANIPULASI GRID --
const addRow = () => {
  formData.value.details.push({
    kode: "",
    nama: "",
    satuan: "",
    butuh: 0,
    pemakaian: 0,
    pcs: 0,
    jumlah: 0,
    ket: "",
  });
};

const removeRow = (index: number) => {
  formData.value.details.splice(index, 1);
  if (formData.value.details.length === 0) addRow();
};

const hitungJumlah = (item: any) => {
  const pemakaian = Number(item.pemakaian) || 0;
  const pcs = Number(item.pcs) || 0;
  if (pemakaian > 0 && pcs > 0) item.jumlah = pemakaian * pcs;
};

const numFormat = (val: any) =>
  Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
</script>

<template>
  <BaseForm
    :title="formTitle"
    menuId="60"
    :icon="IconPackage"
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
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="text-caption font-weight-bold text-primary mb-2">
          HEADER PERMINTAAN
        </div>

        <v-text-field
          v-model="formData.nomor"
          label="Nomor Permintaan"
          readonly
          hide-details
          variant="outlined"
          density="compact"
          class="mb-2 bg-grey-lighten-4"
          placeholder="<--Kosong=Baru"
        />

        <div class="d-flex gap-2 mb-2">
          <v-text-field
            v-model="formData.tanggal"
            label="Tanggal"
            type="date"
            hide-details
            variant="outlined"
            density="compact"
            style="flex: 1"
          />
          <v-text-field
            v-model="formData.cabang"
            label="Cabang"
            readonly
            hide-details
            variant="outlined"
            density="compact"
            class="bg-grey-lighten-4"
            style="flex: 1"
          />
        </div>

        <v-select
          v-model="formData.jenis"
          :items="jenisOptions"
          label="Jenis Permintaan"
          :readonly="isEdit"
          hide-details
          variant="outlined"
          density="compact"
          :class="['mb-2', isEdit ? 'bg-grey-lighten-4' : '']"
          @update:modelValue="onJenisChange"
        />

        <v-text-field
          v-if="isSparepart"
          v-model="formData.bagian"
          label="Bagian"
          readonly
          hide-details
          variant="outlined"
          density="compact"
          class="mb-2 bg-grey-lighten-4"
        />

        <v-textarea
          v-model="formData.keterangan"
          label="Keterangan"
          hide-details
          variant="outlined"
          density="compact"
          rows="2"
          class="mb-2"
        />
      </div>

      <!-- Section Gudang, SPK & MKA -->
      <div
        v-if="
          isAccesories && formData.cabang !== 'P03' && formData.cabang !== 'P05'
        "
        class="desktop-form-section"
      >
        <div class="tm-sec-title">INFO GUDANG, SPK & MKA</div>

        <!-- Gudang kode -->
        <div class="f-row">
          <label class="f-lbl">Gudang Produksi</label>
          <div class="inp-grp" style="width: 90px">
            <input
              :value="formData.gudangPeminta"
              readonly
              class="f-inp"
              style="
                flex: 1;
                background: #ddeeff;
                cursor: pointer;
                font-weight: 600;
              "
              @mousedown.prevent="openGudangModal"
            />
            <button
              type="button"
              class="btn-lkp"
              @mousedown.prevent="openGudangModal"
            >
              🔍
            </button>
          </div>
        </div>
        <!-- Nama gudang -->
        <div class="f-row">
          <input
            :value="formData.namaGudangPeminta"
            readonly
            class="f-inp f-ro w-100"
          />
        </div>

        <!-- SPK nomor -->
        <div class="f-row" style="margin-top: 6px">
          <label class="f-lbl">No. SPK / Memo</label>
          <div class="inp-grp" style="flex: 1">
            <input
              :value="formData.spk"
              readonly
              class="f-inp"
              style="
                flex: 1;
                background: #ddeeff;
                cursor: pointer;
                font-weight: 600;
              "
              @mousedown.prevent="openSpkModal"
            />
            <button
              type="button"
              class="btn-lkp"
              @mousedown.prevent="openSpkModal"
            >
              🔍
            </button>
          </div>
        </div>
        <!-- Nama SPK -->
        <div class="f-row">
          <input :value="formData.namaSpk" readonly class="f-inp f-ro w-100" />
        </div>

        <!-- Jumlah + Divisi -->
        <div class="f-row" style="margin-top: 6px">
          <label class="f-lbl">Jml SPK</label>
          <input
            :value="formData.jumlahSpk"
            readonly
            class="f-inp f-ro"
            style="width: 55px; text-align: right; flex-shrink: 0"
          />
          <span
            style="
              font-size: 11px;
              font-weight: 500;
              color: #555;
              white-space: nowrap;
              margin: 0 4px;
              flex-shrink: 0;
            "
            >Divisi</span
          >
          <input
            :value="formData.divisiSpk"
            readonly
            class="f-inp f-ro"
            style="flex: 1; min-width: 0"
          />
        </div>

        <!-- No MKA -->
        <div class="f-row" style="margin-top: 6px">
          <label class="f-lbl">No. MKA</label>
          <input
            :value="formData.mkaNomor"
            readonly
            class="f-inp f-ro"
            style="flex: 1"
            placeholder="—"
          />
        </div>
        <!-- Tgl MKA -->
        <div class="f-row">
          <label class="f-lbl">Tgl. MKA</label>
          <input
            :value="formData.mkaTanggal"
            type="date"
            readonly
            class="f-date f-ro"
            style="width: 135px"
          />
        </div>
      </div>
    </template>

    <template #right-column>
      <v-card border flat class="d-flex flex-column h-100">
        <div
          class="bg-blue-grey-darken-3 text-white px-3 py-2 font-weight-bold text-caption d-flex align-center justify-space-between"
        >
          <div class="d-flex align-center">
            <IconListDetails :size="14" :stroke-width="1.7" class="mr-2" />
            Detail Barang Diminta
          </div>
          <v-btn size="x-small" color="success" variant="flat" @click="addRow">
            <template #prepend
              ><IconPlus :size="13" :stroke-width="2"
            /></template>
            Tambah Baris
          </v-btn>
        </div>
        <div style="overflow: auto; flex-grow: 1; background: #fff">
          <table class="manksi-table">
            <thead>
              <tr>
                <th width="40">No.</th>
                <th width="140">Kode</th>
                <th>Nama Barang</th>
                <th width="60">Satuan</th>
                <th width="70" v-if="showKolomButuh">Butuh</th>
                <th width="90" class="bg-yellow-darken-2">Jumlah</th>
                <th width="200" class="bg-yellow-darken-2">Keterangan</th>
                <th width="40" class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in formData.details" :key="index">
                <td class="text-center bg-grey-lighten-4">
                  {{ Number(index) + 1 }}
                </td>
                <td class="bg-yellow-lighten-5">
                  <div class="d-flex align-center w-100 h-100 pr-1">
                    <input
                      v-model="item.kode"
                      class="cell-input cursor-pointer"
                      placeholder="[F1] Cari"
                      readonly
                      @click="openBarangModal(Number(index))"
                    />
                    <IconSearch
                      :size="15"
                      color="primary"
                      class="cursor-pointer"
                      @click="openBarangModal(Number(index))"
                    />
                  </div>
                </td>
                <td
                  class="bg-grey-lighten-4 px-2 text-truncate"
                  style="max-width: 180px"
                >
                  {{ item.nama }}
                </td>
                <td class="text-center bg-grey-lighten-4">{{ item.satuan }}</td>

                <td
                  class="tr bg-grey-lighten-4 px-2 font-weight-bold"
                  v-if="showKolomButuh"
                >
                  {{ numFormat(item.butuh) }}
                </td>

                <!-- Input Pemakaian dan Pcs dihapus -->

                <td class="bg-yellow-lighten-5">
                  <input
                    type="number"
                    v-model.number="item.jumlah"
                    class="cell-input tr fw-bold"
                    min="0"
                    step="any"
                    v-select-on-focus
                  />
                </td>
                <td class="bg-yellow-lighten-5">
                  <input
                    v-model="item.ket"
                    class="cell-input"
                    placeholder="..."
                  />
                </td>
                <td class="text-center">
                  <v-btn
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="removeRow(Number(index))"
                  >
                    <IconTrash :size="14" :stroke-width="1.7" />
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card>
    </template>
  </BaseForm>

  <!-- Pemasangan Modals -->
  <GudangProduksiSearchModal
    v-model="showGudangModal"
    :cabang="formData.cabang"
    @selected="onGudangSelected"
  />

  <SpkSearchModal v-model="showSpkModal" @selected="onSpkSelected" />

  <BarangGarmenSearchModal
    v-model="showBarangModal"
    :jenis="formData.jenis"
    :cabang="formData.cabang"
    @selected="onBarangSelected"
  />
</template>

<style scoped>
.h-100 {
  height: 100%;
}
.gap-2 {
  gap: 8px;
}
.manksi-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 11px;
}
.manksi-table th {
  background: #f5f6f8;
  border-bottom: 2px solid #cfd8dc;
  border-right: 1px solid #e0e0e0;
  padding: 6px 8px;
  text-align: left;
  font-weight: 700;
  color: #37474f;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}
.manksi-table td {
  border-bottom: 1px solid #eeeeee;
  border-right: 1px solid #eeeeee;
  padding: 0;
  height: 28px;
  vertical-align: middle;
}
.cell-input {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  padding: 0 8px;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}
.cell-input:focus {
  background-color: #fff3e0;
  box-shadow: inset 0 0 0 1px #ff9800;
}
.tr {
  text-align: right;
}
.fw-bold {
  font-weight: 600;
  color: #1565c0;
}
.cursor-pointer {
  cursor: pointer;
}

.tm-sec-title {
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
  gap: 5px;
  margin-bottom: 4px;
  min-height: 26px;
}
.f-lbl {
  width: 110px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}
.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #212121;
  box-sizing: border-box;
  font-family: inherit;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.f-date {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 12px;
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
}
.inp-grp .f-inp {
  border: none;
  height: 24px;
  border-radius: 0;
}
.inp-grp .f-inp + .f-inp {
  border-left: 1px solid #e0e0e0;
}
.btn-lkp {
  width: 24px;
  background: #f5f5f5;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-lkp:hover {
  background: #e0e0e0;
}
.ml-1 {
  margin-left: 4px;
}

.w-100 {
  width: 100%;
}
</style>
