-- ============================================================
-- OPTIMFLUX — Migration v8 : Architecture propre Supabase
-- Nouveau projet : https://vynbejciuzedzurxhsui.supabase.co
-- Date : 2026-01
-- Contenu :
--   1. Table fl_produits_catalogue  (fruits & légumes mondiaux)
--   2. Table fl_agents_ia           (hiérarchie N1/N2/N3)
--   3. Table fl_escalation_log      (workflow alertes)
--   4. Table fl_feedback            (avis utilisateurs)
-- ============================================================

-- ── 0. Extensions ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. CATALOGUE FRUITS & LÉGUMES DU MONDE ENTIER
-- ============================================================
CREATE TABLE IF NOT EXISTS fl_produits_catalogue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom             TEXT        NOT NULL,
  nom_ar          TEXT,
  nom_en          TEXT        NOT NULL,
  categorie       TEXT        NOT NULL,   -- fruit_tropical, legume_feuille, agrume, etc.
  sous_categorie  TEXT,
  couleur         TEXT,                   -- vert, rouge, jaune, orange, violet, blanc, marron
  taille_standard TEXT,                   -- petit, moyen, grand, variable
  region_origine  TEXT,                   -- Maroc, Espagne, Brésil, Monde…
  saison          TEXT,                   -- printemps, ete, automne, hiver, toute_annee
  unite_mesure    TEXT DEFAULT 'kg',      -- kg, piece, caisse, botte
  prix_moyen_dh   NUMERIC(10,2),
  shelf_life_jours INTEGER,
  bio_disponible  BOOLEAN DEFAULT FALSE,
  actif           BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_catalogue_categorie  ON fl_produits_catalogue(categorie);
CREATE INDEX IF NOT EXISTS idx_catalogue_nom        ON fl_produits_catalogue(nom);

-- ── Données : Fruits & Légumes mondiaux exhaustifs ───────────────────────────
INSERT INTO fl_produits_catalogue (nom, nom_ar, nom_en, categorie, sous_categorie, couleur, taille_standard, region_origine, saison, unite_mesure, prix_moyen_dh, shelf_life_jours, bio_disponible) VALUES

-- AGRUMES
('Citron',         'ليمون',      'Lemon',         'agrume',           'citron_acide',  'jaune',    'moyen',    'Maroc/Espagne',   'hiver/printemps', 'kg',    4.50,  14, TRUE),
('Orange',         'برتقال',     'Orange',         'agrume',           'orange_douce',  'orange',   'moyen',    'Maroc/Espagne',   'hiver',           'kg',    3.00,  21, TRUE),
('Mandarine',      'يوسفي',      'Mandarin',       'agrume',           'mandarine',     'orange',   'petit',    'Maroc',           'hiver',           'kg',    4.00,  14, TRUE),
('Pamplemousse',   'بمبير',      'Grapefruit',     'agrume',           'pamplemousse',  'jaune',    'grand',    'Israel/Espagne',  'hiver',           'kg',    5.00,  21, FALSE),
('Lime',           'ليمون أخضر', 'Lime',           'agrume',           'lime',          'vert',     'petit',    'Bresil/Mexique',  'toute_annee',     'kg',    6.00,  10, FALSE),
('Bergamote',      'برغموت',     'Bergamot',       'agrume',           'bergamote',     'jaune',    'moyen',    'Italie',          'hiver',           'kg',   18.00,   7, FALSE),
('Cédrat',         'أترج',       'Citron',         'agrume',           'cedrat',        'jaune',    'grand',    'Corse/Maroc',     'automne/hiver',   'piece',20.00,  10, FALSE),
('Clémentin',      'كليمنتين',   'Clementine',     'agrume',           'clementine',    'orange',   'petit',    'Maroc/Espagne',   'automne/hiver',   'kg',    4.50,  14, TRUE),

