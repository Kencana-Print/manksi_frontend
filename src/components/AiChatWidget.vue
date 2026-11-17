<script setup lang="ts">
import {
  ref,
  nextTick,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
} from "vue";
import {
  aiChatService,
  type ConversationSummary,
} from "@/services/aiChat/aiChatService";
import {
  IconMessageChatbot,
  IconMinus,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconLayoutSidebar,
  IconArrowUp,
  IconTrash,
  IconPlus,
  IconMessageCircle,
  IconTrendingUp,
  IconCash,
  IconPackage,
  IconTarget,
  IconSparkles,
  IconMicrophone,
  IconMicrophoneOff,
} from "@tabler/icons-vue";
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
// Nama dari HRD (authStore.userName = namaLengkap), dipakai kata pertamanya saja
// untuk sapaan, ditulis Title Case supaya tidak KAPITAL SEMUA.
const userName = computed(() => {
  const first = authStore.userName.trim().split(/\s+/)[0] ?? "";
  if (!first) return "Anda";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
});

// ── State tampilan ──
const isOpen = ref(false); // false = minimize (tinggal tombol bulat)
const isFullscreen = ref(false);
const sidebarOpen = ref(true);
const hasUnread = ref(false);

const isSending = ref(false);
const inputText = ref("");
const messagesEl = ref<HTMLElement | null>(null);
const textareaEl = ref<HTMLTextAreaElement | null>(null);

// ── Voice input (Web Speech API bawaan browser, gratis) ──
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const speechWindow = window as unknown as {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};
const SpeechCtor =
  speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
const isSpeechSupported = !!SpeechCtor;
const isListening = ref(false);
let recognition: SpeechRecognitionLike | null = null;

if (SpeechCtor) {
  recognition = new SpeechCtor();
  recognition.lang = "id-ID";
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    inputText.value = transcript;
  };
  recognition.onend = () => {
    isListening.value = false;
  };
  recognition.onerror = () => {
    isListening.value = false;
  };
}

const stopListening = () => {
  if (isListening.value && recognition) recognition.stop();
  isListening.value = false;
};

const toggleListening = () => {
  if (!recognition) return;
  if (isListening.value) {
    stopListening();
    return;
  }
  inputText.value = "";
  try {
    recognition.start();
    isListening.value = true;
  } catch {
    isListening.value = false;
  }
};

// ── Data percakapan ──
interface DisplayMsg {
  role: "user" | "assistant";
  text: string;
}
const displayMessages = ref<DisplayMsg[]>([]);
const activeConversationId = ref<number | null>(null);

const conversations = ref<ConversationSummary[]>([]);
const isLoadingConversations = ref(false);
const isLoadingConversation = ref(false);

const deleteTargetId = ref<number | null>(null);
const showDeleteConfirm = ref(false);

// Penanda "layar yang sedang dilihat". Naik setiap pindah percakapan / chat baru,
// supaya balasan yang telat datang tidak masuk ke percakapan yang salah.
const viewVersion = ref(0);
const sendingVersion = ref(-1);

const hasMessages = computed(() => displayMessages.value.length > 0);
const showTyping = computed(
  () => isSending.value && sendingVersion.value === viewVersion.value,
);
const activeTitle = computed(
  () =>
    conversations.value.find((c) => c.id === activeConversationId.value)
      ?.title || "Asisten AI",
);

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 10) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
});

const suggestedQuestions = [
  { text: "Ada SPK yang deadline-nya udah lewat nggak?", icon: IconTrendingUp },
  { text: "Berapa total piutang overdue sekarang?", icon: IconCash },
  { text: "Ringkasan SO aktif bulan ini gimana?", icon: IconMessageCircle },
  {
    text: "SPK mana aja yang kekurangan bahan buat produksi?",
    icon: IconPackage,
  },
  { text: "Berapa banyak SPK yang belum dibuatkan MKB?", icon: IconTarget },
];

