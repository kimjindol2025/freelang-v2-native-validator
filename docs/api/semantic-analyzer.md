# Semantic Analyzer API

## Overview

The Semantic Analyzer module performs semantic analysis on the AST produced by the parser. It extracts meaning from the code structure, tracking variable lifecycles, inferring types, collecting type constraints, and generating function signatures.

**Version**: v2.0.0
**Module**: `src/analyzer`
**Phase**: Phase 3 Stage 1 (AST-based semantic analysis)
**Goal**: Improve type inference accuracy from 15% (keyword matching) to 75%+ (AST meaning analysis)

---

## Core Concepts

### Variable Lifecycle

The analyzer tracks each variable from declaration through assignment and usage:

```
let x = 5;        ← Assignment: x inferred as number
x = x + 1;        ← Usage: x in arithmetic context
if (x > 10) {}    ← Usage: x in comparison context
```

### Type Inference

Types are inferred from:
1. **Explicit annotations**: `x: number`
2. **Assignments**: `x = 5` → infer `number`
3. **Method calls**: `arr.push(x)` → infer array element type
4. **Operations**: `x + 1` → infer numeric type
5. **Context**: Loop variable in `for x in arr` → infer array element type

### Type Constraints

Constraints are collected from type-dependent operations:
- Arithmetic operations require numeric types
- Array operations require array types
- Boolean operations require bool types

---

## Main Classes

### SemanticAnalyzer

The core semantic analysis engine.

#### Constructor

```typescript
constructor()
```

#### Methods

##### `analyzeVariableLifecycle(code: string): Map<string, VariableInfo>`

Analyzes each variable's complete lifecycle from declaration to final use.

**Parameters**:
- `code` (string): Source code to analyze

**Returns**: `Map<string, VariableInfo>` - Variable name → information

**Tracking**:
- All assignments to the variable
- All usages (arithmetic, method calls, member access, etc.)
- Inferred type at each point
- Confidence score (0.0 - 1.0)

**Example**:
```typescript
const analyzer = new SemanticAnalyzer();
const code = `
let arr = [1, 2, 3];
let sum = 0;
for i in arr {
  sum = sum + i;
}
`;

const variables = analyzer.analyzeVariableLifecycle(code);

// arr: VariableInfo
// {
//   name: 'arr',
//   inferredType: 'array<number>',
//   confidence: 0.95,
//   assignments: [{ line: 2, value: '[1, 2, 3]' }],
//   usages: [{ line: 5, context: 'iteration' }],
//   source: 'assignment',
//   reasoning: ['Initialized with array literal [1, 2, 3]']
// }

// sum: VariableInfo
// {
//   name: 'sum',
//   inferredType: 'number',
//   confidence: 0.95,
//   assignments: [
//     { line: 3, value: '0' },
//     { line: 6, value: 'sum + i' }
//   ],
//   usages: [
//     { line: 6, context: 'arithmetic' },
//     { line: 6, context: 'argument' }
//   ],
//   source: 'assignment',
//   reasoning: [
//     'Initialized with numeric literal 0',
//     'Used in arithmetic operation (sum + i)'
//   ]
// }
```

---

##### `collectTypeConstraints(code: string): TypeConstraint[]`

Collects type constraints from operations and context.

**Parameters**:
- `code` (string): Source code to analyze

**Returns**: `TypeConstraint[]` - List of type constraints

**Constraint Types**:
- `'numeric'`: Variables used in arithmetic operations
- `'array'`: Variables used with array methods
- `'object'`: Variables used with member access
- `'string'`: Variables used with string operations
- `'bool'`: Variables used in conditionals

**Example**:
```typescript
const code = `
let x = 5;
let arr = [x];
if (x > 0) {}
arr.push(x);
`;

const constraints = analyzer.collectTypeConstraints(code);
// Result:
// [
//   { vars: ['x'], constraint: 'numeric', confidence: 0.95, source: 'literal 5' },
//   { vars: ['arr'], constraint: 'array', confidence: 0.9, source: '[x]' },
//   { vars: ['x'], constraint: 'numeric', confidence: 1.0, source: 'comparison x > 0' },
//   { vars: ['x'], constraint: 'numeric', confidence: 0.95, source: 'array.push()' }
// ]
```

---

##### `inferFunctionSignature(code: string): FunctionSignature`

Infers the function signature from implementation code.

**Parameters**:
- `code` (string): Function body source code

**Returns**: `FunctionSignature` - Inferred input/output types and signature

**Infers**:
- Input parameter types
- Output/return type
- Local variable types
- Overall confidence score
- Reasoning for each inference

