<script setup lang="ts">
import { ref, computed } from "vue";
import { IconEye, IconX } from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  noSpk: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [val: boolean];
}>();

const isIframeLoading = ref(true);

const previewUrl = computed(() => {
  if (!props.noSpk) return "";
  return `/mmt/so-spk/print/${encodeURIComponent(props.noSpk)}?preview=1`;
});

const handleIframeLoaded = () => {
  isIframeLoading.value = false;
};

const close = () => {
  emit("update:modelValue", false);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1200px"
    width="95vw"
    height="92vh"
    scrollable
    transition="dialog-bottom-transition"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="d-flex flex-column" style="height: 92vh; max-height: 92vh">
      <div
        class="d-flex align-center justify-space-between px-3 py-2 bg-grey-darken-4 text-white"
        style="height: 44px"
      >
        <div class="d-flex align-center ga-2">
          <IconEye :size="18" class="text-teal-accent-2" />
          <span style="font-size: 13px; font-weight: 700">
            Preview SPK — {{ noSpk }}
          </span>
          <v-chip color="error" size="x-small" label class="font-weight-bold ml-2">
            PREVIEW MODE (DILARANG DICETAK)
          </v-chip>
        </div>
        <button
          type="button"
          class="btn-close-preview"
          title="Tutup"
          @click="close"
        >
          <IconX :size="18" />
        </button>
      </div>

      <div class="flex-grow-1 position-relative bg-grey-lighten-3 iframe-container">
        <div
          v-if="isIframeLoading"
          class="preview-loading-overlay d-flex flex-column align-center justify-center"
        >
          <v-progress-circular indeterminate color="primary" size="42" />
          <span class="text-caption text-grey-darken-2 mt-2 font-weight-medium">
            Memuat dokumen preview SPK...
          </span>
        </div>
        <iframe
          v-if="previewUrl"
          :src="previewUrl"
          class="preview-iframe"
          @load="handleIframeLoaded"
        />
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.btn-close-preview {
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
}
.btn-close-preview:hover {
  background: rgba(255, 255, 255, 0.15);
}
.iframe-container {
  overflow: hidden;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
.preview-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(245, 245, 245, 0.9);
  z-index: 10;
}
</style>
