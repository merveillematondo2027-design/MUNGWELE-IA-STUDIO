# MUNGWELE — Musique vers clip visuel

## Objectif

Après une génération musicale terminée, l’utilisateur peut cliquer sur **Créer un clip visuel**. Le Studio Musique transmet alors au Studio Vidéo :

- l’identifiant de la génération musicale ;
- l’URL audio ;
- le titre ;
- la description créative ;
- la durée audio connue après génération.

Le transfert est stocké temporairement sous `mungwele.music-to-video` et un brouillon vidéo est ouvert automatiquement.

## État fournisseur

ElevenLabs propose aujourd’hui des fonctions Image & Video en bêta et du lip-sync avec audio, mais MUNGWELE ne considère pas encore cela comme un pipeline officiel **musique complète → clip vidéo synchronisé**. Le bouton est donc réservé dans l’UX, sans prétendre que Veo ou ElevenLabs synchronisent déjà une chanson entière.

## Contrat fournisseur futur

Le futur adaptateur audio→vidéo devra exposer au minimum :

```ts
interface MusicToVideoProvider {
  quote(input: {
    audioUrl: string;
    audioDurationSeconds: number;
    visualPrompt: string;
    aspectRatio: '16:9' | '9:16';
  }): Promise<{ credits: number; providerCostUsd: number }>;

  generate(input: {
    audioUrl: string;
    audioDurationSeconds: number;
    visualPrompt: string;
    aspectRatio: '16:9' | '9:16';
  }): Promise<{ resultUrl: string; provider: string; model: string }>;
}
```

## Règles de monétisation

- calcul du coût fournisseur avant débit ;
- marge MUNGWELE minimale configurable ;
- réservation des crédits avant appel coûteux ;
- remboursement automatique en cas d’échec ;
- aucune clé API côté navigateur ;
- aucun fournisseur présenté comme actif tant que son pipeline n’est pas réellement connecté et testé.
