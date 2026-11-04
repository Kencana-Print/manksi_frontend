<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import { IconScissors, IconSearch } from "@tabler/icons-vue";
import { pesanError } from "@/services/piutang/rekapPembayaranService";
import {
  permintaanMarkerFormService,
  type BahanMkb,
  type PermintaanMarkerLoaded,
  type PermintaanMarkerPayload,
  type SettingBahan,
} from "@/services/garmen/permintaanMarkerFormService";

interface MarkerRow {
  spkNomor: string;
  spkNama: string;
  kode: string;
  namaBahan: string;
  satuan: string;
  setting: string;
  jml: number | null;
  alasan: string;
}

interface MarkerHeader {
  nomor: string;
  tanggal: string;
  deadline: string;
  keterangan: string;
  asalNomor: string;
  status: string;
  statusManual: string;
  statusKeterangan: string;
  bisaUbah: boolean;
}

interface MarkerFormData {
  header: MarkerHeader;
  dtl: MarkerRow[];
}

interface BahanItem {
  Kode: string;
  Nama: string;
  Satuan: string;
}

interface SpkItem {
  Nomor: string;
  Nama?: string;
}

const route = useRoute();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);
const asalQuery = computed(() =>
  typeof route.query.asal === "string" ? route.query.asal : "",
);
const isRevisi = computed(() => !isEditMode.value && !!asalQuery.value);

const todayLocal = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
})();

const newRow = (): MarkerRow => ({
  spkNomor: "",
  spkNama: "",
  kode: "",
  namaBahan: "",
  satuan: "",
  setting: "",
  jml: null,
  alasan: "",
});

const isBlank = (r: MarkerRow): boolean =>
  !r.spkNomor && !r.kode && !(Number(r.jml) > 0) && !r.alasan.trim();

const defaultData: MarkerFormData = {
  header: {
    nomor: "",
    tanggal: todayLocal,
    deadline: todayLocal,
    keterangan: "",
    asalNomor: "",
    status: "OPEN",
    statusManual: "",
    statusKeterangan: "",
    bisaUbah: true,
  },
  dtl: [newRow()],
};

const toRows = (d: PermintaanMarkerLoaded): MarkerRow[] =>
  d.detail.map((x) => ({
    spkNomor: x.spkNomor,
    spkNama: x.spkNama ?? "",
    kode: x.kode,
    namaBahan: x.namaBahan,
    satuan: x.satuan,
    setting: x.setting,
    jml: Number(x.jml),
    alasan: x.alasan,
  }));

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
} = useForm<MarkerFormData>({
  menuId: "189",
  initialData: defaultData,
  fetchApi: async (): Promise<MarkerFormData> => {
    const res = await permintaanMarkerFormService.getDetail(
      String(route.params.nomor),
    );
    const d = res.data.data as PermintaanMarkerLoaded;
    return {
      header: {
        nomor: d.nomor,
        tanggal: d.tanggal,
        deadline: d.deadline,
        keterangan: d.keterangan,
        asalNomor: d.asalNomor ?? "",
        status: d.status,
        statusManual: d.statusManual,
        statusKeterangan: d.statusKeterangan,
        bisaUbah: d.bisaUbah,
      },
      dtl: toRows(d).length ? toRows(d) : [newRow()],
    };
  },
  submitApi: async (data: MarkerFormData): Promise<unknown> => {
    const payload: PermintaanMarkerPayload = {
      tanggal: data.header.tanggal,
      deadline: data.header.deadline,
      keterangan: data.header.keterangan,
      asalNomor: data.header.asalNomor,
      detail: data.dtl
        .filter((r) => !isBlank(r))
        .map((r) => ({
          spkNomor: r.spkNomor,
          kode: r.kode,
          setting: rapikanSetting(r.setting),
          jml: Number(r.jml) || 0,
          alasan: r.alasan.trim(),
        })),
    };
    return isEditMode.value
      ? await permintaanMarkerFormService.update(data.header.nomor, payload)
      : await permintaanMarkerFormService.save(payload);
  },
  onSuccess: () => {
    toast.success("Permintaan Marker tersimpan.");
    goBack();
  },
});

