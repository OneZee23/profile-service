import { Injectable } from '@nestjs/common';
import { IsInt, IsPositive, IsString, Matches } from 'class-validator';

@Injectable()
export class WebserverConfig {
  @IsInt()
  @IsPositive()
  readonly port = 3000;

  @IsString()
  @Matches(/\/$/)
  readonly publicUrl = 'http://localhost:3000/';
}
