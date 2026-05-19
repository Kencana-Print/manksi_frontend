<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import { approveReturBahanFormService } from "@/services/garmen/approveReturBahanFormService";
import BaseForm from "@/components/BaseForm.vue";
import ApproveReturBarcodeDialog from "./ApproveReturBarcodeDialog.vue";
import {
  IconDiscountCheckFilled,
  IconListDetails,
  IconBarcode,
} from "@tabler/icons-vue";

const route = useRoute();
const toast = useToast();

const isEdit = computed(
  () => !!route.params.nomor && (route.params.nomor as string).includes("RETP"),
);
const nomorParam = computed(() => route.params.nomor as string);

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";

  const d = new Date(value);

  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const initialData = {
  nomor: "",
  proret_log: "",
  tanggal: formatDateLocal(new Date()),
  tgl_retur: "",
  keterangan: "",
  gudangAsal: "",
  namaGudangAsal: "",
  gudangProduksi: "",
  namaGudangProduksi: "",
  details: [] as any[],
  barcodes: [] as any[],
};

// State untuk Print Dialog
const showPrintDialog = ref(false);
const nomorToPrint = ref("");

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
  goBack,
} = useForm({
  menuId: "137", // Menu Approve Retur
  initialData,
  fetchApi: async () => {
    const res = await approveReturBahanFormService.getDetail(nomorParam.value);
    const { header, details, barcodes } = res.data.data;

    return {
      nomor: isEdit.value ? header.proret_nomor : "",
      proret_log: isEdit.value ? header.proret_log : header.proret_nomor,
      tanggal: formatDateLocal(new Date()),
      tgl_retur: formatDateLocal(header.proret_tanggal),
      keterangan: header.proret_keterangan,
      gudangAsal: header.proret_gdg_tujuan,
      namaGudangAsal: header.gdg_nama,
      gudangProduksi: header.proret_gdg_produksi,
      namaGudangProduksi: header.gdgp_nama,
      details: details.map((d: any) => ({ ...d })),
      barcodes: barcodes.map((b: any) => ({ ...b })),
    };
  },
  submitApi: async (payload) => {
    return await approveReturBahanFormService.saveData(payload);
  },
  onSuccess: (res: any) => {
    const noTersimpan = res.data?.data?.nomor || formData.value.nomor;
    nomorToPrint.value = noTersimpan;
    showPrintDialog.value = true;
  },
});

// Custom Validator: Dijalankan ketika tombol "Simpan" di klik
const validateSave = () => {
  if (!canSave.value)
    return toast.error("Anda tidak memiliki hak akses untuk menyimpan.");

  if (!formData.value.details || formData.value.details.length === 0) {
    return toast.error("Detail kosong.");
  }

  // Validasi Total Barcode vs Jumlah Retur
  for (const d of formData.value.details) {
    const bcs = formData.value.barcodes.filter((b: any) => b.id === d.no);
    const sumBc = bcs.reduce(
      (acc: number, cur: any) => acc + Number(cur.jumlah || 0),
      0,
    );

    // Mengatasi masalah pembulatan desimal JavaScript
    if (Math.abs(sumBc - Number(d.jumlah)) > 0.01) {
      return toast.error(
        `Total kuantiti barcode untuk item ${d.nama} (${sumBc}) tidak sama dengan jumlah retur (${d.jumlah}).`,
      );
    }
  }

  // Jika lolos validasi, buka modal konfirmasi
  showSaveDialog.value = true;
};

// Menangani event klik "Tutup" pada dialog Print
const onDialogClose = (isOpen: boolean) => {
  if (!isOpen) {
    goBack();
  }
};

const onRollChange = (row: any) => {
  const currentRoll = Number(row.roll) || 1;
  const existingBcs = formData.value.barcodes.filter(
    (b: any) => b.id === row.no,
  );

  if (existingBcs.length === currentRoll) return;

  formData.value.barcodes = formData.value.barcodes.filter(
    (b: any) => b.id !== row.no,
  );

  const yy = formData.value.tanggal.substring(2, 4);
  let startSeq = row.last + 1;

  for (let i = 0; i < currentRoll; i++) {
    formData.value.barcodes.push({
      no: startSeq,
      id: row.no,
      kode: row.kode,
      nama: row.nama,
      barcode: `${row.kode}-${yy}xxxx`,
      jumlah: currentRoll === 1 ? row.jumlah : 0,
    });
    startSeq++;
  }
};

