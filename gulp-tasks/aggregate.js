const gulp = require('gulp');
const gutil = require('gulp-util');
const through = require('through2');
const File = require('vinyl');

const c = require('./constants');

function combineFacultyData(parsedDataPath) {
  const students = {};
  const fileTypes = [
    c.awards.deansList.fileName,
    c.awards.faculty.fileName,
    c.awards.commencement.fileName,
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
            path: `${c.aggregated.fileName}.json`,
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

module.exports = {
  combineFacultyData,
};
