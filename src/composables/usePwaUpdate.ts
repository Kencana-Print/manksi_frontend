import { useRegisterSW } from "virtual:pwa-register/vue";

export function usePwaUpdate() {
  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Cek update tiap kali tab / window kembali aktif (fokus)
      const checkUpdate = () => {
        if (document.visibilityState === "visible") {
          registration.update();
        }
      };
      document.addEventListener("visibilitychange", checkUpdate);
      window.addEventListener("focus", checkUpdate);

      // Interval berkala setiap 10 menit sebagai fallback
      setInterval(
        () => {
          registration.update();
        },
        10 * 60 * 1000,
      );
    },
  });

  // Halaman hasil Ctrl+Shift+R tidak dikontrol service worker, jadi event
  // "controlling" yang biasanya memicu reload tidak terpanggil. Reload dipaksa
  // setelah worker baru diaktifkan supaya tombol Update selalu berefek.
  const aktifkanUpdate = async (reloadPage = true) => {
    await updateServiceWorker(reloadPage);
    if (reloadPage) setTimeout(() => window.location.reload(), 1000);
  };

  return { needRefresh, offlineReady, updateServiceWorker: aktifkanUpdate };
}
