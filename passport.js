import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import db from './db';

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      session: false
    },
    (email, password, done) => {
      console.log('passport');
      //username과 password를 통해 예전에 사용하던 유저가 맞는지 확인
      //when there is no user, pass done with(null, false, message)
      //the first parameter of done is inner error during login process.
      //when verifying is successed, pass done with (null, user)
      //done : first parameter is 'null', second parameter is 'user'
      //when failed, pass done with (null, false, message)
      //the third parameter of done is message for failureFlash message.
      db.query(
        'SELECT id, email, password FROM users WHERE email = ? LIMIT 1',
        username,
        (err, result) => {
          if (err) console.log(err);
          else console.log(result);
          // if(err) done(err);
          // if(!result) done(null, false, 'There is no user.');
        }
      );
    }
  )
);

export default passport;
