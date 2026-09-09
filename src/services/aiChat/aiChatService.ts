import api from "@/services/api";

export interface ConversationSummary {
  id: number;
  title: string;
  updatedAt: string;
}

export const aiChatService = {
  sendMessage: (message: string, conversationId?: number | null) =>
    api.post("/ai-chat/message", { message, conversationId }),
  listConversations: () => api.get("/ai-chat/conversations"),
  getConversation: (id: number) => api.get(`/ai-chat/conversations/${id}`),
  deleteConversation: (id: number) =>
    api.delete(`/ai-chat/conversations/${id}`),
};
