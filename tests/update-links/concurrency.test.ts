import { mapWithConcurrency } from '@/scripts/update-links/utils/concurrency.js'

it('preserves input order in results', async () => {
  const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async n => n * 10)
  expect(result).toEqual([10, 20, 30, 40, 50])
})

it('runs workers concurrently up to the limit', async () => {
  let active = 0
  let maxActive = 0
  await mapWithConcurrency(Array.from({ length: 10 }, (_, i) => i), 3, async (n) => {
    active += 1
    maxActive = Math.max(maxActive, active)
    await new Promise(resolve => setTimeout(resolve, 5))
    active -= 1
    return n
  })
  expect(maxActive).toBe(3) // 修复前 .fill() 只起 1 个 worker → maxActive 会是 1,此断言失败
})
