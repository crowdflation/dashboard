// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from 'next'
import Cors from 'cors'
import _ from 'lodash';
import { runMiddleware, tryParse } from '../../../../lib/util/middleware'
import { countries, countryCodes, countryCodesMap } from '../../../../data/countries'

// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'POST'],
});

function validateAndDenormalise(location:{latitude:number,longitude:number }) {
  const dateTime = new Date();
  //Round to hours so we can combine data
  dateTime.setMinutes(0, 0, 0);

  //Make location rought so that we can combine results
  //TODO: use kilomoters for roughtness and check with Ekon team how rought it should be
  const roughLocation = location?{latitude:parseFloat(location.latitude?.toString()).toFixed(3), longitude: parseFloat(location.longitude?.toString()).toFixed(3)}:null;
  return function(item:any) {
    if(!item.name || !item.price) {
      throw new Error('Submission data must have name and price fields');
    }
    return {...item, location: roughLocation, dateTime}
  }
}

//TODO: Validation and assigning to a user
import { connectToDatabase } from "../../../../lib/util/mongodb";
import axios from "axios";
import {cleanupPriceName} from "../../../../lib/util/utils";

const countryToLanguage = {
  "029":"EN",
  "AE":"AR",
  "AF":"PRS",
  "AL":"SQ",
  "AM":"HY",
  "AR":"ES",
  "AT":"DE",
  "AU":"EN",
  "AZ":"AZ",
  "BA":"BS",
  "BD":"BN",
  "BE":"FR",
  "BG":"BG",
  "BH":"AR",
  "BN":"MS",
  "BO":"ES",
  "BR":"PT",
  "BY":"BE",
  "BZ":"EN",
  "CA":"EN",
  "CB":"EN",
  "CH":"DE",
  "CL":"ARN",
  "CN":"BO",
  "CO":"ES",
  "CR":"ES",
  "CS":"SR",
  "CY":"EL",
  "CZ":"CS",
  "DE":"DE",
  "DK":"DA",
  "DO":"ES",
  "DZ":"AR",
  "EC":"ES",
  "EE":"ET",
  "EG":"AR",
  "ES":"CA",
  "ET":"AM",
  "FI":"FI",
  "FO":"FO",
  "FR":"BR",
  "GB":"CY",
  "GE":"KA",
  "GL":"KL",
  "GR":"EL",
  "GT":"ES",
  "HK":"ZH",
  "HN":"ES",
  "HR":"HR",
  "HU":"HU",
  "ID":"ID",
  "IE":"EN",
  "IL":"HE",
  "IN":"AS",
  "IQ":"AR",
  "IR":"FA",
  "IS":"IS",
  "IT":"IT",
  "JM":"EN",
  "JO":"AR",
  "JP":"JA",
  "KE":"SW",
  "KG":"KY",
  "KH":"KM",
  "KR":"KO",
  "KW":"AR",
  "KZ":"KK",
  "LA":"LO",
  "LB":"AR",
  "LI":"DE",
  "LK":"SI",
  "LT":"LT",
  "LU":"DE",
  "LV":"LV",
  "LY":"AR",
  "MA":"AR",
  "MC":"FR",
  "ME":"SR",
  "MK":"MK",
  "MN":"MN",
  "MO":"RO",
  "MT":"EN",
  "MV":"DV",
  "MX":"ES",
  "MY":"EN",
  "NG":"HA",
  "NI":"ES",
  "NL":"FY",
  "NO":"NB",
  "NP":"NE",
  "NZ":"EN",
  "OM":"AR",
  "PA":"ES",
  "PE":"ES",
  "PH":"EN",
  "PK":"UR",
  "PL":"PL",
  "PR":"ES",
  "PT":"PT",
  "PY":"ES",
  "QA":"AR",
  "QS":"TLH",
  "RO":"RO",
  "RS":"SR",
  "RU":"BA",
  "RW":"RW",
  "SA":"AR",
  "SD":"AR",
  "SE":"SE",
  "SG":"EN",
  "SI":"SL",
  "SK":"SK",
  "SN":"WO",
  "SP":"SR",
  "SV":"ES",
  "SY":"AR",
  "TH":"TH",
  "TJ":"TG",
  "TM":"TK",
  "TN":"AR",
  "TR":"TR",
  "TT":"EN",
  "TW":"ZH",
  "UA":"UK",
  "US":"EN",
  "UY":"ES",
  "UZ":"UZ",
  "VE":"ES",
  "VN":"VI",
  "YE":"AR",
  "ZW":"EN",
  "ZA":"AF"
};

