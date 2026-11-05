import { assetUrl } from '../../lib/assets';
import { Emphasized } from '../site/Emphasized';
import { RequestButton, SectionBox, usePriceLabel } from './shared';

export function IntroBanner({ content }: { content: Record<string, any> }) {
  const priceLabel = usePriceLabel();
  const promos: Record<string, any>[] = content.promos || [];

  return (
    <SectionBox>
      <h1 className="mx-auto mb-5 max-w-[700px] text-center text-[30px] font-normal uppercase max-sm:text-[24px]">
        {content.heading ? <b className="block text-[40px] font-bold text-brand max-sm:text-[30px]">{content.heading}</b> : null}
        {content.subheading}
      </h1>
      {promos.length ? (
        <div className="relative z-[3] flex flex-wrap justify-center gap-x-10">
          {promos.map((promo, index) => {
            const imageFirst = index % 2 === 1;
            const picture = promo.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assetUrl(promo.image_url)} alt="" className={`relative z-[2] h-[253px] w-[253px] object-contain ${imageFirst ? 'sm:-mr-[30px]' : 'sm:-ml-[30px]'}`} />
            ) : null;
            return (
              <div key={index} className={`mb-5 flex items-center ${imageFirst ? 'max-sm:flex-col' : 'max-sm:flex-col-reverse'}`}>
                {imageFirst ? picture : null}
                <div className="w-[180px] shrink-0">
                  <div className={`mb-2.5 text-xl font-light ${imageFirst ? 'sm:pl-[35px]' : 'sm:pr-[35px] sm:text-right'}`}>{promo.label}</div>
                  <div className={`bg-leaf-strong py-2.5 text-xl font-semibold text-white ${imageFirst ? 'pl-4 pr-3 sm:pl-[45px]' : 'pl-3 pr-4 sm:pr-[45px] sm:text-right'}`}>{priceLabel(promo.price)}</div>
                </div>
                {imageFirst ? null : picture}
              </div>
            );
          })}
        </div>
      ) : null}
      {content.intro_text ? (
        <div className="relative mx-auto max-w-[494px] sm:-mt-[150px]">
          <div className="absolute top-5 hidden h-[413px] w-full rounded-full bg-tint sm:block" />
          <div className="relative rounded-[50%] bg-white px-[45px] py-10 text-center text-base shadow-[0_3px_8px_rgba(0,0,0,.1)] sm:h-[413px] sm:pt-[32%]">
            {content.intro_text}
          </div>
        </div>
      ) : null}
    </SectionBox>
  );
}

export function ServiceBanner({ content }: { content: Record<string, any> }) {
  const options: Record<string, any>[] = content.options || [];
  return (
    <SectionBox className="text-center text-white">
      <div
        className="bg-cover bg-center"
        style={content.image_url ? { backgroundImage: `url(${assetUrl(content.image_url)})` } : { backgroundColor: '#00adef' }}
      >
        <div className="bg-[radial-gradient(ellipse,rgba(0,0,0,.45),rgba(0,0,0,.65))] px-5 py-[11%]">
          {content.heading ? (
            <div className="text-[34px] leading-tight max-sm:text-[24px]">
              <Emphasized text={content.heading} />
            </div>
          ) : null}
          {options.map((option, index) => (
            <div key={index} className="text-[29px] leading-tight max-sm:text-[20px]">
              {option.text}
            </div>
          ))}
          {content.button_label ? (
            <div className="mt-5">
              <RequestButton label={content.button_label} />
            </div>
          ) : null}
        </div>
      </div>
    </SectionBox>
  );
}

const CALLOUT_BUTTON = 'inline-block min-h-11 rounded-full bg-brand px-5 py-2.5 text-[15px] text-white hover:opacity-90';
// Icons for the points of a picture highlight that don't have their own yet.
const POINT_POSITIONS = ['0 0', '0 -22px', '0 -44px'];

type CalloutProps = { content: Record<string, any>; items: Record<string, any>[] };

function CalloutButton({ label }: { label?: string | null }) {
  return label ? <RequestButton label={label} className={CALLOUT_BUTTON} /> : null;
}

