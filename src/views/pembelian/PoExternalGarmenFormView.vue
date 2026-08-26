<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { poExternalGarmenFormService } from "@/services/pembelian/poExternalGarmenFormService";
import { IconShoppingBagPlus, IconSearch } from "@tabler/icons-vue";

import SupplierSearchModal from "@/components/lookups/SupplierSearchModal.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import AccountSearchModal from "@/components/lookups/AccountSearchModal.vue";

interface DetailPoRow {
  Size: string;
  Jumlah: number;
  Tarif: number;
  Total: number;
}
interface DetailDpRow {
  Tanggal: string;
  Nominal: number;
  Akun: string;
  NamaBank: string;
  NoLink: string;
}
interface KomponenRow {
  Komponen: string;
  KodeBahan: string;
  NamaBahan: string;
  Satuan: string;
  Babaran: number;
  Kebutuhan: number;
}
interface PoExternalFormData {
  Nomor: string;
  Tanggal: string;
  DatelinePO: string;
  Cab: string;
  NomorSPK: string;
  NamaSPK: string;
  Bahan: string;
  Ukuran: string;
  Gramasi: string;
  Finishing: string;
  JumlahSpk: number;
  NomorMkb: string;
  AdaGambar: boolean;
  SpkCab: string;
  SupKode: string;
  SupNama: string;
  SupAlamat: string;
  SupKota: string;
  Ket: string;
  Status: string;
  BahanSendiri: boolean;
  TarifSama: boolean;
  NominalPO: number;
  DetailPo: DetailPoRow[];
  DetailDp: DetailDpRow[];
  Komponen: KomponenRow[];
  StatusEdit: string;
  UrutPin5: number;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEditMode = computed(() => !!route.params.nomor);

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const todayLocal = formatDateLocal(new Date());
const fmt = (n: number) => (Number(n) || 0).toLocaleString("id-ID");

// ── Modal & tab state ──
const showSupModal = ref(false);
const showSpkModal = ref(false);
const showAccountModal = ref(false);
const activeDpIndex = ref<number | null>(null);
const activeTab = ref<"po" | "komponen">("po");
const cabangOptions = ref<string[]>([]);
const showPrintConfirmDialog = ref(false);
const savedNomorPoe = ref("");

const defaultData: PoExternalFormData = {
  Nomor: "",
  Tanggal: todayLocal,
  DatelinePO: todayLocal,
  Cab: "",
  NomorSPK: "",
  NamaSPK: "",
  Bahan: "",
  Ukuran: "",
  Gramasi: "",
  Finishing: "",
  JumlahSpk: 0,
  NomorMkb: "",
  AdaGambar: false,
  SpkCab: "",
  SupKode: "",
  SupNama: "",
  SupAlamat: "",
  SupKota: "",
  Ket: "",
  Status: "OPEN",
  BahanSendiri: true,
  TarifSama: false,
  NominalPO: 0,
  DetailPo: [],
  DetailDp: [],
  Komponen: [],
  StatusEdit: "",
  UrutPin5: 0,
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
} = useForm<PoExternalFormData>({
  menuId: "144",
  initialData: defaultData,
  fetchApi: async (): Promise<PoExternalFormData> => {
    const res = await poExternalGarmenFormService.getForm(
      String(route.params.nomor),
    );
    const d = res.data.data;
    return {
      ...d,
      Tanggal: formatDateLocal(d.Tanggal),
      DatelinePO: formatDateLocal(d.DatelinePO),
      JumlahSpk: Number(d.JumlahSpk) || 0,
      NominalPO: Number(d.NominalPO) || 0,
      DetailPo: (d.DetailPo || []).map((r: DetailPoRow) => ({
        Size: r.Size,
        Jumlah: Number(r.Jumlah) || 0,
        Tarif: Number(r.Tarif) || 0,
        Total: Number(r.Total) || 0,
      })),
      DetailDp: (d.DetailDp || []).map((r: DetailDpRow) => ({
        Tanggal: formatDateLocal(r.Tanggal),
        Nominal: Number(r.Nominal) || 0,
        Akun: r.Akun || "",
        NamaBank: r.NamaBank || "",
        NoLink: r.NoLink || "",
      })),
      Komponen: d.Komponen || [],
    };
  },
  submitApi: async (data: PoExternalFormData) => {
    const cleanDp = data.DetailDp.filter((r: DetailDpRow) => r.Tanggal);
    return await poExternalGarmenFormService.saveData({
      isNewMode: !isEditMode.value,
      data: { ...data, DetailDp: cleanDp },
    });
  },
  onSuccess: (res: any) => {
    savedNomorPoe.value = res.data?.data?.nomor || "";
    toast.success(
      `PO External berhasil disimpan dengan nomor: ${savedNomorPoe.value}`,
    );
    showPrintConfirmDialog.value = true;
  },
});

const isFormDisabled = computed(
  () =>
    isEditMode.value &&
    ["WAIT", "TOLAK", "MINTA"].includes(formData.value.StatusEdit),
);
const canEditJumlah = computed(
  () => !isEditMode.value || formData.value.Status === "OPEN",
);

const loadInit = async () => {
  try {
    const res = await poExternalGarmenFormService.getInit();
    const d = res.data.data;
    cabangOptions.value = d.cabangOptions || [];
    if (!isEditMode.value) {
      if (d.defaultCabang) formData.value.Cab = d.defaultCabang;
      formData.value.DetailPo = (d.detailPo || []).map((r: DetailPoRow) => ({
        ...r,
      }));
    }
  } catch (e) {
    console.error("Gagal load data awal form.");
  }
};

onMounted(async () => {
  await loadInit();
  if (isEditMode.value) await fetchData();
});

// ── Totals ──
const totalJumlah = computed(() =>
  formData.value.DetailPo.reduce(
    (s: number, r: DetailPoRow) => s + (Number(r.Jumlah) || 0),
    0,
  ),
);
const totalDp = computed(() =>
  formData.value.DetailDp.reduce(
    (s: number, r: DetailDpRow) => s + (Number(r.Nominal) || 0),
    0,
  ),
);
const recalcTotal = () => {
  formData.value.NominalPO = formData.value.DetailPo.reduce(
    (sum: number, r: DetailPoRow) =>
      sum + (Number(r.Jumlah) || 0) * (Number(r.Tarif) || 0),
    0,
  );
};

// ── Detail PO handlers ──
const onJumlahChange = (i: number) => {
  const r = formData.value.DetailPo[i];
  r.Total = (Number(r.Jumlah) || 0) * (Number(r.Tarif) || 0);
  recalcTotal();
};
const onTarifChange = (i: number) => {
  const r = formData.value.DetailPo[i];
  if (formData.value.TarifSama) {
    const t = Number(r.Tarif) || 0;
    formData.value.DetailPo.forEach((row: DetailPoRow) => {
      if (Number(row.Jumlah) !== 0) {
        row.Tarif = t;
        row.Total = Number(row.Jumlah) * t;
      }
    });
  } else {
    r.Total = (Number(r.Jumlah) || 0) * (Number(r.Tarif) || 0);
  }
  recalcTotal();
};

// ── DP: auto trailing row (pola sama dgn po-bahan) ──
watch(
  () => formData.value.DetailDp,
  (rows: DetailDpRow[]) => {
    if (!rows) return;
    if (rows.length === 0) {
      rows.push({
        Tanggal: "",
        Nominal: 0,
        Akun: "",
        NamaBank: "",
        NoLink: "",
      });
      return;
    }
    const last = rows[rows.length - 1];
    if (last.Tanggal)
      rows.push({
        Tanggal: "",
        Nominal: 0,
        Akun: "",
        NamaBank: "",
        NoLink: "",
      });
  },
  { deep: true, immediate: true },
);
const removeDp = (i: number) => {
  if (
    formData.value.DetailDp.length === 1 &&
    !formData.value.DetailDp[0].Tanggal
  )
    return;
  formData.value.DetailDp.splice(i, 1);
};
const openAccount = (i: number) => {
  if (!formData.value.DetailDp[i].Tanggal) {
    toast.warning("Isi Tanggal dulu sebelum pilih Akun.");
    return;
  }
  activeDpIndex.value = i;
  showAccountModal.value = true;
};
const setAccount = (v: { Kode: string; Nama: string; Rekening: string }) => {
  if (activeDpIndex.value === null) return;
  formData.value.DetailDp[activeDpIndex.value].Akun = v.Kode;
  formData.value.DetailDp[activeDpIndex.value].NamaBank = v.Nama;
  activeDpIndex.value = null;
};

// ── SPK ──
const spkFieldLocked = computed(
  () => isEditMode.value && formData.value.Status !== "OPEN",
);
const applySpkResult = (d: any) => {
  formData.value.NamaSPK = d.NamaSPK;
  formData.value.Bahan = d.Bahan;
  formData.value.Ukuran = d.Ukuran;
  formData.value.JumlahSpk = Number(d.JumlahSpk) || 0;
  formData.value.NomorMkb = d.NomorMkb || "";
  formData.value.AdaGambar = !!d.AdaGambar;
  formData.value.SpkCab = d.SpkCab || "HO-";
  formData.value.BahanSendiri = !!d.BahanSendiri;
  formData.value.Komponen = d.Komponen || [];
  if (!isEditMode.value) {
    formData.value.Gramasi = d.Gramasi || "";
    formData.value.Finishing = d.Finishing || "";
    formData.value.Ket = d.Ket || "";
    if (d.DetailPo) {
      formData.value.DetailPo = d.DetailPo.map((r: any) => ({
        Size: r.Size,
        Jumlah: Number(r.Jumlah) || 0,
        Tarif: 0,
        Total: 0,
      }));
      recalcTotal();
    }
  }
};
const loadSpk = async (nomor: string) => {
  if (!nomor.trim()) return;
  try {
    isLoading.value = true;
    const res = await poExternalGarmenFormService.getSpkDetail(
      nomor.trim(),
      !isEditMode.value,
    );
    applySpkResult(res.data.data);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Nomor SPK tidak ditemukan.");
    formData.value.NomorSPK = "";
    formData.value.NamaSPK = "";
  } finally {
    isLoading.value = false;
  }
};
const onSpkKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    showSpkModal.value = true;
  }
};
const onSpkEnter = () => loadSpk(formData.value.NomorSPK);
const setSpk = (v: any) => {
  formData.value.NomorSPK = v.Nomor || v.spk_nomor;
  loadSpk(formData.value.NomorSPK);
};