// ── Render markdown ringan (HTML di-escape dulu, baru diformat) ──
const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const inlineMd = (s: string) =>
  escapeHtml(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

const renderMarkdown = (src: string): string => {
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };
  const openList = (type: "ul" | "ol") => {
    if (list !== type) {
      closeList();
      out.push(`<${type}>`);
      list = type;
    }
  };

  for (const raw of src.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;

    const ul = line.match(/^\s*[-*•]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const h = line.match(/^#{1,4}\s+(.*)$/);

    if (ul) {
      openList("ul");
      out.push(`<li>${inlineMd(ul[1])}</li>`);
    } else if (ol) {
      openList("ol");
      out.push(`<li>${inlineMd(ol[1])}</li>`);
    } else if (h) {
      closeList();
      out.push(`<p class="ai-md-h">${inlineMd(h[1])}</p>`);
    } else {
      closeList();
      out.push(`<p>${inlineMd(line)}</p>`);
    }
  }
  closeList();
  return out.join("");
};

// ── Helper UI ──
const scrollToBottom = async () => {
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
};

const autoResize = () => {
  const el = textareaEl.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 200) + "px";
};
watch(inputText, () => nextTick(autoResize));

const focusInput = () => nextTick(() => textareaEl.value?.focus());

const loadConversations = async () => {
  isLoadingConversations.value = true;
  try {
    const res = await aiChatService.listConversations();
    conversations.value = res.data.data || [];
  } catch {
    /* silent */
  } finally {
    isLoadingConversations.value = false;
  }
};

// ── Buka / minimize / fullscreen ──
const openPanel = () => {
  isOpen.value = true;
  hasUnread.value = false;
  loadConversations();
  scrollToBottom();
  focusInput();
};

const minimize = () => {
  stopListening();
  isOpen.value = false;
  isFullscreen.value = false;
};

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  scrollToBottom();
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && isFullscreen.value && !showDeleteConfirm.value) {
    isFullscreen.value = false;
  }
};
onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  stopListening();
});

// ── Aksi percakapan ──
const startNewChat = () => {
  viewVersion.value++;
  activeConversationId.value = null;
  displayMessages.value = [];
  focusInput();
};

const openConversation = async (id: number) => {
  if (id === activeConversationId.value) return;
  const v = ++viewVersion.value;
  isLoadingConversation.value = true;
  try {
    const res = await aiChatService.getConversation(id);
    if (v !== viewVersion.value) return;
    const conv = res.data.data;
    activeConversationId.value = conv.id;
    displayMessages.value = conv.displayMessages || [];
    scrollToBottom();
  } catch {
    /* silent */
  } finally {
    if (v === viewVersion.value) isLoadingConversation.value = false;
  }
};

const askDeleteConfirm = (id: number, e: Event) => {
  e.stopPropagation();
  deleteTargetId.value = id;
  showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
  if (!deleteTargetId.value) return;
  try {
    await aiChatService.deleteConversation(deleteTargetId.value);
    conversations.value = conversations.value.filter(
      (c) => c.id !== deleteTargetId.value,
    );
    if (activeConversationId.value === deleteTargetId.value) {
      startNewChat();
    }
  } catch {
    /* silent */
  } finally {
    showDeleteConfirm.value = false;
    deleteTargetId.value = null;
  }
};

