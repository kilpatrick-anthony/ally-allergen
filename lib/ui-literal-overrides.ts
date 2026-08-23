import type { LanguageCode } from '@/lib/translations'

type UiLiteralOverrides = Record<LanguageCode, Record<string, string>>

export const uiLiteralOverrides: UiLiteralOverrides = {
  en: {
    'Contact Us': 'Contact Us', 'Loading': 'Loading', 'Loading...': 'Loading...', 'Loading…': 'Loading…',
    'Settings saved!': 'Settings saved!', 'Message sent!': 'Message sent!', 'Close notification': 'Close notification',
    'Cookie settings': 'Cookie settings', 'Save preferences': 'Save preferences', 'Accept analytics': 'Accept analytics',
  },
  ga: {
    'Contact Us': 'Déan teagmháil linn', 'Loading': 'Ag lódáil', 'Loading...': 'Ag lódáil...', 'Loading…': 'Ag lódáil…',
    'Settings saved!': 'Sábháladh na socruithe!', 'Message sent!': 'Seoladh an teachtaireacht!', 'Close notification': 'Dún an fógra',
    'Cookie settings': 'Socruithe fianán', 'Save preferences': 'Sábháil sainroghanna', 'Accept analytics': 'Glac le hanailísíocht',
  },
  pt: {
    'Contact Us': 'Contacte-nos', 'Loading': 'A carregar', 'Loading...': 'A carregar...', 'Loading…': 'A carregar…',
    'Settings saved!': 'Definições guardadas!', 'Message sent!': 'Mensagem enviada!', 'Close notification': 'Fechar notificação',
    'Cookie settings': 'Definições de cookies', 'Save preferences': 'Guardar preferências', 'Accept analytics': 'Aceitar análises',
  },
  fr: {
    'Contact Us': 'Contactez-nous', 'Loading': 'Chargement', 'Loading...': 'Chargement...', 'Loading…': 'Chargement…',
    'Settings saved!': 'Paramètres enregistrés !', 'Message sent!': 'Message envoyé !', 'Close notification': 'Fermer la notification',
    'Cookie settings': 'Paramètres des cookies', 'Save preferences': 'Enregistrer les préférences', 'Accept analytics': 'Accepter les analyses',
  },
  es: {
    'Contact Us': 'Contáctanos', 'Loading': 'Cargando', 'Loading...': 'Cargando...', 'Loading…': 'Cargando…',
    'Settings saved!': '¡Ajustes guardados!', 'Message sent!': '¡Mensaje enviado!', 'Close notification': 'Cerrar notificación',
    'Cookie settings': 'Configuración de cookies', 'Save preferences': 'Guardar preferencias', 'Accept analytics': 'Aceptar analíticas',
  },
  de: {
    'Contact Us': 'Kontaktieren Sie uns', 'Loading': 'Wird geladen', 'Loading...': 'Wird geladen...', 'Loading…': 'Wird geladen…',
    'Settings saved!': 'Einstellungen gespeichert!', 'Message sent!': 'Nachricht gesendet!', 'Close notification': 'Benachrichtigung schließen',
    'Cookie settings': 'Cookie-Einstellungen', 'Save preferences': 'Einstellungen speichern', 'Accept analytics': 'Analyse-Cookies akzeptieren',
  },
}
