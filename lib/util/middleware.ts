import {parseDateString, isValidDate} from "./dates";

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
  let jsonErr = null;
  try {
    try {
      return JSON.parse(parse);
    } catch (e1) {
      jsonErr = e1;
      const date = parseDateString(parse);
      if(isValidDate(date)) {
        return date;
      }
      throw 'Date is invalid';
    }
  } catch (e) {
    // console.warn('Parse error', e, jsonErr);
    return substitute;
  }
}