const sendMessage = async (overrideText?: string) => {
  const text = (overrideText ?? inputText.value).trim();
  if (!text || isSending.value) return;

  stopListening();
  const v = viewVersion.value;
  sendingVersion.value = v;

  displayMessages.value.push({ role: "user", text });
  inputText.value = "";
  isSending.value = true;
  scrollToBottom();

  try {
    const res = await aiChatService.sendMessage(
      text,
      activeConversationId.value,
    );
    const { reply, conversationId, title } = res.data.data;
    const stillHere = v === viewVersion.value;

    if (stillHere && !activeConversationId.value) {
      activeConversationId.value = conversationId;
    }

    // Sinkronkan sidebar: percakapan baru ditaruh di atas, yang lama dipindah ke atas
    const idx = conversations.value.findIndex((c) => c.id === conversationId);
    if (idx === -1) {
      conversations.value.unshift({
        id: conversationId,
        title: title || "Percakapan Baru",
        updatedAt: new Date().toISOString(),
      });
    } else {
      const [item] = conversations.value.splice(idx, 1);
      item.updatedAt = new Date().toISOString();
      conversations.value.unshift(item);
    }

    if (stillHere) {
      displayMessages.value.push({
        role: "assistant",
        text: reply || "(Tidak ada jawaban)",
      });
    }
    if (!isOpen.value) hasUnread.value = true;
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    if (v === viewVersion.value) {
      displayMessages.value.push({
        role: "assistant",
        text:
          err.response?.data?.message ||
          "Maaf, terjadi kesalahan saat menghubungi asisten AI. Coba lagi.",
      });
    }
    if (!isOpen.value) hasUnread.value = true;
  } finally {
    isSending.value = false;
    scrollToBottom();
  }
};

const onEnter = (e: KeyboardEvent) => {
  if (e.shiftKey || e.isComposing) return;
  e.preventDefault();
  sendMessage();
};

const formatRelativeDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
};

const truncate = (s: string, n: number) =>
  s.length > n ? s.slice(0, n) + "..." : s;
</script>

