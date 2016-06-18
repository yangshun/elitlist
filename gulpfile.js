const gulp = require('gulp');
const runSequence = require('run-sequence');
const request = require('request');
const rp = require('request-promise');
const cheerio = require('cheerio');
const pdfjs = require('pdfjs-dist');
const fs = require('graceful-fs');
const source = require('vinyl-source-stream');
const del = require('del');
const through = require('through2');
const gutil = require('gulp-util');
const chalk = require('chalk');
const File = require('vinyl');
const _ = require('lodash');

const RAW_DATA_PATH = 'raw';
const PARSED_DATA_PATH = 'data';
const SOC = 'soc';
const RAW_SOC_DATA_PATH = `./${RAW_DATA_PATH}/${SOC}`;
const PARSED_SOC_DATA_PATH = `./${PARSED_DATA_PATH}/${SOC}.json`;

gulp.task('clean:raw', function () {
  return del([RAW_DATA_PATH]);
});

gulp.task('clean:raw:soc', function () {
  return del([RAW_SOC_DATA_PATH]);
});

gulp.task('clean:data', function () {
  return del([PARSED_DATA_PATH]);
});

gulp.task('clean:data:soc', function () {
  return del([PARSED_SOC_DATA_PATH]);
});

gulp.task('clean:soc', ['clean:raw:soc', 'clean:data:soc']);
gulp.task('clean', ['clean:raw', 'clean:data']);

gulp.task('fetch:soc', ['clean:raw:soc'], function (cb) {
  const SOC_DATA_HOST = 'http://www.comp.nus.edu.sg';
  const SOC_DATA_PATH = '/programmes/ug/honour/deans';

  rp({
    uri: `${SOC_DATA_HOST}${SOC_DATA_PATH}`,
    transform: function (body) {
      return cheerio.load(body);
    }
  }).then(function ($) {
    gutil.log('SoC Dean\'s List page fetched');
    const $links = $('#t3-content .article-content a');
    const linksHrefs = $links.filter(function () {
                          return /\.pdf$/.test($(this).attr('href'));
                        })
                        .map(function () {
                          return $(this).attr('href');
                        })
                        .toArray();
    Promise
      .all(linksHrefs.map(function (linkHref) {
        return new Promise(function (resolve, reject) {
          const regexMatches = new RegExp(/([^\/]*)\.pdf/).exec(linkHref);
          const fileName = regexMatches[regexMatches.length - 1];
          request
            .get(`${SOC_DATA_HOST}${linkHref}`)
            .pipe(source(`${fileName}.pdf`))
            .pipe(gulp.dest(RAW_SOC_DATA_PATH))
            .on('end', resolve);
        });
      }))
      .then(() => {
        cb();
      });
  });
});

gulp.task('aggregate:soc', function (cb) {
  const students = {};

  return gulp.src(`${RAW_SOC_DATA_PATH}/*.pdf`)
    .pipe(gutil.buffer())
    .pipe(through.obj(function (files, enc, cb) {
      Promise.all(files.map(function (file) {
        return new Promise(function (resolve, reject) {
          const regexMatches = new RegExp(/\w*(\d{3})0[^\/]*\.pdf/).exec(file.path);
          const acadYearAndSem = regexMatches[regexMatches.length - 1];
          const acadYear = acadYearAndSem.substring(0, 2);
          const sem = acadYearAndSem.substring(2);
          const acadYearSemFull = `AY${acadYear}/${parseInt(acadYear) + 1} Sem ${sem}`;

          pdfjs.getDocument(file.contents).then(function (pdfDocument) {
            pdfDocument.getPage(1).then((page) => {
              page.getTextContent().then((content) => {
                const scales = {};
                const textEntities = content.items.map((item) => {
                  const text = item.str;
                  if (/\d+|[a-z]|^\s*$/g.test(text)) {
                    // Filter out non-student names
                    return;
                  }

                  const studentName = text;
                  if (!students.hasOwnProperty(studentName)) {
                    students[studentName] = [];
                  }
                  students[studentName].push(acadYearSemFull);
                });

                gutil.log(`SoC ${acadYearSemFull} Dean's List`, chalk.green('✔ ') );
                resolve();
              });
            })
          });
        });
      }))
      .then(() => {
        const sortedStudents = {};
        Object.keys(students).sort().forEach(function (name) {
          sortedStudents[name.split(' ').map(_.capitalize).join(' ')] = students[name].sort();
        });

        const file = new File({
          path: `${SOC}.json`,
          contents: new Buffer(JSON.stringify(sortedStudents, null, 2), 'utf-8')
        });
        cb(null, file);
      });
    }))
    .pipe(gulp.dest(`./${PARSED_DATA_PATH}`));
});

gulp.task('soc', function (cb) {
  runSequence('clean:soc', 'fetch:soc', 'aggregate:soc', cb);
});

gulp.task('default');
