import { useRouter } from 'next/router';
import { useState } from 'react';
import { apiFetch } from './api';
import { isValidArmenianPhone } from './phone';

export const WORK_TYPES = ['repair', 'install', 'purchase', 'cleaning', 'other'] as const;
export type WorkType = (typeof WORK_TYPES)[number];

type RequestStatus = 'idle' | 'sending' | 'sent' | 'failed';

export type RequestInput = { name: string; phone: string; workTypes?: WorkType[]; website?: string };

// Popup and inline forms both create a booking, which records the page it came from.
export function useRequest() {
  const router = useRouter();
  const [status, setStatus] = useState<RequestStatus>('idle');

  async function send({ name, phone, workTypes = [], website = '' }: RequestInput): Promise<boolean> {
    if (name.trim().length < 2 || !isValidArmenianPhone(phone)) return false;
    setStatus('sending');
    try {
      const resp = await apiFetch<{ booking: unknown }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          user_name: name.trim(),
          phone,
          work_types: workTypes,
          source_page: router.asPath.split('?')[0],
          website
        })
      });
      setStatus(resp.ok ? 'sent' : 'failed');
      return resp.ok;
    } catch {
      setStatus('failed');
      return false;
    }
  }

  return { status, send };
}
