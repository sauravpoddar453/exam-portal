const { deleteExam } = require('../src/controllers/examController');

async function testDeleteExam() {
  console.log('Testing deleteExam controller...');

  // Mock req and res for checkOnly request
  const reqCheck = {
    params: { id: '650000000000000000000201' },
    user: { _id: '650000000000000000000002', role: 'teacher' },
    query: { checkOnly: 'true' },
    body: {}
  };

  let resDataCheck = null;
  const resCheck = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      resDataCheck = { statusCode: this.statusCode, ...data };
      return this;
    }
  };

  await deleteExam(reqCheck, resCheck, (err) => {
    if (err) console.error('Next error:', err);
  });

  console.log('CheckOnly response:', resDataCheck);

  // Mock req and res for actual delete request
  const reqDelete = {
    params: { id: '650000000000000000000201' },
    user: { _id: '650000000000000000000002', role: 'teacher' },
    query: {},
    body: {}
  };

  let resDataDelete = null;
  const resDelete = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      resDataDelete = { statusCode: this.statusCode, ...data };
      return this;
    }
  };

  await deleteExam(reqDelete, resDelete, (err) => {
    if (err) console.error('Next error:', err);
  });

  console.log('Delete response:', resDataDelete);
}

testDeleteExam();
