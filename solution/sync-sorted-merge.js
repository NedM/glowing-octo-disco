"use strict";

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

const logsRemain = (logObjs) => {
  return logObjs.some((obj) => !!obj.nextLog);
}

// Print all entries, across all of the sources, in chronological order.

module.exports = (logSources, printer) => {
  // Create an array holding the source and next element for each log source
  // Use array for O(1) time access with index
  // Space complexity is O(n) where n is number of log sources
  const logsObjArray = logSources.map((source) => {
    return {
      source: source,
      nextLog: source.pop()
    };
  });

  // Operate while logs remain to be printed
  // This loop is O(m) time complexity where m is the number of messages across all sources
  while(logsRemain(logsObjArray)) {
    const nextLogIndex = getIndexOfNextLogObject(logsObjArray);

    if (nextLogIndex === null) {
      break;
    }

    printer.print(logsObjArray[nextLogIndex].nextLog);

    // Update next log at the index
    logsObjArray[nextLogIndex].nextLog = logsObjArray[nextLogIndex].source.pop();
  }

  printer.done();

  return console.log("Sync sort complete.");
};
