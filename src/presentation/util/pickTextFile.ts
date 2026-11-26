export const pickTextFile = (
  doc: Document = document,
  accept = '.json,application/json',
): Promise<string | null> =>
  new Promise((resolve) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.hidden = true;
    const finish = (value: Promise<string> | null): void => {
      input.remove();
      resolve(value === null ? null : value.catch(() => null));
    };
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      finish(file ? file.text() : null);
    });
    input.addEventListener('cancel', () => finish(null));
    doc.body.appendChild(input);
    input.click();
  });
