<script setup lang="ts">
import { ref } from "vue";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-vue";

withDefaults(defineProps<{ width?: string }>(), { width: "300px" });

const isCollapsed = ref(false);
</script>

<template>
  <div
    class="collapsible-panel"
    :class="{ collapsed: isCollapsed }"
    :style="{ '--panel-width': isCollapsed ? '32px' : width }"
  >
    <button
      type="button"
      class="collapsible-panel-btn"
      :title="
        isCollapsed ? 'Tampilkan panel' : 'Sembunyikan panel (fokus ke tabel)'
      "
      @click="isCollapsed = !isCollapsed"
    >
      <IconChevronLeft v-if="!isCollapsed" :size="14" :stroke-width="2" />
      <IconChevronRight v-else :size="14" :stroke-width="2" />
    </button>
    <div class="collapsible-panel-content" v-show="!isCollapsed">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.collapsible-panel {
  position: relative;
  width: var(--panel-width, 300px);
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.15s ease;
}
.collapsible-panel.collapsed {
  overflow: visible;
}
.collapsible-panel-content {
  height: 100%;
  width: 100%;
}
.collapsible-panel-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 5;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  background: white;
  color: rgba(0, 0, 0, 0.55);
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
.collapsible-panel-btn:hover {
  background: #f5f5f5;
  color: rgba(0, 0, 0, 0.87);
}
</style>
