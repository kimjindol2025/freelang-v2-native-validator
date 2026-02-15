import {
  LibraryResolver,
  LibraryLearner,
  LibraryProfile,
  LibraryUsage,
} from '../src/codegen/library-resolver';
import { HeaderProposal } from '../src/engine/auto-header';

describe('LibraryResolver', () => {
  let resolver: LibraryResolver;

  beforeEach(() => {
    resolver = new LibraryResolver();
  });

  test('resolveFromDirective: memory_efficient', () => {
    const profile = resolver.resolveFromDirective('memory_efficient');
    expect(profile.headers.has('stdlib.h')).toBe(true);
    expect(profile.headers.has('stdio.h')).toBe(false);
    expect(profile.linkerFlags.size).toBe(0);
  });

  test('resolveFromDirective: speed', () => {
    const profile = resolver.resolveFromDirective('speed');
    expect(profile.headers.has('math.h')).toBe(true);
    expect(profile.headers.has('float.h')).toBe(true);
    expect(profile.headers.has('stdlib.h')).toBe(true);
    expect(profile.linkerFlags.has('-lm')).toBe(true);
  });

  test('resolveFromDirective: safety', () => {
    const profile = resolver.resolveFromDirective('safety');
    expect(profile.headers.has('assert.h')).toBe(true);
    expect(profile.headers.has('errno.h')).toBe(true);
    expect(profile.headers.has('stdlib.h')).toBe(true);
  });

  test('resolveFromDirective: standard', () => {
    const profile = resolver.resolveFromDirective('standard');
    expect(profile.headers.has('stdio.h')).toBe(true);
    expect(profile.headers.has('stdlib.h')).toBe(true);
    expect(profile.headers.size).toBe(2);
  });

  test('resolveFromDirective: unknown defaults to standard', () => {
    const profile = resolver.resolveFromDirective('unknown_directive');
    expect(profile.headers.has('stdio.h')).toBe(true);
    expect(profile.headers.has('stdlib.h')).toBe(true);
  });

  test('resolveFromHeader: sum operation', () => {
    const header: HeaderProposal = {
      fn: 'sum',
      input: 'array<number>',
      output: 'number',
      reason: 'Array summation',
      directive: 'standard',
      complexity: 'O(n)',
      confidence: 95,
      matched_op: 'sum',
    };
    const profile = resolver.resolveFromHeader(header);
    expect(profile.headers.has('stdlib.h')).toBe(true);
  });

  test('resolveFromHeader: sqrt operation', () => {
    const header: HeaderProposal = {
      fn: 'sqrt',
      input: 'number',
      output: 'number',
      reason: 'Square root',
      directive: 'standard',
      complexity: 'O(1)',
      confidence: 95,
      matched_op: 'sqrt',
    };
    const profile = resolver.resolveFromHeader(header);
    expect(profile.headers.has('math.h')).toBe(true);
    expect(profile.linkerFlags.has('-lm')).toBe(true);
  });

  test('resolveFromHeader: math operations include math.h', () => {
    const mathOps = ['abs', 'floor', 'ceil', 'round'];
    for (const op of mathOps) {
      const header: HeaderProposal = {
        fn: op,
        input: 'number',
        output: 'number',
        reason: 'Math operation',
        directive: 'standard',
        complexity: 'O(1)',
        confidence: 95,
        matched_op: op,
      };
      const profile = resolver.resolveFromHeader(header);
      expect(profile.headers.has('math.h')).toBe(true);
      expect(profile.linkerFlags.has('-lm')).toBe(true);
    }
  });

  test('resolveFromBuiltins: extracts headers from builtins', () => {
    const profile = resolver.resolveFromBuiltins(['sum', 'average', 'max']);
    expect(profile.headers.has('stdlib.h')).toBe(true);
  });

  test('resolveFromBuiltins: sqrt adds math.h', () => {
    const profile = resolver.resolveFromBuiltins(['sqrt', 'abs']);
    expect(profile.headers.has('math.h')).toBe(true);
  });

  test('resolveFromBuiltins: mixed builtins', () => {
    const profile = resolver.resolveFromBuiltins(['sum', 'sqrt', 'floor']);
    expect(profile.headers.has('stdlib.h')).toBe(true);
    expect(profile.headers.has('math.h')).toBe(true);
  });

  test('resolveFromBuiltins: unknown builtin ignored', () => {
    const profile = resolver.resolveFromBuiltins(['unknown_func']);
    expect(profile.headers.size).toBe(0);
  });

  test('getAllProfiles returns all directives', () => {
    const profiles = resolver.getAllProfiles();
    expect(profiles).toHaveProperty('memory_efficient');
    expect(profiles).toHaveProperty('speed');
    expect(profiles).toHaveProperty('safety');
    expect(profiles).toHaveProperty('standard');
  });

  test('getAllProfiles: each profile is unique', () => {
    const profiles = resolver.getAllProfiles();
    const memory_eff = JSON.stringify(Array.from(profiles.memory_efficient.headers).sort());
    const speed = JSON.stringify(Array.from(profiles.speed.headers).sort());
    const safety = JSON.stringify(Array.from(profiles.safety.headers).sort());
    const standard = JSON.stringify(Array.from(profiles.standard.headers).sort());

    const unique = new Set([memory_eff, speed, safety, standard]);
    expect(unique.size).toBe(4);
  });
});