async function getCategoriesFromModel(namesNotCategorised: string[], language) {
  const modelUrl = process.env.CATEGORISATOION_MODEL_URL as string;
  for (let i =0;i<=5;i++) {
    try {
      return await axios.post(modelUrl, {
        "product_list": namesNotCategorised,
        "lang": language.toLowerCase()
      });
    } catch (ex) {

    }
  }
  throw new Error("Timeout trying to access the model")
}

export async function handleDataRequest(vendor: string | string[], country: any, req: NextApiRequest, res: NextApiResponse<any>) {
  if (!vendor || _.includes(vendor, '_')) {
    return res.status(400).json({error: 'Non-allowed vendor name'});
  }

  if (!country) {
    country = countries["United States"].code;
  }

  // @ts-ignore
  if (!countryCodesMap[country]) {
    return res.status(400).json({
      error: 'Country name not found, must be in the list of countryNames',
      countryNames: countryCodes
    });
  }

  let countryFilter: any = country;
  if (country === countries["United States"].code) {
    countryFilter = {$in: [country, null]};
  }

  let language = countryToLanguage[country];
  if(!language) {
    language = 'EN';
  }

  let languageFilter: any = language;
  if(language ==='EN') {
    languageFilter = {$in: [language, null]};
  }

  const {db} = await connectToDatabase();
  //TODO: put methods in constants
  if (req.method === 'GET') {
    console.log('query', req.query);

    try {
      let prices = null;
      if (req.query.aggregate) {
        let what = tryParse(req.query.aggregate, null);
        if (what) {
          prices = await db
              //TODO: put shops in db or constants
              .collection(vendor)
              .aggregate(what)
              .toArray();
        }
      } else {
        const filter = {...tryParse(req.query.find, {}), country: countryFilter};
        console.log('filter', filter);
        prices = await db
            //TODO: put shops in db or constants
            .collection(vendor)
            .find(filter)
            .sort(tryParse(req.query.sort, {dateTime: -1}))
            .toArray();
      }

      //TODO: put status code in constants
      return res.status(200).json(JSON.stringify(prices, null, 2));
    } catch (e) {
      console.log(JSON.stringify(e, null, 2), (e as any).toString());
      return res.status(400).json({error: (e as any)?.toString()});
    }
  } else if (req.method === 'POST') {
    const enriched = req.body.payload.data.map(validateAndDenormalise(req.body.location));
    //Add each item from the list
    const namesFound = {};
    enriched.forEach(async function (item: any) {
      const itemFilter = {...item, country: countryFilter};
      console.log('itemFilter', itemFilter );
      const found = await db
          .collection(vendor).findOne(itemFilter);
      console.log('found', found);
      if (!found) {
        await db.collection(vendor).insertOne({...item, country});
        namesFound[cleanupPriceName(item.name)] = true;
      } else {
        //If item is found just increment the counter
        await db.collection(vendor).updateOne({...item, country: countryFilter}, {$inc: {count: 1}});
      }
    });

    await db.collection('_vendors').updateOne(
      {name: vendor, country: countryFilter},
      {$set: {name: vendor, country}},
      {
        upsert: true
      });

    res.status(200).json({});

    const namesNotCategorised:string[] = [];
    await Promise.all(Object.keys(namesFound).map(async (name)=> {
      const found = await db.collection('_categories').findOne({name, country: countryFilter, language: languageFilter});
      if(!found) {
        namesNotCategorised.push(name);
      }
    }));




    let categorised = await getCategoriesFromModel(namesNotCategorised, language);
    const confidenceThreshold = (parseFloat(process.env.CATEGORISATOION_CONFIDENCE_TRESHOLD as string)) || 0.8;

    await Promise.all(Object.keys(categorised).map(async (key)=> {
      const val = categorised[key];

      if(val?.confidence>confidenceThreshold) {
        const category = val?.prediction;
        if(category) {
          console.log('')
          await db.collection('_categories').updateOne(
              {name: key, country: countryFilter},
              {$set: {name: key, category, country, language}},
              {
                upsert: true
              });
        }
      }

    }));
    return;
  }
  return res.status(404).json({message: 'Invalid request type'});
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {

  // Run the middleware
  await runMiddleware(req, res, cors);
  let { vendor, country } = req.query;
  return await handleDataRequest(vendor, country, req, res);
};