<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import { useForm } from "@/composables/useForm";
import BaseForm from "@/components/BaseForm.vue";

import NikPemintaSearchModal from "@/components/lookups/NikPemintaSearchModal.vue";
import CostCenterSearchModal from "@/components/lookups/CostCenterSearchModal.vue";
import PermintaanGaSearchModal from "@/components/lookups/PermintaanGaSearchModal.vue";
import JobButuhGaSearchModal from "@/components/lookups/JobButuhGaSearchModal.vue";

import { pengajuanDanaFormService } from "@/services/piutang/pengajuanDanaFormService";
import {
  IconCash,
  IconSearch,
  IconTrash,
  IconPlus,
  IconCalendar,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

interface ItemRow {
  Nama: string;
  Spesifikasi: string;
  Kegunaan: string;
  Qty: number;
  Nilai: number;
  Satuan: string;
  Deadline: string;
  Nomor: string; // pjd_jobkp — ref job butuh, kalau ada
  Kode: string; // pjd_kode — ref job butuh, kalau ada
}

interface PengajuanDanaFormData {
  Nomor: string;
  Tanggal: string;
  Nik: string;
  Nama: string;
  Bagian: string;
  Lokasi: string;
  Keterangan: string;
  items: ItemRow[];
  CcKode: string;
  CcDcNama: string;
}

const mkItem = (): ItemRow => ({
  Nama: "",
  Spesifikasi: "",
  Kegunaan: "",
  Qty: 0,
  Nilai: 0,
  Satuan: "",
  Deadline: "",
  Nomor: "",
  Kode: "",
});

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const sel = (e: FocusEvent) => (e.target as HTMLInputElement).select();

const defaultData = {
  Nomor: "",
  Tanggal: todayLocal(),
  Nik: "",
  Nama: "",
  Bagian: "",
  Lokasi: "",
  Keterangan: "",
  CcKode: "",
  CcDcNama: "",
  items: [mkItem()] as ItemRow[],
};

const {
  isLoading,
  isSaving,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  formData,
  fetchData,
  executeSave,
  executeCancel,
  executeClose,
  goBack,
  isEditMode,
  params,
} = useForm<PengajuanDanaFormData>({
  menuId: "177",
  initialData: defaultData,
  immediate: false,
  fetchApi: async (): Promise<PengajuanDanaFormData> => {
    const res = await pengajuanDanaFormService.getFormDetail(
      String(params.nomor),
    );
    const d = res.data.data;
    const h = d.header;
    return {
      Nomor: h.Nomor,
      Tanggal: h.Tanggal,
      Nik: h.Nik || "",
      Nama: h.Nama || "",
      Bagian: h.Bagian || "",
      Lokasi: h.Lokasi || "",
      Keterangan: h.Keterangan || "",
      CcKode: h.CcKode || "",
      CcDcNama: h.CcDcNama || "",
      items: (d.items || []).map(
        (r: any): ItemRow => ({
          Nama: r.Nama || "",
          Spesifikasi: r.Spesifikasi || "",
          Kegunaan: r.Kegunaan || "",
          Qty: Number(r.Qty) || 0,
          Nilai: Number(r.Nilai) || 0,
          Satuan: r.Satuan || "",
          Deadline: r.Deadline || "",
          Nomor: r.Nomor || "",
          Kode: r.Kode || "",
        }),
      ),
    };
  },
  submitApi: async (data: PengajuanDanaFormData): Promise<any> => {
    const validItems = data.items.filter((r: ItemRow) => r.Nama.trim());
    const header = {
      Tanggal: data.Tanggal,
      Nik: data.Nik,
      Keterangan: data.Keterangan,
      CcKode: data.CcKode,
      CcDcNama: data.CcDcNama,
    };
    return isEditMode.value
      ? pengajuanDanaFormService.update(data.Nomor, header, validItems)
      : pengajuanDanaFormService.create(header, validItems);
  },
  onSuccess: (res: any) => {
    const nomor = res.data?.data?.nomor || "";
    toast.success(`Pengajuan Dana ${nomor} berhasil disimpan.`);
    goBack();
  },
});

const fd = formData;

// ── NIK lookup ──
const showNikModal = ref(false);
const nikDirty = ref(false);

const applyNik = async (nik: string) => {
  try {
    const res = await pengajuanDanaFormService.getNikInfo(nik);
    const d = res.data.data;
    fd.value.Nik = d.Nik;
    fd.value.Nama = d.Nama;
    fd.value.Bagian = d.Bagian;
    fd.value.Lokasi = d.Lokasi;
  } catch (e: any) {
    toast.warning(e.response?.data?.message || "Nik tidak ada.");
    fd.value.Nik = "";
    fd.value.Nama = "";
    fd.value.Bagian = "";
    fd.value.Lokasi = "";
  }
};
const selectNik = (item: any) => applyNik(item.Nik);
const onNikBlur = () => {
  if (!nikDirty.value || !fd.value.Nik) return;
  nikDirty.value = false;
  applyNik(fd.value.Nik.trim());
};

const showCcModal = ref(false);
const selectCc = (item: any) => {
  fd.value.CcKode = item.cc_kode;
  fd.value.CcDcNama = item.dc_nama;
};

// ── Items grid ──
const addItem = () => fd.value.items.push(mkItem());
const removeItem = (i: number) => {
  if (fd.value.items.length === 1) {
    fd.value.items[0] = mkItem();
    return;
  }
  fd.value.items.splice(i, 1);
};

const recalcTotal = (row: ItemRow) => {
  // Total dihitung inline di template (computed per-row via method), tidak perlu state terpisah
};
const rowTotal = (row: ItemRow) =>
  (Number(row.Qty) || 0) * (Number(row.Nilai) || 0);
const grandTotal = computed(() =>
  fd.value.items.reduce((s: number, r: ItemRow) => s + rowTotal(r), 0),
);
const effectiveLokasi = computed(() =>
  authStore.user?.cabang && authStore.user.cabang !== "HO-"
    ? authStore.user.cabang
    : undefined,
);

// Auto tambah baris kosong kalau baris terakhir mulai diisi
const onNamaInput = (idx: number) => {
  const rows = fd.value.items;
  if (idx === rows.length - 1 && rows[idx].Nama.trim()) {
    addItem();
  }
};

// ── F1: Import dari Permintaan GA ──
const showPermintaanModal = ref(false);
const onPermintaanSelected = async (p: any) => {
  try {
    const res = await pengajuanDanaFormService.getPermintaanDtl(p.PmtNomor);
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.info("Tidak ada item yang bisa diimport dari Permintaan ini.");
      return;
    }
    // Buang baris kosong terakhir sebelum diisi, replikasi pola Delphi
    // "kalau Nama sudah terisi, Append baru; kalau belum, isi baris ini"
    fd.value.items = fd.value.items.filter((r: ItemRow) => r.Nama.trim());
    rows.forEach((r: any) => {
      fd.value.items.push({
        Nama: r.Nama,
        Spesifikasi: r.Spesifikasi || "",
        Kegunaan: r.Kegunaan || "",
        Qty: Number(r.Qty) || 0,
        Nilai: Number(r.Nilai) || 0,
        Satuan: r.Satuan || "",
        Deadline: r.Deadline || "",
        Nomor: "",
        Kode: "",
      });
    });
    fd.value.items.push(mkItem());
    toast.success(`${rows.length} item diimport dari Permintaan.`);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat detail Permintaan.");
  }
};

