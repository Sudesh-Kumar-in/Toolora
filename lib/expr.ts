/**
 * Safe arithmetic expression evaluator for the scientific calculator.
 * Uses a recursive-descent parser: no eval, no Function constructor.
 */

export type AngleMode = "deg" | "rad";

export class ExprError extends Error {}

type Token =
  | { type: "num"; value: number }
  | { type: "id"; value: string }
  | { type: "op"; value: string };

const FUNCTIONS = new Set(["sin", "cos", "tan", "asin", "acos", "atan", "ln", "log", "sqrt", "abs"]);
const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)/.exec(input.slice(i));
      if (!m) throw new ExprError(`Unexpected "${c}".`);
      tokens.push({ type: "num", value: Number(m[1]) });
      i += m[1].length;
    } else if (/[a-zA-Z]/.test(c)) {
      const m = /^[a-zA-Z]+/.exec(input.slice(i))!;
      tokens.push({ type: "id", value: m[0].toLowerCase() });
      i += m[0].length;
    } else if ("+-*/^()!".includes(c)) {
      tokens.push({ type: "op", value: c });
      i++;
    } else {
      throw new ExprError(`"${c}" is not understood. Use numbers, + − × ÷ ^ ( ) and the listed functions.`);
    }
  }
  return tokens;
}

export function evaluate(input: string, angle: AngleMode = "deg"): number {
  const source = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, "pi");
  if (source.trim() === "") throw new ExprError("Enter an expression to calculate.");

  const tokens = tokenize(source);
  let pos = 0;

  const peek = () => tokens[pos];
  const isOp = (v: string) => peek()?.type === "op" && peek().value === v;
  const expect = (v: string) => {
    if (!isOp(v)) throw new ExprError(`Expected "${v}".`);
    pos++;
  };

  const toRad = (x: number) => (angle === "deg" ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (angle === "deg" ? (x * 180) / Math.PI : x);

  function parseExpr(): number {
    let value = parseTerm();
    while (isOp("+") || isOp("-")) {
      const op = tokens[pos++].value;
      const rhs = parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseUnary();
    while (isOp("*") || isOp("/")) {
      const op = tokens[pos++].value;
      const rhs = parseUnary();
      if (op === "/") {
        if (rhs === 0) throw new ExprError("Cannot divide by zero.");
        value = value / rhs;
      } else {
        value = value * rhs;
      }
    }
    return value;
  }

  function parseUnary(): number {
    if (isOp("-")) {
      pos++;
      return -parseUnary();
    }
    if (isOp("+")) {
      pos++;
      return parseUnary();
    }
    return parsePower();
  }

  function parsePower(): number {
    const base = parsePostfix();
    if (isOp("^")) {
      pos++;
      // Right-associative, and the exponent may carry a unary sign.
      return Math.pow(base, parseUnary());
    }
    return base;
  }

  function parsePostfix(): number {
    let value = parsePrimary();
    while (isOp("!")) {
      pos++;
      if (!Number.isInteger(value) || value < 0 || value > 170)
        throw new ExprError("Factorial works on whole numbers from 0 to 170.");
      let f = 1;
      for (let k = 2; k <= value; k++) f *= k;
      value = f;
    }
    return value;
  }

  function parsePrimary(): number {
    const t = peek();
    if (!t) throw new ExprError("The expression ends too early.");

    if (t.type === "num") {
      pos++;
      return t.value;
    }
    if (t.type === "id") {
      pos++;
      if (t.value in CONSTANTS) return CONSTANTS[t.value];
      if (!FUNCTIONS.has(t.value)) throw new ExprError(`Unknown name "${t.value}".`);
      expect("(");
      const arg = parseExpr();
      expect(")");
      return applyFunction(t.value, arg);
    }
    if (isOp("(")) {
      pos++;
      const v = parseExpr();
      expect(")");
      return v;
    }
    throw new ExprError(`Unexpected "${t.value}".`);
  }

  function applyFunction(name: string, x: number): number {
    switch (name) {
      case "sin": return Math.sin(toRad(x));
      case "cos": return Math.cos(toRad(x));
      case "tan": return Math.tan(toRad(x));
      case "asin":
        if (x < -1 || x > 1) throw new ExprError("asin needs a value between −1 and 1.");
        return fromRad(Math.asin(x));
      case "acos":
        if (x < -1 || x > 1) throw new ExprError("acos needs a value between −1 and 1.");
        return fromRad(Math.acos(x));
      case "atan": return fromRad(Math.atan(x));
      case "ln":
        if (x <= 0) throw new ExprError("ln needs a positive number.");
        return Math.log(x);
      case "log":
        if (x <= 0) throw new ExprError("log needs a positive number.");
        return Math.log10(x);
      case "sqrt":
        if (x < 0) throw new ExprError("The square root of a negative number is not a real number.");
        return Math.sqrt(x);
      case "abs": return Math.abs(x);
      default: throw new ExprError(`Unknown function ${name}.`);
    }
  }

  const result = parseExpr();
  if (pos < tokens.length) throw new ExprError(`Unexpected "${tokens[pos].value}" near the end.`);
  if (!Number.isFinite(result)) throw new ExprError("The result is too large or undefined.");
  return result;
}
