<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import { returBahanFormService } from "@/services/garmen/returBahanFormService";
import { useAuthStore } from "@/stores/authStore";
import BaseForm from "@/components/BaseForm.vue";
import RealisasiMintaSearchModal from "@/components/lookups/RealisasiMintaSearchModal.vue";
import RealisasiMintaDetailSearchModal from "@/components/lookups/RealisasiMintaDetailSearchModal.vue";

const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

// State Modal
const showMintaModal = ref(false);
const showDetailModal = ref(false);
const activeRowIndex = ref(-1);

const emptyRow = {
  nominta: "",
  kode: "",
  nama: "",
  satuan: "",
  minta: 0,
  jumlah: 0,
  roll: 0,
  sudah: 0,
  approve: 0,
  ket: "",
  spk: "",
  kdsup: "",
  nmsup: "",
};

const initialData = {
  nomor: "",
  tanggal: new Date().toISOString().substring(0, 10),
  keterangan: "",
  gudangAsal: "",
  gudangProduksi: "",
  isUtama: 1,
  // Otomatis sedia 1 baris kosong saat form dibuka (Replikasi initgrid Delphi)
  details: [{ ...emptyRow }],
  pin_acc: "",
  pin_dipakai: "",
};

const listGudangBahan = ref<any[]>([]);
const listGudangProduksi = ref<any[]>([]);

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
  menuId: "110",
  initialData,
  fetchApi: async () => {
    const res = await returBahanFormService.getDetail(
      route.params.nomor as string,
    );
    const { header, details } = res.data.data;

    const mappedDetails = details.map((d: any) => ({
      nominta: d.nominta,
      kode: d.kode,
      nama: d.nama,
      satuan: d.satuan,
      jumlah: d.jumlah,
      roll: d.roll,
      ket: d.ket,
      spk: d.spk,
      kdsup: d.kdsup,
      nmsup: d.nmsup,
      minta: 0,
      sudah: 0,
    }));

    // Tambahkan 1 baris kosong di akhir agar user bisa langsung input baris baru
    mappedDetails.push({ ...emptyRow });

    return {
      nomor: header.proret_nomor,
      tanggal: header.proret_tanggal.substring(0, 10),
      keterangan: header.proret_keterangan,
      gudangAsal: header.proret_gdg_tujuan,
      gudangProduksi: header.proret_gdg_produksi,
      pin_acc: header.pin_acc,
      pin_dipakai: header.pin_dipakai,
      details: details.map((d: any) => ({
        nominta: d.nominta,
        kode: d.kode,
        nama: d.nama,
        satuan: d.satuan,
        jumlah: d.jumlah,
        roll: d.roll,
        ket: d.ket,
        spk: d.spk,
        kdsup: d.kdsup,
        nmsup: d.nmsup,
        minta: 0, // Akan di-update jika load referensi
        sudah: 0,
      })),
    };
  },
  submitApi: async (data) => {
    const nomor = isEditMode.value ? (route.params.nomor as string) : undefined;
    return await returBahanFormService.saveData(data, nomor);
  },
  onSuccess: (res: any) => {
    const nomorTersimpan = res.data?.data?.nomor || formData.value.nomor;

    // Replikasi logic Delphi: if MessageDlg(...) = mrYes then cetak
    if (
      window.confirm(
        `Berhasil disimpan dengan nomor: ${nomorTersimpan}\n\nAkan dicetak?`,
      )
    ) {
      window.open(
        `/garmen/bahan-baku/retur-bahan/print/${encodeURIComponent(nomorTersimpan)}`,
        "_blank",
      );
    }
  },
});

// Load Dropdowns
onMounted(async () => {
  try {
    const [resBahan, resProd] = await Promise.all([
      returBahanFormService.getGudangBahan(),
      returBahanFormService.getGudangProduksi(),
    ]);
    listGudangBahan.value = resBahan.data.data;
    listGudangProduksi.value = resProd.data.data;

    // Set default gudang jika baru
    if (!isEditMode.value && listGudangBahan.value.length > 0) {
      formData.value.gudangAsal = listGudangBahan.value[0].kode;
    }
    if (!isEditMode.value && listGudangProduksi.value.length > 0) {
      formData.value.gudangProduksi = listGudangProduksi.value[0].kode;
    }
  } catch (error) {
    toast.error("Gagal memuat daftar gudang.");
  }
});

// --- LOGIKA TABEL DETAIL ---
const addRow = () => {
  formData.value.details.push({
    nominta: "",
    kode: "",
    nama: "",
    satuan: "",
    jumlah: 0,
    roll: 1,
    ket: "",
    spk: "",
    kdsup: "",
    nmsup: "",
  });
};

const removeRow = (index: number) => {
  formData.value.details.splice(index, 1);
  if (formData.value.details.length === 0) addRow();
};

