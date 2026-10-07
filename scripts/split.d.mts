// Types of split.mjs, for the tests that import it.
export interface Part {
  file: string
  source: string
  nodes: number
}
export interface SplitOptions {
  budget?: number
  maxBytes?: number
  dir?: string
  name?: (index: number) => string
  report?: (info: unknown) => void
}
export function splitModule(code: string, options?: SplitOptions): { entry: string; parts: Part[] }
export function jsonTables(code: string): string
export function countNodes(node: unknown): number
