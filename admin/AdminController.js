import express from 'express';
import bodyParser from 'body-parser';

import db from '../db';
import config from '../config';
import { SSL_OP_MICROSOFT_BIG_SSLV3_BUFFER } from 'constants';
// import verifyToken from '../auth/verifyToken';

const router = express.Router();

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.get('/show', (req, res) => {
  db.query(
    'SELECT uid, title, description, location, datetime, created_at FROM schedules WHERE visible = 1 ORDER BY datetime ASC',
    (err, data) => {
      if (err) return res.status(500).send(err);
      if (!data || data.length === 0)
        return res.status(404).send('There is no data.');
      // console.log(data.length);
      res.status(200).send(data);
    }
  );
});

router.get('/show/:page', (req, res) => {
  let limit = 10; //numer of records per page
  let offset = 0;

  db.query(
    'SELECT count(*) as amount FROM schedules WHERE visible = 1 ORDER BY datetime ASC',
    (err, data) => {
      let page = req.params.page;
      let pages = Math.ceil(data[0].amount / limit);
      offset = limit * (page - 1);
      console.log(page, pages, offset);
      db.query(
        'SELECT uid, title, description, location, datetime, created_at FROM schedules WHERE visible = 1 ORDER BY datetime ASC LIMIT ? OFFSET ?',
        [limit, offset],
        (err, result) => {
          if (err) return res.status(500).send(err);
          if (!result || result.length === 0)
            return res.status(404).send('There is no data.');
          // console.log(data.length);

          res.status(200).send({ data: result, pages: pages });
        }
      );
    }
  );
});

module.exports = router;
