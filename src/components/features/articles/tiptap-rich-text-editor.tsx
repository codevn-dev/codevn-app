'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { createLowlight } from 'lowlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { ResizableImage } from './tiptap-extensions/resizable-image';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import c from 'highlight.js/lib/languages/c';
import csharp from 'highlight.js/lib/languages/csharp';
import php from 'highlight.js/lib/languages/php';
import ruby from 'highlight.js/lib/languages/ruby';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import swift from 'highlight.js/lib/languages/swift';
import kotlin from 'highlight.js/lib/languages/kotlin';
import html from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import scss from 'highlight.js/lib/languages/scss';
import sql from 'highlight.js/lib/languages/sql';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import bash from 'highlight.js/lib/languages/bash';
import powershell from 'highlight.js/lib/languages/powershell';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ImageUpload } from '@/features/upload';

interface TiptapRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function TiptapEditorContent({
  value,
  onChange,
  placeholder = 'Write your content here...',
  className = '',
}: TiptapRichTextEditorProps) {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isImageUploadOpen, setIsImageUploadOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const lowlight = createLowlight({
    javascript,
    typescript,
    python,
    java,
    cpp,
    c,
    csharp,
    php,
    ruby,
    go,
    rust,
    swift,
    kotlin,
    html,
    css,
    scss,
    sql,
    json,
    yaml,
    markdown,
    bash,
    powershell,
    dockerfile,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default code block to use CodeBlockLowlight
        link: false, // Disable default link to use custom Link
        underline: false, // Disable default underline to use custom Underline
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      ResizableImage.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      TextStyle,
      Color,
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'dracula-code-block',
        },
        defaultLanguage: 'javascript',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[350px] p-4',
        placeholder: placeholder,
      },
    },
    immediatelyRender: false,
  });

  const insertLink = () => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setIsLinkModalOpen(false);
    }
  };

  const handleImageUploaded = (imageUrl: string) => {
    if (editor) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'resizableImage',
          attrs: { src: imageUrl },
        })
        .run();
    }
  };

  const ToolbarButton = ({
    onClick,
    isActive = false,
    children,
    title,
    disabled = false,
  }: {
    onClick: (e: React.MouseEvent) => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
    disabled?: boolean;
  }) => (
    <Button
      type="button"
      variant={isActive ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`h-8 w-8 p-0 ${isActive ? 'bg-blue-600 text-white' : ''}`}
    >
      {children}
    </Button>
  );

  if (!mounted || !editor) {
    return (
      <div className={`rounded-lg border border-gray-300 ${className}`}>
        <div className="flex h-[400px] items-center justify-center bg-gray-50">
          <div className="text-gray-500">Loading editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-gray-300 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border-b border-gray-200 bg-gray-50 p-2">
        {/* Text Formatting */}
        <div className="mr-2 flex items-center gap-1">
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().toggleBold().run();
            }}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().toggleItalic().run();
            }}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().toggleUnderline().run();
            }}
            isActive={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().toggleStrike().run();
            }}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Headings */}
        <div className="mr-2 flex items-center gap-1">
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().toggleHeading({ level: 1 }).run();
            }}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Type className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Lists */}
        <div className="mr-2 flex items-center gap-1">
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().toggleBulletList().run();
            }}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().toggleOrderedList().run();
            }}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Alignment */}
        <div className="mr-2 flex items-center gap-1">
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().setTextAlign('left').run();
            }}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().setTextAlign('center').run();
            }}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().setTextAlign('right').run();
            }}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().setTextAlign('justify').run();
            }}
            isActive={editor.isActive({ textAlign: 'justify' })}
            title="Justify"
          >
            <AlignJustify className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Special Elements */}
        <div className="mr-2 flex items-center gap-1">
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().toggleBlockquote().run();
            }}
            isActive={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().toggleCodeBlock().run();
            }}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().toggleCode().run();
            }}
            isActive={editor.isActive('code')}
            title="Inline Code"
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Color */}
        <div className="mr-2 flex items-center gap-1">
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().setColor('#ef4444').run();
            }}
            title="Red Text"
          >
            <Palette className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Links and Images */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsLinkModalOpen(true);
            }}
            title="Insert Link"
          >
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsImageUploadOpen(true);
            }}
            title="Upload Image"
          >
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>

      {/* Editor */}
      <div className="min-h-[350px]">
        <EditorContent editor={editor} />
      </div>

      {/* Link Modal */}
      {isLinkModalOpen && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Insert Link</h3>
            <input
              type="url"
              placeholder="Enter URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  insertLink();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsLinkModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  insertLink();
                }}
              >
                Insert Link
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {isImageUploadOpen && (
        <ImageUpload
          onImageUploaded={handleImageUploaded}
          onClose={() => setIsImageUploadOpen(false)}
        />
      )}
    </div>
  );
}

// Dynamic import wrapper to avoid SSR issues
const TiptapRichTextEditor = dynamic(() => Promise.resolve(TiptapEditorContent), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] rounded-lg border border-gray-300">
      <div className="flex h-[400px] items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    </div>
  ),
});

export { TiptapRichTextEditor };
