import * as React from "react";

/**
 * The caret is decorative and must never land in a copied message, so it is
 * `aria-hidden` and unselectable. Blink and its reduced-motion opt-out live in
 * `.atlas-cursor` (SPEC section 4.2), not in a utility class.
 */
export function StreamCursor({ cursor }: { cursor: boolean | React.ReactNode }): React.ReactElement {
  if (cursor === true) {
    return <span aria-hidden="true" data-atlas-cursor="" className="atlas-cursor ml-0.5 select-none" />;
  }
  return (
    <span aria-hidden="true" data-atlas-cursor="" className="ml-0.5 select-none">
      {cursor}
    </span>
  );
}
