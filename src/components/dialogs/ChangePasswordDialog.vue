<script setup lang="ts">
import { ref, watch } from "vue";
import { usePasswordDialog } from "@/composables/usePasswordDialog";
import { useToast } from "vue-toastification";
import {
  IconLock,
  IconEye,
  IconEyeOff,
  IconShieldCheck,
} from "@tabler/icons-vue";
import api from "@/services/api";

const toast = useToast();
const { isOpen, closePasswordDialog } = usePasswordDialog();

const oldPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const isSaving = ref(false);

const showOld = ref(false);
const showNew = ref(false);
const showConfirm = ref(false);

watch(isOpen, (val) => {
  if (val) {
    oldPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    showOld.value = false;
    showNew.value = false;
    showConfirm.value = false;
  }
});

// Strength meter
const strength = ref(0);
watch(newPassword, (val) => {
  let s = 0;
  if (val.length >= 6) s++;
  if (val.length >= 10) s++;
  if (/[A-Z]/.test(val)) s++;
  if (/[0-9]/.test(val)) s++;
  if (/[^A-Za-z0-9]/.test(val)) s++;
  strength.value = s;
});

const strengthLabel = () => {
  if (!newPassword.value) return "";
  if (strength.value <= 1) return "Lemah";
  if (strength.value <= 3) return "Sedang";
  return "Kuat";
};
const strengthColor = () => {
  if (strength.value <= 1) return "#e53935";
  if (strength.value <= 3) return "#fb8c00";
  return "#43a047";
};

const executeChangePassword = async () => {
  if (!oldPassword.value.trim())
    return toast.info("Silahkan isi Password Lama!");
  if (!newPassword.value.trim())
    return toast.info("Silahkan isi Password Baru!");
  if (confirmPassword.value !== newPassword.value)
    return toast.info("Ulangi password beda.");

  isSaving.value = true;
  try {
    await api.post("/auth/change-password", {
      oldPassword: oldPassword.value,
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value,
    });
    toast.success("Password berhasil diganti.");
    closePasswordDialog();
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal mengganti password.");
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="isOpen" max-width="380px" persistent>
    <div class="cpd-card">
      <!-- Header -->
      <div class="cpd-header">
        <div class="cpd-icon-wrap">
          <IconLock :size="18" :stroke-width="1.8" color="white" />
        </div>
        <div>
          <div class="cpd-title">Ganti Password</div>
          <div class="cpd-sub">Buat password baru yang kuat</div>
        </div>
        <button
          class="cpd-close"
          @click="closePasswordDialog"
          :disabled="isSaving"
        >
          ✕
        </button>
      </div>

      <!-- Body -->
      <div class="cpd-body">
        <!-- Password Lama -->
        <div class="cpd-field">
          <label class="cpd-label">Password Lama</label>
          <div class="cpd-inp-wrap">
            <input
              v-model="oldPassword"
              :type="showOld ? 'text' : 'password'"
              class="cpd-inp"
              placeholder="••••••••"
              @keyup.enter="executeChangePassword"
              autocomplete="current-password"
            />
            <button
              class="cpd-eye"
              @click="showOld = !showOld"
              type="button"
              tabindex="-1"
            >
              <IconEye v-if="!showOld" :size="15" :stroke-width="1.7" />
              <IconEyeOff v-else :size="15" :stroke-width="1.7" />
            </button>
          </div>
        </div>

        <div class="cpd-divider" />

        <!-- Password Baru -->
        <div class="cpd-field">
          <label class="cpd-label">Password Baru</label>
          <div class="cpd-inp-wrap">
            <input
              v-model="newPassword"
              :type="showNew ? 'text' : 'password'"
              class="cpd-inp"
              placeholder="••••••••"
              @keyup.enter="executeChangePassword"
              autocomplete="new-password"
            />
            <button
              class="cpd-eye"
              @click="showNew = !showNew"
              type="button"
              tabindex="-1"
            >
              <IconEye v-if="!showNew" :size="15" :stroke-width="1.7" />
              <IconEyeOff v-else :size="15" :stroke-width="1.7" />
            </button>
          </div>
          <!-- Strength bar -->
          <div v-if="newPassword" class="cpd-strength">
            <div class="cpd-strength-bar">
              <div
                class="cpd-strength-fill"
                :style="{
                  width: (strength / 5) * 100 + '%',
                  background: strengthColor(),
                }"
              />
            </div>
            <span class="cpd-strength-lbl" :style="{ color: strengthColor() }">
              {{ strengthLabel() }}
            </span>
          </div>
        </div>

        <!-- Konfirmasi -->
        <div class="cpd-field">
          <label class="cpd-label">Konfirmasi Password</label>
          <div class="cpd-inp-wrap">
            <input
              v-model="confirmPassword"
              :type="showConfirm ? 'text' : 'password'"
              class="cpd-inp"
              :class="{
                'inp-match': confirmPassword && confirmPassword === newPassword,
                'inp-mismatch':
                  confirmPassword && confirmPassword !== newPassword,
              }"
              placeholder="••••••••"
              @keyup.enter="executeChangePassword"
              autocomplete="new-password"
            />
            <button
              class="cpd-eye"
              @click="showConfirm = !showConfirm"
              type="button"
              tabindex="-1"
            >
              <IconShieldCheck
                v-if="confirmPassword && confirmPassword === newPassword"
                :size="15"
                :stroke-width="1.7"
                style="color: #43a047"
              />
              <template v-else>
                <IconEye v-if="!showConfirm" :size="15" :stroke-width="1.7" />
                <IconEyeOff v-else :size="15" :stroke-width="1.7" />
              </template>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="cpd-footer">
        <button
          class="cpd-btn-cancel"
          @click="closePasswordDialog"
          :disabled="isSaving"
        >
          Batal
        </button>
        <button
          class="cpd-btn-save"
          @click="executeChangePassword"
          :disabled="isSaving"
        >
          <span v-if="isSaving" class="cpd-spinner" />
          <IconLock
            v-else
            :size="13"
            :stroke-width="2"
            style="margin-right: 5px"
          />
          {{ isSaving ? "Menyimpan..." : "Simpan Password" }}
        </button>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
