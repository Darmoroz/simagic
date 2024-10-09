import axios from 'axios';
import chalk from 'chalk';
import fs from 'fs';
import puppeteer from 'puppeteer';

import { saveDataCSV } from './utils/saveDataCSV.js';
import { convertToCSV } from './utils/convertToCSV.js';
import { formatDate } from './utils/formatDate.js';
import { writeErrorToLog } from './utils/writeErrorToLog.js';

const TYPE_AVAILABILITY = {
  sold: 'Out of stock',
  add: 'Available',
  pre: 'Pre-order',
};
const COOKIES=[
  {
      "name": "keep_alive",
      "value": "b3fa8400-2ab4-4590-9aff-ea131862f6b7",
      "domain": "simhub.pro",
      "path": "/",
      "expires": 1728506760.74677,
      "size": 46,
      "httpOnly": true,
      "secure": false,
      "session": false,
      "sameSite": "Lax",
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  },
  {
      "name": "_gcl_au",
      "value": "1.1.1512924373.1728504960",
      "domain": ".simhub.pro",
      "path": "/",
      "expires": 1736280959,
      "size": 32,
      "httpOnly": false,
      "secure": false,
      "session": false,
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  },
  {
      "name": "_fbp",
      "value": "fb.1.1728504959792.723485102116337561",
      "domain": ".simhub.pro",
      "path": "/",
      "expires": 1736280959,
      "size": 41,
      "httpOnly": false,
      "secure": false,
      "session": false,
      "sameSite": "Lax",
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  },
  {
      "name": "_ga_9RHWCM1EKS",
      "value": "GS1.1.1728504960.1.0.1728504960.0.0.0",
      "domain": ".simhub.pro",
      "path": "/",
      "expires": 1763064960.042988,
      "size": 51,
      "httpOnly": false,
      "secure": false,
      "session": false,
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  },
  {
      "name": "_ga_T2E92NRWSS",
      "value": "GS1.1.1728504957.1.1.1728504958.59.0.344763150",
      "domain": ".simhub.pro",
      "path": "/",
      "expires": 1763064958.140733,
      "size": 60,
      "httpOnly": false,
      "secure": false,
      "session": false,
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  },
  {
      "name": "_cmp_a",
      "value": "%7B%22purposes%22%3A%7B%22a%22%3Atrue%2C%22p%22%3Atrue%2C%22m%22%3Atrue%2C%22t%22%3Atrue%7D%2C%22display_banner%22%3Afalse%2C%22sale_of_data_region%22%3Afalse%7D",
      "domain": ".simhub.pro",
      "path": "/",
      "expires": 1728591360.747078,
      "size": 167,
      "httpOnly": false,
      "secure": false,
      "session": false,
      "sameSite": "Lax",
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  },
  {
      "name": "_orig_referrer",
      "value": "",
      "domain": ".simhub.pro",
      "path": "/",
      "expires": 1729714554.978167,
      "size": 14,
      "httpOnly": true,
      "secure": false,
      "session": false,
      "sameSite": "Lax",
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  },
  {
      "name": "_ga",
      "value": "GA1.1.76940383.1728504958",
      "domain": ".simhub.pro",
      "path": "/",
      "expires": 1763064960.04403,
      "size": 28,
      "httpOnly": false,
      "secure": false,
      "session": false,
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  },
  {
      "name": "_shopify_y",
      "value": "2ab95a77-ad16-4f1f-a205-06a22f9eff5a",
      "domain": ".simhub.pro",
      "path": "/",
      "expires": 1760040960.747169,
      "size": 46,
      "httpOnly": false,
      "secure": false,
      "session": false,
      "sameSite": "Lax",
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  },
  {
      "name": "_shopify_sa_t",
      "value": "2024-10-09T20%3A15%3A56.173Z",
      "domain": ".simhub.pro",
      "path": "/",
      "expires": 1728506756,
      "size": 41,
      "httpOnly": false,
      "secure": false,
      "session": false,
      "sameSite": "Lax",
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  },
  {
      "name": "_shopify_s",
      "value": "a3b6be67-90a2-4bcf-b998-3a8de340a8dc",
      "domain": ".simhub.pro",
      "path": "/",
      "expires": 1728506760.747237,
      "size": 46,
      "httpOnly": false,
      "secure": false,
      "session": false,
      "sameSite": "Lax",
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  },
  {
      "name": "_landing_page",
      "value": "%2Fsearch%3Fpage%3D1%26q%3DSimagic",
      "domain": ".simhub.pro",
      "path": "/",
      "expires": 1729714554.978191,
      "size": 47,
      "httpOnly": true,
      "secure": false,
      "session": false,
      "sameSite": "Lax",
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  },
  {
      "name": "_shopify_sa_p",
      "value": "",
      "domain": ".simhub.pro",
      "path": "/",
      "expires": 1728506756,
      "size": 13,
      "httpOnly": false,
      "secure": false,
      "session": false,
      "sameSite": "Lax",
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  },
  {
      "name": "localization",
      "value": "UA",
      "domain": "simhub.pro",
      "path": "/",
      "expires": 1760040960.747017,
      "size": 14,
      "httpOnly": false,
      "secure": false,
      "session": false,
      "sameSite": "Lax",
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  },
  {
      "name": "_tracking_consent",
      "value": "%7B%22con%22%3A%7B%22CMP%22%3A%7B%22a%22%3A%22%22%2C%22m%22%3A%22%22%2C%22p%22%3A%22%22%2C%22s%22%3A%22%22%7D%7D%2C%22v%22%3A%222.1%22%2C%22region%22%3A%22UA07%22%2C%22reg%22%3A%22%22%2C%22purposes%22%3A%7B%22a%22%3Atrue%2C%22p%22%3Atrue%2C%22m%22%3Atrue%2C%22t%22%3Atrue%7D%2C%22display_banner%22%3Afalse%2C%22sale_of_data_region%22%3Afalse%7D",
      "domain": ".simhub.pro",
      "path": "/",
      "expires": 1760040954.978026,
      "size": 361,
      "httpOnly": false,
      "secure": false,
      "session": false,
      "sameSite": "Lax",
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  },
  {
      "name": "secure_customer_sig",
      "value": "",
      "domain": "simhub.pro",
      "path": "/",
      "expires": 1760040960.746948,
      "size": 19,
      "httpOnly": true,
      "secure": true,
      "session": false,
      "sameSite": "Lax",
      "sameParty": false,
      "sourceScheme": "Secure",
      "sourcePort": 443
  }
]

