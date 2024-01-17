import axios from 'axios';
import chalk from 'chalk';
import { JSDOM } from 'jsdom';
import { saveDataCSV } from './utils/saveDataCSV.js';
import { convertToCSV } from './utils/convertToCSV.js';

const inputPathData = [
  'simagic-bases-direct-drive',
  'volants-simagic',
  'pedaliers-simagic',
  'shifter-et-frein-a-main-1',
  'accessoires-simagic',
];
const outputFileName = 'rseat';

let result = [];

(async function () {
  for (let i = 0; i < inputPathData.length; i++) {
    const category = inputPathData[i];
    try {
      const { data } = await axios.get(`https://www.rseat.fr/simagic-1/${category}?limit=100`);
      const { document } = new JSDOM(data).window;
      const productsGrid = document.querySelector('.main-products.product-grid');
      const products = [...productsGrid.querySelectorAll('.product-layout')];
      console.log(chalk.yellow(products.length));
      const product = products.map(i => {
        const model = i.querySelector('span[class="stat-2"]').children[1].textContent.replace('Simagic ', '');
        const name = i.querySelector('.name').textContent;
        const price = i.querySelector('span[class="price-tax"]').textContent.replace('Hors Taxes:', '');
        const label = i.querySelector('.product-labels');
        const availability = label ? label.textContent.replaceAll('\n', '') : 'Disponible';
        return { model, name, price, availability };
      });
      result = [...result, product];
    } catch (error) {
      console.log(chalk.red(error));
    }
  }
  saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
