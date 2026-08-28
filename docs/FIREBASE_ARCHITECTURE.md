# Firebase architecture — MUNGWELE IA STUDIO

This document defines the persistence/authentication layer before real provider billing is enabled.

## Collections

### users/{uid}
- uid
- email
- displayName
- photoURL
- role: `user | admin`
- credits
- plan
- status: `active | blocked`
- totalGenerations
- createdAt
- updatedAt

### generations/{generationId}
- userId
- type: `image | video | music`
- title
- prompt
- enhancedPrompt
- provider
- model
- status: `queued | processing | completed | failed`
- progress
- resultUrl
- thumbnailUrl
- creditsUsed
- settings
- createdAt
- updatedAt

### creditTransactions/{transactionId}
- userId
- amount
- type: `generation | purchase | refund | bonus | adjustment`
- description
- balanceBefore
- balanceAfter
- generationId
- createdAt

### appSettings/global
- siteName
- slogan
- maintenanceMode
- announcementBanner
- creditCosts
- updatedAt
- updatedBy

### apiProviders/{providerId}
- name
- providerKey
- category
- enabled
- modelName
- creditCost
- updatedAt
- updatedBy

## Storage paths

- `users/{uid}/avatars/...`
- `users/{uid}/references/...`
- `generations/{uid}/{generationId}/...`

Generated media should eventually be copied to controlled storage instead of relying permanently on temporary provider URLs.

## Security model

1. The browser authenticates with Firebase Authentication.
2. The browser sends the Firebase ID token to the Express backend.
3. The backend verifies the ID token using Firebase Admin.
4. Generation requests are authorized server-side.
5. Credits are checked and debited server-side in a transaction.
6. The provider API is called only from the backend.
7. On success, the generation is stored and finalized.
8. On provider failure, credits are refunded server-side.

The React client's current `useCredits()` logic is UI-only and must not remain the authority for paid generations.

## Initial authentication providers

Recommended first release:
- Email/password
- Google sign-in

Phone authentication can be added later if needed.

## Required Firebase information

Before SDK activation, collect from Firebase Console:

Web app configuration:
- apiKey
- authDomain
- projectId
- storageBucket
- messagingSenderId
- appId
- measurementId (optional)

Server configuration:
- projectId
- service account client email
- service account private key, or a supported production runtime credential method

Do not commit real service-account credentials to GitHub.
