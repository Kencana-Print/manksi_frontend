<script setup lang="ts">
import { ref } from "vue";
import { formatTanggalSingkat } from "@/utils/dateFormat";

defineProps<{
  modelValue: string | null | undefined;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: string): void;
  (e: "focus"): void;
  (e: "blur"): void;
}>();

const inputEl = ref<HTMLInputElement | null>(null);

const bukaPicker = () => {
  try {
    inputEl.value?.showPicker();
  } catch {
    // browser lama: input native di atasnya tetap bisa dipakai
  }
};

const onInput = (e: Event) =>
  emit("update:modelValue", (e.target as HTMLInputElement).value);
</script>

<template>
  <div class="dsi" :class="{ 'dsi--disabled': disabled }">
    <span class="dsi-text">{{
      modelValue ? formatTanggalSingkat(modelValue) : ""
    }}</span>
    <input
      ref="inputEl"
      type="date"
      class="dsi-native"
      :value="modelValue ?? ''"
      :disabled="disabled"
      @input="onInput"
      @click="bukaPicker"
      @focus="emit('focus')"
      @blur="emit('blur')"
    />
  </div>
</template>

<style scoped>
.dsi {
  position: relative;
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  min-width: 84px;
  font-size: 11px;
}
.dsi-text {
  white-space: nowrap;
}
.dsi-native {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.dsi:focus-within {
  border-color: #1976d2 !important;
}
.dsi--disabled {
  background: #f5f5f5 !important;
}
.dsi--disabled .dsi-native {
  pointer-events: none;
  cursor: default;
}
</style>
