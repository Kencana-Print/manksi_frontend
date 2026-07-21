<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { proofFormService } from "@/services/ppic/proofFormService";
import MapSearchModal from "@/components/lookups/MapSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import { IconClipboardCheck, IconSearch, IconTrash } from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);
// Cabang terkunci dari browse — dikirim via query param, tidak
// bisa diubah di form ini sama sekali.
const lockedCab = computed(() => (route.query.cab as string) || "");

const emptyRow = () => ({
  kode: "",
  nama: "",
  size: "",
  jeniskain: "",
  warnakain: "",
  jumlah: 0,
  waktu: 0,
  // POTONG
  gramasi: "",
  seting: "",
  satuan: "",
  babaran: 0,
  // CETAK
  plangkan: "",
  kesutan: 0,
  jeniscat: "",
  dpnbahu: 0,
  blkleher: 0,
  lengankiri: 0,
  lengankanan: 0,
  dpnsamping: 0,
  blksamping: 0,
  // SUBLIM
  jeniskertas: "",
  dtf: "",
  suhu: "",
  ukuran: "",
  // BORDIR
  warnabenang: "",
  jenisbenang: "",
  kodebenang: "",
  sttich: 0,
  // JAHIT
  stepjahit: 0,
});

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const todayLocal = () => new Date().toISOString().substring(0, 10);

const defaultData = {
  pf_nomor: "",
  pf_tanggal: todayLocal(),
  pf_jam: nowTime(),
  pf_cab: lockedCab.value,
  pf_lini: "POTONG",
  pf_spk_nomor: "",
  pf_petugas: "",
  NamaSpk: "",
  JumlahSpk: 0,
  detail: [emptyRow()],
};

// ── Meta (lini options, column visibility, dropdowns) ──────────────────
const liniOptions = ref<string[]>([
  "POTONG",
  "CETAK",
  "SUBLIM",
  "BORDIR",
  "JAHIT",
]);
const liniColumnVisibility = ref<Record<string, string[]>>({});
const dropdowns = ref<{
  jenisKain: string[];
  warnaKain: string[];
  gramasi: string[];
  setting: string[];
  satuan: string[];
}>({ jenisKain: [], warnaKain: [], gramasi: [], setting: [], satuan: [] });

const loadMeta = async () => {
  try {
    const res = await proofFormService.getMeta();
    const m = res.data.data;
    liniOptions.value = m.liniOptions || liniOptions.value;
    liniColumnVisibility.value = m.liniColumnVisibility || {};
    dropdowns.value = m.dropdowns || dropdowns.value;
  } catch (e) {
    console.error("Gagal load meta proof form:", e);
  }
};

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
} = useForm({
  menuId: "122",
  initialData: defaultData,
  fetchApi: async () => {
    const nomor = String(route.params.nomor);
    const res = await proofFormService.getDetail(nomor);
    const d = res.data.data;
    const h = d.header;
    return {
      pf_nomor: h.pf_nomor,
      pf_tanggal: String(h.pf_tanggal).substring(0, 10),
      pf_jam: h.pf_jam || nowTime(),
      pf_cab: h.pf_cab,
      pf_lini: h.pf_lini,
      pf_spk_nomor: h.pf_spk_nomor || "",
      pf_petugas: h.pf_petugas || "",
      NamaSpk: h.NamaSpk || "",
      JumlahSpk: Number(h.JumlahSpk) || 0,
      detail:
        d.detail.length > 0
          ? d.detail.map((r: any) => ({ ...emptyRow(), ...r }))
          : [emptyRow()],
    };
  },
  submitApi: async (data: any) => {
    const payload = {
      ...data,
      detail: data.detail.filter((r: any) => r.nama && r.nama.trim()),
      isEdit: isEditMode.value,
    };
    if (isEditMode.value) {
      return proofFormService.update(String(route.params.nomor), payload);
    }
    return proofFormService.create(payload);
  },
  onSuccess: () => {
    toast.success(
      isEditMode.value
        ? "Proof berhasil diupdate."
        : "Proof berhasil disimpan.",
    );
    router.push({ name: "ProofBrowse" });
  },
});

loadMeta();

// ── Kolom yang tampil sesuai Lini aktif ────────────────────────────────
const visibleExtraCols = computed(
  () => liniColumnVisibility.value[formData.value.pf_lini] || [],
);
const hasCol = (col: string) => visibleExtraCols.value.includes(col);

