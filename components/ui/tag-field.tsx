"use client";
import { useState } from "react";
import { Autocomplete, TextField } from "./controls";
import { normalizeTags } from "@/lib/tags";
export interface TagFieldProps {
  label?: string;
  value: string[];
  suggestions?: string[];
  onChange: (tags: string[]) => void;
}
export function TagField({
  label = "Tags",
  value,
  suggestions = [],
  onChange,
}: TagFieldProps) {
  const [input, setInput] = useState("");
  return (
    <Autocomplete
      multiple
      freeSolo
      filterSelectedOptions
      options={suggestions}
      value={value}
      inputValue={input}
      onInputChange={(_, next) => setInput(next)}
      onChange={(_, next) => {
        onChange(normalizeTags(next));
        setInput("");
      }}
      onBlur={() => {
        if (input.trim()) onChange(normalizeTags([...value, input]));
        setInput("");
      }}
      sx={{ "& .MuiChip-root": { maxWidth: "100%" } }}
      renderInput={(props) => (
        <TextField
          {...props}
          label={label}
          helperText="Type any name or keyword and press Enter. Add as many as you like."
        />
      )}
    />
  );
}
