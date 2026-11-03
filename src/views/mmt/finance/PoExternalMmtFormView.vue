<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { IconShoppingCartDown, IconPlus, IconTrash } from "@tabler/icons-vue";
import api from "@/services/api";

const route = useRoute();

interface DetailItem {
  no: number;
  kota: string;
  jumlah: number;
}

interface PoExtForm {
  nomor: string;
  tanggal: string;
  deadline: string;
  cab: string;
  spkNomor: string;
  spkNama: string;
  divisi: string;
  bahan: string;
  ukuran: string;
  finishing: string;
  jumlahSpk: number;
  supKode: string;
  supNama: string;
  supAlamat: string;
  supKota: string;
  keterangan: string;
  bahanSendiri: boolean;
  items: DetailItem[];
}

const initialData: PoExtForm = {
  nomor: "AUTO",
  tanggal: new Date().toISOString().substring(0, 10),
  deadline: new Date().toISOString().substring(0, 10),
  cab: "P01",
  spkNomor: "",
  spkNama: "",
  divisi: "",
  bahan: "",
  ukuran: "",
  finishing: "",
  jumlahSpk: 0,
  supKode: "",
  supNama: "",
  supAlamat: "",
  supKota: "",
  keterangan: "",
  bahanSendiri: false,
  items: [],
};

const {
  isEditMode,
  isLoading,
  isSaving,
  formData,
  showSaveDialog,
  showCancelDialog,
  showCloseDialog,
  executeSave,
  executeCancel,
  executeClose,
} = useForm<PoExtForm>({
  menuId: "5505",
  initialData,
  fetchApi: async () => {
    const nomor = route.params.nomor;
    const res = await api.get(`/mmt/po-external-mmt/${encodeURIComponent(String(nomor))}`);
    const data = res.data?.data || res.data;
    const header = data.header || data;
    const details = data.alokasi || data.details || data.detail || [];
    return {
      nomor: header.poe_nomor || header.Nomor || header.pe_nomor || String(nomor),
      tanggal: header.poe_tanggal
        ? String(header.poe_tanggal).substring(0, 10)
        : header.Tanggal
          ? String(header.Tanggal).substring(0, 10)
          : initialData.tanggal,
      deadline: header.poe_dateline
        ? String(header.poe_dateline).substring(0, 10)
        : header.DateLinePO
          ? String(header.DateLinePO).substring(0, 10)
          : initialData.deadline,
      cab: header.poe_cab || header.Cab || header.pe_cab || "P05",
      spkNomor: header.poe_spk_nomor || header.SPK || header.pe_spk || "",
      spkNama: header.spk_nama || header.NamaSPK || "",
      divisi: header.divisi || header.Divisi || header.spk_divisi || "",
      bahan: header.spk_kain || header.Bahan || "",
      ukuran: header.spk_ukuran || header.Ukuran || "",
      finishing: header.spk_finishing || header.poe_finishing || header.Finishing || "",
      jumlahSpk: Number(header.spk_jumlah || header.JumlahSpk || 0),
      supKode: header.poe_sup || header.KdSup || header.pe_sup || "",
      supNama: header.Sup_nama || header.Supplier || "",
      supAlamat: header.Sup_alamat || header.Alamat || "",
      supKota: header.Sup_kota || header.Kota || "",
      keterangan: header.poe_ket || header.Keterangan || header.pe_keterangan || "",
      bahanSendiri:
        header.poe_bahansendiri === "Y" ||
        header.BahanSendiri === 1 ||
        header.pe_bahansendiri === "Y",
      items: details.map((d: any, idx: number) => ({
        no: idx + 1,
        kota: d.poeda_kota || d.kota || d.ped_kota || "",
        jumlah: Number(d.poeda_jumlah || d.Jumlah || d.ped_jumlah || 0),
      })),
    };
  },
  submitApi: async (dataToSave: PoExtForm) => {
    const isEdit = Boolean(
      route.params.nomor || (dataToSave.nomor && dataToSave.nomor !== "AUTO"),
    );
    const payload = {
      isEditMode: isEdit,
      poe_nomor:
        isEdit && dataToSave.nomor !== "AUTO" ? dataToSave.nomor : null,
      poe_tanggal: dataToSave.tanggal,
      poe_dateline: dataToSave.deadline,
      poe_spk_nomor: dataToSave.spkNomor,
      poe_cab: dataToSave.cab || "P05",
      poe_sup: dataToSave.supKode,
      poe_ket: dataToSave.keterangan,
      poe_finishing: dataToSave.finishing,
      poe_jumlah: dataToSave.jumlahSpk,
      poe_bahansendiri: dataToSave.bahanSendiri ? "Y" : "N",
      alokasi: dataToSave.items.map((it: any) => ({
        alokasi: true,
        kota: it.kota,
        jumlah: Number(it.jumlah) || 0,
      })),
    };
    return await api.post("/mmt/po-external-mmt/save", payload);
  },
  onSuccessRoute: "/mmt/finance/po-external",
});

