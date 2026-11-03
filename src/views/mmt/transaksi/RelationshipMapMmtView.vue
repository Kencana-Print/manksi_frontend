<script setup lang="ts">
import { ref } from "vue";
import PageLayout from "@/components/PageLayout.vue";
import { IconChartLine, IconSearch } from "@tabler/icons-vue";
import api from "@/services/api";

const keyword = ref("");
const isLoading = ref(false);
const graphData = ref<any>(null);

const handleSearch = async () => {
  if (!keyword.value.trim()) return;
  isLoading.value = true;
  try {
    const res = await api.get("/mmt/relationship-map/search", {
      params: { query: keyword.value.trim() },
    });
    graphData.value = res.data?.data || null;
  } catch (err) {
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <PageLayout title="Relationship Map MMT" :icon="IconChartLine" menu-id="5522">
    <div class="pa-4 bg-white h-100 d-flex flex-column">
      <div class="d-flex align-center ga-2 mb-4" style="max-width: 450px">
        <v-text-field
          v-model="keyword"
          placeholder="Cari No. SPK / No. MAP / No. SO..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
          @keyup.enter="handleSearch"
        />
        <v-btn color="primary" variant="elevated" size="small" :loading="isLoading" @click="handleSearch">
          <IconSearch :size="16" class="mr-1" /> Cari
        </v-btn>
      </div>

      <div class="flex-grow-1 border rounded pa-4 bg-grey-lighten-4 d-flex align-center justify-center">
        <div v-if="!graphData && !isLoading" class="text-caption text-grey">
          Masukkan nomor dokumen untuk melihat visualisasi relasi dokumen (SO - MAP - SPK - LHK - BAST).
        </div>
        <div v-else-if="isLoading" class="text-caption text-primary">
          Memuat visualisasi relasi...
        </div>
        <div v-else class="text-caption text-success font-weight-bold">
          Data relasi ditemukan untuk dokumen {{ keyword }}.
        </div>
      </div>
    </div>
  </PageLayout>
</template>
