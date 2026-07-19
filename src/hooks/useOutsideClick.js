import { useEffect } from "react";

// Calls `onOutside` when a mousedown happens outside the referenced element.
export function useOutsideClick(ref, onOutside) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onOutside(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}
