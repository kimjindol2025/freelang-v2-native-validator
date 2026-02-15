# FreeLang v2 - IR Specification

> **IR (Intermediate Representation)**: 컴파일러의 중간 표현
>
> **기반**: IR-Design 프로젝트의 SSA IR 확장
>
> **참조**: `/home/kimjin/Desktop/kim/ir-design/Implementation/ir.h`

---

## 1. 개요

### 1.1 IR의 역할

```
AST (구문 트리)
  ↓ [IR Generator]
IR (중간 표현)     ← 이 문서가 정의하는 것
  ↓ [Backend]
C Code / VM Bytecode / LLVM IR
```

IR은 AST와 최종 코드 사이의 **언어 독립적 표현**입니다.
모든 백엔드(VM, C, LLVM)는 동일한 IR에서 코드를 생성합니다.

### 1.2 설계 원칙

```
1. SSA (Static Single Assignment): 각 레지스터는 정확히 한 번 할당
2. BasicBlock: 제어 흐름의 기본 단위
3. 타입 안전: 모든 값에 타입 정보 첨부
4. AI 메타데이터: confidence, directive 등 AI 전용 정보
```

### 1.3 IR-Design과의 관계

```
IR-Design (기존):
  21개 opcode, 8개 타입, BasicBlock, IRBuilder
  → 그대로 가져옴

FreeLang v2 확장:
  +8개 opcode (배열, 안전성, 힌트)
  +6개 타입 (i32, i64, f32, void, Option, Result)
  +metadata 필드 (AI 전용)
```

---

## 2. 타입 시스템

### 2.1 기본 타입 (IR-Design 원본)

```c
typedef enum {
    TYPE_NUMBER,        // 64-bit double (f64)
    TYPE_STRING,        // UTF-8 문자열
    TYPE_BOOLEAN,       // true / false
    TYPE_UNDEFINED,     // undefined
    TYPE_NULL,          // null
    TYPE_OBJECT,        // { key: value }
    TYPE_ARRAY,         // T[]
    TYPE_FUNCTION,      // (params) → return_type
} TypeKind;
```

**출처**: `ir-design/Implementation/ir.h:16-25`

### 2.2 v2 확장 타입

```c
typedef enum {
    // IR-Design 원본 (0-7)
    TYPE_NUMBER,        // 0: f64 (기본 숫자)
    TYPE_STRING,        // 1: UTF-8
    TYPE_BOOLEAN,       // 2: bool
    TYPE_UNDEFINED,     // 3: undefined
    TYPE_NULL,          // 4: null
    TYPE_OBJECT,        // 5: object
    TYPE_ARRAY,         // 6: T[]
    TYPE_FUNCTION,      // 7: fn

    // v2 확장 (8-13)
    TYPE_INT32,         // 8: i32 (정수 32비트)
    TYPE_INT64,         // 9: i64 (정수 64비트)
    TYPE_FLOAT32,       // 10: f32 (부동소수점 32비트)
    TYPE_VOID,          // 11: void (반환값 없음)
    TYPE_OPTION,        // 12: Option<T> (Some | None)
    TYPE_RESULT,        // 13: Result<T, E> (Ok | Err)
} TypeKind;
```

### 2.3 복합 타입 구조

```c
typedef struct Type {
    TypeKind kind;

    union {
        // TYPE_ARRAY
        struct {
            struct Type *elem_type;  // 요소 타입
        } array;

        // TYPE_FUNCTION
        struct {
            struct Type **param_types;
            int param_count;
            struct Type *return_type;
        } function;

        // TYPE_OBJECT
        struct {
            char **field_names;
            struct Type **field_types;
            int field_count;
        } object;

        // TYPE_OPTION (v2)
        struct {
            struct Type *inner_type;  // Some(T)의 T
        } option;

        // TYPE_RESULT (v2)
        struct {
            struct Type *ok_type;     // Ok(T)의 T
            struct Type *err_type;    // Err(E)의 E
        } result;
    } data;
} Type;
```

### 2.4 타입 매핑

