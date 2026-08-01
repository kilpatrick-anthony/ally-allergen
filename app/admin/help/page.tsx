// app/admin/help/page.tsx
'use client'

import { useState } from 'react'
import React from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { 
  HelpCircle, Book, FileText, MessageCircle, 
  Mail, ExternalLink, Search, ChevronRight, Package,
  ChefHat, Building, BarChart, Download, Settings,
  Shield, Users, Zap, CheckCircle, Clock, Lightbulb, Send
} from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export default function HelpPage() {
  const { t, language } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null)
  const [feedbackForm, setFeedbackForm] = useState({
    name: '',
    email: '',
    type: 'feature',
    subject: '',
    message: ''
  })
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')

  const categories = [
    { id: 'all', name: 'All topics', icon: Book },
    { id: 'getting-started', name: 'Getting started', icon: Zap },
    { id: 'ingredients', name: 'Ingredients', icon: Package },
    { id: 'menu', name: 'Menu builder', icon: ChefHat },
    { id: 'sites', name: 'Sites and kiosks', icon: Building },
    { id: 'compliance', name: 'Compliance', icon: Shield },
    { id: 'downloads', name: 'Reports and downloads', icon: Download }
  ]

  const categoryNamesByLanguage: Record<string, Record<string, string>> = {
    ga: {
      all: 'Gach Ábhar',
      'getting-started': 'Ag Tús',
      ingredients: 'Comhábhair',
      menu: 'Tógálaí Biachláir',
      sites: 'Suíomhanna & Kiosks',
      compliance: 'Comhlíonadh',
      downloads: 'Tuarascálacha & Íoslódálacha',
    },
    pt: {
      all: 'Todos os Tópicos',
      'getting-started': 'Primeiros Passos',
      ingredients: 'Ingredientes',
      menu: 'Construtor de Menu',
      sites: 'Locais e Quiosques',
      compliance: 'Conformidade',
      downloads: 'Relatórios e Downloads',
    },
    fr: {
      all: 'Tous les Sujets',
      'getting-started': 'Démarrage',
      ingredients: 'Ingrédients',
      menu: 'Constructeur de Menu',
      sites: 'Sites et Bornes',
      compliance: 'Conformité',
      downloads: 'Rapports et Téléchargements',
    },
    es: {
      all: 'Todos los Temas',
      'getting-started': 'Primeros Pasos',
      ingredients: 'Ingredientes',
      menu: 'Constructor de Menú',
      sites: 'Sitios y Quioscos',
      compliance: 'Cumplimiento',
      downloads: 'Informes y Descargas',
    },
    de: {
      all: 'Alle Themen',
      'getting-started': 'Erste Schritte',
      ingredients: 'Zutaten',
      menu: 'Menü-Builder',
      sites: 'Standorte und Kioske',
      compliance: 'Compliance',
      downloads: 'Berichte und Downloads',
    },
  }

  const helpTopics = [
    {
      id: 1,
      category: 'getting-started',
      title: 'Getting started with AllyJen',
      description: 'Learn the essentials of setting up and using AllyJen for allergen management.',
      icon: Zap,
      color: 'purple'
    },
    {
      id: 2,
      category: 'getting-started',
      title: 'Platform overview',
      description: 'See the main features and how to move around the admin dashboard with ease.',
      icon: Book,
      color: 'blue'
    },
    {
      id: 3,
      category: 'ingredients',
      title: 'Adding ingredients',
      description: 'Create ingredient records with allergen details and datasheets in a few simple steps.',
      icon: Package,
      color: 'green'
    },
    {
      id: 4,
      category: 'ingredients',
      title: 'Managing datasheets',
      description: 'Upload, view and keep track of specification sheets and compliance documents.',
      icon: FileText,
      color: 'orange'
    },
    {
      id: 5,
      category: 'ingredients',
      title: 'Supplier management',
      description: 'Keep track of suppliers for each ingredient and manage their details clearly.',
      icon: Users,
      color: 'indigo'
    },
    {
      id: 6,
      category: 'menu',
      title: 'Creating menu items',
      description: 'Build menu items by combining ingredients with allergen calculations that happen automatically.',
      icon: ChefHat,
      color: 'pink'
    },
    {
      id: 7,
      category: 'menu',
      title: 'Allergen warnings',
      description: 'Understand the warning levels for contains, may contain, traces and not suitable.',
      icon: Shield,
      color: 'red'
    },
    {
      id: 8,
      category: 'menu',
      title: 'Dietary attributes',
      description: 'Add labels such as vegan, gluten-free, halal and more where they apply.',
      icon: CheckCircle,
      color: 'teal'
    },
    {
      id: 9,
      category: 'sites',
      title: 'Site configuration',
      description: 'Set up each location and tailor the kiosk settings to suit the site.',
      icon: Building,
      color: 'blue'
    },
    {
      id: 10,
      category: 'sites',
      title: 'Kiosk customisation',
      description: 'Make the customer-facing kiosk look and feel right for your venue.',
      icon: Settings,
      color: 'gray'
    },
    {
      id: 11,
      category: 'compliance',
      title: 'Allergen compliance guide',
      description: 'Keep your allergen information accurate and in line with the rules that matter.',
      icon: Shield,
      color: 'red'
    },
    {
      id: 12,
      category: 'compliance',
      title: 'Datasheet review process',
      description: 'Set review reminders and keep your documentation current without the fuss.',
      icon: FileText,
      color: 'amber'
    },
    {
      id: 13,
      category: 'downloads',
      title: 'Generating reports',
      description: 'Create allergen guides, compliance reports and printable materials for your team.',
      icon: Download,
      color: 'blue'
    },
    {
      id: 14,
      category: 'downloads',
      title: 'Viewing all datasheets',
      description: 'Access and manage every product datasheet from one central place.',
      icon: FileText,
      color: 'purple'
    },
    {
      id: 15,
      category: 'sites',
      title: 'Kiosk opening hours and sleep mode',
      description: 'Schedule active hours and configure the screen that appears when the kiosk is closed.',
      icon: Clock,
      color: 'teal'
    }
  ]

  const topicTranslations: Record<string, Record<number, { title: string; description: string }>> = {
    ga: {
      1: { title: 'Ag Tús le AllyJen', description: 'Foghlaim bunghnéithe socraithe agus úsáid ardáin bainistíochta aileargéine AllyJen' },
      2: { title: 'Forbhreathnú Ardáin', description: 'Tuig na príomhghnéithe agus conas nascleanúint a dhéanamh ar an deais riaracháin' },
      3: { title: 'Comhábhair Nua a Chur Leis', description: 'Conas taifid chomhábhar a chruthú le faisnéis aileargéine agus dáta-bhileoga' },
      4: { title: 'Bainistiú Dáta-Bhileoga Táirge', description: 'Uaslódáil, féach agus rianaigh sonraíochtaí táirge agus doiciméid chomhlíonta' },
      5: { title: 'Bainistíocht Soláthróirí', description: 'Rianaigh ilsholáthróirí in aghaidh comhábhair agus bainistigh faisnéis soláthraí' },
      6: { title: 'Míreanna Biachláir a Chruthú', description: 'Cruthaigh míreanna biachláir trí chomhábhair a chur le chéile le ríomh uathoibríoch aileargéine' },
      7: { title: 'Rabhaidh Aileargéine', description: 'Tuiscint ar leibhéil rabhaidh aileargéine: Contains, May Contain, Traces, Not Suitable' },
      8: { title: 'Tréithe Aiste Bia', description: 'Cuir deimhnithe aiste bia leis mar Vegan, Gan Ghlútan, Halal agus níos mó' },
      9: { title: 'Cumraíocht Suímh', description: 'Socraigh do shuíomhanna agus cumraigh socruithe kiosc' },
      10: { title: 'Saincheapadh Kiosc', description: 'Saincheap cuma agus mothú do kioscanna custaiméara' },
      11: { title: 'Treoir Chomhlíonta Aileargéine', description: 'Cinntigh go gcomhlíonann do chuid faisnéise aileargéine riachtanais rialála' },
      12: { title: 'Próiseas Athbhreithnithe Dáta-Bhileog', description: 'Socraigh meabhrúcháin athbhreithnithe agus coinnigh do dhoiciméadú cothrom le dáta' },
      13: { title: 'Tuarascálacha a Ghiniúint', description: 'Cruthaigh treoracha aileargéine, tuarascálacha comhlíonta agus ábhair inphriontáilte' },
      14: { title: 'Gach Dáta-Bhileog a Fheiceáil', description: 'Rochtain agus bainistigh gach dáta-bhileog táirge in aon áit lárnach amháin' },
      15: { title: 'Uaireanta Oscailte Ciosca & Mód Codlata', description: 'Sceideal uaireanta gníomhacha in aghaidh an lae agus cumraigh an scáileán codlata a thaispeántar lasmuigh d\'amanna oibriúcháin' },
    },
    pt: {
      1: { title: 'Começar com o AllyJen', description: 'Aprenda os fundamentos de configuração e uso da plataforma AllyJen' },
      2: { title: 'Visão Geral da Plataforma', description: 'Entenda os principais recursos e como navegar no painel administrativo' },
      3: { title: 'Adicionar Novos Ingredientes', description: 'Como criar registos de ingredientes com alergénios e fichas técnicas' },
      4: { title: 'Gestão de Fichas Técnicas', description: 'Carregue, visualize e acompanhe documentos técnicos e de conformidade' },
      5: { title: 'Gestão de Fornecedores', description: 'Acompanhe vários fornecedores por ingrediente e os seus dados' },
      6: { title: 'Criar Itens de Menu', description: 'Crie itens de menu combinando ingredientes com cálculo automático de alergénios' },
      7: { title: 'Avisos de Alergénios', description: 'Entenda os níveis de aviso: Contém, Pode Conter, Vestígios, Não Adequado' },
      8: { title: 'Atributos Dietéticos', description: 'Adicione certificações como Vegan, Sem Glúten, Halal e mais' },
      9: { title: 'Configuração de Locais', description: 'Configure os seus locais e as definições de quiosque' },
      10: { title: 'Personalização do Quiosque', description: 'Personalize o visual dos quiosques voltados ao cliente' },
      11: { title: 'Guia de Conformidade de Alergénios', description: 'Garanta que os seus dados de alergénios cumprem requisitos regulatórios' },
      12: { title: 'Processo de Revisão de Fichas', description: 'Defina lembretes de revisão e mantenha a documentação atualizada' },
      13: { title: 'Gerar Relatórios', description: 'Crie guias de alergénios, relatórios de conformidade e materiais imprimíveis' },
      14: { title: 'Ver Todas as Fichas', description: 'Aceda e faça gestão de todas as fichas técnicas num único local' },
      15: { title: 'Horários de Abertura do Quiosque e Modo de Espera', description: 'Programe horas ativas por dia e configure o ecrã de espera exibido quando o quiosque está fora do horário de funcionamento' },
    },
    fr: {
      1: { title: 'Démarrer avec AllyJen', description: 'Apprenez les bases de configuration et d\'utilisation de la plateforme AllyJen' },
      2: { title: 'Vue d\'Ensemble de la Plateforme', description: 'Comprenez les fonctions principales et la navigation du tableau de bord' },
      3: { title: 'Ajouter de Nouveaux Ingrédients', description: 'Créer des fiches ingrédients avec allergènes et fiches techniques' },
      4: { title: 'Gestion des Fiches Techniques', description: 'Téléverser, consulter et suivre les documents techniques et conformité' },
      5: { title: 'Gestion des Fournisseurs', description: 'Suivre plusieurs fournisseurs par ingrédient et leurs informations' },
      6: { title: 'Créer des Éléments de Menu', description: 'Créer des éléments de menu avec calcul automatique des allergènes' },
      7: { title: 'Avertissements Allergènes', description: 'Comprendre les niveaux: Contient, Peut contenir, Traces, Non adapté' },
      8: { title: 'Attributs Alimentaires', description: 'Ajouter des certifications comme Vegan, Sans gluten, Halal, etc.' },
      9: { title: 'Configuration des Sites', description: 'Configurer vos sites et les paramètres des bornes' },
      10: { title: 'Personnalisation des Bornes', description: 'Personnaliser l\'apparence des bornes côté client' },
      11: { title: 'Guide de Conformité Allergènes', description: 'Assurez la conformité réglementaire de vos informations allergènes' },
      12: { title: 'Processus de Revue des Fiches', description: 'Mettre en place des rappels et garder la documentation à jour' },
      13: { title: 'Générer des Rapports', description: 'Créer des guides allergènes, rapports conformité et supports imprimables' },
      14: { title: 'Voir Toutes les Fiches', description: 'Accéder à toutes les fiches techniques en un seul endroit' },
      15: { title: "Horaires d'Ouverture du Kiosque et Mode Veille", description: "Planifiez les heures actives par jour et configurez l'écran de veille affiché en dehors des heures d'ouverture" },
    },
    es: {
      1: { title: 'Comenzar con AllyJen', description: 'Aprende los fundamentos para configurar y usar la plataforma AllyJen' },
      2: { title: 'Resumen de la Plataforma', description: 'Comprende las funciones principales y la navegación del panel' },
      3: { title: 'Agregar Nuevos Ingredientes', description: 'Cómo crear fichas de ingredientes con alérgenos y hojas técnicas' },
      4: { title: 'Gestión de Hojas Técnicas', description: 'Sube, consulta y da seguimiento a documentos técnicos y de cumplimiento' },
      5: { title: 'Gestión de Proveedores', description: 'Controla múltiples proveedores por ingrediente y su información' },
      6: { title: 'Crear Elementos de Menú', description: 'Crea elementos de menú combinando ingredientes con cálculo automático' },
      7: { title: 'Advertencias de Alérgenos', description: 'Comprende los niveles: Contiene, Puede contener, Trazas, No apto' },
      8: { title: 'Atributos Dietéticos', description: 'Agrega certificaciones como Vegano, Sin gluten, Halal y más' },
      9: { title: 'Configuración de Sitios', description: 'Configura tus ubicaciones y ajustes de quiosco' },
      10: { title: 'Personalización del Quiosco', description: 'Personaliza la apariencia de los quioscos para clientes' },
      11: { title: 'Guía de Cumplimiento de Alérgenos', description: 'Asegura que tu información de alérgenos cumpla normativa' },
      12: { title: 'Proceso de Revisión de Fichas', description: 'Configura recordatorios y mantén la documentación al día' },
      13: { title: 'Generar Informes', description: 'Crea guías de alérgenos, informes y materiales imprimibles' },
      14: { title: 'Ver Todas las Fichas', description: 'Accede y gestiona todas las hojas técnicas en un lugar central' },
      15: { title: 'Horarios de Apertura del Quiosco y Modo de Reposo', description: 'Programa las horas activas por día y configura la pantalla de reposo que se muestra cuando el quiosco está fuera del horario de funcionamiento' },
    },
    de: {
      1: { title: 'Erste Schritte mit AllyJen', description: 'Lernen Sie die Grundlagen zur Einrichtung und Nutzung von AllyJen' },
      2: { title: 'Plattform-Überblick', description: 'Verstehen Sie die Hauptfunktionen und die Navigation im Admin-Dashboard' },
      3: { title: 'Neue Zutaten hinzufügen', description: 'So erstellen Sie Zutateneinträge mit Allergenen und Datenblättern' },
      4: { title: 'Produktdatenblätter verwalten', description: 'Datenblätter und Compliance-Dokumente hochladen, anzeigen und nachverfolgen' },
      5: { title: 'Lieferantenverwaltung', description: 'Mehrere Lieferanten pro Zutat verfolgen und verwalten' },
      6: { title: 'Menüelemente erstellen', description: 'Menüelemente mit automatischer Allergenkalkulation erstellen' },
      7: { title: 'Allergenwarnungen', description: 'Warnstufen verstehen: Enthält, Kann enthalten, Spuren, Nicht geeignet' },
      8: { title: 'Ernährungsattribute', description: 'Zertifizierungen wie Vegan, Glutenfrei, Halal und mehr hinzufügen' },
      9: { title: 'Standortkonfiguration', description: 'Standorte einrichten und Kiosk-Einstellungen konfigurieren' },
      10: { title: 'Kiosk-Anpassung', description: 'Look-and-Feel Ihrer kundenorientierten Kioske anpassen' },
      11: { title: 'Allergen-Compliance-Leitfaden', description: 'Sicherstellen, dass Ihre Allergenangaben regulatorische Vorgaben erfüllen' },
      12: { title: 'Datenblatt-Review-Prozess', description: 'Review-Erinnerungen einrichten und Dokumentation aktuell halten' },
      13: { title: 'Berichte erstellen', description: 'Allergenleitfäden, Compliance-Berichte und Druckmaterial erstellen' },
      14: { title: 'Alle Datenblätter anzeigen', description: 'Alle Produktdatenblätter zentral verwalten und abrufen' },
      15: { title: 'Kiosk-Öffnungszeiten & Schlafmodus', description: 'Legen Sie aktive Stunden pro Tag fest und konfigurieren Sie den Schlafbildschirm, der außerhalb der Betriebszeiten angezeigt wird' },
    },
  }

  const topicDetailsByLang: Record<string, Record<number, string[]>> = {
    en: {
      1: [
        'Create your account and verify your email address.',
        'Set up your first site (location) under Sites & Locations → Add Site.',
        'Add your first ingredients with allergen information in the Ingredients section.',
        'Use Menu Builder to combine ingredients into menu items — allergens are calculated automatically.',
        'Pair a kiosk device to a site using the pairing code found in Site Settings → Devices.',
        'Review your allergen coverage overview in the Analytics section.',
      ],
      2: [
        'Dashboard — At-a-glance view of recent activity and your most frequently used tools.',
        'Ingredients — Your central library of ingredient records, each with allergen info, suppliers, and datasheets.',
        'Menu Builder — Combine ingredients into menu items with automatic allergen profile calculation.',
        'Sites & Locations — Manage physical locations, pair kiosk devices, and control per-site menu visibility.',
        'Analytics — Allergen coverage summaries, compliance stats, and usage insights.',
        'Reports & Downloads — Generate and export printable allergen guides and compliance documents.',
        'Settings — Account details, branding, notification preferences, and subscription management.',
      ],
      3: [
        'Navigate to Ingredients → New Ingredient.',
        'Enter the ingredient name and select a category.',
        'Set allergen warning levels for each of the 14 EU-mandated allergens.',
        'For Cereals/Gluten and Tree Nuts, specify sub-types where applicable.',
        'Add relevant dietary certifications (Vegan, Halal, Gluten-Free, etc.).',
        'Optionally upload a product datasheet or supplier spec sheet.',
        'Link one or more suppliers and save — the ingredient is now available in Menu Builder.',
      ],
      4: [
        'Datasheets are supplier-provided PDF spec sheets confirming allergen and ingredient information.',
        'Upload a datasheet on any ingredient record under the Datasheets tab.',
        'Set a review date when uploading — you will be reminded before it expires.',
        'View and manage all datasheets centrally via Downloads → All Datasheets.',
        'Datasheets approaching or past their review date are flagged in your Notifications panel.',
        'Keeping datasheets current is essential for your allergen compliance audit trail.',
      ],
      5: [
        'Each ingredient can have one or more linked suppliers.',
        'Add a supplier on any ingredient record under the Suppliers tab.',
        'Record the supplier name, contact email, phone number, and any reference codes.',
        'Multiple suppliers allow you to track alternative sourcing options.',
        'Supplier information is included in compliance exports and audit reports.',
      ],
      6: [
        'Navigate to Menu Builder → New Item.',
        'Name your menu item and choose its category.',
        'Search for and add ingredients from your ingredient library.',
        'AllyJen automatically calculates the combined allergen profile from all added ingredients.',
        'Review the auto-calculated allergens — you can override any level if the finished dish differs.',
        'Add dietary certifications that apply to the final prepared dish.',
        'Save — the item is immediately live and displayed on paired kiosks.',
      ],
      7: [
        'Contains — The allergen is a deliberate, listed ingredient in the recipe.',
        'May Contain — Shared equipment or production lines create a cross-contamination risk.',
        'Traces — Trace amounts may be present due to the manufacturing environment.',
        'Not Suitable — The product is not considered safe for people with this allergy.',
        'None — No risk of this allergen being present.',
        'When a menu item is built from multiple ingredients, AllyJen applies the highest warning level found across all ingredients for each allergen.',
      ],
      8: [
        'Vegan — Contains no animal products of any kind.',
        'Vegetarian — No meat or fish; may contain dairy or eggs.',
        'Gluten-Free — Confirmed free from gluten-containing cereals.',
        'Dairy-Free — Contains no milk or milk-derived ingredients.',
        'Halal — Prepared in accordance with Islamic dietary guidelines.',
        'Kosher — Prepared in accordance with Jewish dietary guidelines.',
        'Certifications can be applied at ingredient level and/or menu item level. Menu item certifications take precedence when displaying to customers.',
      ],
      9: [
        'Navigate to Sites & Locations → Add Site.',
        'Enter your site name, physical address, and contact details.',
        'Each site gets its own unique kiosk display URL.',
        'Enable or disable menu categories per site to control what customers see.',
        'Manage devices (kiosks) for the site under the Devices tab — generate a pairing code to link a new device.',
      ],
      10: [
        'In Sites & Locations, select a site and open Kiosk Settings.',
        'Upload your logo for the kiosk header and branded display.',
        'Choose a primary brand colour to match your venue.',
        'Toggle which menu categories and items are visible at this location.',
        'Changes are reflected on the live kiosk immediately upon saving.',
        'Use the Preview button to see how your kiosk looks before going live.',
      ],
      11: [
        'EU Regulation 1169/2011 requires the 14 major allergens to be declared on all food products.',
        'For pre-packed food: allergens must be emphasised in the ingredients list (bold, underline, or different colour).',
        'For non-prepacked/loose food: allergen information must be available on request or proactively displayed.',
        'AllyJen helps you maintain accurate allergen records and generate compliant labelling and display materials.',
        'Review allergen data regularly — update records whenever supplier formulations change.',
        'Tip: Generate an allergen matrix from the Reports section to print and display in-venue for staff and customers.',
      ],
      12: [
        'When uploading a datasheet, set a review date (typically annual or when a formulation change is expected).',
        'AllyJen flags datasheets approaching their review date in your Notifications panel.',
        'Click Review on a flagged datasheet to confirm it is still current, or upload a replacement document.',
        'Reviewed datasheets reset their review countdown from the date of review.',
        'Maintaining up-to-date datasheets provides a clear, dated audit trail for compliance inspections.',
      ],
      13: [
        'Navigate to Downloads & Reports.',
        'Choose from: Allergen Matrix (all menu items vs. all allergens), Full Ingredient Report, or Compliance Summary.',
        'Apply filters by site, category, or date range to narrow the report scope.',
        'Download reports as PDF for printing or as CSV for spreadsheet use.',
        'Printed allergen matrices are a practical compliance tool to display for staff and customers in-venue.',
      ],
      14: [
        'Go to Downloads → All Datasheets for a central view of every uploaded spec sheet across all ingredients.',
        'Filter by status: Current, Due for Review, Overdue, or Missing.',
        'Click any datasheet entry to open or download the original PDF.',
        'Use the bulk export option to download all datasheets as a ZIP file — useful for audits or off-site review.',
        'Missing datasheets (ingredients with no uploaded spec sheet) are highlighted so you can follow up with suppliers.',
      ],
      15: [
        "In Sites & Locations, select a site and click Edit, then scroll to the 'Kiosk Opening Hours' section.",
        "Toggle 'Enable Opening Hours' on to activate the schedule — when disabled, the kiosk runs 24/7.",
        "For each day of the week, set an opening time, a closing time, or tick 'Closed all day' if the venue is shut that day.",
        'Outside scheduled hours, the kiosk displays a closed screen showing the next opening time.',
        'Staff can bypass the sleep screen by tapping it 5 times rapidly — this unlocks the kiosk for 30 minutes.',
        'Save your changes — the schedule takes effect immediately on all paired kiosks for that site.',
      ],
    },
    ga: {
      1: ['Cruthaigh do chuntas agus deimhnigh do sheoladh ríomhphoist.','Socraigh do chéad láithreán (suíomh) faoi Láithreáin & Suíomhanna → Cuir Láithreán Leis.','Cuir do chéad chomhábhair le faisnéis ailléirginigh leis sa rannóg Comhábhair.','Úsáid Menu Builder chun comhábhair a chomhcheangal in míreanna biachláir — ríomhtar ailléirgine go huathoibríoch.','Péireáil gléas ciosca le láithreán ag baint úsáide as an gcód péireála atá le fáil i Socruithe Láithreáin → Gléasanna.','Athbhreithnigh d\'achoimre clúdach ailléirginigh sa rannóg Anailísíocht.'],
      2: ['Deais — Radharc sracfhéachana ar ghníomhaíocht le déanaí agus ar na huirlisí is minice a úsáideann tú.','Comhábhair — Do lárleabharlann de thaifid chomhábhar, gach ceann le faisnéis ailléirginigh, soláthróirí, agus bileoga sonraí.','Menu Builder — Comhábhair a chomhcheangal in míreanna biachláir le ríomh próifíle ailléirginigh uathoibríoch.','Láithreáin & Suíomhanna — Bainistigh suíomhanna fisiciúla, péireáil gléasanna ciosca, agus rialú infheictheacht biachláir in aghaidh an láithreáin.','Anailísíocht — Achoimrí clúdach ailléirginigh, staitisticí comhlíontachta, agus léargais úsáide.','Tuarascálacha & Íoslódálacha — Gineann agus easpórtáil treoir ailléirginigh inphriontáilte agus doiciméid chomhlíontachta.','Socruithe — Sonraí cuntais, branda, roghanna fógraí, agus bainistíocht síntiúis.'],
      3: ['Téigh go Comhábhair → Comhábhar Nua.','Cuir isteach ainm an chomhábhair agus roghnaigh catagóir.','Socraigh leibhéil rabhaidh ailléirginigh do gach ceann de na 14 ailléirgine arna n-ordú ag an AE.','Do Gránaigh/Glútan agus Cnónna Crainn, sonraigh fo-chineálacha i gcás inarb infheidhme.','Cuir deimhniúcháin aiste bia ábhartha leis (Vegan, Halal, Saor ó Ghlútan, srl.).','Go roghach, uaslódáil bileog sonraí táirge nó bileog sonraíochta soláthróra.','Nasc soláthróir amháin nó níos mó agus sábháil — tá an comhábhar ar fáil anois in Menu Builder.'],
      4: ['Is bileoga sonraíochta PDF arna soláthar ag soláthróirí iad bileoga sonraí a dheimhníonn faisnéis ailléirginigh agus comhábhar.','Uaslódáil bileog sonraí ar aon taifead comhábhair faoin gCluaisín Bileoga Sonraí.','Socraigh dáta athbhreithnithe agus tú ag uaslódáil — cuirfear ar an eolas thú sula n-éagann sé.','Féach agus bainistigh gach bileog sonraí go lárnach trí Íoslódálacha → Gach Bileog Sonraí.','Tá bileoga sonraí atá ag druidim le nó thar a ndáta athbhreithnithe marcáilte i do phainéal Fógraí.','Tá sé riachtanach bileoga sonraí a choinneáil cothrom le dáta le haghaidh do rian iniúchta comhlíontachta ailléirginigh.'],
      5: ['Is féidir le gach comhábhar soláthróir amháin nó níos mó a bheith nasctha aige.','Cuir soláthróir leis ar aon taifead comhábhair faoin gCluaisín Soláthróirí.','Taifead ainm an tsoláthróra, ríomhphost teagmhála, uimhir ghutháin, agus aon chóid tagartha.','Ligeann soláthróirí iolracha duit roghanna foinsithe malartacha a rianú.','Tá faisnéis soláthróra san áireamh in onnmhairí comhlíontachta agus tuarascálacha iniúchta.'],
      6: ['Téigh go Menu Builder → Mír Nua.','Ainmnigh do mhír biachláir agus roghnaigh a catagóir.','Cuardaigh agus cuir comhábhair leis ó do leabharlann comhábhar.','Ríomhann AllyJen go huathoibríoch an próifíl ailléirginigh comhcheangailte ó na comhábhair go léir a cuireadh leis.','Athbhreithnigh na hailléirgine arna ríomh go huathoibríoch — is féidir leat aon leibhéal a shárú má tá an mias críochnaithe difriúil.','Cuir deimhniúcháin aiste bia leis a bhaineann leis an mias ullmhaithe deiridh.','Sábháil — tá an mhír beo láithreach agus ar taispeáint ar chioscanna péireáilte.'],
      7: ['Ina bhfuil — Is comhábhar liostaithe d\'aon ghnó é an t-ailléirgin san oideas.','D\'Fhéadfadh a bheith ann — Cruthaíonn trealamh roinnte nó línte táirgthe riosca tras-éillithe.','Riain — D\'fhéadfadh méideanna rian a bheith i láthair mar gheall ar an timpeallacht monaraíochta.','Neamhoiriúnach — Ní mheastar go bhfuil an táirge sábháilte do dhaoine a bhfuil an ailléirge seo orthu.','Nialas — Níl aon riosca go mbeidh an t-ailléirgin seo i láthair.','Nuair a thógtar mír biachláir ó chomhábhair iolracha, cuireann AllyJen i bhfeidhm an leibhéal rabhaidh is airde a fhaightear ar fud na gcomhábhar go léir do gach ailléirgin.'],
      8: ['Vegan — Níl aon táirgí ainmhithe de chineál ar bith ann.','Veigeatóireachta — Gan feoil ná iasc; d\'fhéadfadh déiríocht nó uibheacha a bheith ann.','Saor ó Ghlútan — Deimhnithe saor ó ghránaigh ina bhfuil glútan.','Saor ó Déiríocht — Níl bainne ná comhábhair díorthaithe ó bhainne ann.','Halal — Ullmhaithe i gcomhréir le treoirlínte aiste bia Ioslamacha.','Kosher — Ullmhaithe i gcomhréir le treoirlínte aiste bia Giúdacha.','Is féidir deimhniúcháin a chur i bhfeidhm ag leibhéal comhábhair agus/nó leibhéal míre biachláir. Glacann deimhniúcháin míre biachláir tosaíocht agus iad á dtaispeáint do chustaiméirí.'],
      9: ['Téigh go Láithreáin & Suíomhanna → Cuir Láithreán Leis.','Cuir isteach ainm do láithreáin, seoladh fisiciúil, agus sonraí teagmhála.','Faigheann gach láithreán a URL taispeána ciosca uathúil féin.','Cumasaigh nó díchumasaigh catagóirí biachláir in aghaidh an láithreáin chun a rialú cad a fheiceann custaiméirí.','Bainistigh gléasanna (cioscanna) don láithreán faoin gcluaisín Gléasanna — gin cód péireála chun gléas nua a nascadh.'],
      10: ['I Láithreáin & Suíomhanna, roghnaigh láithreán agus oscail Socruithe Ciosca.','Uaslódáil do lógó le haghaidh ceanntásc ciosca agus taispeáint brandáilte.','Roghnaigh príomhdhath branda chun teacht le d\'ionad.','Scoránaigh cé na catagóirí biachláir agus míreanna atá le feiceáil ag an suíomh seo.','Léirítear athruithe ar an gciosc beo láithreach tar éis sábhála.','Úsáid an cnaipe Réamhamharc chun féachaint conas a bhreathnaíonn do chiosc sula dtéann tú beo.'],
      11: ['Éilíonn Rialachán AE 1169/2011 go ndéanfar na 14 mórailléirgine a dhearbhú ar gach táirge bia.','Le haghaidh bia réamhphacáilte: ní mór ailléirgine a bhéim a leagan orthu sa liosta comhábhar (trom, líne faoi, nó dath difriúil).','Le haghaidh bia neamhphacáilte/scaoilte: ní mór faisnéis ailléirginigh a bheith ar fáil arna iarraidh sin nó a thaispeáint go gníomhach.','Cuidíonn AllyJen leat taifid ailléirginigh chruinne a chothabháil agus ábhair lipéadaithe agus taispeána comhlíontacha a ghiniúint.','Athbhreithnigh sonraí ailléirginigh go rialta — nuashonraigh taifid aon uair a athraíonn foirmlíochtaí soláthróra.','Tip: Gin maitrís ailléirginigh ón rannóg Tuarascálacha chun priontáil agus a thaispeáint san ionad do bhaill foirne agus custaiméirí.'],
      12: ['Agus tú ag uaslódáil bileog sonraí, socraigh dáta athbhreithnithe (de ghnáth bliantúil nó nuair a bhfuil athrú foirmlíochta ag súil leis).','Marcálann AllyJen bileoga sonraí atá ag druidim lena ndáta athbhreithnithe i do phainéal Fógraí.','Cliceáil Athbhreithnigh ar bhileog sonraí marcáilte chun a dheimhniú go bhfuil sé fós cothrom le dáta, nó uaslódáil doiciméad ionadaíochta.','Déanann bileoga sonraí athbhreithnithe athshocrú a gcomhaireamh síos athbhreithnithe ón dáta athbhreithnithe.','Coinneáil bileoga sonraí cothrom le dáta soláthraíonn rian iniúchta soiléir, dataithe le haghaidh cigireachtaí comhlíontachta.'],
      13: ['Téigh go Íoslódálacha & Tuarascálacha.','Roghnaigh ó: Maitrís Ailléirginigh (gach mír biachláir i gcoinne gach ailléirgin), Tuarascáil Iomlán Comhábhar, nó Achoimre Comhlíontachta.','Cuir scagairí i bhfeidhm de réir láithreáin, catagóire, nó raon dátaí chun raon feidhme na tuarascála a chúngú.','Íoslódáil tuarascálacha mar PDF le priontáil nó mar CSV le húsáid scarbhileog.','Maitrísí ailléirginigh priontáilte is uirlis chomhlíontachta phraiticiúil iad le taispeáint do bhaill foirne agus custaiméirí san ionad.'],
      14: ['Téigh go Íoslódálacha → Gach Bileog Sonraí le haghaidh radhairc lárnaigh de gach bileog sonraíochta uaslódáilte ar fud na gcomhábhar go léir.','Scag de réir stádas: Reatha, Le hAthbhreithniú, Thar Téarma, nó In Easnamh.','Cliceáil ar aon iontráil bileoige sonraí chun an PDF bunaidh a oscailt nó a íoslódáil.','Úsáid an rogha onnmhairí mórán chun gach bileog sonraí a íoslódáil mar chomhad ZIP — úsáideach le haghaidh iniúchtaí nó athbhreithniú as láthair.','Tá bileoga sonraí in easnamh (comhábhair gan bileog sonraíochta uaslódáilte) curtha chun suntais ionas gur féidir leat leanúint ar aghaidh le soláthróirí.'],      15: ['I Láithreáin & Suíomhanna, roghnaigh láithreán agus cliceáil Cuir in Eagar, ansin scrollaigh go dtí an rannán Uaireanta Oscailte Ciosca.','Scoránaigh Cumasaigh Uaireanta Oscailte chun an sceideal a ghníomhachtú — nuair a bhíonn sé díchumasaithe, ritheann an ciosca 24/7.','Do gach lá den tseachtain, socraigh am oscailte, am dúnta, nó ticmharcáil Dúnta an lá ar fad má tá an ionad dúnta an lá sin.','Lasmuigh d\u0027uaireanta sceidealaithe, taispeánann an ciosca scáileán dúnta le ham oscailte an chéad lá eile.','Is féidir le baill foirne an scáileán codlata a sheachbhóthar trína bhualadh cúig huaire go tapa — osclaíonn seo an ciosca ar feadh 30 nóiméad.','Sábháil do chuid athruithe — téann an sceideal i bhfeidhm láithreach ar gach ciosca péireáilte don láithreán sin.'],    },
    pt: {
      1: ['Crie sua conta e verifique seu endereço de e-mail.','Configure seu primeiro site (localização) em Sites e Localizações → Adicionar Site.','Adicione seus primeiros ingredientes com informações sobre alérgenos na seção Ingredientes.','Use o Menu Builder para combinar ingredientes em itens do menu — os alérgenos são calculados automaticamente.','Emparelhe um dispositivo de quiosque com um site usando o código de emparelhamento encontrado em Configurações do Site → Dispositivos.','Revise sua visão geral de cobertura de alérgenos na seção Análises.'],
      2: ['Painel — Visão geral da atividade recente e das ferramentas mais utilizadas.','Ingredientes — Sua biblioteca central de registros de ingredientes, cada um com informações sobre alérgenos, fornecedores e fichas técnicas.','Menu Builder — Combine ingredientes em itens do menu com cálculo automático do perfil de alérgenos.','Sites e Localizações — Gerencie locais físicos, emparelhe dispositivos de quiosque e controle a visibilidade do menu por site.','Análises — Resumos de cobertura de alérgenos, estatísticas de conformidade e insights de uso.','Relatórios e Downloads — Gere e exporte guias de alérgenos imprimíveis e documentos de conformidade.','Configurações — Detalhes da conta, identidade visual, preferências de notificação e gerenciamento de assinatura.'],
      3: ['Navegue até Ingredientes → Novo Ingrediente.','Insira o nome do ingrediente e selecione uma categoria.','Defina os níveis de aviso de alérgenos para cada um dos 14 alérgenos obrigatórios pela UE.','Para Cereais/Glúten e Nozes, especifique subtipos quando aplicável.','Adicione certificações dietéticas relevantes (Vegano, Halal, Sem Glúten, etc.).','Opcionalmente, carregue uma ficha técnica do produto ou especificação do fornecedor.','Vincule um ou mais fornecedores e salve — o ingrediente agora está disponível no Menu Builder.'],
      4: ['Fichas técnicas são folhas de especificação em PDF fornecidas pelo fornecedor que confirmam informações sobre alérgenos e ingredientes.','Carregue uma ficha técnica em qualquer registro de ingrediente na aba Fichas Técnicas.','Defina uma data de revisão ao carregar — você será lembrado antes que ela expire.','Visualize e gerencie todas as fichas técnicas centralmente via Downloads → Todas as Fichas Técnicas.','Fichas técnicas que se aproximam ou ultrapassaram sua data de revisão são sinalizadas no painel de Notificações.','Manter as fichas técnicas atualizadas é essencial para sua trilha de auditoria de conformidade de alérgenos.'],
      5: ['Cada ingrediente pode ter um ou mais fornecedores vinculados.','Adicione um fornecedor em qualquer registro de ingrediente na aba Fornecedores.','Registre o nome do fornecedor, e-mail de contato, número de telefone e quaisquer códigos de referência.','Vários fornecedores permitem rastrear opções alternativas de fornecimento.','As informações do fornecedor estão incluídas nas exportações de conformidade e relatórios de auditoria.'],
      6: ['Navegue até Menu Builder → Novo Item.','Nomeie seu item do menu e escolha sua categoria.','Pesquise e adicione ingredientes da sua biblioteca de ingredientes.','O AllyJen calcula automaticamente o perfil de alérgenos combinado de todos os ingredientes adicionados.','Revise os alérgenos calculados automaticamente — você pode substituir qualquer nível se o prato finalizado for diferente.','Adicione certificações dietéticas que se aplicam ao prato preparado final.','Salve — o item fica imediatamente disponível e exibido nos quiosques emparelhados.'],
      7: ['Contém — O alérgeno é um ingrediente listado deliberadamente na receita.','Pode Conter — Equipamentos compartilhados ou linhas de produção criam um risco de contaminação cruzada.','Traços — Quantidades vestigiais podem estar presentes devido ao ambiente de fabricação.','Não Adequado — O produto não é considerado seguro para pessoas com essa alergia.','Nenhum — Sem risco de presença deste alérgeno.','Quando um item do menu é construído a partir de múltiplos ingredientes, o AllyJen aplica o nível de aviso mais alto encontrado em todos os ingredientes para cada alérgeno.'],
      8: ['Vegano — Não contém produtos de origem animal de nenhum tipo.','Vegetariano — Sem carne ou peixe; pode conter laticínios ou ovos.','Sem Glúten — Confirmado livre de cereais contendo glúten.','Sem Laticínios — Não contém leite nem ingredientes derivados do leite.','Halal — Preparado de acordo com as diretrizes dietéticas islâmicas.','Kosher — Preparado de acordo com as diretrizes dietéticas judaicas.','As certificações podem ser aplicadas no nível do ingrediente e/ou no nível do item do menu. As certificações do item do menu têm precedência ao serem exibidas para os clientes.'],
      9: ['Navegue até Sites e Localizações → Adicionar Site.','Insira o nome do site, endereço físico e detalhes de contato.','Cada site recebe seu próprio URL de exibição de quiosque exclusivo.','Ative ou desative categorias de menu por site para controlar o que os clientes veem.','Gerencie dispositivos (quiosques) para o site na aba Dispositivos — gere um código de emparelhamento para vincular um novo dispositivo.'],
      10: ['Em Sites e Localizações, selecione um site e abra Configurações do Quiosque.','Carregue seu logotipo para o cabeçalho do quiosque e exibição com identidade visual.','Escolha uma cor de marca primária para combinar com seu estabelecimento.','Ative ou desative quais categorias de menu e itens são visíveis nesta localização.','As alterações são refletidas no quiosque ao vivo imediatamente após salvar.','Use o botão Visualizar para ver como seu quiosque ficará antes de entrar ao vivo.'],
      11: ['O Regulamento UE 1169/2011 exige que os 14 principais alérgenos sejam declarados em todos os produtos alimentares.','Para alimentos pré-embalados: os alérgenos devem ser destacados na lista de ingredientes (negrito, sublinhado ou cor diferente).','Para alimentos não embalados/soltos: as informações sobre alérgenos devem estar disponíveis mediante solicitação ou exibidas proativamente.','O AllyJen ajuda você a manter registros precisos de alérgenos e a gerar materiais de rotulagem e exibição conformes.','Revise os dados de alérgenos regularmente — atualize os registros sempre que as formulações do fornecedor mudarem.','Dica: Gere uma matriz de alérgenos na seção Relatórios para imprimir e exibir no estabelecimento para funcionários e clientes.'],
      12: ['Ao carregar uma ficha técnica, defina uma data de revisão (tipicamente anual ou quando uma mudança de formulação é esperada).','O AllyJen sinaliza fichas técnicas que se aproximam de sua data de revisão no painel de Notificações.','Clique em Revisar em uma ficha técnica sinalizada para confirmar que ainda está atualizada ou carregue um documento substituto.','Fichas técnicas revisadas reiniciam sua contagem regressiva de revisão a partir da data da revisão.','Manter fichas técnicas atualizadas fornece uma trilha de auditoria clara e datada para inspeções de conformidade.'],
      13: ['Navegue até Downloads e Relatórios.','Escolha entre: Matriz de Alérgenos (todos os itens do menu vs. todos os alérgenos), Relatório Completo de Ingredientes, ou Resumo de Conformidade.','Aplique filtros por site, categoria ou intervalo de datas para restringir o escopo do relatório.','Baixe relatórios como PDF para impressão ou como CSV para uso em planilha.','Matrizes de alérgenos impressas são uma ferramenta prática de conformidade para exibir para funcionários e clientes no estabelecimento.'],
      14: ['Acesse Downloads → Todas as Fichas Técnicas para uma visão centralizada de cada folha de especificação carregada em todos os ingredientes.','Filtre por status: Atual, Em Revisão, Atrasado, ou Ausente.','Clique em qualquer entrada de ficha técnica para abrir ou baixar o PDF original.','Use a opção de exportação em massa para baixar todas as fichas técnicas como um arquivo ZIP — útil para auditorias ou revisão fora do local.','Fichas técnicas ausentes (ingredientes sem folha de especificação carregada) são destacadas para que você possa acompanhar com os fornecedores.'],
      15: ['Em Sites e Localizações, selecione um site e clique em Editar, depois role até a seção Horários de Abertura do Quiosque.','Ative Habilitar Horários de Abertura para ativar o agendamento — quando desativado, o quiosque funciona 24/7.','Para cada dia da semana, defina um horário de abertura, um horário de fechamento ou marque Fechado o dia todo se o local estiver fechado naquele dia.','Fora dos horários programados, o quiosque exibe uma tela de fechamento com o próximo horário de abertura.','A equipe pode contornar a tela de espera tocando nela 5 vezes rapidamente — isso desbloqueia o quiosque por 30 minutos.','Salve suas alterações — o horário entra em vigor imediatamente em todos os quiosques vinculados a esse site.'],
    },
    fr: {
      1: ['Créez votre compte et vérifiez votre adresse e-mail.','Configurez votre premier site (emplacement) dans Sites et Emplacements → Ajouter un site.','Ajoutez vos premiers ingrédients avec les informations allergènes dans la section Ingrédients.','Utilisez le Menu Builder pour combiner des ingrédients en éléments de menu — les allergènes sont calculés automatiquement.','Associez un appareil kiosque à un site à l\'aide du code d\'association trouvé dans Paramètres du site → Appareils.','Consultez votre vue d\'ensemble de la couverture allergènes dans la section Analyses.'],
      2: ['Tableau de bord — Vue d\'ensemble de l\'activité récente et de vos outils les plus fréquemment utilisés.','Ingrédients — Votre bibliothèque centrale de fiches d\'ingrédients, chacune avec les informations allergènes, les fournisseurs et les fiches techniques.','Menu Builder — Combinez des ingrédients en éléments de menu avec calcul automatique du profil allergène.','Sites et Emplacements — Gérez les emplacements physiques, associez des appareils kiosques et contrôlez la visibilité du menu par site.','Analyses — Résumés de couverture allergènes, statistiques de conformité et informations d\'utilisation.','Rapports et Téléchargements — Générez et exportez des guides allergènes imprimables et des documents de conformité.','Paramètres — Détails du compte, image de marque, préférences de notification et gestion des abonnements.'],
      3: ['Accédez à Ingrédients → Nouvel ingrédient.','Saisissez le nom de l\'ingrédient et sélectionnez une catégorie.','Définissez les niveaux d\'avertissement allergène pour chacun des 14 allergènes obligatoires de l\'UE.','Pour les Céréales/Gluten et les Fruits à coque, précisez les sous-types le cas échéant.','Ajoutez les certifications diététiques pertinentes (Vegan, Halal, Sans Gluten, etc.).','Téléchargez optionnellement une fiche technique de produit ou une fiche de spécification fournisseur.','Liez un ou plusieurs fournisseurs et enregistrez — l\'ingrédient est maintenant disponible dans le Menu Builder.'],
      4: ['Les fiches techniques sont des fiches de spécification PDF fournies par les fournisseurs confirmant les informations sur les allergènes et les ingrédients.','Téléchargez une fiche technique sur n\'importe quelle fiche d\'ingrédient sous l\'onglet Fiches techniques.','Définissez une date de révision lors du téléchargement — vous serez rappelé avant son expiration.','Consultez et gérez toutes les fiches techniques de manière centralisée via Téléchargements → Toutes les fiches techniques.','Les fiches techniques approchant ou dépassant leur date de révision sont signalées dans votre panneau Notifications.','Maintenir les fiches techniques à jour est essentiel pour votre piste d\'audit de conformité allergène.'],
      5: ['Chaque ingrédient peut avoir un ou plusieurs fournisseurs liés.','Ajoutez un fournisseur sur n\'importe quelle fiche d\'ingrédient sous l\'onglet Fournisseurs.','Enregistrez le nom du fournisseur, l\'e-mail de contact, le numéro de téléphone et les codes de référence éventuels.','Plusieurs fournisseurs vous permettent de suivre les options d\'approvisionnement alternatives.','Les informations sur les fournisseurs sont incluses dans les exports de conformité et les rapports d\'audit.'],
      6: ['Accédez à Menu Builder → Nouvel élément.','Nommez votre élément de menu et choisissez sa catégorie.','Recherchez et ajoutez des ingrédients depuis votre bibliothèque d\'ingrédients.','AllyJen calcule automatiquement le profil allergène combiné de tous les ingrédients ajoutés.','Vérifiez les allergènes calculés automatiquement — vous pouvez remplacer n\'importe quel niveau si le plat final diffère.','Ajoutez les certifications diététiques qui s\'appliquent au plat préparé final.','Enregistrez — l\'élément est immédiatement mis en ligne et affiché sur les kiosques associés.'],
      7: ['Contient — L\'allergène est un ingrédient délibérément listé dans la recette.','Peut contenir — Les équipements partagés ou les lignes de production créent un risque de contamination croisée.','Traces — Des quantités traces peuvent être présentes en raison de l\'environnement de fabrication.','Non adapté — Le produit n\'est pas considéré comme sûr pour les personnes souffrant de cette allergie.','Aucun — Aucun risque de présence de cet allergène.','Lorsqu\'un élément de menu est construit à partir de plusieurs ingrédients, AllyJen applique le niveau d\'avertissement le plus élevé trouvé parmi tous les ingrédients pour chaque allergène.'],
      8: ['Vegan — Ne contient aucun produit d\'origine animale.','Végétarien — Sans viande ni poisson ; peut contenir des produits laitiers ou des œufs.','Sans gluten — Confirmé exempt de céréales contenant du gluten.','Sans produits laitiers — Ne contient pas de lait ni d\'ingrédients dérivés du lait.','Halal — Préparé conformément aux directives alimentaires islamiques.','Casher — Préparé conformément aux directives alimentaires juives.','Les certifications peuvent être appliquées au niveau des ingrédients et/ou au niveau des éléments de menu. Les certifications des éléments de menu ont la priorité lors de l\'affichage aux clients.'],
      9: ['Accédez à Sites et Emplacements → Ajouter un site.','Saisissez le nom de votre site, l\'adresse physique et les coordonnées.','Chaque site obtient sa propre URL d\'affichage de kiosque unique.','Activez ou désactivez les catégories de menu par site pour contrôler ce que voient les clients.','Gérez les appareils (kiosques) du site sous l\'onglet Appareils — générez un code d\'association pour lier un nouvel appareil.'],
      10: ['Dans Sites et Emplacements, sélectionnez un site et ouvrez Paramètres du kiosque.','Téléchargez votre logo pour l\'en-tête du kiosque et l\'affichage avec image de marque.','Choisissez une couleur de marque principale correspondant à votre établissement.','Activez ou désactivez les catégories de menu et les éléments visibles à cet emplacement.','Les modifications sont répercutées sur le kiosque en direct immédiatement après l\'enregistrement.','Utilisez le bouton Aperçu pour voir à quoi ressemble votre kiosque avant de le mettre en ligne.'],
      11: ['Le Règlement UE 1169/2011 exige que les 14 allergènes majeurs soient déclarés sur tous les produits alimentaires.','Pour les aliments préemballés : les allergènes doivent être mis en évidence dans la liste des ingrédients (gras, souligné ou couleur différente).','Pour les aliments non préemballés/en vrac : les informations sur les allergènes doivent être disponibles sur demande ou affichées de manière proactive.','AllyJen vous aide à maintenir des registres allergènes précis et à générer des matériaux d\'étiquetage et d\'affichage conformes.','Révisez régulièrement les données allergènes — mettez à jour les enregistrements chaque fois que les formulations des fournisseurs changent.','Conseil : Générez une matrice allergène depuis la section Rapports pour l\'imprimer et l\'afficher dans l\'établissement pour le personnel et les clients.'],
      12: ['Lors du téléchargement d\'une fiche technique, définissez une date de révision (généralement annuelle ou lorsqu\'un changement de formulation est prévu).','AllyJen signale les fiches techniques approchant de leur date de révision dans votre panneau Notifications.','Cliquez sur Réviser sur une fiche technique signalée pour confirmer qu\'elle est toujours à jour, ou téléchargez un document de remplacement.','Les fiches techniques révisées réinitialisent leur compte à rebours de révision à partir de la date de révision.','Maintenir les fiches techniques à jour fournit une piste d\'audit claire et datée pour les inspections de conformité.'],
      13: ['Accédez à Téléchargements et Rapports.','Choisissez parmi : Matrice allergène (tous les éléments de menu vs. tous les allergènes), Rapport complet des ingrédients, ou Résumé de conformité.','Appliquez des filtres par site, catégorie ou plage de dates pour affiner la portée du rapport.','Téléchargez les rapports en PDF pour l\'impression ou en CSV pour une utilisation dans un tableur.','Les matrices allergènes imprimées sont un outil de conformité pratique à afficher pour le personnel et les clients dans l\'établissement.'],
      14: ['Accédez à Téléchargements → Toutes les fiches techniques pour une vue centralisée de chaque fiche de spécification téléchargée pour tous les ingrédients.','Filtrez par statut : Actuel, À réviser, En retard, ou Manquant.','Cliquez sur n\'importe quelle entrée de fiche technique pour ouvrir ou télécharger le PDF original.','Utilisez l\'option d\'exportation en masse pour télécharger toutes les fiches techniques sous forme de fichier ZIP — utile pour les audits ou la révision hors site.','Les fiches techniques manquantes (ingrédients sans fiche de spécification téléchargée) sont mises en évidence afin que vous puissiez faire un suivi auprès des fournisseurs.'],
      15: ['Dans Sites et Emplacements, sélectionnez un site et cliquez sur Modifier, puis faites défiler jusqu\'au bloc Horaires d\'ouverture du kiosque.','Activez Activer les horaires d\'ouverture pour activer le calendrier — désactivé, le kiosque fonctionne 24h/24 7j/7.','Pour chaque jour de la semaine, définissez une heure d\'ouverture, une heure de fermeture, ou cochez Fermé toute la journée si l\'établissement est fermé ce jour-là.','En dehors des horaires prévus, le kiosque affiche un écran de fermeture avec la prochaine heure d\'ouverture.','Le personnel peut contourner l\'ecran de veille en le tapotant 5 fois rapidement — cela déverrouille le kiosque pendant 30 minutes.','Enregistrez vos modifications — le calendrier prend effet immédiatement sur tous les kiosques associés à ce site.'],
    },
    es: {
      1: ['Crea tu cuenta y verifica tu dirección de correo electrónico.','Configura tu primer sitio (ubicación) en Sitios y Ubicaciones → Añadir Sitio.','Añade tus primeros ingredientes con información sobre alérgenos en la sección Ingredientes.','Usa el Menu Builder para combinar ingredientes en elementos del menú — los alérgenos se calculan automáticamente.','Empareja un dispositivo quiosco con un sitio usando el código de emparejamiento que se encuentra en Configuración del Sitio → Dispositivos.','Revisa tu resumen de cobertura de alérgenos en la sección Análisis.'],
      2: ['Panel — Vista general de la actividad reciente y las herramientas más utilizadas.','Ingredientes — Tu biblioteca central de registros de ingredientes, cada uno con información de alérgenos, proveedores y fichas técnicas.','Menu Builder — Combina ingredientes en elementos del menú con cálculo automático del perfil de alérgenos.','Sitios y Ubicaciones — Gestiona ubicaciones físicas, empareja dispositivos quiosco y controla la visibilidad del menú por sitio.','Análisis — Resúmenes de cobertura de alérgenos, estadísticas de cumplimiento e información de uso.','Informes y Descargas — Genera y exporta guías de alérgenos imprimibles y documentos de cumplimiento.','Configuración — Detalles de la cuenta, imagen de marca, preferencias de notificación y gestión de suscripciones.'],
      3: ['Navega a Ingredientes → Nuevo Ingrediente.','Introduce el nombre del ingrediente y selecciona una categoría.','Establece niveles de advertencia de alérgenos para cada uno de los 14 alérgenos obligatorios de la UE.','Para Cereales/Gluten y Frutos Secos, especifica subtipos cuando corresponda.','Añade las certificaciones dietéticas relevantes (Vegano, Halal, Sin Gluten, etc.).','Opcionalmente, sube una ficha técnica del producto o especificación del proveedor.','Vincula uno o más proveedores y guarda — el ingrediente ya está disponible en el Menu Builder.'],
      4: ['Las fichas técnicas son hojas de especificación en PDF proporcionadas por el proveedor que confirman la información sobre alérgenos e ingredientes.','Sube una ficha técnica en cualquier registro de ingrediente en la pestaña Fichas Técnicas.','Establece una fecha de revisión al subir — se te recordará antes de que expire.','Visualiza y gestiona todas las fichas técnicas de forma centralizada a través de Descargas → Todas las Fichas Técnicas.','Las fichas técnicas que se acercan o han superado su fecha de revisión se marcan en tu panel de Notificaciones.','Mantener las fichas técnicas actualizadas es esencial para tu registro de auditoría de cumplimiento de alérgenos.'],
      5: ['Cada ingrediente puede tener uno o más proveedores vinculados.','Añade un proveedor en cualquier registro de ingrediente en la pestaña Proveedores.','Registra el nombre del proveedor, correo electrónico de contacto, número de teléfono y cualquier código de referencia.','Múltiples proveedores te permiten rastrear opciones de abastecimiento alternativas.','La información del proveedor se incluye en las exportaciones de cumplimiento e informes de auditoría.'],
      6: ['Navega a Menu Builder → Nuevo Elemento.','Nombra tu elemento del menú y elige su categoría.','Busca y añade ingredientes de tu biblioteca de ingredientes.','AllyJen calcula automáticamente el perfil de alérgenos combinado de todos los ingredientes añadidos.','Revisa los alérgenos calculados automáticamente — puedes anular cualquier nivel si el plato terminado difiere.','Añade certificaciones dietéticas que apliquen al plato preparado final.','Guarda — el elemento está inmediatamente activo y se muestra en los quioscos emparejados.'],
      7: ['Contiene — El alérgeno es un ingrediente deliberadamente listado en la receta.','Puede Contener — Los equipos compartidos o las líneas de producción crean un riesgo de contaminación cruzada.','Trazas — Pueden estar presentes cantidades de trazas debido al entorno de fabricación.','No Apto — El producto no se considera seguro para personas con esta alergia.','Ninguno — Sin riesgo de presencia de este alérgeno.','Cuando un elemento del menú se construye a partir de múltiples ingredientes, AllyJen aplica el nivel de advertencia más alto encontrado en todos los ingredientes para cada alérgeno.'],
      8: ['Vegano — No contiene productos de origen animal de ningún tipo.','Vegetariano — Sin carne ni pescado; puede contener lácteos o huevos.','Sin Gluten — Confirmado libre de cereales que contienen gluten.','Sin Lácteos — No contiene leche ni ingredientes derivados de la leche.','Halal — Preparado de acuerdo con las pautas dietéticas islámicas.','Kosher — Preparado de acuerdo con las pautas dietéticas judías.','Las certificaciones se pueden aplicar a nivel de ingrediente y/o a nivel de elemento del menú. Las certificaciones del elemento del menú tienen prioridad al mostrarse a los clientes.'],
      9: ['Navega a Sitios y Ubicaciones → Añadir Sitio.','Introduce el nombre del sitio, la dirección física y los detalles de contacto.','Cada sitio obtiene su propia URL de visualización de quiosco única.','Activa o desactiva las categorías del menú por sitio para controlar lo que ven los clientes.','Gestiona los dispositivos (quioscos) del sitio en la pestaña Dispositivos — genera un código de emparejamiento para vincular un nuevo dispositivo.'],
      10: ['En Sitios y Ubicaciones, selecciona un sitio y abre Configuración del Quiosco.','Sube tu logotipo para el encabezado del quiosco y la visualización con imagen de marca.','Elige un color de marca principal que coincida con tu local.','Activa o desactiva qué categorías del menú y elementos son visibles en esta ubicación.','Los cambios se reflejan en el quiosco en vivo inmediatamente al guardar.','Usa el botón Vista Previa para ver cómo se ve tu quiosco antes de ponerlo en marcha.'],
      11: ['El Reglamento UE 1169/2011 exige que los 14 alérgenos principales se declaren en todos los productos alimenticios.','Para alimentos preenvasados: los alérgenos deben estar destacados en la lista de ingredientes (negrita, subrayado o color diferente).','Para alimentos no envasados/a granel: la información sobre alérgenos debe estar disponible a petición o mostrada de forma proactiva.','AllyJen te ayuda a mantener registros precisos de alérgenos y a generar materiales de etiquetado y visualización conformes.','Revisa los datos de alérgenos regularmente — actualiza los registros siempre que cambien las formulaciones del proveedor.','Consejo: Genera una matriz de alérgenos desde la sección Informes para imprimir y mostrar en el local para el personal y los clientes.'],
      12: ['Al subir una ficha técnica, establece una fecha de revisión (generalmente anual o cuando se espera un cambio de formulación).','AllyJen marca las fichas técnicas que se acercan a su fecha de revisión en tu panel de Notificaciones.','Haz clic en Revisar en una ficha técnica marcada para confirmar que sigue siendo actual, o sube un documento de reemplazo.','Las fichas técnicas revisadas reinician su cuenta atrás de revisión desde la fecha de revisión.','Mantener las fichas técnicas actualizadas proporciona una pista de auditoría clara y fechada para las inspecciones de cumplimiento.'],
      13: ['Navega a Descargas e Informes.','Elige entre: Matriz de Alérgenos (todos los elementos del menú vs. todos los alérgenos), Informe Completo de Ingredientes, o Resumen de Cumplimiento.','Aplica filtros por sitio, categoría o rango de fechas para reducir el alcance del informe.','Descarga informes como PDF para imprimir o como CSV para uso en hojas de cálculo.','Las matrices de alérgenos impresas son una herramienta práctica de cumplimiento para mostrar al personal y a los clientes en el local.'],
      14: ['Ve a Descargas → Todas las Fichas Técnicas para una vista centralizada de cada hoja de especificación subida en todos los ingredientes.','Filtra por estado: Actual, Pendiente de Revisión, Vencido, o Faltante.','Haz clic en cualquier entrada de ficha técnica para abrir o descargar el PDF original.','Usa la opción de exportación masiva para descargar todas las fichas técnicas como archivo ZIP — útil para auditorías o revisión fuera de las instalaciones.','Las fichas técnicas faltantes (ingredientes sin hoja de especificación subida) se resaltan para que puedas hacer seguimiento con los proveedores.'],
      15: ['En Sitios y Ubicaciones, selecciona un sitio y haz clic en Editar, luego desplázate hasta la sección Horario de Apertura del Quiosco.','Activa Habilitar Horario de Apertura para activar el programa — cuando está desactivado, el quiosco funciona 24/7.','Para cada día de la semana, establece una hora de apertura, una hora de cierre, o marca Cerrado todo el día si el local está cerrado ese día.','Fuera del horario programado, el quiosco muestra una pantalla de cierre con el próximo horario de apertura.','El personal puede omitir la pantalla de reposo tocándola 5 veces rápidamente — esto desbloquea el quiosco durante 30 minutos.','Guarda tus cambios — el horario surte efecto inmediatamente en todos los quioscos vinculados a ese sitio.'],
    },
    de: {
      1: ['Erstellen Sie Ihr Konto und bestätigen Sie Ihre E-Mail-Adresse.','Richten Sie Ihren ersten Standort unter Standorte & Filialen → Standort hinzufügen ein.','Fügen Sie Ihre ersten Zutaten mit Allergeninformationen im Bereich Zutaten hinzu.','Verwenden Sie den Menu Builder, um Zutaten zu Menüpunkten zu kombinieren — Allergene werden automatisch berechnet.','Koppeln Sie ein Kiosk-Gerät mit einem Standort über den Kopplungscode unter Standorteinstellungen → Geräte.','Überprüfen Sie Ihre Allergenabdeckungsübersicht im Bereich Analysen.'],
      2: ['Dashboard — Übersicht über aktuelle Aktivitäten und Ihre am häufigsten genutzten Tools.','Zutaten — Ihre zentrale Bibliothek mit Zutatendatensätzen, jeder mit Allergeninformationen, Lieferanten und Datenblättern.','Menu Builder — Kombinieren Sie Zutaten zu Menüpunkten mit automatischer Allergenprofilberechnung.','Standorte & Filialen — Verwalten Sie physische Standorte, koppeln Sie Kiosk-Geräte und kontrollieren Sie die Menüsichtbarkeit je Standort.','Analysen — Allergenabdeckungszusammenfassungen, Compliance-Statistiken und Nutzungseinblicke.','Berichte & Downloads — Erstellen und exportieren Sie druckbare Allergenhandbücher und Compliance-Dokumente.','Einstellungen — Kontodetails, Markenidentität, Benachrichtigungseinstellungen und Abonnementverwaltung.'],
      3: ['Navigieren Sie zu Zutaten → Neue Zutat.','Geben Sie den Zutatennamen ein und wählen Sie eine Kategorie.','Legen Sie Allergenwarnlevel für jedes der 14 EU-vorgeschriebenen Allergene fest.','Bei Getreide/Gluten und Schalenfrüchten geben Sie gegebenenfalls Untertypen an.','Fügen Sie relevante Ernährungszertifizierungen hinzu (Vegan, Halal, Glutenfrei usw.).','Laden Sie optional ein Produktdatenblatt oder eine Lieferantenspezifikation hoch.','Verknüpfen Sie einen oder mehrere Lieferanten und speichern — die Zutat ist jetzt im Menu Builder verfügbar.'],
      4: ['Datenblätter sind vom Lieferanten bereitgestellte PDF-Spezifikationsblätter, die Allergen- und Zutatendaten bestätigen.','Laden Sie ein Datenblatt bei jedem Zutatendatensatz unter der Registerkarte Datenblätter hoch.','Legen Sie beim Hochladen ein Überprüfungsdatum fest — Sie werden vor Ablauf erinnert.','Zeigen Sie alle Datenblätter zentral über Downloads → Alle Datenblätter an und verwalten Sie diese.','Datenblätter, die sich ihrem Überprüfungsdatum nähern oder es überschritten haben, werden in Ihrem Benachrichtigungsbereich markiert.','Das Aktuellhalten der Datenblätter ist für Ihren Allergen-Compliance-Prüfpfad unerlässlich.'],
      5: ['Jede Zutat kann einen oder mehrere verknüpfte Lieferanten haben.','Fügen Sie bei jedem Zutatendatensatz unter der Registerkarte Lieferanten einen Lieferanten hinzu.','Erfassen Sie den Lieferantennamen, die Kontakt-E-Mail, die Telefonnummer und etwaige Referenzcodes.','Mehrere Lieferanten ermöglichen es Ihnen, alternative Bezugsquellen zu verfolgen.','Lieferanteninformationen sind in Compliance-Exporten und Prüfberichten enthalten.'],
      6: ['Navigieren Sie zu Menu Builder → Neuer Eintrag.','Benennen Sie Ihren Menüpunkt und wählen Sie dessen Kategorie.','Suchen Sie in Ihrer Zutatenbibliothek nach Zutaten und fügen Sie diese hinzu.','AllyJen berechnet automatisch das kombinierte Allergenprofil aus allen hinzugefügten Zutaten.','Überprüfen Sie die automatisch berechneten Allergene — Sie können jede Stufe überschreiben, wenn das fertige Gericht abweicht.','Fügen Sie Ernährungszertifizierungen hinzu, die auf das fertig zubereitete Gericht zutreffen.','Speichern — der Eintrag ist sofort live und wird auf gekoppelten Kiosken angezeigt.'],
      7: ['Enthält — Das Allergen ist eine bewusst aufgeführte Zutat im Rezept.','Kann enthalten — Gemeinsam genutzte Geräte oder Produktionslinien schaffen ein Kreuzkontaminationsrisiko.','Spuren — Spurenmengen können aufgrund der Produktionsumgebung vorhanden sein.','Nicht geeignet — Das Produkt gilt nicht als sicher für Personen mit dieser Allergie.','Keine — Kein Risiko, dass dieses Allergen vorhanden ist.','Wenn ein Menüpunkt aus mehreren Zutaten zusammengestellt wird, wendet AllyJen für jedes Allergen den höchsten Warnlevel an, der bei allen Zutaten gefunden wurde.'],
      8: ['Vegan — Enthält keinerlei tierische Produkte.','Vegetarisch — Kein Fleisch oder Fisch; kann Milchprodukte oder Eier enthalten.','Glutenfrei — Bestätigt frei von glutenhaltigen Getreidesorten.','Laktosefrei — Enthält keine Milch oder milchbasierte Zutaten.','Halal — Zubereitet gemäß islamischen Ernährungsrichtlinien.','Koscher — Zubereitet gemäß jüdischen Ernährungsrichtlinien.','Zertifizierungen können auf Zutatenebene und/oder auf Menüpunktebene angewendet werden. Zertifizierungen auf Menüpunktebene haben bei der Anzeige für Kunden Vorrang.'],
      9: ['Navigieren Sie zu Standorte & Filialen → Standort hinzufügen.','Geben Sie Ihren Standortnamen, die physische Adresse und Kontaktdaten ein.','Jeder Standort erhält seine eigene einzigartige Kiosk-Anzeige-URL.','Aktivieren oder deaktivieren Sie Menükategorien je Standort, um zu steuern, was Kunden sehen.','Verwalten Sie Geräte (Kioske) für den Standort unter der Registerkarte Geräte — generieren Sie einen Kopplungscode, um ein neues Gerät zu verknüpfen.'],
      10: ['Wählen Sie unter Standorte & Filialen einen Standort aus und öffnen Sie Kiosk-Einstellungen.','Laden Sie Ihr Logo für den Kiosk-Header und die Markenansicht hoch.','Wählen Sie eine primäre Markenfarbe passend zu Ihrem Betrieb.','Schalten Sie um, welche Menükategorien und Einträge an diesem Standort sichtbar sind.','Änderungen werden beim Speichern sofort auf dem Live-Kiosk angezeigt.','Verwenden Sie die Schaltfläche Vorschau, um zu sehen, wie Ihr Kiosk aussieht, bevor Sie live gehen.'],
      11: ['Die EU-Verordnung 1169/2011 schreibt vor, dass die 14 wichtigsten Allergene auf allen Lebensmitteln deklariert werden müssen.','Bei vorverpackten Lebensmitteln: Allergene müssen in der Zutatenliste hervorgehoben werden (fett, unterstrichen oder in einer anderen Farbe).','Bei nicht vorverpackten/losen Lebensmitteln: Allergeninformationen müssen auf Anfrage verfügbar oder proaktiv angezeigt sein.','AllyJen hilft Ihnen, genaue Allergenaufzeichnungen zu führen und konforme Kennzeichnungs- und Anzeigematerialien zu erstellen.','Überprüfen Sie Allergendaten regelmäßig — aktualisieren Sie Datensätze, wenn sich Lieferantenformulierungen ändern.','Tipp: Erstellen Sie eine Allergenmatrix aus dem Bereich Berichte zum Drucken und Aushängen im Betrieb für Personal und Kunden.'],
      12: ['Legen Sie beim Hochladen eines Datenblatts ein Überprüfungsdatum fest (typischerweise jährlich oder wenn eine Formulierungsänderung erwartet wird).','AllyJen markiert Datenblätter, die sich ihrem Überprüfungsdatum nähern, in Ihrem Benachrichtigungsbereich.','Klicken Sie auf Überprüfen bei einem markierten Datenblatt, um zu bestätigen, dass es noch aktuell ist, oder laden Sie ein Ersatzdokument hoch.','Überprüfte Datenblätter setzen ihren Überprüfungsrückwärtszähler ab dem Überprüfungsdatum zurück.','Das Aktuellhalten der Datenblätter bietet einen klaren, datierten Prüfpfad für Compliance-Inspektionen.'],
      13: ['Navigieren Sie zu Downloads & Berichte.','Wählen Sie aus: Allergenmatrix (alle Menüpunkte vs. alle Allergene), Vollständiger Zutatenbericht, oder Compliance-Zusammenfassung.','Wenden Sie Filter nach Standort, Kategorie oder Datumsbereich an, um den Berichtsumfang einzugrenzen.','Laden Sie Berichte als PDF zum Drucken oder als CSV zur Tabellenkalkulationsnutzung herunter.','Gedruckte Allergenmatrizen sind ein praktisches Compliance-Werkzeug zur Anzeige für Personal und Kunden im Betrieb.'],
      14: ['Gehen Sie zu Downloads → Alle Datenblätter für eine zentrale Übersicht aller hochgeladenen Spezifikationsblätter über alle Zutaten hinweg.','Filtern Sie nach Status: Aktuell, Zur Überprüfung fällig, Überfällig, oder Fehlend.','Klicken Sie auf einen beliebigen Datenblatteintrag, um das Original-PDF zu öffnen oder herunterzuladen.','Verwenden Sie die Massenexport-Option, um alle Datenblätter als ZIP-Datei herunterzuladen — nützlich für Audits oder externe Überprüfungen.','Fehlende Datenblätter (Zutaten ohne hochgeladenes Spezifikationsblatt) werden hervorgehoben, damit Sie mit den Lieferanten nachfassen können.'],      15: ['Wählen Sie unter Standorte & Filialen einen Standort aus und klicken Sie auf Bearbeiten, dann scrollen Sie zum Abschnitt Kiosk-Öffnungszeiten.','Aktivieren Sie Öffnungszeiten aktivieren, um den Zeitplan zu aktivieren — wenn deaktiviert, läuft der Kiosk 24/7.','Legen Sie für jeden Wochentag eine Öffnungszeit, eine Schließzeit fest, oder setzen Sie ein Häkchen bei Den ganzen Tag geschlossen, wenn der Betrieb an diesem Tag geschlossen ist.','Außerhalb der geplanten Zeiten zeigt der Kiosk einen Geschlossen-Bildschirm mit der nächsten Öffnungszeit.','Mitarbeiter können den Schlafbildschirm umgehen, indem sie ihn 5 Mal schnell antippen — dies entsperrt den Kiosk für 30 Minuten.','Speichern Sie Ihre Änderungen — der Zeitplan tritt sofort auf allen gekoppelten Kiosken für diesen Standort in Kraft.'],    },
  }
  const topicDetails = topicDetailsByLang[language] ?? topicDetailsByLang['en']

  const localizedCategories = categories.map((category) => ({
    ...category,
    name: categoryNamesByLanguage[language]?.[category.id] || category.name,
  }))

  const localizedTopics = helpTopics.map((topic) => {
    const localized = topicTranslations[language]?.[topic.id]
    return {
      ...topic,
      title: localized?.title || topic.title,
      description: localized?.description || topic.description,
    }
  })

  const filteredTopics = localizedTopics.filter(topic => {
    const matchesCategory = activeCategory === 'all' || topic.category === activeCategory
    const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topic.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const quickLinks = [
    {
      title: t('admin.documentation'),
      description: 'Read the full help guide',
      icon: Book,
      href: '#help-topics',
      color: 'blue'
    },
    {
      title: t('admin.contactSupport'),
      description: 'Get help from our team',
      icon: MessageCircle,
      href: 'mailto:info@allyjen.ie',
      color: 'green'
    },
    {
      title: t('admin.email'),
      description: 'Email the AllyJen team',
      icon: Mail,
      href: 'mailto:info@allyjen.ie',
      color: 'purple'
    },
    {
      title: 'Suggest a feature or report a bug',
      description: 'Share an idea, issue or improvement request',
      icon: Lightbulb,
      href: '#feedback-form',
      color: 'teal'
    }
  ]

  const handleFeedbackChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFeedbackForm(prev => ({ ...prev, [name]: value }))
    if (feedbackError) setFeedbackError('')
  }

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsFeedbackSubmitting(true)
    setFeedbackError('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: feedbackForm.name,
          email: feedbackForm.email,
          company: 'Help centre feedback',
          phone: '',
          message: `Feedback type: ${feedbackForm.type === 'feature' ? 'Feature suggestion' : feedbackForm.type === 'bug' ? 'Bug report' : 'Other'}\n\nSubject: ${feedbackForm.subject}\n\n${feedbackForm.message}`,
          feedbackType: feedbackForm.type,
          subject: feedbackForm.subject
        })
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to send your feedback right now.')
      }

      setFeedbackSubmitted(true)
      setFeedbackForm({ name: '', email: '', type: 'feature', subject: '', message: '' })
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : 'Unable to send your feedback right now.')
    } finally {
      setIsFeedbackSubmitting(false)
    }
  }

  return (
    <Container>
      {/* Header */}
      <div className="mb-8 rounded-2xl border border-gray-200/70 bg-white/70 p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800/70">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-teal-400 to-teal-600 dark:from-teal-500 dark:to-gray-700 rounded-xl shadow-sm">
                <HelpCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#003842] dark:text-white">{t('admin.helpSupport')}</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  {t('admin.helpSupportDesc')}
                </p>
              </div>
            </div>
          </div>
          <Badge variant="primary" icon={Book}>
            {t('admin.knowledgeBase')}
          </Badge>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8 auto-rows-fr">
        {quickLinks.map((link, index) => (
          <a
            key={index}
            href={link.href}
            className="block h-full"
          >
            <Card className="hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer h-full flex flex-col border border-gray-200/80 shadow-sm">
              <div className="flex items-start gap-3 h-full">
                <div 
                  className={`p-3 rounded-lg bg-${link.color}-100`}
                  style={{
                    backgroundColor: 
                      link.color === 'red' ? '#fee2e2' :
                      link.color === 'blue' ? '#dbeafe' :
                      link.color === 'green' ? '#dcfce7' :
                      '#f3e8ff'
                  }}
                >
                  {typeof link.icon === 'function' && React.createElement(link.icon as React.ComponentType<{className: string; style: React.CSSProperties}>, {
                    className: "h-6 w-6",
                    style: {
                      color: 
                        link.color === 'red' ? '#dc2626' :
                        link.color === 'blue' ? '#2563eb' :
                        link.color === 'green' ? '#16a34a' :
                        '#9333ea'
                    }
                  })}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{link.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{link.description}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </div>
            </Card>
          </a>
        ))}
      </div>

      {/* Feedback Form */}
      <section id="feedback-form" className="mb-8">
        <Card className="overflow-hidden border border-gray-200/80 shadow-sm bg-gradient-to-br from-[#003842] to-[#0f4f5a] text-white">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] p-6 lg:p-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium text-[#bfece7]">
                <Lightbulb className="h-4 w-4" />
                Share feedback
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white">Suggest a feature or report a problem</h2>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  Tell us about a feature you would like to see, a bug you have found, or anything else that could improve AllyJen for your team.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-white/80">
                <p className="font-medium text-white">What to include</p>
                <ul className="mt-2 space-y-2 text-white/75">
                  <li>• The feature you would like to see</li>
                  <li>• The issue or bug you have noticed</li>
                  <li>• Any steps to reproduce it, if relevant</li>
                </ul>
              </div>
            </div>

            <div>
              {feedbackSubmitted ? (
                <div className="rounded-2xl border border-white/15 bg-white/10 p-6 text-center">
                  <CheckCircle className="mx-auto mb-3 h-10 w-10 text-[#42b8ac]" />
                  <h3 className="text-lg font-semibold text-white">Thanks for your feedback</h3>
                  <p className="mt-2 text-sm text-white/75">
                    We have received your message and will review it shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="feedback-name" className="mb-1.5 block text-sm font-medium text-white/80">Your name</label>
                      <input
                        id="feedback-name"
                        name="name"
                        value={feedbackForm.name}
                        onChange={handleFeedbackChange}
                        required
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/40 outline-none ring-0"
                        placeholder="Aoife Murphy"
                      />
                    </div>
                    <div>
                      <label htmlFor="feedback-email" className="mb-1.5 block text-sm font-medium text-white/80">Email address</label>
                      <input
                        id="feedback-email"
                        name="email"
                        type="email"
                        value={feedbackForm.email}
                        onChange={handleFeedbackChange}
                        required
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/40 outline-none ring-0"
                        placeholder="you@business.ie"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="feedback-type" className="mb-1.5 block text-sm font-medium text-white/80">Type</label>
                      <select
                        id="feedback-type"
                        name="type"
                        value={feedbackForm.type}
                        onChange={handleFeedbackChange}
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none"
                      >
                        <option value="feature" className="text-[#003842]">Feature suggestion</option>
                        <option value="bug" className="text-[#003842]">Bug report</option>
                        <option value="other" className="text-[#003842]">Other</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="feedback-subject" className="mb-1.5 block text-sm font-medium text-white/80">Subject</label>
                      <input
                        id="feedback-subject"
                        name="subject"
                        value={feedbackForm.subject}
                        onChange={handleFeedbackChange}
                        required
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/40 outline-none ring-0"
                        placeholder="For example: Add bulk editing"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="feedback-message" className="mb-1.5 block text-sm font-medium text-white/80">Details</label>
                    <textarea
                      id="feedback-message"
                      name="message"
                      value={feedbackForm.message}
                      onChange={handleFeedbackChange}
                      required
                      rows={5}
                      className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/40 outline-none ring-0 resize-none"
                      placeholder="Please describe the idea or issue in a bit of detail."
                    />
                  </div>

                  {feedbackError && (
                    <p className="text-sm text-amber-200">{feedbackError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isFeedbackSubmitting}
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#42b8ac] px-4 py-2.5 text-sm font-semibold text-[#003842] transition hover:bg-white disabled:opacity-70"
                  >
                    {isFeedbackSubmitting ? 'Sending…' : 'Send feedback'}
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* Search and Categories */}
      <Card className="mb-8 border border-gray-200/80 shadow-sm">
        <div className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('admin.searchHelpTopics')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent text-lg bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {localizedCategories.map((category) => {
              const isActive = activeCategory === category.id
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full border transition-all
                    ${isActive
                      ? 'border-[#42b8ac] bg-[#42b8ac]/10 text-[#003842] dark:text-white font-medium shadow-sm'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {typeof category.icon === 'function' && React.createElement(category.icon as React.ComponentType<{className: string}>, {
                    className: `h-4 w-4 ${isActive ? 'text-[#42b8ac]' : 'text-gray-500 dark:text-gray-400'}`
                  })}
                  {category.name}
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Help Topics */}
      <div className="mb-6" id="help-topics">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {activeCategory === 'all' ? (categoryNamesByLanguage[language]?.all || 'All Topics') : localizedCategories.find(c => c.id === activeCategory)?.name}
          <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">({filteredTopics.length})</span>
        </h2>
      </div>

      {filteredTopics.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('admin.noTopicsFound')}</h3>
            <p className="text-gray-600 dark:text-gray-400">Try changing your search or filters</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
          {filteredTopics.map((topic) => {
            const colorClasses = {
              purple: 'from-purple-500 to-purple-600',
              blue: 'from-blue-500 to-blue-600',
              green: 'from-green-500 to-green-600',
              orange: 'from-orange-500 to-orange-600',
              indigo: 'from-indigo-500 to-indigo-600',
              pink: 'from-pink-500 to-pink-600',
              red: 'from-red-500 to-red-600',
              teal: 'from-teal-500 to-teal-600',
              amber: 'from-amber-500 to-amber-600',
              gray: 'from-gray-500 to-gray-600'
            }

            const isExpanded = expandedTopic === topic.id
            return (
              <div
                key={topic.id}
                role="button"
                tabIndex={0}
                onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                onKeyDown={(e) => e.key === 'Enter' && setExpandedTopic(isExpanded ? null : topic.id)}
                className="cursor-pointer group h-full"
              >
                <Card className="hover:shadow-xl transition-all duration-200 hover:-translate-y-1 h-full flex flex-col border border-gray-200/80 shadow-sm">
                  <div className="flex items-start gap-4 h-full">
                    <div className={`p-3 bg-gradient-to-br ${colorClasses[topic.color as keyof typeof colorClasses]} rounded-lg group-hover:scale-110 transition-transform flex-shrink-0`}>
                      {typeof topic.icon === 'function' && React.createElement(topic.icon as React.ComponentType<{className: string}>, {
                        className: "h-6 w-6 text-white"
                      })}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-[#42b8ac] transition-colors">
                        {topic.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        {topic.description}
                      </p>
                      <div className="mt-auto flex items-center text-[#42b8ac] text-sm font-medium">
                        {isExpanded ? t('admin.close') : t('admin.learnMore')}
                        <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                      </div>
                    </div>
                  </div>
                  {isExpanded && topicDetails[topic.id] && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <ol className="space-y-2">
                        {topicDetails[topic.id].map((point: string, i: number) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                            <span
                              className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: '#42b8ac' }}
                            >
                              {i + 1}
                            </span>
                            {point}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </Card>
              </div>
            )
          })}
        </div>
      )}

      {/* Contact Support Section */}
      <Card className="mt-8 bg-gradient-to-br from-[#42b8ac]/10 to-[#003842]/10 border border-[#42b8ac]/20 shadow-sm">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 text-[#42b8ac] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#003842] dark:text-white mb-2">
            {t('admin.needMoreHelp')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {t('admin.supportTeamHelp')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:info@allyjen.ie">
              <Button variant="primary" size="lg" icon={<MessageCircle className="h-4 w-4" />}>
                {t('admin.contactSupport')}
              </Button>
            </a>
            <a href="mailto:info@allyjen.ie">
              <Button variant="secondary" size="lg" icon={<Mail className="h-4 w-4" />}>
                {t('admin.email')}
              </Button>
            </a>
          </div>
        </div>
      </Card>

    </Container>
  )
}
