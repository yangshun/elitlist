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

// Business tasks.
gulp.task('clean:raw:biz', businessTasks.cleanRawBusinessData);
gulp.task('clean:data:biz', businessTasks.cleanParsedBusinessData);
gulp.task('clean:biz', ['clean:raw:biz', 'clean:data:biz']);
gulp.task(
  'fetch:biz:deanslist',
  ['clean:raw:biz'],
  businessTasks.fetchBusinessDeansList,
);
gulp.task('aggregate:biz:deanslist', businessTasks.aggregateBusinessDeansList);
gulp.task('aggregate:biz', businessTasks.aggregateBusinessAwards);
gulp.task('biz', businessTasks.businessEndToEnd);