```
FreeLang v2    IR Type         C Type          LLVM Type
─────────────────────────────────────────────────────────
f64            TYPE_NUMBER     double          double
i32            TYPE_INT32      int             i32
i64            TYPE_INT64      long long       i64
f32            TYPE_FLOAT32    float           float
bool           TYPE_BOOLEAN    int (0/1)       i1
string         TYPE_STRING     char*           i8*
void           TYPE_VOID       void            void
array<T>       TYPE_ARRAY      T* + int len    {T*, i32}
Option<T>      TYPE_OPTION     struct{bool,T}  {i1, T}
Result<T,E>    TYPE_RESULT     struct{bool,T,E} {i1, T, E}
```

---

## 3. Opcode (명령어 세트)

### 3.1 IR-Design 원본 (21개)

```c
typedef enum {
    // 리터럴/메모리 (3개)
    IR_CONST,           // %n = const value
    IR_LOAD,            // %n = load varname
    IR_STORE,           // store varname, %n

    // 산술 (4개)
    IR_ADD,             // %n = add %a, %b
    IR_SUB,             // %n = sub %a, %b
    IR_MUL,             // %n = mul %a, %b
    IR_DIV,             // %n = div %a, %b

    // 비교 (5개)
    IR_CMP_EQ,          // %n = cmp_eq %a, %b
    IR_CMP_LT,          // %n = cmp_lt %a, %b
    IR_CMP_GT,          // %n = cmp_gt %a, %b
    IR_CMP_LTE,         // %n = cmp_lte %a, %b
    IR_CMP_GTE,         // %n = cmp_gte %a, %b

    // 제어 흐름 (3개)
    IR_JUMP,            // jump block
    IR_BRANCH,          // branch %cond, true_block, false_block
    IR_RETURN,          // return %n

    // 함수 (2개)
    IR_CALL,            // %n = call func(%a, %b, ...)
    IR_PHI,             // %n = phi [%a, block1], [%b, block2]
} IROpcode;
```

**출처**: `ir-design/Implementation/ir.h:64-91`

### 3.2 v2 확장 Opcode (8개)

```c
    // ── v2 확장: 배열 연산 (4개) ──
    IR_ARRAY_NEW,       // %n = array_new <type>, size
                        // 새 배열 생성 (타입 + 크기)

    IR_ARRAY_GET,       // %n = array_get %arr, %idx
                        // 배열 요소 접근

    IR_ARRAY_SET,       // array_set %arr, %idx, %val
                        // 배열 요소 설정

    IR_ARRAY_LEN,       // %n = array_len %arr
                        // 배열 길이 반환

    // ── v2 확장: 안전성 검사 (2개) ──
    IR_BOUNDS_CHECK,    // bounds_check %arr, %idx
                        // 배열 경계 검사 (safe 모드에서만)
                        // 실패 시 에러 반환

    IR_NULL_CHECK,      // null_check %ptr
                        // null 포인터 검사 (safe 모드에서만)
                        // 실패 시 에러 반환

    // ── v2 확장: 최적화 힌트 (2개) ──
    IR_HINT_SIMD,       // hint_simd %loop_start, %loop_end
                        // "이 루프는 SIMD로 벡터화 가능"
                        // fast 모드에서 C 백엔드가 활용

    IR_HINT_UNROLL,     // hint_unroll %loop_start, count
                        // "이 루프를 N번 언롤링 권장"
                        // fast 모드에서 활용
```

### 3.3 Opcode 요약 (총 29개)

```
카테고리         | Opcode              | 개수
─────────────────┼─────────────────────┼──────
리터럴/메모리    | CONST, LOAD, STORE  | 3
산술             | ADD, SUB, MUL, DIV  | 4
비교             | CMP_EQ/LT/GT/LTE/GTE | 5
제어 흐름        | JUMP, BRANCH, RETURN | 3
함수             | CALL, PHI           | 2
배열 (v2)        | ARRAY_NEW/GET/SET/LEN | 4
안전성 (v2)      | BOUNDS_CHECK, NULL_CHECK | 2
힌트 (v2)        | HINT_SIMD, HINT_UNROLL | 2
─────────────────┼─────────────────────┼──────
합계             |                     | 25 (+4 비교 = 29)
```

---

## 4. IR 구조체

### 4.1 IRValue (레지스터)

```c
typedef struct {
    uint32_t id;        // 레지스터 ID (%0, %1, %2, ...)
    Type *type;         // 타입 정보
} IRValue;
```

**출처**: `ir-design/Implementation/ir.h:57-60`

