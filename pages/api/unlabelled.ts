import { connectToDatabase } from "../../lib/util/mongodb";
import {NextApiRequest, NextApiResponse} from "next";
import _ from 'lodash';
import { runMiddleware } from '../../lib/util/middleware';
import Cors from 'cors';
import {cleanupPriceName} from "../../lib/util/utils";
import {countries, countryCodesMap} from "../../data/countries";

const minimumLabelCount = 3;
const maximumMinutes = 60 * 24 * 10;

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'POST'],
});

function getCategory(vendor, name, categoryByProduct) {
  if(categoryByProduct[name]) {
    return categoryByProduct[name];
  }
  return null;
}

export async function getUnlabelled(country, language, vendor, search) {
  const {db} = await connectToDatabase();

  if (!country) {
    country = countries["United States"].code;
  }

  // @ts-ignore
  if (!countryCodesMap[country]) {
    throw new Error('Country name not found, must be in the list of country names');
  }

  let countryFilter: any = country;
  if (country === countries["United States"].code) {
    countryFilter = {$in: [country, null]};
  }

  console.log('vendorfilter', {name: vendor, country: countryFilter});

  const vendorsObj = await db.collection('_vendors').find({name: vendor, country: countryFilter}).toArray();

  if( vendorsObj?.length!== 1) {
    throw new Error('Failed to find one vendor');
  }

  const categories = await db.collection('_categories').find().toArray();
  const categoryByProduct = {};
  categories.reduce((r, item) => {
    categoryByProduct[item.name] = item.category;
  }, {});

  // Make a map for accessing prices by date and product/vendor
  const uncategorised = {};

  let searchFilter = {};
  if(search) {
    searchFilter = {name:{$regex : search, '$options' : 'i'}};
  }

  let count = 0;
  const prices = await db
      .collection(vendor)
      .find({...searchFilter, country: countryFilter})
      .limit(200)
      .toArray();

  console.log('found', prices, {...searchFilter, country: countryFilter});

  const now = new Date();
  const labels = await db.collection('_labels').find({language, $or: [ {count: { $gt: minimumLabelCount }}, { waitUntil: { $lt: now}} ] }).toArray();
  const labelsMap = {};
  labels.reduce((r, item) => {
    labelsMap[item.name] = item.count;
  }, {});

  await Promise.all(prices.map(async (price) => {
    const category = getCategory(price.vendor, price.name, categoryByProduct);
    console.log('category founds', category);
    if (!category) {
      const cleanedUpName = cleanupPriceName(price.name);
      if(labels[cleanedUpName]) {
        return;
      }

      if (!uncategorised[cleanedUpName]) {
        count++;
        uncategorised[cleanedUpName] = true;
      }
    }
  }));

  return Object.keys(uncategorised);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // Run the middleware
  await runMiddleware(req, res, cors);

  try {
    if (req.method === 'GET') {
      const {country, language, vendor, search} = req.query;
      const dataObj = await getUnlabelled(country, language, vendor, search);
      return res.status(200).json(JSON.stringify(dataObj, null, 2));
    } else if (req.method === 'POST') {
      const {db} = await connectToDatabase();
      const items = req.body;
      await items.map(async (item) => {
        const {name, category, country, language, wallet, vendor} = item;
        const filter = {name, country, language };
        const now = new Date();
        const foundBelowWU = await db
            .collection('_labels').findOne({...filter, waitUntil: { $gt: now}});

        if (foundBelowWU) {
          // TODO: Ban the wallet
          console.log('foundBelowWU', filter, foundBelowWU, now.toDateString())
          throw  new Error('Wait until it is ready yet');
        }

        //Wait for a random period of time before allowing relabelling
        const waitUntil = new Date();
        waitUntil.setMinutes(waitUntil.getMinutes() + Math.random() * maximumMinutes)
        const found = await db
            .collection('_labels').findOne(filter);
        if (!found) {
          return db.collection('_labels').insertOne({name, category, country, language, wallet, waitUntil, vendor});
        } else {
          return db.collection('_labels').updateOne(filter, {$inc: {count: 1}, $set: {waitUntil}, $push: {wallet}});
        }
      });
      return res.status(200).json({});
    }
  } catch(err) {
    console.error('err', err);
    return res.status(400).json({message:err && (err as any).toString()});
  }
}