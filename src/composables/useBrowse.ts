import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import * as XLSX from "xlsx"; // <-- Import library XLSX

interface UseBrowseOptions<T> {
  menuId: string;
  fetchApi: () => Promise<T[]>;
  immediate?: boolean;
  deleteApi?: (id: string) => Promise<void>;
}

export function useBrowse<T = any>(options: UseBrowseOptions<T>) {
  const authStore = useAuthStore();
  const toast = useToast();

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
  const exportToExcel = (fileName: string = "Export_Data") => {
    if (!canExport.value) {
      toast.error("Akses ditolak: Anda tidak memiliki izin untuk export.");
      return;
    }

    if (!items.value || items.value.length === 0) {
      toast.warning("Tidak ada data untuk diexport");
      return;
    }

    try {
      // Buat worksheet dari data JSON (items)
      const worksheet = XLSX.utils.json_to_sheet(items.value);
      // Buat workbook kosong
      const workbook = XLSX.utils.book_new();
      // Tambahkan worksheet ke dalam workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      // Download file Excel
      XLSX.writeFile(workbook, `${fileName}.xlsx`);

      toast.success(`Berhasil export ke ${fileName}.xlsx`);
    } catch (error) {
      toast.error("Gagal melakukan export Excel");
      console.error(error);
    }
  };

  onMounted(() => {
    if (options.immediate !== false) fetchData();
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