const outputFileName = `${formatDate(new Date())}_simhub.pro`;

(async function () {
  const browser = await puppeteer.launch({
    // headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const [page] = await browser.pages();
  await page.setCookie(...COOKIES);
  const MAX_RETRIES = 3;
  const resultsFull = [];
  for (let pageLink = 1; pageLink < 8; pageLink++) {
    console.log('PAGE', pageLink);
    try {
      await page.goto(`https://simhub.pro/search?page=${pageLink}&q=Simagic`);
      const products = await page.evaluate(() => {
        return window.GloboPreorderParams.products;
      });
      resultsFull.push(...products);
    } catch (error) {
      console.log(chalk.red(error));
      await writeErrorToLog('simhub.pro', error);
    }
  }
  browser.close();
  const result = resultsFull.map(item => {
    const nameFirst = item.title.replace('Simagic', '');
    const variationsItem = item.variants.map(i => {
      const model = `${nameFirst} ${i.title.replace('Default Title', '')}`.trim();
      const price = String(i.price).replace(/(\d{2})$/, '.$1') + '€';
      const availability = !i.available
        ? TYPE_AVAILABILITY.sold
        : i.inventory_quantity <= 0
        ? TYPE_AVAILABILITY.pre
        : TYPE_AVAILABILITY.add;
      return { model, price, availability };
    });
    return variationsItem;
  });
  await saveDataCSV(convertToCSV(result.flat()), outputFileName);
})();
