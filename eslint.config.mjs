import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
    // Vendored third-party component, installed verbatim from the ReUI
    // registry (MIT) and re-installable with `npx shadcn add`. It uses
    // ref-reads during render and other patterns this config rejects on
    // purpose; linting code we don't author would only invite edits that the
    // next upgrade overwrites. Our own adapter around it, in
    // src/app/timeline/_components/, is linted normally.
    "src/components/reui/**",
    // Same rationale, for the @beui data-table + loader components installed
    // from beui.dev via `npx shadcn add`. Pages that consume them (Master
    // Data, Projects, People) are linted normally.
    "src/components/motion/**",
  ]),
]);

export default eslintConfig;
