import { parseEmphasis } from '../../lib/emphasis';

export function Emphasized({ text, emphasisClass = 'font-normal text-brand' }: { text: string; emphasisClass?: string }) {
  return (
    <>
      {parseEmphasis(text).map((part, index) =>
        part.emphasized ? (
          <b key={index} className={emphasisClass}>
            {part.text}
          </b>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  );
}
