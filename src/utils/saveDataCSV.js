import path from 'path';
import fs from 'fs';
import chalk from 'chalk';

export async function saveDataCSV(data, fileName) {
  const savePath = `../data/${fileName}.csv`;

  return new Promise((resolve, reject) => {
    fs.writeFile(savePath, data, err => {
      if (err) {
        return reject(err);
      }

      console.log(chalk.green('File was saved successfully: ') + chalk.blue.bgWhite.bold(fileName) + '\n');

      resolve();
    });
  });
}
