<script setup lang="ts">
import { computed } from "vue";
import { IconTrash } from "@tabler/icons-vue";

interface BabaranRow {
  komponen: string;
  warna: string;
  jenis: string;
  babaran: number;
  nourut?: number;
}

const props = defineProps<{
  formData: {
    Babaran: BabaranRow[];
    BabaranSource?: "manual" | "mkb" | "proof";
    [key: string]: any;
  };
}>();

// Baris terkunci kalau sumbernya bukan manual (dari MKB atau Proof
// Potong) DAN baris itu punya nourut (artinya memang hasil sync,
// bukan baris trailing kosong yang baru ditambah user).
const isLockedRow = (row: BabaranRow) =>
  (props.formData.BabaranSource === "mkb" ||
    props.formData.BabaranSource === "proof") &&
  row.nourut !== undefined;

const blankRow = (): BabaranRow => ({
  komponen: "",
  warna: "",
  jenis: "",
  babaran: 0,
});

// Selalu pastikan ada baris kosong trailing yang bisa diketik,
// terlepas dari apakah baris-baris sebelumnya berasal dari MKB atau
// tidak — kalau MKB kosong/belum ada babaran, user tetap bisa isi manual.
const ensureTrailing = () => {
  const rows = props.formData.Babaran;
  const last = rows[rows.length - 1];
  if (!last || (last.komponen && !isLockedRow(last)) || isLockedRow(last)) {
    if (!last || last.komponen) rows.push(blankRow());
  }
};

if (!props.formData.Babaran || props.formData.Babaran.length === 0) {
  props.formData.Babaran = [blankRow()];
} else {
  ensureTrailing();
}

const onKomponenInput = (idx: number) => {
  if (idx === props.formData.Babaran.length - 1) ensureTrailing();
};

const removeRow = (idx: number) => {
  props.formData.Babaran.splice(idx, 1);
  ensureTrailing();
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
const totalBabaran = computed(() =>
  props.formData.Babaran.reduce(
    (s, r) => (r.komponen ? s + Number(r.babaran || 0) : s),
    0,
  ),
);
</script>

<template>
  <div class="babaran-wrap">
    <div v-if="formData.BabaranSource === 'mkb'" class="mkb-banner">
      Baris bertanda dari MKB dikunci (edit lewat modul MKB). Baris baru tetap
      bisa ditambah manual.
    </div>
    <div v-else-if="formData.BabaranSource === 'proof'" class="mkb-banner">
      Baris bertanda dari Proof Garmen lini Potong dikunci (edit lewat modul
      Proof Garmen). Baris baru tetap bisa ditambah manual.
    </div>
    <div class="babaran-title">Babaran per Komponen</div>
    <table class="detail-table">
      <thead>
        <tr>
          <th width="28" class="text-center">No</th>
          <th>Komponen</th>
          <th width="120">Warna</th>
          <th width="100">Jenis</th>
          <th width="100" class="tr">Babaran</th>
          <th width="28"></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, idx) in formData.Babaran"
          :key="idx"
          :class="{ 'mkb-row': isLockedRow(row) }"
        >
          <td class="text-center">{{ idx + 1 }}</td>
          <td>
            <input
              v-model="row.komponen"
              class="cell-input"
              placeholder="Nama komponen..."
              :readonly="isLockedRow(row)"
              @input="onKomponenInput(idx)"
            />
          </td>
          <td>
            <input
              v-model="row.warna"
              class="cell-input"
              :disabled="!row.komponen"
              :readonly="isLockedRow(row)"
            />
          </td>
          <td>
            <input
              v-model="row.jenis"
              class="cell-input"
              :disabled="!row.komponen"
              :readonly="isLockedRow(row)"
            />
          </td>
          <td>
            <input
              v-model.number="row.babaran"
              type="text"
              inputmode="decimal"
              class="cell-input tr"
              :disabled="!row.komponen"
              :readonly="isLockedRow(row)"
            />
          </td>
          <td class="text-center">
            <button
              v-if="row.komponen && !isLockedRow(row)"
              type="button"
              class="del-btn"
              @click="removeRow(idx)"
            >
              <IconTrash :size="12" />
            </button>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="total-label">Total Babaran</td>
          <td class="tr total-val">{{ numFmt(totalBabaran) }}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<style scoped>
.babaran-wrap {
  padding: 4px;
}
.babaran-title {
  font-size: 11px;
  font-weight: 700;
  color: #455a64;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 8px;
  font-weight: bold;
}
.detail-table td {
  padding: 3px 4px;
  border-bottom: 1px solid #eee;
}
.detail-table tfoot td {
  border-top: 2px solid #546e7a;
  border-bottom: none;
  padding: 6px 8px;
}
.total-label {
  text-align: right;
  font-weight: 700;
  color: #455a64;
}
.total-val {
  font-weight: 700;
  color: #1565c0;
}
.cell-input {
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 4px 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.cell-input:disabled {
  background: #f5f5f5;
  color: #9e9e9e;
}
.cell-input:focus {
  border-color: #1976d2;
}
.tr {
  text-align: right !important;
}
.text-center {
  text-align: center;
}
.del-btn {
  width: 20px;
  height: 20px;
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c62828;
}
.del-btn:hover {
  background: #ffcdd2;
}
.mkb-banner {
  background: #fff3e0;
  color: #e65100;
  font-size: 11px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 8px;
}
.mkb-row {
  background: #fff8e1;
}
</style>
