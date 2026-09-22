<script setup lang="ts">
import { ref, computed } from "vue";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { uangMukaRealisasiService } from "@/services/pembelian/uangMukaRealisasiService";
import NumberInputIDR from "@/components/NumberInputIDR.vue";
import AccountSearchModal from "@/components/lookups/AccountSearchModal.vue";
// import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import {
  IconCash,
  IconSearch,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-vue";

interface RealisasiDetail {
  pumd_id: number | null;
  sumber: string;
  nomor_header: string;
  item_nourut: number | null;
  pmt_nomor: string | null;
  keterangan: string;
  nama: string;
  satuan: string;
  qty: number;
  nominal_sumber: number;
  nominal_ajuan: number;
  nominal_acc: number;
  status_acc: "ACC" | "TOLAK";
  locked: boolean;
  kdsup: string;
  supplier: string;
  bank: string;
  rekening: string;
  atasnama: string;
}

interface RealisasiFormData {
  pum_nomor: string;
  pum_cabang: string;
  jenis: "KAS" | "BANK";
  rek_kode: string;
  rek_nama: string;
  tanggal: string;
  nota: string;
  penerima: string;
  keterangan: string;
  detail: RealisasiDetail[];
}

const toast = useToast();
const todayStr = new Date().toISOString().slice(0, 10);

const initialData: RealisasiFormData = {
  pum_nomor: "",
  pum_cabang: "",
  jenis: "KAS",
  rek_kode: "",
  rek_nama: "",
  tanggal: todayStr,
  nota: "",
  penerima: "",
  keterangan: "",
  detail: [],
};

const {
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  goBack,
  executeSave,
  executeCancel,
  executeClose,
  params,
} = useForm<RealisasiFormData>({
  menuId: "315",
  initialData,
  fetchApi: async () => {
    const res = await uangMukaRealisasiService.getDetail(params.nomor);
    const d = res.data;

    // Cabang HO- disamakan dengan P01 untuk keperluan default rekening/kas
    const effectiveCabang = d.pum_cabang === "HO-" ? "P01" : d.pum_cabang;
    let defaultRekKode = "";
    let defaultRekNama = "";
    try {
      const accRes = await uangMukaRealisasiService.getAccountOptions(
        "KAS",
        effectiveCabang,
      );
      // Toleran terhadap dua kemungkinan bentuk response: array mentah
      // (res.json(rows)) atau dibungkus { success, data } — tergantung
      // pola controller yang dipakai.
      const body = accRes.data;
      const accounts = Array.isArray(body) ? body : (body?.data ?? []);
      if (accounts.length > 0) {
        defaultRekKode = accounts[0].kode;
        defaultRekNama = accounts[0].nama;
      }
    } catch (e) {
      console.error("Gagal memuat default rekening/kas:", e);
    }

    return {
      pum_nomor: d.pum_nomor,
      pum_cabang: d.pum_cabang,
      jenis: "KAS",
      rek_kode: defaultRekKode,
      rek_nama: defaultRekNama,
      tanggal: todayStr,
      nota: d.pum_nota || "",
      penerima: d.pum_user_create || "",
      keterangan: d.pum_keterangan || "",
      detail: d.detail.map((r: any) => ({
        ...r,
        status_acc: "ACC",
        nominal_acc: Number(r.nominal_ajuan),
      })),
    };
  },
  submitApi: (data) =>
    uangMukaRealisasiService.saveRealisasi(data.pum_nomor, {
      jenis: data.jenis,
      rek_kode: data.rek_kode,
      tanggal: data.tanggal,
      nota: data.nota,
      penerima: data.penerima,
      keterangan: data.keterangan,
      detail: data.detail,
    }),
  onSuccess: (response: any) => {
    toast.success(`Realisasi berhasil. No. Bon: ${response?.bonNomor ?? "-"}`);
    window.open(
      `/pembelian/uang-muka/print/${encodeURIComponent(formData.value.pum_nomor)}`,
      "_blank",
    );
    goBack();
  },
});

const numFmt = (v: any) =>
  v != null ? Number(v).toLocaleString("id-ID") : "0";
