"use client";
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
  return (
    <Box
      component="img"
      src={src || "/game-placeholder.svg"}
      alt={alt}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = "/game-placeholder.svg";
      }}
      sx={sx}
    />
  );
}
