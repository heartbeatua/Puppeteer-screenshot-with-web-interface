var app = new Vue({
  el: "#app",

  data: {
    url: "https://heartbeat.ua/",

    isActiveUrlField: true,
    isActiveLoader: false,
    isMapReady: false,

    pages: {
      crawled: [],
      added: [],
      selected: [],
      new_: []
    },
    pagesAdded: "",

    settings: {
      screens: [
        `{ "name": "mobile-portrait", "resolution": { "width": 320, "height": 480 } }`
      ],
      timeout: 100,
      waitUntil: "load",
      lazyload: false
    }
  },

  computed: {
    truncateOrigin() {
      return (page) => {
        let o = new URL(this.url).origin;
        return page === o ? "/" : page.replace(o, "");
      };
    },
    selectAllPages: {
      get() {
        return this.pages.crawled
          ? this.pages.selected.length == this.pages.crawled.length
          : false;
      },
      set(val) {
        var selected = [];
        if (val) {
          this.pages.crawled.forEach((user) => selected.push(user));
        }
        this.pages.selected = selected;
      }
    }
  },

  methods: {
    isNewPage(item) {
      return _.find(this.pages.new_, str => str === item);
    },

    getAddedPages() {
      let areaValue = this.pagesAdded.trim().split("\n");
      this.pages.added = _.compact(areaValue.map((el, i) => {
        return el ? new URL(this.url).origin + el : undefined;
      }));
    },

    startCrawling() {
      let url = this.url = this.url.replace(/\/$/, "");

      this.isActiveLoader = true;
      this.isActiveUrlField = false;

      this.$http.post("/crawl", {
        url
      }).then(res => {
        this.isActiveLoader = false;
        this.isMapReady = true;

        this.pages.crawled = res.body.pages
        this.pages.new_ = res.body.newPages
      });
    },

    startShotsGen() {
      let config = {
        url: this.url,
        screens: this.settings.screens.map(el => JSON.parse(el)),
        timeout: parseInt(this.settings.timeout),
        pages: _.concat(this.pages.selected, this.pages.added),
        waitUntil: this.settings.waitUntil,
        lazyload: this.settings.lazyload
      };

      this.isActiveLoader = true;
      this.$http.post("/shot", config).then(res => {
        this.isActiveLoader = false;
      });
    }
  }
});
