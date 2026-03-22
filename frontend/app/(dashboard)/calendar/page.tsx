'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';
import type { OfferListItem } from '@/lib/types/offer';

import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { uk } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar-theme.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { uk },
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  offer: OfferListItem;
}

const MESSAGES = {
  next: 'Наступний',
  previous: 'Попередній',
  today: 'Сьогодні',
  month: 'Місяць',
  week: 'Тиждень',
  day: 'День',
  agenda: 'Розклад',
  date: 'Дата',
  time: 'Час',
  event: 'Подія',
  noEventsInRange: 'Немає поставок у цьому періоді.',
} as const;

export default function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<View>('month');

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    getAuthApiClient()
      .get<OfferListItem[]>('/offers', {
        params: { status: 'AWAITING_DELIVERY,DELIVERED' },
      })
      .then((res) => {
        setEvents(
          res.data
            .filter((offer) => offer.deliveryDate)
            .map((offer) => {
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
            }),
        );
      })
      .catch(() => setError('Не вдалося завантажити календар'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      router.push(`/offers/${event.id}`);
    },
    [router],
  );

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const isDelivered = event.offer.status === 'DELIVERED';
    return {
      style: {
        backgroundColor: isDelivered
          ? 'hsl(var(--info))'
          : 'hsl(var(--success))',
        color: isDelivered
          ? 'hsl(var(--info-foreground))'
          : 'hsl(var(--success-foreground))',
        border: 'none',
        borderRadius: 'calc(var(--radius) - 4px)',
        fontSize: '0.6875rem',
        fontWeight: 500,
        padding: '0.125rem 0.375rem',
        cursor: 'pointer',
      },
    };
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-semibold text-foreground">
          Календар поставок
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Тут відображаються всі узгоджені замовлення, які очікують доставки та
          доставлені.
        </p>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-success" />
            Очікує доставки
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-info" />
            Доставлено
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 rounded-xl border border-border bg-card p-4">
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
            style={{ height: '100%' }}
            culture="uk"
            date={currentDate}
            view={currentView}
            onNavigate={setCurrentDate}
            onView={setCurrentView}
            onSelectEvent={handleSelectEvent}
            messages={MESSAGES}
            eventPropGetter={eventPropGetter}
          />
        )}
      </div>
    </div>
  );
}
