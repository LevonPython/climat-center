import { assetUrl } from '../../lib/assets';
import { Emphasized } from '../site/Emphasized';
import { RichText } from '../site/RichText';
import { BlockTitle, PlainTitle, SectionBox } from './shared';

export function RichTextSection({ content }: { content: Record<string, any> }) {
  return (
    <SectionBox>
      <PlainTitle text={content.heading} />
      {content.body ? <RichText html={content.body} /> : null}
    </SectionBox>
  );
}

export function ImageText({ content }: { content: Record<string, any> }) {
  const labels: Record<string, any>[] = content.labels || [];
  const picture = (
    <div className="min-w-0 flex-1 basis-[320px]">
      {labels[0] ? <div className="pb-5 text-right text-[15px] font-medium uppercase">{labels[0].text}</div> : null}
      {content.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={assetUrl(content.image_url)} alt="" loading="lazy" className="mx-auto max-w-full" />
      ) : null}
      {labels.slice(1).map((label, index) => (
        <div key={index} className="pt-3 text-[15px] font-medium uppercase">
          {label.text}
        </div>
      ))}
    </div>
  );
  const text = content.body ? (
    <div className="relative min-w-0 flex-1 basis-[320px] border border-leaf p-6 text-base font-light">
      <RichText html={content.body} />
    </div>
  ) : null;
  return (
    <SectionBox>
      <BlockTitle text={content.heading} />
      <div className="flex flex-wrap gap-5">
        {content.image_side === 'right' ? (
          <>
            {text}
            {picture}
          </>
        ) : (
          <>
            {picture}
            {text}
          </>
        )}
      </div>
    </SectionBox>
  );
}

export function Faq({ content }: { content: Record<string, any> }) {
  const items: Record<string, any>[] = content.items || [];
  return (
    <SectionBox>
      <PlainTitle text={content.heading} />
      <div className="divide-y divide-[#d8e4e9]">
        {items.map((item, index) => (
          <details key={index} className="group py-3">
            <summary className="min-h-11 cursor-pointer py-2 font-medium text-brand">{item.question}</summary>
            {item.answer ? <RichText html={item.answer} className="pt-2" /> : null}
          </details>
        ))}
      </div>
    </SectionBox>
  );
}

export function ErrorCodes({ content }: { content: Record<string, any> }) {
  const items: Record<string, any>[] = content.items || [];
  return (
    <SectionBox>
      <PlainTitle text={content.heading} />
      {items.map((item, index) => (
        <details key={index} className="border-b border-[#d8e4e9] py-2" open={index === 0}>
          <summary className="min-h-11 cursor-pointer py-2 font-medium uppercase">
            <Emphasized text={item.brand || ''} />
          </summary>
          {item.codes ? <RichText html={item.codes} className="pt-2" /> : null}
        </details>
      ))}
    </SectionBox>
  );
}