-- FRUITS TROPICAUX
('Mangue',         'مانجو',      'Mango',          'fruit_tropical',   'mangue',        'orange',   'grand',    'Afrique/Bresil',  'ete',             'kg',   12.00,   7, FALSE),
('Ananas',         'أناناس',     'Pineapple',      'fruit_tropical',   'ananas',        'jaune',    'grand',    'Cote d Ivoire',   'toute_annee',     'piece', 8.00,  10, FALSE),
('Papaye',         'بابايا',     'Papaya',         'fruit_tropical',   'papaye',        'orange',   'grand',    'Bresil/Maroc',    'toute_annee',     'kg',    7.00,   5, FALSE),
('Goyave',         'جوافة',      'Guava',          'fruit_tropical',   'goyave',        'vert',     'moyen',    'Maroc/Egypte',    'ete/automne',     'kg',    8.00,   5, FALSE),
('Fruit du dragon','فاكهة التنين','Dragon Fruit',   'fruit_tropical',   'pitaya',        'rouge',    'moyen',    'Vietnam/Maroc',   'ete',             'piece',10.00,   7, FALSE),
('Litchi',         'ليتشي',      'Lychee',         'fruit_tropical',   'litchi',        'rouge',    'petit',    'Chine/Reunion',   'ete',             'kg',   25.00,   5, FALSE),
('Maracuja',       'ماراكويا',   'Passion Fruit',  'fruit_tropical',   'maracuja',      'jaune',    'petit',    'Bresil/Colombie', 'toute_annee',     'kg',   30.00,   7, FALSE),
('Ramboutan',      'رمبوطان',    'Rambutan',       'fruit_tropical',   'ramboutan',     'rouge',    'petit',    'Asie du Sud-Est', 'ete',             'kg',   35.00,   5, FALSE),
('Durian',         'دوريان',     'Durian',         'fruit_tropical',   'durian',        'jaune',    'grand',    'Malaisie',        'ete',             'piece',50.00,   4, FALSE),
('Jackfruit',      'جاكفروت',    'Jackfruit',      'fruit_tropical',   'jackfruit',     'jaune',    'grand',    'Inde/Bangladesh', 'ete',             'piece',40.00,   5, FALSE),
('Avocat',         'أفوكادو',    'Avocado',        'fruit_tropical',   'avocat',        'vert',     'moyen',    'Maroc/Mexique',   'toute_annee',     'kg',   15.00,   7, TRUE),
('Banane',         'موز',        'Banana',         'fruit_tropical',   'banane',        'jaune',    'moyen',    'Ecuador/Cote IVO','toute_annee',     'kg',    3.50,   5, TRUE),
('Plantain',       'موز البشل',  'Plantain',       'fruit_tropical',   'plantain',      'vert',     'grand',    'Afrique',         'toute_annee',     'kg',    4.00,   7, FALSE),
('Noix de coco',   'جوز الهند',  'Coconut',        'fruit_tropical',   'coco',          'marron',   'grand',    'Sri Lanka/Maroc', 'toute_annee',     'piece', 6.00,  30, FALSE),
('Carambole',      'كارامبول',   'Starfruit',      'fruit_tropical',   'carambole',     'jaune',    'moyen',    'Malaisie/Maroc',  'automne',         'kg',   22.00,   7, FALSE),
('Tamarin',        'تمر هندي',   'Tamarind',       'fruit_tropical',   'tamarin',       'marron',   'variable', 'Inde/Maroc',      'ete',             'kg',   20.00,  60, FALSE),

-- BAIES & PETITS FRUITS
('Fraise',         'فراولة',     'Strawberry',     'baie',             'fraise',        'rouge',    'petit',    'Maroc/Espagne',   'printemps',       'kg',   12.00,   3, TRUE),
('Framboise',      'توت العليق',  'Raspberry',      'baie',             'framboise',     'rouge',    'petit',    'Maroc/France',    'ete',             'kg',   40.00,   2, TRUE),
('Myrtille',       'توت أزرق',   'Blueberry',      'baie',             'myrtille',      'bleu',     'petit',    'Maroc/Chili',     'ete',             'kg',   45.00,   7, TRUE),
('Mure',           'توت أسود',   'Blackberry',     'baie',             'mure',          'violet',   'petit',    'Maroc',           'ete',             'kg',   35.00,   2, TRUE),
('Groseille',      'كشمش',       'Currant',        'baie',             'groseille',     'rouge',    'petit',    'France',          'ete',             'kg',   50.00,   5, FALSE),
('Cassis',         'كاسيس',      'Blackcurrant',   'baie',             'cassis',        'violet',   'petit',    'France',          'ete',             'kg',   55.00,   3, FALSE),
('Cerise',         'كرز',        'Cherry',         'baie',             'cerise',        'rouge',    'petit',    'Maroc/Turquie',   'printemps/ete',   'kg',   18.00,   5, TRUE),
('Mirtillo rosso', 'توت أحمر',   'Cranberry',      'baie',             'cranberry',     'rouge',    'petit',    'USA',             'automne',         'kg',   60.00,  14, FALSE),
('Physalis',       'فيزاليس',    'Physalis',       'baie',             'physalis',      'orange',   'petit',    'Perou/Maroc',     'automne',         'kg',   45.00,   7, FALSE),

