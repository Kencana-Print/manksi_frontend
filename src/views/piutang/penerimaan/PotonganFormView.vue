<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import { potonganFormService } from "@/services/piutang/penerimaan/potonganFormService";
import api from "@/services/api";
import BaseForm from "@/components/BaseForm.vue";

// Lookups Components
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import AccountSearchModal from "@/components/lookups/AccountSearchModal.vue";
import CustomerSearchModal from "@/components/lookups/CustomerSearchModal.vue";

import {
  IconScissors,
  IconSearch,
  IconTrash,
  IconLock,
  IconAlertCircle,
} from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEdit = computed(() => !!route.params.nomor);
const nomorParam = computed(() =>
  route.params.nomor ? decodeURIComponent(route.params.nomor as string) : "",
);

const showPerushModal = ref(false);
const showRekeningModal = ref(false);
const showCustModal = ref(false);
const activeCustRowIndex = ref<number>(-1);
const isOpeningModal = ref(false);

// ── F1 handlers ──
const onPerushF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    if (!isEdit.value) showPerushModal.value = true;
  }
};

const onRekeningF1 = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    showRekeningModal.value = true;
  }
};

const onCustRowF1 = (e: KeyboardEvent, idx: number) => {
  if (e.key === "F1") {
    e.preventDefault();
    openCustModal(idx);
  }
};

const onPerushKodeEnter = async () => {
  if (isOpeningModal.value) return;
  const kode = formData.value.cabang?.trim();
  if (!kode) {
    formData.value.namaPerusahaan = "";
    return;
  }
  try {
    const res = await api.get("/lookups/perusahaan", {
      params: { q: kode, limit: 1 },
    });
    const items = res.data.data?.items || res.data.data || [];
    const exact = items.find(
      (p: any) =>
        (p.perush_kode || p.Kode || "").toUpperCase() === kode.toUpperCase(),
    );
    if (exact) {
      handlePerushSelected(exact);
    } else {
      toast.error("Kode perusahaan tidak ditemukan.");
      formData.value.cabang = "";
      formData.value.namaPerusahaan = "";
    }
  } catch {
    toast.error("Gagal memvalidasi kode perusahaan.");
  }
};

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const initialData = {
  nomor: "",
  kodeBayar: "PT", // Default Potongan
  cabang: "",
  namaPerusahaan: "",
  tanggal: formatDateLocal(new Date()),
  tanggalLama: "",
  tanggalTempo: formatDateLocal(new Date()),
  account: "",
  rekKode: "",
  namaAccount: "",
  debet: 0,
  notes: "",
  dtlCustomer: [] as any[],
  pin_status: "",
  isTutupBuku: false,
};

const {
  formData,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  executeSave,
  executeCancel,
  executeClose,
} = useForm({
  menuId: "254",
  initialData,
  fetchApi: async () => {
    const res = await potonganFormService.getDetail(nomorParam.value);
    const d = res.data.data;
    const h = d.header;

    return {
      nomor: h.nomor,
      kodeBayar: h.kode || "PT",
      cabang: h.cabang || "",
      namaPerusahaan: h.perush_nama || "",
      tanggal: formatDateLocal(h.tanggal),
      tanggalLama: formatDateLocal(h.tanggal),
      tanggalTempo: formatDateLocal(h.tanggal_tempo),
      account: h.account || "",
      rekKode: h.tb_rek_kode || "",
      namaAccount: h.rek_nama || "",
      debet: Number(h.debet) || 0,
      notes: h.notes || "",
      pin_status: h.pin_status || "",
      isTutupBuku: Boolean(h.is_tutup_buku),
      dtlCustomer: d.dtlCustomer || [],
    };
  },
  submitApi: async (payload) => {
    const body = { ...payload, isEdit: isEdit.value };
    return potonganFormService.saveData(body);
  },
  onSuccess: () => {
    toast.success("Penerimaan Potongan berhasil disimpan.");
    router.push("/piutang/penerimaan/potongan");
  },
});

const isFormLocked = computed(() => {
  if (!isEdit.value) return false;
  return formData.value.isTutupBuku && formData.value.pin_status !== "ACC";
});

