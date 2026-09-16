export function PaymentTestModeBanner() {
  const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

  if (!clientToken) {
    return (
      <div className="w-full bg-destructive/15 border-b border-destructive/30 px-4 py-2 text-center text-sm text-destructive">
        Production checkout is not configured. Complete payments go-live in your Lovable project to accept real payments.
      </div>
    );
  }

  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-amber-100 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-center text-sm text-amber-900 dark:text-amber-200">
        All card payments made in the preview are in test mode.{" "}
        <a
          href="https://docs.lovable.dev/features/payments#test-and-live-environments"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium"
        >
          Read more
        </a>
      </div>
    );
  }

  return null;
}
