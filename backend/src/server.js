//src/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(cors({ 
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const cookieJwtAuth   = require('./middleware/cookieJwtAuth');

app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));

// accounts routes
app.use('/accounts', cookieJwtAuth, require('./routes/accounts'));
// cards routes
app.use('/cards', cookieJwtAuth, require('./routes/cards'));

app.listen(8080, () => {
    logger.info('MyServer is running on port 8080');
});