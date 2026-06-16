/* eslint-disable import-x/no-nodejs-modules */
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

const app = readProjectFile('src/preset-manager/App.vue');
const titleBar = readProjectFile('src/preset-manager/components/TitleBar.vue');
const leftSidebar = readProjectFile('src/preset-manager/components/LeftSidebar.vue');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');
const migrationPanel = readProjectFile('src/preset-manager/components/PresetMigrationPanel.vue');
const sidebarPresetList = readProjectFile('src/preset-manager/components/SidebarPresetList.vue');
const workbench = readProjectFile('src/preset-manager/components/WorkbenchPanel.vue');
const favoriteFolder = readProjectFile('src/preset-manager/components/FavoriteFolder.vue');
const aiAssistant = readProjectFile('src/preset-manager/components/AiAssistant.vue');

expectIncludes(titleBar, 'function closePresetMenuFromOutside(event?: Event)');
expectIncludes(titleBar, 'function getPanelDocument()');
expectIncludes(titleBar, "getPanelDocument().addEventListener('pointerdown', closePresetMenuFromOutside, true);");
expectIncludes(titleBar, "getPanelDocument().addEventListener('click', closePresetMenuFromOutside, true);");
expectIncludes(titleBar, "parentDoc.addEventListener('pointerdown', closePresetMenuFromOutside, true);");
expectIncludes(titleBar, "parentDoc.addEventListener('click', closePresetMenuFromOutside, true);");
expectIncludes(titleBar, 'function closePresetMenuFromKey(event: KeyboardEvent)');
expectIncludes(titleBar, "if (event.key === 'Escape') presetMenuOpen.value = false;");
expectIncludes(titleBar, "getPanelDocument().defaultView?.addEventListener('keydown', closePresetMenuFromKey, true);");
expectIncludes(titleBar, "parentDoc.defaultView?.addEventListener('keydown', closePresetMenuFromKey, true);");
expectIncludes(titleBar, "getPanelDocument().defaultView?.removeEventListener('keydown', closePresetMenuFromKey, true);");
expectIncludes(titleBar, "parentDoc.defaultView?.removeEventListener('keydown', closePresetMenuFromKey, true);");
expectIncludes(titleBar, "announceMenuOpen('title-preset-menu');");
expectIncludes(titleBar, 'function closePresetMenuFromPeer(event: Event)');
expectIncludes(titleBar, "getPanelDocument().addEventListener('preset-manager-menu-opened', closePresetMenuFromPeer);");
expectIncludes(titleBar, "getPanelDocument().removeEventListener('preset-manager-menu-opened', closePresetMenuFromPeer);");

expectIncludes(app, 'function closeRightPresetMenuFromOutside(event?: Event)');
expectIncludes(app, 'function getPanelDocument()');
expectIncludes(app, "getPanelDocument().addEventListener('pointerdown', closeRightPresetMenuFromOutside, true);");
expectIncludes(app, "getPanelDocument().addEventListener('click', closeRightPresetMenuFromOutside, true);");
expectIncludes(app, "parentDoc.addEventListener('pointerdown', closeRightPresetMenuFromOutside, true);");
expectIncludes(app, "parentDoc.addEventListener('click', closeRightPresetMenuFromOutside, true);");
expectIncludes(app, 'function closeRightPresetMenuFromKey(event: KeyboardEvent)');
expectIncludes(app, "if (event.key === 'Escape') rightPresetMenuTabId.value = '';");
expectIncludes(app, "getPanelDocument().defaultView?.addEventListener('keydown', closeRightPresetMenuFromKey, true);");
expectIncludes(app, "parentDoc.defaultView?.addEventListener('keydown', closeRightPresetMenuFromKey, true);");
expectIncludes(app, "getPanelDocument().defaultView?.removeEventListener('keydown', closeRightPresetMenuFromKey, true);");
expectIncludes(app, "parentDoc.defaultView?.removeEventListener('keydown', closeRightPresetMenuFromKey, true);");
expectIncludes(app, "announceMenuOpen(`right-preset-menu:${tabId}`);");
expectIncludes(app, 'function closeRightPresetMenuFromPeer(event: Event)');
expectIncludes(app, "getPanelDocument().addEventListener('preset-manager-menu-opened', closeRightPresetMenuFromPeer);");
expectIncludes(app, "getPanelDocument().removeEventListener('preset-manager-menu-opened', closeRightPresetMenuFromPeer);");

