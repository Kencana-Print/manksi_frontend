<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import { useForm } from "@/composables/useForm";
import { useAuthStore } from "@/stores/authStore";
import { IconBox, IconSearch } from "@tabler/icons-vue";
import * as lhkForm from "@/services/spanduk/lhk/lhkKoliFormService";
import type {
  LhkKoliPayload,
  PabrikOption,
  SaveResponse,
} from "@/services/spanduk/lhk/lhkKoliFormService";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const isEditMode = computed(() => !!route.params.nomor);

const formatDateLocal = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const todayLocal = formatDateLocal(new Date());

// ── Model data ──
interface FormRow {
  spk: string;
  nama: string;
  jumlahOrder: number;
  panjang: number;
  lebar: number;
  koli: number | "";
}

interface FormState {
  header: {
    nomor: string;
    tanggal: string;
    kodePabrik: string;
    namaPabrik: string;
  };
  items: FormRow[];
  jmlDiscan: number;
}

const num = (v: unknown) => Number(v) || 0;

const barisKosong = (): FormRow => ({
  spk: "",
  nama: "",
  jumlahOrder: 0,
  panjang: 0,
  lebar: 0,
  koli: "",
});

const defaultData = (): FormState => ({
  header: { nomor: "", tanggal: todayLocal, kodePabrik: "", namaPabrik: "" },
  items: [barisKosong()],
  jmlDiscan: 0,
});

// ── State UI ──
const showSpkModal = ref(false);
const activeIdx = ref(-1);
const showSelesai = ref(false);
const nomorTerakhir = ref("");
const pabrikOpts = ref<PabrikOption[]>([]);

const bangunPayload = (data: FormState): LhkKoliPayload => ({
  Tanggal: data.header.tanggal,
  Kode_Pabrik: data.header.kodePabrik,
  Detail: data.items
    .filter((r) => r.spk.trim() !== "")
    .map((r) => ({ Nomor_SPK: r.spk.trim(), J_Koli: num(r.koli) })),
});

const {
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  executeSave,
  executeCancel,
  executeClose,
  goBack,
} = useForm({
  menuId: "4",
  initialData: defaultData(),
  fetchApi: async (): Promise<FormState> => {
    const d = await lhkForm.getById(String(route.params.nomor));
    const items: FormRow[] = d.Detail.map((r) => ({
      spk: r.Nomor_SPK,
      nama: r.Nama_SPK ?? "",
      jumlahOrder: num(r.Jumlah_Order),
      panjang: num(r.Panjang),
      lebar: num(r.Lebar),
      koli: num(r.J_Koli),
    }));
    return {
      header: {
        nomor: d.Nomor,
        tanggal: d.Tanggal,
        kodePabrik: d.Kode_Pabrik ?? "",
        namaPabrik: d.Nama_Pabrik ?? "",
      },
      items: items.length > 0 ? items : [barisKosong()],
      jmlDiscan: num(d.Jml_Discan),
    };
  },
  submitApi: async (data: FormState): Promise<SaveResponse> => {
    const payload = bangunPayload(data);
    return isEditMode.value
      ? lhkForm.update(String(route.params.nomor), payload)
      : lhkForm.create(payload);
  },
  onSuccess: (response: unknown) => {
    const res = response as SaveResponse;
    const nomor = res.data?.data?.Nomor ?? "";
    nomorTerakhir.value = nomor;
    formData.value.header.nomor = nomor;
    showSelesai.value = true;
  },
  onFormReset: () => {
    isiLokasiDefault();
  },
});

// Koli sudah discan di STBJ: LHK tidak bisa diubah
const terkunci = computed(() => formData.value.jmlDiscan > 0);

// ── Lokasi (pabrik) ──
const opsiPabrik = computed<PabrikOption[]>(() => {
  const h = formData.value.header;
  const ada = pabrikOpts.value.some((p) => p.Kode === h.kodePabrik);
  return h.kodePabrik && !ada
    ? [{ Kode: h.kodePabrik, Nama: h.namaPabrik }, ...pabrikOpts.value]
    : pabrikOpts.value;
});

const onPabrikChange = () => {
  const h = formData.value.header;
  h.namaPabrik =
    pabrikOpts.value.find((p) => p.Kode === h.kodePabrik)?.Nama ?? "";
};

const isiLokasiDefault = () => {
  if (isEditMode.value) {
    return;
  }
  const h = formData.value.header;
  if (h.kodePabrik) {
    return;
  }
  const cabang = (authStore.user?.cabang ?? "").trim().toUpperCase();
  const p = pabrikOpts.value.find((x) => x.Kode.toUpperCase() === cabang);
  if (!p) {
    return;
  }
  h.kodePabrik = p.Kode;
  h.namaPabrik = p.Nama;
};

