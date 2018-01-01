const _ = require('lodash');
const chalk = require('chalk');
const cheerio = require('cheerio');
const del = require('del');
const fs = require('graceful-fs');
const gulp = require('gulp');
const gutil = require('gulp-util');
const pdfjs = require('pdfjs-dist');
const request = require('request');
const runSequence = require('run-sequence');
const rp = require('request-promise');
const source = require('vinyl-source-stream');
const through = require('through2');
const File = require('vinyl');

const c = require('./gulp-tasks/constants');
const businessTasks = require('./gulp-tasks/business');
const computingTasks = require('./gulp-tasks/computing');

// Business tasks.
gulp.task('clean:raw:biz', businessTasks.cleanRawBusinessData);
gulp.task('clean:data:biz', businessTasks.cleanParsedBusinessData);
gulp.task('clean:biz', gulp.parallel('clean:raw:biz', 'clean:data:biz'));

gulp.task(
  'fetch:biz:deanslist',
  ['clean:raw:biz'],
  businessTasks.fetchBusinessDeansList,
);
gulp.task('fetch:biz', ['fetch:biz:deanslist']);

gulp.task('aggregate:biz:deanslist', businessTasks.aggregateBusinessDeansList);
gulp.task('aggregate:biz', businessTasks.aggregateBusinessAwards);
gulp.task('biz', [
  'clean:biz',
  'fetch:biz',
  'aggregate:biz:deanslist',
  'aggregate:biz',
]);

// Computing tasks.
gulp.task('clean:raw:com', computingTasks.cleanRawComputingData);
gulp.task('clean:data:com', computingTasks.cleanParsedComputingData);
gulp.task('clean:com', ['clean:raw:com', 'clean:data:com']);

gulp.task('fetch:com:deanslist', computingTasks.fetchComputingDeansList);
gulp.task('fetch:com:faculty', computingTasks.fetchComputingFaculty);
gulp.task('fetch:com:commencement', computingTasks.fetchComputingCommencement);
gulp.task('fetch:com', [
  'fetch:com:deanslist',
  'fetch:com:faculty',
  'fetch:com:commencement',
]);

gulp.task(
  'aggregate:com:deanslist',
  computingTasks.aggregateComputingDeansList,
);
gulp.task('aggregate:com:faculty', computingTasks.aggregateComputingFaculty);
gulp.task(
  'aggregate:com:commencement',
  computingTasks.aggregateComputingCommencement,
);

gulp.task('aggregate:com', computingTasks.aggregateComputingAwards);

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
