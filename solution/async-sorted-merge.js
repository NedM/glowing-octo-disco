"use strict";

const MAX_NUM_LOGS_TO_READ_AHEAD = 5

// Print all entries, across all of the *async* sources, in chronological order.
const fillNextLogsArray = (source, nextLogsArray) => {
  if(!source) { throw new Error('Log source not valid') }

  while (nextLogsArray.length < MAX_NUM_LOGS_TO_READ_AHEAD) {
    // Call popAsync to request log message but do not block waiting for
    // promise to be fulfilled.

    // ERROR: This strategy appears to trigger a race condition!
    nextLogsArray.push(source.popAsync());
  }

  return nextLogsArray;
}

const getIndexOfNextLogObject = (logObjs) => {
  let nextIndex = null

  /*
    Iterate through the log object array and find the index of the object
    with the next log message in chronological sequence by comparing log dates
    with a minimum.

    This method is O(n) time complexity where n is the number of log sources.
  */
  logObjs.forEach((obj, index) => {
    if (!obj.nextLog) { return; }

    if (nextIndex === null || obj.nextLog.date < logObjs[nextIndex].nextLog.date) {
      nextIndex = index;
    }
  });

  return nextIndex;
}

const updateLogObject = async (logObj) => {
  if (!logObj.nextLogsPromises || logObj.nextLogsPromises.length === 0) {
    logObj.nextLog = null
    return;
  }

  const nextLogPromise = logObj.nextLogsPromises.shift();
  logObj.nextLog = await nextLogPromise;

  if (logObj.nextLog) {
    fillNextLogsArray(logObj.source, logObj.nextLogsPromises);
  }

  return;
}

const populateNextLogs = async (logObjs) => {
  const nextLogPromises = logObjs.map((logObj) => {
    return updateLogObject(logObj).then(() => logObj.nextLog);
  });

  await Promise.all(nextLogPromises);
}


const logsRemain = (logObjs) => {
  return logObjs.some((obj) => !!obj.nextLog);
}


module.exports = async (logSources, printer) => {
  // Similar to synchronous solution, create object array to hold sources and next logs
  const logsObjArray = logSources.map((source) => {
    return {
      source: source,
      nextLog: null,
      nextLogsPromises: fillNextLogsArray(source, []) // Array of promises. We are attempting to read ahead to give the async logs time to populate
    }
  });

  do {
    /*
      We cannot make any assessment of log ordering until we have waited for
      all sources to return at least 1 result (even if that result indicates the log is drained)
      We must block execution until all the nextLog values are resolved
    */
    await populateNextLogs(logsObjArray);

    // Now this problem reduces to the synchonous case since we should have the next log for
    // each source
    const nextLogIndex = getIndexOfNextLogObject(logsObjArray);

    if (nextLogIndex === null) { break; }

    printer.print(logsObjArray[nextLogIndex].nextLog);

    updateLogObject(logsObjArray[nextLogIndex])

  } while(logsRemain(logsObjArray))

  printer.done();

  return new Promise((resolve, reject) => {
    resolve(console.log("Async sort complete."));
  });
};