### 4.2 IRInstruction (명령어)

```c
typedef struct IRInstruction {
    IROpcode op;
    IRValue *result;    // 출력 레지스터 (void이면 NULL)

    union {
        // IR_CONST
        struct {
            double double_val;
            char *string_val;
            int bool_val;
            int32_t int_val;        // v2 추가
        } const_val;

        // IR_LOAD / IR_STORE
        struct {
            char *varname;
            IRValue *value;
            int is_parameter;
            int param_index;
        } memory;

        // 이항 연산 (ADD, SUB, MUL, DIV, CMP_*)
        struct {
            IRValue *left;
            IRValue *right;
        } binop;

        // IR_JUMP
        struct {
            uint32_t target_block_id;
        } jump;

        // IR_BRANCH
        struct {
            IRValue *condition;
            uint32_t true_block_id;
            uint32_t false_block_id;
        } branch;

        // IR_RETURN
        struct {
            IRValue *value;
        } ret;

        // IR_CALL
        struct {
            char *func_name;
            IRValue **args;
            int arg_count;
        } call;

        // IR_PHI
        struct {
            IRValue **values;
            uint32_t *from_blocks;
            int count;
        } phi;

        // v2: IR_ARRAY_NEW
        struct {
            Type *elem_type;
            IRValue *size;
        } array_new;

        // v2: IR_ARRAY_GET / IR_ARRAY_SET
        struct {
            IRValue *array;
            IRValue *index;
            IRValue *value;         // SET만 사용
        } array_op;

        // v2: IR_BOUNDS_CHECK / IR_NULL_CHECK
        struct {
            IRValue *target;        // 배열 또는 포인터
            IRValue *index;         // BOUNDS_CHECK만 사용
        } check;

        // v2: IR_HINT_SIMD / IR_HINT_UNROLL
        struct {
            uint32_t loop_block_id;
            int unroll_count;       // HINT_UNROLL만 사용
        } hint;
    } data;

    // v2 확장: AI 메타데이터
    struct {
        float confidence;           // 0.0 ~ 1.0
        char directive[16];         // "speed" | "memory" | "safety"
        char source_text[256];      // 원본 자연어
        char version_tag[16];       // "safe" | "fast" (Phase 5 이후: | "balanced")
    } metadata;

} IRInstruction;
```

### 4.3 BasicBlock (기본 블록)

```c
typedef struct BasicBlock {
    uint32_t id;
    char name[256];                 // "entry", "loop_test", "loop_body", ...

    IRInstruction **instructions;
    int instruction_count;
    int instruction_capacity;

    struct BasicBlock **successors;
    int successor_count;

    struct BasicBlock **predecessors;
    int predecessor_count;
} BasicBlock;
```

**출처**: `ir-design/Implementation/ir.h` (확장됨)

### 4.4 IRFunction (함수)

```c
typedef struct IRFunction {
    char name[256];
    IRValue **params;
    int param_count;
    Type *return_type;

    BasicBlock *entry_block;
    BasicBlock **blocks;
    int block_count;
    int block_capacity;

    uint32_t next_register_id;

    // v2 확장
    struct {
        float confidence;           // 함수 전체 신뢰도
        char directive[16];         // 함수 최적화 방향
        char description[512];      // "배열의 모든 수를 더하기"
    } metadata;
} IRFunction;
```

### 4.5 IRModule (모듈)

```c
typedef struct {
    char name[256];

    IRFunction **functions;
    int function_count;
    int function_capacity;

    char **global_vars;
    Type **global_types;
    int global_count;

    uint32_t next_block_id;

    // v2 확장
    struct {
        char source_input[1024];    // 원본 자연어 입력
        float overall_confidence;   // 모듈 전체 신뢰도
        char version[16];           // "1.0.0"
    } metadata;
} IRModule;
```

---

## 5. IRBuilder API

### 5.1 기본 API (IR-Design 참조)

