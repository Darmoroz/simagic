import axios from 'axios';
import chalk from 'chalk';

import { JSDOM } from 'jsdom';
import { saveDataCSV } from './utils/saveDataCSV.js';
import { convertToCSV } from './utils/convertToCSV.js';
import { formatDate } from './utils/formatDate.js';
import { writeErrorToLog } from './utils/writeErrorToLog.js';

const URLS_PATH = [
  'wheel-bases',
  'hydraulic-pedals',
  'steering-wheels',
  'handbrake-sim-racing',
  'sequential-shifter',
  'h-shifter',
  'merchandising-en',
  'ccessories/pedals-accessories',
  'accessories/wheel',
  'bundles/bundle-alpha-mini-en',
  'bundles/bundle-alpha',
  'bundles/bundle-alpha-u-en',
  'bundles/mega-bundle-sim-racing-en',
];
const TYPE_AVAILABILITY = {
  sold: 'Out of stock',
  add: 'Available',
  pre: 'Pre-order',
};

const outputFileName = `${formatDate(new Date())}_directdrive.it`;
let result = [];

(async function () {
  for (let i = 0; i < URLS_PATH.length; i++) {
    const category = URLS_PATH[i];
    try {
      const { data } = await axios.get(
        `https://www.directdrive.it/en/sim-racing-wheels/${category}`
      );
      const { document } = new JSDOM(data).window;
      const products = [...document.querySelectorAll('.shop-container .product-small.col')];
      console.log('Кількість товарів в категорії', category, chalk.yellow(products.length));
      const productsInfo = products.map(product => {
        const model = product
          .querySelector('.title-wrapper')
          .childNodes[2].data.replace(/Simagic|SIMAGIC|\n/g, '')
          .trim();
        const priceContainer = product.querySelectorAll('.woocommerce-Price-amount bdi');
        const price =
          priceContainer[priceContainer.length - 1].childNodes[1].data.replace('.', '') + '.00€';
        let availability;
        if (product.classList.contains('outofstock')) {
          availability = TYPE_AVAILABILITY.sold;
        } else {
          if (product.classList.contains('sale')) {
            availability = TYPE_AVAILABILITY.add;
          } else {
            availability = TYPE_AVAILABILITY.pre;
          }
        }
        return { model, price, availability };
      });
      result = [...result, productsInfo];
    } catch (error) {
      console.log(chalk.red(error));
      await writeErrorToLog('directdrive.it', error);
    }
  }
  await saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
