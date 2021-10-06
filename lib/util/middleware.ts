
// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
export function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result)
      }

      return resolve(result)
    })
  })
}

export function tryParse(parse, substitute) {
  try {
    return JSON.parse(parse);
  } catch (e) {
    return substitute;
  }
}