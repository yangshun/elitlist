const chalk = require('chalk');
const cheerio = require('cheerio');
const del = require('del');
const gulp = require('gulp');
const gutil = require('gulp-util');
const path = require('path');
const request = require('request');
const source = require('vinyl-source-stream');
const through = require('through2');
const File = require('vinyl');

const combine = require('./combine');
const c = require('./constants');
const nameFormatter = require('../utils/nameFormatter');

const RAW_BUSINESS_DATA_PATH = path.join(
  c.dataPaths.raw,
  c.faculties.business.dir,
);
const PARSED_BUSINESS_DATA_PATH = path.join(
  c.dataPaths.parsed,
  c.faculties.business.dir,
);
const RAW_BUSINESS_DEANS_LIST_DATA_PATH = path.join(
  RAW_BUSINESS_DATA_PATH,
  c.awards.deansList.dir,
);
const BUSINESS_DATA_HOST = c.faculties.business.host;

function cleanRawBusinessData() {
  return del([RAW_BUSINESS_DATA_PATH]);
}

function cleanParsedBusinessData() {
  return del([PARSED_BUSINESS_DATA_PATH]);
}

function fetchBusinessDeansList(cb) {
  const BUSINESS_DEANS_LIST_URL_PATH =
    '/bba-honour-roll/student-honour-rolls/dean-s-list';
  request
    .get(`${BUSINESS_DATA_HOST}${BUSINESS_DEANS_LIST_URL_PATH}`)
    .pipe(source('honour_deanslist.html'))
    .pipe(gulp.dest(path.join(RAW_BUSINESS_DATA_PATH, c.awards.deansList.dir)))
    .on('end', () => {
      gutil.log(
        `${c.faculties.business.name} ${c.awards.deansList.name} page fetched`,
      );
      cb();
    });
}

function parseBusinessDeansList(cb) {
  const students = {};
  return gulp
    .src(path.join(RAW_BUSINESS_DEANS_LIST_DATA_PATH, '*.html'))
    .pipe(gutil.buffer())
    .pipe(
      through.obj((files, enc, cb) => {
        Promise.all(
          files.map(file => {
            return new Promise(function(resolve, reject) {
              const $ = cheerio.load(file.contents.toString());
              const $acadYears = $('.item-page .list-unstyled li');
              $acadYears.each(function() {
                const $acadYear = $(this);
                const acadYearHeader = $acadYear.find('a').text();

                const regexMatches = new RegExp(/AY20(\d{2})\/20(\d{2})/).exec(
                  acadYearHeader,
                );
                const acadYearFull = `${regexMatches[1]}/${regexMatches[2]}`;
                $acadYear.find('tr').each(function(rowNumber) {
                  // This is the useless row which says 'SEMESTER 1 / SEMESTER 2'.
                  if (rowNumber === 0) {
                    return;
                  }
                  const $row = $(this);
                  $row.find('td').each(function(colNumber) {
                    // This is the useless spacer column used to create the illusion
                    // that the table are separate..
                    if (colNumber === 2) {
                      return;
                    }
                    const $td = $(this);
                    const text = $td.text();
                    if (/\d+|[a-z]|^\s*$/g.test(text)) {
                      // Filter out non-student names
                      return;
                    }
                    const studentName = nameFormatter(text);
                    if (!students.hasOwnProperty(studentName)) {
                      students[studentName] = [];
                    }
                    students[studentName].push({
                      Type: c.awards.deansList.name,
                      AcadYear: acadYearFull,
                      Sem: 1 + (colNumber <= 1 ? 0 : 1),
                    });
                  });
                });

                [1, 2].forEach(sem => {
                  gutil.log(
                    `${
                      c.faculties.business.name
                    } AY${acadYearFull} Sem ${sem} ${c.awards.deansList.name}`,
                    chalk.green('✔ '),
                  );
                });
              });
              resolve();
            });
          }),
        ).then(() => {
          const sortedStudents = {};
          if (Object.keys(students).length === 0) {
            console.warn('Empty data. The data format has likely changed.');
            return;
          }
          Object.keys(students)
            .sort()
            .forEach(name => {
              sortedStudents[name] = students[name].sort();
            });
          const file = new File({
            path: `${c.awards.deansList.fileName}.json`,
            contents: new Buffer(
              JSON.stringify(sortedStudents, null, 2),
              'utf-8',
            ),
          });
          cb(null, file);
        });
      }),
    )
    .pipe(gulp.dest(PARSED_BUSINESS_DATA_PATH));
}

function combineBusinessAwards() {
  return combine.combineAwardsForFaculty(PARSED_BUSINESS_DATA_PATH);
}

module.exports = {
  cleanRawBusinessData,
  cleanParsedBusinessData,
  fetchBusinessDeansList,
  parseBusinessDeansList,
  combineBusinessAwards,
};
