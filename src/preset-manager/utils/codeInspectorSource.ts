export type InspectorSourceInfo = {
  path?: string;
  line?: number;
  column?: number;
  node?: string;
};

export type InspectorSourceCodeBlockOptions = {
  before?: number;
  after?: number;
  includeLineNumbers?: boolean;
};

export function parseInspectorSource(raw: string | null): InspectorSourceInfo {
  if (!raw) return {};

  if (raw.includes('?')) {
    const [pathPart, query] = raw.split('?');
    const lineMatch = query?.match(/(?:^|&)line=(\d+)/);
    const columnMatch = query?.match(/(?:^|&)column=(\d+)/);
    if (pathPart && lineMatch) {
      return {
        path: pathPart,
        line: Number(lineMatch[1]),
        column: columnMatch ? Number(columnMatch[1]) : undefined,
      };
    }
  }

  const parts = raw.split(':');
  const trailingNode = parts.at(-1);
  const columnBeforeNode = Number(parts.at(-2));
  const lineBeforeNode = Number(parts.at(-3));
  if (
    trailingNode
    && !Number.isFinite(Number(trailingNode))
    && Number.isFinite(lineBeforeNode)
    && Number.isFinite(columnBeforeNode)
    && parts.length >= 4
  ) {
    return {
      path: parts.slice(0, -3).join(':'),
      line: lineBeforeNode,
      column: columnBeforeNode,
      node: trailingNode,
    };
  }

  const column = Number(parts.at(-1));
  const line = Number(parts.at(-2));
  if (Number.isFinite(line) && Number.isFinite(column) && parts.length >= 3) {
    return {
      path: parts.slice(0, -2).join(':'),
      line,
      column,
    };
  }

  const lineOnly = Number(parts.at(-1));
  if (Number.isFinite(lineOnly) && parts.length >= 2) {
    return {
      path: parts.slice(0, -1).join(':'),
      line: lineOnly,
    };
  }

  return { path: raw };
}

export function normalizeInspectorSourcePath(path: string) {
  const normalized = path.replaceAll('\\', '/');
  return normalized.replace(/^.*?(src\/preset-manager\/)/, '$1');
}

export function getInspectorSourceCodeBlock(
  sourceLines: Record<string, string[]>,
  sourceInfo: InspectorSourceInfo,
  options: number | InspectorSourceCodeBlockOptions = 2,
) {
  if (!sourceInfo.path || !sourceInfo.line) return undefined;

  const normalizedPath = normalizeInspectorSourcePath(sourceInfo.path);
  const lines = sourceLines?.[normalizedPath];
  if (!lines) return undefined;

  const before = typeof options === 'number' ? 0 : options.before ?? 0;
  const after = typeof options === 'number' ? options : options.after ?? 2;
  const includeLineNumbers = typeof options === 'number' ? false : options.includeLineNumbers ?? false;
  const targetIndex = sourceInfo.line - 1;
  const startIndex = Math.max(0, targetIndex - before);
  const endIndex = Math.min(lines.length, targetIndex + after + 1);
  const selectedLines = lines.slice(startIndex, endIndex);
  const lineNumberWidth = String(endIndex).length;
  const block = selectedLines
    .map((line, index) => {
      if (!includeLineNumbers) return line;
      const lineNumber = startIndex + index + 1;
      const prefix = lineNumber === sourceInfo.line ? '>' : ' ';
      return `${prefix} ${String(lineNumber).padStart(lineNumberWidth, ' ')} | ${line}`;
    })
    .join('\n');
  return block.trim() ? block : undefined;
}

function escapeInspectorHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stashInspectorToken(tokens: string[], className: string, content: string) {
  const key = `\uE000${tokens.length}\uE001`;
  tokens.push(`<span class="${className}">${content}</span>`);
  return key;
}

function highlightInspectorCode(value: string) {
  const tokens: string[] = [];
  let html = escapeInspectorHtml(value);

  html = html.replace(/&lt;!--[\s\S]*?--&gt;/g, match => stashInspectorToken(tokens, 'pm-inspector-token-comment', match));
  html = html.replace(/&quot;[^&]*(?:&(?!quot;)[^&]*)*&quot;|&#39;[^&]*(?:&(?!#39;)[^&]*)*&#39;/g, match =>
    stashInspectorToken(tokens, 'pm-inspector-token-string', match));
  html = html.replace(/\{\{[\s\S]*?\}\}/g, match => stashInspectorToken(tokens, 'pm-inspector-token-expression', match));
  html = html.replace(/(&lt;\/?)([A-Za-z][\w.-]*)/g, (_match, prefix: string, tagName: string) =>
    `${prefix}${stashInspectorToken(tokens, 'pm-inspector-token-tag', tagName)}`);
  html = html.replace(/(\s)([@:A-Za-z_][\w:.-]*)(=)/g, (_match, prefix: string, attrName: string, suffix: string) =>
    `${prefix}${stashInspectorToken(tokens, 'pm-inspector-token-attr', attrName)}${suffix}`);

  return tokens.reduce((result, token, index) => result.replaceAll(`\uE000${index}\uE001`, token), html);
}

function highlightInspectorLabelLine(line: string) {
  if (!line) return '<span class="pm-inspector-empty-line">&nbsp;</span>';

  const locationMatch = line.match(/^(?:[A-Za-z]:[\\/])?.*src[\\/].+?:\d+(?::\d+)?$/);
  if (locationMatch) {
    return `<span class="pm-inspector-source-path">${escapeInspectorHtml(line)}</span>`;
  }

  const lineNumberMatch = line.match(/^([> ]\s*\d+\s\|\s?)(.*)$/);
  if (lineNumberMatch) {
    const isCurrent = lineNumberMatch[1].trimStart().startsWith('>');
    const markerClass = isCurrent ? ' pm-inspector-line-number-current' : '';
    return `<span class="pm-inspector-line-number${markerClass}">${escapeInspectorHtml(lineNumberMatch[1])}</span>${highlightInspectorCode(lineNumberMatch[2])}`;
  }

  return highlightInspectorCode(line);
}

export function highlightInspectorCodeLabel(label: string) {
  return label
    .split('\n')
    .map(line => `<div class="pm-inspector-code-line">${highlightInspectorLabelLine(line)}</div>`)
    .join('');
}
