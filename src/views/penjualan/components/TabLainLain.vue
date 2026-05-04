<script setup lang="ts">
import { ref, computed } from "vue";
import { useToast } from "vue-toastification";

const props = defineProps<{ formData: any; isEdit: boolean }>();
const emit = defineEmits(["upload-email"]);
const toast = useToast();

const totalQtySize = computed(
  () =>
    props.formData.Sizes?.reduce(
      (s: number, i: any) => s + (Number(i.qty) || 0),
      0,
    ) || 0,
);

const updateToKetUkuran = () => {
  if (totalQtySize.value === 0) return;
  const parts = props.formData.Sizes.filter((x: any) => Number(x.qty) > 0).map(
    (x: any) => `${x.size}=${x.qty}`,
  );
  props.formData.Ukuran = parts.join(", ");
  toast.success("Berhasil di-update ke Ket. Ukuran");
};

// Email image
const showEmailDialog = ref(false);
const fileEmailRef = ref<HTMLInputElement | null>(null);

const displayEmailUrl = computed(() => {
  if (props.formData.EmailImageBlob) return props.formData.EmailImageBlob;
  if (!props.isEdit) return "";
  const id = props.formData.Nomor;
  if (!id) return "";
  let name = id;
  const m = name.match(/(MH\.\d{4}\.\d+)/i);
  if (m) name = m[1];
  else {
    name =
      name
        .replace(/.*imagemintaharga/i, "")
        .replace(/.*Downloads/i, "")
        .replace(/\\/g, "/")
        .split("/")
        .pop()
        ?.replace(/\.(jpe?g|png)$/i, "") || "";
  }
  return `http://103.94.238.252:8888/file-gambar/map/${encodeURIComponent(name)}-email.jpg`;
});

const onEmailChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.size > 500_000) {
    toast.error("Ukuran gambar Screenshot Email tidak boleh > 500 Kb.");
    return;
  }
  props.formData.EmailImageName = file.name;
  props.formData.EmailImageBlob = URL.createObjectURL(file);
  emit("upload-email", file);
};
</script>

<template>
  <div class="ll-layout" style="height: 100%; min-height: 0">
    <!-- ── 1. Detail Rencana Order ── -->
    <div
      class="ll-card"
      style="
        width: 260px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
      "
    >
      <div class="ll-card-title">
        Detail Rencana Order
        <span class="ll-badge">{{ totalQtySize }}</span>
      </div>
      <div class="ll-table-wrap">
        <table class="ll-table">
          <thead>
            <tr>
              <th style="text-align: left">Size</th>
              <th style="width: 52px">Qty</th>
              <th style="width: 46px">L.Badan</th>
              <th style="width: 46px">P.Badan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in formData.Sizes" :key="idx">
              <td class="ll-td-lbl">{{ row.size }}</td>
              <td class="ll-td-inp">
                <input
                  type="number"
                  v-model.number="row.qty"
                  class="ll-cell tr"
                />
              </td>
              <td class="ll-td-inp">
                <input
                  type="number"
                  v-model.number="row.lb"
                  class="ll-cell tr"
                />
              </td>
              <td class="ll-td-inp">
                <input
                  type="number"
                  v-model.number="row.pb"
                  class="ll-cell tr"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <button type="button" class="ll-update-btn" @click="updateToKetUkuran">
        <v-icon size="13" class="mr-1">mdi-check</v-icon> Update ke Ket. Ukuran
      </button>
    </div>

    <!-- ── 2. Keterangan + Komponen ── -->
    <div
      class="ll-card"
      style="
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 0;
      "
    >
      <!-- Keterangan (free text, scrollable) -->
      <div
        style="
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          margin-bottom: 8px;
        "
      >
        <div
          style="
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 150px;
          "
        >
          <div class="ll-card-title">Keterangan (Catatan Pekerjaan)</div>
          <textarea
            v-model="formData.Keterangan"
            class="ll-textarea"
            placeholder="Isi keterangan atau spesifikasi di sini..."
            style="flex: 1; width: 100%; border: 1px solid #1565c0"
          ></textarea>
        </div>
      </div>

      <!-- Keterangan Komponen -->
      <div
        style="flex: 1; min-height: 0; display: flex; flex-direction: column"
      >
        <div class="ll-card-title">
          Keterangan Komponen
          <span class="ll-hint">— hanya yang dicentang akan disimpan</span>
        </div>
        <div class="ll-table-wrap" style="flex: 1">
          <table class="ll-table">
            <thead>
              <tr>
                <th style="width: 38px">Kode</th>
                <th style="text-align: left">Nama</th>
                <th style="width: 44px">Pakai</th>
                <th style="text-align: left">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in formData.Komponen" :key="idx">
                <td class="ll-td-ctr ll-td-lbl">{{ row.kode }}</td>
                <td class="ll-td-lbl">{{ row.nama }}</td>
                <td class="ll-td-ctr ll-td-chk">
                  <input
                    type="checkbox"
                    v-model="row.pakai"
                    style="accent-color: #1565c0; cursor: pointer"
                  />
                </td>
                <td class="ll-td-inp">
                  <input
                    type="text"
                    v-model="row.ket"
                    class="ll-cell"
                    :disabled="!row.pakai"
                    :class="{ 'll-cell-disabled': !row.pakai }"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── 3. Screenshot Email ── -->
    <div
      class="ll-card"
      style="
        width: 280px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
      "
    >
      <div class="ll-card-title">Screenshot Email</div>

      <div class="ll-upload-name">
        {{ formData.EmailImageName || "Ukuran Maksimal 500 Kb" }}
      </div>

      <div class="ll-upload-row">
        <button
          type="button"
          class="ll-upload-btn"
          @click="fileEmailRef?.click()"
        >
          <v-icon size="13" class="mr-1">mdi-upload</v-icon> Upload
        </button>
        <button
          type="button"
          class="ll-upload-btn blue"
          @click="displayEmailUrl && (showEmailDialog = true)"
        >
          <v-icon size="13" class="mr-1">mdi-fullscreen</v-icon> Full Screen
        </button>
      </div>

      <div class="ll-img-box" style="flex: 1">
        <img
          v-if="displayEmailUrl"
          :src="displayEmailUrl"
          class="ll-img"
          @click="showEmailDialog = true"
          style="cursor: pointer"
        />
        <div v-else class="ll-img-empty">
          <v-icon size="28" color="#bdbdbd">mdi-image-outline</v-icon>
          <div>No Image available</div>
        </div>
      </div>

      <input
        ref="fileEmailRef"
        type="file"
        accept="image/*"
        style="display: none"
        @change="onEmailChange"
      />
    </div>
  </div>

  <!-- Preview dialog -->
  <v-dialog v-model="showEmailDialog" max-width="800px">
    <div class="preview-card">
      <div class="preview-header">
        <span>Preview Screenshot Email</span>
        <button class="preview-close" @click="showEmailDialog = false">
          ✕
        </button>
      </div>
      <div class="preview-body">
        <v-img
          :src="displayEmailUrl"
          max-height="600"
          contain
          class="bg-white rounded"
        >
          <template #placeholder>
            <div class="d-flex align-center justify-center fill-height">
              <v-progress-circular indeterminate color="primary" />
            </div>
          </template>
        </v-img>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
