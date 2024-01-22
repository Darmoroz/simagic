import axios from 'axios';
import puppeteer from 'puppeteer';
import chalk from 'chalk';
import { JSDOM } from 'jsdom';
import { saveDataCSV } from './utils/saveDataCSV.js';
import { convertToCSV } from './utils/convertToCSV.js';
import { formatDate } from './utils/formatDate.js';

const TYPE_AVAILABILITY = {
  sold: 'Out of stock',
  add: 'Available',
  pre: 'Pre-order',
};

const outputFileName = `${formatDate(new Date())}_sim-racing.no`;
let result = [];
let totalPages = 1;

(async function () {
  for (let i = 1; i < 10; i++) {
    try {
      if (i > totalPages) {
        break;
      }
      console.log('PAGE', chalk.green(i));
      const { data } = await axios.get(`https://www.sim-racing.no/search?q=simagic&side=${i}`);
      const { document } = new JSDOM(data).window;

      totalPages = Math.ceil(document.querySelector('.page__title')?.textContent.match(/\d+/g).map(Number)[0] / 24);

      const products = [...document.querySelectorAll('.productlist>article')];

      const productsInfo = products.map(product => {
        let availability;
        const model = product
          .querySelector('h3.productlist__product__headline')
          ?.textContent.replace('Simagic', '')
          .trim();
        const price = product.querySelector('meta[itemprop="price"]').attributes['content'].value + '.00NOK';
        const quantity = product.querySelector('div[itemprop="offers"] meta[data-stock]').dataset.stock;
        if (quantity > 0) {
          availability = TYPE_AVAILABILITY.add;
        } else {
          availability = TYPE_AVAILABILITY.pre;
        }
        return { model, price, availability };
      });
      result = [...result, productsInfo];
    } catch (error) {
      console.log(chalk.red(error));
    }
  }
  saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
