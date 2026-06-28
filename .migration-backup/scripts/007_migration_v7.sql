-- ================================================================
-- OPTIM'FLUX — Migration v7
-- Supabase: https://nbcodflwqvcvcdbpguth.supabase.co
-- 1. World fruits & vegetables master table
-- 2. AI Agents escalation config table
-- 3. Escalation workflow log (N1 → N2 → N3 alert)
-- 4. User feedback table
-- 5. Add require_camera_auth + km columns to existing tables
-- ================================================================

-- ── 1. FRUITS & VEGETABLES WORLD MASTER TABLE ───────────────────
CREATE TABLE IF NOT EXISTS fl_produits_catalogue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom             text NOT NULL,
  nom_ar          text,
  nom_darija      text,
  categorie       text NOT NULL,  -- 'fruit' | 'legume' | 'herbe' | 'tubercule' | 'agrume' | 'exotique'
  sous_categorie  text,
  couleur         text,
  taille_standard text,           -- 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
  unite_vente     text DEFAULT 'kg',
  saison          text,           -- 'printemps' | 'ete' | 'automne' | 'hiver' | 'toute_annee'
  origine_pays    text,
  duree_vie_jours int,            -- shelf life in days at room temp
  temperature_min_c numeric,      -- storage min temp (Celsius)
  temperature_max_c numeric,
  humidite_pct    int,            -- ideal humidity %
  description     text,
  image_url       text,
  actif           boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- Comprehensive world produce data
INSERT INTO fl_produits_catalogue
  (nom, nom_ar, nom_darija, categorie, sous_categorie, couleur, taille_standard, saison, origine_pays, duree_vie_jours, temperature_min_c, temperature_max_c)
