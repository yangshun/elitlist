const chalk = require('chalk');
const cheerio = require('cheerio');
const del = require('del');
const gulp = require('gulp');
const gutil = require('gulp-util');
const path = require('path');
const pdfjs = require('pdfjs-dist');
const request = require('request');
const rp = require('request-promise');
const runSequence = require('run-sequence');
const source = require('vinyl-source-stream');
const through = require('through2');
const File = require('vinyl');

const aggregate = require('./aggregate');
const c = require('./constants');
const nameFormatter = require('../utils/nameFormatter');

const RAW_COMPUTING_DATA_PATH = `./${c.dataPaths.raw}/${
  c.faculties.computing.dir
}`;
const PARSED_COMPUTING_DATA_PATH = `./${c.dataPaths.parsed}/${
  c.faculties.computing.dir
}`;
const RAW_COMPUTING_DEANS_LIST_DATA_PATH = `${RAW_COMPUTING_DATA_PATH}/${
  c.awards.deansList.dir
}`;
const RAW_COMPUTING_FACULTY_DATA_PATH = `${RAW_COMPUTING_DATA_PATH}/${
  c.awards.faculty.dir
}`;
const RAW_COMPUTING_COMMENCEMENT_DATA_PATH = `${RAW_COMPUTING_DATA_PATH}/${
  c.awards.commencement.dir
}`;
const COMPUTING_DATA_HOST = c.faculties.computing.host;

function cleanRawComputingData() {
  return del([RAW_COMPUTING_DATA_PATH]);
}

function cleanParsedComputingData() {
  return del([PARSED_COMPUTING_DATA_PATH]);
}

function fetchComputingDeansList(cb) {
  const COMPUTING_DEANS_LIST_URL_PATH = '/programmes/ug/honour/deans';
  rp({
    uri: `${COMPUTING_DATA_HOST}${COMPUTING_DEANS_LIST_URL_PATH}`,
    transform: body => cheerio.load(body),
  }).then(function($) {
    gutil.log(
      `${c.faculties.computing.name} ${c.awards.deansList.name} page fetched`,
    );
    const $links = $('#t3-content a');
    const linksHrefs = $links
      .map(function() {
        return $(this).attr('href');
      })
      .toArray()
      .filter(url => /\.pdf$/.test(url));
    Promise.all(
      linksHrefs.map(linkHref => {
        return new Promise((resolve, reject) => {
          const regexMatches = new RegExp(/([^\/]*)\.pdf/).exec(linkHref);
          const fileName = regexMatches[regexMatches.length - 1];
          request
            .get(`${COMPUTING_DATA_HOST}${linkHref}`)
            .pipe(source(`${fileName}.pdf`))
            .pipe(gulp.dest(RAW_COMPUTING_DEANS_LIST_DATA_PATH))
            .on('end', resolve);
        });
      }),
    ).then(() => {
      // For some reason it errors if I write it as `.then(cb)`.
      cb();
    });
  });
}

function fetchComputingFaculty(cb) {
  const COMPUTING_FACULTY_AWARDS_DATA_PATHS = [
    '/programmes/ug/honour/faculty',
    // '/programmes/ug/honour/faculty/more/', <- This link used to be working. Keeping it here first.
  ];
  const COMPUTING_FACULTY_AWARDS_RAW_DATA_PATH = `${RAW_COMPUTING_DATA_PATH}/${
    c.awards.faculty.dir
  }`;

  Promise.all(
    COMPUTING_FACULTY_AWARDS_DATA_PATHS.map(function(
      computingFacultyAwardsDataPath,
      index,
    ) {
      return new Promise((resolve, reject) => {
        request
          .get(`${COMPUTING_DATA_HOST}${computingFacultyAwardsDataPath}`)
          .pipe(source(`faculty-${index}.html`))
          .pipe(gulp.dest(COMPUTING_FACULTY_AWARDS_RAW_DATA_PATH))
          .on('end', resolve);
      });
    }),
  ).then(() => {
    cb();
  });
}

function fetchComputingCommencement(cb) {
  const COMPUTING_COMMENCEMENT_AWARDS_DATA_PATH =
    '/programmes/ug/honour/commencement';
  const COMPUTING_COMMENCEMENT_AWARDS_RAW_DATA_PATH = `${RAW_COMPUTING_DATA_PATH}/${
    c.awards.commencement.dir
  }`;

  request
    .get(`${COMPUTING_DATA_HOST}${COMPUTING_COMMENCEMENT_AWARDS_DATA_PATH}`)
    .pipe(source('commencement.html'))
    .pipe(gulp.dest(COMPUTING_COMMENCEMENT_AWARDS_RAW_DATA_PATH))
    .on('end', cb);
}

function fetchComputingData(cb) {
  runSequence(
    ['fetch:com:deanslist', 'fetch:com:faculty', 'fetch:com:commencement'],
    cb,
  );
}

