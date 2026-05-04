<script setup lang="ts">
import { useRouter } from "vue-router";
const router = useRouter();
</script>

<template>
  <div class="error-page">
    <div class="error-card">
      <!-- Status code besar sebagai visual anchor -->
      <div class="error-code">404</div>

      <div class="divider" />

      <div class="error-content">
        <h1 class="error-title">Halaman Tidak Ditemukan</h1>
        <p class="error-desc">
          Halaman yang kamu cari tidak ada atau sudah dipindahkan.<br />
          Periksa kembali URL atau kembali ke halaman sebelumnya.
        </p>

        <div class="error-actions">
          <button class="btn-primary" @click="router.push('/')">
            <span class="btn-icon">⌂</span>
            Ke Dashboard
          </button>
          <button class="btn-secondary" @click="router.back()">
            ← Kembali
          </button>
        </div>
      </div>

      <!-- Info teknis minimal -->
      <div class="error-meta">
        <span class="meta-dot" />
        <span>Error 404 · Not Found</span>
        <span class="meta-sep">·</span>
        <span>{{ currentPath }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  computed: {
    currentPath() {
      return window.location.pathname;
    },
  },
};
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f5f7;
  padding: 24px;
  font-family: "Segoe UI", system-ui, sans-serif;
}

.error-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 48px 56px;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

/* Angka 404 — besar, tipis, subtle */
.error-code {
  font-size: 96px;
  font-weight: 100;
  line-height: 1;
  color: #c8d0db;
  letter-spacing: -4px;
  font-variant-numeric: tabular-nums;
}

.divider {
  width: 40px;
  height: 2px;
  background: #1867c0;
  border-radius: 2px;
}

.error-content {
  text-align: center;
}

.error-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 10px;
}

.error-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.7;
  margin: 0 0 24px;
}

.error-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #1867c0;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover {
  background: #1557a8;
}

.btn-icon {
  font-size: 14px;
}

.btn-secondary {
  background: transparent;
  color: #555;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-secondary:hover {
  background: #f5f5f5;
  border-color: #999;
  color: #333;
}

/* Meta info di bawah */
.error-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #aaa;
  font-family: monospace;
}
.meta-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e57373;
  display: inline-block;
}
.meta-sep {
  color: #ddd;
}
</style>
