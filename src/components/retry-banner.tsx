export function RetryBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-950">
      <p className="text-sm leading-6">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-sm font-semibold underline underline-offset-4"
      >
        Try again
      </button>
    </div>
  );
}
