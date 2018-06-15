import express from 'express';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v1 as uuidv1 } from 'uuid';

// create routers and set
const router = express.Router();

import db from '../db';
import config from '../config';
import verifyToken from './verifyToken';

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

//router for register endpoint
router.post('/register', (req, res) => {
  //hashing password
  console.log(req.body);
  const hashedPassword = bcrypt.hashSync(req.body.password, 8);
  const uid = uuidv1();

  try {
    db.query(
      'INSERT INTO users (name, email, password, uid, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [req.body.name, req.body.email, hashedPassword, uid],
      (err, result) => {
        // console.log(err.sqlMessage);
        if (err) {
          if (err.sqlMessage.indexOf('name') !== -1) {
            return res
              .status(500)
              .send(`Name ${req.body.name} is already used.`);
          } else if (err.sqlMessage.indexOf('email') !== -1) {
            return res
              .status(500)
              .send(`Email ${req.body.email} is already used.`);
          } else {
            return res
              .status(500)
              .send("Sorry, there's a problem to register.");
          }
        }

        //if success, create token;
        const token = jwt.sign({ id: uid }, config.secret, {
          expiresIn: 86400
        });
        res.status(200).send({
          auth: true,
          token: token,
          user: { name: req.body.name, email: req.body.email, uid: uid }
        });
      }
    );
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .send('Sorry, there is an internal error from server.');
  }
});

router.post('/login', (req, res) => {
  console.log(req.body);
  db.query(
    'SELECT id, email, name, password, uid FROM users WHERE email = ? LIMIT 1',
    req.body.email,
    (err, user) => {
      if (err)
        return res.status(500).send('Sorry, there is a problem from server.');
      if (!user || user.length === 0)
        return res.status(404).send(`${req.body.email} is not a member.`);
      //if there is a user, verify password.
      const passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user[0].password
      );
      if (!passwordIsValid) return res.status(401).send('Incorrect password.');
      const token = jwt.sign({ id: user[0].uid }, config.secret, {
        expiresIn: 86400
      });
      res.status(200).send({
        auth: true,
        token: token,
        user: { name: user[0].name, email: user[0].email, uid: user[0].uid }
      });
    }
  );
});

router.post('/update', verifyToken, (req, res) => {
  //change included password

  if (req.userId === req.body.uid) {
    if (req.body.password) {
      const hashedPassword = bcrypt.hashSync(req.body.password, 8);
      db.query(
        'UPDATE users SET email = ?, name = ?, password = ?, updated_at = NOW() WHERE uid = ?',
        [req.body.email, req.body.name, hashedPassword, req.body.uid],
        (err, result) => {
          console.log(result);
          if (err)
            return res.status(500).send('Sorry, tere is a prblem from server.');
          if (!result)
            return res.status(404).send('Cannot find your information');

          res.status(200).send(result);
        }
      );
    } else {
      console.log(req.body.name, req.body.email, req.body.uid);
      db.query(
        'UPDATE users SET email = ?, name = ?, updated_at = NOW() WHERE uid = ?',
        [req.body.email, req.body.name, req.body.uid],
        (err, result) => {
          console.log(result);
          if (err)
            return res.status(500).send('Sorry, tere is a prblem from server.');
          if (!result)
            return res.status(404).send('Cannot find your information');
          res.status(200).send(result);
        }
      );
    }
  } else {
    res.status(401).send('Update request rejected: Unauthorized User.');
  }
});

module.exports = router;
