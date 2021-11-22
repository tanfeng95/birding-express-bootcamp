import express from 'express';
import methodOverride from 'method-override';
import pg from 'pg';
import cookieParser from 'cookie-parser';

// Initialise DB connection
const { Pool } = pg;
const pgConnectionConfigs = {
  user: 'tanfeng95',
  host: 'localhost',
  database: 'birding',
  port: 5432, // Postgres server always runs on this port by default
};
const pool = new Pool(pgConnectionConfigs);

const app = express();
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use(methodOverride('_method'));
app.use(cookieParser());

const getAllNoteQueryString = 'SELECT * from notes ORDER BY id ASC ';
let getSingleNoteQueryString = '';

const getAllNotes = (req, res) => {
  console.log('request came in');

  const whenDoneWithQuery = (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(result.rows);
      return;
    }

    // console.log(result.rows);
    const notesArray = { notes: result.rows };
    res.render('listOfNotes', notesArray);
  };
  // Query using pg.Pool instead of pg.Client
  pool.query(getAllNoteQueryString, whenDoneWithQuery);
};

const getNoteById = (req, res) => {
  const whenDoneWithQuery = (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(result.rows);
      return;
    }
    const newResult = result.rows.pop();
    console.log(newResult);
    res.render('singleNote', newResult);
  };

  getSingleNoteQueryString = `SELECT * from notes where id = '${req.params.id}'`;
  // Query using pg.Pool instead of pg.Client
  pool.query(getSingleNoteQueryString, whenDoneWithQuery);
};

const getPostNote = (req, res) => {
  res.render('noteForm');
};

const PostPostNote = (req, res) => {
  console.log('request came in');
  console.log(req.body);
  const whenDoneWithQuery = (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(result.rows);
      return;
    }
    res.redirect('/');
  };
  const inputData = [req.body.habitat, req.body.date, req.body.appearance,
    req.body.behaviour, req.body.vocalisations, req.body.flockSize];

  if (req.cookies.loggedIn === undefined) {
    res.render('userIsNotLogin');
    return;
  }

  const queryString = 'INSERT INTO notes (habitat,date,appearance,behaviour,vocalisations,flockSize) VALUES ($1,$2,$3,$4,$5,$6)';
  pool.query(queryString, inputData, whenDoneWithQuery);
};

const deleteNote = (req, res) => {
  const whenDoneWithQuery = (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(result.rows);
      return;
    }
    // console.log(result.rows[0].name);
    res.redirect('/');
  };
  const deleteQueryString = `DELETE FROM notes WHERE id = '${req.params.id}' `;
  console.log(deleteQueryString);
  pool.query(deleteQueryString, whenDoneWithQuery);
};

const getPutForm = (req, res) => {
  const whenDoneWithQuery = (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(result.rows);
      return;
    }
    console.log(result.rows);
    const newResult = result.rows.pop();

    res.render('editForm', newResult);
  };

  getSingleNoteQueryString = `SELECT * from notes where id = '${req.params.id}'`;
  console.log(req.params.id);
  pool.query(getSingleNoteQueryString, whenDoneWithQuery);
};

const putEditFrom = (req, res) => {
  const whenDoneWithQuery = (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(result.rows);
      return;
    }

    res.redirect('/');
  };
  const inputData = [req.body.habitat, req.body.date, req.body.appearance,
    req.body.behaviour, req.body.vocalisations, req.body.flocksize];

  console.log(inputData);
  const UpdatequeryString = `UPDATE notes SET habitat = $1,date = $2,appearance = $3,behaviour = $4,vocalisations = $5,flockSize = $6  where id = '${req.params.id}'`;
  pool.query(UpdatequeryString, inputData, whenDoneWithQuery);
};

const getlogin = (req, res) => {
  res.render('login');
};

const postLogin = (req, res) => {
  const values = [req.body.email];
  pool.query('SELECT * from users WHERE email=$1', values, (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(result.rows);
      return;
    }
    if (result.rows.length === 0) {
      // we didnt find a user with that email.
      // the error for password and user are the same. don't tell the user which error they got for security reasons, otherwise people can guess if a person is a user of a given service.
      res.status(403).send('sorry!');
      return;
    }
    const user = result.rows[0];
    if (user.password === req.body.password) {
      console.log('trues');
      res.cookie('loggedIn', true);
      res.redirect('/');
    } else {
      // password didn't match
      // the error for password and user are the same. don't tell the user which error they got for security reasons, otherwise people can guess if a person is a user of a given service.
      res.status(403).send('sorry!');
    }
  });
};

const getSignUpPage = (req, res) => {
  res.render('signup');
};
const postSignUp = (req, res) => {
  console.log('request came in');
  console.log(req.body);
  const whenDoneWithQuery = (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(result.rows);
      return;
    }
    // console.log(result.rows[0].name);
    res.render('userSignupCompleted');
  };
  const inputData = [req.body.email, req.body.password];

  const queryString = 'INSERT INTO users (email,password) VALUES ($1,$2)';
  pool.query(queryString, inputData, whenDoneWithQuery);
};
const deleteCookie = (req, res) => {
  res.clearCookie('loggedIn');
  res.render('logout');
};

app.get('/', getAllNotes);
app.get('/note/:id', getNoteById);
app.get('/note', getPostNote);
app.post('/note', PostPostNote);
app.delete('/note/:id/delete', deleteNote);
app.get('/note/:id/edit', getPutForm);
app.put('/sighting/:id/edit', putEditFrom);
app.get('/login', getlogin);
app.post('/login', postLogin);
app.get('/signUp', getSignUpPage);
app.post('/signUp', postSignUp);
app.delete('/logout', deleteCookie);
app.listen(3004);
