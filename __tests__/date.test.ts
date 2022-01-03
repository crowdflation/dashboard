import {parseDateString, formatDate, getNextPeriod, getIntervalRangeArray} from "../lib/util/dates";

describe('Date Utils', () => {
  test('can parse and format data correctly', async () => {
    const dateString = '2021-10-10';
    const date = parseDateString(dateString);
    const formattedDate = formatDate(date, 'Daily');
    expect(formattedDate).toEqual(dateString);
  });
  test('can parse and format monthly data correctly', async () => {
    const dateString = '2021-10';
    const date = parseDateString(dateString);
    const formattedDate = formatDate(date, 'Monthly');
    expect(formattedDate).toEqual(dateString);
  });

  test('can parse and format hourly data correctly', async () => {
    const dateString = '2021-10-11T10:00';
    const date = parseDateString(dateString);
    const formattedDate = formatDate(date, 'Hourly');
    expect(formattedDate).toEqual(dateString);
    const next = getNextPeriod(date, 'Hourly');
    expect(formatDate(next, 'Hourly')).toEqual('2021-10-11T11:00');
  });

  test('can parse and format monthly data correctly', async () => {
    const dateString = '2021-10';
    const date = parseDateString(dateString);
    let newDate = getNextPeriod(date, 'Monthly')
    let formattedDate = formatDate(newDate, 'Monthly');
    expect(formattedDate).toEqual('2021-11');
    newDate = getNextPeriod(newDate, 'Monthly');
    newDate = getNextPeriod(newDate, 'Monthly');
    formattedDate = formatDate(newDate, 'Monthly');
    expect(formattedDate).toEqual('2022-01');
  });

  test('data range is returned correctly', async () => {
    const dateStringFrom = '2021-10-11T10:00';
    const dateStringTo = '2021-10-11T11:00';
    const interval = getIntervalRangeArray(parseDateString(dateStringFrom),parseDateString(dateStringTo), 'Hourly');
    expect(interval).toEqual([dateStringFrom, dateStringTo]);
  });
});