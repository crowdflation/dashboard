// __tests__/animal.test.js
// 🚨 Remember to keep your `*.test.js` files out of your `/pages` directory!
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/inflation';


jest.mock("mongodb");

import * as dep from "../../lib/util/mongodb";
jest.mock("../../lib/util/mongodb");

const connectToDatabase = dep.connectToDatabase as jest.Mock<any>;



describe('/api/[inflation]', () => {
  test('returns empty list with no data', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        from: '2021-09-21',
        to: '2021-10-21',
      },
    });


    const db = {
      collection: (name: string) => {
        return db;
      },
      find: (obj: any) => {
        return db;
      },
      toArray: () => {
        return [];
      }
    };

    connectToDatabase.mockResolvedValue({ db });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    //Fixme: Why parsing twice?
    expect(JSON.parse(JSON.parse(res._getData()))).toEqual(
      expect.objectContaining({
        "inflationInDayPercent": {
          "2021-10-21": 0,
          "2021-10-20": 0,
          "2021-10-19": 0,
          "2021-10-18": 0,
          "2021-10-17": 0,
          "2021-10-16": 0,
          "2021-10-15": 0,
          "2021-10-14": 0,
          "2021-10-13": 0,
          "2021-10-12": 0,
          "2021-10-11": 0,
          "2021-10-10": 0,
          "2021-10-09": 0,
          "2021-10-08": 0,
          "2021-10-07": 0,
          "2021-10-06": 0,
          "2021-10-05": 0,
          "2021-10-04": 0,
          "2021-10-03": 0,
          "2021-10-02": 0,
          "2021-10-01": 0,
          "2021-09-30": 0,
          "2021-09-29": 0,
          "2021-09-28": 0,
          "2021-09-27": 0,
          "2021-09-26": 0,
          "2021-09-25": 0,
          "2021-09-24": 0,
          "2021-09-23": 0,
          "2021-09-22": 0
        },
        "from": "2021-09-21",
        "to": "2021-10-21",
        "country": "US",
        "latitude": null,
        "longitude": null,
        "distance": null,
        "basket": null,
        "inflationOnLastDay": 0
      }),
    );
  });

  test('returns shorter period', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        from: '2021-10-21',
        to: '2021-10-22',
      },
    });


    const db = {
      collection: (name: string) => {
        return db;
      },
      find: (obj: any) => {
        return db;
      },
      toArray: () => {
        return [];
      }
    };

    connectToDatabase.mockResolvedValue({ db });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    //Fixme: Why parsing twice?
    expect(JSON.parse(JSON.parse(res._getData()))).toEqual(
      expect.objectContaining({
        "inflationInDayPercent": {
          "2021-10-22": 0,
        },
        "from": "2021-10-21",
        "to": "2021-10-22",
        "country": "US",
        "latitude": null,
        "longitude": null,
        "distance": null,
        "basket": null,
        "inflationOnLastDay": 0
      }),
    );
  });
});