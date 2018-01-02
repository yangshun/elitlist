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
const engineeringTasks = require('./gulp-tasks/engineering');

// Business tasks.
gulp.task('clean:raw:biz', businessTasks.cleanRawBusinessData);
gulp.task('clean:data:biz', businessTasks.cleanParsedBusinessData);
gulp.task('clean:biz', gulp.parallel('clean:raw:biz', 'clean:data:biz'));

gulp.task(
  'fetch:biz:deanslist',
  gulp.series('clean:raw:biz', businessTasks.fetchBusinessDeansList),
);
gulp.task('fetch:biz', gulp.parallel('fetch:biz:deanslist'));

gulp.task('parse:biz:deanslist', businessTasks.parseBusinessDeansList);
gulp.task('parse:biz', gulp.parallel('parse:biz:deanslist'));

gulp.task('combine:biz', businessTasks.combineBusinessAwards);

gulp.task(
  'biz',
  gulp.series('clean:biz', 'fetch:biz', 'parse:biz', 'combine:biz'),
);

// Computing tasks.
gulp.task('clean:raw:com', computingTasks.cleanRawComputingData);
gulp.task('clean:data:com', computingTasks.cleanParsedComputingData);
gulp.task('clean:com', gulp.parallel('clean:raw:com', 'clean:data:com'));

gulp.task('fetch:com:deanslist', computingTasks.fetchComputingDeansList);
gulp.task('fetch:com:faculty', computingTasks.fetchComputingFaculty);
gulp.task('fetch:com:commencement', computingTasks.fetchComputingCommencement);
gulp.task(
  'fetch:com',
  gulp.parallel(
    'fetch:com:deanslist',
    'fetch:com:faculty',
    'fetch:com:commencement',
  ),
);

gulp.task('parse:com:deanslist', computingTasks.parseComputingDeansList);
gulp.task('parse:com:faculty', computingTasks.parseComputingFaculty);
gulp.task('parse:com:commencement', computingTasks.parseComputingCommencement);
gulp.task(
  'parse:com',
  gulp.parallel(
    'parse:com:deanslist',
    'parse:com:faculty',
    'parse:com:commencement',
  ),
);

gulp.task('combine:com', computingTasks.combineComputingAwards);

gulp.task(
  'com',
  gulp.series('clean:com', 'fetch:com', 'parse:com', 'combine:com'),
);

// Engineering tasks.
gulp.task('clean:raw:eng', engineeringTasks.cleanRawEngineeringData);
gulp.task('clean:data:eng', engineeringTasks.cleanParsedEngineeringData);
gulp.task('clean:eng', gulp.parallel('clean:raw:eng', 'clean:data:eng'));

gulp.task(
  'fetch:eng:deanslist',
  gulp.series('clean:raw:eng', engineeringTasks.fetchEngineeringDeansList),
);
gulp.task('fetch:eng', gulp.parallel('fetch:eng:deanslist'));

gulp.task('parse:eng:deanslist', engineeringTasks.parseEngineeringDeansList);
gulp.task('parse:eng', gulp.parallel('parse:eng:deanslist'));

gulp.task('combine:eng', engineeringTasks.combineEngineeringAwards);

gulp.task(
  'eng',
  gulp.series('clean:eng', 'fetch:eng', 'parse:eng', 'combine:eng'),
);
