import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { StudioType } from '../../types';
import { useApp } from '../../context/AppContext';

interface PromptEnhanceButtonProps {
  rawPrompt: string;
  type: StudioType;
  style?: string;
  mood?: string;
  details?: Record<string, any>;
  onEnhanced: (enhancedText: string) => void;
  className?: string;
}

export const PromptEnhanceButton: React.FC<PromptEnhanceButtonProps> = ({
  rawPrompt,
  type,
  style,
  mood,
  details,
  onEnhanced,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const { addNotification } = useApp();

  const handleEnhance = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!rawPrompt || rawPrompt.trim() === '') {
      addNotification(
        'warning',
        'Prompt vide',
        'Veuillez d\'abord écrire une idée ou quelques mots dans la zone de texte.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ai/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: rawPrompt,
          type,
          style,
          mood,
          details,
        }),
      });

      const data = await res.json();
      if (res.ok && data.enhancedPrompt) {
        onEnhanced(data.enhancedPrompt);
        addNotification(
          'success',
          'Prompt optimisé par IA ✨',
          data.explanation || 'Votre prompt a été enrichi avec un vocabulaire professionnel et des détails techniques.'
        );
      } else {
        throw new Error(data.error || 'Échec de l\'amélioration');
      }
    } catch (err: any) {
      console.warn('Enhance error:', err);
      addNotification(
        'info',
        'Mode local actif',
        'Le prompt a été enrichi avec les règles cinématographiques et visuelles.'
      );
      // Fallback enhancement
      const fallback = `Chef-d'œuvre haute fidélité : ${rawPrompt}. Cadrage dynamique, éclairage volumétrique doux, détails ultra-fins et texture réaliste.`;
      onEnhanced(fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      id={`btn-enhance-prompt-${type}`}
      onClick={handleEnhance}
      disabled={loading}
      className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/50 hover:to-pink-600/50 border border-purple-500/40 hover:border-pink-500/60 text-purple-200 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title="Améliorer automatiquement ce prompt avec l'IA"
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
          <span>Amélioration par IA...</span>
        </>
      ) : (
        <>
          <Sparkles className="w-3.5 h-3.5 text-pink-400 group-hover:rotate-12 transition-transform" />
          <span>Améliorer avec l'IA</span>
        </>
      )}
    </button>
  );
};
