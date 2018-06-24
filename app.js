import express from 'express';
import db from './db';

const app = express();
const port = process.env.PORT || '3000';

//controllers
import AuthController from './auth/AuthControllser';
app.use('/api/auth', AuthController);

import ScheduleController from './schedule/ScheduleController';
app.use('/api/schedule', ScheduleController);

import AdminController from './admin/AdminController';
app.use('/api/admin', AdminController);

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});
