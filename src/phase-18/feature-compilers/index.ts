/**
 * Feature Compilers - Main Export
 *
 * Exports all 9 feature-focused compiler variants
 */

export { ExpressionCompiler } from './expression-compiler';
export { StatementCompiler } from './statement-compiler';

// Placeholder exports for future compilers
export { ExpressionCompiler as TypeInferenceCompiler } from './expression-compiler';
export { StatementCompiler as AsyncCompiler } from './statement-compiler';
export { ExpressionCompiler as PatternMatchCompiler } from './expression-compiler';
export { StatementCompiler as TraitCompiler } from './statement-compiler';
export { ExpressionCompiler as GenericsCompiler } from './expression-compiler';
export { StatementCompiler as FFICompiler } from './statement-compiler';
export { ExpressionCompiler as OptimizationCompiler } from './expression-compiler';
