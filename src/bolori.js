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

const outputFileName = `${formatDate(new Date())}_bolori.es`;
let result = [];
let totalPages = 1;

(async function () {
  for (let i = 1; i < 20; i++) {
    try {
      if (i > totalPages) {
        break;
      }
      console.log('PAGE', chalk.green(i));
      const { data } = await axios.get(`https://bolori.es/en/shop/page/${i}`);
      const { document } = new JSDOM(data).window;
      totalPages = Math.ceil(
        document.querySelector('p.woocommerce-result-count').textContent.match(/of (\d+)/)[1] / 12
      );

      const products = [...document.querySelectorAll('.products.columns-3>li')];
      const productsSimple = products.filter(product => product.classList.contains('product-type-simple'));
      const productsVariableUrls = products
        .filter(product => product.classList.contains('product-type-variable'))
        .map(product => product.querySelector('.woocommerce-LoopProduct-link').href);

      const productsInfoSimple = productsSimple.map(product => {
        const model = product
          .querySelector('.woocommerce-loop-product__title')
          ?.textContent.replace('Simagic', '')
          .trim();
        const priceContainer = product.querySelectorAll('.woocommerce-Price-amount bdi');
        const price = priceContainer[priceContainer.length - 1].childNodes[0].data + '€';
        const availability =
          TYPE_AVAILABILITY[
            product.querySelector('a.add_to_cart_button')?.textContent.substring(0, 3).trim().toLowerCase()
          ];
        return { model, price, availability };
      });
      for (let j = 0; j < productsVariableUrls.length; j++) {
        const url = productsVariableUrls[j];
        const { data } = await axios.get(url);
        const { document } = new JSDOM(data).window;
        const modelFirstPart = document.querySelector('h1.product_title')?.textContent.trim();
        const form = document.querySelector('form.variations_form');
        const productsVariableArr = JSON.parse(form.dataset.product_variations);
        const productsInfoVariable = productsVariableArr.map(product => {
          let model;
          let availability;
          const productAtributesKeys = Object.keys(product.attributes);
          if (productAtributesKeys.length === 2) {
            model = modelFirstPart + ' ' + product.attributes['attribute_anadir-volante'];
          } else {
            model = modelFirstPart + ' ' + product.attributes[productAtributesKeys[0]];
          }
          const price = product.display_price + '.00€';
          const availabilityElement = new JSDOM(product.availability_html).window.document
            .querySelector('p')
            ?.textContent.split(' ')[0]
            .toLocaleLowerCase();
          if (availabilityElement === 'en' || availabilityElement === 'disponible') {
            availability = TYPE_AVAILABILITY.add;
          }
          return { model, price, availability };
        });
        result = [...result, productsInfoVariable];
      }
      result = [...result, productsInfoSimple];
    } catch (error) {
      console.log(chalk.red(error));
    }
  }
  saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