<template>
  <!-- ── Minimize: tombol bulat ── -->
  <button
    v-if="!isOpen"
    class="ai-fab"
    title="Tanya Asisten AI"
    @click="openPanel"
  >
    <IconMessageChatbot :size="24" :stroke-width="1.7" />
    <span v-if="hasUnread" class="ai-fab-dot" />
  </button>

  <div v-else class="ai-panel" :class="{ 'ai-panel--full': isFullscreen }">
    <!-- ── Sidebar riwayat ── -->
    <aside v-show="sidebarOpen" class="ai-sidebar">
      <button class="ai-newchat-btn" @click="startNewChat">
        <IconPlus :size="15" class="mr-2" /> Percakapan baru
      </button>
      <div class="ai-sidebar-label">Riwayat</div>
      <div class="ai-sidebar-list">
        <div v-if="isLoadingConversations" class="ai-sidebar-empty">
          Memuat...
        </div>
        <div v-else-if="!conversations.length" class="ai-sidebar-empty">
          Belum ada riwayat.
        </div>
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="ai-conv-item"
          :class="{ 'ai-conv-item--active': conv.id === activeConversationId }"
          @click="openConversation(conv.id)"
        >
          <div class="ai-conv-item-text">
            <div class="ai-conv-title">{{ truncate(conv.title, 30) }}</div>
            <div class="ai-conv-date">
              {{ formatRelativeDate(conv.updatedAt) }}
            </div>
          </div>
          <button
            class="ai-conv-delete"
            title="Hapus"
            @click="askDeleteConfirm(conv.id, $event)"
          >
            <IconTrash :size="13" />
          </button>
        </div>
      </div>
    </aside>

    <!-- ── Area chat ── -->
    <section class="ai-main">
      <header class="ai-header">
        <button
          class="ai-icon-btn"
          :title="sidebarOpen ? 'Sembunyikan riwayat' : 'Tampilkan riwayat'"
          @click="sidebarOpen = !sidebarOpen"
        >
          <IconLayoutSidebar :size="17" />
        </button>
        <div class="ai-header-title">{{ activeTitle }}</div>
        <button
          v-if="!sidebarOpen"
          class="ai-icon-btn"
          title="Percakapan baru"
          @click="startNewChat"
        >
          <IconPlus :size="17" />
        </button>
        <button
          class="ai-icon-btn"
          :title="isFullscreen ? 'Keluar layar penuh (Esc)' : 'Layar penuh'"
          @click="toggleFullscreen"
        >
          <IconArrowsMinimize v-if="isFullscreen" :size="17" />
          <IconArrowsMaximize v-else :size="17" />
        </button>
        <button class="ai-icon-btn" title="Minimize" @click="minimize">
          <IconMinus :size="17" />
        </button>
      </header>

      <div ref="messagesEl" class="ai-scroll">
        <div class="ai-column">
          <div v-if="isLoadingConversation" class="ai-loading-center">
            Memuat percakapan...
          </div>

          <div v-else-if="!hasMessages" class="ai-greeting">
            <div class="ai-greeting-icon">
              <IconSparkles :size="30" :stroke-width="1.6" />
            </div>
            <div class="ai-greeting-title">{{ greeting }}, {{ userName }}</div>
            <div class="ai-greeting-sub">
              Ada yang bisa saya bantu hari ini?
            </div>

            <div class="ai-suggest-list">
              <button
                v-for="(q, i) in suggestedQuestions"
                :key="i"
                class="ai-suggest-item"
                @click="sendMessage(q.text)"
              >
                <component :is="q.icon" :size="16" :stroke-width="1.7" />
                <span>{{ q.text }}</span>
              </button>
            </div>
          </div>

          <template v-else>
            <div
              v-for="(msg, i) in displayMessages"
              :key="i"
              class="ai-msg"
              :class="msg.role === 'user' ? 'ai-msg--user' : 'ai-msg--bot'"
            >
              <div v-if="msg.role === 'user'" class="ai-user-bubble">
                {{ msg.text }}
              </div>
              <template v-else>
                <div class="ai-bot-avatar">
                  <IconSparkles :size="14" :stroke-width="1.8" />
                </div>
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div class="ai-md" v-html="renderMarkdown(msg.text)" />
              </template>
            </div>

            <div v-if="showTyping" class="ai-msg ai-msg--bot">
              <div class="ai-bot-avatar">
                <IconSparkles :size="14" :stroke-width="1.8" />
              </div>
              <div class="ai-typing">
                <span class="ai-dot" />
                <span class="ai-dot" />
                <span class="ai-dot" />
              </div>
            </div>
          </template>
        </div>
      </div>

      <div class="ai-input-wrap">
        <div class="ai-input-card">
          <textarea
            ref="textareaEl"
            v-model="inputText"
            rows="1"
            :placeholder="
              isListening
                ? 'Mendengarkan...'
                : 'Tanyakan SPK, piutang, produksi, dll...'
            "
            @keydown.enter="onEnter"
          />
          <div class="ai-input-actions">
            <button
              v-if="isSpeechSupported"
              class="ai-mic-btn"
              :class="{ 'ai-mic-btn--active': isListening }"
              :disabled="isSending"
              :title="isListening ? 'Berhenti merekam' : 'Bicara'"
              @click="toggleListening"
            >
              <IconMicrophoneOff v-if="isListening" :size="17" />
              <IconMicrophone v-else :size="17" />
            </button>
            <button
              class="ai-send-btn"
              :disabled="isSending || !inputText.trim()"
              title="Kirim"
              @click="sendMessage()"
            >
              <IconArrowUp :size="17" :stroke-width="2.2" />
            </button>
          </div>
        </div>
        <div class="ai-foot-note">
          Asisten AI bisa keliru. Cek kembali data yang penting.
        </div>
      </div>
    </section>

    <!-- ── Konfirmasi hapus ── -->
    <v-dialog v-model="showDeleteConfirm" max-width="360px">
      <v-card class="pa-4 rounded-lg">
        <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px">
          Hapus percakapan ini?
        </div>
        <div style="font-size: 12px; color: #616161; margin-bottom: 16px">
          Riwayat chat ini akan dihapus permanen dan tidak bisa dikembalikan.
        </div>
        <div class="d-flex justify-end" style="gap: 8px">
          <v-btn size="small" variant="text" @click="showDeleteConfirm = false">
            Batal
          </v-btn>
          <v-btn size="small" color="error" @click="confirmDelete">
            Hapus
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
/* ── Tombol bulat (minimize) ── */
.ai-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #1867c0;
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 999;
  transition: transform 0.15s;
}
.ai-fab:hover {
  transform: scale(1.06);
  background: #1565c0;
}
.ai-fab-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #e53935;
  border: 2px solid white;
}

