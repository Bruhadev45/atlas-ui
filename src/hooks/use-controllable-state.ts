import * as React from "react";

export interface UseControllableStateParams<T> {
  prop?: T;
  defaultProp: T;
  onChange?: (value: T) => void;
}

/**
 * Library-wide controlled/uncontrolled convention (SPEC section 3.2): a prop is
 * controlled if and only if it is `!== undefined`. Local implementation so we
 * do not depend on `@radix-ui/react-use-controllable-state` (an internal
 * package with no stability guarantee).
 *
 * In development it warns once if a component flips between controlled and
 * uncontrolled across renders.
 */
export function useControllableState<T>(
  params: UseControllableStateParams<T>
): [T, (next: T | ((prev: T) => T)) => void] {
  const { prop, defaultProp, onChange } = params;

  const [internalValue, setInternalValue] = React.useState<T>(defaultProp);
  const isControlled = prop !== undefined;
  const value = isControlled ? prop : internalValue;

  const valueRef = React.useRef(value);
  valueRef.current = value;
  const isControlledRef = React.useRef(isControlled);
  isControlledRef.current = isControlled;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const wasControlledRef = React.useRef(isControlled);
  const warnedRef = React.useRef(false);
  if (process.env.NODE_ENV !== "production") {
    if (wasControlledRef.current !== isControlled && !warnedRef.current) {
      warnedRef.current = true;
      console.warn(
        `useControllableState: a component changed from ${
          wasControlledRef.current ? "controlled" : "uncontrolled"
        } to ${
          isControlled ? "controlled" : "uncontrolled"
        }. Decide between a controlled prop and a defaultValue for the lifetime of the component.`
      );
    }
  }
  wasControlledRef.current = isControlled;

  const setValue = React.useCallback((next: T | ((prev: T) => T)) => {
    const previous = valueRef.current;
    const resolved =
      typeof next === "function" ? (next as (prev: T) => T)(previous) : next;
    if (!isControlledRef.current) {
      setInternalValue(resolved);
      valueRef.current = resolved;
    }
    if (!Object.is(previous, resolved)) {
      onChangeRef.current?.(resolved);
    }
  }, []);

  return [value, setValue];
}
