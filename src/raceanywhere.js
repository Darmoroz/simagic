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
  for (let i = 1; i < 10; i++) {
    try {
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
        let model;
        let price;
        let availability;
        const url = productsUrls[j];
        const { data } = await axios.get(`https://www.raceanywhere.co.uk/${url}`);
        const { document } = new JSDOM(data).window;
        const modelFirstPartName = document
          .querySelector('span[itemprop="name"].hide')
          .textContent?.replace(/\(Simagic\)|\(SIMAGIC\)/g, '')
          .trim();
        const variableIdArr = [
          ...document.querySelectorAll('div.variants-wrapper.clearfix select[name="id"] > option'),
        ].map(i => i.value);
        if (variableIdArr.length === 1) {
          model = modelFirstPartName;
          price =
            document
              .querySelector('div.detail-price span.money')
              .textContent.replace('£', '')
              .trim() + '£';

          const elemntStock = document.querySelector(
            'div#product-info ul.list-unstyled>li.product-stock'
          );
          const elementUnvaileble = document.querySelector('div.detail-price .unavailable');

          if (elemntStock && elementUnvaileble) {
            availability = TYPE_AVAILABILITY.out;
          } else if (elemntStock) {
            availability = TYPE_AVAILABILITY.in;
          } else {
            availability = TYPE_AVAILABILITY.pre;
          }
          result.push({ model, price, availability });
        } else {
          for (let k = 0; k < variableIdArr.length; k++) {
            const variableId = variableIdArr[k];
            if (!+variableId) {
              model = modelFirstPartName + ' ' + variableId.replace('- Sold Out', '');
              price = 'NaN';
              availability = TYPE_AVAILABILITY.out;
            } else {
              const { data } = await axios.get(
                `https://www.raceanywhere.co.uk${url}?variant=${variableId}`
              );
              const { document } = new JSDOM(data).window;
              model =
                modelFirstPartName +
                ' ' +
                document.querySelector('div.variants-wrapper.clearfix select[name="id"]')
                  .selectedOptions[0].textContent;
              price =
                document
                  .querySelector('div.detail-price span.money')
                  .textContent.replace('£', '')
                  .trim() + '£';
              const elemntStock = document.querySelector(
                'div#product-info ul.list-unstyled>li.product-stock'
              );
              const elementUnvaileble = document.querySelector('div.detail-price .unavailable');
              if (elemntStock && elementUnvaileble) {
                availability = TYPE_AVAILABILITY.out;
              } else if (elemntStock) {
                availability = TYPE_AVAILABILITY.in;
              } else {
                availability = TYPE_AVAILABILITY.pre;
              }
            }
            result.push({ model, price, availability });
          }
        }
      }
    } catch (error) {
      console.log(chalk.red(error));
      await writeErrorToLog('raceanywhere.co.uk', error);
    }
  }
  await saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
