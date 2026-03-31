import * as path from 'path';
import { describe, it, beforeAll, expect } from 'vitest';

import { Module, Walker } from '../src/Walker';
import { DepType } from '../src/depTypes';

/**
 * Reproduction of Bug 2 (promotion doesn't propagate) using real package
 * names and versions, verified against an actual npm install of:
 *   { "dependencies": { "sqlite3": "5.1.7", "which": "^2.0.2" } }
 *
 * The stub fixture mirrors the hoisted npm layout that triggers the bug.
 */
describe('Real-world bug: sqlite3 + which (promotion does not propagate)', () => {
  let modules: Module[];
  const dep = (name: string) => modules.find((m) => m.name === name);

  beforeAll(async () => {
    const walker = new Walker(
      path.join(__dirname, 'fixtures', 'promotion_no_propagate_real'),
    );
    modules = await walker.walkTree();
  });

  // Dependency chain:
  //   root deps: sqlite3 (prod), which (prod)
  //   sqlite3 deps: tar (prod), node-gyp (optional)
  //   node-gyp deps: tar, which, graceful-fs, nopt, semver
  //   which deps: isexe
  //   nopt deps: abbrev
  //
  // "sqlite3" < "which" alphabetically, so sqlite3 is walked first.
  //
  // Traversal:
  //   1. sqlite3 (PROD) → tar (PROD) → node-gyp (OPTIONAL)
  //   2. node-gyp (OPTIONAL) → tar (already PROD ✓), graceful-fs (OPTIONAL),
  //      nopt (OPTIONAL) → abbrev (OPTIONAL), semver (OPTIONAL),
  //      which (OPTIONAL) → isexe (OPTIONAL)
  //   3. Root continues: which → already visited, promoted OPTIONAL→PROD
  //      BUT isexe is NOT re-walked, stays OPTIONAL

  it('should classify sqlite3 as PROD', () => {
    expect(dep('sqlite3')).toHaveProperty('depType', DepType.PROD);
  });

  it('should classify tar as PROD (sqlite3 prod dep, walked before optional)', () => {
    expect(dep('tar')).toHaveProperty('depType', DepType.PROD);
  });

  it('should classify node-gyp as OPTIONAL (correct)', () => {
    expect(dep('node-gyp')).toHaveProperty('depType', DepType.OPTIONAL);
  });

  it('should promote which to PROD', () => {
    // which is first found as OPTIONAL through node-gyp, then promoted
    // when root's prod loop walks it directly. Promotion itself works.
    expect(dep('which')).toHaveProperty('depType', DepType.PROD);
  });

  it('should propagate which promotion to isexe (PROD)', () => {
    // isexe is a prod dep of which, which is a prod dep of root.
    // After which is promoted OPTIONAL→PROD, its children are re-walked
    // so isexe is also promoted to PROD.
    const isexe = dep('isexe');
    expect(isexe).toBeDefined();
    expect(isexe).toHaveProperty('depType', DepType.PROD);
  });

  it('should leave other node-gyp transitive deps as OPTIONAL', () => {
    // These are only reachable through node-gyp (optional) and are not
    // direct root deps, so OPTIONAL is correct for them.
    expect(dep('graceful-fs')).toHaveProperty('depType', DepType.OPTIONAL);
    expect(dep('nopt')).toHaveProperty('depType', DepType.OPTIONAL);
    expect(dep('abbrev')).toHaveProperty('depType', DepType.OPTIONAL);
    expect(dep('semver')).toHaveProperty('depType', DepType.OPTIONAL);
  });
});
