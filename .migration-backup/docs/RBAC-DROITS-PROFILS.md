# 🔐 Matrice des droits par profil (RBAC) — Vita Fresh ERP

Source de vérité : `lib/rolePermissions.ts` (`autoAssignPermissions`, `mergeRolePermissions`).
Les droits sont **assignés automatiquement** à la création d'un compte et au changement de rôle.

## 1. Processus d'assignation automatique

```
Création compte (BOUsers / changement de rôle)
        │
        ▼
autoAssignPermissions(role)  ──►  applique les flags canView* + accessType
        │
        ▼
newUser = { ...autoPerms, ...form }   (l'admin peut ensuite affiner manuellement)
```

- **Comptes internes** (équipe) : créés dans `BOUsers` → rôle choisi → droits auto.
- **Comptes externes** (clients/fournisseurs) : créés via la boutique
  (`/api/ext/demande-compte`) → rôle `client` (ou `fournisseur`) + `categorie`
  (chr / marchand / particulier). Auto-approuvés selon la config.
- **Multi-rôles** : un compte peut cumuler plusieurs rôles → `mergeRolePermissions`
  fusionne les droits (un droit actif dans UN rôle = actif au total).

## 2. Modules (flags de permission)

| Flag | Module |
|------|--------|
| `canViewCommercial` | Commandes, Clients, Affectation |
| `canViewAchat` | Bons d'achat, PO, Réception, Fournisseurs |
| `canViewLogistique` | Dispatch, BL, Trips, Retours |
| `canViewStock` | Stock, Inventaire, DLC |
| `canViewCash` | Cash, BL encaissement |
| `canViewFinance` | Finance, Caisse, Comptabilité, **Caisse Acheteur** |
| `canViewRH` | RH, Salaires, Paie |
| `canViewRecap` | Synthèse & Récap |
| `canViewExternal` | Clients, Fournisseurs, Portails |
| `canViewDatabase` | Base de données, Paramètres, Utilisateurs |
| `canCreateCommandeBO` | Créer/modifier commandes au back-office |
| `canViewInvestisseur` | 🔒 Dashboard Investisseur (CONFIDENTIEL, jamais auto) |

## 3. Matrice rôle → droits

| Rôle | Commercial | Achat | Logist. | Stock | Cash | Finance | RH | Récap | Externe | DB | Créer Cmd | Accès |
|------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **super_super_admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | both |
| **super_admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | both |
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | – | ✅ | both |
| **resp_commercial** | ✅ | – | – | – | – | – | – | ✅ | ✅ | – | ✅ | both |
| **team_leader** | ✅ | – | – | – | – | – | – | ✅ | – | – | – | mobile |
| **prevendeur** | ✅ | – | – | – | – | – | – | – | – | – | – | mobile |
| **suivi_commande** | ✅ | – | ✅ | – | – | – | – | ✅ | – | – | – | BO |
| **acheteur** | – | ✅ | – | – | – | – | – | – | – | – | – | mobile |
| **resp_achat** | – | ✅ | – | ✅ | – | – | – | – | ✅ | – | – | BO |
| **ctrl_achat** | – | ✅ | – | ✅ | – | – | – | – | – | – | – | mobile |
| **ctrl_prep** | – | – | ✅ | ✅ | – | – | – | – | – | – | – | mobile |
| **resp_logistique** | – | – | ✅ | ✅ | – | – | – | ✅ | – | – | – | both |
| **magasinier** | – | – | – | ✅ | – | – | – | – | – | – | – | mobile |
| **dispatcheur** | – | – | ✅ | ✅ | – | – | – | – | – | – | – | mobile |
| **livreur** | – | – | ✅ | – | – | – | – | – | – | – | – | mobile |
| **chef_depot** | – | – | ✅ | ✅ | – | – | – | ✅ | – | – | – | BO |
| **cash_man** | – | – | – | – | ✅ | – | – | – | – | – | – | BO |
| **financier** | – | – | – | – | ✅ | ✅ | – | ✅ | – | – | – | BO |
| **charge_recouvrement** | ✅ | – | – | – | ✅ | – | – | – | – | – | – | BO |
| **rh_manager** | – | – | – | – | – | – | ✅ | ✅ | – | – | – | BO |
| **comptable** | – | – | – | – | ✅ | ✅ | – | ✅ | – | – | – | BO |
| **qualite** | – | – | – | ✅ | – | – | – | ✅ | – | – | – | BO |
| **it_admin** | – | – | – | – | – | – | – | – | – | ✅ | – | BO |
| **auditeur** | ✅ | ✅ | ✅ | ✅ | – | ✅ | – | ✅ | – | – | – | BO |
| **investisseur** | – | – | – | – | – | – | – | ✅ | – | – | – | 🔒 BO |

## 4. Comptes externes — clients & fournisseurs

| Profil | Rôle | Accès | Portail |
|--------|------|-------|---------|
| **Particulier** | `client` (categorie=particulier) | site boutique | shop.vita-core.org |
| **CHR / Marchand** | `client` (categorie=chr\|marchand) | portail pro | espace pro ERP |
| **CHR — Propriétaire** | `client_proprietaire` | Commandes, **Factures, Finance, Récap, Gestion users** | portail (tous onglets) |
| **CHR — Gérant** | `client_gerant` | Commandes, BL, Tracking, Réceptions (**PAS** finance/contrats) | portail (onglets restreints) |
| **Fournisseur** | `fournisseur` | Commandes reçues, Paiements, Produits | portail fournisseur |

### Hiérarchie CHR (Entreprise → Propriétaire → Gérant)
- À l'inscription boutique, un compte CHR est créé en `client` (categorie=chr).
- L'**Entreprise** (organisation) regroupe les utilisateurs ; un admin promeut le
  compte en **Propriétaire** (`client_proprietaire`) puis crée des **Gérants**
  (`client_gerant`) rattachés.
- Le **Propriétaire** voit tout (finance, contrats, parrainage, gestion users).
- Le **Gérant** est restreint à l'opérationnel (commandes, BL, tracking,
  réceptions, promos) — pas d'accès financier ni aux contrats.
- L'application de ces restrictions est faite dans `PortailClient` (onglets filtrés
  par rôle) — voir Phase 3.

## 5. Pour modifier les droits
- **Par rôle (global)** : éditer la matrice `ROLE_PERMISSIONS` dans
  `lib/rolePermissions.ts`.
- **Par utilisateur (individuel)** : BO → Utilisateurs → permissions ultra-granulaires
  (`saveGranularPerms`), qui surchargent les droits auto.
