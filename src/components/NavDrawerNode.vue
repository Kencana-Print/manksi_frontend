<script setup lang="ts">
import { computed } from "vue";
import { IconChevronDown } from "@tabler/icons-vue";
import type { NavItem } from "@/config/menuItems";

const props = defineProps<{
  item: NavItem;
  path: string;
  level: number;
  badge: (item: NavItem) => number;
}>();

const emit = defineEmits<{ (e: "pilih", item: NavItem): void }>();

const kunci = computed(() => `${props.path}::${props.item.title ?? ""}`);
const kelas = computed(() =>
  props.level <= 1 ? "dn-1" : props.level === 2 ? "dn-2" : "dn-3",
);
const ukuranIkon = computed(() => (props.level <= 1 ? 15 : 13));
</script>

<template>
  <v-divider v-if="item.divider" class="mx-3 my-1" />

  <v-list-group v-else-if="item.subItems?.length" :value="kunci">
    <template #activator="{ props: pemicu, isOpen }">
      <v-list-item v-bind="pemicu" :class="kelas">
        <template #prepend>
          <component
            :is="item.icon"
            :size="ukuranIkon"
            :stroke-width="1.5"
            class="ic"
          />
        </template>
        <v-list-item-title>{{ item.title }}</v-list-item-title>
        <template #append>
          <IconChevronDown
            :size="12"
            :stroke-width="2"
            :style="{
              transform: isOpen ? 'rotate(180deg)' : '',
              transition: 'transform 0.2s',
            }"
          />
        </template>
      </v-list-item>
    </template>

    <NavDrawerNode
      v-for="(anak, i) in item.subItems"
      :key="i"
      :item="anak"
      :path="kunci"
      :level="level + 1"
      :badge="badge"
      @pilih="emit('pilih', $event)"
    />
  </v-list-group>

  <v-list-item v-else :to="item.to" :class="kelas" @click="emit('pilih', item)">
    <template #prepend>
      <component
        :is="item.icon"
        :size="ukuranIkon"
        :stroke-width="1.5"
        class="ic"
      />
    </template>
    <v-list-item-title>{{ item.title }}</v-list-item-title>
    <template #append>
      <span v-if="badge(item) > 0" class="approval-count-badge">
        {{ badge(item) > 99 ? "99+" : badge(item) }}
      </span>
    </template>
  </v-list-item>
</template>

<style scoped>
.dn-1 {
  min-height: 36px !important;
  border-radius: 6px;
  font-size: 0.85rem;
}
.dn-2 {
  min-height: 34px !important;
  border-radius: 6px;
  font-size: 0.84rem;
}
.dn-3 {
  min-height: 32px !important;
  border-radius: 6px;
  font-size: 0.82rem;
}
.ic {
  color: rgba(var(--v-theme-on-surface), 0.5);
  flex-shrink: 0;
  margin-right: 8px;
}
.approval-count-badge {
  font-size: 10px;
  font-weight: 700;
  background: #e53935;
  color: white;
  padding: 1px 6px;
  border-radius: 8px;
  min-width: 18px;
  text-align: center;
  line-height: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
}
</style>