onMounted(async () => {
  try {
    pabrikOpts.value = await lhkForm.getLookupPabrik();
    isiLokasiDefault();
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat daftar lokasi."));
  }
});

// ── Grid ──
const addRow = () => {
  formData.value.items.push(barisKosong());
};

const removeRow = (idx: number) => {
  formData.value.items.splice(idx, 1);
  if (formData.value.items.length === 0) {
    formData.value.items.push(barisKosong());
  }
};

const openLookupSpk = (idx: number) => {
  activeIdx.value = idx;
  showSpkModal.value = true;
};

const isiBarisDariSpk = async (
  idx: number,
  nomorInput: string,
): Promise<boolean> => {
  const nomor = nomorInput.trim();
  if (idx < 0 || !nomor) {
    return false;
  }
  const dup = formData.value.items.findIndex(
    (r, i) => i !== idx && r.spk.toUpperCase() === nomor.toUpperCase(),
  );
  if (dup >= 0) {
    toast.warning(`SPK sudah ada di baris ${dup + 1}`);
    return false;
  }
  try {
    const info = await lhkForm.getInfoSpk(nomor);
    const row = formData.value.items[idx];
    row.spk = info.Nomor_SPK;
    row.nama = info.Nama_SPK ?? "";
    row.jumlahOrder = num(info.Jumlah_Order);
    row.panjang = num(info.Panjang);
    row.lebar = num(info.Lebar);
    return true;
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat data SPK."));
    return false;
  }
};

// Urutan Enter: SPK → J Koli → SPK baris berikutnya
const fieldRefs = ref<Record<string, HTMLInputElement>>({});

const simpanRef = (el: unknown, kunci: string) => {
  if (el instanceof HTMLInputElement) {
    fieldRefs.value[kunci] = el;
  }
};

const fokusKunci = async (kunci: string) => {
  await nextTick();
  const el = fieldRefs.value[kunci];
  if (el) {
    el.focus();
    el.select();
  }
};

const onEnterKoli = async (idx: number) => {
  if (idx + 1 >= formData.value.items.length) {
    addRow();
  }
  await fokusKunci(`${idx + 1}_spk`);
};

const onSpkSelected = async (v: { Nomor?: string }) => {
  const idx = activeIdx.value;
  if (await isiBarisDariSpk(idx, String(v?.Nomor ?? ""))) {
    await fokusKunci(`${idx}_koli`);
  }
};

const onEnterSpk = async (e: KeyboardEvent, idx: number) => {
  const el = e.target as HTMLInputElement;
  if (!el.value.trim()) {
    return;
  }
  if (await isiBarisDariSpk(idx, el.value)) {
    await fokusKunci(`${idx}_koli`);
  } else {
    el.value = formData.value.items[idx].spk;
    el.select();
  }
};

const onBlurSpk = (e: FocusEvent, idx: number) => {
  (e.target as HTMLInputElement).value = formData.value.items[idx].spk;
};

const totalKoli = computed(() =>
  formData.value.items.reduce((a, r) => a + num(r.koli), 0),
);

// ── Validasi (cermin server) ──
const MAKS_KOLI = 9999;

const validateSave = () => {
  const { tanggal, kodePabrik } = formData.value.header;
  if (terkunci.value) {
    toast.error("LHK tidak bisa diubah: ada koli yang sudah discan di STBJ.");
    return;
  }
  if (!tanggal) {
    toast.warning("Tanggal tidak boleh kosong.");
    return;
  }
  if (!kodePabrik) {
    toast.warning("Lokasi belum dipilih.");
    return;
  }

  const terisi = formData.value.items
    .map((r, i) => ({ r, no: i + 1 }))
    .filter(({ r }) => r.spk.trim() !== "");
  if (terisi.length === 0) {
    toast.warning("Minimal satu baris SPK harus diisi.");
    return;
  }

  const sudah = new Map<string, number>();
  for (const { r, no } of terisi) {
    const kunci = r.spk.trim().toUpperCase();
    const pertama = sudah.get(kunci);
    if (pertama !== undefined) {
      toast.warning(`Baris ${no}: SPK sama dengan baris ${pertama}.`);
      return;
    }
    sudah.set(kunci, no);

    if (r.koli === "" || r.koli === null) {
      toast.warning(`Baris ${no}: J Koli wajib diisi.`);
      return;
    }
    const k = num(r.koli);
    if (!Number.isInteger(k) || k <= 0) {
      toast.warning(`Baris ${no}: J Koli harus bilangan bulat lebih dari 0.`);
      return;
    }
    if (k > MAKS_KOLI) {
      toast.warning(`Baris ${no}: J Koli maksimal ${MAKS_KOLI}.`);
      return;
    }
  }

  showSaveDialog.value = true;
};

