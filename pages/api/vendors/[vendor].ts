import {NextApiRequest, NextApiResponse} from "next";
import {runMiddleware} from "../../../lib/util/middleware";
import {handleDataRequest} from "./[vendor]/[country]";
import Cors from "cors";

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'POST'],
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb' // Set desired value here
    }
  }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
  // Run the middleware
  await runMiddleware(req, res, cors);
  const { vendor, limit } = req.query;
  return await handleDataRequest(vendor as string, 'US', 0, parseInt(limit as string),req, res);
}