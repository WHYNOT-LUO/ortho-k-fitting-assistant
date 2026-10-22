import type { Flag, NotChecked } from '../domain/screening';
import { translate, type Lang } from './index';
import type { MessageKey } from './zh';

/**
 * Turn a flag into a sentence in the chosen language.
 * Params whose name ends in "Key" hold i18n keys (comma-separated for lists);
 * they are translated and passed on without the "Key" suffix.
 */
export function flagParams(lang: Lang, params: Flag['params']): Record<string, string | number> {
  const out: Record<string, string | number> = { ...params };
  const joiner = lang === 'zh' ? '、' : ', ';
  for (const [name, value] of Object.entries(params)) {
    if (!name.endsWith('Key') || typeof value !== 'string') continue;
    out[name.slice(0, -3)] = value
      .split(',')
      .filter(Boolean)
      .map((key) => translate(lang, key as MessageKey))
      .join(joiner);
  }
  return out;
}

export function flagText(lang: Lang, flag: Flag): string {
  return translate(lang, `flag.${flag.code}` as MessageKey, flagParams(lang, flag.params));
}

export function flagNotesText(lang: Lang, flag: Flag): string[] {
  return flag.notes.map((n) => translate(lang, `note.${n}` as MessageKey));
}

export function notCheckedText(lang: Lang, item: NotChecked): string {
  const joiner = lang === 'zh' ? '、' : ', ';
  return translate(lang, 'screen.missing', { fields: item.missing.map((k) => translate(lang, k)).join(joiner) });
}
