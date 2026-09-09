# MUNGWELE IA STUDIO — Migration Firebase Hosting + Cloud Run

## Objectif

Séparer proprement le frontend statique de MUNGWELE IA STUDIO et le serveur Node/Express qui exécute les générations IA, téléchargements et paiements.

Architecture cible :

- **Firebase Hosting classique** : HTML, CSS, JavaScript, PWA et navigation SPA.
- **Cloud Run `mungwele-ia-api`** : API Express, générations OpenAI / Gemini / Veo / ElevenLabs, téléchargements, paiements et callbacks.
- **Firebase Auth / Firestore / Storage** : identité, données utilisateur, jobs, crédits et médias persistants.
- **Appels longs** (`/api/generate/**` et `/api/media/download`) : le navigateur appelle **directement Cloud Run** afin de ne pas passer par la limite de requête Firebase Hosting.
- **API courtes** et callbacks : `/api/**` reste aussi disponible en same-origin via la rewrite Firebase Hosting vers Cloud Run.

Firebase Hosting impose actuellement un timeout de 60 secondes sur les requêtes réécrites vers Cloud Run. Cloud Run permet un timeout de service jusqu'à 60 minutes. Les générations longues doivent donc utiliser l'URL Cloud Run directe.

Sources officielles :
- https://firebase.google.com/docs/hosting/cloud-run
- https://cloud.google.com/run/docs/configuring/request-timeout
- https://cloud.google.com/run/docs/deploying-source-code

## Paramètres retenus

- Projet Google Cloud / Firebase : `diablo-design-ai`
- Service Cloud Run : `mungwele-ia-api`
- Région : `europe-west1`
- Port conteneur : `8080`
- Timeout initial : `900s` (15 minutes)
- CPU : `1`
- Mémoire : `1Gi`
- Minimum : `1` instance
- Maximum initial : `20` instances
- Concurrence initiale : `20`

`europe-west1` fait partie des régions recommandées par Firebase Hosting pour la colocalisation des backends réécrits et est cohérente avec un service destiné notamment à l'Afrique.

## 1. Préparation locale

Depuis la racine du dépôt :

```bash
npm install
npm run lint
npm run build
```

Le dépôt contient un `Dockerfile`. Un déploiement Cloud Run avec `--source .` utilisera ce Dockerfile automatiquement.

## 2. Activer les services Google Cloud

```bash
gcloud config set project diablo-design-ai

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

## 3. Secrets

Ne jamais placer une vraie clé API dans GitHub, `firebase.json`, le frontend ou une variable `VITE_*`.

Le secret Gemini existant connu par l'ancienne configuration App Hosting est :

```text
gemini-api-key
```

Les autres clés privées doivent être créées ou réutilisées dans Secret Manager selon leur fournisseur : OpenAI, ElevenLabs, Runway, Market-Cash, M-Pesa, etc.

Exemple pour vérifier les secrets disponibles :

```bash
gcloud secrets list --project=diablo-design-ai
```

## 4. Déployer le serveur Cloud Run

Premier déploiement minimal avec le secret Gemini déjà connu :

```bash
gcloud run deploy mungwele-ia-api \
  --source . \
  --project diablo-design-ai \
  --region europe-west1 \
  --allow-unauthenticated \
  --timeout 900s \
  --concurrency 20 \
  --min 1 \
  --max 20 \
  --memory 1Gi \
  --cpu 1 \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

`--allow-unauthenticated` rend le point d'entrée HTTP joignable par le navigateur. Les routes de génération restent protégées au niveau applicatif par le token Firebase ID envoyé dans `Authorization: Bearer ...` et vérifié par Firebase Admin.

Ajouter ensuite les autres secrets nécessaires au runtime. Exemple de forme générale :

```bash
gcloud run services update mungwele-ia-api \
  --project diablo-design-ai \
  --region europe-west1 \
  --update-secrets OPENAI_API_KEY=NOM_DU_SECRET_OPENAI:latest,ELEVENLABS_API_KEY=NOM_DU_SECRET_ELEVENLABS:latest
```

Ne pas recopier les valeurs secrètes dans la commande : utiliser les noms Secret Manager.

## 5. Firebase Admin sur Cloud Run

Dans le même projet Google Cloud, `server/firebaseAdmin.ts` peut utiliser **Application Default Credentials**. Le secret `FIREBASE_SERVICE_ACCOUNT_JSON` ne doit pas être nécessaire si le compte de service d'exécution Cloud Run dispose des droits requis sur Firestore, Firebase Authentication et Cloud Storage.

Vérifier le compte de service utilisé :

