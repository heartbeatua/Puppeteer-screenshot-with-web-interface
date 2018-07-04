const fs = require('fs');
const _ = require('lodash');
const util = require('util');
const mkdirp = require('mkdirp');
const URL = require('url-parse');
const express = require('express');
const cheerio = require("cheerio");
const puppeteer = require('puppeteer');

const router = express.Router();


router.post('/', function(req, res, next) {

  const SITE_URL = req.body.url;
  const OUTPUT_DIR = 'shots';
  const PROJECT_DIR = `${OUTPUT_DIR}/${slugify(SITE_URL)}`;

  function slugify(str) {
    return str.replace(/http(s?):\/\//, '');
  }

  mkdirp(PROJECT_DIR);

  (async() => {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(SITE_URL, {
      //timeout: 0,
      waitUntil: 'domcontentloaded'
    });

    await page.evaluate(() => document.body.innerHTML).then((html) => {

      let $ = cheerio.load(html);
      let getlinks = $("a");
      let linksArray = [];

      getlinks.each((i, link) => {
        let href = link.attribs.href;
        if (href) {
          linksArray.push(href.replace(/\/$/, ''));
        }
      });

      let parseUrl = new URL(SITE_URL);
      let newArr = _.compact(linksArray).map(el => {
        let exp;
        if (el === '/') {
          exp = undefined;
        } else if (el.match(/^\/\//) !== null) {
          if (el.match(parseUrl.host)) {
            exp = parseUrl.protocol + el;
          }
        } else if (el.match(/^\//) !== null) {
          exp = parseUrl.protocol + '//' + parseUrl.host + el;
        } else if (el.match(/http/) !== null)  {
          exp = new URL(el).host.match(parseUrl.host) !== null ? el : undefined;
        }
        return exp;
      });
      newArr.push(parseUrl.origin);
      newArr.sort((a, b) => a.length - b.length);

      linksArray = _.compact(_.uniq(newArr));

      let getCurrentCrawl;
      try {
        getCurrentCrawl = JSON.parse(fs.readFileSync(`${PROJECT_DIR}/crawl.json`, 'utf8'));
      } catch(err) {
        getCurrentCrawl = {
          pages: []
        };
      }

      util.promisify(fs.writeFile)(`${PROJECT_DIR}/crawl.json`, JSON.stringify({
        url: SITE_URL,
        pages: linksArray
      }, null, 2));

      res.send({
        pages: linksArray,
        newPages: _.difference(linksArray, getCurrentCrawl.pages)
      });
    });

    await browser.close();

  })();

});

module.exports = router
