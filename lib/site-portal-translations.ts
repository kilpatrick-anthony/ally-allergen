type LocaleIndex = 1 | 2 | 3 | 4 | 5 | 6

const rows = [
  ['createDescription', 'Create a new location for your business', 'Cruthaigh suíomh nua do do ghnó', 'Crie um novo local para a sua empresa', 'Créez un nouveau site pour votre entreprise', 'Crea una nueva ubicación para tu empresa', 'Erstellen Sie einen neuen Standort für Ihr Unternehmen'],
  ['error', 'Error', 'Earráid', 'Erro', 'Erreur', 'Error', 'Fehler'],
  ['siteName', 'Site Name', 'Ainm an tSuímh', 'Nome do local', 'Nom du site', 'Nombre del sitio', 'Standortname'],
  ['siteNamePlaceholder', 'e.g., Oakberry Dublin City Centre', 'm.sh., Oakberry Lár Chathair Bhaile Átha Cliath', 'por ex., Oakberry Centro de Dublin', 'p. ex., Oakberry Centre-ville de Dublin', 'p. ej., Oakberry Centro de Dublín', 'z. B. Oakberry Dublin Innenstadt'],
  ['locationDetails', 'Location Details', 'Sonraí Suímh', 'Detalhes do local', 'Détails du site', 'Detalles de ubicación', 'Standortdetails'],
  ['addressPlaceholder', 'e.g., 12 Grafton Street', 'm.sh., 12 Sráid Grafton', 'por ex., Rua Grafton, 12', 'p. ex., 12 Grafton Street', 'p. ej., Grafton Street 12', 'z. B. Grafton Street 12'],
  ['cityPlaceholder', 'e.g., Dublin', 'm.sh., Baile Átha Cliath', 'por ex., Dublin', 'p. ex., Dublin', 'p. ej., Dublín', 'z. B. Dublin'],
  ['countryPlaceholder', 'e.g., Ireland', 'm.sh., Éire', 'por ex., Irlanda', 'p. ex., Irlande', 'p. ej., Irlanda', 'z. B. Irland'],
  ['eircode', 'Eircode (Irish Postcode)', 'Eircode (Cód Poist Éireannach)', 'Eircode (código postal irlandês)', 'Eircode (code postal irlandais)', 'Eircode (código postal irlandés)', 'Eircode (irische Postleitzahl)'],
  ['eircodePlaceholder', 'e.g., D02 XY45', 'm.sh., D02 XY45', 'por ex., D02 XY45', 'p. ex., D02 XY45', 'p. ej., D02 XY45', 'z. B. D02 XY45'],
  ['mapHint', 'Used to display location on map', 'Úsáidtear chun an suíomh a thaispeáint ar an léarscáil', 'Utilizado para mostrar o local no mapa', 'Utilisé pour afficher le site sur la carte', 'Se utiliza para mostrar la ubicación en el mapa', 'Wird zur Anzeige des Standorts auf der Karte verwendet'],
  ['contactInformation', 'Contact Information', 'Faisnéis Teagmhála', 'Informações de contacto', 'Coordonnées', 'Información de contacto', 'Kontaktinformationen'],
  ['phoneNumber', 'Phone Number', 'Uimhir Theileafóin', 'Número de telefone', 'Numéro de téléphone', 'Número de teléfono', 'Telefonnummer'],
  ['emailPlaceholder', 'location@example.com', 'suíomh@sampla.ie', 'local@exemplo.pt', 'site@exemple.fr', 'ubicacion@ejemplo.es', 'standort@beispiel.de'],
  ['createSite', 'Create Site', 'Cruthaigh Suíomh', 'Criar local', 'Créer le site', 'Crear sitio', 'Standort erstellen'],
  ['createError', 'Failed to create site', 'Níorbh fhéidir an suíomh a chruthú', 'Não foi possível criar o local', 'Impossible de créer le site', 'No se pudo crear el sitio', 'Standort konnte nicht erstellt werden'],
  ['backToDetails', 'Back to Site Details', 'Ar ais chuig Sonraí an tSuímh', 'Voltar aos detalhes do local', 'Retour aux détails du site', 'Volver a los detalles del sitio', 'Zurück zu den Standortdetails'],
  ['editSite', 'Edit Site', 'Cuir Suíomh in Eagar', 'Editar local', 'Modifier le site', 'Editar sitio', 'Standort bearbeiten'],
  ['updateFor', 'Update information for {name}', 'Nuashonraigh faisnéis do {name}', 'Atualize as informações de {name}', 'Mettez à jour les informations de {name}', 'Actualiza la información de {name}', 'Informationen für {name} aktualisieren'],
  ['mapPreview', 'Map Preview', 'Réamhamharc Léarscáile', 'Pré-visualização do mapa', 'Aperçu de la carte', 'Vista previa del mapa', 'Kartenvorschau'],
  ['mapTitle', 'Site location map', 'Léarscáil shuíomh an láithreáin', 'Mapa da localização', 'Carte de localisation du site', 'Mapa de ubicación del sitio', 'Standortkarte'],
  ['mapEmpty', 'Add an address to see the map preview.', 'Cuir seoladh leis chun réamhamharc na léarscáile a fheiceáil.', 'Adicione uma morada para ver a pré-visualização do mapa.', 'Ajoutez une adresse pour afficher l’aperçu de la carte.', 'Añade una dirección para ver la vista previa del mapa.', 'Fügen Sie eine Adresse hinzu, um die Kartenvorschau zu sehen.'],
  ['deleteConfirm', 'Are you sure you want to delete this site? This action cannot be undone.', 'An bhfuil tú cinnte gur mhaith leat an suíomh seo a scriosadh? Ní féidir é seo a chealú.', 'Tem a certeza de que pretende eliminar este local? Esta ação não pode ser anulada.', 'Voulez-vous vraiment supprimer ce site ? Cette action est irréversible.', '¿Seguro que quieres eliminar este sitio? Esta acción no se puede deshacer.', 'Möchten Sie diesen Standort wirklich löschen? Dies kann nicht rückgängig gemacht werden.'],
  ['updateError', 'Failed to update site', 'Níorbh fhéidir an suíomh a nuashonrú', 'Não foi possível atualizar o local', 'Impossible de mettre à jour le site', 'No se pudo actualizar el sitio', 'Standort konnte nicht aktualisiert werden'],
  ['loadError', 'Failed to load site data', 'Níorbh fhéidir sonraí an tsuímh a luchtú', 'Não foi possível carregar os dados do local', 'Impossible de charger les données du site', 'No se pudieron cargar los datos del sitio', 'Standortdaten konnten nicht geladen werden'],
  ['deleteError', 'Failed to delete site', 'Níorbh fhéidir an suíomh a scriosadh', 'Não foi possível eliminar o local', 'Impossible de supprimer le site', 'No se pudo eliminar el sitio', 'Standort konnte nicht gelöscht werden'],
  ['deleteSite', 'Delete Site', 'Scrios Suíomh', 'Eliminar local', 'Supprimer le site', 'Eliminar sitio', 'Standort löschen'],
  ['allergenGuide', 'Allergen Guide', 'Treoir Ailléirginí', 'Guia de alergénios', 'Guide des allergènes', 'Guía de alérgenos', 'Allergenleitfaden'],
  ['deleteMenuConfirm', 'Delete this menu item? This cannot be undone.', 'Scrios an mhír biachláir seo? Ní féidir é seo a chealú.', 'Eliminar este item do menu? Esta ação não pode ser anulada.', 'Supprimer cet article du menu ? Cette action est irréversible.', '¿Eliminar este elemento del menú? Esta acción no se puede deshacer.', 'Diesen Menüeintrag löschen? Dies kann nicht rückgängig gemacht werden.'],
  ['menuLoadError', 'Failed to load menu items', 'Níorbh fhéidir míreanna biachláir a luchtú', 'Não foi possível carregar os itens do menu', 'Impossible de charger les articles du menu', 'No se pudieron cargar los elementos del menú', 'Menüeinträge konnten nicht geladen werden'],
  ['menuDeleteError', 'Failed to delete menu item', 'Níorbh fhéidir an mhír biachláir a scriosadh', 'Não foi possível eliminar o item do menu', 'Impossible de supprimer l’article du menu', 'No se pudo eliminar el elemento del menú', 'Menüeintrag konnte nicht gelöscht werden'],
] as const

function locale(index: LocaleIndex) {
  return Object.fromEntries(rows.map((row) => [row[0], row[index]]))
}

export const sitePortalTranslations = {
  en: { sitePortal: locale(1) }, ga: { sitePortal: locale(2) }, pt: { sitePortal: locale(3) },
  fr: { sitePortal: locale(4) }, es: { sitePortal: locale(5) }, de: { sitePortal: locale(6) },
} as const
