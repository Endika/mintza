import type { LanguageCode } from '../../domain/language/value-objects/Language';

export type TranslationKey =
  | 'app.tagline'
  | 'nav.history'
  | 'nav.settings'
  | 'nav.back'
  | 'home.new_meeting'
  | 'home.ready'
  | 'home.requesting_mic'
  | 'home.recording'
  | 'home.stopping'
  | 'home.generating'
  | 'home.done'
  | 'home.btn_record'
  | 'home.btn_pause'
  | 'home.btn_resume'
  | 'home.btn_stop'
  | 'home.btn_new'
  | 'home.paused'
  | 'home.transcript'
  | 'home.transcript_placeholder'
  | 'home.summary'
  | 'home.summary_placeholder'
  | 'home.statistics'
  | 'home.mind_map'
  | 'home.sentiment'
  | 'home.field_template'
  | 'home.field_language'
  | 'home.configure_key'
  | 'template.work'
  | 'template.interview'
  | 'template.generic'
  | 'summary.bullet_points'
  | 'summary.action_items'
  | 'summary.one_liner'
  | 'summary.keywords'
  | 'summary.sentiment'
  | 'summary.timeline'
  | 'summary.decisions'
  | 'summary.next_steps'
  | 'settings.title'
  | 'settings.api_keys'
  | 'settings.api_keys_warning'
  | 'settings.qualities'
  | 'settings.preferences'
  | 'settings.summary_quality'
  | 'settings.transcription_quality'
  | 'settings.cheap'
  | 'settings.balanced'
  | 'settings.premium'
  | 'settings.btn_save'
  | 'settings.btn_clear'
  | 'settings.btn_test'
  | 'settings.testing'
  | 'settings.valid'
  | 'settings.saved'
  | 'settings.cleared'
  | 'settings.interface_language'
  | 'settings.default_template'
  | 'history.title'
  | 'history.loading'
  | 'history.empty'
  | 'export.label'
  | 'export.markdown'
  | 'export.json'
  | 'export.txt'
  | 'export.csv';

export type Translations = Record<TranslationKey, string>;

const EN: Translations = {
  'app.tagline': 'From talk to insight.',
  'nav.history': 'History',
  'nav.settings': 'Settings',
  'nav.back': '← Back',
  'home.new_meeting': 'New meeting',
  'home.ready': 'Ready to record.',
  'home.requesting_mic': 'Requesting microphone permission…',
  'home.recording': 'Recording…',
  'home.stopping': 'Stopping…',
  'home.generating': 'Generating summaries…',
  'home.done': 'Done.',
  'home.btn_record': 'Record',
  'home.btn_pause': 'Pause',
  'home.btn_resume': 'Resume',
  'home.btn_stop': 'Stop',
  'home.btn_new': 'New meeting',
  'home.paused': 'Paused — press Resume to continue.',
  'home.transcript': 'Transcript',
  'home.transcript_placeholder': 'The transcript will appear here while you talk.',
  'home.summary': 'Summary',
  'home.summary_placeholder': 'Summaries are generated when you stop recording.',
  'home.statistics': 'Statistics',
  'home.mind_map': 'Mind map',
  'home.sentiment': 'Sentiment',
  'home.field_template': 'Template',
  'home.field_language': 'Spoken language',
  'home.configure_key': 'Configure your OpenAI key before recording.',
  'template.work': 'Work',
  'template.interview': 'Interview',
  'template.generic': 'Generic',
  'summary.bullet_points': 'Key points',
  'summary.action_items': 'Action items',
  'summary.one_liner': 'One-liner',
  'summary.keywords': 'Keywords',
  'summary.sentiment': 'Sentiment',
  'summary.timeline': 'Timeline',
  'summary.decisions': 'Decisions',
  'summary.next_steps': 'Next steps',
  'settings.title': 'Settings',
  'settings.api_keys': 'API keys',
  'settings.api_keys_warning':
    "Your keys are stored only in this browser's localStorage. They never leave your device.",
  'settings.qualities': 'Quality profiles',
  'settings.preferences': 'Preferences',
  'settings.summary_quality': 'Summary quality',
  'settings.transcription_quality': 'Transcription quality',
  'settings.cheap': 'Cheap',
  'settings.balanced': 'Balanced (recommended)',
  'settings.premium': 'Premium',
  'settings.btn_save': 'Save',
  'settings.btn_clear': 'Clear keys',
  'settings.btn_test': 'Test',
  'settings.testing': 'Testing…',
  'settings.valid': '✓ Valid',
  'settings.saved': 'Settings saved.',
  'settings.cleared': 'Keys cleared from this browser.',
  'settings.interface_language': 'Interface language',
  'settings.default_template': 'Default template',
  'history.title': 'History',
  'history.loading': 'Loading…',
  'history.empty': 'No meetings saved yet.',
  'export.label': 'Export:',
  'export.markdown': 'Markdown',
  'export.json': 'JSON',
  'export.txt': 'TXT',
  'export.csv': 'CSV',
};

