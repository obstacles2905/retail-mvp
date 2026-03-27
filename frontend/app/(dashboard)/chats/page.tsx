'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthApiClient } from '@/lib/api-client';
import { getStoredUser } from '@/lib/auth';
import { AvatarImage } from '@/components/AvatarImage';
import { chatFilePreviewLabel } from '@/lib/chat-file-message';
import type { ChatListDto } from '@/lib/types/chat';

interface ConnectionDto {
  id: string; // The user ID of the connection
  name: string;
  companyName: string;
}

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
    const currentUser = getStoredUser();
    
    Promise.all([
      api.get<any[]>('/invites/connections').catch(() => ({ data: [] })),
      api.get<any[]>('/invites/vendor-connections').catch(() => ({ data: [] })),
      api.get<any>('/workspaces/my/team').catch(() => ({ data: { users: [] } })),
    ]).then(([res1, res2, res3]) => {
      const list: ConnectionDto[] = [];
      res1.data.forEach((c: any) => {
        list.push({ id: c.buyerId, name: c.buyerName, companyName: c.buyerCompanyName });
      });
      res2.data.forEach((c: any) => {
        list.push({ id: c.vendorId, name: c.vendorName, companyName: c.vendorCompanyName });
      });
      if (res3.data && res3.data.users) {
        res3.data.users.forEach((u: any) => {
          if (currentUser && u.id !== currentUser.id) {
            list.push({ id: u.id, name: u.name, companyName: 'Колега по команді' });
          }
        });
      }
      
      // Deduplicate by ID just in case
      const uniqueList = list.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
      setConnections(uniqueList);
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

  return (
    <main className="flex flex-1 flex-col bg-background">

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Повідомлення</h1>
          <button
            onClick={openNewChatModal}
            className="rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90"
          >
            Новий чат
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : chats.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            У вас поки немає активних чатів.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {chats.map((chat) => {
              return (
                <a
                  key={chat.id}
                  href={`/chats/${chat.id}`}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-success/40 hover:shadow"
                >
                  <div className="flex-shrink-0">
                    <AvatarImage
                      avatarPath={chat.participant.avatarPath}
                      alt={chat.participant.name}
                      className="h-12 w-12 rounded-full border border-border object-cover"
                      placeholderClassName="!bg-success/15 !text-success"
                      placeholder={
                        <span className="text-lg font-semibold">
                          {chat.participant.name.charAt(0).toUpperCase()}
                        </span>
                      }
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between">
                      <h2 className="truncate text-base font-semibold text-foreground">
                        {chat.participant.name} <span className="text-sm font-normal text-muted-foreground">({chat.participant.companyName})</span>
                      </h2>
                      {chat.lastMessage && (
                        <span className="ml-2 whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(chat.lastMessage.createdAt).toLocaleDateString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="truncate text-sm text-muted-foreground">
                        {chat.lastMessage ? (
                          chatFilePreviewLabel(chat.lastMessage.content) ?? chat.lastMessage.content
                        ) : (
                          <span className="italic text-muted-foreground/80">Немає повідомлень</span>
                        )}
                      </p>
                      {chat.unreadCount > 0 && (
                        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-success text-[10px] font-bold text-success-foreground">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Почати чат</h2>
              <button type="button" onClick={() => setShowNewChat(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            {loadingConnections ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : connections.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Немає доступних контактів для чату.</p>
            ) : (
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {connections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => startChat(c.id)}
                    disabled={creatingChat}
                    className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:border-success hover:bg-success/10 disabled:opacity-50"
                  >
                    <div>
                      <div className="font-medium text-foreground">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.companyName}</div>
                    </div>
                    <span className="text-sm text-success">Написати</span>
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
