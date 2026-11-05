import type { GetServerSideProps } from 'next';
import { buildRobots } from '../lib/seo';

export default function Robots() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, s-maxage=86400');
  res.write(buildRobots());
  res.end();
  return { props: {} };
};
