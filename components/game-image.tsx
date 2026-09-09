"use client";
import { useState } from "react";
import { artworkFallbacks } from "@/lib/steam-artwork";
import { Box, type SxProps, type Theme } from "@mui/material";
export function GameImage({
  src,
  alt = "",
  sx,
}: {
  src?: string;
  alt?: string;
  sx?: SxProps<Theme>;
}) {
  const [failure, setFailure] = useState({ source: "", index: 0 });
  const index = failure.source === src ? failure.index : 0;
  const candidates = [
    src || "/game-placeholder.svg",
    ...artworkFallbacks(src),
    "/game-placeholder.svg",
  ];
  return (
    <Box
      component="img"
      src={candidates[Math.min(index, candidates.length - 1)]}
      alt={alt}
      loading="lazy"
      onError={() => {
        if (index < candidates.length - 1)
          setFailure({ source: src || "", index: index + 1 });
      }}
      sx={sx}
    />
  );
}
