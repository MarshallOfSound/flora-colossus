import { describe, it, expect } from 'vitest';

import { DepType, childDepType, depTypeGreater } from '../src/depTypes';

describe('depTypes', () => {
  describe('enum', () => {
    it('should contain unique numbers', () => {
      expect(
        Object.keys(DepType)
          .map(key => DepType[key])
          .filter(value => typeof value === 'number')
          .length
      ).toBe(5);
    });
  });

  describe('childDepType', () => {
    it('should throw an error if you try to calculate the child type of a "root" child', () => {
      expect(() => childDepType(DepType.PROD, DepType.ROOT)).toThrow();
    });

    it('should mark children of optional deps as optional', () => {
      expect(childDepType(DepType.OPTIONAL, DepType.DEV)).toBe(DepType.OPTIONAL);
      expect(childDepType(DepType.OPTIONAL, DepType.PROD)).toBe(DepType.OPTIONAL);
      expect(childDepType(DepType.OPTIONAL, DepType.OPTIONAL)).toBe(DepType.OPTIONAL);
    });

    it('should mark non-optional deps of prod deps as prod', () => {
      expect(childDepType(DepType.PROD, DepType.DEV)).toBe(DepType.PROD);
      expect(childDepType(DepType.PROD, DepType.PROD)).toBe(DepType.PROD);
    });

    it('should mark optional deps of prod deps as optional', () => {
      expect(childDepType(DepType.PROD, DepType.OPTIONAL)).toBe(DepType.OPTIONAL);
    });

    it('should mark non-optional deps of dev deps as dev', () => {
      expect(childDepType(DepType.DEV, DepType.PROD)).toBe(DepType.DEV);
      expect(childDepType(DepType.DEV, DepType.DEV)).toBe(DepType.DEV);
    });

    // THIS IS REQUIRED BEHAVIOR, DO NOT CHANGE
    // For future context, this is just so we don't leave around optional transitive
    // deps.  Using dev_optional is :ok: because it ensures that we don't keep them
    it('should mark optional deps of dev deps as dev_optional deps', () => {
      expect(childDepType(DepType.DEV, DepType.OPTIONAL)).toBe(DepType.DEV_OPTIONAL);
    });

    it('should mark deps of the root project as their native dep type', () => {
      expect(childDepType(DepType.ROOT, DepType.DEV)).toBe(DepType.DEV);
      expect(childDepType(DepType.ROOT, DepType.OPTIONAL)).toBe(DepType.OPTIONAL);
      expect(childDepType(DepType.ROOT, DepType.PROD)).toBe(DepType.PROD);
    });
  });

  describe('depTypeGreater', () => {
    it('should report OPTIONAL > DEV', () => {
      expect(depTypeGreater(DepType.OPTIONAL, DepType.DEV)).toBe(true);
    });

    it('should report PROD > DEV', () => {
      expect(depTypeGreater(DepType.PROD, DepType.DEV)).toBe(true);
    });

    it('should report ROOT > DEV', () => {
      expect(depTypeGreater(DepType.ROOT, DepType.DEV)).toBe(true);
    });

    it('should report DEV < OPTIONAL', () => {
      expect(depTypeGreater(DepType.DEV, DepType.OPTIONAL)).toBe(false);
    });

    it('should report PROD > OPTIONAL', () => {
      expect(depTypeGreater(DepType.PROD, DepType.OPTIONAL)).toBe(true);
    });

    it('should report ROOT > OPTIONAL', () => {
      expect(depTypeGreater(DepType.ROOT, DepType.OPTIONAL)).toBe(true);
    });

    it('should report DEV < PROD', () => {
      expect(depTypeGreater(DepType.DEV, DepType.PROD)).toBe(false);
    });

    it('should report OPTIONAL < PROD', () => {
      expect(depTypeGreater(DepType.OPTIONAL, DepType.PROD)).toBe(false);
    });

    it('should report ROOT > PROD', () => {
      expect(depTypeGreater(DepType.ROOT, DepType.PROD)).toBe(true);
    });

    it('should report DEV < ROOT', () => {
      expect(depTypeGreater(DepType.DEV, DepType.ROOT)).toBe(false);
    });

    it('should report OPTIONAL < ROOT', () => {
      expect(depTypeGreater(DepType.OPTIONAL, DepType.ROOT)).toBe(false);
    });

    it('should report PROD < ROOT', () => {
      expect(depTypeGreater(DepType.PROD, DepType.ROOT)).toBe(false);
    });
  });
});
