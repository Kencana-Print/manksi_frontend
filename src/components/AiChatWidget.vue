<script setup lang="ts">
import { ref, nextTick, computed } from "vue";
import { aiChatService } from "@/services/aiChat/aiChatService";
import {
  IconMessageChatbot,
  IconX,
  IconSend,
  IconRobot,
  IconTrash,
} from "@tabler/icons-vue";

const isOpen = ref(false);
const isSending = ref(false);
const inputText = ref("");
const messagesEl = ref<HTMLElement | null>(null);

// Riwayat mentah (format Anthropic) — dikirim balik ke backend tiap
// request supaya Claude tetap ingat konteks percakapan sebelumnya.
const conversationHistory = ref<any[]>([]);

// Riwayat yang ditampilkan ke user — cuma teks, bukan tool_use blocks.
interface DisplayMsg {
  role: "user" | "assistant";
  text: string;
}
const displayMessages = ref<DisplayMsg[]>([]);

const hasMessages = computed(() => displayMessages.value.length > 0);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
};

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) scrollToBottom();
};

const extractText = (content: any): string => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
};

const sendMessage = async () => {
  const text = inputText.value.trim();
  if (!text || isSending.value) return;

  displayMessages.value.push({ role: "user", text });
  inputText.value = "";
  isSending.value = true;
  scrollToBottom();

  try {
    const res = await aiChatService.sendMessage(
      text,
      conversationHistory.value,
    );
    const { reply, messages } = res.data.data;
    conversationHistory.value = messages;
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

const clearChat = () => {
  displayMessages.value = [];
  conversationHistory.value = [];
};

const onEnter = (e: KeyboardEvent) => {
  if (e.shiftKey) return; // shift+enter = baris baru
  e.preventDefault();
  sendMessage();
};

const suggestedQuestions = [
  "Ada SPK yang deadline-nya udah lewat nggak?",
  "Berapa total piutang overdue sekarang?",
  "Ringkasan SO aktif bulan ini gimana?",
  "SPK mana aja yang kekurangan bahan buat produksi?",
  "Berapa banyak SPK yang belum dibuatkan MKB?",
];

const askSuggested = (q: string) => {
  inputText.value = q;
  sendMessage();
};
</script>

<template>
  <!-- ── Floating Button ── -->
  <button
    v-if="!isOpen"
    class="ai-fab"
    title="Tanya Asisten AI"
    @click="toggleOpen"
  >
    <IconMessageChatbot :size="24" :stroke-width="1.7" />
  </button>

  <!-- ── Chat Panel ── -->
  <div v-else class="ai-panel">
    <div class="ai-panel-header">
      <div class="ai-panel-title">
        <IconRobot :size="16" :stroke-width="1.8" class="mr-1" />
        Asisten AI
      </div>
      <div class="ai-panel-actions">
        <button
          v-if="hasMessages"
          class="ai-icon-btn"
          title="Bersihkan chat"
          @click="clearChat"
        >
          <IconTrash :size="14" />
        </button>
        <button class="ai-icon-btn" title="Tutup" @click="toggleOpen">
          <IconX :size="16" />
        </button>
      </div>
    </div>

    <div ref="messagesEl" class="ai-panel-body">
      <div v-if="!hasMessages" class="ai-empty-hint">
        <div class="ai-hint-title">
          👋 Halo! Saya bisa bantu jawab pertanyaan seputar Penjualan, Piutang,
          dan Produksi.
        </div>
        <div class="ai-hint-sub">Coba tanya, misalnya:</div>
        <button
          v-for="(q, i) in suggestedQuestions"
          :key="i"
          class="ai-suggest-chip"
          @click="askSuggested(q)"
        >
          {{ q }}
        </button>
      </div>

      <div
        v-for="(msg, i) in displayMessages"
        :key="i"
        class="ai-msg-row"
        :class="msg.role === 'user' ? 'ai-msg-row--user' : ''"
      >
        <div
          class="ai-msg-bubble"
          :class="
            msg.role === 'user' ? 'ai-msg-bubble--user' : 'ai-msg-bubble--bot'
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
    </div>

    <div class="ai-panel-input">
      <textarea
        v-model="inputText"
        rows="1"
        placeholder="Tulis pertanyaan..."
        :disabled="isSending"
        @keydown.enter="onEnter"
      />
      <button
        class="ai-send-btn"
        :disabled="isSending || !inputText.trim()"
        @click="sendMessage"
      >
        <IconSend :size="16" />
      </button>
    </div>
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
  width: 480px;
  height: 680px;
  max-height: 85vh;
  background: white;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 999;
  font-family: "Segoe UI", system-ui, sans-serif;
}

.ai-panel-header {
  background: #1867c0;
  color: white;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.ai-panel-title {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
}
.ai-panel-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ai-icon-btn {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.ai-icon-btn:hover {
  background: rgba(255, 255, 255, 0.28);
}

.ai-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-empty-hint {
  font-size: 11.5px;
  color: #616161;
  line-height: 1.5;
  padding: 8px 4px;
}

.ai-msg-row {
  display: flex;
}
.ai-msg-row--user {
  justify-content: flex-end;
}
.ai-msg-bubble {
  max-width: 82%;
  padding: 8px 11px;
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

.ai-hint-title {
  font-size: 11.5px;
  color: #616161;
  line-height: 1.5;
  padding: 4px 4px 8px;
}
.ai-hint-sub {
  font-size: 10.5px;
  font-weight: 700;
  color: #757575;
  padding: 0 4px 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.ai-suggest-chip {
  display: block;
  width: 100%;
  text-align: left;
  background: white;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 11.5px;
  color: #1867c0;
  margin-bottom: 6px;
  cursor: pointer;
  transition: background 0.12s;
}
.ai-suggest-chip:hover {
  background: #e3f2fd;
  border-color: #1867c0;
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
  gap: 6px;
  padding: 8px;
  border-top: 1px solid #e0e0e0;
  background: white;
}
.ai-panel-input textarea {
  flex: 1;
  resize: none;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 7px 9px;
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
  width: 32px;
  height: 32px;
  border-radius: 6px;
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
</style>
