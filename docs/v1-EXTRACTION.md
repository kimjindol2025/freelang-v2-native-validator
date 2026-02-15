# v1에서 v2로 - 핵심 코드 발취 가이드

## 목표

FreeLang v1 (41,987 LOC)에서 **진정한 핵심 코드만** 추출하여 v2 (3,500 LOC)로 이식

**원칙**: "다이어트" = 삭제가 아닌 "필수 자산만 발취"

---

## 1. 발취 대상 (필수)

### 1.1 Lexer (그대로 이식)

**v1 파일**: `src/lexer/lexer.ts`, `src/lexer/token.ts`
**v2 파일**: 동일 위치에 복사
**수정 사항**: @minimal 데코레이터 인식 추가

```typescript
// v1의 TokenType enum에 추가
enum TokenType {
  // ... 기존 타입들
  AT_MINIMAL,      // 새로운 토큰 타입
  INTENT,          // @minimal에서 사용
}

// v1의 Lexer 클래스 유지 (변경 없음)
class Lexer {
  // 모든 메서드 그대로
  readChar()
  peekChar()
  readIdentifier()
  // ...
}
```

**복사 명령**:
```bash
cp freelang/src/lexer/lexer.ts v2-freelang-ai/src/lexer/
cp freelang/src/lexer/token.ts v2-freelang-ai/src/lexer/
```

**코드량**: 710 LOC (변경 없음)

---

### 1.2 Parser (축약 + @minimal 추가)

**v1 파일**: `src/parser/parser.ts`, `src/parser/ast.ts`
**v2 파일**: 동일 위치, 축약된 버전
**수정 사항**:
- `parseMinimalDeclaration()` 메서드 추가
- 다른 기능 제거 (클래스, 제너릭 등)

```typescript
// v1에서 복사 (변경 없음)
class Parser {
  private tokenBuffer: TokenBuffer

  advance(): void
  check(type: TokenType): boolean
  match(...types: TokenType[]): boolean
  expectIdentifier(message: string): Token
  expect(type: TokenType, message: string): Token
}

// v2에서 추가
class Parser {
  // ... v1 메서드 유지

  // 신규: @minimal 데코레이터 파싱
  parseMinimalDeclaration(): MinimalFunctionAST {
    this.expect(TokenType.AT_MINIMAL, 'Expected @minimal')
    this.expect(TokenType.FN, 'Expected fn')

    const name = this.expectIdentifier('Expected function name').value

    // input: array<number>
    this.expect(TokenType.INPUT, 'Expected input')
    this.expect(TokenType.COLON, 'Expected :')
    const inputs = this.parseTypeList()

    // output: number
    this.expect(TokenType.OUTPUT, 'Expected output')
    this.expect(TokenType.COLON, 'Expected :')
    const output = this.expectIdentifier('Expected output type').value

    // intent: "..."
    this.expect(TokenType.INTENT, 'Expected intent')
    this.expect(TokenType.COLON, 'Expected :')
    const intent = this.expect(TokenType.STRING, 'Expected intent string').value

    return {
      type: 'MinimalFunction',
      name,
      inputs,
      output,
      intent
    }
  }

  // 신규: 타입 목록 파싱
  private parseTypeList(): Array<{ name: string; type: string }> {
    const types = []

    while (true) {
      const name = this.expectIdentifier('Expected parameter name').value
      this.expect(TokenType.COLON, 'Expected :')
      const type = this.expectIdentifier('Expected type').value

      types.push({ name, type })

      if (!this.match(TokenType.COMMA)) break
    }

    return types
  }
}
```

**발취 절차**:
1. v1 parser.ts 복사
2. 불필요한 메서드 제거:
   - `parseProgram()` (구조체, 클래스 등)
   - `parseStatement()` (if/while/for 등)
   - `parseExpression()` (연산식 등)
3. `parseMinimalDeclaration()` 추가
4. AST 노드 최소화

**복사 명령**:
```bash
cp freelang/src/parser/parser.ts v2-freelang-ai/src/parser/  # 수정 필요
cp freelang/src/parser/ast.ts v2-freelang-ai/src/parser/    # 축약 필요
cp freelang/src/parser/token.ts v2-freelang-ai/src/parser/  # 이미 복사됨
```

**코드량**: 3,254 LOC → 2,500 LOC (축약)

---

### 1.3 Code Generator (확장 필요)

