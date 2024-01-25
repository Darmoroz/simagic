import axios from 'axios';
import chalk from 'chalk';

import { JSDOM } from 'jsdom';
import { saveDataCSV } from './utils/saveDataCSV.js';
import { convertToCSV } from './utils/convertToCSV.js';
import { formatDate } from './utils/formatDate.js';
import { writeErrorToLog } from './utils/writeErrorToLog.js';

const TYPE_AVAILABILITY = {
  out: 'Out of stock',
  in: 'Available',
  pre: 'Pre-order',
};

const outputFileName = `${formatDate(new Date())}_simraceshop.de`;
let result = [];

(async function () {
  try {
    const { data } = await axios.get(
      `https://simraceshop.de/?view_mode=tiled&manufacturers_id=32&listing_count=192`
    );
    const { document } = new JSDOM(data).window;
    const products = [...document.querySelectorAll('.productlist .product-container')];
    console.log('Кількість товарів', products.length);
    const productsInfo = products.map(product => {
      let availability;
      const model = product
        .querySelector('div.title>a')
        .textContent.replace(/Simagic|SIMAGIC|\n|\t/g, '')
        .trim();
      const price =
        product
          .querySelector('div.price .current-price-container')
          .textContent.match(/\b\d+(?:[.,]\d{1,3}(?:,\d{1,2})?)?\b/g)[0]
          .replace(/[.,]/g, match => (match === '.' ? '' : '.')) + '€';
      const isLabel = product.querySelector('figure.image div.ribbons span');
      if (!isLabel | (isLabel?.textContent === 'NEU')) {
        availability = TYPE_AVAILABILITY.in;
      } else {
        availability = TYPE_AVAILABILITY.out;
      }
      return { model, price, availability };
    });
    result.push(productsInfo);
  } catch (error) {
    console.log(chalk.red(error));
    await writeErrorToLog('simraceshop.de', error);
  }
  await saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
