export async function fetchText(url: string, errorLabel: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${errorLabel}: ${response.status} ${response.statusText}`)
  }
  return response.text()
}
