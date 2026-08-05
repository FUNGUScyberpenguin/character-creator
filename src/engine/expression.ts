/**
 * A tiny arithmetic expression language for ruleset formulas.
 *
 * Rulesets are plain data, so every number that a game computes — armour class,
 * hit points, spells known — is written as a string like `"10 + mod(dex)"`.
 * This module turns those strings into numbers without going anywhere near
 * `eval`: only the operators and functions listed here can ever run.
 *
 * Grammar (loosest to tightest binding):
 *   comparison := sum (("=="|"!="|"<"|"<="|">"|">=") sum)*
 *   sum        := product (("+"|"-") product)*
 *   product    := unary (("*"|"/"|"%") unary)*
 *   unary      := "-" unary | primary
 *   primary    := number | identifier | call | "(" comparison ")"
 */

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'ident'; value: string }
  | { kind: 'op'; value: string }
  | { kind: 'punct'; value: '(' | ')' | ',' }

export type Node =
  | { kind: 'number'; value: number }
  | { kind: 'ident'; name: string }
  | { kind: 'unary'; op: '-'; operand: Node }
  | { kind: 'binary'; op: string; left: Node; right: Node }
  | { kind: 'call'; name: string; args: Node[] }

export class ExpressionError extends Error {}

const OPERATOR_CHARS = '+-*/%<>=!'
const COMPARISONS = new Set(['==', '!=', '<', '<=', '>', '>='])

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < source.length) {
    const ch = source[i]!

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1
      continue
    }

    if (ch === '(' || ch === ')' || ch === ',') {
      tokens.push({ kind: 'punct', value: ch })
      i += 1
      continue
    }

    if (ch >= '0' && ch <= '9') {
      let j = i
      while (j < source.length && /[0-9.]/.test(source[j]!)) j += 1
      const raw = source.slice(i, j)
      const value = Number(raw)
      if (!Number.isFinite(value)) throw new ExpressionError(`Bad number "${raw}"`)
      tokens.push({ kind: 'number', value })
      i = j
      continue
    }

    // Identifiers may contain dots so rulesets can namespace their stats,
    // e.g. `stat.speed` or `class.fighter.level`.
    if (/[A-Za-z_]/.test(ch)) {
      let j = i
      while (j < source.length && /[A-Za-z0-9_.]/.test(source[j]!)) j += 1
      tokens.push({ kind: 'ident', value: source.slice(i, j) })
      i = j
      continue
    }

    if (OPERATOR_CHARS.includes(ch)) {
      const two = source.slice(i, i + 2)
      if (COMPARISONS.has(two)) {
        tokens.push({ kind: 'op', value: two })
        i += 2
        continue
      }
      tokens.push({ kind: 'op', value: ch })
      i += 1
      continue
    }

    throw new ExpressionError(`Unexpected character "${ch}" in expression`)
  }

  return tokens
}

function parse(tokens: Token[], source: string): Node {
  let pos = 0

  const peek = (): Token | undefined => tokens[pos]

  function expect(value: string): void {
    const token = peek()
    if (!token || (token.kind !== 'punct' && token.kind !== 'op') || token.value !== value) {
      throw new ExpressionError(`Expected "${value}" in "${source}"`)
    }
    pos += 1
  }

  function parsePrimary(): Node {
    const token = peek()
    if (!token) throw new ExpressionError(`Unexpected end of expression "${source}"`)

    if (token.kind === 'number') {
      pos += 1
      return { kind: 'number', value: token.value }
    }

    if (token.kind === 'ident') {
      pos += 1
      const next = peek()
      if (next && next.kind === 'punct' && next.value === '(') {
        pos += 1
        const args: Node[] = []
        if (!(peek()?.kind === 'punct' && (peek() as { value: string }).value === ')')) {
          for (;;) {
            args.push(parseComparison())
            const sep = peek()
            if (sep && sep.kind === 'punct' && sep.value === ',') {
              pos += 1
              continue
            }
            break
          }
        }
        expect(')')
        return { kind: 'call', name: token.value, args }
      }
      return { kind: 'ident', name: token.value }
    }

    if (token.kind === 'punct' && token.value === '(') {
      pos += 1
      const inner = parseComparison()
      expect(')')
      return inner
    }

    throw new ExpressionError(`Unexpected token "${token.value}" in "${source}"`)
  }

  function parseUnary(): Node {
    const token = peek()
    if (token && token.kind === 'op' && token.value === '-') {
      pos += 1
      return { kind: 'unary', op: '-', operand: parseUnary() }
    }
    return parsePrimary()
  }

  function parseProduct(): Node {
    let left = parseUnary()
    for (;;) {
      const token = peek()
      if (!token || token.kind !== 'op' || !['*', '/', '%'].includes(token.value)) break
      pos += 1
      left = { kind: 'binary', op: token.value, left, right: parseUnary() }
    }
    return left
  }

  function parseSum(): Node {
    let left = parseProduct()
    for (;;) {
      const token = peek()
      if (!token || token.kind !== 'op' || !['+', '-'].includes(token.value)) break
      pos += 1
      left = { kind: 'binary', op: token.value, left, right: parseProduct() }
    }
    return left
  }

  function parseComparison(): Node {
    let left = parseSum()
    for (;;) {
      const token = peek()
      if (!token || token.kind !== 'op' || !COMPARISONS.has(token.value)) break
      pos += 1
      left = { kind: 'binary', op: token.value, left, right: parseSum() }
    }
    return left
  }

  const node = parseComparison()
  if (pos !== tokens.length) {
    throw new ExpressionError(`Trailing input in expression "${source}"`)
  }
  return node
}

