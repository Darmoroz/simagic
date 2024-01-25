import fs from 'fs';

export async function appendToFile(filename, data) {
  return new Promise((resolve, reject) => {
    fs.appendFile(filename, `${data},\n`, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
