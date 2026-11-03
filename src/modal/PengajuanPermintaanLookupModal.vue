<!-- frontend/src/modal/PengajuanPermintaanLookupModal.vue -->
<script setup lang="ts">
import PermintaanPembelianSearchModal from "@/components/lookups/PermintaanPembelianSearchModal.vue";

const props = defineProps<{
  modelValue?: boolean;
  isVisible?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
  (e: "update:isVisible", val: boolean): void;
  (e: "selected", item: any): void;
  (e: "select", item: any): void;
  (e: "close"): void;
}>();
</script>

<template>
  <PermintaanPembelianSearchModal
    :model-value="props.modelValue !== undefined ? props.modelValue : props.isVisible"
    @update:model-value="emit('update:modelValue', $event); emit('update:isVisible', $event)"
    @selected="emit('selected', $event); emit('select', $event)"
    @select="emit('selected', $event); emit('select', $event)"
    @close="emit('close')"
  />
</template>

