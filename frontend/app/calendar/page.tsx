'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';
import type { OfferListItem } from '@/lib/types/offer';
import { NotificationBell } from '@/components/NotificationBell';

import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { uk } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ThemeToggle } from '@/components/ThemeToggle';

const locales = {
  'uk': uk,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  offer: OfferListItem;
}

export default function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    const api = getAuthApiClient();
    setLoading(true);
    api
      .get<OfferListItem[]>('/offers', { params: { status: 'AWAITING_DELIVERY,DELIVERED' } })
      .then((res) => {
        const calendarEvents = res.data
          .filter(offer => offer.deliveryDate)
          .map(offer => {
            const date = new Date(offer.deliveryDate!);
            const isDelivered = offer.status === 'DELIVERED';
            return {
              id: offer.id,
              title: `${isDelivered ? '✓ ' : ''}${offer.sku?.name || offer.productName} (${offer.volume} ${offer.unit})`,
              start: date,
              end: date,
              allDay: true,
              offer,
            };
          });
        setEvents(calendarEvents);
      })
      .catch(() => setError('Не вдалося завантажити календар'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSelectEvent = (event: CalendarEvent) => {
    window.location.href = `/offers/${event.id}`;
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight text-foreground">
            RetailProcure
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <NotificationBell />
            <Link href="/dashboard" prefetch={false} className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
              ← В кабінет
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-8 flex-1 flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Календар поставок</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Тут відображаються всі узгоджені замовлення, які очікують доставки та доставлені.
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-success" /> Очікує доставки</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-info" /> Доставлено</span>
          </div>
        </div>

        <div className="min-h-[600px] flex-1 rounded-xl border border-border bg-card p-4 shadow-sm">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              culture="uk"
              onSelectEvent={handleSelectEvent}
              messages={{
                next: "Наступний",
                previous: "Попередній",
                today: "Сьогодні",
                month: "Місяць",
                week: "Тиждень",
                day: "День",
                agenda: "Розклад",
                date: "Дата",
                time: "Час",
                event: "Подія",
                noEventsInRange: "Немає поставок у цьому періоді.",
              }}
              eventPropGetter={(event) => {
                const isDelivered = event.offer.status === 'DELIVERED';
                return {
                  className: isDelivered
                    ? 'bg-info border-info rounded text-xs px-1 py-0.5 cursor-pointer hover:brightness-95 text-info-foreground'
                    : 'bg-success border-success rounded text-xs px-1 py-0.5 cursor-pointer hover:brightness-95 text-success-foreground',
                };
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
