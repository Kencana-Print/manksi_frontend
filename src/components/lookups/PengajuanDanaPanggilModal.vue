<script lang="ts">
export interface PengajuanDanaRow {
  pgj: string;
  pjhNomor: string;
  tanggal: string;
  pemohon: string;
  keterangan: string;
  itemNourut: number;
  nama: string;
  spesifikasi: string;
  satuan: string;
  qtySisa: number;
  harga: number;
  nominal: number;
  ccKode: number;
  ccNama: string;
  dcNama: string;
}
</script>

<script setup lang="ts">
import { ref, computed, watch } from "vue";

const props = defineProps<{
  modelValue: boolean;
  fetchOptions: (search: string) => Promise<PengajuanDanaRow[]>;
  excludeKey: string[];
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "pilih", rows: PengajuanDanaRow[]): void;
}>();

const search = ref("");
const items = ref<PengajuanDanaRow[]>([]);
const dipilih = ref<string[]>([]);
const isLoading = ref(false);
const errMsg = ref("");
let timer: ReturnType<typeof setTimeout> | null = null;

const tampil = computed(() =>
  items.value.filter((r) => !props.excludeKey.includes(r.pgj)),
);
const semuaTerpilih = computed(
  () =>
    tampil.value.length > 0 &&
    tampil.value.every((r) => dipilih.value.includes(r.pgj)),
);

const muat = async () => {
  isLoading.value = true;
  errMsg.value = "";
  try {
    items.value = await props.fetchOptions(search.value);
    const ada = new Set(items.value.map((r) => r.pgj));
    dipilih.value = dipilih.value.filter((k) => ada.has(k));
  } catch {
    errMsg.value = "Gagal memuat Pengajuan Dana.";
    items.value = [];
  } finally {
    isLoading.value = false;
  }
};
const onInput = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(muat, 400);
};
const toggle = (key: string) => {
  dipilih.value = dipilih.value.includes(key)
    ? dipilih.value.filter((k) => k !== key)
    : [...dipilih.value, key];
};
const toggleSemua = () => {
  dipilih.value = semuaTerpilih.value ? [] : tampil.value.map((r) => r.pgj);
};
const tambahkan = () => {
  const rows = tampil.value.filter((r) => dipilih.value.includes(r.pgj));
  if (!rows.length) {
    errMsg.value = "Pilih minimal satu item.";
    return;
  }
  emit("pilih", rows);
  emit("update:modelValue", false);
};

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      search.value = "";
      dipilih.value = [];
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
        Panggil Pengajuan Dana (per item)
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="search"
          class="pg-inp"
          placeholder="Cari nomor pengajuan atau nama item..."
          @input="onInput"
        />
        <div v-if="errMsg" class="pg-err">{{ errMsg }}</div>
        <div class="pg-wrap">
          <div v-if="isLoading" class="pg-empty">Memuat...</div>
          <table v-else class="pg-table">
            <thead>
              <tr>
                <th style="width: 28px">
                  <input
                    type="checkbox"
                    :checked="semuaTerpilih"
                    @change="toggleSemua"
                  />
                </th>
                <th style="width: 140px">Pengajuan</th>
                <th style="width: 80px">Tanggal</th>
                <th style="width: 110px">Pemohon</th>
                <th>Item</th>
                <th style="width: 60px" class="tr">Qty</th>
                <th style="width: 100px" class="tr">Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in tampil"
                :key="r.pgj"
                class="pg-row"
                @click="toggle(r.pgj)"
              >
                <td @click.stop>
                  <input
                    type="checkbox"
                    :checked="dipilih.includes(r.pgj)"
                    @change="toggle(r.pgj)"
                  />
                </td>
                <td>{{ r.pjhNomor }} #{{ r.itemNourut }}</td>
                <td>{{ r.tanggal }}</td>
                <td>{{ r.pemohon || "-" }}</td>
                <td>
                  {{ r.nama }}
                  <span v-if="r.spesifikasi" class="pg-sub">
                    - {{ r.spesifikasi }}
                  </span>
                  <div v-if="r.keterangan" class="pg-sub">
                    {{ r.keterangan }}
                  </div>
                </td>
                <td class="tr">{{ numFmt(r.qtySisa) }} {{ r.satuan }}</td>
                <td class="tr">{{ numFmt(r.nominal) }}</td>
              </tr>
              <tr v-if="tampil.length === 0">
                <td colspan="7" class="pg-empty">
                  Tidak ada item Pengajuan Dana yang bisa dibayar lewat BBK
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pg-hint">
          Hanya item yang belum dipanggil ke Petty Cash/Uang Muka dan belum
          dibayar BBK lain (pengajuan sampai Oktober 2026). Nominal boleh diubah
          di BBK; akun diisi manual.
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <span class="pg-count">{{ dipilih.length }} item dipilih</span>
        <v-spacer />
        <v-btn
          variant="text"
          size="small"
          @click="emit('update:modelValue', false)"
        >
          Batal
        </v-btn>
        <v-btn
          variant="flat"
          color="primary"
          size="small"
          :disabled="dipilih.length === 0"
          @click="tambahkan"
        >
          Tambahkan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.pg-inp {
  width: 100%;
  height: 28px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 11px;
  margin-bottom: 8px;
}
.pg-wrap {
  max-height: 380px;
  overflow-y: auto;
}
.pg-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.pg-table th {
  position: sticky;
  top: 0;
  background: #f5f5f5;
  text-align: left;
  padding: 5px 8px;
  border-bottom: 1px solid #e0e0e0;
}
.pg-table td {
  padding: 5px 8px;
  border-bottom: 1px solid #eee;
  vertical-align: top;
}
.pg-row {
  cursor: pointer;
}
.pg-row:hover {
  background: #e3f2fd;
}
.pg-sub {
  font-size: 10px;
  color: #757575;
}
.tr {
  text-align: right !important;
}
.pg-empty {
  text-align: center;
  color: #9e9e9e;
  padding: 14px;
  font-size: 11px;
}
.pg-err {
  color: #c62828;
  font-size: 11px;
  margin-bottom: 6px;
}
.pg-hint {
  font-size: 10px;
  color: #757575;
  margin-top: 6px;
}
.pg-count {
  font-size: 11px;
  color: #616161;
}
</style>