describe('LibraryLearner', () => {
  let learner: LibraryLearner;
  let resolver: LibraryResolver;

  beforeEach(() => {
    learner = new LibraryLearner();
    resolver = new LibraryResolver();
  });

  test('record: saves usage entry', () => {
    const profile = resolver.resolveFromDirective('standard');
    learner.record('standard', profile, ['sum', 'average']);

    const history = learner.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].directive).toBe('standard');
    expect(history[0].builtins_used).toContain('sum');
    expect(history[0].builtins_used).toContain('average');
  });

  test('record: multiple entries accumulated', () => {
    const profile1 = resolver.resolveFromDirective('memory_efficient');
    const profile2 = resolver.resolveFromDirective('speed');

    learner.record('memory_efficient', profile1, ['sum']);
    learner.record('speed', profile2, ['sqrt', 'floor']);

    const history = learner.getHistory();
    expect(history.length).toBe(2);
  });

  test('getCommonPatterns: identifies most used header combinations', () => {
    const memProfile = resolver.resolveFromDirective('memory_efficient');
    const speedProfile = resolver.resolveFromDirective('speed');

    // Record memory_efficient 3 times, speed 2 times
    learner.record('memory_efficient', memProfile, []);
    learner.record('memory_efficient', memProfile, []);
    learner.record('memory_efficient', memProfile, []);
    learner.record('speed', speedProfile, []);
    learner.record('speed', speedProfile, []);

    const patterns = learner.getCommonPatterns();
    expect(Object.keys(patterns).length).toBeGreaterThanOrEqual(1);

    // Find which pattern has count of 3
    const pattern_3 = Object.values(patterns).find(v => v === 3);
    expect(pattern_3).toBe(3);
  });

  test('getHistory: returns copy of history', () => {
    const profile = resolver.resolveFromDirective('standard');
    learner.record('standard', profile, ['sum']);

    const history1 = learner.getHistory();
    const history2 = learner.getHistory();

    expect(history1).toEqual(history2);
    expect(history1).not.toBe(history2); // Different object references
  });

  test('record: includes timestamp', () => {
    const profile = resolver.resolveFromDirective('standard');
    const beforeTime = Date.now();
    learner.record('standard', profile, []);
    const afterTime = Date.now();

    const history = learner.getHistory();
    expect(history[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(history[0].timestamp).toBeLessThanOrEqual(afterTime);
  });
});

describe('LibraryResolver integration', () => {
  test('profile headers are Set type', () => {
    const resolver = new LibraryResolver();
    const profile = resolver.resolveFromDirective('speed');
    expect(profile.headers).toBeInstanceOf(Set);
    expect(profile.linkerFlags).toBeInstanceOf(Set);
  });

  test('profile can be serialized', () => {
    const resolver = new LibraryResolver();
    const profile = resolver.resolveFromDirective('speed');
    const headers = Array.from(profile.headers);
    const flags = Array.from(profile.linkerFlags);

    expect(Array.isArray(headers)).toBe(true);
    expect(Array.isArray(flags)).toBe(true);
  });

  test('speed directive includes all necessary compilation flags', () => {
    const resolver = new LibraryResolver();
    const profile = resolver.resolveFromDirective('speed');
    const headerArray = Array.from(profile.headers);
    const flagArray = Array.from(profile.linkerFlags);

    // Compile check: -lm is linker flag for math library
    expect(flagArray).toContain('-lm');
    expect(headerArray).toContain('math.h');
  });

  test('safety directive prioritizes error checking', () => {
    const resolver = new LibraryResolver();
    const profile = resolver.resolveFromDirective('safety');
    const headerArray = Array.from(profile.headers);

    expect(headerArray).toContain('assert.h');
    expect(headerArray).toContain('errno.h');
  });
});
