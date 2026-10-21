// Local wrapper around prettier-edge.
//
// The published plugin (1.0.0) has two open upstream bugs that make it
// non-idempotent on templates used by this project:
//
//   - https://github.com/edge-js/prettier-edge/issues/4
//   - https://github.com/edge-js/prettier-edge/issues/7
//
// HTML text nodes keep their leading/trailing newlines, so every run adds
// more blank lines around text that follows an Edge tag (for example an
// `@svg(...)` inside a button). Plain-text templates are also formatted as
// HTML, which inserts line breaks into e-mails.
//
// We patch the parsed tree before it reaches the printer: text nodes in
// block context are trimmed, and documents without HTML elements are left
// untouched. Remove this wrapper once the upstream plugin is fixed.

import { languages, options, parsers as baseParsers, printers } from 'prettier-edge'

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

const RAW_TEXT = new Set(['script', 'style', 'pre', 'textarea'])

const BLOCK = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'dialog',
  'div',
  'dl',
  'dt',
  'dd',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'html',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'section',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'ul',
  'body',
  'head',
  'menu',
  'summary',
  'colgroup',
  'caption',
  'noscript',
  'svg',
  'g',
  'defs',
  'symbol',
  'mask',
  'clippath',
  'pattern',
  'lineargradient',
  'radialgradient',
  'filter',
  'marker',
  'foreignobject',
  'path',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'rect',
  'text',
  'tspan',
  'image',
  'use',
  'stop',
])

function isBlockLevel(node) {
  if (!node) return false
  if (node.type === 'EdgeBlock' || node.type === 'EdgeRawBlock') return true
  if (node.type === 'EdgeInline' || node.type === 'EdgeVoid') return true
  if (node.type === 'HTMLElement') {
    if (VOID.has(node.name) || RAW_TEXT.has(node.name) || BLOCK.has(node.name)) {
      return true
    }
  }
  if (node.type === 'HTMLComment' || node.type === 'HTMLDoctype' || node.type === 'HTMLProcInst') {
    return true
  }
  return false
}

function trimBlockText(children) {
  const anyBlock = children.some(isBlockLevel)
  if (anyBlock) {
    for (const child of children) {
      if (child.type === 'HTMLText' && /\S/.test(child.value)) {
        child.value = child.value.replace(/^\s+|\s+$/g, '')
      }
    }
  }

  for (const child of children) {
    if (child.type === 'HTMLElement') {
      trimBlockText(child.children)
    } else if (child.type === 'EdgeBlock') {
      for (const branch of child.branches) {
        trimBlockText(branch.body ?? [])
      }
    }
  }
}

function hasHtmlElement(nodes) {
  return nodes.some(
    (node) =>
      node.type === 'HTMLElement' ||
      (node.type === 'EdgeBlock' &&
        node.branches.some((branch) => hasHtmlElement(branch.body ?? [])))
  )
}

const baseParse = baseParsers.edge.parse

export const parsers = {
  edge: {
    ...baseParsers.edge,
    async parse(text, parseOptions) {
      const ast = await baseParse(text, parseOptions)
      if (ast.__passthrough) return ast

      if (!hasHtmlElement(ast.children)) {
        return { ...ast, __passthrough: true }
      }

      trimBlockText(ast.children)
      return ast
    },
  },
}

export { languages, options, printers }