// ── Lookup: setting master + bahan MKB per SPK (cache) ──
const settingList = ref<SettingBahan[]>([]);
const mkbCache = ref<Record<string, BahanMkb[]>>({});

const muatSetting = async () => {
  try {
    const res = await permintaanMarkerFormService.getSetting();
    settingList.value = res.data.data ?? [];
  } catch (e) {
    toast.error(pesanError(e, "Gagal memuat daftar setting."));
  }
};

const muatMkb = async (spk: string) => {
  if (!spk || spk in mkbCache.value) return;
  try {
    const res = await permintaanMarkerFormService.getBahanMkb(spk);
    const list = res.data.data ?? [];
    mkbCache.value[spk] = list;
    if (list.length === 0) {
      toast.warning(
        `SPK ${spk} belum punya MKB. Pilih bahan manual lewat tombol cari.`,
        { timeout: 6000 },
      );
    }
  } catch (e) {
    toast.error(pesanError(e, `Gagal memuat bahan MKB SPK ${spk}.`));
  }
};

// Muat bahan MKB untuk setiap SPK yang muncul di detail (edit, revisi, atau pilih manual)
watch(
  () =>
    [...new Set(formData.value.dtl.map((r) => r.spkNomor).filter(Boolean))]
      .sort()
      .join("|"),
  async (key) => {
    for (const spk of key ? key.split("|") : []) {
      await muatMkb(spk);
    }
  },
  { immediate: true },
);

const opsiBahan = (row: MarkerRow): BahanMkb[] => {
  const list = mkbCache.value[row.spkNomor] ?? [];
  if (row.kode && !list.some((b) => b.kode === row.kode)) {
    return [
      ...list,
      {
        kode: row.kode,
        nama: row.namaBahan,
        satuan: row.satuan,
        setting: row.setting,
      },
    ];
  }
  return list;
};

// Saran setting: default dari MKB bahan itu lebih dulu, lalu master; teks bebas tetap boleh
const saranSetting = (row: MarkerRow): string[] => {
  const hasil: string[] = [];
  const dariMkb = (mkbCache.value[row.spkNomor] ?? []).find(
    (b) => b.kode === row.kode,
  )?.setting;
  if (dariMkb) hasil.push(dariMkb);
  for (const s of settingList.value) {
    if (!hasil.includes(s.nama)) hasil.push(s.nama);
  }
  return hasil;
};

// Hanya spasi yang dirapikan; huruf besar/kecil tidak diubah
const rapikanSetting = (v: string): string => v.trim().replace(/\s+/g, " ");

// Di luar MKB hanya dinilai bila SPK punya MKB (dan sudah termuat)
const luarMkb = (row: MarkerRow): boolean => {
  if (!row.kode || !row.spkNomor) return false;
  const list = mkbCache.value[row.spkNomor];
  if (!list || list.length === 0) return false;
  return !list.some((b) => b.kode === row.kode);
};

const spkTanpaMkb = (row: MarkerRow): boolean =>
  !!row.spkNomor && mkbCache.value[row.spkNomor]?.length === 0;

// ── Aksi baris ──
const editable = computed(() =>
  isEditMode.value ? formData.value.header.bisaUbah : true,
);

const addRow = () => {
  formData.value.dtl.push(newRow());
};

const removeRow = (idx: number) => {
  if (formData.value.dtl.length <= 1) {
    formData.value.dtl[0] = newRow();
    return;
  }
  formData.value.dtl.splice(idx, 1);
};

const showSpkModal = ref(false);
const showBahanModal = ref(false);
const modalIdx = ref(0);

const openSpk = (idx: number) => {
  modalIdx.value = idx;
  showSpkModal.value = true;
};

