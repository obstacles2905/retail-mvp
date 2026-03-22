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
    <main className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-semibold tracking-tight text-gray-900">
            RetailProcure
          </Link>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Link href="/dashboard" prefetch={false} className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
              ← В кабінет
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-8 flex-1 flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Календар поставок</h1>
          <p className="mt-1 text-sm text-gray-600">
            Тут відображаються всі узгоджені замовлення, які очікують доставки та доставлені.
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-600" /> Очікує доставки</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-blue-600" /> Доставлено</span>
          </div>
        </div>

        <div className="flex-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm min-h-[600px]">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
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
                    ? 'bg-blue-600 border-blue-700 rounded text-xs px-1 py-0.5 cursor-pointer hover:bg-blue-700'
                    : 'bg-emerald-600 border-emerald-700 rounded text-xs px-1 py-0.5 cursor-pointer hover:bg-emerald-700',
                };
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
