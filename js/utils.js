// Compute elapsed time since startTime (Date object), returns "mm:ss" or "hh:mm:ss"
export function computeElapsedTime(startTime) {
  const endTime = new Date();
  let timeDiff = Math.floor((endTime - startTime) / 1000);

  const seconds = String(timeDiff % 60).padStart(2, '0');
  timeDiff = Math.floor(timeDiff / 60);
  const minutes = String(timeDiff % 60).padStart(2, '0');
  timeDiff = Math.floor(timeDiff / 60);
  const hours = String(timeDiff).padStart(2, '0');

  return hours === "00" ? `${minutes}:${seconds}` : `${hours}:${minutes}:${seconds}`;
}

// Get formatted time string for filenames: "yymmdd_hhmm"
export function getFormattedTime() {
  const today = new Date();
  const y = today.getFullYear().toString().slice(2);
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const h = String(today.getHours()).padStart(2, '0');
  const mi = String(today.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}_${h}${mi}`;
}