# FreeLang v2 - 기술 아키텍처

## 1. 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI Entry Point                          │
│                  (index.ts / main.ts)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌──────────┐    ┌──────────┐
    │  Lexer  │───▶│  Parser  │───▶│  Minimal │
    │ (v1)    │    │ (v1+new) │    │ (new)    │
    └─────────┘    └──────────┘    └──────────┘
                                        │
                                        ▼
                                   ┌──────────────┐
                                   │  Detector    │
                                   │ (함수명+타입 │
                                   │  +의도 추출) │
                                   └──────────────┘
                                        │
                                        ▼
                                   ┌──────────────┐
                                   │  Generator   │
                                   │ (규칙 기반   │
                                   │  코드 생성)  │
                                   └──────────────┘
                                        │
                                        ▼
                                   ┌──────────────┐
                                   │  CEmitter    │
                                   │ (v1+extend)  │
                                   │ (C 코드 출력)│
                                   └──────────────┘
                                        │
                                        ▼
                                   ┌──────────────┐
                                   │ C 파일 생성  │
                                   └──────────────┘
```

---

## 2. 모듈별 상세

### 2.1 Lexer (v1 핵심 재사용)

**파일**: `src/lexer/lexer.ts`, `src/lexer/token.ts`
**크기**: ~710 LOC
**역할**: 문자 → 토큰

**핵심 클래스**:
```typescript
class Lexer {
  readChar()           // 한 글자씩 읽기
  peekChar()           // 미리 보기
  readIdentifier()     // 식별자 추출
  skipWhitespace()     // 공백 건너뛰기
  scanToken()          // 토큰 인식
}

enum TokenType {
  // @minimal 관련
  AT_MINIMAL,
  FN, INPUT, OUTPUT, INTENT,
  COLON, COMMA, LPAREN, RPAREN,
  LBRACE, RBRACE,
  IDENT, STRING, NUMBER,
  // ... 등
}
```

**v2 수정사항**:
- `@minimal` 데코레이터 인식 추가
- 나머지는 v1 그대로

---

### 2.2 Parser (v1 + @minimal 인식)

**파일**: `src/parser/parser.ts`, `src/parser/ast.ts`
**크기**: ~3,254 LOC → ~2,500 LOC (축약)
**역할**: 토큰 → AST

**v1 재사용 (핵심)**:
```typescript
class Parser {
  private tokenBuffer: TokenBuffer  // lookahead (매우 효율적!)

  advance()            // 다음 토큰
  check()              // 토큰 타입 검사
  match()              // 토큰 매칭
  expectIdentifier()   // 식별자 기대
}
```

**v2 추가**:
```typescript
parseMinimalDeclaration() {
  // @minimal fn 이름
  //   input: 타입 [, 타입]*
  //   output: 타입
  //   intent: "의도"
  // 파싱

  return MinimalFunctionAST {
    name: string
    inputs: Parameter[]
    output: Type
    intent: string
  }
}
```

**AST 노드** (최소화):
```typescript
// v2는 @minimal만 지원하므로 매우 간단
interface MinimalFunctionAST {
  type: 'MinimalFunction'
  name: string
  parameters: {
    name: string
    type: string
  }[]
  returnType: string
  intent: string
  line: number
  column: number
}
```

---

### 2.3 Type Checker (단순화)

**파일**: `src/typechecker/typechecker.ts`
**크기**: ~300 LOC (v1: 88,000 LOC!)
**역할**: 기본 타입 검증

**지원 타입만**:
```typescript
type BasicType = 'int' | 'number' | 'boolean' | 'string' | 'void'
type ArrayType = `array<${BasicType}>`

