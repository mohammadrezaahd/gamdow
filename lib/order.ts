export interface OrderGroup {
  id: string;
  title: string;
  description?: string;
  itemIds: string[];
}
export function moveOrderedItem(
  groups: OrderGroup[],
  itemId: string,
  targetId: string,
): OrderGroup[] {
  const source = groups.find((g) => g.itemIds.includes(itemId));
  const target = groups.find(
    (g) => g.id === targetId || g.itemIds.includes(targetId),
  );
  if (!source || !target || itemId === targetId) return groups;
  const from = source.itemIds.indexOf(itemId);
  const targetIndex = target.itemIds.indexOf(targetId);
  if (source.id === target.id) {
    const ids = [...source.itemIds];
    ids.splice(from, 1);
    ids.splice(targetIndex < 0 ? ids.length : targetIndex, 0, itemId);
    return groups.map((g) => (g.id === source.id ? { ...g, itemIds: ids } : g));
  }
  return groups.map((g) =>
    g.id === source.id
      ? { ...g, itemIds: g.itemIds.filter((id) => id !== itemId) }
      : g.id === target.id
        ? {
            ...g,
            itemIds: [
              ...g.itemIds.slice(
                0,
                targetIndex < 0 ? g.itemIds.length : targetIndex,
              ),
              itemId,
              ...g.itemIds.slice(
                targetIndex < 0 ? g.itemIds.length : targetIndex,
              ),
            ],
          }
        : g,
  );
}
