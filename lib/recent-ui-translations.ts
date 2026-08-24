import { adminAccessTranslations } from '@/lib/admin-access-translations'
import { kioskPortalTranslations } from '@/lib/kiosk-portal-translations'
import { corePortalTranslations } from '@/lib/core-portal-translations'
import { settingsPortalTranslations } from '@/lib/settings-portal-translations'
import { analyticsPortalTranslations } from '@/lib/analytics-portal-translations'
import { ingredientsPortalTranslations } from '@/lib/ingredients-portal-translations'
import { menuBuilderTranslations } from '@/lib/menu-builder-translations'

export const recentUiTranslations = {
  en: {
    ...adminAccessTranslations.en,
    ...kioskPortalTranslations.en,
    ...corePortalTranslations.en,
    ...settingsPortalTranslations.en,
    ...analyticsPortalTranslations.en,
    ingredientsPortal: ingredientsPortalTranslations.en,
    menuBuilderPortal: menuBuilderTranslations.en,
    shared: { closeNotification: 'Close notification', loadingDashboard: 'Loading your dashboard...' },
    cookieConsent: {
      consentAria: 'Cookie consent', privacyChoices: 'Your privacy choices', bannerDescription: 'We use strictly necessary storage to keep AllyJen secure and working. With your permission, we also use analytics to understand how the service is used. Analytics stays off unless you accept it.', readOur: 'Read our', cookiePolicy: 'Cookie Policy', and: 'and', privacyPolicy: 'Privacy Policy', rejectNonEssential: 'Reject non-essential', acceptAnalytics: 'Accept analytics', managePreferences: 'Manage preferences', openSettings: 'Open cookie settings', settings: 'Cookie settings', preferences: 'Cookie preferences', preferencesDescription: 'Choose whether AllyJen may use optional analytics. Necessary storage cannot be switched off because it supports security and requested features.', closePreferences: 'Close cookie preferences', strictlyNecessary: 'Strictly necessary', necessaryDescription: 'Authentication, security, consent choices, accessibility, and requested kiosk functionality.', alwaysOn: 'Always on', analytics: 'Analytics', analyticsDescription: 'Google Analytics and Vercel Analytics help us understand visits and improve AllyJen.', savePreferences: 'Save preferences',
    },
    team: {
      loadError: 'Could not load team members', inviteError: 'Could not invite team member', invitationSent: 'Invitation sent. They can use the email link to choose a password.', updateError: 'Could not update team member', memberUpdated: 'Team member updated.', removeConfirm: 'Remove {name} from this business? Their account will not be deleted.', removeError: 'Could not remove team member', memberRemoved: 'Team member removed.', members: 'Team members', description: 'Invite people and choose who owns or operates this business.', addMember: 'Add team member', memberName: 'Team member name', fullName: 'Full name', memberEmail: 'Team member email', emailAddress: 'Email address', memberRole: 'Team member role', staff: 'Staff', manager: 'Manager', owner: 'Owner', sending: 'Sending…', sendInvite: 'Send invite', loading: 'Loading team…', name: 'Name', role: 'Role', save: 'Save', cancel: 'Cancel', you: 'You', active: 'Active', inviteSent: 'Invite sent', edit: 'Edit', remove: 'Remove', empty: 'No team members found.', roleHelpTitle: 'Which role should I choose?', ownerHelp: 'Full access, including managing team members and deleting operational content.', managerHelp: 'Full operational access, including deletions, but cannot manage team members.', staffHelp: 'Can create and edit content, but cannot manage users or delete ingredients and menu items.',
    },
  },
  ga: {
    ...adminAccessTranslations.ga,
    ...kioskPortalTranslations.ga,
    ...corePortalTranslations.ga,
    ...settingsPortalTranslations.ga,
    ...analyticsPortalTranslations.ga,
    ingredientsPortal: ingredientsPortalTranslations.ga,
    menuBuilderPortal: menuBuilderTranslations.ga,
    shared: { closeNotification: 'Dún an fógra', loadingDashboard: 'Do dheais á luchtú...' },
    cookieConsent: {
      consentAria: 'Toiliú fianán', privacyChoices: 'Do roghanna príobháideachais', bannerDescription: 'Úsáidimid stóráil atá fíor-riachtanach chun AllyJen a choinneáil slán agus ag obair. Le do chead, úsáidimid anailísíocht freisin chun tuiscint a fháil ar úsáid na seirbhíse. Fanann an anailísíocht múchta mura nglacann tú léi.', readOur: 'Léigh ár', cookiePolicy: 'mBeartas Fianán', and: 'agus ár', privacyPolicy: 'mBeartas Príobháideachais', rejectNonEssential: 'Diúltaigh do rudaí neamhriachtanacha', acceptAnalytics: 'Glac le hanailísíocht', managePreferences: 'Bainistigh sainroghanna', openSettings: 'Oscail socruithe fianán', settings: 'Socruithe fianán', preferences: 'Sainroghanna fianán', preferencesDescription: 'Roghnaigh an féidir le AllyJen anailísíocht roghnach a úsáid. Ní féidir stóráil riachtanach a mhúchadh mar tacaíonn sí le slándáil agus gnéithe iarrtha.', closePreferences: 'Dún sainroghanna fianán', strictlyNecessary: 'Fíor-riachtanach', necessaryDescription: 'Fíordheimhniú, slándáil, roghanna toilithe, inrochtaineacht agus feidhmiúlacht bhoth iarrtha.', alwaysOn: 'Ar siúl i gcónaí', analytics: 'Anailísíocht', analyticsDescription: 'Cuidíonn Google Analytics agus Vercel Analytics linn cuairteanna a thuiscint agus AllyJen a fheabhsú.', savePreferences: 'Sábháil sainroghanna',
    },
    team: {
      loadError: 'Níorbh fhéidir baill na foirne a luchtú', inviteError: 'Níorbh fhéidir cuireadh a thabhairt don bhall foirne', invitationSent: 'Seoladh an cuireadh. Is féidir leo an nasc ríomhphoist a úsáid chun pasfhocal a roghnú.', updateError: 'Níorbh fhéidir an ball foirne a nuashonrú', memberUpdated: 'Nuashonraíodh an ball foirne.', removeConfirm: 'Bain {name} den ghnó seo? Ní scriosfar a gcuntas.', removeError: 'Níorbh fhéidir an ball foirne a bhaint', memberRemoved: 'Baineadh an ball foirne.', members: 'Baill foirne', description: 'Tabhair cuireadh do dhaoine agus roghnaigh cé leis nó cé a oibríonn an gnó seo.', addMember: 'Cuir ball foirne leis', memberName: 'Ainm an bhaill foirne', fullName: 'Ainm iomlán', memberEmail: 'Ríomhphost an bhaill foirne', emailAddress: 'Seoladh ríomhphoist', memberRole: 'Ról an bhaill foirne', staff: 'Ball foirne', manager: 'Bainisteoir', owner: 'Úinéir', sending: 'Á sheoladh…', sendInvite: 'Seol cuireadh', loading: 'An fhoireann á luchtú…', name: 'Ainm', role: 'Ról', save: 'Sábháil', cancel: 'Cealaigh', you: 'Tusa', active: 'Gníomhach', inviteSent: 'Cuireadh seolta', edit: 'Cuir in eagar', remove: 'Bain', empty: 'Níor aimsíodh baill foirne.', roleHelpTitle: 'Cén ról ba cheart dom a roghnú?', ownerHelp: 'Rochtain iomlán, lena n-áirítear baill foirne a bhainistiú agus ábhar oibríochtúil a scriosadh.', managerHelp: 'Rochtain iomlán oibríochtúil, scriosadh san áireamh, ach ní féidir baill foirne a bhainistiú.', staffHelp: 'Is féidir ábhar a chruthú agus a chur in eagar, ach ní féidir úsáideoirí a bhainistiú ná comhábhair agus míreanna biachláir a scriosadh.',
    },
  },
  pt: {
    ...adminAccessTranslations.pt,
    ...kioskPortalTranslations.pt,
    ...corePortalTranslations.pt,
    ...settingsPortalTranslations.pt,
    ...analyticsPortalTranslations.pt,
    ingredientsPortal: ingredientsPortalTranslations.pt,
    menuBuilderPortal: menuBuilderTranslations.pt,
    shared: { closeNotification: 'Fechar notificação', loadingDashboard: 'A carregar o seu painel...' },
    cookieConsent: {
      consentAria: 'Consentimento de cookies', privacyChoices: 'As suas escolhas de privacidade', bannerDescription: 'Utilizamos armazenamento estritamente necessário para manter o AllyJen seguro e funcional. Com a sua autorização, também utilizamos análises para compreender como o serviço é utilizado. As análises permanecem desativadas até que as aceite.', readOur: 'Leia a nossa', cookiePolicy: 'Política de Cookies', and: 'e a', privacyPolicy: 'Política de Privacidade', rejectNonEssential: 'Rejeitar não essenciais', acceptAnalytics: 'Aceitar análises', managePreferences: 'Gerir preferências', openSettings: 'Abrir definições de cookies', settings: 'Definições de cookies', preferences: 'Preferências de cookies', preferencesDescription: 'Escolha se o AllyJen pode utilizar análises opcionais. O armazenamento necessário não pode ser desativado porque suporta a segurança e as funcionalidades solicitadas.', closePreferences: 'Fechar preferências de cookies', strictlyNecessary: 'Estritamente necessário', necessaryDescription: 'Autenticação, segurança, escolhas de consentimento, acessibilidade e funcionalidades de quiosque solicitadas.', alwaysOn: 'Sempre ativo', analytics: 'Análises', analyticsDescription: 'O Google Analytics e o Vercel Analytics ajudam-nos a compreender as visitas e a melhorar o AllyJen.', savePreferences: 'Guardar preferências',
    },
    team: {
      loadError: 'Não foi possível carregar os membros da equipa', inviteError: 'Não foi possível convidar o membro da equipa', invitationSent: 'Convite enviado. A pessoa pode utilizar a ligação no email para escolher uma palavra-passe.', updateError: 'Não foi possível atualizar o membro da equipa', memberUpdated: 'Membro da equipa atualizado.', removeConfirm: 'Remover {name} desta empresa? A respetiva conta não será eliminada.', removeError: 'Não foi possível remover o membro da equipa', memberRemoved: 'Membro da equipa removido.', members: 'Membros da equipa', description: 'Convide pessoas e escolha quem é proprietário ou gere esta empresa.', addMember: 'Adicionar membro', memberName: 'Nome do membro da equipa', fullName: 'Nome completo', memberEmail: 'Email do membro da equipa', emailAddress: 'Endereço de email', memberRole: 'Função do membro da equipa', staff: 'Colaborador', manager: 'Gestor', owner: 'Proprietário', sending: 'A enviar…', sendInvite: 'Enviar convite', loading: 'A carregar equipa…', name: 'Nome', role: 'Função', save: 'Guardar', cancel: 'Cancelar', you: 'Você', active: 'Ativo', inviteSent: 'Convite enviado', edit: 'Editar', remove: 'Remover', empty: 'Nenhum membro da equipa encontrado.', roleHelpTitle: 'Que função devo escolher?', ownerHelp: 'Acesso total, incluindo a gestão de membros da equipa e a eliminação de conteúdo operacional.', managerHelp: 'Acesso operacional total, incluindo eliminações, mas sem gestão de membros da equipa.', staffHelp: 'Pode criar e editar conteúdo, mas não pode gerir utilizadores nem eliminar ingredientes e itens do menu.',
    },
  },
  fr: {
    ...adminAccessTranslations.fr,
    ...kioskPortalTranslations.fr,
    ...corePortalTranslations.fr,
    ...settingsPortalTranslations.fr,
    ...analyticsPortalTranslations.fr,
    ingredientsPortal: ingredientsPortalTranslations.fr,
    menuBuilderPortal: menuBuilderTranslations.fr,
    shared: { closeNotification: 'Fermer la notification', loadingDashboard: 'Chargement de votre tableau de bord...' },
    cookieConsent: {
      consentAria: 'Consentement aux cookies', privacyChoices: 'Vos choix de confidentialité', bannerDescription: 'Nous utilisons un stockage strictement nécessaire pour assurer la sécurité et le fonctionnement d’AllyJen. Avec votre autorisation, nous utilisons également des outils d’analyse pour comprendre l’utilisation du service. Ils restent désactivés tant que vous ne les acceptez pas.', readOur: 'Consultez notre', cookiePolicy: 'Politique relative aux cookies', and: 'et notre', privacyPolicy: 'Politique de confidentialité', rejectNonEssential: 'Refuser les cookies non essentiels', acceptAnalytics: 'Accepter les outils d’analyse', managePreferences: 'Gérer les préférences', openSettings: 'Ouvrir les paramètres des cookies', settings: 'Paramètres des cookies', preferences: 'Préférences relatives aux cookies', preferencesDescription: 'Choisissez si AllyJen peut utiliser des outils d’analyse facultatifs. Le stockage nécessaire ne peut pas être désactivé, car il assure la sécurité et les fonctionnalités demandées.', closePreferences: 'Fermer les préférences relatives aux cookies', strictlyNecessary: 'Strictement nécessaires', necessaryDescription: 'Authentification, sécurité, choix de consentement, accessibilité et fonctionnalités de borne demandées.', alwaysOn: 'Toujours actifs', analytics: 'Analyse', analyticsDescription: 'Google Analytics et Vercel Analytics nous aident à comprendre les visites et à améliorer AllyJen.', savePreferences: 'Enregistrer les préférences',
    },
    team: {
      loadError: 'Impossible de charger les membres de l’équipe', inviteError: 'Impossible d’inviter le membre de l’équipe', invitationSent: 'Invitation envoyée. La personne peut utiliser le lien reçu par e-mail pour choisir un mot de passe.', updateError: 'Impossible de modifier le membre de l’équipe', memberUpdated: 'Membre de l’équipe mis à jour.', removeConfirm: 'Retirer {name} de cette entreprise ? Son compte ne sera pas supprimé.', removeError: 'Impossible de retirer le membre de l’équipe', memberRemoved: 'Membre de l’équipe retiré.', members: 'Membres de l’équipe', description: 'Invitez des personnes et définissez qui possède ou gère cette entreprise.', addMember: 'Ajouter un membre', memberName: 'Nom du membre de l’équipe', fullName: 'Nom complet', memberEmail: 'E-mail du membre de l’équipe', emailAddress: 'Adresse e-mail', memberRole: 'Rôle du membre de l’équipe', staff: 'Employé', manager: 'Responsable', owner: 'Propriétaire', sending: 'Envoi…', sendInvite: 'Envoyer l’invitation', loading: 'Chargement de l’équipe…', name: 'Nom', role: 'Rôle', save: 'Enregistrer', cancel: 'Annuler', you: 'Vous', active: 'Actif', inviteSent: 'Invitation envoyée', edit: 'Modifier', remove: 'Retirer', empty: 'Aucun membre de l’équipe trouvé.', roleHelpTitle: 'Quel rôle choisir ?', ownerHelp: 'Accès complet, y compris la gestion des membres de l’équipe et la suppression du contenu opérationnel.', managerHelp: 'Accès opérationnel complet, y compris les suppressions, mais sans gestion des membres de l’équipe.', staffHelp: 'Peut créer et modifier du contenu, mais ne peut pas gérer les utilisateurs ni supprimer des ingrédients ou des articles du menu.',
    },
  },
  es: {
    ...adminAccessTranslations.es,
    ...kioskPortalTranslations.es,
    ...corePortalTranslations.es,
    ...settingsPortalTranslations.es,
    ...analyticsPortalTranslations.es,
    ingredientsPortal: ingredientsPortalTranslations.es,
    menuBuilderPortal: menuBuilderTranslations.es,
    shared: { closeNotification: 'Cerrar notificación', loadingDashboard: 'Cargando tu panel...' },
    cookieConsent: {
      consentAria: 'Consentimiento de cookies', privacyChoices: 'Tus opciones de privacidad', bannerDescription: 'Utilizamos almacenamiento estrictamente necesario para mantener AllyJen seguro y en funcionamiento. Con tu permiso, también utilizamos analíticas para comprender cómo se usa el servicio. Las analíticas permanecen desactivadas hasta que las aceptes.', readOur: 'Consulta nuestra', cookiePolicy: 'Política de cookies', and: 'y nuestra', privacyPolicy: 'Política de privacidad', rejectNonEssential: 'Rechazar las no esenciales', acceptAnalytics: 'Aceptar analíticas', managePreferences: 'Gestionar preferencias', openSettings: 'Abrir configuración de cookies', settings: 'Configuración de cookies', preferences: 'Preferencias de cookies', preferencesDescription: 'Elige si AllyJen puede utilizar analíticas opcionales. El almacenamiento necesario no puede desactivarse porque permite ofrecer seguridad y las funciones solicitadas.', closePreferences: 'Cerrar preferencias de cookies', strictlyNecessary: 'Estrictamente necesarias', necessaryDescription: 'Autenticación, seguridad, opciones de consentimiento, accesibilidad y funciones de quiosco solicitadas.', alwaysOn: 'Siempre activas', analytics: 'Analíticas', analyticsDescription: 'Google Analytics y Vercel Analytics nos ayudan a comprender las visitas y mejorar AllyJen.', savePreferences: 'Guardar preferencias',
    },
    team: {
      loadError: 'No se pudieron cargar los miembros del equipo', inviteError: 'No se pudo invitar al miembro del equipo', invitationSent: 'Invitación enviada. Puede utilizar el enlace del correo para elegir una contraseña.', updateError: 'No se pudo actualizar el miembro del equipo', memberUpdated: 'Miembro del equipo actualizado.', removeConfirm: '¿Eliminar a {name} de esta empresa? Su cuenta no se eliminará.', removeError: 'No se pudo eliminar al miembro del equipo', memberRemoved: 'Miembro del equipo eliminado.', members: 'Miembros del equipo', description: 'Invita a personas y elige quién es propietario o gestiona esta empresa.', addMember: 'Añadir miembro', memberName: 'Nombre del miembro del equipo', fullName: 'Nombre completo', memberEmail: 'Correo del miembro del equipo', emailAddress: 'Dirección de correo', memberRole: 'Rol del miembro del equipo', staff: 'Personal', manager: 'Responsable', owner: 'Propietario', sending: 'Enviando…', sendInvite: 'Enviar invitación', loading: 'Cargando equipo…', name: 'Nombre', role: 'Rol', save: 'Guardar', cancel: 'Cancelar', you: 'Tú', active: 'Activo', inviteSent: 'Invitación enviada', edit: 'Editar', remove: 'Eliminar', empty: 'No se encontraron miembros del equipo.', roleHelpTitle: '¿Qué rol debo elegir?', ownerHelp: 'Acceso completo, incluida la gestión de miembros del equipo y la eliminación de contenido operativo.', managerHelp: 'Acceso operativo completo, incluidas las eliminaciones, pero sin gestión de miembros del equipo.', staffHelp: 'Puede crear y editar contenido, pero no puede gestionar usuarios ni eliminar ingredientes o elementos del menú.',
    },
  },
  de: {
    ...adminAccessTranslations.de,
    ...kioskPortalTranslations.de,
    ...corePortalTranslations.de,
    ...settingsPortalTranslations.de,
    ...analyticsPortalTranslations.de,
    ingredientsPortal: ingredientsPortalTranslations.de,
    menuBuilderPortal: menuBuilderTranslations.de,
    shared: { closeNotification: 'Benachrichtigung schließen', loadingDashboard: 'Ihr Dashboard wird geladen...' },
    cookieConsent: {
      consentAria: 'Cookie-Einwilligung', privacyChoices: 'Ihre Datenschutzauswahl', bannerDescription: 'Wir verwenden unbedingt erforderlichen Speicher, damit AllyJen sicher und funktionsfähig bleibt. Mit Ihrer Einwilligung nutzen wir außerdem Analysen, um die Nutzung des Dienstes zu verstehen. Analysen bleiben deaktiviert, bis Sie zustimmen.', readOur: 'Lesen Sie unsere', cookiePolicy: 'Cookie-Richtlinie', and: 'und unsere', privacyPolicy: 'Datenschutzerklärung', rejectNonEssential: 'Nicht erforderliche ablehnen', acceptAnalytics: 'Analysen akzeptieren', managePreferences: 'Einstellungen verwalten', openSettings: 'Cookie-Einstellungen öffnen', settings: 'Cookie-Einstellungen', preferences: 'Cookie-Einstellungen', preferencesDescription: 'Wählen Sie, ob AllyJen optionale Analysen verwenden darf. Erforderlicher Speicher kann nicht deaktiviert werden, da er Sicherheit und angeforderte Funktionen unterstützt.', closePreferences: 'Cookie-Einstellungen schließen', strictlyNecessary: 'Unbedingt erforderlich', necessaryDescription: 'Authentifizierung, Sicherheit, Einwilligungsauswahl, Barrierefreiheit und angeforderte Kioskfunktionen.', alwaysOn: 'Immer aktiv', analytics: 'Analysen', analyticsDescription: 'Google Analytics und Vercel Analytics helfen uns, Besuche zu verstehen und AllyJen zu verbessern.', savePreferences: 'Einstellungen speichern',
    },
    team: {
      loadError: 'Teammitglieder konnten nicht geladen werden', inviteError: 'Das Teammitglied konnte nicht eingeladen werden', invitationSent: 'Einladung gesendet. Die Person kann über den Link in der E-Mail ein Passwort festlegen.', updateError: 'Das Teammitglied konnte nicht aktualisiert werden', memberUpdated: 'Teammitglied aktualisiert.', removeConfirm: '{name} aus diesem Unternehmen entfernen? Das Konto wird nicht gelöscht.', removeError: 'Das Teammitglied konnte nicht entfernt werden', memberRemoved: 'Teammitglied entfernt.', members: 'Teammitglieder', description: 'Laden Sie Personen ein und legen Sie fest, wer dieses Unternehmen besitzt oder betreibt.', addMember: 'Teammitglied hinzufügen', memberName: 'Name des Teammitglieds', fullName: 'Vollständiger Name', memberEmail: 'E-Mail des Teammitglieds', emailAddress: 'E-Mail-Adresse', memberRole: 'Rolle des Teammitglieds', staff: 'Mitarbeiter', manager: 'Manager', owner: 'Inhaber', sending: 'Wird gesendet…', sendInvite: 'Einladung senden', loading: 'Team wird geladen…', name: 'Name', role: 'Rolle', save: 'Speichern', cancel: 'Abbrechen', you: 'Sie', active: 'Aktiv', inviteSent: 'Einladung gesendet', edit: 'Bearbeiten', remove: 'Entfernen', empty: 'Keine Teammitglieder gefunden.', roleHelpTitle: 'Welche Rolle soll ich wählen?', ownerHelp: 'Vollzugriff, einschließlich der Verwaltung von Teammitgliedern und dem Löschen betrieblicher Inhalte.', managerHelp: 'Vollständiger operativer Zugriff einschließlich Löschvorgängen, jedoch ohne Verwaltung von Teammitgliedern.', staffHelp: 'Kann Inhalte erstellen und bearbeiten, aber keine Benutzer verwalten oder Zutaten und Menüelemente löschen.',
    },
  },
} as const