```bash
gcloud run services describe mungwele-ia-api \
  --project diablo-design-ai \
  --region europe-west1 \
  --format="value(spec.template.spec.serviceAccountName)"
```

Accorder uniquement les rôles nécessaires. Éviter les clés JSON de compte de service permanentes quand Application Default Credentials suffit.

## 6. Récupérer l'URL Cloud Run

```bash
gcloud run services describe mungwele-ia-api \
  --project diablo-design-ai \
  --region europe-west1 \
  --format="value(status.url)"
```

Exemple de résultat :

```text
https://mungwele-ia-api-xxxxx-ew.a.run.app
```

## 7. Tester Cloud Run avant bascule du frontend

```bash
curl https://URL_CLOUD_RUN/api/health
```

Le endpoint doit retourner `status: "ok"`.

Tester également depuis l'application avec un utilisateur Firebase connecté avant toute mise en production complète.

## 8. CORS

Le serveur accepte la variable :

```text
CORS_ALLOWED_ORIGINS
```

Pendant la migration, `*` est accepté. Une fois les domaines officiels connus, restreindre par exemple à :

```text
https://diablo-design-ai.web.app,https://diablo-design-ai.firebaseapp.com,https://votre-domaine-officiel.com
```

Puis :

```bash
gcloud run services update mungwele-ia-api \
  --project diablo-design-ai \
  --region europe-west1 \
  --set-env-vars "CORS_ALLOWED_ORIGINS=https://diablo-design-ai.web.app,https://diablo-design-ai.firebaseapp.com"
```

## 9. Construire le frontend pour Firebase Hosting

La variable suivante est **publique** et contient uniquement l'URL du serveur :

```text
VITE_GENERATION_API_BASE_URL=https://URL_CLOUD_RUN
```

Sous PowerShell :

```powershell
$env:VITE_GENERATION_API_BASE_URL="https://URL_CLOUD_RUN"
npm run build
```

Le wrapper `installAuthenticatedApiFetch` envoie alors directement vers Cloud Run :

- `/api/generate/image`
- `/api/generate/video`
- `/api/generate/music`
- `/api/media/download...`

Il conserve automatiquement le token Firebase `Authorization` sur ces appels.

Si `VITE_GENERATION_API_BASE_URL` est vide, le comportement historique same-origin reste actif. Cela constitue le mécanisme de rollback applicatif.

## 10. Déployer Firebase Hosting classique

Le `firebase.json` du dépôt :

- publie `dist/` ;
- exclut le bundle Node `server.cjs` ;
- réécrit `/api/**` vers `mungwele-ia-api` en `europe-west1` ;
- renvoie les autres routes vers `index.html` pour la SPA.

Déploiement :

```bash
firebase use diablo-design-ai
firebase deploy --only hosting
```

Les API courtes peuvent rester sur :

```text
https://DOMAINE_FIREBASE/api/...
```

Les appels de génération longs doivent utiliser l'URL directe Cloud Run configurée au build.

## 11. Vérifications après bascule

1. Ouvrir l'application Firebase Hosting et se connecter.
2. Vérifier `/api/settings` et le chargement du profil.
3. Générer une image.
4. Générer une vidéo Veo suffisamment longue pour confirmer que le flux ne dépend plus du timeout Hosting de 60 s.
5. Générer une musique et vérifier sa présence dans Firebase Storage / Firestore.
6. Vérifier `generationJobs`, `generations` et `creditTransactions` dans Firestore.
7. Tester un téléchargement média.
8. Tester Market-Cash et les callbacks sans modifier les URLs de production avant validation.
9. Contrôler les logs Cloud Run et les erreurs 4xx/5xx.

## 12. Rollback

En cas de problème :

1. Ne pas supprimer App Hosting immédiatement.
2. Reconstruire le frontend sans `VITE_GENERATION_API_BASE_URL` pour revenir aux appels same-origin.
3. Redéployer Firebase Hosting ou restaurer la version Hosting précédente depuis Firebase Console.
4. Cloud Run peut rester en place pendant le diagnostic.

## 13. Point d'architecture à durcir ensuite

Le devis ElevenLabs Music est actuellement conservé temporairement en mémoire du processus Node. Avec plusieurs instances Cloud Run, le devis et la génération peuvent théoriquement tomber sur deux instances différentes. Avant une montée en charge importante, déplacer ces devis temporaires vers Firestore/Redis ou rendre le flux de génération musique totalement stateless.

Cette amélioration est indépendante de la séparation Hosting + Cloud Run et doit être traitée avant d'augmenter fortement le nombre d'instances.