// ── F2: Import dari Job Butuh (Spv) ──
const showJobButuhModal = ref(false);
const onJobButuhSelected = (payload: { job: any; items: any[] }) => {
  const rows = payload.items;
  if (!rows.length) {
    toast.info("Tidak ada item yang bisa diimport dari Job Butuh ini.");
    return;
  }
  fd.value.items = fd.value.items.filter((r: ItemRow) => r.Nama.trim());

  // Cegah duplikat: sama nomor(jbd_nomor) + kode(jbd_kode) skip
  const existing = new Set(
    fd.value.items.map((r: ItemRow) => `${r.Nomor}::${r.Kode}`),
  );
  let ditambah = 0;
  rows.forEach((r: any) => {
    const key = `${r.Nomor}::${r.Kode}`;
    if (existing.has(key)) return;
    fd.value.items.push({
      Nama: r.Nama,
      Spesifikasi: r.Spesifikasi || "",
      Kegunaan: "",
      Qty: Number(r.Qty) || 0,
      Nilai: 0,
      Satuan: r.Satuan || "",
      Deadline: todayLocal(),
      Nomor: r.Nomor || "",
      Kode: r.Kode || "",
    });
    existing.add(key);
    ditambah++;
  });
  fd.value.items.push(mkItem());
  toast.success(`${ditambah} item diimport dari Job Butuh.`);
};