// 검증 규칙:
// - input 타입과 실제 매개변수 일치
// - output 타입과 반환값 일치
// - array<T>는 T를 포함할 것
```

---

### 2.4 Minimal 의도 추론 (신규)

#### 2.4.1 Detector

**파일**: `src/minimal/detector.ts`
**역할**: 함수명/타입/의도 → 코드 생성 규칙 결정

```typescript
class MinimalDetector {
  detect(fn: MinimalFunctionAST): GenerationRule {
    const name = fn.name.toLowerCase()
    const intent = fn.intent.toLowerCase()
    const hasArray = fn.parameters.some(p => p.type.includes('array'))

    // 규칙 매칭
    if (name === 'sum' || intent.includes('sum') || intent.includes('더하기')) {
      return new SumRule(fn)
    }
    if (name === 'average' || intent.includes('average')) {
      return new AverageRule(fn)
    }
    if (name === 'max' || intent.includes('최대')) {
      return new MaxRule(fn)
    }
    // ... 등

    throw new Error(`Unknown pattern: ${name}`)
  }
}
```

#### 2.4.2 Generator

**파일**: `src/minimal/generator.ts`
**역할**: 규칙 → C 코드 생성

```typescript
abstract class GenerationRule {
  abstract generateBody(): string[]
  abstract generateValidation(): string[]
  abstract generateInitialization(): string[]
}

class SumRule extends GenerationRule {
  generateInitialization() {
    return [
      'double result = 0;'  // 타입별 초기화
    ]
  }

  generateValidation() {
    return [
      'if (len == 0) {',
      '  printf("Warning: empty array\\n");',
      '  return 0;',
      '}'
    ]
  }

  generateBody() {
    return [
      'for (int i = 0; i < len; i++) {',
      '  result += arr[i];',
      '}'
    ]
  }
}
```

#### 2.4.3 Patterns

**파일**: `src/minimal/patterns.ts`
**역할**: 패턴 라이브러리

```typescript
const PATTERNS = {
  sum: {
    pattern: /sum|addition|add|plus|합/i,
    template: 'result += arr[i]',
    initialization: 'T result = 0'
  },

  average: {
    pattern: /average|mean|avg|평균/i,
    template: 'sum / len',
    initialization: 'T result = 0'
  },

  max: {
    pattern: /max|maximum|최대/i,
    template: 'if (arr[i] > result) result = arr[i]',
    initialization: 'T result = arr[0]'
  },

  // ... 등
}
```

---

### 2.5 Code Emitter (v1 + 자동 생성)

**파일**: `src/codegen/c_emitter.ts`
**크기**: ~760 LOC → ~1,200 LOC
**역할**: AST → C 코드 생성

**v1 재사용 (핵심)**:
```typescript
class CEmitter {
  private context: EmitContext {
    indent: number
    inFunction: boolean
    currentFunction: FunctionDeclaration
    localVars: Map<string, CType>
    globalVars: Map<string, CType>
    headers: Set<string>
    scopeStack: Array<Set<string>>  // 메모리 안전성!
  }

  private indent(): string      // 들여쓰기
  private emit(line: string)    // 코드 라인 추가
  private enterScope()          // 스코프 시작
  private exitScope()           // 스코프 종료
}
```

**v2 추가**:
```typescript
emitMinimalFunction(fn: MinimalFunctionAST, rule: GenerationRule) {
  // 1. 함수 시그니처 생성
  this.emitFunctionSignature(fn)

  // 2. 함수 바디 시작
  this.emit('{')
  this.context.indent++

  // 3. 초기화 (규칙 기반)
  rule.generateInitialization().forEach(line => this.emit(line))

  // 4. 검증 (규칙 기반)
  rule.generateValidation().forEach(line => this.emit(line))

  // 5. 구현 (규칙 기반)
  rule.generateBody().forEach(line => this.emit(line))

  // 6. 반환
  this.emit(`return result;`)

  // 7. 함수 종료
  this.context.indent--
  this.emit('}')
}
```

---

## 3. 데이터 흐름

```
입력: sum.free
  @minimal
  fn sum
    input: array<number>
    output: number
    intent: "배열 합산"

    │
    ▼ Lexer

