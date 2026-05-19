declare const require: any;

const { getPromptRelation, getPromptRelationLabel } = require('./promptRelations');

function expectEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const targetPrompts = [
  { id: 'a', name: '系统规则', content: '保持角色' },
  { id: 'b', name: '格式要求', content: '使用中文' },
];

expectEqual(getPromptRelation({ id: 'a', name: '其他', content: '其他内容' }, targetPrompts), 'same-id');
expectEqual(getPromptRelation({ id: 'x', name: '其他', content: '使用中文' }, targetPrompts), 'same-content');
expectEqual(getPromptRelation({ id: 'x', name: '系统规则', content: '新内容' }, targetPrompts), 'same-name');
expectEqual(getPromptRelation({ id: 'x', name: '新条目', content: '新内容' }, targetPrompts), 'none');
expectEqual(getPromptRelationLabel('same-id'), '已存在');
expectEqual(getPromptRelationLabel('same-content'), '同内容');
expectEqual(getPromptRelationLabel('same-name'), '同名');
expectEqual(getPromptRelationLabel('none'), '');
