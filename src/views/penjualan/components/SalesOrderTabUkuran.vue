<script setup lang="ts">
import { computed } from "vue";
import { useToast } from "vue-toastification";

const props = defineProps<{
  formData: any;
  isEdit: boolean;
}>();

const toast = useToast();

const isDivisiGarmen = computed(
  () => String(props.formData.spk_divisi).charAt(0) === "4",
);

const isStandarKlien = computed(
  () => props.formData.spk_standar_ukuran === "KLIEN",
);

const isLbPbEditable = computed(
  () => !isDivisiGarmen.value || isStandarKlien.value,
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
    <div class="uk-section-title mb-1">
      Silahkan isi Qty Order berdasarkan size nya.
    </div>

    <div class="uk-table-wrap">
      <table class="uk-table">
        <thead>
          <tr>
            <th class="th-size">Size</th>
            <th class="th-num">Qty</th>

            <!-- Kolom Atasan -->
            <template v-if="showKolomAtasan && isDivisiGarmen">
              <th class="th-num">LD</th>
              <th class="th-num">PB</th>
              <th class="th-num">PL Pendek</th>
              <th class="th-num">PL Panjang</th>
              <th class="th-num">P. Bahu</th>
              <th class="th-num">L. Lengan</th>
              <th class="th-num">L. Manset</th>
            </template>

            <!-- Kolom Bawahan -->
            <template v-if="showKolomBawahan && isDivisiGarmen">
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

            <!-- Kolom Atasan -->
            <template v-if="showKolomAtasan && isDivisiGarmen">
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

            <!-- Kolom Bawahan -->
            <template v-if="showKolomBawahan && isDivisiGarmen">
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
              v-if="isDivisiGarmen && kategoriUkuran"
              :colspan="
                kategoriUkuran === 'WEARPACK'
                  ? 14
                  : kategoriUkuran === 'ATASAN' || kategoriUkuran === 'BAWAHAN'
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
</template>

<style scoped>
.uk-layout {
  display: flex;
  flex-direction: column;
  padding: 10px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  height: 100%;
  overflow-y: auto;
  gap: 0;
}

.uk-section-title {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
}

.uk-table-wrap {
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  overflow: auto; /* horizontal scroll untuk wearpack */
  max-height: calc(100vh - 280px);
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
}
.uk-preview-lbl {
  font-weight: 700;
  color: #f57f17;
  margin-right: 4px;
}
.uk-preview-val {
  color: #424242;
}

.mb-1 {
  margin-bottom: 4px;
}
.mt-1 {
  margin-top: 6px;
}
</style>
