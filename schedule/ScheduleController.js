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
  console.log(req.body);
  if (req.body.uid) {
    db.query(
      `UPDATE schedules SET title = ?, description = ?, location = ?, datetime = ?, status = ?, updated_at = NOW() WHERE uid = ?`,
      [
        req.body.title,
        req.body.description,
        req.body.location,
        req.body.datetime,
        req.body.status,
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
router.get('/show', verifyToken, (req, res) => {
  db.query(
    `SELECT uid, title, description, location, datetime, status, created_at FROM schedules WHERE user_uid = ? AND visible = 1 ORDER BY datetime ASC ;
    SELECT COUNT(*) AS 'statistic' FROM schedules WHERE status != 'ONGOING' AND user_uid = ?
    UNION
    SELECT COUNT(*) FROM schedules WHERE status = 'DONE' AND user_uid = ?
    UNION
    SELECT COUNT(*) FROM schedules WHERE status = 'DROP' AND user_uid = ?`,
    [req.userId, req.userId, req.userId, req.userId],
    (err, data) => {
      if (err)
        return res
          .status(500)
          .send("Sorry, there's a problem to find schedule data.");
      if (!data || data.length === 0)
        return res.status(404).send('There is no data');
      // res.status(200).send(data);
      let result = { schedule: [], archive: [] };
      for (let d of data[0]) {
        if (d.status === 'ONGOING') {
          result.schedule.push(d);
        } else {
          result.archive.push(d);
        }
      }
      const stat = data[1].map(d => {
        return d.statistic;
      });
      // console.log(stat);
      res.status(200).send({ result, stat });
    }
  );
});

//pagination for infinite loading

router.get('/show/:page/:type', verifyToken, (req, res) => {
  console.log(req.params);
  let limit = 10; //numer of records per page
  let page = req.params.page;
  let type = req.params.type;
  let offset = limit * (page - 1);
  if (page === '1') {
    db.query(
      `SELECT uid, title, description, location, datetime, status, created_at FROM schedules WHERE user_uid = ? AND status = 'ONGOING' AND visible = 1 ORDER BY datetime ASC LIMIT ? OFFSET ? ;
      SELECT uid, title, description, location, datetime, status, created_at FROM schedules WHERE user_uid = ? AND status != 'ONGOING' AND visible = 1 ORDER BY datetime ASC LIMIT ? OFFSET ? ;
      SELECT COUNT(*) AS 'statistic' FROM schedules WHERE status != 'ONGOING' AND user_uid = ?
      UNION
      SELECT COUNT(*) FROM schedules WHERE status = 'DONE' AND user_uid = ?
      UNION
      SELECT COUNT(*) FROM schedules WHERE status = 'DROP' AND user_uid = ?`,
      [
        req.userId,
        limit,
        offset,
        req.userId,
        limit,
        offset,
        req.userId,
        req.userId,
        req.userId
      ],
      (err, data) => {
        if (err)
          return res
            .status(500)
            .send("Sorry, there's a problem to find schedule data.");
        if (!data || data.length === 0)
          return res.status(404).send('There is no data');
        // res.status(200).send(data);
        console.log(data);
        let result = { schedule: [], archive: [] };
        // for (let d of data[0]) {
        //   if (d.status === 'ONGOING') {
        //     result.schedule.push(d);
        //   } else {
        //     result.archive.push(d);
        //   }
        // }
        result.schedule = data[0];
        result.archive = data[1];
        const stat = data[2].map(d => {
          return d.statistic;
        });
        // console.log(stat);
        res.status(200).send({ result, stat, page });
      }
    );
  } else {
    //1페이지 이상은 schedule과 archive에 따라 다르게 로딩 (인피니트 스크롤 이용)
    db.query(
      'SELECT uid, title, description, location, datetime, status, created_at FROM schedules WHERE user_uid = ? AND visible = 1 ORDER BY datetime ASC LIMIT ? OFFSET ?',
      [req.userId, limit, offset],
      (err, data) => {
        if (err)
          return res
            .status(500)
            .send(`Sorry, there's a problem to find schedule data.`);
        if (!data || data.length === 0)
          return res.status(404).send(`There is no data.`);
      }
    );
  }
});

//delete(invisible) schedule
router.post('/delete', verifyToken, (req, res) => {
  //request : uid
  db.query(
    'UPDATE schedules SET visible = 0 WHERE uid = ?',
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
