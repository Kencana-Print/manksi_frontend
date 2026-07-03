<script setup lang="ts">
import { ref, computed, defineAsyncComponent, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRoute } from "vue-router";

const authStore = useAuthStore();
const route = useRoute();

// Daftar menu approval beserta MENU_ID aslinya
const allApprovals = [
  { id: "piutang_90", label: "Approve SPK Piutang > 90 hari", menuId: "256" },
  { id: "harga_nol", label: "Approve SPK Harga 0", menuId: "257" },
  { id: "prioritas", label: "Approve SPK Klien Prioritas", menuId: "258" },
  { id: "perubahan_data", label: "Approve Perubahan Data", menuId: "259" },
  {
    id: "invoice_blmsj",
    label: "Approve Invoice Belum Buat SJ",
    menuId: "260",
  },
  { id: "hapus_data", label: "Approve Hapus Data", menuId: "261" },
  {
    id: "plafon_manager",
    label: "Approve Plafon Customer (Manager)",
    menuId: "263",
  },
  {
    id: "plafon_direksi",
    label: "Approve Plafon Customer (Direksi)",
    menuId: "264",
  },
  {
    id: "mutasi_noplan",
    label: "Approve Mutasi Produksi Tanpa Planning",
    menuId: "266",
  },
];

// Tampilkan hanya yang memiliki akses 'view'
const availableApprovals = computed(() => {
  return allApprovals.filter((opt) => authStore.can(opt.menuId, "view"));
});

// Pilih otomatis opsi pertama yang tersedia
const selectedApproval = ref(
  availableApprovals.value.length > 0 ? availableApprovals.value[0].id : "",
);

watch(
  () => route.query.type,
  (typeParam) => {
    if (typeParam) {
      const found = availableApprovals.value.find((a) => a.id === typeParam);
      if (found) selectedApproval.value = found.id;
    }
  },
  { immediate: true }, // ← immediate supaya juga jalan saat pertama kali load
);

// Lazy Load Sub-Komponen
const ApprovalPiutangComponent = defineAsyncComponent(
  () => import("./components/ApprovalPiutang.vue"),
);
const ApprovalHargaNolComponent = defineAsyncComponent(
  () => import("./components/ApprovalHargaNol.vue"),
);
const ApprovalPrioritasComponent = defineAsyncComponent(
  () => import("./components/ApprovalPrioritas.vue"),
);
const ApprovalPerubahanDataComponent = defineAsyncComponent(
  () => import("./components/ApprovalPerubahanData.vue"),
); // <-- Impor komponen
const ApprovalInvoiceBlmSjComponent = defineAsyncComponent(
  () => import("./components/ApprovalInvoiceBlmSj.vue"),
);
const ApprovalHapusDataComponent = defineAsyncComponent(
  () => import("./components/ApprovalHapusData.vue"),
);
const ApprovalPlafonManagerComponent = defineAsyncComponent(
  () => import("./components/ApprovalPlafonManager.vue"),
);
const ApprovalPlafonDireksiComponent = defineAsyncComponent(
  () => import("./components/ApprovalPlafonDireksi.vue"),
);
const ApprovalMutasiNoPlanComponent = defineAsyncComponent(
  () => import("./components/ApprovalMutasiNoPlan.vue"),
);

// Logic Penentuan Komponen Dinamis
const currentComponent = computed(() => {
  if (selectedApproval.value === "piutang_90") return ApprovalPiutangComponent;
  if (selectedApproval.value === "harga_nol") return ApprovalHargaNolComponent;
  if (selectedApproval.value === "prioritas") return ApprovalPrioritasComponent;
  if (selectedApproval.value === "perubahan_data")
    return ApprovalPerubahanDataComponent;
  if (selectedApproval.value === "invoice_blmsj")
    return ApprovalInvoiceBlmSjComponent;
  if (selectedApproval.value === "hapus_data")
    return ApprovalHapusDataComponent;
  if (selectedApproval.value === "plafon_manager")
    return ApprovalPlafonManagerComponent;
  if (selectedApproval.value === "plafon_direksi")
    return ApprovalPlafonDireksiComponent;
  if (selectedApproval.value === "mutasi_noplan")
    return ApprovalMutasiNoPlanComponent;
  return null;
});
</script>

<template>
  <component :is="currentComponent" v-if="selectedApproval && currentComponent">
    <template #filter-dropdown>
      <div class="d-flex align-center mr-2">
        <label class="text-caption font-weight-bold mr-2 text-grey-darken-2"
          >Jenis Approval:</label
        >
        <v-select
          v-model="selectedApproval"
          :items="availableApprovals"
          item-title="label"
          item-value="id"
          variant="outlined"
          density="compact"
          hide-details
          bg-color="white"
          style="width: 280px"
          class="font-weight-bold text-primary"
        />
      </div>
      <v-divider vertical class="mx-2 my-1" />
    </template>
  </component>

  <div v-else class="h-100 d-flex align-center justify-center text-grey">
    <div class="text-center">
      <v-icon icon="mdi-lock-outline" size="48" class="mb-2" opacity="0.5" />
      <div>Anda tidak memiliki akses ke menu approval apapun.</div>
    </div>
  </div>
</template>
