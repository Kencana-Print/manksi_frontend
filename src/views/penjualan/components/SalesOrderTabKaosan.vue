<script setup lang="ts">
import { computed } from "vue";
import { IconPlus, IconTrash, IconCheck } from "@tabler/icons-vue";
import { useToast } from "vue-toastification";

const props = defineProps<{ formData: any }>();
const emit = defineEmits(["open-lookup-barang"]);
const toast = useToast();

// Inisialisasi default label jika belum ada
if (props.formData.spk_label === undefined) props.formData.spk_label = 0;

// --- LOGIKA TABEL BARANG KAOSAN ---
const totalKaosan = computed(() => {
  return (
    props.formData.Kaosan?.reduce(
      (sum: number, item: any) => sum + (Number(item.qtyorder) || 0),
      0,
    ) || 0
  );
});

const addKaosanRow = () => {
  if (!props.formData.Kaosan) props.formData.Kaosan = [];
  props.formData.Kaosan.push({ kode: "", nama: "", ukuran: "", qtyorder: 0 });
};

const removeKaosanRow = (index: number) => {
  props.formData.Kaosan.splice(index, 1);
};

// --- LOGIKA TABEL SIZES ---
const totalSize = computed(() => {
  return (
    props.formData.Sizes?.reduce(
      (sum: number, item: any) => sum + (Number(item.qty) || 0),
      0,
    ) || 0
  );
});

const addSizeRow = () => {
  if (!props.formData.Sizes) props.formData.Sizes = [];
  props.formData.Sizes.push({ size: "", qty: 0, lb: 0, pb: 0 });
};

const removeSizeRow = (index: number) => {
  props.formData.Sizes.splice(index, 1);
};

// --- HELPERS ---
const updateToKetUkuran = () => {
  if (!props.formData.Sizes || props.formData.Sizes.length === 0) return;

  // Format: S=10, M=15, L=5
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
  <div class="tm-tab-layout">
    <div
      class="tm-section d-flex flex-column"
      style="flex: 1; min-height: 200px"
    >
      <div class="tm-sec-title d-flex justify-space-between align-center">
        <span>Detail Barang Kaosan untuk SPK ini</span>
        <button type="button" class="btn-add" @click="addKaosanRow">
          <IconPlus :size="13" class="mr-1" /> Tambah Barang
        </button>
      </div>

      <div
        class="text-caption text-grey-darken-1 mb-1"
        style="font-size: 10px !important"
      >
        Jenis Order [SB] Sablon, [SD] Sablon DTF, [BR] Bordir, [PL] POLYFLEX:
        Hanya mengisi Ukuran dan Qty Order.
      </div>

      <div class="ll-table-wrap flex-grow-1 mt-1">
        <table class="ll-table">
          <thead>
            <tr>
              <th style="width: 40px" class="text-center">No</th>
              <th style="width: 180px; text-align: left">Kode</th>
              <th style="text-align: left">Nama Barang Kaosan</th>
              <th style="width: 120px; text-align: left">Ukuran</th>
              <th style="width: 100px; text-align: right">Qty Order</th>
              <th style="width: 40px" class="text-center"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in formData.Kaosan" :key="'k-' + idx">
              <td class="ll-td-ctr ll-td-lbl">{{ idx + 1 }}</td>

              <td class="ll-td-inp">
                <div class="d-flex w-100 h-100">
                  <input
                    type="text"
                    v-model="row.kode"
                    class="ll-cell text-uppercase flex-grow-1"
                    placeholder="Kode DC"
                  />
                  <button
                    type="button"
                    class="btn-lkp-inner"
                    @mousedown.prevent="emit('open-lookup-barang', idx)"
                    title="Cari Barang Kaosan"
                  >
                    🔍
                  </button>
                </div>
              </td>

              <td class="ll-td-inp">
                <input
                  type="text"
                  v-model="row.nama"
                  class="ll-cell"
                  placeholder="Nama Kaos"
                />
              </td>
              <td class="ll-td-inp">
                <input
                  type="text"
                  v-model="row.ukuran"
                  class="ll-cell text-uppercase"
                  placeholder="S, M, L..."
                />
              </td>
              <td class="ll-td-inp">
                <input
                  type="number"
                  v-model.number="row.qtyorder"
                  class="ll-cell tr font-weight-bold text-primary"
                />
              </td>
              <td class="ll-td-ctr">
                <button
                  type="button"
                  class="btn-del"
                  @click="removeKaosanRow(idx)"
                  title="Hapus"
                >
                  <IconTrash :size="14" />
                </button>
              </td>
            </tr>
            <tr v-if="!formData.Kaosan || formData.Kaosan.length === 0">
              <td colspan="6" class="text-center text-grey py-3 font-italic">
                Data Barang Kaosan Kosong. Klik "Tambah Barang".
              </td>
            </tr>
          </tbody>
          <tfoot v-if="formData.Kaosan && formData.Kaosan.length > 0">
            <tr>
              <td
                colspan="4"
                class="text-right font-weight-bold py-1 px-2 bg-grey-lighten-4"
              >
                TOTAL :
              </td>
              <td
                class="text-right font-weight-bold py-1 px-2 text-primary"
                style="background: #fff59d"
              >
                {{ totalKaosan.toLocaleString("id-ID") }}
              </td>
              <td class="bg-grey-lighten-4"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div class="d-flex gap-2 mt-2" style="height: 260px">
      <div class="tm-section d-flex flex-column" style="width: 260px">
        <button
          type="button"
          class="btn-update-ukuran mb-3"
          @click="updateToKetUkuran"
        >
          <IconCheck :size="16" class="mr-1" /> Update ke Ket.Ukuran
        </button>

        <fieldset class="label-box flex-grow-1">
          <legend class="font-weight-bold text-primary px-1">Label</legend>
          <label class="rb-lbl mt-2">
            <input
              type="radio"
              v-model.number="formData.spk_label"
              :value="0"
            />
            Umum (Label Luar dan Dalam)
          </label>
          <label class="rb-lbl">
            <input
              type="radio"
              v-model.number="formData.spk_label"
              :value="1"
            />
            Non Umum (Label Dalam)
          </label>
          <label class="rb-lbl">
            <input
              type="radio"
              v-model.number="formData.spk_label"
              :value="2"
            />
            Tanpa Label
          </label>
        </fieldset>
      </div>

      <div class="tm-section d-flex flex-column flex-grow-1">
        <div class="tm-sec-title d-flex justify-space-between align-center">
          <span>Detail Size / Ukuran Badan</span>
          <button type="button" class="btn-add" @click="addSizeRow">
            <IconPlus :size="13" class="mr-1" /> Tambah Size
          </button>
        </div>

        <div class="ll-table-wrap flex-grow-1 mt-1">
          <table class="ll-table">
            <thead>
              <tr>
                <th style="width: 100px; text-align: left">Size</th>
                <th style="width: 100px; text-align: right">Qty</th>
                <th style="width: 100px; text-align: right">L.Badan (A)</th>
                <th style="width: 100px; text-align: right">P.Badan (B)</th>
                <th style="width: 40px" class="text-center"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in formData.Sizes" :key="'s-' + idx">
                <td class="ll-td-inp">
                  <input
                    type="text"
                    v-model="row.size"
                    class="ll-cell text-uppercase font-weight-bold"
                    placeholder="S/M/L..."
                  />
                </td>
                <td class="ll-td-inp">
                  <input
                    type="number"
                    v-model.number="row.qty"
                    class="ll-cell tr text-primary font-weight-bold"
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
                <td class="ll-td-ctr">
                  <button
                    type="button"
                    class="btn-del"
                    @click="removeSizeRow(idx)"
                    title="Hapus"
                  >
                    <IconTrash :size="14" />
                  </button>
                </td>
              </tr>
              <tr v-if="!formData.Sizes || formData.Sizes.length === 0">
                <td colspan="5" class="text-center text-grey py-3 font-italic">
                  Data Size Kosong.
                </td>
              </tr>
            </tbody>
            <tfoot v-if="formData.Sizes && formData.Sizes.length > 0">
              <tr>
                <td
                  class="text-right font-weight-bold py-1 px-2 bg-grey-lighten-4"
                >
                  TOTAL :
                </td>
                <td
                  class="text-right font-weight-bold py-1 px-2 text-primary"
                  style="background: #fff59d"
                >
                  {{ totalSize.toLocaleString("id-ID") }}
                </td>
                <td colspan="3" class="bg-grey-lighten-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tm-tab-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
}
.tm-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 10px;
}
.tm-sec-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #1565c0;
}
.gap-2 {
  gap: 8px;
}

