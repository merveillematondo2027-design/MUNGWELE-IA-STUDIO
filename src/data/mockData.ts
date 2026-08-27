import { PlanConfig, UserProfile, ApiProviderSetting } from '../types';

export const INITIAL_USER: UserProfile = {
  id: 'usr-demo-01',
  name: 'Merveille Matondo',
  email: 'merveillematondo2027@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  role: 'admin',
  status: 'active',
  credits: 185,
  plan: 'creator',
  totalGenerations: 24,
  createdAt: '2025-01-15T10:00:00.000Z',
};

export const DEMO_USERS: UserProfile[] = [
  INITIAL_USER,
  {
    id: 'usr-demo-02',
    name: 'Sarah Connor',
    email: 'sarah.c@studio.ai',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
    role: 'user',
    status: 'active',
    credits: 45,
    plan: 'free',
    totalGenerations: 8,
    createdAt: '2025-02-10T14:20:00.000Z',
  },
  {
    id: 'usr-demo-03',
    name: 'Alexandre Dumas',
    email: 'alex.dumas@creators.io',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    role: 'user',
    status: 'active',
    credits: 920,
    plan: 'pro',
    totalGenerations: 114,
    createdAt: '2024-11-05T09:15:00.000Z',
  },
  {
    id: 'usr-demo-04',
    name: 'David Kasongo',
    email: 'david.k@enterprise.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    role: 'user',
    status: 'blocked',
    credits: 0,
    plan: 'free',
    totalGenerations: 3,
    createdAt: '2025-02-01T16:45:00.000Z',
  },
];

export const SUBSCRIPTION_PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Découverte',
    priceMonth: 0,
    creditsMonthly: 50,
    popular: false,
    features: [
      '50 crédits d\'essai offerts',
      'Génération d\'images Standard HD',
      'Résolution 720p pour vidéos',
      'Studio Musique en mode découverte',
      'Bibliothèque jusqu\'à 20 créations',
      'Support standard',
    ],
    maxVideoDuration: 5,
    veo3Access: false,
    supportLevel: 'Communauté',
  },
  {
    id: 'creator',
    name: 'Créateur',
    priceMonth: 19,
    creditsMonthly: 500,
    popular: true,
    features: [
      '500 crédits renouvelés chaque mois',
      'Génération d\'images 4K Ultra HD',
      'Accès complet à Google Veo 3 (10s)',
      'Génération musicale Suno / Lyria haute fidélité',
      'Amélioration illimitée des prompts par IA',
      'Téléchargement sans filigrane',
      'Bibliothèque illimitée',
      'Support prioritaire par email',
    ],
    maxVideoDuration: 10,
    veo3Access: true,
    supportLevel: 'Prioritaire',
  },
  {
    id: 'pro',
    name: 'Pro Studio',
    priceMonth: 49,
    creditsMonthly: 2000,
    popular: false,
    features: [
      '2 000 crédits mensuels',
      'Rendu prioritaire sur GPU haute performance',
      'Qualité Studio Master (Images 8K & Vidéos 4K HDR)',
      'Multi-scènes et génération continue avec Veo 3',
      'Pistes musicales multipistes avec paroles complètes',
      'Droits commerciaux complets & certificats',
      'Accès API développeur & Webhooks',
      'Support dédié 24/7 par chat et visio',
    ],
    maxVideoDuration: 10,
    veo3Access: true,
    supportLevel: 'Dédié 24/7',
  },
];

export const CREDIT_PACKS = [
  { id: 'pack-starter', name: 'Pack Starter', credits: 100, price: 5, bonus: 0 },
  { id: 'pack-booster', name: 'Pack Booster', credits: 300, price: 12, bonus: 20 },
  { id: 'pack-pro', name: 'Pack Studio Pro', credits: 1000, price: 30, bonus: 100 },
];

export const STYLE_PRESETS_IMAGE = [
  { id: 'realistic', label: 'Réaliste', icon: '📸', desc: 'Photos reflex haute précision et lumière naturelle' },
  { id: '3d', label: '3D Render', icon: '🧊', desc: 'Rendu Octane 3D hyper-détaillé' },
  { id: 'cinematic', label: 'Cinématique', icon: '🎬', desc: 'Ambiance cinéma 8K, éclairage volumétrique' },
  { id: 'illustration', label: 'Illustration', icon: '🎨', desc: 'Art digital moderne et soigné' },
  { id: 'anime', label: 'Anime', icon: '⛩️', desc: 'Style animation japonaise dynamique' },
  { id: 'product', label: 'Produit pub', icon: '✨', desc: 'Packshot publicitaire haute définition' },
  { id: 'logo', label: 'Logo / Vecteur', icon: '💎', desc: 'Identité visuelle vectorielle minimaliste' },
  { id: 'artistic', label: 'Artistique', icon: '🖌️', desc: 'Peinture numérique et texture sur toile' },
];

