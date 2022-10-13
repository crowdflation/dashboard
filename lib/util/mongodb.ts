import {MongoClient, MongoClientOptions} from 'mongodb'
import _ from "lodash";

const MONGODB_URI = String(process.env.MONGODB_URI)
const MONGODB_DB  = String(process.env.MONGODB_DB)

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  )
}

if (!MONGODB_DB) {
  throw new Error(
    'Please define the MONGODB_DB environment variable inside .env.local'
  )
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached: any = (global as any).mongo

if (!cached) {
  cached = (global as any).mongo = { conn: null, promise: null }
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts: MongoClientOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as MongoClientOptions

    cached.promise = MongoClient.connect(MONGODB_URI, opts).then((client) => {
      return {
        client,
        db: client.db(MONGODB_DB),
      }
    })
  }
  cached.conn = await cached.promise
  return cached.conn
}


export async function getVendorNames(db, countryFilter) {
  let vendors = await db.collection('_vendors').find(countryFilter).toArray();
  vendors = vendors.map(v => v.name);
  return _.union(vendors, ['walmart', 'kroger', 'zillow']);
}

export async function createIndicesOnVendors(db) {
  const vendors = await getVendorNames(db, {});
  await Promise.all(vendors.map(v=> {
    console.log('creating index for', v);

    db.collection(v).createIndex(
        {
          name: 1,
        },
        {
          background: 1
        }
    );

    db.collection(v).createIndex(
        {
          price: 1,
        },
        {
          background: 1
        }
    );

    db.collection(v).createIndex(
        {
          dateTime: -1
        },
        {
          background: 1
        }
    );
  }));
  console.log('Indexes created for', vendors);
}




export async function getVendors(db) {
  const vendors = await db.collection('_vendors').find().toArray();
  return vendors;
}