const ES: Translations = {
  'app.tagline': 'De la conversación a la idea.',
  'nav.history': 'Historial',
  'nav.settings': 'Ajustes',
  'nav.back': '← Volver',
  'home.new_meeting': 'Nueva reunión',
  'home.ready': 'Listo para grabar.',
  'home.requesting_mic': 'Solicitando permiso de micrófono…',
  'home.recording': 'Grabando…',
  'home.stopping': 'Parando…',
  'home.generating': 'Generando resúmenes…',
  'home.done': 'Listo.',
  'home.btn_record': 'Grabar',
  'home.btn_pause': 'Pausar',
  'home.btn_resume': 'Reanudar',
  'home.btn_stop': 'Parar',
  'home.btn_new': 'Nueva reunión',
  'home.paused': 'Pausado — pulsa Reanudar para continuar.',
  'home.transcript': 'Transcripción',
  'home.transcript_placeholder': 'La transcripción aparecerá aquí mientras hablas.',
  'home.summary': 'Resumen',
  'home.summary_placeholder': 'Los resúmenes se generan al parar la grabación.',
  'home.statistics': 'Estadísticas',
  'home.mind_map': 'Mapa mental',
  'home.sentiment': 'Sentimiento',
  'home.field_template': 'Plantilla',
  'home.field_language': 'Idioma hablado',
  'home.configure_key': 'Configura tu clave de OpenAI antes de grabar.',
  'template.work': 'Trabajo',
  'template.interview': 'Entrevista',
  'template.generic': 'Genérica',
  'summary.bullet_points': 'Puntos clave',
  'summary.action_items': 'Acciones',
  'summary.one_liner': 'En una línea',
  'summary.keywords': 'Palabras clave',
  'summary.sentiment': 'Sentimiento',
  'summary.timeline': 'Cronología',
  'summary.decisions': 'Decisiones',
  'summary.next_steps': 'Próximos pasos',
  'settings.title': 'Ajustes',
  'settings.api_keys': 'Claves API',
  'settings.api_keys_warning':
    'Tus claves se guardan solo en el localStorage de este navegador. No salen de tu dispositivo.',
  'settings.qualities': 'Perfiles de calidad',
  'settings.preferences': 'Preferencias',
  'settings.summary_quality': 'Calidad de resumen',
  'settings.transcription_quality': 'Calidad de transcripción',
  'settings.cheap': 'Barato',
  'settings.balanced': 'Equilibrado (recomendado)',
  'settings.premium': 'Premium',
  'settings.btn_save': 'Guardar',
  'settings.btn_clear': 'Borrar claves',
  'settings.btn_test': 'Probar',
  'settings.testing': 'Probando…',
  'settings.valid': '✓ Válida',
  'settings.saved': 'Ajustes guardados.',
  'settings.cleared': 'Claves borradas de este navegador.',
  'settings.interface_language': 'Idioma de la interfaz',
  'settings.default_template': 'Plantilla por defecto',
  'history.title': 'Historial',
  'history.loading': 'Cargando…',
  'history.empty': 'Aún no hay reuniones guardadas.',
  'export.label': 'Exportar:',
  'export.markdown': 'Markdown',
  'export.json': 'JSON',
  'export.txt': 'TXT',
  'export.csv': 'CSV',
};

