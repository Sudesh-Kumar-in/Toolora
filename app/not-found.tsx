import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-5 px-5 py-28 sm:px-8">
      <p className="font-display text-7xl text-cobalt">404</p>
      <h1 className="text-4xl">This page isn&apos;t here.</h1>
      <p className="text-lg leading-relaxed text-ink-mute">
        The link may be out of date, or the tool may have moved. Search the
        full list to find what you need.
      </p>
      <Link href="/#tools" className="btn-primary mt-2">
        Browse all tools
      </Link>
    </div>
  );
}