-- RAISINS
('Raisin blanc',   'عنب أبيض',   'White Grape',    'raisin',           'raisin_table',  'vert',     'petit',    'Maroc/Espagne',   'ete/automne',     'kg',    8.00,  10, TRUE),
('Raisin rouge',   'عنب أحمر',   'Red Grape',      'raisin',           'raisin_table',  'rouge',    'petit',    'Maroc/Espagne',   'ete/automne',     'kg',    9.00,  10, TRUE),
('Raisin noir',    'عنب أسود',   'Black Grape',    'raisin',           'raisin_table',  'violet',   'petit',    'Maroc/Italie',    'ete/automne',     'kg',   10.00,  10, FALSE),

-- MELONS & CUCURBITACEES
('Melon',          'بطيخ أصفر',  'Melon',          'cucurbitacee',     'melon',         'jaune',    'grand',    'Maroc/Espagne',   'ete',             'piece',12.00,  14, TRUE),
('Pasteque',       'دلاح',       'Watermelon',     'cucurbitacee',     'pasteque',      'vert',     'grand',    'Maroc/Egypte',    'ete',             'piece',15.00,   7, TRUE),
('Cantaloup',      'شمام',       'Cantaloupe',     'cucurbitacee',     'cantaloupe',    'orange',   'grand',    'Maroc',           'ete',             'piece',10.00,   7, FALSE),
('Courge',         'قرع',        'Squash',         'cucurbitacee',     'courge',        'orange',   'grand',    'Maroc',           'automne',         'kg',    3.00,  30, FALSE),
('Courgette',      'كوسة',       'Zucchini',       'cucurbitacee',     'courgette',     'vert',     'moyen',    'Maroc/Espagne',   'ete',             'kg',    4.00,   7, TRUE),
('Concombre',      'خيار',       'Cucumber',       'cucurbitacee',     'concombre',     'vert',     'moyen',    'Maroc/Espagne',   'ete',             'kg',    3.50,   7, TRUE),
('Citrouille',     'يقطين',      'Pumpkin',        'cucurbitacee',     'citrouille',    'orange',   'grand',    'Maroc',           'automne',         'kg',    2.50,  60, FALSE),

-- FRUITS A PEPINS
('Pomme',          'تفاح',       'Apple',          'fruit_pepin',      'pomme',         'rouge',    'moyen',    'Maroc/France',    'automne',         'kg',    5.00,  30, TRUE),
('Poire',          'إجاص',       'Pear',           'fruit_pepin',      'poire',         'vert',     'moyen',    'Maroc/France',    'automne',         'kg',    6.00,  14, FALSE),
('Coing',          'سفرجل',      'Quince',         'fruit_pepin',      'coing',         'jaune',    'grand',    'Maroc',           'automne',         'kg',    5.00,  30, FALSE),

