export const generateTemplateId = (seed: string, random: () => number = Math.random): string => {
  const slug = seed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = random().toString(36).slice(2, 6);
  return slug ? `${slug}-${suffix}` : `tpl-${suffix}`;
};