// ── Supplier ──
const setSup = (v: any) => {
  formData.value.SupKode = v.Kode || v.sup_kode;
  formData.value.SupNama = v.Nama || v.sup_nama;
  formData.value.SupAlamat = v.Alamat || v.sup_alamat || "";
  formData.value.SupKota = v.Kota || v.sup_kota || "";
};
const onSupKeydown = (e: KeyboardEvent) => {
  if (e.key === "F1") {
    e.preventDefault();
    showSupModal.value = true;
  }
};
const onSupEnter = async () => {
  const kode = (formData.value.SupKode || "").trim();
  if (!kode) return;
  try {
    isLoading.value = true;
    const res = await poExternalGarmenFormService.getSupplierByKode(kode);
    setSup(res.data.data);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Kode supplier tidak ditemukan.");
    formData.value.SupKode = "";
    formData.value.SupNama = "";
    formData.value.SupAlamat = "";
    formData.value.SupKota = "";
  } finally {
    isLoading.value = false;
  }
};

// --- CETAK ---
const doPrint = () => {
  showPrintConfirmDialog.value = false;
  const url = router.resolve({
    name: "PoExternalGarmenPrint",
    params: { nomor: savedNomorPoe.value },
  }).href;
  window.open(url, "_blank");
  goBack();
};
const skipPrint = () => {
  showPrintConfirmDialog.value = false;
  goBack();
};

