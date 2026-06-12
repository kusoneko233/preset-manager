declare const require: any;
declare const process: any;

const fs = require('fs');
const path = require('path');

function readProjectFile(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8') as string;
}

function expectIncludes(content: string, expected: string) {
  if (!content.includes(expected)) {
    throw new Error(`Expected file to include: ${expected}`);
  }
}

function expectNotIncludes(content: string, unexpected: string) {
  if (content.includes(unexpected)) {
    throw new Error(`Expected file not to include: ${unexpected}`);
  }
}

function expectOrder(content: string, first: string, second: string) {
  const firstIndex = content.indexOf(first);
  const secondIndex = content.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex >= secondIndex) {
    throw new Error(`Expected ${first} to appear before ${second}`);
  }
}

function extractFunctionBlock(content: string, name: string) {
  const start = content.indexOf(`function ${name}`);
  if (start < 0) throw new Error(`Expected function to exist: ${name}`);
  const nextFunction = content.indexOf('\nfunction ', start + 1);
  return content.slice(start, nextFunction < 0 ? undefined : nextFunction);
}

const app = readProjectFile('src/preset-manager/App.vue');
const leftSidebar = readProjectFile('src/preset-manager/components/LeftSidebar.vue');
const aiAssistant = readProjectFile('src/preset-manager/components/AiAssistant.vue');

expectIncludes(leftSidebar, 'chatTabs: ChatSidebarItem[];');
expectIncludes(leftSidebar, 'activeChatId: string;');
expectIncludes(leftSidebar, "'new-chat': [];");
expectIncludes(leftSidebar, "'select-chat': [id: string];");
expectIncludes(leftSidebar, "'close-chat': [id: string];");
expectIncludes(leftSidebar, '@click="setMode(\'chat\')"');
expectIncludes(leftSidebar, 'class="sidebar-new-chat-button"');
expectIncludes(leftSidebar, '@click="createMainChat"');
expectIncludes(leftSidebar, 'class="new-chat-label">新对话</span>');
expectOrder(leftSidebar, 'class="sidebar-new-chat-button"', 'class="sidebar-settings-button"');
expectIncludes(leftSidebar, 'class="sidebar-chat-list"');
expectIncludes(leftSidebar, "emit('select-chat', chat.id)");
expectIncludes(leftSidebar, "emit('close-chat', chat.id)");
expectNotIncludes(leftSidebar, 'activeMode === \'chat\'"\n            @click="createMainChat"');

expectIncludes(app, ':chat-tabs="mainChatTabs"');
expectIncludes(app, ':active-chat-id="activeMainChatTabId"');
expectIncludes(app, '@new-chat="createMainChatTab"');
expectIncludes(app, '@select-chat="selectMainChatTab"');
expectIncludes(app, '@close-chat="closeMainChatTab"');
expectIncludes(app, '@session-title="renameChatTabBySession"');
expectIncludes(app, 'function createMainChatTab()');
expectIncludes(app, 'function selectMainChatTab(tabId: string)');
expectIncludes(app, 'function closeMainChatTab(tabId: string)');
expectIncludes(app, 'function renameChatTabBySession');

const createMainChatTab = extractFunctionBlock(app, 'createMainChatTab');
expectIncludes(createMainChatTab, "createChatWorkspaceTab('main'");
expectIncludes(createMainChatTab, "sidebarMode.value = 'chat';");
expectIncludes(createMainChatTab, 'activeMainChatTabId.value = tab.id;');

const renameChatTabBySession = extractFunctionBlock(app, 'renameChatTabBySession');
expectIncludes(renameChatTabBySession, 'mainChatTabs.value.find');
expectIncludes(renameChatTabBySession, 'rightAuxTabs.value.find');
expectIncludes(renameChatTabBySession, 'isGeneratedChatTitle');

expectIncludes(aiAssistant, "'session-title': [payload: { sessionId: string; title: string }];");
expectIncludes(aiAssistant, 'function buildChatTitle');
expectIncludes(aiAssistant, "emit('session-title'");
expectIncludes(aiAssistant, 'const sentText = inputText.value.trim();');

console.info('mainChatWorkspace tests passed');
