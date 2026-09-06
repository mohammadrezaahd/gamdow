"use client";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import {
  AddPhotoAlternateOutlined,
  CloseRounded,
  CropRounded,
  FileUploadOutlined,
  ZoomInRounded,
  ZoomOutRounded,
} from "@mui/icons-material";
import Cropper from "react-easy-crop";
import { Button, Dialog, IconButton, Slider } from "./controls";
import {
  acceptedImages,
  cropImage,
  validateImage,
  type CropPixels,
  type ImagePreset,
  type UploadedImage,
} from "@/lib/image";
import { GameImage } from "@/components/game-image";
interface PendingImage {
  src: string;
  name: string;
}
export interface ImageUploadProps {
  label: string;
  preset: ImagePreset;
  value?: string;
  multiple?: boolean;
  onImages: (images: UploadedImage[]) => void;
  onRemove?: () => void;
}
export function ImageUpload({
  label,
  preset,
  value,
  multiple = false,
  onImages,
  onRemove,
}: ImageUploadProps) {
  const [queue, setQueue] = useState<PendingImage[]>([]);
  const [index, setIndex] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<CropPixels | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const output = useRef<UploadedImage[]>([]);
  const alive = useRef(true);
  const urls = useRef<string[]>([]);
  const session = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const current = queue[index];
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      urls.current.forEach(URL.revokeObjectURL);
    };
  }, []);
  const close = () => {
    session.current++;
    setQueue([]);
    setIndex(0);
    output.current = [];
    urls.current.forEach(URL.revokeObjectURL);
    urls.current = [];
    setPixels(null);
    setError("");
  };
  const choose = async (files: File[]) => {
    if (!files.length || busy) return;
    if (files.length > (multiple ? 12 : 1)) {
      setError(
        multiple
          ? "Choose up to 12 images per batch."
          : "Choose one image for this slot.",
      );
      return;
    }
    const run = ++session.current;
    setBusy(true);
    setError("");
    const pending: PendingImage[] = [];
    try {
      for (const f of files.slice(0, multiple ? 12 : 1)) {
        const src = await validateImage(f);
        if (!alive.current || run !== session.current) {
          URL.revokeObjectURL(src);
          return;
        }
        urls.current.push(src);
        pending.push({ src, name: f.name });
      }
      if (alive.current) {
        output.current = [];
        setQueue(pending);
        setIndex(0);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setPixels(null);
      }
    } catch (e) {
      pending.forEach((p) => URL.revokeObjectURL(p.src));
      if (alive.current)
        setError(e instanceof Error ? e.message : "Could not open image.");
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const save = async () => {
    if (!current || !pixels || busy) return;
    const run = session.current;
    setBusy(true);
    setError("");
    try {
      const image = await cropImage(current.src, pixels, preset, current.name);
      if (!alive.current || run !== session.current) return;
      output.current.push(image);
      if (index < queue.length - 1) {
        setIndex(index + 1);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setPixels(null);
      } else {
        onImages([...output.current]);
        close();
      }
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Crop could not be saved.");
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  return (
    <Box>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "block", mb: 1 }}
      >
        {label} / {preset.width} × {preset.height}
      </Typography>
      <Box
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void choose(Array.from(e.dataTransfer.files));
        }}
        sx={{
          position: "relative",
          border: "1px dashed",
          borderColor: over ? "primary.main" : "#d3fc7244",
          background: over ? "#d3fc7215" : "#0f140fb3",
          borderRadius: 2,
          overflow: "hidden",
          minHeight: 148,
        }}
      >
        {value ? (
          <>
            <GameImage
              src={value}
              alt={`${label} preview`}
              sx={{
                width: "100%",
                aspectRatio: `${preset.width} / ${preset.height}`,
                maxHeight: 230,
                objectFit: "contain",
                display: "block",
              }}
            />
            <Stack
              direction="row"
              spacing={1}
              sx={{ p: 1.5, justifyContent: "center" }}
            >
              <Button
                size="small"
                startIcon={<FileUploadOutlined />}
                onClick={() => input.current?.click()}
                disabled={busy}
              >
                Replace
              </Button>
              {value.startsWith("data:") && (
                <Button
                  size="small"
                  startIcon={<CropRounded />}
                  onClick={() => {
                    setQueue([{ src: value, name: label }]);
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                    setPixels(null);
                  }}
                >
                  Crop
                </Button>
              )}
              {onRemove && (
                <IconButton
                  size="small"
                  aria-label={`Remove ${label.toLowerCase()}`}
                  onClick={onRemove}
                >
                  <CloseRounded fontSize="small" />
                </IconButton>
              )}
            </Stack>
          </>
        ) : (
          <Button
            onClick={() => input.current?.click()}
            disabled={busy}
            sx={{
              display: "flex",
              flexDirection: "column",
              minHeight: 148,
              width: "100%",
              gap: 1,
              color: "text.secondary",
              py: 3,
            }}
          >
            <AddPhotoAlternateOutlined
              sx={{ color: "primary.main", fontSize: 29 }}
            />
            <Typography sx={{ fontSize: 12, color: "text.primary" }}>
              {busy
                ? "Opening image…"
                : `Drop ${multiple ? "images" : "an image"} here or browse`}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 10 }}>
              JPG, PNG, WEBP · UP TO 20 MB EACH · FIXED CROP
            </Typography>
          </Button>
        )}
        <input
          ref={input}
          hidden
          type="file"
          accept={acceptedImages}
          multiple={multiple}
          aria-label={`Upload ${label.toLowerCase()}`}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            void choose(files);
          }}
        />
      </Box>
      {error && !current && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      <Dialog
        open={!!current}
        onClose={() => !busy && close()}
        fullWidth
        maxWidth="md"
        transitionDuration={0}
      >
        <DialogTitle>
          Find the frame
          <Typography variant="body2" color="text.secondary">
            {preset.label} · {index + 1} / {queue.length} · Drag to position,
            pinch or use the slider to zoom.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              position: "relative",
              height: { xs: 320, sm: 420 },
              background: "#090c09",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {current && (
              <Cropper
                key={current.src + index}
                image={current.src}
                crop={crop}
                zoom={zoom}
                aspect={preset.width / preset.height}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, p) => setPixels(p)}
                onMediaLoaded={() => setError("")}
                cropShape="rect"
                showGrid
                restrictPosition
                zoomWithScroll={false}
                style={{
                  cropAreaStyle: {
                    border: "1px solid #d3fc72",
                    boxShadow: "0 0 0 9999em #050905bb",
                    borderRadius: 4,
                  },
                }}
              />
            )}
          </Box>
          <Stack
            direction="row"
            spacing={2}
            sx={{ mt: 2, alignItems: "center" }}
          >
            <ZoomOutRounded color="action" />
            <Slider
              aria-label="Image zoom"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(_, v) => setZoom(v as number)}
            />
            <ZoomInRounded color="action" />
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void save()}
            disabled={!pixels || busy}
          >
            {busy
              ? "Processing…"
              : index < queue.length - 1
                ? "Crop & next"
                : "Use cropped image"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