function aggregateComputingDeansList(cb) {
  const students = {};

  return gulp
    .src(`${RAW_COMPUTING_DEANS_LIST_DATA_PATH}/*.pdf`)
    .pipe(gutil.buffer())
    .pipe(
      through.obj(function(files, enc, cb) {
        Promise.all(
          files.map(function(file) {
            return new Promise(function(resolve, reject) {
              const regexMatches = new RegExp(/\w*(\d{3})0[^\/]*\.pdf/).exec(
                file.path,
              );
              const acadYearAndSem = regexMatches[regexMatches.length - 1];
              const acadYear = acadYearAndSem.substring(0, 2);
              const acadYearFull = `${acadYear}/${parseInt(acadYear) + 1}`;
              const sem = acadYearAndSem.substring(2);
              const acadYearSemFull = `${acadYearFull} Sem ${sem}`;

              pdfjs.getDocument(file.contents).then(function(pdfDocument) {
                pdfDocument.getPage(1).then(page => {
                  page.getTextContent().then(content => {
                    const textEntities = content.items.map(item => {
                      const text = item.str;
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
                        Sem: parseInt(sem),
                      });
                    });

                    gutil.log(
                      `${c.faculties.computing.name} AY${acadYearSemFull} ${
                        c.awards.deansList.name
                      }`,
                      chalk.green('✔ '),
                    );
                    resolve();
                  });
                });
              });
            });
          }),
        ).then(() => {
          const sortedStudents = {};
          Object.keys(students)
            .sort()
            .forEach(function(name) {
              sortedStudents[nameFormatter(name)] = students[name].sort();
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
    .pipe(gulp.dest(PARSED_COMPUTING_DATA_PATH));
}

function aggregateComputingFaculty(cb) {
  const students = {};

  return gulp
    .src(`${RAW_COMPUTING_FACULTY_DATA_PATH}/*.html`)
    .pipe(gutil.buffer())
    .pipe(
      through.obj((files, enc, cb) =>
        Promise.all(
          files.map(
            file =>
              new Promise((resolve, reject) => {
                const $ = cheerio.load(file.contents.toString());
                $('table.newtab').each(function() {
                  const $table = $(this);

                  const acadYear = $table.prev().text();
                  const acadYearFull = acadYear.replace(/AY|20/g, '').trim();

                  $table.find('tr').each(function() {
                    const $tr = $(this);
                    const $tds = $tr.children('td');
                    const awardName = $tds.first().text();
                    const studentName = nameFormatter(
                      $tds
                        .first()
                        .next()
                        .text(),
                    );

                    if (!students.hasOwnProperty(studentName)) {
                      students[studentName] = [];
                    }
                    students[studentName].push({
                      Type: c.awards.faculty.name,
                      AcadYear: acadYearFull,
                      AwardName: awardName,
                    });
                  });

                  gutil.log(
                    `${c.faculties.computing.name} ${acadYearFull} ${
                      c.awards.faculty.name
                    }`,
                    chalk.green('✔ '),
                  );
                });

                resolve();
              }),
          ),
        ).then(() => {
          const sortedStudents = {};
          Object.keys(students)
            .sort()
            .forEach(function(name) {
              sortedStudents[name] = students[name].sort();
            });

          const file = new File({
            path: `${c.awards.faculty.fileName}.json`,
            contents: new Buffer(
              JSON.stringify(sortedStudents, null, 2),
              'utf-8',
            ),
          });
          cb(null, file);
        }),
      ),
    )
    .pipe(gulp.dest(PARSED_COMPUTING_DATA_PATH));
}

function aggregateComputingCommencement(cb) {
  const students = {};

  return gulp
    .src(`${RAW_COMPUTING_COMMENCEMENT_DATA_PATH}/*.html`)
    .pipe(gutil.buffer())
    .pipe(
      through.obj((files, enc, cb) => {
        Promise.all(
          files.map(
            file =>
              new Promise((resolve, reject) => {
                const $ = cheerio.load(file.contents.toString());
                $('#t3-content .item-page table').each(function() {
                  const $table = $(this);
                  const $prizePara = $table.prev();
                  const prizeName = $prizePara
                    .children('strong')
                    .text()
                    .trim();
                  // Remove unwanted text from prize paragraph
                  $prizePara.children('a').remove(); // Remove "Click for for more" link
                  $prizePara.children('strong').remove(); // Remove prize name link

                  const prizeDesc = $prizePara.text().trim();

                  $table.find('tr').each(function() {
                    const $tr = $(this);
                    const $tds = $tr.children('td');
                    const acadYearFull = `${$tds
                      .first()
                      .text()
                      .replace(/20/g, '')
                      .replace('-', '/')}`;
                    const studentName = nameFormatter(
                      $tds
                        .first()
                        .next()
                        .text(),
                    );

                    if (!students.hasOwnProperty(studentName)) {
                      students[studentName] = [];
                    }
                    students[studentName].push({
                      Type: c.awards.commencement.name,
                      AcadYear: acadYearFull,
                      AwardName: prizeName,
                      AwardDesc: prizeDesc,
                    });
                  });

                  gutil.log(
                    `${c.faculties.computing.name} ${
                      c.awards.commencement.name
                    } ${prizeName}`,
                    chalk.green('✔ '),
                  );
                });
                resolve();
              }),
          ),
        ).then(() => {
          const sortedStudents = {};
          Object.keys(students)
            .sort()
            .forEach(function(name) {
              sortedStudents[name] = students[name].sort();
            });

          const file = new File({
            path: `${c.awards.commencement.fileName}.json`,
            contents: new Buffer(
              JSON.stringify(sortedStudents, null, 2),
              'utf-8',
            ),
          });
          cb(null, file);
        });
      }),
    )
    .pipe(gulp.dest(PARSED_COMPUTING_DATA_PATH));
}

function aggregateComputingAwards() {
  return aggregateForFaculty(PARSED_COMPUTING_DATA_PATH);
}

module.exports = {
  cleanRawComputingData,
  cleanParsedComputingData,
  fetchComputingDeansList,
  fetchComputingFaculty,
  fetchComputingCommencement,
  fetchComputingData,
  aggregateComputingDeansList,
  aggregateComputingFaculty,
  aggregateComputingCommencement,
  aggregateComputingAwards,
};
