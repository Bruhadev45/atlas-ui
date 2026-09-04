// Storybook-only PostCSS pipeline (wired up in main.ts).
export default {
  plugins: { tailwindcss: { config: "./.storybook/tailwind.config.ts" } },
};
