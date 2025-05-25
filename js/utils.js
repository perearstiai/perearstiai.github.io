// Compute elapsed time since startTime (Date object), returns "mm:ss" or "hh:mm:ss"
export function computeElapsedTime(startTime) {
  const endTime = new Date();
  let timeDiffMs = endTime - startTime;
  let timeDiff = Math.floor(timeDiffMs / 1000);

  const hundredths = String(Math.floor((timeDiffMs % 1000) / 10)).padStart(2, '0');
  const seconds = String(timeDiff % 60).padStart(2, '0');
  timeDiff = Math.floor(timeDiff / 60);
  const minutes = String(timeDiff % 60).padStart(2, '0');
  timeDiff = Math.floor(timeDiff / 60);
  const hours = String(timeDiff).padStart(2, '0');

  return hours === "00"
    ? `${minutes}:${seconds}.${hundredths}`
    : `${hours}:${minutes}:${seconds}.${hundredths}`;  
}

// Get formatted time string for filenames: "yymmdd_hhmmss"
export function getFormattedTime() {
  const today = new Date();
  const y = today.getFullYear().toString().slice(2);
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const h = String(today.getHours()).padStart(2, '0');
  const mi = String(today.getMinutes()).padStart(2, '0');
  const s = String(today.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}_${h}${mi}${s}`;
}