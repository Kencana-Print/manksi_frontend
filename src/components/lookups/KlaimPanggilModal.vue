<script lang="ts">
export interface KlaimOption {
  nomor: string;
  tanggal: string;
  cabang: string;
  rekKode: string;
  rekNama: string;
  rekRekening: string;
  nominal: number;
  keterangan: string;
  jumlahBkk: number;
  sup: {
    kode: string;
    nama: string;
    bank: string;
    rekening: string;
    atasnama: string;
  };
}
</script>

<script setup lang="ts">
import { ref, watch, computed } from "vue";

const props = defineProps<{
  modelValue: boolean;
  fetchOptions: (search: string) => Promise<KlaimOption[]>;
  excludeNomor?: string[];
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "pilih", o: KlaimOption): void;
}>();

const search = ref("");
const loading = ref(false);
const options = ref<KlaimOption[]>([]);
const terpilih = ref("");

const tampil = computed(() =>
  options.value.filter((o) => !(props.excludeNomor || []).includes(o.nomor)),
);
const dipilih = computed(
  () => tampil.value.find((o) => o.nomor === terpilih.value) || null,
);

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

const muat = async () => {
  loading.value = true;
  try {
    options.value = await props.fetchOptions(search.value);
  } catch {
    options.value = [];
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      search.value = "";
      terpilih.value = "";
      muat();
    }
  },
);

const tutup = () => emit("update:modelValue", false);
const pakai = () => {
  if (!dipilih.value) return;
  emit("pilih", dipilih.value);
  tutup();
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1000px"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg">
      <v-card-title class="pa-3 text-subtitle-1 text-white bg-primary">
        Panggil Klaim Kas Kecil
      </v-card-title>
      <v-card-text class="pa-3">
        <input
          v-model="search"
          class="klaim-search"
          placeholder="Cari nomor klaim / cabang (Enter)"
          @keydown.enter.prevent="muat"
        />
        <div style="max-height: 340px; overflow-y: auto; margin-top: 8px">
          <div v-if="loading" class="text-center py-4 text-grey">Memuat...</div>
          <table v-else class="mini-table">
            <thead>
              <tr>
                <th style="width: 32px"></th>
                <th style="width: 170px">Nomor Klaim</th>
                <th style="width: 90px">Tanggal</th>
                <th style="width: 60px">Cabang</th>
                <th>Kas Tujuan</th>
                <th>Supplier</th>
                <th style="width: 60px" class="text-center">Jml</th>
                <th style="width: 130px" class="text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="o in tampil"
                :key="o.nomor"
                class="mini-row"
                :class="{ 'mini-row--selected': terpilih === o.nomor }"
                @click="terpilih = o.nomor"
                @dblclick="
                  terpilih = o.nomor;
                  pakai();
                "
              >
                <td class="text-center">
                  <input
                    type="radio"
                    :checked="terpilih === o.nomor"
                    @click.stop
                    @change="terpilih = o.nomor"
                  />
                </td>
                <td style="white-space: nowrap">{{ o.nomor }}</td>
                <td>{{ o.tanggal }}</td>
                <td>{{ o.cabang }}</td>
                <td>{{ o.rekKode }} - {{ o.rekNama }}</td>
                <td>{{ o.sup.nama }}</td>
                <td class="text-center">{{ o.jumlahBkk }}</td>
                <td class="text-right">{{ numFmt(o.nominal) }}</td>
              </tr>
              <tr v-if="!tampil.length">
                <td colspan="8" class="text-center text-grey py-3">
                  Tidak ada klaim yang tersedia
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn variant="text" color="grey-darken-1" @click="tutup">Batal</v-btn>
        <v-btn
          variant="flat"
          color="primary"
          :disabled="!dipilih"
          @click="pakai"
          >Pakai</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.mini-table th,
.mini-table td {
  padding: 4px 6px;
  border-bottom: 1px solid #e0e0e0;
}
.mini-table th {
  background: #f5f5f5;
  text-align: left;
  position: sticky;
  top: 0;
}
.mini-row {
  cursor: pointer;
}
.mini-row:hover {
  background: #f1f7ff;
}
.mini-row--selected {
  background: #e3f2fd;
}
.klaim-search {
  width: 100%;
  font-size: 11px;
  padding: 4px 8px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  outline: none;
}
</style>
