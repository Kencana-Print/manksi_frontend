<script setup lang="ts">
import { ref, watch } from "vue";
import { useToast } from "vue-toastification";
import { updateSjMapService } from "@/services/penjualan/updateSjMapService";

const props = defineProps<{ modelValue: boolean; nomor: string }>();
const emit = defineEmits(["update:modelValue", "refresh"]);
const toast = useToast();

const isLoading = ref(false);
const isSaving = ref(false);

const statusOptions = [
  { value: 0, label: "Tidak Ada Status" },
  { value: 1, label: "Pengiriman" },
  { value: 2, label: "Konfirmasi Ke Client" },
  { value: 3, label: "ACC Client" },
];

const form = ref<any>({ header: {}, details: [] });

const fmt = (d: string) => (d ? d.substring(0, 10) : "");

const fetchData = async () => {
  if (!props.nomor) return;
  isLoading.value = true;
  try {
    const res = await updateSjMapService.getDetail(props.nomor);
    const data = res.data.data;
    data.header.tanggal_kirim = fmt(data.header.tanggal_kirim);
    data.header.tanggal_kembali = fmt(data.header.tanggal_kembali);
    data.header.tanggal_konfirmasi = fmt(data.header.tanggal_konfirmasi);
    data.header.tanggal_terima = fmt(data.header.tanggal_terima);
    data.header.tanggal_serahterima = fmt(data.header.tanggal_serahterima);
    data.header.tanggal_terima_sj = fmt(data.header.tanggal_terima_sj);
    form.value = data;
  } catch {
    toast.error("Gagal mengambil detail data.");
    close();
  } finally {
    isLoading.value = false;
  }
};

const handleSave = async () => {
  isSaving.value = true;
  try {
    await updateSjMapService.updateStatus(props.nomor, form.value.header);
    toast.success("Status berhasil diperbarui");
    emit("refresh");
    close();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menyimpan perubahan.");
  } finally {
    isSaving.value = false;
  }
};

