import express from 'express';
import bodyParser from 'body-parser';
import { v1 as uuidv1 } from 'uuid';

import db from '../db';
import config from '../config';
import verifyToken from '../auth/verifyToken';

const router = express.Router();

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

//save schedule (create/update)

router.post('/save', verifyToken, (req, res) => {
  //update if uid exists, or add new schedule.

  if (req.body.uid) {
    db.query(
      `UPDATE schedules SET title = ?, description = ?, location = ?, datetime = ?, updated_at = NOW() WHERE uid = ?`,
      [
        req.body.title,
        req.body.description,
        req.body.location,
        req.body.datetime,
        req.body.uid
      ],
      (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(500)
            .send(`Sorry, there's a problem to update schedule.`);
        }

        console.log(result);
        res.status(200).send(result);
      }
    );
  } else {
    const uid = uuidv1();

    db.query(
      'INSERT INTO schedules (uid, title, description, location, datetime, user_uid, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [
        uid,
        req.body.title,
        req.body.description,
        req.body.location,
        req.body.datetime,
        req.userId
      ],
      (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(500)
            .send("Sorry, there's a problem to register new schedule.");
        }
        res.status(200).send(result);
      }
    );
  }
});

//show all schedule/archive of specific user
router.post('/show', verifyToken, (req, res) => {
  // const status = req.body.status === 'archive' ? '!=' : '=';
  db.query(
    `SELECT uid, title, description, location, datetime, status, created_at FROM schedules WHERE user_uid = ? AND visible = 1 ORDER BY datetime DESC`,
    req.userId,
    (err, data) => {
      console.log(err);
      if (err)
        return res
          .status(500)
          .send("Sorry, there's a problem to find schedule data.");
      if (!data || data.length === 0)
        return res.status(404).send('There is no data');
      // res.status(200).send(data);
      let result = { schedule: [], archive: [] };
      for (let d of data) {
        if (d.status === 'ONGOING') {
          result.schedule.push(d);
        } else {
          result.archive.push(d);
        }
      }
      res.status(200).send(result);
    }
  );
});

//delete(invisible) schedule
router.post('/delete', verifyToken, (req, res) => {
  //request : uid
  db.query(
    'UPDATE schedule SET visible = 0 WHERE uid = ?',
    req.body.uid,
    (err, result) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .send("Sorry, there's a problem to delete schedule.");
      }
      console.log(result);
      res.status(200).send(result);
    }
  );
});

module.exports = router;
