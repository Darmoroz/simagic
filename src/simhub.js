import puppeteer from 'puppeteer';
import chalk from 'chalk';

import { JSDOM } from 'jsdom';
import { saveDataCSV } from './utils/saveDataCSV.js';
import { convertToCSV } from './utils/convertToCSV.js';
import { formatDate } from './utils/formatDate.js';
import { writeErrorToLog } from './utils/writeErrorToLog.js';

const TYPE_AVAILABILITY = {
  sold: 'Out of stock',
  add: 'Available',
  pre: 'Pre-order',
};

const outputFileName = `${formatDate(new Date())}_simhub.com.pl`;
let result = [];

(async function () {
  const browser = await puppeteer.launch({
    defaultViewport: { width: 1920, height: 1080 },
  });

  try {
    const page = await browser.newPage();
    await page.goto('https://simhub.com.pl/en/collections/all?gf_512173=Simagic&limit=100');
    await page.waitForTimeout(5000);
    const content = await page.content();
    await page.close();
    browser.close();
    const { document } = new JSDOM(content).window;
    const products = [
      ...document
        .querySelector('.grid.grid--no-gutters.grid--uniform')
        .querySelectorAll('.spf-product-card.spf-product-card__left.spf-product-card__template-2'),
    ];
    console.log('Кількість знайдених товарів', products.length);
    const productsInfo = products.map(product => {
      const model = product
        .querySelector('a[translatable]')
        ?.textContent.replace('Simagic', '')
        .replace('SIMAGIC', '')
        .trim();
      const priceContainer = product.querySelector('.spf-product-card__price-wrapper');
      const isSale = priceContainer.children.length === 2;
      const priceNotFormated = isSale
        ? priceContainer.querySelector('span:last-child .money')
        : priceContainer.querySelector('span:first-child .money');

      const price = priceNotFormated.textContent.replace('€', '').replace(',', '') + '€';

      const formBtn = product.querySelector('form').querySelectorAll('button');
      const btnValue = formBtn[0].textContent.split(' ')[0].toLowerCase();
      const isPreOrder = formBtn.length === 2;
      const availability = isPreOrder ? TYPE_AVAILABILITY.pre : TYPE_AVAILABILITY[btnValue];
      return { model, price, availability };
    });
    result = [...productsInfo];
  } catch (error) {
    console.log(chalk.red(error));
    await writeErrorToLog('simhub.com.pl', error);
  }

  await saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
