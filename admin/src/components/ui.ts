const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1';

export const ui = {
  card: 'rounded-2xl border border-slate-200 bg-white p-4',
  primary: `min-h-11 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60 ${focus}`,
  secondary: `min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60 ${focus}`,
  danger: `min-h-11 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 ${focus}`,
  positive: `min-h-11 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60 ${focus}`,
  tab: `min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${focus}`,
  tabActive: 'border-slate-900 bg-slate-900 text-white',
  tabIdle: 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
  input: 'w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300',
  inputInvalid: 'w-full min-h-11 rounded-xl border border-red-400 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200',
  label: 'text-xs font-bold text-slate-800',
  help: 'text-xs text-slate-600',
  error: 'text-sm font-semibold text-red-700',
  success: 'text-sm font-semibold text-emerald-800',
  badge: 'rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700',
  badgeWarning: 'rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900'
};
