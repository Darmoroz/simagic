import axios from 'axios';
import puppeteer from 'puppeteer';
import chalk from 'chalk';
import { JSDOM } from 'jsdom';
import { saveDataCSV } from './utils/saveDataCSV.js';
import { convertToCSV } from './utils/convertToCSV.js';
import { formatDate } from './utils/formatDate.js';

const TYPE_AVAILABILITY = {
  sold: 'Out of stock',
  add: 'Available',
  pre: 'Avaliable soon',
};

const outputFileName = `${formatDate(new Date())}_simracingzone.pl`;
let result = [];

(async function () {
  const browser = await puppeteer.launch({
    defaultViewport: { width: 1920, height: 1080 },
  });
  try {
    const page = await browser.newPage();
    await page.goto(
      `https://simracingzone.pl/en/1-baza?SubmitCurrency=1&id_currency=3&resultsPerPage=99999`
    );
    await page.waitForTimeout(3000);
    const data = await page.content();
    const { document } = new JSDOM(data).window;
    const products = [...document.querySelectorAll('div.products.row.products-grid article')];

    const productsSimple = products.filter(product => product.dataset.idProductAttribute === '0');
    const productsVariablesUrls = products
      .filter(product => !(product.dataset.idProductAttribute === '0'))
      .map(product => [...product.querySelectorAll('.variant-links a')])
      .flat()
      .map(i => i.href);

    const productsSimpleInfo = productsSimple.map(product => {
      const model = product
        .querySelector('h2.h3.product-title')
        .textContent.replace(/\n|\t/g, '')
        .trim();
      const price =
        product
          .querySelector('div.product-price-and-shipping span.product-price')
          .getAttribute('content')
          .replace(/(\.\d)$/, '$10') + '€';

      const btnAddElement = product.querySelector('button.btn.btn-product-list.add-to-cart');
      const availability = btnAddElement ? TYPE_AVAILABILITY.add : TYPE_AVAILABILITY.pre;
      return { model, price, availability };
    });
    result = [...result, productsSimpleInfo];

    for (let j = 0; j < productsVariablesUrls.length; j++) {
      const url = productsVariablesUrls[j];
      await page.goto(url);
      const data = await page.content();
      const { document } = new JSDOM(data).window;
      const model = [...document.querySelectorAll('input.input-color[checked="checked"]')]
        .map(i => i.nextElementSibling.textContent)
        .join(' ');
      const price =
        document
          .querySelector('.product-price.current-price-value')
          .getAttribute('content')
          .replace(/(\.\d)$/, '$10') + '€';
      const isBtnAddDisabled = document
        .querySelector(
          'div.product-actions.js-product-actions button[data-button-action="add-to-cart"]'
        )
        .hasAttribute('disabled');
      const availability = isBtnAddDisabled ? TYPE_AVAILABILITY.pre : TYPE_AVAILABILITY.add;
      result.push({ model, price, availability });
    }
    await page.close();
  } catch (error) {
    console.log(chalk.red(error));
  }
  browser.close();
  saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
