import type { LanguageCode } from '@/lib/translations'

type UiLiteralOverrides = Record<LanguageCode, Record<string, string>>

export const uiLiteralOverrides: UiLiteralOverrides = {
  en: {
    'Contact Us': 'Contact Us', 'Loading': 'Loading', 'Loading...': 'Loading...', 'Loading…': 'Loading…',
    'Settings saved!': 'Settings saved!', 'Message sent!': 'Message sent!', 'Close notification': 'Close notification',
    'Cookie settings': 'Cookie settings', 'Save preferences': 'Save preferences', 'Accept analytics': 'Accept analytics',
    'MB': 'MB', 'v': 'v',
    // English help-topic cards are explicit fallbacks; each card is replaced by the page's locale-specific topic catalogue.
    'Getting started with AllyJen': 'Getting started with AllyJen', 'Learn the essentials of setting up and using AllyJen for allergen management.': 'Learn the essentials of setting up and using AllyJen for allergen management.',
    'Platform overview': 'Platform overview', 'See the main features and how to move around the admin dashboard with ease.': 'See the main features and how to move around the admin dashboard with ease.',
    'Creating users and choosing roles': 'Creating users and choosing roles', 'Invite a team member, choose the right access level, and understand what each role can do.': 'Invite a team member, choose the right access level, and understand what each role can do.',
    'Adding ingredients': 'Adding ingredients', 'Create ingredients, supplier variants, allergen profiles, dietary attributes and supporting datasheets.': 'Create ingredients, supplier variants, allergen profiles, dietary attributes and supporting datasheets.',
    'Managing datasheets': 'Managing datasheets', 'Upload, view and keep track of specification sheets and compliance documents.': 'Upload, view and keep track of specification sheets and compliance documents.',
    'Manage supplier-specific versions of an ingredient and calculate the safest combined profile.': 'Manage supplier-specific versions of an ingredient and calculate the safest combined profile.',
    'Creating prepared menu items': 'Creating prepared menu items', 'Build prepared items from ingredients with automatic allergen and dietary calculations.': 'Build prepared items from ingredients with automatic allergen and dietary calculations.',
    'Adding bought-in packaged products': 'Adding bought-in packaged products', 'Record manufacturer labels, allergens, dietary claims, suppliers and evidence for sealed products sold directly.': 'Record manufacturer labels, allergens, dietary claims, suppliers and evidence for sealed products sold directly.',
    'Understand the warning levels for contains, may contain, traces and not suitable.': 'Understand the warning levels for contains, may contain, traces and not suitable.',
    'Add labels such as vegan, gluten-free, halal and more where they apply.': 'Add labels such as vegan, gluten-free, halal and more where they apply.',
    'Site configuration': 'Site configuration', 'Set up each location and tailor the kiosk settings to suit the site.': 'Set up each location and tailor the kiosk settings to suit the site.',
    'Kiosk customisation': 'Kiosk customisation', 'Make the customer-facing kiosk look and feel right for your venue.': 'Make the customer-facing kiosk look and feel right for your venue.',
    'Allergen compliance guide': 'Allergen compliance guide', 'Keep your allergen information accurate and in line with the rules that matter.': 'Keep your allergen information accurate and in line with the rules that matter.',
    'Datasheet review process': 'Datasheet review process', 'Set review reminders and keep your documentation current without the fuss.': 'Set review reminders and keep your documentation current without the fuss.',
    'Generating reports': 'Generating reports', 'Create allergen guides, compliance reports and printable materials for your team.': 'Create allergen guides, compliance reports and printable materials for your team.',
    'Viewing all datasheets': 'Viewing all datasheets', 'Access and manage every product datasheet from one central place.': 'Access and manage every product datasheet from one central place.',
    'Kiosk opening hours and sleep mode': 'Kiosk opening hours and sleep mode', 'Schedule active hours and configure the screen that appears when the kiosk is closed.': 'Schedule active hours and configure the screen that appears when the kiosk is closed.',
  },
  ga: {
    'Contact Us': 'Déan teagmháil linn', 'Loading': 'Ag lódáil', 'Loading...': 'Ag lódáil...', 'Loading…': 'Ag lódáil…',
    'Settings saved!': 'Sábháladh na socruithe!', 'Message sent!': 'Seoladh an teachtaireacht!', 'Close notification': 'Dún an fógra',
    'Cookie settings': 'Socruithe fianán', 'Save preferences': 'Sábháil sainroghanna', 'Accept analytics': 'Glac le hanailísíocht',
    'MB': 'MB', 'v': 'v',
  },
  pt: {
    'Contact Us': 'Contacte-nos', 'Loading': 'A carregar', 'Loading...': 'A carregar...', 'Loading…': 'A carregar…',
    'Settings saved!': 'Definições guardadas!', 'Message sent!': 'Mensagem enviada!', 'Close notification': 'Fechar notificação',
    'Cookie settings': 'Definições de cookies', 'Save preferences': 'Guardar preferências', 'Accept analytics': 'Aceitar análises',
    'MB': 'MB', 'v': 'v',
  },
  fr: {
    'Contact Us': 'Contactez-nous', 'Loading': 'Chargement', 'Loading...': 'Chargement...', 'Loading…': 'Chargement…',
    'Settings saved!': 'Paramètres enregistrés !', 'Message sent!': 'Message envoyé !', 'Close notification': 'Fermer la notification',
    'Cookie settings': 'Paramètres des cookies', 'Save preferences': 'Enregistrer les préférences', 'Accept analytics': 'Accepter les analyses',
    'MB': 'MB', 'v': 'v',
  },
  es: {
    'Contact Us': 'Contáctanos', 'Loading': 'Cargando', 'Loading...': 'Cargando...', 'Loading…': 'Cargando…',
    'Settings saved!': '¡Ajustes guardados!', 'Message sent!': '¡Mensaje enviado!', 'Close notification': 'Cerrar notificación',
    'Cookie settings': 'Configuración de cookies', 'Save preferences': 'Guardar preferencias', 'Accept analytics': 'Aceptar analíticas',
    'MB': 'MB', 'v': 'v',
  },
  de: {
    'Contact Us': 'Kontaktieren Sie uns', 'Loading': 'Wird geladen', 'Loading...': 'Wird geladen...', 'Loading…': 'Wird geladen…',
    'Settings saved!': 'Einstellungen gespeichert!', 'Message sent!': 'Nachricht gesendet!', 'Close notification': 'Benachrichtigung schließen',
    'Cookie settings': 'Cookie-Einstellungen', 'Save preferences': 'Einstellungen speichern', 'Accept analytics': 'Analyse-Cookies akzeptieren',
    'MB': 'MB', 'v': 'v',
  },
}
