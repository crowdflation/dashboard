
export function getDates(startDate, stopDate) {
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

export function formatDate(date) {
  date.setHours(12);
  return date.toISOString().slice(0, 10);
}

export function parseDateString(date) {
  return new Date(Date.parse(date))
}