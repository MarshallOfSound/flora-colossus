import { expect } from 'chai';

import { DepType, DepRequireState, childRequired, depTypeGreater, depRequireStateGreater } from '../src/depTypes';

describe('depTypes', () => {
  describe('DepType enum', () => {
    it('should contain unique numbers', () => {
      expect(
        Object.keys(DepType)
          .map(key => DepType[key])
          .filter(value => typeof value === 'number')
          .length
      ).to.equal(3);
    });
  });

  describe('DepRequireState enum', () => {
    it('should contain unique numbers', () => {
      expect(
        Object.keys(DepRequireState)
          .map(key => DepRequireState[key])
          .filter(value => typeof value === 'number')
          .length
      ).to.equal(2);
    });
  });

  describe('childRequired', () => {
    it('should mark children of optional deps as optional', () => {
      expect(childRequired(DepRequireState.OPTIONAL, DepRequireState.REQUIRED)).to.equal(DepRequireState.OPTIONAL);
    });

    it('should mark required children of required deps as required', () => {
      expect(childRequired(DepRequireState.REQUIRED, DepRequireState.REQUIRED)).to.equal(DepRequireState.REQUIRED);
    });

    it('should mark optional children of required deps as optional', () => {
      expect(childRequired(DepRequireState.REQUIRED, DepRequireState.OPTIONAL)).to.equal(DepRequireState.OPTIONAL);
    });
  });

  describe('depTypeGreater', () => {
    it('should report PROD > DEV', () => {
      expect(depTypeGreater(DepType.PROD, DepType.DEV)).to.equal(true);
    });

    it('should report ROOT > DEV', () => {
      expect(depTypeGreater(DepType.ROOT, DepType.DEV)).to.equal(true);
    });

    it('should report DEV < PROD', () => {
      expect(depTypeGreater(DepType.DEV, DepType.PROD)).to.equal(false);
    });

    it('should report ROOT > PROD', () => {
      expect(depTypeGreater(DepType.ROOT, DepType.PROD)).to.equal(true);
    });

    it('should report DEV < ROOT', () => {
      expect(depTypeGreater(DepType.DEV, DepType.ROOT)).to.equal(false);
    });

    it('should report PROD < ROOT', () => {
      expect(depTypeGreater(DepType.PROD, DepType.ROOT)).to.equal(false);
    });
  });

  describe('depRequireStateGreater', () => {
    it('should report REQUIRED > OPTIONAL', () => {
      expect(depRequireStateGreater(DepRequireState.REQUIRED, DepRequireState.OPTIONAL)).to.equal(true);
    });

    it('should report OPTIONAL < REQUIRED', () => {
      expect(depRequireStateGreater(DepRequireState.OPTIONAL, DepRequireState.REQUIRED)).to.equal(false);
    });

    /**
     * These tests ensure that the method will not modify things that are identical
     */
    it('should report OPTIONAL < OPTIONAL', () => {
      expect(depRequireStateGreater(DepRequireState.OPTIONAL, DepRequireState.OPTIONAL)).to.equal(false);
    });

    it('should report OPTIONAL < REQUIRED', () => {
      expect(depRequireStateGreater(DepRequireState.REQUIRED, DepRequireState.REQUIRED)).to.equal(false);
    });
  });
});
