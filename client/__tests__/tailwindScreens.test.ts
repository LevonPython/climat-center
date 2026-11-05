import fs from 'fs';
import path from 'path';

const tailwindConfig = require('../tailwind.config.js');

const CLIENT_DIR = path.join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('tailwind screens', () => {
  // A custom max-width screen turns off Tailwind's automatic max-* variants, so an undefined one silently does nothing.
  test('every max-* variant in use is defined in the config', () => {
    const used = new Set<string>();
    for (const dir of ['components', 'pages']) {
      for (const file of sourceFiles(path.join(CLIENT_DIR, dir))) {
        const source = fs.readFileSync(file, 'utf8');
        for (const match of source.matchAll(/\b(max-[a-z0-9]+):/g)) used.add(match[1]);
      }
    }

    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter((name) => !tailwindConfig.theme.extend.screens[name])).toEqual([]);
  });

  test('max-* screens run widest first, so the narrower one wins', () => {
    const widths = Object.values(tailwindConfig.theme.extend.screens as Record<string, string | { max?: string }>)
      .flatMap((screen) => (typeof screen === 'object' && screen.max ? [parseInt(screen.max, 10)] : []));
    expect(widths.length).toBeGreaterThan(1);
    expect(widths).toEqual([...widths].sort((a, b) => b - a));
  });
});