// ── Trailing empty row ──────────────────────────────────────────────
const ensureTrailingRow = () => {
  const list = formData.value.detail;
  const last = list[list.length - 1];
  if (list.length === 0 || (last && last.nama)) {
    list.push(emptyRow());
  }
};
const removeRow = (idx: number) => {
  formData.value.detail.splice(idx, 1);
  if (formData.value.detail.length === 0) ensureTrailingRow();
};

// ── Auto-calc waktu untuk BORDIR (sttich/15000) ─────────────────────
const onSttichChange = (row: any) => {
  const sttich = Number(row.sttich) || 0;
  row.waktu = sttich === 0 ? 0 : Number((sttich / 15000).toFixed(4));
};

// ── Lookup bahan per baris (F1/Enter) ───────────────────────────────
const showBahanModal = ref(false);
const activeBahanRowIdx = ref(-1);

const openBahanModal = (idx: number) => {
  activeBahanRowIdx.value = idx;
  showBahanModal.value = true;
};

const onBahanSelected = (item: any) => {
  const idx = activeBahanRowIdx.value;
  if (idx > -1 && formData.value.detail[idx]) {
    formData.value.detail[idx].kode = item.Kode;
    formData.value.detail[idx].nama = item.Nama;
    ensureTrailingRow();
  }
};

const onKodeEnter = async (idx: number) => {
  const row = formData.value.detail[idx];
  const kode = (row.kode || "").trim();
  if (!kode) return;
  try {
    const res = await proofFormService.loadBahan(kode, formData.value.pf_lini);
    row.kode = res.data.data.Kode;
    row.nama = res.data.data.Nama;
    ensureTrailingRow();
  } catch (e: any) {
    toast.error(
      e.response?.data?.message ||
        `Kode bahan tsb tidak terdaftar di lini ${formData.value.pf_lini}`,
    );
    row.kode = "";
    row.nama = "";
  }
};

// ── Lookup SPK/MAP ───────────────────────────────────────────────────
const showSpkModal = ref(false);

const applySpkInfo = (nomor: string, nama: string, jumlah: number) => {
  formData.value.pf_spk_nomor = nomor;
  formData.value.NamaSpk = nama;
  formData.value.JumlahSpk = jumlah;
};

const resetSpkInfo = () => {
  formData.value.pf_spk_nomor = "";
  formData.value.NamaSpk = "";
  formData.value.JumlahSpk = 0;
};

const checkAndApplySpk = async (nomor: string) => {
  try {
    const infoRes = await proofFormService.getSpkInfo(nomor);
    const info = infoRes.data.data;
    if (!info.found) {
      toast.error("MAP/SPK tsb belum ada.");
      resetSpkInfo();
      return;
    }
    if (!info.approved) {
      toast.error("MAP/SPK tsb belum diapproval Chief Marketing.");
      resetSpkInfo();
      return;
    }
    // Cek duplikat Lini+SPK
    const dupRes = await proofFormService.checkDuplikat(
      formData.value.pf_lini,
      nomor,
      isEditMode.value ? formData.value.pf_nomor : "",
    );
    if (dupRes.data.data.duplikat) {
      toast.error(
        `MAP/SPK sudah di input di Lini tsb dgn nomor transaksi: ${dupRes.data.data.nomorLain}`,
      );
      resetSpkInfo();
      return;
    }
    applySpkInfo(nomor, info.nama, info.jumlah);
  } catch {
    toast.error("Gagal memvalidasi SPK/MAP.");
    resetSpkInfo();
  }
};

const onSpkBlur = () => {
  const nomor = (formData.value.pf_spk_nomor || "").trim();
  if (!nomor) {
    resetSpkInfo();
    return;
  }
  checkAndApplySpk(nomor);
};

const onSpkSelected = (item: any) => {
  checkAndApplySpk(item.Nomor);
};

// ── Lini berubah → re-validasi duplikat SPK di lini baru ───────────────
watch(
  () => formData.value.pf_lini,
  () => {
    if (formData.value.pf_spk_nomor) {
      checkAndApplySpk(formData.value.pf_spk_nomor);
    }
  },
);

