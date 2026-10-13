import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const originalUrl = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.DATABASE_URL = originalUrl;
  });

  it('should be defined when DATABASE_URL is set', async () => {
    // The pg adapter connects lazily, so no database is needed here.
    process.env.DATABASE_URL =
      'postgresql://user:password@localhost:5432/skillswap_test';
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    expect(module.get<PrismaService>(PrismaService)).toBeDefined();
  });

  it('should refuse to start without DATABASE_URL', () => {
    delete process.env.DATABASE_URL;
    expect(() => new PrismaService()).toThrow('DATABASE_URL is not set');
  });
});