// ── Replace Deadline (bulk-set semua baris) ──
const showReplaceDeadline = ref(false);
const replaceDeadlineVal = ref(todayLocal());
const applyReplaceDeadline = () => {
  if (replaceDeadlineVal.value < fd.value.Tanggal) {
    toast.warning("Isi tanggal Deadline dengan benar.");
    return;
  }
  fd.value.items.forEach((r) => {
    if (r.Nama.trim()) r.Deadline = replaceDeadlineVal.value;
  });
  showReplaceDeadline.value = false;
};

// ── Validasi sebelum simpan (replikasi cxButton2Click) ──
const validateSave = () => {
  if (!fd.value.Nik.trim()) {
    toast.warning("Nik harus diisi.");
    return;
  }
  if (!fd.value.CcKode) {
    toast.warning("Cost Center harus diisi.");
    return;
  }
  const validItems = fd.value.items.filter((r: ItemRow) => r.Nama.trim());
  if (!validItems.length) {
    toast.warning("Minimal satu item harus diisi.");
    return;
  }
  const today = todayLocal();
  for (const [idx, r] of validItems.entries()) {
    if (!r.Deadline) {
      toast.warning(`Baris ${idx + 1}: Deadline harus diisi.`);
      return;
    }
    if (r.Deadline < today) {
      toast.warning(`Baris ${idx + 1}: Isi Deadline yang benar.`);
      return;
    }
  }
  showSaveDialog.value = true;
};