const close = () => emit("update:modelValue", false);

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) fetchData();
    else form.value = { header: {}, details: [] };
  },
);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="close"
    max-width="900px"
    persistent
  >
    <div class="dlg-card">
      <!-- Header -->
      <div class="dlg-header">
        <v-icon size="15" color="white" class="mr-2">mdi-truck-check</v-icon>
        <span>Update Status SJ : {{ nomor }}</span>
        <button class="dlg-close" @click="close">✕</button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="dlg-loading">
        <v-progress-circular
          indeterminate
          color="primary"
          size="28"
          width="3"
        />
        <span>Memuat data...</span>
      </div>

      <template v-else>
        <!-- Body -->
        <div class="dlg-body">
          <!-- Info header SJ — 2 kolom -->
          <div class="info-grid">
            <!-- Kiri -->
            <div>
              <div class="f-row">
                <label class="f-lbl">Perusahaan</label>
                <input
                  class="f-inp f-ro"
                  readonly
                  :value="form.header.perush_nama"
                />
              </div>
              <div class="f-row">
                <label class="f-lbl">Tanggal SJ</label>
                <input
                  class="f-inp f-ro"
                  readonly
                  :value="fmt(form.header.sj_tanggal)"
                  style="max-width: 120px"
                />
              </div>
              <div class="f-row">
                <label class="f-lbl">Keterangan</label>
                <input
                  class="f-inp f-ro"
                  readonly
                  :value="form.header.sj_keterangan"
                />
              </div>
            </div>
            <!-- Kanan -->
            <div>
              <div class="f-row">
                <label class="f-lbl">Customer</label>
                <input
                  class="f-inp f-ro"
                  readonly
                  :value="form.header.cus_nama"
                />
              </div>
              <div class="f-row">
                <label class="f-lbl"></label>
                <input
                  class="f-inp f-ro"
                  readonly
                  :value="form.header.sj_alamat_customer"
                />
              </div>
              <div class="f-row">
                <label class="f-lbl"></label>
                <input
                  class="f-inp f-ro"
                  readonly
                  :value="form.header.sj_kota_customer"
                  style="max-width: 160px"
                />
              </div>
            </div>
          </div>

          <div class="f-divider" />

          <!-- Tabel detail -->
          <div class="tbl-wrap">
            <table class="dt">
              <thead>
                <tr>
                  <th style="width: 32px">No</th>
                  <th style="width: 140px">Kode MAP</th>
                  <th style="text-align: left">Nama Pekerjaan</th>
                  <th style="width: 90px">Ukuran</th>
                  <th style="width: 65px; text-align: right">Jumlah</th>
                  <th style="width: 65px; text-align: right">Jml Kirim</th>
                  <th style="width: 65px; text-align: right">Kurang</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, i) in form.details" :key="i">
                  <td class="tc">{{ Number(i) + 1 }}</td>
                  <td
                    style="
                      font-weight: 600;
                      color: #1565c0;
                      font-family: monospace;
                    "
                  >
                    {{ d.kode }}
                  </td>
                  <td>{{ d.nama }}</td>
                  <td>{{ d.ukuran }}</td>
                  <td class="tr" style="background: #fffde7; font-weight: 600">
                    {{ d.jumlah }}
                  </td>
                  <td class="tr muted">{{ d.jumlah_kirim }}</td>
                  <td class="tr" style="font-weight: 600">{{ d.kurang }}</td>
                </tr>
                <tr v-if="!form.details?.length">
                  <td colspan="7" class="empty-td">
                    Detail barang tidak ditemukan.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="f-divider" />

          <!-- Status + field dinamis -->
          <div class="status-section">
            <div class="f-row">
              <label class="f-lbl status-lbl">Status SJ</label>
              <select
                v-model.number="form.header.sj_stssj_kode"
                class="f-inp f-sel"
                style="max-width: 220px; font-weight: 600; color: #1565c0"
              >
                <option
                  v-for="o in statusOptions"
                  :key="o.value"
                  :value="o.value"
                >
                  {{ o.label }}
                </option>
              </select>
            </div>

            <!-- Status 1: Pengiriman -->
            <div v-if="form.header.sj_stssj_kode === 1" class="status-fields">
              <div class="f-row">
                <label class="f-lbl">Ekspedisi</label>
                <input v-model="form.header.expedisi" class="f-inp" />
              </div>
              <div class="f-row">
                <label class="f-lbl">Kurir</label>
                <input v-model="form.header.kurir" class="f-inp" />
              </div>
              <div class="f-row">
                <label class="f-lbl">Tgl Kirim</label>
                <input
                  type="date"
                  v-model="form.header.tanggal_kirim"
                  class="f-date"
                />
              </div>
              <div class="f-row">
                <label class="f-lbl">Nomor Resi</label>
                <input v-model="form.header.nomor_resi" class="f-inp" />
              </div>
              <div class="f-row">
                <label class="f-lbl">Biaya Kirim</label>
                <input
                  type="number"
                  v-model.number="form.header.biaya_kirim"
                  class="f-inp"
                  style="max-width: 120px; text-align: right"
                />
              </div>
            </div>

            <!-- Status 2: Konfirmasi -->
            <div v-if="form.header.sj_stssj_kode === 2" class="status-fields">
              <div class="f-row">
                <label class="f-lbl">Contact Person</label>
                <input v-model="form.header.contact_person" class="f-inp" />
              </div>
              <div class="f-row">
                <label class="f-lbl">Tgl Konfirmasi</label>
                <input
                  type="date"
                  v-model="form.header.tanggal_konfirmasi"
                  class="f-date"
                />
              </div>
              <div class="f-row">
                <label class="f-lbl">Tgl Terima</label>
                <input
                  type="date"
                  v-model="form.header.tanggal_terima"
                  class="f-date"
                />
              </div>
              <div class="f-row">
                <label class="f-lbl">Penerima</label>
                <input v-model="form.header.penerima_barang" class="f-inp" />
              </div>
            </div>

            <!-- Status 3: ACC Client -->
            <div v-if="form.header.sj_stssj_kode === 3" class="status-fields">
              <div class="f-row">
                <label class="f-lbl">Tgl Serah Terima</label>
                <input
                  type="date"
                  v-model="form.header.tanggal_serahterima"
                  class="f-date"
                />
              </div>
              <div class="f-row">
                <label class="f-lbl">PIC ACC</label>
                <input v-model="form.header.pic_acc" class="f-inp" />
              </div>
              <div class="f-row">
                <label class="f-lbl">Tgl Kembali SJ</label>
                <input
                  type="date"
                  v-model="form.header.tanggal_terima_sj"
                  class="f-date"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="dlg-footer">
          <button class="dlg-btn save" :disabled="isSaving" @click="handleSave">
            <v-icon size="13" class="mr-1">mdi-content-save</v-icon>
            {{ isSaving ? "Menyimpan..." : "Simpan Perubahan" }}
          </button>
          <button class="dlg-btn cancel" :disabled="isSaving" @click="close">
            Batal
          </button>
        </div>
      </template>
    </div>
  </v-dialog>
