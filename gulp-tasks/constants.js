module.exports = {
  dataPaths: {
    raw: 'raw',
    parsed: 'data',
  },
  faculties: {
    computing: {
      name: 'Computing',
      dir: 'computing',
      host: 'https://www.comp.nus.edu.sg',
    },
    engineering: {
      name: 'Engineering',
      dir: 'engineering',
      host: 'https://www.eng.nus.edu.sg',
    },
    business: {
      name: 'Business',
      dir: 'business',
      host: 'http://bba.nus.edu',
    },
  },
  awards: {
    deansList: {
      name: "Dean's List Award",
      dir: 'deans-list',
      fileName: 'DeansList',
    },
    faculty: {
      name: 'Faculty Award',
      dir: 'faculty',
      fileName: 'Faculty',
    },
    commencement: {
      name: 'Commencement Award',
      dir: 'commencement',
      fileName: 'Commencement',
    },
  },
  aggregated: {
    fileName: 'Aggregated',
  },
};
