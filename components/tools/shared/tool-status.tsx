import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export function BusyStatus({ message, progress }: { message: string; progress?: number }) {
  return (
    <div role="status" aria-live="polite" className="mt-6 rounded-2xl border border-ink/10 bg-paper-raised p-5">
      <div className="flex items-center gap-3 text-sm font-medium text-ink">
        <Loader2 className="h-4 w-4 animate-spin text-cobalt" aria-hidden="true" />
        {message}
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-sunk" aria-hidden="true">
          <div
            className="h-full rounded-full bg-cobalt transition-all duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function ErrorStatus({ message }: { message: string }) {
  return (
    <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function SuccessStatus({ message }: { message: string }) {
  return (
    <div role="status" className="mt-6 flex items-start gap-3 rounded-2xl border border-cobalt/20 bg-cobalt-wash p-4 text-sm text-ink">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