```c
// 생성/해제
IRBuilder* ir_builder_create();
void ir_builder_free(IRBuilder *builder);

// 블록 관리
BasicBlock* ir_builder_add_block(IRBuilder *builder, const char *name);
void ir_builder_set_block(IRBuilder *builder, BasicBlock *block);

// 상수 생성
uint32_t ir_builder_gen_const_number(IRBuilder *builder, double value);
uint32_t ir_builder_gen_const_string(IRBuilder *builder, const char *value);
uint32_t ir_builder_gen_const_bool(IRBuilder *builder, int value);
uint32_t ir_builder_gen_const_int(IRBuilder *builder, int32_t value);  // v2

// 메모리
uint32_t ir_builder_gen_load(IRBuilder *builder, const char *varname);
void ir_builder_gen_store(IRBuilder *builder, const char *varname, uint32_t value_id);

// 산술
uint32_t ir_builder_gen_add(IRBuilder *builder, uint32_t left, uint32_t right);
uint32_t ir_builder_gen_sub(IRBuilder *builder, uint32_t left, uint32_t right);
uint32_t ir_builder_gen_mul(IRBuilder *builder, uint32_t left, uint32_t right);
uint32_t ir_builder_gen_div(IRBuilder *builder, uint32_t left, uint32_t right);

// 비교
uint32_t ir_builder_gen_cmp_eq(IRBuilder *builder, uint32_t left, uint32_t right);
uint32_t ir_builder_gen_cmp_lt(IRBuilder *builder, uint32_t left, uint32_t right);
uint32_t ir_builder_gen_cmp_gt(IRBuilder *builder, uint32_t left, uint32_t right);

// 제어 흐름
void ir_builder_gen_jump(IRBuilder *builder, BasicBlock *target);
void ir_builder_gen_branch(IRBuilder *builder, uint32_t cond, BasicBlock *t, BasicBlock *f);
void ir_builder_gen_return(IRBuilder *builder, uint32_t value_id);

// 함수 호출
uint32_t ir_builder_gen_call(IRBuilder *builder, const char *func, uint32_t *args, int count);
```

**출처**: `ir-design/Implementation/ir_builder.h`

### 5.2 v2 확장 API

```c
// 배열 연산
uint32_t ir_builder_gen_array_new(IRBuilder *builder, Type *elem_type, uint32_t size_id);
uint32_t ir_builder_gen_array_get(IRBuilder *builder, uint32_t arr_id, uint32_t idx_id);
void ir_builder_gen_array_set(IRBuilder *builder, uint32_t arr_id, uint32_t idx_id, uint32_t val_id);
uint32_t ir_builder_gen_array_len(IRBuilder *builder, uint32_t arr_id);

// 안전성 검사
void ir_builder_gen_bounds_check(IRBuilder *builder, uint32_t arr_id, uint32_t idx_id);
void ir_builder_gen_null_check(IRBuilder *builder, uint32_t ptr_id);

// 최적화 힌트
void ir_builder_gen_hint_simd(IRBuilder *builder, BasicBlock *loop_block);
void ir_builder_gen_hint_unroll(IRBuilder *builder, BasicBlock *loop_block, int count);

// 메타데이터 설정
void ir_builder_set_confidence(IRBuilder *builder, float confidence);
void ir_builder_set_directive(IRBuilder *builder, const char *directive);
void ir_builder_set_source(IRBuilder *builder, const char *source_text);
```

---

## 6. 심볼 테이블

### 6.1 구조 (IR-Design 참조)

```c
typedef struct {
    char name[256];
    uint32_t register_id;   // IR 레지스터 ID
    Type *type;
    int scope_level;        // 0 = global, 1+ = local
} Symbol;

typedef struct {
    Symbol *symbols;
    int count;
    int capacity;
    int scope_level;
} SymbolTable;
```

**출처**: `ir-design/Implementation/symbol_table.h`

### 6.2 API

```c
SymbolTable* symbol_table_create();
void symbol_table_free(SymbolTable *st);

void symbol_table_push_scope(SymbolTable *st);
void symbol_table_pop_scope(SymbolTable *st);

Symbol* symbol_table_add(SymbolTable *st, const char *name, uint32_t reg_id, Type *type);
Symbol* symbol_table_lookup(SymbolTable *st, const char *name);
Symbol* symbol_table_lookup_in_scope(SymbolTable *st, const char *name);
```

---

## 7. IR 텍스트 표현

### 7.1 문법

```
module <name> {
  fn <name>(<params>) -> <return_type> {
    <block_name>:
      <instructions>
  }
}
```

### 7.2 명령어 표현

