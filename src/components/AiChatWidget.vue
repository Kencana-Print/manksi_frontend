<script setup lang="ts">
import { ref, nextTick, computed } from "vue";
import {
  aiChatService,
  type ConversationSummary,
} from "@/services/aiChat/aiChatService";
import {
  IconMessageChatbot,
  IconX,
  IconSend,
  IconRobot,
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
const userName = computed(
  () => authStore.user?.nama || authStore.user?.kode || "Anda",
);

const isOpen = ref(false);
const isSending = ref(false);
const inputText = ref("");
const messagesEl = ref<HTMLElement | null>(null);

// ── Voice input (Web Speech API bawaan browser, gratis) ──
const isListening = ref(false);
const isSpeechSupported =
  typeof window !== "undefined" &&
  ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
let recognition: any = null;

if (isSpeechSupported) {
  const SpeechRecognitionCtor =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  recognition = new SpeechRecognitionCtor();
  recognition.lang = "id-ID";
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onresult = (event: any) => {
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

const toggleListening = () => {
  if (!isSpeechSupported || !recognition) return;
  if (isListening.value) {
    recognition.stop();
    isListening.value = false;
  } else {
    inputText.value = "";
    recognition.start();
    isListening.value = true;
  }
};

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

const hasMessages = computed(() => displayMessages.value.length > 0);

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

const scrollToBottom = async () => {
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
};

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

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    loadConversations();
    scrollToBottom();
  }
};

const startNewChat = () => {
  activeConversationId.value = null;
  displayMessages.value = [];
};

const openConversation = async (id: number) => {
  if (id === activeConversationId.value) return;
  isLoadingConversation.value = true;
  try {
    const res = await aiChatService.getConversation(id);
    const conv = res.data.data;
    activeConversationId.value = conv.id;
    displayMessages.value = conv.displayMessages || [];
    scrollToBottom();
  } catch {
    /* silent */
  } finally {
    isLoadingConversation.value = false;
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

    if (!activeConversationId.value) {
      activeConversationId.value = conversationId;
      conversations.value.unshift({
        id: conversationId,
        title: title || "Percakapan Baru",
        updatedAt: new Date().toISOString(),
      });
    } else {
      const idx = conversations.value.findIndex((c) => c.id === conversationId);
      if (idx > 0) {
        const [item] = conversations.value.splice(idx, 1);
        item.updatedAt = new Date().toISOString();
        conversations.value.unshift(item);
      }
    }

    displayMessages.value.push({
      role: "assistant",
      text: reply || "(Tidak ada jawaban)",
    });
  } catch (e: any) {
    displayMessages.value.push({
      role: "assistant",
      text:
        e.response?.data?.message ||
        "Maaf, terjadi kesalahan saat menghubungi asisten AI. Coba lagi.",
    });
  } finally {
    isSending.value = false;
    scrollToBottom();
  }
};

const onEnter = (e: KeyboardEvent) => {
  if (e.shiftKey) return;
  e.preventDefault();
  sendMessage();
};

const formatRelativeDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) {
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
  <button
    v-if="!isOpen"
    class="ai-fab"
    title="Tanya Asisten AI"
    @click="toggleOpen"
  >
    <IconMessageChatbot :size="24" :stroke-width="1.7" />
  </button>

  <div v-else class="ai-panel">
    <!-- ── Sidebar permanen ── -->
    <div class="ai-sidebar">
      <button class="ai-newchat-btn" @click="startNewChat">
        <IconPlus :size="14" class="mr-1" /> Percakapan Baru
      </button>
      <div class="ai-sidebar-list">
        <div v-if="isLoadingConversations" class="ai-sidebar-loading">
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
          <IconMessageCircle :size="13" class="ai-conv-icon" />
          <div class="ai-conv-item-text">
            <div class="ai-conv-title">{{ truncate(conv.title, 26) }}</div>
            <div class="ai-conv-date">
              {{ formatRelativeDate(conv.updatedAt) }}
            </div>
          </div>
          <button
            class="ai-conv-delete"
            title="Hapus"
            @click="askDeleteConfirm(conv.id, $event)"
          >
            <IconTrash :size="12" />
          </button>
        </div>
      </div>
    </div>

    <!-- ── Chat area ── -->
    <div class="ai-main">
      <div class="ai-panel-header">
        <div class="ai-panel-header-avatar">
          <IconRobot :size="18" :stroke-width="1.8" />
        </div>
        <div class="ai-panel-header-text">
          <div class="ai-panel-title">Asisten AI</div>
          <div class="ai-panel-subtitle">
            Siap bantu jawab pertanyaan seputar Penjualan, Piutang, Produksi
          </div>
        </div>
        <button class="ai-icon-btn" title="Tutup" @click="toggleOpen">
          <IconX :size="16" />
        </button>
      </div>

      <div ref="messagesEl" class="ai-panel-body">
        <div v-if="isLoadingConversation" class="ai-loading-center">
          Memuat percakapan...
        </div>

        <div v-else-if="!hasMessages" class="ai-greeting">
          <div class="ai-greeting-avatar">
            <IconSparkles :size="30" :stroke-width="1.6" />
          </div>
          <div class="ai-greeting-title">{{ greeting }}, {{ userName }}!</div>
          <div class="ai-greeting-sub">Ada yang bisa saya bantu?</div>

          <div class="ai-suggest-grid">
            <button
              v-for="(q, i) in suggestedQuestions"
              :key="i"
              class="ai-suggest-card"
              @click="sendMessage(q.text)"
            >
              <component
                :is="q.icon"
                :size="15"
                :stroke-width="1.7"
                class="mr-1"
              />
              <span>{{ q.text }}</span>
            </button>
          </div>
        </div>

        <template v-else>
          <div
            v-for="(msg, i) in displayMessages"
            :key="i"
            class="ai-msg-row"
            :class="msg.role === 'user' ? 'ai-msg-row--user' : ''"
          >
            <div
              class="ai-msg-bubble"
              :class="
                msg.role === 'user'
                  ? 'ai-msg-bubble--user'
                  : 'ai-msg-bubble--bot'
              "
            >
              {{ msg.text }}
            </div>
          </div>

          <div v-if="isSending" class="ai-msg-row">
            <div class="ai-msg-bubble ai-msg-bubble--bot ai-typing">
              <span class="ai-dot" />
              <span class="ai-dot" />
              <span class="ai-dot" />
            </div>
          </div>
        </template>
      </div>

      <div class="ai-panel-input">
        <textarea
          v-model="inputText"
          rows="1"
          :placeholder="
            isListening
              ? 'Mendengarkan...'
              : 'Tanyakan SPK, piutang, produksi, dll...'
          "
          :disabled="isSending"
          @keydown.enter="onEnter"
        />
        <button
          v-if="isSpeechSupported"
          class="ai-mic-btn"
          :class="{ 'ai-mic-btn--active': isListening }"
          :disabled="isSending"
          :title="isListening ? 'Berhenti merekam' : 'Bicara'"
          @click="toggleListening"
        >
          <IconMicrophoneOff v-if="isListening" :size="16" />
          <IconMicrophone v-else :size="16" />
        </button>
        <button
          class="ai-send-btn"
          :disabled="isSending || !inputText.trim()"
          @click="sendMessage()"
        >
          <IconSend :size="16" />
        </button>
      </div>
    </div>

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

.ai-panel {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 760px;
  height: 680px;
  max-height: 85vh;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: row;
  overflow: hidden;
  z-index: 999;
  font-family: "Segoe UI", system-ui, sans-serif;
}

/* ── Sidebar ── */
.ai-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #f7f2f2;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  padding: 10px;
}
.ai-newchat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px dashed #1867c0;
  color: #1867c0;
  font-size: 12px;
  font-weight: 700;
  padding: 9px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 10px;
  flex-shrink: 0;
}
.ai-newchat-btn:hover {
  background: #e3f2fd;
}
.ai-sidebar-list {
  flex: 1;
  overflow-y: auto;
}
.ai-sidebar-loading,
.ai-sidebar-empty {
  text-align: center;
  font-size: 11px;
  color: #9e9e9e;
  padding: 20px 0;
}
.ai-conv-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  background: transparent;
  border-radius: 8px;
  padding: 8px 8px;
  margin-bottom: 2px;
  cursor: pointer;
  transition: background 0.12s;
}
.ai-conv-item:hover {
  background: rgba(0, 0, 0, 0.04);
}
.ai-conv-item--active {
  background: rgba(24, 103, 192, 0.1);
}
.ai-conv-icon {
  color: #9e9e9e;
  margin-top: 2px;
  flex-shrink: 0;
}
.ai-conv-item-text {
  min-width: 0;
  flex: 1;
}
.ai-conv-title {
  font-size: 11.5px;
  color: #424242;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ai-conv-date {
  font-size: 9.5px;
  color: #bdbdbd;
  margin-top: 1px;
}
.ai-conv-delete {
  background: transparent;
  border: none;
  color: #cccccc;
  cursor: pointer;
  padding: 3px;
  flex-shrink: 0;
  border-radius: 4px;
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

/* ── Main chat area ── */
.ai-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.ai-panel-header {
  background: #1867c0;
  color: white;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.ai-panel-header-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-panel-header-text {
  flex: 1;
  min-width: 0;
}
.ai-panel-title {
  font-size: 13px;
  font-weight: 700;
}
.ai-panel-subtitle {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ai-icon-btn {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
.ai-icon-btn:hover {
  background: rgba(255, 255, 255, 0.28);
}

.ai-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fafbfc;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-loading-center {
  text-align: center;
  font-size: 12px;
  color: #9e9e9e;
  margin: auto;
}

/* ── Greeting screen ── */
.ai-greeting {
  margin: auto;
  text-align: center;
  padding: 20px 10px;
  max-width: 480px;
}
.ai-greeting-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #e3f2fd;
  color: #1867c0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
}
.ai-greeting-title {
  font-size: 17px;
  font-weight: 700;
  color: #1867c0;
}
.ai-greeting-sub {
  font-size: 12px;
  color: #757575;
  margin-top: 4px;
  margin-bottom: 20px;
}
.ai-suggest-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  text-align: left;
}
.ai-suggest-card {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 10px 11px;
  font-size: 11px;
  color: #37474f;
  cursor: pointer;
  transition: all 0.12s;
  text-align: left;
  line-height: 1.35;
}
.ai-suggest-card:hover {
  border-color: #1867c0;
  background: #e3f2fd;
  color: #1867c0;
}
.ai-suggest-card svg {
  flex-shrink: 0;
  color: #1867c0;
}

.ai-msg-row {
  display: flex;
}
.ai-msg-row--user {
  justify-content: flex-end;
}
.ai-msg-bubble {
  max-width: 78%;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
.ai-msg-bubble--bot {
  background: white;
  color: #212121;
  border: 1px solid #e0e0e0;
  border-top-left-radius: 2px;
}
.ai-msg-bubble--user {
  background: #1867c0;
  color: white;
  border-top-right-radius: 2px;
}

.ai-typing {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 10px 12px;
}
.ai-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9e9e9e;
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
    opacity: 0.5;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

.ai-panel-input {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #e0e0e0;
  background: white;
}
.ai-panel-input textarea {
  flex: 1;
  resize: none;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  max-height: 90px;
}
.ai-panel-input textarea:focus {
  border-color: #1867c0;
}
.ai-send-btn {
  background: #1867c0;
  color: white;
  border: none;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
.ai-send-btn:disabled {
  background: #bdbdbd;
  cursor: not-allowed;
}
.ai-send-btn:not(:disabled):hover {
  background: #1565c0;
}
.ai-mic-btn {
  background: #f0f0f0;
  color: #616161;
  border: none;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}
.ai-mic-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ai-mic-btn:not(:disabled):hover {
  background: #e0e0e0;
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
</style>
