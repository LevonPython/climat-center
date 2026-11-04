import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RichTextEditor } from '../src/components/RichTextEditor';

jest.mock('../src/api', () => ({ apiFetch: jest.fn(), assetUrl: (url: string) => url }));

describe('RichTextEditor with the real editor', () => {
  beforeAll(() => {
    // jsdom has no layout, and ProseMirror asks for it when it scrolls the cursor into view.
    Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
    Range.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}) });
    document.elementFromPoint = () => null;
  });

  test.each([
    ['a heading', '<h2>Վերնագիր</h2>'],
    ['a list', '<ul><li><p>Կետ</p></li></ul>'],
    ['a table', '<table><tbody><tr><th><p>Ա</p></th></tr></tbody></table>']
  ])('opening content that ends in %s does not count as an edit', async (_name, html) => {
    const onChange = jest.fn();
    render(<RichTextEditor label="Текст" value={html} lang="hy" onChange={onChange} />);

    const box = await screen.findByRole('textbox', { name: 'Текст' });
    fireEvent.focus(box);
    fireEvent.click(screen.getByRole('button', { name: 'Жирный' }));
    fireEvent.click(screen.getByRole('button', { name: 'Жирный' }));

    await waitFor(() => expect(box.innerHTML).not.toBe(''));
    expect(onChange).not.toHaveBeenCalled();
  });

  test('a blank line left at the end is not saved', async () => {
    const onChange = jest.fn();
    render(<RichTextEditor label="Текст" value="<p>Տեքստ</p>" lang="hy" onChange={onChange} />);
    await screen.findByRole('textbox', { name: 'Текст' });

    fireEvent.click(screen.getByRole('button', { name: 'Маркированный список' }));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const saved = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(saved).toContain('<ul>');
    expect(saved).not.toMatch(/<p><\/p>$/);
  });

  test('new content from outside replaces what is shown, without reporting an edit', async () => {
    const onChange = jest.fn();
    const { rerender } = render(<RichTextEditor label="Текст" value="<p>Հին</p>" lang="hy" onChange={onChange} />);
    const box = await screen.findByRole('textbox', { name: 'Текст' });

    rerender(<RichTextEditor label="Текст" value="<p>Նոր</p>" lang="hy" onChange={onChange} />);

    await waitFor(() => expect(box).toHaveTextContent('Նոր'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
