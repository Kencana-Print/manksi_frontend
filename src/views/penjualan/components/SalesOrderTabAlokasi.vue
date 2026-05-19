<script setup lang="ts">
import { computed, ref } from "vue";
import {
  IconPlus,
  IconTrash,
  IconFileExcel,
  IconHistory,
} from "@tabler/icons-vue";
import { useToast } from "vue-toastification";
import * as XLSX from "xlsx"; // Pastikan sudah install: npm install xlsx

const props = defineProps<{ formData: any }>();
const emit = defineEmits(["open-history-alokasi"]);
const toast = useToast();

const fileInputRef = ref<HTMLInputElement | null>(null);

// Menghitung total jumlah alokasi
const totalAlokasi = computed(() => {
  return (
    props.formData.Alokasi?.reduce(
      (sum: number, item: any) => sum + (Number(item.jumlah) || 0),
      0,
    ) || 0
  );
});

const addRow = () => {
  if (!props.formData.Alokasi) props.formData.Alokasi = [];
  props.formData.Alokasi.push({
    alamat: "",
    kota: "",
    person: "",
    hp: "",
    jumlah: 0,
  });
};

const removeRow = (index: number) => {
  props.formData.Alokasi.splice(index, 1);
};

// Trigger input file untuk Import Excel
const triggerExcelUpload = () => {
  if (fileInputRef.value) {
    fileInputRef.value.value = ""; // Reset input
    fileInputRef.value.click();
  }
};

// Fungsi memproses file Excel yang dipilih
const handleExcelUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Ubah data sheet jadi array of array
      // header: 1 berarti outputnya array flat tanpa menjadikan baris 1 sbg keys object
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      });

      if (jsonData.length <= 1) {
        toast.warning("File Excel kosong atau hanya berisi header.");
        return;
      }

      if (!props.formData.Alokasi) props.formData.Alokasi = [];

      // Sesuai Delphi: Mulai dari baris ke-2 (index 1)
      let importedCount = 0;
      for (let r = 1; r < jsonData.length; r++) {
        const row = jsonData[r];
        // Pastikan kolom 1 (Alamat) tidak kosong
        if (row[0] && String(row[0]).trim() !== "") {
          props.formData.Alokasi.push({
            alamat: String(row[0] || "").trim(),
            kota: String(row[1] || "").trim(),
            person: String(row[2] || "").trim(),
            hp: String(row[3] || "").trim(),
            jumlah: Number(row[4]) || 0,
          });
          importedCount++;
        }
      }

      toast.success(
        `${importedCount} baris alokasi berhasil diimport dari Excel.`,
      );
    } catch (error) {
      console.error(error);
      toast.error("Gagal membaca file Excel. Pastikan format sesuai.");
    }
  };
  reader.readAsArrayBuffer(file);
};
</script>

<template>
  <div class="tm-tab-layout">
    <div class="tm-section d-flex flex-column fill-height">
      <div
        class="tm-sec-title d-flex justify-space-between align-center pb-2"
        style="border-bottom: 1px solid #eee"
      >
        <span class="text-subtitle-2 font-weight-bold text-primary"
          >Daftar Alokasi Pengiriman</span
        >

        <div class="d-flex align-center gap-2">
          <button
            type="button"
            class="btn-action green"
            @click="triggerExcelUpload"
          >
            <IconFileExcel :size="14" class="mr-1" /> Import From Excel
          </button>

          <button
            type="button"
            class="btn-action orange"
            @click="emit('open-history-alokasi')"
          >
            <IconHistory :size="14" class="mr-1" /> Import From History
          </button>

          <button type="button" class="btn-action blue" @click="addRow">
            <IconPlus :size="14" class="mr-1" /> Tambah Baris
          </button>
        </div>
      </div>

      <input
        type="file"
        ref="fileInputRef"
        accept=".xls,.xlsx"
        style="display: none"
        @change="handleExcelUpload"
      />

      <div class="ll-table-wrap flex-grow-1 mt-2">
        <table class="ll-table">
          <thead>
            <tr>
              <th style="width: 40px" class="text-center">No</th>
              <th style="text-align: left">Alamat</th>
              <th style="text-align: left; width: 200px">Kota</th>
              <th style="text-align: left; width: 150px">Kontak Person</th>
              <th style="text-align: left; width: 150px">No. HP</th>
              <th style="width: 100px; text-align: right">Jumlah</th>
              <th style="width: 50px" class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in formData.Alokasi" :key="idx">
              <td class="ll-td-ctr ll-td-lbl">{{ Number(idx) + 1 }}</td>
              <td class="ll-td-inp">
                <input
                  type="text"
                  v-model="row.alamat"
                  class="ll-cell"
                  placeholder="Detail alamat..."
                />
              </td>
              <td class="ll-td-inp">
                <input
                  type="text"
                  v-model="row.kota"
                  class="ll-cell"
                  placeholder="Kota"
                />
              </td>
              <td class="ll-td-inp">
                <input
                  type="text"
                  v-model="row.person"
                  class="ll-cell"
                  placeholder="Nama kontak"
                />
              </td>
              <td class="ll-td-inp">
                <input
                  type="text"
                  v-model="row.hp"
                  class="ll-cell"
                  placeholder="08xxx"
                />
              </td>
              <td class="ll-td-inp">
                <input
                  type="number"
                  v-model.number="row.jumlah"
                  class="ll-cell tr font-weight-bold"
                />
              </td>
              <td class="ll-td-ctr">
                <button
                  type="button"
                  class="btn-del"
                  @click="removeRow(Number(idx))"
                  title="Hapus Baris"
                >
                  <IconTrash :size="14" />
                </button>
              </td>
            </tr>
            <tr v-if="!formData.Alokasi || formData.Alokasi.length === 0">
              <td colspan="7" class="text-center text-grey py-4 font-italic">
                Belum ada data alokasi. Klik tombol di atas untuk menginput
                data.
              </td>
            </tr>
          </tbody>
          <tfoot v-if="formData.Alokasi && formData.Alokasi.length > 0">
            <tr>
              <td
                colspan="5"
                class="text-right font-weight-bold py-1 px-2"
                style="background: #f5f5f5"
              >
                TOTAL QTY ALOKASI :
              </td>
              <td
                class="text-right font-weight-bold py-1 px-2 text-primary"
                style="background: #e3f2fd"
              >
                {{ totalAlokasi.toLocaleString("id-ID") }}
              </td>
              <td style="background: #f5f5f5"></td>
            </tr>
          </tfoot>
        </table>
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
  padding: 10px;
}
/* ── STYLE TOMBOL AKSI (Jejeran atas) ── */
.gap-2 {
  gap: 8px;
}
.btn-action {
  color: white;
  border: none;
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: background 0.2s;
}
.btn-action.blue {
  background: #1976d2;
}
.btn-action.blue:hover {
  background: #1565c0;
}
.btn-action.green {
  background: #2e7d32;
}
.btn-action.green:hover {
  background: #1b5e20;
}
.btn-action.orange {
  background: #f57c00;
}
.btn-action.orange:hover {
  background: #e65100;
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
  padding: 6px;
  position: sticky;
  top: 0;
  z-index: 1;
  font-size: 11px;
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
  padding: 0 6px;
  font-family: inherit;
  color: #212121;
}
.ll-cell:focus {
  background: #e3f2fd;
}
.tr {
  text-align: right;
}
</style>
