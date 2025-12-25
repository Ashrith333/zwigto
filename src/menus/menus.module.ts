import { Module } from '@nestjs/common';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';
import { DatabaseProvider } from './providers/database.provider';
import { RestaurantsModule } from '../restaurants/restaurants.module';

@Module({
  imports: [RestaurantsModule],
  controllers: [MenusController],
  providers: [MenusService, DatabaseProvider],
  exports: [MenusService],
})
export class MenusModule {}

