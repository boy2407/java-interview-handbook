#!/usr/bin/env python3
"""Compile (and run, if there is a main) the ```java blocks in content/*.md.

Usage:
    python3 tools/check_java.py content/fb1.md [content/ch01.md ...]
    python3 tools/check_java.py content/fb1.md --run   # also run classes with main, print output

- Each run uses its own temp directory (safe to run in parallel).
- Blocks needing external libraries (Spring, jakarta, Lombok, JUnit...) are marked SKIP.
- Snippet-only blocks (no class) are wrapped in a Wrap class with common java.util.* imports.
- Exit code 1 if any block FAILs.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

EXTERNAL = re.compile(
    r'^\s*import\s+(org\.springframework|jakarta\.|javax\.persistence|lombok|org\.junit|org\.mockito|'
    r'org\.hibernate|io\.github\.resilience4j|org\.apache\.kafka|org\.testcontainers|com\.fasterxml|'
    r'io\.micrometer|org\.slf4j|org\.assertj)',
    re.M,
)
EXTERNAL_ANN = re.compile(
    r'@(Entity|Table|Id|Column|Service|Component|Repository|RestController|Controller|Configuration|Bean|'
    r'Autowired|Transactional|GetMapping|PostMapping|RequestMapping|Test|ExtendWith|SpringBootTest|'
    r'Data|Getter|Setter|NoArgsConstructor|AllArgsConstructor|RequiredArgsConstructor|Builder|'
    r'Cacheable|KafkaListener|Aspect|Around|PreAuthorize|Valid|NotBlank|Retry|CircuitBreaker)\b'
)
TOP_LEVEL = re.compile(r'^(public\s+)?(final\s+|abstract\s+|sealed\s+|non-sealed\s+)*(class|record|interface|enum)\s+(\w+)', re.M)
PUBLIC_TYPE = re.compile(r'^public\s+(?:final\s+|abstract\s+|sealed\s+)*(?:class|record|interface|enum)\s+(\w+)', re.M)
DEFAULT_IMPORTS = (
    'import java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\n'
    'import java.util.concurrent.*;\nimport java.util.concurrent.atomic.*;\nimport java.util.concurrent.locks.*;\n'
)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    run = '--run' in sys.argv
    work = tempfile.mkdtemp(prefix='check_java_')
    failures = 0
    try:
        for md in args:
            text = open(md, encoding='utf-8').read()
            blocks = re.findall(r'```java\n(.*?)```', text, re.S)
            for i, block in enumerate(blocks):
                label = f'{md} block {i}'
                if EXTERNAL.search(block) or EXTERNAL_ANN.search(block):
                    print(f'{label}: SKIP (needs external library)')
                    continue
                d = os.path.join(work, f'{os.path.basename(md)}_{i}')
                os.makedirs(d)
                m = PUBLIC_TYPE.search(block)
                if m:
                    fn, src = m.group(1) + '.java', block
                elif TOP_LEVEL.search(block):
                    fn, src = 'Snip.java', block
                else:
                    imports = [l for l in block.splitlines() if l.startswith('import ')]
                    body = '\n'.join(l for l in block.splitlines() if not l.startswith('import '))
                    fn = 'Wrap.java'
                    src = '\n'.join(imports) + '\n' + DEFAULT_IMPORTS + 'class Wrap {\n' + body + '\n}\n'
                path = os.path.join(d, fn)
                open(path, 'w', encoding='utf-8').write(src)
                r = subprocess.run(['javac', '--release', '21', '-encoding', 'UTF-8', '-d', d, path],
                                   capture_output=True, text=True)
                if r.returncode != 0:
                    failures += 1
                    print(f'{label} ({fn}): FAIL')
                    print(r.stderr[:1500])
                    continue
                print(f'{label} ({fn}): OK')
                if run and 'static void main' in block and m:
                    try:
                        out = subprocess.run(['java', '-cp', d, m.group(1)], capture_output=True, text=True, timeout=20)
                        print('  output:', (out.stdout + out.stderr).strip()[:800].replace('\n', ' | '))
                    except subprocess.TimeoutExpired:
                        print('  output: (timeout 20s, expected for deadlock/hang examples)')
    finally:
        shutil.rmtree(work, ignore_errors=True)
    print(f'--- {failures} block(s) FAILED')
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
