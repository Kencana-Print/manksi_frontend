<script setup lang="ts">
import { ref, computed } from "vue";
import { useToast } from "vue-toastification";

const props = defineProps<{
  formData: any;
  isEdit: boolean;
}>();

const toast = useToast();

const emit = defineEmits(["upload-acc-bukti"]);
const accBuktiPreview = ref("");
const fileAccRef = ref<HTMLInputElement | null>(null);

const onAccChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.size > 1_000_000) {
    toast.error("Ukuran bukti screenshot tidak boleh > 1 Mb.");
    return;
  }
  props.formData.AccBuktiName = file.name;
  props.formData.AccBuktiBlob = URL.createObjectURL(file);
  accBuktiPreview.value = props.formData.AccBuktiBlob;
  emit("upload-acc-bukti", file);
};

const isDivisiGarmenAtauKaosan = computed(() =>
  ["3", "4"].includes(String(props.formData.spk_divisi).charAt(0)),
);

const isStandarKlien = computed(
  () => props.formData.spk_standar_ukuran === "KLIEN",
);

const isLbPbEditable = computed(
  () => !isDivisiGarmenAtauKaosan.value || isStandarKlien.value,
);

// Kategori ukuran berdasarkan jenis order
const kategoriUkuran = computed(() => {
  const jo = String(props.formData.spk_jo_kode || "").toUpperCase();
  const atasan = ["BB", "BU", "JK", "JS", "KK", "KO", "KS"];
  const bawahan = ["CL"];
  const wearpack = ["WP"];
  if (atasan.includes(jo)) return "ATASAN";
  if (bawahan.includes(jo)) return "BAWAHAN";
  if (wearpack.includes(jo)) return "WEARPACK";
  return null;
});

const showKolomAtasan = computed(
  () =>
    kategoriUkuran.value === "ATASAN" || kategoriUkuran.value === "WEARPACK",
);

const showKolomBawahan = computed(
  () =>
    kategoriUkuran.value === "BAWAHAN" || kategoriUkuran.value === "WEARPACK",
);

const totalQty = computed(() =>
  (props.formData.Sizes || []).reduce(
    (s: number, r: any) => s + (Number(r.qty) || 0),
    0,
  ),
);

const updateKetUkuran = () => {
  const parts: string[] = [];
  (props.formData.Sizes || []).forEach((row: any) => {
    if (Number(row.qty) > 0) {
      parts.push(`${row.size}=${row.qty}`);
    }
  });
  props.formData.spk_ukuran = parts.join(", ");
  props.formData.spk_jumlah = totalQty;
  toast.success("Ket. Ukuran berhasil diperbarui.");
};
</script>

