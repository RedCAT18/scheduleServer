//middleware for verifying jwt

import jwt from 'jsonwebtoken';
import config from '../config';

const verifyToken = (req, res, next) => {
  // console.log(req.headers);
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(403).send({ auth: false, message: 'No token provided.' });
  }

  //if there is token, verity
  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .send({ auth: false, message: 'Failed to authenticate token.' });
    }
    // console.log(decoded);
    //if success to verity, save to request for use in other routes
    req.userId = decoded.id;
    next();
  });
};

module.exports = verifyToken;