const addItem = () => {
  formData.value.items.push({
    no: formData.value.items.length + 1,
    kota: "",
    jumlah: 1,
  });
};

const removeItem = (idx: number) => {
  formData.value.items.splice(idx, 1);
  formData.value.items.forEach((it, i) => (it.no = i + 1));
};

const totalAlokasi = computed(() => {
  return formData.value.items.reduce((sum, it) => sum + (Number(it.jumlah) || 0), 0);
});

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(Math.round(v || 0));
</script>

<template>
  <BaseForm
    :title="isEditMode ? `Ubah PO External MMT (${formData.nomor})` : 'Tambah PO External MMT Baru'"
    menu-id="5505"
    :icon="IconShoppingCartDown"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="PO External MMT"
    desktop-mode
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="showSaveDialog = true"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <!-- ── KOLOM KIRI (HEADER, SPK & SUPPLIER SESUAI MMT) ── -->
    <template #left-column>
      <div class="desktop-form-section header-section">
        <div class="section-label">Data Header PO</div>

        <div class="fr">
          <label class="lbl">Nomor PO</label>
          <input :value="formData.nomor" readonly class="inp ro" style="width: 150px" placeholder="← Auto" />
        </div>

        <div class="fr">
          <label class="lbl">Tanggal PO</label>
          <input type="date" v-model="formData.tanggal" class="idate" style="width: 150px" />
        </div>

        <div class="fr">
          <label class="lbl">Deadline</label>
          <input type="date" v-model="formData.deadline" class="idate" style="width: 150px" />
        </div>

        <div class="fr">
          <label class="lbl">Cabang</label>
          <input v-model="formData.cab" class="inp" style="width: 90px" />
        </div>

        <div class="fr">
          <label class="lbl">Bahan Sendiri</label>
          <label class="ck">
            <input type="checkbox" v-model="formData.bahanSendiri" />
            <span>Ya (Bahan Disediakan Sendiri)</span>
          </label>
        </div>
      </div>

      <div class="desktop-form-section">
        <div class="section-label">Data SPK Terkait</div>

        <div class="fr">
          <label class="lbl">No. SPK</label>
          <input v-model="formData.spkNomor" class="inp flex-grow-1" placeholder="Nomor SPK..." />
        </div>

        <div class="fr">
          <label class="lbl">Nama SPK</label>
          <input v-model="formData.spkNama" class="inp flex-grow-1 ro" readonly placeholder="Nama Pekerjaan..." />
        </div>

        <div class="fr">
          <label class="lbl">Bahan</label>
          <input v-model="formData.bahan" class="inp flex-grow-1 ro" readonly placeholder="Bahan..." />
        </div>

        <div class="fr">
          <label class="lbl">Ukuran</label>
          <input v-model="formData.ukuran" class="inp flex-grow-1 ro" readonly placeholder="Ukuran..." />
        </div>

        <div class="fr">
          <label class="lbl">Jumlah SPK</label>
          <input :value="fmt(formData.jumlahSpk)" class="inp ro tr" style="width: 100px" readonly />
        </div>
      </div>

      <div class="desktop-form-section">
        <div class="section-label">Supplier / Rekanan</div>

        <div class="fr">
          <label class="lbl">Kode Sup</label>
          <input v-model="formData.supKode" class="inp" style="width: 100px" placeholder="Kode..." />
        </div>

        <div class="fr">
          <label class="lbl">Supplier</label>
          <input v-model="formData.supNama" class="inp flex-grow-1" placeholder="Nama Supplier..." />
        </div>

        <div class="fr">
          <label class="lbl">Alamat</label>
          <input v-model="formData.supAlamat" class="inp flex-grow-1" placeholder="Alamat Supplier..." />
        </div>

        <div class="fr">
          <label class="lbl">Kota</label>
          <input v-model="formData.supKota" class="inp flex-grow-1" placeholder="Kota Supplier..." />
        </div>

        <div class="fr">
          <label class="lbl">Keterangan</label>
          <input v-model="formData.keterangan" class="inp flex-grow-1" placeholder="Catatan PO External..." />
        </div>
      </div>
    </template>

    <!-- ── KOLOM KANAN (GRID ALOKASI KOTA SESUAI MMT) ── -->
    <template #right-column>
      <div class="desktop-form-section d-flex flex-column h-100 pa-0">
        <div class="tbl-header">
          <span class="tbl-title">Rincian Alokasi Kota Pengiriman</span>
          <button type="button" class="btn-add" @click="addItem">
            <IconPlus :size="13" class="mr-1" /> Tambah Alokasi
          </button>
        </div>

        <div class="tbl-wrap flex-grow-1" style="min-height: 280px; max-height: calc(100vh - 350px)">
          <table class="gt">
            <thead>
              <tr>
                <th style="width: 40px" class="tc">No</th>
                <th>Nama Kota Alokasi</th>
                <th style="width: 140px" class="tr">Jumlah (Pcs)</th>
                <th style="width: 40px" class="tc"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(it, idx) in formData.items" :key="idx">
                <td class="tc">{{ it.no }}</td>
                <td class="p0">
                  <input type="text" v-model="it.kota" class="ci" placeholder="Ketik nama kota..." />
                </td>
                <td class="p0">
                  <input type="number" v-model.number="it.jumlah" class="ci tr fw" />
                </td>
                <td class="tc p0">
                  <button type="button" class="btn-del" @click="removeItem(idx)">
                    <IconTrash :size="13" />
                  </button>
                </td>
              </tr>
              <tr v-if="formData.items.length === 0">
                <td colspan="4" class="tc py-4 text-grey text-caption">
                  Belum ada alokasi kota. Klik '+ Tambah Alokasi' di atas.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer Total Alokasi -->
        <div class="summary-footer">
          <div class="sum-item grand">
            <span>Total Alokasi:</span>
            <b>{{ fmt(totalAlokasi) }} Pcs</b>
          </div>
        </div>
      </div>
    </template>
  </BaseForm>
