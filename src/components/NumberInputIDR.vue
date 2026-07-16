<script setup lang="ts">
import { ref, watch, nextTick } from "vue";

const props = defineProps<{
  modelValue: number;
  placeholder?: string;
}>();
const emit = defineEmits(["update:modelValue"]);

const inputRef = ref<HTMLInputElement | null>(null);

const formatIDR = (val: number) => {
  if (val === null || val === undefined || isNaN(val)) return "";
  return Number(val).toLocaleString("id-ID");
};

const displayValue = ref(formatIDR(props.modelValue));

// Sinkron dari luar (misal saat fetchApi ngisi formData)
watch(
  () => props.modelValue,
  (newVal) => {
    const parsedDisplay = Number(displayValue.value.replace(/\D/g, "")) || 0;
    if (newVal !== parsedDisplay) {
      displayValue.value = formatIDR(newVal);
    }
  },
);

const onInput = (e: Event) => {
  const raw = (e.target as HTMLInputElement).value;
  // Cuma ambil digit, buang semua titik/koma/huruf
  const digitsOnly = raw.replace(/\D/g, "");
  const numVal = digitsOnly ? Number(digitsOnly) : 0;

  displayValue.value = digitsOnly ? formatIDR(numVal) : "";
  emit("update:modelValue", numVal);
};

const onFocus = async (e: FocusEvent) => {
  await nextTick();
  (e.target as HTMLInputElement).select();
};
</script>

<template>
  <input
    ref="inputRef"
    type="text"
    inputmode="numeric"
    class="idr-inp"
    :value="displayValue"
    :placeholder="placeholder"
    @input="onInput"
    @focus="onFocus"
  />
</template>

<style scoped>
.idr-inp {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: inherit;
  font-family: inherit;
  text-align: right;
  padding: 0 6px;
  box-sizing: border-box;
}
</style>
