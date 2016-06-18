const gulp = require('gulp');
const request = require('request');
const rp = require('request-promise');
const cheerio = require('cheerio');
const fs = require('graceful-fs');
const remoteSrc = require('gulp-remote-src');

gulp.task('remote', function() {

  remoteSrc(['DL1510.websiteupdate.pdf'], {
    base: 'http://www.comp.nus.edu.sg/images/resources/content/undergraduates/'
  })
    .pipe(gulp.dest('./dist/'));
})

gulp.task('soc', function() {
  const HOST = 'http://www.comp.nus.edu.sg';
  const PATH = '/programmes/ug/honour/deans';

  rp({
    uri: `${HOST}${PATH}`,
    transform: function (body) {
      return cheerio.load(body);
    }
  }).then(function ($) {
    console.log('SoC Dean\'s List page downloaded');
    const $links = $('#t3-content .article-content a');
    const linksHrefs = $links.filter(function () {
                          return /\.pdf$/.test($(this).attr('href'));
                        })
                        .map(function () {
                          return $(this).attr('href');
                        });
    console.log(`${HOST}${linksHrefs[0]}`);
    request
      .get(`${HOST}${linksHrefs[0]}`)
      .pipe(gulp.dest('./data/'))
      .on('close', function () {
        console.log('done');
      });

      // linksHrefs.each(function (i, linkHref) {
      //   request
      //     .get(`${HOST}${linkHref}`)
      //     .then((response) => {
      //       console.log(response.data);
      //     });
      // });
      // console.log('hihi');
      // console.log(data);
      // console.log('byebye');
  });
});
