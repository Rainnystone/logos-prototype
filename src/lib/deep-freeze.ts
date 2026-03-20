export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
  } else {
    for (const nestedValue of Object.values(value)) {
      deepFreeze(nestedValue);
    }
  }

  return Object.freeze(value);
}
