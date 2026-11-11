<script lang="ts">
export interface RekapOption {
  nomor: string;
  tanggal: string;
  keterangan: string;
  jumlah: number;
  total: number;
}
export interface RekapRow {
  trs: string;
  kode: string;
  nama: string;
  bank: string;
  rekening: string;
  atasnama: string;
  nominal: number;
  rekapNomor: string;
  cekRekening: string;
}
</script>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  modelValue: boolean;
  fetchOptions: (search: string) => Promise<RekapOption[]>;
  fetchRows: (nomor: string) => Promise<RekapRow[]>;
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "pilih", rows: RekapRow[]): void;
}>();

const search = ref("");
const items = ref<RekapOption[]>([]);
const isLoading = ref(false);
const errMsg = ref("");
let timer: ReturnType<typeof setTimeout> | null = null;

const muat = async () => {
  isLoading.value = true;
  errMsg.value = "";
  try {
    items.value = await props.fetchOptions(search.value);
  } catch {
    errMsg.value = "Gagal memuat rekap pembayaran.";
    items.value = [];
  } finally {
    isLoading.value = false;
  }
};
const onInput = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(muat, 400);
};
const pilih = async (o: RekapOption) => {
  errMsg.value = "";
  try {
    const rows = await props.fetchRows(o.nomor);
    if (!rows.length) {
      errMsg.value = "Rekap ini tidak punya voucher yang bisa dibayar.";
      return;
    }
    emit("pilih", rows);
    emit("update:modelValue", false);
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response
      ?.data?.message;
    errMsg.value = msg || "Gagal memuat baris rekap.";
  }
};

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      search.value = "";
      muat();
    }
  },
);

const numFmt = (v: number) => Number(v || 0).toLocaleString("id-ID");
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="700px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Panggil Rekap Pembayaran
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="search"
          class="rk-inp"
          placeholder="Cari nomor atau keterangan rekap..."
          @input="onInput"
        />
        <div v-if="errMsg" class="rk-err">{{ errMsg }}</div>
        <div class="rk-wrap">
          <div v-if="isLoading" class="rk-empty">Memuat...</div>
          <table v-else class="rk-table">
            <thead>
              <tr>
                <th style="width: 150px">Nomor</th>
                <th style="width: 90px">Tanggal</th>
                <th>Keterangan</th>
                <th style="width: 60px" class="tr">Voucher</th>
                <th style="width: 110px" class="tr">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="o in items"
                :key="o.nomor"
                class="rk-row"
                @click="pilih(o)"
              >
                <td>{{ o.nomor }}</td>
                <td>{{ o.tanggal }}</td>
                <td>{{ o.keterangan || "-" }}</td>
                <td class="tr">{{ o.jumlah }}</td>
                <td class="tr">{{ numFmt(o.total) }}</td>
              </tr>
              <tr v-if="items.length === 0">
                <td colspan="5" class="rk-empty">
                  Tidak ada rekap aktif dengan voucher yang belum dibayar
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="rk-hint">
          Hanya baris rekap yang sudah berupa voucher. Nominal mengikuti sisa
          voucher dan tidak bisa diubah.
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.rk-inp {
  width: 100%;
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 11px;
  margin-bottom: 8px;
}
.rk-wrap {
  max-height: 340px;
  overflow-y: auto;
}
.rk-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.rk-table th {
  position: sticky;
  top: 0;
  background: #f5f5f5;
  text-align: left;
  padding: 5px 8px;
  border-bottom: 1px solid #e0e0e0;
}
.rk-table td {
  padding: 5px 8px;
  border-bottom: 1px solid #eee;
}
.rk-table td:first-child {
  white-space: nowrap;
}
.rk-row {
  cursor: pointer;
}
.rk-row:hover {
  background: #e3f2fd;
}
.tr {
  text-align: right !important;
}
.rk-empty {
  text-align: center;
  color: #9e9e9e;
  padding: 14px;
  font-size: 11px;
}
.rk-err {
  color: #c62828;
  font-size: 11px;
  margin-bottom: 6px;
}
.rk-hint {
  margin-top: 8px;
  font-size: 10px;
  color: #757575;
}
</style>
