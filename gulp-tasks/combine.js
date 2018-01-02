const _ = require('lodash');
const gulp = require('gulp');
const gutil = require('gulp-util');
const through = require('through2');
const File = require('vinyl');

const c = require('./constants');

function combineAwardsForFaculty(parsedDataPath) {
  const students = {};
  const fileTypes = [
    c.awards.deansList.fileName,
    c.awards.faculty.fileName,
    c.awards.commencement.fileName,
  ];
  return gulp
    .src(fileTypes.map(fileType => `${parsedDataPath}/${fileType}.json`), {
      allowEmpty: true,
    })
    .pipe(gutil.buffer())
    .pipe(
      through.obj((files, enc, cb) => {
        Promise.all(
          files.map(file => {
            return new Promise((resolve, reject) => {
              const studentsForType = JSON.parse(file.contents.toString());
              Object.keys(studentsForType).forEach(name => {
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
            .forEach(name => (studentsData[name] = students[name]));

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

function combineStudentsAcrossFaculty(cb) {
  const students = {};
  const faculties = [
    c.faculties.business.dir,
    c.faculties.computing.dir,
    c.faculties.engineering.dir,
  ];
  return gulp
    .src(
      faculties.map(
        faculty =>
          `${c.dataPaths.parsed}/${faculty}/${c.aggregated.fileName}.json`,
      ),
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
                  Faculty: c.faculties[faculty].name,
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
            .map(name => students[name]);

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
    .pipe(gulp.dest(`./${c.dataPaths.parsed}`));
}

module.exports = {
  combineAwardsForFaculty,
  combineStudentsAcrossFaculty,
};
