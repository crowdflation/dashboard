import { connectToDatabase } from "../../lib/util/mongodb";
import {NextApiRequest, NextApiResponse} from "next";
import _ from 'lodash';
import { runMiddleware, tryParse } from '../../lib/util/middleware';
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

export async function calculateCategoriesCount(all) {
  const {db} = await connectToDatabase();


  const now = new Date();
  const from = new Date(now.setDate(now.getDate() - 1));
  const to = new Date();

  let filter:any = {dateTime: {$gte: from, $lt: to}};
  if(all) {
    filter = {};
  }


  let vendors = await db.collection('_vendors').find().toArray();
  vendors = vendors.map(v => v.name);
  vendors = _.union(vendors, ['walmart', 'kroger', 'zillow']);

  const categories = await db.collection('_categories').find().toArray();
  const categoryByProduct = {};
  categories.reduce((r, item) => {
    categoryByProduct[item.name] = item.category;
  }, {});

  // Make a map for accessing prices by date and product/vendor
  const categoriesCount = {};

  await Promise.all(vendors.map(async (vendor) => {
    const prices = await db
      .collection(vendor)
      .find(filter)
      .toArray();

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

  const {all} = req.query;
  // Run the middleware
  await runMiddleware(req, res, cors);
  const dataObj = await calculateCategoriesCount(all);

  return res.status(200).json(JSON.stringify(dataObj, null, 2));
}