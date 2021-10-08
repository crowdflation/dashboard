import { connectToDatabase } from "../../lib/util/mongodb";
import {NextApiRequest, NextApiResponse} from "next";
import _ from 'lodash';
import { runMiddleware, tryParse } from '../../lib/util/middleware';
import Cors from 'cors';

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'POST'],
});

function getFloat(str) {
  const regex = /[+-]?\d+(\.\d+)?/g;
  const parsed = str?.match(regex);
  if(!parsed || !parsed[0]) {
    return null;
  }
  return parseFloat(parsed[0]);
}

function getDates(startDate, stopDate) {
  var dateArray = new Array();
  var currentDate = new Date(startDate);
  currentDate.setHours(0,0,0,0);
  while (currentDate <= stopDate) {
    dateArray.push(formatDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0,0,0,0);
  }
  return dateArray;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getCategory(vendor, name) {
  switch (vendor) {
    case 'walmart': return ' Food and beverages';
    case 'kroger': return ' Food and beverages';
    case 'zillow': return ' Housing';
  }
}

function getCategoryCPIWeight(category, which) {
  //TODO: CPI-U vs CPI-W
  switch (category) {
    case ' Food and beverages': return 15.157;
    case ' Housing': return 42.385;
  }
}


//This function takes in latitude and longitude of two location and returns the distance between them as the crow flies (in km)
function calcCrow(lat11, lon11, lat22, lon22)
{
  var R = 6371; // km
  var dLat = toRad(lat22-lat11);
  var dLon = toRad(lon22-lon11);
  var lat1 = toRad(lat11);
  var lat2 = toRad(lat22);

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c;
  return d;
}

// Converts numeric degrees to radians
function toRad(Value): number
{
  return Value * Math.PI / 180;
}

function findPrevPrice(i, pricesByDate, dates, key, productPrices, pricesByCategory) {
  for (let p = i - 1; p >= 0; p--) {
    const prev = pricesByDate[dates[p]];
    if (!prev || !prev[key]) {
      continue;
    }
    const currPricesMean = _.mean(productPrices.map((i) => i.price));
    const prevPricesMean = _.mean(prev[key].map((i) => i.price));

    const category = getCategory(productPrices[0].vendor, productPrices[0].name) as string;
    if (!pricesByCategory[category]) {
      pricesByCategory[category] = [];
    }

    pricesByCategory[category].push({currPricesMean, prevPricesMean});
    return;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // Run the middleware
  await runMiddleware(req, res, cors);

  const {db} = await connectToDatabase();

  var d = new Date();
  d.setMonth(d.getMonth() - 1);

  const from = tryParse(req.query.from, d);
  const to = tryParse(req.query.to, new Date());
  const dates = getDates(from, to);
  if(dates.length<=1) {
    throw new Error('Dates range should contain at least 2 days');
  }

  const latitude = tryParse(req.query.latitude, null);
  const longitude = tryParse(req.query.longitude, null)
  const distance = tryParse(req.query.distance, null);

  let vendors = await db.collection('_vendors').find().toArray();
  vendors = vendors.map(v => v.name);
  vendors = _.union(vendors, ['walmart', 'kroger', 'zillow']);

  // Make a map for accessing prices by date and product/vendor
  const pricesByDate = {};

  await Promise.all(vendors.map(async (vendor) => {
    let prices = await db
    //TODO: put shops in db or constants
      .collection(vendor)
      .find({dateTime:{$gte:from,$lt:to}})
      .toArray();

    prices.forEach((price) => {
      if(latitude && longitude) {
        //Skip item with no location data
        if (!price.longitude || !price.latitude) {
          return;
        } else {
          const distanceCalculated = calcCrow(price.latitude, price.longitude, latitude, longitude);
          if(distanceCalculated>distance) {
            //Measurement too far away
            return;
          }
        }
      }

      const priceDate = formatDate(price.dateTime);
      if(!pricesByDate[priceDate]) {
        pricesByDate[priceDate] = {};
      }

      const productKey = vendor + '-' + price.name;
      if(!pricesByDate[priceDate][productKey]) {
        pricesByDate[priceDate][productKey] = [];
      }

      const priceFloat = getFloat(price.price);
      if(!priceFloat) {
        return;
      }

      pricesByDate[priceDate][productKey].push({vendor, name: price.name, price: priceFloat});
    });
  }));

  const inflationInDay = {};

  for(let i = dates.length-1; i>=1; i--) {
    const current = pricesByDate[dates[i]];
    const pricesByCategory = {};
    _.map(current, (productPrices, key) => {
      //Product not found
      // console.log(key, next);
      findPrevPrice(i, pricesByDate, dates, key, productPrices, pricesByCategory);
    });

    let totalInflation = 0;

    _.map(pricesByCategory, (prices:any[], category) => {
      const currPrices = _.mean(prices.map(p => p.currPricesMean));
      const prevPrices = _.mean(prices.map(p => p.prevPricesMean));
      console.log('Curr, prev', currPrices, prevPrices, prices);

      if(!prevPrices) {
        return;
      }

      const inflationChange = 1- (prevPrices / currPrices);
      const inflationCategoryImportance = getCategoryCPIWeight(category,'CPI-U') as number /100;
      const inflationChangeByImportance = inflationChange * inflationCategoryImportance;
      console.log('inflationChangeByImportance', currPrices, prevPrices, inflationChange, inflationCategoryImportance, inflationChangeByImportance, totalInflation);
      totalInflation += inflationChangeByImportance;
      console.log(totalInflation);
    });


    const rounded = Math.round((totalInflation * 10000))/100;

    console.log(totalInflation, rounded);

    inflationInDay[dates[i]] = rounded;
  }

  return res.status(200).json({inflationInDay});
}