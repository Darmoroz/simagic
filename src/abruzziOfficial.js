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
  pre: 'Pre-order',
};

const outputFileName = `${formatDate(new Date())}_abruzzi-official.co.uk`;
let result = [];

(async function () {
  try {
    const { data } = await axios.get(`https://abruzzi-official.co.uk/shop/?filter_brand=simagic&et_per_page=-1`);
    const { document } = new JSDOM(data).window;
    const products = [...document.querySelectorAll('.ajax-content.clearfix > .product')];
    const productsSimple = products.filter(product => product.classList.contains('product-type-simple'));
    const productsVariableUrls = products
      .filter(product => product.classList.contains('product-type-variable'))
      .map(product => product.querySelector('.woocommerce-LoopProduct-link').href);
    console.log('Кількість простих товарів', productsSimple.length);
    console.log('Кількість варіативних товарів', productsVariableUrls.length);

    const productsInfoSimple = productsSimple.map(product => {
      const model = product.querySelector('h2.product-title a')?.textContent.replace('Simagic', '').trim();
      const priceContainer = product.querySelectorAll('.woocommerce-Price-amount bdi');
      const price = priceContainer[priceContainer.length - 1].childNodes[1].data.replace(',', '') + '£';
      const availability = product.classList.contains('instock') ? TYPE_AVAILABILITY.add : TYPE_AVAILABILITY.pre;
      return { model, price, availability };
    });
    for (let j = 0; j < productsVariableUrls.length; j++) {
      const url = productsVariableUrls[j];
      const { data } = await axios.get(url);
      const { document } = new JSDOM(data).window;
      const modelFirstPart = document.querySelector('h1.product_title')?.textContent.replace('Simagic', '').trim();
      const form = document.querySelector('form.variations_form');
      const productsVariableArr = JSON.parse(form.dataset.product_variations);
      const productsInfoVariable = productsVariableArr.map(product => {
        let availability;
        const model =
          modelFirstPart + ' ' + Object.values(product.attributes).reduce((acc, val) => acc + ' ' + val, '');
        const price = String(product.display_price).replace(',', '') + '.00£';
        const availabilityElement = new JSDOM(product.availability_html).window.document
          .querySelector('p')
          ?.textContent.trim()
          .split(' ')[0];

        if (availabilityElement.length < 3) {
          availability = TYPE_AVAILABILITY.add;
        } else {
          if (availabilityElement.length === 3) {
            availability = TYPE_AVAILABILITY.sold;
          } else {
            availability = TYPE_AVAILABILITY.pre;
          }
        }
        return { model, price, availability };
      });
      result.push(productsInfoVariable);
    }
    result.push(productsInfoSimple);
  } catch (error) {
    console.log(chalk.red(error));
  }
  saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
