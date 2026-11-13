<script setup lang="ts">
import { computed } from "vue";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconCashBanknote } from "@tabler/icons-vue";
import {
  pettyCashService,
  type SumberDana,
  type RealisasiPettyCashResult,
} from "@/services/pembelian/pettyCashService";

interface PcRealisasiForm {
  pum_nomor: string;
  pum_tanggal: string;
  pum_keterangan: string;
  pum_user_create: string;
  nominal: number;
  mandiri: boolean;
  boleh_realisasi: boolean;
  validasi_ok: boolean;
  laci_kode: string;
  laci_nama: string;
  saldo_laci: number;
  batas: number;
  sumber_options: SumberDana[];
  aksi: "REALISASI" | "TOLAK";
  alasan: string;
  sumber: string;
  tanggal: string;
}

const toast = useToast();
const pad = (n: number) => String(n).padStart(2, "0");
const now = new Date();
// Tanggal lokal (toISOString memakai UTC dan salah hari pada 00:00–06:59 WIB)
const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const initialData: PcRealisasiForm = {
  pum_nomor: "",
  pum_tanggal: "",
  pum_keterangan: "",
  pum_user_create: "",
  nominal: 0,
  mandiri: false,
  boleh_realisasi: false,
  validasi_ok: false,
  laci_kode: "",
  laci_nama: "",
  saldo_laci: 0,
  batas: 0,
  sumber_options: [],
  aksi: "REALISASI",
  alasan: "",
  sumber: "",
  tanggal: todayStr,
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
} = useForm<PcRealisasiForm>({
  menuId: "973",
  initialData,
  fetchApi: async () => {
    const res = await pettyCashService.getRealisasiDetail(params.nomor);
    const d = res.data;
    return {
      pum_nomor: d.pum_nomor,
      pum_tanggal: d.pum_tanggal,
      pum_keterangan: d.pum_keterangan || "",
      pum_user_create: d.pum_user_create,
      nominal: d.nominal,
      mandiri: d.mandiri,
      boleh_realisasi: d.boleh_realisasi,
      validasi_ok: d.validasi_ok,
      laci_kode: d.laci_kode,
      laci_nama: d.laci_nama,
      saldo_laci: d.saldo_laci,
      batas: d.batas,
      sumber_options: d.sumber_options,
      aksi: "REALISASI",
      alasan: "",
      sumber: d.sumber_default,
      tanggal: todayStr,
    };
  },
  submitApi: (data) =>
    pettyCashService.saveRealisasi(data.pum_nomor, {
      aksi: data.aksi,
      sumber: data.sumber,
      tanggal: data.tanggal,
      alasan: data.alasan,
    }),
  onSuccess: (response: unknown) => {
    const hasil = response as RealisasiPettyCashResult;
    if (hasil?.status === "DITOLAK") {
      toast.success("Petty Cash ditolak.");
    } else {
      toast.success(
        `Petty Cash direalisasi. No. BKK: ${hasil?.transferJurNo ?? "-"}`,
      );
    }
    goBack();
  },
});

const numFmt = (v: number | null | undefined) =>
  v != null ? Number(v).toLocaleString("id-ID") : "0";

const sumberItems = computed(() =>
  formData.value.sumber_options.map((o) => ({
    title: `${o.kode} — ${o.nama}`,
    value: o.kode,
  })),
);
const saldoSetelah = computed(
  () => formData.value.saldo_laci + formData.value.nominal,
);
const melebihiBatas = computed(
  () => formData.value.mandiri && saldoSetelah.value > formData.value.batas,
);

