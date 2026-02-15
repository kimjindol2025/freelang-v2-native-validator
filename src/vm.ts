// FreeLang v2 VM - Stack-based IR interpreter
// No strings for humans. Pure numeric execution.

import { Op, Inst, VMResult, VMError } from './types';

const MAX_CYCLES = 100_000;
const MAX_STACK  = 10_000;

export class VM {
  private stack: number[] = [];
  private vars: Map<string, number | number[]> = new Map();
  private pc = 0;
  private cycles = 0;

  run(program: Inst[]): VMResult {
    this.stack = [];
    this.vars = new Map();
    this.pc = 0;
    this.cycles = 0;
    const t0 = performance.now();

    try {
      while (this.pc < program.length) {
        if (this.cycles++ > MAX_CYCLES) {
          return this.fail(program[this.pc]?.op ?? Op.HALT, 1, 'cycle_limit');
        }
        const inst = program[this.pc];
        this.exec(inst, program);
        if (inst.op === Op.HALT) break;
      }

      const value = this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined;
      return { ok: true, value, cycles: this.cycles, ms: performance.now() - t0 };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return this.fail(program[this.pc]?.op ?? Op.HALT, 99, msg, performance.now() - t0);
    }
  }

  private exec(inst: Inst, program: Inst[]): void {
    const { op, arg } = inst;

    switch (op) {
      // ── Stack ──
      case Op.PUSH:
        this.guardStack();
        this.stack.push(arg as number);
        this.pc++;
        break;

      case Op.POP:
        this.need(1);
        this.stack.pop();
        this.pc++;
        break;

      case Op.DUP:
        this.need(1);
        this.guardStack();
        this.stack.push(this.stack[this.stack.length - 1]);
        this.pc++;
        break;

      // ── Arithmetic ──
      case Op.ADD: this.binop((a, b) => a + b); break;
      case Op.SUB: this.binop((a, b) => a - b); break;
      case Op.MUL: this.binop((a, b) => a * b); break;
      case Op.DIV:
        this.need(2);
        if (this.stack[this.stack.length - 1] === 0) {
          throw new Error('div_zero');
        }
        this.binop((a, b) => a / b);
        break;
      case Op.MOD: this.binop((a, b) => a % b); break;
      case Op.NEG:
        this.need(1);
        this.stack[this.stack.length - 1] = -this.stack[this.stack.length - 1];
        this.pc++;
        break;

      // ── Comparison ──
      case Op.EQ:  this.binop((a, b) => a === b ? 1 : 0); break;
      case Op.NEQ: this.binop((a, b) => a !== b ? 1 : 0); break;
      case Op.LT:  this.binop((a, b) => a < b ? 1 : 0); break;
      case Op.GT:  this.binop((a, b) => a > b ? 1 : 0); break;
      case Op.LTE: this.binop((a, b) => a <= b ? 1 : 0); break;
      case Op.GTE: this.binop((a, b) => a >= b ? 1 : 0); break;

      // ── Logic ──
      case Op.AND: this.binop((a, b) => (a && b) ? 1 : 0); break;
      case Op.OR:  this.binop((a, b) => (a || b) ? 1 : 0); break;
      case Op.NOT:
        this.need(1);
        this.stack[this.stack.length - 1] = this.stack[this.stack.length - 1] ? 0 : 1;
        this.pc++;
        break;

      // ── Variables ──
      case Op.STORE:
        this.need(1);
        this.vars.set(arg as string, this.stack.pop()!);
        this.pc++;
        break;

      case Op.LOAD: {
        const v = this.vars.get(arg as string);
        if (v === undefined) throw new Error('undef_var:' + arg);
        if (typeof v === 'number') {
          this.guardStack();
          this.stack.push(v);
        }
        this.pc++;
        break;
      }

      // ── Control ──
      case Op.JMP:
        this.pc = arg as number;
        break;

      case Op.JMP_IF:
        this.need(1);
        this.pc = this.stack.pop()! ? (arg as number) : this.pc + 1;
        break;

      case Op.JMP_NOT:
        this.need(1);
        this.pc = this.stack.pop()! ? this.pc + 1 : (arg as number);
        break;

      case Op.RET:
      case Op.HALT:
        this.pc = program.length; // exit
        break;

      // ── Array ──
      case Op.ARR_NEW:
        this.vars.set(arg as string, []);
        this.pc++;
        break;

      case Op.ARR_PUSH: {
        this.need(1);
        const arr = this.vars.get(arg as string);
        if (!Array.isArray(arr)) throw new Error('not_array:' + arg);
        arr.push(this.stack.pop()!);
        this.pc++;
        break;
      }

      case Op.ARR_GET: {
        this.need(1);
        const arr = this.vars.get(arg as string);
        if (!Array.isArray(arr)) throw new Error('not_array:' + arg);
        const idx = this.stack.pop()!;
        if (idx < 0 || idx >= arr.length) throw new Error('oob:' + idx);
        this.guardStack();
        this.stack.push(arr[idx]);
        this.pc++;
        break;
      }

      case Op.ARR_SET: {
        this.need(2);
        const arr = this.vars.get(arg as string);
        if (!Array.isArray(arr)) throw new Error('not_array:' + arg);
        const val = this.stack.pop()!;
        const idx = this.stack.pop()!;
        if (idx < 0 || idx >= arr.length) throw new Error('oob:' + idx);
        arr[idx] = val;
        this.pc++;
        break;
      }

      case Op.ARR_LEN: {
        const arr = this.vars.get(arg as string);
        if (!Array.isArray(arr)) throw new Error('not_array:' + arg);
        this.guardStack();
        this.stack.push(arr.length);
        this.pc++;
        break;
      }

      // ── Array Aggregate (AI shorthand) ──
      case Op.ARR_SUM: {
        const arr = this.getArr(arg as string);
        this.guardStack();
        this.stack.push(arr.reduce((s, x) => s + x, 0));
        this.pc++;
        break;
      }

      case Op.ARR_AVG: {
        const arr = this.getArr(arg as string);
        if (arr.length === 0) throw new Error('empty_arr_avg');
        this.guardStack();
        this.stack.push(arr.reduce((s, x) => s + x, 0) / arr.length);
        this.pc++;
        break;
      }

      case Op.ARR_MAX: {
        const arr = this.getArr(arg as string);
        if (arr.length === 0) throw new Error('empty_arr_max');
        this.guardStack();
        this.stack.push(Math.max(...arr));
        this.pc++;
        break;
      }

      case Op.ARR_MIN: {
        const arr = this.getArr(arg as string);
        if (arr.length === 0) throw new Error('empty_arr_min');
        this.guardStack();
        this.stack.push(Math.min(...arr));
        this.pc++;
        break;
      }

      case Op.ARR_SORT: {
        const arr = this.getArr(arg as string);
        arr.sort((a, b) => a - b);
        this.pc++;
        break;
      }

      case Op.ARR_REV: {
        const arr = this.getArr(arg as string);
        arr.reverse();
        this.pc++;
        break;
      }

      case Op.ARR_MAP:
      case Op.ARR_FILTER:
        // These require sub-program execution - simplified version
        this.pc++;
        break;

      // ── Debug ──
      case Op.DUMP:
        // AI reads this programmatically, no console.log
        this.pc++;
        break;

      default:
        throw new Error('unknown_op:' + op);
    }
  }

  private binop(fn: (a: number, b: number) => number): void {
    this.need(2);
    const b = this.stack.pop()!;
    const a = this.stack.pop()!;
    this.guardStack();
    this.stack.push(fn(a, b));
    this.pc++;
  }

  private need(n: number): void {
    if (this.stack.length < n) {
      throw new Error('stack_underflow:need=' + n + ',have=' + this.stack.length);
    }
  }

  private guardStack(): void {
    if (this.stack.length >= MAX_STACK) {
      throw new Error('stack_overflow');
    }
  }

  private getArr(name: string): number[] {
    const arr = this.vars.get(name);
    if (!Array.isArray(arr)) throw new Error('not_array:' + name);
    return arr;
  }

  private fail(op: Op, code: number, detail: string, ms?: number): VMResult {
    return {
      ok: false,
      cycles: this.cycles,
      ms: ms ?? 0,
      error: {
        code,
        op,
        pc: this.pc,
        stack_depth: this.stack.length,
        detail,
      },
    };
  }

  // ── State inspection (for AI) ──
  getStack(): readonly number[] { return this.stack; }
  getVar(name: string): number | number[] | undefined { return this.vars.get(name); }
  getVarNames(): string[] { return [...this.vars.keys()]; }
}