</template>

<style scoped>
/* ── Dialog card ── */
.dlg-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
  max-height: 90vh;
}

/* ── Header ── */
.dlg-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  gap: 6px;
}
.dlg-close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
}
.dlg-close:hover {
  color: white;
}

/* ── Loading ── */
.dlg-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 16px;
  color: #757575;
  font-size: 12px;
}

/* ── Body ── */
.dlg-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  min-height: 0;
}

/* ── Info grid 2 kolom ── */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}

/* ── Field row ── */
.f-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.f-lbl {
  width: 100px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #555;
}
.f-divider {
  height: 1px;
  background: #eeeeee;
  margin: 8px 0;
}

.f-inp {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: white;
  color: #212121;
  flex: 1;
  box-sizing: border-box;
  font-family: inherit;
}
.f-inp:focus {
  border-color: #1565c0;
}
.f-ro {
  background: #f0f0f0 !important;
  color: #616161 !important;
  cursor: default;
}
.f-sel {
  cursor: pointer;
}
.f-date {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  outline: none;
  background: white;
}
.f-date:focus {
  border-color: #1565c0;
}

/* ── Tabel detail ── */
.tbl-wrap {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}
.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dt thead tr {
  background: #1565c0;
}
.dt th {
  padding: 5px 7px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  text-align: center;
  border: 1px solid #0d47a1;
  white-space: nowrap;
}
.dt td {
  border-bottom: 1px solid #eeeeee;
  padding: 4px 7px;
  vertical-align: middle;
}
.dt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.dt tbody tr:hover td {
  background: #e3f2fd !important;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.muted {
  color: #9e9e9e;
}
.empty-td {
  text-align: center;
  color: #9e9e9e;
  padding: 16px !important;
  font-style: italic;
}

/* ── Status section ── */
.status-section {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-left: 3px solid #1565c0;
  border-radius: 4px;
  padding: 10px 12px;
}
.status-lbl {
  font-weight: 700;
  color: #1565c0;
}
.status-fields {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e0e0e0;
  display: flex;
  flex-wrap: wrap;
  gap: 0 24px;
}
.status-fields .f-row {
  width: 280px;
}

/* ── Footer ── */
.dlg-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.dlg-btn {
  height: 30px;
  padding: 0 16px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: opacity 0.15s;
}
.dlg-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.dlg-btn.save {
  background: #1565c0;
  color: white;
}
.dlg-btn.save:hover:not(:disabled) {
  background: #1557a8;
}
.dlg-btn.cancel {
  background: #e0e0e0;
  color: #424242;
  margin-left: auto;
}
.dlg-btn.cancel:hover:not(:disabled) {
  background: #d0d0d0;
}
</style>
