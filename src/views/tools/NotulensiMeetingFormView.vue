<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { useForm } from "@/composables/useForm";
import BaseForm from "@/components/BaseForm.vue";
import { IconNotes, IconTrash, IconPlus, IconLock } from "@tabler/icons-vue";
import {
  notulensiMeetingFormService,
  STATUS_USER_OPTIONS,
  STATUS_SISTEM_OPTIONS,
  type NotulensiSavePayload,
  type NotulensiStatusRow,
} from "@/services/tools/notulensiMeetingFormService";

interface BarisForm {
  noUrut?: number;
  hasil: string;
  pic: string;
  deadline: string;
  statusUser: string;
  statusSistem: string;
}

const route = useRoute();
const toast = useToast();

const isEdit = computed(() => !!route.params.nomor);
const nomorParam = computed(() => String(route.params.nomor || ""));

// ─── Helpers ──────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const barisBaru = (): BarisForm => ({
  hasil: "",
  pic: "",
  deadline: "",
  statusUser: "OPEN",
  statusSistem: "OPEN",
});

const emptyData = {
  nomor: "",
  tanggal: toLocalDate(new Date()),
  agenda: "",
  lokasi: "",
  peserta: "",
  pembuat: "",
  bisaUbah: true,
  detail: [] as BarisForm[],
};

// ─── Form ─────────────────────────────────────────────────
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
  menuId: "1328",
  initialData: emptyData,
  fetchApi: async () => {
    const res = await notulensiMeetingFormService.getById(nomorParam.value);
    const d = res.data.data;
    return {
      nomor: d.nomor,
      tanggal: d.tanggal,
      agenda: d.agenda,
      lokasi: d.lokasi,
      peserta: d.peserta,
      pembuat: d.pembuat,
      bisaUbah: d.bisaUbah,
      detail: d.detail.map((r) => ({
        noUrut: r.noUrut,
        hasil: r.hasil,
        pic: r.pic,
        deadline: r.deadline ?? "",
        statusUser: r.statusUser,
        statusSistem: r.statusSistem,
      })),
    };
  },
  submitApi: (payload) => {
    // Bukan pembuat/superadmin: hanya kolom Status yang dikirim (PATCH)
    if (isEdit.value && !payload.bisaUbah) {
      const detail: NotulensiStatusRow[] = [];
      payload.detail.forEach((r) => {
        if (r.noUrut !== undefined) {
          detail.push({
            noUrut: r.noUrut,
            statusUser: r.statusUser,
            statusSistem: r.statusSistem,
          });
        }
      });
      return notulensiMeetingFormService.updateStatus(nomorParam.value, {
        detail,
      });
    }

    const body: NotulensiSavePayload = {
      tanggal: payload.tanggal,
      agenda: payload.agenda.trim(),
      peserta: payload.peserta.trim(),
      lokasi: payload.lokasi.trim(),
      detail: payload.detail
        .filter((r) => r.hasil.trim() || r.pic.trim() || r.deadline)
        .map((r) => ({
          hasil: r.hasil.trim(),
          pic: r.pic.trim(),
          deadline: r.deadline,
          statusUser: r.statusUser,
          statusSistem: r.statusSistem,
        })),
    };
    return isEdit.value
      ? notulensiMeetingFormService.update(nomorParam.value, body)
      : notulensiMeetingFormService.create(body);
  },
  onSuccess: (response) => {
    const msg = (response as { data?: { message?: string } })?.data?.message;
    toast.success(msg || "Notulensi berhasil disimpan.");
    goBack();
  },
});

// Mode "status saja": mode ubah oleh user yang BUKAN pembuat/superadmin.
const statusSaja = computed(() => isEdit.value && !formData.value.bisaUbah);

// ─── Trailing row: selalu ada 1 baris kosong di bawah ─────
watch(
  () => formData.value.detail,
  (rows) => {
    if (statusSaja.value) return;
    if (!rows.length || rows[rows.length - 1].hasil.trim()) {
      rows.push(barisBaru());
    }
  },
  { deep: true, immediate: true },
);

const tambahBaris = () => {
  formData.value.detail.push(barisBaru());
};

const hapusBaris = (idx: number) => {
  formData.value.detail.splice(idx, 1);
};

// ─── Penanda terlambat (bukan status; tidak disimpan) ─────
const terlambat = (r: BarisForm): boolean =>
  !!r.deadline &&
  r.deadline < toLocalDate(new Date()) &&
  r.statusUser !== "DONE" &&
  r.statusUser !== "BATAL";

