import { connect } from 'puppeteer-real-browser';
import axios from 'axios';
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

const browserOpts={
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
}

const outputFileName = `${formatDate(new Date())}_simclub.gr`;
let result = [];
let totalPages = 1;

(async function () {
const {browser} = await connect(browserOpts)

  for (let i = 1; i < 10; i++) {
    let requestLink= null
    if (i===1) {
      requestLink='https://www.simclub.gr/en/shop-2/?filter_brand=simagic'
    } else {
      requestLink=`https://www.simclub.gr/en/shop-2/page/${i}/?filter_brand=simagic`
    }
    let page=null
    try {
      if (i > totalPages) {
        break;
      }
      console.log('PAGE', chalk.green(i));
      page = await browser.newPage();
      await page.goto(requestLink, { waitUntil: 'networkidle2', timeout: browserOpts.timeout })
      await delay (1500)
      const title = await page.title();
      if (title?.includes('Just a moment') || title?.includes('Трохи зачекайте')) {
				await delay(3500);
				await page.keyboard.press('Tab');
				await page.keyboard.press('Space');
				await delay(6000);
			}
			const html = await page.content();
      const { document } = new JSDOM(html).window;

      totalPages = Math.ceil(
        document
          .querySelector('p.woocommerce-result-count')
          ?.textContent.match(/\b(\d+)\s*results\b/)[1] / 20
      );

      const products = [
        ...document.querySelectorAll('div.dt-css-grid.custom-pagination-handler article'),
      ];

      const productsSimple = products.filter(product =>
        product.classList.contains('product-type-simple')
      );
      const productsVariableUrls = products
        .filter(product => product.classList.contains('product-type-variable'))
        .map(product => product.querySelector('a.alignnone').href);
      console.log('Кількість простих товарів', productsSimple.length);
      console.log('Кількість варіативних товарів', productsVariableUrls.length);

      const productsInfoSimple = productsSimple.map(product => {
        const model = product
          .querySelector('h4.product-title > a')
          ?.textContent.replace(/Simagic|SIMAGIC|\n/g, '')
          .trim();
        const priceContainer = product.querySelectorAll('.woocommerce-Price-amount');
        const price =
          priceContainer[priceContainer.length - 1].childNodes[1].data.replace(',', '') + '€';
        const isInStock = product.classList.contains('instock');
        const availability = isInStock ? TYPE_AVAILABILITY.add : TYPE_AVAILABILITY.sold;

        return { model, price, availability };
      });
      for (let j = 0; j < productsVariableUrls.length; j++) {
        const url = productsVariableUrls[j];
        const { data } = await axios.get(url);
        const { document } = new JSDOM(data).window;
        const modelFirstPart = document
          .querySelector('h1.product_title')
          ?.textContent.replace(/Simagic|SIMAGIC|\n/g, '')
          .trim();
        const form = document.querySelector('form.variations_form');
        const productsVariableArr = JSON.parse(form.dataset.product_variations);
        const productsInfoVariable = productsVariableArr.map(product => {
          const model =
            modelFirstPart +
            ' ' +
            Object.values(product.attributes).reduce((acc, val) => acc + ' ' + val, '');
          const price = product.display_price + '.00€';
          const availabilityElement = new JSDOM(product.availability_html).window.document
            .querySelector('p')
            ?.textContent.split(' ')[0]
            .toLocaleLowerCase();
          const availability =
            availabilityElement === 'in' ? TYPE_AVAILABILITY.add : TYPE_AVAILABILITY.sold;

          return { model, price, availability };
        });
        result.push(productsInfoVariable);
      }
      result.push(productsInfoSimple);
    } catch (error) {
      console.log(chalk.red(error));
      await writeErrorToLog('simclub.gr', error);
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
