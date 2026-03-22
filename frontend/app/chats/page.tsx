'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthApiClient } from '@/lib/api-client';
import type { ChatListDto } from '@/lib/types/chat';

interface ConnectionDto {
  id: string; // The user ID of the connection
  name: string;
  companyName: string;
}

import { NotificationBell } from '@/components/NotificationBell';

export default function ChatsPage() {
  const api = useMemo(() => getAuthApiClient(), []);
  const router = useRouter();
  const [chats, setChats] = useState<ChatListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showNewChat, setShowNewChat] = useState(false);
  const [connections, setConnections] = useState<ConnectionDto[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

  useEffect(() => {
    api.get<ChatListDto[]>('/chats')
      .then((res) => {
        setChats(res.data);
      })
      .catch(() => setError('Не вдалося завантажити чати'))
      .finally(() => setLoading(false));
  }, [api]);

  const openNewChatModal = () => {
    setShowNewChat(true);
    setLoadingConnections(true);
    Promise.all([
      api.get<any[]>('/invites/connections').catch(() => ({ data: [] })),
      api.get<any[]>('/invites/vendor-connections').catch(() => ({ data: [] })),
    ]).then(([res1, res2]) => {
      const list: ConnectionDto[] = [];
      res1.data.forEach((c: any) => {
        list.push({ id: c.buyerId, name: c.buyerName, companyName: c.buyerCompanyName });
      });
      res2.data.forEach((c: any) => {
        list.push({ id: c.vendorId, name: c.vendorName, companyName: c.vendorCompanyName });
      });
      setConnections(list);
    }).finally(() => setLoadingConnections(false));
  };

  const startChat = (participantId: string) => {
    setCreatingChat(true);
    api.post<{ id: string }>('/chats', { participantId })
      .then((res) => {
        router.push(`/chats/${res.data.id}`);
      })
      .catch(() => {
        alert('Не вдалося створити чат');
        setCreatingChat(false);
      });
  };

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
  const baseUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

  const getAvatarUrl = (path: string | null) => (path ? `${baseUrl}${path}` : null);

  return (
    <main className="flex min-h-screen flex-col bg-[#f5f5f5]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-semibold tracking-tight text-gray-900">
            RetailProcure
          </Link>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Link href="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
              ← В кабінет
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Повідомлення</h1>
          <button
            onClick={openNewChatModal}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Новий чат
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : chats.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
            У вас поки немає активних чатів.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {chats.map((chat) => {
              const avatarUrl = getAvatarUrl(chat.participant.avatarPath);
              return (
                <Link
                  key={chat.id}
                  href={`/chats/${chat.id}`}
                  className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-300 hover:shadow"
                >
                  <div className="flex-shrink-0">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={chat.participant.name} className="h-12 w-12 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <span className="text-lg font-semibold">{chat.participant.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h2 className="text-base font-semibold text-gray-900 truncate">
                        {chat.participant.name} <span className="text-sm font-normal text-gray-500">({chat.participant.companyName})</span>
                      </h2>
                      {chat.lastMessage && (
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                          {new Date(chat.lastMessage.createdAt).toLocaleDateString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-sm text-gray-600 truncate">
                        {chat.lastMessage ? chat.lastMessage.content : <span className="italic text-gray-400">Немає повідомлень</span>}
                      </p>
                      {chat.unreadCount > 0 && (
                        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Почати чат</h2>
              <button onClick={() => setShowNewChat(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            
            {loadingConnections ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              </div>
            ) : connections.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Немає доступних контактів для чату.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {connections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => startChat(c.id)}
                    disabled={creatingChat}
                    className="w-full flex items-center justify-between rounded-lg border border-gray-200 p-3 text-left hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.companyName}</div>
                    </div>
                    <span className="text-emerald-600 text-sm">Написати</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
