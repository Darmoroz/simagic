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

const outputFileName = `${formatDate(new Date())}_simraceshop.de`;
let result = [];

(async function () {
  const products = [];
  for (let page = 1; page < 3; page++) {
    console.log('Page->', page);
    try {
      const { data } = await axios.get(
        `https://simraceshop.de/?suche=simagic&lang=eng&af=100&seite=${page}`
      );
      const { document } = new JSDOM(data).window;
      const productsByPage = [...document.querySelectorAll('.product-list>div')];
      products.push(...productsByPage);
    } catch (error) {
      console.log(chalk.red(error));
      await writeErrorToLog('simraceshop.de', error);
      continue;
    }
  }

  const variantsProducts = products.filter(prodEl =>
    prodEl.querySelector('.productbox')?.classList?.contains('productbox-show-variations')
  );
  const simpleProducts = products.filter(
    prodEl =>
      !prodEl.querySelector('.productbox')?.classList?.contains('productbox-show-variations')
  );
  const simpleProductsInfo = simpleProducts.map(prodEl => {
    const model = prodEl.querySelector('.productbox-image img')?.alt?.replace('Simagic','')?.trim();
    const isPrice = prodEl.querySelector('[itemprop="price"]')?.content;
    const price = isPrice ? isPrice+'€' : 'Ціна за запитом';
    const isPreorder = prodEl.querySelector('.ribbon')?.classList?.contains('ribbon-7');
    const availability = isPreorder ? TYPE_AVAILABILITY.pre : TYPE_AVAILABILITY.in;
    return { model, price, availability };
  });
  result.push(...simpleProductsInfo);
  const variantsLinks = variantsProducts.map(
    prodEl => prodEl.querySelector('.productbox-title a').href
  );
  console.log('Variable products');
  for (const link of variantsLinks) {
    try {
      const { data } = await axios.get(link);
      const { document } = new JSDOM(data).window;
      const firstPartOfName = document.querySelector('h1')?.textContent?.replace('Simagic','')?.trim() || '';
      const productsInfo = [...document.querySelectorAll('dd.form-group>div')].map(el => {
        const nameEl = el.querySelector('label');
        let innerTextWithoutChildren = '';
        nameEl.childNodes.forEach(node => {
          if (node.nodeType === 3) {
            innerTextWithoutChildren += node.nodeValue.replaceAll('\n', '')?.trim();
          }
        });
        const model = firstPartOfName + ' ' + innerTextWithoutChildren;
        const isMorePrice = parseInt(
          el.querySelector('.variation-badge')?.textContent?.replace('+', '')?.trim()
        );
        const price = isMorePrice
          ? +document.querySelector('[itemprop="price"]')?.content + isMorePrice+'€'
          : +document.querySelector('[itemprop="price"]')?.content+'€';
        const isNotAval = el.querySelector('.badge-not-available');
        const availability = isNotAval ? TYPE_AVAILABILITY.out : TYPE_AVAILABILITY.in;
        return { model, price, availability };
      });
      result.push(...productsInfo)
    } catch (error) {
      console.log(chalk.red(error));
      await writeErrorToLog('simraceshop.de', error);
      continue;
    }
  }
  await saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();