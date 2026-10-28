<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconCashBanknote, IconSearch, IconTrash } from "@tabler/icons-vue";
import { pesanError } from "@/services/piutang/rekapPembayaranService";
import {
  klaimKasKecilFormService as svc,
  type BkkOption,
  type KlaimDefaults,
  type KlaimPayload,
  type KlaimSaveHasil,
  type RekeningInfo,
} from "@/services/piutang/klaimKasKecilFormService";

interface BarisForm {
  key: number;
  bkk: string;
  bon: string;
  tanggal: string;
  uraian: string;
  nominal: number;
}

interface KlaimForm {
  nomor: string;
  cabang: string;
  tanggal: string;
  keterangan: string;
  status: string;
  jenis: string;
  nomorPjt: string;
  bisaUbah: boolean;
  rekTujuan: RekeningInfo;
  detail: BarisForm[];
}

const route = useRoute();
const toast = useToast();

const nomorEdit = computed(() =>
  typeof route.params.nomor === "string" ? route.params.nomor : "",
);

// ── Helper ──
const pad = (n: number) => String(n).padStart(2, "0");
const hariIni = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fmtTgl = (v: string | null | undefined): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ""));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "-";
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const numFmt = (v: number): string =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(v || 0);

let seq = 0;

const rekKosong = (): RekeningInfo => ({ kode: "", nama: "", rekening: "" });

const buatInitial = (): KlaimForm => ({
  nomor: "",
  cabang: "",
  tanggal: hariIni(),
  keterangan: "",
  status: "AKTIF",
  jenis: "",
  nomorPjt: "",
  bisaUbah: true,
  rekTujuan: rekKosong(),
  detail: [],
});

// ── Rekening default untuk mode Tambah (ditentukan server dari cabang user) ──
const defaults = ref<KlaimDefaults | null>(null);
const defaultsError = ref("");
const rekPilih = ref(""); // kas / ATM yang dipilih (mode Tambah)

const muatDefaults = async (cabang?: string) => {
  defaultsError.value = "";
  try {
    const res = await svc.getDefaults(cabang);
    defaults.value = res.data.data;
    form.value.cabang = res.data.data.cabang;
    rekPilih.value = res.data.data.kasOpsi[0]?.kode ?? "";
  } catch (e) {
    defaults.value = null;
    defaultsError.value = pesanError(
      e,
      "Gagal memuat data rekening klaim untuk cabang Anda.",
    );
  }
};

onMounted(async () => {
  if (nomorEdit.value) return;
  await muatDefaults();
});

// Akses penuh: ganti cabang -> rekening ikut berganti, daftar BKK dikosongkan
const gantiCabang = async (cabang: string) => {
  if (form.value.detail.length) {
    toast.info("Cabang diganti, daftar BKK dikosongkan.");
    form.value.detail = [];
  }
  await muatDefaults(cabang);
};

// Ganti ATM / kas -> daftar BKK dikosongkan (satu klaim = satu kas)
const gantiKas = (kode: string) => {
  if (rekPilih.value === kode) return;
  if (form.value.detail.length) {
    toast.info("Kas diganti, daftar BKK dikosongkan.");
    form.value.detail = [];
  }
  rekPilih.value = kode;
};

