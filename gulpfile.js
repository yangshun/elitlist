const gulp = require('gulp');
const request = require('request');
const rp = require('request-promise');
const cheerio = require('cheerio');
const pdfjs = require('pdfjs-dist');
const fs = require('graceful-fs');
const source = require('vinyl-source-stream');
const del = require('del');

const RAW_DATA_PATH = 'raw';
const SOC_PATH = 'soc';

gulp.task('cleanraw', function () {
  return del([RAW_DATA_PATH]);
});

gulp.task('soc', ['cleanraw'], function () {
  const RAW_SOC_DATA_PATH = `./${RAW_DATA_PATH}/${SOC_PATH}`;

  const SOC_DATA_HOST = 'http://www.comp.nus.edu.sg';
  const SOC_DATA_PATH = '/programmes/ug/honour/deans';

  rp({
    uri: `${SOC_DATA_HOST}${SOC_DATA_PATH}`,
    transform: function (body) {
      return cheerio.load(body);
    }
  }).then(function ($) {
    console.log('SoC Dean\'s List page fetched');
    const $links = $('#t3-content .article-content a');
    const linksHrefs = $links.filter(function () {
                          return /\.pdf$/.test($(this).attr('href'));
                        })
                        .map(function () {
                          return $(this).attr('href');
                        });
    linksHrefs.each(function (i, linkHref) {
      const regexMatches = new RegExp(/([^\/]*)\.pdf/).exec(linkHref);
      const fileName = regexMatches[regexMatches.length - 1];
      request
        .get(`${SOC_DATA_HOST}${linkHref}`)
        .pipe(source(`${fileName}.pdf`))
        .pipe(gulp.dest(RAW_SOC_DATA_PATH));
    });
  });
});

gulp.task('compilesoc', ['cleanraw', 'soc'], function () {

});

gulp.task('default', ['cleanraw', 'soc']);