**Example**:
```typescript
const code = `
fn sum(arr) {
  let total = 0;
  for i in arr {
    total = total + i;
  }
  return total;
}
`;

const signature = analyzer.inferFunctionSignature(code);
// Result:
// {
//   name: 'sum',
//   inputs: Map {
//     'arr' → VariableInfo {
//       inferredType: 'array<number>',
//       confidence: 0.95,
//       reasoning: ['Used in for-in loop', 'Elements added to numeric sum']
//     }
//   },
//   outputs: VariableInfo {
//     inferredType: 'number',
//     confidence: 0.95,
//     reasoning: ['Returned value', 'Result of numeric accumulation']
//   },
//   variables: Map { /* local vars */ },
//   confidence: 0.95,
//   reasoning: [
//     'Parameter arr inferred from loop usage',
//     'Return type inferred from arithmetic operations'
//   ]
// }
```

---

##### `getAnalysisReport(): string`

Generates a human-readable analysis report.

**Returns**: `string` - Formatted analysis report

**Includes**:
- All inferred variables
- Confidence scores
- Reasoning for each inference
- Type constraints found
- Summary statistics

**Example**:
```typescript
const report = analyzer.getAnalysisReport();
console.log(report);
// Output:
// ═══════════════════════════════════════════════════════════════
// SEMANTIC ANALYSIS REPORT
// ═══════════════════════════════════════════════════════════════
//
// Variables Analyzed: 5
// Average Confidence: 0.92
//
// Variable: arr
//   Type: array<number>
//   Confidence: 0.95
//   Source: assignment
//   Reasoning:
//   - Initialized with array literal [1, 2, 3]
//   - Used in for-in loop
//
// Variable: sum
//   Type: number
//   Confidence: 0.95
//   ...
```

---

## Interfaces

### VariableInfo

Information about a single variable.

```typescript
interface VariableInfo {
  name: string;                      // Variable name
  inferredType: string;              // Inferred type (e.g., 'number', 'array<T>')
  confidence: number;                // Confidence 0.0-1.0
  assignments: Assignment[];         // All assignments to this variable
  usages: Usage[];                   // All usages of this variable
  source: 'explicit' | 'assignment' | 'method' | 'operation' | 'context';
  reasoning: string[];               // Explanation of inference
}
```

**Example**:
```typescript
const varInfo: VariableInfo = {
  name: 'count',
  inferredType: 'number',
  confidence: 0.95,
  assignments: [
    { line: 1, value: '0', inferredType: 'number', confidence: 1.0 },
    { line: 5, value: 'count + 1', inferredType: 'number', confidence: 0.95 }
  ],
  usages: [
    { line: 5, context: 'arithmetic', inferredType: 'number' },
    { line: 6, context: 'comparison', inferredType: 'number' }
  ],
  source: 'assignment',
  reasoning: [
    'Initialized with numeric literal 0',
    'Used in arithmetic operation count + 1'
  ]
};
```

---

### Assignment

Record of a variable assignment.

```typescript
interface Assignment {
  line: number;                      // Line where assignment occurs
  value?: Expression;                // Assigned value (AST node)
  inferredType?: string;             // Inferred type of value
  confidence: number;                // Confidence in inference
}
```

---

### Usage

Record of a variable usage.

```typescript
interface Usage {
  line: number;                      // Line where usage occurs
  context: 'arithmetic' | 'method' | 'member' | 'argument' | 'iteration';
  relatedVars?: string[];            // Other variables in this expression
  inferredType?: string;             // Inferred type at this usage
}
```

---

### FunctionSignature

Inferred function signature.

```typescript
interface FunctionSignature {
  name: string;                      // Function name
  inputs: Map<string, VariableInfo>; // Parameter types
  outputs: VariableInfo;             // Return type
  variables: Map<string, VariableInfo>; // Local variable types
  confidence: number;                // Overall signature confidence
  reasoning: string[];               // Why these types were inferred
}
```

---

### TypeConstraint

A type constraint from code analysis.

```typescript
interface TypeConstraint {
  vars: string[];                    // Variables involved
  constraint: 'numeric' | 'array' | 'object' | 'string' | 'bool';
  confidence: number;                // Confidence in constraint
  source: string;                    // Where constraint came from
}
```

---

## Usage Examples

### Complete Analysis Pipeline