const FUNCTIONS: Record<string, (args: number[]) => number> = {
  /** The classic (score - 10) / 2, rounded down. */
  mod: ([score]) => Math.floor(((score ?? 10) - 10) / 2),
  floor: ([n]) => Math.floor(n ?? 0),
  ceil: ([n]) => Math.ceil(n ?? 0),
  round: ([n]) => Math.round(n ?? 0),
  abs: ([n]) => Math.abs(n ?? 0),
  min: (args) => (args.length ? Math.min(...args) : 0),
  max: (args) => (args.length ? Math.max(...args) : 0),
  /** if(condition, whenTrue, whenFalse) — conditions are 1 for true, 0 for false. */
  if: ([condition, whenTrue, whenFalse]) => ((condition ?? 0) !== 0 ? (whenTrue ?? 0) : (whenFalse ?? 0)),
}

const cache = new Map<string, Node>()

export function parseExpression(source: string): Node {
  const cached = cache.get(source)
  if (cached) return cached
  const node = parse(tokenize(source), source)
  cache.set(source, node)
  return node
}

function evalNode(node: Node, context: Record<string, number>, source: string): number {
  switch (node.kind) {
    case 'number':
      return node.value
    case 'ident': {
      const value = context[node.name]
      if (value === undefined) {
        // Unknown names are 0 rather than an error: a ruleset may reference a
        // stat that only some characters have, such as a subclass counter.
        return 0
      }
      return value
    }
    case 'unary':
      return -evalNode(node.operand, context, source)
    case 'call': {
      const fn = FUNCTIONS[node.name]
      if (!fn) throw new ExpressionError(`Unknown function "${node.name}" in "${source}"`)
      return fn(node.args.map((arg) => evalNode(arg, context, source)))
    }
    case 'binary': {
      const left = evalNode(node.left, context, source)
      const right = evalNode(node.right, context, source)
      switch (node.op) {
        case '+':
          return left + right
        case '-':
          return left - right
        case '*':
          return left * right
        case '/':
          return right === 0 ? 0 : left / right
        case '%':
          return right === 0 ? 0 : left % right
        case '==':
          return left === right ? 1 : 0
        case '!=':
          return left !== right ? 1 : 0
        case '<':
          return left < right ? 1 : 0
        case '<=':
          return left <= right ? 1 : 0
        case '>':
          return left > right ? 1 : 0
        case '>=':
          return left >= right ? 1 : 0
        default:
          throw new ExpressionError(`Unknown operator "${node.op}" in "${source}"`)
      }
    }
  }
}

/** Evaluate `source` against `context`. Unknown identifiers resolve to 0. */
export function evaluate(source: string, context: Record<string, number> = {}): number {
  return evalNode(parseExpression(source), context, source)
}

/** Evaluate and round toward zero — most sheet values are whole numbers. */
export function evaluateInt(source: string, context: Record<string, number> = {}): number {
  return Math.trunc(evaluate(source, context))
}
