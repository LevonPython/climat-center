import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api';

type UserRow = {
  id: string;
  username: string;
  role: 'admin' | 'editor';
  created_at: string;
};

export function UsersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'editor'>('editor');

  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const resp = await apiFetch<{ users: UserRow[] }>('/api/auth/users');
      if (!resp.ok) throw new Error(resp.error?.message || 'Failed to load');
      return resp.users;
    }
  });

  const createM = useMutation({
    mutationFn: async () => {
      const resp = await apiFetch<{ user: UserRow }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, role })
      });
      if (!resp.ok) throw new Error(resp.error?.message || 'Failed to create');
      return resp.user;
    },
    onSuccess: async () => {
      setUsername('');
      setPassword('');
      setRole('editor');
      await qc.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const resp = await apiFetch<{ deleted: { id: string } }>(`/api/auth/users/${id}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error(resp.error?.message || 'Failed to delete');
      return resp.deleted;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] });
    }
  });

  if (usersQ.isLoading) return <div className="text-sm text-slate-600">{t('common.loading')}</div>;
  if (usersQ.isError) return <div className="text-sm text-red-600">{String(usersQ.error)}</div>;

  const users = usersQ.data || [];

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="font-extrabold">{t('users.addUser')}</div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="grid gap-1 md:col-span-1">
            <span className="text-sm font-semibold">{t('users.username')}</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 md:col-span-1">
            <span className="text-sm font-semibold">{t('users.password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 md:col-span-1">
            <span className="text-sm font-semibold">{t('users.role')}</span>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="admin">admin</option>
              <option value="editor">editor</option>
            </select>
          </label>
          <div className="md:col-span-1 flex items-end">
            <button
              type="button"
              onClick={() => createM.mutate()}
              disabled={createM.isPending || username.trim().length === 0 || password.length < 8}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {createM.isPending ? t('users.creating') : t('users.create')}
            </button>
          </div>
        </div>
        {createM.isError ? <div className="mt-3 text-sm text-red-600">{String(createM.error)}</div> : null}
        <div className="mt-2 text-xs text-slate-600">{t('users.passwordHint')}</div>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[700px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left font-semibold px-4 py-3">{t('users.username')}</th>
              <th className="text-left font-semibold px-4 py-3">{t('users.role')}</th>
              <th className="text-left font-semibold px-4 py-3">{t('users.created')}</th>
              <th className="text-left font-semibold px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-200">
                <td className="px-4 py-3">{u.username}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3 whitespace-nowrap">{new Date(u.created_at).toLocaleString('ru-RU')}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => deleteM.mutate(u.id)}
                    disabled={deleteM.isPending}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {t('users.delete')}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-600">
                  {t('users.empty')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

