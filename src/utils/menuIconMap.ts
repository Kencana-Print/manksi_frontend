// utils/menuIconMap.ts
import type { Component } from "vue";
import { createMenuItems, type NavItem } from "@/config/menuItems";

function flatten(items: NavItem[], map: Map<string, Component>) {
  for (const item of items) {
    if (item.to && item.icon) map.set(item.to, item.icon);
    if (item.items?.length) flatten(item.items, map);
    if (item.subItems?.length) flatten(item.subItems, map);
  }
}

// Dibangun sekali saat module di-load (bukan tiap navigasi) —
// createMenuItems() di sini hanya dipakai buat baca struktur+icon,
// ref dropdown-nya gak relevan buat keperluan flatten ini.
const iconMap = new Map<string, Component>();
flatten(createMenuItems(), iconMap);

export function getMenuIcon(path: string): Component | undefined {
  return iconMap.get(path);
}
