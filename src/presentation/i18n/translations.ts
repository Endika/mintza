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
  | 'home.btn_summarize_now'
  | 'home.summarizing'
  | 'home.paused'
  | 'home.rec'
  | 'home.rec_paused'
  | 'home.mic_level'
  | 'home.mic_silent'
  | 'home.mic_quiet'
  | 'home.mic_ok'
  | 'home.mic_loud'
  | 'home.mic_none'
  | 'home.chunks_wait'
  | 'home.no_audio'
  | 'home.skip'
  | 'home.last_error'
  | 'update.title'
  | 'update.reload'
  | 'update.dismiss'
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
  | 'home.templates_failed'
  | 'template.builtin.work'
  | 'template.builtin.interview'
  | 'template.builtin.generic'
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
  | 'settings.no_changes'
  | 'settings.unsaved'
  | 'settings.interface_language'
  | 'settings.default_template'
  | 'settings.save_failed'
  | 'settings.clear_failed'
  | 'history.title'
  | 'history.loading'
  | 'history.empty'
  | 'history.search_placeholder'
  | 'history.sort_label'
  | 'history.sort_recent'
  | 'history.sort_oldest'
  | 'history.sort_longest'
  | 'history.sort_title'
  | 'history.no_results'
  | 'history.delete_failed'
  | 'history.clear_failed'
  | 'templates.title'
  | 'templates.manage'
  | 'templates.new'
  | 'templates.duplicate'
  | 'templates.edit'
  | 'templates.delete'
  | 'templates.builtin'
  | 'templates.field_name'
  | 'templates.field_mindmap'
  | 'templates.field_kinds'
  | 'templates.field_label_overrides'
  | 'templates.field_prompt_overrides'
  | 'templates.cancel'
  | 'templates.save'
  | 'templates.confirm_delete'
  | 'templates.in_use_block'
  | 'templates.used_in'
  | 'meeting.regenerate'
  | 'meeting.regenerating'
  | 'meeting.delete_failed'
  | 'export.label'
  | 'export.markdown'
  | 'export.json'
  | 'export.txt'
  | 'export.csv'
  | 'app.version'
  | 'home.summaries_result'
  | 'home.save_failed'
  | 'home.start_failed'
  | 'home.keep_awake_on'
  | 'home.keep_awake_off'
  | 'home.progress'
  | 'home.progress_skipped'
  | 'home.progress_failed'
  | 'history.clear_all'
  | 'history.load_failed'
  | 'history.starred'
  | 'history.delete_named'
  | 'history.confirm_delete'
  | 'history.confirm_clear'
  | 'detail.missing_id'
  | 'detail.invalid_id'
  | 'detail.delete'
  | 'detail.load_failed'
  | 'detail.not_found'
  | 'detail.confirm_delete'
  | 'detail.no_transcript'
  | 'detail.no_summaries'
  | 'detail.regenerate'
  | 'settings.provider_openai'
  | 'settings.provider_google'
  | 'settings.provider_anthropic'
  | 'settings.provider_azure'
  | 'settings.hint_cheap'
  | 'settings.hint_balanced'
  | 'settings.hint_premium'
  | 'settings.azure_region'
  | 'settings.azure_region_placeholder'
  | 'settings.key_placeholder'
  | 'templates.load_failed'
  | 'templates.section_count'
  | 'templates.copy_name'
  | 'templates.delete_failed'
  | 'templates.field_meeting_type'
  | 'templates.field_meeting_type_hint'
  | 'templates.meeting_type_placeholder'
  | 'templates.kinds_required'
  | 'cost.total'
  | 'cost.words'
  | 'cost.transcribed'
  | 'cost.so_far'
  | 'stats.duration'
  | 'stats.words'
  | 'stats.words_per_minute'
  | 'stats.providers'
  | 'stats.top_keywords'
  | 'stats.no_keywords'
  | 'sentiment.very_negative'
  | 'sentiment.negative'
  | 'sentiment.neutral'
  | 'sentiment.positive'
  | 'sentiment.very_positive'
  | 'export.pdf';

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
  'home.btn_summarize_now': 'Summarize now',
  'home.summarizing': 'Summarizing…',
  'home.paused': 'Paused — press Resume to continue.',
  'home.rec': 'REC',
  'home.rec_paused': 'Paused',
  'home.mic_level': 'Mic level',
  'home.mic_silent': 'Silent',
  'home.mic_quiet': 'Quiet',
  'home.mic_ok': 'OK',
  'home.mic_loud': 'Loud',
  'home.mic_none': 'No sound detected · check mic',
  'home.chunks_wait': 'Waiting for the first part…',
  'home.no_audio':
    'No audio was transcribed. The mic may not have captured sound or the API failed.',
  'home.skip': 'Skip to content',
  'home.last_error': 'Last error',
  'update.title': 'New version available',
  'update.reload': 'Reload',
  'update.dismiss': 'Dismiss',
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
  'home.templates_failed': "Couldn't load your custom templates. Using the built-in ones.",
  'template.builtin.work': 'Work',
  'template.builtin.interview': 'Interview',
  'template.builtin.generic': 'Generic',
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
    'Your keys stay in this browser. Mintza only sends each key to its own provider, when you record or summarise.',
  'settings.qualities': 'Quality profiles',
  'settings.preferences': 'Preferences',
  'settings.summary_quality': 'Summary quality',
  'settings.transcription_quality': 'Transcription quality',
  'settings.cheap': 'Cheap',
  'settings.balanced': 'Balanced',
  'settings.premium': 'Premium',
  'settings.btn_save': 'Save',
  'settings.btn_clear': 'Clear keys',
  'settings.btn_test': 'Test',
  'settings.testing': 'Testing…',
  'settings.valid': '✓ Valid',
  'settings.saved': 'Settings saved.',
  'settings.cleared': 'Keys cleared from this browser.',
  'settings.no_changes': 'No changes to save.',
  'settings.unsaved': 'Unsaved changes',
  'settings.interface_language': 'Interface language',
  'settings.default_template': 'Default template',
  'settings.save_failed': "Couldn't save your settings.",
  'settings.clear_failed': "Couldn't clear your keys.",
  'history.title': 'History',
  'history.loading': 'Loading…',
  'history.empty': 'No meetings saved yet.',
  'history.search_placeholder': 'Search meetings…',
  'history.sort_label': 'Sort',
  'history.sort_recent': 'Newest first',
  'history.sort_oldest': 'Oldest first',
  'history.sort_longest': 'Longest first',
  'history.sort_title': 'Title (A–Z)',
  'history.no_results': 'No meetings match the search.',
  'history.delete_failed': "Couldn't delete that meeting.",
  'history.clear_failed': "Couldn't delete all meetings.",
  'templates.title': 'Templates',
  'templates.manage': 'Manage templates',
  'templates.new': 'New template',
  'templates.duplicate': 'Duplicate',
  'templates.edit': 'Edit',
  'templates.delete': 'Delete',
  'templates.builtin': 'Built-in',
  'templates.field_name': 'Name',
  'templates.field_mindmap': 'Mind map structure suggestion',
  'templates.field_kinds': 'Summary sections (toggle to include)',
  'templates.field_label_overrides': 'Custom labels (leave empty to keep default)',
  'templates.field_prompt_overrides': 'Custom prompts (leave empty to keep default)',
  'templates.cancel': 'Cancel',
  'templates.save': 'Save template',
  'templates.confirm_delete': 'Delete this template?',
  'templates.in_use_block': 'In use by {count} meeting(s) — cannot delete',
  'templates.used_in': 'Used in {count} meeting(s)',
  'meeting.regenerate': 'Regenerate with',
  'meeting.regenerating': 'Regenerating summaries…',
  'meeting.delete_failed': "Couldn't delete this meeting.",
  'export.label': 'Export:',
  'export.markdown': 'Markdown',
  'export.json': 'JSON',
  'export.txt': 'TXT',
  'export.csv': 'CSV',
  'app.version': 'Mintza version {version}',
  'home.summaries_result': '{ok} ready · {failed} failed',
  'home.save_failed': "Couldn't save this meeting.",
  'home.start_failed': "Couldn't start recording. Check that Mintza can use your microphone.",
  'home.keep_awake_on': 'Keep screen on',
  'home.keep_awake_off': 'Let screen sleep',
  'home.progress': 'Transcribing… {done} of {total} parts',
  'home.progress_skipped': '{count} skipped',
  'home.progress_failed': '{count} failed',
  'history.clear_all': 'Clear all',
  'history.load_failed': "Couldn't load your meetings.",
  'history.starred': 'Starred',
  'history.delete_named': 'Delete {title}',
  'history.confirm_delete': 'Delete this meeting?',
  'history.confirm_clear': "Delete all meetings? This can't be undone.",
  'detail.missing_id': "This link doesn't point to a meeting.",
  'detail.invalid_id': "This meeting link isn't valid.",
  'detail.delete': 'Delete',
  'detail.load_failed': "Couldn't load this meeting.",
  'detail.not_found': 'Meeting not found.',
  'detail.confirm_delete': "Delete this meeting? This can't be undone.",
  'detail.no_transcript': 'No transcript.',
  'detail.no_summaries': 'No summaries.',
  'detail.regenerate': 'Regenerate',
  'settings.provider_openai': 'OpenAI (Whisper + GPT)',
  'settings.provider_google': 'Google (Gemini + Speech)',
  'settings.provider_anthropic': 'Anthropic Claude',
  'settings.provider_azure': 'Azure Speech',
  'settings.hint_cheap': 'Lowest cost; uses your cheapest connected service first.',
  'settings.hint_balanced': 'Good quality at low cost. Recommended.',
  'settings.hint_premium': 'Best quality, about 20× the cost.',
  'settings.azure_region': 'Azure region',
  'settings.azure_region_placeholder': 'e.g. westeurope',
  'settings.key_placeholder': 'Paste your key',
  'templates.load_failed': "Couldn't load your templates.",
  'templates.section_count': '{count} sections',
  'templates.copy_name': '{name} copy',
  'templates.delete_failed': "Couldn't delete this template.",
  'templates.field_meeting_type': 'What kind of meeting is this?',
  'templates.field_meeting_type_hint':
    'Mintza tells the assistant this before reading the transcript.',
  'templates.meeting_type_placeholder': "a doctor's appointment, a brainstorm…",
  'templates.kinds_required': 'Pick at least one summary section.',
  'cost.total': 'Total:',
  'cost.words': '{count} words',
  'cost.transcribed': 'Transcribed {duration}',
  'cost.so_far': 'Cost so far: {amount}',
  'stats.duration': 'Duration',
  'stats.words': 'Words',
  'stats.words_per_minute': 'Words / min',
  'stats.providers': 'Providers',
  'stats.top_keywords': 'Top keywords',
  'stats.no_keywords': 'No keywords detected.',
  'sentiment.very_negative': 'Very negative',
  'sentiment.negative': 'Negative',
  'sentiment.neutral': 'Neutral',
  'sentiment.positive': 'Positive',
  'sentiment.very_positive': 'Very positive',
  'export.pdf': 'PDF',
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
  'home.btn_summarize_now': 'Resumir ahora',
  'home.summarizing': 'Resumiendo…',
  'home.paused': 'Pausado — pulsa Reanudar para continuar.',
  'home.rec': 'GRABANDO',
  'home.rec_paused': 'Pausa',
  'home.mic_level': 'Nivel mic',
  'home.mic_silent': 'Silencio',
  'home.mic_quiet': 'Bajo',
  'home.mic_ok': 'OK',
  'home.mic_loud': 'Alto',
  'home.mic_none': 'No se detecta sonido · revisa el mic',
  'home.chunks_wait': 'Esperando la primera parte…',
  'home.no_audio': 'No se transcribió nada. El micro pudo no captar sonido o la API falló.',
  'home.skip': 'Saltar al contenido',
  'home.last_error': 'Último error',
  'update.title': 'Nueva versión disponible',
  'update.reload': 'Recargar',
  'update.dismiss': 'Descartar',
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
  'home.templates_failed':
    'No se pudieron cargar tus plantillas personalizadas. Se usan las integradas.',
  'template.builtin.work': 'Trabajo',
  'template.builtin.interview': 'Entrevista',
  'template.builtin.generic': 'Genérica',
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
    'Tus claves se quedan en este navegador. Mintza solo envía cada clave a su proveedor cuando grabas o resumes.',
  'settings.qualities': 'Perfiles de calidad',
  'settings.preferences': 'Preferencias',
  'settings.summary_quality': 'Calidad de resumen',
  'settings.transcription_quality': 'Calidad de transcripción',
  'settings.cheap': 'Barato',
  'settings.balanced': 'Equilibrado',
  'settings.premium': 'Premium',
  'settings.btn_save': 'Guardar',
  'settings.btn_clear': 'Borrar claves',
  'settings.btn_test': 'Probar',
  'settings.testing': 'Probando…',
  'settings.valid': '✓ Válida',
  'settings.saved': 'Ajustes guardados.',
  'settings.cleared': 'Claves borradas de este navegador.',
  'settings.no_changes': 'Sin cambios que guardar.',
  'settings.unsaved': 'Cambios sin guardar',
  'settings.interface_language': 'Idioma de la interfaz',
  'settings.default_template': 'Plantilla por defecto',
  'settings.save_failed': 'No se pudieron guardar los ajustes.',
  'settings.clear_failed': 'No se pudieron borrar las claves.',
  'history.title': 'Historial',
  'history.loading': 'Cargando…',
  'history.empty': 'Aún no hay reuniones guardadas.',
  'history.search_placeholder': 'Buscar reuniones…',
  'history.sort_label': 'Orden',
  'history.sort_recent': 'Más recientes primero',
  'history.sort_oldest': 'Más antiguas primero',
  'history.sort_longest': 'Más largas primero',
  'history.sort_title': 'Título (A–Z)',
  'history.no_results': 'Ninguna reunión coincide con la búsqueda.',
  'history.delete_failed': 'No se pudo borrar esa reunión.',
  'history.clear_failed': 'No se pudieron borrar todas las reuniones.',
  'templates.title': 'Plantillas',
  'templates.manage': 'Gestionar plantillas',
  'templates.new': 'Nueva plantilla',
  'templates.duplicate': 'Duplicar',
  'templates.edit': 'Editar',
  'templates.delete': 'Borrar',
  'templates.builtin': 'Integrada',
  'templates.field_name': 'Nombre',
  'templates.field_mindmap': 'Estructura sugerida del mapa mental',
  'templates.field_kinds': 'Secciones del resumen (activa/desactiva)',
  'templates.field_label_overrides': 'Etiquetas personalizadas (vacío = por defecto)',
  'templates.field_prompt_overrides': 'Prompts personalizados (vacío = por defecto)',
  'templates.cancel': 'Cancelar',
  'templates.save': 'Guardar plantilla',
  'templates.confirm_delete': '¿Borrar esta plantilla?',
  'templates.in_use_block': 'Usada por {count} reunión(es) — no se puede borrar',
  'templates.used_in': 'Usada en {count} reunión(es)',
  'meeting.regenerate': 'Regenerar con',
  'meeting.regenerating': 'Regenerando resúmenes…',
  'meeting.delete_failed': 'No se pudo borrar esta reunión.',
  'export.label': 'Exportar:',
  'export.markdown': 'Markdown',
  'export.json': 'JSON',
  'export.txt': 'TXT',
  'export.csv': 'CSV',
  'app.version': 'Mintza, versión {version}',
  'home.summaries_result': '{ok} listos · {failed} fallidos',
  'home.save_failed': 'No se pudo guardar esta reunión.',
  'home.start_failed': 'No se pudo empezar a grabar. Comprueba que Mintza puede usar tu micrófono.',
  'home.keep_awake_on': 'Mantener la pantalla encendida',
  'home.keep_awake_off': 'Dejar que la pantalla se apague',
  'home.progress': 'Transcribiendo… {done} de {total} partes',
  'home.progress_skipped': '{count} omitidas',
  'home.progress_failed': '{count} fallidas',
  'history.clear_all': 'Borrar todo',
  'history.load_failed': 'No se pudieron cargar tus reuniones.',
  'history.starred': 'Destacada',
  'history.delete_named': 'Borrar {title}',
  'history.confirm_delete': '¿Borrar esta reunión?',
  'history.confirm_clear': '¿Borrar todas las reuniones? No se puede deshacer.',
  'detail.missing_id': 'Este enlace no lleva a ninguna reunión.',
  'detail.invalid_id': 'Este enlace de reunión no es válido.',
  'detail.delete': 'Borrar',
  'detail.load_failed': 'No se pudo cargar esta reunión.',
  'detail.not_found': 'No se encontró la reunión.',
  'detail.confirm_delete': '¿Borrar esta reunión? No se puede deshacer.',
  'detail.no_transcript': 'Sin transcripción.',
  'detail.no_summaries': 'Sin resúmenes.',
  'detail.regenerate': 'Regenerar',
  'settings.provider_openai': 'OpenAI (Whisper + GPT)',
  'settings.provider_google': 'Google (Gemini + Speech)',
  'settings.provider_anthropic': 'Anthropic Claude',
  'settings.provider_azure': 'Azure Speech',
  'settings.hint_cheap': 'El coste más bajo; usa primero tu servicio conectado más barato.',
  'settings.hint_balanced': 'Buena calidad a bajo coste. Recomendado.',
  'settings.hint_premium': 'La mejor calidad, unas 20 veces más cara.',
  'settings.azure_region': 'Región de Azure',
  'settings.azure_region_placeholder': 'p. ej., westeurope',
  'settings.key_placeholder': 'Pega tu clave',
  'templates.load_failed': 'No se pudieron cargar tus plantillas.',
  'templates.section_count': '{count} secciones',
  'templates.copy_name': '{name} (copia)',
  'templates.delete_failed': 'No se pudo borrar esta plantilla.',
  'templates.field_meeting_type': '¿Qué tipo de reunión es?',
  'templates.field_meeting_type_hint':
    'Mintza se lo dice al asistente antes de leer la transcripción.',
  'templates.meeting_type_placeholder': 'una cita médica, una lluvia de ideas…',
  'templates.kinds_required': 'Elige al menos una sección del resumen.',
  'cost.total': 'Total:',
  'cost.words': '{count} palabras',
  'cost.transcribed': 'Transcrito: {duration}',
  'cost.so_far': 'Coste hasta ahora: {amount}',
  'stats.duration': 'Duración',
  'stats.words': 'Palabras',
  'stats.words_per_minute': 'Palabras / min',
  'stats.providers': 'Proveedores',
  'stats.top_keywords': 'Palabras clave principales',
  'stats.no_keywords': 'No se detectaron palabras clave.',
  'sentiment.very_negative': 'Muy negativo',
  'sentiment.negative': 'Negativo',
  'sentiment.neutral': 'Neutro',
  'sentiment.positive': 'Positivo',
  'sentiment.very_positive': 'Muy positivo',
  'export.pdf': 'PDF',
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
  'home.btn_summarize_now': 'Laburtu orain',
  'home.summarizing': 'Laburtzen…',
  'home.paused': 'Pausan — sakatu Jarraitu jarraitzeko.',
  'home.rec': 'GRABATZEN',
  'home.rec_paused': 'Pausan',
  'home.mic_level': 'Mic maila',
  'home.mic_silent': 'Isila',
  'home.mic_quiet': 'Baxua',
  'home.mic_ok': 'OK',
  'home.mic_loud': 'Altua',
  'home.mic_none': 'Ez da soinurik antzeman · egiaztatu mikrofonoa',
  'home.chunks_wait': 'Lehen zatiaren zain…',
  'home.no_audio':
    'Ez da audiorik transkribatu. Mikrofonoak agian ez du jaso edo APIa huts egin du.',
  'home.skip': 'Edukira jauzi',
  'home.last_error': 'Azken errorea',
  'update.title': 'Bertsio berria erabilgarri',
  'update.reload': 'Birkargatu',
  'update.dismiss': 'Baztertu',
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
  'home.templates_failed':
    'Ezin izan dira zure txantiloi pertsonalizatuak kargatu. Integratuak erabiliko dira.',
  'template.builtin.work': 'Lana',
  'template.builtin.interview': 'Elkarrizketa',
  'template.builtin.generic': 'Orokorra',
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
    'Zure gakoak nabigatzaile honetan geratzen dira. Mintzak gako bakoitza bere hornitzaileari bakarrik bidaltzen dio, grabatzean edo laburtzean.',
  'settings.qualities': 'Kalitate-profilak',
  'settings.preferences': 'Lehentasunak',
  'settings.summary_quality': 'Laburpenaren kalitatea',
  'settings.transcription_quality': 'Transkripzioaren kalitatea',
  'settings.cheap': 'Merkea',
  'settings.balanced': 'Orekatua',
  'settings.premium': 'Premium',
  'settings.btn_save': 'Gorde',
  'settings.btn_clear': 'Garbitu gakoak',
  'settings.btn_test': 'Probatu',
  'settings.testing': 'Probatzen…',
  'settings.valid': '✓ Baliozkoa',
  'settings.saved': 'Ezarpenak gordeta.',
  'settings.cleared': 'Nabigatzaile honetako gakoak garbituta.',
  'settings.no_changes': 'Ez dago aldaketarik gordetzeko.',
  'settings.unsaved': 'Gorde gabeko aldaketak',
  'settings.interface_language': 'Interfazearen hizkuntza',
  'settings.default_template': 'Txantiloi lehenetsia',
  'settings.save_failed': 'Ezin izan dira ezarpenak gorde.',
  'settings.clear_failed': 'Ezin izan dira gakoak garbitu.',
  'history.title': 'Historia',
  'history.loading': 'Kargatzen…',
  'history.empty': 'Oraindik ez dago gordetako bilerarik.',
  'history.search_placeholder': 'Bilatu bilerak…',
  'history.sort_label': 'Ordena',
  'history.sort_recent': 'Berrienak lehenengo',
  'history.sort_oldest': 'Zaharrenak lehenengo',
  'history.sort_longest': 'Luzeenak lehenengo',
  'history.sort_title': 'Izenburua (A–Z)',
  'history.no_results': 'Ez dago bat datorren bilerarik.',
  'history.delete_failed': 'Ezin izan da bilera hori ezabatu.',
  'history.clear_failed': 'Ezin izan dira bilera guztiak ezabatu.',
  'templates.title': 'Txantiloiak',
  'templates.manage': 'Kudeatu txantiloiak',
  'templates.new': 'Txantiloi berria',
  'templates.duplicate': 'Bikoiztu',
  'templates.edit': 'Editatu',
  'templates.delete': 'Ezabatu',
  'templates.builtin': 'Integratua',
  'templates.field_name': 'Izena',
  'templates.field_mindmap': 'Buru-maparen iradokizun-egitura',
  'templates.field_kinds': 'Laburpenaren atalak (aktibatu/desaktibatu)',
  'templates.field_label_overrides': 'Etiketa pertsonalizatuak (hutsa = lehenetsia)',
  'templates.field_prompt_overrides': 'Prompt pertsonalizatuak (hutsa = lehenetsia)',
  'templates.cancel': 'Utzi',
  'templates.save': 'Gorde txantiloia',
  'templates.confirm_delete': 'Txantiloi hau ezabatu?',
  'templates.in_use_block': '{count} bilerak erabilia — ezin da ezabatu',
  'templates.used_in': '{count} bileratan erabilia',
  'meeting.regenerate': 'Birsortu honekin',
  'meeting.regenerating': 'Laburpenak birsortzen…',
  'meeting.delete_failed': 'Ezin izan da bilera hau ezabatu.',
  'export.label': 'Esportatu:',
  'export.markdown': 'Markdown',
  'export.json': 'JSON',
  'export.txt': 'TXT',
  'export.csv': 'CSV',
  'app.version': 'Mintza, {version} bertsioa',
  'home.summaries_result': '{ok} prest · {failed} huts',
  'home.save_failed': 'Ezin izan da bilera hau gorde.',
  'home.start_failed':
    'Ezin izan da grabatzen hasi. Egiaztatu Mintzak zure mikrofonoa erabil dezakeela.',
  'home.keep_awake_on': 'Mantendu pantaila piztuta',
  'home.keep_awake_off': 'Utzi pantaila itzaltzen',
  'home.progress': 'Transkribatzen… {done}/{total} zati',
  'home.progress_skipped': '{count} saltatuta',
  'home.progress_failed': '{count} huts',
  'history.clear_all': 'Ezabatu guztiak',
  'history.load_failed': 'Ezin izan dira zure bilerak kargatu.',
  'history.starred': 'Izarduna',
  'history.delete_named': 'Ezabatu {title}',
  'history.confirm_delete': 'Bilera hau ezabatu?',
  'history.confirm_clear': 'Bilera guztiak ezabatu? Ezin da desegin.',
  'detail.missing_id': 'Esteka honetan ez dago bilerarik.',
  'detail.invalid_id': 'Bilera-esteka hau ez da baliozkoa.',
  'detail.delete': 'Ezabatu',
  'detail.load_failed': 'Ezin izan da bilera hau kargatu.',
  'detail.not_found': 'Ez da bilera aurkitu.',
  'detail.confirm_delete': 'Bilera hau ezabatu? Ezin da desegin.',
  'detail.no_transcript': 'Ez dago transkripziorik.',
  'detail.no_summaries': 'Ez dago laburpenik.',
  'detail.regenerate': 'Birsortu',
  'settings.provider_openai': 'OpenAI (Whisper + GPT)',
  'settings.provider_google': 'Google (Gemini + Speech)',
  'settings.provider_anthropic': 'Anthropic Claude',
  'settings.provider_azure': 'Azure Speech',
  'settings.hint_cheap':
    'Kosturik txikiena; zure zerbitzu konektatu merkeena erabiltzen du lehenik.',
  'settings.hint_balanced': 'Kalitate ona kostu txikian. Gomendatua.',
  'settings.hint_premium': 'Kalitaterik onena, 20 aldiz garestiago gutxi gorabehera.',
  'settings.azure_region': 'Azure eskualdea',
  'settings.azure_region_placeholder': 'adib. westeurope',
  'settings.key_placeholder': 'Itsatsi zure gakoa',
  'templates.load_failed': 'Ezin izan dira zure txantiloiak kargatu.',
  'templates.section_count': '{count} atal',
  'templates.copy_name': '{name} (kopia)',
  'templates.delete_failed': 'Ezin izan da txantiloi hau ezabatu.',
  'templates.field_meeting_type': 'Zer bilera mota da?',
  'templates.field_meeting_type_hint':
    'Mintzak hau esaten dio laguntzaileari transkripzioa irakurri aurretik.',
  'templates.meeting_type_placeholder': 'mediku-hitzordu bat, ideia-jasa bat…',
  'templates.kinds_required': 'Aukeratu laburpen-atal bat gutxienez.',
  'cost.total': 'Guztira:',
  'cost.words': '{count} hitz',
  'cost.transcribed': 'Transkribatuta: {duration}',
  'cost.so_far': 'Orain arteko kostua: {amount}',
  'stats.duration': 'Iraupena',
  'stats.words': 'Hitzak',
  'stats.words_per_minute': 'Hitz / min',
  'stats.providers': 'Hornitzaileak',
  'stats.top_keywords': 'Hitz gako nagusiak',
  'stats.no_keywords': 'Ez da hitz gakorik antzeman.',
  'sentiment.very_negative': 'Oso negatiboa',
  'sentiment.negative': 'Negatiboa',
  'sentiment.neutral': 'Neutroa',
  'sentiment.positive': 'Positiboa',
  'sentiment.very_positive': 'Oso positiboa',
  'export.pdf': 'PDF',
};

export const TRANSLATIONS: Record<LanguageCode, Translations> = {
  en: EN,
  es: ES,
  eu: EU,
};
