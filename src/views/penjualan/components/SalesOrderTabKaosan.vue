<script setup lang="ts">
import { computed } from "vue";
import { IconPlus, IconTrash, IconCheck } from "@tabler/icons-vue";
import { useToast } from "vue-toastification";

const props = defineProps<{ formData: any }>();
const emit = defineEmits(["open-lookup-barang"]);
const toast = useToast();

if (props.formData.spk_label === undefined) props.formData.spk_label = 0;

const totalKaosan = computed(
  () =>
    props.formData.Kaosan?.reduce(
      (sum: number, item: any) => sum + (Number(item.qtyorder) || 0),
      0,
    ) || 0,
);

const addKaosanRow = () => {
  if (!props.formData.Kaosan) props.formData.Kaosan = [];
  props.formData.Kaosan.push({ kode: "", nama: "", ukuran: "", qtyorder: 0 });
};
const removeKaosanRow = (index: number) =>
  props.formData.Kaosan.splice(index, 1);

const totalSize = computed(
  () =>
    props.formData.Sizes?.reduce(
      (sum: number, item: any) => sum + (Number(item.qty) || 0),
      0,
    ) || 0,
);

const addSizeRow = () => {
  if (!props.formData.Sizes) props.formData.Sizes = [];
  props.formData.Sizes.push({ size: "", qty: 0, lb: 0, pb: 0 });
};
const removeSizeRow = (index: number) => props.formData.Sizes.splice(index, 1);

const updateToKetUkuran = () => {
  if (!props.formData.Sizes || props.formData.Sizes.length === 0) return;
  const parts = props.formData.Sizes.filter(
    (x: any) => Number(x.qty) > 0 && String(x.size).trim() !== "",
  ).map((x: any) => `${x.size}=${x.qty}`);
  if (parts.length > 0) {
    props.formData.spk_ukuran = parts.join(", ");
    props.formData.KetUkuran = parts.join(", ");
    toast.success("Berhasil di-update ke Ket. Ukuran SPK");
  } else {
    toast.warning("Tidak ada ukuran dengan Qty > 0");
  }
};
</script>

