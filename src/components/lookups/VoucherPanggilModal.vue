<script lang="ts">
export interface VoucherRow {
  trs: string;
  tanggal: string;
  kode: string;
  nama: string;
  bank: string;
  rekening: string;
  atasnama: string;
  nominal: number;
  rekapNomor: string;
  sudahRealisasi: boolean;
  cekRekening: string;
}
</script>

<script setup lang="ts">
import { ref, computed, watch } from "vue";

const props = defineProps<{
  modelValue: boolean;
  fetchOptions: (search: string) => Promise<VoucherRow[]>;
  excludeNomor: string[];
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "pilih", rows: VoucherRow[]): void;
}>();

const search = ref("");
const items = ref<VoucherRow[]>([]);
const terpilih = ref<Record<string, VoucherRow>>({});
const isLoading = ref(false);
const errMsg = ref("");
let timer: ReturnType<typeof setTimeout> | null = null;

const tampil = computed(() =>
  items.value.filter((r) => !props.excludeNomor.includes(r.trs)),
);
const jumlahDipilih = computed(() => Object.keys(terpilih.value).length);
const totalDipilih = computed(() =>
  Object.values(terpilih.value).reduce((s, r) => s + r.nominal, 0),
);

const muat = async () => {
  isLoading.value = true;
  errMsg.value = "";
  try {
    items.value = await props.fetchOptions(search.value);
  } catch {
    errMsg.value = "Gagal memuat voucher.";
    items.value = [];
  } finally {
    isLoading.value = false;
  }
};
const onInput = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(muat, 400);
};
const toggle = (r: VoucherRow) => {
  if (terpilih.value[r.trs]) delete terpilih.value[r.trs];
  else terpilih.value[r.trs] = r;
};
const tambahkan = () => {
  emit("pilih", Object.values(terpilih.value));
  emit("update:modelValue", false);
};

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      search.value = "";
      terpilih.value = {};
      muat();
    }
  },
);

const numFmt = (v: number) => Number(v || 0).toLocaleString("id-ID");
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Panggil Voucher Pembayaran
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="search"
          class="vp-inp"
          placeholder="Cari nomor voucher, supplier..."
          @input="onInput"
        />
        <div v-if="errMsg" class="vp-err">{{ errMsg }}</div>
        <div class="vp-wrap">
          <div v-if="isLoading" class="vp-empty">Memuat...</div>
          <table v-else class="vp-table">
            <thead>
              <tr>
                <th style="width: 28px"></th>
                <th style="width: 130px">Voucher</th>
                <th style="width: 85px">Tanggal</th>
                <th>Supplier</th>
                <th style="width: 110px" class="tr">Sisa</th>
                <th style="width: 150px">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in tampil"
                :key="r.trs"
                class="vp-row"
                @click="toggle(r)"
              >
                <td>
                  <input type="checkbox" :checked="!!terpilih[r.trs]" />
                </td>
                <td>{{ r.trs }}</td>
                <td>{{ r.tanggal }}</td>
                <td>{{ r.nama }}</td>
                <td class="tr">{{ numFmt(r.nominal) }}</td>
                <td>
                  <span v-if="r.sudahRealisasi" class="vp-warn"
                    >Status realisasi terisi</span
                  >
                  <span v-if="r.rekapNomor" class="vp-info">
                    Rekap {{ r.rekapNomor }}</span
                  >
                </td>
              </tr>
              <tr v-if="tampil.length === 0">
                <td colspan="6" class="vp-empty">
                  Tidak ada voucher yang belum dibayar
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="vp-hint">
          Voucher bertanggal sampai Oktober 2026 yang belum tercatat dibayar
          (maks. 200, gunakan pencarian). Voucher lama bisa saja sudah dibayar
          di luar sistem, periksa sebelum memilih. Nominal mengikuti sisa
          voucher dan tidak bisa diubah.
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <span class="vp-sum"
          >{{ jumlahDipilih }} dipilih, total {{ numFmt(totalDipilih) }}</span
        >
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)"
          >Batal</v-btn
        >
        <v-btn
          variant="flat"
          color="primary"
          :disabled="jumlahDipilih === 0"
          @click="tambahkan"
          >Tambahkan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.vp-inp {
  width: 100%;
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 11px;
  margin-bottom: 8px;
}
.vp-wrap {
  max-height: 340px;
  overflow-y: auto;
}
.vp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.vp-table th {
  position: sticky;
  top: 0;
  background: #f5f5f5;
  text-align: left;
  padding: 5px 8px;
  border-bottom: 1px solid #e0e0e0;
}
.vp-table td {
  padding: 5px 8px;
  border-bottom: 1px solid #eee;
}
.vp-row {
  cursor: pointer;
}
.vp-row:hover {
  background: #e3f2fd;
}
.tr {
  text-align: right !important;
}
.vp-empty {
  text-align: center;
  color: #9e9e9e;
  padding: 14px;
  font-size: 11px;
}
.vp-err {
  color: #c62828;
  font-size: 11px;
  margin-bottom: 6px;
}
.vp-warn {
  color: #c62828;
  font-weight: 600;
  margin-right: 6px;
}
.vp-info {
  color: #1565c0;
}
.vp-hint {
  margin-top: 8px;
  font-size: 10px;
  color: #757575;
}
.vp-sum {
  font-size: 11px;
}
</style>