VALUES
-- ── AGRUMES ──────────────────────────────────────────────────────
('Orange',         'برتقال',    'lbortoqal',  'agrume',    'citrus',    'orange',  'M',   'hiver',       'Maroc',        14, 5, 10),
('Citron',         'ليمون',     'lhamed',     'agrume',    'citrus',    'jaune',   'M',   'toute_annee', 'Maroc',        21, 7, 13),
('Mandarine',      'يوسفي',     'yousfi',     'agrume',    'citrus',    'orange',  'S',   'hiver',       'Maroc',        10, 5, 10),
('Pamplemousse',   'كريبفروت',  'grapefruit', 'agrume',    'citrus',    'jaune',   'L',   'hiver',       'Maroc',        21, 7, 10),
('Citron vert',    'ليمون أخضر','limone khdra','agrume',   'citrus',    'vert',    'S',   'toute_annee', 'Brésil',       14, 7, 13),
('Clémentine',     'كليمنتين',  'clementine', 'agrume',    'citrus',    'orange',  'S',   'automne',     'Espagne',      10, 5, 8),
('Bergamote',      'بيرقامون',  'bergamot',   'agrume',    'citrus',    'vert',    'M',   'hiver',       'Italie',       14, 5, 10),
-- ── FRUITS TROPICAUX ─────────────────────────────────────────────
('Banane',         'موز',       'mouz',       'fruit',     'tropical',  'jaune',   'M',   'toute_annee', 'Équateur',      7, 13, 15),
('Mangue',         'مانجو',     'manga',      'fruit',     'tropical',  'jaune-rouge','M','ete',         'Inde',          7, 10, 13),
('Ananas',         'أناناس',    'ananas',     'fruit',     'tropical',  'jaune',   'L',   'toute_annee', 'Costa Rica',   14, 10, 15),
('Papaye',         'بابايا',    'papaya',     'fruit',     'tropical',  'orange',  'L',   'toute_annee', 'Mexique',       7, 10, 13),
('Avocat',         'أفوكادو',   'avoca',      'fruit',     'tropical',  'vert',    'M',   'toute_annee', 'Mexique',       7, 5, 8),
('Passion',        'باشن فروت', 'passion',    'fruit',     'tropical',  'violet',  'S',   'ete',         'Brésil',        7, 5, 10),
('Litchi',         'ليتشي',     'litchi',     'fruit',     'tropical',  'rouge',   'S',   'ete',         'Chine',         5, 2, 5),
('Goyave',         'جوافة',     'jwafa',      'fruit',     'tropical',  'vert',    'M',   'toute_annee', 'Maroc',         5, 8, 12),
('Corossol',       'قرصلة',     'corossol',   'fruit',     'tropical',  'vert',    'L',   'toute_annee', 'Antilles',      3, 18, 22),
('Carambole',      'كارامبول',  'carambole',  'fruit',     'tropical',  'jaune',   'M',   'toute_annee', 'Malaisie',      5, 8, 12),
('Durian',         'دوريان',    'durian',     'exotique',  'tropical',  'jaune',   'XL',  'ete',         'Thaïlande',     5, 15, 18),
-- ── FRUITS TEMPÉRÉS ──────────────────────────────────────────────
('Pomme',          'تفاح',      'tefah',      'fruit',     'pomme',     'rouge',   'M',   'automne',     'Maroc',        60, 0, 4),
('Poire',          'كمثرى',     'kmitru',     'fruit',     'pomme',     'vert',    'M',   'automne',     'France',       30, 0, 4),
('Raisin',         'عنب',       'eneb',       'fruit',     'baie',      'violet',  'M',   'automne',     'Maroc',         7, 0, 2),
('Pêche',          'خوخ',       'khukh',      'fruit',     'drupe',     'orange',  'M',   'ete',         'Maroc',         5, 0, 4),
('Abricot',        'مشمش',      'mchmach',    'fruit',     'drupe',     'orange',  'M',   'ete',         'Maroc',         5, 0, 4),
('Prune',          'برقوق',     'berquq',     'fruit',     'drupe',     'violet',  'M',   'ete',         'Maroc',         7, 0, 4),
('Cerise',         'كرز',       'keraz',      'fruit',     'drupe',     'rouge',   'S',   'printemps',   'Maroc',         7, 0, 4),
('Fraise',         'فراولة',    'firwila',    'fruit',     'baie',      'rouge',   'S',   'printemps',   'Maroc',         3, 0, 2),
('Framboise',      'توت أحمر',  'tut ahmar',  'fruit',     'baie',      'rouge',   'S',   'ete',         'France',        3, 0, 2),
('Mûre',           'توت',       'tut',        'fruit',     'baie',      'noir',    'S',   'ete',         'Maroc',         2, 0, 2),
('Myrtille',       'عنب الدب',  'myrtille',   'fruit',     'baie',      'bleu',    'S',   'ete',         'France',        5, 0, 4),
('Kiwi',           'كيوي',      'kiwi',       'fruit',     'autre',     'vert',    'M',   'automne',     'Nouvelle-Zélande',21,0,4),
('Grenade',        'رمان',      'rumman',     'fruit',     'autre',     'rouge',   'L',   'automne',     'Maroc',        60, 5, 8),
('Figue',          'تين',       'tin',        'fruit',     'autre',     'violet',  'M',   'ete',         'Maroc',         3, 0, 4),
('Pastèque',       'دلاح',      'dellah',     'fruit',     'cucurbit',  'rouge',   'XL',  'ete',         'Maroc',        14, 10, 15),
('Melon',          'بطيخ',      'btikh',      'fruit',     'cucurbit',  'jaune',   'L',   'ete',         'Maroc',        14, 8, 12),
('Cantaloup',      'كنتالوب',   'cantaloup',  'fruit',     'cucurbit',  'orange',  'L',   'ete',         'Maroc',         7, 2, 5),
('Coing',          'سفرجل',     'sfarjel',    'fruit',     'pomme',     'jaune',   'L',   'automne',     'Maroc',        60, 0, 4),
('Nectarine',      'نكتارين',   'nectarine',  'fruit',     'drupe',     'orange',  'M',   'ete',         'Espagne',       5, 0, 4),
('Kakis',          'كاكي',      'kaki',       'fruit',     'autre',     'orange',  'M',   'automne',     'Japon',        21, 0, 4),
('Jujube',         'عناب',      'ennab',      'fruit',     'autre',     'rouge',   'S',   'automne',     'Maroc',        30, 5, 10),
('Nèfle',          'نفلة',      'neffla',     'fruit',     'autre',     'orange',  'S',   'printemps',   'Maroc',         5, 5, 8),
-- ── LÉGUMES FEUILLES ─────────────────────────────────────────────
('Tomate',         'طماطم',     'tamtam',     'legume',    'fruit-leg', 'rouge',   'M',   'ete',         'Maroc',         7, 10, 15),
('Tomate cerise',  'طماطم صغيرة','tamtam sghira','legume', 'fruit-leg', 'rouge',   'S',   'ete',         'Maroc',         7, 10, 15),
('Poivron',        'فلفل حلو',  'felfel hlou','legume',    'fruit-leg', 'rouge',   'M',   'ete',         'Maroc',        10, 7, 12),
('Piment',         'فلفل حار',  'felfel har', 'legume',    'fruit-leg', 'rouge',   'S',   'ete',         'Maroc',        10, 7, 12),
('Concombre',      'خيار',      'khiar',      'legume',    'cucurbit',  'vert',    'L',   'ete',         'Maroc',         7, 7, 12),
('Courgette',      'قرع',       'qar3',       'legume',    'cucurbit',  'vert',    'M',   'ete',         'Maroc',         7, 5, 10),
('Aubergine',      'دنجال',     'denjal',     'legume',    'fruit-leg', 'violet',  'M',   'ete',         'Maroc',         7, 10, 15),
('Laitue',         'خس',        'khas',       'legume',    'feuille',   'vert',    'M',   'hiver',       'Maroc',         5, 0, 4),
('Épinard',        'سبانخ',     'sbanikh',    'legume',    'feuille',   'vert',    'M',   'hiver',       'Maroc',         3, 0, 4),
('Brocoli',        'بروكلي',    'broccoli',   'legume',    'crucifere', 'vert',    'M',   'hiver',       'Maroc',         7, 0, 4),
('Chou-fleur',     'قرنبيط',    'qarnbit',    'legume',    'crucifere', 'blanc',   'L',   'hiver',       'Maroc',        14, 0, 4),
('Chou',           'كرنب',      'kramb',      'legume',    'crucifere', 'vert',    'L',   'hiver',       'Maroc',        21, 0, 4),
('Chou rouge',     'كرنب أحمر', 'kramb ahmar','legume',    'crucifere', 'violet',  'L',   'hiver',       'Maroc',        21, 0, 4),
('Artichaut',      'قوق',       'qouq',       'legume',    'fleur',     'vert',    'L',   'printemps',   'Maroc',         7, 0, 4),
('Asperge',        'هليون',     'heliyoun',   'legume',    'tige',      'vert',    'L',   'printemps',   'France',        5, 0, 4),
('Céleri',         'كرفس',      'karfas',     'legume',    'tige',      'vert',    'L',   'automne',     'Maroc',        14, 0, 4),
('Fenouil',        'فنشون',     'fenshaw',    'legume',    'tige',      'blanc',   'L',   'automne',     'Maroc',        14, 0, 4),
('Poireau',        'كراث',      'krath',      'legume',    'bulbe',     'blanc',   'L',   'hiver',       'Maroc',        14, 0, 4),
('Haricot vert',   'فاصوليا',   'fasouliya',  'legume',    'gousse',    'vert',    'M',   'ete',         'Maroc',         5, 5, 8),
('Petit pois',     'جلبانة',    'jelbana',    'legume',    'gousse',    'vert',    'S',   'printemps',   'Maroc',         3, 0, 4),
('Fève',           'فول',       'foul',       'legume',    'gousse',    'vert',    'M',   'printemps',   'Maroc',         5, 0, 4),
('Courge',         'قرعة',      'qar3a',      'legume',    'cucurbit',  'orange',  'XL',  'automne',     'Maroc',        60, 10, 15),
('Citrouille',     'قرعة حمرا', 'qar3a hamra','legume',    'cucurbit',  'orange',  'XL',  'automne',     'Maroc',        90, 10, 15),
('Potimarron',     'قرعة صفراء','qar3a safra','legume',    'cucurbit',  'orange',  'L',   'automne',     'France',       60, 10, 15),
-- ── TUBERCULES & RACINES ─────────────────────────────────────────
('Pomme de terre', 'بطاطس',     'batata',     'tubercule', 'racine',    'beige',   'M',   'toute_annee', 'Maroc',        30, 4, 8),
('Patate douce',   'بطاطا حلوة','batata hlwa', 'tubercule', 'racine',   'orange',  'M',   'automne',     'Maroc',        21, 10, 15),
('Carotte',        'جزرة',      'jzara',      'legume',    'racine',    'orange',  'M',   'hiver',       'Maroc',        14, 0, 4),
('Radis',          'فجل',       'fjel',       'legume',    'racine',    'rouge',   'S',   'hiver',       'Maroc',         7, 0, 4),
('Navet',          'لفت',       'left',       'legume',    'racine',    'blanc',   'M',   'hiver',       'Maroc',        14, 0, 4),
('Betterave',      'بنجر',      'bnjir',      'legume',    'racine',    'violet',  'M',   'hiver',       'Maroc',        14, 0, 4),
('Panais',         'باسطرناق',  'panais',     'legume',    'racine',    'blanc',   'M',   'hiver',       'France',       21, 0, 4),
('Céleri-rave',    'كرفس جذري', 'celeri-rave','legume',    'racine',    'beige',   'L',   'automne',     'France',       14, 0, 4),
('Topinambour',    'طوبنامبور', 'topinambour','tubercule', 'racine',    'beige',   'M',   'hiver',       'France',       14, 0, 4),
('Manioc',         'مانيوك',    'manyoc',     'tubercule', 'racine',    'beige',   'L',   'toute_annee', 'Brésil',        7, 15, 20),
('Igname',         'إيغنام',    'igname',     'tubercule', 'racine',    'beige',   'L',   'toute_annee', 'Afrique',      21, 15, 20),
('Taro',           'قلقاس',     'qelqas',     'tubercule', 'racine',    'marron',  'M',   'toute_annee', 'Asie',         14, 10, 15),
-- ── BULBES & ALLIUMS ─────────────────────────────────────────────
('Oignon',         'بصل',       'bsal',       'legume',    'bulbe',     'blanc',   'M',   'toute_annee', 'Maroc',        30, 0, 4),
('Oignon rouge',   'بصل أحمر',  'bsal ahmar', 'legume',    'bulbe',     'violet',  'M',   'toute_annee', 'Maroc',        30, 0, 4),
('Ail',            'ثوم',       'tawm',       'legume',    'bulbe',     'blanc',   'S',   'toute_annee', 'Maroc',        60, 0, 4),
('Échalote',       'كراوية',    'chalote',    'legume',    'bulbe',     'brun',    'S',   'automne',     'France',       30, 0, 4),
('Ciboulette',     'قصبة',      'ciboule',    'herbe',     'bulbe',     'vert',    'S',   'toute_annee', 'France',        7, 0, 4),
-- ── HERBES AROMATIQUES ───────────────────────────────────────────
('Persil',         'معدنوس',    'maadnos',    'herbe',     'aromatique','vert',    'S',   'toute_annee', 'Maroc',         7, 0, 4),
('Coriandre',      'قزبرة',     'qsbra',      'herbe',     'aromatique','vert',    'S',   'toute_annee', 'Maroc',         5, 0, 4),
('Menthe',         'نعنا',      'naanaa',     'herbe',     'aromatique','vert',    'S',   'toute_annee', 'Maroc',         5, 0, 4),
('Basilic',        'ريحان',     'rihan',      'herbe',     'aromatique','vert',    'S',   'ete',         'Italie',        5, 15, 20),
('Thym',           'زعتر',      'zaatar',     'herbe',     'aromatique','vert',    'S',   'toute_annee', 'Maroc',        14, 5, 10),
('Romarin',        'إكليل الجبل','rosemary',  'herbe',     'aromatique','vert',    'S',   'toute_annee', 'Maroc',        14, 5, 10),
('Laurier',        'ورق الغار', 'laurier',    'herbe',     'aromatique','vert',    'S',   'toute_annee', 'Maroc',        21, 5, 10),
('Aneth',          'شبت',       'chebt',      'herbe',     'aromatique','vert',    'S',   'ete',         'France',        5, 0, 4),
('Estragon',       'طرخون',     'tarkhun',    'herbe',     'aromatique','vert',    'S',   'ete',         'France',        7, 0, 4),
('Sauge',          'مريمية',    'mariamia',   'herbe',     'aromatique','vert',    'S',   'toute_annee', 'Maroc',        14, 5, 10),
('Origan',         'زعتر رومي', 'origan',     'herbe',     'aromatique','vert',    'S',   'toute_annee', 'Grèce',        14, 5, 10),
('Marjolaine',     'مردقوش',    'marjolaine', 'herbe',     'aromatique','vert',    'S',   'ete',         'Maroc',        14, 5, 10),
('Gingembre',      'زنجبيل',    'zanjbil',    'herbe',     'rhizome',   'beige',   'M',   'toute_annee', 'Inde',         21, 10, 15),
('Curcuma',        'هرد',       'herd',       'herbe',     'rhizome',   'orange',  'M',   'toute_annee', 'Inde',         21, 10, 15),
-- ── CHAMPIGNONS ──────────────────────────────────────────────────
('Champignon blanc','فطر أبيض', 'ftor',       'legume',    'champignon','blanc',   'S',   'toute_annee', 'France',        7, 2, 4),
('Portobello',     'بورتوبيللو', 'portobello','legume',    'champignon','marron',  'L',   'toute_annee', 'France',        7, 2, 4),
('Shiitake',       'شيتاكي',    'shiitake',   'legume',    'champignon','marron',  'M',   'toute_annee', 'Japon',         7, 2, 4),
-- ── FRUITS SECS & NOIX ───────────────────────────────────────────
('Amande',         'لوز',       'lwz',        'fruit',     'noix',      'beige',   'S',   'ete',         'Maroc',        365, 5, 10),
('Noix',           'جوز',       'joz',        'fruit',     'noix',      'marron',  'M',   'automne',     'France',       365, 5, 10),
('Datte',          'تمر',       'tmar',       'fruit',     'drupe',     'marron',  'S',   'automne',     'Maroc',        365, 5, 10),
('Olive',          'زيتون',     'ziton',      'fruit',     'drupe',     'vert',    'S',   'automne',     'Maroc',        30, 5, 10),
('Figue sèche',    'تين ناشف',  'tin nachef', 'fruit',     'noix',      'marron',  'S',   'toute_annee', 'Maroc',        180, 10, 20)
ON CONFLICT DO NOTHING;