```
%<id> = const <value>                         ; 상수
%<id> = load <varname>                        ; 변수 로드
store <varname>, %<id>                        ; 변수 저장
%<id> = add %<left>, %<right>                 ; 덧셈
%<id> = sub %<left>, %<right>                 ; 뺄셈
%<id> = mul %<left>, %<right>                 ; 곱셈
%<id> = div %<left>, %<right>                 ; 나눗셈
%<id> = cmp_eq %<left>, %<right>              ; 같음 비교
%<id> = cmp_lt %<left>, %<right>              ; 작음 비교
jump <block>                                   ; 무조건 점프
branch %<cond>, <true_block>, <false_block>   ; 조건 분기
ret %<id>                                      ; 반환
%<id> = call <func>(%<args>)                  ; 함수 호출
%<id> = phi [%<a>, <block1>], [%<b>, <block2>] ; PHI 노드

; v2 확장
%<id> = array_new <type>, %<size>             ; 배열 생성
%<id> = array_get %<arr>, %<idx>              ; 배열 접근
array_set %<arr>, %<idx>, %<val>              ; 배열 설정
%<id> = array_len %<arr>                      ; 배열 길이
bounds_check %<arr>, %<idx>                   ; 경계 검사
null_check %<ptr>                              ; null 검사
hint_simd <loop_block>                         ; SIMD 힌트
hint_unroll <loop_block>, <count>              ; 언롤 힌트
```

### 7.3 전체 예시: sum 함수

```
; ── FreeLang v2 IR ──
; input: "배열 더하기"
; confidence: 0.85
; directive: memory

module "sum_example" {

  fn sum(arr: array<f64>, len: i32) -> f64 {

    entry:
      %0 = const 0.0                     ; result = 0.0
      %1 = const 0                       ; i = 0
      jump loop_test

    loop_test:
      %2 = phi [%1, entry], [%8, loop_body]   ; i
      %3 = cmp_lt %2, len                     ; i < len
      branch %3, loop_body, loop_end

    loop_body:
      bounds_check arr, %2                     ; 경계 검사 (safe, Phase 5 이후: balanced)
      %4 = array_get arr, %2                   ; arr[i]
      %5 = phi [%0, entry], [%7, loop_body]   ; result
      %7 = add %5, %4                         ; result += arr[i]
      %8 = add %2, const(1)                   ; i++
      jump loop_test

    loop_end:
      %9 = phi [%0, entry], [%7, loop_body]   ; final result
      ret %9
  }
}
```

### 7.4 버전별 차이

```
Safe 버전:
  loop_body:
    bounds_check arr, %2        ← 경계 검사 유지
    null_check arr              ← null 검사 추가
    %4 = array_get arr, %2

Fast 버전:
  loop_body:
    hint_simd loop_body         ← SIMD 힌트 추가
    ; bounds_check 제거          ← 검사 제거
    %4 = array_get arr, %2

Balanced 버전:
  loop_body:
    bounds_check arr, %2        ← 경계 검사 유지 (null은 제거)
    %4 = array_get arr, %2
```

---

## 8. 최적화 Pass

### 8.1 상수 폴딩

```
입력:
  %0 = const 3.0
  %1 = const 5.0
  %2 = add %0, %1

출력:
  %2 = const 8.0
```

**참조**: `ir-design/Implementation/ir_fold_constants.c`

### 8.2 죽은 코드 제거 (DCE)

```
입력:
  %0 = const 42        ; 사용되지 않음
  %1 = const 10
  ret %1

출력:
  %1 = const 10
  ret %1
```

**참조**: `ir-design/Implementation/ir_dead_code_elimination.c`

### 8.3 Directive 기반 최적화 (v2)

```
directive == "speed":
  - bounds_check 제거
  - null_check 제거
  - hint_simd 삽입 (배열 루프)
  - hint_unroll 삽입 (작은 루프, count ≤ 8)

directive == "memory":
  - 임시 레지스터 재사용
  - 배열 복사 → in-place 변환
  - 상수 풀 공유

directive == "safety":
  - bounds_check 모든 array_get/array_set 앞에 삽입
  - null_check 모든 포인터 사용 앞에 삽입
  - 오버플로우 검사 삽입 (add/mul 후)
```

---

## 9. 백엔드별 IR 변환

### 9.1 VM Bytecode 변환

