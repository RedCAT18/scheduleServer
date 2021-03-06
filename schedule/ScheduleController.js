import express from 'express';
import bodyParser from 'body-parser';
import { v1 as uuidv1 } from 'uuid';

import db from '../db';
import config from '../config';
import verifyToken from '../auth/verifyToken';
import checkSchedules from './checking';

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
  checkSchedules(req.userId);
  db.query(
    `UPDATE schedules SET status = 'DROP' WHERE datetime < NOW() AND datetime != '' AND status = 'ONGOING' AND user_uid = ?;
    SELECT uid, title, description, location, datetime, status, created_at FROM schedules WHERE user_uid = ? AND visible = 1 ORDER BY datetime ASC ;
    SELECT COUNT(*) AS 'statistic' FROM schedules WHERE status != 'ONGOING' AND user_uid = ?
    UNION
    SELECT COUNT(*) FROM schedules WHERE status = 'DONE' AND user_uid = ?
    UNION
    SELECT COUNT(*) FROM schedules WHERE status = 'DROP' AND user_uid = ?`,
    [req.userId, req.userId, req.userId, req.userId, req.userId],
    (err, data) => {
      if (err)
        return res
          .status(500)
          .send("Sorry, there's a problem to find schedule data.");
      if (!data || data.length === 0)
        return res.status(404).send('There is no data');
      // console.log(data[0]);
      let checkingMessage = '';
      if (data[0].affectedRows !== 0) {
        checkingMessage = `Oops, Your ${
          data[0].affectedRows
        } schedules are dropped for passing the date where you set. :/`;
      } else {
        checkingMessage = null;
      }

      let result = { schedule: [], archive: [] };
      for (let d of data[1]) {
        if (d.status === 'ONGOING') {
          result.schedule.push(d);
        } else {
          result.archive.push(d);
        }
      }
      const stat = data[2].map(d => {
        return d.statistic;
      });
      res.status(200).send({ checkingMessage, result, stat });
    }
  );
});

//pagination for infinite loading

router.get('/show/:page/:type', verifyToken, (req, res) => {
  let limit = 10; //numer of records per page
  let page = req.params.page;
  let type = req.params.type === 'Schedule' ? '=' : '!=';
  let offset = limit * (page - 1);
  if (page === '1') {
    db.query(
      `SELECT count(*) as amount FROM schedules WHERE status = 'ONGOING' AND user_uid= ? AND visible = 1 ORDER BY datetime ASC ;
    SELECT count(*) as amount FROM schedules WHERE status != 'ONGOING' AND user_uid= ? AND visible = 1 ORDER BY datetime ASC
    `,
      [req.userId, req.userId],
      (err, data) => {
        if (err)
          return res
            .status(500)
            .send(`Sorry, there's a problem to find schedule data.`);
        if (!data || data.length === 0)
          return res.status(404).send(`There is no data.`);
        let totalSchedulePages = Math.ceil(data[0][0].amount / limit);
        let totalArchivePages = Math.ceil(data[1][0].amount / limit);

        db.query(
          `UPDATE schedules SET status = 'DROP' WHERE datetime < NOW() AND datetime != '' AND status = 'ONGOING' AND user_uid = ? ;
          SELECT uid, title, description, location, datetime, status, created_at FROM schedules WHERE user_uid = ? AND status = 'ONGOING' AND visible = 1 ORDER BY datetime ASC LIMIT ? OFFSET ? ;
          SELECT uid, title, description, location, datetime, status, created_at FROM schedules WHERE user_uid = ? AND status != 'ONGOING' AND visible = 1 ORDER BY datetime ASC LIMIT ? OFFSET ? ;
          SELECT COUNT(*) AS 'statistic' FROM schedules WHERE status != 'ONGOING' AND user_uid = ?
          UNION
          SELECT COUNT(*) FROM schedules WHERE status = 'DONE' AND user_uid = ?
          UNION
          SELECT COUNT(*) FROM schedules WHERE status = 'DROP' AND user_uid = ?`,
          [
            req.userId,
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

            let checkingMessage = '';
            if (data[0].affectedRows !== 0) {
              checkingMessage = `Oops, Your ${
                data[0].affectedRows
              } schedules are dropped for passing the date when you set. :/`;
            } else {
              checkingMessage = null;
            }

            let result = { schedule: [], archive: [] };
            result.schedule = data[1];
            result.archive = data[2];
            const stat = data[3].map(d => {
              return d.statistic;
            });
            // console.log(stat);
            res.status(200).send({
              checkingMessage,
              result,
              stat,
              totalSchedulePages,
              totalArchivePages
            });
          }
        );
      }
    );
  } else {
    //1페이지 이상은 schedule과 archive에 따라 다르게 로딩 (인피니트 스크롤 이용)

    db.query(
      `SELECT uid, title, description, location, datetime, status, created_at FROM schedules WHERE user_uid = ? AND status ${type} 'ONGOING' AND visible = 1 ORDER BY datetime ASC LIMIT ? OFFSET ?`,
      [req.userId, limit, offset],
      (err, data) => {
        // console.log(data);
        if (err)
          return res
            .status(500)
            .send(`Sorry, there's a problem to find schedule data.`);
        if (!data || data.length === 0)
          return res.status(404).send(`There is no data.`);
        const screen = req.params.type;
        res.status(200).send({ data, screen, page });
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
