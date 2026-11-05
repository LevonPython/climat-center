import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { Carousel } from '../site/Carousel';
import { BlockTitle, PlainTitle, SectionBox, usePriceLabel } from './shared';

const PREVIEW_ROWS = 2;
const PRICE_ROW = 'flex flex-wrap border-b border-[#d8e4e9]';

export function PriceCards({ content }: { content: Record<string, any> }) {
  const { t } = useTranslation('common');
  const priceLabel = usePriceLabel();
  const items: Record<string, any>[] = content.items || [];
  return (
    <SectionBox>
      <BlockTitle text={content.heading} />
      <Carousel label={t('sections.prices')} arrowsBelow>
        {items.map((item, index) => (
          <div key={index} className="flex w-[210px] shrink-0 snap-start flex-col text-center">
            <div className="min-h-[125px] flex-1 border border-b-0 border-leaf px-2.5 pb-8 pt-4 text-base">{item.title}</div>
            <div className="-mt-[25px] self-center bg-leaf-strong px-6 py-2.5 text-xl font-semibold text-white">{priceLabel(item.price)}</div>
          </div>
        ))}
      </Carousel>
    </SectionBox>
  );
}

export function PriceList({ content }: { content: Record<string, any> }) {
  const { t } = useTranslation('common');
  const priceLabel = usePriceLabel();
  const [expanded, setExpanded] = useState(false);
  const items: Record<string, any>[] = content.items || [];
  // Only grouped lists fold, as on the original. A plain table of prices stays whole.
  const folds = Boolean(content.group_title) && items.length > PREVIEW_ROWS;

  return (
    <section className="mb-5">
      <PlainTitle text={content.heading} />
      <div className="bg-mist">
        <div className={`px-[30px] pt-5 max-sm:px-3 ${folds ? '' : 'pb-5'}`}>
          {content.group_title ? (
            <div className={PRICE_ROW}>
              <div className="min-w-0 flex-[3_1_220px] py-2 pr-4 text-lg font-medium uppercase">{content.group_title}</div>
              {content.group_price ? <div className="flex-[1_1_100px] py-2 text-center text-lg font-medium">{content.group_price}</div> : null}
            </div>
          ) : null}
          {items.map((item, index) => (
            // Folded rows stay in the page, so search engines still read them.
            <div key={index} hidden={folds && !expanded && index >= PREVIEW_ROWS}>
              <div className={`${PRICE_ROW} text-[15px]`}>
                <div className="min-w-0 flex-[3_1_220px] py-2 pr-4">{item.title}</div>
                <div className="flex-[1_1_100px] py-2 text-center text-lg font-medium text-brand">{priceLabel(item.price)}</div>
              </div>
            </div>
          ))}
        </div>
        {folds ? (
          <button
            type="button"
            aria-expanded={expanded}
            className="block min-h-11 w-full bg-brand px-[30px] py-3 text-left text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white max-sm:px-3"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="border-b border-dashed border-white">{t(expanded ? 'sections.collapsePrices' : 'sections.showAllPrices')}</span>
            <span aria-hidden="true" className="ml-2">
              {expanded ? '▴' : '▾'}
            </span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
