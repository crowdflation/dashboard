import {parseDateString} from "./dates";

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
    try {
      return JSON.parse(parse);
    } catch (e1) {

      return parseDateString(parse);
    }
  } catch (e) {
    console.error('Parse error', e);
    return substitute;
  }
}