-- ── 2. AI AGENTS TABLE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fl_agents_ia (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,   -- 'mustapha' | 'simohammed' | 'jawad' | 'zizi' | 'azmi' | 'hicham' | 'ashel'
  nom           text NOT NULL,
  role_metier   text NOT NULL,          -- 'terrain_vente' | 'terrain_achat' | 'backoffice' | 'finance' | 'controle' | 'logistique'
  niveau        int NOT NULL DEFAULT 1, -- 1=Terrain, 2=BackOffice, 3=Admin/Alerte
  system_prompt text,
  actif         boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

INSERT INTO fl_agents_ia (code, nom, role_metier, niveau, system_prompt) VALUES
('mustapha',   'Mustapha (Digital)',    'terrain_vente',  1, 'Tu es Mustapha (Digital), commercial expert à Casablanca. Ton but est de vendre le stock le plus vite possible. Tu es dynamique, Weld l''Mdina. Parle de fraîcheur : "Sel3a dial l''youm", "Wasla tal bab l''ma7al". Ne vends jamais en dessous du prix plancher fixé par Jawad. Si le client insiste sur le crédit, propose une remise contre paiement comptant. Envoie [VENTE_CLÔTURÉE] pour déclencher la livraison.'),
('simohammed', 'Si-Mohammed (Digital)', 'terrain_achat',  1, 'Tu es Si-Mohammed (Digital), expert acheteur de fruits et légumes. Ton rôle est de sourcer et négocier le meilleur prix au kilo partout au Maroc. Parle en Darija authentique (Arabe/Latin/Vocal). Utilise le jargon : l''mle7, cocher, cash f l''blassa. Ne valide jamais le prix initial. Dès qu''un accord est trouvé, informe que Si-Mohammed (Terrain) va passer vérifier la qualité. Envoie [ACHAT_VALIDÉ].'),
('jawad',      'Jawad (Digital)',       'logistique',     2, 'Tu es Jawad (Digital), ingénieur Supply Chain et contrôleur de gestion. Calcule le Prix de Revient (PR) : PR = (Achat + Transport + Péage + Manutention) / (Quantité × 0.95). Inclus 5% de perte systématique. Exige photos Carte Grise et Permis avant de confirmer un transporteur. Donne le Prix Plancher à Mustapha. Envoie [LOGISTIQUE_OK].'),
('zizi',       'ZIZI (Agent Vente)',    'terrain_vente',  2, 'Tu es ZIZI, agent vente prévendeur. Dès qu''un client est sélectionné, génère le Panier Habituel et surligne en rouge les articles non commandés depuis plus de 3 jours. Propose 2 articles jamais commandés mais en stock. Bloque si client en catégorie Month ou Overlimit et propose Demander autorisation à AZMI.'),
('azmi',       'AZMI (Finance)',        'finance',        2, 'Tu es AZMI, agent finance expert. Tu reçois les demandes de crédit urgentes et tu valides en un clic (Approuver/Refuser). Tu enregistres les encaissements (Espèces/Chèques) et mets à jour les soldes clients instantanément. Tu envoies une notification au prévendeur si une promesse de paiement est échue aujourd''hui.'),
('hicham',     'HICHAM (Contrôle)',     'controle',       2, 'Tu es HICHAM, agent contrôle de gestion. Tu compares le Chargement (Scan caisses) vs la Facturation réelle et signales les écarts avant le départ du camion. Tu affiches la marge brute estimée pour guider le prévendeur. Tu valides via IA Vision si le produit retourné est bien celui livré (anti-substitution).'),
('ashel',      'ASHEL (Achat)',         'achat',          2, 'Tu es ASHEL, agent achat intelligent. À l''ouverture de l''écran Besoin d''Achat, calcule le PO suggéré : (Commandes validées + Stock de sécurité) - Stock Réel. Active la caméra lors de la réception fournisseur pour analyser fraîcheur/calibre. Affiche l''historique des 3 derniers prix pour ce fournisseur.')
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, system_prompt = EXCLUDED.system_prompt;

-- ── 3. ESCALATION WORKFLOW LOG ────────────────────────────────────
CREATE TABLE IF NOT EXISTS fl_escalation_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_ref      text NOT NULL,        -- auto-generated: ESC-YYYYMMDD-NNNNN
  issue_type      text NOT NULL,        -- 'credit' | 'livraison' | 'stock' | 'paiement' | 'technique' | 'autre'
  description     text NOT NULL,
  -- N1: Terrain agents
  agent_n1        text NOT NULL,        -- 'mustapha' | 'simohammed'
  n1_resolved     boolean DEFAULT false,
  n1_resolved_at  timestamptz,
  n1_notes        text,
  -- N2: Back-office agents
  agent_n2        text,                 -- 'jawad' | 'zizi' | 'azmi' | 'hicham' | 'ashel'
  n2_escalated_at timestamptz,
  n2_resolved     boolean DEFAULT false,
  n2_resolved_at  timestamptz,
  n2_notes        text,
  -- N3: Admin alert
  n3_alerted      boolean DEFAULT false,
  n3_alerted_at   timestamptz,
  n3_email_sent   boolean DEFAULT false,
  n3_sms_sent     boolean DEFAULT false,
  n3_phone_number text DEFAULT '+212663898707',
  -- Metadata
  statut          text DEFAULT 'ouvert',  -- 'ouvert' | 'n2_escalade' | 'n3_alerte' | 'resolu' | 'ferme'
  priorite        text DEFAULT 'normale', -- 'basse' | 'normale' | 'haute' | 'urgente'
  created_by_user text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  resolved_at     timestamptz
);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_escalation_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_escalation_updated_at ON fl_escalation_log;
CREATE TRIGGER trg_escalation_updated_at
  BEFORE UPDATE ON fl_escalation_log
  FOR EACH ROW EXECUTE FUNCTION update_escalation_updated_at();