onMounted(async () => {
  if (isEditMode.value) {
    await fetchData();
  }
});
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah Pengajuan Dana' : 'Tambah Pengajuan Dana'"
    menu-id="177"
    :icon="IconCash"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="Pengajuan Dana"
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
        <div class="fg">
          <label class="lb w80">Nomor</label>
          <input
            :value="fd.Nomor || '(Otomatis)'"
            readonly
            class="inp ro"
            style="width: 160px"
          />
        </div>
        <div class="fg mt4">
          <label class="lb w80">Tanggal</label>
          <input
            type="date"
            v-model="fd.Tanggal"
            class="inp"
            :disabled="isEditMode"
            style="width: 160px"
          />
        </div>
        <div class="fg mt4">
          <label class="lb w80">Jenis Pengajuan</label>
          <input
            value="Pengajuan Dana"
            readonly
            class="inp ro"
            style="flex: 1"
          />
        </div>

        <div class="sep mt-1 mb-1" />

        <div class="fg mt4">
          <label class="lb w80">Nik</label>
          <div class="ig" style="flex: 1">
            <input
              v-model="fd.Nik"
              class="inp"
              style="flex: 1; min-width: 0"
              placeholder="Kode NIK... (F1)"
              @input="nikDirty = true"
              @keydown.enter.prevent="onNikBlur"
              @blur="onNikBlur"
              @keydown.f1.prevent="showNikModal = true"
            />
            <button type="button" class="ibtn" @click="showNikModal = true">
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
        </div>
        <div class="fg mt4">
          <label class="lb w80">Nama</label>
          <input :value="fd.Nama" readonly class="inp ro" style="flex: 1" />
        </div>
        <div class="fg mt4">
          <label class="lb w80">Bagian</label>
          <input :value="fd.Bagian" readonly class="inp ro" style="flex: 1" />
        </div>
        <div class="fg mt4">
          <label class="lb w80">Lokasi</label>
          <input :value="fd.Lokasi" readonly class="inp ro" style="flex: 1" />
        </div>
        <div class="fg mt4">
          <label class="lb w80"
            >Cost Center <span style="color: #c62828">*</span></label
          >
          <div class="ig" style="flex: 1">
            <input
              :value="fd.CcDcNama ? `${fd.CcDcNama}` : ''"
              readonly
              class="inp ro"
              style="flex: 1; cursor: pointer"
              placeholder="Klik untuk pilih..."
              @click="showCcModal = true"
            />
            <button type="button" class="ibtn" @click="showCcModal = true">
              <IconSearch :size="11" color="#1565c0" />
            </button>
          </div>
        </div>
        <div class="fg mt4">
          <label class="lb w80">Keterangan</label>
          <input v-model="fd.Keterangan" class="inp" style="flex: 1" />
        </div>
      </div>
    </template>

    <template #right-column>
      <div
        class="desktop-form-section"
        style="flex: 1; min-height: 0; display: flex; flex-direction: column"
      >
        <div class="tbl-header">
          <span class="tbl-title">Detail Pengajuan</span>
          <div class="d-flex" style="gap: 6px">
            <button
              type="button"
              class="btn-import"
              @click="showPermintaanModal = true"
            >
              Import Permintaan (F1)
            </button>
            <button
              type="button"
              class="btn-import spv"
              @click="showJobButuhModal = true"
            >
              Import Job Butuh (F2)
            </button>
            <button
              type="button"
              class="btn-import replace"
              @click="showReplaceDeadline = true"
            >
              <IconCalendar :size="12" /> Replace Deadline
            </button>
            <button type="button" class="btn-add" @click="addItem">
              <IconPlus :size="10" /> Tambah
            </button>
          </div>
        </div>

        <div v-if="showReplaceDeadline" class="replace-box">
          <label class="lb" style="width: auto; margin-right: 6px"
            >Deadline baru:</label
          >
          <input
            type="date"
            v-model="replaceDeadlineVal"
            class="inp"
            style="width: 150px"
          />
          <button
            type="button"
            class="btn-import"
            style="margin-left: 8px"
            @click="applyReplaceDeadline"
          >
            Terapkan ke Semua Baris
          </button>
          <button
            type="button"
            class="btn-cancel-small"
            @click="showReplaceDeadline = false"
          >
            Batal
          </button>
        </div>

        <div class="gwrap">
          <table class="gtbl">
            <thead>
              <tr>
                <th style="width: 26px">#</th>
                <th style="min-width: 180px">Nama</th>
                <th style="min-width: 160px">Kegunaan</th>
                <th style="width: 70px" class="tr">Qty</th>
                <th style="width: 100px" class="tr">Nominal</th>
                <th style="width: 120px" class="tr">Total Pengajuan</th>
                <th style="width: 110px">Deadline</th>
                <th style="width: 110px">Nomor</th>
                <th style="width: 70px">Kode</th>
                <th style="width: 24px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in fd.items" :key="i">
                <td class="tc muted" style="font-size: 10px">{{ i + 1 }}</td>
                <td>
                  <input
                    v-model="row.Nama"
                    class="ci"
                    @input="onNamaInput(i)"
                  />
                </td>
                <td><input v-model="row.Kegunaan" class="ci" /></td>
                <td>
                  <input
                    v-model.number="row.Qty"
                    type="number"
                    class="ci tr"
                    @focus="sel"
                  />
                </td>
                <td>
                  <input
                    v-model.number="row.Nilai"
                    type="number"
                    class="ci tr"
                    @focus="sel"
                  />
                </td>
                <td>
                  <input
                    :value="rowTotal(row).toLocaleString('id-ID')"
                    readonly
                    class="ci tr ro"
                  />
                </td>
                <td>
                  <input type="date" v-model="row.Deadline" class="ci" />
                </td>
                <td>
                  <input
                    :value="row.Nomor"
                    readonly
                    class="ci ro"
                    style="font-size: 10px"
                  />
                </td>
                <td>
                  <input
                    :value="row.Kode"
                    readonly
                    class="ci ro"
                    style="font-size: 10px"
                  />
                </td>
                <td class="tc">
                  <button type="button" class="cdb" @click="removeItem(i)">
                    <IconTrash :size="9" />
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="footer-row">
                <td colspan="4" class="tr">Grand Total</td>
                <td class="tr fw">{{ grandTotal.toLocaleString("id-ID") }}</td>
                <td colspan="4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>
  </BaseForm>

  <NikPemintaSearchModal
    v-model="showNikModal"
    :lokasi="effectiveLokasi"
    @selected="selectNik"
  />
  <CostCenterSearchModal v-model="showCcModal" @selected="selectCc" />
  <PermintaanGaSearchModal
    v-model="showPermintaanModal"
    @selected="onPermintaanSelected"
  />
  <JobButuhGaSearchModal
    v-model="showJobButuhModal"
    @selected="onJobButuhSelected"
  />
