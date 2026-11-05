import { useTranslation } from 'next-i18next';
import { telHref } from '../../lib/contactPhone';
import { Emphasized } from './Emphasized';
import { useSite } from './SiteContext';

const ITEM = 'flex grow items-center justify-center border border-[#e8e8e8] px-2.5 py-5 text-center';
const ICON = "mr-2 inline-block shrink-0 bg-[url('/theme/con-icons.png')] bg-no-repeat";

export function ContactsStrip({ heading }: { heading?: string | null }) {
  const { t } = useTranslation('common');
  const { contacts = {}, social = {} } = useSite().settings;
  if (!contacts.phone && !contacts.email && !contacts.address && !contacts.hours) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-5 text-center text-[24px] font-normal uppercase sm:text-[30px] md:text-[40px]">
        <Emphasized text={heading || t('layout.contactsTitle')} />
      </h2>
      <div className="flex flex-wrap overflow-hidden shadow-[0_0_5px_rgba(0,0,0,.2)]">
        {contacts.address ? (
          <div className={ITEM}>
            <span aria-hidden="true" className={`${ICON} h-[26px] w-[18px] bg-[50%_0]`} />
            <span className="whitespace-pre-line">{contacts.address}</span>
          </div>
        ) : null}
        {contacts.hours ? (
          <div className={ITEM}>
            <span aria-hidden="true" className={`${ICON} h-[25px] w-[25px] bg-[100%_-26px]`} />
            <span className="whitespace-pre-line">{contacts.hours}</span>
          </div>
        ) : null}
        {contacts.email ? (
          <div className={ITEM}>
            <span aria-hidden="true" className={`${ICON} h-[18px] w-[26px] bg-[50%_-51px]`} />
            <a href={`mailto:${contacts.email}`} className="text-ink no-underline">
              {contacts.email}
            </a>
          </div>
        ) : null}
        {contacts.phone ? (
          <div className={ITEM}>
            <div>
              <a href={telHref(contacts.phone)} className="text-xl font-medium text-body no-underline">
                {contacts.phone}
              </a>
              {social.whatsapp_url ? <a href={social.whatsapp_url} aria-label="WhatsApp" className="mx-auto mt-1 block h-10 w-10 bg-[url('/theme/connect.png')] bg-[50%_0] bg-no-repeat" /> : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
