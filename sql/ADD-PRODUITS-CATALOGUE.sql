-- ════════════════════════════════════════════════════════════════════════
-- ADD-PRODUITS-CATALOGUE.sql
-- ════════════════════════════════════════════════════════════════════════
-- Ajoute 21 nouveaux produits (fruits/légumes/herbes) au catalogue, publiés
-- sur le site (marketplaceActif=true). Les PHOTOS réelles et les NOMS DARIJA
-- s'appliquent automatiquement via /api/ext/catalogue (getArticlePhoto +
-- darijaName). IDs VFP01xxx pour ne pas entrer en conflit avec l'existant.
--
-- À exécuter dans Supabase → SQL Editor (projet wnuilvamhygkzupvfnxz).
-- Réexécutable sans risque (merge sur id).
-- ════════════════════════════════════════════════════════════════════════

INSERT INTO public.fl_articles (id, payload, updated_at) VALUES
  ('VFP01001', '{"nom":"Avocat","famille":"Fruits tropicaux","unite":"kg","prixAchat":18,"pvMethode":"pourcentage","pvValeur":40,"stockDisponible":80,"marketplaceActif":true}', now()),
  ('VFP01002', '{"nom":"Mangue","famille":"Fruits tropicaux","unite":"kg","prixAchat":22,"pvMethode":"pourcentage","pvValeur":40,"stockDisponible":70,"marketplaceActif":true}', now()),
  ('VFP01003', '{"nom":"Kiwi","famille":"Fruits","unite":"kg","prixAchat":16,"pvMethode":"pourcentage","pvValeur":45,"stockDisponible":60,"marketplaceActif":true}', now()),
  ('VFP01004', '{"nom":"Grenade","famille":"Fruits","unite":"kg","prixAchat":12,"pvMethode":"pourcentage","pvValeur":50,"stockDisponible":90,"marketplaceActif":true}', now()),
  ('VFP01005', '{"nom":"Coing","famille":"Fruits","unite":"kg","prixAchat":8,"pvMethode":"pourcentage","pvValeur":55,"stockDisponible":50,"marketplaceActif":true}', now()),
  ('VFP01006', '{"nom":"Papaye","famille":"Fruits tropicaux","unite":"kg","prixAchat":20,"pvMethode":"pourcentage","pvValeur":45,"stockDisponible":40,"marketplaceActif":true}', now()),
  ('VFP01007', '{"nom":"Noix de coco","famille":"Fruits tropicaux","unite":"pièce","prixAchat":10,"pvMethode":"montant","pvValeur":6,"stockDisponible":60,"marketplaceActif":true}', now()),
  ('VFP01008', '{"nom":"Litchi","famille":"Fruits tropicaux","unite":"kg","prixAchat":35,"pvMethode":"pourcentage","pvValeur":40,"stockDisponible":30,"marketplaceActif":true}', now()),
  ('VFP01009', '{"nom":"Mûres","famille":"Fruits rouges","unite":"kg","prixAchat":40,"pvMethode":"pourcentage","pvValeur":40,"stockDisponible":25,"marketplaceActif":true}', now()),
  ('VFP01010', '{"nom":"Cassis","famille":"Fruits rouges","unite":"kg","prixAchat":45,"pvMethode":"pourcentage","pvValeur":40,"stockDisponible":20,"marketplaceActif":true}', now()),
  ('VFP01011', '{"nom":"Fruit de la passion","famille":"Fruits tropicaux","unite":"kg","prixAchat":50,"pvMethode":"pourcentage","pvValeur":40,"stockDisponible":20,"marketplaceActif":true}', now()),
  ('VFP01012', '{"nom":"Pamplemousse","famille":"Agrumes","unite":"kg","prixAchat":7,"pvMethode":"pourcentage","pvValeur":55,"stockDisponible":100,"marketplaceActif":true}', now()),
  ('VFP01013', '{"nom":"Mandarines","famille":"Agrumes","unite":"kg","prixAchat":6,"pvMethode":"pourcentage","pvValeur":60,"stockDisponible":150,"marketplaceActif":true}', now()),
  ('VFP01014', '{"nom":"Brocoli","famille":"Légumes feuilles","unite":"kg","prixAchat":9,"pvMethode":"pourcentage","pvValeur":55,"stockDisponible":70,"marketplaceActif":true}', now()),
  ('VFP01015', '{"nom":"Chou-fleur","famille":"Légumes feuilles","unite":"pièce","prixAchat":5,"pvMethode":"montant","pvValeur":3,"stockDisponible":90,"marketplaceActif":true}', now()),
  ('VFP01016', '{"nom":"Poireau","famille":"Légumes feuilles","unite":"kg","prixAchat":5,"pvMethode":"pourcentage","pvValeur":60,"stockDisponible":80,"marketplaceActif":true}', now()),
  ('VFP01017', '{"nom":"Échalote","famille":"Légumes racines","unite":"kg","prixAchat":8,"pvMethode":"pourcentage","pvValeur":55,"stockDisponible":60,"marketplaceActif":true}', now()),
  ('VFP01018', '{"nom":"Gingembre","famille":"Légumes racines","unite":"kg","prixAchat":25,"pvMethode":"pourcentage","pvValeur":45,"stockDisponible":40,"marketplaceActif":true}', now()),
  ('VFP01019', '{"nom":"Curcuma frais","famille":"Légumes racines","unite":"kg","prixAchat":30,"pvMethode":"pourcentage","pvValeur":45,"stockDisponible":25,"marketplaceActif":true}', now()),
  ('VFP01020', '{"nom":"Pleurotes","famille":"Champignons","unite":"kg","prixAchat":35,"pvMethode":"pourcentage","pvValeur":40,"stockDisponible":30,"marketplaceActif":true}', now()),
  ('VFP01021', '{"nom":"Marjolaine","famille":"Herbes aromatiques","unite":"botte","prixAchat":3,"pvMethode":"montant","pvValeur":2,"stockDisponible":50,"marketplaceActif":true}', now())
ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now();

-- Vérif : recharger le site → 21 produits de plus, avec photos réelles + noms darija.