<template>
  <div class="kaosan-layout">
    <!-- Baris atas: Tabel Kaosan (lebar terbatas) -->
    <div class="kaosan-top">
      <div class="k-section">
        <div class="k-header">
          <span class="k-title">Detail Barang Kaosan untuk SPK ini</span>
          <button type="button" class="btn-add" @click="addKaosanRow">
            <IconPlus :size="12" class="mr-1" /> Tambah Barang
          </button>
        </div>
        <div class="k-hint">
          Jenis Order [SB] Sablon, [SD] Sablon DTF, [BR] Bordir, [PL] POLYFLEX:
          Hanya mengisi Ukuran dan Qty Order.
        </div>
        <div class="k-tbl-wrap">
          <table class="k-tbl">
            <thead>
              <tr>
                <th style="width: 32px" class="tc">No</th>
                <th style="width: 130px">Kode</th>
                <th>Nama Barang Kaosan</th>
                <th style="width: 100px">Ukuran</th>
                <th style="width: 80px" class="tr">Qty Order</th>
                <th style="width: 32px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in formData.Kaosan" :key="'k-' + idx">
                <td class="tc bg-lbl">{{ Number(idx) + 1 }}</td>
                <td class="p0">
                  <div class="cell-grp">
                    <input
                      type="text"
                      v-model="row.kode"
                      class="ci text-uppercase"
                      placeholder="Kode DC"
                    />
                    <button
                      type="button"
                      class="ci-lkp"
                      @mousedown.prevent="emit('open-lookup-barang', idx)"
                      title="Cari"
                    >
                      &#128269;
                    </button>
                  </div>
                </td>
                <td class="p0">
                  <input
                    type="text"
                    v-model="row.nama"
                    class="ci"
                    placeholder="Nama Kaos"
                  />
                </td>
                <td class="p0">
                  <input
                    type="text"
                    v-model="row.ukuran"
                    class="ci text-uppercase"
                    placeholder="S, M, L..."
                  />
                </td>
                <td class="p0">
                  <input
                    type="number"
                    v-model.number="row.qtyorder"
                    class="ci tr fw text-blue"
                  />
                </td>
                <td class="tc">
                  <button
                    type="button"
                    class="btn-del"
                    @click="removeKaosanRow(Number(idx))"
                  >
                    <IconTrash :size="13" />
                  </button>
                </td>
              </tr>
              <tr v-if="!formData.Kaosan || formData.Kaosan.length === 0">
                <td colspan="6" class="empty-row">
                  Data Barang Kaosan Kosong. Klik "Tambah Barang".
                </td>
              </tr>
            </tbody>
            <tfoot v-if="formData.Kaosan && formData.Kaosan.length > 0">
              <tr>
                <td colspan="4" class="tr fw foot-cell">TOTAL :</td>
                <td class="tr fw foot-total">
                  {{ totalKaosan.toLocaleString("id-ID") }}
                </td>
                <td class="foot-cell"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <!-- Baris bawah: Update+Label (kiri) + Size (kanan) -->
    <div class="kaosan-bottom">
      <!-- Kiri: Update + Label -->
      <div class="k-section" style="width: 240px; flex-shrink: 0">
        <button type="button" class="btn-update" @click="updateToKetUkuran">
          <IconCheck :size="14" class="mr-1" /> Update ke Ket.Ukuran
        </button>
        <fieldset class="label-fs mt-2">
          <legend class="fw text-blue px-1">Label</legend>
          <label class="rb"
            ><input
              type="radio"
              v-model.number="formData.spk_label"
              :value="0"
            />
            Umum (Label Luar dan Dalam)</label
          >
          <label class="rb"
            ><input
              type="radio"
              v-model.number="formData.spk_label"
              :value="1"
            />
            Non Umum (Label Dalam)</label
          >
          <label class="rb"
            ><input
              type="radio"
              v-model.number="formData.spk_label"
              :value="2"
            />
            Tanpa Label</label
          >
        </fieldset>
      </div>

      <!-- Kanan: Size -->
      <div class="k-section" style="flex: 1; min-width: 0">
        <div class="k-header">
          <span class="k-title">Detail Size / Ukuran Badan</span>
          <button type="button" class="btn-add" @click="addSizeRow">
            <IconPlus :size="12" class="mr-1" /> Tambah Size
          </button>
        </div>
        <div class="k-tbl-wrap mt-1">
          <table class="k-tbl">
            <thead>
              <tr>
                <th style="width: 80px">Size</th>
                <th style="width: 80px" class="tr">Qty</th>
                <th style="width: 90px" class="tr">L.Badan (A)</th>
                <th style="width: 90px" class="tr">P.Badan (B)</th>
                <th style="width: 32px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in formData.Sizes" :key="'s-' + idx">
                <td class="p0">
                  <input
                    type="text"
                    v-model="row.size"
                    class="ci text-uppercase fw"
                    placeholder="S/M/L..."
                  />
                </td>
                <td class="p0">
                  <input
                    type="number"
                    v-model.number="row.qty"
                    class="ci tr fw text-blue"
                  />
                </td>
                <td class="p0">
                  <input type="number" v-model.number="row.lb" class="ci tr" />
                </td>
                <td class="p0">
                  <input type="number" v-model.number="row.pb" class="ci tr" />
                </td>
                <td class="tc">
                  <button
                    type="button"
                    class="btn-del"
                    @click="removeSizeRow(Number(idx))"
                  >
                    <IconTrash :size="13" />
                  </button>
                </td>
              </tr>
              <tr v-if="!formData.Sizes || formData.Sizes.length === 0">
                <td colspan="5" class="empty-row">Data Size Kosong.</td>
              </tr>
            </tbody>
            <tfoot v-if="formData.Sizes && formData.Sizes.length > 0">
              <tr>
                <td class="tr fw foot-cell">TOTAL :</td>
                <td class="tr fw foot-total">
                  {{ totalSize.toLocaleString("id-ID") }}
                </td>
                <td colspan="3" class="foot-cell"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kaosan-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 8px;
  padding: 6px;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  box-sizing: border-box;
  overflow-y: auto;
}