const sumberLabel = (v: string) => {
  if (v === "PENGAJUAN_DANA") return "Pengajuan Dana";
  if (v === "KASBON") return "Kasbon";
  return "Permintaan Pembelian";
};
const totalAcc = computed(() =>
  formData.value.detail
    .filter((d) => d.status_acc === "ACC")
    .reduce((s, d) => s + Number(d.nominal_acc || 0), 0),
);

const toggleAcc = (row: RealisasiDetail, val: "ACC" | "TOLAK") => {
  if (row.locked) return;
  row.status_acc = val;
  if (val === "TOLAK") row.nominal_acc = 0;
  else if (!row.nominal_acc) row.nominal_acc = row.nominal_ajuan;
};

const showItemDetail = ref(false);

const kasbonRow = computed(() =>
  formData.value.detail.find((d) => d.sumber === "KASBON"),
);
const itemRows = computed(() =>
  formData.value.detail.filter((d) => d.sumber !== "KASBON"),
);

// ── Account lookup (Rekening/Kas) ──
const showAccountModal = ref(false);
const onAccountSelected = (item: any) => {
  formData.value.rek_kode = item.Kode;
  formData.value.rek_nama = item.Nama;
};

// // ── Supplier lookup per baris ──
// const showSupplierModal = ref(false);
// const activeSupplierRowIndex = ref<number | null>(null);

// const openSupplierModal = (index: number) => {
//   activeSupplierRowIndex.value = index;
//   showSupplierModal.value = true;
// };

// const onSupplierSelected = (item: any) => {
//   if (activeSupplierRowIndex.value === null) return;
//   const row = formData.value.detail[activeSupplierRowIndex.value];
//   row.kdsup = item.Kode;
//   row.supplier = item.Nama;
//   row.bank = item.Bank || "";
//   row.rekening = item.Rekening || "";
//   row.atasnama = item.AtasNama || "";
// };

