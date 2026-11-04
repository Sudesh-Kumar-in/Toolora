"use client";

import { useState } from "react";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { ResultRow } from "@/components/tools/shared/result-row";
import { runQpdf } from "@/lib/qpdf-browser";
import { buildDecryptArgs, buildEncryptArgs, buildIsEncryptedArgs, QPDF_EXIT } from "@/lib/qpdf-args";
import { outputName } from "@/lib/files";

const MAX_BYTES = 50 * 1024 * 1024;

function randomPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 32);
}

export default function PdfLockUnlock() {
  const [mode, setMode] = useState<"lock" | "unlock">("lock");
  const [file, setFile] = useState<File | null>(null);
  const [userPw, setUserPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [ownerPw, setOwnerPw] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; blob: Blob; originalSize: number } | null>(null);

  function switchMode(m: "lock" | "unlock") {
    setMode(m);
    setError(null);
    setResult(null);
    setUserPw("");
    setConfirmPw("");
    setOwnerPw("");
  }

  async function lock() {
    if (!file) return setError("Choose a PDF to lock.");
    if (userPw.length < 4) return setError("The password must be at least 4 characters.");
    if (userPw.length > 128) return setError("The password must be 128 characters or fewer.");
    if (userPw !== confirmPw) return setError("The two passwords do not match.");
    if (ownerPw && ownerPw === userPw) return setError("The owner password must differ from the password that opens the file.");

    setBusy("Encrypting PDF with AES-256");
    try {
      const owner = ownerPw || randomPassword();
      const res = await runQpdf(
        buildEncryptArgs(userPw, owner, "input.pdf", "locked.pdf"),
        { name: "input.pdf", data: new Uint8Array(await file.arrayBuffer()) },
        "locked.pdf",
      );
      if (res.exitCode !== QPDF_EXIT.OK || !res.output) {
        return setError(`The PDF could not be locked. ${res.stderr.trim() || "It may be damaged."}`);
      }
      setResult({ name: outputName(file.name, "-locked", "pdf"), blob: new Blob([res.output as BlobPart], { type: "application/pdf" }), originalSize: file.size });
    } catch {
      setError("The encryption engine could not start in this browser. Try a current version of Chrome, Edge, Firefox or Safari.");
    } finally {
      setBusy(null);
    }
  }

  async function unlock() {
    if (!file) return setError("Choose a PDF to unlock.");
    if (!userPw) return setError("Enter the PDF's password.");

    setBusy("Checking the file");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const check = await runQpdf(buildIsEncryptedArgs("input.pdf"), { name: "input.pdf", data: bytes }, "");
      if (check.exitCode !== QPDF_EXIT.OK) {
        return setError("This PDF is not password protected, so there is nothing to unlock.");
      }

      setBusy("Removing the password");
      const res = await runQpdf(
        buildDecryptArgs(userPw, "input.pdf", "unlocked.pdf"),
        { name: "input.pdf", data: bytes },
        "unlocked.pdf",
      );
      if (res.exitCode !== QPDF_EXIT.OK || !res.output) {
        return setError(/invalid password/i.test(res.stderr)
          ? "The password is incorrect. Check it and try again."
          : "The PDF could not be unlocked. It may be damaged.");
      }
      setResult({ name: outputName(file.name, "-unlocked", "pdf"), blob: new Blob([res.output as BlobPart], { type: "application/pdf" }), originalSize: file.size });
    } catch {
      setError("The encryption engine could not start in this browser. Try a current version of Chrome, Edge, Firefox or Safari.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <div role="tablist" aria-label="Lock or unlock" className="grid grid-cols-2 gap-2">
          {(["lock", "unlock"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchMode(m)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium ${mode === m ? "bg-ink text-paper-raised" : "border border-ink/10 bg-paper-raised text-ink-soft"}`}>
              {m === "lock" ? "Lock a PDF" : "Unlock a PDF"}
            </button>
          ))}
        </div>

        <FileDropzone id="lock-input" label="Drop a PDF here or click to choose" hint="One PDF at a time." accept={["application/pdf"]} maxBytes={MAX_BYTES} maxCount={1} onFiles={(l) => { setFile(l[0]); setResult(null); setError(null); }} disabled={busy !== null} />
        {file && <p className="text-sm text-ink-soft">Selected: <span className="font-medium text-ink">{file.name}</span></p>}
      </div>

      <div className="space-y-5 rounded-2xl border border-ink/10 bg-paper-raised p-5">
        {mode === "lock" ? (
          <>
            <div>
              <label htmlFor="lock-pw" className="text-sm font-medium text-ink">Password to open the PDF</label>
              <input id="lock-pw" type="password" autoComplete="new-password" value={userPw} onChange={(e) => setUserPw(e.target.value)} className="field mt-2" />
            </div>
            <div>
              <label htmlFor="lock-pw2" className="text-sm font-medium text-ink">Repeat password</label>
              <input id="lock-pw2" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="field mt-2" />
            </div>
            <div>
              <label htmlFor="lock-owner" className="text-sm font-medium text-ink">Owner password (optional)</label>
              <input id="lock-owner" type="password" autoComplete="new-password" value={ownerPw} onChange={(e) => setOwnerPw(e.target.value)} className="field mt-2" />
              <p className="mt-2 text-xs leading-relaxed text-ink-mute">Controls who may change permissions. If blank, a random one is generated and never shown, so only the open password works.</p>
            </div>
            <button type="button" className="btn-primary w-full" disabled={!file || busy !== null} onClick={lock}>Lock PDF</button>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="unlock-pw" className="text-sm font-medium text-ink">Current password</label>
              <input id="unlock-pw" type="password" autoComplete="current-password" value={userPw} onChange={(e) => setUserPw(e.target.value)} className="field mt-2" />
            </div>
            <p className="text-xs leading-relaxed text-ink-mute">You must know the password. This tool removes protection; it does not guess or crack passwords.</p>
            <button type="button" className="btn-primary w-full" disabled={!file || busy !== null} onClick={unlock}>Unlock PDF</button>
          </>
        )}
      </div>

      <div className="lg:col-span-2">
        {busy && <BusyStatus message={busy} />}
        {error && <ErrorStatus message={error} />}
        {result && (
          <section aria-label="Result" className="mt-2 space-y-3">
            <SuccessStatus message={mode === "lock" ? "Your PDF is locked with AES-256 encryption." : "Your PDF is unlocked and no longer asks for a password."} />
            <ResultRow filename={result.name} blob={result.blob} originalSize={result.originalSize} />
          </section>
        )}
      </div>
    </div>
  );
}
