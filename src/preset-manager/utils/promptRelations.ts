export type PromptRelation = 'none' | 'same-name' | 'same-content' | 'same-id';

type ComparablePrompt = {
  id?: string;
  name?: string;
  content?: string;
};

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

export function getPromptRelation(prompt: ComparablePrompt, targetPrompts: ComparablePrompt[]): PromptRelation {
  const id = normalizeText(prompt.id);
  const name = normalizeText(prompt.name);
  const content = normalizeText(prompt.content);

  if (id && targetPrompts.some(item => normalizeText(item.id) === id)) return 'same-id';
  if (content && targetPrompts.some(item => normalizeText(item.content) === content)) return 'same-content';
  if (name && targetPrompts.some(item => normalizeText(item.name) === name)) return 'same-name';
  return 'none';
}

export function getPromptRelationLabel(relation: PromptRelation) {
  if (relation === 'same-id') return '已存在';
  if (relation === 'same-content') return '同内容';
  if (relation === 'same-name') return '同名';
  return '';
}