<template>
  <div class="uk-layout">
    <!-- ── 1. Detail Ukuran ── -->
    <div class="uk-card" style="width: 620px; flex-shrink: 0">
      <div class="uk-card-title">Detail Ukuran</div>
      <div class="uk-section-hint mb-1">
        Silahkan isi Qty Order berdasarkan size nya.
      </div>

      <div class="uk-table-wrap">
        <table class="uk-table">
          <thead>
            <tr>
              <th class="th-size">Size</th>
              <th class="th-num">Qty</th>

              <template v-if="showKolomAtasan && isDivisiGarmenAtauKaosan">
                <th class="th-num">LD</th>
                <th class="th-num">PB</th>
                <th class="th-num">PL Pendek</th>
                <th class="th-num">PL Panjang</th>
                <th class="th-num">P. Bahu</th>
                <th class="th-num">L. Lengan</th>
                <th class="th-num">L. Manset</th>
              </template>

              <template v-if="showKolomBawahan && isDivisiGarmenAtauKaosan">
                <th class="th-num">L. Pinggang</th>
                <th class="th-num">P. Celana</th>
                <th class="th-num">L. Panggul</th>
                <th class="th-num">L. Paha</th>
                <th class="th-num">Pesak</th>
                <th class="th-num">L. Lutut</th>
                <th class="th-num">L. Bawah</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in formData.Sizes"
              :key="i"
              :class="{ 'row-active': Number(row.qty) > 0 }"
            >
              <td class="td-size">{{ row.size }}</td>
              <td class="td-num">
                <input
                  type="number"
                  v-model.number="row.qty"
                  class="num-inp"
                  min="0"
                  v-select-on-focus
                  @change="if (Number(row.qty) < 0) row.qty = 0;"
                />
              </td>

              <template v-if="showKolomAtasan && isDivisiGarmenAtauKaosan">
                <td class="td-num">
                  <input
                    type="number"
                    v-model.number="row.ld"
                    class="num-inp"
                    step="0.1"
                    min="0"
                    v-select-on-focus
                    :disabled="Number(row.qty) === 0 || !isLbPbEditable"
                  />
                </td>
                <td class="td-num">
                  <input
                    type="number"
                    v-model.number="row.pb"
                    class="num-inp"
                    step="0.1"
                    min="0"
                    v-select-on-focus
                    :disabled="Number(row.qty) === 0 || !isLbPbEditable"
                  />
                </td>
                <td class="td-num">
                  <input
                    type="number"
                    v-model.number="row.pl_pendek"
                    class="num-inp"
                    step="0.1"
                    min="0"
                    v-select-on-focus
                    :disabled="Number(row.qty) === 0 || !isLbPbEditable"
                  />
                </td>
                <td class="td-num">
                  <input
                    type="number"
                    v-model.number="row.pl_panjang"
                    class="num-inp"
                    step="0.1"
                    min="0"
                    v-select-on-focus
                    :disabled="Number(row.qty) === 0 || !isLbPbEditable"
                  />
                </td>
                <td class="td-num">
                  <input
                    type="number"
                    v-model.number="row.p_bahu"
                    class="num-inp"
                    step="0.1"
                    min="0"
                    v-select-on-focus
                    :disabled="Number(row.qty) === 0 || !isLbPbEditable"
                  />
                </td>
                <td class="td-num">
                  <input
                    type="number"
                    v-model.number="row.l_lengan"
                    class="num-inp"
                    step="0.1"
                    min="0"
                    v-select-on-focus
                    :disabled="Number(row.qty) === 0 || !isLbPbEditable"
                  />
                </td>
                <td class="td-num">
                  <input
                    type="number"
                    v-model.number="row.l_manset"
                    class="num-inp"
                    step="0.1"
                    min="0"
                    v-select-on-focus
                    :disabled="Number(row.qty) === 0 || !isLbPbEditable"
                  />
                </td>
              </template>

              <template v-if="showKolomBawahan && isDivisiGarmenAtauKaosan">
                <td class="td-num">
                  <input
                    type="number"
                    v-model.number="row.l_pinggang"
                    class="num-inp"
                    step="0.1"
                    min="0"
                    v-select-on-focus
                    :disabled="Number(row.qty) === 0 || !isLbPbEditable"
                  />
                </td>
                <td class="td-num">
                  <input
                    type="number"
                    v-model.number="row.p_celana"
                    class="num-inp"
                    step="0.1"
                    min="0"
                    v-select-on-focus
                    :disabled="Number(row.qty) === 0 || !isLbPbEditable"
                  />
                </td>
                <td class="td-num">
                  <input
                    type="number"
                    v-model.number="row.l_panggul"
                    class="num-inp"
                    step="0.1"
                    min="0"
                    v-select-on-focus
                    :disabled="Number(row.qty) === 0 || !isLbPbEditable"
                  />
                </td>
                <td class="td-num">
                  <input
                    type="number"
                    v-model.number="row.l_paha"
                    class="num-inp"
                    step="0.1"
                    min="0"
                    v-select-on-focus
                    :disabled="Number(row.qty) === 0 || !isLbPbEditable"
                  />
                </td>
                <td class="td-num">
                  <input
                    type="number"
                    v-model.number="row.pesak"
                    class="num-inp"
                    step="0.1"
                    min="0"
                    v-select-on-focus
                    :disabled="Number(row.qty) === 0 || !isLbPbEditable"
                  />
                </td>
                <td class="td-num">
                  <input
                    type="number"
                    v-model.number="row.l_lutut"
                    class="num-inp"
                    step="0.1"
                    min="0"
                    v-select-on-focus
                    :disabled="Number(row.qty) === 0 || !isLbPbEditable"
                  />
                </td>
                <td class="td-num">
                  <input
                    type="number"
                    v-model.number="row.l_bawah"
                    class="num-inp"
                    step="0.1"
                    min="0"
                    v-select-on-focus
                    :disabled="Number(row.qty) === 0 || !isLbPbEditable"
                  />
                </td>
              </template>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="td-total-lbl">Total</td>
              <td class="td-total-val">{{ totalQty }}</td>
              <td
                v-if="isDivisiGarmenAtauKaosan && kategoriUkuran"
                :colspan="
                  kategoriUkuran === 'WEARPACK'
                    ? 14
                    : kategoriUkuran === 'ATASAN' ||
                        kategoriUkuran === 'BAWAHAN'
                      ? 7
                      : 0
                "
              ></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="uk-foot mt-1">
        <label class="chk-lbl">
          <input
            type="checkbox"
            v-model="formData.spk_sizekhusus"
            true-value="Y"
            false-value="N"
          />
          Size Khusus
        </label>
        <button type="button" class="btn-update" @click="updateKetUkuran">
          ✔ Update ke Ket.Ukuran
        </button>
      </div>

      <div v-if="formData.spk_ukuran" class="uk-preview mt-1">
        <span class="uk-preview-lbl">Ket. Ukuran saat ini:</span>
        <span class="uk-preview-val">{{ formData.spk_ukuran }}</span>
      </div>
    </div>

    <!-- ── 2. Keterangan Produksi + Komponen (atas-bawah) ── -->
    <div class="uk-card" style="flex: 1; min-width: 0; gap: 8px">
      <div
        style="
          flex-shrink: 0;
          min-height: 150px;
          display: flex;
          flex-direction: column;
        "
      >
        <div class="uk-card-title">Keterangan Produksi</div>
        <textarea
          v-model="formData.spk_keterangan"
          class="uk-textarea"
          placeholder="Isi keterangan atau spesifikasi produksi di sini..."
        ></textarea>
      </div>

      <div
        style="flex: 1; min-height: 0; display: flex; flex-direction: column"
      >
        <div class="uk-card-title">
          Keterangan Komponen
          <span class="uk-hint">— hanya yang dicentang akan disimpan</span>
        </div>
        <div class="uk-table-wrap" style="flex: 1">
          <table class="uk-table">
            <thead>
              <tr>
                <th style="width: 40px">Kode</th>
                <th style="text-align: left">Nama</th>
                <th style="width: 48px">Pakai</th>
                <th style="text-align: left">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in formData.Komponen" :key="idx">
                <td class="td-size" style="text-align: center">
                  {{ row.kode }}
                </td>
                <td class="td-size">{{ row.nama }}</td>
                <td style="text-align: center">
                  <input
                    type="checkbox"
                    v-model="row.pakai"
                    style="accent-color: #1565c0; cursor: pointer"
                  />
                </td>
                <td style="padding: 0">
                  <input
                    type="text"
                    v-model="row.ket"
                    :disabled="!row.pakai"
                    class="num-inp"
                    style="width: 100%; text-align: left"
                    :style="
                      !row.pakai ? 'background:#f5f5f5;color:#9e9e9e' : ''
                    "
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── 3. Persetujuan Customer ── -->
    <div class="uk-card" style="width: 260px; flex-shrink: 0">
      <div class="uk-card-title">Persetujuan Customer</div>

      <template v-if="formData.spk_memo">
        <!-- Dari MAP — read only -->
        <div
          v-if="formData.spk_acc_customer_display === 'Y'"
          class="uk-acc-box uk-acc-ok"
        >
          ✅ Customer sudah setuju<br />
          <span style="font-weight: 400; font-size: 11px">{{
            formData.spk_acc_tanggal_display
          }}</span>
        </div>
        <div v-else class="uk-acc-box uk-acc-warn">
          ⚠ MAP referensi<br /><strong>{{ formData.spk_memo }}</strong
          ><br />belum ada persetujuan customer
        </div>
      </template>

      <template v-else>
        <!-- SO langsung — editable -->
        <label class="chk-lbl mb-2" style="font-size: 12px">
          <input
            type="checkbox"
            v-model="formData.spk_acc_customer"
            true-value="Y"
            false-value="N"
            style="accent-color: #1565c0"
          />
          Customer Sudah Setuju
        </label>

        <template v-if="formData.spk_acc_customer === 'Y'">
          <div class="mb-2">
            <label
              style="
                font-size: 10px;
                color: #757575;
                display: block;
                margin-bottom: 2px;
              "
            >
              Tanggal Persetujuan
            </label>
            <input
              type="date"
              v-model="formData.spk_acc_tanggal"
              style="
                width: 100%;
                height: 26px;
                border: 1px solid #bdbdbd;
                border-radius: 3px;
                padding: 0 6px;
                font-size: 12px;
                box-sizing: border-box;
              "
            />
          </div>

          <div class="uk-upload-name">
            {{ formData.AccBuktiName || "Bukti Screenshot Persetujuan" }}
          </div>
          <button
            type="button"
            class="btn-update"
            style="width: 100%; justify-content: center; margin-bottom: 6px"
            @click="fileAccRef?.click()"
          >
            ⬆ Upload Bukti
          </button>

          <div class="uk-img-box">
            <img
              v-if="formData.AccBuktiBlob"
              :src="formData.AccBuktiBlob"
              class="uk-img"
            />
            <div v-else class="uk-img-empty">Bukti belum diupload</div>
          </div>

          <input
            ref="fileAccRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="onAccChange"
          />
        </template>
        <template v-else>
          <div class="uk-acc-box uk-acc-warn">
            ⚠ SO tanpa referensi MAP tetap wajib ada persetujuan customer.
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.uk-layout {
  display: flex;
  gap: 10px;
  align-items: stretch;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  height: 100%;
  overflow: hidden;
  padding: 6px;
  box-sizing: border-box;
}

