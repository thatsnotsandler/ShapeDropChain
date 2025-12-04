import { copyFileSync } from "fs";
import { resolve } from "path";

try {
  const src = resolve(process.cwd(), "node_modules", "@zama-fhe", "relayer-sdk", "bundle", "relayer-sdk-js.umd.cjs");
  const wasm1 = resolve(process.cwd(), "node_modules", "@zama-fhe", "relayer-sdk", "bundle", "tfhe_bg.wasm");
  const wasm2 = resolve(process.cwd(), "node_modules", "@zama-fhe", "relayer-sdk", "bundle", "kms_lib_bg.wasm");
  const dest = resolve(process.cwd(), "public", "relayer-sdk-js.umd.cjs");
  const destW1 = resolve(process.cwd(), "public", "tfhe_bg.wasm");
  const destW2 = resolve(process.cwd(), "public", "kms_lib_bg.wasm");
  copyFileSync(src, dest);
  copyFileSync(wasm1, destW1);
  copyFileSync(wasm2, destW2);
  console.log("Relayer SDK UMD and WASM copied to public/");
} catch (e) {
  console.error("Failed to copy Relayer SDK files:", e);
  process.exit(1);
}


