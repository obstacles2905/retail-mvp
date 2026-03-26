'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';
import { Mail, Phone, Building2, User as UserIcon, MessageCircle } from 'lucide-react';

interface LinkedVendorDto {
  vendorId: string;
  vendorName: string;
  vendorCompanyName: string;
  email: string;
  phone: string | null;
}

export default function VendorsCatalogPage() {
  const router = useRouter();
  const api = useMemo(() => getAuthApiClient(), []);
  
  const [vendors, setVendors] = useState<LinkedVendorDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [myInvite, setMyInvite] = useState<{ token: string; inviteUrl: string } | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || user.role !== 'BUYER') {
      router.replace('/login');
      return;
    }

    setLoading(true);
    
    // Fetch connected vendors
    api.get<LinkedVendorDto[]>('/invites/vendor-connections')
      .then((res) => setVendors(res.data))
      .catch(() => setError('Не вдалося завантажити список постачальників'))
      .finally(() => setLoading(false));

    // Fetch existing invite link
    api.get<{ token: string; inviteUrl: string }>('/invites/mine')
      .then((inv) => setMyInvite(inv.data))
      .catch(() => undefined);
      
  }, [api, router]);

  const createInvite = (): void => {
    setCreatingInvite(true);
    api
      .get<{ token: string; inviteUrl: string }>('/invites/mine')
      .then((res) => setMyInvite(res.data))
      .catch(() => toast.error('Не вдалося отримати запрошення'))
      .finally(() => setCreatingInvite(false));
  };

  const copyLink = (url: string, id: string): void => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <main className="flex flex-1 flex-col bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Каталог постачальників</h1>
        <p className="mt-1 text-muted-foreground">
          Керуйте списком підключених постачальників та запрошуйте нових.
        </p>

        {/* Vendors List Section */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Підключені постачальники ({vendors.length})</h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : vendors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-transparent p-12 text-center">
              <p className="text-sm text-muted-foreground">У вас ще немає підключених постачальників.</p>
              <p className="mt-1 text-xs text-muted-foreground">Надішліть запрошення, щоб почати працювати з ними.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {vendors.map((vendor) => (
                <div key={vendor.vendorId} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h3 className="truncate font-semibold text-foreground text-base" title={vendor.vendorCompanyName}>
                        {vendor.vendorCompanyName}
                      </h3>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <UserIcon className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[150px]">{vendor.vendorName}</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                          <Mail className="h-3.5 w-3.5" />
                          <a href={`mailto:${vendor.email}`} className="truncate hover:text-foreground transition-colors">
                            {vendor.email}
                          </a>
                        </div>
                        {vendor.phone && (
                          <div className="hidden md:flex items-center gap-1.5 shrink-0">
                            <Phone className="h-3.5 w-3.5" />
                            <a href={`tel:${vendor.phone}`} className="truncate hover:text-foreground transition-colors">
                              {vendor.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await api.post<{ id: string }>('/chats', { participantId: vendor.vendorId });
                          router.push(`/chats/${res.data.id}`);
                        } catch (err) {
                          toast.error('Не вдалося створити чат');
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Написати</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite Section */}
        <div className="mt-12 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Запросити нового постачальника</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Надішліть це посилання постачальнику (наприклад, по пошті або в месенджері). За посиланням він зареєструється та отримає доступ до ваших SKU для створення пропозицій.
          </p>

          {myInvite ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm">
              <code className="truncate flex-1 text-foreground font-mono" title={myInvite.inviteUrl}>
                {myInvite.inviteUrl}
              </code>
              <button
                type="button"
                onClick={() => copyLink(myInvite.inviteUrl, myInvite.token)}
                className="shrink-0 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                {copiedId === myInvite.token ? 'Скопійовано!' : 'Копіювати'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={createInvite}
              disabled={creatingInvite}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {creatingInvite ? 'Отримання…' : 'Отримати посилання-запрошення'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
