import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const requiredDirectories = ['src/app', 'src/engine', 'src/types', 'src/story-packages'];

describe('Phase 00 project scaffold', () => {
  it('enables strict TypeScript safety flags', () => {
    const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8')) as {
      compilerOptions?: Record<string, unknown>;
    };

    expect(tsconfig.compilerOptions?.strict).toBe(true);
    expect(tsconfig.compilerOptions?.noUncheckedIndexedAccess).toBe(true);
    expect(tsconfig.compilerOptions?.exactOptionalPropertyTypes).toBe(true);
  });

  it('creates the required Phase 00 source directories', () => {
    for (const directory of requiredDirectories) {
      expect(existsSync(path.resolve(process.cwd(), directory)), `${directory} should exist`).toBe(
        true,
      );
    }
  });
});
