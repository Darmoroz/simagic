import axios from 'axios';
import chalk from 'chalk';
import fs from 'fs';
import puppeteer from 'puppeteer';

import { saveDataCSV } from './utils/saveDataCSV.js';
import { convertToCSV } from './utils/convertToCSV.js';
import { formatDate } from './utils/formatDate.js';
import { writeErrorToLog } from './utils/writeErrorToLog.js';

const TYPE_AVAILABILITY = {
  sold: 'Out of stock',
  add: 'Available',
  pre: 'Pre-order',
};

const outputFileName = `${formatDate(new Date())}_simhub.pro`;

(async function () {
  const browser = await puppeteer.launch({
    // headless: false,
    defaultViewport: { width: 1920, height: 1080 },
  });
  const [page] = await browser.pages();
  const MAX_RETRIES = 3;
  const resultsFull = [];
  for (let pageLink = 1; pageLink < 8; pageLink++) {
    console.log('PAGE', pageLink)
    try {
      await page.goto(`https://simhub.pro/search?page=${pageLink}&q=Simagic`);
      const products = await page.evaluate(() => {
        return window.GloboPreorderParams.products;
      });
      resultsFull.push(...products);
    } catch (error) {
      console.log(chalk.red(error));
      await writeErrorToLog('simhub.pro', error);
    }
  }
  browser.close();
    const result = resultsFull.map(item => {
      const nameFirst = item.title.replace('Simagic', '');
      const variationsItem = item.variants.map(i => {
        const model = `${nameFirst} ${i.title.replace('Default Title', '')}`.trim();
        const price = String(i.price).replace(/(\d{2})$/, '.$1') + '€';
        const availability = !i.available
          ? TYPE_AVAILABILITY.sold
          : i.inventory_quantity <= 0
          ? TYPE_AVAILABILITY.pre
          : TYPE_AVAILABILITY.add;
        return { model, price, availability };
      });
      return variationsItem;
    });
  await saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