/* ── Root layout ── */
.ll-layout {
  display: flex;
  gap: 10px;
  align-items: stretch;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ── Card ── */
.ll-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 10px;
}
.ll-card-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1565c0;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ll-badge {
  background: #1565c0;
  color: white;
  border-radius: 10px;
  padding: 0 7px;
  font-size: 10px;
  font-weight: 700;
}
.ll-hint {
  font-size: 10px;
  font-weight: 400;
  color: #757575;
  text-transform: none;
  letter-spacing: 0;
}

/* ── Table ── */
.ll-table-wrap {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  margin-bottom: 6px;
  min-height: 0;
}
/* ── Keterangan textarea ── */
.ll-textarea {
  width: 100%;
  flex: 1;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 5px 7px;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  resize: none;
  box-sizing: border-box;
  color: #212121;
  overflow-y: auto;
  display: block;
}
.ll-textarea:focus {
  border-color: #1565c0;
}
.ll-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
}
.ll-table thead th {
  background: #1565c0;
  color: white;
  font-weight: 600;
  padding: 5px 6px;
  position: sticky;
  top: 0;
  z-index: 1;
  border: 1px solid #0d47a1;
  white-space: nowrap;
}
.ll-table td {
  border: 1px solid #eeeeee;
}
.ll-table tr:nth-of-type(even) td {
  background: #fafafa;
}
.ll-table tr:hover td {
  background: #e3f2fd !important;
}

.ll-td-lbl {
  padding: 2px 5px;
  background: #f5f5f5 !important;
  color: #424242;
  font-size: 11px;
}
.ll-td-inp {
  padding: 0;
}
.ll-td-ctr {
  text-align: center;
}
.ll-td-chk {
  background: white !important;
}

.ll-cell {
  width: 100%;
  height: 24px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 5px;
  font-family: inherit;
  color: #212121;
}
.ll-cell:focus {
  background: #e3f2fd;
}
.ll-cell-disabled {
  background: #f5f5f5 !important;
  color: #9e9e9e;
  cursor: default;
}
.tr {
  text-align: right;
}

/* ── Update button ── */
.ll-update-btn {
  width: 100%;
  height: 28px;
  background: #00897b;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ll-update-btn:hover {
  background: #00796b;
}

/* ── Email upload ── */
.ll-upload-name {
  height: 24px;
  line-height: 24px;
  font-size: 10px;
  color: #757575;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 0 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 6px;
}
.ll-upload-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.ll-upload-btn {
  flex: 1;
  height: 28px;
  background: #546e7a;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ll-upload-btn.blue {
  background: #1565c0;
}
.ll-upload-btn:hover {
  opacity: 0.9;
}

.ll-img-box {
  min-height: 120px;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.ll-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.ll-img-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #bdbdbd;
  font-size: 10px;
}

/* ── Preview dialog ── */
.preview-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
}
.preview-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  cursor: pointer;
}
.preview-close:hover {
  color: white;
}
.preview-body {
  padding: 16px;
  background: #f5f5f5;
}
</style>