/* ── Top: tabel kaosan dibatasi lebarnya ── */
.kaosan-top {
  /* Tidak full width — ikuti konten tabel */
  flex-shrink: 0;
}

/* ── Bottom: update+label + size ── */
.kaosan-bottom {
  display: flex;
  gap: 8px;
  height: 240px;
  flex-shrink: 0;
}

/* ── Section box ── */
.k-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 7px 9px;
  display: flex;
  flex-direction: column;
}

/* ── Header baris ── */
.k-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
  flex-shrink: 0;
}
.k-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #1565c0;
}
.k-hint {
  font-size: 10px;
  color: #757575;
  font-style: italic;
  margin-bottom: 3px;
  flex-shrink: 0;
}

/* ── Table ── */
.k-tbl-wrap {
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  flex: 1;
  min-height: 0;
}
.k-tbl {
  width: 100%;
  border-collapse: collapse;
  background: white;
  white-space: nowrap;
}
.k-tbl thead th {
  background: #1565c0;
  color: white;
  font-weight: 700;
  padding: 5px 7px;
  position: sticky;
  top: 0;
  z-index: 1;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
}
.k-tbl tbody td {
  border-bottom: 1px solid #f0f0f0;
  border-right: 1px solid #f5f5f5;
  height: 26px;
}
.k-tbl tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.k-tbl tbody tr:hover td {
  background: #e3f2fd !important;
}

/* ── Cell input ── */
.p0 {
  padding: 0;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.fw {
  font-weight: 600;
}
.bg-lbl {
  background: #f5f5f5 !important;
  color: #555;
  padding: 0 6px;
}
.text-blue {
  color: #1565c0;
}

.ci {
  width: 100%;
  height: 25px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 6px;
  font-family: inherit;
  color: #212121;
  box-sizing: border-box;
}
.ci:focus {
  background: #e3f2fd !important;
}

.cell-grp {
  display: flex;
  align-items: center;
  height: 25px;
}
.cell-grp .ci {
  flex: 1;
}
.ci-lkp {
  background: #eeeeee;
  border: none;
  border-left: 1px solid #e0e0e0;
  padding: 0 6px;
  cursor: pointer;
  height: 25px;
  display: flex;
  align-items: center;
  font-size: 11px;
  flex-shrink: 0;
}
.ci-lkp:hover {
  background: #e0e0e0;
}

/* ── Footer tabel ── */
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 10px 8px;
  font-size: 11px;
}
.foot-cell {
  background: #f5f5f5;
  padding: 3px 7px;
}
.foot-total {
  background: #fff59d;
  padding: 3px 7px;
  font-weight: 700;
  color: #1565c0;
}

/* ── Buttons ── */
.btn-add {
  background: #546e7a;
  color: white;
  border: none;
  padding: 3px 9px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.btn-add:hover {
  background: #455a64;
}

.btn-del {
  background: transparent;
  color: #d32f2f;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-del:hover {
  background: #ffebee;
  border-radius: 2px;
}

.btn-update {
  background: #e8f5e9;
  border: 1px solid #4caf50;
  color: #2e7d32;
  font-weight: 700;
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
.btn-update:hover {
  background: #c8e6c9;
}

/* ── Label fieldset ── */
.label-fs {
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  background: #fafafa;
  flex: 1;
  margin-top: 6px;
}
.label-fs legend {
  font-size: 11px;
  padding: 0 4px;
  color: #1565c0;
}
.rb {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 11px;
  color: #333;
}
.rb input[type="radio"] {
  accent-color: #1565c0;
  margin: 0;
  width: 13px;
  height: 13px;
}

/* ── Utils ── */
.mr-1 {
  margin-right: 3px;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.px-1 {
  padding: 0 4px;
}
</style>
