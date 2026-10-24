import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MatchesService connection requests', () => {
  const prisma = {
    user: { findFirst: jest.fn() },
    match: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  let service: MatchesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MatchesService(prisma as unknown as PrismaService);
    prisma.user.findFirst.mockResolvedValue({ id: 'bob' });
    prisma.match.update.mockImplementation(
      ({ data }: { data: { status: string } }) =>
        Promise.resolve({ id: 'm1', status: data.status }),
    );
  });

  const pendingFromBob = {
    id: 'm1',
    userAId: 'bob',
    userBId: 'alice',
    status: 'PENDING',
  };

  describe('connect', () => {
    it('rejects connecting with yourself', async () => {
      await expect(service.connect('alice', 'alice')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an unknown target user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.connect('alice', 'ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('creates a pending request rather than an instant connection', async () => {
      prisma.match.findFirst.mockResolvedValue(null);
      prisma.match.create.mockResolvedValue({ id: 'm1', status: 'PENDING' });

      await expect(service.connect('alice', 'bob')).resolves.toEqual({
        matchId: 'm1',
        status: 'PENDING',
      });
      expect(prisma.match.create).toHaveBeenCalledWith({
        data: { userAId: 'alice', userBId: 'bob', status: 'PENDING' },
      });
    });

    it('does not let the requester accept their own request', async () => {
      prisma.match.findFirst.mockResolvedValue({
        id: 'm1',
        userAId: 'alice',
        userBId: 'bob',
        status: 'PENDING',
      });

      await expect(service.connect('alice', 'bob')).resolves.toEqual({
        matchId: 'm1',
        status: 'PENDING',
      });
      expect(prisma.match.update).not.toHaveBeenCalled();
    });

    it('accepts when the other user had already asked to connect', async () => {
      prisma.match.findFirst.mockResolvedValue(pendingFromBob);

      await expect(service.connect('alice', 'bob')).resolves.toEqual({
        matchId: 'm1',
        status: 'ACCEPTED',
      });
    });

    it('re-opens a declined pair as a new request from the caller', async () => {
      prisma.match.findFirst.mockResolvedValue({
        ...pendingFromBob,
        status: 'REJECTED',
      });

      await service.connect('alice', 'bob');
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { userAId: 'alice', userBId: 'bob', status: 'PENDING' },
      });
    });
  });

  describe('respond', () => {
    it('lets the recipient accept', async () => {
      prisma.match.findUnique.mockResolvedValue(pendingFromBob);
      await expect(service.respond('alice', 'm1', true)).resolves.toEqual({
        matchId: 'm1',
        status: 'ACCEPTED',
      });
    });

    it('lets the recipient decline', async () => {
      prisma.match.findUnique.mockResolvedValue(pendingFromBob);
      await expect(service.respond('alice', 'm1', false)).resolves.toEqual({
        matchId: 'm1',
        status: 'REJECTED',
      });
    });

    it('forbids the requester from answering their own request', async () => {
      prisma.match.findUnique.mockResolvedValue(pendingFromBob);
      await expect(service.respond('bob', 'm1', true)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('hides matches from users who are not part of them', async () => {
      prisma.match.findUnique.mockResolvedValue(pendingFromBob);
      await expect(
        service.respond('mallory', 'm1', true),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects answering a request twice', async () => {
      prisma.match.findUnique.mockResolvedValue({
        ...pendingFromBob,
        status: 'ACCEPTED',
      });
      await expect(service.respond('alice', 'm1', true)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('getMessagesForMatch', () => {
    it('blocks chat history until the request is accepted', async () => {
      prisma.match.findUnique.mockResolvedValue(pendingFromBob);
      await expect(
        service.getMessagesForMatch('alice', 'm1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
