"use client";
import { useState, type ChangeEvent } from "react";
import { Box, Popover, Stack, Typography, InputAdornment } from "@mui/material";
import { CalendarMonthOutlined, CloseRounded } from "@mui/icons-material";
import { DayPicker, type DropdownProps } from "react-day-picker";
import { format, parseISO, isValid } from "date-fns";
import { TextField, Button, IconButton, MenuItem } from "./controls";
function CalendarDropdown({
  options,
  value,
  onChange,
  disabled,
  "aria-label": label,
}: DropdownProps) {
  return (
    <TextField
      select
      size="small"
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) =>
        onChange?.(event as unknown as ChangeEvent<HTMLSelectElement>)
      }
      slotProps={{ select: { inputProps: { "aria-label": label } } }}
      sx={{
        width: "auto",
        minWidth: 85,
        "& .MuiSelect-select": { py: 0.8, pr: "27px !important", fontSize: 12 },
      }}
    >
      {options?.map((option) => (
        <MenuItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
export interface DateFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  size?: "small" | "medium";
  min?: string;
  max?: string;
}
export function DateField({
  label,
  value,
  onValueChange,
  required,
  disabled,
  size = "medium",
  min,
  max,
}: DateFieldProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const selected =
    value && isValid(parseISO(value)) ? parseISO(value) : undefined;
  return (
    <>
      <TextField
        label={label}
        size={size}
        value={selected ? format(selected, "dd MMM yyyy") : ""}
        placeholder="Choose a date"
        disabled={disabled}
        required={required}
        onClick={(e) => !disabled && setAnchor(e.currentTarget)}
        onKeyDown={(e) => {
          if (["Enter", " ", "ArrowDown"].includes(e.key)) {
            e.preventDefault();
            setAnchor(e.currentTarget);
          }
        }}
        slotProps={{
          input: {
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <CalendarMonthOutlined
                  sx={{ fontSize: 19, color: "primary.main" }}
                />
              </InputAdornment>
            ),
          },
          inputLabel: { shrink: true },
          htmlInput: { "aria-haspopup": "dialog", "aria-expanded": !!anchor },
        }}
      />
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              p: { xs: 1, sm: 2 },
              maxWidth: "calc(100vw - 32px)",
              background: "#1b211bf7",
              backdropFilter: "blur(20px)",
              borderRadius: 2,
              boxShadow: "0 24px 60px #0009",
            },
          },
        }}
      >
        <Box role="dialog" aria-label={`Choose ${label.toLowerCase()}`}>
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1,
            }}
          >
            <Typography variant="overline" color="text.secondary">
              {label}
            </Typography>
            <IconButton
              size="small"
              aria-label="Close calendar"
              onClick={() => setAnchor(null)}
            >
              <CloseRounded fontSize="small" />
            </IconButton>
          </Stack>
          <DayPicker
            className="archive-calendar"
            components={{ Dropdown: CalendarDropdown }}
            navLayout="after"
            mode="single"
            selected={selected}
            defaultMonth={selected}
            autoFocus
            captionLayout="dropdown"
            startMonth={min ? parseISO(min) : new Date(1950, 0)}
            endMonth={max ? parseISO(max) : new Date(2100, 11)}
            disabled={[
              ...(min ? [{ before: parseISO(min) }] : []),
              ...(max ? [{ after: parseISO(max) }] : []),
            ]}
            onSelect={(date) => {
              if (!date && required) return;
              onValueChange(date ? format(date, "yyyy-MM-dd") : "");
              setAnchor(null);
            }}
            showOutsideDays
          />
          <Stack
            direction="row"
            sx={{
              borderTop: 1,
              borderColor: "divider",
              pt: 1,
              mt: 1,
              justifyContent: "space-between",
            }}
          >
            <Button
              size="small"
              onClick={() => {
                const current = format(new Date(), "yyyy-MM-dd");
                if ((!min || current >= min) && (!max || current <= max)) {
                  onValueChange(current);
                  setAnchor(null);
                }
              }}
            >
              Today
            </Button>
            {!required && (
              <Button
                size="small"
                onClick={() => {
                  onValueChange("");
                  setAnchor(null);
                }}
              >
                Clear date
              </Button>
            )}
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
