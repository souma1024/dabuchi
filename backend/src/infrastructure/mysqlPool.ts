import mysql from 'mysql2/promise';

export function createMysqlPool() {
  return mysql.createPool({
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: readPort(process.env.MYSQL_PORT),
    database: process.env.MYSQL_DATABASE ?? 'dabuchi',
    user: process.env.MYSQL_USER ?? 'dabuchi_app',
    password: process.env.MYSQL_PASSWORD,
    connectionLimit: 10,
  });
}

function readPort(value: string | undefined): number {
  const port = Number(value ?? 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('Invalid MYSQL_PORT configuration.');
  }
  return port;
}
