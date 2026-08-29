# MH APIS — Mungwele Holding API Center

## Objectif

MH APIS sera le centre d’intégration sécurisé de Mungwele Holding. Les applications de la société ne devront pas communiquer directement entre elles avec leurs bases de données ou leurs secrets. Elles passeront par MH APIS.

Premiers services prévus :

- MUNGWELE IA STUDIO ↔ Market-Cash pour paiements, crédits et abonnements.
- Authentification de paiement Market-Cash.
- Paiement par carte Market-Cash / scan sécurisé.
- Confirmation forte par code à usage unique.
- Webhooks de confirmation de paiement.
- Journal d’audit centralisé.
- Plus tard : autres applications Mungwele Holding.

## Principe de sécurité

MUNGWELE IA ne doit jamais accéder directement à la base Firebase/Firestore interne de Market-Cash et Market-Cash ne doit jamais recevoir les clés privées de MUNGWELE IA.

Le flux doit être :

Client → MUNGWELE IA → MH APIS → Market-Cash → MH APIS → MUNGWELE IA

Toutes les communications serveur doivent utiliser HTTPS, authentification de service, jetons courts, idempotency keys, signatures de webhook et journaux d’audit.

## Paiement Market-Cash — compte

1. Le client choisit un pack ou abonnement dans MUNGWELE IA.
2. MUNGWELE crée une intention de paiement via MH APIS.
3. Le client choisit « Compte Market-Cash ».
4. L’e-mail et le mot de passe sont transmis de manière chiffrée à MH APIS uniquement pour authentification Market-Cash et ne sont jamais stockés dans MUNGWELE IA.
5. Market-Cash renvoie un jeton temporaire / session de paiement.
6. MH APIS crée une demande de confirmation forte.
7. Market-Cash remet un code à usage unique au client.
8. Le client saisit ce code dans MUNGWELE IA.
9. MH APIS vérifie le code auprès de Market-Cash.
10. Market-Cash débite le compte.
11. Un webhook signé confirme la transaction à MH APIS.
12. MH APIS marque la transaction `paid` et MUNGWELE IA attribue alors seulement les crédits ou l’abonnement.

## Paiement Market-Cash — carte scannée

Le scanner ne doit jamais stocker les informations sensibles brutes de la carte dans le navigateur ou Firestore.

Flux prévu :

1. Ouverture du scanner dans MUNGWELE IA.
2. Lecture d’un QR/token sécurisé Market-Cash ou d’un identifiant de carte prévu pour paiement.
3. Envoi du token à MH APIS.
4. Création de l’intention de paiement Market-Cash.
5. Confirmation forte par code à usage unique.
6. Webhook signé de confirmation.
7. Attribution des crédits/abonnement après confirmation serveur.

## API initiale proposée

### Authentification Market-Cash

`POST /v1/market-cash/auth/session`

### Créer une intention de paiement

`POST /v1/payments/intents`

Champs principaux :

- `merchantApp`: `mungwele-ia`
- `userId`
- `kind`: `credits | subscription`
- `amount`
- `currency`
- `reference`
- `metadata`
- `idempotencyKey`

### Lier une carte Market-Cash

`POST /v1/market-cash/cards/resolve-token`

### Demander une confirmation

`POST /v1/payments/{paymentId}/challenge`

### Confirmer le code

`POST /v1/payments/{paymentId}/confirm`

### Vérifier le statut

`GET /v1/payments/{paymentId}`

### Webhook Market-Cash

`POST /v1/webhooks/market-cash`

## États de transaction

- `created`
- `authentication_required`
- `challenge_required`
- `processing`
- `paid`
- `failed`
- `cancelled`
- `refunded`

Aucun crédit MUNGWELE ne doit être attribué avant l’état `paid` confirmé côté serveur.

## PayPal et Visa

Les emplacements UI sont réservés dans MUNGWELE IA avec la mention « Bientôt ». Leur intégration future devra également passer par MH APIS afin que MUNGWELE IA ait une interface de paiement unique, indépendamment du fournisseur.

## Architecture cible

MH APIS devra devenir un service séparé avec son propre dépôt, domaine API, secrets, base de données de transactions, observabilité, quotas, monitoring, alertes et documentation OpenAPI.

Exemple futur :

`https://api.mungweleholding.com`

Le domaine définitif sera choisi lors du développement de MH APIS.

## Important

Ce document prépare l’architecture mais n’active aucun paiement réel. L’interface actuelle de MUNGWELE IA ne doit jamais simuler un succès de paiement ou attribuer des crédits tant que MH APIS n’est pas construit et connecté à Market-Cash.
