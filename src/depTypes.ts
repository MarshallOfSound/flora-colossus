export enum DepType {
  PROD,
  DEV,
  OPTIONAL,
  DEV_OPTIONAL,
  ROOT,
}

export const depTypeGreater = (
  newType: DepType,
  existing: DepType
): boolean => {
  switch (existing) {
    case DepType.DEV:
      switch (newType) {
        case DepType.OPTIONAL:
        case DepType.PROD:
        case DepType.ROOT:
          return true;
        case DepType.DEV:
        case DepType.DEV_OPTIONAL:
        default:
          return false;
      }
    case DepType.DEV_OPTIONAL:
      switch (newType) {
        case DepType.OPTIONAL:
        case DepType.PROD:
        case DepType.ROOT:
        case DepType.DEV:
          return true;
        case DepType.DEV_OPTIONAL:
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
        case DepType.DEV_OPTIONAL:
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
        case DepType.DEV_OPTIONAL:
        default:
          return false;
      }
    case DepType.ROOT:
      switch (newType) {
        case DepType.ROOT:
        case DepType.PROD:
        case DepType.OPTIONAL:
        case DepType.DEV:
        case DepType.DEV_OPTIONAL:
        default:
          return false;
      }
    default:
      return false;
  }
};

export const childDepType = (
  parentType: DepType,
  childType: DepType
): DepType => {
  if (childType === DepType.ROOT) {
    throw new Error(
      "Something went wrong, a child dependency can't be marked as the ROOT"
    );
  }
  switch (parentType) {
    case DepType.ROOT:
      return childType;
    case DepType.PROD:
      if (childType === DepType.OPTIONAL) return DepType.OPTIONAL;
      return DepType.PROD;
    case DepType.OPTIONAL:
      return DepType.OPTIONAL;
    case DepType.DEV_OPTIONAL:
      return DepType.DEV_OPTIONAL;
    case DepType.DEV:
      if (childType === DepType.OPTIONAL) return DepType.DEV_OPTIONAL;
      return DepType.DEV;
  }
};
