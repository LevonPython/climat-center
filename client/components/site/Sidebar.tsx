import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { assetUrl } from '../../lib/assets';
import type { SiteService } from '../../lib/site';
import { Lightbox } from './Lightbox';
import { useSite } from './SiteContext';

function ServiceGroup({ title, services }: { title: string; services: SiteService[] }) {
  const { asPath } = useRouter();
  const visible = services.filter((service) => service.show_in_menu && service.href && (service.menu_title || service.title));
  if (!visible.length) return null;

  return (
    <div className="mb-3">
      <h2 className="mb-1.5 text-xl font-medium uppercase text-brand">{title}</h2>
      <ul className="grid gap-[5px]">
        {visible.map((service) => (
          <li key={service.id} className="bg-panel">
            <Link
              href={service.href as string}
              aria-current={asPath.split('?')[0] === service.href ? 'page' : undefined}
              className="block px-3 py-[9px] text-ink no-underline hover:text-brand aria-[current=page]:font-medium aria-[current=page]:text-brand"
            >
              {service.menu_title || service.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sidebar() {
  const { t } = useTranslation('common');
  const { galleries, services } = useSite();
  const certificates = galleries.certificates || [];
  const [openImage, setOpenImage] = useState<number | null>(null);

  return (
    <aside className="w-full shrink-0 desk:w-60">
      <div className="max-desk:hidden">
        <ServiceGroup title={t('layout.services')} services={services.service || []} />
        <ServiceGroup title={t('layout.faults')} services={services.fault || []} />
      </div>
      {certificates.length ? (
        <div>
          <h2 className="mb-1.5 text-xl font-medium uppercase text-brand">{t('layout.certificates')}</h2>
          <div className="grid gap-2 max-desk:grid-cols-2">
            {certificates.map((certificate, index) => (
              <button key={certificate.id} type="button" aria-label={certificate.title || t('layout.certificates')} onClick={() => setOpenImage(index)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl(certificate.url)} alt={certificate.alt || certificate.title || ''} loading="lazy" className="w-full" />
              </button>
            ))}
          </div>
          {openImage !== null ? (
            <Lightbox images={certificates.map((item) => ({ url: item.url, alt: item.alt }))} index={openImage} onChange={setOpenImage} onClose={() => setOpenImage(null)} />
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
