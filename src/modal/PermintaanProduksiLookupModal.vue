<script setup>
import { ref, watch } from "vue";
import api from "@/services/api";

const props = defineProps({
  isVisible: Boolean,
});

const emit = defineEmits(["close", "select"]);

const search = ref("");
const items = ref([]);
const isLoading = ref(false);

async function fetchData() {
  isLoading.value = true;
  try {
    // Endpoint disesuaikan dengan route backend Anda
    const res = await api.get(
      `/mmt/permintaan-produksi-bahan/lookup?q=${search.value}`,
    );
    items.value = res.data?.data || [];
  } catch (error) {
    console.error("Gagal memuat lookup permintaan:", error);
  } finally {
    isLoading.value = false;
  }
}

// Jalankan fetch saat modal dibuka
watch(
  () => props.isVisible,
  (val) => {
    if (val) fetchData();
  },
);

function handleSelect(item) {
  emit("select", item);
  search.value = "";
}

function getStatusColor(status) {
  if (status === "OPEN") return "blue";
  if (status === "POSTED") return "green";
  if (status === "CANCEL") return "red";
  return "grey";
}
</script>

<template>
  <v-dialog v-model="props.isVisible" max-width="900px" persistent>
    <v-card>
      <v-card-title class="bg-indigo-darken-2 text-white d-flex align-center">
        <v-icon start>mdi-file-find</v-icon>
        <span>Cari Dokumen Permintaan Produksi</span>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="emit('close')"></v-btn>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-text-field
          v-model="search"
          label="Cari Nomor Dokumen atau Keterangan..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-4"
          @keyup.enter="fetchData"
          placeholder="Tekan Enter untuk mencari"
        ></v-text-field>

        <v-table
          density="compact"
          class="border rounded"
          fixed-header
          height="450px"
        >
          <thead>
            <tr>
              <th class="bg-grey-lighten-3">Nomor</th>
              <th class="bg-grey-lighten-3">Tanggal</th>
              <th class="bg-grey-lighten-3">Lokasi/Dept</th>
              <th class="bg-grey-lighten-3">Keterangan</th>
              <th class="bg-grey-lighten-3 text-center">Status</th>
              <th class="bg-grey-lighten-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="6" class="text-center pa-4">
                <v-progress-circular
                  indeterminate
                  size="20"
                  color="primary"
                  class="mr-2"
                ></v-progress-circular>
                Memuat data...
              </td>
            </tr>
            <tr v-else-if="items.length === 0">
              <td colspan="6" class="text-center pa-4 text-grey">
                Data tidak ditemukan.
              </td>
            </tr>
            <tr v-for="item in items" :key="item.Nomor" class="hover-row">
              <td class="font-weight-bold text-primary">{{ item.Nomor }}</td>
              <td>{{ item.Tanggal }}</td>
              <td>{{ item.Lokasi }}</td>
              <td class="text-truncate" style="max-width: 200px">
                {{ item.Keterangan }}
              </td>
              <td class="text-center">
                <v-chip
                  size="x-small"
                  :color="getStatusColor(item.Status)"
                  variant="flat"
                >
                  {{ item.Status }}
                </v-chip>
              </td>
              <td class="text-center">
                <v-btn
                  size="x-small"
                  color="indigo"
                  variant="flat"
                  @click="handleSelect(item)"
                >
                  Buka Data
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions class="bg-grey-lighten-4">
        <span class="text-caption text-grey-darken-1 ml-2"
          >Menampilkan {{ items.length }} data terakhir.</span
        >
        <v-spacer></v-spacer>
        <v-btn variant="text" color="grey-darken-1" @click="emit('close')"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.hover-row:hover {
  background-color: #f5f5f5;
  cursor: pointer;
}
</style>
