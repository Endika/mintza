import type { TemplateChoice } from '../../application/use-cases/ImportMeetingUseCase';

export type ImportOption = 'recreate' | 'use';

export const defaultImportOption = (canRecreate: boolean): ImportOption =>
  canRecreate ? 'recreate' : 'use';

export const toTemplateChoice = (option: ImportOption, templateId: string): TemplateChoice =>
  option === 'recreate' ? { kind: 'recreate' } : { kind: 'use', templateId };
