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
    res.render('index', notesArray);
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
    const getCommentByID = `select * from comments where note_id =${newResult.id}`;
    pool.query(getCommentByID, (err, result2) => {
      if (err) {
        console.log('Error executing query', err.stack);
        res.status(503).send(result2.rows);
      } else {
        const data = {
          note: newResult,
          comments: result2.rows,
        };
        console.log(data);
        res.render('singleNote', data);
      }
    });
  };

  getSingleNoteQueryString = `SELECT * from notes where id = '${req.params.id}'`;
  // Query using pg.Pool instead of pg.Client
  pool.query(getSingleNoteQueryString, whenDoneWithQuery);
};

const getPostNote = (req, res) => {
  const getsSpecies = 'select * from species';

  const whenDoneWithQuery = (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(result.rows);
      return;
    }
    const getBehaviourQuery = 'select * from behaviour';

    pool.query(getBehaviourQuery, (err, result2) => {
      if (err) {
        console.log('Error executing query', err.stack);
        res.status(503).send(result2.rows);
      } else {
        const data = {
          behaviour: result2.rows,
          species: result.rows,
        };
        console.log(data);
        res.render('noteForm', data);
      }
    });
  };
  pool.query(getsSpecies, whenDoneWithQuery);
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
    const postId = result.rows[0].id;
    let queryDoneCounter = 0;
    req.body.behaviour_id.forEach((behaviourId, index) => {
      const param2 = [postId, behaviourId];
      const noteBehaviourQuery = 'INSERT INTO note_behaviour (note_id,behaviour_id) values ($1,$2)';
      pool.query(noteBehaviourQuery, param2, (err, result2) => {
        console.log('result2');
        queryDoneCounter += 1;
        if (queryDoneCounter === req.body.behaviour_id.length) {
          // TODO: check if any of the queries had errors.
          // all the queries are done, send a response.
          res.redirect('/');
        }
      });
    });
  };
  const inputData = [req.body.habitat, req.body.date, req.body.appearance,
    req.body.behaviour, req.body.vocalisations, req.body.flockSize, req.body.Species_name];

  if (req.cookies.loggedIn === undefined) {
    res.render('userIsNotLogin');
    return;
  }

  const queryString = 'INSERT INTO notes (habitat,date,appearance,behaviour,vocalisations,flockSize,species) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *';
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

const getSpecies = (req, res) => {
  res.render('speciesForm');
};

const postSpecies = (req, res) => {
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
  const inputData = [req.body.name, req.body.scientific_name];

  if (req.cookies.loggedIn === undefined) {
    res.render('userIsNotLogin');
    return;
  }

  const queryString = 'INSERT INTO species (name,scientific_name) VALUES ($1,$2)';
  pool.query(queryString, inputData, whenDoneWithQuery);
};

const allSpecies = (req, res) => {
  console.log('request came in');
  const whenDoneWithQuery = (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(result.rows);
      return;
    }
    // console.log(result.rows);
    const speciesArray = { notes: result.rows };
    res.render('species', speciesArray);
  };
  const queryString = 'select * from species;';
  pool.query(queryString, whenDoneWithQuery);
};

const getPutSpeciesForm = (req, res) => {
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

  getSingleNoteQueryString = `SELECT * from species where id = '${req.params.id}'`;
  console.log(req.params.id);
  pool.query(getSingleNoteQueryString, whenDoneWithQuery);
};

const postComments = (req, res) => {
  console.log('request came in');
  console.log(req.body);
  const whenDoneWithQuery = (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(result.rows);
    }
    res.redirect('/');
  };
  const inputData = [req.body.comment, req.body.id];

  const queryString = 'INSERT INTO comments (commments,note_id) VALUES ($1,$2)';
  pool.query(queryString, inputData, whenDoneWithQuery);
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
app.get('/species', getSpecies);
app.post('/species', postSpecies);
app.get('/species/all', allSpecies);
app.get('/species/:index/edit', getPutSpeciesForm);
app.post('/note/:id/comment', postComments);
app.listen(3004);
