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

// Sebelum SPK pertama kali disimpan, spk_nomor masih kosong — pakai so_nomor
// sebagai key sementara. Backend memindahkan data ini ke nomor SPK final saat
// saveData (create) berhasil.
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
      <div class="layout-actions">
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
    </div>

    <div v-if="!layoutHeader && !isLoading" class="layout-empty">
      <IconFileSpreadsheet :size="40" color="#bdbdbd" />
      <div>
        Belum ada layout proses. Klik "Import dari Excel" untuk mengunggah.
      </div>
    </div>

    <template v-else-if="layoutHeader">
      <!-- Header info -->
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

      <!-- Dua kolom: PROOF & SEWING -->
      <div class="layout-grid">
        <div class="layout-col">
          <div class="col-title col-title--proof">Line Proof</div>
          <table class="layout-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Proses</th>
                <th>M/C</th>
                <th>Sepatu</th>
                <th>K.Jarum</th>
                <th class="tr">CT(jam)</th>
                <th class="tr">CT(dt)</th>
                <th class="tr">MP</th>
                <th>Operator</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in layoutProof" :key="i">
                <td class="text-center">{{ r.no_urut }}</td>
                <td>{{ r.proses }}</td>
                <td>{{ r.mc }}</td>
                <td>{{ r.sepatu }}</td>
                <td>{{ r.kjarum }}</td>
                <td class="tr">{{ r.ct_jam }}</td>
                <td class="tr">{{ r.ct_dt }}</td>
                <td class="tr">{{ r.mp }}</td>
                <td>{{ r.nama_op }}</td>
              </tr>
              <tr v-if="layoutProof.length === 0">
                <td colspan="9" class="empty-row">Tidak ada data</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="layout-col">
          <div class="col-title col-title--sewing">Sewing</div>
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
              <tr v-for="(r, i) in layoutSewing" :key="i">
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
    </template>
  </div>
</template>

<style scoped>
.layout-wrap {
  padding: 10px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  height: 100%;
  overflow-y: auto;
}
.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.layout-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.layout-title {
  font-size: 13px;
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
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.btn-upload:hover:not(:disabled) {
  opacity: 0.9;
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
  color: #bdbdbd;
}

.layout-info {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
}
.info-item {
  display: flex;
  flex-direction: column;
}
.info-lbl {
  font-size: 9px;
  color: #757575;
  text-transform: uppercase;
}
.info-val {
  font-size: 11px;
  font-weight: 600;
  color: #212121;
}

.layout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.layout-col {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}
.col-title {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  color: white;
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
  font-size: 10px;
}
.layout-table thead th {
  background: #f5f5f5;
  padding: 5px 6px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid #e0e0e0;
}
.layout-table tbody td {
  padding: 4px 6px;
  border-bottom: 1px solid #f0f0f0;
}
.tr {
  text-align: right;
}
.text-center {
  text-align: center;
}

.empty-row {
  text-align: center;
  padding: 16px;
  color: #bdbdbd;
  font-style: italic;
}
</style>