const numFormat = (val: any) =>
  Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
</script>

<template>
  <!-- Komponen BaseForm Baru Anda -->
  <BaseForm
    title="Approve Retur Material"
    menuId="137"
    :icon="IconDiscountCheckFilled"
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
    <!-- ================= KIRI: HEADER ================= -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="text-caption font-weight-bold text-primary mb-2">
          HEADER APPROVE
        </div>

        <v-text-field
          v-model="formData.nomor"
          label="Nomor Approve"
          readonly
          hide-details
          variant="outlined"
          density="compact"
          class="mb-2 bg-grey-lighten-4"
          placeholder="Otomatis (RETP...)"
        />
        <v-text-field
          v-model="formData.proret_log"
          label="Nomor Retur"
          readonly
          hide-details
          variant="outlined"
          density="compact"
          class="mb-2 bg-grey-lighten-4"
        />
        <v-text-field
          v-model="formData.tanggal"
          label="Tgl. Approve"
          type="date"
          hide-details
          variant="outlined"
          density="compact"
          class="mb-2"
        />
        <v-text-field
          v-model="formData.tgl_retur"
          label="Tgl. Retur"
          type="date"
          readonly
          hide-details
          variant="outlined"
          density="compact"
          class="mb-2 bg-grey-lighten-4"
        />
        <v-text-field
          :model-value="`${formData.gudangAsal} - ${formData.namaGudangAsal}`"
          label="Gudang Bahan"
          readonly
          hide-details
          variant="outlined"
          density="compact"
          class="mb-2 bg-grey-lighten-4"
        />
        <v-text-field
          :model-value="`${formData.gudangProduksi} - ${formData.namaGudangProduksi}`"
          label="Gudang Produksi"
          readonly
          hide-details
          variant="outlined"
          density="compact"
          class="mb-2 bg-grey-lighten-4"
        />
        <v-textarea
          v-model="formData.keterangan"
          label="Keterangan"
          readonly
          hide-details
          variant="outlined"
          density="compact"
          rows="3"
          class="bg-grey-lighten-4"
        />
      </div>
    </template>

    <!-- ================= KANAN: DUA GRID TABEL ================= -->
    <template #right-column>
      <div class="d-flex flex-column fill-height gap-3 h-100">
        <!-- TABLE 1: DETAIL BAHAN -->
        <v-card
          border
          flat
          class="d-flex flex-column"
          style="flex: 1; min-height: 200px"
        >
          <div
            class="bg-blue-grey-darken-3 text-white px-3 py-1 font-weight-bold text-caption d-flex align-center"
          >
            <IconListDetails :size="14" :stroke-width="1.7" class="mr-2" />
            Detail Barang Retur
          </div>
          <div class="table-container flex-grow-1">
            <table class="manksi-table">
              <thead>
                <tr>
                  <th width="40">No.</th>
                  <th width="150">No.Permintaan</th>
                  <th width="110">Kode</th>
                  <th>Nama Bahan</th>
                  <th width="60">Satuan</th>
                  <th width="70">Minta</th>
                  <th width="90" class="bg-yellow-darken-2">Jumlah</th>
                  <th width="60" class="bg-yellow-darken-2">Roll</th>
                  <th width="70">Sudah</th>
                  <th width="150" class="bg-yellow-darken-2">Keterangan</th>
                  <th width="130">SPK</th>
                  <th width="80">Kode Sup</th>
                  <th width="150">Nama Supplier</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in formData.details" :key="index">
                  <td class="text-center">{{ Number(index) + 1 }}</td>
                  <td class="bg-grey-lighten-4 px-2">{{ item.nominta }}</td>
                  <td class="bg-grey-lighten-4 px-2">{{ item.kode }}</td>
                  <td
                    class="bg-grey-lighten-4 px-2 text-truncate"
                    style="max-width: 200px"
                  >
                    {{ item.nama }}
                  </td>
                  <td class="text-center bg-grey-lighten-4">
                    {{ item.satuan }}
                  </td>
                  <td class="tr bg-grey-lighten-4 px-2">
                    {{ numFormat(item.minta) }}
                  </td>

                  <!-- Input Kuning -->
                  <td class="bg-yellow-lighten-5">
                    <input
                      type="number"
                      v-model.number="item.jumlah"
                      class="cell-input tr fw-bold"
                      step="any"
                      readonly
                    />
                  </td>
                  <td class="bg-yellow-lighten-5">
                    <input
                      type="number"
                      v-model.number="item.roll"
                      class="cell-input tr fw-bold"
                      @change="onRollChange(item)"
                    />
                  </td>

                  <td class="tr bg-grey-lighten-4 px-2">
                    {{ numFormat(item.sudah) }}
                  </td>
                  <td class="bg-yellow-lighten-5">
                    <input
                      v-model="item.ket"
                      class="cell-input"
                      placeholder="..."
                    />
                  </td>

                  <td class="bg-grey-lighten-4 px-2">{{ item.spk }}</td>
                  <td class="bg-grey-lighten-4 px-2">{{ item.kdsup }}</td>
                  <td
                    class="bg-grey-lighten-4 px-2 text-truncate"
                    style="max-width: 150px"
                  >
                    {{ item.nmsup }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </v-card>

        <!-- TABLE 2: DAFTAR BARCODE (GENERATED) -->
        <v-card
          border
          flat
          class="d-flex flex-column"
          style="flex: 1; min-height: 200px"
        >
          <div
            class="bg-teal-darken-3 text-white px-3 py-1 font-weight-bold text-caption d-flex align-center"
          >
            <IconBarcode :size="14" :stroke-width="1.7" class="mr-2" />
            Rincian Barcode / Roll
          </div>
          <div class="table-container flex-grow-1">
            <table class="manksi-table">
              <thead>
                <tr>
                  <th width="40">ID</th>
                  <th width="120">Kode Bahan</th>
                  <th>Nama Barang</th>
                  <th width="180">Barcode</th>
                  <th width="120" class="bg-yellow-darken-2">Jml Terima</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(bc, index) in formData.barcodes" :key="index">
                  <td class="text-center bg-grey-lighten-4">{{ bc.id }}</td>
                  <td class="bg-grey-lighten-4 px-2">{{ bc.kode }}</td>
                  <td
                    class="bg-grey-lighten-4 px-2 text-truncate"
                    style="max-width: 300px"
                  >
                    {{ bc.nama }}
                  </td>
                  <td class="bg-grey-lighten-4 px-2">{{ bc.barcode }}</td>
                  <td class="bg-yellow-lighten-5">
                    <input
                      type="number"
                      v-model.number="bc.jumlah"
                      class="cell-input tr fw-bold"
                      step="any"
                    />
                  </td>
                </tr>
              </tbody>
              <!-- Footer Summary -->
              <tfoot>
                <tr>
                  <td colspan="4" class="text-right font-weight-bold px-2 py-1">
                    Total Jml Terima:
                  </td>
                  <td
                    class="text-right font-weight-bold px-2 py-1 bg-grey-lighten-3 text-primary"
                  >
                    {{
                      numFormat(
                        formData.barcodes.reduce(
                          (acc: number, cur: any) =>
                            acc + Number(cur.jumlah || 0),
                          0,
                        ),
                      )
                    }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </v-card>
      </div>
    </template>
  </BaseForm>

  <!-- Dialog Cetak -->
  <ApproveReturBarcodeDialog
    v-model="showPrintDialog"
    :nomor="nomorToPrint"
    @update:modelValue="onDialogClose"
  />
</template>

<style scoped>
.gap-3 {
  gap: 12px;
}
.h-100 {
  height: 100%;
}
.table-container {
  overflow: auto;
  background-color: #fff;
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
  height: 26px;
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
}
</style>
