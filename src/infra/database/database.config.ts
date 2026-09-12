import { Injectable } from '@nestjs/common';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
} from 'class-validator';

@Injectable()
export class DatabaseConfig {
  @IsString()
  @IsNotEmpty()
  readonly host = '127.0.0.1';

  @IsInt()
  @IsPositive()
  readonly port = 5432;

  @IsString()
  @IsNotEmpty()
  readonly username = 'postgres';

  @IsString()
  @IsNotEmpty()
  readonly password = '';

  @IsString()
  @IsNotEmpty()
  readonly database = 'postgres';

  @IsString()
  @IsNotEmpty()
  readonly schema = 'public';

  @IsInt()
  @IsPositive()
  readonly poolSize = 3;

  @IsBoolean()
  readonly logQueries = false;

  url(): string {
    const credentials = [
      encodeURIComponent(this.username),
      encodeURIComponent(this.password),
    ].join(':');
    const options = `schema=${this.schema}&connection_limit=${this.poolSize}`;

    return `postgresql://${credentials}@${this.host}:${this.port}/${this.database}?${options}`;
  }
}
