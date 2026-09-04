import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Two custom guards from SPEC.md, enforced as lint errors rather than review habits:
 *  - section 4.3: no dynamic class construction (template literals / concatenation in
 *    className) because Tailwind scans dist for complete string literals, and no
 *    "dark:" utilities anywhere (dark mode flips CSS variables in tokens.css only).
 *  - section 9: dangerouslySetInnerHTML is banned; the library renders untrusted text.
 */
export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", "storybook-static/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='className'] TemplateLiteral",
          message:
            "No template literals inside className: Tailwind extracts classes from complete string literals in dist (SPEC section 4.3). Use a static lookup map.",
        },
        {
          selector: "JSXAttribute[name.name='className'] BinaryExpression[operator='+']",
          message:
            "No string concatenation inside className: Tailwind extracts classes from complete string literals in dist (SPEC section 4.3). Use a static lookup map.",
        },
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/dark:/]",
          message:
            "No dark: utilities in component source: dark mode flips CSS variables in tokens.css, never duplicate classes (SPEC section 4.1).",
        },
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            "dangerouslySetInnerHTML is banned in this package: the library renders untrusted model output and corpus text (SPEC section 9).",
        },
        {
          selector: "Property[key.name='dangerouslySetInnerHTML']",
          message:
            "dangerouslySetInnerHTML is banned in this package: the library renders untrusted model output and corpus text (SPEC section 9).",
        },
      ],
    },
  }
);
