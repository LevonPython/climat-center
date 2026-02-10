import Head from 'next/head';
import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

export function Layout(props: { title?: string; children: ReactNode }) {
  return (
    <>
      <Head>
        <title>{props.title ? `${props.title} | Центр климата` : 'Центр климата'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-6xl px-4 py-8">{props.children}</div>
        </main>
        <Footer />
      </div>
    </>
  );
}

