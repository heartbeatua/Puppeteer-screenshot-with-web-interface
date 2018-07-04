const fs = require('fs');
const mkdirp = require('mkdirp');
const URL = require('url-parse');
const express = require('express');
const now = require("performance-now");
const puppeteer = require('puppeteer');

const router = express.Router();


router.post('/', function(req, res, next) {

  const SITE_URL = req.body.url;
  const TIMEOUT = req.body.timeout;
  const WAIT_UNTIL = req.body.waitUntil;
  const PAGES = req.body.pages;
  const SCREENS = req.body.screens;
  const LAZYLOAD = req.body.lazyload;
  const OUTPUT_DIR = 'shots';

  function slugify(str) {
    return str.replace(/http(s?):\/\//, '');
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
  }

  async function makeShot(browser, pageSettings) {
    const newPage = await browser.newPage();
    await newPage.setViewport(pageSettings.viewport);
    await newPage.goto(pageSettings.page, {
      waitUntil: WAIT_UNTIL
    });
    await newPage.waitFor(TIMEOUT);

    const bodyHandle = await newPage.$('body');
    const { width, height } = await bodyHandle.boundingBox();

    // https://www.screenshotbin.com/blog/handling-lazy-loaded-webpages-puppeteer
    if (LAZYLOAD) {

      // Scroll one viewport at a time, pausing to let content load
      const viewportHeight = newPage.viewport().height;
      let viewportIncr = 0;
      while (viewportIncr + viewportHeight < height) {
        await newPage.evaluate(_viewportHeight => {
          window.scrollBy(0, _viewportHeight);
        }, viewportHeight);
        await wait(200);
        viewportIncr = viewportIncr + viewportHeight;
      }

      // Scroll back to top
      await newPage.evaluate(_ => {
        window.scrollTo(0, 0);
      });

      // Some extra delay to let images load
      await wait(1000);
    }

    // hack: https://github.com/GoogleChrome/puppeteer/issues/703
    const screenshot = await newPage.screenshot({
      path: pageSettings.path,
      clip: {
        x: 0,
        y: 0,
        width,
        height
      },
      type: 'png'
    });

    await bodyHandle.dispose();
    await newPage.close();
  }

  (async() => {
    const browser = await puppeteer.launch({
      //headless: false
    });

    for (let i = 0, l = PAGES.length; i < l; i++) {

      let page = PAGES[i];
      let dir = `${OUTPUT_DIR}/${slugify(page)}` + (page === new URL(SITE_URL).origin ? '/home' : '');

      mkdirp(dir);

      for (let scr of SCREENS) {
        let name = scr.name;
        let start = now();
        let path = `${dir}/${name}.png`;
        let viewport = scr.resolution;

        let settings = {
          viewport, page, path
        }

        await makeShot(browser, settings);

        console.log(`${page} ${name}.png (${((now() - start)/1000).toFixed(3)}s)`);
      }
    }

    await browser.close();
    await res.send({
      status: 'ok'
    });
  })();

});

module.exports = router
