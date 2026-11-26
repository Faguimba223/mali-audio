# Guide d'administration — Mali Audio v1.2

## 1. Accès sécurisé
- Ouvrez l'interface d'administration (`admin/`, ex. `http://localhost:5174` en local ou `https://admin.maliaudio.com` en production).
- Connectez-vous avec un compte ayant le rôle `admin`. Tout compte non administrateur est refusé côté serveur (`403`).
- Désactivez le compte de démonstration par défaut avant la mise en production (`DEFAULT_ADMIN_ENABLED=false` dans `backend/.env`).

## 2. Cycle de publication des contenus
Chaque œuvre (artiste, chanson, album, playlist, vidéo, actualité) suit des statuts contrôlés :
- **Brouillon (`draft`)** : visible uniquement dans l'administration.
- **À vérifier (`pending_review`)** : en attente de validation éditoriale.
- **Publié (`published`)** : visible sur la PWA publique, l'API mobile et le lecteur.
- **Dépublié (`unpublished`)** : retiré immédiatement de l'affichage public et du streaming.
- **Archivé (`archived`)** : conservé pour référence historique (utilisé notamment si un artiste possède des œuvres liées).

## 3. Ajout et protection des chansons
1. Dans **Chansons > + Ajouter une chanson**, renseignez titre, artiste principal, album éventuel, genre, langue, durée, ayant droit, licence/autorisation.
2. Importez le fichier audio (MP3, WAV, M4A, AAC, OGG, FLAC) et la pochette.
3. Le serveur vérifie la signature binaire réelle du fichier et stocke l'audio dans `backend/storage/private/audio/`.
4. Utilisez le bouton **Aperçu** avant de passer le statut à **Publié** pour vérifier la lecture protégée.
5. Aucun auditeur ne reçoit d'URL permanente ni de bouton de téléchargement.

## 4. Journal d'activité & Paramètres
- Toutes les connexions administrateur et opérations sensibles sont enregistrées dans **Journal d'activité** (`audit_logs`) sans jamais stocker de mots de passe ni de jetons complets.
- Les limites d'import, l'identité visuelle, le mode maintenance et les coordonnées de contact se gèrent dans **Paramètres**.