-- ── 4. FEEDBACK TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fl_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text,
  user_name   text,
  user_role   text,
  note        int CHECK (note BETWEEN 1 AND 5),
  categorie   text,   -- 'application' | 'achat' | 'commercial' | 'logistique' | 'finance' | 'autre'
  commentaire text,
  created_at  timestamptz DEFAULT now()
);

-- ── 5. ADD MISSING COLUMNS TO EXISTING TABLES ────────────────────
-- fl_users: require_camera_auth
ALTER TABLE fl_users ADD COLUMN IF NOT EXISTS require_camera_auth boolean DEFAULT false;

-- fl_trips: km depart/arrivee + caisses
ALTER TABLE fl_trips ADD COLUMN IF NOT EXISTS km_depart          numeric;
ALTER TABLE fl_trips ADD COLUMN IF NOT EXISTS km_arrivee         numeric;
ALTER TABLE fl_trips ADD COLUMN IF NOT EXISTS km_total           numeric GENERATED ALWAYS AS (km_arrivee - km_depart) STORED;
ALTER TABLE fl_trips ADD COLUMN IF NOT EXISTS km_depart_confirme boolean DEFAULT false;
ALTER TABLE fl_trips ADD COLUMN IF NOT EXISTS caisses_validees   boolean DEFAULT false;
ALTER TABLE fl_trips ADD COLUMN IF NOT EXISTS nb_caisses_by_article jsonb DEFAULT '{}';

