# Déployer le correctif de sécurité MEss

Cette branche corrige ensemble les quatre pistes de l’audit : autorisation réelle
par session, cohérence des affectations, sortie publique sans vérificateur de mot
de passe et scans autorisés avec quota atomique. Elle nécessite la migration SQL
**avant utilisation de cette version**. Aucun service-role secret supplémentaire
n’est nécessaire dans Render ni dans le navigateur.

## Activation coordonnée

1. Sauvegarder le projet Supabase. Tester d’abord une copie de la base avec
   `supabase/migrations/20261102_security.sql` puis le fichier de régression SQL
   dans une base locale jetable. Les tests SQL ne doivent pas viser la production.
2. Prévoir une courte fenêtre de maintenance : dans le SQL Editor du bon projet,
   exécuter **tout** `supabase/migrations/20261102_security.sql` avec le rôle de
   migration/propriétaire. Ce fichier est une transaction unique. Il remplace les
   anciennes politiques permissives sur les cinq tables de cette application,
   retire les droits publics sur les colonnes privées de sessions et migre les
   anciens suffixes de mot de passe. Examiner toute politique personnalisée avant
   remplacement. Il ne supprime pas de commande ni d’ami.
3. Fusionner cette branche dans `main` et laisser Render déployer. L’ancien code
   utilisant `select('*')` n’est pas compatible avec les nouvelles permissions
   de colonne ; garder la fenêtre de maintenance jusqu’à la fin du déploiement.
4. Ouvrir une session protégée et entrer à nouveau son mot de passe. Les anciennes
   valeurs de mot de passe enregistrées dans localStorage sont effacées. Les mots
   de passe existants restent acceptés et les empreintes SHA-256 sont renforcées
   en bcrypt à la prochaine connexion compatible.

Le script s’arrête si pgcrypto n’est pas dans le schéma `extensions` ou s’il
existe déjà des affectations intersessions incohérentes. Faire examiner ces
conditions avant reprise ; ne pas supprimer les contrôles pour forcer le passage.

La connexion ChatGPT actuelle permet de publier le code GitHub, mais **n’offre
pas d’exécution SQL Supabase**. La migration et son activation ne sont donc pas
réalisées par la création de cette PR.

## Fonctionnement et portée

- Un mot de passe correct délivre une capacité aléatoire de 256 bits, conservée
  dans un cookie HttpOnly/SameSite=Strict (Secure en production), valable 12 h.
  Seule son empreinte est conservée dans `mess_private.grants`.
- Le serveur joint cette capacité aux requêtes Supabase ; les politiques RLS
  vérifient sa session, son expiration et l’état ouvert. Le verrouillage révoque
  la capacité en base, et le contrôle serveur est partagé par toutes les actions
  d’édition. La suppression d’une session fermée reste possible pour son créateur.
- Les noms, commandes et additions restent lisibles publiquement, conformément au
  fonctionnement de groupe existant. Ce correctif n’ajoute pas de confidentialité
  des factures ni de comptes individuels.
- La carte commune est modifiable par une personne ayant déverrouillé une session
  active. Ce rôle de gestionnaire est celui d’un organisateur de groupe, pas un
  rôle d’administrateur global distinct.
- L’affectation compare la session de la commande et celle du participant côté
  serveur, puis un trigger en base impose la même règle. Le rattachement d’une
  commande ou d’un participant à une autre session devient immuable.
- Les données publiques de session sont construites par liste explicite de
  champs. `password_hash` ne peut pas être sélectionné par `anon`/`authenticated`,
  y compris via l’API Supabase directe.
- Chaque scan exige une session ouverte déverrouillée, et réserve une place dans
  la base **avant** de contacter Gemini : un scan simultané par session, 20 scans
  par heure par session et 100 par 24 h pour l’application. Les scans tentés,
  même échoués, comptent dans les limites. Une réservation abandonnée expire pour
  la concurrence après 3 minutes. Ces limites s’appliquent aussi aux clés
  personnelles : elles protègent les ressources globales de l’application.
- Images JPEG/PNG/WebP : 2 Mo décodés maximum ; réponse fournisseur 512 Kio ;
  100 lignes maximum ; quantités et prix finis/bornés ; expansion partagée limitée
  à 300 lignes avant toute allocation. Le secret Gemini est envoyé en en-tête et
  les corps d’erreur du fournisseur ne sont plus journalisés.
- La création de sessions reste publique. Ce correctif ne revendique pas une
  protection anti-bot globale, une authentification de comptes ou un audit de CVE.

## Vérifications réalisées

- `npm run build` : compilation Next.js et TypeScript validées.
- `node --test tests/security.cjs tests/shared-orders.cjs tests/party-effects.cjs` :
  17 tests passés, dont refus sans capacité, capacité refusée, référence de session
  étrangère, sortie sans mot de passe et absence d’appel Gemini en cas de refus.
- Les tests utilisent uniquement des adaptateurs de base/cookies/fournisseur
  fictifs. Ils ne remplacent pas la vérification des politiques RLS dans PostgreSQL.
- `supabase/tests/security-regression.sql` est fourni pour une base locale jetable.
  PostgreSQL/psql ne sont pas installés ici : **migration et tests SQL non exécutés**.
- Aucun navigateur local utilisable : vérification visuelle et parcours complet
  restant à faire après déploiement de test.

Ne pas revenir aux anciennes politiques « Allow all » pour résoudre un problème
de déploiement. Conserver une sauvegarde et coordonner tout retour arrière du code
avec un responsable de la base ; un retour du code seul n’est pas compatible avec
les nouvelles permissions.

Références :
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/postgres/column-level-security
- https://supabase.com/docs/guides/database/functions
- https://www.postgresql.org/docs/16/pgcrypto.html
