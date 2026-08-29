import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Settings, Sparkles, Loader2, Image as ImageIcon, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface StudioComposerProps {
  onGenerate: (prompt: string, attachment: File | null) => void;
  onOpenSettings: () => void;
  isGenerating: boolean;
  placeholder?: string;
  allowAttachments?: boolean;
}

export const StudioComposer: React.FC<StudioComposerProps> = ({
  onGenerate,
  onOpenSettings,
  isGenerating,
  placeholder = "Décrivez ce que vous souhaitez générer...",
  allowAttachments = false
}) => {
  const [prompt, setPrompt] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt, attachment);
    setPrompt('');
    setAttachment(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-auto">
      <form onSubmit={handleSubmit} className="relative bg-[#0a1020] border border-white/10 rounded-3xl shadow-2xl p-2 pb-2 transition-all hover:border-white/20 focus-within:border-purple-500/50">
        
        {attachment && (
          <div className="px-4 pt-2 pb-2">
            <div className="relative inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-xs text-gray-300">
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              <span className="truncate max-w-[200px]">{attachment.name}</span>
              <button 
                type="button" 
                onClick={() => setAttachment(null)}
                className="ml-2 text-gray-500 hover:text-white"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2 px-2 pb-1 pt-1">
          {allowAttachments && (
            <div className="relative shrink-0 mb-1">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <label 
                htmlFor="file-upload"
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </label>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            className="flex-1 max-h-[200px] min-h-[52px] bg-transparent text-white placeholder-gray-500 resize-none outline-none p-3.5 text-sm md:text-base scrollbar-hide"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          <div className="flex items-center gap-2 shrink-0 mb-1">
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Paramètres avancés"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <button
              type="submit"
              disabled={!prompt.trim() || isGenerating}
              className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center min-w-[52px]"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </form>
      
      <div className="text-center mt-3 flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-gray-500 font-medium">
        <Sparkles className="w-3 h-3 text-purple-500/70" />
        L'IA peut générer des erreurs. En validant, vous acceptez les conditions de Mungwele IA Studio.
      </div>
    </div>
  );
};