// --- LOGIKA GRID AUTOMATIC TRAILING ROW ---
const addRowCustomer = () => {
  formData.value.dtlCustomer.push({
    kode: "",
    nama: "",
    alamat: "",
    kota: "",
  });
};

const removeRowCustomer = (index: number) => {
  formData.value.dtlCustomer.splice(index, 1);
};

watch(
  () => formData.value.dtlCustomer,
  (newRows) => {
    if (!newRows || newRows.length === 0) {
      addRowCustomer();
      return;
    }
    const lastRow = newRows[newRows.length - 1];
    if (lastRow.kode || lastRow.nama) {
      addRowCustomer();
    }
  },
  { deep: true, immediate: true },
);

// --- VALIDASI KETIK MANUAL KODE CUSTOMER ---
const validateCustomerKode = async (idx: number) => {
  if (isOpeningModal.value) return;

  const row = formData.value.dtlCustomer[idx];
  const kode = row.kode?.trim();

  if (!kode) {
    row.nama = "";
    row.alamat = "";
    row.kota = "";
    return;
  }

  try {
    const res = await api.get("/lookups/customer", {
      params: { q: kode, limit: 1 },
    });

    const items = res.data.data.items || res.data.data || [];
    const exact = items.find(
      (c: any) =>
        (c.cus_kode || c.Kode || "").toUpperCase() === kode.toUpperCase(),
    );

    if (exact) {
      const aktif = exact.cus_aktif ?? exact.Aktif ?? 0;
      if (aktif === 1 || aktif === "1" || aktif === "N") {
        toast.warning("Status Customer Pasif.");
        row.kode = "";
        row.nama = "";
        row.alamat = "";
        row.kota = "";
        return;
      }

      row.kode = exact.cus_kode || exact.Kode;
      row.nama = exact.cus_nama || exact.Nama;
      row.alamat = exact.cus_alamat || exact.Alamat || "";
      row.kota = exact.cus_kota || exact.Kota || "";
    } else {
      toast.error("Kode customer tidak ditemukan.");
      row.nama = "";
      row.alamat = "";
      row.kota = "";
    }
  } catch (error) {
    toast.error("Gagal memvalidasi kode customer.");
  }
};

// --- HANDLER LOOKUPS ---
const handlePerushSelected = (item: any) => {
  formData.value.cabang = item.Kode || item.perush_kode;
  formData.value.namaPerusahaan = item.Nama || item.perush_nama;
};

const handleRekeningSelected = (item: any) => {
  formData.value.rekKode = item.Kode || item.rek_kode;
  formData.value.namaAccount = item.Nama || item.rek_nama;
  formData.value.account = item.Rekening || item.rek_rekening;
};

const openCustModal = (index: number) => {
  activeCustRowIndex.value = index;
  showCustModal.value = true;
};

const handleCustSelected = (item: any) => {
  const idx = activeCustRowIndex.value;
  if (idx > -1 && formData.value.dtlCustomer[idx]) {
    const targetRow = formData.value.dtlCustomer[idx];
    targetRow.kode = item.Kode || item.cus_kode;
    targetRow.nama = item.Nama || item.cus_nama;
    targetRow.alamat = item.Alamat || item.cus_alamat;
    targetRow.kota = item.Kota || item.cus_kota;
  }
};

