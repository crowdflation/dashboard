import { connectToDatabase } from "../../lib/util/mongodb";
import {NextApiRequest, NextApiResponse} from "next";
import _ from 'lodash';
import { runMiddleware, tryParse } from '../../lib/util/middleware';
import { getPrevDay, getDates, formatDate } from '../../lib/util/dates';
import { sha256 } from 'js-sha256';
import Cors from 'cors';
import categoriesMap from '../../data/map';



// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'POST'],
});


function getCategory(vendor, name, categoryByProduct) {
  if(categoryByProduct[name]) {
    return categoryByProduct[name];
  }
  switch (vendor) {
    case 'walmart': return 'Food and beverages';
    case 'kroger': return 'Food and beverages';
    case 'zillow': return 'Housing';
  }
  return null;
}


function findParent(name, where) {
  if(where[name]) {
    return true;
  }

  if(!categoriesMap[name]) {
    return false;
  }

  if(categoriesMap[name].parent) {
    return findParent(categoriesMap[name].parent, where);
  }
  return false;
}

export async function calculateCategoriesCount() {
  const {db} = await connectToDatabase();


  const now = new Date();
  const from = new Date(now.setDate(now.getDate() - 1));
  const to = new Date();


  let vendors = await db.collection('_vendors').find().toArray();
  vendors = vendors.map(v => v.name);
  vendors = _.union(vendors, ['walmart', 'kroger', 'zillow']);

  let categories = await db.collection('_categories').find().toArray();
  let categoryByProduct = {};
  categories.reduce((r, item) => {
    categoryByProduct[item.name] = item.category;
  }, {});

  // Make a map for accessing prices by date and product/vendor
  const categoriesCount = {};

  await Promise.all(vendors.map(async (vendor) => {
    let prices = await db
      .collection(vendor)
      .find({dateTime: {$gte: from, $lt: to}})
      .toArray();

    console.log('gor prices',  vendor,{dateTime: {$gte: from.toISOString(), $lt: to.toISOString()}}, prices);

    await Promise.all(prices.map(async (price) => {
      let category = getCategory(price.vendor, price.name, categoryByProduct);

      if(!category) {
        category = 'Unknown';
      }

      if(!categoriesCount[category]) {
        categoriesCount[category] = 1;
      } else {
        categoriesCount[category]++;
      }
    }));
  }));


  return categoriesCount;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // Run the middleware
  await runMiddleware(req, res, cors);
  const dataObj = await calculateCategoriesCount();

  return res.status(200).json(JSON.stringify(dataObj, null, 2));
}