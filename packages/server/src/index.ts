import express from 'express';
import * as bodyParser from 'body-parser';
import cors from 'cors';
import redis from 'redis';
import { Pool } from 'pg';
import config from './config';

// Express Setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgress Setup
const pgClient = new Pool({
    user: config.pgUser,
    host: config.pgHost,
    database: config.pgDatabase,
    password: config.pgPassword,
    port: parseInt(config.pgPort)
});

pgClient.on('error', () => console.log('Lost PG connection'));

const createTableQuery = 'CREATE TABLE IF NOT EXISTS values (number INT)';
pgClient
    .query(createTableQuery)
    .catch(console.log);

// Redis Setup
const redisClient = redis.createClient({
    host: config.redisHost,
    port: parseInt(config.redisPort),
    retry_strategy: () => 1000
});

const redisPublisher = redisClient.duplicate();

// Express Routes

app.get('/', (req, res) => {
    res.send(`Hi! I'm working.`);
});

app.get('/values/all', async(req, res) => {
    const selectAllValuesQuery = 'select * from values';
    const values = await pgClient.query(selectAllValuesQuery);
    res.send(values.rows);
});

app.get('/values/current', async(req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    });
});

app.post('/value', async(req, res) => {
    const index = req.body.index;

    redisClient.hset('values', index, 'Nothing');
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES ($1)', [index]);

    res.send({working: true});
});

app.listen(5000, err => {
    if(err) {
        console.log(err);
        return;
    }
    console.log('Listening on Port 5000');
});
