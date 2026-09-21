<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseForm from "@/components/BaseForm.vue";
import { useForm } from "@/composables/useForm";
import { sjHasilMakloonService } from "@/services/garmen/sjHasilMakloonService";
import { IconTruckDelivery } from "@tabler/icons-vue";

interface SjHasilItem {
  DtfMaklonId: number;
  KodeHasil: string;
  NamaHasil: string;
  Satuan: string;
  QtyHasil: number;
  BsAfval: number;
  LhkNomor: string;
}
interface SjHasilFormData {
  MklNomor: string;
  CabAsal: string;
  NamaCabAsal: string;
  Tanggal: string;
  Items: SjHasilItem[];
}

const route = useRoute();
const router = useRouter();
const toast = useToast();

const ids = ((route.query.ids as string) || "")
  .split(",")
  .filter(Boolean)
  .map(Number);

const defaultData: SjHasilFormData = {
  MklNomor: "",
  CabAsal: "",
  NamaCabAsal: "",
  Tanggal: new Date().toISOString().slice(0, 10),
  Items: [],
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
} = useForm<SjHasilFormData>({
  menuId: "182",
  initialData: defaultData,
  immediate: false, // fetch manual — bukan mode edit standar (route pakai query.ids, bukan nomor/kode)
  fetchApi: async (): Promise<SjHasilFormData> => {
    const res = await sjHasilMakloonService.getCreateData(ids);
    const { header, items } = res.data.data;
    return {
      MklNomor: header.mkl_nomor,
      CabAsal: header.mkl_cab_asal,
      NamaCabAsal: header.NamaCabAsal,
      Tanggal: new Date().toISOString().slice(0, 10),
      Items: items.map((r: any) => ({
        DtfMaklonId: r.DtfMaklonId,
        KodeHasil: r.KodeHasil,
        NamaHasil: r.NamaHasil,
        Satuan: r.Satuan,
        QtyHasil: Number(r.QtyHasil) || 0,
        BsAfval: Number(r.BsAfval) || 0,
        LhkNomor: r.LhkNomor || "",
      })),
    };
  },
  submitApi: (data) =>
    sjHasilMakloonService.create({
      tanggal: data.Tanggal,
      ids: data.Items.map((i) => i.DtfMaklonId),
    }),
  onSuccess: (res: any) => {
    const nomor = res?.data?.data?.nomor || "";
    toast.success(`SJ Hasil Maklon ${nomor} berhasil disimpan.`);
    const url = router.resolve({
      name: "SjHasilMakloonPrint",
      params: { nomor },
    }).href;
    window.open(url, "_blank");
    router.push("/garmen/makloon/sj-hasil-makloon");
  },
});

onMounted(() => {
  if (!ids.length) {
    toast.error("Tidak ada baris yang dipilih.");
    router.push("/garmen/makloon/sj-hasil-makloon");
    return;
  }
  fetchData();
});

const totalQtyHasil = computed(() =>
  formData.value.Items.reduce((s, r) => s + (Number(r.QtyHasil) || 0), 0),
);
const totalBs = computed(() =>
  formData.value.Items.reduce((s, r) => s + (Number(r.BsAfval) || 0), 0),
);

const numFmt = (v: any) =>
  v != null ? Number(v).toLocaleString("id-ID") : "0";

const validateSave = () => {
  if (!formData.value.Items.length) {
    return toast.warning("Tidak ada item untuk disimpan.");
  }
  showSaveDialog.value = true;
};
</script>

<template>
  <BaseForm
    title="Buat SJ Hasil Maklon"
    menu-id="182"
    :icon="IconTruckDelivery"
    :is-loading="isLoading"
    :is-saving="isSaving"
    item-name="SJ Hasil Maklon"
    v-model:show-save-dialog="showSaveDialog"
    v-model:show-cancel-dialog="showCancelDialog"
    v-model:show-close-dialog="showCloseDialog"
    @validate-save="validateSave"
    @confirm-save="executeSave"
    @confirm-cancel="executeCancel"
    @confirm-close="executeClose"
  >
    <div class="shm-wrap desktop-form-section header-section">
      <div class="shm-header">
        <div class="fr">
          <span class="lbl">No. Maklon</span>
          <span class="val mono">{{ formData.MklNomor }}</span>
        </div>
        <div class="fr">
          <span class="lbl">Gudang Penerima</span>
          <span class="val"
            >{{ formData.CabAsal }} — {{ formData.NamaCabAsal }}</span
          >
          <v-chip size="x-small" color="grey" variant="tonal" class="ml-2"
            >Wajib balik ke cabang asal</v-chip
          >
        </div>
        <div class="fr">
          <span class="lbl">Tanggal Terima</span>
          <input type="date" v-model="formData.Tanggal" class="f-inp" />
        </div>
      </div>

      <div class="section-title mt-4 mb-2">
        Item Hasil Otomatis dari Nomor Maklon
      </div>

      <table class="shm-table">
        <thead>
          <tr>
            <th style="width: 30px">No</th>
            <th>Item Barang Jadi</th>
            <th class="tr">Qty SJ Hasil</th>
            <th class="tr">Qty Diterima</th>
            <th class="tr">BS</th>
            <th>Satuan</th>
            <th>No. LHK DTF</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in formData.Items" :key="item.DtfMaklonId">
            <td class="tc">{{ i + 1 }}</td>
            <td>
              <div class="mono">{{ item.KodeHasil }}</div>
              <div class="row-subtext">{{ item.NamaHasil }}</div>
            </td>
            <td class="tr">{{ numFmt(item.QtyHasil) }}</td>
            <td class="tr fw">{{ numFmt(item.QtyHasil) }}</td>
            <td class="tr">{{ numFmt(item.BsAfval) }}</td>
            <td>{{ item.Satuan }}</td>
            <td class="mono">{{ item.LhkNomor || "-" }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="tr fw">Total</td>
            <td class="tr fw">{{ numFmt(totalQtyHasil) }}</td>
            <td class="tr fw">{{ numFmt(totalBs) }}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>

      <div class="shm-note">
        Saat [Simpan Hasil Maklon] → Stock {{ formData.CabAsal }} bertambah
        sebesar Qty Diterima.
      </div>
    </div>
  </BaseForm>
</template>

<style scoped>
.shm-wrap {
  width: 100%;
}
.shm-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
}
.fr {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lbl {
  width: 150px;
  font-weight: 700;
  color: #444;
  flex-shrink: 0;
}
.val {
  color: #212121;
}
.f-inp {
  height: 30px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
}
.section-title {
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
}
.mt-4 {
  margin-top: 16px;
}
.mb-2 {
  margin-bottom: 8px;
}
.shm-table {
  width: 100%;
  border-collapse: collapse;
}
.shm-table th {
  background: #eeeeee;
  border: 1px solid #bdbdbd;
  padding: 6px 8px;
  text-align: left;
  font-weight: 700;
}
.shm-table td {
  border: 1px solid #e0e0e0;
  padding: 5px 8px;
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
.mono {
  font-family: monospace;
  font-weight: 600;
}
.row-subtext {
  font-size: 10px;
  color: #888;
}
.shm-table tfoot td {
  background: #f0f4f8;
}
.shm-note {
  margin-top: 10px;
  color: #2e7d32;
  font-weight: 600;
}
</style>
