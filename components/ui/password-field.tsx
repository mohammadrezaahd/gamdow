"use client";
import { useState } from "react";
import { InputAdornment, type TextFieldProps } from "@mui/material";
import { VisibilityOffOutlined, VisibilityOutlined } from "@mui/icons-material";
import { IconButton, TextField } from "./controls";
export type PasswordFieldProps = Omit<TextFieldProps, "type" | "slotProps">;
export function PasswordField({
  label = "Password",
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      label={label}
      type={visible ? "text" : "password"}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={`${visible ? "Hide" : "Show"} ${String(label).toLowerCase()}`}
                aria-pressed={visible}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setVisible((value) => !value)}
                edge="end"
              >
                <>
                  {visible ? (
                    <VisibilityOffOutlined fontSize="small" />
                  ) : (
                    <VisibilityOutlined fontSize="small" />
                  )}
                </>
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
