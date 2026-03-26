'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Download, TrendingDown, TrendingUp, DollarSign, Handshake } from 'lucide-react';

interface KpiData {
  totalSaved: number;
  totalSpend: number;
  dealsClosed: number;
}

interface VendorStats {
  vendorId: string;
  vendorName: string;
  vendorCompanyName: string;
  totalOffers: number;
  acceptedOffers: number;
  totalSaved: number;
  winRate: number;
}

// Mock data for Price Trend MVP
const mockPriceTrend = [
  { month: 'Січ', price: 120 },
  { month: 'Лют', price: 118 },
  { month: 'Бер', price: 115 },
  { month: 'Кві', price: 110 },
  { month: 'Тра', price: 108 },
  { month: 'Чер', price: 105 },
];

export default function AnalyticsDashboard() {
  const router = useRouter();
  const api = useMemo(() => getAuthApiClient(), []);

  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [vendors, setVendors] = useState<VendorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || user.role !== 'BUYER') {
      router.replace('/login');
      return;
    }

    setLoading(true);
    Promise.all([
      api.get<KpiData>('/analytics/kpis'),
      api.get<VendorStats[]>('/analytics/vendors'),
    ])
      .then(([kpiRes, vendorsRes]) => {
        setKpis(kpiRes.data);
        setVendors(vendorsRes.data);
      })
      .catch(() => setError('Не вдалося завантажити аналітику'))
      .finally(() => setLoading(false));
  }, [api, router]);

  const handleExport = () => {
    const token = localStorage.getItem('accessToken');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    
    // Create a temporary link to download the file with auth header
    fetch(`${apiUrl}/analytics/export`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'deals_export.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(() => alert('Помилка експорту'));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !kpis) {
    return (
      <div className="p-8 min-h-screen">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error || 'Помилка завантаження'}
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Аналітика та ROI</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Показники ефективності закупівель та економії бюджету.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            Експорт в CSV
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="rounded-xl border border-success/20 bg-success/5 p-6 shadow-sm">
            <div className="flex items-center gap-3 text-success mb-2">
              <div className="rounded-full bg-success/20 p-2">
                <TrendingDown className="h-5 w-5" />
              </div>
              <h3 className="font-medium">Зекономлено</h3>
            </div>
            <p className="text-3xl font-bold text-success">
              {kpis.totalSaved.toLocaleString('uk-UA')} <span className="text-lg font-medium">грн</span>
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <div className="rounded-full bg-muted p-2">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="font-medium text-foreground">Обсяг закупівель</h3>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {kpis.totalSpend.toLocaleString('uk-UA')} <span className="text-lg font-medium text-muted-foreground">грн</span>
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <div className="rounded-full bg-muted p-2">
                <Handshake className="h-5 w-5" />
              </div>
              <h3 className="font-medium text-foreground">Укладено угод</h3>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {kpis.dealsClosed}
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Price Trend Chart */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
            <h3 className="text-lg font-semibold text-foreground mb-1">Динаміка цін</h3>
            <p className="text-sm text-muted-foreground mb-6">Середня ціна на топ-товари за останні 6 місяців</p>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockPriceTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value} ₴`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    name="Ціна"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vendor Scorecard */}
          <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Ефективність постачальників</h3>
              <p className="mt-1 text-sm text-muted-foreground">Рейтинг за відсотком виграних угод та економією</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">Постачальник</th>
                    <th className="px-6 py-3 font-medium text-right">Win Rate</th>
                    <th className="px-6 py-3 font-medium text-right">Зекономлено</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vendors.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                        Немає даних для відображення
                      </td>
                    </tr>
                  ) : (
                    vendors.map((v) => (
                      <tr key={v.vendorId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">
                          {v.vendorCompanyName}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary" 
                                style={{ width: `${v.winRate}%` }}
                              />
                            </div>
                            <span className="w-9 font-medium">{Math.round(v.winRate)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-success">
                          {v.totalSaved > 0 ? `+${v.totalSaved.toLocaleString('uk-UA')} грн` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