/* ── Card ── */
.cpd-card {
  background: #ffffff;
  border-radius: 14px;
  overflow: hidden;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 13px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

/* ── Header ── */
.cpd-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px 16px;
  border-bottom: 1px solid #f0f0f0;
}
.cpd-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #1565c0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cpd-title {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
}
.cpd-sub {
  font-size: 11px;
  color: #9e9e9e;
  margin-top: 2px;
}
.cpd-close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: #bdbdbd;
  font-size: 14px;
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.12s,
    color 0.12s;
}
.cpd-close:hover {
  background: #f5f5f5;
  color: #424242;
}
.cpd-close:disabled {
  opacity: 0.4;
  cursor: default;
}

/* ── Body ── */
.cpd-body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cpd-divider {
  height: 1px;
  background: #f5f5f5;
  margin: 2px 0;
}

.cpd-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.cpd-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  letter-spacing: 0.02em;
}

.cpd-inp-wrap {
  display: flex;
  align-items: center;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  overflow: hidden;
  transition: border-color 0.15s;
}
.cpd-inp-wrap:focus-within {
  border-color: #1565c0;
  background: #fff;
}
.cpd-inp {
  flex: 1;
  height: 36px;
  border: none;
  background: transparent;
  padding: 0 12px;
  font-size: 13px;
  color: #212121;
  outline: none;
  font-family: inherit;
}
.cpd-inp::placeholder {
  color: #c0c0c0;
  letter-spacing: 0.08em;
}
.inp-match {
  color: #2e7d32;
}
.inp-mismatch {
  color: #c62828;
}
.cpd-eye {
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  color: #9e9e9e;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 0 6px 6px 0;
  transition: color 0.12s;
}
.cpd-eye:hover {
  color: #424242;
}

/* ── Strength bar ── */
.cpd-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.cpd-strength-bar {
  flex: 1;
  height: 3px;
  background: #eeeeee;
  border-radius: 2px;
  overflow: hidden;
}
.cpd-strength-fill {
  height: 100%;
  border-radius: 2px;
  transition:
    width 0.3s,
    background 0.3s;
}
.cpd-strength-lbl {
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

/* ── Footer ── */
.cpd-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}
.cpd-btn-cancel {
  height: 34px;
  padding: 0 14px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  background: transparent;
  color: #757575;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition:
    background 0.12s,
    border-color 0.12s;
}
.cpd-btn-cancel:hover {
  background: #f5f5f5;
  border-color: #bdbdbd;
}
.cpd-btn-cancel:disabled {
  opacity: 0.4;
  cursor: default;
}

.cpd-btn-save {
  height: 34px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: #1565c0;
  color: white;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  transition:
    background 0.12s,
    transform 0.1s;
}
.cpd-btn-save:hover {
  background: #1251a3;
}
.cpd-btn-save:active {
  transform: scale(0.98);
}
.cpd-btn-save:disabled {
  background: #90a4ae;
  cursor: default;
}

.cpd-spinner {
  width: 13px;
  height: 13px;
  margin-right: 6px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
