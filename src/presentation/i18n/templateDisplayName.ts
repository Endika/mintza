import type { Template } from '../../domain/meeting/value-objects/Template';
import type { TranslationKey } from './translations';
import type { Translator } from './Translator';

const BUILT_IN_NAME_KEYS: Readonly<Record<string, TranslationKey>> = {
  work: 'template.builtin.work',
  interview: 'template.builtin.interview',
  generic: 'template.builtin.generic',
};

export const templateDisplayName = (tpl: Template, t: Translator): string => {
  const key = tpl.builtIn ? BUILT_IN_NAME_KEYS[tpl.id] : undefined;
  return key ? t.t(key) : tpl.name;
};
