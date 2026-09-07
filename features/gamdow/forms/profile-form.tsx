"use client";
import { useState } from "react";
import {
  Alert,
  Box,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from "@mui/material";
import {
  Autocomplete,
  Button,
  Dialog,
  ImageUpload,
  TextField,
} from "@/components/ui";
import { imagePresets } from "@/lib/image";
import type { ProfileInput } from "@/types/profile";
import { useLibrary } from "../library-context";
export function ProfileForm({ onClose }: { onClose: () => void }) {
  const { data, saveProfile } = useLibrary();
  const [draft, setDraft] = useState<ProfileInput>(data.profile);
  const [error, setError] = useState("");
  const field = <K extends keyof ProfileInput>(
    key: K,
    value: ProfileInput[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));
  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="profile-editor-title"
    >
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            saveProfile(draft);
            onClose();
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Could not save profile.",
            );
          }
        }}
      >
        <DialogTitle id="profile-editor-title">Edit your profile</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}
            <Box sx={{ maxWidth: 200 }}>
              <ImageUpload
                label="Profile photo"
                preset={imagePresets.avatar}
                value={draft.avatarImage}
                onImages={(images) => field("avatarImage", images[0].src)}
                onRemove={() => field("avatarImage", "")}
              />
            </Box>
            <TextField
              label="Display name"
              autoFocus
              required
              value={draft.displayName}
              onChange={(e) => field("displayName", e.target.value)}
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <TextField
              label="Username"
              value={draft.username}
              onChange={(e) => field("username", e.target.value)}
              slotProps={{ htmlInput: { maxLength: 40 } }}
              helperText="Your handle in the archive."
            />
            <TextField
              label="Bio"
              multiline
              minRows={3}
              value={draft.bio}
              onChange={(e) => field("bio", e.target.value)}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
            <TextField
              label="Location"
              value={draft.location}
              onChange={(e) => field("location", e.target.value)}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <Autocomplete
              multiple
              freeSolo
              autoSelect
              options={[
                "PC",
                "PlayStation",
                "Xbox",
                "Nintendo Switch",
                "Mobile",
              ]}
              value={draft.favoritePlatforms}
              onChange={(_, value) => field("favoritePlatforms", value)}
              renderInput={(props) => (
                <TextField
                  {...props}
                  label="Favorite platforms"
                  helperText="Choose a platform or type your own."
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            Save profile
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
