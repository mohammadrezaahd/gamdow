"use client";
import { styled } from "@mui/material/styles";
import {
  Button as MuiButton,
  IconButton as MuiIconButton,
  TextField as MuiTextField,
  Autocomplete as MuiAutocomplete,
  Switch as MuiSwitch,
  Checkbox as MuiCheckbox,
  Slider as MuiSlider,
  Chip as MuiChip,
  Dialog as MuiDialog,
  Tabs as MuiTabs,
  Tab as MuiTab,
  ToggleButton as MuiToggleButton,
  ToggleButtonGroup as MuiToggleButtonGroup,
  MenuItem as MuiMenuItem,
  InputBase as MuiInputBase,
} from "@mui/material";
import { ExpandMoreRounded } from "@mui/icons-material";
import type { TextFieldProps } from "@mui/material";

// A single public control surface for every feature. Identity lives in the theme;
// wrappers own application-wide behavior and remain compatible with MUI props.
export const Button = styled(MuiButton)({
  '&[data-tone="quiet"]': {
    background: "transparent",
    borderColor: "transparent",
  },
}) as typeof MuiButton;
export const IconButton = styled(MuiIconButton)({}) as typeof MuiIconButton;
export function TextField(props: TextFieldProps) {
  return (
    <MuiTextField
      {...props}
      slotProps={{
        ...props.slotProps,
        ...(props.select
          ? {
              select: {
                IconComponent: ExpandMoreRounded,
                ...props.slotProps?.select,
              },
            }
          : {}),
      }}
    />
  );
}
export const Autocomplete = styled(MuiAutocomplete)(
  {},
) as typeof MuiAutocomplete;
export const Switch = styled(MuiSwitch)({}) as typeof MuiSwitch;
export const Checkbox = styled(MuiCheckbox)({}) as typeof MuiCheckbox;
export const Slider = styled(MuiSlider)({}) as typeof MuiSlider;
export const Chip = styled(MuiChip)({}) as typeof MuiChip;
export const Dialog = styled(MuiDialog)({}) as typeof MuiDialog;
export const Tabs = styled(MuiTabs)({}) as typeof MuiTabs;
export const Tab = styled(MuiTab)({}) as typeof MuiTab;
export const ToggleButton = styled(MuiToggleButton)(
  {},
) as typeof MuiToggleButton;
export const ToggleButtonGroup = styled(MuiToggleButtonGroup)(
  {},
) as typeof MuiToggleButtonGroup;
export const MenuItem = styled(MuiMenuItem)({}) as typeof MuiMenuItem;
export const InputBase = styled(MuiInputBase)({}) as typeof MuiInputBase;
