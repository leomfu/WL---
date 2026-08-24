import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * Next 16 的 eslint-config-next 直接导出 flat config，
 * 不再需要 @eslint/eslintrc 的 FlatCompat（用它会报 circular structure）。
 */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"] },
];

export default eslintConfig;
