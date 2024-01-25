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

const outputFileName = `${formatDate(new Date())}_simclub.gr`;
let result = [];
let totalPages = 1;

(async function () {
  for (let i = 1; i < 10; i++) {
    try {
      if (i > totalPages) {
        break;
      }
      console.log('PAGE', chalk.green(i));
      const { data } = await axios.get(
        `https://www.simclub.gr/en/shop-2/page/${i}/?filter_brand=simagic`
      );
      const { document } = new JSDOM(data).window;

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
    }
  }
  await saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
