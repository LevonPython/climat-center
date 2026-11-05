import { Image } from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { EditorContent, Extension, useEditor, type Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { assetUrl } from '../api';
import type { Lang } from '../contentSchemas/types';
import { localized } from '../lib/pages';
import { MediaPicker } from './MediaPicker';

const SAFE_LINK = /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i;
const TRAILING_BLANK_LINES = /(<p><\/p>)+$/;

function currentHtml(editor: Editor): string | null {
  return editor.isEmpty ? null : editor.getHTML().replace(TRAILING_BLANK_LINES, '');
}

// The site's stylesheet resets headings and lists, so the editing area restores them.
const CONTENT_CLASS = [
  'min-h-40 p-3 text-sm outline-none',
  '[&_h2]:mt-3 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-bold [&_h4]:mt-2 [&_h4]:font-bold',
  '[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
  '[&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_a]:underline [&_img]:my-2 [&_img]:max-w-full',
  '[&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2',
  '[&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-50 [&_th]:p-2'
].join(' ');

function ToolButton(props: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      aria-pressed={props.active ?? false}
      disabled={props.disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={props.onClick}
      className={[
        'min-h-11 min-w-11 rounded-lg border px-2 text-sm font-semibold disabled:opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500',
        props.active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
      ].join(' ')}
    >
      {props.children}
    </button>
  );
}

// Keeps the two-column look of an imported list when its text is edited here.
const ListColumns = Extension.create({
  name: 'listColumns',
  addGlobalAttributes: () => [
    {
      types: ['bulletList'],
      attributes: {
        class: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('class'),
          renderHTML: (attributes: Record<string, string | null>) => (attributes.class ? { class: attributes.class } : {})
        }
      }
    }
  ]
});

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const { t } = useTranslation();

  function editLink() {
    const current = editor.getAttributes('link').href as string | undefined;
    const answer = window.prompt(t('richText.linkPrompt'), current || '');
    if (answer === null) return;
    const href = answer.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    if (!SAFE_LINK.test(href)) {
      window.alert(t('richText.linkInvalid'));
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  }

  const chain = () => editor.chain().focus();
  const inTable = editor.isActive('table');

  return (
    <div role="toolbar" aria-label={t('richText.toolbar')} className="flex flex-wrap gap-1 border-b border-slate-200 p-2">
      <ToolButton label={t('richText.bold')} active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}>B</ToolButton>
      <ToolButton label={t('richText.italic')} active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()}>I</ToolButton>
      <ToolButton label={t('richText.underline')} active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()}>U</ToolButton>
      <ToolButton label={t('richText.heading2')} active={editor.isActive('heading', { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}>H2</ToolButton>
      <ToolButton label={t('richText.heading3')} active={editor.isActive('heading', { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()}>H3</ToolButton>
      <ToolButton label={t('richText.bulletList')} active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()}>•</ToolButton>
      <ToolButton label={t('richText.orderedList')} active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()}>1.</ToolButton>
      <ToolButton label={t('richText.quote')} active={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()}>”</ToolButton>
      <ToolButton label={t('richText.link')} active={editor.isActive('link')} onClick={editLink}>🔗</ToolButton>
      <ToolButton label={t('richText.image')} onClick={onImage}>🖼</ToolButton>
      <ToolButton label={t('richText.table')} active={inTable} disabled={inTable} onClick={() => chain().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()}>▦</ToolButton>
      {inTable ? (
        <>
          <ToolButton label={t('richText.addRow')} onClick={() => chain().addRowAfter().run()}>+↕</ToolButton>
          <ToolButton label={t('richText.addColumn')} onClick={() => chain().addColumnAfter().run()}>+↔</ToolButton>
          <ToolButton label={t('richText.deleteRow')} onClick={() => chain().deleteRow().run()}>−↕</ToolButton>
          <ToolButton label={t('richText.deleteColumn')} onClick={() => chain().deleteColumn().run()}>−↔</ToolButton>
          <ToolButton label={t('richText.deleteTable')} onClick={() => chain().deleteTable().run()}>✕▦</ToolButton>
        </>
      ) : null}
      <ToolButton label={t('richText.undo')} disabled={!editor.can().undo()} onClick={() => chain().undo().run()}>↶</ToolButton>
      <ToolButton label={t('richText.redo')} disabled={!editor.can().redo()} onClick={() => chain().redo().run()}>↷</ToolButton>
    </div>
  );
}

type RichTextEditorProps = {
  label: string;
  value: string | null;
  lang: Lang;
  invalid?: boolean;
  onChange: (html: string | null) => void;
};

export function RichTextEditor({ label, value, lang, invalid, onChange }: RichTextEditorProps) {
  const [picking, setPicking] = useState(false);
  const lastValue = useRef(value);
  // What the editor makes of the stored text, so opening it never counts as an edit.
  const loaded = useRef<{ value: string | null; html: string | null }>({ value, html: null });

  const editor = useEditor({
    // Only what the server's sanitizer keeps, so nothing an editor sees disappears on save.
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        link: { openOnClick: false }
      }),
      Image,
      TableKit,
      ListColumns
    ],
    content: value || '',
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { class: CONTENT_CLASS, role: 'textbox', 'aria-multiline': 'true', 'aria-label': label, lang }
    },
    onCreate: ({ editor: current }) => {
      loaded.current = { value: loaded.current.value, html: currentHtml(current) };
    },
    onUpdate: ({ editor: current }) => {
      const html = currentHtml(current);
      const next = html === loaded.current.html ? loaded.current.value : html;
      if (next === lastValue.current) return;
      lastValue.current = next;
      onChange(next);
    }
  });

  useEffect(() => {
    if (!editor || value === lastValue.current) return;
    lastValue.current = value;
    editor.commands.setContent(value || '', { emitUpdate: false });
    loaded.current = { value, html: currentHtml(editor) };
  }, [editor, value]);

  return (
    <div className="grid gap-1">
      <div className="text-xs font-bold text-slate-800">{label}</div>
      <div className={['overflow-hidden rounded-xl border bg-white focus-within:ring-2', invalid ? 'border-red-400 focus-within:ring-red-200' : 'border-slate-200 focus-within:ring-slate-300'].join(' ')}>
        {editor ? <Toolbar editor={editor} onImage={() => setPicking(true)} /> : null}
        <EditorContent editor={editor} />
      </div>
      {picking && editor ? (
        <MediaPicker
          // The new line keeps the image from staying selected, where the next insert would replace it.
          onPick={(asset) => editor.chain().focus().setImage({ src: assetUrl(asset.url), alt: localized(asset, 'alt', lang) }).createParagraphNear().run()}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </div>
  );
}
