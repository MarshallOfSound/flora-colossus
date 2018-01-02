export enum DepType {
  PROD,
  DEV,
  OPTIONAL,
  ROOT
}

export const depTypeGreater = (newType: DepType, existing: DepType) => {
  switch (existing) {
    case DepType.DEV:
      switch (newType) {
        case DepType.OPTIONAL:
        case DepType.PROD:
        case DepType.ROOT:
          return true;
        case DepType.DEV:
        default:
          return false;
      }
    case DepType.OPTIONAL:
      switch (newType) {
        case DepType.PROD:
        case DepType.ROOT:
          return true;
        case DepType.OPTIONAL:
        case DepType.DEV:
        default:
          return false;
      }
    case DepType.PROD:
      switch (newType) {
        case DepType.ROOT:
          return true;
        case DepType.PROD:
        case DepType.OPTIONAL:
        case DepType.DEV:
        default:
          return false;
      }
    case DepType.ROOT:
      switch (newType) {
        case DepType.ROOT:
        case DepType.PROD:
        case DepType.OPTIONAL:
        case DepType.DEV:
        default:
          return false;
      }
    default:
      return false;
  }
}

export const childDepType = (parentType: DepType, childType: DepType) => {
  if (childType === DepType.ROOT) {
    throw new Error('Something went wrong, a child dependency can\'t be marked as the ROOT');
  }
  switch (parentType) {
    case DepType.ROOT:
      return childType;
    case DepType.PROD:
      if (childType === DepType.OPTIONAL) return DepType.OPTIONAL;
      return DepType.PROD;
    case DepType.OPTIONAL:
      return DepType.OPTIONAL;
    case DepType.DEV:
      return DepType.DEV;
  }
}