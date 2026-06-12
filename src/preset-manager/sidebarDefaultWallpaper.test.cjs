/* eslint-disable @typescript-eslint/no-require-imports, import-x/no-nodejs-modules */

const fs = require('fs');
const path = require('path');

const app = fs.readFileSync(path.join(process.cwd(), 'src/preset-manager/App.vue'), 'utf8');
const archive = fs.readFileSync(
  path.join(process.cwd(), 'docs/archive/left-sidebar-glass-effect-before-settings-menu-2026-06-12.css'),
  'utf8',
);

function expectIncludes(content, expected) {
  if (!content.includes(expected)) throw new Error(`Expected source to include: ${expected}`);
}

function expectNotIncludes(content, unexpected) {
  if (content.includes(unexpected)) throw new Error(`Expected source not to include: ${unexpected}`);
}

expectIncludes(app, "import { CODEX_DARK_GLASS_WALLPAPER_DATA_URL } from './utils/codexDarkGlassWallpaper';");
expectIncludes(app, "'--pm-sidebar-default-image': `url('${CODEX_DARK_GLASS_WALLPAPER_DATA_URL}')`,");
expectIncludes(app, "'--pm-sidebar-default-bottom-fade': 'linear-gradient(180deg, rgba(0, 0, 0, 0) 54%, rgba(0, 0, 0, 0.59) 65%, rgba(0, 0, 0, 0.59) 100%)',");
expectIncludes(app, "'--pm-sidebar-default-mask': 'linear-gradient(rgba(48, 51, 68, 0.70), rgba(48, 51, 68, 0.70))',");
expectIncludes(app, "'--pm-sidebar-default-backdrop': 'blur(0px) saturate(90%) brightness(55%) contrast(105%)',");
expectIncludes(archive, "background-color: rgba(48, 51, 68, 0.7);");
expectIncludes(archive, 'background-image: var(--pm-sidebar-default-bottom-fade), var(--pm-sidebar-default-mask), var(--pm-sidebar-default-image);');
expectIncludes(archive, 'background-size: cover;');
expectIncludes(archive, 'filter: var(--pm-sidebar-default-backdrop);');
expectIncludes(app, "background-color: rgba(48, 51, 68, 0.7);");
expectIncludes(app, 'background-image: var(--pm-sidebar-default-bottom-fade), var(--pm-sidebar-default-mask), var(--pm-sidebar-default-image);');
expectIncludes(app, 'background-size: cover;');
expectIncludes(app, 'backdrop-filter: var(--pm-sidebar-default-backdrop);');
expectIncludes(app, 'filter: var(--pm-sidebar-default-backdrop);');
expectNotIncludes(app, '--pm-sidebar-default-edge-highlight');
expectNotIncludes(app, '--pm-sidebar-default-shadow');
expectNotIncludes(app, '--pm-sidebar-default-image: linear-gradient(135deg, rgba(54, 91, 255, 0.72), rgba(184, 209, 255, 0.82));');

console.info('sidebarDefaultWallpaper tests passed');
