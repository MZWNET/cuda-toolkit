import * as core from '@actions/core'

export async function parsePackages(
  subPackages: string,
  parameterName: string,
): Promise<string[]> {
  let subPackagesArray: string[] = []
  try {
    subPackagesArray = JSON.parse(subPackages) as string[]
  }
  catch (error) {
    core.debug(`Json parsing error: ${String(error)}`)
    const errString = `Error parsing input '${parameterName}' to a JSON string array: ${subPackages}`
    core.debug(errString)
    throw new Error(errString)
  }
  return subPackagesArray
}
