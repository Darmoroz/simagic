import { connect } from 'puppeteer-real-browser';
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
  'accessories/pedals-accessories',
  'accessories/wheel',
  'merchandising-en',
  'bundles/bundle-alpha-mini-en',
  'bundles/bundle-alpha',
  'bundles/bundle-alpha-u-en',
  'bundles/mega-bundle-sim-racing-en',
  'bundles/bundle-simucube-2-pro-en',
  'bundles/bundle-moza-en',
];
const TYPE_AVAILABILITY = {
  sold: 'Out of stock',
  add: 'Available',
  pre: 'Pre-order',
};

const browserOpts = {
  headless: false,
  protocolTimeout: 60000,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
  ],
  timeout: 30000,
  connectOption: {
    defaultViewport: {
      width: 1280,
      height: 1080,
    },
  },
};

const outputFileName = `${formatDate(new Date())}_directdrive.it`;
let result = [];

(async function () {
  const {browser} = await connect(browserOpts)
  for (let i = 0; i < URLS_PATH.length; i++) {
    const category = URLS_PATH[i];
    let page = null;
    try {
      page = await browser.newPage();
      await page.goto(`https://www.directdrive.it/en/sim-racing-wheels/${category}`, { waitUntil: 'networkidle2', timeout: browserOpts.timeout });
      await delay(1500);
      const title = await page.title();
      if (title?.includes('Just a moment') || title?.includes('Трохи зачекайте')) {
        await delay(3500);
        await page.keyboard.press('Tab');
        await page.keyboard.press('Space');
        await delay(6000);
      }
      const data = await page.content();
      const { document } = new JSDOM(data).window;
      const products = [...document.querySelectorAll('.shop-container .product-small.col')];
      console.log('Кількість товарів в категорії', category, chalk.yellow(products.length));
      const productsInfo = products.map(product => {
        const model = product
          .querySelector('.title-wrapper a')?.textContent?.replace(/Simagic|SIMAGIC|\n/g, '')
          ?.trim();
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
      console.log(error);
      await writeErrorToLog('directdrive.it', error);
    } finally {
      if (page) {
        await page.close()
        await delay()
      }
    }
  }
  await browser.close()
  await saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();

function delay(val = 500) {
  return new Promise(resolve => setTimeout(resolve, val));
}