-- FRUITS A NOYAU
('Peche',          'خوخ',        'Peach',          'fruit_noyau',      'peche',         'orange',   'moyen',    'Maroc/Espagne',   'ete',             'kg',    7.00,   5, TRUE),
('Nectarine',      'نكتارين',    'Nectarine',      'fruit_noyau',      'nectarine',     'rouge',    'moyen',    'Maroc/Espagne',   'ete',             'kg',    8.00,   5, TRUE),
('Abricot',        'مشمش',       'Apricot',        'fruit_noyau',      'abricot',       'orange',   'petit',    'Maroc',           'printemps/ete',   'kg',    6.00,   4, TRUE),
('Prune',          'برقوق',      'Plum',           'fruit_noyau',      'prune',         'violet',   'moyen',    'Maroc/Espagne',   'ete',             'kg',    7.00,   7, FALSE),
('Mirabelle',      'ميرابيل',    'Mirabelle',      'fruit_noyau',      'mirabelle',     'jaune',    'petit',    'France',          'ete',             'kg',   12.00,   3, FALSE),
('Datte',          'تمر',        'Date',           'fruit_noyau',      'datte',         'marron',   'petit',    'Maroc/Tunisie',   'automne/hiver',   'kg',   18.00,  90, FALSE),
('Olive',          'زيتون',      'Olive',          'fruit_noyau',      'olive',         'vert',     'petit',    'Maroc',           'automne',         'kg',   10.00,  14, FALSE),

-- FIGUES
('Figue fraiche',  'تين طازج',   'Fresh Fig',      'figue',            'figue',         'violet',   'moyen',    'Maroc/Turquie',   'ete/automne',     'kg',   15.00,   3, TRUE),
('Figue sechee',   'تين مجفف',   'Dried Fig',      'figue',            'figue_seche',   'marron',   'petit',    'Maroc/Turquie',   'toute_annee',     'kg',   30.00, 180, FALSE),

-- LEGUMES-FRUITS
('Tomate',         'طماطم',      'Tomato',         'legume_fruit',     'tomate_ronde',  'rouge',    'moyen',    'Maroc/Espagne',   'toute_annee',     'kg',    4.00,   7, TRUE),
('Tomate cerise',  'طماطم كرزية','Cherry Tomato',  'legume_fruit',     'tomate_cerise', 'rouge',    'petit',    'Maroc',           'toute_annee',     'kg',    8.00,   5, TRUE),
('Poivron rouge',  'فلفل أحمر',  'Red Pepper',     'legume_fruit',     'poivron',       'rouge',    'grand',    'Maroc/Espagne',   'ete',             'kg',    6.00,  10, TRUE),
('Poivron vert',   'فلفل أخضر',  'Green Pepper',   'legume_fruit',     'poivron',       'vert',     'grand',    'Maroc/Espagne',   'ete',             'kg',    5.00,  10, TRUE),
('Poivron jaune',  'فلفل أصفر',  'Yellow Pepper',  'legume_fruit',     'poivron',       'jaune',    'grand',    'Maroc/Espagne',   'ete',             'kg',    6.50,  10, FALSE),
('Aubergine',      'باذنجان',    'Eggplant',       'legume_fruit',     'aubergine',     'violet',   'grand',    'Maroc/Espagne',   'ete',             'kg',    4.00,   7, TRUE),
('Piment',         'فلفل حار',   'Chili',          'legume_fruit',     'piment',        'rouge',    'petit',    'Maroc',           'ete',             'kg',   12.00,  10, FALSE),
('Gombo',          'ملوخية بزر', 'Okra',           'legume_fruit',     'gombo',         'vert',     'petit',    'Maroc/Egypte',    'ete',             'kg',    8.00,   3, FALSE),