export const STYLE_PRESETS_VIDEO = [
  { id: 'cinematic', label: 'Cinématique', icon: '🎥', desc: 'Prises de vue de film, travelling dynamique 60fps' },
  { id: 'commercial', label: 'Publicitaire', icon: '🛍️', desc: 'Couleurs éclatantes, rythme dynamique haut de gamme' },
  { id: 'realistic', label: 'Réaliste', icon: '📹', desc: 'Mouvements fluides naturels en haute définition' },
  { id: '3d_animation', label: 'Animation 3D', icon: '🧸', desc: 'Style Pixar / DreamWorks volumétrique' },
  { id: 'social_media', label: 'Réseaux sociaux', icon: '📱', desc: 'Format vertical accrocheur pour TikTok et Reels' },
  { id: 'music_clip', label: 'Clip musical', icon: '🎵', desc: 'Effets visuels rythmés et néons vibrants' },
];

export const GENRE_PRESETS_MUSIC = [
  { id: 'Afrobeats', label: 'Afrobeats', icon: '🥁', desc: 'Rythmique entraînante, percussions africaines & cuivres' },
  { id: 'Electro', label: 'Électronique / EDM', icon: '⚡', desc: 'Synthétiseurs euphoriques et drops puissants' },
  { id: 'Hip-hop', label: 'Hip-Hop / Rap', icon: '🎤', desc: 'Basses 808 percutantes, flow dynamique' },
  { id: 'Pop', label: 'Pop Moderne', icon: '✨', desc: 'Mélodies accrocheuses et production studio propre' },
  { id: 'Cinematic', label: 'Cinématique', icon: '🎻', desc: 'Orchestre symphonique grandiose et émouvant' },
  { id: 'R&B', label: 'R&B & Soul', icon: '🎹', desc: 'Harmonies vocales soyeuses et groove chaleureux' },
  { id: 'Lo-fi', label: 'Lo-Fi Chill', icon: '☕', desc: 'Ambiance feutrée, vinyle doux et détente' },
  { id: 'Gospel', label: 'Gospel & Choir', icon: '🕊️', desc: 'Voix harmonieuses, piano et ferveur' },
];

export const MOOD_PRESETS_MUSIC = [
  { id: 'Énergique', label: 'Énergique', icon: '🔥' },
  { id: 'Joyeux', label: 'Joyeux', icon: '☀️' },
  { id: 'Mélancolique', label: 'Mélancolique', icon: '🌧️' },
  { id: 'Épique', label: 'Épique', icon: '🚀' },
  { id: 'Chill', label: 'Chill & Relax', icon: '🌿' },
  { id: 'Romantique', label: 'Romantique', icon: '💖' },
];

export const MUSIC_GENRES = GENRE_PRESETS_MUSIC;
export const MUSIC_MOODS = MOOD_PRESETS_MUSIC;

export const PROMPT_TEMPLATES = {
  image: [
    "Portrait d'une reine guerrière africaine avec parures dorées et reflets bioluminescents en 8K",
    "Mégalopole futuriste à Kinshasa en 2080 avec gratte-ciels de cristal et trains suspendus au crépuscule",
    "Packshot de parfum de luxe flottant au milieu de pétales de fleurs et d'eau cristalline",
    "Robot barista bienveillant servant un café dans une ambiance cosy sous la pluie à Tokyo",
  ],
  video: [
    "Plan de drone époustouflant au-dessus des chutes avec brume arc-en-ciel et lever de soleil doré en 4K",
    "Vaisseau spatial traversant une nébuleuse violette et rose avec poussières d'étoiles scintillantes",
    "Publicité luxe pour une montre connectée avec éclaboussures d'eau au ralenti et lumière cinématique",
    "Travelling fluide dans une rue illuminée de néons cyberpunk sous une pluie fine à 60fps",
  ],
  music: [
    "Morceau Afrobeats solaire et festif avec kalimba, section de cuivres live, basse 808 et chant entraînant",
    "Rumba douce acoustique avec guitare mélodique solo, percussions chaudes et chant poétique",
    "Electro house énergique avec montée euphorique, synthés analogiques et drop percutant",
    "Ballade au piano à queue et cordes émouvantes avec refrain puissant et voix soul",
  ],
};