const validateBeforeSave = () => {
  if (Number(formData.value.debet || 0) === 0)
    return toast.warning("Nilai Potongan tidak boleh 0.");
  if (!formData.value.cabang)
    return toast.warning("Perusahaan/Cabang wajib diisi.");
  if (!formData.value.rekKode)
    return toast.warning("Account Bank/Rekening wajib diisi.");

  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    :title="(isEdit ? 'Ubah' : 'Tambah') + ' Penerimaan Potongan'"
    menuId="254"
    :icon="IconScissors"
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
    <div
      class="giro-layout"
      :style="isFormLocked ? 'pointer-events:none; opacity:0.8' : ''"
    >
      <div v-if="isFormLocked" class="giro-alert">
        <IconLock :size="13" class="mr-1" />
        Transaksi sudah diclose. Menunggu ACC PIN untuk membuka perubahan data.
      </div>

      <div class="giro-grid-form">
        <div class="desktop-form-section header-section">
          <div class="sec-title">Informasi Potongan</div>

          <div class="f-row">
            <label class="f-lbl">Kode Bayar</label>
            <input
              type="text"
              :value="formData.kodeBayar"
              readonly
              class="f-inp f-ro"
              style="width: 50px"
            />
            <input
              type="text"
              value="POTONGAN"
              readonly
              class="f-inp f-ro flex-1"
            />
          </div>

          <div class="f-row">
            <label class="f-lbl">Nomor Transaksi</label>
            <input
              type="text"
              :value="formData.nomor"
              readonly
              class="f-inp f-ro"
              style="width: 200px"
              :placeholder="!isEdit ? 'Baru = Nomor Otomatis' : ''"
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
            <label class="f-lbl">Perusahaan</label>
            <div class="inp-grp flex-1">
              <input
                type="text"
                v-model="formData.cabang"
                class="f-inp"
                style="
                  width: 60px;
                  flex: none;
                  background: #ddeeff;
                  font-weight: 600;
                  text-transform: uppercase;
                "
                :readonly="isEdit"
                :class="{ 'f-ro': isEdit }"
                placeholder="Kode"
                @keydown="onPerushF1"
                @keydown.enter.prevent="onPerushKodeEnter"
                @blur="onPerushKodeEnter"
              />
              <input
                type="text"
                :value="formData.namaPerusahaan"
                readonly
                class="f-inp f-ro flex-1"
                placeholder="Nama Perusahaan..."
              />
              <button
                type="button"
                class="btn-lkp"
                :disabled="isEdit"
                title="Cari Perusahaan (F1)"
                @mousedown.prevent="
                  isOpeningModal = true;
                  showPerushModal = true;
                "
                @click="isOpeningModal = false"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
          </div>

          <div class="f-row">
            <label class="f-lbl">Tanggal</label>
            <input
              type="date"
              v-model="formData.tanggal"
              class="f-date"
              style="width: 140px"
            />

            <IconAlertCircle
              v-if="formData.isTutupBuku"
              :size="18"
              color="#d32f2f"
              class="ml-1"
              style="cursor: help"
              title="Sudah close, silahkan ajukan untuk bisa perubahan data"
            />

            <label class="f-lbl ml-4" style="width: 80px">Tgl. Tempo</label>
            <input
              type="date"
              v-model="formData.tanggalTempo"
              class="f-date"
              style="width: 140px"
            />
          </div>

          <div class="f-row">
            <label class="f-lbl">Account</label>
            <div class="inp-grp flex-1">
              <input
                type="text"
                v-model="formData.rekKode"
                readonly
                class="f-inp f-ro"
                style="width: 70px; flex: none"
                placeholder="Kode"
              />
              <input
                type="text"
                :value="formData.namaAccount"
                readonly
                class="f-inp f-ro flex-1"
                placeholder="Klik atau F1 untuk cari..."
                style="cursor: pointer"
                @click="showRekeningModal = true"
              />
              <button
                type="button"
                class="btn-lkp"
                title="Cari Account (F1)"
                tabindex="0"
                @click="showRekeningModal = true"
                @keydown="onRekeningF1"
              >
                <IconSearch :size="13" color="#1565c0" />
              </button>
            </div>
          </div>

          <div class="f-row">
            <label class="f-lbl">No. Rekening</label>
            <input
              type="text"
              :value="formData.account"
              readonly
              class="f-inp f-ro flex-1"
            />
          </div>

          <div class="f-row">
            <label class="f-lbl">Nilai Potongan</label>
            <div class="f-inp flex-1" style="padding: 0">
              <NumberInputIDR v-model="formData.debet" placeholder="0" />
            </div>
          </div>

          <div class="f-row">
            <label class="f-lbl">Notes</label>
            <input
              type="text"
              v-model="formData.notes"
              class="f-inp flex-1"
              placeholder="Catatan penerimaan..."
            />
          </div>
        </div>

        <div class="desktop-form-section">
          <div class="sec-title" style="color: #2e7d32">Alokasi Customer</div>

          <div class="grid-scroll">
            <table class="grid-table">
              <thead>
                <tr>
                  <th style="width: 35px" class="tc">No</th>
                  <th style="width: 120px">Kode Customer</th>
                  <th>Nama Customer</th>
                  <th>Alamat</th>
                  <th style="width: 120px">Kota</th>
                  <th style="width: 36px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in formData.dtlCustomer" :key="idx">
                  <td class="tc bg-grey-lighten-4 text-grey">
                    {{ Number(idx) + 1 }}
                  </td>
                  <td>
                    <div class="gi-group">
                      <input
                        type="text"
                        v-model="row.kode"
                        class="gi text-uppercase"
                        placeholder="F1 / kode + Enter"
                        @keydown="onCustRowF1($event, Number(idx))"
                        @keydown.enter.prevent="
                          validateCustomerKode(Number(idx))
                        "
                        @blur="validateCustomerKode(Number(idx))"
                      />
                      <button
                        type="button"
                        class="btn-gi-search"
                        title="Cari Customer (F1)"
                        @mousedown.prevent="
                          isOpeningModal = true;
                          openCustModal(Number(idx));
                        "
                        @click="isOpeningModal = false"
                      >
                        <IconSearch :size="12" color="white" />
                      </button>
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      :value="row.nama"
                      readonly
                      class="gi gi-ro"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      :value="row.alamat"
                      readonly
                      class="gi gi-ro"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      :value="row.kota"
                      readonly
                      class="gi gi-ro"
                    />
                  </td>
                  <td class="tc">
                    <button
                      v-if="Number(idx) < formData.dtlCustomer.length - 1"
                      type="button"
                      class="btn-gi-del"
                      @click="removeRowCustomer(Number(idx))"
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
    </div>
  </BaseForm>

  <PerusahaanSearchModal
    v-model="showPerushModal"
    @selected="handlePerushSelected"
  />
  <AccountSearchModal
    v-model="showRekeningModal"
    @selected="handleRekeningSelected"
  />
  <CustomerSearchModal v-model="showCustModal" @selected="handleCustSelected" />
</template>

<style scoped>
.giro-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 8px;
  padding: 10px;
  overflow: hidden;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
}
.giro-alert {
  display: flex;
  align-items: center;
  background: #fff8e1;
  color: #f57f17;
  border: 1px solid #ffe082;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}
.giro-grid-form {
  display: grid;
  grid-template-columns: 460px 1fr;
  gap: 12px;
  flex: 1;
  min-height: 0;
}
.desktop-form-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sec-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1565c0;
  margin-bottom: 10px;
  flex-shrink: 0;
}