```typescript
import { SemanticAnalyzer } from './semantic-analyzer';

const code = `
fn filterNumbers(arr) {
  let result = [];
  for i in arr {
    if (i > 0) {
      result.push(i);
    }
  }
  return result;
}
`;

const analyzer = new SemanticAnalyzer();

// Step 1: Analyze variables
const variables = analyzer.analyzeVariableLifecycle(code);
console.log('Variables:', Array.from(variables.keys()));
// Output: Variables: [ 'arr', 'result', 'i' ]

// Step 2: Collect type constraints
const constraints = analyzer.collectTypeConstraints(code);
console.log('Constraints:', constraints.length);
// Output: Constraints: 4

// Step 3: Infer function signature
const signature = analyzer.inferFunctionSignature(code);
console.log('Function:', signature.name);
console.log('Parameters:', Array.from(signature.inputs.keys()));
console.log('Return type:', signature.outputs.inferredType);
console.log('Confidence:', signature.confidence);

// Step 4: Generate report
const report = analyzer.getAnalysisReport();
console.log(report);
```

---

### Type Inference for Function Parameters

```typescript
const analyzer = new SemanticAnalyzer();

// Function that uses arr as array
const code = `
for i in arr {
  arr.push(i * 2);
}
`;

const variables = analyzer.analyzeVariableLifecycle(code);
const arrInfo = variables.get('arr');

console.log(`Parameter 'arr' should be: ${arrInfo?.inferredType}`);
// Output: Parameter 'arr' should be: array<number>

console.log(`Confidence: ${arrInfo?.confidence * 100}%`);
// Output: Confidence: 95%

console.log(`Why:`, arrInfo?.reasoning);
// Output: Why: [
//   'Used in for-in loop (iterable)',
//   'Array method .push() called',
//   'Elements are numbers (used in i * 2)'
// ]
```

---

### Constraint-Based Type Resolution

```typescript
const analyzer = new SemanticAnalyzer();

const code = `
let x = arr[0];
let y = x + 10;
let z = arr;
`;

const constraints = analyzer.collectTypeConstraints(code);

// Find all numeric constraints
const numericConstraints = constraints.filter(c => c.constraint === 'numeric');
console.log('Numeric variables:', numericConstraints.map(c => c.vars).flat());
// Output: Numeric variables: ['x', 'y']

// Find array constraints
const arrayConstraints = constraints.filter(c => c.constraint === 'array');
console.log('Array variables:', arrayConstraints.map(c => c.vars).flat());
// Output: Array variables: ['arr', 'z']
```

---

## Confidence Scoring

The analyzer assigns confidence scores (0.0 - 1.0) based on inference certainty:

| Score | Certainty | Example |
|-------|-----------|---------|
| 1.0 | Certain | `x = 5` → `x: number` |
| 0.95 | Very Likely | `for i in arr` → `arr: array` |
| 0.90 | Likely | `x = arr[0]` → `x: ?` (depends on arr) |
| 0.75 | Probable | `y = unknown_func()` → unclear return |
| <0.5 | Uncertain | Unresolved or ambiguous |

---

## Inference Sources

| Source | Priority | Example |
|--------|----------|---------|
| Explicit | 1.0 | `x: number = 5` |
| Assignment | 0.95 | `x = 5` → infer `number` |
| Method | 0.90 | `arr.push(x)` → element type |
| Operation | 0.90 | `x + 1` → infer numeric |
| Context | 0.85 | Loop variable type |

---

## Integration with Type System

The semantic analyzer works with the type system:

```
Semantic Analysis               Type System
─────────────────────          ───────────
1. Infer variable types   →    2. Validate types
3. Collect constraints    →    4. Resolve generics
5. Generate signature     →    6. Check calls
```

---

## Performance Considerations

- **Linear complexity**: O(n) where n = code length
- **Single pass**: Only scans code once
- **No external I/O**: Standalone analysis
- **Memory efficient**: ~1KB per variable tracked

---

## Best Practices

1. **Analyze after parsing**: Always run on valid AST
2. **Check confidence scores**: Scores < 0.8 may be uncertain
3. **Use constraints for validation**: Verify inferred types are consistent
4. **Review reasoning**: Check reasoning strings for correctness
5. **Cache results**: Reuse analyzer instance for multiple analyses

---

## Related Documentation

- [Lexer API](./lexer.md) - Token generation
- [Parser API](./parser.md) - AST generation
- [Type System](./type-system.md) - Type validation and checking
- [Compiler Pipeline](../COMPILER-PIPELINE.md) - Full compilation flow

---

**Last Updated**: 2026-02-18
**Status**: Production Ready (Phase 3 Stage 1)
**Test Coverage**: 1,942+ tests passing ✅