/* ── Card ── */
.uk-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.uk-card-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #1565c0;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.uk-hint {
  font-size: 10px;
  font-weight: 400;
  color: #757575;
  text-transform: none;
  letter-spacing: 0;
}
.uk-section-hint {
  font-size: 11px;
  color: #616161;
}

.uk-table-wrap {
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: auto;
  min-height: 0;
}

.uk-table {
  border-collapse: collapse;
  font-size: 11px;
  min-width: 100%;
}

.uk-table thead th {
  background: #1565c0;
  color: white;
  font-weight: 600;
  padding: 5px 6px;
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: nowrap;
  text-align: right;
}
.th-size {
  text-align: left !important;
  min-width: 70px;
}
.th-num {
  min-width: 72px;
}

.uk-table tbody td {
  border-bottom: 1px solid #eeeeee;
  padding: 1px 3px;
}
.uk-table tbody tr:hover td {
  background: #f5f5f5;
}
.uk-table tbody tr.row-active td {
  background: #e3f2fd;
  font-weight: 600;
}

.td-size {
  padding-left: 8px !important;
  color: #424242;
  white-space: nowrap;
}
.td-num {
  text-align: right;
  padding-right: 2px !important;
}

.num-inp {
  width: 64px;
  height: 22px;
  border: 1px solid #bdbdbd;
  border-radius: 2px;
  padding: 0 3px;
  font-size: 11px;
  text-align: right;
  outline: none;
  background: white;
  box-sizing: border-box;
}
.num-inp:focus {
  border-color: #1565c0;
  background: #e3f2fd;
}
.num-inp:disabled {
  background: #f5f5f5;
  color: #bdbdbd;
  border-color: #e0e0e0;
}

