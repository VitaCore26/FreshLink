-- ============================================================
-- OPTIMFLUX — Migration v9 CLEAN
-- Supabase: https://vynbejciuzedzurxhsui.supabase.co
-- Auteur : Jawad | Date : 2026
-- Recreer proprement toutes les tables metier
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. USERS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '1234',
  role          TEXT NOT NULL DEFAULT 'prevendeur',
  access_type   TEXT,           -- 'mobile' | 'backoffice' | 'both' | NULL=auto
  secteur       TEXT,
  phone         TEXT,
  actif         BOOLEAN DEFAULT TRUE,
  photo_url     TEXT,
  -- Permissions back-office (granulaires, independantes)
  can_view_achat       BOOLEAN DEFAULT FALSE,
  can_view_commercial  BOOLEAN DEFAULT FALSE,
  can_view_logistique  BOOLEAN DEFAULT FALSE,
  can_view_stock       BOOLEAN DEFAULT FALSE,
  can_view_cash        BOOLEAN DEFAULT FALSE,
  can_view_finance     BOOLEAN DEFAULT FALSE,
  can_view_recap       BOOLEAN DEFAULT FALSE,
  can_view_database    BOOLEAN DEFAULT FALSE,
  can_view_external    BOOLEAN DEFAULT FALSE,
  can_create_commande_bo BOOLEAN DEFAULT FALSE,
  -- Objectifs
  objectif_clients              INTEGER DEFAULT 0,
  objectif_tonnage              INTEGER DEFAULT 0,
  objectif_journalier_ca        NUMERIC DEFAULT 0,
  objectif_hebdomadaire_ca      NUMERIC DEFAULT 0,
  objectif_mensuel_ca           NUMERIC DEFAULT 0,
  objectif_journalier_clients   INTEGER DEFAULT 0,
  objectif_hebdomadaire_clients INTEGER DEFAULT 0,
  objectif_mensuel_clients      INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. CATALOGUE FRUITS & LEGUMES DU MONDE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_produits_catalogue (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom             TEXT NOT NULL,
  nom_ar          TEXT,
  nom_en          TEXT,
  categorie       TEXT NOT NULL,   -- 'fruit' | 'legume' | 'herbe' | 'champignon'
  sous_categorie  TEXT,            -- 'agrume' | 'baie' | 'tropical' etc.
  couleur         TEXT,
  taille_standard TEXT,            -- 'S' | 'M' | 'L' | 'XL' | 'vrac'
  unite           TEXT DEFAULT 'kg',
  origine         TEXT,            -- pays d'origine principal
  saison          TEXT,            -- 'ete' | 'hiver' | 'toute_annee'
  actif           BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Vider et recharger les fruits/legumes (idempotent)
TRUNCATE TABLE public.fl_produits_catalogue RESTART IDENTITY CASCADE;

INSERT INTO public.fl_produits_catalogue (nom, nom_ar, nom_en, categorie, sous_categorie, couleur, taille_standard, unite, origine, saison) VALUES
-- ── AGRUMES ──────────────────────────────────────────────────────────────────
('Orange',            'برتقال',     'Orange',           'fruit', 'agrume',   'orange',     'M',   'kg', 'Maroc',       'hiver'),
('Citron',            'حامض',       'Lemon',            'fruit', 'agrume',   'jaune',      'S',   'kg', 'Maroc',       'toute_annee'),
('Pamplemousse',      'بوملو',      'Grapefruit',       'fruit', 'agrume',   'jaune-rose', 'L',   'kg', 'Israel',      'hiver'),
('Mandarine',         'يوسفي',      'Mandarin',         'fruit', 'agrume',   'orange',     'S',   'kg', 'Maroc',       'hiver'),
('Citron vert',       'ليمون',      'Lime',             'fruit', 'agrume',   'vert',       'S',   'kg', 'Mexique',     'toute_annee'),
('Clémentine',        'كليمانتين',  'Clementine',       'fruit', 'agrume',   'orange',     'S',   'kg', 'Maroc',       'hiver'),
('Bergamote',         'برغموت',     'Bergamot',         'fruit', 'agrume',   'vert-jaune', 'S',   'kg', 'Italie',      'hiver'),
('Yuzu',              'يوزو',       'Yuzu',             'fruit', 'agrume',   'jaune',      'S',   'kg', 'Japon',       'hiver'),
('Kumquat',           'كمكوات',     'Kumquat',          'fruit', 'agrume',   'orange',     'XS',  'kg', 'Chine',       'hiver'),
('Pomelo',            'بومييلو',    'Pomelo',           'fruit', 'agrume',   'rose',       'XL',  'kg', 'Thaïlande',   'hiver'),
-- ── FRUITS TROPICAUX ─────────────────────────────────────────────────────────
('Mangue',            'مانجو',      'Mango',            'fruit', 'tropical', 'jaune-rouge','L',   'kg', 'Senegal',     'ete'),
('Ananas',            'أناناس',     'Pineapple',        'fruit', 'tropical', 'jaune',      'XL',  'piece','Costa Rica', 'toute_annee'),
('Papaye',            'بابايا',     'Papaya',           'fruit', 'tropical', 'orange',     'L',   'kg', 'Brésil',      'toute_annee'),
('Banane',            'موز',        'Banana',           'fruit', 'tropical', 'jaune',      'M',   'kg', 'Côte d Ivoire','toute_annee'),
('Avocat',            'أفوكا',      'Avocado',          'fruit', 'tropical', 'vert-noir',  'M',   'kg', 'Maroc',       'hiver'),
('Coco',              'جوز الهند',  'Coconut',          'fruit', 'tropical', 'brun',       'XL',  'piece','Sri Lanka',  'toute_annee'),
('Litchi',            'ليتشي',      'Lychee',           'fruit', 'tropical', 'rose',       'S',   'kg', 'Madagascar',  'ete'),
('Pitaya',            'فاكهة التنين','Dragon Fruit',    'fruit', 'tropical', 'rose',       'M',   'kg', 'Vietnam',     'ete'),
('Maracuja',          'باشن فروت',  'Passion Fruit',    'fruit', 'tropical', 'violet',     'S',   'kg', 'Brésil',      'ete'),
('Goyave',            'جوافة',      'Guava',            'fruit', 'tropical', 'rose',       'M',   'kg', 'Maroc',       'ete'),
('Carambole',         'كرامبولا',   'Star Fruit',       'fruit', 'tropical', 'jaune',      'M',   'kg', 'Thaïlande',   'ete'),
('Ramboutan',         'رامبوتان',   'Rambutan',         'fruit', 'tropical', 'rouge',      'S',   'kg', 'Malaisie',    'ete'),
('Durian',            'دوريان',     'Durian',           'fruit', 'tropical', 'jaune',      'XL',  'kg', 'Thaïlande',   'ete'),
('Tamarinde',         'تمر هندي',   'Tamarind',         'fruit', 'tropical', 'brun',       'S',   'kg', 'Inde',        'ete'),
('Longane',           'لونجان',     'Longan',           'fruit', 'tropical', 'brun',       'S',   'kg', 'Chine',       'ete'),
-- ── FRUITS A PEPIN ───────────────────────────────────────────────────────────
('Pomme',             'تفاح',       'Apple',            'fruit', 'pepin',    'rouge-vert', 'M',   'kg', 'Maroc',       'automne'),
('Poire',             'إجاص',       'Pear',             'fruit', 'pepin',    'jaune-vert', 'M',   'kg', 'Maroc',       'automne'),
('Coing',             'سفرجل',      'Quince',           'fruit', 'pepin',    'jaune',      'M',   'kg', 'Maroc',       'automne'),
-- ── FRUITS A NOYAU ───────────────────────────────────────────────────────────
('Peche',             'خوخ',        'Peach',            'fruit', 'noyau',    'jaune-rose', 'M',   'kg', 'Maroc',       'ete'),
('Nectarine',         'نكتارين',    'Nectarine',        'fruit', 'noyau',    'rouge-jaune','M',   'kg', 'Maroc',       'ete'),
('Prune',             'برقوق',      'Plum',             'fruit', 'noyau',    'violet',     'S',   'kg', 'Maroc',       'ete'),
('Cerise',            'حب الملوك',  'Cherry',           'fruit', 'noyau',    'rouge',      'S',   'kg', 'Maroc',       'ete'),
('Abricot',           'مشمش',       'Apricot',          'fruit', 'noyau',    'orange',     'S',   'kg', 'Maroc',       'ete'),
('Merise',            'كرز بري',    'Wild Cherry',      'fruit', 'noyau',    'rouge',      'XS',  'kg', 'France',      'ete'),
-- ── BAIES ────────────────────────────────────────────────────────────────────
('Fraise',            'فراولة',     'Strawberry',       'fruit', 'baie',     'rouge',      'S',   'kg', 'Maroc',       'printemps'),
('Framboise',         'توت عليق',   'Raspberry',        'fruit', 'baie',     'rouge',      'S',   'kg', 'Maroc',       'ete'),
('Myrtille',          'توت أزرق',   'Blueberry',        'fruit', 'baie',     'bleu',       'S',   'kg', 'Chili',       'toute_annee'),
('Mure',              'عليق',       'Blackberry',       'fruit', 'baie',     'noir',       'S',   'kg', 'Maroc',       'ete'),
('Groseille',         'كشمش',       'Gooseberry',       'fruit', 'baie',     'vert-rouge', 'S',   'kg', 'France',      'ete'),
('Cassis',            'كاسيس',      'Black Currant',    'fruit', 'baie',     'noir',       'S',   'kg', 'France',      'ete'),
('Airelle',           'توت بري',    'Cranberry',        'fruit', 'baie',     'rouge',      'S',   'kg', 'Canada',      'automne'),
-- ── RAISINS & MELONS ─────────────────────────────────────────────────────────
('Raisin blanc',      'عنب أبيض',   'White Grape',      'fruit', 'raisin',   'vert',       'M',   'kg', 'Maroc',       'ete'),
('Raisin rouge',      'عنب أحمر',   'Red Grape',        'fruit', 'raisin',   'rouge',      'M',   'kg', 'Maroc',       'ete'),
('Raisin noir',       'عنب أسود',   'Black Grape',      'fruit', 'raisin',   'noir',       'M',   'kg', 'Italie',      'ete'),
('Melon',             'بطيخ أصفر',  'Melon',            'fruit', 'cucurbit', 'jaune',      'XL',  'piece','Maroc',      'ete'),
('Pasteque',          'دلاح',       'Watermelon',       'fruit', 'cucurbit', 'vert-rouge', 'XL',  'piece','Maroc',      'ete'),
-- ── LEGUMES FEUILLES ─────────────────────────────────────────────────────────
('Salade romaine',    'خس روماني',  'Romaine Lettuce',  'legume','feuille',  'vert',       'M',   'piece','Maroc',     'toute_annee'),
('Laitue',            'خس',         'Lettuce',          'legume','feuille',  'vert',       'M',   'piece','Maroc',     'toute_annee'),
('Epinard',           'سبانخ',      'Spinach',          'legume','feuille',  'vert',       'S',   'kg', 'Maroc',       'hiver'),
('Blette',            'السلق',      'Swiss Chard',      'legume','feuille',  'vert-rouge', 'M',   'kg', 'Maroc',       'hiver'),
('Chou',              'كرنب',       'Cabbage',          'legume','feuille',  'vert',       'L',   'kg', 'Maroc',       'hiver'),
('Chou rouge',        'كرنب أحمر',  'Red Cabbage',      'legume','feuille',  'violet',     'L',   'kg', 'Maroc',       'hiver'),
('Chou frisé',        'كرنب مجعد',  'Kale',             'legume','feuille',  'vert',       'M',   'kg', 'France',      'hiver'),
('Pak choi',          'باك تشوي',   'Bok Choy',         'legume','feuille',  'vert',       'M',   'kg', 'Chine',       'hiver'),
('Endive',            'هندباء',     'Chicory',          'legume','feuille',  'blanc-jaune','M',   'piece','Belgique',  'hiver'),
('Roquette',          'جرجير',      'Arugula',          'legume','feuille',  'vert',       'S',   'kg', 'Maroc',       'toute_annee'),
-- ── LEGUMES RACINES ───────────────────────────────────────────────────────────
('Carotte',           'جزر',        'Carrot',           'legume','racine',   'orange',     'M',   'kg', 'Maroc',       'toute_annee'),
('Betterave',         'شمندر',      'Beetroot',         'legume','racine',   'rouge',      'M',   'kg', 'Maroc',       'hiver'),
('Navet',             'لفت',        'Turnip',           'legume','racine',   'blanc-violet','M',  'kg', 'Maroc',       'hiver'),
('Radis',             'فجل',        'Radish',           'legume','racine',   'rouge',      'S',   'kg', 'Maroc',       'printemps'),
('Céleri-rave',       'كرفس جذري',  'Celeriac',         'legume','racine',   'brun',       'L',   'kg', 'France',      'automne'),
('Panais',            'جزر أبيض',   'Parsnip',          'legume','racine',   'blanc',      'M',   'kg', 'Maroc',       'hiver'),
('Raifort',           'خردل بري',   'Horseradish',      'legume','racine',   'blanc',      'S',   'kg', 'Pologne',     'toute_annee'),
-- ── LEGUMES BULBES ────────────────────────────────────────────────────────────
('Oignon',            'بصل',        'Onion',            'legume','bulbe',    'jaune-rouge','M',   'kg', 'Maroc',       'toute_annee'),
('Ail',               'ثوم',        'Garlic',           'legume','bulbe',    'blanc',      'S',   'kg', 'Maroc',       'toute_annee'),
('Echalote',          'كراث صغير',  'Shallot',          'legume','bulbe',    'brun-violet','S',   'kg', 'France',      'toute_annee'),
('Poireau',           'كراث',       'Leek',             'legume','bulbe',    'vert-blanc', 'L',   'kg', 'Maroc',       'hiver'),
('Oignon rouge',      'بصل أحمر',   'Red Onion',        'legume','bulbe',    'rouge',      'M',   'kg', 'Maroc',       'toute_annee'),
('Fenouil',           'شمر',        'Fennel',           'legume','bulbe',    'vert-blanc', 'M',   'kg', 'Maroc',       'hiver'),
-- ── LEGUMES FRUITS ────────────────────────────────────────────────────────────
('Tomate',            'طماطم',      'Tomato',           'legume','fruit_lg',  'rouge',     'M',   'kg', 'Maroc',       'toute_annee'),
('Tomate cerise',     'طماطم كرزية','Cherry Tomato',    'legume','fruit_lg',  'rouge',     'S',   'kg', 'Maroc',       'toute_annee'),
('Tomate coeur',      'طماطم قلب',  'Beefsteak Tomato', 'legume','fruit_lg',  'rouge',     'XL',  'kg', 'Espagne',     'ete'),
('Poivron rouge',     'فلفل أحمر',  'Red Pepper',       'legume','fruit_lg',  'rouge',     'M',   'kg', 'Maroc',       'ete'),
('Poivron vert',      'فلفل أخضر',  'Green Pepper',     'legume','fruit_lg',  'vert',      'M',   'kg', 'Maroc',       'ete'),
('Poivron jaune',     'فلفل أصفر',  'Yellow Pepper',    'legume','fruit_lg',  'jaune',     'M',   'kg', 'Maroc',       'ete'),
('Piment',            'فلفل حار',   'Chilli',           'legume','fruit_lg',  'rouge',     'S',   'kg', 'Maroc',       'ete'),
('Courgette',         'كوسة',       'Zucchini',         'legume','fruit_lg',  'vert',      'M',   'kg', 'Maroc',       'ete'),
('Aubergine',         'قرع أسود',   'Eggplant',         'legume','fruit_lg',  'violet',    'L',   'kg', 'Maroc',       'ete'),
('Concombre',         'خيار',       'Cucumber',         'legume','fruit_lg',  'vert',      'M',   'kg', 'Maroc',       'toute_annee'),
('Cornichon',         'خيار صغير',  'Gherkin',          'legume','fruit_lg',  'vert',      'S',   'kg', 'Maroc',       'ete'),
-- ── LEGUMES TIGES ────────────────────────────────────────────────────────────
('Asperge verte',     'هليون',      'Green Asparagus',  'legume','tige',     'vert',       'M',   'kg', 'Maroc',       'printemps'),
('Asperge blanche',   'هليون أبيض', 'White Asparagus',  'legume','tige',     'blanc',      'M',   'kg', 'France',      'printemps'),
('Céleri',            'كرفس',       'Celery',           'legume','tige',     'vert',       'M',   'botte','Maroc',     'hiver'),
('Rhubarbe',          'راوند',      'Rhubarb',          'legume','tige',     'rouge',      'M',   'kg', 'France',      'printemps'),
-- ── LEGUMES FLEURS ───────────────────────────────────────────────────────────
('Chou-fleur',        'قرنبيط',     'Cauliflower',      'legume','fleur',    'blanc',      'L',   'piece','Maroc',     'hiver'),
('Brocoli',           'بروكلي',     'Broccoli',         'legume','fleur',    'vert',       'L',   'kg', 'Maroc',       'hiver'),
('Artichaut',         'أرضي شوكي',  'Artichoke',        'legume','fleur',    'vert',       'L',   'piece','Maroc',     'printemps'),
-- ── LEGUMINEUSES ─────────────────────────────────────────────────────────────
('Haricot vert',      'لوبيا خضراء','Green Bean',       'legume','legumineuse','vert',     'M',   'kg', 'Maroc',       'ete'),
('Pois chiche',       'حمص',        'Chickpea',         'legume','legumineuse','beige',    'S',   'kg', 'Maroc',       'toute_annee'),
('Petits pois',       'جلبانة',     'Peas',             'legume','legumineuse','vert',     'S',   'kg', 'Maroc',       'printemps'),
('Feve',              'فول',        'Broad Bean',       'legume','legumineuse','vert',     'M',   'kg', 'Maroc',       'printemps'),
('Haricot borlotti',  'فاصوليا',    'Borlotti Bean',    'legume','legumineuse','blanc-rouge','S', 'kg', 'Italie',      'ete'),
-- ── CHAMPIGNONS ──────────────────────────────────────────────────────────────
('Champignon Paris',  'فطر',        'Button Mushroom',  'champignon','champignon','blanc','S','kg','France',          'toute_annee'),
('Portobello',        'بورتوبيلو',  'Portobello',       'champignon','champignon','brun', 'L','kg','France',          'toute_annee'),
('Shiitake',          'شيتاكي',     'Shiitake',         'champignon','champignon','brun', 'M','kg','Japon',           'toute_annee'),
('Chanterelle',       'جيرول',      'Chanterelle',      'champignon','champignon','jaune','S','kg','France',          'automne'),
-- ── HERBES AROMATIQUES ───────────────────────────────────────────────────────
('Persil',            'معدنوس',     'Parsley',          'herbe','aromatique','vert',       'S',   'botte','Maroc',    'toute_annee'),
('Coriandre',         'قزبر',       'Coriander',        'herbe','aromatique','vert',       'S',   'botte','Maroc',    'toute_annee'),
('Menthe',            'نعناع',      'Mint',             'herbe','aromatique','vert',       'S',   'botte','Maroc',    'toute_annee'),
('Basilic',           'ريحان',      'Basil',            'herbe','aromatique','vert',       'S',   'botte','Maroc',    'ete'),
('Thym',              'زعتر',       'Thyme',            'herbe','aromatique','vert-gris',  'S',   'botte','Maroc',    'toute_annee'),
('Romarin',           'إكليل الجبل','Rosemary',         'herbe','aromatique','vert-gris',  'S',   'botte','Maroc',    'toute_annee'),
('Aneth',             'شبت',        'Dill',             'herbe','aromatique','vert',       'S',   'botte','Maroc',    'ete'),
('Estragon',          'طرخون',      'Tarragon',         'herbe','aromatique','vert',       'S',   'botte','France',   'ete'),
('Citronnelle',       'حشيشة الليمون','Lemongrass',     'herbe','aromatique','vert-jaune', 'M',   'botte','Vietnam',  'toute_annee'),
-- ── TUBERCULES & CEREALES ────────────────────────────────────────────────────
('Pomme de terre',    'بطاطا',      'Potato',           'legume','tubercule', 'brun',      'M',   'kg', 'Maroc',       'toute_annee'),
('Patate douce',      'بطاطا حلوة', 'Sweet Potato',     'legume','tubercule', 'orange',    'M',   'kg', 'Maroc',       'automne'),
('Manioc',            'مانيوك',     'Cassava',          'legume','tubercule', 'brun',      'L',   'kg', 'Afrique',     'toute_annee'),
('Igname',            'إيغنام',     'Yam',              'legume','tubercule', 'brun',      'L',   'kg', 'Cote d Ivoire','toute_annee'),
('Topinambour',       'توبيناموبور','Jerusalem Artichoke','legume','tubercule','brun',     'S',   'kg', 'France',      'hiver'),
('Gingembre',         'زنجبيل',     'Ginger',           'legume','tubercule', 'brun-jaune','S',   'kg', 'Chine',       'toute_annee'),
('Curcuma',           'كركم',       'Turmeric',         'legume','tubercule', 'orange',    'S',   'kg', 'Inde',        'toute_annee'),
('Taro',              'قلقاس',      'Taro',             'legume','tubercule', 'brun',      'M',   'kg', 'Afrique',     'toute_annee');

-- ─── 3. ARTICLES (CATALOGUE ACTIF POUR LES ACHATS/VENTES) ────────────────────
CREATE TABLE IF NOT EXISTS public.fl_articles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom                 TEXT NOT NULL,
  categorie           TEXT,
  unite               TEXT DEFAULT 'kg',
  um                  TEXT,               -- Unite de mesure secondaire (caisse, palette)
  colisage_par_um     NUMERIC DEFAULT 1,
  prix_achat          NUMERIC DEFAULT 0,
  prix_vente          NUMERIC DEFAULT 0,
  stock_disponible    NUMERIC DEFAULT 0,
  stock_reserve       NUMERIC DEFAULT 0,  -- Qte reservee par commandes validees
  stock_minimum       NUMERIC DEFAULT 0,
  actif               BOOLEAN DEFAULT TRUE,
  dlc_jours           INTEGER,             -- Duree de vie en jours
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. CLIENTS & FOURNISSEURS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom         TEXT NOT NULL,
  type        TEXT,
  secteur     TEXT,
  zone        TEXT,
  telephone   TEXT,
  email       TEXT,
  adresse     TEXT,
  taille      TEXT,
  rotation    TEXT,
  latitude    NUMERIC,
  longitude   NUMERIC,
  credit_encours NUMERIC DEFAULT 0,
  actif       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fl_fournisseurs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom        TEXT NOT NULL,
  telephone  TEXT,
  email      TEXT,
  adresse    TEXT,
  actif      BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. COMMANDES CLIENTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_commandes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  client_id      UUID REFERENCES public.fl_clients(id) ON DELETE SET NULL,
  client_nom     TEXT,
  vendeur_id     UUID REFERENCES public.fl_users(id) ON DELETE SET NULL,
  vendeur_nom    TEXT,
  statut         TEXT DEFAULT 'en_attente',   -- 'en_attente'|'validée'|'en_cours'|'livrée'|'annulée'
  montant_total  NUMERIC DEFAULT 0,
  notes          TEXT,
  heure_livraison TEXT,
  gps_lat        NUMERIC,
  gps_lng        NUMERIC,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fl_commandes_lignes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commande_id  UUID REFERENCES public.fl_commandes(id) ON DELETE CASCADE,
  article_id   UUID REFERENCES public.fl_articles(id) ON DELETE SET NULL,
  article_nom  TEXT,
  quantite     NUMERIC NOT NULL,
  prix_vente   NUMERIC NOT NULL,
  unite        TEXT DEFAULT 'kg',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. BONS D'ACHAT ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_bons_achat (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  acheteur_id     UUID REFERENCES public.fl_users(id) ON DELETE SET NULL,
  acheteur_nom    TEXT,
  fournisseur_id  UUID REFERENCES public.fl_fournisseurs(id) ON DELETE SET NULL,
  fournisseur_nom TEXT,
  montant_total   NUMERIC DEFAULT 0,
  statut          TEXT DEFAULT 'validé',
  mode_paiement   TEXT DEFAULT 'especes',
  credit          BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fl_bons_achat_lignes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bon_achat_id UUID REFERENCES public.fl_bons_achat(id) ON DELETE CASCADE,
  article_id   UUID REFERENCES public.fl_articles(id) ON DELETE SET NULL,
  article_nom  TEXT,
  quantite     NUMERIC NOT NULL,
  prix_achat   NUMERIC NOT NULL,
  unite        TEXT DEFAULT 'kg',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. PURCHASE ORDERS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_purchase_orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  fournisseur_id   UUID REFERENCES public.fl_fournisseurs(id) ON DELETE SET NULL,
  fournisseur_nom  TEXT,
  statut           TEXT DEFAULT 'draft',  -- 'draft'|'validé'|'receptionné'|'annulé'
  montant_total    NUMERIC DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. RECEPTONS MARCHANDISES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_receptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  bon_achat_id      UUID REFERENCES public.fl_bons_achat(id) ON DELETE SET NULL,
  po_id             UUID REFERENCES public.fl_purchase_orders(id) ON DELETE SET NULL,
  recepteur_id      UUID REFERENCES public.fl_users(id) ON DELETE SET NULL,
  recepteur_nom     TEXT,
  fournisseur_nom   TEXT,
  statut            TEXT DEFAULT 'en_cours',  -- 'en_cours'|'complet'|'partiel'
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 9. STOCK MOUVEMENT ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_stock_mouvements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  article_id   UUID REFERENCES public.fl_articles(id) ON DELETE SET NULL,
  article_nom  TEXT,
  type         TEXT NOT NULL,   -- 'entree'|'sortie'|'reservation'|'retour'|'ajustement'
  quantite     NUMERIC NOT NULL,
  source_type  TEXT,            -- 'commande'|'bon_achat'|'reception'|'retour'
  source_id    UUID,
  notes        TEXT,
  user_id      UUID REFERENCES public.fl_users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 10. BONS DE PREPARATION ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_bons_preparation (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,    -- Ex: TRIP-2026-PR01 (genere automatiquement)
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  statut      TEXT DEFAULT 'en_cours', -- 'en_cours'|'valide'|'annule'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 11. SHELF LIFE / DLC ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_shelf_life (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id     UUID REFERENCES public.fl_articles(id) ON DELETE SET NULL,
  article_nom    TEXT,
  reception_id   UUID REFERENCES public.fl_receptions(id) ON DELETE SET NULL,
  date_reception DATE NOT NULL DEFAULT CURRENT_DATE,
  date_expiration DATE,
  quantite       NUMERIC,
  statut         TEXT DEFAULT 'frais',   -- 'frais'|'proche'|'expire'
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 12. TRIPS & LIVRAISONS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_trips (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  code         TEXT,             -- Ex: TRIP-2026-001
  livreur_id   UUID REFERENCES public.fl_users(id) ON DELETE SET NULL,
  livreur_nom  TEXT,
  statut       TEXT DEFAULT 'planifie',  -- 'planifie'|'en_route'|'livre'|'retour'
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 13. FEEDBACK / AVIS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_feedback (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.fl_users(id) ON DELETE SET NULL,
  user_nom    TEXT,
  user_role   TEXT,
  note        INTEGER CHECK (note BETWEEN 1 AND 5),
  commentaire TEXT,
  module      TEXT,            -- 'achat'|'commercial'|'logistique'|'general'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 14. AGENTS IA & ESCALADE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_agents_ia (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom         TEXT NOT NULL,
  niveau      TEXT NOT NULL,    -- 'N1'|'N2'|'N3'
  role_metier TEXT,
  telephone   TEXT,
  email       TEXT,
  actif       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Agents N1, N2, N3
TRUNCATE TABLE public.fl_agents_ia RESTART IDENTITY CASCADE;
INSERT INTO public.fl_agents_ia (nom, niveau, role_metier, telephone, email) VALUES
  ('Mustapha',    'N1', 'Agent terrain mobile',             NULL,              NULL),
  ('Simohammed',  'N1', 'Agent terrain mobile',             NULL,              NULL),
  ('Jawad',       'N2', 'Back-office manager',              NULL,              NULL),
  ('Zizi',        'N2', 'Back-office logistique',           NULL,              NULL),
  ('Azmi',        'N2', 'Back-office achat',                NULL,              NULL),
  ('Hicham',      'N2', 'Back-office commercial',           NULL,              NULL),
  ('Ashel',       'N2', 'Back-office finance',              NULL,              NULL),
  ('Admin',       'N3', 'Direction — alerte critique',      '+212663898707',   'admin@optimflux.ma');

CREATE TABLE IF NOT EXISTS public.fl_escalation_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  niveau       TEXT NOT NULL,   -- 'N1'|'N2'|'N3'
  description  TEXT NOT NULL,
  statut       TEXT DEFAULT 'ouvert',  -- 'ouvert'|'resolu'|'escalade'
  user_id      UUID REFERENCES public.fl_users(id) ON DELETE SET NULL,
  user_nom     TEXT,
  alertes_envoyees TEXT[],      -- ['email', 'sms']
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- On active RLS sur toutes les tables et autorise anon (acces via anon key)
ALTER TABLE public.fl_users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_produits_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_articles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_fournisseurs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_commandes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_commandes_lignes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_bons_achat         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_bons_achat_lignes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_purchase_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_receptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_stock_mouvements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_bons_preparation   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_shelf_life         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_trips              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_feedback           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_agents_ia          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_escalation_log     ENABLE ROW LEVEL SECURITY;

-- Politique universelle : acces complet via anon (application gere l'auth)
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'fl_users','fl_produits_catalogue','fl_articles',
    'fl_clients','fl_fournisseurs',
    'fl_commandes','fl_commandes_lignes',
    'fl_bons_achat','fl_bons_achat_lignes',
    'fl_purchase_orders','fl_receptions',
    'fl_stock_mouvements','fl_bons_preparation',
    'fl_shelf_life','fl_trips','fl_feedback',
    'fl_agents_ia','fl_escalation_log'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_anon_all" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_anon_all" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;

-- ─── TRIGGER: maj auto de stock_reserve quand commande validée ───────────────
CREATE OR REPLACE FUNCTION public.fn_update_stock_reserve()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Quand une commande passe a "validée", reserver les quantites
  IF NEW.statut = 'validée' AND (OLD.statut IS NULL OR OLD.statut != 'validée') THEN
    UPDATE public.fl_articles a
    SET stock_reserve = COALESCE(stock_reserve, 0) + cl.quantite
    FROM public.fl_commandes_lignes cl
    WHERE cl.commande_id = NEW.id AND cl.article_id = a.id;
  END IF;
  -- Si commande annulée depuis validée, liberer les quantites
  IF NEW.statut = 'annulée' AND OLD.statut = 'validée' THEN
    UPDATE public.fl_articles a
    SET stock_reserve = GREATEST(0, COALESCE(stock_reserve, 0) - cl.quantite)
    FROM public.fl_commandes_lignes cl
    WHERE cl.commande_id = NEW.id AND cl.article_id = a.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_stock_reserve ON public.fl_commandes;
CREATE TRIGGER trg_update_stock_reserve
  AFTER UPDATE ON public.fl_commandes
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_stock_reserve();

-- ─── TRIGGER: generation automatique code bon de preparation ─────────────────
CREATE OR REPLACE FUNCTION public.fn_gen_bon_prep_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 'PR(\d+)') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.fl_bons_preparation
  WHERE EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM NEW.date);
  NEW.code := 'TRIP-' || TO_CHAR(NEW.date, 'YYYY') || '-PR' || LPAD(seq_num::TEXT, 2, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gen_bon_prep_code ON public.fl_bons_preparation;
CREATE TRIGGER trg_gen_bon_prep_code
  BEFORE INSERT ON public.fl_bons_preparation
  FOR EACH ROW WHEN (NEW.code IS NULL OR NEW.code = '')
  EXECUTE FUNCTION public.fn_gen_bon_prep_code();

-- ─── INDEX pour performances ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_commandes_date   ON public.fl_commandes(date);
CREATE INDEX IF NOT EXISTS idx_commandes_statut ON public.fl_commandes(statut);
CREATE INDEX IF NOT EXISTS idx_bons_achat_date  ON public.fl_bons_achat(date);
CREATE INDEX IF NOT EXISTS idx_articles_actif   ON public.fl_articles(actif);
CREATE INDEX IF NOT EXISTS idx_shelf_life_date  ON public.fl_shelf_life(date_expiration);
CREATE INDEX IF NOT EXISTS idx_escalation_niveau ON public.fl_escalation_log(niveau);

-- ─── FIN DE MIGRATION V9 ─────────────────────────────────────────────────────
-- Tables crees : 18 tables metier
-- Fruits & Legumes : 100+ produits du monde entier
-- Triggers : stock_reserve automatique, code bon preparation auto
-- RLS : actif sur toutes les tables, acces anon autorise
-- ─────────────────────────────────────────────────────────────────────────────
