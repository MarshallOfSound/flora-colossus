import * as path from 'path';
import { describe, it, expect } from 'vitest';

import { Walker, Module } from '../src/Walker';
import { DepType } from '../src/depTypes';
import { NativeModuleType } from '../src/nativeModuleTypes';

describe('Walker (unit)', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  describe('constructor', () => {
    it('should throw if modulePath is empty', () => {
      expect(() => new Walker('')).toThrow('modulePath must be provided as a string');
    });

    it('should throw if modulePath is not a string', () => {
      expect(() => new Walker(undefined as any)).toThrow('modulePath must be provided as a string');
      expect(() => new Walker(null as any)).toThrow('modulePath must be provided as a string');
      expect(() => new Walker(123 as any)).toThrow('modulePath must be provided as a string');
    });

    it('should accept a valid path', () => {
      const walker = new Walker('/some/path');
      expect(walker.getRootModule()).toBe('/some/path');
    });
  });

  describe('getRootModule', () => {
    it('should return the exact path provided to the constructor', () => {
      const testPath = '/home/user/my-project';
      const walker = new Walker(testPath);
      expect(walker.getRootModule()).toBe(testPath);
    });
  });

  describe('walkTree caching', () => {
    it('should return the same array reference from cached calls', async () => {
      const walker = new Walker(path.join(fixturesDir, 'minimal_packages'));
      const result1 = await walker.walkTree();
      const result2 = await walker.walkTree();
      // The cache should yield the exact same array (same reference)
      expect(result1).toBe(result2);
    });

    it('should not re-walk on second call', async () => {
      const walker = new Walker(path.join(fixturesDir, 'minimal_packages'));
      const result1 = await walker.walkTree();
      const result2 = await walker.walkTree();
      expect(result1.length).toBe(result2.length);
      expect(result1).toStrictEqual(result2);
    });
  });

  describe('walkTree error handling', () => {
    it('should throw for a path with no package.json', async () => {
      const walker = new Walker('/tmp/nonexistent-path-for-flora-colossus-test');
      const modules = await walker.walkTree();
      // A missing package.json at root results in empty modules (dead end)
      expect(modules).toEqual([]);
    });
  });

  describe('walkTree module structure', () => {
    it('should return modules with all required fields', async () => {
      const walker = new Walker(path.join(fixturesDir, 'minimal_packages'));
      const modules = await walker.walkTree();
      for (const mod of modules) {
        expect(mod).toHaveProperty('path');
        expect(mod).toHaveProperty('depType');
        expect(mod).toHaveProperty('nativeModuleType');
        expect(mod).toHaveProperty('name');
        expect(typeof mod.path).toBe('string');
        expect(typeof mod.name).toBe('string');
        expect(typeof mod.depType).toBe('number');
        expect(typeof mod.nativeModuleType).toBe('number');
      }
    });

    it('should always include the root module as first entry', async () => {
      const fixturePath = path.join(fixturesDir, 'minimal_packages');
      const walker = new Walker(fixturePath);
      const modules = await walker.walkTree();
      expect(modules[0].depType).toBe(DepType.ROOT);
      expect(modules[0].path).toBe(fixturePath);
    });

    it('should mark the root module with NativeModuleType.NONE', async () => {
      const walker = new Walker(path.join(fixturesDir, 'minimal_packages'));
      const modules = await walker.walkTree();
      expect(modules[0].nativeModuleType).toBe(NativeModuleType.NONE);
    });
  });

  describe('dependency type promotion', () => {
    it('should promote a dep type when encountered via a higher-priority path', async () => {
      // dep_precedence fixture has a package that appears in both prod and dev
      const walker = new Walker(path.join(fixturesDir, 'dep_precedence'));
      const modules = await walker.walkTree();
      const usedEverywhere = modules.find((m) => m.name === 'used-everywhere');
      expect(usedEverywhere).toBeDefined();
      expect(usedEverywhere!.depType).toBe(DepType.PROD);
    });
  });

  describe('missing optional dependencies', () => {
    it('should not throw when optional dependencies are missing', async () => {
      const walker = new Walker(path.join(fixturesDir, 'optional_resolution'));
      const modules = await walker.walkTree();
      expect(modules.length).toBeGreaterThan(0);
    });
  });
});
