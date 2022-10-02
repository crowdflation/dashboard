export const periods = {'Monthly':{ slice:7, name:'Monthly'}, 'Daily':{ slice:10, name:'Daily'}, 'Hourly':{ slice:16, name:'Hourly'}};


export function getIntervalRangeArray(startDate, stopDate, period) {
  const dateArray = [];
  let currentDate = new Date(startDate);
  while (currentDate <= stopDate) {
    dateArray.push(formatDate(currentDate, period));
    currentDate = getNextPeriod(currentDate, period);
  }
  return dateArray;
}

//FIXME: PREV DAY not next?
export function getNextPeriod(date, period) {
  if(period===periods.Daily.name) {
    return new Date(date.setDate(date.getDate() + 1));
  } else if(period===periods.Monthly.name) {
    return new Date(date.setMonth(date.getMonth() + 1));
  } else if(period===periods.Hourly.name) {
    return new Date(date.setTime(date.getTime()+ (60*60*1000)));
  }

  throw new Error('Unknown period type ${period}');
}

export function formatDate(date, period) {
  if(periods[period].slice<=periods.Daily.slice) {
    date.setHours(12);
  }
  return date.toISOString().slice(0, periods[period].slice);
}

export function parseDateString(date) {
  const parsed = new Date(Date.parse(date));
  parsed.setTime( parsed.getTime() - parsed.getTimezoneOffset()*60*1000 );
  return parsed;
}

export function isValidDate(d) {
  return d instanceof Date && !isNaN(d as unknown as number);
}