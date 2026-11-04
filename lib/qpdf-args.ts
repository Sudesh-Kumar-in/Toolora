/**
 * qpdf command-line arguments. The same arrays run against the qpdf CLI (in tests) and
 * against the qpdf WebAssembly build (in the browser), which accepts identical arguments.
 * No imports.
 */

export function buildEncryptArgs(userPassword: string, ownerPassword: string, input: string, output: string): string[] {
  // 256-bit AES. "--" stops option parsing so file names starting with "-" are safe.
  return ["--encrypt", userPassword, ownerPassword, "256", "--", input, output];
}

export function buildDecryptArgs(password: string, input: string, output: string): string[] {
  return [`--password=${password}`, "--decrypt", input, output];
}

export function buildIsEncryptedArgs(input: string): string[] {
  return ["--is-encrypted", input];
}

/** qpdf exits 2 for a wrong password and for invalid input; treat 2 as a user-facing error. */
export const QPDF_EXIT = { OK: 0, ERROR: 2 } as const;
