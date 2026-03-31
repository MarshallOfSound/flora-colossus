import { describe, it, expect } from 'vitest';

import { NativeModuleType } from '../src/nativeModuleTypes';

describe('NativeModuleType', () => {
  it('should define NONE as 0', () => {
    expect(NativeModuleType.NONE).toBe(0);
  });

  it('should define NODE_GYP as 1', () => {
    expect(NativeModuleType.NODE_GYP).toBe(1);
  });

  it('should define PREBUILD as 2', () => {
    expect(NativeModuleType.PREBUILD).toBe(2);
  });

  it('should contain exactly 3 members', () => {
    const numericValues = Object.keys(NativeModuleType)
      .map((key) => NativeModuleType[key as keyof typeof NativeModuleType])
      .filter((value) => typeof value === 'number');
    expect(numericValues.length).toBe(3);
  });

  it('should have unique values', () => {
    const values = [NativeModuleType.NONE, NativeModuleType.NODE_GYP, NativeModuleType.PREBUILD];
    expect(new Set(values).size).toBe(values.length);
  });
});
