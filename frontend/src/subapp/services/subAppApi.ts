import api from "../../utils/api";
export interface SubAppMessage {
  id: string;
  sub_chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface SubAppChat {
  id: string;
  user_id: string;
  title: string;
  app_type: string;
  created_at: string;
}

export const subAppApi = {
  sendMessage: async (message: string, subChatId?: string, appType = 'default') => {
    const { data } = await api.post('/subapp/message', {
      message,
      subChatId,
      appType,
      model: 'OpenRouter'
    });
    return data;
  },

  getChats: async (appType?: string) => {
    const { data } = await api.get<SubAppChat[]>('/subapp/chats', {
      params: appType ? { appType } : {}
    });
    return data;
  },

  getMessages: async (subChatId: string) => {
    const { data } = await api.get<SubAppMessage[]>(`/subapp/messages/${subChatId}`);
    return data;
  },

  deleteChat: async (subChatId: string) => {
    const { data } = await api.delete(`/subapp/chat/${subChatId}`);
    return data;
  }
};