/* ── Panel ── */
.ai-panel {
  /* Ganti --ai-accent kalau mau warna lain */
  --ai-accent: #1867c0;
  --ai-accent-soft: #e8f0fb;
  --ai-bg: #faf9f5;
  --ai-side: #f3f1ea;
  --ai-line: #e6e3d8;
  --ai-text: #1f1e1d;
  --ai-muted: #76746c;
  --ai-fs: 13px;

  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 760px;
  max-width: calc(100vw - 24px);
  height: 680px;
  max-height: 85vh;
  background: var(--ai-bg);
  color: var(--ai-text);
  border-radius: 14px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: row;
  overflow: hidden;
  z-index: 999;
  font-family: "Segoe UI", system-ui, sans-serif;
}
.ai-panel--full {
  --ai-fs: 14.5px;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: auto;
  height: auto;
  max-width: none;
  max-height: none;
  border-radius: 0;
  box-shadow: none;
  z-index: 1900;
}

/* ── Sidebar ── */
.ai-sidebar {
  width: 230px;
  flex-shrink: 0;
  background: var(--ai-side);
  border-right: 1px solid var(--ai-line);
  display: flex;
  flex-direction: column;
  padding: 12px 10px;
}
.ai-panel--full .ai-sidebar {
  width: 270px;
}
.ai-newchat-btn {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid var(--ai-line);
  color: var(--ai-text);
  font-size: 12.5px;
  font-weight: 600;
  padding: 9px 12px;
  border-radius: 10px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s;
}
.ai-newchat-btn:hover {
  background: var(--ai-accent-soft);
  border-color: var(--ai-accent);
  color: var(--ai-accent);
}
.ai-sidebar-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ai-muted);
  padding: 16px 6px 6px;
}
.ai-sidebar-list {
  flex: 1;
  overflow-y: auto;
}
.ai-sidebar-empty {
  text-align: center;
  font-size: 11.5px;
  color: var(--ai-muted);
  padding: 20px 0;
}
.ai-conv-item {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 1px;
  cursor: pointer;
  transition: background 0.12s;
}
.ai-conv-item:hover {
  background: rgba(0, 0, 0, 0.05);
}
.ai-conv-item--active {
  background: rgba(0, 0, 0, 0.08);
}
.ai-conv-item-text {
  min-width: 0;
  flex: 1;
}
.ai-conv-title {
  font-size: 12.5px;
  color: var(--ai-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ai-conv-date {
  font-size: 10.5px;
  color: var(--ai-muted);
  margin-top: 1px;
}
.ai-conv-delete {
  background: transparent;
  border: none;
  color: var(--ai-muted);
  cursor: pointer;
  padding: 4px;
  flex-shrink: 0;
  border-radius: 6px;
  opacity: 0;
  transition: opacity 0.12s;
}
.ai-conv-item:hover .ai-conv-delete {
  opacity: 1;
}
.ai-conv-delete:hover {
  background: #ffebee;
  color: #e53935;
}
@media (hover: none) {
  .ai-conv-delete {
    opacity: 1;
  }
}

/* ── Main ── */
.ai-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.ai-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--ai-line);
  flex-shrink: 0;
}
.ai-header-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  padding: 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ai-icon-btn {
  background: transparent;
  border: none;
  color: var(--ai-muted);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s;
}
.ai-icon-btn:hover {
  background: rgba(0, 0, 0, 0.07);
  color: var(--ai-text);
}

