import fs from 'fs';
import { appendToFile } from './appendToFile.js';
import { formatDate } from './formatDate.js';

export async function writeErrorToLog(site, error) {
  const logFileName = `${site}_${formatDate(new Date())}.log`;
  const logFilePath = `../log/${logFileName}`;
  try {
    fs.access(logFilePath, fs.constants.F_OK, err => {
      if (err) {
        fs.writeFile(logFilePath, '', err => {
          if (err) {
            console.error(`Помилка створення log-файлу: ${err}`);
          } else {
            console.log(`Файл ${logFileName} створено в папці log`);
          }
        });
      }
    });
    await appendToFile(logFilePath, `${formatDate(new Date())}-${error}`);
  } catch (error) {
    console.log(error);
  }
}