const EU: Translations = {
  'app.tagline': 'Hizketatik ideiara.',
  'nav.history': 'Historia',
  'nav.settings': 'Ezarpenak',
  'nav.back': '← Itzuli',
  'home.new_meeting': 'Bilera berria',
  'home.ready': 'Grabatzeko prest.',
  'home.requesting_mic': 'Mikrofonoaren baimena eskatzen…',
  'home.recording': 'Grabatzen…',
  'home.stopping': 'Gelditzen…',
  'home.generating': 'Laburpenak sortzen…',
  'home.done': 'Eginda.',
  'home.btn_record': 'Grabatu',
  'home.btn_pause': 'Etenaldia',
  'home.btn_resume': 'Jarraitu',
  'home.btn_stop': 'Gelditu',
  'home.btn_new': 'Bilera berria',
  'home.paused': 'Pausan — sakatu Jarraitu jarraitzeko.',
  'home.transcript': 'Transkripzioa',
  'home.transcript_placeholder': 'Transkripzioa hemen agertuko da hitz egin ahala.',
  'home.summary': 'Laburpena',
  'home.summary_placeholder': 'Laburpenak grabazioa gelditzean sortuko dira.',
  'home.statistics': 'Estatistikak',
  'home.mind_map': 'Buru-mapa',
  'home.sentiment': 'Sentimendua',
  'home.field_template': 'Txantiloia',
  'home.field_language': 'Hizkuntza',
  'home.configure_key': 'Konfiguratu zure OpenAI gakoa grabatu aurretik.',
  'template.work': 'Lana',
  'template.interview': 'Elkarrizketa',
  'template.generic': 'Orokorra',
  'summary.bullet_points': 'Puntu nagusiak',
  'summary.action_items': 'Ekintzak',
  'summary.one_liner': 'Esaldi batean',
  'summary.keywords': 'Hitz gakoak',
  'summary.sentiment': 'Sentimendua',
  'summary.timeline': 'Denbora-lerroa',
  'summary.decisions': 'Erabakiak',
  'summary.next_steps': 'Hurrengo urratsak',
  'settings.title': 'Ezarpenak',
  'settings.api_keys': 'API gakoak',
  'settings.api_keys_warning':
    'Zure gakoak nabigatzaile honetako localStorage-an bakarrik gordetzen dira. Ez dute zure gailua uzten.',
  'settings.qualities': 'Kalitate-profilak',
  'settings.preferences': 'Lehentasunak',
  'settings.summary_quality': 'Laburpenaren kalitatea',
  'settings.transcription_quality': 'Transkripzioaren kalitatea',
  'settings.cheap': 'Merkea',
  'settings.balanced': 'Orekatua (gomendatua)',
  'settings.premium': 'Premium',
  'settings.btn_save': 'Gorde',
  'settings.btn_clear': 'Garbitu gakoak',
  'settings.btn_test': 'Probatu',
  'settings.testing': 'Probatzen…',
  'settings.valid': '✓ Baliozkoa',
  'settings.saved': 'Ezarpenak gordeta.',
  'settings.cleared': 'Nabigatzaile honetako gakoak garbituta.',
  'settings.interface_language': 'Interfazearen hizkuntza',
  'settings.default_template': 'Txantiloi lehenetsia',
  'history.title': 'Historia',
  'history.loading': 'Kargatzen…',
  'history.empty': 'Oraindik ez dago gordetako bilerarik.',
  'export.label': 'Esportatu:',
  'export.markdown': 'Markdown',
  'export.json': 'JSON',
  'export.txt': 'TXT',
  'export.csv': 'CSV',
};

export const TRANSLATIONS: Record<LanguageCode, Translations> = {
  en: EN,
  es: ES,
  eu: EU,
};
