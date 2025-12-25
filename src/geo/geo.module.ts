import { Module } from '@nestjs/common';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';
import { DatabaseProvider } from './providers/database.provider';

@Module({
  controllers: [GeoController],
  providers: [GeoService, DatabaseProvider],
  exports: [GeoService],
})
export class GeoModule {}

