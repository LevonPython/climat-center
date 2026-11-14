import { Head, Html, Main, NextScript, type DocumentProps } from 'next/document';
import { textDirection } from '../lib/direction';

export default function Document({ locale }: DocumentProps) {
  return (
    <Html dir={textDirection(locale)}>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