expectIncludes(leftSidebar, 'function closeSettingsFromPointer(event: Event)');
expectIncludes(leftSidebar, 'function getPanelDocument()');
expectIncludes(leftSidebar, "getPanelDocument().addEventListener('pointerdown', closeSettingsFromPointer, true);");
expectIncludes(leftSidebar, "getPanelDocument().addEventListener('click', closeSettingsFromPointer, true);");
expectIncludes(leftSidebar, "parentDocument.addEventListener('pointerdown', closeSettingsFromPointer, true);");
expectIncludes(leftSidebar, "parentDocument.addEventListener('click', closeSettingsFromPointer, true);");
expectIncludes(leftSidebar, 'uiSettingsExpanded.value = false;');
expectIncludes(leftSidebar, "announceMenuOpen('sidebar-settings-menu');");
expectIncludes(leftSidebar, 'function closeSettingsFromPeer(event: Event)');
expectIncludes(leftSidebar, "getPanelDocument().addEventListener('preset-manager-menu-opened', closeSettingsFromPeer);");
expectIncludes(leftSidebar, "getPanelDocument().removeEventListener('preset-manager-menu-opened', closeSettingsFromPeer);");

expectIncludes(aiAssistant, 'function closeModelMenuFromPointer(event: Event)');
expectIncludes(aiAssistant, "document.addEventListener('pointerdown', closeModelMenuFromPointer, true);");
expectIncludes(aiAssistant, "parentDoc?.addEventListener('pointerdown', closeModelMenuFromPointer, true);");

expectIncludes(presetPanel, 'function closePromptContextMenuFromPointer(event: Event)');
expectIncludes(presetPanel, 'function getPanelDocument()');
expectIncludes(presetPanel, "getPanelDocument().addEventListener('pointerdown', closePromptContextMenuFromPointer, true);");
expectIncludes(presetPanel, "getPanelDocument().addEventListener('click', closePromptContextMenuFromPointer, true);");
expectIncludes(presetPanel, "getPanelDocument().defaultView?.addEventListener('keydown', closePromptContextMenuFromKey, true);");
expectIncludes(presetPanel, "parentDocument.addEventListener('pointerdown', closePromptContextMenuFromPointer, true);");

expectIncludes(sidebarPresetList, 'function closePresetContextMenuFromPointer(event: Event)');
expectIncludes(sidebarPresetList, 'function getPanelDocument()');
expectIncludes(sidebarPresetList, "getPanelDocument().addEventListener('pointerdown', closePresetContextMenuFromPointer, true);");
expectIncludes(sidebarPresetList, "getPanelDocument().addEventListener('click', closePresetContextMenuFromPointer, true);");
expectIncludes(sidebarPresetList, "getPanelDocument().defaultView?.addEventListener('keydown', closePresetContextMenuFromKey, true);");
expectIncludes(sidebarPresetList, "parentDocument.addEventListener('pointerdown', closePresetContextMenuFromPointer, true);");

expectIncludes(workbench, 'function closeDraftPopupMenus(event?: Event)');
expectIncludes(workbench, "document.addEventListener('pointerdown', closeDraftPopupMenus, true);");

expectIncludes(favoriteFolder, 'function closeFavoritePopupMenus(event?: Event)');
expectIncludes(favoriteFolder, "document.addEventListener('pointerdown', closeFavoritePopupMenus, true);");
expectIncludes(favoriteFolder, "parentDocument.addEventListener('pointerdown', closeFavoritePopupMenus, true);");

expectIncludes(promptItem, 'function closeTriggerPanelFromOutside(event: Event)');
expectIncludes(promptItem, "document.addEventListener('pointerdown', closeTriggerPanelFromOutside, true);");
expectIncludes(promptItem, "document.addEventListener('mousedown', closeTriggerPanelFromOutside, true);");
expectIncludes(promptItem, "document.addEventListener('click', closeTriggerPanelFromOutside, true);");
expectIncludes(promptItem, "window.addEventListener('keydown', closeTriggerPanelFromKey, true);");

expectNotIncludes(migrationPanel, 'function closeApplyMenuFromOutside(event: Event)');
expectNotIncludes(migrationPanel, 'ref="applyMenuRef"');
expectNotIncludes(migrationPanel, "window.addEventListener('keydown', closeApplyMenuFromKey, true);");

console.info('menuOutsideClose tests passed');
