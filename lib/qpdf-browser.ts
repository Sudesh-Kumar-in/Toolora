"use client";

export interface QpdfResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  output: Uint8Array | null;
}

interface QpdfModule {
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    unlink(path: string): void;
  };
  callMain(args: string[]): number;
}

type QpdfFactory = (options?: { print?: (s: string) => void; printErr?: (s: string) => void }) => Promise<QpdfModule>;

/**
 * Runs qpdf (compiled to WebAssembly) on bytes in memory. Nothing leaves the browser.
 * The arguments are the same as the qpdf command line. See lib/qpdf-args.ts.
 */
export async function runQpdf(
  args: string[],
  input: { name: string; data: Uint8Array },
  outputName: string,
): Promise<QpdfResult> {
  const mod = (await import("@neslinesli93/qpdf-wasm")) as unknown as { default?: QpdfFactory } & QpdfFactory;
  const factory: QpdfFactory = typeof mod.default === "function" ? mod.default : mod;

  let stdout = "";
  let stderr = "";
  const qpdf = await factory({
    print: (s: string) => { stdout += `${s}\n`; },
    printErr: (s: string) => { stderr += `${s}\n`; },
  });

  qpdf.FS.writeFile(input.name, input.data);
  const exitCode = qpdf.callMain(args);

  let output: Uint8Array | null = null;
  try {
    output = qpdf.FS.readFile(outputName).slice();
  } catch {
    output = null;
  }
  return { exitCode, stdout, stderr, output };
}
