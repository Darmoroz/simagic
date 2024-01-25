import axios from 'axios';
import chalk from 'chalk';
import { JSDOM } from 'jsdom';
import { saveDataCSV } from './utils/saveDataCSV.js';
import { convertToCSV } from './utils/convertToCSV.js';
import { formatDate } from './utils/formatDate.js';
import { writeErrorToLog } from './utils/writeErrorToLog.js';

const inputPathData = [
  'simagic-bases-direct-drive',
  'volants-simagic',
  'pedaliers-simagic',
  'shifter-et-frein-a-main-1',
  'accessoires-simagic',
];
const outputFileName = `${formatDate(new Date())}_rseat.fr`;

let result = [];

(async function () {
  for (let i = 0; i < inputPathData.length; i++) {
    const category = inputPathData[i];
    try {
      const { data } = await axios.get(`https://www.rseat.fr/simagic-1/${category}?limit=100`);
      const { document } = new JSDOM(data).window;
      const productsGrid = document.querySelector('.main-products.product-grid');
      const products = [...productsGrid.querySelectorAll('.product-layout')];
      console.log('Quantity of goods in category', category, chalk.yellow(products.length));
      const productInfo = products.map(item => {
        const model = item
          .querySelector('span[class="stat-2"]')
          .children[1].textContent.replace('Simagic', '')
          .replace('SIMAGIC', '')
          .trim();
        const price = item
          .querySelector('span[class="price-tax"]')
          .textContent.replace('Hors Taxes:', '');
        const label = item.querySelector('.product-labels');
        const availability = label ? label.textContent.replaceAll('\n', '') : 'Disponible';
        return { model, price, availability };
      });
      result = [...result, productInfo];
    } catch (error) {
      console.log(chalk.red(error));
      await writeErrorToLog('rseat.fr', error);
    }
  }
  await saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
