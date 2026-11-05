import { useTranslation } from 'next-i18next';
import { useRef, type ReactNode } from 'react';

const ARROW = 'grid h-11 w-11 shrink-0 place-items-center rounded-full text-2xl text-brand hover:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand';

type CarouselProps = {
  children: ReactNode;
  label: string;
  arrowsBelow?: boolean;
};

export function Carousel({ children, label, arrowsBelow = false }: CarouselProps) {
  const { t } = useTranslation('common');
  const track = useRef<HTMLDivElement>(null);
  const move = (direction: number) => {
    const node = track.current;
    node?.scrollBy?.({ left: direction * Math.max(node.clientWidth * 0.8, 200), behavior: 'smooth' });
  };
  const previous = (
    <button type="button" aria-label={t('sections.previous')} className={ARROW} onClick={() => move(-1)}>
      ‹
    </button>
  );
  const next = (
    <button type="button" aria-label={t('sections.next')} className={ARROW} onClick={() => move(1)}>
      ›
    </button>
  );
  const items = (
    <div ref={track} role="group" aria-label={label} className="flex min-w-0 flex-1 snap-x gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  );

  if (arrowsBelow) {
    return (
      <div>
        {items}
        <div className="mt-3 flex justify-center gap-2">
          {previous}
          {next}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {previous}
      {items}
      {next}
    </div>
  );
}
