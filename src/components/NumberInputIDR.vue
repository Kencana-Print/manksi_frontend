<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  modelValue: number;
  placeholder?: string;
  disabled?: boolean;
  cursorToEnd?: boolean;
}>();
const emit = defineEmits<{
  (e: "update:modelValue", value: number): void;
}>();

const formatIDR = (val: number) => {
  if (val === null || val === undefined || val === 0) return "";
  return Number(val).toLocaleString("id-ID");
};

const displayValue = computed({
  get() {
    return formatIDR(props.modelValue);
  },
  set(val: string) {
    const digitsOnly = val.replace(/\D/g, "");
    emit("update:modelValue", digitsOnly ? Number(digitsOnly) : 0);
  },
});

const onFocus = (e: FocusEvent) => {
  const el = e.target as HTMLInputElement;
  if (props.cursorToEnd) {
    const len = el.value.length;
    el.setSelectionRange(len, len);
  } else {
    el.select();
  }
};

const onInput = (e: Event) => {
  if (!props.cursorToEnd) return;
  const el = e.target as HTMLInputElement;
  const len = el.value.length;
  requestAnimationFrame(() => el.setSelectionRange(len, len));
};
</script>

<template>
  <input
    type="text"
    inputmode="numeric"
    class="idr-inp"
    v-model="displayValue"
    :placeholder="placeholder"
    :disabled="disabled"
    @focus="onFocus"
    @input="onInput"
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
.idr-inp:disabled {
  color: #999;
}
</style>
