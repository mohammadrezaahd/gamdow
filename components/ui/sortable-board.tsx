"use client";
import { useId, useRef, useState, type ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { DragIndicatorRounded } from "@mui/icons-material";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconButton } from "./controls";
import { moveOrderedItem, type OrderGroup } from "@/lib/order";
interface Props {
  groups: OrderGroup[];
  onChange: (groups: OrderGroup[]) => void;
  renderItem: (id: string) => ReactNode;
  getLabel: (id: string) => string;
  layout?: "columns" | "grid";
}
function SortableTile({
  id,
  children,
  label,
}: {
  id: string;
  children: ReactNode;
  label: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.2 : 1,
      }}
      sx={{ position: "relative", minWidth: 0 }}
    >
      <Box sx={{ position: "absolute", zIndex: 2, left: 8, top: 8 }}>
        <IconButton
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          size="small"
          aria-label={`Drag ${label}`}
          sx={{
            cursor: "grab",
            touchAction: "none",
            background: "#111b10de",
            border: "1px solid #d3fc7233",
            color: "primary.main",
            "&:active": { cursor: "grabbing" },
          }}
        >
          <DragIndicatorRounded sx={{ fontSize: 19 }} />
        </IconButton>
      </Box>
      {children}
    </Box>
  );
}
function Group({
  group,
  children,
  layout,
}: {
  group: OrderGroup;
  children: ReactNode;
  layout: "columns" | "grid";
}) {
  const { setNodeRef, isOver } = useDroppable({ id: group.id });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        minWidth: 0,
        p: layout === "columns" ? 1.5 : 0,
        border: layout === "columns" ? "1px solid" : 0,
        borderColor: isOver ? "primary.main" : "divider",
        borderRadius: 2,
        background: isOver ? "#d3fc7208" : "transparent",
        transition: "background .15s",
        minHeight: 160,
      }}
    >
      {layout === "columns" && (
        <Box
          sx={{
            px: 0.5,
            pb: 2,
            mb: 2,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="overline" color="primary.main">
            {String(group.itemIds.length).padStart(2, "0")} ENTRIES
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.5 }}>
            {group.title}
          </Typography>
          {group.description && (
            <Typography variant="caption" color="text.secondary">
              {group.description}
            </Typography>
          )}
        </Box>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns:
            layout === "grid"
              ? {
                  xs: "repeat(2,minmax(0,1fr))",
                  sm: "repeat(3,minmax(0,1fr))",
                  lg: "repeat(auto-fill,minmax(170px,1fr))",
                }
              : "1fr",
          gap: 2,
          minHeight: 80,
        }}
      >
        {children}
        {!group.itemIds.length && (
          <Box
            sx={{
              gridColumn: "1 / -1",
              border: "1px dashed #d3fc7233",
              minHeight: 120,
              display: "grid",
              placeItems: "center",
              borderRadius: 1,
              p: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Drop a game here
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
export function SortableBoard({
  groups,
  onChange,
  renderItem,
  getLabel,
  layout = "columns",
}: Props) {
  const id = useId();
  const crossTarget = useRef<string | null>(null);
  const [draft, setDraft] = useState<OrderGroup[] | null>(null);
  const working = useRef<OrderGroup[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 7 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const collision: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    const itemHits = hits.filter((h) =>
      (working.current ?? groups).some((g) => g.itemIds.includes(String(h.id))),
    );
    return itemHits.length
      ? itemHits
      : hits.length
        ? hits
        : closestCorners(args);
  };
  const cancel = () => {
    crossTarget.current = null;
    working.current = null;
    setDraft(null);
    setActive(null);
  };
  const over = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const current = working.current ?? groups;
    const source = current.find((g) => g.itemIds.includes(String(active.id)));
    const target = current.find(
      (g) => g.id === String(over.id) || g.itemIds.includes(String(over.id)),
    );
    if (source && target && source.id !== target.id) {
      const next = moveOrderedItem(current, String(active.id), String(over.id));
      crossTarget.current = String(over.id);
      working.current = next;
      setDraft(next);
    }
  };
  const finish = ({ active, over }: DragEndEvent) => {
    if (over) {
      const next =
        crossTarget.current === String(over.id)
          ? (working.current ?? groups)
          : moveOrderedItem(
              working.current ?? groups,
              String(active.id),
              String(over.id),
            );
      onChange(next);
    }
    cancel();
  };
  const visible = draft ?? groups;
  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={({ active }) => {
        crossTarget.current = null;
        working.current = groups.map((g) => ({
          ...g,
          itemIds: [...g.itemIds],
        }));
        setDraft(working.current);
        setActive(String(active.id));
      }}
      onDragOver={over}
      onDragEnd={finish}
      onDragCancel={cancel}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Press Space to pick up a game. Use arrow keys to move it, Space to drop, or Escape to cancel.",
        },
        announcements: {
          onDragStart: ({ active }) =>
            `Picked up ${getLabel(String(active.id))}.`,
          onDragOver: ({ active, over }) =>
            over
              ? `Moving ${getLabel(String(active.id))} over ${visible.find((g) => g.id === String(over.id))?.title ?? getLabel(String(over.id))}.`
              : undefined,
          onDragEnd: ({ active, over }) =>
            over
              ? `Dropped ${getLabel(String(active.id))}.`
              : "Move cancelled.",
          onDragCancel: () => "Move cancelled.",
        },
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns:
            layout === "columns"
              ? {
                  xs: "1fr",
                  sm: "repeat(2,minmax(0,1fr))",
                  xl: "repeat(4,minmax(0,1fr))",
                }
              : "1fr",
          gap: 2,
        }}
      >
        {visible.map((group) => (
          <Group key={group.id} group={group} layout={layout}>
            <SortableContext
              items={group.itemIds}
              strategy={
                layout === "grid"
                  ? rectSortingStrategy
                  : verticalListSortingStrategy
              }
            >
              {group.itemIds.map((item) => (
                <SortableTile key={item} id={item} label={getLabel(item)}>
                  {renderItem(item)}
                </SortableTile>
              ))}
            </SortableContext>
          </Group>
        ))}
      </Box>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <Box
            sx={{
              pointerEvents: "none",
              transform: "rotate(2deg)",
              boxShadow: "0 30px 60px #0009",
              border: "1px solid #d3fc72",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {renderItem(active)}
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
