
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Save, X, Wand2 } from 'lucide-react';
import { Note } from '@/hooks/useNotes';
import MarkdownRenderer from '@/components/chat/MarkdownRenderer';
import { Citation } from '@/types/message';
import { supabase } from '@/integrations/supabase/client';

interface NoteEditorProps {
  note?: Note;
  onSave: (title: string, content: string) => void;
  onDelete?: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  onCitationClick?: (citation: Citation) => void;
}

const NoteEditor = ({ note, onSave, onDelete, onCancel, isLoading, onCitationClick }: NoteEditorProps) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  // AI response notes should NEVER be in edit mode - they're read-only
  const [isEditing, setIsEditing] = useState(!note || note.source_type === 'user');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

  useEffect(() => {
    setTitle(note?.title || '');
    setContent(note?.content || '');
    // AI response notes should NEVER be editable - they open in view mode
    setIsEditing(!note || note.source_type === 'user');
  }, [note]);

  const handleSave = () => {
    if (title.trim() && content.trim()) {
      onSave(title.trim(), content.trim());
    }
  };

  const handleEdit = () => {
    // Only allow editing of user notes, not AI responses
    if (note?.source_type === 'ai_response') {
      console.log('NoteEditor: Cannot edit AI response note');
      return;
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      // AI response notes should return to view mode, user notes can be cancelled
      setIsEditing(note.source_type === 'ai_response' ? false : false);
    } else {
      onCancel();
    }
  };

  const handleGenerateTitle = async () => {
    if (!note || note.source_type !== 'ai_response') return;
    
    setIsGeneratingTitle(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-note-title', {
        body: { content: note.content }
      });
      
      if (error) throw error;
      
      if (data?.title) {
        setTitle(data.title);
      }
    } catch (error) {
      console.error('Error generating title:', error);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  // Parse AI response content if it's structured
  const parseContent = (contentStr: string) => {
    try {
      const parsed = JSON.parse(contentStr);
      if (parsed.segments && parsed.citations) {
        return parsed;
      }
    } catch (e) {
      // Not JSON, return as string
    }
    return contentStr;
  };

  const isAIResponse = note?.source_type === 'ai_response';
  const parsedContent = isAIResponse ? parseContent(content) : content;

  if (!isEditing && note) {
    // View mode for existing notes
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">
              {isAIResponse ? 'AI Response' : 'Note'}
            </h3>
            <div className="flex items-center space-x-2">
              {!isAIResponse && (
                <Button variant="ghost" size="sm" onClick={handleEdit}>
                  Edit
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-auto">
          {isAIResponse && typeof parsedContent === 'object' ? (
            <MarkdownRenderer 
              content={parsedContent}
              className="prose max-w-none"
              onCitationClick={onCitationClick}
            />
          ) : (
            <div className="whitespace-pre-wrap text-gray-700">{typeof parsedContent === 'string' ? parsedContent : content}</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-between">
            <div>
              {note && onDelete && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onDelete}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {note?.created_at && new Date(note.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Edit mode (only for user notes or new notes)
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">
            {note ? 'Edit Note' : 'New Note'}
          </h3>
          <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex space-x-2 mb-4">
          <Input
            placeholder="Note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1"
          />
          {isAIResponse && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleGenerateTitle}
              disabled={isGeneratingTitle}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              {isGeneratingTitle ? 'Generating...' : 'Generate Title'}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden">
        <Textarea
          placeholder="Write your note here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full resize-none border-0 focus-visible:ring-0 p-0"
        />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex justify-between">
          <div>
            {note && onDelete && !isAIResponse && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDelete}
                disabled={isLoading}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
          <Button 
            onClick={handleSave}
            disabled={!title.trim() || !content.trim() || isLoading}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
