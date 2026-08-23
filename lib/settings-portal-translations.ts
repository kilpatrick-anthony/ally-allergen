type LocaleIndex = 1 | 2 | 3 | 4 | 5 | 6

const rows = [
  ['sessionExpired', 'Your session has expired. Please sign in again.', 'Tá do sheisiún imithe in éag. Sínigh isteach arís.', 'A sua sessão expirou. Inicie sessão novamente.', 'Votre session a expiré. Veuillez vous reconnecter.', 'Tu sesión ha caducado. Vuelve a iniciar sesión.', 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.'],
  ['fileTooLarge', 'File size must be less than 5MB', 'Caithfidh méid an chomhaid a bheith níos lú ná 5 MB', 'O ficheiro deve ter menos de 5 MB', 'Le fichier doit faire moins de 5 Mo', 'El archivo debe ocupar menos de 5 MB', 'Die Datei muss kleiner als 5 MB sein'],
  ['selectImage', 'Please select an image file', 'Roghnaigh comhad íomhá', 'Selecione um ficheiro de imagem', 'Veuillez sélectionner un fichier image', 'Selecciona un archivo de imagen', 'Bitte wählen Sie eine Bilddatei aus'],
  ['logoUploaded', 'Logo uploaded successfully!', 'Uaslódáladh an lógó!', 'Logótipo carregado com sucesso!', 'Logo importé avec succès !', '¡Logotipo subido correctamente!', 'Logo erfolgreich hochgeladen!'],
  ['stripeConnected', 'Stripe account connected successfully!', 'Ceanglaíodh an cuntas Stripe!', 'Conta Stripe associada com sucesso!', 'Compte Stripe connecté avec succès !', '¡Cuenta de Stripe conectada correctamente!', 'Stripe-Konto erfolgreich verbunden!'],
  ['stripeError', 'An error occurred during Stripe connection.', 'Tharla earráid agus Stripe á cheangal.', 'Ocorreu um erro ao ligar ao Stripe.', 'Une erreur est survenue lors de la connexion à Stripe.', 'Se produjo un error al conectar con Stripe.', 'Beim Verbinden mit Stripe ist ein Fehler aufgetreten.'],
  ['noBusinessId', 'No business ID found', 'Níor aimsíodh aitheantas gnó', 'Não foi encontrado o ID da empresa', 'Identifiant d’entreprise introuvable', 'No se encontró el identificador de la empresa', 'Keine Unternehmens-ID gefunden'],
  ['failedToSave', 'Failed to save:', 'Níorbh fhéidir sábháil:', 'Falha ao guardar:', 'Échec de l’enregistrement :', 'Error al guardar:', 'Speichern fehlgeschlagen:'],
  ['unknownError', 'Unknown error', 'Earráid anaithnid', 'Erro desconhecido', 'Erreur inconnue', 'Error desconocido', 'Unbekannter Fehler'],
  ['disable2faError', 'Failed to disable 2FA:', 'Níorbh fhéidir 2FA a dhíchumasú:', 'Não foi possível desativar a 2FA:', 'Impossible de désactiver l’A2F :', 'No se pudo desactivar la autenticación en dos pasos:', '2FA konnte nicht deaktiviert werden:'],
  ['twoFactorDisabled', 'Two-factor authentication disabled', 'Díchumasaíodh fíordheimhniú dhá fhachtóir', 'Autenticação de dois fatores desativada', 'Authentification à deux facteurs désactivée', 'Autenticación en dos pasos desactivada', 'Zwei-Faktor-Authentifizierung deaktiviert'],
  ['loadingSettings', 'Loading settings...', 'Socruithe á luchtú...', 'A carregar definições...', 'Chargement des paramètres...', 'Cargando configuración...', 'Einstellungen werden geladen...'],
  ['team', 'Team', 'Foireann', 'Equipa', 'Équipe', 'Equipo', 'Team'],
  ['accessibility', 'Accessibility', 'Inrochtaineacht', 'Acessibilidade', 'Accessibilité', 'Accesibilidad', 'Barrierefreiheit'],
  ['configurePlatform', 'Configure your allergen management platform', 'Cumraigh d’ardán bainistíochta ailléirginí', 'Configure a sua plataforma de gestão de alergénios', 'Configurez votre plateforme de gestion des allergènes', 'Configura tu plataforma de gestión de alérgenos', 'Konfigurieren Sie Ihre Plattform zur Allergenverwaltung'],
  ['englishDefault', '🇬🇧 English (Default)', '🇬🇧 Béarla (Réamhshocrú)', '🇬🇧 Inglês (predefinido)', '🇬🇧 Anglais (par défaut)', '🇬🇧 Inglés (predeterminado)', '🇬🇧 Englisch (Standard)'],
  ['irish', '🇮🇪 Irish', '🇮🇪 Gaeilge', '🇮🇪 Irlandês', '🇮🇪 Irlandais', '🇮🇪 Irlandés', '🇮🇪 Irisch'],
  ['portuguese', '🇵🇹 Portuguese', '🇵🇹 Portaingéilis', '🇵🇹 Português', '🇵🇹 Portugais', '🇵🇹 Portugués', '🇵🇹 Portugiesisch'],
  ['french', '🇫🇷 French', '🇫🇷 Fraincis', '🇫🇷 Francês', '🇫🇷 Français', '🇫🇷 Francés', '🇫🇷 Französisch'],
  ['spanish', '🇪🇸 Spanish', '🇪🇸 Spáinnis', '🇪🇸 Espanhol', '🇪🇸 Espagnol', '🇪🇸 Español', '🇪🇸 Spanisch'],
  ['german', '🇩🇪 German', '🇩🇪 Gearmáinis', '🇩🇪 Alemão', '🇩🇪 Allemand', '🇩🇪 Alemán', '🇩🇪 Deutsch'],
  ['businessAddress', 'Business Address', 'Seoladh Gnó', 'Morada da empresa', 'Adresse de l’entreprise', 'Dirección de la empresa', 'Geschäftsadresse'],
  ['streetAddress', 'Street address', 'Seoladh sráide', 'Morada', 'Adresse', 'Dirección', 'Straße und Hausnummer'],
  ['city', 'City', 'Cathair', 'Cidade', 'Ville', 'Ciudad', 'Stadt'],
  ['postalCodeTitle', 'Postal Code', 'Cód Poist', 'Código postal', 'Code postal', 'Código postal', 'Postleitzahl'],
  ['postalCode', 'Postal code', 'Cód poist', 'Código postal', 'Code postal', 'Código postal', 'Postleitzahl'],
  ['country', 'Country', 'Tír', 'País', 'Pays', 'País', 'Land'],
  ['businessPhone', 'Business Phone', 'Fón Gnó', 'Telefone da empresa', 'Téléphone de l’entreprise', 'Teléfono de la empresa', 'Geschäftstelefon'],
  ['businessPhonePlaceholder', 'Business phone number', 'Uimhir fóin an ghnó', 'Número de telefone da empresa', 'Numéro de téléphone de l’entreprise', 'Número de teléfono de la empresa', 'Geschäftliche Telefonnummer'],
  ['kioskDisclaimer', 'Kiosk Disclaimer', 'Séanadh an Bhoth', 'Aviso do quiosque', 'Avertissement de la borne', 'Aviso del quiosco', 'Kiosk-Hinweis'],
  ['kioskDisclaimerHelp', 'Custom cross-contamination or allergen disclaimer shown to customers on your kiosk screen. Leave blank to use the default AllyJen message.', 'Séanadh saincheaptha faoi thras-éilliú nó ailléirginí a thaispeántar do chustaiméirí ar scáileán an bhoth. Fág bán é chun teachtaireacht réamhshocraithe AllyJen a úsáid.', 'Aviso personalizado sobre contaminação cruzada ou alergénios apresentado aos clientes no ecrã do quiosque. Deixe em branco para utilizar a mensagem predefinida do AllyJen.', 'Avertissement personnalisé sur la contamination croisée ou les allergènes affiché sur la borne. Laissez ce champ vide pour utiliser le message AllyJen par défaut.', 'Aviso personalizado sobre contaminación cruzada o alérgenos que se muestra en la pantalla del quiosco. Déjalo vacío para usar el mensaje predeterminado de AllyJen.', 'Benutzerdefinierter Hinweis zu Kreuzkontamination oder Allergenen auf dem Kioskbildschirm. Lassen Sie das Feld leer, um den Standardhinweis von AllyJen zu verwenden.'],
  ['disclaimerText', 'Disclaimer Text', 'Téacs an tSéanadh', 'Texto do aviso', 'Texte de l’avertissement', 'Texto del aviso', 'Hinweistext'],
  ['disclaimerPlaceholder', 'e.g., At Acme Café, we take allergen safety seriously. While we strive to keep our products free from undeclared allergens, please be aware that cross-contamination may occur in our kitchen...', 'm.sh., Ag Caifé Acme, glacaimid sábháilteacht ailléirginí dáiríre. Cé go ndéanaimid ár ndícheall táirgí a choinneáil saor ó ailléirginí neamhdhearbhaithe, d’fhéadfadh tras-éilliú tarlú inár gcistin...', 'por exemplo, no Café Acme levamos a segurança dos alergénios a sério. Embora procuremos evitar alergénios não declarados, pode ocorrer contaminação cruzada na nossa cozinha...', 'Par exemple : au Café Acme, nous prenons la sécurité liée aux allergènes très au sérieux. Malgré tous nos efforts, une contamination croisée peut survenir dans notre cuisine...', 'Por ejemplo: en Café Acme nos tomamos muy en serio la seguridad de los alérgenos. Aunque procuramos evitar alérgenos no declarados, puede producirse contaminación cruzada en nuestra cocina...', 'Zum Beispiel: Im Café Acme nehmen wir Allergensicherheit ernst. Trotz aller Sorgfalt kann es in unserer Küche zu Kreuzkontaminationen kommen...'],
  ['disclaimerPlacement', 'This replaces the disclaimer text in the orange warning section at the bottom of your kiosk.', 'Tagann sé seo in ionad an téacs séanta sa chuid rabhaidh oráiste ag bun do bhoth.', 'Este texto substitui o aviso na secção laranja na parte inferior do quiosque.', 'Ce texte remplace l’avertissement de la section orange située en bas de la borne.', 'Este texto sustituye al aviso de la sección naranja situada en la parte inferior del quiosco.', 'Dieser Text ersetzt den Hinweis im orangefarbenen Warnbereich am unteren Rand des Kiosks.'],
] as const

function locale(index: LocaleIndex) {
  return Object.fromEntries(rows.map((row) => [row[0], row[index]]))
}

export const settingsPortalTranslations = {
  en: { settingsPortal: locale(1) }, ga: { settingsPortal: locale(2) }, pt: { settingsPortal: locale(3) },
  fr: { settingsPortal: locale(4) }, es: { settingsPortal: locale(5) }, de: { settingsPortal: locale(6) },
} as const
