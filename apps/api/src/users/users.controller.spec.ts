import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    getMe: jest.fn(),
    getPublicProfile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: {} },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('returns the signed-in user', async () => {
    usersService.getMe.mockResolvedValue({ id: 'u1', name: 'Asha' });
    await expect(controller.getMe('u1')).resolves.toEqual({
      id: 'u1',
      name: 'Asha',
    });
    expect(usersService.getMe).toHaveBeenCalledWith('u1');
  });

  it('passes the viewer through when loading a public profile', async () => {
    usersService.getPublicProfile.mockResolvedValue({ id: 'u2' });
    await controller.getPublicProfile('u1', 'u2');
    expect(usersService.getPublicProfile).toHaveBeenCalledWith('u1', 'u2');
  });
});