// ─── PIC: tersimpan sebagai teks "A, B"; di UI jadi chips ──
const picList = (pic: string): string[] =>
  pic
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const setPic = (r: BarisForm, v: unknown) => {
  const arr = Array.isArray(v) ? v : [];
  r.pic = arr
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
};

// ─── Lookup PIC (saran dari tuser.user_bagian; tetap boleh teks bebas) ──
const listBagian = ref<string[]>([]);
onMounted(async () => {
  try {
    const res = await notulensiMeetingFormService.getLookupBagian();
    listBagian.value = res.data.data ?? [];
  } catch {
    // saran PIC bersifat opsional; gagal memuat tidak menghalangi pengisian
  }
});

// ─── Validasi (mencerminkan validasi server) ──────────────
const validateSave = () => {
  if (!canSave.value) return toast.error("Hak akses simpan ditolak.");

  // Mode status saja: isi notulensi tidak diubah, tidak perlu validasi isi
  if (statusSaja.value) {
    showSaveDialog.value = true;
    return;
  }

  if (!formData.value.tanggal) {
    return toast.warning("Tanggal meeting wajib diisi.");
  }
  if (!formData.value.agenda.trim()) {
    return toast.warning("Agenda meeting wajib diisi.");
  }
  if (!formData.value.lokasi.trim()) {
    return toast.warning("Lokasi meeting wajib diisi.");
  }
  const rows = formData.value.detail;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.hasil.trim() && (r.pic.trim() || r.deadline)) {
      return toast.warning(`Hasil/tindak lanjut baris ${i + 1} wajib diisi.`);
    }
    if (r.pic.length > 200) {
      return toast.warning(`PIC baris ${i + 1} maksimal 200 karakter.`);
    }
  }
  if (!rows.some((r) => r.hasil.trim())) {
    return toast.warning("Minimal satu hasil/tindak lanjut harus diisi.");
  }
  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    :title="(isEdit ? 'Ubah' : 'Baru') + ' Notulensi Meeting'"
    menuId="1328"
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
    <div class="ntm-layout">
      <div v-if="statusSaja" class="ntm-alert">
        <IconLock :size="13" class="mr-1" />
        Anda bukan pembuat dokumen ini. Hanya kolom Status User dan Status
        Sistem yang dapat diubah.
      </div>

      <!-- ─── Header ─── -->
      <div class="ntm-header-card">
        <div class="ntm-col">
          <div class="sec-title">Info Meeting</div>
          <div class="f-row">
            <label class="f-lbl">Nomor</label>
            <input
              :value="formData.nomor"
              readonly
              class="f-inp f-ro"
              style="width: 170px"
            />
            <span
              v-if="!isEdit"
              class="text-error font-italic font-weight-bold ml-2"
              style="font-size: 10px"
            >
              &lt;-- Kosong=Baru
            </span>
          </div>
          <div class="f-row">
            <label class="f-lbl">Tanggal</label>
            <input
              type="date"
              v-model="formData.tanggal"
              class="f-date"
              :disabled="statusSaja"
              style="width: 130px"
            />
          </div>
          <div class="f-row">
            <label class="f-lbl">Lokasi</label>
            <input
              type="text"
              v-model="formData.lokasi"
              class="f-inp"
              :disabled="statusSaja"
              maxlength="100"
              style="flex: 1"
            />
          </div>
        </div>

        <div class="ntm-divider" />

        <div class="ntm-col">
          <div class="sec-title">Agenda &amp; Peserta</div>
          <div class="f-row">
            <label class="f-lbl">Agenda</label>
            <input
              type="text"
              v-model="formData.agenda"
              class="f-inp"
              :disabled="statusSaja"
              maxlength="200"
              style="flex: 1"
            />
          </div>
          <div class="f-row" style="align-items: flex-start">
            <label class="f-lbl" style="padding-top: 4px">Peserta</label>
            <textarea
              v-model="formData.peserta"
              class="f-inp f-ta"
              :disabled="statusSaja"
              rows="3"
              placeholder="Pisahkan dengan koma"
              style="flex: 1"
            />
          </div>
        </div>
      </div>

      <!-- ─── Detail ─── -->
      <div class="ntm-detail-section">
        <div class="sec-header">
          <span class="sec-title" style="color: #1565c0"
            >Hasil / Tindak Lanjut</span
          >
          <v-btn
            v-if="!statusSaja"
            size="x-small"
            color="primary"
            variant="tonal"
            @click="tambahBaris"
          >
            <template #prepend><IconPlus :size="13" /></template>
            Tambah Baris
          </v-btn>
        </div>
        <div class="grid-scroll">
          <table class="grid-table">
            <thead>
              <tr>
                <th style="width: 36px">No</th>
                <th style="min-width: 380px">Hasil / Tindak Lanjut</th>
                <th
                  style="width: 220px"
                  title="Pilih dari daftar bagian atau ketik manual"
                >
                  PIC
                </th>
                <th style="width: 140px">Deadline</th>
                <th style="width: 110px">Status User</th>
                <th style="width: 110px">Status Sistem</th>
                <th style="width: 36px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, idx) in formData.detail" :key="idx">
                <td class="tc bg-grey-lighten-4">{{ idx + 1 }}</td>
                <td>
                  <textarea
                    v-model="r.hasil"
                    class="gi gi-ta"
                    :disabled="statusSaja"
                    rows="2"
                  />
                </td>
                <td style="padding: 0">
                  <v-combobox
                    :model-value="picList(r.pic)"
                    :items="listBagian"
                    :disabled="statusSaja"
                    multiple
                    chips
                    closable-chips
                    density="compact"
                    variant="plain"
                    hide-details
                    class="pic-combo"
                    placeholder="Pilih / ketik PIC"
                    @update:model-value="setPic(r, $event)"
                  />
                </td>
                <td>
                  <input
                    type="date"
                    v-model="r.deadline"
                    class="gi"
                    :disabled="statusSaja"
                  />
                  <div v-if="terlambat(r)" class="late-tag">TERLAMBAT</div>
                </td>
                <td style="padding: 0">
                  <select
                    v-model="r.statusUser"
                    class="gi"
                    style="cursor: pointer"
                  >
                    <option
                      v-for="s in STATUS_USER_OPTIONS"
                      :key="s"
                      :value="s"
                    >
                      {{ s }}
                    </option>
                  </select>
                </td>
                <td style="padding: 0">
                  <select
                    v-model="r.statusSistem"
                    class="gi"
                    style="cursor: pointer"
                  >
                    <option
                      v-for="s in STATUS_SISTEM_OPTIONS"
                      :key="s"
                      :value="s"
                    >
                      {{ s }}
                    </option>
                  </select>
                </td>
                <td class="tc">
                  <button
                    v-if="!statusSaja"
                    type="button"
                    class="btn-gi-del"
                    @click="hapusBaris(idx)"
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
</template>

