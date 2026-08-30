import React, { useEffect, useState } from 'react';
import { GenerationProgressCard } from './GenerationProgressCard';

type Activity = {
  kind: 'image' | 'video';
  completed: boolean;
  label: string;
};

const getUrl = (input: RequestInfo | URL) => {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

export const GenerationActivityOverlay: React.FC = () => {
  const [activity, setActivity] = useState<Activity | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = getUrl(input);
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const isImageGeneration = method === 'POST' && url.includes('/api/generate/image');
      const isVideoGeneration = method === 'POST' && url.includes('/api/generate/video');

      if (!isImageGeneration && !isVideoGeneration) return originalFetch(input, init);

      const kind: Activity['kind'] = isImageGeneration ? 'image' : 'video';
      setActivity({ kind, completed: false, label: kind === 'image' ? 'MUNGWELE AI crée votre image' : 'MUNGWELE AI génère votre vidéo' });

      try {
        const response = await originalFetch(input, init);
        if (response.ok) {
          setActivity((current) => current ? { ...current, completed: true } : current);
          window.setTimeout(() => setActivity(null), 800);
        } else {
          window.setTimeout(() => setActivity(null), 350);
        }
        return response;
      } catch (error) {
        setActivity(null);
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (!activity) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#050914]/82 px-3 py-6 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex min-h-full w-full max-w-4xl items-center justify-center">
        <GenerationProgressCard
          kind={activity.kind}
          completed={activity.completed}
          title={activity.label}
          subtitle={activity.kind === 'image' ? 'Image • traitement sécurisé en cours' : 'Vidéo • génération et encodage en cours'}
        />
      </div>
    </div>
  );
};
