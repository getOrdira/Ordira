// src/components/forms/inputs/rich-text-editor.tsx

import React, { forwardRef, useCallback, useState, useRef } from 'react';
import { FieldWrapper, type FieldWrapperProps } from '../elements/field-wrapper';
import { useFieldState, type BaseFieldProps } from '../adapters/rhf/field';
import { cn } from '@/lib/utils/utils';

export interface RichTextEditorProps
  extends Omit<FieldWrapperProps, 'children'>,
    BaseFieldProps {
  // Content options
  placeholder?: string;
  maxLength?: number;
  showCharCount?: boolean;
  
  // Editor options
  toolbar?: string[];
  allowHtml?: boolean;
  sanitizeHtml?: boolean;
  minHeight?: number;
  
  className?: string;
}

export const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(({
  name,
  control,
  label,
  help,
  tooltip,
  required,
  optional,
  error,
  placeholder = 'Start typing...',
  maxLength,
  showCharCount = false,
  toolbar = ['bold', 'italic', 'underline', 'link', 'list'],
  allowHtml = true,
  sanitizeHtml = true,
  minHeight = 200,
  transformError,
  className,
  ...props
}, ref) => {
  const {
    field,
    error: fieldError,
    isLoading
  } = useFieldState(name, control);

  const [isFocused, setIsFocused] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const displayError = error || fieldError;
  const content = field.value || '';
  const characterCount = content.length;

  // Handle content change
  const handleContentChange = useCallback(() => {
    if (!editorRef.current) return;
    
    const htmlContent = editorRef.current.innerHTML;
    const textContent = editorRef.current.textContent || '';
    
    // Apply max length constraint
    if (maxLength && textContent.length > maxLength) {
      return;
    }
    
    const finalContent = allowHtml ? htmlContent : textContent;
    field.onChange(finalContent);
  }, [field, allowHtml, maxLength]);

  // Format text with simple commands
  const formatText = useCallback((command: string, value?: string) => {
    // Save current selection
    const currentSelection = window.getSelection();
    if (currentSelection && currentSelection.rangeCount > 0) {
      setSelection(currentSelection);
    }
    
    // Focus editor
    if (editorRef.current) {
      editorRef.current.focus();
    }
    
    // Execute format command
    try {
      document.execCommand(command, false, value);
      handleContentChange();
    } catch (error) {
      console.error('Format command failed:', error);
    }
  }, [handleContentChange]);

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          formatText('bold');
          break;
        case 'i':
          e.preventDefault();
          formatText('italic');
          break;
        case 'u':
          e.preventDefault();
          formatText('underline');
          break;
      }
    }
    
    // Handle max length
    if (maxLength && editorRef.current) {
      const textLength = editorRef.current.textContent?.length || 0;
      if (textLength >= maxLength && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
      }
    }
  }, [formatText, maxLength]);

  // Handle paste events
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    
    const text = e.clipboardData.getData('text/plain');
    const selection = window.getSelection();
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      handleContentChange();
    }
  }, [handleContentChange]);

  // Toolbar button component
  const ToolbarButton = ({ 
    action, 
    icon, 
    title, 
    active = false 
  }: { 
    action: () => void; 
    icon: React.ReactNode; 
    title: string; 
    active?: boolean;
  }) => (
    <button
      type="button"
      onClick={action}
      title={title}
      className={cn(
        'p-2 rounded-lg transition-colors',
        'hover:bg-[var(--background-secondary)]',
        active 
          ? 'bg-[var(--primary)]/10 text-[var(--primary)]' 
          : 'text-[var(--muted)] hover:text-[var(--foreground)]'
      )}
    >
      {icon}
    </button>
  );

  // Render toolbar
  const renderToolbar = () => (
    <div className="flex items-center gap-1 p-2 border-b border-[var(--border)]">
      {toolbar.includes('bold') && (
        <ToolbarButton
          action={() => formatText('bold')}
          title="Bold (Ctrl+B)"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
            </svg>
          }
        />
      )}
      
      {toolbar.includes('italic') && (
        <ToolbarButton
          action={() => formatText('italic')}
          title="Italic (Ctrl+I)"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 4L9 20M15 4l-6 16" />
            </svg>
          }
        />
      )}
      
      {toolbar.includes('underline') && (
        <ToolbarButton
          action={() => formatText('underline')}
          title="Underline (Ctrl+U)"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l-7-7 3-3 7 7-3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 13l-1.5-7.5L2.5 3l1.5 7.5L18 13z" />
            </svg>
          }
        />
      )}

      {toolbar.includes('link') && (
        <ToolbarButton
          action={() => {
            const url = prompt('Enter URL:');
            if (url) {
              formatText('createLink', url);
            }
          }}
          title="Add Link"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          }
        />
      )}

      {toolbar.includes('list') && (
        <>
          <ToolbarButton
            action={() => formatText('insertUnorderedList')}
            title="Bullet List"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            }
          />
          <ToolbarButton
            action={() => formatText('insertOrderedList')}
            title="Numbered List"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 8h18M3 12h18M3 16h18" />
              </svg>
            }
          />
        </>
      )}

      {toolbar.includes('quote') && (
        <ToolbarButton
          action={() => formatText('formatBlock', 'blockquote')}
          title="Quote"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          }
        />
      )}

      {toolbar.includes('code') && (
        <ToolbarButton
          action={() => formatText('formatBlock', 'pre')}
          title="Code Block"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          }
        />
      )}
    </div>
  );

  return (
    <FieldWrapper
      label={label}
      help={help}
      tooltip={tooltip}
      required={required}
      optional={optional}
      error={typeof displayError === 'string' ? displayError : Array.isArray(displayError) ? displayError.join(', ') : displayError?.message}
      className={className}
    >
      <div
        className={cn(
          'border rounded-xl bg-[var(--card-bg)] transition-all duration-200',
          isFocused 
            ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20' 
            : displayError 
              ? 'border-[var(--error)]' 
              : 'border-[var(--border)]',
          isLoading && 'opacity-50'
        )}
      >
        {/* Toolbar */}
        {renderToolbar()}

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable={!isLoading}
          onInput={handleContentChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={cn(
            'p-4 font-satoshi text-[var(--foreground)] focus:outline-none',
            'prose prose-sm max-w-none',
            '[&_blockquote]:border-l-4 [&_blockquote]:border-[var(--primary)] [&_blockquote]:pl-4 [&_blockquote]:italic',
            '[&_pre]:bg-[var(--background-secondary)] [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:font-mono [&_pre]:text-sm',
            '[&_ul]:list-disc [&_ul]:pl-6',
            '[&_ol]:list-decimal [&_ol]:pl-6'
          )}
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ 
            __html: content || (isFocused ? '' : `<span style="color: var(--input-placeholder);">${placeholder}</span>`)
          }}
        />

        {/* Character Count */}
        {showCharCount && maxLength && (
          <div className="flex justify-end p-2 border-t border-[var(--border)]">
            <span className={cn(
              'text-xs font-satoshi',
              characterCount > maxLength * 0.9 
                ? 'text-[var(--warning)]' 
                : 'text-[var(--caption-color)]'
            )}>
              {characterCount}/{maxLength}
            </span>
          </div>
        )}
      </div>

      {/* Hidden input for form compatibility */}
      <input
        type="hidden"
        name={field.name}
        value={field.value || ''}
      />
    </FieldWrapper>
  );
});

RichTextEditor.displayName = 'RichTextEditor';