<style scoped>
.ntm-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 8px;
  padding: 10px;
  overflow: hidden;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}

.ntm-alert {
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

.ntm-header-card {
  display: flex;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.ntm-col {
  flex: 1;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}
.ntm-divider {
  width: 1px;
  background: #e0e0e0;
  margin: 8px 0;
}

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
  min-height: 34px;
}

.f-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
}
.f-lbl {
  width: 70px;
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
.f-ta {
  height: auto;
  padding: 4px 6px;
  resize: vertical;
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
.f-inp:disabled,
.f-date:disabled {
  background: #f0f0f0;
  color: #616161;
  cursor: not-allowed;
}

.ntm-detail-section {
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
.grid-scroll {
  overflow: auto;
}
.grid-table {
  width: 100%;
  border-collapse: collapse;
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
  text-align: left;
  white-space: nowrap;
}
.grid-table tbody td {
  border-bottom: 1px solid #eeeeee;
  border-right: 1px solid #f0f0f0;
  padding: 0;
  vertical-align: middle;
}
.grid-table tbody tr:nth-of-type(even) td {
  background-color: rgba(0, 0, 0, 0.015);
}
.grid-table tbody tr:hover td {
  background-color: #e8f5e9 !important;
}

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
.gi-ta {
  height: auto;
  min-height: 40px;
  padding: 4px 6px;
  resize: vertical;
  display: block;
}
.gi:focus {
  background: #e3f2fd !important;
  box-shadow: inset 0 0 0 1.5px #1976d2;
}
.gi:disabled {
  background: #f5f5f5;
  color: #616161;
  cursor: not-allowed;
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
  min-height: 25px;
}
.btn-gi-del:hover {
  background: #ffebee;
}
.tc {
  text-align: center;
}

.pic-combo {
  font-size: 11px;
}
.pic-combo :deep(.v-field__input) {
  min-height: 32px;
  padding: 2px 6px;
  font-size: 11px;
}
.pic-combo :deep(.v-chip) {
  font-size: 10px;
  height: 20px;
}

.late-tag {
  color: #c62828;
  font-size: 9px;
  font-weight: 800;
  padding: 0 6px 2px;
  letter-spacing: 0.04em;
}
</style>