-- LEGUMES RACINES & TUBERCULES
('Carotte',        'جزر',        'Carrot',         'legume_racine',    'carotte',       'orange',   'moyen',    'Maroc',           'toute_annee',     'kg',    2.50,  21, TRUE),
('Betterave',      'شمندر',      'Beet',           'legume_racine',    'betterave',     'rouge',    'moyen',    'Maroc',           'automne/hiver',   'kg',    3.00,  14, FALSE),
('Navet',          'لفت',        'Turnip',         'legume_racine',    'navet',         'blanc',    'moyen',    'Maroc',           'hiver',           'kg',    2.00,  14, FALSE),
('Radis',          'فجل',        'Radish',         'legume_racine',    'radis',         'rouge',    'petit',    'Maroc',           'printemps',       'botte',  3.00,   5, TRUE),
('Panais',         'جزر أبيض',   'Parsnip',        'legume_racine',    'panais',        'blanc',    'moyen',    'France',          'hiver',           'kg',    6.00,  14, FALSE),
('Patate douce',   'بطاطا حلوة', 'Sweet Potato',   'legume_racine',    'patate_douce',  'orange',   'moyen',    'Maroc/Afrique',   'automne',         'kg',    4.00,  21, FALSE),
('Pomme de terre', 'بطاطا',      'Potato',         'legume_racine',    'pomme_de_terre','jaune',    'moyen',    'Maroc',           'toute_annee',     'kg',    2.00,  30, FALSE),
('Manioc',         'مانيوك',     'Cassava',        'legume_racine',    'manioc',        'blanc',    'grand',    'Afrique',         'toute_annee',     'kg',    3.00,  10, FALSE),
('Igname',         'إيغنام',     'Yam',            'legume_racine',    'igname',        'marron',   'grand',    'Afrique',         'toute_annee',     'kg',    5.00,  21, FALSE),
('Taro',           'قلقاس',      'Taro',           'legume_racine',    'taro',          'marron',   'moyen',    'Maroc/Asie',      'automne',         'kg',    4.00,  21, FALSE),
('Celeri-rave',    'كرفس جذر',   'Celeriac',       'legume_racine',    'celeri_rave',   'blanc',    'grand',    'France',          'automne/hiver',   'kg',    6.00,  21, FALSE),

-- LEGUMES FEUILLES & SALADES
('Laitue',         'خس',         'Lettuce',        'legume_feuille',   'laitue',        'vert',     'moyen',    'Maroc',           'toute_annee',     'piece',  2.50,   3, TRUE),
('Epinard',        'سبانخ',      'Spinach',        'legume_feuille',   'epinard',       'vert',     'petit',    'Maroc',           'hiver/printemps', 'kg',    5.00,   2, TRUE),
('Chou',           'كرنب',       'Cabbage',        'legume_feuille',   'chou',          'vert',     'grand',    'Maroc',           'hiver',           'piece',  4.00,  14, FALSE),
('Chou rouge',     'كرنب أحمر',  'Red Cabbage',    'legume_feuille',   'chou_rouge',    'violet',   'grand',    'Maroc/France',    'hiver',           'piece',  5.00,  14, FALSE),
('Chou-fleur',     'قرنبيط',     'Cauliflower',    'legume_feuille',   'chou_fleur',    'blanc',    'grand',    'Maroc',           'hiver',           'piece',  5.00,   7, FALSE),
('Brocoli',        'بروكلي',     'Broccoli',       'legume_feuille',   'brocoli',       'vert',     'grand',    'Maroc/Espagne',   'hiver',           'piece',  6.00,   5, TRUE),
('Chou de Bruxelles','كرنب بروكسل','Brussels Sprout','legume_feuille', 'choux_brux',    'vert',     'petit',    'France',          'hiver',           'kg',    8.00,   7, FALSE),
('Roquette',       'جرجير',      'Arugula',        'legume_feuille',   'roquette',      'vert',     'petit',    'Maroc',           'hiver/printemps', 'botte',  4.00,   3, TRUE),
('Cresson',        'الرشاد',     'Watercress',     'legume_feuille',   'cresson',       'vert',     'petit',    'Maroc',           'hiver',           'botte',  3.00,   2, FALSE),
('Mache',          'دقة',        'Lamb Lettuce',   'legume_feuille',   'mache',         'vert',     'petit',    'France',          'hiver',           'kg',   15.00,   3, FALSE),
('Endive',         'شيكوريا',    'Endive',         'legume_feuille',   'endive',        'blanc',    'moyen',    'France/Belgique', 'hiver',           'piece',  4.00,   7, FALSE),
('Radicchio',      'راديكيو',    'Radicchio',      'legume_feuille',   'radicchio',     'violet',   'moyen',    'Italie',          'hiver',           'piece',  7.00,   7, FALSE),
('Chou kale',      'كيل',        'Kale',           'legume_feuille',   'kale',          'vert',     'grand',    'USA/Maroc',       'hiver',           'kg',   12.00,   5, TRUE),
('Blette',         'سلق',        'Swiss Chard',    'legume_feuille',   'blette',        'vert',     'grand',    'Maroc',           'toute_annee',     'botte',  3.50,   3, FALSE),
('Ortie',          'حريق',       'Nettle',         'legume_feuille',   'ortie',         'vert',     'petit',    'Maroc',           'printemps',       'botte',  5.00,   2, FALSE),

