const keys = require("./keys");

// Express App Setup
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgress Client Setup
const { Pool } = require("pg");
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort,
});

pgClient.on("connect", (client) => {
    client
      .query("CREATE TABLE IF NOT EXISTS values (number INT)")
      .catch((err) => console.error(err));
});

// Redis Client Setup
const redis = require("redis");
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});
// duplicate connection is needed because if one connection is used for "listen" it cannot be used for something else
const redisPublisher = redisClient.duplicate();

// Express Route Handlers

app.get("/", (req, res) => {
    res.send("Hi");
});

app.get("/values/all", async (req, res) => {
    const values = await pgClient.query("SELECT * from values");

    res.send(values.rows);
});

app.get("/values/current", async (req, res) => {
    redisClient.hgetall("values", (err, values) => {
        res.send(values);
    });
});

app.post("/values", async (req, res) => {
    const index = req.body.index;

    if (parseInt(index) > 40) {
        return res.status(422).send("Index too high");
    }

    // saving value of index to Redis, after worker will replace "nothing yet" with fib calculation result.
    redisClient.hset("values", index, "Nothing yet!");
    // publish will wake up worker and start fib calculation
    redisPublisher.publish("insert", index);
    // permanently save index in PG
    pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);

    res.send({ working: true});
});

app.listen(5000, err => {
    console.log("Listening");
});