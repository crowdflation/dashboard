import {NextApiRequest, NextApiResponse} from "next";
import nextSession from "next-session";
import {connectToDatabase} from "../../lib/util/mongodb";
//One Month storage
export const getSession = nextSession({cookie: {maxAge: parseInt(process.env.SESSION_MAX_AGE as string) || 32*24*60*60}});


export async function obtainSessionAndBasket(req, res, db) {
    let sid = req.cookies.sid;
    if (!sid) {
        const session = await getSession(req, res);
        sid = session.id;
        res.setHeader('set-cookie', [`sid=${sid}`])
    }

    const {vendorBaskets} = await loadBaskets(sid, db);
    return vendorBaskets;
}

export async function loadBaskets(sid, db) {
    const found = await db.collection('_baskets').findOne({session: sid});
    console.log('Loading basket', sid, found);
    return found || {vendorBaskets: {}};
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {

    const {db} = await connectToDatabase();
    console.log('called', req.method, req.body);
    let sid = req.cookies.sid;
    if(!sid) {
        const session = await getSession(req, res);
        sid = session.id;
    }
    try {
        if (req.method === 'GET') {
            const {vendorBaskets} = await loadBaskets(sid, db);
            return res.status(200).json(JSON.stringify({vendorBaskets}, null, 2));
        } else if(req.method === 'PUT') {
            const {vendorBaskets} = req.body as any;
            db.collection('_baskets').updateOne({session: req.cookies.sid}, {$set: {vendorBaskets}}, {upsert: true});
            return res.status(200).json({});
        }
    } catch(err) {
        console.error('err', err);
        return res.status(400).json({message:err && (err as any).toString()});
    }
}