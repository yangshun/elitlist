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

const COMPUTING = 'Computing';
const ENGINEERING = 'Engineering';
const BUSINESS = 'Business';

const DEANS_LIST = "Dean's List Award";
const FACULTY = 'Faculty Award';
const COMMENCEMENT = 'Commencement Award';

const DEANS_LIST_AWARDS_DIR = 'deans-list';
const FACULTY_AWARDS_DIR = 'faculty';
const COMMENCEMENT_AWARDS_DIR = 'commencement';

const DEANS_LIST_FILE = 'DeansList';
const FACULTY_AWARDS_FILE = 'Faculty';
const COMMENCEMENT_AWARDS_FILE = 'Commencement';
const AGGREGATED_FILE = 'Aggregated';

const RAW_COMPUTING_DATA_PATH = `./${RAW_DATA_PATH}/${COMPUTING}`;
const RAW_COMPUTING_DEANS_LIST_DATA_PATH = `${RAW_COMPUTING_DATA_PATH}/${DEANS_LIST_AWARDS_DIR}`;
const RAW_COMPUTING_FACULTY_DATA_PATH = `${RAW_COMPUTING_DATA_PATH}/${FACULTY_AWARDS_DIR}`;
const RAW_COMPUTING_COMMENCEMENT_DATA_PATH = `${RAW_COMPUTING_DATA_PATH}/${COMMENCEMENT_AWARDS_DIR}`;

const RAW_ENGINEERING_DATA_PATH = `./${RAW_DATA_PATH}/${ENGINEERING}`;
const RAW_ENGINEERING_DEANS_LIST_DATA_PATH = `${RAW_ENGINEERING_DATA_PATH}/${DEANS_LIST_AWARDS_DIR}`;

const RAW_BUSINESS_DATA_PATH = `./${RAW_DATA_PATH}/${BUSINESS}`;
const RAW_BUSINESS_DEANS_LIST_DATA_PATH = `${RAW_BUSINESS_DATA_PATH}/${DEANS_LIST_AWARDS_DIR}`;

const PARSED_COMPUTING_DATA_PATH = `./${PARSED_DATA_PATH}/${COMPUTING}`;
const PARSED_ENGINEERING_DATA_PATH = `./${PARSED_DATA_PATH}/${ENGINEERING}`;
const PARSED_BUSINESS_DATA_PATH = `./${PARSED_DATA_PATH}/${BUSINESS}`;

const COMPUTING_DATA_HOST = 'http://www.comp.nus.edu.sg';
const ENGINEERING_DATA_HOST = 'http://www.eng.nus.edu.sg';
const BUSINESS_DATA_HOST = 'http://bba.nus.edu';

function nameFormatter(name) {
  const formattedName = name
    .replace(/\s*-\s*/g, '-')
    .replace(/’/g, "'")
    .replace(/‐/g, '-')
    .replace(/\n/g, ' ')
    .split(' ')
    .filter(function(fragment) {
      return !_.isEmpty(fragment);
    })
    .map(fragment => {
      var newFragment = fragment.trim();
      if (fragment !== 'S/O' && fragment !== 'D/O') {
        // If not S/O or D/O, capitalize first letter
        newFragment =
          fragment[0] === '('
            ? `(${fragment[1].toUpperCase()}${fragment
                .substring(2)
                .toLowerCase()}`
            : _.capitalize(fragment);
      }
      return newFragment;
    })
    .join(' ')
    .trim();
  return formattedName;
}

gulp.task('clean:raw', function() {
  return del([RAW_DATA_PATH]);
});

gulp.task('clean:raw:com', function() {
  return del([RAW_COMPUTING_DATA_PATH]);
});

gulp.task('clean:raw:eng', function() {
  return del([RAW_ENGINEERING_DATA_PATH]);
});

gulp.task('clean:raw:biz', function() {
  return del([RAW_BUSINESS_DATA_PATH]);
});

gulp.task('clean:data', function() {
  return del([PARSED_DATA_PATH]);
});

gulp.task('clean:data:com', function() {
  return del([PARSED_COMPUTING_DATA_PATH]);
});

gulp.task('clean:data:eng', function() {
  return del([PARSED_ENGINEERING_DATA_PATH]);
});

gulp.task('clean:data:biz', function() {
  return del([PARSED_BUSINESS_DATA_PATH]);
});

