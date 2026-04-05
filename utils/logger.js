function log({ level, method = null, url = null, status = null, message }) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        method,
        url,
        status,
        message,
    };
    const json = JSON.stringify(logEntry);
    if (level === 'ERROR') process.stderr.write(json + '\n');
    else process.stdout.write(json + '\n');
}

module.exports = log;
