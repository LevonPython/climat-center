import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRequest } from '../../lib/useRequest';
import { ContactsStrip } from '../site/ContactsStrip';
import { Emphasized } from '../site/Emphasized';
import { RequestFields } from '../site/RequestFields';
import { useSite } from '../site/SiteContext';
import { CTA_BUTTON, PlainTitle, SectionBox } from './shared';

export function Listing({ content }: { content: Record<string, any> }) {
  const { services } = useSite();
  const items = (services[content.category as 'service' | 'fault'] || []).filter((service) => service.href && (service.title || service.menu_title));
  return (
    <SectionBox>
      <PlainTitle text={content.heading} />
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((service) => (
          <li key={service.id}>
            <Link href={service.href as string} className="flex h-full min-h-11 items-center bg-brand px-4 py-2.5 font-bold text-white no-underline hover:opacity-90">
              {service.title || service.menu_title}
            </Link>
          </li>
        ))}
      </ul>
    </SectionBox>
  );
}

export function RequestFormSection({ content, sectionId }: { content: Record<string, any>; sectionId: string }) {
  const { t } = useTranslation('common');
  const { status, send } = useRequest();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    await send({ name, phone, website });
  }

  const split = content.layout === 'split';
  const title = <Emphasized text={content.heading || t('request.inlineTitle')} />;
  const fieldProps = {
    idPrefix: `form-${sectionId}`,
    name,
    phone,
    website,
    phoneTouched,
    submitted,
    onName: setName,
    onPhone: setPhone,
    onWebsite: setWebsite,
    onPhoneBlur: () => setPhoneTouched(true)
  };
  const buttonText = status === 'sending' ? t('form.sending') : content.button_label || t('request.submit');
  const failure = status === 'failed' ? <p role="alert" className="w-full text-sm text-red-700">{t('request.failed')}</p> : null;
  const sent = (
    <p role="status" className="font-medium text-body">
      {t('request.sent')}
    </p>
  );

  if (split) {
    return (
      <SectionBox>
        <div className="flex items-center bg-panel text-center max-sm:flex-col">
          <div className="w-1/2 px-[15px] py-5 max-sm:w-full">
            <h2 className="mb-[18px] text-lg font-normal">{title}</h2>
            <p className="text-[13px] italic">{t('request.after')}</p>
          </div>
          <div className="w-1/2 px-[15px] py-[5px] max-sm:w-full">
            {status === 'sent' ? (
              <div className="py-5">{sent}</div>
            ) : (
              <form onSubmit={submit} noValidate className="relative grid gap-3 py-2.5">
                <RequestFields {...fieldProps} variant="line" />
                <button type="submit" disabled={status === 'sending'} className="min-h-11 w-full bg-brand px-5 py-2.5 font-medium uppercase text-white hover:opacity-90 disabled:opacity-60">
                  {buttonText}
                </button>
                {failure}
              </form>
            )}
          </div>
        </div>
        <p className="mt-2.5 bg-panel px-4 py-2.5 text-center">{t('request.consent')}</p>
      </SectionBox>
    );
  }

  return (
    <SectionBox className="bg-white px-10 py-8 text-center shadow-[0_0_10px_rgba(0,0,0,.2)] max-sm:px-4">
      <h2 className="mb-5 text-[24px] font-normal uppercase md:text-[30px]">{title}</h2>
      {status === 'sent' ? (
        sent
      ) : (
        <form onSubmit={submit} noValidate className="relative flex flex-wrap items-start gap-4">
          <RequestFields {...fieldProps} />
          <button type="submit" disabled={status === 'sending'} className={`${CTA_BUTTON} grow disabled:opacity-60 sm:grow-0`}>
            {buttonText}
          </button>
          {failure}
          <p className="w-full text-xs italic">{t('request.after')}</p>
          <p className="w-full text-xs text-body">{t('request.consent')}</p>
        </form>
      )}
    </SectionBox>
  );
}

export function MapSection({ content }: { content: Record<string, any> }) {
  const { t } = useTranslation('common');
  const { settings } = useSite();
  const address = settings.contacts?.address;
  if (!address) return null;
  return (
    <SectionBox>
      <PlainTitle text={content.heading} />
      <iframe
        title={t('sections.map')}
        src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-[400px] w-full border-0 max-sm:h-[300px]"
      />
    </SectionBox>
  );
}

export function ContactsSection({ content }: { content: Record<string, any> }) {
  return <ContactsStrip heading={content.heading} />;
}
