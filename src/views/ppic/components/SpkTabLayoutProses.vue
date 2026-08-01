<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import { spkFormService } from "@/services/ppic/spkFormService";
import { IconUpload, IconFileSpreadsheet } from "@tabler/icons-vue";
const props = defineProps<{
  formData: any;
  isEdit: boolean;
}>();
const toast = useToast();
const fileRef = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const isLoading = ref(false);
const layoutHeader = ref<any>(null);
const layoutProof = ref<any[]>([]);
const layoutSewing = ref<any[]>([]);
const spkNomor = () => props.formData.spk_nomor || props.formData.so_nomor;
const isDraftKey = computed(
  () => !props.formData.spk_nomor && !!props.formData.so_nomor,
);
const loadLayout = async () => {
  const nomor = spkNomor();
  if (!nomor) return;
  isLoading.value = true;
  try {
    const res = await spkFormService.getLayoutProses(nomor);
    layoutHeader.value = res.data.data?.header || null;
    layoutProof.value = res.data.data?.proof || [];
    layoutSewing.value = res.data.data?.sewing || [];
  } catch {
    layoutHeader.value = null;
    layoutProof.value = [];
    layoutSewing.value = [];
  } finally {
    isLoading.value = false;
  }
};
watch(() => props.formData.spk_nomor, loadLayout, { immediate: true });
watch(() => props.formData.so_nomor, loadLayout);
const num = (v: any) =>
  Number(v || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
const onFileChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const nomor = spkNomor();
  if (!nomor) {
    toast.warning("Pilih Sales Order terlebih dahulu sebelum upload layout.");
    return;
  }
  isUploading.value = true;
  try {
    const res = await spkFormService.importLayoutProses(nomor, file);
    toast.success(res.data.message || "Layout berhasil diimport.");
    await loadLayout();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal import layout proses.");
  } finally {
    isUploading.value = false;
    if (fileRef.value) fileRef.value.value = "";
  }
};
</script>
<template>
  <div class="layout-wrap">
    <div class="layout-card">
      <div class="layout-header">
        <div class="layout-title-group">
          <div class="layout-title">Layout Proses Kerja Sewing</div>
          <span
            v-if="isDraftKey"
            class="draft-badge"
            title="Akan dipindahkan ke nomor SPK setelah disimpan"
          >
            Draft (belum tersimpan sebagai SPK)
          </span>
        </div>
        <button
          type="button"
          class="btn-upload"
          :disabled="isUploading"
          @click="fileRef?.click()"
        >
          <IconUpload :size="14" class="mr-1" />
          {{ isUploading ? "Mengupload..." : "Import dari Excel" }}
        </button>
        <input
          ref="fileRef"
          type="file"
          accept=".xlsx,.xls"
          style="display: none"
          @change="onFileChange"
        />
      </div>

      <div v-if="!layoutHeader && !isLoading" class="layout-empty">
        <IconFileSpreadsheet :size="40" color="#bdbdbd" />
        <div>
          Belum ada layout proses. Klik "Import dari Excel" untuk mengunggah.
        </div>
      </div>

      <template v-else-if="layoutHeader">
        <div class="layout-info">
          <div class="info-item">
            <span class="info-lbl">No Memo</span>
            <span class="info-val">{{ layoutHeader.lh_no_memo }}</span>
          </div>
          <div class="info-item">
            <span class="info-lbl">Nama Memo</span>
            <span class="info-val">{{ layoutHeader.lh_nama_memo }}</span>
          </div>
          <div class="info-item">
            <span class="info-lbl">Line</span>
            <span class="info-val">{{ layoutHeader.lh_line }}</span>
          </div>
          <div class="info-item">
            <span class="info-lbl">POJ</span>
            <span class="info-val">{{ layoutHeader.lh_poj }}</span>
          </div>
          <div class="info-item">
            <span class="info-lbl">MP</span>
            <span class="info-val">{{ layoutHeader.lh_mp }}</span>
          </div>
          <div class="info-item">
            <span class="info-lbl">JK</span>
            <span class="info-val">{{ layoutHeader.lh_jk }}</span>
          </div>
          <div class="info-item">
            <span class="info-lbl">Efisiensi</span>
            <span class="info-val">{{ layoutHeader.lh_efisiensi }}</span>
          </div>
          <div class="info-item">
            <span class="info-lbl">Target/Hari</span>
            <span class="info-val">{{ layoutHeader.lh_target_hari }}</span>
          </div>
        </div>

        <div class="layout-grid">
          <div class="layout-col">
            <div class="col-title col-title--proof">Proses</div>
            <table class="layout-table">
              <thead>
                <tr>
                  <th>Operator</th>
                  <th class="tr">MP</th>
                  <th class="tr">CT(dt)</th>
                  <th class="tr">CT(jam)</th>
                  <th>Sepatu</th>
                  <th>K.Jarum</th>
                  <th>M/C</th>
                  <th>Proses</th>
                  <th>No</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in [...layoutProof].reverse()" :key="i">
                  <td>{{ r.nama_op }}</td>
                  <td class="tr">{{ r.mp }}</td>
                  <td class="tr">{{ r.ct_dt }}</td>
                  <td class="tr">{{ r.ct_jam }}</td>
                  <td>{{ r.sepatu }}</td>
                  <td>{{ r.kjarum }}</td>
                  <td>{{ r.mc }}</td>
                  <td>{{ r.proses }}</td>
                  <td class="text-center">{{ r.no_urut }}</td>
                </tr>
                <tr v-if="layoutProof.length === 0">
                  <td colspan="9" class="empty-row">Tidak ada data</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="layout-col">
            <div class="col-title col-title--sewing">Proses</div>
            <table class="layout-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Proses</th>
                  <th>M/C</th>
                  <th>Uk.Jarum</th>
                  <th>Sepatu</th>
                  <th class="tr">CT(jam)</th>
                  <th class="tr">CT(dt)</th>
                  <th class="tr">MP</th>
                  <th>Operator</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in [...layoutSewing].reverse()" :key="i">
                  <td class="text-center">{{ r.no_urut }}</td>
                  <td>{{ r.proses }}</td>
                  <td>{{ r.mc }}</td>
                  <td>{{ r.ukjarum }}</td>
                  <td>{{ r.sepatu }}</td>
                  <td class="tr">{{ r.ct_jam }}</td>
                  <td class="tr">{{ r.ct_dt }}</td>
                  <td class="tr">{{ r.mp }}</td>
                  <td>{{ r.nama_op }}</td>
                </tr>
                <tr v-if="layoutSewing.length === 0">
                  <td colspan="9" class="empty-row">Tidak ada data</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Summary & Total -->
        <div class="summary-box">
          <div class="summary-title">Ringkasan</div>
          <div class="summary-grid">
            <div class="summary-col">
              <div class="summary-col-lbl">Summary 1 (Proof)</div>
              <div class="summary-row">
                <span>MP</span><b>{{ num(layoutHeader.lh_summary1_mp) }}</b>
              </div>
              <div class="summary-row">
                <span>CT (dt)</span
                ><b>{{ num(layoutHeader.lh_summary1_ct_dt) }}</b>
              </div>
              <div class="summary-row">
                <span>CT (jam)</span
                ><b>{{ num(layoutHeader.lh_summary1_ct_jam) }}</b>
              </div>
            </div>
            <div class="summary-col">
              <div class="summary-col-lbl">Summary 2 (Sewing)</div>
              <div class="summary-row">
                <span>CT (jam)</span
                ><b>{{ num(layoutHeader.lh_summary2_ct_jam) }}</b>
              </div>
              <div class="summary-row">
                <span>CT (dt)</span
                ><b>{{ num(layoutHeader.lh_summary2_ct_dt) }}</b>
              </div>
              <div class="summary-row">
                <span>MP</span><b>{{ num(layoutHeader.lh_summary2_mp) }}</b>
              </div>
            </div>
            <div class="summary-col summary-col--total">
              <div class="summary-col-lbl">Total</div>
              <div class="summary-row">
                <span>MP</span><b>{{ num(layoutHeader.lh_total_mp) }}</b>
              </div>
              <div class="summary-row">
                <span>CT (dt)</span
                ><b>{{ num(layoutHeader.lh_total_ct_dt) }}</b>
              </div>
              <div class="summary-row">
                <span>CT (jam)</span
                ><b>{{ num(layoutHeader.lh_total_ct_jam) }}</b>
              </div>
              <div class="summary-row summary-row--menit">
                <span>Total Dalam Menit</span
                ><b>{{ num(layoutHeader.lh_total_menit) }}</b>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
