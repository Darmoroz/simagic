import axios from 'axios';
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
  hacer: 'Pre-order',
  pre: 'Pre-order',
};

const outputFileName = `${formatDate(new Date())}_simufy.com`;
let result = [];

(async function () {
  const browser = await puppeteer.launch({
    //  headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
    ],
    timeout: 45000,
  });
  for (let i = 1; i < 3; i++) {
    console.log('PAGE', chalk.green(i));

    try {
      const page = await browser.newPage();
      await page.goto(`https://simufy.com/en/collections/simagic?page=${i}&lang=en`);
      await page.waitForTimeout(10000);
      const productsObj = await page.evaluate(() => {
        const items = [
          ...document.querySelectorAll('.new-grid.product-grid.collection-grid > div'),
        ];
        return items;
      });
      const products = productsObj.map(el => new JSDOM(el.wgParsedHTML).window.document);
      console.log('total prod', products.length);
      const productsSimple = products.filter(
        product =>
          !product
            .querySelector('.grid-product__price--current span[aria-hidden="true"]')
            .classList.contains('grid-product__price--from')
      );
      const productsSimpleInfo = productsSimple.map(product => {
        const model = product
          .querySelector('div.grid-product__title')
          ?.textContent?.replace(/Simagic|SIMAGIC|\n|\t/g, '')
          ?.trim();
        const price =
          product
            .querySelector('.grid-product__price--current span[aria-hidden="true"]')
            ?.textContent.replace(/[.€]/g, '')
            ?.replace(',', '.') + '€';

        const isPreOrder = product.querySelector('.preorder-aplha-badge');
        const availability = isPreOrder ? TYPE_AVAILABILITY.hacer : TYPE_AVAILABILITY.add;
        return { model, price, availability };
      });
      console.log('simple info prod', productsSimpleInfo.length);
      const productsVariablesUrls = products
        .filter(product =>
          product
            .querySelector('.grid-product__price--current span[aria-hidden="true"]')
            .classList.contains('grid-product__price--from')
        )
        .map(product => `https://simufy.com${product.querySelector('.grid-item__link').href}`);
      result.push(...productsSimpleInfo);
      console.log('results length', result.length);
      console.log('Variable Urls', productsVariablesUrls.length);
      for (let j = 0; j < productsVariablesUrls.length; j++) {
        const partOfUrl = productsVariablesUrls[j];
        const { data } = await axios.get(partOfUrl);
        const cleanedData = data.replace(/<style[\s\S]*?<\/style>/g, '');
        const { document } = new JSDOM(cleanedData).window;
        const variableProductIds = [
          ...document.querySelectorAll('.hide.js-product-inventory-data > div'),
        ].map(i => i.dataset['id']);

        console.log('Варіативні товари', variableProductIds.length);
        for (let k = 0; k < variableProductIds.length; k++) {
          const productId = variableProductIds[k];
          try {
            await page.goto(`${partOfUrl}?variant=${productId}&lang=en`);
            await page.waitForTimeout(1000);
            await page.evaluate(() => {
              const styles = document.querySelectorAll('style');
              styles.forEach(style => style.remove());
            });
            const data = await page.content();
            const { document } = new JSDOM(data).window;

            const modelFirstPart = document
              .querySelector('h1.product-single__title')
              ?.textContent?.replace(/\n|\t|Simagic|SIMAGIC/g, '')
              ?.trim();
            const modelLastPart = getSelectedValues([
              ...document.querySelectorAll('.variant-wrapper.variant-wrapper--dropdown.js select'),
            ]);
            const model = modelFirstPart + ' ' + modelLastPart.join(' ');
            const productPriceElement = document.querySelector(
              'span[data-product-price].product__price'
            );
            const price =
            productPriceElement?.textContent
            ?.split('\n')?.[0]?.trim()
            ?.replace(/[.€]/g, '')
                ?.replace(',', '.') + '€';
            const buttons = document.querySelectorAll(
              '.product-single__form .payment-buttons button[name="add"]'
            );
            const btnText = buttons[buttons.length - 1]?.textContent
              ?.replace(/\n|\t/g, '')
              ?.trim()
              ?.split(' ')?.[0]
              ?.toLowerCase();
            const availability = TYPE_AVAILABILITY[btnText];
            result.push({ model, price, availability });
          } catch (error) {
            continue;
          }
        }
      }

      await page.close();
    } catch (error) {
      console.log(chalk.red(error));
      await writeErrorToLog('simufy.com', error);
    }
  }
  browser.close();

  await saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();

function getSelectedValues(selectElements) {
  const selectedValues = [];

  selectElements.forEach(selectElement => {
    const selectedOption = selectElement.querySelector('option:checked');

    if (selectedOption) {
      selectedValues.push(selectedOption?.textContent?.replace(/\n|\t|SIMAGIC/g, '')?.trim());
    }
  });

  return selectedValues;
}

import fs from 'fs';
import path from 'path';

export function saveAsJSON(filePath, data) {
  return new Promise((resolve, reject) => {
    if (!filePath.endsWith('.json')) {
      filePath += '.json';
    }
    const absolutePath = path.resolve(filePath);
    fs.writeFile(absolutePath, JSON.stringify(data, null, 4), err => {
      if (err) {
        reject(err);
      }
      resolve();
      console.log('save success json');
    });
  });
}