// ── Validasi sebelum simpan ────────────────────────────────────────────
const validateSave = () => {
  if (!formData.value.pf_spk_nomor) {
    toast.warning("Nama MAP belum di isi.");
    return;
  }
  const valid = formData.value.detail.filter(
    (r: any) => r.nama && r.nama.trim(),
  );
  if (valid.length === 0) {
    toast.warning("Tidak ada detail, tidak dapat di simpan.");
    return;
  }
  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Proof Garmen' : 'Buat Proof Garmen'"
    menu-id="122"
    :icon="IconClipboardCheck"
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
    <template #left-column>
      <div class="pf-card">
        <div class="sec-title">Dokumen</div>
        <div class="fr">
          <label class="lbl">Gudang</label>
          <input
            :value="formData.pf_cab"
            readonly
            class="inp ro"
            style="width: 120px"
          />
        </div>
        <div class="fr">
          <label class="lbl">Nomor</label>
          <div style="display: flex; flex-direction: column; gap: 2px; flex: 1">
            <input
              :value="formData.pf_nomor || '(Otomatis)'"
              readonly
              class="inp ro"
              style="width: 160px"
            />
            <span v-if="!isEditMode" class="hint-new">← Kosong = Baru</span>
          </div>
        </div>
        <div class="fr">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.pf_tanggal"
            class="inp"
            style="width: 150px"
          />
        </div>
        <div class="fr">
          <label class="lbl">Jam</label>
          <input
            type="time"
            v-model="formData.pf_jam"
            class="inp"
            style="width: 100px"
          />
        </div>
        <div class="fr">
          <label class="lbl">Petugas Proof</label>
          <input v-model="formData.pf_petugas" class="inp" style="flex: 1" />
        </div>
      </div>

      <div class="pf-card mt-2">
        <div class="sec-title">Referensi</div>
        <div class="fr">
          <label class="lbl">Lini</label>
          <select
            v-model="formData.pf_lini"
            class="inp sel"
            style="width: 150px"
          >
            <option v-for="l in liniOptions" :key="l" :value="l">
              {{ l }}
            </option>
          </select>
        </div>
        <div class="fr">
          <label class="lbl">No. MAP</label>
          <div class="igrp" style="flex: 1">
            <input
              v-model="formData.pf_spk_nomor"
              class="inp"
              style="flex: 1"
              placeholder="F1/Enter cari..."
              @keydown.enter.prevent="onSpkBlur"
              @keydown.f1.prevent="showSpkModal = true"
              @blur="onSpkBlur"
            />
            <button type="button" class="btn-lkp" @click="showSpkModal = true">
              <IconSearch :size="12" color="#1565c0" />
            </button>
          </div>
        </div>
        <div class="fr">
          <label class="lbl">Product</label>
          <input
            :value="formData.NamaSpk"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>
        <div class="fr">
          <label class="lbl">Total Jumlah</label>
          <input
            :value="formData.JumlahSpk"
            readonly
            class="inp ro"
            style="width: 120px"
          />
        </div>
      </div>
    </template>

    <template #right-column>
      <div class="pf-grid-wrap">
        <table class="pf-table">
          <thead>
            <tr>
              <th style="width: 30px">No</th>
              <th style="width: 130px">Kode</th>
              <th style="width: 180px">Nama Komponen</th>
              <th style="width: 70px">Size</th>
              <th style="width: 110px">Jenis Kain</th>
              <th style="width: 110px">Warna Kain</th>

              <th v-if="hasCol('gramasi')" style="width: 100px">Gramasi</th>
              <th v-if="hasCol('seting')" style="width: 100px">Setting</th>
              <th v-if="hasCol('satuan')" style="width: 80px">Satuan</th>
              <th v-if="hasCol('babaran')" style="width: 80px" class="tr">
                Babaran
              </th>

              <th v-if="hasCol('plangkan')" style="width: 90px">Plangkan</th>
              <th v-if="hasCol('kesutan')" style="width: 80px" class="tr">
                Kesutan
              </th>
              <th v-if="hasCol('jeniscat')" style="width: 100px">Jenis Cat</th>
              <th v-if="hasCol('dpnbahu')" style="width: 80px" class="tr">
                Dpn Bahu
              </th>
              <th v-if="hasCol('blkleher')" style="width: 80px" class="tr">
                Blk Leher
              </th>
              <th v-if="hasCol('lengankiri')" style="width: 90px" class="tr">
                Lengan Kiri
              </th>
              <th v-if="hasCol('lengankanan')" style="width: 95px" class="tr">
                Lengan Kanan
              </th>
              <th v-if="hasCol('dpnsamping')" style="width: 90px" class="tr">
                Dpn Samping
              </th>
              <th v-if="hasCol('blksamping')" style="width: 90px" class="tr">
                Blk Samping
              </th>

              <th v-if="hasCol('jeniskertas')" style="width: 100px">
                Jenis Kertas
              </th>
              <th v-if="hasCol('dtf')" style="width: 80px">DTF</th>
              <th v-if="hasCol('suhu')" style="width: 70px">Suhu</th>
              <th v-if="hasCol('ukuran')" style="width: 80px">Ukuran</th>

              <th v-if="hasCol('warnabenang')" style="width: 110px">
                Warna Benang
              </th>
              <th v-if="hasCol('jenisbenang')" style="width: 110px">
                Jenis Benang
              </th>
              <th v-if="hasCol('kodebenang')" style="width: 100px">
                Kode Benang
              </th>
              <th v-if="hasCol('sttich')" style="width: 80px" class="tr">
                Sttich
              </th>

              <th v-if="hasCol('stepjahit')" style="width: 80px" class="tr">
                Step Jahit
              </th>

              <th style="width: 80px" class="tr">Jumlah</th>
              <th style="width: 80px" class="tr">Waktu Kerja</th>
              <th style="width: 36px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in formData.detail" :key="idx">
              <td class="tc">{{ Number(idx) + 1 }}</td>
              <td>
                <div class="igrp">
                  <input
                    v-model="row.kode"
                    class="cell-inp"
                    placeholder="F1/Enter..."
                    @keydown.enter.prevent="onKodeEnter(Number(idx))"
                    @keydown.f1.prevent="openBahanModal(Number(idx))"
                  />
                  <button
                    type="button"
                    class="btn-lkp-sm"
                    @click="openBahanModal(Number(idx))"
                  >
                    <IconSearch :size="11" color="#1565c0" />
                  </button>
                </div>
              </td>
              <td><input :value="row.nama" readonly class="cell-inp ro" /></td>
              <td><input v-model="row.size" class="cell-inp" /></td>
              <td>
                <input
                  v-model="row.jeniskain"
                  class="cell-inp"
                  list="jeniskain-options"
                />
              </td>
              <td>
                <input
                  v-model="row.warnakain"
                  class="cell-inp"
                  list="warnakain-options"
                />
              </td>

              <td v-if="hasCol('gramasi')">
                <input
                  v-model="row.gramasi"
                  class="cell-inp"
                  list="gramasi-options"
                />
              </td>
              <td v-if="hasCol('seting')">
                <input
                  v-model="row.seting"
                  class="cell-inp"
                  list="setting-options"
                />
              </td>
              <td v-if="hasCol('satuan')">
                <input
                  v-model="row.satuan"
                  class="cell-inp"
                  list="satuan-options"
                />
              </td>
              <td v-if="hasCol('babaran')">
                <input
                  v-model.number="row.babaran"
                  type="number"
                  class="cell-inp tr"
                />
              </td>

              <td v-if="hasCol('plangkan')">
                <input v-model="row.plangkan" class="cell-inp" />
              </td>
              <td v-if="hasCol('kesutan')">
                <input
                  v-model.number="row.kesutan"
                  type="number"
                  class="cell-inp tr"
                />
              </td>
              <td v-if="hasCol('jeniscat')">
                <input v-model="row.jeniscat" class="cell-inp" />
              </td>
              <td v-if="hasCol('dpnbahu')">
                <input
                  v-model.number="row.dpnbahu"
                  type="number"
                  class="cell-inp tr"
                />
              </td>
              <td v-if="hasCol('blkleher')">
                <input
                  v-model.number="row.blkleher"
                  type="number"
                  class="cell-inp tr"
                />
              </td>
              <td v-if="hasCol('lengankiri')">
                <input
                  v-model.number="row.lengankiri"
                  type="number"
                  class="cell-inp tr"
                />
              </td>
              <td v-if="hasCol('lengankanan')">
                <input
                  v-model.number="row.lengankanan"
                  type="number"
                  class="cell-inp tr"
                />
              </td>
              <td v-if="hasCol('dpnsamping')">
                <input
                  v-model.number="row.dpnsamping"
                  type="number"
                  class="cell-inp tr"
                />
              </td>
              <td v-if="hasCol('blksamping')">
                <input
                  v-model.number="row.blksamping"
                  type="number"
                  class="cell-inp tr"
                />
              </td>

              <td v-if="hasCol('jeniskertas')">
                <input v-model="row.jeniskertas" class="cell-inp" />
              </td>
              <td v-if="hasCol('dtf')">
                <input v-model="row.dtf" class="cell-inp" />
              </td>
              <td v-if="hasCol('suhu')">
                <input v-model="row.suhu" class="cell-inp" />
              </td>
              <td v-if="hasCol('ukuran')">
                <input v-model="row.ukuran" class="cell-inp" />
              </td>

              <td v-if="hasCol('warnabenang')">
                <input v-model="row.warnabenang" class="cell-inp" />
              </td>
              <td v-if="hasCol('jenisbenang')">
                <input v-model="row.jenisbenang" class="cell-inp" />
              </td>
              <td v-if="hasCol('kodebenang')">
                <input v-model="row.kodebenang" class="cell-inp" />
              </td>
              <td v-if="hasCol('sttich')">
                <input
                  v-model.number="row.sttich"
                  type="number"
                  class="cell-inp tr"
                  @input="onSttichChange(row)"
                />
              </td>

              <td v-if="hasCol('stepjahit')">
                <input
                  v-model.number="row.stepjahit"
                  type="number"
                  class="cell-inp tr"
                />
              </td>

              <td>
                <input
                  v-model.number="row.jumlah"
                  type="number"
                  class="cell-inp tr"
                />
              </td>
              <td>
                <input
                  :value="row.waktu"
                  readonly
                  class="cell-inp tr ro"
                  title="Otomatis dihitung (khusus Bordir)"
                />
              </td>
              <td class="tc">
                <button
                  v-if="formData.detail.length > 1"
                  type="button"
                  class="btn-del"
                  @click="removeRow(Number(idx))"
                >
                  <IconTrash :size="13" color="#c62828" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <datalist id="jeniskain-options">
          <option v-for="o in dropdowns.jenisKain" :key="o" :value="o" />
        </datalist>
        <datalist id="warnakain-options">
          <option v-for="o in dropdowns.warnaKain" :key="o" :value="o" />
        </datalist>
        <datalist id="gramasi-options">
          <option v-for="o in dropdowns.gramasi" :key="o" :value="o" />
        </datalist>
        <datalist id="setting-options">
          <option v-for="o in dropdowns.setting" :key="o" :value="o" />
        </datalist>
        <datalist id="satuan-options">
          <option v-for="o in dropdowns.satuan" :key="o" :value="o" />
        </datalist>
      </div>
    </template>
  </BaseForm>

  <MapSearchModal
    v-model="showSpkModal"
    :divisi="'3,4,6'"
    @selected="onSpkSelected"
  />
  <BahanSearchModal
    v-model="showBahanModal"
    mode="komponen"
    :is-bordir="formData.pf_lini === 'BORDIR'"
    @selected="onBahanSelected"
  />
</template>

<style scoped>
.pf-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 14px;
}
.mt-2 {
  margin-top: 8px;
}
.sec-title {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.fr {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  min-height: 26px;
}
.fr:last-child {
  margin-bottom: 0;
}
.lbl {
  width: 100px;
  flex-shrink: 0;
  font-weight: 600;
  color: #424242;
  font-size: 11px;
}
.inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
}
.inp:focus {
  border-color: #1565c0;
}
.ro {
  background: #f0f0f0;
  color: #616161;
}
.sel {
  cursor: pointer;
}
.hint-new {
  font-size: 10px;
  color: #d32f2f;
  font-weight: 600;
  white-space: normal;
  line-height: 1.3;
}
.igrp {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: hidden;
  height: 26px;
}
.igrp .inp,
.igrp .cell-inp {
  border: none;
  height: 24px;
}
.btn-lkp {
  width: 24px;
  min-width: 24px;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-lkp:hover {
  background: #bbdefb;
}
.pf-grid-wrap {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: auto;
  height: 100%;
}
.pf-table {
  border-collapse: collapse;
  font-size: 11px;
  white-space: nowrap;
}
.pf-table thead th {
  background: #1565c0;
  color: white;
  padding: 6px 6px;
  font-weight: 700;
  position: sticky;
  top: 0;
  z-index: 1;
}
.pf-table tbody td {
  padding: 2px 3px;
  border-bottom: 1px solid #eee;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.cell-inp {
  width: 100%;
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
}
.cell-inp:focus {
  border-color: #1565c0;
}
.cell-inp.ro {
  background: #f0f0f0;
  color: #616161;
}
.btn-lkp-sm {
  width: 22px;
  min-width: 22px;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-lkp-sm:hover {
  background: #bbdefb;
}
.btn-del {
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 3px;
  padding: 3px 5px;
  cursor: pointer;
}
.btn-del:hover {
  background: #ffcdd2;
}

@media (max-width: 768px) {
  .fr {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }
  .lbl {
    width: 100%;
  }
  .inp,
  .igrp {
    width: 100% !important;
  }
  .pf-card {
    padding: 10px;
  }
}
</style>