```
IR → VM 매핑:
  IR_CONST      → LOAD_CONST (스택에 상수 푸시)
  IR_LOAD       → LOAD_VAR (변수값 스택에 푸시)
  IR_STORE      → STORE_VAR (스택 탑을 변수에 저장)
  IR_ADD        → ADD (스택 탑 2개 더하기)
  IR_SUB        → SUB
  IR_MUL        → MUL
  IR_DIV        → DIV
  IR_CMP_LT     → LT
  IR_JUMP       → JUMP offset
  IR_BRANCH     → JUMP_IF_FALSE offset
  IR_RETURN     → RETURN
  IR_CALL       → CALL func_id, arg_count
  IR_ARRAY_GET  → INDEX
  IR_ARRAY_NEW  → BUILD_ARRAY size

  IR_BOUNDS_CHECK → (safe 모드: 런타임 검사 코드)
  IR_HINT_SIMD    → (무시 - VM에서는 의미 없음)
  IR_HINT_UNROLL  → (무시)
```

**참조**: `freelang/src/vm/bytecode.ts`

### 9.2 C 코드 변환

```
IR → C 매핑:
  IR_CONST double  → "double %r = 3.14;"
  IR_CONST int     → "int %r = 42;"
  IR_LOAD var      → "double %r = var;"
  IR_STORE var, %a → "var = %a;"
  IR_ADD %a, %b    → "double %r = %a + %b;"
  IR_CMP_LT %a, %b → "int %r = (%a < %b);"
  IR_JUMP block    → "goto block;"
  IR_BRANCH %c, t, f → "if (%c) goto t; else goto f;"
  IR_RETURN %a     → "return %a;"
  IR_CALL f, args  → "double %r = f(args);"
  IR_ARRAY_NEW     → "double* %r = malloc(size * sizeof(double));"
  IR_ARRAY_GET     → "double %r = arr[idx];"
  IR_ARRAY_SET     → "arr[idx] = val;"
  IR_BOUNDS_CHECK  → "if (idx < 0 || idx >= len) { ... error ... }"
  IR_HINT_SIMD     → "// SIMD: consider vectorization"
  IR_HINT_UNROLL   → "#pragma GCC unroll N"
```

**참조**: `ir-design/Implementation/ir_c_emitter.c`

### 9.3 LLVM IR 변환

```
IR → LLVM IR 매핑:
  IR_CONST 3.14    → "%r = fadd double 0.0, 3.14"
  IR_ADD %a, %b    → "%r = fadd double %a, %b"
  IR_CMP_LT %a, %b → "%r = fcmp olt double %a, %b"
  IR_BRANCH %c, t, f → "br i1 %c, label %t, label %f"
  IR_RETURN %a     → "ret double %a"
  IR_HINT_SIMD     → "!llvm.loop !{!\"llvm.loop.vectorize.enable\", i1 true}"
```

**참조**: `freelang/src/codegen/llvm/`

---

## 10. 메타데이터 활용

### 10.1 confidence (신뢰도)

```
용도: 자동 생성된 코드의 품질 지표

confidence ≥ 0.95: "거의 확실" → 자동 승인 가능
confidence ≥ 0.80: "높음" → 검토 권장
confidence ≥ 0.60: "보통" → 검토 필수
confidence < 0.60: "낮음" → 재생성 권장

갱신 규칙:
  승인 시: new = old + (1 - old) * 0.02
  거절 시: new = old * 0.99
```

### 10.2 directive (최적화 방향 - 사용자 선택)

```
"speed":   성능 최우선, 안전성 희생 가능
"memory":  메모리 최소화, 성능 희생 가능
"safety":  안전성 최우선, 성능 희생 가능
```

**참고**: "balanced"는 Phase 5 (Multi-Version Fork) 이후 추가될 예정

### 10.3 version_tag (버전 태그 - Stage 5에서 생성)

```
"safe":     안전성 중심의 IR 버전
"fast":     성능 중심의 IR 버전
"balanced": Phase 5 이후 구현 예정
```

---

**Last Updated**: 2026-02-15
**Status**: 설계 완료
**기반**: IR-Design (`ir.h`) + FreeLang v1
**Opcode 총 수**: 29개 (IR-Design 21 + v2 확장 8)
**타입 총 수**: 14개 (IR-Design 8 + v2 확장 6)
