export type TaxonomyKind = "genre" | "series";
export interface TaxonomyRecord {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}
export interface Genre extends TaxonomyRecord {
  kind: "genre";
}
export interface GameSeries extends TaxonomyRecord {
  kind: "series";
}
export type TaxonomyEntry = Genre | GameSeries;
export interface TaxonomyInput {
  name: string;
  description: string;
}
export interface TaxonomyMutation {
  kind: TaxonomyKind;
  id?: string;
  input: TaxonomyInput;
}
export interface TaxonomyRepository {
  list(kind: TaxonomyKind): Promise<TaxonomyEntry[]>;
  create(kind: TaxonomyKind, input: TaxonomyInput): Promise<TaxonomyEntry>;
  update(
    kind: TaxonomyKind,
    id: string,
    input: TaxonomyInput,
  ): Promise<TaxonomyEntry>;
  remove(kind: TaxonomyKind, id: string): Promise<void>;
}