const onSpkSelected = (item: SpkItem) => {
  const row = formData.value.dtl[modalIdx.value];
  if (!row) return;
  row.spkNomor = item.Nomor;
  row.spkNama = item.Nama ?? "";
};

const openBahan = (idx: number) => {
  if (!formData.value.dtl[idx]?.spkNomor) {
    toast.warning("Pilih SPK terlebih dahulu.");
    return;
  }
  modalIdx.value = idx;
  showBahanModal.value = true;
};

// Pilih dari daftar MKB: nama, satuan, dan setting default ikut terisi
const onPilihBahan = (row: MarkerRow) => {
  const b = (mkbCache.value[row.spkNomor] ?? []).find(
    (x) => x.kode === row.kode,
  );
  if (!b) return;
  row.namaBahan = b.nama;
  row.satuan = b.satuan;
  row.setting = b.setting;
};

// Cari bahan lain (di luar MKB): default setting diambil dari server
const onBahanDariModal = async (item: BahanItem) => {
  const row = formData.value.dtl[modalIdx.value];
  if (!row) return;
  try {
    const res = await permintaanMarkerFormService.getBahanInfo(
      item.Kode,
      row.spkNomor,
    );
    const info = res.data.data;
    if (!info) return;
    row.kode = info.kode;
    row.namaBahan = info.nama;
    row.satuan = info.satuan;
    row.setting = info.setting;
    if (!info.diMkb && (mkbCache.value[row.spkNomor]?.length ?? 0) > 0) {
      toast.warning(
        `Bahan ${info.kode} tidak ada di MKB SPK ${row.spkNomor}. Alasan wajib diisi.`,
      );
    }
  } catch (e) {
    toast.error(pesanError(e, "Gagal mengambil data bahan."));
  }
};

const onEnterNext = (e: KeyboardEvent) => {
  const target = e.target as HTMLInputElement | HTMLSelectElement;
  const table = target.closest("table");
  if (!table) return;
  const fields = Array.from(
    table.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "input:not([readonly]):not([disabled]), select:not([disabled])",
    ),
  );
  const next = fields[fields.indexOf(target) + 1];
  if (!next) return;
  next.focus();
  if (next instanceof HTMLInputElement) next.select();
};

// ── Ringkasan ──
const rowsTerisi = computed(() =>
  formData.value.dtl.filter((r) => !isBlank(r)),
);
const totalJml = computed(() =>
  rowsTerisi.value.reduce((s, r) => s + (Number(r.jml) || 0), 0),
);
const jmlSpk = computed(
  () => new Set(rowsTerisi.value.map((r) => r.spkNomor).filter(Boolean)).size,
);

// ── Validasi (cermin aturan server; server tetap penentu) ──
const validateSave = () => {
  const h = formData.value.header;
  if (isEditMode.value && !h.bisaUbah) {
    return toast.warning("Permintaan ini tidak dapat diubah.");
  }
  if (!h.tanggal) return toast.warning("Tanggal wajib diisi.");
  if (!h.deadline) return toast.warning("Deadline wajib diisi.");
  if (h.deadline < h.tanggal) {
    return toast.warning("Deadline tidak boleh lebih awal dari tanggal.");
  }
  if (rowsTerisi.value.length === 0) {
    return toast.warning("Minimal satu baris detail harus diisi.");
  }

  const seen = new Set<string>();
  for (const [i, r] of rowsTerisi.value.entries()) {
    const no = i + 1;
    if (!r.spkNomor) return toast.warning(`Baris ${no}: SPK wajib diisi.`);
    if (!r.kode) return toast.warning(`Baris ${no}: bahan wajib diisi.`);
    if (!r.setting) return toast.warning(`Baris ${no}: setting wajib diisi.`);
    const jml = Number(r.jml);
    if (!Number.isInteger(jml) || jml <= 0) {
      return toast.warning(
        `Baris ${no}: jumlah marker harus bilangan bulat di atas 0.`,
      );
    }
    if (luarMkb(r) && !r.alasan.trim()) {
      return toast.warning(
        `Baris ${no}: bahan di luar MKB, alasan wajib diisi.`,
      );
    }
    const key = `${r.spkNomor}|${r.kode}|${rapikanSetting(r.setting).toUpperCase()}`;
    if (seen.has(key)) {
      return toast.warning(
        `Baris ${no}: SPK, bahan, dan setting yang sama sudah ada.`,
      );
    }
    seen.add(key);
  }
  showSaveDialog.value = true;
};

