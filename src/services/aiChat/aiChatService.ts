import api from "@/services/api";

export interface ChatDisplayMessage {
  role: "user" | "assistant";
  text: string;
}

export const aiChatService = {
  sendMessage: (message: string, history: any[]) =>
    api.post("/ai-chat/message", { message, history }),
};