.btn-add {
  background: #546e7a;
  color: white;
  border: none;
  padding: 4px 10px;
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
  padding: 2px;
}
.btn-del:hover {
  background: #ffebee;
  border-radius: 3px;
}

.btn-update-ukuran {
  background: #e8f5e9;
  border: 1px solid #4caf50;
  color: #2e7d32;
  font-weight: 700;
  padding: 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-update-ukuran:hover {
  background: #c8e6c9;
}

.label-box {
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fafafa;
}
.rb-lbl {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 11px;
  color: #333;
}
.rb-lbl input[type="radio"] {
  accent-color: #1565c0;
  margin: 0;
  width: 14px;
  height: 14px;
}

/* TABLE STYLES */
.ll-table-wrap {
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
}
.ll-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}
.ll-table thead th {
  background: #1565c0;
  color: white;
  font-weight: 600;
  padding: 6px 8px;
  position: sticky;
  top: 0;
  z-index: 1;
  font-size: 10px;
  border: 1px solid #0d47a1;
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
  padding: 4px 6px;
  background: #f5f5f5 !important;
  color: #424242;
}
.ll-td-inp {
  padding: 0;
  position: relative;
}
.ll-td-ctr {
  text-align: center;
}

.ll-cell {
  width: 100%;
  height: 26px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  padding: 0 8px;
  font-family: inherit;
  color: #212121;
}
.ll-cell:focus {
  background: #e3f2fd;
}
.tr {
  text-align: right;
}

/* Tombol Lookup di dalam tabel */
.btn-lkp-inner {
  background: #eeeeee;
  border: none;
  border-left: 1px solid #e0e0e0;
  padding: 0 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-lkp-inner:hover {
  background: #e0e0e0;
}
</style>