// Pencarian Referensi Realisasi Minta (F1kode Delphi)
const searchRealisasi = async (index: number) => {
  const row = formData.value.details[index];
  if (!row.nominta) return toast.warning("Masukkan No. Realisasi Minta");
  if (!formData.value.gudangProduksi)
    return toast.warning("Pilih Gudang Produksi terlebih dahulu");

  try {
    const res = await returBahanFormService.getDetailRealisasi(
      row.nominta,
      formData.value.gudangProduksi,
    );
    const data = res.data.data;

    if (data.length === 0) {
      toast.error(
        "No. Realisasi tidak ditemukan atau tidak ada barang yang bisa diretur.",
      );
      return;
    }

    // Jika detail > 1, idealnya muncul modal bantuan, tapi untuk simplifikasi ambil item pertama
    // atau jika Anda ingin user memilih, bisa diintegrasikan dengan ModalSearch.
    const item = data[0];

    // Cek duplikasi
    const isDuplicate = formData.value.details.some(
      (d, i) =>
        d.kode === item.kode && d.nominta === item.nominta && i !== index,
    );
    if (isDuplicate) return toast.warning("Barang ini sudah ada di daftar.");

    row.kode = item.kode;
    row.nama = item.nama;
    row.satuan = item.satuan;
    row.spk = item.spk;
    row.kdsup = item.kdsup;
    row.nmsup = item.nmsup;
    row.minta = item.minta;
    row.sudah = item.sudah;
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal mencari referensi.");
  }
};

// Saat user menekan tombol cari di kolom No. Minta
const openMintaLookup = (index: number) => {
  activeRowIndex.value = index;
  showMintaModal.value = true;
};

// Saat Header Realisasi dipilih
const onMintaSelected = (item: any) => {
  formData.value.details[activeRowIndex.value].nominta = item.Nomor;
  // Langsung buka modal detail untuk memilih barangnya
  showDetailModal.value = true;
};

// Saat Barang Detail dipilih
const onDetailSelected = (item: any) => {
  const details = formData.value.details;
  const currentRow = details[activeRowIndex.value];

  // Helper untuk mapping data dari lookup ke baris tabel
  const fillRow = (target: any, source: any) => {
    target.nominta = source.NoMinta;
    target.kode = source.Kode;
    target.nama = source.Nama;
    target.satuan = source.Satuan;
    target.spk = source.SPK;
    target.minta = source.Minta;
    target.sudah = source.Sudah;
    target.approve = source.Sudah; // Delphi mengisi Approve = Sudah saat load
    target.jumlah = source.Sisa;
    target.roll = 1;
    target.kdsup = source.kdsup;
    target.nmsup = source.nmsup;
  };

  // Cek apakah barang ini sudah ada di baris lain (Duplikasi)
  const isDuplicate = details.some(
    (d, idx) =>
      d.kode === item.Kode &&
      d.nominta === item.NoMinta &&
      idx !== activeRowIndex.value,
  );

  if (isDuplicate) {
    return toast.warning(
      `Bahan ${item.Nama} dari No. Minta tersebut sudah ada di daftar.`,
    );
  }

  // Isi baris yang sedang aktif
  fillRow(currentRow, item);

  // LOGIKA AUTO-ROW:
  // Jika baris yang baru diisi adalah baris terakhir, otomatis tambah baris kosong di bawahnya
  if (activeRowIndex.value === details.length - 1) {
    addRow();
  }
};

const validateBeforeSave = () => {
  if (!formData.value.gudangAsal || !formData.value.gudangProduksi) {
    return toast.warning("Gudang Asal dan Produksi wajib diisi.");
  }
  if (formData.value.gudangAsal === formData.value.gudangProduksi) {
    return toast.warning(
      "Gudang Tujuan tidak boleh sama dengan Gudang Produksi.",
    );
  }

  const validDetails = formData.value.details.filter((d) => d.kode && d.nama);
  if (validDetails.length === 0)
    return toast.warning("Detail barang masih kosong.");

  const zeroQty = validDetails.some((d) => Number(d.jumlah) <= 0);
  if (zeroQty) return toast.warning("Jumlah retur tidak boleh 0.");

  showSaveDialog.value = true;
};

const numFormat = (val: any) =>
  Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
</script>

