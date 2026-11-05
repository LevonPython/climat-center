export type EmphasisPart = { text: string; emphasized: boolean };

// Editors mark the highlighted part of a heading as **like this**.
export function parseEmphasis(text: string): EmphasisPart[] {
  return text
    .split('**')
    .map((part, index) => ({ text: part, emphasized: index % 2 === 1 }))
    .filter((part) => part.text.length > 0);
}
