# FreeLang stdlib/http - HTTP Server & Static File Server
# Custom Event Loop (No external dependencies)

CC = gcc
CFLAGS = -Wall -Wextra -fPIC -O2 -pthread
LDFLAGS = -shared -pthread

SRC_DIR = .
BUILD_DIR = build
DIST_DIR = ../../dist/stdlib

# Shared library targets
SOURCES = $(SRC_DIR)/event_loop.c $(SRC_DIR)/http_server_impl.c
OBJECTS = $(patsubst $(SRC_DIR)/%.c,$(BUILD_DIR)/%.o,$(SOURCES))
SHARED_TARGET = $(DIST_DIR)/libhttp.so

# Static server targets
STATIC_SOURCES = static_server_main.c static_file.c
STATIC_OBJECTS = $(patsubst %.c,$(BUILD_DIR)/%.o,$(STATIC_SOURCES))
STATIC_TARGET = $(DIST_DIR)/static-server

.PHONY: all lib-build lib-test lib-clean static test-static clean install

all: lib-build

# ===== Shared Library (libhttp.so) =====

lib-build: $(SHARED_TARGET)
	@echo "✅ HTTP library built successfully"

$(BUILD_DIR):
	@mkdir -p $(BUILD_DIR)

$(DIST_DIR):
	@mkdir -p $(DIST_DIR)

$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(SHARED_TARGET): $(OBJECTS) | $(DIST_DIR)
	$(CC) $(LDFLAGS) $(OBJECTS) -o $@
	@echo "✅ libhttp.so created: $(SHARED_TARGET)"

lib-test: $(SHARED_TARGET)
	@echo "✅ HTTP library ready for testing"

# ===== Static File Server (Standalone Binary) =====

static: $(STATIC_TARGET)
	@echo "✅ Static server built: $(STATIC_TARGET)"

$(BUILD_DIR)/static_file.o: static_file.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -c static_file.c -o $@

$(BUILD_DIR)/static_server_main.o: static_server_main.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -c static_server_main.c -o $@

$(STATIC_TARGET): $(BUILD_DIR)/static_file.o $(BUILD_DIR)/static_server_main.o | $(DIST_DIR)
	$(CC) $(CFLAGS) -o $@ $(BUILD_DIR)/static_file.o $(BUILD_DIR)/static_server_main.o -pthread
	@chmod +x $@

# ===== Test: Static File Server =====

test-static: static
	@mkdir -p test_files
	@echo "<html><body><h1>Test Page</h1></body></html>" > test_files/index.html
	@echo '{"message":"Hello World"}' > test_files/test.json
	@echo "console.log('test');" > test_files/app.js
	@dd if=/dev/urandom of=test_files/small.dat bs=1024 count=10 2>/dev/null
	@echo ""
	@echo "[TEST] 파일 서버 시작..."
	@echo "       포트: 8080"
	@echo "       경로: ./test_files"
	@echo ""
	@echo "[TEST] 테스트 명령어:"
	@echo "       curl http://localhost:8080/static/index.html"
	@echo "       curl http://localhost:8080/static/test.json"
	@echo "       curl http://localhost:8080/static/app.js"
	@echo ""
	@echo "       (Ctrl+C로 종료)"
	@echo ""
	@$(STATIC_TARGET) 8080 ./test_files

# ===== Clean =====

clean:
	@rm -rf $(BUILD_DIR) $(SHARED_TARGET) $(STATIC_TARGET)
	@rm -rf test_files
	@echo "✅ Cleaned"

lib-clean: clean

install: lib-build
	@echo "✅ libhttp.so installed"

# ===== wrk: HTTP Benchmarking Tool =====

WRK_TARGET = $(DIST_DIR)/wrk

wrk: $(WRK_TARGET)
	@echo "✅ wrk built: $(WRK_TARGET)"

$(WRK_TARGET): wrk.c | $(DIST_DIR)
	$(CC) $(CFLAGS) -o $@ wrk.c -pthread
	@chmod +x $@
