/** Bounded concurrency for file and network work. */

/** Run `task` for each item, at most `limit` at a time, and return the results in the order of the items. */
export async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  async function worker(): Promise<void> {
    for (let index = next++; index < items.length; index = next++) {
      const item = items[index];
      if (item !== undefined) {
        // Each worker takes the next item when its previous task ends; `limit` workers run side by side.
        // oxlint-disable-next-line no-await-in-loop
        results[index] = await task(item);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
