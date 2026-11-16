<template>
  <PageLayout title="Data Master Operator MMT" icon="mdi-account-group-outline">
    <template #header-actions>
      <v-btn
        v-if="authStore.can(MENU_ID, 'insert')"
        size="small"
        color="success"
        @click="handleNew"
      >
        <v-icon start>mdi-plus</v-icon> Baru
      </v-btn>

      <v-btn
        v-if="authStore.can(MENU_ID, 'edit')"
        size="small"
        color="warning"
        :disabled="!isSingleSelected"
        @click="handleEdit"
      >
        <v-icon start>mdi-pencil</v-icon> Ubah
      </v-btn>

      <v-btn
        v-if="authStore.can(MENU_ID, 'delete')"
        size="small"
        color="error"
        :disabled="!isSingleSelected"
        @click="handleDelete"
      >
        <v-icon start>mdi-trash-can</v-icon> Hapus
      </v-btn>

      <v-divider vertical class="mx-2" />

      <v-btn size="small" @click="fetchData">
        <v-icon start>mdi-refresh</v-icon> Refresh Data
      </v-btn>
    </template>

    <div class="browse-content">
      <div class="table-container">
        <v-data-table
          v-model:selected="selected"
          :headers="headers"
          :items="masterData || []"
          :loading="loading"
          item-value="Kode"
          density="compact"
          class="desktop-table elevation-1"
          fixed-header
          show-select
          return-object
          hide-default-footer
        >
        </v-data-table>
      </div>
    </div>
  </PageLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";
import PageLayout from "@/components/PageLayout.vue";

// --- Interfaces ---

interface Operator {
  Kode: string; // op_kode
  Nama: string; // op_nama
  [key: string]: any;
}

const API_OERATOR_MMT = "/mmt/operator";
const MENU_ID = "MMT_MASTER_OPERATOR";

// --- Store & utils ---
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

// --- State ---
const masterData = ref<Operator[]>([]);
const loading = ref<boolean>(true);
const selected = ref<Operator[]>([]);

// --- Computed ---

const isSingleSelected = computed(() => selected.value.length === 1);
const selectedKode = computed<string | null>(() =>
  isSingleSelected.value ? (selected.value[0] as Operator).Kode : null
);

const selectedRow = computed<Operator | null>(() =>
  isSingleSelected.value ? (selected.value[0] as Operator) : null
);

// --- Headers (Sesuai SQL Delphi) ---

const headers = [
  { title: "Kode", key: "Kode", minWidth: "100px", fixed: true },
  { title: "Nama Operator", key: "Nama", minWidth: "300px" },
] as any[];

// --- API calls (Implementasi dari SQL Delphi) ---

const fetchData = async () => {
  // Menggantikan btnRefreshClick Delphi
  loading.value = true;
  try {
    // SQL Master Delphi: SELECT op_kode Kode, op_nama Nama FROM toperator_mmt
    const response = await api.get<Operator[]>(`${API_OERATOR_MMT}`);

    masterData.value = response.data || [];
  } catch (err) {
    toast.error("Gagal mengambil data Master Operator.");
  } finally {
    loading.value = false;
  }
};

// --- Actions ---

const handleNew = () => {
  // cxButton2Click
  router.push({ name: "OperatorMmtCreate" });
};

const handleEdit = () => {
  // cxButton1Click
  if (!selectedKode.value) return;
  router.push({
    name: "OperatorMmtEdit",
    params: { kode: selectedKode.value },
  });
};

const handleDelete = async () => {
  // cxButton4Click
  if (!selectedKode.value) return;

  if (
    confirm(
      `Yakin ingin hapus Operator ${selectedKode.value} (${selectedRow.value?.Nama})?`
    )
  ) {
    try {
      // Logika delete dari Delphi: delete from toperator_mmt where op_kode = 'KODE'
      await api.delete(`${API_OERATOR_MMT}/${selectedKode.value}`);
      toast.success("Data berhasil di Hapus.");
      await fetchData();
    } catch (error) {
      toast.error("Gagal Hapus. Silakan cek hak akses.");
    }
  }
};

// --- Lifecycle ---
onMounted(() => {
  fetchData(); // Menggantikan FormShow / btnRefreshClick
});
</script>

<style scoped>
.browse-content {
  padding-top: 10px;
}

/* Detail styles */
.desktop-table {
  /* Atur lebar kolom sesuai ApplyBestFit / lebar kolom yang ditentukan di Delphi */
  min-width: 450px;
}
.desktop-table :deep(.v-data-table__td) {
  font-size: 0.85rem;
}
</style>
