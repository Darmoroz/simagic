export function convertToCSV(objArray) {
  if (objArray[0]) {
    const header = Object.keys(objArray[0]).join(',');
    const rows = objArray.map(obj =>
      Object.values(obj)
        .map(value => `"${value}"`)
        .join(',')
    );
    return `\uFEFF${header}\n${rows.join('\n')}`;
  } else {
    return false;
  }
}