</template>

<style scoped>
.desktop-form-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}
.section-label {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  margin-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 4px;
}
.fr { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.lbl { width: 90px; flex-shrink: 0; font-weight: 600; color: #444; font-size: 11px; }
.inp { height: 24px; border: 1px solid #ccc; border-radius: 3px; padding: 0 6px; font-size: 11px; background: white; outline: none; min-width: 0; }
.inp:focus, .idate:focus { border-color: #1976d2; }
.ro { background: #f5f5f5 !important; color: #555 !important; }
.idate { height: 24px; border: 1px solid #ccc; border-radius: 3px; padding: 0 4px; font-size: 11px; background: white; outline: none; }
.ck { display: flex; align-items: center; gap: 4px; font-size: 11px; cursor: pointer; }
.tc { text-align: center; }
.tr { text-align: right; }
.fw { font-weight: 700; }
.p0 { padding: 0 !important; }

/* Grid Table */
.tbl-header { display: flex; align-items: center; justify-content: space-between; background: #1565c0; color: white; padding: 6px 12px; border-radius: 6px 6px 0 0; }
.tbl-title { font-size: 11px; font-weight: 700; text-transform: uppercase; }
.btn-add { background: rgba(255, 255, 255, 0.2); color: white; border: 1px solid rgba(255, 255, 255, 0.4); padding: 3px 8px; font-size: 11px; font-weight: 600; cursor: pointer; border-radius: 3px; }
.btn-add:hover { background: rgba(255, 255, 255, 0.3); }
.tbl-wrap { overflow: auto; border: 1px solid #ccc; border-top: none; background: white; }
.gt { width: 100%; border-collapse: collapse; font-size: 11px; }
.gt th { background: #f5f5f5; border-bottom: 2px solid #ddd; border-right: 1px solid #e0e0e0; padding: 5px 6px; text-align: left; font-weight: 700; }
.gt td { border-bottom: 1px solid #eee; border-right: 1px solid #f0f0f0; padding: 4px 6px; }
.ci { width: 100%; height: 24px; border: none; outline: none; padding: 0 4px; font-size: 11px; background: transparent; }
.ci:focus { background: #e3f2fd; }
.btn-del { background: transparent; border: none; color: #e53935; cursor: pointer; padding: 2px; }
.btn-del:hover { color: #b71c1c; }

.summary-footer { display: flex; justify-content: flex-end; gap: 16px; padding: 8px 12px; background: #fafafa; border: 1px solid #ccc; border-top: none; border-radius: 0 0 6px 6px; font-size: 11px; }
.sum-item.grand { color: #1565c0; font-size: 12px; }
</style>
