import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EnvironmentsService } from './environments.service';
import { EnvironmentsController } from './environments.controller';

@Module({
  imports: [PrismaModule],
  controllers: [EnvironmentsController],
  providers: [EnvironmentsService],
})
export class EnvironmentsModule {}
