export interface ChatParticipant {
  id: string;
  name: string;
  companyName: string;
  avatarPath: string | null;
}

export interface ChatListDto {
  id: string;
  participant: ChatParticipant;
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
}

export interface ChatMessageDto {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: ChatParticipant;
}

export interface ChatDetailsDto {
  id: string;
  participant: ChatParticipant;
  messages: ChatMessageDto[];
}
