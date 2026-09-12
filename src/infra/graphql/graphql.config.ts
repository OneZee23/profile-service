import { Injectable } from '@nestjs/common';
import {
  IsBoolean,
  IsInt,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';

@Injectable()
export class GraphqlConfig {
  @IsString()
  @Matches(/^\//)
  readonly path = '/graphql';

  @IsBoolean()
  readonly sandbox = true;

  @IsBoolean()
  readonly introspection = true;

  @IsInt()
  @IsPositive()
  readonly maxDepth = 8;

  @IsInt()
  @IsPositive()
  readonly responseCacheTtlSeconds = 60;

  @IsInt()
  @IsPositive()
  readonly maxBodyBytes = 16384;
}
