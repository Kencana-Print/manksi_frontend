<script setup lang="ts">
import { computed } from "vue";
import { IconPlus, IconTrash } from "@tabler/icons-vue";

const props = defineProps<{ formData: any }>();
const emit = defineEmits(["open-lookup-barang"]);

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
</script>

<template>
  <div class="kaosan-layout">
    <div class="k-section">
      <div class="k-header">
        <span class="k-title">Detail Barang Kaosan untuk SPK ini</span>
        <button type="button" class="btn-add" @click="addKaosanRow">
          <IconPlus :size="12" class="mr-1" /> Tambah Barang
        </button>
      </div>
      <div class="k-hint">
        Data awal disalin dari Sales Order sumber — bisa disesuaikan kalau
        berbeda dari SO.
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
                  v-select-on-focus
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
</template>

<style scoped>
/* Sama persis style dari SalesOrderTabKaosan.vue bagian k-section/k-tbl/dst */
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
.k-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 7px 9px;
  display: flex;
  flex-direction: column;
}
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
.mr-1 {
  margin-right: 3px;
}
</style>