// ── useForm ──
const {
  isEditMode,
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData: form,
  goBack,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<KlaimForm>({
  menuId: "971",
  initialData: buatInitial(),
  fetchApi: async (): Promise<KlaimForm> => {
    const res = await svc.getById(nomorEdit.value);
    const d = res.data.data;
    return {
      nomor: d.nomor,
      cabang: d.cabang,
      tanggal: d.tanggal,
      keterangan: d.keterangan,
      status: d.status,
      jenis: d.jenis,
      nomorPjt: d.nomorPjt,
      bisaUbah: d.bisaUbah,
      rekTujuan: d.rekTujuan,
      detail: d.detail.map((r) => ({
        key: ++seq,
        bkk: r.bkk,
        bon: r.bon,
        tanggal: r.tanggal,
        uraian: r.uraian,
        nominal: Number(r.nominal),
      })),
    };
  },
  submitApi: async (data: KlaimForm): Promise<KlaimSaveHasil> => {
    const payload: KlaimPayload = {
      cabang: data.cabang,
      rekTujuan: rekPilih.value,
      tanggal: data.tanggal,
      keterangan: data.keterangan.trim(),
      detail: data.detail.map((b) => ({ bkk: b.bkk })),
    };
    const res = nomorEdit.value
      ? await svc.update(nomorEdit.value, payload)
      : await svc.save(payload);
    return res.data.data;
  },
  onSuccess: (response: unknown) => {
    const hasil = response as KlaimSaveHasil;
    toast.success(
      `Klaim ${hasil.nomor} tersimpan (total ${numFmt(hasil.total)}).`,
    );
    goBack();
  },
});

// Hanya lihat bila tidak boleh diubah, atau data rekening belum termuat (mode Tambah)
const ro = computed(
  () => !form.value.bisaUbah || (!nomorEdit.value && !!defaultsError.value),
);

const tampilTujuan = computed<RekeningInfo>(() =>
  nomorEdit.value
    ? form.value.rekTujuan
    : (defaults.value?.kasOpsi.find((k) => k.kode === rekPilih.value) ??
      rekKosong()),
);

// Mode halaman: ATM (pusat) atau Kas Kecil (cabang), ditentukan server
const isAtm = computed(
  () => (nomorEdit.value ? form.value.jenis : defaults.value?.jenis) === "ATM",
);
const labelJenis = computed(() =>
  isAtm.value ? "Klaim ATM" : "Klaim Kas Kecil",
);
const labelRek = (r: RekeningInfo): string =>
  r.kode ? `${r.kode} - ${r.nama}` : "";

const total = computed(() =>
  round2(form.value.detail.reduce((s, b) => s + b.nominal, 0)),
);

const hapusBaris = (key: number) => {
  form.value.detail = form.value.detail.filter((b) => b.key !== key);
};

// ── Modal Pilih BKK ──
const showPilih = ref(false);
const cari = ref("");
const loadingOpsi = ref(false);
const opsi = ref<BkkOption[]>([]);
const terpilih = ref<string[]>([]);
let opsiReq = 0;

const sudahAda = (o: BkkOption) =>
  form.value.detail.some((b) => b.bkk === o.bkk);

const loadOpsi = async () => {
  const myReq = ++opsiReq;
  loadingOpsi.value = true;
  try {
    const res = await svc.getBkkOptions(
      cari.value.trim(),
      nomorEdit.value,
      form.value.cabang,
      rekPilih.value,
    );
    if (myReq !== opsiReq) return;
    opsi.value = res.data.data ?? [];
    terpilih.value = [];
  } catch (e) {
    if (myReq === opsiReq) {
      toast.error(pesanError(e, "Gagal memuat daftar BKK."));
      opsi.value = [];
    }
  } finally {
    if (myReq === opsiReq) loadingOpsi.value = false;
  }
};

const openPilih = async () => {
  cari.value = "";
  opsi.value = [];
  terpilih.value = [];
  showPilih.value = true;
  await loadOpsi();
};

const selectable = computed(() => opsi.value.filter((o) => !sudahAda(o)));
const allSelected = computed(
  () =>
    selectable.value.length > 0 &&
    selectable.value.every((o) => terpilih.value.includes(o.bkk)),
);
const toggleAll = () => {
  terpilih.value = allSelected.value ? [] : selectable.value.map((o) => o.bkk);
};
const toggleOne = (o: BkkOption) => {
  if (sudahAda(o)) return;
  terpilih.value = terpilih.value.includes(o.bkk)
    ? terpilih.value.filter((x) => x !== o.bkk)
    : [...terpilih.value, o.bkk];
};

const totalTerpilih = computed(() =>
  round2(
    opsi.value
      .filter((o) => terpilih.value.includes(o.bkk))
      .reduce((s, o) => s + o.nominal, 0),
  ),
);

const tambahkanTerpilih = () => {
  const pilih = opsi.value.filter(
    (o) => terpilih.value.includes(o.bkk) && !sudahAda(o),
  );
  if (!pilih.length) {
    toast.warning("Pilih minimal satu BKK.");
    return;
  }
  for (const o of pilih) {
    form.value.detail.push({
      key: ++seq,
      bkk: o.bkk,
      bon: o.bon,
      tanggal: o.tanggal,
      uraian: o.keterangan,
      nominal: o.nominal,
    });
  }
  showPilih.value = false;
  toast.success(`${pilih.length} BKK ditambahkan.`);
};

// ── Validasi (server tetap validasi ulang) ──
const validateSave = () => {
  if (!form.value.bisaUbah) {
    toast.warning("Klaim ini tidak dapat diubah.");
    return;
  }
  if (!nomorEdit.value && defaultsError.value) {
    toast.warning(defaultsError.value);
    return;
  }
  if (!nomorEdit.value && !rekPilih.value) {
    toast.warning("Pilih kas / ATM yang diklaim.");
    return;
  }
  if (!form.value.tanggal) {
    toast.warning("Tanggal klaim belum diisi.");
    return;
  }
  if (!form.value.detail.length) {
    toast.warning("Pilih minimal satu BKK.");
    return;
  }
  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    :title="(isEditMode ? 'Ubah ' : 'Tambah ') + labelJenis"
    menu-id="971"
    :icon="IconCashBanknote"
    :is-loading="isLoading"
    :is-saving="isSaving"
    :item-name="labelJenis"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div v-if="defaultsError && !nomorEdit" class="kk-banner">
          {{ defaultsError }}
        </div>
        <div v-else-if="isEditMode && !form.bisaUbah" class="kk-banner">
          <template v-if="form.status !== 'AKTIF'">
            DIBATALKAN, hanya lihat.
          </template>
          <template v-else-if="form.nomorPjt">
            Sudah dipanggil Pengajuan Transfer {{ form.nomorPjt }}, hanya lihat.
          </template>
          <template v-else>Hanya lihat.</template>
        </div>

        <div class="kk-left">
          <div class="f-field">
            <label class="f-lbl">Nomor</label>
            <input :value="form.nomor || 'Otomatis'" readonly class="f-inp" />
          </div>
          <div
            v-if="!nomorEdit && defaults && defaults.cabangOpsi.length > 0"
            class="f-field"
          >
            <label class="f-lbl">Cabang <span class="req">*</span></label>
            <select
              class="f-inp"
              :value="form.cabang"
              @change="gantiCabang(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="c in defaults.cabangOpsi" :key="c" :value="c">
                {{ c }}
              </option>
            </select>
          </div>
          <div
            v-if="!nomorEdit && defaults && defaults.kasOpsi.length > 1"
            class="f-field"
          >
            <label class="f-lbl">ATM / Kas <span class="req">*</span></label>
            <select
              class="f-inp"
              :value="rekPilih"
              :disabled="ro"
              @change="gantiKas(($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="k in defaults.kasOpsi"
                :key="k.kode"
                :value="k.kode"
              >
                {{ labelRek(k) }}
              </option>
            </select>
          </div>
          <div class="f-field">
            <label class="f-lbl">Tanggal <span class="req">*</span></label>
            <input
              type="date"
              v-model="form.tanggal"
              class="f-inp"
              :disabled="ro"
            />
          </div>

          <div class="f-field">
            <label class="f-lbl">{{
              isAtm ? "ATM yang diisi" : "Rekening Tujuan (kas kecil)"
            }}</label>
            <input :value="labelRek(tampilTujuan)" readonly class="f-inp" />
            <div v-if="tampilTujuan.rekening" class="f-sub">
              No. Rek: {{ tampilTujuan.rekening }}
            </div>
          </div>
          <div class="f-field">
            <label class="f-lbl">Keterangan</label>
            <textarea
              v-model="form.keterangan"
              class="f-inp f-area"
              rows="3"
              maxlength="250"
              placeholder="Keterangan klaim"
              :disabled="ro"
            />
          </div>

          <div class="kk-ringkas">
            <div class="kk-ringkas-row">
              <span>Jumlah BKK</span><b>{{ form.detail.length }}</b>
            </div>
            <div class="kk-ringkas-row kk-ringkas-total">
              <span>Total Klaim</span><b>{{ numFmt(total) }}</b>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #right-column>
      <div class="kk-toolbar">
        <v-btn v-if="!ro" size="small" color="primary" @click="openPilih">
          <template #prepend><IconSearch :size="14" /></template>
          Pilih BKK
        </v-btn>
        <template v-if="isAtm">
          BKK/BBK diklaim utuh. Hanya pengeluaran dari ATM ini yang belum
          diklaim yang bisa dipilih.
        </template>
        <template v-else>
          BKK diklaim utuh. Hanya BKK penyelesaian kas yang sudah selesai dan
          belum diklaim yang bisa dipilih.
        </template>
      </div>

      <div class="kk-table-wrap">
        <table class="kk-table">
          <thead>
            <tr>
              <th style="width: 40px" class="text-center">No</th>
              <th style="width: 160px">No. BKK</th>
              <th style="width: 160px">No. Kasbon</th>
              <th style="width: 100px" class="text-center">Tanggal</th>
              <th style="min-width: 240px">Uraian</th>
              <th style="width: 130px" class="text-right">Nominal</th>
              <th style="width: 36px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, i) in form.detail" :key="b.key">
              <td class="td-ctr">{{ i + 1 }}</td>
              <td class="td-txt">{{ b.bkk }}</td>
              <td class="td-txt">{{ b.bon }}</td>
              <td class="td-ctr">{{ fmtTgl(b.tanggal) }}</td>
              <td class="td-txt">{{ b.uraian }}</td>
              <td class="td-txt tr">{{ numFmt(b.nominal) }}</td>
              <td class="td-ctr">
                <button
                  v-if="!ro"
                  type="button"
                  class="btn-del"
                  @click="hapusBaris(b.key)"
                >
                  <IconTrash :size="14" />
                </button>
              </td>
            </tr>
            <tr v-if="!form.detail.length">
              <td colspan="7" class="text-center text-grey py-4 font-italic">
                Belum ada BKK. Klik "Pilih BKK" untuk memilih BKK yang diklaim.
              </td>
            </tr>
          </tbody>
          <tfoot v-if="form.detail.length">
            <tr class="foot-row">
              <td colspan="5" class="tr">TOTAL</td>
              <td class="tr">{{ numFmt(total) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </BaseForm>

  <!-- Dialog Pilih BKK -->
  <v-dialog v-model="showPilih" max-width="1100px" scrollable>
    <v-card class="rounded-lg">
      <v-card-title class="pa-3 text-subtitle-1 text-white bg-primary">
        Pilih BKK yang Diklaim
      </v-card-title>
      <v-card-text class="pa-3">
        <div class="pilih-filter">
          <div class="f-field" style="flex: 1; min-width: 260px">
            <label class="f-lbl"
              >Cari (No. BKK / Kasbon / Penerima / Ket.)</label
            >
            <input
              v-model="cari"
              class="f-inp"
              placeholder="Ketik lalu Enter"
              @keydown.enter.prevent="loadOpsi"
            />
          </div>
          <v-btn
            size="small"
            color="primary"
            variant="tonal"
            :loading="loadingOpsi"
            @click="loadOpsi"
            >Cari</v-btn
          >
        </div>

        <div style="max-height: 400px; overflow-y: auto; margin-top: 10px">
          <div v-if="loadingOpsi" class="text-center py-4 text-grey">
            Memuat...
          </div>
          <table v-else class="mini-table">
            <thead>
              <tr>
                <th style="width: 32px" class="text-center">
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    :disabled="!selectable.length"
                    @change="toggleAll"
                  />
                </th>
                <th style="width: 160px">No. BKK</th>
                <th style="width: 160px">No. Kasbon</th>
                <th style="width: 100px">Tanggal</th>
                <th style="width: 140px">Penerima</th>
                <th>Keterangan</th>
                <th style="width: 120px" class="text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="o in opsi"
                :key="o.bkk"
                class="mini-row"
                :class="{
                  'mini-row--selected': terpilih.includes(o.bkk),
                  'mini-row--used': sudahAda(o),
                }"
                @click="toggleOne(o)"
              >
                <td class="text-center">
                  <input
                    type="checkbox"
                    :checked="terpilih.includes(o.bkk)"
                    :disabled="sudahAda(o)"
                    @click.stop
                    @change="toggleOne(o)"
                  />
                </td>
                <td>{{ o.bkk }}</td>
                <td>{{ o.bon }}</td>
                <td>{{ fmtTgl(o.tanggal) }}</td>
                <td>{{ o.penerima }}</td>
                <td>{{ o.keterangan }}</td>
                <td class="text-right">{{ numFmt(o.nominal) }}</td>
              </tr>
              <tr v-if="!opsi.length">
                <td colspan="7" class="text-center text-grey py-3">
                  Tidak ada BKK yang memenuhi syarat klaim
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <span class="text-caption text-grey-darken-1">
          {{ terpilih.length }} BKK dipilih, total {{ numFmt(totalTerpilih) }}
        </span>
        <v-spacer />
        <v-btn variant="text" color="grey-darken-1" @click="showPilih = false"
          >Batal</v-btn
        >
        <v-btn
          variant="flat"
          color="primary"
          :disabled="!terpilih.length"
          @click="tambahkanTerpilih"
        >
          Tambahkan ({{ terpilih.length }})
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.kk-banner {
  background: #c62828;
  color: white;
  font-weight: 700;
  font-size: 11px;
  text-align: center;
  border-radius: 6px;
  padding: 6px 10px;
  margin-bottom: 10px;
}
.f-field {
  min-width: 0;
}
.f-lbl {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  margin-bottom: 3px;
}
.f-sub {
  font-size: 10px;
  color: #757575;
  margin-top: 2px;
}
.req {
  color: #e53935;
}
.f-inp {
  width: 100%;
  height: 30px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 8px;
  font-size: 11px;
  outline: none;
  background: white;
  box-sizing: border-box;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-inp:disabled,
.f-inp:read-only {
  background: #f5f5f5;
  color: #616161;
}
.f-area {
  height: auto;
  padding: 6px 8px;
  resize: vertical;
  font-family: inherit;
}
.kk-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.kk-ringkas {
  border-top: 1px solid #e0e0e0;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
}
.kk-ringkas-row {
  display: flex;
  justify-content: space-between;
  color: #424242;
}
.kk-ringkas-total {
  margin-top: 4px;
  padding: 6px 8px;
  background: #1565c0;
  color: white;
  border-radius: 4px;
  font-size: 12px;
}
.kk-ringkas-total b {
  color: #90caf9;
}
.kk-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex: none;
}
.kk-hint {
  font-size: 10px;
  color: #757575;
}
.kk-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  background: white;
}
.kk-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}
.kk-table thead th {
  background: #1565c0;
  color: white;
  font-weight: 600;
  padding: 5px;
  position: sticky;
  top: 0;
  font-size: 11px;
  border: 1px solid #0d47a1;
  white-space: nowrap;
  z-index: 1;
}
.kk-table td {
  border: 1px solid #eeeeee;
}
.kk-table .foot-row td {
  background: #eceff1;
  font-weight: 700;
  font-size: 11px;
  padding: 5px 8px;
}
.td-ctr {
  text-align: center;
  padding: 3px 5px;
  white-space: nowrap;
  font-size: 11px;
}
.td-txt {
  padding: 3px 6px;
  font-size: 11px;
}
.tr {
  text-align: right;
}
.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 2px;
}
.btn-del:hover {
  background: #ffebee;
  border-radius: 3px;
}
.pilih-filter {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}
.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.mini-table th {
  background: #f5f5f5;
  padding: 6px 8px;
  text-align: left;
  border-bottom: 2px solid #e0e0e0;
  font-size: 11px;
  font-weight: 700;
  position: sticky;
  top: 0;
  white-space: nowrap;
}
.mini-table td {
  padding: 5px 8px;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}
.mini-row {
  cursor: pointer;
}
.mini-row:hover td,
.mini-row--selected td {
  background: #e3f2fd;
}
.mini-row--used {
  cursor: not-allowed;
  opacity: 0.45;
}
.mini-row--used:hover td {
  background: transparent;
}
.mini-table input[type="checkbox"] {
  accent-color: #1565c0;
  cursor: pointer;
}
</style>