-- fl_receptions: facturation fields
ALTER TABLE fl_receptions ADD COLUMN IF NOT EXISTS quantite_facturee numeric;
ALTER TABLE fl_receptions ADD COLUMN IF NOT EXISTS prix_facture       numeric;

-- ── 6. ROW LEVEL SECURITY ─────────────────────────────────────────
ALTER TABLE fl_produits_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_agents_ia          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_escalation_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_feedback           ENABLE ROW LEVEL SECURITY;

-- Public read for catalogue
CREATE POLICY IF NOT EXISTS "fl_produits_catalogue_read" ON fl_produits_catalogue FOR SELECT USING (true);

-- Authenticated read/write for agents
CREATE POLICY IF NOT EXISTS "fl_agents_ia_read"   ON fl_agents_ia FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "fl_agents_ia_write"  ON fl_agents_ia FOR ALL    USING (true);

-- Authenticated read/write for escalation
CREATE POLICY IF NOT EXISTS "fl_escalation_read"  ON fl_escalation_log FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "fl_escalation_write" ON fl_escalation_log FOR ALL    USING (true);

-- Authenticated read/write for feedback
CREATE POLICY IF NOT EXISTS "fl_feedback_read"    ON fl_feedback FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "fl_feedback_write"   ON fl_feedback FOR ALL    USING (true);

-- ── 7. INDEXES ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_produits_categorie  ON fl_produits_catalogue (categorie);
CREATE INDEX IF NOT EXISTS idx_produits_actif      ON fl_produits_catalogue (actif);
CREATE INDEX IF NOT EXISTS idx_escalation_statut   ON fl_escalation_log (statut);
CREATE INDEX IF NOT EXISTS idx_escalation_priorite ON fl_escalation_log (priorite);
CREATE INDEX IF NOT EXISTS idx_feedback_created    ON fl_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_niveau       ON fl_agents_ia (niveau);
