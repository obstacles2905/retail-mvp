'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { connectNotifications, disconnectNotifications, getNotificationsSocket } from '@/lib/realtime/notifications-socket';
import { getStoredUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';

export interface AppNotification {
  id: string;
  type: 'OFFER_MESSAGE' | 'CHAT_MESSAGE' | 'OFFER_UPDATE' | 'SYSTEM';
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return ctx;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const api = getAuthApiClient();
      const [listRes, countRes] = await Promise.all([
        api.get<AppNotification[]>('/notifications'),
        api.get<number>('/notifications/unread-count')
      ]);
      setNotifications(listRes.data);
      setUnreadCount(countRes.data);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      disconnectNotifications();
      return;
    }

    fetchNotifications();

    connectNotifications();
    const socket = getNotificationsSocket();

    const handleNewNotification = (data: { notification?: AppNotification; [key: string]: any }) => {
      if (data.notification) {
        setNotifications(prev => [data.notification!, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleOfferMessage = (data: any) => {
      handleNewNotification(data);
      if (pathname === `/offers/${data.offerId}`) return;
      
      toast((t) => (
        <div
          className="cursor-pointer"
          onClick={() => {
            toast.dismiss(t.id);
            router.push(`/offers/${data.offerId}`);
          }}
        >
          <b>Нове повідомлення в угоді</b>
          <p className="text-sm">{data.message}</p>
        </div>
      ), { icon: '💬', duration: 5000 });
    };

    const handleChatMessage = (data: any) => {
      handleNewNotification(data);
      if (pathname === `/chats/${data.chatId}`) return;

      toast((t) => (
        <div
          className="cursor-pointer"
          onClick={() => {
            toast.dismiss(t.id);
            router.push(`/chats/${data.chatId}`);
          }}
        >
          <b>Нове повідомлення</b>
          <p className="text-sm">Від {data.senderName}: {data.content}</p>
        </div>
      ), { icon: '✉️', duration: 5000 });
    };

    const handleOfferUpdate = (data: any) => {
      handleNewNotification(data);
      if (pathname === `/offers/${data.offerId}`) return;

      toast((t) => (
        <div
          className="cursor-pointer"
          onClick={() => {
            toast.dismiss(t.id);
            router.push(`/offers/${data.offerId}`);
          }}
        >
          <b>Оновлення по угоді</b>
          <p className="text-sm">{data.message}</p>
        </div>
      ), { icon: '🔄', duration: 5000 });
    };

    socket.on('notification:offer_message', handleOfferMessage);
    socket.on('notification:chat_message', handleChatMessage);
    socket.on('notification:offer_update', handleOfferUpdate);

    return () => {
      socket.off('notification:offer_message', handleOfferMessage);
      socket.off('notification:chat_message', handleChatMessage);
      socket.off('notification:offer_update', handleOfferUpdate);
    };
  }, [pathname, router]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await getAuthApiClient().post(`/notifications/${id}/read`);
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await getAuthApiClient().post(`/notifications/read-all`);
    } catch (e) {
      console.error('Failed to mark all notifications as read', e);
    }
  };

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
      <Toaster position="top-right" />
    </NotificationsContext.Provider>
  );
}
