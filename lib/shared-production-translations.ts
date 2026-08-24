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

const datasheetRows = [
  ['loading','Loading notifications…','Fógraí á luchtú…','A carregar notificações…','Chargement des notifications…','Cargando notificaciones…','Benachrichtigungen werden geladen…'],
  ['allUpToDate','Everything is up to date','Tá gach rud cothrom le dáta','Está tudo atualizado','Tout est à jour','Todo está al día','Alles ist auf dem neuesten Stand'],
  ['noneRequireReview','No datasheets require review at this time.','Ní gá aon bhileog sonraí a athbhreithniú faoi láthair.','Nenhuma ficha técnica precisa de revisão neste momento.','Aucune fiche technique ne nécessite de révision pour le moment.','Ninguna ficha técnica necesita revisión en este momento.','Derzeit müssen keine Datenblätter überprüft werden.'],
  ['overdueByDay','Overdue by {count} day','Thar téarma le {count} lá','Atrasada {count} dia','En retard de {count} jour','Vencida hace {count} día','Seit {count} Tag überfällig'],
  ['overdueByDays','Overdue by {count} days','Thar téarma le {count} lá','Atrasada {count} dias','En retard de {count} jours','Vencida hace {count} días','Seit {count} Tagen überfällig'],
  ['dueInDay','Due in {count} day','Le hathbhreithniú i gceann {count} lá','Revisão dentro de {count} dia','À réviser dans {count} jour','Revisión dentro de {count} día','In {count} Tag fällig'],
  ['dueInDays','Due in {count} days','Le hathbhreithniú i gceann {count} lá','Revisão dentro de {count} dias','À réviser dans {count} jours','Revisión dentro de {count} días','In {count} Tagen fällig'],
  ['moreNotification','+{count} more notification','+{count} fhógra eile','+{count} notificação','+{count} notification supplémentaire','+{count} notificación más','+{count} weitere Benachrichtigung'],
  ['moreNotifications','+{count} more notifications','+{count} fógra eile','+{count} notificações','+{count} notifications supplémentaires','+{count} notificaciones más','+{count} weitere Benachrichtigungen'],
  ['title','Datasheet review reminders','Meabhrúcháin athbhreithnithe bileog sonraí','Lembretes de revisão de fichas técnicas','Rappels de révision des fiches techniques','Recordatorios de revisión de fichas técnicas','Erinnerungen zur Datenblattprüfung'],
  ['needsReview','{count} datasheet needs review','Ní mór {count} bhileog sonraí a athbhreithniú','{count} ficha técnica precisa de revisão','{count} fiche technique doit être révisée','{count} ficha técnica necesita revisión','{count} Datenblatt muss überprüft werden'],
  ['needReview','{count} datasheets need review','Ní mór {count} bileog sonraí a athbhreithniú','{count} fichas técnicas precisam de revisão','{count} fiches techniques doivent être révisées','{count} fichas técnicas necesitan revisión','{count} Datenblätter müssen überprüft werden'],
  ['overdue','Overdue','Thar téarma','Em atraso','En retard','Vencida','Überfällig'],
  ['dueSoon','Due soon','Le hathbhreithniú go luath','Revisão em breve','Bientôt à réviser','Revisión próxima','Bald fällig'],
  ['ingredient','Ingredient','Comhábhar','Ingrediente','Ingrédient','Ingrediente','Zutat'],
  ['menuItem','Menu item','Mír biachláir','Item do menu','Article du menu','Elemento del menú','Menüelement'],
  ['supplier','Supplier:','Soláthraí:','Fornecedor:','Fournisseur :','Proveedor:','Lieferant:'],
  ['reviewDate','Review date: {date}','Dáta athbhreithnithe: {date}','Data de revisão: {date}','Date de révision : {date}','Fecha de revisión: {date}','Prüfdatum: {date}'],
  ['daysOverdue','({count} day overdue)','({count} lá thar téarma)','({count} dia em atraso)','({count} jour de retard)','({count} día de retraso)','({count} Tag überfällig)'],
  ['daysOverduePlural','({count} days overdue)','({count} lá thar téarma)','({count} dias em atraso)','({count} jours de retard)','({count} días de retraso)','({count} Tage überfällig)'],
  ['reviewNow','Review now','Athbhreithnigh anois','Rever agora','Réviser maintenant','Revisar ahora','Jetzt überprüfen'],
  ['dismiss','Dismiss','Dún','Fechar','Fermer','Cerrar','Ausblenden'],
  ['dismissNamed','Dismiss review reminder for {name}','Dún an meabhrúchán athbhreithnithe do {name}','Fechar lembrete de revisão de {name}','Fermer le rappel de révision pour {name}','Cerrar el recordatorio de revisión de {name}','Prüferinnerung für {name} ausblenden'],
] as const

const accessibilityRows = [
  ['quickAdjustments','Quick adjustments','Coigeartuithe tapa','Ajustes rápidos','Réglages rapides','Ajustes rápidos','Schnelleinstellungen'],
  ['textSize','Text size','Méid téacs','Tamanho do texto','Taille du texte','Tamaño del texto','Textgröße'],
  ['fontNormal','Normal','Gnáth','Normal','Normal','Normal','Normal'],
  ['fontLarge','Large','Mór','Grande','Grande','Grande','Groß'],
  ['fontExtraLarge','Extra large','An-mhór','Muito grande','Très grande','Muy grande','Sehr groß'],
  ['fontLargest','Largest','Is mó','Máximo','La plus grande','Máximo','Am größten'],
  ['contrast','Contrast','Codarsnacht','Contraste','Contraste','Contraste','Kontrast'],
  ['showFewer','Show fewer options','Taispeáin níos lú roghanna','Mostrar menos opções','Afficher moins d’options','Mostrar menos opciones','Weniger Optionen anzeigen'],
  ['showAll','Show all options','Taispeáin gach rogha','Mostrar todas as opções','Afficher toutes les options','Mostrar todas las opciones','Alle Optionen anzeigen'],
  ['showMore','Show more options','Taispeáin tuilleadh roghanna','Mostrar mais opções','Afficher plus d’options','Mostrar más opciones','Weitere Optionen anzeigen'],
  ['shortcut','Press {shortcut} to toggle','Brúigh {shortcut} chun scoránú','Prima {shortcut} para alternar','Appuyez sur {shortcut} pour ouvrir ou fermer','Pulsa {shortcut} para alternar','Drücken Sie {shortcut} zum Umschalten'],
  ['speechUnsupported','Text-to-speech is not supported in your browser.','Ní thacaítear le téacs go caint i do bhrabhsálaí.','O seu navegador não suporta texto para voz.','Votre navigateur ne prend pas en charge la synthèse vocale.','Tu navegador no admite la conversión de texto a voz.','Ihr Browser unterstützt keine Sprachausgabe.'],
] as const

function locale(rowsToMap: readonly (readonly string[])[], index: LocaleIndex) {
  return Object.fromEntries(rowsToMap.map((row) => [row[0], row[index]]))
}

function localeBundle(index: LocaleIndex) {
  return {
    sharedProduction: locale(rows, index),
    datasheetReview: locale(datasheetRows, index),
    kioskAccessibility: locale(accessibilityRows, index),
  }
}

export const sharedProductionTranslations = {
  en:localeBundle(1),ga:localeBundle(2),pt:localeBundle(3),
  fr:localeBundle(4),es:localeBundle(5),de:localeBundle(6),
} as const
