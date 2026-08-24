type LocaleIndex = 1 | 2 | 3 | 4 | 5 | 6
const rows = [
  ['tickerLabel','Food safety news ticker','Ticeoir nuachta sábháilteachta bia','Faixa de notícias de segurança alimentar','Bandeau d’actualités sur la sécurité alimentaire','Cinta de noticias de seguridad alimentaria','Ticker für Lebensmittelsicherheit'],
  ['foodSafety','Food Safety','Sábháilteacht Bia','Segurança alimentar','Sécurité alimentaire','Seguridad alimentaria','Lebensmittelsicherheit'],
  ['alertCount','{count} alert','{count} fholáireamh','{count} alerta','{count} alerte','{count} alerta','{count} Warnmeldung'],
  ['alertsCount','{count} alerts','{count} foláireamh','{count} alertas','{count} alertes','{count} alertas','{count} Warnmeldungen'],
  ['loadingAlerts','Loading latest alerts…','Na foláirimh is déanaí á luchtú…','A carregar os alertas mais recentes…','Chargement des dernières alertes…','Cargando las últimas alertas…','Neueste Warnmeldungen werden geladen…'],
  ['feedErrorBefore','Unable to load feed — visit','Ní féidir an fotha a luchtú — tabhair cuairt ar','Não foi possível carregar o feed — visite','Impossible de charger le flux — consultez','No se pudo cargar el canal — visita','Feed konnte nicht geladen werden — besuchen Sie'],
  ['feedErrorAfter','for the latest alerts.','chun na foláirimh is déanaí a fháil.','para consultar os alertas mais recentes.','pour consulter les dernières alertes.','para consultar las últimas alertas.','für die neuesten Warnmeldungen.'],
  ['refreshFeed','Refresh news feed','Athnuaigh an fotha nuachta','Atualizar feed de notícias','Actualiser le fil d’actualités','Actualizar canal de noticias','Nachrichtenfeed aktualisieren'],
  ['dismissTicker','Dismiss news ticker for this session','Dún an ticeoir nuachta don seisiún seo','Fechar a faixa de notícias nesta sessão','Masquer le bandeau pour cette session','Cerrar la cinta de noticias durante esta sesión','Nachrichtenticker für diese Sitzung ausblenden'],
  ['dismissSession','Dismiss for this session','Dún don seisiún seo','Fechar nesta sessão','Masquer pour cette session','Cerrar durante esta sesión','Für diese Sitzung ausblenden'],
  ['trialExpired','Your trial has expired','Tá do thriail imithe in éag','O seu período experimental terminou','Votre période d’essai a expiré','Tu periodo de prueba ha caducado','Ihr Testzeitraum ist abgelaufen'],
  ['upgradeExpired','Upgrade now to continue using AllyJen and access all features.','Uasghrádaigh anois chun leanúint ar aghaidh ag úsáid AllyJen agus chun rochtain a fháil ar gach gné.','Atualize agora para continuar a utilizar o AllyJen e aceder a todas as funcionalidades.','Passez à l’offre supérieure pour continuer à utiliser AllyJen et accéder à toutes les fonctionnalités.','Actualiza ahora para seguir usando AllyJen y acceder a todas las funciones.','Führen Sie jetzt ein Upgrade durch, um AllyJen weiter zu nutzen und auf alle Funktionen zuzugreifen.'],
  ['upgradeNow','Upgrade Now','Uasghrádaigh Anois','Atualizar agora','Mettre à niveau','Actualizar ahora','Jetzt upgraden'],
  ['lastTrialDay','Last day of your trial!','An lá deireanach de do thriail!','Último dia do período experimental!','Dernier jour de votre période d’essai !','¡Último día de tu periodo de prueba!','Letzter Tag Ihres Testzeitraums!'],
  ['trialDayLeft','{count} day left in your trial','{count} lá fágtha i do thriail','Falta {count} dia no período experimental','Il reste {count} jour d’essai','Queda {count} día de prueba','Noch {count} Testtag'],
  ['trialDaysLeft','{count} days left in your trial','{count} lá fágtha i do thriail','Faltam {count} dias no período experimental','Il reste {count} jours d’essai','Quedan {count} días de prueba','Noch {count} Testtage'],
  ['upgradeBenefits','Upgrade to unlock unlimited PDF downloads, multiple locations, and more.','Uasghrádaigh chun íoslódálacha PDF gan teorainn, iliomad suíomhanna agus tuilleadh a dhíghlasáil.','Atualize para desbloquear downloads PDF ilimitados, vários locais e muito mais.','Passez à l’offre supérieure pour débloquer les PDF illimités, plusieurs sites et plus encore.','Actualiza para desbloquear descargas PDF ilimitadas, varias ubicaciones y mucho más.','Upgraden Sie für unbegrenzte PDF-Downloads, mehrere Standorte und mehr.'],
  ['viewPlans','View Plans','Féach ar Phleananna','Ver planos','Voir les offres','Ver planes','Tarife anzeigen'],
] as const
function locale(index: LocaleIndex) { return Object.fromEntries(rows.map((row) => [row[0], row[index]])) }
export const sharedProductionTranslations = {
  en:{sharedProduction:locale(1)},ga:{sharedProduction:locale(2)},pt:{sharedProduction:locale(3)},
  fr:{sharedProduction:locale(4)},es:{sharedProduction:locale(5)},de:{sharedProduction:locale(6)},
} as const
