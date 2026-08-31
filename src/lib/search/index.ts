/**
 * The search module. Import from `@/lib/search`, never from the files inside.
 *
 * One provider is exported today. Swapping the implementation - a vector index,
 * a hosted engine - is a change to this file, because everything downstream
 * depends on the `SearchProvider` port rather than on PostgreSQL.
 */
export { postgresSearchProvider } from './postgres.ts';
export type {
  CategorySuggestion,
  RankedProduct,
  SearchOptions,
  SearchProvider,
} from './provider.ts';
export { buildSearchDocument, type SearchDocumentInput } from './document.ts';
export { normalizeSearchText, parseSearchQuery, SYNONYM_GROUPS } from './normalize.ts';
