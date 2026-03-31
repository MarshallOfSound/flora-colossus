import { describe, it, expect } from 'vitest';

import * as floraColossus from '../src/index';

describe('index exports', () => {
  it('should export Walker class', () => {
    expect(floraColossus.Walker).toBeDefined();
    expect(typeof floraColossus.Walker).toBe('function');
  });

  it('should export DepType enum', () => {
    expect(floraColossus.DepType).toBeDefined();
    expect(floraColossus.DepType.PROD).toBe(0);
    expect(floraColossus.DepType.DEV).toBe(1);
    expect(floraColossus.DepType.OPTIONAL).toBe(2);
    expect(floraColossus.DepType.DEV_OPTIONAL).toBe(3);
    expect(floraColossus.DepType.ROOT).toBe(4);
  });

  it('should export depTypeGreater function', () => {
    expect(floraColossus.depTypeGreater).toBeDefined();
    expect(typeof floraColossus.depTypeGreater).toBe('function');
  });

  it('should export childDepType function', () => {
    expect(floraColossus.childDepType).toBeDefined();
    expect(typeof floraColossus.childDepType).toBe('function');
  });

  it('should allow constructing a Walker instance', () => {
    const walker = new floraColossus.Walker('/tmp/test');
    expect(walker).toBeInstanceOf(floraColossus.Walker);
    expect(walker.getRootModule()).toBe('/tmp/test');
  });
});
