import { parseMethod } from '../src/method.js'

it.each(['local', 'network'])(
  'parse %s method',
  async (methodString) => {
    const parsed = parseMethod(methodString)
    expect(parsed).toBe(methodString)
  },
)

it.concurrent('parse invalid method', async () => {
  const invalidMethod = 'invalidMethodString'
  expect(() => parseMethod(invalidMethod)).toThrow(
    `Invalid method string: ${invalidMethod}`,
  )
})
