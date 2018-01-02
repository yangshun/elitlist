module.exports = {
  dataPaths: {
    raw: 'raw',
    parsed: 'parsed',
  },
  faculties: {
    business: {
      name: 'Business',
      dir: 'business',
      host: 'http://bba.nus.edu',
    },
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
  combined: {
    fileName: 'Combined',
  },
};
