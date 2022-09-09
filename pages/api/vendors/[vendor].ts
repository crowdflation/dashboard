import {NextApiRequest, NextApiResponse} from "next";
import {runMiddleware} from "../../../lib/util/middleware";
import {handleDataRequest} from "./[vendor]/[country]";
import Cors from "cors";

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'POST'],
});

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
  // Run the middleware
  await runMiddleware(req, res, cors);
  let { vendor, limit } = req.query;
  return await handleDataRequest(vendor, 'US', 0, parseInt(limit as string),req, res);
};