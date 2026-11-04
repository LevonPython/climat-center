import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { request } from '../lib/request';
import type { Schemas } from './types';

export function useSchemas() {
  return useQuery({
    queryKey: ['schemas'],
    staleTime: Infinity,
    queryFn: async (): Promise<Schemas> => {
      const { block_types, site_blocks } = await request<Schemas>('/api/admin/schemas');
      return { block_types, site_blocks };
    }
  });
}

// Labels come from the server in English. The catalogues translate them by their exact text.
export function useSchemaLabel(): (label: string) => string {
  const { t } = useTranslation();
  return (label) => t(label, { ns: 'schema', keySeparator: false, nsSeparator: false, defaultValue: label });
}
