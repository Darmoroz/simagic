import axios from 'axios';
import chalk from 'chalk';

import { JSDOM } from 'jsdom';
import { saveDataCSV } from './utils/saveDataCSV.js';
import { convertToCSV } from './utils/convertToCSV.js';
import { formatDate } from './utils/formatDate.js';
import { writeErrorToLog } from './utils/writeErrorToLog.js';

const TYPE_AVAILABILITY = {
  out: 'Out of stock',
  in: 'Available',
  pre: 'Pre-order',
};

const outputFileName = `${formatDate(new Date())}_raceanywhere.co.uk`;
let result = [];
let totalPages = 1;

(async function () {
  try {
    for (let i = 1; i < 10; i++) {
      if (i > totalPages) {
        break;
      }
      console.log('PAGE', chalk.green(i));
      const { data } = await axios.get(
        `https://www.raceanywhere.co.uk/collections/simagic?page=${i}`
      );
      const { document } = new JSDOM(data).window;

      totalPages = document.querySelector('ul.pagination>li:last-child').previousElementSibling
        .textContent;

      const productsUrls = [
        ...document.querySelectorAll('div.cata-product.cp-grid.clearfix div.featured-img>a'),
      ].map(prod => prod.href);
      for (let j = 0; j < productsUrls.length; j++) {
        const url = productsUrls[j];
        const { data } = await axios.get(`https://www.raceanywhere.co.uk/${url}`, {
          headers: {
            accept: 'application/json',
            'accept-language': 'uk-UA,uk;q=0.9,ru-UA;q=0.8,ru;q=0.7,en;q=0.6,en-US;q=0.5',
            'cache-control': 'no-cache',
            pragma: 'no-cache',
            'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
          },
          referrer:
            'https://www.raceanywhere.co.uk/collections/simagic/products/p1000-hydraulic-modular-sim-racing-pedals-simagic',
          referrerPolicy: 'strict-origin-when-cross-origin',
          body: null,
          method: 'GET',
          mode: 'cors',
          credentials: 'include',
        });
        const products = data.product.variants.map(prod => {
          const id = prod.id;
          const model =
            data.product.title.replace(/\(simagic\)|default\s*title/i, '').trim() +
            ' ' +
            prod.option1.replace(/\(simagic\)|default\s*title/i, '').trim();
          const price = `${prod.price}£`;
          return { model, price, availability: null, id, handle: data.product.handle };
        });
        result.push(...products);
      }
    }
    for (let idxr = 0; idxr < result.length; idxr++) {
      const prod = result[idxr];
      const id = prod.id;
      const handle = prod.handle;
      const url = `https://www.raceanywhere.co.uk/collections/simagic/products/${handle}?variant=${id}&sections=product-availability`;
      const { data } = await axios.get(url);
      const { document } = new JSDOM(data['product-availability']).window;
      let availability = document
        .querySelector('li.product-stock')
        ?.textContent.replace('Availability:', '')
        .replace('Currently', '')
        .replace(/\s+/g, ' ')
        .trim();
      if (availability === undefined) {
        prod.availability = TYPE_AVAILABILITY.pre;
      }
      if (availability === 'In Stock') {
        prod.availability = TYPE_AVAILABILITY.in;
      }
      if (availability === 'Out Of Stock') {
        prod.availability = TYPE_AVAILABILITY.out;
      }
      delete prod.id;
      delete prod.handle;
    }
  } catch (error) {
    console.log(chalk.red(error));
    await writeErrorToLog('raceanywhere.co.uk', error);
  }

  await saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
