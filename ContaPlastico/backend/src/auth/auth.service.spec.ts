import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should validate credentials and return JWT payload', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    usersService.findByEmail.mockResolvedValue({
      id: 'usr-1',
      email: 'admin@plastcontrol.com',
      password: passwordHash,
      name: 'Carlos Mendoza',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    const result = await service.validateUser('admin@plastcontrol.com', 'password123');

    expect(result).toMatchObject({
      id: 'usr-1',
      email: 'admin@plastcontrol.com',
      role: 'ADMIN',
    });
  });

  it('should throw when credentials are invalid', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.validateUser('unknown@plastcontrol.com', 'wrong-password'),
    ).rejects.toThrow('Credenciales inválidas');
  });
});