-- LEGUMES BULBES & ALLIUM
('Oignon',         'بصل',        'Onion',          'legume_bulbe',     'oignon',        'jaune',    'moyen',    'Maroc',           'toute_annee',     'kg',    2.00,  30, FALSE),
('Oignon rouge',   'بصل أحمر',   'Red Onion',      'legume_bulbe',     'oignon_rouge',  'violet',   'moyen',    'Maroc',           'toute_annee',     'kg',    2.50,  21, FALSE),
('Echalote',       'عشلوت',      'Shallot',        'legume_bulbe',     'echalote',      'brun',     'petit',    'France/Maroc',    'toute_annee',     'kg',    8.00,  21, FALSE),
('Ail',            'ثوم',        'Garlic',         'legume_bulbe',     'ail',           'blanc',    'petit',    'Maroc/Espagne',   'toute_annee',     'kg',   12.00,  60, FALSE),
('Ail rose',       'ثوم وردي',   'Pink Garlic',    'legume_bulbe',     'ail_rose',      'rose',     'petit',    'France',          'automne',         'kg',   20.00,  60, FALSE),
('Poireau',        'كراث',       'Leek',           'legume_bulbe',     'poireau',       'vert',     'grand',    'Maroc/France',    'automne/hiver',   'botte',  4.00,  10, FALSE),
('Ciboule',        'بصل أخضر',   'Spring Onion',   'legume_bulbe',     'ciboule',       'vert',     'petit',    'Maroc',           'printemps',       'botte',  3.00,   5, FALSE),
('Fenouil',        'شمر',        'Fennel',         'legume_bulbe',     'fenouil',       'blanc',    'grand',    'France/Maroc',    'hiver',           'piece',  5.00,   7, FALSE),

-- LEGUMES TIGES & FLEURS
('Artichaut',      'أرضي شوكي',  'Artichoke',      'legume_tige',      'artichaut',     'vert',     'grand',    'Maroc',           'printemps/hiver', 'piece',  4.00,   7, FALSE),
('Asperge verte',  'هليون أخضر', 'Green Asparagus','legume_tige',      'asperge',       'vert',     'grand',    'Maroc/Espagne',   'printemps',       'botte', 25.00,   3, FALSE),
('Asperge blanche','هليون أبيض', 'White Asparagus','legume_tige',      'asperge',       'blanc',    'grand',    'France',          'printemps',       'botte', 35.00,   3, FALSE),
('Celeri',         'كرفس',       'Celery',         'legume_tige',      'celeri',        'vert',     'grand',    'Maroc/France',    'toute_annee',     'piece',  4.00,   7, FALSE),
('Bette poiree',   'سلق أصفر',   'Chard',          'legume_tige',      'bette',         'vert',     'grand',    'Maroc',           'toute_annee',     'botte',  3.50,   3, FALSE),

-- CHAMPIGNONS
('Champignon Paris','فطر باريس', 'Button Mushroom','champignon',       'champignon',    'blanc',    'petit',    'Maroc/France',    'toute_annee',     'kg',   15.00,   5, FALSE),
('Pleurote',       'فطر المحار', 'Oyster Mushroom','champignon',       'pleurote',      'gris',     'variable', 'Maroc',           'toute_annee',     'kg',   25.00,   3, FALSE),
('Shiitake',       'فطر شيتاكي', 'Shiitake',       'champignon',       'shiitake',      'marron',   'moyen',    'Japon/Chine',     'toute_annee',     'kg',   40.00,   5, FALSE),
('Truffe',         'كمأة',       'Truffle',        'champignon',       'truffe',        'marron',   'variable', 'Maroc/France',    'hiver',           'kg',  500.00,   7, FALSE),

