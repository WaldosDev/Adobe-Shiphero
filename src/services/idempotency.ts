const processedKeys = new Set<string>();

export async function alreadyProcessed(key: string): Promise<boolean> {
  return processedKeys.has(key);
}

export async function markProcessed(key: string): Promise<void> {
  processedKeys.add(key);
}

export function idempotencyKey(parts: Array<string | number | undefined | null>): string {
  return parts.filter((part) => part !== undefined && part !== null && part !== "").join(":");
}