<style scoped>
.layout-wrap {
  padding: 10px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}
.layout-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-top: 3px solid #1565c0;
  border-radius: 6px;
  padding: 14px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eeeeee;
}
.layout-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.layout-title {
  font-size: 14px;
  font-weight: 700;
  color: #1565c0;
}
.draft-badge {
  font-size: 9px;
  font-weight: 700;
  color: #e65100;
  background: #fff3e0;
  border: 1px solid #ffcc80;
  border-radius: 3px;
  padding: 2px 8px;
  text-transform: uppercase;
}
.btn-upload {
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 7px 16px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.btn-upload:hover:not(:disabled) {
  background: #0d47a1;
}
.btn-upload:disabled {
  background: #bdbdbd;
  cursor: not-allowed;
}
.layout-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 0;
  color: #9e9e9e;
  font-size: 12px;
}
.layout-info {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  background: #f8f9fb;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 12px;
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.info-lbl {
  font-size: 9px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.info-val {
  font-size: 12px;
  font-weight: 700;
  color: #212121;
}
.layout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.layout-col {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}
.col-title {
  padding: 7px 12px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.02em;
}
.col-title--proof {
  background: #455a64;
}
.col-title--sewing {
  background: #1565c0;
}
.layout-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10.5px;
}
.layout-table thead th {
  background: #f5f5f5;
  padding: 6px 7px;
  font-weight: 700;
  color: #37474f;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid #e0e0e0;
}
.layout-table tbody td {
  padding: 5px 7px;
  border-bottom: 1px solid #f0f0f0;
  color: #333;
}
.layout-table tbody tr:nth-child(even) td {
  background: #fafafa;
}
.tr {
  text-align: right;
}
.text-center {
  text-align: center;
}
.empty-row {
  text-align: center;
  padding: 18px;
  color: #bdbdbd;
  font-style: italic;
}
.summary-box {
  margin-top: 14px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}
.summary-title {
  background: #37474f;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 12px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1px;
  background: #e0e0e0;
}
.summary-col {
  background: white;
  padding: 10px 14px;
}
.summary-col--total {
  background: #fff8e1;
}
.summary-col-lbl {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  margin-bottom: 6px;
  text-transform: uppercase;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  padding: 2px 0;
  color: #424242;
}
.summary-row b {
  color: #212121;
}
.summary-row--menit {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px dashed #ccc;
  color: #e65100;
}
.summary-row--menit b {
  color: #e65100;
}
</style>
