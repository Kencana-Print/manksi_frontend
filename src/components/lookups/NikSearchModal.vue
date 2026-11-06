<script setup lang="ts">
import { ref, watch } from "vue";
import {
  userFormService,
  type HrdKaryawan,
} from "@/services/tools/userFormService";
import { IconSearch } from "@tabler/icons-vue";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "selected", item: HrdKaryawan): void;
}>();

const PESAN_AWAL = "Ketik minimal 2 huruf nama atau NIK.";
const q = ref("");
const items = ref<HrdKaryawan[]>([]);
const loading = ref(false);
const pesan = ref(PESAN_AWAL);
let timer: ReturnType<typeof setTimeout> | null = null;
let reqId = 0;

const cari = async () => {
  const kata = q.value.trim();
  if (kata.length < 2) {
    items.value = [];
    pesan.value = PESAN_AWAL;
    return;
  }
  const myReq = ++reqId;
  loading.value = true;
  try {
    const res = await userFormService.searchNik(kata);
    if (myReq !== reqId) return;
    items.value = res.data.data ?? [];
    pesan.value = items.value.length
      ? ""
      : "Tidak ada karyawan aktif yang cocok.";
  } catch {
    if (myReq === reqId) {
      items.value = [];
      pesan.value = "Gagal memuat data HRD.";
    }
  } finally {
    if (myReq === reqId) loading.value = false;
  }
};

watch(q, () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(cari, 350);
});

watch(
  () => props.modelValue,
  (buka) => {
    if (buka) {
      q.value = "";
      items.value = [];
      pesan.value = PESAN_AWAL;
    }
  },
);

const pilih = (item: HrdKaryawan) => {
  emit("selected", item);
  emit("update:modelValue", false);
};
const tutup = () => emit("update:modelValue", false);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white pa-3 nik-title">
        Cari Karyawan (HRD)
      </v-card-title>
      <v-card-text class="pa-3">
        <div class="nik-search">
          <IconSearch :size="14" color="#1565c0" />
          <input
            v-model="q"
            class="nik-inp"
            placeholder="Nama atau NIK..."
            autofocus
            @keydown.esc="tutup"
          />
        </div>
        <div v-if="loading" class="nik-info">Memuat...</div>
        <div v-else-if="pesan" class="nik-info">{{ pesan }}</div>
        <div v-else class="nik-wrap">
          <table class="nik-tbl">
            <thead>
              <tr>
                <th style="width: 110px">NIK</th>
                <th>Nama</th>
                <th style="width: 60px">Pabrik</th>
                <th style="width: 90px">Departemen</th>
                <th style="width: 80px">Jabatan</th>
                <th style="width: 110px">Bagian</th>
                <th style="width: 130px">Akun MANKSI</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in items" :key="it.nik" @click="pilih(it)">
                <td>{{ it.nik }}</td>
                <td>{{ it.nama }}</td>
                <td>{{ it.pabrik }}</td>
                <td>{{ it.departemen }}</td>
                <td>{{ it.jabatan }}</td>
                <td>{{ it.bagian }}</td>
                <td>{{ it.userKode || "-" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn size="small" variant="text" @click="tutup">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.nik-title {
  font-size: 12px !important;
}
.nik-search {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 8px;
  height: 30px;
  margin-bottom: 8px;
}
.nik-inp {
  flex: 1;
  border: none;
  outline: none;
  font-size: 11px;
}
.nik-info {
  font-size: 11px;
  color: #757575;
  padding: 10px 2px;
}
.nik-wrap {
  max-height: 360px;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.nik-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.nik-tbl thead th {
  position: sticky;
  top: 0;
  background: #1565c0;
  color: white;
  padding: 4px 8px;
  text-align: left;
  white-space: nowrap;
}
.nik-tbl tbody td {
  padding: 3px 8px;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
}
.nik-tbl tbody tr {
  cursor: pointer;
}
.nik-tbl tbody tr:hover td {
  background: #e3f2fd;
}
</style>
