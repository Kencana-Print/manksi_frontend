import { ref, computed, type Ref } from "vue";

export interface DetailHeader {
  key: string;
  title: string;
  width?: string;
  align?: "left" | "center" | "right";
}

export function useColumnFilter<T extends Record<string, any>>(
  items: Ref<T[]>,
  headers: DetailHeader[],
) {
  const columnFilters = ref<Record<string, Set<string>>>({});
  const activeFilterCol = ref<string | null>(null);
  const filterDropdownStyle = ref<Record<string, string>>({});
  const colFilterSearch = ref<Record<string, string>>({});

  const uniqueValuesPerCol = computed(() => {
    const result: Record<string, string[]> = {};
    for (const h of headers) {
      const vals = new Set<string>();
      for (const item of items.value) vals.add(String(item[h.key] ?? ""));
      result[h.key] = Array.from(vals).sort((a, b) =>
        a.localeCompare(b, "id", { numeric: true }),
      );
    }
    return result;
  });

  const filteredUniqueVals = (key: string) => {
    const s = (colFilterSearch.value[key] ?? "").toLowerCase();
    const all = uniqueValuesPerCol.value[key] ?? [];
    return s ? all.filter((v) => v.toLowerCase().includes(s)) : all;
  };

  const colHasFilter = (key: string) => {
    const s = columnFilters.value[key];
    if (!s) return false;
    return s.size < (uniqueValuesPerCol.value[key]?.length ?? 0);
  };

  const activeFilterCount = computed(
    () => Object.keys(columnFilters.value).filter(colHasFilter).length,
  );

  const toggleColFilter = (key: string, val: string) => {
    if (!columnFilters.value[key]) {
      columnFilters.value[key] = new Set(uniqueValuesPerCol.value[key] ?? []);
    }
    const s = columnFilters.value[key];
    s.has(val) ? s.delete(val) : s.add(val);
    columnFilters.value = { ...columnFilters.value };
  };

  const onColSearchInput = (key: string, val: string) => {
    colFilterSearch.value[key] = val;
    columnFilters.value[key] = new Set(
      val ? filteredUniqueVals(key) : (uniqueValuesPerCol.value[key] ?? []),
    );
    columnFilters.value = { ...columnFilters.value };
  };

  const selectAllCol = (key: string) => {
    colFilterSearch.value[key] = "";
    columnFilters.value[key] = new Set(uniqueValuesPerCol.value[key] ?? []);
    columnFilters.value = { ...columnFilters.value };
  };

  const hideAllCol = (key: string) => {
    columnFilters.value[key] = new Set();
    columnFilters.value = { ...columnFilters.value };
  };

  const openColFilter = (key: string, event: MouseEvent) => {
    if (activeFilterCol.value === key) {
      activeFilterCol.value = null;
      return;
    }
    if (!columnFilters.value[key]) {
      columnFilters.value[key] = new Set(uniqueValuesPerCol.value[key] ?? []);
      columnFilters.value = { ...columnFilters.value };
    }
    const th = (event.currentTarget as HTMLElement).closest("th");
    if (th) {
      const rect = th.getBoundingClientRect();
      filterDropdownStyle.value = {
        position: "fixed",
        top: `${rect.bottom + 2}px`,
        left: `${rect.left}px`,
        zIndex: "9999",
      };
    }
    activeFilterCol.value = key;
    if (!colFilterSearch.value[key]) colFilterSearch.value[key] = "";
  };

  const closeColFilter = () => {
    activeFilterCol.value = null;
  };

  const resetAllFilters = () => {
    columnFilters.value = {};
  };

  const filteredItems = computed(() => {
    let result = items.value;
    for (const [key, allowed] of Object.entries(columnFilters.value)) {
      const total = uniqueValuesPerCol.value[key]?.length ?? 0;
      if (!allowed || allowed.size >= total) continue;
      result = result.filter((item) => allowed.has(String(item[key] ?? "")));
    }
    return result;
  });

  return {
    columnFilters,
    activeFilterCol,
    filterDropdownStyle,
    colFilterSearch,
    uniqueValuesPerCol,
    filteredUniqueVals,
    colHasFilter,
    activeFilterCount,
    toggleColFilter,
    onColSearchInput,
    selectAllCol,
    hideAllCol,
    openColFilter,
    closeColFilter,
    resetAllFilters,
    filteredItems,
  };
}