토큰 시퀀스:
  [AT_MINIMAL, FN, IDENT(sum), INPUT, COLON, IDENT(array<number>),
   OUTPUT, COLON, IDENT(number), INTENT, COLON, STRING("배열 합산")]

    │
    ▼ Parser

AST:
  {
    type: 'MinimalFunction',
    name: 'sum',
    parameters: [{ name: 'arr', type: 'array<number>' }],
    returnType: 'number',
    intent: '배열 합산',
    line: 1
  }

    │
    ▼ Detector

규칙:
  SumRule {
    pattern: 'array<T> → T',
    operation: 'sum'
  }

    │
    ▼ Generator + CEmitter

C 코드:
  double sum(double* arr, int len) {
    double result = 0;
    if (len == 0) {
      printf("Warning: empty array\n");
      return 0;
    }
    for (int i = 0; i < len; i++) {
      result += arr[i];
    }
    return result;
  }

    │
    ▼ 파일 저장

파일: sum.c
```

---

## 4. 핵심 클래스 다이어그램

```
┌────────────────────────────────────────────────────────────┐
│                      CLI                                   │
│              (index.ts)                                    │
└────────────┬─────────────────────────────────────┬─────────┘
             │                                     │
      ┌──────▼─────┐                          ┌────▼────────┐
      │   Lexer    │                          │   Parser    │
      │ (v1 재사용)│                          │ (v1+new)    │
      └──────┬─────┘                          └────┬────────┘
             │                                    │
             └────────────────┬───────────────────┘
                              │
                        ┌─────▼─────┐
                        │ TypeChecker│
                        │ (간단)     │
                        └─────┬──────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
              ┌─────▼──┐  ┌───▼───┐ ┌──▼──────┐
              │Detector│  │Pattern │ │Generator│
              │ (new)  │  │Lib (new)│  (new)  │
              └─────┬──┘  └───┬───┘ └──┬──────┘
                    │        │        │
                    └────────┼────────┘
                             │
                        ┌────▼────────┐
                        │  CEmitter   │
                        │ (v1+extend) │
                        └────┬────────┘
                             │
                        ┌────▼────────┐
                        │  C 파일     │
                        └─────────────┘
```

---

## 5. 확장성

### 새로운 패턴 추가 방법

```typescript
// 1. Pattern 등록
PATTERNS.newOp = {
  pattern: /new|operation/i,
  template: 'result = compute(arr[i])',
  initialization: 'T result = ...'
}

// 2. Rule 클래스 생성
class NewOpRule extends GenerationRule {
  generateBody() { return ['result = compute(arr[i])'] }
  // ...
}

// 3. Detector 수정
class MinimalDetector {
  detect(fn) {
    // ...
    if (/* newOp 패턴 매칭 */) {
      return new NewOpRule(fn)
    }
  }
}

// 완료! CLI에서 바로 사용 가능
// freelang newop.free -o newop.c
```

---

## 6. 성능 고려사항

### Lexer
- 문자 단위 읽기 → O(n) 시간
- 버퍼링 불필요 (스트림 처리)

### Parser
- TokenBuffer (고정 크기 버퍼) → O(1) 메모리
- v1과 동일 (이미 최적화됨)

### CodeGen
- EmitContext 기반 → 메모리 효율적
- 스코프 스택 → 메모리 누수 방지

### 전체
- 대부분 O(n) (n = 입력 크기)
- @minimal은 함수당 <100ms

---

## 7. 테스트 구조

```
test/
├── lexer.test.ts          # Lexer 테스트
├── parser.test.ts         # Parser 테스트
├── minimal-intent.test.ts # @minimal 테스트
│   ├── sum.test.ts
│   ├── average.test.ts
│   ├── max.test.ts
│   ├── min.test.ts
│   └── filter.test.ts
└── e2e.test.ts            # 통합 테스트
```

---

**Last Updated**: 2026-02-15
**Version**: v2.0 Beta
**Status**: 아키텍처 확정
