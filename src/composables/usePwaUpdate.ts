import { ref } from "vue";
import { useRegisterSW } from "virtual:pwa-register/vue";

export function usePwaUpdate() {
  const isUpdating = ref(false);
  let lastCheck = 0;

  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Cek update tiap kali tab / window kembali aktif (fokus), dengan cooldown 60 detik
      const checkUpdate = () => {
        if (document.visibilityState !== "visible") return;
        const now = Date.now();
        if (now - lastCheck < 60000) return;
        lastCheck = now;
        registration.update();
      };
      document.addEventListener("visibilitychange", checkUpdate);
      window.addEventListener("focus", checkUpdate);

      // Interval berkala setiap 10 menit sebagai fallback
      setInterval(
        () => {
          lastCheck = Date.now();
          registration.update();
        },
        10 * 60 * 1000,
      );
    },
  });

  const aktifkanUpdate = async (reloadPage = true) => {
    if (isUpdating.value) return;
    isUpdating.value = true;
    needRefresh.value = false;

    // Jika tab sebelumnya tidak dikontrol service worker (contoh: Ctrl+Shift+R),
    // event "controlling" tidak terpicu oleh Workbox, jadi perlu fallback reload manual.
    const hadController = !!navigator.serviceWorker?.controller;

    try {
      await updateServiceWorker(reloadPage);
    } finally {
      if (reloadPage && !hadController) {
        setTimeout(() => window.location.reload(), 1000);
      }
    }
  };

  return {
    needRefresh,
    offlineReady,
    isUpdating,
    updateServiceWorker: aktifkanUpdate,
  };
}
