import db from '../db';

function checkSchedules(uid) {
  db.query(
    `UPDATE schedules SET status = 'DROP' WHERE datetime < NOW() AND datetime != '' AND status = 'ONGOING' AND user_uid = ?`,
    uid,
    (err, result) => {
      if (err) {
        return false;
      } else {
        if (result.affectedRows !== 0) {
          return {
            message: `Oops, Your ${
              result.affectedRows
            } schedules are dropped for passing the date where you set. :/`
          };
        }
        return {
          message: `Gr8, No schedules are dropped during you're leaving me. :)`
        };
      }
    }
  );
}

module.exports = checkSchedules;
