import { ref, onMounted, onUnmounted } from "vue";
import {
  versionService,
  type ChangelogEntry,
} from "@/services/system/versionService";
import { version as buildVersion } from "../../package.json";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 menit
const SEEN_KEY = "manksi-changelog-seen";
const DISMISSED_KEY = "manksi-update-dismissed";

export function useVersionCheck() {
  // Versi & changelog terbaru yang dikonfirmasi backend
  const latestVersion = ref<string>(buildVersion);
  const changelog = ref<ChangelogEntry[]>([]);
  const isLoaded = ref(false);

  // true kalau backend punya versi lebih baru dari bundle JS yang
  // sedang jalan di browser user saat ini (perlu reload)
  const updateAvailable = ref(false);

  // true kalau user belum pernah lihat changelog versi terbaru
  // (dipakai buat titik merah di tombol versi footer)
  const hasUnseenChangelog = ref(false);

  let timer: ReturnType<typeof setInterval> | null = null;

  const checkUnseen = () => {
    const lastSeen = localStorage.getItem(SEEN_KEY);
    hasUnseenChangelog.value = lastSeen !== latestVersion.value;
  };

  const check = async () => {
    try {
      const res = await versionService.getVersion();
      const data = res.data.data;
      latestVersion.value = data.version;
      changelog.value = data.changelog || [];
      isLoaded.value = true;

      // ⚠️ BARU: kalau user sudah pernah "Nanti Saja"-kan versi ini,
      // jangan nyalakan snackbar lagi sampai versi backend berubah lagi.
      const dismissedVersion = localStorage.getItem(DISMISSED_KEY);
      if (data.version && data.version !== buildVersion) {
        updateAvailable.value = dismissedVersion !== data.version;
      } else {
        updateAvailable.value = false;
      }
      checkUnseen();
    } catch {
      /* silent — jangan ganggu user kalau endpoint gagal */
    }
  };

  const markChangelogSeen = () => {
    localStorage.setItem(SEEN_KEY, latestVersion.value);
    hasUnseenChangelog.value = false;
  };

  const dismissUpdate = () => {
    localStorage.setItem(DISMISSED_KEY, latestVersion.value);
    updateAvailable.value = false;
  };

  const reloadApp = () => {
    window.location.reload();
  };

  onMounted(() => {
    check(); // cek langsung saat app dibuka
    timer = setInterval(check, POLL_INTERVAL_MS);

    // Cek ulang begitu tab kembali aktif (user pindah tab lalu balik)
    // — user sering biarkan tab terbuka lama, ini nangkep update lebih cepat
    document.addEventListener("visibilitychange", onVisibilityChange);
  });

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") check();
  };

  onUnmounted(() => {
    if (timer) clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  });

  return {
    buildVersion,
    latestVersion,
    changelog,
    isLoaded,
    updateAvailable,
    hasUnseenChangelog,
    markChangelogSeen,
    dismissUpdate,
    reloadApp,
    refetch: check,
  };
}
