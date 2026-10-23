"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 48, textAlign: "center" }}>
        <h1>Something went wrong</h1>
        <p>Please refresh the page or try again later.</p>
        <button onClick={reset} style={{ padding: "10px 18px", borderRadius: 999 }}>
          Try again
        </button>
      </body>
    </html>
  );
}
