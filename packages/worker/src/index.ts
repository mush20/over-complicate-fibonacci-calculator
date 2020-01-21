import redis from 'redis';
import config from './config';

const redisClient = redis.createClient({
    host: config.redisHost,
    port: parseInt(config.redisPort),
    retry_strategy: () => 1000
});

const sub = redisClient.duplicate();

function fib(index, memo) {
    memo = memo || {};

    if(memo[index]) return memo[index];
    if(index < 2) return 1;

    return memo[index] = fib(index - 1, memo) + fib(index - 2, memo);
}

sub.on('message', (channel, message) => {
    const result = fib(parseInt(message), []);
    redisClient.hset('values', message, result);
});

sub.subscribe('insert');