.uk-table tfoot td {
  background: #f5f5f5;
  font-weight: 700;
  padding: 4px 6px;
  border-top: 2px solid #e0e0e0;
  position: sticky;
  bottom: 0;
}
.td-total-lbl {
  color: #424242;
  padding-left: 8px !important;
}
.td-total-val {
  text-align: right;
  color: #1565c0;
  font-size: 12px;
  padding-right: 5px !important;
}

.uk-foot {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  flex-shrink: 0;
}
.chk-lbl {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.chk-lbl input {
  accent-color: #1565c0;
}
.btn-update {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
  border-radius: 4px;
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.btn-update:hover {
  background: #c8e6c9;
}

.uk-preview {
  background: #fffde7;
  border: 1px solid #fbc02d;
  border-radius: 3px;
  padding: 4px 8px;
  font-size: 10px;
  word-break: break-word;
  flex-shrink: 0;
}
.uk-preview-lbl {
  font-weight: 700;
  color: #f57f17;
  margin-right: 4px;
}
.uk-preview-val {
  color: #424242;
}

/* ── Keterangan Produksi textarea ── */
.uk-textarea {
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
}
.uk-textarea:focus {
  border-color: #1565c0;
}

/* ── Persetujuan Customer box ── */
.uk-acc-box {
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
  line-height: 1.5;
}
.uk-acc-ok {
  color: #2e7d32;
  font-weight: 700;
  background: #e8f5e9;
}
.uk-acc-warn {
  color: #c62828;
  font-weight: 700;
  background: #ffebee;
}
.uk-acc-neutral {
  color: #757575;
  font-size: 11px;
  font-weight: 400;
  background: #fafafa;
}

.mb-1 {
  margin-bottom: 4px;
}
.mt-1 {
  margin-top: 6px;
}

.uk-upload-name {
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
.uk-img-box {
  min-height: 100px;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.uk-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.uk-img-empty {
  font-size: 10px;
  color: #bdbdbd;
}
</style>
