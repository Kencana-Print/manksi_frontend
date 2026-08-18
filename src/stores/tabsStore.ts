// src/stores/tabsStore.ts
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useToast } from "vue-toastification";
import { getMenuIcon } from "@/utils/menuIconMap";

export interface TabItem {
  id: string;
  title: string;
  path: string;
  query?: Record<string, any>;
  icon?: any;
  closable: boolean;
  timestamp: number;
  onClose?: () => void;
}

const MAX_TABS = 10;

export const useTabsStore = defineStore(
  "tabs",
  () => {
    const tabs = ref<TabItem[]>([]);
    const activeTabId = ref("");
    const isReady = ref(false);

    const activeTab = computed(() =>
      tabs.value.find((t) => t.id === activeTabId.value),
    );

    const generateTabId = (path: string): string => path;

    const openTab = (tab: Omit<TabItem, "id" | "timestamp">) => {
      const id = generateTabId(tab.path);
      const existing = tabs.value.find((t) => t.id === id);

      if (existing) {
        activeTabId.value = existing.id;
        return;
      }

      tabs.value.push({
        ...tab,
        id,
        timestamp: Date.now(),
        closable: tab.closable ?? true,
      });
      activeTabId.value = id;

      if (tabs.value.length > MAX_TABS) {
        const closableTabs = [...tabs.value]
          .filter((t) => t.closable)
          .sort((a, b) => a.timestamp - b.timestamp);
        if (closableTabs.length > 0) {
          const oldest = closableTabs[0];
          // Jangan toast kalau yang otomatis ketutup justru tab yang
          // baru saja dibuka user sendiri (skenario langka: user buka
          // banyak tab sekaligus dalam satu tick sebelum timestamp
          // sempat beda) — cuma beri tahu kalau memang tab LAIN yang
          // hilang, bukan tab yang baru saja diklik user.
          if (oldest.id !== id) {
            useToast().info(
              `Tab "${oldest.title}" otomatis ditutup karena sudah mencapai limit ${MAX_TABS} tab.`,
              { timeout: 4000 },
            );
          }
          closeTab(oldest.id);
        }
      }
    };

    const closeTab = (tabId: string) => {
      const index = tabs.value.findIndex((t) => t.id === tabId);
      if (index === -1) return;
      const tab = tabs.value[index];
      if (!tab.closable) return;

      tabs.value.splice(index, 1);

      if (activeTabId.value === tabId) {
        if (tabs.value.length > 0) {
          const newActiveIndex = Math.min(index, tabs.value.length - 1);
          activeTabId.value = tabs.value[newActiveIndex].id;
        } else {
          activeTabId.value = "";
        }
      }
    };

    const closeAllTabs = () => {
      tabs.value = tabs.value.filter((t) => !t.closable);
      activeTabId.value = tabs.value.length > 0 ? tabs.value[0].id : "";
    };

    const closeOtherTabs = (tabId: string) => {
      const target = tabs.value.find((t) => t.id === tabId);
      if (!target) return;
      tabs.value = tabs.value.filter((t) => !t.closable || t.id === tabId);
      activeTabId.value = tabId;
    };

    const closeTabsToRight = (tabId: string) => {
      const index = tabs.value.findIndex((t) => t.id === tabId);
      if (index === -1) return;
      tabs.value
        .slice(index + 1)
        .filter((t) => t.closable)
        .forEach((t) => closeTab(t.id));
    };

    const setActiveTab = (tabId: string) => {
      const tab = tabs.value.find((t) => t.id === tabId);
      if (tab) activeTabId.value = tabId;
    };

    const initDefaultTabs = () => {
      if (isReady.value) return;
      tabs.value = [];
      activeTabId.value = "";
      openTab({ title: "Dashboard", path: "/", closable: false });
      isReady.value = true;
    };

    const resetTabs = () => {
      tabs.value = [];
      activeTabId.value = "";
      isReady.value = false;
    };

    return {
      tabs,
      activeTabId,
      isReady,
      activeTab,
      openTab,
      closeTab,
      closeAllTabs,
      closeOtherTabs,
      closeTabsToRight,
      setActiveTab,
      initDefaultTabs,
      resetTabs,
    };
  },
  {
    persist: {
      storage: sessionStorage,
      pick: ["tabs", "activeTabId", "isReady"],
      afterHydrate: (ctx) => {
        const store = ctx.store as any;
        store.tabs = store.tabs.map((t: TabItem) => ({
          ...t,
          icon: getMenuIcon(t.path),
        }));
      },
    },
  },
);