-- LEGUMINEUSES FRAICHES
('Petits pois',    'بازلاء',     'Peas',           'legumineuse_fraiche','pois',         'vert',     'petit',    'Maroc',           'printemps',       'kg',    6.00,   3, TRUE),
('Haricot vert',   'لوبية خضراء','Green Bean',     'legumineuse_fraiche','haricot',      'vert',     'moyen',    'Maroc/Espagne',   'ete',             'kg',    5.00,   5, TRUE),
('Feve',           'فول أخضر',   'Broad Bean',     'legumineuse_fraiche','feve',          'vert',     'grand',    'Maroc',           'printemps',       'kg',    4.00,   3, FALSE),
('Mange-tout',     'باميا خضراء','Snow Pea',       'legumineuse_fraiche','mange_tout',    'vert',     'petit',    'Maroc',           'printemps',       'kg',   12.00,   3, FALSE),
('Edamame',        'فول صويا أخضر','Edamame',       'legumineuse_fraiche','edamame',       'vert',     'petit',    'Japon/Chine',     'ete',             'kg',   20.00,   3, FALSE),

-- HERBES AROMATIQUES
('Menthe',         'نعناع',      'Mint',           'herbe_aromatique', 'menthe',        'vert',     'petit',    'Maroc',           'toute_annee',     'botte',  2.00,   3, TRUE),
('Persil',         'معدنوس',     'Parsley',        'herbe_aromatique', 'persil',        'vert',     'petit',    'Maroc',           'toute_annee',     'botte',  1.50,   3, TRUE),
('Coriandre',      'قزبر',       'Coriander',      'herbe_aromatique', 'coriandre',     'vert',     'petit',    'Maroc',           'toute_annee',     'botte',  1.50,   3, TRUE),
('Basilic',        'ريحان',      'Basil',          'herbe_aromatique', 'basilic',       'vert',     'petit',    'Maroc/Italie',    'ete',             'botte',  3.00,   3, TRUE),
('Thym',           'زعتر',       'Thyme',          'herbe_aromatique', 'thym',          'vert',     'petit',    'Maroc',           'toute_annee',     'botte',  3.00,   7, FALSE),
('Romarin',        'إكليل',      'Rosemary',       'herbe_aromatique', 'romarin',       'vert',     'petit',    'Maroc',           'toute_annee',     'botte',  3.00,   7, FALSE),
('Laurier',        'غار',        'Bay Leaf',       'herbe_aromatique', 'laurier',       'vert',     'petit',    'Maroc',           'toute_annee',     'botte',  4.00,  14, FALSE),
('Cerf-euil',      'قزبر فرنسي', 'Chervil',        'herbe_aromatique', 'cerfeuil',      'vert',     'petit',    'France',          'printemps',       'botte',  5.00,   2, FALSE),
('Estragon',       'طرخون',      'Tarragon',       'herbe_aromatique', 'estragon',      'vert',     'petit',    'France',          'ete',             'botte',  6.00,   3, FALSE),
('Aneth',          'شبت',        'Dill',           'herbe_aromatique', 'aneth',         'vert',     'petit',    'Maroc',           'printemps',       'botte',  3.00,   3, FALSE)

ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. TABLE AGENTS IA — HIÉRARCHIE N1/N2/N3
-- ============================================================
CREATE TABLE IF NOT EXISTS fl_agents_ia (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,          -- 'MUSTAPHA', 'SIMOHAMMED', 'JAWAD'...
  nom         TEXT NOT NULL,
  prenom      TEXT,
  niveau      SMALLINT NOT NULL,             -- 1 = terrain, 2 = back-office, 3 = admin
  role_metier TEXT NOT NULL,
  telephone   TEXT,
  email       TEXT,
  actif       BOOLEAN DEFAULT TRUE,
  system_prompt TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO fl_agents_ia (code, nom, prenom, niveau, role_metier, telephone, email, actif) VALUES
-- N1 — Terrain / Mobile
('MUSTAPHA',    'Mustapha',    NULL,      1, 'Agent Terrain Mobile — Commercial & Livraison', '+212600000001', 'mustapha@optimflux.ma',    TRUE),
('SIMOHAMMED',  'Simohammed',  NULL,      1, 'Agent Terrain Mobile — Achat & Reception',     '+212600000002', 'simohammed@optimflux.ma',  TRUE),
-- N2 — Back Office
('JAWAD',       'Jawad',       NULL,      2, 'Agent Supply Chain & Logistique',               '+212600000003', 'jawad@optimflux.ma',       TRUE),
('ZIZI',        'Zizi',        NULL,      2, 'Agent Commercial & CRM',                        '+212600000004', 'zizi@optimflux.ma',        TRUE),
('AZMI',        'Azmi',        NULL,      2, 'Agent Achat & Fournisseurs',                    '+212600000005', 'azmi@optimflux.ma',        TRUE),
('HICHAM',      'Hicham',      NULL,      2, 'Agent Finance & Comptabilite',                  '+212600000006', 'hicham@optimflux.ma',      TRUE),
('ASHEL',       'Ashel',       NULL,      2, 'Agent Digital & Systemes',                      '+212600000007', 'ashel@optimflux.ma',       TRUE),
-- N3 — Admin / Direction
('ADMIN',       'Direction',   'Admin',   3, 'Super Admin — Alerte Critique',                 '+212663898707', 'admin@optimflux.ma',       TRUE)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 3. TABLE ESCALATION LOG — WORKFLOW N1→N2→N3
-- ============================================================
CREATE TABLE IF NOT EXISTS fl_escalation_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       TEXT,                             -- REF auto : ESC-YYYYMMDD-XXX
  niveau_initial  SMALLINT NOT NULL DEFAULT 1,
  niveau_actuel   SMALLINT NOT NULL DEFAULT 1,
  statut          TEXT DEFAULT 'ouvert',            -- ouvert, en_cours, escalade, resolu, ferme
  titre           TEXT NOT NULL,
  description     TEXT NOT NULL,
  agent_n1_code   TEXT REFERENCES fl_agents_ia(code),
  agent_n2_code   TEXT REFERENCES fl_agents_ia(code),
  sms_envoye      BOOLEAN DEFAULT FALSE,
  email_envoye    BOOLEAN DEFAULT FALSE,
  telephone_alerte TEXT DEFAULT '+212663898707',
  resolu_par      TEXT,
  resolution      TEXT,
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_escalation_statut ON fl_escalation_log(statut);
CREATE INDEX IF NOT EXISTS idx_escalation_niveau ON fl_escalation_log(niveau_actuel);

-- Auto-reference trigger
CREATE OR REPLACE FUNCTION set_escalation_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference IS NULL THEN
    NEW.reference := 'ESC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(nextval('escalation_seq') AS TEXT), 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS escalation_seq START 1;

DROP TRIGGER IF EXISTS trg_escalation_reference ON fl_escalation_log;
CREATE TRIGGER trg_escalation_reference
  BEFORE INSERT ON fl_escalation_log
  FOR EACH ROW EXECUTE FUNCTION set_escalation_reference();

-- ============================================================
-- 4. TABLE FEEDBACK UTILISATEURS
-- ============================================================
CREATE TABLE IF NOT EXISTS fl_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT,
  user_name   TEXT,
  user_role   TEXT,
  type        TEXT DEFAULT 'general',   -- general, bug, suggestion, felicitation
  module      TEXT,                     -- achat, commercial, logistique, agents_ia...
  note        SMALLINT CHECK (note BETWEEN 1 AND 5),
  message     TEXT NOT NULL,
  statut      TEXT DEFAULT 'nouveau',   -- nouveau, lu, traite
  lu_par      TEXT,
  reponse     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_type   ON fl_feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_statut ON fl_feedback(statut);

-- ============================================================
-- 5. RLS — Row Level Security (optionnel, securite supplementaire)
-- ============================================================
ALTER TABLE fl_produits_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_agents_ia          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_escalation_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_feedback           ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour le catalogue produits
CREATE POLICY IF NOT EXISTS "catalogue_read_all" ON fl_produits_catalogue
  FOR SELECT USING (TRUE);

-- Agents lisibles par tous
CREATE POLICY IF NOT EXISTS "agents_read_all" ON fl_agents_ia
  FOR SELECT USING (TRUE);

-- Escalation : lecture/ecriture pour utilisateurs authentifies
CREATE POLICY IF NOT EXISTS "escalation_all_auth" ON fl_escalation_log
  FOR ALL USING (TRUE);

-- Feedback : lecture/ecriture pour utilisateurs authentifies
CREATE POLICY IF NOT EXISTS "feedback_all_auth" ON fl_feedback
  FOR ALL USING (TRUE);