gulp.task('clean:com', ['clean:raw:com', 'clean:data:com']);
gulp.task('clean:eng', ['clean:raw:eng', 'clean:data:eng']);
gulp.task('clean:biz', ['clean:raw:biz', 'clean:data:biz']);
gulp.task('clean', ['clean:raw', 'clean:data']);

gulp.task('fetch:com:deanslist', function(cb) {
  const COMPUTING_DEANS_LIST_DATA_PATH = '/programmes/ug/honour/deans';

  rp({
    uri: `${COMPUTING_DATA_HOST}${COMPUTING_DEANS_LIST_DATA_PATH}`,
    transform: function(body) {
      return cheerio.load(body);
    },
  }).then(function($) {
    gutil.log("SoC Dean's List page fetched");
    const $links = $('#t3-content .article-content a');
    const linksHrefs = $links
      .filter(function() {
        return /\.pdf$/.test($(this).attr('href'));
      })
      .map(function() {
        return $(this).attr('href');
      })
      .toArray();
    Promise.all(
      linksHrefs.map(function(linkHref) {
        return new Promise(function(resolve, reject) {
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
      cb();
    });
  });
});

gulp.task('fetch:com:faculty', function(cb) {
  const COMPUTING_FACULTY_AWARDS_DATA_PATHS = [
    '/programmes/ug/honour/faculty',
    '/programmes/ug/honour/faculty/more/',
  ];
  const COMPUTING_FACULTY_AWARDS_RAW_DATA_PATH = `${RAW_COMPUTING_DATA_PATH}/${FACULTY_AWARDS_DIR}`;

  Promise.all(
    COMPUTING_FACULTY_AWARDS_DATA_PATHS.map(function(
      computingFacultyAwardsDataPath,
      index,
    ) {
      return new Promise(function(resolve, reject) {
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
});

gulp.task('fetch:com:commencement', function(cb) {
  const COMPUTING_COMMENCEMENT_AWARDS_DATA_PATH =
    '/programmes/ug/honour/commencement';
  const COMPUTING_COMMENCEMENT_AWARDS_RAW_DATA_PATH = `${RAW_COMPUTING_DATA_PATH}/${COMMENCEMENT_AWARDS_DIR}`;

  request
    .get(`${COMPUTING_DATA_HOST}${COMPUTING_COMMENCEMENT_AWARDS_DATA_PATH}`)
    .pipe(source('commencement.html'))
    .pipe(gulp.dest(COMPUTING_COMMENCEMENT_AWARDS_RAW_DATA_PATH))
    .on('end', cb);
});

gulp.task('aggregate:com:deanslist', function(cb) {
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
              const acadYearFull = `AY${acadYear}/${parseInt(acadYear) + 1}`;
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
                        Type: DEANS_LIST,
                        AcadYear: acadYearFull,
                        Sem: parseInt(sem),
                      });
                    });

                    gutil.log(
                      `${COMPUTING} ${acadYearSemFull} ${DEANS_LIST}`,
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
              sortedStudents[
                name
                  .split(' ')
                  .map(_.capitalize)
                  .join(' ')
              ] = students[name].sort();
            });

          const file = new File({
            path: `${DEANS_LIST_FILE}.json`,
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
});

gulp.task('aggregate:com:faculty', function(cb) {
  const students = {};

  return gulp
    .src(`${RAW_COMPUTING_FACULTY_DATA_PATH}/*.html`)
    .pipe(gutil.buffer())
    .pipe(
      through.obj(function(files, enc, cb) {
        Promise.all(
          files.map(function(file) {
            return new Promise(function(resolve, reject) {
              const $ = cheerio.load(file.contents.toString());
              $('table.newtab').each(function() {
                const $table = $(this);

                const acadYear = $table.prev().text();
                const acadYearFull = acadYear.replace(/20/g, '').trim();

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
                    Type: FACULTY,
                    AcadYear: acadYearFull,
                    AwardName: awardName,
                  });
                });

                gutil.log(
                  `${COMPUTING} ${acadYearFull} ${FACULTY}`,
                  chalk.green('✔ '),
                );
              });

              resolve();
            });
          }),
        ).then(() => {
          const sortedStudents = {};
          Object.keys(students)
            .sort()
            .forEach(function(name) {
              sortedStudents[name] = students[name].sort();
            });

          const file = new File({
            path: `${FACULTY_AWARDS_FILE}.json`,
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
});

gulp.task('aggregate:com:commencement', function(cb) {
  const students = {};

  return gulp
    .src(`${RAW_COMPUTING_COMMENCEMENT_DATA_PATH}/*.html`)
    .pipe(gutil.buffer())
    .pipe(
      through.obj(function(files, enc, cb) {
        Promise.all(
          files.map(function(file) {
            return new Promise(function(resolve, reject) {
              const $ = cheerio.load(file.contents.toString());
              $('.article-content table').each(function() {
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
                  const acadYearFull = `AY${$tds
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
                    Type: COMMENCEMENT,
                    AcadYear: acadYearFull,
                    AwardName: prizeName,
                    AwardDesc: prizeDesc,
                  });
                });

                gutil.log(
                  `${COMPUTING} ${COMMENCEMENT} ${prizeName}`,
                  chalk.green('✔ '),
                );
              });

              resolve();
            });
          }),
        ).then(() => {
          const sortedStudents = {};
          Object.keys(students)
            .sort()
            .forEach(function(name) {
              sortedStudents[name] = students[name].sort();
            });

          const file = new File({
            path: `${COMMENCEMENT_AWARDS_FILE}.json`,
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
});

gulp.task('fetch:com', function(cb) {
  runSequence(
    ['fetch:com:deanslist', 'fetch:com:faculty', 'fetch:com:commencement'],
    cb,
  );
});

function aggregateForFaculty(parsedDataPath) {
  const students = {};
  const fileTypes = [
    DEANS_LIST_FILE,
    FACULTY_AWARDS_FILE,
    COMMENCEMENT_AWARDS_FILE,
  ];
  return gulp
    .src(fileTypes.map(fileType => `${parsedDataPath}/${fileType}.json`))
    .pipe(gutil.buffer())
    .pipe(
      through.obj(function(files, enc, cb) {
        Promise.all(
          files.map(function(file) {
            return new Promise(function(resolve, reject) {
              const studentsForType = JSON.parse(file.contents.toString());
              Object.keys(studentsForType).forEach(function(name) {
                if (!students.hasOwnProperty(name)) {
                  students[name] = [];
                }
                students[name] = students[name].concat(studentsForType[name]);
              });

              resolve();
            });
          }),
        ).then(() => {
          const studentsData = {};
          Object.keys(students)
            .sort()
            .forEach(function(name) {
              return (studentsData[name] = students[name]);
            });

          const file = new File({
            path: `${AGGREGATED_FILE}.json`,
            contents: new Buffer(
              JSON.stringify(studentsData, null, 2),
              'utf-8',
            ),
          });
          cb(null, file);
        });
      }),
    )
    .pipe(gulp.dest(`./${parsedDataPath}`));
}

gulp.task('aggregate:com', function(cb) {
  return aggregateForFaculty(PARSED_COMPUTING_DATA_PATH);
});

gulp.task('com', function(cb) {
  runSequence(
    'clean:com',
    'fetch:com',
    [
      'aggregate:com:deanslist',
      'aggregate:com:faculty',
      'aggregate:com:commencement',
    ],
    'aggregate:com',
    cb,
  );
});

gulp.task('fetch:eng:deanslist', ['clean:raw:eng'], function(cb) {
  const ENGINEERING_DATA_PATH = '/ugrad/awards.html';

  rp({
    uri: `${ENGINEERING_DATA_HOST}${ENGINEERING_DATA_PATH}`,
    transform: function(body) {
      return cheerio.load(body);
    },
  }).then(function($) {
    gutil.log("Engineering Dean's List page fetched");
    const $links = $('#table2 a');
    const linksHrefs = $links
      .filter(function() {
        return /Dean.*\.pdf$/.test($(this).attr('href'));
      })
      .map(function() {
        return $(this).attr('href');
      })
      .toArray();
    Promise.all(
      linksHrefs.map(function(linkHref) {
        return new Promise(function(resolve, reject) {
          const regexMatches = new RegExp(/([^\/]*)\.pdf/).exec(linkHref);
          const fileName = regexMatches[regexMatches.length - 1];
          request
            .get(`${ENGINEERING_DATA_HOST}/ugrad/${linkHref}`)
            .pipe(source(`${fileName}.pdf`))
            .pipe(
              gulp.dest(
                `${RAW_ENGINEERING_DATA_PATH}/${DEANS_LIST_AWARDS_DIR}`,
              ),
            )
            .on('end', resolve);
        });
      }),
    ).then(() => {
      cb();
    });
  });
});

gulp.task('aggregate:eng:debug', function(cb) {
  // For debugging
  var data = new Uint8Array(
    fs.readFileSync("./raw/eng/Dean's_List_AY2009-10_Sem_2.pdf"),
  );

  pdfjs.getDocument(data).then(function(pdfDocument) {
    const numPages = pdfDocument.numPages;
    const rows = {};
    Promise.all(
      _.range(1, numPages + 1).map(function(pageNum) {
        return new Promise(function(resolve, reject) {
          pdfDocument.getPage(pageNum).then(page => {
            page.getTextContent().then(content => {
              content.items.forEach(function(item) {
                const rowId = `${pageNum}-${parseInt(item.transform[5])}`;
                if (!rows.hasOwnProperty(rowId)) {
                  rows[rowId] = '';
                }
                if (item.str.trim()) {
                  rows[rowId] += ` ${item.str.trim()}`;
                  rows[rowId] = rows[rowId].trim();
                }
              });
              resolve();
            });
          });
        });
      }),
    ).then(function() {
      const studentNames = [];
      _.values(rows).forEach(row => {
        // Removes the S/N, (DDP), Department (e.g. MPE3) from each row
        const studentName = row
          .replace(/(\d+|B\.Tech|\(DDP\))/g, '')
          .replace(/ [A-Z]?[a-z]?[A-Z]{2}\d?$/, '')
          .replace(/’/g, "'")
          .replace(/‐/g, '-');
        console.log(row, studentName);
        if (
          studentName.trim() !== '' &&
          !/(course|semester|name|major)/i.test(studentName)
        ) {
          studentNames.push(nameFormatter(studentName));
        }
      });
      // console.log(_.uniq(studentNames).sort());
      console.log(_.uniq(studentNames).length);
    });
  });
});

gulp.task('aggregate:eng:deanslist', function(cb) {
  const students = {};

  return gulp
    .src(`${RAW_ENGINEERING_DEANS_LIST_DATA_PATH}/*.pdf`)
    .pipe(gutil.buffer())
    .pipe(
      through.obj(function(files, enc, cb) {
        Promise.all(
          files.map(function(file) {
            return new Promise(function(resolve, reject) {
              const regexMatches = new RegExp(
                /\w*AY20(\d{2})-(\d{2})_Sem_(\d{1})*\.pdf/,
              ).exec(file.path);
              const sem = parseInt(regexMatches[3]);
              const acadYearFull = `AY${regexMatches[1]}/${regexMatches[2]}`;
              const acadYearSemFull = `${acadYearFull} Sem ${sem}`;

              pdfjs.getDocument(file.contents).then(function(pdfDocument) {
                const numPages = pdfDocument.numPages;
                const rows = {};
                Promise.all(
                  _.range(1, numPages + 1).map(function(pageNum) {
                    return new Promise(function(resolve2, reject2) {
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
                ).then(function() {
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
                      Type: DEANS_LIST,
                      AcadYear: acadYearFull,
                      Sem: sem,
                    });
                  });

                  gutil.log(
                    `${ENGINEERING} ${acadYearSemFull} ${DEANS_LIST}`,
                    chalk.green('✔ '),
                  );
                  resolve();
                });
              });
            });
          }),
        ).then(() => {
          const sortedStudents = {};
          Object.keys(students)
            .sort()
            .forEach(function(name) {
              sortedStudents[name] = students[name].sort();
            });

          const file = new File({
            path: `${DEANS_LIST_FILE}.json`,
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
});

gulp.task('aggregate:eng', function(cb) {
  return aggregateForFaculty(PARSED_ENGINEERING_DATA_PATH);
});

gulp.task('eng', function(cb) {
  runSequence(
    'clean:eng',
    'fetch:eng:deanslist',
    'aggregate:eng:deanslist',
    'aggregate:eng',
    cb,
  );
});

gulp.task('fetch:biz:deanslist', ['clean:raw:biz'], function(cb) {
  const BUSINESS_DATA_PATH = '/bba/honour_deanslist.htm';

  request
    .get(`${BUSINESS_DATA_HOST}${BUSINESS_DATA_PATH}`)
    .pipe(source('honour_deanslist.html'))
    .pipe(gulp.dest(`${RAW_BUSINESS_DATA_PATH}/${DEANS_LIST_AWARDS_DIR}`))
    .on('end', cb);
});

gulp.task('aggregate:biz:deanslist', function(cb) {
  const students = {};

  return gulp
    .src(`${RAW_BUSINESS_DEANS_LIST_DATA_PATH}/*.html`)
    .pipe(gutil.buffer())
    .pipe(
      through.obj(function(files, enc, cb) {
        Promise.all(
          files.map(function(file) {
            return new Promise(function(resolve, reject) {
              const $ = cheerio.load(file.contents.toString());
              $('table.bord').each(function() {
                const $table = $(this);
                const tableHeader = $table.find('td[colspan=4] strong').text();

                const regexMatches = new RegExp(
                  /(\d) AY20(\d{2})\/(?:20)?(\d{2})/,
                ).exec(tableHeader);
                const acadYear = regexMatches[2];
                const nextAcadYear = regexMatches[3];
                const sem = regexMatches[1];
                const acadYearFull = `AY${acadYear}/${nextAcadYear}`;
                const acadYearSemFull = `${acadYearFull} Sem ${sem}`;

                $table.find('td').each(function() {
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
                    Type: DEANS_LIST,
                    AcadYear: acadYearFull,
                    Sem: sem,
                  });
                });

                gutil.log(
                  `${BUSINESS} ${acadYearSemFull} ${DEANS_LIST}`,
                  chalk.green('✔ '),
                );
              });

              resolve();
            });
          }),
        ).then(() => {
          const sortedStudents = {};
          Object.keys(students)
            .sort()
            .forEach(function(name) {
              sortedStudents[name] = students[name].sort();
            });

          const file = new File({
            path: `${DEANS_LIST_FILE}.json`,
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
});

gulp.task('aggregate:biz', function(cb) {
  return aggregateForFaculty(PARSED_BUSINESS_DATA_PATH);
});

gulp.task('biz', function(cb) {
  runSequence(
    'clean:biz',
    'fetch:biz:deanslist',
    'aggregate:biz:deanslist',
    'aggregate:biz',
    cb,
  );
});

gulp.task('aggregate:all', function(cb) {
  const students = {};

  const facultyPaths = [
    PARSED_COMPUTING_DATA_PATH,
    PARSED_ENGINEERING_DATA_PATH,
    PARSED_BUSINESS_DATA_PATH,
  ];

  return gulp
    .src(
      facultyPaths.map(facultyPath => `${facultyPath}/${AGGREGATED_FILE}.json`),
    )
    .pipe(gutil.buffer())
    .pipe(
      through.obj(function(files, enc, cb) {
        Promise.all(
          files.map(function(file) {
            const faculty = new RegExp(/\/(\w+)\/\w+\.json/i).exec(
              file.path,
            )[1];
            return new Promise(function(resolve, reject) {
              const facultyStudents = JSON.parse(file.contents.toString());
              const facultyAnnotatedStudents = {};
              _.forEach(facultyStudents, function(value, studentName) {
                facultyAnnotatedStudents[`${studentName} - ${faculty}`] = {
                  Name: studentName,
                  Faculty: faculty,
                  Awards: value,
                };
              });
              _.merge(students, facultyAnnotatedStudents);
              resolve();
            });
          }),
        ).then(() => {
          const studentsData = Object.keys(students)
            .sort()
            .map(function(name) {
              return students[name];
            });

          const file = new File({
            path: `${AGGREGATED_FILE}.json`,
            contents: new Buffer(
              JSON.stringify(studentsData, null, 2),
              'utf-8',
            ),
          });
          cb(null, file);
        });
      }),
    )
    .pipe(gulp.dest(`./${PARSED_DATA_PATH}`));
});

gulp.task('default', function(cb) {
  runSequence(
    ['clean:data', 'clean:raw'],
    ['biz', 'com', 'eng'],
    'aggregate:all',
    cb,
  );
});
