// __tests__/animal.test.js
// 🚨 Remember to keep your `*.test.js` files out of your `/pages` directory!
import {createMocks} from 'node-mocks-http';
import * as dep from "../../lib/util/mongodb";
import categoriesMap from '../../data/map';
import handler from '../../pages/api/inflation';
import {parseDateString} from "../../lib/util/dates";

jest.mock("mongodb");

jest.mock("../../lib/util/mongodb");

const connectToDatabase = dep.connectToDatabase as jest.Mock<any>;


const mockCollection = (items) => {
  const mocked = {
    collection: (name: string) => {
      return mocked;
    },
    find: (obj: any) => {
      return mocked;
    },
    toArray: () => {
      return items;
    },
    insertOne: () => {
      return mocked;
    },
    catch: () => {
    }
  }
  return mocked;
};

const emptyCollection = mockCollection([]);


describe('/api/[inflation]', () => {
  test('returns empty list with no data', async () => {
    const {req, res} = createMocks({
      method: 'GET',
      query: {
        from: '2021-09-21',
        to: '2021-10-21',
      },
    });


    const db = emptyCollection;

    connectToDatabase.mockResolvedValue({db});

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
        "country": "US", "type": "cpiu",
        "lat": null,
        "lng": null,
        "radius": null,
        "basket": null,
        "inflationOnLastDay": 0
      }),
    );
  });

  test('returns shorter period', async () => {
    const {req, res} = createMocks({
      method: 'GET',
      query: {
        from: '2021-10-21',
        to: '2021-10-22',
      },
    });


    const db = emptyCollection;

    connectToDatabase.mockResolvedValue({db});

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
        "country": "US", "type": "cpiu",
        "lat": null,
        "lng": null,
        "radius": null,
        "basket": null,
        "inflationOnLastDay": 0
      }),
    );
  });

  test('reads and returns all params', async () => {
    const params = {
      from: '2021-10-21',
      to: '2021-10-22',
      lat: 1.2,
      lng: 1.1,
      radius: 200,
      basket: JSON.stringify(['Bread', 'Butter'])
    };

    const {req, res} = createMocks({
      method: 'GET',
      query: params,
    });


    const db = emptyCollection;

    connectToDatabase.mockResolvedValue({db});

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    //Fixme: Why parsing twice?
    expect(JSON.parse(JSON.parse(res._getData()))).toEqual(
      expect.objectContaining({
        "inflationInDayPercent": {
          "2021-10-22": 0,
        },
        "country": "US", "type": "cpiu",
        "inflationOnLastDay": 0,
        ...params,
        basket: JSON.parse(params.basket)
      }),
    );
  });


  test('reads and returns all params', async () => {
    const params = {
      from: '2021-10-21',
      to: '2021-10-22',
      lat: 1.2,
      lng: 1.1,
      radius: 200,
      basket: JSON.stringify(['Bread', 'Butter'])
    };

    const {req, res} = createMocks({
      method: 'GET',
      query: params,
    });


    const db = emptyCollection;

    connectToDatabase.mockResolvedValue({db});

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    //Fixme: Why parsing twice?
    expect(JSON.parse(JSON.parse(res._getData()))).toEqual(
      expect.objectContaining({
        "inflationInDayPercent": {
          "2021-10-22": 0,
        },
        "country": "US", "type": "cpiu",
        "inflationOnLastDay": 0,
        ...params,
        basket: JSON.parse(params.basket)
      }),
    );
  });


  test('calculate inflation', async () => {
    const params = {
      from: '2021-10-21',
      to: '2021-10-22',
      lat: null,
      lng: null,
      radius: null
    };

    const {req, res} = createMocks({
      method: 'GET',
      query: params,
    });


    const prices = [{
      name: 'bananas',
      dateTime: parseDateString('21 Oct 2021 1:00:00 GMT'),
      price: '1'
    }, {
      name: 'bananas',
      dateTime: parseDateString('22 Oct 2021 1:00:00 GMT'),
      price: '2'
    }];

    const db = {
      collection: (name: string) => {
        switch (name) {
          case '_categories':
            return mockCollection([{name: 'bananas', category: 'Food'}]);
          case 'walmart':
            return mockCollection(prices);
        }
        return emptyCollection;
      },
    };

    connectToDatabase.mockResolvedValue({db});

    //Fixme: use a proper mock
    categoriesMap['Food'] = {
      "label": "Food",
      "value": "Food",
      "cpiu": 100,
      "cpiw": 100,
      "level": 2,
      'parent': ''
    };

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    //Fixme: Why parsing twice?
    expect(JSON.parse(JSON.parse(res._getData()))).toEqual(
      expect.objectContaining({
        "inflationInDayPercent": {
          "2021-10-22": 50,
        },
        "country": "US", "type": "cpiu",
        "inflationOnLastDay": 50,
        ...params
      }),
    );
  });


  test('apply weights', async () => {
    const params = {
      from: '2021-10-21',
      to: '2021-10-22',
      lat: null,
      lng: null,
      radius: null
    };

    const {req, res} = createMocks({
      method: 'GET',
      query: params,
    });


    const prices = [{
      name: 'bananas',
      dateTime: parseDateString('21 Oct 2021 1:00:00 GMT'),
      price: '1'
    }, {
      name: 'bananas',
      dateTime: parseDateString('22 Oct 2021 1:00:00 GMT'),
      price: '2'
    }];

    const db = {
      collection: (name: string) => {
        switch (name) {
          case '_categories':
            return mockCollection([{name: 'bananas', category: 'Food'}]);
          case 'walmart':
            return mockCollection(prices);
        }
        return emptyCollection;
      },
    };

    connectToDatabase.mockResolvedValue({db});

    //Fixme: use a proper mock
    categoriesMap['Food'] = {
      "label": "Food",
      "value": "Food",
      "cpiu": 50,
      "cpiw": 50,
      "level": 2,
      'parent': ''
    };

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    //Fixme: Why parsing twice?
    expect(JSON.parse(JSON.parse(res._getData()))).toEqual(
      expect.objectContaining({
        "inflationInDayPercent": {
          "2021-10-22": 25,
        },
        "country": "US", "type": "cpiu",
        "inflationOnLastDay": 25,
        ...params
      }),
    );
  });


  test('test basket working', async () => {
    const params = {
      from: '2021-10-21',
      to: '2021-10-22',
      lat: null,
      lng: null,
      radius: null,
      basket: JSON.stringify(['Food'])
    };

    const {req, res} = createMocks({
      method: 'GET',
      query: params,
    });


    const prices = [{
      name: 'bananas',
      dateTime: parseDateString('21 Oct 2021 1:00:00 GMT'),
      price: '1'
    }, {
      name: 'bananas',
      dateTime: parseDateString('22 Oct 2021 1:00:00 GMT'),
      price: '2'
    },
      {
        name: 'pants',
        dateTime: parseDateString('21 Oct 2021 1:00:00 GMT'),
        price: '1'
      }, {
        name: 'pants',
        dateTime: parseDateString('22 Oct 2021 1:00:00 GMT'),
        price: '2'
      }];

    const db = {
      collection: (name: string) => {
        switch (name) {
          case '_categories':
            return mockCollection([{name: 'bananas', category: 'Food'}, {name: 'pants', category: 'Apparel'}]);
          case 'walmart':
            return mockCollection(prices);
        }
        return emptyCollection;
      },
    };

    connectToDatabase.mockResolvedValue({db});

    //Fixme: use a proper mock
    categoriesMap['Food'] = {
      "label": "Food",
      "value": "Food",
      "cpiu": 50,
      "cpiw": 50,
      "level": 2,
      'parent': ''
    };

    categoriesMap['Apparel'] = {
      "label": "Apparel",
      "value": "Apparel",
      "cpiu": 50,
      "cpiw": 50,
      "level": 2,
      'parent': ''
    };

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    //Fixme: Why parsing twice?
    expect(JSON.parse(JSON.parse(res._getData()))).toEqual(
      expect.objectContaining({
        "inflationInDayPercent": {
          "2021-10-22": 25,
        },
        "country": "US", "type": "cpiu",
        "inflationOnLastDay": 25,
        ...params,
        basket: JSON.parse(params.basket)
      }),
    );
  });


  test('test radius working', async () => {
    const params = {
      from: '2021-10-21',
      to: '2021-10-22',
      lat: 1,
      lng: 1,
      radius: 2,
    };

    const {req, res} = createMocks({
      method: 'GET',
      query: params,
    });


    const prices = [{
      name: 'bananas',
      dateTime: parseDateString('21 Oct 2021 1:00:00 GMT'),
      price: '1',
      latitude: 1,
      longitude: 1.
    }, {
      name: 'bananas',
      dateTime: parseDateString('22 Oct 2021 1:00:00 GMT'),
      price: '2',
      latitude: 1,
      longitude: 1.
    },
      {
        name: 'bananas',
        dateTime: parseDateString('21 Oct 2021 1:00:00 GMT'),
        price: '1',
        latitude: 400,
        longitude: 1.
      }, {
        name: 'pants',
        dateTime: parseDateString('22 Oct 2021 1:00:00 GMT'),
        price: '20',
        latitude: 400,
        longitude: 1.
      }];

    const db = {
      collection: (name: string) => {
        switch (name) {
          case '_categories':
            return mockCollection([{name: 'bananas', category: 'Food'}, {name: 'pants', category: 'Apparel'}]);
          case 'walmart':
            return mockCollection(prices);
        }
        return emptyCollection;
      },
    };

    connectToDatabase.mockResolvedValue({db});

    //Fixme: use a proper mock
    categoriesMap['Food'] = {
      "label": "Food",
      "value": "Food",
      "cpiu": 50,
      "cpiw": 50,
      "level": 2,
      'parent': ''
    };

    categoriesMap['Apparel'] = {
      "label": "Apparel",
      "value": "Apparel",
      "cpiu": 50,
      "cpiw": 50,
      "level": 2,
      'parent': ''
    };

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    //Fixme: Why parsing twice?
    expect(JSON.parse(JSON.parse(res._getData()))).toEqual(
      expect.objectContaining({
        "inflationInDayPercent": {
          "2021-10-22": 25,
        },
        "country": "US", "type": "cpiu",
        "inflationOnLastDay": 25,
        ...params
      }),
    );
  });


  test('test cpi type is working', async () => {
    const params = {
      from: '2021-10-21',
      to: '2021-10-22',
      type: 'cpiw',
    };

    const {req, res} = createMocks({
      method: 'GET',
      query: params,
    });


    const prices = [{
      name: 'bananas',
      dateTime: parseDateString('21 Oct 2021 1:00:00 GMT'),
      price: '1',
    }, {
      name: 'bananas',
      dateTime: parseDateString('22 Oct 2021 1:00:00 GMT'),
      price: '2',
    }];

    const db = {
      collection: (name: string) => {
        switch (name) {
          case '_categories':
            return mockCollection([{name: 'bananas', category: 'Food'}, {name: 'pants', category: 'Apparel'}]);
          case 'walmart':
            return mockCollection(prices);
        }
        return emptyCollection;
      },
    };

    connectToDatabase.mockResolvedValue({db});

    //Fixme: use a proper mock
    categoriesMap['Food'] = {
      "label": "Food",
      "value": "Food",
      "cpiu": 0,
      "cpiw": 50,
      "level": 2,
      'parent': ''
    };

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    //Fixme: Why parsing twice?
    expect(JSON.parse(JSON.parse(res._getData()))).toEqual(
      expect.objectContaining({
        "inflationInDayPercent": {
          "2021-10-22": 25,
        },
        "country": "US",
        "inflationOnLastDay": 25,
        ...params
      }),
    );
  });

  //TODO: test multiple periods

  //TODO: test more than one data point in period
});