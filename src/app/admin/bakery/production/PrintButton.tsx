"use client";

export default function PrintButton() {
  return (
    <button className="no-print btn-primary mt-10 w-full" onClick={() => window.print()}>
      Print this sheet
    </button>
  );
}