function IconCallout({ content, items }: CalloutProps) {
  return (
    <SectionBox className="border-2 border-brand bg-[url('/theme/rc-bg.webp')] bg-cover bg-bottom bg-no-repeat px-[31px] py-10 text-[15px] max-sm:p-5">
      {content.heading ? (
        <div className="mb-[25px] text-[21px] font-medium uppercase">
          <Emphasized text={content.heading} emphasisClass="font-medium text-brand" />
        </div>
      ) : null}
      <ul className="mb-5 grid gap-x-[34px] gap-y-5 md:grid-cols-3">
        {items.map((item, index) => (
          <li key={index} className="relative min-h-[45px] pl-[63px]">
            {item.icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assetUrl(item.icon_url)} alt="" loading="lazy" className="absolute left-0 top-0 h-[45px] w-[45px]" />
            ) : null}
            {item.text}
          </li>
        ))}
      </ul>
      <CalloutButton label={content.button_label} />
    </SectionBox>
  );
}

function PictureCallout({ content, items }: CalloutProps) {
  return (
    <SectionBox className="flex bg-mist text-[15px] max-md:flex-col">
      <div className="w-[396px] shrink-0 py-[30px] pl-[55px] pr-2.5 max-md:w-full max-md:px-5">
        {content.heading ? (
          <div className="mb-5 text-[28px] uppercase leading-tight">
            <Emphasized text={content.heading} />
          </div>
        ) : null}
        <ul className="mb-2.5 flex flex-wrap gap-x-2.5">
          {items.map((item, index) => (
            <li key={index} className="mb-2.5 flex items-center gap-2 font-medium">
              {item.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetUrl(item.icon_url)} alt="" loading="lazy" className="h-[22px] w-[22px]" />
              ) : (
                <span aria-hidden="true" className="h-[22px] w-[22px] bg-[url('/theme/cmpl.png')] bg-no-repeat" style={{ backgroundPosition: POINT_POSITIONS[index % POINT_POSITIONS.length] }} />
              )}
              {item.text}
            </li>
          ))}
        </ul>
        <CalloutButton label={content.button_label} />
      </div>
      <div className="min-w-0 flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assetUrl(content.image_url)} alt="" loading="lazy" className="h-full w-full object-cover object-right" />
      </div>
    </SectionBox>
  );
}

function StripCallout({ content }: CalloutProps) {
  return (
    <SectionBox className="flex items-center justify-between gap-4 bg-mist bg-[url('/theme/bg-callback.png')] bg-cover px-[30px] py-[15px] max-md:flex-col max-md:text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={assetUrl(content.image_url)} alt="" loading="lazy" className="h-[77px] w-[77px] shrink-0" />
      {content.heading ? (
        <div className="min-w-0 flex-1 text-center text-[26px] font-bold uppercase leading-tight max-sm:text-xl">
          <Emphasized text={content.heading} />
        </div>
      ) : null}
      <CalloutButton label={content.button_label} />
    </SectionBox>
  );
}

export function Callout({ content }: { content: Record<string, any> }) {
  const items: Record<string, any>[] = content.items || [];
  if (content.image_url) {
    return items.length ? <PictureCallout content={content} items={items} /> : <StripCallout content={content} items={items} />;
  }
  if (items.some((item) => item.icon_url)) return <IconCallout content={content} items={items} />;

  return (
    <SectionBox className="bg-mist p-8 max-sm:p-5">
      {content.heading ? (
        <div className="mb-5 text-center text-[26px] font-medium uppercase max-sm:text-xl">
          <Emphasized text={content.heading} />
        </div>
      ) : null}
      {items.length ? (
        <ul className="grid gap-x-5 gap-y-3 md:grid-cols-2">
          {items.map((item, index) => (
            <li key={index} className="bg-[url('/theme/li.png')] bg-[0_1px] bg-no-repeat pl-[34px]">
              {item.text}
            </li>
          ))}
        </ul>
      ) : null}
      {content.button_label ? (
        <div className="mt-5 text-center">
          <RequestButton label={content.button_label} />
        </div>
      ) : null}
    </SectionBox>
  );
}