const onValidateSave = () => {
  const f = formData.value;
  if (!f.boleh_realisasi) {
    toast.error("Anda tidak berwenang memproses Petty Cash milik user lain.");
    return;
  }
  if (f.aksi === "TOLAK") {
    if (f.alasan.trim().length < 3) {
      toast.error("Alasan penolakan wajib diisi (min. 3 karakter).");
      return;
    }
  } else {
    if (!f.sumber) {
      toast.error("Pilih account sumber dana.");
      return;
    }
    if (!f.mandiri && !f.validasi_ok) {
      toast.error("Petty Cash ini belum divalidasi.");
      return;
    }
    if (melebihiBatas.value) {
      toast.error(
        "Melebihi batas saldo laci untuk realisasi mandiri. Minta user Finance merealisasi setelah validasi.",
      );
      return;
    }
  }
  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    title="Realisasi Petty Cash"
    menu-id="973"
    :icon="IconCashBanknote"
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
      <div class="desktop-form-section">
        <div class="section-label">Info Pengajuan</div>
        <div class="info-row">
          <span>No. Petty Cash</span
          ><b class="mono">{{ formData.pum_nomor }}</b>
        </div>
        <div class="info-row">
          <span>Tanggal</span><b>{{ formData.pum_tanggal }}</b>
        </div>
        <div class="info-row">
          <span>Diajukan Oleh</span><b>{{ formData.pum_user_create }}</b>
        </div>
        <div class="info-row">
          <span>Nominal</span
          ><b class="text-success">{{ numFmt(formData.nominal) }}</b>
        </div>
        <div class="info-row">
          <span>Keterangan</span><b>{{ formData.pum_keterangan || "-" }}</b>
        </div>
      </div>
    </template>

    <template #right-column>
      <div class="desktop-form-section">
        <div v-if="!formData.boleh_realisasi" class="warn-box mb-3">
          Petty Cash ini milik user lain. Hanya Finance/EDP/Audit yang dapat
          memprosesnya.
        </div>

        <div class="section-label">Keputusan</div>
        <v-radio-group
          v-model="formData.aksi"
          inline
          hide-details
          density="compact"
          class="mb-3"
        >
          <v-radio label="Realisasi" value="REALISASI" />
          <v-radio label="Tolak" value="TOLAK" />
        </v-radio-group>

        <template v-if="formData.aksi === 'REALISASI'">
          <v-select
            v-model="formData.sumber"
            :items="sumberItems"
            item-title="title"
            item-value="value"
            label="Account sumber dana (KAS)"
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details
          />
          <v-text-field
            v-model="formData.tanggal"
            type="date"
            label="Tanggal"
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details
          />
          <div class="laci-info mb-2">
            Laci tujuan:
            <b>{{ formData.laci_kode }} — {{ formData.laci_nama }}</b
            ><br />
            Saldo laci: <b>{{ numFmt(formData.saldo_laci) }}</b> → setelah
            realisasi: <b>{{ numFmt(saldoSetelah) }}</b>
          </div>
          <div v-if="formData.mandiri" class="laci-info mb-2">
            Realisasi mandiri: tanpa validasi dan tanpa konfirmasi terima. Saldo
            laci setelah realisasi maksimal
            {{ numFmt(formData.batas) }}.
          </div>
          <div v-else class="laci-info mb-2">
            Validasi:
            <b :class="formData.validasi_ok ? 'text-success' : 'text-error'">{{
              formData.validasi_ok ? "Sudah divalidasi" : "Belum divalidasi"
            }}</b
            >. Pemilik laci perlu mengonfirmasi penerimaan setelah transfer.
          </div>
          <div v-if="melebihiBatas" class="warn-box">
            Saldo laci setelah realisasi melebihi batas
            {{ numFmt(formData.batas) }}. Realisasi mandiri tidak diizinkan.
          </div>
        </template>

        <v-textarea
          v-else
          v-model="formData.alasan"
          label="Alasan penolakan (wajib)"
          variant="outlined"
          density="compact"
          rows="3"
          hide-details
        />
      </div>
    </template>
  </BaseForm>
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
  gap: 12px;
  padding: 4px 0;
  border-bottom: 1px dashed #e0e0e0;
  font-size: 11px;
}
.mono {
  font-family: monospace;
  font-weight: 600;
}
.laci-info {
  font-size: 11px;
  line-height: 1.6;
  color: #546e7a;
  background: #eceff1;
  border-radius: 4px;
  padding: 6px 8px;
}
.warn-box {
  font-size: 11px;
  background: #fff3e0;
  border: 1px solid #ffcc80;
  border-radius: 4px;
  padding: 8px 10px;
  color: #e65100;
}
</style>