// ── Setelah simpan ──
const cetakLabel = () => {
  const url = router.resolve({
    name: "SpandukLhkKoliPrint",
    params: { nomor: nomorTerakhir.value },
  }).href;
  window.open(url, "_blank");
};

const resetBaru = () => {
  showSelesai.value = false;
  if (isEditMode.value) {
    router.replace({ name: "SpandukLhkKoliCreate" });
    return;
  }
  formData.value = defaultData();
  isiLokasiDefault();
};

const tutupSetelahSimpan = () => {
  showSelesai.value = false;
  goBack();
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah LHK Koli' : 'Tambah LHK Koli'"
    menu-id="4"
    :icon="IconBox"
    :is-loading="isLoading"
    :is-saving="isSaving"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ══ KOLOM KIRI ══ -->
    <template #left-column>
      <div class="lhk-left">
        <div class="fr">
          <label class="lbl">Nomor</label>
          <input
            :value="formData.header.nomor"
            readonly
            class="inp ro"
            style="flex: 1"
            placeholder="Otomatis"
          />
        </div>

        <div class="fr">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.header.tanggal"
            class="idate"
            style="width: 150px"
            :disabled="terkunci"
          />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">Lokasi</label>
          <select
            v-model="formData.header.kodePabrik"
            class="inp"
            style="width: 90px"
            :disabled="terkunci"
            @change="onPabrikChange"
          >
            <option value="" disabled>Pilih...</option>
            <option v-for="p in opsiPabrik" :key="p.Kode" :value="p.Kode">
              {{ p.Kode }}
            </option>
          </select>
          <input
            :value="formData.header.namaPabrik"
            readonly
            class="inp ro ml-1"
            style="flex: 1"
          />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">Total Koli</label>
          <input
            :value="totalKoli"
            readonly
            class="inp ro tr"
            style="width: 90px; font-weight: 700"
          />
        </div>

        <div v-if="terkunci" class="warn">
          {{ formData.jmlDiscan }} koli sudah discan di STBJ. LHK tidak bisa
          diubah.
        </div>
        <div v-else class="hint">
          Label QR dicetak per koli setelah LHK disimpan.
        </div>
      </div>
    </template>

    <!-- ══ KOLOM KANAN ══ -->
    <template #right-column>
      <div class="lhk-right">
        <div class="tbl-header">
          <span class="tbl-title">Rincian SPK</span>
          <button
            type="button"
            class="btn-add"
            :disabled="terkunci"
            @click="addRow"
          >
            + Tambah Baris
          </button>
        </div>
        <div class="tbl-wrap" style="flex: 1; min-height: 240px">
          <table class="gt" style="min-width: 900px">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 170px">Nomor SPK</th>
                <th style="width: 280px">Nama Order</th>
                <th style="width: 90px" class="tr">Jml Order</th>
                <th style="width: 80px" class="tr">Panjang</th>
                <th style="width: 80px" class="tr">Lebar</th>
                <th style="width: 90px" class="tr bg-yellow">J Koli</th>
                <th style="width: 32px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in formData.items" :key="idx">
                <td class="tc gt-lbl">{{ idx + 1 }}</td>
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      :value="row.spk"
                      class="ci"
                      :class="{ ro: terkunci }"
                      :readonly="terkunci"
                      placeholder="Ketik nomor + Enter / F1 cari"
                      autocomplete="off"
                      :ref="(el) => simpanRef(el, `${idx}_spk`)"
                      @keydown.enter.prevent="onEnterSpk($event, idx)"
                      @keydown.f1.prevent="openLookupSpk(idx)"
                      @blur="onBlurSpk($event, idx)"
                    />
                    <button
                      type="button"
                      class="ci-btn"
                      title="Cari SPK"
                      :disabled="terkunci"
                      @click="openLookupSpk(idx)"
                    >
                      <IconSearch :size="11" />
                    </button>
                  </div>
                </td>
                <td class="p0">
                  <input
                    :value="row.nama"
                    class="ci ro"
                    readonly
                    :title="row.nama"
                  />
                </td>
                <td class="p0">
                  <input :value="row.jumlahOrder" class="ci tr ro" readonly />
                </td>
                <td class="p0">
                  <input :value="row.panjang" class="ci tr ro" readonly />
                </td>
                <td class="p0">
                  <input :value="row.lebar" class="ci tr ro" readonly />
                </td>
                <td class="p0">
                  <input
                    v-model.number="row.koli"
                    type="number"
                    min="1"
                    max="999"
                    step="1"
                    class="ci tr fw"
                    :class="terkunci ? 'ro' : 'bg-yellow-light'"
                    :readonly="terkunci"
                    :ref="(el) => simpanRef(el, `${idx}_koli`)"
                    @keydown.enter.prevent="onEnterKoli(idx)"
                    v-select-on-focus
                  />
                </td>
                <td class="tc">
                  <button
                    type="button"
                    class="btn-del"
                    :disabled="terkunci"
                    @click="removeRow(idx)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6" class="tr fw">Total</td>
                <td class="tr fw">{{ totalKoli }}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>
  </BaseForm>

  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="lhk-design"
    :divisi="1"
    @selected="onSpkSelected"
  />

  <!-- Setelah simpan -->
  <v-dialog v-model="showSelesai" max-width="420" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconBox class="mr-2" :size="20" />
        <span>Simpan Berhasil</span>
      </v-card-title>
      <v-card-text class="pa-4 text-center">
        <div class="text-body-1 mb-2">
          LHK Koli <b>{{ nomorTerakhir }}</b> telah disimpan.
        </div>
        <div class="text-body-2 text-grey-darken-1 mb-3">
          Cetak label QR sekarang untuk ditempel di tiap koli.
        </div>
        <v-btn color="deep-orange" variant="elevated" @click="cetakLabel">
          Cetak Label QR
        </v-btn>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-btn variant="text" @click="tutupSetelahSimpan">Tutup</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="resetBaru">
          Input Baru
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.lhk-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 0;
  width: 100%;
}
.lhk-right {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
.fr {
  display: flex;
  align-items: center;
  min-height: 24px;
  gap: 4px;
  width: 100%;
}
.lbl {
  width: 80px;
  flex-shrink: 0;
  font-weight: 600;
  color: #333;
  font-size: 11px;
  white-space: nowrap;
}
.sep {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
  width: 100%;
}
.ml-1 {
  margin-left: 4px;
}
.fw {
  font-weight: 700;
}
.tr {
  text-align: right;
}
.tc {
  text-align: center;
}
.hint {
  margin-top: 4px;
  font-size: 10px;
  color: #757575;
}
.warn {
  margin-top: 6px;
  padding: 6px 8px;
  background: #fff3e0;
  border: 1px solid #ffb74d;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #e65100;
}
.inp {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 5px;
  font-size: 11px;
  background: white;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  color: #212121;
  min-width: 0;
}
.inp:focus {
  border-color: #1565c0;
}
.inp:disabled {
  background: #dde8f0;
  color: #444;
}
.ro {
  background: #dde8f0 !important;
  color: #444 !important;
}
.idate {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  outline: none;
  box-sizing: border-box;
}
.idate:focus {
  border-color: #1565c0;
}
.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 5px 10px;
  border-radius: 3px 3px 0 0;
  flex-shrink: 0;
}
.tbl-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.btn-add {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 2px;
}
.btn-add:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}
.btn-add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.tbl-wrap {
  overflow: auto;
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
  border-radius: 0 0 3px 3px;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.gt thead th {
  background: #f0f4f8;
  border: 1px solid #bdbdbd;
  padding: 4px 5px;
  font-size: 10px;
  font-weight: 700;
  color: #37474f;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}
.gt thead th.bg-yellow {
  background: #fff9c4;
}
.gt tbody td {
  border: 1px solid #e8e8e8;
  height: 26px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.gt tbody tr:hover td {
  background: #e3f2fd !important;
}
.gt tfoot td {
  background: #eceff1;
  border: 1px solid #bdbdbd;
  height: 26px;
  padding: 0 6px;
  font-size: 11px;
}
.p0 {
  padding: 0 !important;
}
.gt-lbl {
  background: #f5f5f5 !important;
  color: #555;
  padding: 0 4px;
  font-size: 10px;
}
.ci {
  width: 100%;
  height: 25px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 5px;
  font-family: inherit;
  color: #212121;
}
.ci.ro {
  background: #dde8f0 !important;
}
.ci.bg-yellow-light {
  background: #fffde7 !important;
}
.ci:focus {
  background: #e3f2fd !important;
  outline: 1px solid #1976d2;
  outline-offset: -1px;
}
.ci.tr {
  text-align: right;
}
.ci.fw {
  font-weight: 700;
}
.cell-grp {
  display: flex;
  align-items: center;
  height: 25px;
}
.cell-grp .ci {
  flex: 1;
}
.ci-btn {
  width: 22px;
  flex-shrink: 0;
  background: #eeeeee;
  border: none;
  border-left: 1px solid #e0e0e0;
  cursor: pointer;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ci-btn:hover:not(:disabled) {
  background: #e0e0e0;
}
.ci-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}
.btn-del:hover:not(:disabled) {
  background: #ffebee;
  border-radius: 2px;
}
.btn-del:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
