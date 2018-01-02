const _ = require('lodash');
const chalk = require('chalk');
const cheerio = require('cheerio');
const del = require('del');
const gulp = require('gulp');
const gutil = require('gulp-util');
const path = require('path');
const pdfjs = require('pdfjs-dist');
const request = require('request');
const rp = require('request-promise');
const source = require('vinyl-source-stream');
const through = require('through2');
const File = require('vinyl');

const combine = require('./combine');
const c = require('./constants');
const nameFormatter = require('../utils/nameFormatter');

const RAW_ENGINEERING_DATA_PATH = path.join(
  c.dataPaths.raw,
  c.faculties.engineering.dir,
);
const PARSED_ENGINEERING_DATA_PATH = path.join(
  c.dataPaths.parsed,
  c.faculties.engineering.dir,
);
const RAW_ENGINEERING_DEANS_LIST_DATA_PATH = path.join(
  RAW_ENGINEERING_DATA_PATH,
  c.awards.deansList.dir,
);
const ENGINEERING_DATA_HOST = c.faculties.engineering.host;

function cleanRawEngineeringData() {
  return del([RAW_ENGINEERING_DATA_PATH]);
}

function cleanParsedEngineeringData() {
  return del([PARSED_ENGINEERING_DATA_PATH]);
}

function fetchEngineeringDeansList(cb) {
  // const ENGINEERING_DEANS_LIST_URL_PATH = '/ugrad/awards.html';
  const ENGINEERING_DEANS_LIST_URL_PATH =
    '/undergraduatestudies/academics/honours-and-awards/deans-list/';
  rp({
    uri: `${ENGINEERING_DATA_HOST}${ENGINEERING_DEANS_LIST_URL_PATH}`,
    transform: body => cheerio.load(body),
  }).then($ => {
    gutil.log("Engineering Dean's List page fetched");
    const $links = $('.ts-advanced-tables-wrapper a');
    let linksHrefs = $links
      .map(function() {
        return $(this).attr('href');
      })
      .toArray()
      .filter(url => /\.pdf$/.test(url));
    Promise.all(
      linksHrefs.map(linkHref => {
        return new Promise((resolve, reject) => {
          const fileName = _.last(linkHref.split('/'));
          request
            .get(linkHref)
            .pipe(source(fileName))
            .pipe(
              gulp.dest(
                path.join(RAW_ENGINEERING_DATA_PATH, c.awards.deansList.dir),
              ),
            )
            .on('end', resolve);
        });
      }),
    ).then(() => {
      cb();
    });
  });
}

function parseEngineeringDeansList(cb) {
  const students = {};
  return gulp
    .src(path.join(RAW_ENGINEERING_DEANS_LIST_DATA_PATH, '*.pdf'))
    .pipe(gutil.buffer())
    .pipe(
      through.obj((files, enc, cb) => {
        Promise.all(
          files.map(file => {
            return new Promise((resolve, reject) => {
              const regexMatches = new RegExp(
                /AY(\d{2})(\d{2})-.*(\d)\.pdf/,
              ).exec(file.path);
              const sem = parseInt(regexMatches[3], 10);
              const acadYearFull = `${regexMatches[1]}/${regexMatches[2]}`;
              const acadYearSemFull = `${acadYearFull} Sem ${sem}`;

              pdfjs.getDocument(file.contents).then(pdfDocument => {
                const numPages = pdfDocument.numPages;
                const rows = {};
                Promise.all(
                  _.range(1, numPages + 1).map(pageNum => {
                    return new Promise((resolve2, reject2) => {
                      pdfDocument.getPage(pageNum).then(page => {
                        page.getTextContent().then(content => {
                          content.items.forEach(item => {
                            const rowId = `${pageNum}-${parseInt(
                              item.transform[5],
                            )}`;
                            if (!rows.hasOwnProperty(rowId)) {
                              rows[rowId] = '';
                            }
                            if (item.str.trim()) {
                              rows[rowId] += ` ${item.str.trim()}`;
                              rows[rowId] = rows[rowId].trim();
                            }
                          });
                          resolve2();
                        });
                      });
                    });
                  }),
                ).then(() => {
                  const studentNames = [];
                  _.values(rows).forEach(row => {
                    // Removes the S/N, (DDP), Department (e.g. MPE3) from each row
                    const studentName = row
                      .replace(/(\d+|B\.Tech|\(DDP\))/g, '')
                      .replace(/ [A-Z]?[a-z]?[A-Z]{2}\d?$/, '');
                    if (
                      studentName.trim() !== '' &&
                      !/(course|semester|name|major)/i.test(studentName)
                    ) {
                      studentNames.push(nameFormatter(studentName));
                    }
                  });
                  _.uniq(studentNames).forEach(studentName => {
                    if (!students.hasOwnProperty(studentName)) {
                      students[studentName] = [];
                    }
                    students[studentName].push({
                      Type: c.awards.deansList.name,
                      AcadYear: acadYearFull,
                      Sem: sem,
                    });
                  });

                  gutil.log(
                    `${c.faculties.engineering.name} AY${acadYearSemFull} ${
                      c.awards.deansList.name
                    }`,
                    chalk.green('✔ '),
                  );
                  resolve();
                });
              });
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
    .pipe(gulp.dest(PARSED_ENGINEERING_DATA_PATH));
}

function combineEngineeringAwards() {
  return combine.combineAwardsForFaculty(PARSED_ENGINEERING_DATA_PATH);
}

module.exports = {
  cleanRawEngineeringData,
  cleanParsedEngineeringData,
  fetchEngineeringDeansList,
  parseEngineeringDeansList,
  combineEngineeringAwards,
};
