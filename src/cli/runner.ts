/**
 * FreeLang CLI Runner
 * Reads program file, compiles to IR, executes on VM
 */

import * as fs from 'fs';
import * as path from 'path';
import { IRGenerator } from '../codegen/ir-generator';
import { VM } from '../vm';
import { Inst, VMResult } from '../types';

export interface RunResult {
  success: boolean;
  output?: unknown;
  error?: string;
  exitCode: number;
  executionTime: number;
}

/**
 * Simple parser to convert string to AST
 * For now, returns mock AST based on patterns
 */
function parseProgram(source: string): Record<string, any> {
  // For Day 6, we implement basic parsing for simple expressions
  // Real parser would be in parser module

  // Trim and check basic patterns
  const trimmed = source.trim();

  // Pattern 1: Simple number
  if (/^\d+$/.test(trimmed)) {
    return {
      type: 'NumberLiteral',
      value: parseInt(trimmed, 10)
    };
  }

  // Pattern 2: String literal
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return {
      type: 'StringLiteral',
      value: trimmed.slice(1, -1)
    };
  }

  // Pattern 3: Simple addition (e.g., "5 + 3")
  const addMatch = trimmed.match(/^(\d+)\s*\+\s*(\d+)$/);
  if (addMatch) {
    return {
      type: 'BinaryOp',
      operator: '+',
      left: { type: 'NumberLiteral', value: parseInt(addMatch[1], 10) },
      right: { type: 'NumberLiteral', value: parseInt(addMatch[2], 10) }
    };
  }

  // Pattern 4: String concatenation
  const strConcatMatch = trimmed.match(/^"([^"]*)"\s*\+\s*"([^"]*)"$/);
  if (strConcatMatch) {
    return {
      type: 'BinaryOp',
      operator: '+',
      left: { type: 'StringLiteral', value: strConcatMatch[1] },
      right: { type: 'StringLiteral', value: strConcatMatch[2] }
    };
  }

  // Default: treat as variable identifier or error
  if (/^[a-zA-Z_]\w*$/.test(trimmed)) {
    return {
      type: 'Identifier',
      name: trimmed
    };
  }

  throw new Error(`Unable to parse program: ${trimmed}`);
}

/**
 * Compile and run a FreeLang program
 */
export class ProgramRunner {
  private gen: IRGenerator;
  private vm: VM;

  constructor() {
    this.gen = new IRGenerator();
    this.vm = new VM();
  }

  /**
   * Run program from string
   */
  runString(source: string): RunResult {
    const startTime = Date.now();

    try {
      // 1. Parse source to AST
      const ast = parseProgram(source) as any;

      // 2. Generate IR
      const ir = this.gen.generateIR(ast);

      // 3. Execute on VM
      const result = this.vm.run(ir);

      const executionTime = Date.now() - startTime;

      return {
        success: result.ok,
        output: result.value,
        error: result.error ? `VM Error: ${result.error.detail}` : undefined,
        exitCode: result.ok ? 0 : 1,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: `Compilation Error: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: 2,
        executionTime
      };
    }
  }

  /**
   * Run program from file
   */
  runFile(filePath: string): RunResult {
    const startTime = Date.now();

    try {
      // 1. Check file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
          exitCode: 3,
          executionTime: Date.now() - startTime
        };
      }

      // 2. Read file
      const source = fs.readFileSync(filePath, 'utf-8');

      // 3. Run program
      return this.runString(source);
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: `File Error: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: 3,
        executionTime
      };
    }
  }

  /**
   * Get IR for a program (for debugging)
   */
  getIR(source: string): Inst[] {
    const ast = parseProgram(source) as any;
    return this.gen.generateIR(ast);
  }
}
