import { useTranslation } from 'next-i18next';
import React from 'react';

export type SocialPlatform = 'whatsapp' | 'telegram' | 'facebook' | 'instagram';

export type SocialLink = {
  id: SocialPlatform;
  href: string;
};

// Placeholder links. Replace with real URLs when available.
export const SOCIAL_LINKS: SocialLink[] = [
  { id: 'whatsapp', href: 'https://wa.me/74951828384' },
  { id: 'telegram', href: 'https://t.me/your_handle' },
  { id: 'facebook', href: 'https://facebook.com/your_page' },
  { id: 'instagram', href: 'https://instagram.com/your_profile' }
];

function Icon(props: { platform: SocialPlatform; className?: string }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' } as const;
  const cls = props.className || 'h-5 w-5';

  // Simple inline marks (not official brand assets).
  if (props.platform === 'whatsapp') {
    return (
      <svg {...common} className={cls} aria-hidden="true">
        <path
          d="M12 21a9 9 0 0 0 7.74-13.6A9 9 0 0 0 3.27 17.7L3 21l3.4-.25A8.96 8.96 0 0 0 12 21Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9.4 8.9c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .5.3l.7 1.7c.1.2.1.4 0 .6l-.4.5c-.1.2-.2.4 0 .6.4.7 1.6 1.9 2.3 2.3.2.1.4.1.6 0l.5-.4c.2-.2.4-.2.6 0l1.7.7c.3.1.3.3.3.5v.5c0 .3 0 .6-.5.8-.6.3-2 .7-4.5-.7-2.3-1.3-3.9-3.8-4.2-4.5-.2-.5-.1-1.5.1-2.1Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (props.platform === 'telegram') {
    return (
      <svg {...common} className={cls} aria-hidden="true">
        <path
          d="M20.9 5.2 3.7 11.9c-.8.3-.8 1.4 0 1.7l3.8 1.2 1.4 4.5c.2.7 1.1.9 1.6.4l2.2-2.1 3.9 2.9c.5.4 1.3.1 1.4-.6l2.4-13.7c.1-.7-.6-1.3-1.2-1Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M7.4 14.6 18.6 7.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (props.platform === 'facebook') {
    return (
      <svg {...common} className={cls} aria-hidden="true">
        <path
          d="M14 8.2V6.9c0-.6.5-1.1 1.1-1.1H17V3h-1.9A4.1 4.1 0 0 0 11 7.1v1.1H9v3h2v10h3v-10h2.6l.4-3H14Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg {...common} className={cls} aria-hidden="true">
      <path
        d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M7.5 3.8h9A3.7 3.7 0 0 1 20.2 7.5v9a3.7 3.7 0 0 1-3.7 3.7h-9a3.7 3.7 0 0 1-3.7-3.7v-9A3.7 3.7 0 0 1 7.5 3.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M17 7.1h0" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export function SocialLinks(props: { variant?: 'icon' | 'labeled'; className?: string; links?: SocialLink[] }) {
  const { t } = useTranslation('common');
  const variant = props.variant || 'icon';
  const linkPadding = variant === 'labeled' ? 'px-3 py-2' : 'p-2';
  const iconSize = variant === 'labeled' ? 'h-5 w-5' : 'h-4 w-4';
  const links = props.links && props.links.length > 0 ? props.links : SOCIAL_LINKS;

  return (
    <div className={props.className}>
      <div className={variant === 'labeled' ? 'flex flex-wrap gap-2' : 'flex items-center gap-1'}>
        {links.map((s) => (
          <a
            key={s.id}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t(`social.${s.id}`)}
            className={[
              'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white',
              `${linkPadding} text-sm font-semibold text-slate-900 hover:bg-slate-50`,
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2'
            ].join(' ')}
          >
            <span className="text-slate-900">
              <Icon platform={s.id} className={iconSize} />
            </span>
            {variant === 'labeled' ? <span>{t(`social.${s.id}`)}</span> : null}
          </a>
        ))}
      </div>
    </div>
  );
}

