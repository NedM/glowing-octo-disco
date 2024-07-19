"use strict";

// Print all entries, across all of the *async* sources, in chronological order.

const getIndexOfNextLogObject = (nextLogs) => {
  let nextIndex = null

  /*
    Iterate through the log object array and find the index of the object
    with the next log message in chronological sequence by comparing log dates
    with a minimum.

    This method is O(n) time complexity where n is the number of log sources.
  */
  nextLogs.forEach((log, index) => {
    if (!log) { return; }

    if (nextIndex === null || log.date < nextLogs[nextIndex].date) {
      nextIndex = index;
    }
  });

  return nextIndex;
}

module.exports = async (logSources, printer) => {
  // Similar to synchronous solution, create object array to hold sources and next logs
  const logsObjArray = logSources.map((source) => {
    return {
      source: source,
      nextLogPromise: source.popAsync(),
    }
  });

  do {
    /*
      We cannot make any assessment of log ordering until we have waited for
      all sources to return at least 1 result (even if that result indicates the log is drained)
      We must block execution until all the nextLog values are resolved.

      This is a performance bottleneck.
    */
    const nextLogsPromises = logsObjArray.map((logObj) => logObj.nextLogPromise);
    /*
      There is a design flaw here in that we are creating a new array
      that is not tied to the original object directly. We are relying on
      #map() and Promise.all to maintain insertion ordering.
    */
    const nextLogs = await Promise.all(nextLogsPromises);

    // Now this problem reduces to the synchonous case since we
    // should have the next log for each source
    const nextLogIndex = getIndexOfNextLogObject(nextLogs);

    if (nextLogIndex === null) { break; }

    printer.print(nextLogs[nextLogIndex]);

    logsObjArray[nextLogIndex].nextLogPromise = logsObjArray[nextLogIndex].source.popAsync();
  } while(true)

  printer.done();

  return new Promise((resolve, reject) => {
    resolve(console.log("Async sort complete."));
  });
};
