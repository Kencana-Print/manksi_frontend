import { ref, computed, onMounted, onActivated } from "vue";
import { useRoute } from "vue-router";
import { useTabsStore } from "@/stores/tabsStore";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

interface UseBrowseOptions<T> {
  menuId: string;
  fetchApi: () => Promise<T[]>;
  immediate?: boolean;
  deleteApi?: (id: string) => Promise<void>;
}

export function useBrowse<T = any>(options: UseBrowseOptions<T>) {
  const authStore = useAuthStore();
  const toast = useToast();
  const route = useRoute();
  const tabsStore = useTabsStore();

  const items = ref<T[]>([]) as ReturnType<typeof ref<T[]>>;
  const isLoading = ref(false);
  const selected = ref<T[]>([]);

  // Modul dengan menuId kosong sengaja berada DI LUAR sistem permission
  // thakuser/checkPermission (misal: Master User yang di-gate via
  // requireAdmin di backend). Untuk kasus ini, composable tidak boleh
  // menolak — biarkan backend yang jadi satu-satunya penjaga akses.
  const hasMenuId = computed(() => !!options.menuId);

  const canView = computed(() =>
    hasMenuId.value ? authStore.can(options.menuId, "view") : true,
  );
  const canInsert = computed(() =>
    hasMenuId.value ? authStore.can(options.menuId, "insert") : true,
  );
  const canEdit = computed(() =>
    hasMenuId.value ? authStore.can(options.menuId, "edit") : true,
  );
  const canDelete = computed(() =>
    hasMenuId.value ? authStore.can(options.menuId, "delete") : true,
  );
  const canExport = computed(() =>
    hasMenuId.value ? authStore.can(options.menuId, "view") : true,
  );

  const isSingleSelected = computed(() => selected.value.length === 1);
  const selectedItem = computed(() => selected.value[0] || null);

  const clearSelection = () => {
    selected.value = [];
  };

  const fetchData = async () => {
    if (!canView.value) {
      toast.error("Akses ditolak: Anda tidak memiliki izin untuk menu ini.");
      return;
    }

    isLoading.value = true;
    clearSelection();

    try {
      const data = await options.fetchApi();
      items.value = data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal memuat data.");
      console.error(error);
    } finally {
      isLoading.value = false;
    }
  };

  // --- FUNGSI EXPORT KE EXCEL ---
  // Backward-compatible: exportToExcel('nama') tetap jalan seperti
  // sebelumnya (kolom auto dari key object, data = items.value apa
  // adanya). Opsional: kasih `getData` (misal
  // baseBrowseRef.value?.getFilteredItems) supaya export ikut filter
  // grid yang sedang aktif, dan/atau `columns` untuk header rapi +
  // format angka, konsisten dengan exportExcelSingle di modul lain.
  const exportToExcel = async (
    fileName: string = "Export_Data",
    opts?: {
      columns?: ExcelColumn[];
      getData?: () => T[];
      sheetName?: string;
      title?: string;
    },
  ) => {
    if (!canExport.value) {
      toast.error("Akses ditolak: Anda tidak memiliki izin untuk export.");
      return;
    }

    const data = opts?.getData ? opts.getData() : items.value;

    if (!data || data.length === 0) {
      toast.warning("Tidak ada data untuk diexport");
      return;
    }

    try {
      const columns: ExcelColumn[] =
        opts?.columns ??
        Object.keys(data[0] as object).map((k) => ({ header: k, key: k }));

      await exportExcelSingle(
        `${fileName}.xlsx`,
        opts?.sheetName ?? "Data",
        columns,
        data,
        opts?.title,
      );

      toast.success(`Berhasil export ke ${fileName}.xlsx`);
    } catch (error) {
      toast.error("Gagal melakukan export Excel");
      console.error(error);
    }
  };
  onMounted(() => {
    if (options.immediate !== false) fetchData();
  });

  onActivated(() => {
    const currentTab = tabsStore.tabs.find((t) => t.id === route.path);
    if (currentTab?.needsReset) {
      currentTab.needsReset = false;
      fetchData();
    }
  });

  return {
    items,
    isLoading,
    selected,
    canView,
    canInsert,
    canEdit,
    canDelete,
    canExport,
    isSingleSelected,
    selectedItem,
    fetchData,
    clearSelection,
    exportToExcel,
  };
}
