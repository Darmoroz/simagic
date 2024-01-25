import puppeteer from 'puppeteer';
import chalk from 'chalk';

import { JSDOM } from 'jsdom';
import { saveDataCSV } from './utils/saveDataCSV.js';
import { convertToCSV } from './utils/convertToCSV.js';
import { formatDate } from './utils/formatDate.js';
import { writeErrorToLog } from './utils/writeErrorToLog.js';

const URLS_PATH = [
  'Wheelbases',
  'Steering-wheels',
  'p1000-pedals',
  'Simagic-p2000-pedals',
  'Shifters/handbrakes',
  'Simagic-accessoires',
  'Simagic-pedal-accessoires',
];

const TYPE_AVAILABILITY = {
  out: 'Out of stock',
  in: 'Available',
  extra: 'Pre-order',
};

const outputFileName = `${formatDate(new Date())}_simwear.eu`;
let result = [];

(async function () {
  const browser = await puppeteer.launch({
    defaultViewport: { width: 1920, height: 1080 },
  });
  for (let i = 0; i < URLS_PATH.length; i++) {
    const category = URLS_PATH[i];
    try {
      const page = await browser.newPage();
      await page.goto(`https://simwear.eu/${category}`);
      await page.waitForTimeout(3000);
      await page.evaluate(() => {
        window.scrollBy(0, 6000);
      });
      await page.waitForTimeout(3000);
      await page.evaluate(() => {
        window.scrollBy(0, 6000);
      });
      const data = await page.content();
      const { document } = new JSDOM(data).window;
      const products = [
        ...document
          .querySelector('div[data-container="ProductContainer"]')
          .querySelectorAll('div.card'),
      ];
      console.log('Кількість товарів в категорії', category, chalk.yellow(products.length));
      await page.close();
      const productsInfo = products.map(product => {
        const model = product
          .querySelector('.l-product-title')
          ?.textContent.replace('Simagic', '')
          .replace('SIMAGIC', '')
          .trim();
        const price =
          product
            .querySelector('.l-product-price')
            ?.textContent.replace('€', '')
            .replace('.', '')
            .replace(',', '.')
            .trim() + '€';
        const availability =
          TYPE_AVAILABILITY[
            product.querySelector('.l-stock-label').textContent.split(' ')[0].toLowerCase()
          ];
        return { model, price, availability };
      });
      result = [...result, productsInfo];
    } catch (error) {
      console.log(chalk.red(error));
      await writeErrorToLog('simwear.eu', error);
    }
  }
  browser.close();

  await saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
