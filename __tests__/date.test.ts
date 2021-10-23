import {parseDateString,formatDate} from "../lib/util/dates";



describe('Date Utils', () => {
  test('can parse and format data correctly', async () => {
    const dateString = '2021-10-10';
    const date = parseDateString(dateString);
    const formattedDate = formatDate(date);
    expect(formattedDate).toEqual(dateString);
  });
});