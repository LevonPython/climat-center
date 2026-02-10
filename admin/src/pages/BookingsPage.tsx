import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { apiFetch } from '../api';

type Booking = {
  id: string;
  user_name: string;
  phone: string;
  service_id: string | null;
  date: string | null;
  time: string | null;
  status: 'new' | 'in_progress' | 'completed' | 'cancelled';
  address: string | null;
  problem_description: string | null;
  created_at: string;
};

export function BookingsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<'all' | Booking['status']>('new');

  const key = useMemo(() => ['bookings', status], [status]);
  const bookingsQ = useQuery({
    queryKey: key,
    queryFn: async () => {
      const resp = await apiFetch<{ bookings: Booking[] }>(`/api/bookings?status=${status}`);
      if (!resp.ok) throw new Error(resp.error?.message || 'Failed to load');
      return resp.bookings;
    }
  });

  const updateStatusM = useMutation({
    mutationFn: async (p: { id: string; status: Booking['status'] }) => {
      const resp = await apiFetch<{ booking: Booking }>(`/api/bookings/${p.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: p.status })
      });
      if (!resp.ok) throw new Error(resp.error?.message || 'Failed to update');
      return resp.booking;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['bookings'] });
    }
  });

  if (bookingsQ.isLoading) return <div className="text-sm text-slate-600">Загрузка...</div>;
  if (bookingsQ.isError) return <div className="text-sm text-red-600">{String(bookingsQ.error)}</div>;

  const bookings = bookingsQ.data || [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600">Всего: {bookings.length}</div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Статус</span>
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="all">Все</option>
            <option value="new">Новые</option>
            <option value="in_progress">В работе</option>
            <option value="completed">Выполнено</option>
            <option value="cancelled">Отменено</option>
          </select>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Дата</th>
              <th className="text-left font-semibold px-4 py-3">Клиент</th>
              <th className="text-left font-semibold px-4 py-3">Телефон</th>
              <th className="text-left font-semibold px-4 py-3">Адрес</th>
              <th className="text-left font-semibold px-4 py-3">Комментарий</th>
              <th className="text-left font-semibold px-4 py-3">Статус</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-slate-200">
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(b.created_at).toLocaleString('ru-RU')}
                </td>
                <td className="px-4 py-3">{b.user_name}</td>
                <td className="px-4 py-3 whitespace-nowrap">{b.phone}</td>
                <td className="px-4 py-3">{b.address || '—'}</td>
                <td className="px-4 py-3">{b.problem_description || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={b.status}
                    onChange={(e) => updateStatusM.mutate({ id: b.id, status: e.target.value as any })}
                    disabled={updateStatusM.isPending}
                  >
                    <option value="new">Новые</option>
                    <option value="in_progress">В работе</option>
                    <option value="completed">Выполнено</option>
                    <option value="cancelled">Отменено</option>
                  </select>
                </td>
              </tr>
            ))}
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-600">
                  Нет заявок
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

