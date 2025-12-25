import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DatabaseProvider } from './providers/database.provider';

@Module({
  controllers: [UsersController],
  providers: [UsersService, DatabaseProvider],
  exports: [UsersService],
})
export class UsersModule {}

