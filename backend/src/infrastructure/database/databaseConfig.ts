export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

function requireEnvironmentValue(
  environment: NodeJS.ProcessEnv,
  name: keyof NodeJS.ProcessEnv,
): string {
  const value = environment[name];

  if (!value) {
    throw new Error(`${String(name)} is required.`);
  }

  return value;
}

export function loadDatabaseConfig(
  environment: NodeJS.ProcessEnv,
): DatabaseConfig {
  const portValue = environment.MYSQL_PORT ?? '3306';
  const port = Number(portValue);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('MYSQL_PORT must be a valid TCP port.');
  }

  return {
    host: environment.MYSQL_HOST ?? '127.0.0.1',
    port,
    database: requireEnvironmentValue(environment, 'MYSQL_DATABASE'),
    user: requireEnvironmentValue(environment, 'MYSQL_USER'),
    password: requireEnvironmentValue(environment, 'MYSQL_PASSWORD'),
  };
}
