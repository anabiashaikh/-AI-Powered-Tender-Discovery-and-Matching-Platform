import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { TendersModule } from './tenders/tenders.module';
import { MatchingModule } from './matching/matching.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AssistantModule } from './assistant/assistant.module';
import { AdminModule } from './admin/admin.module';
import { JobsModule } from './jobs/jobs.module';
import { CommonModule } from './common/common.module';
import { ScrapingModule } from './scraping/scraping.module';

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const isSsl = configService.get('DATABASE_SSL') === 'true' || databaseUrl?.includes('sslmode=require');

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            ssl: isSsl ? { rejectUnauthorized: false } : undefined,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: configService.get('DATABASE_SYNCHRONIZE') === 'true',
            logging: configService.get('DATABASE_LOGGING') === 'true',
          };
        }

        return {
          type: 'postgres',
          host: configService.get('DATABASE_HOST') || configService.get('DB_HOST') || 'localhost',
          port: parseInt(configService.get('DATABASE_PORT') || configService.get('DB_PORT') || '5432', 10),
          username: configService.get('DATABASE_USERNAME') || configService.get('DB_USERNAME') || 'postgres',
          password: configService.get('DATABASE_PASSWORD') || configService.get('DB_PASSWORD') || 'postgres',
          database: configService.get('DATABASE_NAME') || configService.get('DB_DATABASE') || 'tender_discovery',
          ssl: isSsl ? { rejectUnauthorized: false } : undefined,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get('DATABASE_SYNCHRONIZE') === 'true',
          logging: configService.get('DATABASE_LOGGING') === 'true',
        };
      },
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisHost = configService.get('REDIS_HOST') || 'localhost';
        const redisPort = parseInt(configService.get('REDIS_PORT') || '6379', 10);
        const redisPassword = configService.get('REDIS_PASSWORD') || configService.get('UPSTASH_REDIS_REST_TOKEN') || undefined;
        const isTls = configService.get('REDIS_TLS') === 'true' || redisHost.includes('upstash.io') || redisUrl?.startsWith('rediss://');

        if (redisUrl) {
          return {
            redis: redisUrl,
          };
        }

        return {
          redis: {
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            tls: isTls ? { rejectUnauthorized: false } : undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisHost = configService.get('REDIS_HOST');
        const redisPort = parseInt(configService.get('REDIS_PORT') || '6379', 10);
        const redisPassword = configService.get('REDIS_PASSWORD') || configService.get('UPSTASH_REDIS_REST_TOKEN') || undefined;
        const isTls = configService.get('REDIS_TLS') === 'true' || redisHost?.includes('upstash.io') || redisUrl?.startsWith('rediss://');

        if (redisUrl) {
          return {
            type: 'single',
            url: redisUrl,
          };
        }

        if (!redisHost) {
          return {
            type: 'single',
            options: {
              host: 'localhost',
              port: 6379,
            },
            skipConnect: true,
          };
        }

        return {
          type: 'single',
          options: {
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            tls: isTls ? { rejectUnauthorized: false } : undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    CompanyModule,
    TendersModule,
    MatchingModule,
    NotificationsModule,
    DashboardModule,
    AssistantModule,
    AdminModule,
    JobsModule,
    ScrapingModule,
  ],
})
export class AppModule {}