/* Row Styling with Hide Details Padding Zero */
.f-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
  min-height: 26px;
}
.f-lbl {
  width: 90px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
  box-sizing: border-box;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-ro {
  background: #f5f5f5 !important;
  color: #555;
}
.f-date {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 12px;
}

.inp-grp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
  align-items: stretch;
}
.inp-grp .f-inp {
  border: none;
  height: 100%;
  min-width: 0;
}
.btn-lkp {
  width: 28px;
  min-width: 28px;
  height: 100%;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.btn-lkp:hover:not(:disabled) {
  background: #bbdefb;
}
.btn-lkp:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.45;
}

/* Grid Table */
.grid-scroll {
  overflow: auto;
  flex: 1;
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
  padding: 6px 8px;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}
.grid-table tbody td {
  padding: 2px;
  border-bottom: 1px solid #eeeeee;
  height: 28px;
  vertical-align: middle;
}
.gi {
  width: 100%;
  height: 24px;
  border: none;
  background: transparent;
  padding: 0 6px;
  outline: none;
  font-size: 11px;
}
.gi:focus {
  background: #e3f2fd !important;
}
.gi-ro {
  background: #fafafa !important;
  color: #424242;
}
.gi-group {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #ccc;
  border-radius: 2px;
}
.gi-group .gi {
  border: none;
}
.btn-gi-search {
  background: #1565c0;
  color: white;
  border: none;
  width: 22px;
  height: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-gi-del {
  color: #c62828;
  background: transparent;
  border: none;
  cursor: pointer;
}
.tc {
  text-align: center;
}
.ml-4 {
  margin-left: 16px;
}
.flex-1 {
  flex: 1;
  min-width: 0;
}
</style>