/* ── Area pesan ── */
.ai-scroll {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
}
.ai-column {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 22px 18px 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.ai-loading-center {
  margin: auto;
  font-size: 12px;
  color: var(--ai-muted);
}

/* ── Greeting ── */
.ai-greeting {
  margin: auto;
  width: 100%;
  max-width: 560px;
  text-align: center;
  padding: 16px 0;
}
.ai-greeting-icon {
  color: var(--ai-accent);
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}
.ai-greeting-title {
  font-size: 22px;
  font-weight: 600;
}
.ai-greeting-sub {
  font-size: 13.5px;
  color: var(--ai-muted);
  margin-top: 4px;
}
.ai-suggest-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 26px;
  text-align: left;
}
.ai-suggest-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  border: 1px solid var(--ai-line);
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 12.5px;
  color: var(--ai-text);
  cursor: pointer;
  transition: all 0.12s;
}
.ai-suggest-item svg {
  flex-shrink: 0;
  color: var(--ai-accent);
}
.ai-suggest-item:hover {
  border-color: var(--ai-accent);
  background: var(--ai-accent-soft);
}

/* ── Pesan ── */
.ai-msg {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.ai-msg--user {
  justify-content: flex-end;
}
.ai-user-bubble {
  max-width: 80%;
  background: #efece2;
  border-radius: 16px;
  padding: 9px 14px;
  font-size: var(--ai-fs);
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.ai-bot-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--ai-accent-soft);
  color: var(--ai-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.ai-md {
  flex: 1;
  min-width: 0;
  font-size: var(--ai-fs);
  line-height: 1.65;
  word-break: break-word;
}
.ai-md :deep(p) {
  margin: 0 0 8px;
}
.ai-md :deep(p:last-child) {
  margin-bottom: 0;
}
.ai-md :deep(.ai-md-h) {
  font-weight: 700;
  margin-top: 4px;
}
.ai-md :deep(ul),
.ai-md :deep(ol) {
  margin: 0 0 8px;
  padding-left: 22px;
}
.ai-md :deep(li) {
  margin-bottom: 3px;
}
.ai-md :deep(code) {
  background: #efece2;
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 0.9em;
  font-family: Consolas, "Courier New", monospace;
}

.ai-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 0;
}
.ai-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ai-muted);
  animation: ai-bounce 1.2s infinite ease-in-out;
}
.ai-dot:nth-child(2) {
  animation-delay: 0.15s;
}
.ai-dot:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes ai-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

/* ── Input ── */
.ai-input-wrap {
  flex-shrink: 0;
  padding: 6px 18px 10px;
}
.ai-input-card {
  max-width: 720px;
  margin: 0 auto;
  background: white;
  border: 1px solid var(--ai-line);
  border-radius: 18px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 10px 10px 8px 16px;
  transition: border-color 0.12s;
}
.ai-input-card:focus-within {
  border-color: var(--ai-accent);
}
.ai-input-card textarea {
  display: block;
  width: 100%;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: var(--ai-fs);
  line-height: 1.5;
  color: var(--ai-text);
  max-height: 200px;
  padding: 2px 0;
}
.ai-input-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.ai-send-btn,
.ai-mic-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}
.ai-send-btn {
  background: var(--ai-accent);
  color: white;
}
.ai-send-btn:disabled {
  background: #d6d3c8;
  cursor: not-allowed;
}
.ai-send-btn:not(:disabled):hover {
  filter: brightness(0.92);
}
.ai-mic-btn {
  background: transparent;
  color: var(--ai-muted);
}
.ai-mic-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ai-mic-btn:not(:disabled):hover {
  background: rgba(0, 0, 0, 0.07);
}
.ai-mic-btn--active {
  background: #e53935;
  color: white;
  animation: ai-mic-pulse 1.4s infinite;
}
@keyframes ai-mic-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(229, 57, 53, 0.5);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(229, 57, 53, 0);
  }
}
.ai-foot-note {
  max-width: 720px;
  margin: 6px auto 0;
  text-align: center;
  font-size: 10.5px;
  color: var(--ai-muted);
}
</style>
