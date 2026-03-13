"use client";
import { useEffect, useState } from "react";

export const useIsMobileDevice = (maxWidth = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = `(max-width: ${maxWidth}px)`;
    const media = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setIsMobile(event.matches);

    setIsMobile(media.matches);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [maxWidth]);

  return isMobile;
};