const onValidateSave = () => {
  if (!formData.value.rek_kode) {
    toast.error("Pilih rekening/kas terlebih dahulu.");
    return;
  }
  if (!formData.value.detail.some((d) => d.status_acc === "ACC")) {
    toast.error("Minimal 1 baris harus ACC.");
    return;
  }
  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    title="Realisasi Uang Muka"
    menu-id="315"
    :icon="IconCash"
    :is-loading="isLoading"
    :is-saving="isSaving"
    :item-name="formData.pum_nomor"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="onValidateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="section-label">Info Pengajuan</div>
        <div class="info-row">
          <span>No. PUM</span><b class="mono">{{ formData.pum_nomor }}</b>
        </div>
        <div class="info-row">
          <span>Cabang</span><b>{{ formData.pum_cabang }}</b>
        </div>
        <div class="info-row">
          <span>Total Realisasi</span
          ><b class="text-success">{{ numFmt(totalAcc) }}</b>
        </div>
      </div>

      <div class="desktop-form-section">
        <div class="section-label">Data Bon</div>
        <v-select
          v-model="formData.jenis"
          :items="['KAS', 'BANK']"
          label="Jenis"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
        />

        <div class="lookup-field mb-3">
          <label class="lookup-label">Rekening/Kas</label>
          <div class="lookup-input-wrap" @click="showAccountModal = true">
            <span :class="{ 'text-grey': !formData.rek_kode }">
              {{
                formData.rek_kode
                  ? `${formData.rek_kode} — ${formData.rek_nama}`
                  : "Pilih rekening/kas..."
              }}
            </span>
            <IconSearch :size="15" :stroke-width="1.7" />
          </div>
        </div>

        <v-text-field
          v-model="formData.tanggal"
          type="date"
          label="Tanggal"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
        />
        <!-- <v-text-field
          :model-value="formData.nota || '-'"
          label="No. Nota"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
          readonly
        /> -->
        <v-text-field
          v-model="formData.penerima"
          label="Penerima"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
        />
        <v-textarea
          v-model="formData.keterangan"
          label="Keterangan"
          variant="outlined"
          density="compact"
          rows="2"
          hide-details
        />
      </div>
    </template>

    <template #right-column>
      <div class="desktop-form-section">
        <div class="section-label">Rincian Item</div>
        <table class="rl-table">
          <thead>
            <tr>
              <th style="width: 30px"></th>
              <th>Sumber</th>
              <th>Nomor</th>
              <th>Item</th>
              <th class="tr">Nominal Sumber</th>
              <th class="tc">ACC</th>
              <th class="tc">Tolak</th>
              <th class="tr">Nominal ACC</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="kasbonRow" class="row-kasbon">
              <td class="tc">
                <button
                  type="button"
                  class="expand-btn"
                  @click="showItemDetail = !showItemDetail"
                >
                  <IconChevronDown v-if="showItemDetail" :size="14" />
                  <IconChevronRight v-else :size="14" />
                </button>
              </td>
              <td>{{ sumberLabel(kasbonRow.sumber) }}</td>
              <td class="mono">{{ kasbonRow.nomor_header }}</td>
              <td>{{ kasbonRow.nama }}</td>
              <td class="tr">{{ numFmt(kasbonRow.nominal_ajuan) }}</td>
              <td class="tc">
                <input
                  type="checkbox"
                  :checked="kasbonRow.status_acc === 'ACC'"
                  @change="toggleAcc(kasbonRow, 'ACC')"
                />
              </td>
              <td class="tc">
                <input
                  type="checkbox"
                  :checked="kasbonRow.status_acc === 'TOLAK'"
                  @change="toggleAcc(kasbonRow, 'TOLAK')"
                />
              </td>
              <td>
                <NumberInputIDR
                  v-model="kasbonRow.nominal_acc"
                  :disabled="kasbonRow.status_acc === 'TOLAK'"
                  cursor-to-end
                />
              </td>
            </tr>
            <template v-if="showItemDetail">
              <tr
                v-for="(d, i) in itemRows"
                :key="d.pumd_id ?? i"
                class="row-locked row-detail"
              >
                <td class="tc"></td>
                <td>{{ sumberLabel(d.sumber) }}</td>
                <td class="mono">{{ d.nomor_header }}</td>
                <td>{{ d.nama }}</td>
                <td class="tr">{{ numFmt(d.nominal_sumber) }}</td>
                <td class="tc"><input type="checkbox" checked disabled /></td>
                <td class="tc"><input type="checkbox" disabled /></td>
                <td class="tr">-</td>
              </tr>
            </template>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="7" class="tr fw">Total Nominal Realisasi</td>
              <td class="fw">{{ numFmt(totalAcc) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </BaseForm>

  <AccountSearchModal
    v-model="showAccountModal"
    :jenis="formData.jenis"
    @selected="onAccountSelected"
  />
</template>

<style scoped>
.section-label {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 10px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px dashed #e0e0e0;
}
.mono {
  font-family: monospace;
  font-weight: 600;
}

.lookup-field {
  display: flex;
  flex-direction: column;
}
.lookup-label {
  font-size: 10px;
  color: #666;
  margin-bottom: 4px;
}
.lookup-input-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 12px;
  background: white;
}
.lookup-input-wrap:hover {
  border-color: #1565c0;
}

.rl-lookup-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: #1565c0;
  font-family: monospace;
  font-weight: 600;
}
.rl-lookup-cell.disabled {
  cursor: default;
  color: #999;
}

.rl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.rl-table thead th {
  background: #37474f;
  color: white;
  padding: 6px 8px;
  text-align: left;
  font-weight: 700;
  white-space: nowrap;
}
.rl-table thead th.tr {
  text-align: right;
}
.rl-table thead th.tc {
  text-align: center;
}
.rl-table tbody td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
}
.rl-table tfoot td {
  padding: 8px;
  border-top: 2px solid #b0bec5;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.fw {
  font-weight: 700;
}
.row-locked {
  background: #fafafa;
  color: #9e9e9e;
}
.row-locked input[type="checkbox"] {
  cursor: not-allowed;
}
.row-kasbon {
  background: #e3f2fd;
  font-weight: 700;
}
.expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #1565c0;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.expand-btn:hover {
  color: #0d47a1;
}
.row-detail td {
  padding-left: 20px;
  font-size: 11px;
}
</style>
