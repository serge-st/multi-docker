const keys = require('./keys');
const redis = require('redis');


const redisClient = redis.createClient({
    // keys is just a config file created by us
    host: keys.redisHost,
    port: keys.redisPort,
    // if client looses connection it should retry each second
    retry_strategy: () => 1000,
});
const sub = redisClient.duplicate();

// function to calculate Fibonacci values
const fib = (index) => {
    if (index < 2) return 1;
    return fib(index - 1) + fib(index - 2);
};

// sub stands for subscribtion
// because we're going to watch Redis
// basically - in case of message run the callback below
// console.log("GET ALL REDIS VALUES", redisClient.hgetall('values'));
sub.on('message', (channel, message) => {
    // any time new value shows up, we are going calculate and insert it into hash of values
    redisClient.hset('values', message, fib(parseInt(message)));
});
// any time someone inserts some value into redis - we are going to get that value
// calculate fib value and toss it back to redis instance
sub.subscribe('insert');