**v1 파일**: `src/codegen/c_emitter.ts`, `src/codegen/types.ts`
**v2 파일**: 동일 위치, 확장된 버전
**수정 사항**:
- v1 구조 유지 (EmitContext, indent, emit)
- `emitMinimalFunction()` 메서드 추가

```typescript
// v1에서 복사 (변경 없음)
interface EmitContext {
  indent: number
  inFunction: boolean
  currentFunction: FunctionDeclaration | null
  localVars: Map<string, { cType: CType; cName: string }>
  globalVars: Map<string, { cType: CType; cName: string }>
  headers: Set<string>
  linkerFlags: Set<string>
  scopeStack: Array<Set<string>>
}

class CEmitter {
  private context: EmitContext
  private code: string[] = []

  private indent(): string       // v1 그대로
  private emit(line: string)     // v1 그대로
  private enterScope()           // v1 그대로
  private exitScope()            // v1 그대로
}

// v2에서 추가
class CEmitter {
  // ... v1 메서드 유지

  // 신규: @minimal 함수 생성
  emitMinimalFunction(
    fn: MinimalFunctionAST,
    rule: GenerationRule
  ): void {
    // 1. 함수 시그니처
    const cType = this.typeToC(fn.output)
    this.emit(`${cType} ${fn.name}(${this.parametersToC(fn.inputs)}) {`)

    this.context.indent++
    this.context.inFunction = true

    // 2. 초기화 (규칙 기반)
    rule.generateInitialization().forEach(line => this.emit(line))

    // 3. 검증 (규칙 기반)
    rule.generateValidation().forEach(line => this.emit(line))

    // 4. 구현 (규칙 기반)
    rule.generateBody().forEach(line => this.emit(line))

    // 5. 반환
    this.emit('return result;')

    // 6. 종료
    this.context.indent--
    this.emit('}')
  }

  // 신규: 매개변수 C 문법 변환
  private parametersToC(params: Array<{ name: string; type: string }>): string {
    return params.map(p => {
      const cType = this.typeToC(p.type)
      return `${cType} ${p.name}`
    }).join(', ')
  }
}
```

**발취 절차**:
1. v1 c_emitter.ts 복사
2. 불필요한 메서드 제거:
   - `emitProgram()` (프로그램 전체)
   - `emitStatement()` (모든 명령문)
   - `emitExpression()` (모든 식)
3. `emitMinimalFunction()` 추가
4. 타입 지원 축약 (int/number/string/array만)

**복사 명령**:
```bash
cp freelang/src/codegen/c_emitter.ts v2-freelang-ai/src/codegen/  # 수정 필요
cp freelang/src/codegen/types.ts v2-freelang-ai/src/codegen/      # 축약 필요
```

**코드량**: 760 LOC → 1,200 LOC (확장)

---

### 1.4 Type Checker (극도로 축약)

**v1 파일**: `src/typechecker/typechecker.ts`
**v2 파일**: 동일 위치, 극도로 축약된 버전
**수정 사항**: 기본 타입 검증만

```typescript
// v2에서 신규 작성 (v1 참고만 함)
class TypeChecker {
  private basicTypes = ['int', 'number', 'boolean', 'string', 'void']

  check(fn: MinimalFunctionAST): void {
    // 1. 입력 타입 검증
    for (const input of fn.inputs) {
      if (!this.isValidType(input.type)) {
        throw new Error(`Invalid input type: ${input.type}`)
      }
    }

    // 2. 출력 타입 검증
    if (!this.isValidType(fn.output)) {
      throw new Error(`Invalid output type: ${fn.output}`)
    }

    // 3. 의도 문자열 검증
    if (!fn.intent || fn.intent.length === 0) {
      throw new Error('Intent cannot be empty')
    }
  }

  private isValidType(type: string): boolean {
    // 기본 타입
    if (this.basicTypes.includes(type)) return true

    // array<T>
    if (type.startsWith('array<') && type.endsWith('>')) {
      const innerType = type.slice(6, -1)
      return this.isValidType(innerType)
    }

    return false
  }
}
```

**발취 절차**:
1. v1 typechecker.ts 읽기 (참고용)
2. v2에서 완전히 새로 작성 (극단적으로 단순함)
3. 기본 타입 검증만 유지

**복사 명령**:
```bash
# v1은 참고만 하고, v2에서 새로 작성
# cp freelang/src/typechecker/types.ts v2-freelang-ai/src/typechecker/types.ts
# (타입 정의만 참고)
```

**코드량**: 88,000 LOC → 300 LOC (99% 삭감!)

---

## 2. 발취 금지 대상 (삭제)

### 2.1 네트워크 기능
- ❌ `src/network/` (gRPC, TCP, WebSocket)
- 이유: @minimal은 네트워크 불필요

### 2.2 표준 라이브러리
- ❌ `self-hosting/` (regexp, string, datetime, collection)
- 이유: v2.2+ 로드맵에서 다시 구현

### 2.3 복잡한 타입 시스템
- ❌ `src/typechecker/` (대부분)
  - ❌ annotation-system.ts
  - ❌ contract-extractor.ts
  - ❌ evidence-based-advisory.ts
  - ❌ trait-checker.ts
- 이유: @minimal은 단순 타입만 필요

### 2.4 배포 도구
- ❌ `src/deployment/`
- 이유: v2는 C 코드 생성만

### 2.5 인터프리터/VM
- ❌ `src/interpreter/`
- ❌ `src/vm/`
- 이유: C로 충분

### 2.6 LSP 프로토콜
- ❌ `src/lsp/`
- 이유: 나중에 (v3.0+)

---

## 3. 발취 절차 (체크리스트)

### Step 1: Lexer (✅ 간단)
- [ ] `src/lexer/lexer.ts` 복사
- [ ] `src/lexer/token.ts` 복사
- [ ] @minimal 토큰 타입 추가
- [ ] 테스트 (lexer.test.ts 작성)

### Step 2: Parser (⚠️ 중간)
- [ ] `src/parser/parser.ts` 복사
- [ ] `src/parser/ast.ts` 복사
- [ ] TokenBuffer 이식 확인
- [ ] 불필요한 메서드 제거
- [ ] `parseMinimalDeclaration()` 추가
- [ ] 테스트 (parser.test.ts 작성)

### Step 3: CodeGen (⚠️ 중간)
- [ ] `src/codegen/c_emitter.ts` 복사
- [ ] `src/codegen/types.ts` 복사
- [ ] EmitContext 구조 확인
- [ ] `emitMinimalFunction()` 추가
- [ ] 타입 지원 축약 (int/number/string/array만)
- [ ] 테스트 (codegen.test.ts 작성)

### Step 4: TypeChecker (⭐ 새로 작성)
- [ ] 새 파일 생성 (복사 아님)
- [ ] 기본 타입 검증만 구현
- [ ] 테스트 (typechecker.test.ts 작성)

### Step 5: 통합 테스트
- [ ] sum 함수 테스트
- [ ] average 함수 테스트
- [ ] max 함수 테스트
- [ ] min 함수 테스트
- [ ] 전체 E2E 테스트

---

## 4. 예상 코드 구성

```
v2-freelang-ai/src/
├── lexer/                  (710 LOC, v1 그대로)
│   ├── lexer.ts
│   └── token.ts
├── parser/                 (2,500 LOC, v1 축약)
│   ├── parser.ts
│   ├── ast.ts
│   └── token-buffer.ts
├── typechecker/            (300 LOC, v2 신규)
│   └── typechecker.ts
├── codegen/                (1,200 LOC, v1 확장)
│   ├── c_emitter.ts
│   ├── types.ts
│   └── emit-context.ts
├── minimal/                (800 LOC, v2 신규)
│   ├── detector.ts
│   ├── generator.ts
│   ├── rules.ts
│   └── patterns.ts
└── cli/                    (300 LOC, v2 신규)
    └── index.ts

Total: ~5,810 LOC (v1: 41,987 LOC → 14% 유지)
```

---

## 5. 복사 명령어 (자동화)

```bash
#!/bin/bash

# 원본 경로
V1_SRC="/home/kimjin/Desktop/kim/freelang/src"
V2_SRC="/tmp/v2-freelang-ai/src"

# Step 1: Lexer
cp -r "$V1_SRC/lexer" "$V2_SRC/"

# Step 2: Parser
cp -r "$V1_SRC/parser" "$V2_SRC/"

# Step 3: CodeGen
cp "$V1_SRC/codegen/c_emitter.ts" "$V2_SRC/codegen/"
cp "$V1_SRC/codegen/types.ts" "$V2_SRC/codegen/"

# Step 4: TypeChecker (참고용만 복사)
mkdir -p "$V2_SRC/typechecker"
cp "$V1_SRC/typechecker/types.ts" "$V2_SRC/typechecker/"

echo "✅ Extraction complete!"
```

---

**Last Updated**: 2026-02-15
**Version**: v2.0 Extraction Guide
**Status**: 준비 완료
