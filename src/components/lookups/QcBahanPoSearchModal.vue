<script setup lang="ts">
import { ref, watch } from "vue";
import {
  qcBahanFormService,
  type QcPoLookupItem,
} from "@/services/garmen/qcBahanFormService";
import { IconSearch, IconX } from "@tabler/icons-vue";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "selected", item: QcPoLookupItem): void;
}>();

const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const now = new Date();
const startDate = ref(
  toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
);
const endDate = ref(toLocalDateStr(now));
const query = ref("");
const items = ref<QcPoLookupItem[]>([]);
const isLoading = ref(false);

let debounce: ReturnType<typeof setTimeout> | null = null;

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await qcBahanFormService.lookupPo({
      startDate: startDate.value,
      endDate: endDate.value,
      search: query.value,
    });
    items.value = res.data.data;
  } catch {
    items.value = [];
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      query.value = "";
      fetchData();
    }
  },
);

const onSearchInput = () => {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(fetchData, 400);
};

const onSelect = (item: QcPoLookupItem) => {
  emit("selected", item);
  emit("update:modelValue", false);
};

const close = () => emit("update:modelValue", false);

const formatTgl = (v: string) => {
  if (!v) return "-";
  const [y, m, d] = v.split("-");
  return `${d}-${m}-${y}`;
};
const numFmt = (v: number) => Number(v || 0).toLocaleString("id-ID");
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1400px"
    scrollable
    @update:model-value="close"
  >
    <v-card rounded="lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-3">
        <IconSearch :size="16" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold"
          >Pilih PO Bahan (per baris bahan)</span
        >
        <v-spacer />
        <v-btn variant="text" size="small" color="white" @click="close">
          <IconX :size="16" />
        </v-btn>
      </v-card-title>

      <div
        class="d-flex align-center pa-3 border-b bg-grey-lighten-5"
        style="gap: 8px; flex-wrap: wrap"
      >
        <span class="f-label">Tgl PO:</span>
        <input
          type="date"
          v-model="startDate"
          @change="fetchData"
          class="f-in"
        />
        <span class="f-label">s/d</span>
        <input type="date" v-model="endDate" @change="fetchData" class="f-in" />
        <div style="flex: 1; min-width: 220px; position: relative">
          <input
            v-model="query"
            @input="onSearchInput"
            placeholder="Cari nomor PO, SPK, nama kain, supplier..."
            class="f-in"
            style="width: 100%; padding-left: 26px"
          />
          <IconSearch
            :size="13"
            color="#9e9e9e"
            style="
              position: absolute;
              left: 7px;
              top: 50%;
              transform: translateY(-50%);
            "
          />
        </div>
      </div>

      <v-card-text class="pa-0" style="max-height: 560px; overflow-y: auto">
        <v-progress-linear
          v-if="isLoading"
          indeterminate
          color="primary"
          height="2"
        />
        <table class="po-table">
          <thead>
            <tr>
              <th width="140">Nomor PO</th>
              <th width="150">Nomor SPK</th>
              <th width="90">Jenis</th>
              <th width="90">Tgl PO</th>
              <th width="160">Supplier</th>
              <th width="40" class="tc">#</th>
              <th width="250">Nama Kain</th>
              <th width="90">Gramasi</th>
              <th width="70">Setting</th>
              <th width="60" class="tr">Roll</th>
              <th width="90" class="tr">Qty</th>
              <th width="50" class="tc">Sat</th>
              <th width="60" class="tc">QC</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="it in items"
              :key="`${it.PO}-${it.Nourut}`"
              class="po-row"
              @click="onSelect(it)"
            >
              <td class="fw font-mono text-primary">{{ it.PO }}</td>
              <td class="font-mono" :title="it.NomorSpk ?? ''">
                {{ it.NomorSpk || "-" }}
              </td>
              <td>{{ it.JenisPO }}</td>
              <td>{{ formatTgl(it.TanggalPO) }}</td>
              <td :title="it.Supplier">{{ it.Supplier }}</td>
              <td class="tc">{{ it.Nourut }}</td>
              <td :title="it.NamaKain">{{ it.NamaKain }}</td>
              <td>{{ it.Gramasi || "-" }}</td>
              <td>{{ it.Setting || "-" }}</td>
              <td class="tr">{{ numFmt(it.Roll) }}</td>
              <td class="tr fw">{{ numFmt(it.Qty) }}</td>
              <td class="tc">{{ it.Satuan }}</td>
              <td class="tc">
                <span
                  class="chip"
                  :class="it.QcCount > 0 ? 'chip-ok' : 'chip-no'"
                >
                  {{ it.QcCount }}x
                </span>
              </td>
            </tr>
            <tr v-if="!isLoading && items.length === 0">
              <td colspan="13" class="text-center text-grey pa-4">
                Tidak ada baris PO ditemukan.
              </td>
            </tr>
          </tbody>
        </table>
      </v-card-text>

      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <span class="text-caption text-grey"
          >{{ items.length }} baris (maks. 200). Kolom QC = jumlah dokumen QC
          yang sudah ada untuk baris itu.</span
        >
        <v-spacer />
        <v-btn variant="text" @click="close">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
}
.f-in {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  box-sizing: border-box;
}
.po-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  table-layout: fixed;
}
.po-table thead th {
  background: #1565c0;
  color: white;
  padding: 6px 8px;
  text-align: left;
  position: sticky;
  top: 0;
  z-index: 1;
  font-weight: 600;
  white-space: nowrap;
}
.po-table tbody td {
  padding: 6px 8px;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.po-row {
  cursor: pointer;
}
.po-row:hover td {
  background: #e3f2fd;
}
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.fw {
  font-weight: 700;
}
.font-mono {
  font-family: monospace;
}
.text-primary {
  color: #1565c0;
}
.chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 9.5px;
  font-weight: 700;
}
.chip-ok {
  background: #fff3e0;
  color: #e65100;
}
.chip-no {
  background: #f5f5f5;
  color: #757575;
}
</style>
