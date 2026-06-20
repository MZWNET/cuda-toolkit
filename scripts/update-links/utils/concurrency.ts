export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length })
  let nextIndex = 0

  const runWorker = async () => {
    while (true) {
      const current = nextIndex
      nextIndex += 1
      if (current >= items.length)
        break
      results[current] = await worker(items[current], current)
    }
  }

  // 用 Array.from 的工厂回调(不要 .fill(runWorker()))让每个槽各自启动一个 worker 循环。
  // .fill 会复用同一个 promise,导致退化成串行——这正是本次重构要修的并发 bug。
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker())
  await Promise.all(workers)
  return results
}
