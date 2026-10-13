import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export type UserRole = 'ADMIN' | 'ALMACEN' | 'PRODUCCION' | 'SUPERVISOR';

export interface UserRecord {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  shift?: string | null;
  status?: string;
}

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const count = await this.prisma.user.count();
      if (count === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await this.prisma.user.createMany({
          data: [
            {
              email: 'carlos.mendoza@plastcontrol.com',
              password: hashedPassword,
              name: 'Carlos Mendoza',
              role: 'ADMIN',
              shift: 'General',
            },
            {
              email: 'jorge.ramirez@plastcontrol.com',
              password: hashedPassword,
              name: 'Jorge Ramírez',
              role: 'ALMACEN',
              shift: 'Mañana',
            },
            {
              email: 'mario.paredes@plastcontrol.com',
              password: hashedPassword,
              name: 'Mario Paredes',
              role: 'PRODUCCION',
              shift: 'Tarde',
            },
            {
              email: 'elena.torres@plastcontrol.com',
              password: hashedPassword,
              name: 'Elena Torres',
              role: 'SUPERVISOR',
              shift: 'Noche',
            },
          ],
        });
        console.log('[UsersService] Usuarios iniciales sembrados con éxito.');
      }
    } catch (err) {
      console.warn('[UsersService] No se pudo sembrar usuarios:', err);
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        shift: true,
        createdAt: true,
      },
    });
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      password: user.password,
      name: user.name,
      role: user.role as UserRole,
      shift: user.shift,
      status: 'ACTIVE',
    };
  }

  async findOne(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      password: user.password,
      name: user.name,
      role: user.role as UserRole,
      shift: user.shift,
      status: 'ACTIVE',
    };
  }

  async create(data: { email: string; password: string; name: string; role?: UserRole; shift?: string | null }) {
    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        email: data.email,
        password: passwordHash,
        name: data.name,
        role: data.role ?? 'PRODUCCION',
        shift: data.shift ?? null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        shift: true,
        createdAt: true,
      },
    });
  }
}