</template>

<style scoped>
.fg {
  display: flex;
  align-items: center;
  gap: 5px;
}
.mt4 {
  margin-top: 4px;
}
.lb {
  font-size: 11px;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
}
.w80 {
  width: 80px;
  flex-shrink: 0;
}
.sep {
  height: 1px;
  background: #e0e0e0;
  width: 100%;
}
.mt-1 {
  margin-top: 4px;
}
.mb-1 {
  margin-bottom: 4px;
}

.inp {
  height: 24px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 12px;
  outline: none;
  background: white;
  font-family: inherit;
}
.inp:focus {
  border-color: #1565c0;
}
.ro {
  background: #f0f0f0 !important;
  color: #555 !important;
}
.ig {
  display: flex;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  height: 24px;
  background: white;
  overflow: hidden;
}
.ig .inp {
  border: none;
  height: 22px;
  border-radius: 0;
  flex: 1;
  min-width: 0;
}
.ibtn {
  width: 24px;
  min-width: 24px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #bdbdbd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ibtn:hover {
  background: #bbdefb;
}

.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 6px;
}
.tbl-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
}
.btn-add {
  height: 24px;
  padding: 0 8px;
  background: #2e7d32;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.btn-import {
  height: 24px;
  padding: 0 8px;
  background: #6a1b9a;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.btn-import.spv {
  background: #ef6c00;
}
.btn-import.replace {
  background: #455a64;
}
.btn-cancel-small {
  height: 24px;
  padding: 0 8px;
  background: #e0e0e0;
  color: #424242;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  margin-left: 6px;
}
.replace-box {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 6px;
}

.gwrap {
  flex: 1;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  min-height: 0;
}
.gtbl {
  border-collapse: collapse;
  font-size: 11px;
  min-width: max-content;
  width: 100%;
}
.gtbl th {
  background: #1565c0;
  color: white;
  padding: 3px 4px;
  font-weight: 700;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}
.gtbl td {
  padding: 2px 2px;
  border-bottom: 0.3px solid #e0e0e0;
  vertical-align: middle;
}
.ci {
  width: 100%;
  height: 22px;
  border: none;
  outline: none;
  padding: 0 3px;
  font-size: 11px;
  background: transparent;
  font-family: inherit;
}
.ci:focus {
  background: #fffde7;
  outline: 1px solid #1565c0;
  border-radius: 2px;
}
.ci.ro {
  color: #666;
  background: transparent;
}
.cdb {
  width: 18px;
  height: 18px;
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c62828;
}
.cdb:hover {
  background: #ffcdd2;
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
.muted {
  color: #9e9e9e;
}
.footer-row td {
  background: #212121;
  color: white;
  font-weight: 700;
  padding: 6px 8px;
}
</style>
