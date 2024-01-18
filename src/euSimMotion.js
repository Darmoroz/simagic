import axios from 'axios';
import chalk from 'chalk';
import { JSDOM } from 'jsdom';
import { saveDataCSV } from './utils/saveDataCSV.js';
import { convertToCSV } from './utils/convertToCSV.js';
import { formatDate } from './utils/formatDate.js';

const TYPE_AVAILABILITY = {
  read: 'Out of stock',
  add: 'Available',
  preorder: 'Pre-order',
};

const outputFileName = `${formatDate(new Date())}_euSimMotion`;
let result = [];

(async function () {
  for (let i = 1; i < 6; i++) {
    console.log('PAGE', chalk.green(i));
    try {
      const { data } = await axios.get(`https://eu.sim-motion.com/page/${i}/?s=simagic&post_type=product&lang=en`);
      const { document } = new JSDOM(data).window;
      const products = [...document.querySelector('.products').querySelectorAll('li.product')];

      const filterProducts = products.filter(product => product.classList.contains('product-type-simple'));
      console.log('Quantity of SIMPLE goods', chalk.yellow(filterProducts.length));

      const variableProductsUrl = products
        .filter(product => product.classList.contains('product-type-variable'))
        .map(product => product.querySelector('a.button').href);
      console.log('Quantity of VARIABLE goods', chalk.yellow(variableProductsUrl.length));

      const productInfo = filterProducts.map(product => {
        const model = product
          .querySelector('.woocommerce-loop-product__title a')
          ?.textContent.replace('Simagic', '')
          .replace('SIMAGIC', '')
          .trim();
        const price = product.querySelector('span.price')?.textContent.replace(' ', '').replace(',', '.');
        const label = product.querySelector('a.button')?.textContent.split(' ')[0].toLowerCase();
        const availability = TYPE_AVAILABILITY[label];
        return { model, price, availability };
      });
      console.log('VARIABLE');
      for (let j = 0; j < variableProductsUrl.length; j++) {
        const url = variableProductsUrl[j];
        const { data } = await axios.get(url);
        const { document } = new JSDOM(data).window;
        const form = document.querySelector('form.variations_form');
        const breadcrumbNavArr = document.querySelector('nav.woocommerce-breadcrumb').childNodes;
        const modelFirstPart = breadcrumbNavArr[breadcrumbNavArr.length - 1].nodeValue
          .replace('Simagic', '')
          .replace('SIMAGIC', '')
          .trim();
        const productsVariableArr = JSON.parse(form.dataset.product_variations);
        console.log('Quantity for', modelFirstPart, productsVariableArr.length);
        const productsVariableInfo = productsVariableArr.map(product => {
          const productKeys = Object.keys(product);
          const attributeName = Object.keys(product.attributes)[0];
          const model = `${modelFirstPart} Style ${product.attributes[attributeName]}`;
          const price = `${product.display_price}.00€`;
          let availability;
          if (!product.is_in_stock) {
            availability = TYPE_AVAILABILITY.read;
          } else {
            if (productKeys.includes('is_pre_order')) {
              availability = TYPE_AVAILABILITY.preorder;
            } else {
              availability = TYPE_AVAILABILITY.add;
            }
          }

          return { model, price, availability };
        });
        result = [...result, productsVariableInfo];
      }
      result = [...result, productInfo];
    } catch (error) {
      console.log(chalk.red(error));
    }
  }
  saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