// ── Init ──
onMounted(async () => {
  await muatSetting();
  if (!isRevisi.value) return;

  // Revisi: isi form dari permintaan asal; yang lama otomatis CANCEL saat disimpan
  try {
    const res = await permintaanMarkerFormService.getDetail(asalQuery.value);
    const d = res.data.data as PermintaanMarkerLoaded;
    if (d.statusManual === "CANCEL" || d.penggantiNomor) {
      toast.error("Permintaan ini sudah dibatalkan atau sudah direvisi.");
      goBack();
      return;
    }
    formData.value.header.asalNomor = d.nomor;
    formData.value.header.deadline = d.deadline;
    formData.value.header.keterangan = d.keterangan;
    formData.value.dtl = toRows(d).length ? toRows(d) : [newRow()];
  } catch (e) {
    toast.error(pesanError(e, "Gagal memuat permintaan asal."));
    goBack();
  }
});

const statusClass = (s: string) => `st-${s}`;
</script>

<template>
  <BaseForm
    :title="
      isEditMode
        ? 'Ubah Permintaan Marker'
        : isRevisi
          ? 'Revisi Permintaan Marker'
          : 'Tambah Permintaan Marker'
    "
    menu-id="189"
    item-name="Permintaan Marker"
    :icon="IconScissors"
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
    <!-- ══ KOLOM KIRI: HEADER ══ -->
    <template #left-column>
      <div class="pm-left">
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
        <div v-if="isEditMode" class="fr">
          <label class="lbl">Status</label>
          <span
            class="status-chip"
            :class="statusClass(formData.header.status)"
          >
            {{ formData.header.status }}
          </span>
        </div>
        <div class="fr">
          <label class="lbl fw">Tanggal</label>
          <input
            type="date"
            v-model="formData.header.tanggal"
            class="idate"
            style="width: 150px"
            :disabled="!editable"
          />
        </div>
        <div class="fr">
          <label class="lbl fw text-primary">Deadline</label>
          <input
            type="date"
            v-model="formData.header.deadline"
            class="idate"
            style="width: 150px"
            :disabled="!editable"
          />
        </div>
        <div v-if="formData.header.asalNomor" class="fr">
          <label class="lbl">Revisi Dari</label>
          <input
            :value="formData.header.asalNomor"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>
        <div class="fr" style="align-items: flex-start">
          <label class="lbl" style="padding-top: 4px">Keterangan</label>
          <textarea
            v-model="formData.header.keterangan"
            class="ta"
            rows="3"
            style="flex: 1"
            :disabled="!editable"
          />
        </div>

        <div class="sep" />

        <div class="fr">
          <label class="lbl">Jumlah SPK</label>
          <input :value="jmlSpk" readonly class="inp ro" style="width: 80px" />
          <label class="lbl" style="width: 85px">Total Marker</label>
          <input
            :value="totalJml.toLocaleString('id-ID')"
            readonly
            class="inp ro"
            style="width: 80px"
          />
        </div>

        <div v-if="formData.header.statusManual" class="warn-box warn-amber">
          {{ formData.header.statusManual }}:
          {{ formData.header.statusKeterangan }}
        </div>
        <div v-if="isEditMode && !formData.header.bisaUbah" class="warn-box">
          Permintaan ini tidak dapat diubah (sudah punya LHK Marker atau
          dibatalkan).
        </div>
        <div v-if="isRevisi" class="warn-box warn-amber">
          Menyimpan revisi ini akan otomatis membatalkan permintaan
          {{ formData.header.asalNomor }}.
        </div>
      </div>
    </template>

    <!-- ══ KOLOM KANAN: DETAIL ══ -->
    <template #right-column>
      <div class="pm-right">
        <div class="tbl-header">
          <span class="tbl-title">Detail Permintaan</span>
          <button
            type="button"
            class="btn-add"
            :disabled="!editable"
            @click="addRow"
          >
            + Tambah Baris
          </button>
        </div>
        <div class="tbl-wrap" style="min-height: 50vh; max-height: 78vh">
          <table class="gt" style="min-width: 1250px">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 150px">SPK</th>
                <th style="width: 190px">Nama SPK</th>
                <th style="width: 290px">Bahan</th>
                <th style="width: 60px">Satuan</th>
                <th style="width: 150px">Setting</th>
                <th style="width: 80px" class="tr">Jml Marker</th>
                <th style="width: 220px">Alasan (bahan di luar MKB)</th>
                <th style="width: 32px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in formData.dtl"
                :key="idx"
                :class="{ 'row-luar': luarMkb(row) }"
              >
                <td class="tc gt-lbl">{{ idx + 1 }}</td>
                <td class="p0">
                  <div class="cell-flex">
                    <input
                      :value="row.spkNomor"
                      readonly
                      class="ci ro"
                      placeholder="Klik cari..."
                    />
                    <button
                      type="button"
                      class="btn-mini"
                      :disabled="!editable"
                      @click="openSpk(idx)"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>
                <td class="px-1" :title="row.spkNama">{{ row.spkNama }}</td>
                <td class="p0">
                  <div class="cell-flex">
                    <select
                      v-model="row.kode"
                      class="ci"
                      :disabled="!editable || !row.spkNomor"
                      @change="onPilihBahan(row)"
                      @keydown.enter.prevent="onEnterNext"
                    >
                      <option value="">
                        {{
                          spkTanpaMkb(row)
                            ? "-- SPK belum punya MKB, cari manual --"
                            : "-- pilih bahan MKB --"
                        }}
                      </option>
                      <option
                        v-for="b in opsiBahan(row)"
                        :key="b.kode"
                        :value="b.kode"
                      >
                        {{ b.kode }} - {{ b.nama }}
                      </option>
                    </select>
                    <button
                      type="button"
                      class="btn-mini"
                      title="Cari bahan lain (di luar MKB)"
                      :disabled="!editable"
                      @click="openBahan(idx)"
                    >
                      <IconSearch :size="12" />
                    </button>
                  </div>
                </td>
                <td class="px-1">{{ row.satuan }}</td>
                <td class="p0">
                  <input
                    v-model="row.setting"
                    class="ci"
                    maxlength="50"
                    autocomplete="off"
                    placeholder="Pilih / ketik setting"
                    :list="`dl-setting-${idx}`"
                    :disabled="!editable"
                    @blur="row.setting = rapikanSetting(row.setting)"
                    @keydown.enter.prevent="onEnterNext"
                    v-select-on-focus
                  />
                  <datalist :id="`dl-setting-${idx}`">
                    <option
                      v-for="s in saranSetting(row)"
                      :key="s"
                      :value="s"
                    />
                  </datalist>
                </td>
                <td class="p0">
                  <input
                    v-model.number="row.jml"
                    type="number"
                    min="1"
                    step="1"
                    class="ci tr"
                    :disabled="!editable"
                    @keydown.enter.prevent="onEnterNext"
                    v-select-on-focus
                  />
                </td>
                <td class="p0">
                  <input
                    v-model="row.alasan"
                    class="ci"
                    maxlength="255"
                    :disabled="!editable || !luarMkb(row)"
                    :placeholder="luarMkb(row) ? 'Wajib diisi' : ''"
                    @keydown.enter.prevent="onEnterNext"
                  />
                </td>
                <td class="tc">
                  <button
                    type="button"
                    class="btn-del"
                    :disabled="!editable"
                    @click="removeRow(idx)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6" class="tr">TOTAL MARKER</td>
                <td class="tr">{{ totalJml.toLocaleString("id-ID") }}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="legend">
          Baris berlatar kuning = bahan tidak ada di MKB SPK itu, alasan wajib
          diisi.
        </div>
      </div>
    </template>
  </BaseForm>

  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="spk-map"
    divisi="3,4,6"
    @selected="onSpkSelected"
  />
  <BahanSearchModal
    v-model="showBahanModal"
    mode="all"
    @selected="onBahanDariModal"
  />