// ── Validasi sebelum save (replika urutan F10 Delphi) ──
const validateSave = () => {
  if (isFormDisabled.value) {
    return toast.warning(
      "Transaksi sudah diclose. Silahkan minta approve untuk bisa menyimpan perubahan data.",
    );
  }
  if (new Date(formData.value.DatelinePO) < new Date(formData.value.Tanggal)) {
    return toast.warning("Dateline PO tidak boleh sebelum Tanggal.");
  }
  if (!formData.value.NomorSPK?.trim()) {
    return toast.warning("Nomor SPK harus diisi.");
  }
  if (!formData.value.SupKode?.trim()) {
    return toast.warning("Supplier belum diisi.");
  }
  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    :title="isEditMode ? 'Ubah PO External Garmen' : 'Buat PO External Garmen'"
    menu-id="144"
    :icon="IconShoppingBagPlus"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="PO External Garmen"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <template #left-column>
      <div class="poe-left-container desktop-form-section header-section">
        <div v-if="isEditMode && formData.StatusEdit" class="poe-alert-wrap">
          <div v-if="formData.StatusEdit === 'WAIT'" class="poe-alert info">
            ℹ Menunggu ACC Perubahan Data dari Pusat.
          </div>
          <div v-if="formData.StatusEdit === 'ACC'" class="poe-alert success">
            ✔ Pengajuan ACC. Silakan lakukan perubahan dan simpan.
          </div>
          <div v-if="formData.StatusEdit === 'TOLAK'" class="poe-alert error">
            ✖ Pengajuan Perubahan Ditolak.
          </div>
          <div v-if="formData.StatusEdit === 'MINTA'" class="poe-alert warning">
            ⚠ Transaksi sudah ditutup. Ajukan perubahan data.
          </div>
        </div>

        <div class="fr">
          <label class="lbl">Nomor</label>
          <input
            :value="formData.Nomor"
            readonly
            class="inp ro"
            style="width: 150px"
            placeholder="← Kosong=Baru"
          />
          <span
            v-if="isEditMode"
            class="poe-status-badge"
            :class="formData.Status?.toLowerCase()"
            >{{ formData.Status }}</span
          >
        </div>
        <div class="fr">
          <label class="lbl">Tanggal</label>
          <input
            type="date"
            v-model="formData.Tanggal"
            class="idate"
            style="width: 150px"
            :disabled="isFormDisabled"
          />
        </div>
        <div class="fr">
          <label class="lbl">Dateline PO</label>
          <input
            type="date"
            v-model="formData.DatelinePO"
            class="idate"
            style="width: 150px"
            :disabled="isFormDisabled"
          />
        </div>
        <div class="fr">
          <label class="lbl">Cabang</label>
          <select
            v-model="formData.Cab"
            class="inp"
            style="width: 90px"
            :disabled="isFormDisabled"
          >
            <option v-for="c in cabangOptions" :key="c" :value="c">
              {{ c }}
            </option>
          </select>
        </div>

        <div class="sep mt-1 mb-1" />

        <div class="fr">
          <label class="lbl">No. SPK</label>
          <div class="igrp" style="width: 150px">
            <input
              v-model="formData.NomorSPK"
              class="inp"
              style="background: #ddeeff; text-transform: uppercase"
              placeholder="F1 / ketik + Enter"
              :readonly="spkFieldLocked || isFormDisabled"
              @keydown="onSpkKeydown"
              @keydown.enter.prevent="onSpkEnter"
            />
            <button
              type="button"
              class="blkp"
              title="Cari SPK (F1)"
              @click="showSpkModal = true"
              :disabled="spkFieldLocked || isFormDisabled"
            >
              <IconSearch :size="13" />
            </button>
          </div>
        </div>
        <div class="fr">
          <label class="lbl">Product</label>
          <input
            :value="formData.NamaSPK"
            readonly
            class="inp ro flex-grow-1"
          />
        </div>
        <div class="fr">
          <label class="lbl">Bahan</label>
          <input :value="formData.Bahan" readonly class="inp ro flex-grow-1" />
        </div>
        <div class="fr">
          <label class="lbl">Ukuran</label>
          <input :value="formData.Ukuran" readonly class="inp ro flex-grow-1" />
        </div>
        <div class="fr">
          <label class="lbl">Gramasi</label>
          <input
            :value="formData.Gramasi"
            readonly
            class="inp ro flex-grow-1"
          />
        </div>
        <div class="fr">
          <label class="lbl">Finishing</label>
          <input
            :value="formData.Finishing"
            readonly
            class="inp ro flex-grow-1"
          />
        </div>
        <div class="fr">
          <label class="lbl">Jumlah SPK</label>
          <input
            :value="formData.JumlahSpk"
            readonly
            class="inp ro text-right"
            style="width: 90px"
          />
        </div>
        <div class="fr">
          <label class="lbl">Nomor MKB</label>
          <input
            :value="formData.NomorMkb"
            readonly
            class="inp ro flex-grow-1"
          />
        </div>
        <div class="fr">
          <label class="ck mr-2"
            ><input type="checkbox" :checked="formData.BahanSendiri" disabled />
            Bahan Sendiri</label
          >
          <label class="ck mr-2"
            ><input
              type="checkbox"
              v-model="formData.TarifSama"
              :disabled="isFormDisabled"
            />
            Tarif Sama</label
          >
          <label v-if="formData.AdaGambar" class="ck"
            ><input type="checkbox" :checked="true" disabled /> Ada
            Gambar</label
          >
        </div>

        <div class="sep mt-1 mb-1" />

        <div class="fr">
          <label class="lbl">Supplier</label>
          <div class="igrp" style="width: 110px">
            <input
              v-model="formData.SupKode"
              class="inp"
              style="background: #ddeeff; text-transform: uppercase"
              placeholder="F1 / Enter"
              :disabled="isFormDisabled"
              @keydown="onSupKeydown"
              @keydown.enter.prevent="onSupEnter"
            />
            <button
              type="button"
              class="blkp"
              title="Cari Supplier (F1)"
              @click="showSupModal = true"
              :disabled="isFormDisabled"
            >
              <IconSearch :size="13" />
            </button>
          </div>
        </div>
        <div class="fr">
          <label class="lbl"></label
          ><input
            :value="formData.SupNama"
            readonly
            class="inp ro flex-grow-1"
          />
        </div>
        <div class="fr">
          <label class="lbl"></label
          ><input
            :value="formData.SupAlamat"
            readonly
            class="inp ro flex-grow-1"
          />
        </div>
        <div class="fr">
          <label class="lbl"></label
          ><input
            :value="formData.SupKota"
            readonly
            class="inp ro flex-grow-1"
          />
        </div>

        <div class="sep mt-1 mb-1" />

        <div class="fr">
          <label class="lbl fw">Nominal PO</label>
          <input
            :value="fmt(formData.NominalPO)"
            readonly
            class="inp ro text-right fw"
            style="width: 150px"
          />
        </div>
      </div>
    </template>

    <template #right-column>
      <div class="poe-right desktop-form-section">
        <div class="poe-tabs">
          <button
            type="button"
            class="poe-tab"
            :class="{ active: activeTab === 'po' }"
            @click="activeTab = 'po'"
          >
            Detail PO &amp; DP
          </button>
          <button
            type="button"
            class="poe-tab"
            :class="{ active: activeTab === 'komponen' }"
            @click="activeTab = 'komponen'"
          >
            Komponen &amp; Keterangan SPK
          </button>
        </div>

        <div v-show="activeTab === 'po'" class="poe-tab-panel poe-split">
          <div class="poe-half">
            <div class="tbl-header">
              <span class="tbl-title">Detail PO</span>
            </div>
            <div class="tbl-wrap" style="flex: 1; overflow-y: auto">
              <table class="gt">
                <thead>
                  <tr>
                    <th style="width: 30px" class="tc">No</th>
                    <th>Size</th>
                    <th class="tr">Jumlah PO</th>
                    <th class="tr">Tarif</th>
                    <th class="tr">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, idx) in formData.DetailPo" :key="r.Size">
                    <td class="tc gt-lbl">{{ Number(idx) + 1 }}</td>
                    <td class="p0">
                      <input :value="r.Size" readonly class="ci ro" />
                    </td>
                    <td class="p0">
                      <input
                        v-model.number="r.Jumlah"
                        type="number"
                        class="ci tr"
                        :class="{ ro: !canEditJumlah }"
                        :readonly="!canEditJumlah || isFormDisabled"
                        @blur="onJumlahChange(Number(idx))"
                        v-select-on-focus
                      />
                    </td>
                    <td class="p0">
                      <input
                        v-model.number="r.Tarif"
                        type="number"
                        class="ci tr"
                        :readonly="isFormDisabled"
                        @blur="onTarifChange(Number(idx))"
                        v-select-on-focus
                      />
                    </td>
                    <td class="p0">
                      <input
                        :value="fmt(r.Total)"
                        readonly
                        class="ci tr ro fw"
                      />
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" class="tr fw">Total</td>
                    <td class="tr fw">{{ fmt(totalJumlah) }}</td>
                    <td></td>
                    <td class="tr fw">{{ fmt(formData.NominalPO) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div class="poe-half">
            <div class="tbl-header teal">
              <span class="tbl-title">DP</span>
            </div>
            <div class="tbl-wrap" style="flex: 1; overflow-y: auto">
              <table class="gt">
                <thead>
                  <tr>
                    <th style="width: 30px" class="tc">No</th>
                    <th style="width: 105px">Tanggal</th>
                    <th class="tr">Nominal</th>
                    <th style="width: 85px">Akun</th>
                    <th>Nama Bank</th>
                    <th style="width: 100px">No. Link</th>
                    <th style="width: 30px" class="tc"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(d, idx) in formData.DetailDp" :key="idx">
                    <td class="tc gt-lbl">{{ idx + 1 }}</td>
                    <td class="p0">
                      <input
                        type="date"
                        v-model="d.Tanggal"
                        class="ci"
                        :disabled="isFormDisabled"
                      />
                    </td>
                    <td class="p0">
                      <input
                        v-model.number="d.Nominal"
                        type="number"
                        class="ci tr"
                        :disabled="isFormDisabled"
                        v-select-on-focus
                      />
                    </td>
                    <td class="p0">
                      <div class="cell-grp">
                        <input :value="d.Akun" readonly class="ci ro" />
                        <button
                          type="button"
                          class="ci-btn"
                          @click="openAccount(idx)"
                          :disabled="isFormDisabled"
                        >
                          <IconSearch :size="12" />
                        </button>
                      </div>
                    </td>
                    <td class="p0">
                      <input :value="d.NamaBank" readonly class="ci ro" />
                    </td>
                    <td class="p0">
                      <input :value="d.NoLink" readonly class="ci ro" />
                    </td>
                    <td class="tc">
                      <button
                        type="button"
                        class="btn-del"
                        @click="removeDp(idx)"
                        title="Hapus"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" class="tr fw">Total DP</td>
                    <td class="tr fw">{{ fmt(totalDp) }}</td>
                    <td colspan="4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'komponen'" class="poe-tab-panel poe-split">
          <div class="poe-half">
            <div class="tbl-header">
              <span class="tbl-title">Komponen Bahan (dari MKB)</span>
            </div>
            <div class="tbl-wrap" style="flex: 1; overflow-y: auto">
              <table class="gt">
                <thead>
                  <tr>
                    <th style="width: 30px" class="tc">No</th>
                    <th>Komponen</th>
                    <th style="width: 80px">Kode Bahan</th>
                    <th>Nama Bahan</th>
                    <th style="width: 50px" class="tc">Satuan</th>
                    <th class="tr">Babaran</th>
                    <th class="tr">Kebutuhan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(k, idx) in formData.Komponen" :key="idx">
                    <td class="tc gt-lbl">{{ Number(idx) + 1 }}</td>
                    <td>{{ k.Komponen }}</td>
                    <td>{{ k.KodeBahan }}</td>
                    <td>{{ k.NamaBahan }}</td>
                    <td class="tc">{{ k.Satuan }}</td>
                    <td class="tr">{{ fmt(Number(k.Babaran)) }}</td>
                    <td class="tr">{{ fmt(Number(k.Kebutuhan)) }}</td>
                  </tr>
                  <tr v-if="formData.Komponen.length === 0">
                    <td colspan="7" class="empty-row">
                      Belum ada komponen (pilih SPK yang punya MKB).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="poe-half">
            <div class="tbl-header purple">
              <span class="tbl-title">Keterangan SPK</span>
            </div>
            <div class="poe-ket-wrap">
              <textarea
                v-model="formData.Ket"
                class="ta"
                rows="14"
                :disabled="isFormDisabled"
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>

  <SupplierSearchModal v-model="showSupModal" @selected="setSup" />
  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="po-external"
    @selected="setSpk"
  />
  <AccountSearchModal v-model="showAccountModal" @selected="setAccount" />
</template>

<style scoped>
/* ── header (left-column), diadaptasi dari PoBahanFormView ── */
.poe-left-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px !important;
  width: 100%;
  box-sizing: border-box;
}
.fr {
  display: flex;
  align-items: center;
  min-height: 24px;
  gap: 4px;
  width: 100%;
}
.lbl {
  width: 78px;
  flex-shrink: 0;
  font-weight: 600;
  color: #444;
  font-size: 11px;
}
.fw {
  font-weight: 700;
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
.mr-2 {
  margin-right: 8px;
}
.ml-2 {
  margin-left: 8px;
}
.text-right {
  text-align: right;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.flex-grow-1 {
  flex: 1;
}

.ck {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 11px;
}
.ck input {
  margin: 0;
  accent-color: #1565c0;
}

.inp {
  height: 24px;
  border: 1px solid #a0a0a0;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
  border-radius: 2px;
  min-width: 0;
}
.inp:focus {
  border-color: #1565c0;
}
.inp:disabled {
  background: #f0f0f0 !important;
  color: #9e9e9e;
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
  border-radius: 2px;
}
.igrp {
  display: flex;
  border: 1px solid #a0a0a0;
  height: 24px;
  background: white;
  border-radius: 2px;
  overflow: hidden;
}
.igrp .inp {
  border: none;
  flex: 1;
  min-width: 0;
}
.blkp {
  width: 24px;
  flex-shrink: 0;
  background: #e0e0e0;
  border: none;
  border-left: 1px solid #a0a0a0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.blkp:hover {
  background: #d0d0d0;
}
.blkp:disabled {
  opacity: 0.5;
  cursor: default;
}

.poe-status-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 6px;
}
.poe-status-badge.open {
  background: #ffebee;
  color: #c62828;
}
.poe-status-badge.proses {
  background: #e3f2fd;
  color: #1565c0;
}
.poe-status-badge.close {
  background: #eeeeee;
  color: #424242;
}

.poe-alert-wrap {
  margin-bottom: 6px;
}
.poe-alert {
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 4px;
}
.poe-alert.info {
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
}
.poe-alert.success {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}
.poe-alert.error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
}
.poe-alert.warning {
  background: #fff8e1;
  color: #f57f17;
  border: 1px solid #ffe082;
}

/* ── right-column: tabs + split grid ── */
.poe-right {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
}
.poe-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.poe-tab {
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid #e0e0e0;
  background: #f5f5f5;
  color: #616161;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
}
.poe-tab.active {
  background: #1565c0;
  color: white;
  border-color: #1565c0;
}
.poe-tab-panel {
  flex: 1;
  min-height: 0;
}
.poe-split {
  display: flex;
  gap: 10px;
  height: 100%;
}
.poe-half {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.poe-ket-wrap {
  flex: 1;
  border: 1px solid #bdbdbd;
  border-top: none;
  border-radius: 0 0 4px 4px;
}
.poe-ket-wrap .ta {
  height: 100%;
  border: none;
  resize: none;
}

.tbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 6px 12px;
  border-radius: 4px 4px 0 0;
  flex-shrink: 0;
}
.tbl-header.teal {
  background: #00695c;
}
.tbl-header.purple {
  background: #4527a0;
}
.tbl-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.tbl-wrap {
  overflow: auto;
  border: 1px solid #bdbdbd;
  border-top: none;
  background: white;
  border-radius: 0 0 4px 4px;
  min-width: 0;
  width: 100%;
}
.gt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.gt thead th {
  background: #eeeeee;
  border: 1px solid #bdbdbd;
  padding: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #424242;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}
.gt thead th.tc {
  text-align: center;
}
.gt thead th.tr {
  text-align: right;
}
.gt tbody td {
  border: 1px solid #e0e0e0;
  height: 26px;
}
.gt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.gt tfoot td {
  background: #f5f5f5;
  padding: 5px 6px;
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
  height: 26px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 6px;
  font-family: inherit;
  color: #212121;
  box-sizing: border-box;
}
.ci.ro {
  background: #dde8f0 !important;
}
.ci:focus {
  background: #e3f2fd !important;
  outline: 1px solid #1976d2;
  outline-offset: -1px;
}
.ci.tc {
  text-align: center;
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
  height: 26px;
}
.cell-grp .ci {
  flex: 1;
}
.ci-btn {
  width: 24px;
  flex-shrink: 0;
  background: #eeeeee;
  border: none;
  border-left: 1px solid #e0e0e0;
  cursor: pointer;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ci-btn:hover {
  background: #e0e0e0;
}
.ci-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 12px;
}
.btn-del:hover {
  background: #ffebee;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 16px;
  font-size: 11px;
}

.ta {
  width: 100%;
  border: 1px solid #a0a0a0;
  padding: 6px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
}
.ta:focus {
  border-color: #1565c0;
}
</style>