<template>
  <BaseForm
    :title="(isEditMode ? 'Ubah' : 'Baru') + ' Retur Permintaan Bahan'"
    menu-id="110"
    icon="mdi-arrow-u-left-top-bold"
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
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="mb-3 d-flex align-center gap-2">
          <div class="text-caption font-weight-bold text-primary mr-2">
            HEADER RETUR
          </div>

          <v-chip
            v-if="formData.pin_acc === '' && formData.pin_dipakai === ''"
            color="blue"
            size="x-small"
            >WAITING PIN</v-chip
          >
          <v-chip
            v-else-if="formData.pin_acc === 'Y' && formData.pin_dipakai === ''"
            color="green"
            size="x-small"
            >PIN APPROVED</v-chip
          >
          <v-chip
            v-else-if="formData.pin_acc === 'N'"
            color="red"
            size="x-small"
            >PIN REJECTED</v-chip
          >
        </div>

        <v-text-field
          v-model="formData.nomor"
          label="No. Retur"
          density="compact"
          variant="outlined"
          readonly
          placeholder="Otomatis"
          hide-details
          class="mb-2 bg-grey-lighten-4"
        />

        <v-text-field
          v-model="formData.tanggal"
          type="date"
          label="Tanggal"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
        />

        <v-autocomplete
          v-model="formData.gudangAsal"
          :items="listGudangBahan"
          item-title="nama"
          item-value="kode"
          label="Gudang Tujuan (Bahan)"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
        />

        <v-autocomplete
          v-model="formData.gudangProduksi"
          :items="listGudangProduksi"
          item-title="nama"
          item-value="kode"
          label="Gudang Produksi"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-2"
        />

        <v-textarea
          v-model="formData.keterangan"
          label="Keterangan"
          density="compact"
          variant="outlined"
          rows="3"
          hide-details
        />
      </div>
    </template>

    <template #right-column>
      <v-card border flat class="d-flex flex-column fill-height">
        <div
          class="bg-blue-grey-darken-3 text-white px-3 py-1 font-weight-bold text-caption d-flex align-center"
        >
          <v-icon size="small" class="mr-2">mdi-format-list-bulleted</v-icon>
          Daftar Barang yang Diretur
        </div>

        <div class="table-container flex-grow-1">
          <table class="manksi-table">
            <thead>
              <tr>
                <th width="40">No.</th>
                <th width="150">No.Realisasi Minta</th>
                <th width="110">Kode</th>
                <th>Nama Bahan</th>
                <th width="70">Satuan</th>
                <th width="80">Minta</th>
                <th width="90" class="bg-yellow-darken-2">Jumlah</th>
                <th width="60" class="bg-yellow-darken-2">Roll</th>
                <th width="80">Sudah</th>
                <th width="80">Approve</th>
                <th width="180" class="bg-yellow-darken-2">Keterangan</th>
                <th width="130">SPK</th>
                <th width="80">Kode Sup</th>
                <th width="180">Nama Supplier</th>
                <th width="40"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in formData.details" :key="index">
                <td class="text-center">{{ index + 1 }}</td>
                <!-- Kolom No. Realisasi Minta dengan F1 Lookup -->
                <td>
                  <div class="d-flex align-center px-1">
                    <input
                      v-model="item.nominta"
                      class="cell-input text-primary font-weight-bold"
                      placeholder="F1..."
                      @keyup.f1="openMintaLookup(index)"
                    />
                    <v-btn
                      icon="mdi-magnify"
                      size="x-small"
                      variant="text"
                      @click="openMintaLookup(index)"
                    />
                  </div>
                </td>
                <td class="bg-grey-lighten-4 px-2">{{ item.kode }}</td>
                <td
                  class="bg-grey-lighten-4 px-2 text-truncate"
                  style="max-width: 250px"
                >
                  {{ item.nama }}
                </td>
                <td class="text-center bg-grey-lighten-4">{{ item.satuan }}</td>

                <!-- Kolom Read-Only (Referensi) -->
                <td class="tr bg-grey-lighten-4 px-2">
                  {{ numFormat(item.minta) }}
                </td>

                <!-- Kolom Input Kuning -->
                <td class="bg-yellow-lighten-5">
                  <input
                    type="number"
                    v-model.number="item.jumlah"
                    class="cell-input tr fw-bold"
                    step="any"
                  />
                </td>
                <td class="bg-yellow-lighten-5">
                  <input
                    type="number"
                    v-model.number="item.roll"
                    class="cell-input tr fw-bold"
                  />
                </td>

                <!-- Kolom Read-Only (Referensi Lanjutan) -->
                <td class="tr bg-grey-lighten-4 px-2">
                  {{ numFormat(item.sudah) }}
                </td>
                <td class="tr bg-grey-lighten-4 px-2">
                  {{ numFormat(item.approve || 0) }}
                </td>

                <!-- Kolom Keterangan Input -->
                <td class="bg-yellow-lighten-5">
                  <input
                    v-model="item.ket"
                    class="cell-input"
                    placeholder="..."
                  />
                </td>

                <!-- Info Pendukung -->
                <td class="bg-grey-lighten-4 px-2">{{ item.spk }}</td>
                <td class="bg-grey-lighten-4 px-2">{{ item.kdsup }}</td>
                <td
                  class="bg-grey-lighten-4 px-2 text-truncate"
                  style="max-width: 150px"
                >
                  {{ item.nmsup }}
                </td>

                <td class="text-center">
                  <v-btn
                    icon="mdi-delete"
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="removeRow(index)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pa-2 bg-grey-lighten-4 text-right">
          <v-btn
            size="x-small"
            color="primary"
            prepend-icon="mdi-plus"
            @click="addRow"
            >Tambah Baris</v-btn
          >
        </div>
      </v-card>
    </template>
  </BaseForm>

  <RealisasiMintaSearchModal
    v-model="showMintaModal"
    @selected="onMintaSelected"
  />

  <RealisasiMintaDetailSearchModal
    v-model="showDetailModal"
    :nomor-realisasi="formData.details[activeRowIndex]?.nominta"
    :gudang-produksi="formData.gudangProduksi"
    @selected="onDetailSelected"
  />
</template>

<style scoped>
.manksi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.manksi-table th {
  background: #455a64;
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
}
.tr {
  text-align: right;
}
.fw-bold {
  font-weight: bold;
}
</style>