</template>

<style scoped>
.pm-left {
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
.pm-right {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px 12px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  min-height: 0;
  min-width: 0;
  overflow: auto;
}

.fr {
  display: flex;
  align-items: center;
  min-height: 24px;
  gap: 4px;
  width: 100%;
}
.lbl {
  width: 85px;
  flex-shrink: 0;
  font-weight: 600;
  color: #333;
  font-size: 11px;
  white-space: nowrap;
}
.fw {
  font-weight: 700;
}
.sep {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
  width: 100%;
}
.text-primary {
  color: #1565c0;
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
.ta {
  border: 1px solid #a0a0a0;
  padding: 3px 5px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  resize: vertical;
}

.warn-box {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
  border-radius: 3px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
}
.warn-box.warn-amber {
  background: #fff8e1;
  color: #e65100;
  border-color: #ffe082;
}

.status-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 9.5px;
  font-weight: 700;
  white-space: nowrap;
}
.st-OPEN {
  background: #e3f2fd;
  color: #1565c0;
}
.st-PROGRESS {
  background: #fff3e0;
  color: #e65100;
}
.st-DONE {
  background: #e8f5e9;
  color: #2e7d32;
}
.st-PENDING {
  background: #f5f5f5;
  color: #757575;
}
.st-CANCEL {
  background: #ffebee;
  color: #c62828;
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
.btn-add:disabled {
  opacity: 0.5;
  cursor: default;
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
.gt tbody td {
  border: 1px solid #e8e8e8;
  height: 26px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gt tbody tr:hover td {
  background: #e3f2fd !important;
}
.gt tbody tr.row-luar td {
  background: #fff8e1;
}
.gt tfoot td {
  position: sticky;
  bottom: 0;
  z-index: 1;
  background: #fff9c4;
  border: 1px solid #bdbdbd;
  height: 26px;
  font-size: 11px;
  font-weight: 700;
  color: #37474f;
  white-space: nowrap;
  padding: 0 5px;
}
.p0 {
  padding: 0 !important;
}
.px-1 {
  padding: 0 5px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.gt-lbl {
  background: #f5f5f5 !important;
  color: #555;
  font-size: 10px;
}
.cell-flex {
  display: flex;
  align-items: center;
  width: 100%;
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
  box-sizing: border-box;
  min-width: 0;
}
.ci:disabled {
  color: #757575;
}
.ci:focus {
  background: #e3f2fd !important;
  outline: 1px solid #1976d2;
  outline-offset: -1px;
}
.ci.tr {
  text-align: right;
}
.btn-mini {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  background: #e0e0e0;
  border: none;
  border-left: 1px solid #a0a0a0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-mini:hover {
  background: #d0d0d0;
}
.btn-mini:disabled {
  opacity: 0.5;
  cursor: default;
}
.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  font-size: 11px;
}
.btn-del:hover {
  background: #ffebee;
  border-radius: 2px;
}
.btn-del:disabled {
  opacity: 0.4;
  cursor: default;
}
.legend {
  font-size: 10px;
  color: #555;
  margin-top: 4px;
}
</style>
